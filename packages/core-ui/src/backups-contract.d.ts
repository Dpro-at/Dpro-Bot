export function backupsRoute(path: string): boolean;
export function allowedBackups(method: string, path: string, body?: unknown): boolean;
export function backupsResponse(path: string, status: number, body: unknown): Record<string, unknown>;
