/**
 * Execute Code Tool
 *
 * Allows programmatic tool calling - agent can write JavaScript code
 * that uses multiple tools in loops, conditions, etc.
 *
 * SECURITY (SEC-DEP-02): the code runs in its own Node process, never in the
 * backend: Node's permission system denies files, child processes, workers and
 * addons; code generation from strings is off; the environment is empty (no
 * secrets); heap and time are limited and the process is killed at the limit.
 * Its only way out is the toolbox below, reached over IPC with a call limit.
 * Network is not blocked by Node's permission system: the process holds no
 * credentials, and web_fetch through the toolbox stays the intended route.
 * PERFORMANCE: Reduces round-trips by 10x for multi-step tasks
 */

import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import type { Tool, ToolResult, ToolExecutionContext } from '../types.js';
import { execToolRefusal, isExecToolsEnabled } from '../exec-policy.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_MEMORY_MB = 128; // 128MB memory limit
const MAX_TOOL_CALLS = 200;
const MAX_LOG_LINES = 200;
const MAX_MESSAGE_CHARS = 1_000_000;

/** Runs inside the child: one script in a fresh vm context that sees only `toolbox` and `console`. */
const CHILD_SOURCE = String.raw`
const vm = require('node:vm');
const pending = new Map(); let next = 0;
const send = m => process.send(m);
const show = a => typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })();
const call = (m, p) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); send({ t: 'call', id, m, p: p === undefined ? null : JSON.parse(JSON.stringify(p)) }); });
const methods = ${'${METHODS}'};
process.on('message', msg => {
  if (msg && msg.t === 'ret') { const w = pending.get(msg.id); if (!w) return; pending.delete(msg.id); msg.ok ? w.resolve(msg.v) : w.reject(new Error(String(msg.e))); return; }
  if (!msg || msg.t !== 'run' || typeof msg.code !== 'string') return;
  const toolbox = {};
  for (const m of methods) toolbox[m] = p => call(m, p);
  toolbox.sleep = ms => new Promise(r => setTimeout(r, Math.min(Math.max(Number(ms) || 0, 0), 60000)));
  toolbox.now = () => Date.now();
  const log = level => (...args) => send({ t: 'log', level, text: args.map(show).join(' ') });
  const context = vm.createContext({ toolbox: Object.freeze(toolbox), console: Object.freeze({ log: log('log'), error: log('error') }) }, { codeGeneration: { strings: false, wasm: false } });
  let run;
  try { run = vm.runInContext('(async () => {\n' + msg.code + '\n})()', context, { filename: 'agent-code.js' }); }
  catch (e) { send({ t: 'done', ok: false, error: String(e && e.message || e) }); return; }
  Promise.resolve(run).then(value => {
    let kind = 'json', text;
    if (typeof value === 'string') { kind = 'string'; text = value; }
    else if (value === undefined || value === null) { kind = 'empty'; text = ''; }
    else { try { text = JSON.stringify(value, null, 2); } catch { text = String(value); } if (text === undefined) text = String(value); }
    send({ t: 'done', ok: true, kind, text, type: typeof value });
  }, e => send({ t: 'done', ok: false, error: String(e && e.message || e) }));
});
`;

type ChildDone = { kind: 'string' | 'empty' | 'json'; text: string; type: string };

/** Runs agent code in an isolated child process; toolbox calls come back over IPC. */
export function runIsolated(code: string, timeout: number, toolbox: Record<string, (p: any) => unknown>): Promise<ChildDone> {
  const methods = Object.keys(toolbox).filter(m => m !== 'sleep' && m !== 'now');
  const source = CHILD_SOURCE.replace('${METHODS}', JSON.stringify(methods));
  const env: Record<string, string> = process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {};
  const child = spawn(process.execPath, ['--permission', '--disallow-code-generation-from-strings', `--max-old-space-size=${MAX_MEMORY_MB}`, '-e', source], {
    env, cwd: tmpdir(), stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true,
  });
  return new Promise((resolve, reject) => {
    let settled = false, calls = 0, logs = 0, stderr = '';
    const finish = (err: Error | null, value?: ChildDone) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (child.exitCode === null) child.kill('SIGKILL');
      err ? reject(err) : resolve(value!);
    };
    const timer = setTimeout(() => finish(new Error('Script execution timed out')), timeout);
    child.stderr?.on('data', d => { if (stderr.length < 4000) stderr += String(d); });
    child.on('error', e => finish(new Error(`Could not start the code process: ${e.message}`)));
    child.on('exit', (code, signal) => finish(new Error(/heap|memory/i.test(stderr) ? `Code used more than ${MAX_MEMORY_MB}MB of memory` : `Code process stopped (${signal ?? code})`)));
    child.on('message', async (msg: any) => {
      if (settled || !msg || typeof msg !== 'object') return;
      if (JSON.stringify(msg).length > MAX_MESSAGE_CHARS) return finish(new Error('Code output is too large'));
      if (msg.t === 'log') { if (++logs <= MAX_LOG_LINES) (msg.level === 'error' ? console.error : console.log)('[Code]', String(msg.text)); return; }
      if (msg.t === 'done') return msg.ok ? finish(null, { kind: msg.kind, text: String(msg.text), type: String(msg.type) }) : finish(new Error(String(msg.error)));
      if (msg.t !== 'call') return;
      if (++calls > MAX_TOOL_CALLS) return finish(new Error(`Code made more than ${MAX_TOOL_CALLS} toolbox calls`));
      const fn = methods.includes(msg.m) ? toolbox[msg.m] : undefined;
      let reply: any;
      try { reply = { t: 'ret', id: msg.id, ok: true, v: fn ? await fn(msg.p ?? {}) : (() => { throw new Error(`Unknown toolbox method: ${String(msg.m)}`); })() }; }
      catch (e: any) { reply = { t: 'ret', id: msg.id, ok: false, e: e?.message ?? String(e) }; }
      if (!settled && child.connected) child.send(reply);
    });
    child.send({ t: 'run', code });
  });
}

