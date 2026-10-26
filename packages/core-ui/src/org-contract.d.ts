export const PLACED: readonly ['main', 'set', 'auto', 'sub', 'none'];
export const ORG_CODES: readonly string[];
export type Placed = 'main' | 'set' | 'auto' | 'sub' | 'none';
export function orgFields(x: Record<string, unknown>): { reportsTo?: string | null; subAgentOf?: string | null; manager?: string | null; placed?: Placed };
export function orgPath(path: string): { id: string; kind: 'reports' | 'add' | 'work' | 'stop'; runId?: string } | null;
export function orgRoute(path: string): boolean;
export function allowedOrg(method: string, path: string, body: unknown): boolean;
export function orgResponse(path: string, status: number, body: unknown): unknown;
