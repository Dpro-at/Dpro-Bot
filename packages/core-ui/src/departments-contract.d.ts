export const DEPARTMENT_RENAME_PATH: '/api/agents/departments/rename';
export function departmentName(x: unknown): x is string;
export function departmentsRoute(path: string): boolean;
export function allowedDepartments(method: string, path: string, body?: unknown): boolean;
export function departmentsResponse(status: number, body: unknown): { from: string; to: string; moved: number } | { code: string };
