export const APPROVALS_PATH:string;
export function approvalRoute(path:string):boolean;
export function allowedApproval(method:string,path:string,body?:unknown):boolean;
export function approvalResponse(path:string,status:number,body:unknown):unknown;
export const AGENT_ID:RegExp;
export function agentApprovalsPath(agentId:string):string|null;
export const TASK_MAX:number;
export function taskText(v:unknown):v is string;
