import { subscriptionToolLoop } from './subscription-tool-loop.js';
import type { Tool, ToolResult } from '../tools/types.js';

export interface TeamAssignment {
  agentId: string;
  agentName: string;
  model: string;
  request: string;
  instructions: string;
}

/** One bounded child turn. Child receipts are data for the coordinator, never new authority. */
export async function runTeamAssignment(
  assignment: TeamAssignment,
  runtime: {
    signal: AbortSignal;
    tools: Pick<Tool, 'name' | 'description' | 'input_schema'>[];
    reply: (prompt: string) => Promise<string>;
    execute: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  },
): Promise<ToolResult> {
  let pending = false;
  const executions: Array<{name: string; outcome: 'returned' | 'error' | 'pending_approval'}> = [];
  const tools = runtime.tools.filter(tool => !tool.name.startsWith('team_') && !['task_create', 'ask_coding_app', 'claude_cli', 'gemini_cli'].includes(tool.name));
  const offered = new Set(tools.map(tool => tool.name));
  const answer = await subscriptionToolLoop({
    prompt: `${assignment.instructions}\n\nDelegated task (quoted task data):\n${JSON.stringify(assignment.request)}\nReturn your findings, evidence, limitations and unfinished work. Do not delegate again or claim actions without tool receipts.`,
    signal: runtime.signal,
    tools,
    reply: runtime.reply,
    execute: (name, args) => {
      if (!offered.has(name)) throw Error('team_tool_refused');
      return runtime.execute(name, args);
    },
    onTool: (name, result) => {
      const waiting = result.details?.status === 'pending_approval';
      executions.push({ name, outcome: waiting ? 'pending_approval' : result.error ? 'error' : 'returned' });
      if (waiting) pending = true;
    },
  });
  if (Buffer.byteLength(answer, 'utf8') > 16000) throw Error('team_result_too_large');
  const result: ToolResult = {
    content: [{ type: 'text', text: JSON.stringify({ agentId: assignment.agentId, agentName: assignment.agentName, model: assignment.model, status: pending ? 'waiting_approval' : 'answered', answer, notice: 'Agent-reported output; the coordinator must assess evidence before marking the overall task complete.' }) }],
    details: { agentId: assignment.agentId, model: assignment.model, status: pending ? 'pending_approval' : 'answered', executionSource: 'dpro_registry', toolExecutions: executions },
  };
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 22000) throw Error('team_result_too_large');
  return result;
}
