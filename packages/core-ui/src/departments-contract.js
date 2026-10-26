// Wire contract for Settings › Departments, shared by the browser client
// (session.ts) and the local bridge (application-server.cjs). A department is
// the agents' own `department` value; renaming one moves every agent in it.

export const DEPARTMENT_RENAME_PATH = '/api/agents/departments/rename';
/** The same shape as an agent's department on the agent page (lowercase, at most 64). */
export const departmentName = x => typeof x === 'string' && /^[a-z0-9][a-z0-9 _-]{0,63}$/.test(x);
const record = x => typeof x === 'object' && x !== null && !Array.isArray(x);

export function departmentsRoute(path) { return path === DEPARTMENT_RENAME_PATH; }
export function allowedDepartments(method, path, body) {
  return departmentsRoute(path) && method === 'POST' && record(body) && Object.keys(body).length === 2
    && departmentName(body.from) && departmentName(body.to);
}
/** Only the rename result (or a known code) passes back to the page. */
export function departmentsResponse(status, body) {
  if (status === 200) {
    if (!record(body) || typeof body.from !== 'string' || typeof body.to !== 'string' || !Number.isSafeInteger(body.moved) || body.moved < 0) throw Error('protocol');
    return { from: body.from, to: body.to, moved: body.moved };
  }
  return { code: status === 404 ? 'not_found' : status === 403 ? 'forbidden' : status === 400 ? 'invalid_input' : 'unavailable' };
}
