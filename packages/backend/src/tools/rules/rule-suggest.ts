/**
 * The agent suggests a rule for how the team works (RULES-01). The
 * suggestion waits in Agents › Rules; only the owner turns it into a rule
 * (accept, change, or dismiss). Agents never change or delete rules.
 * Self-only, so every agent has it in chat runs without a grant.
 */
import type { Tool, ToolResult } from '../types.js';

const fail = (text: string): ToolResult => ({ content: [{ type: 'text', text }], error: text });

export const ruleSuggestTool: Tool = {
  name: 'rule_suggest',
  selfOnly: true,
  description: 'Suggest a rule for how the owner\'s agents work, when you learned something every agent (or a department, or this project) should always do. One clear sentence. It waits for the owner in Agents › Rules; nothing changes until the owner accepts it. Do not suggest what a rule already says.',
  input_schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The rule, one sentence (up to 2000 characters)' },
      reason: { type: 'string', description: 'Why, in one short sentence (what went wrong or what it saves)' },
      who: { type: 'string', enum: ['all', 'departments'], description: 'all agents (default) or the departments in targets' },
      targets: { type: 'array', items: { type: 'string' }, description: 'Department names when who is departments' },
      this_project: { type: 'boolean', description: 'true: only in this chat\'s project; false (default): everywhere' },
    },
    required: ['text'],
  },
  async execute(params, context): Promise<ToolResult> {
    const { suggestRule, sessionProject, RuleInputError } = await import('../../services/agent-rules.js');
    const projectId = params.this_project === true ? await sessionProject(context?.sessionId) : null;
    if (params.this_project === true && !projectId) return fail('Not suggested: this chat has no project; leave this_project out to suggest it everywhere.');
    try {
      const rule = await suggestRule({ text: params.text, projectId, who: params.who === 'departments' ? 'departments' : 'all', targets: params.who === 'departments' && Array.isArray(params.targets) ? params.targets : [] }, context?.agentId ?? null, params.reason);
      return { content: [{ type: 'text', text: rule.status === 'active' ? 'This rule already exists; nothing new was suggested.' : 'Rule suggested. It waits for the owner in Agents › Rules; do not ask again in this reply.' }], details: { ruleSuggestion: { id: rule.id, text: rule.text } } };
    } catch (err) {
      if (err instanceof RuleInputError) return fail(`Not suggested: ${err.message}.`);
      throw err;
    }
  },
};