/**
 * Create a safe toolbox API with limited tool access
 * Only exposes tools that are safe to use from code
 */
function createToolbox(context: ToolExecutionContext, registry: any) {
  return {
    /**
     * Execute safe shell commands
     * LIMITED: Only allows safe commands like curl, git status, npm list
     */
    async exec(params: { command: string; timeout?: number }): Promise<any> {
      // Whitelist of safe commands allowed from code
      const safePrefixes = [
        'curl ',
        'git status',
        'git log',
        'git diff',
        'npm list',
        'pnpm list',
        'node --version',
        'python --version',
        'gh ',
      ];

      const command = params.command?.trim();
      const isSafe = safePrefixes.some((prefix) => command?.startsWith(prefix));

      if (!isSafe) {
        throw new Error(
          `Unsafe command: "${command}". Allowed: ${safePrefixes.join(', ')}`
        );
      }

      const result = await registry.execute('exec', params);
      return result.content?.[0]?.text || '';
    },

    /**
     * Read file contents
     */
    async read(params: { path: string }): Promise<string> {
      const result = await registry.execute('read', params);
      return result.content?.[0]?.text || '';
    },

    /**
     * Write file contents
     */
    async write(params: { path: string; content: string }): Promise<string> {
      const result = await registry.execute('write', params);
      return result.content?.[0]?.text || '';
    },

    /**
     * Fetch web content with smart filtering
     */
    async web_fetch(params: {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      maxLength?: number;
      extractText?: boolean;
    }): Promise<string> {
      const result = await registry.execute('web_fetch', params);
      return result.content?.[0]?.text || '';
    },

    /**
     * Search memory
     */
    async memory_search(params: {
      query: string;
      userId: string;
      type?: string;
      tags?: string[];
      limit?: number;
    }): Promise<any> {
      const result = await registry.execute('memory_search', {
        ...params,
        userId: context.userId || 'default',
      });
      return JSON.parse(result.content?.[0]?.text || '[]');
    },

    /**
     * Save to memory
     */
    async memory_save(params: {
      content: string;
      userId: string;
      type?: string;
      tags?: string[];
    }): Promise<string> {
      const result = await registry.execute('memory_save', {
        ...params,
        userId: context.userId || 'default',
      });
      return result.content?.[0]?.text || '';
    },

    /**
     * Search storage
     */
    async storage_search(params: {
      query?: string;
      zone?: string;
      category?: string;
      limit?: number;
    }): Promise<any> {
      const result = await registry.execute('storage_search', params);
      return JSON.parse(result.content?.[0]?.text || '[]');
    },

    /**
     * Utility: Sleep for specified milliseconds
     */
    sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /**
     * Utility: Current timestamp
     */
    now(): number {
      return Date.now();
    },
  };
}

