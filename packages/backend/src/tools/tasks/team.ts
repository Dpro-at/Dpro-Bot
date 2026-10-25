import { all, one, sql } from '../../repositories/sql-steps.js';
import type { Tool, ToolExecutionContext, ToolResult } from '../types.js';
import { runTeamAssignment } from '../../services/team-delegation.js';
import { subscriptionModel } from '../../services/subscription-chat.js';

type Agent = { id: string; name: string; model: string; provider: string; temperature: number; max_tokens: number };
const fail = (): ToolResult => ({ content: [{ type: 'text', text: 'Team request could not run. Check the selected agent, configured reply source, grants and approval.' }], error: 'team_request_refused' });

async function coordinator(context?: ToolExecutionContext): Promise<boolean> {
  if (!context?.userId || !context.agentId || !context.sessionId || context.toolPolicy || context.delegatedFrom?.length || context.taskId) return false;
  const owner = await sql().read(one<{ role: string }>('SELECT role FROM users WHERE id=?', context.userId));
  if (owner?.role !== 'owner') return false;
  const primary = await sql().read(one<{ id: string }>('SELECT id FROM agents_config ORDER BY CASE WHEN is_primary=1 THEN 0 ELSE 1 END, CASE WHEN is_primary=1 THEN id ELSE created_at END, id LIMIT 1'));
  return primary?.id === context.agentId;
}

export const teamListTool: Tool = {
  name: 'team_list',
  description: 'List existing team agents and their configured reply sources. Only the primary agent in an owner chat can coordinate. No agents or grants are created.',
  input_schema: { type: 'object', properties: {} },
  async execute(_params, context) {
    if (!await coordinator(context)) return fail();
    const agents = await sql().read(all<Agent>('SELECT id,name,model,provider FROM agents_config WHERE id<>? ORDER BY name,id LIMIT 100', context!.agentId!));
    return { content: [{ type: 'text', text: JSON.stringify(agents) }], details: { count: agents.length, limit: 100 } };
  },
};

// A coordinator gets one active child at a time; no background queue or detached inference.
const active = new Set<string>();
export const teamResultsTool: Tool = {
  name: 'team_results',
  description: 'Read the latest five delegated results for this owner conversation. Use after an approved delegation to collect and combine results. Started or waiting_approval means unfinished; never retry it automatically.',
  input_schema: { type: 'object', properties: {} },
  async execute(_params, context) {
    if (!await coordinator(context)) return fail();
    const { teamResults } = await import('../../services/team-results.js');
    const results = await teamResults(context!.userId!, context!.sessionId!, context!.agentId!);
    // Keep a bounded receipt for the calling model; full individual answers are already bounded.
    const text = JSON.stringify(results);
    if (Buffer.byteLength(text, 'utf8') > 22000) return { content: [{ type: 'text', text: JSON.stringify(results.slice(0, 1)) }], details: { omittedOlderResults: true } };
    return { content: [{ type: 'text', text }] };
  },
};
export const teamDelegateTool: Tool = {
  name: 'team_delegate',
  execClass: true,
  requiresApproval: true,
  description: 'Delegate one self-contained task to an existing team agent using that agent\'s own configured model, personality and specialties. Wait for its answer, review evidence, then combine results. Calls require the owner\'s approval and an explicit tool grant. Child tools are limited by both agents; recursive delegation is forbidden. A waiting approval is unfinished work.',
  input_schema: { type: 'object', properties: {
    agent_id: { type: 'string', description: 'Exact existing agent ID from team_list.' },
    request: { type: 'string', description: 'Self-contained task, expected deliverable and acceptance criteria (maximum 12000 characters).' },
    reply_source: { type: 'string', enum: ['subscription:claude', 'subscription:codex', 'subscription:gemini'], description: 'Optional explicit subscription source for this approved task only. Omit to use the agent\'s saved model. Does not change agent settings.' },
  }, required: ['agent_id', 'request'] },
  async execute(params, context) {
    if (!await coordinator(context) || typeof params.agent_id !== 'string' || typeof params.request !== 'string' || !params.request.trim() || params.request.length > 12000 || params.agent_id === context!.agentId) return fail();
    if (params.reply_source !== undefined && !['subscription:claude', 'subscription:codex', 'subscription:gemini'].includes(params.reply_source)) return fail();
    const key = context!.userId!;
    if (active.has(key)) return fail();
    active.add(key);
    let resultId: string | undefined;
    const { startTeamResult, finishTeamResult } = await import('../../services/team-results.js');
    try {
      const saved = await sql().read(one<Agent>('SELECT id,name,model,provider,temperature,max_tokens FROM agents_config WHERE id=?', params.agent_id));
      const target = saved ? { ...saved, model: params.reply_source ?? saved.model } : undefined;
      if (!target?.model || (!subscriptionModel(target.model) && !['ollama', 'local', 'claude'].includes(target.provider))) return fail();
      const { chatWorkspace, runSubscription } = await import('../../services/subscription-chat.js');
      const folder = context!.fileReadRoot ?? await chatWorkspace(context!.sessionId!);
      // Recompute rather than copy the parent's grants/permissions to the child.
      const { createAgentToolsRegistry } = await import('../index.js');
      const registry = await createAgentToolsRegistry({
        userId: context!.userId, accessOwnerId: context!.accessOwnerId, sessionId: context!.sessionId,
        agentId: target.id, delegatedFrom: [context!.agentId!], workspaceDir: folder,
        fileReadRoot: folder, memoryDrawers: context!.memoryDrawers, chatPlan: false, handoffTools: false,
      });
      const { subscriptionAgentContext } = await import('../../services/subscription-agent-context.js');
      const instructions = await subscriptionAgentContext(target.id);
      const signal = AbortSignal.timeout(240000);
      const reply = async (prompt: string): Promise<string> => {
        if (signal.aborted) throw Error('cancelled');
        if (subscriptionModel(target.model)) return runSubscription(target.model, folder, prompt, signal, { appToolsOnly: true });
        if (target.provider === 'ollama' || target.provider === 'local') {
          const { ollamaToolChat } = await import('../../llm/ollama-tool-chat.js');
          const result = await ollamaToolChat({ model: target.model, messages: [{ role: 'user', content: prompt }], tools: [], temperature: target.temperature, maxTokens: Math.min(target.max_tokens || 2048, 8192), timeoutMs: 30000 });
          return result.content;
        }
        const { resolveProviderApiKey } = await import('../../credentials/authority.js');
        const { modelCall } = await import('../../llm/model-call.js');
        const apiKey = await resolveProviderApiKey('claude', { agentId: target.id, noGlobal: true });
        if (!apiKey) throw Error('model_unavailable');
        const result = await modelCall({ actor: target.id }, { purpose: 'task_run', prompt, maxOutputTokens: Math.min(target.max_tokens || 2048, 8192), timeoutMs: 30000, noLocal: true, paid: { provider: 'claude', model: target.model, apiKey } });
        if (!result.ok || result.provider !== 'claude') throw Error('model_unavailable');
        return result.text;
      };
      resultId = await startTeamResult({ owner: key, session: context!.sessionId!, coordinator: context!.agentId!, agent: target.id, model: target.model });
      const result = await runTeamAssignment({ agentId: target.id, agentName: target.name, model: target.model, request: params.request.trim(), instructions }, {
        signal, tools: registry.getAll(), reply, execute: (name, args) => registry.execute(name, args),
      });
      await finishTeamResult(resultId, result);
      return result;
    } catch {
      if (resultId) await finishTeamResult(resultId, fail()).catch(() => {});
      return fail();
    }
    finally { active.delete(key); }
  },
};
