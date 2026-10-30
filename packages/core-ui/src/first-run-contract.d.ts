export const FIRST_RUN_PATH: '/api/first-run';
export function firstRunRoute(path: string): boolean;
export function allowedFirstRun(method: string, path: string, body: unknown): boolean;
export function firstRunResponse(path: string, status: number, body: unknown): unknown;