export const executeCodeTool: Tool = {
  name: 'execute_code',
  description: `Execute JavaScript code with access to tools via toolbox object. Use this for multi-step tasks that require loops, conditions, or complex logic.

HUGE PERFORMANCE BOOST: Instead of requesting tools one-by-one (slow), write code that uses tools in loops (10x faster).

Example: Get weather for 5 cities
Instead of: 5 separate tool calls (5 round-trips to AI)
Use execute_code: 1 code block with a loop (1 round-trip)

Available toolbox methods:
- toolbox.exec({ command }) - Run safe shell commands
- toolbox.read({ path }) - Read file
- toolbox.write({ path, content }) - Write file
- toolbox.web_fetch({ url, maxLength, extractText }) - Fetch web content
- toolbox.memory_search({ query, userId }) - Search memory
- toolbox.memory_save({ content, userId }) - Save to memory
- toolbox.storage_search({ query, zone, category }) - Search storage
- toolbox.sleep(ms) - Wait for milliseconds
- toolbox.now() - Get current timestamp

Security: Runs in its own isolated process (no files, no other programs, no secrets) with a 30s timeout and 128MB memory limit. Only the toolbox methods above reach the outside.`,

  input_schema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: `JavaScript code to execute. Must return a value or use console.log for output.

The code has access to 'toolbox' object with tool methods.

Example:
const cities = ['London', 'Paris', 'Berlin'];
const weather = [];
for (const city of cities) {
  const result = await toolbox.exec({
    command: \`curl -s wttr.in/\${city}?format=3\`
  });
  weather.push(\`\${city}: \${result}\`);
}
return weather.join('\\n');`,
      },
      timeout: {
        type: 'number',
        description: 'Execution timeout in milliseconds (default: 30000, max: 60000)',
      },
    },
    required: ['code'],
    examples: [
      {
        code: `// Get weather for multiple cities in one go
const cities = ['London', 'Paris', 'Berlin', 'Tokyo'];
const results = [];

for (const city of cities) {
  const weather = await toolbox.exec({
    command: \`curl -s wttr.in/\${city}?format=3\`
  });
  results.push(\`\${city}: \${weather}\`);
  await toolbox.sleep(500); // Rate limiting
}

return results.join('\\n');`,
        description: 'Fetch weather for multiple cities using a loop (10x faster than separate calls)',
      },
      {
        code: `// Search and analyze data
const memories = await toolbox.memory_search({
  query: 'API keys',
  userId: 'user-123',
  limit: 10
});

const analysis = {
  total: memories.length,
  types: memories.map(m => m.type),
  tags: memories.flatMap(m => m.tags || [])
};

return JSON.stringify(analysis, null, 2);`,
        description: 'Search memory and analyze results with JavaScript logic',
      },
      {
        code: `// Fetch and process web data
const url = 'https://api.github.com/repos/nodejs/node';
const data = await toolbox.web_fetch({ url });
const repo = JSON.parse(data);

return \`\${repo.name}: \${repo.stargazers_count} stars, \${repo.open_issues_count} issues\`;`,
        description: 'Fetch JSON API and extract specific fields',
      },
      {
        code: `// Conditional logic
const config = await toolbox.read({ path: 'package.json' });
const pkg = JSON.parse(config);

if (pkg.scripts?.test) {
  const result = await toolbox.exec({ command: 'npm test' });
  return \`Tests passed: \${result}\`;
} else {
  return 'No tests configured';
}`,
        description: 'Read file and execute conditionally based on content',
      },
    ],
  },

  async execute(params, context): Promise<ToolResult> {
    const { code, timeout = DEFAULT_TIMEOUT } = params;
    if (typeof code !== 'string' || !code.trim()) return { content: [{ type: 'text', text: '❌ Error: code must be a non-empty string' }], error: 'Invalid code' };

    // SECURITY: exec-class tools are off unless AGENT_EXEC_TOOLS=true (S0-Q.5)
    if (!isExecToolsEnabled()) return execToolRefusal('execute_code');

    // Validate timeout
    const asked = Number(timeout);
    const safeTimeout = Number.isFinite(asked) && asked > 0 ? Math.min(asked, 60000) : DEFAULT_TIMEOUT; // Max 60 seconds

    if (!context) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Error: No execution context provided',
          },
        ],
        error: 'Missing context',
      };
    }

    try {
      console.log('[ExecuteCodeTool] 🚀 Executing code');
      console.log('[ExecuteCodeTool]   Timeout:', safeTimeout, 'ms');
      console.log('[ExecuteCodeTool]   Code length:', code.length, 'chars');

      // Import registry dynamically to avoid circular dependency
      const { createAgentToolsRegistry } = await import('../index.js');
      const registry = await createAgentToolsRegistry(context);

      // Create safe toolbox
      const toolbox = createToolbox(context, registry);

      // Execute code in its own isolated process
      const startTime = Date.now();
      const result = await runIsolated(String(code), safeTimeout, toolbox);
      const duration = Date.now() - startTime;

      console.log('[ExecuteCodeTool] ✅ Code executed successfully');
      console.log('[ExecuteCodeTool]   Duration:', duration, 'ms');
      console.log('[ExecuteCodeTool]   Result type:', result.type);

      // Format result
      const resultText = result.kind === 'empty' ? '(Code executed successfully, no return value)' : result.text;

      return {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
        details: {
          duration,
          resultType: result.type,
          codeLength: code.length,
        },
      };
    } catch (error: any) {
      console.error('[ExecuteCodeTool] ❌ Code execution failed:', error.message);

      // Provide helpful error messages
      let errorMessage = error.message;
      if (error.message?.includes('Script execution timed out')) {
        errorMessage = `Code execution timed out after ${safeTimeout}ms. Try breaking the task into smaller steps or increase timeout.`;
      } else if (error.message?.includes('Unsafe command')) {
        errorMessage = `Security error: ${error.message}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `❌ Code execution failed: ${errorMessage}`,
          },
        ],
        error: errorMessage,
        details: {
          code: code.slice(0, 200) + (code.length > 200 ? '...' : ''),
        },
      };
    }
  },
};
