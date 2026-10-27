/**
 * Quick helper (AGENTS-ORG-01, board SA1): a Girru agent hands light,
 * read-only work (look up, sum up, sort, draft) to the small local agent.
 * The owner turns it on per agent (Agent page › Sub-agents › Quick helper),
 * which grants these two tools; nothing is granted by default.
 *
 * The run is the same small-agent run coding apps start through MCP
 * (services/small-agent.ts): safe read-only tools only, at most two at a
 * time, the owner's memory drawers are not opened. A sub-agent, a delegated
 * child and a task run cannot start one (one level only).
 */
import { one, sql } from '../../repositories/sql-steps.js';
import type { Tool, ToolExecutionContext, ToolResult } from '../types.js';
import { orgRows, quickHelperRequester } from '../../services/agent-org.js';

const text = (t: string, extra: Partial<ToolResult> = {}): ToolResult => ({ content: [{ type: 'text', text: t }], ...extra });
const refused = () => text('A quick helper cannot start here. The owner turns it on for this agent in Agents › its page › Sub-agents.', { error: 'quick_helper_refused' });

async function allowed(context?: ToolExecutionContext): Promise<boolean> {
  if (!context?.userId || !context.agentId || context.delegatedFrom?.length || context.taskId) return false;
  const owner = await sql().read(one<{ role: string }>('SELECT role FROM users WHERE id=?', context.userId));
  if (owner?.role !== 'owner') return false;
  const me = (await orgRows()).find(r => r.id === context.agentId);
  return !!me && !me.parent_agent_id && context.agentId !== 'small-local-agent';
}

export const quickHelperTool: Tool = {
  name: 'quick_helper',
  description: 'Start a quick helper on this computer\'s local model for light read-only work: look something up in memory or saved files, sum up, sort, or draft. Give one clear task. It returns a run id at once; read the answer later with quick_helper_result. At most two run at a time. Check its answer before you rely on it.',
  input_schema: { type: 'object', properties: {
    task: { type: 'string', description: 'The task in plain words, with what "done" means (maximum 8000 characters).' },
    kind: { type: 'string', enum: ['lookup', 'summary', 'classification', 'draft', 'other'], description: 'What kind of light work it is.' },
  }, required: ['task'] },
  async execute(params, context) {
    if (!await allowed(context)) return refused();
    if (typeof params.task !== 'string' || !params.task.trim() || params.task.length > 8000) return text('task is required (maximum 8000 characters).', { error: 'invalid_input' });
    const { spawnSmallAgentRun, SmallAgentCapacityError, SmallAgentInputError } = await import('../../services/small-agent.js');
    try {
      const res = await spawnSmallAgentRun({ ownerId: context!.userId!, task: params.task, kind: params.kind, requestedBy: quickHelperRequester(context!.agentId!) });
      const { executeTaskRun } = await import('../../services/task-run-executor.js');
      setImmediate(() => { executeTaskRun(res.run.id).catch(() => {}); });
      return text(JSON.stringify({ run_id: res.run.id, status: res.run.status, kind: res.kind }), { details: { runId: res.run.id } });
    } catch (err) {
      if (err instanceof SmallAgentCapacityError) return text('Two quick helpers are already working. Wait for one to finish.', { error: 'quick_helper_busy' });
      if (err instanceof SmallAgentInputError) return text(err.message, { error: 'invalid_input' });
      return text('The quick helper could not start.', { error: 'quick_helper_failed' });
    }
  },
};

export const quickHelperResultTool: Tool = {
  name: 'quick_helper_result',
  description: 'Read the answer of a quick helper you started (run_id from quick_helper). Still working means: try again later. A finished answer is the helper\'s report, not proof.',
  input_schema: { type: 'object', properties: { run_id: { type: 'string', description: 'The run id quick_helper returned.' } }, required: ['run_id'] },
  async execute(params, context) {
    if (!await allowed(context)) return refused();
    if (typeof params.run_id !== 'string' || params.run_id.length > 100) return text('run_id is required.', { error: 'invalid_input' });
    const mine = await sql().read(one<{ run_id: string }>('SELECT run_id FROM small_agent_runs WHERE run_id = ? AND requested_by = ?', params.run_id, quickHelperRequester(context!.agentId!)));
    if (!mine) return text('No quick helper of yours has that run id.', { error: 'not_found' });
    const { smallAgentCard } = await import('../../services/small-agent.js');
    const card = await smallAgentCard(params.run_id);
    if (!card) return text('No quick helper of yours has that run id.', { error: 'not_found' });
    return text(JSON.stringify({ status: card.status, summary: card.summary, outputs: card.outputs, needs_review: card.needs_review, review_reason: card.review_reason }));
  },
};
