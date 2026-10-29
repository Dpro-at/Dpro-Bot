export const RULES_PATH: '/api/agent-rules';
export function agentRulesRoute(path: string): boolean;
export function allowedAgentRules(method: string, path: string, body?: unknown): boolean;
export function agentRulesResponse(path: string, status: number, body: unknown): unknown;
