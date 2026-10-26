import type {SessionClient} from './session';
import type {UiIconName} from './ui-icons';
import {agentApprovalsPath} from './approvals-contract.js';
import {approvalStatusLabel,requestIcon,requestTitle} from './ApprovalPage';
/** Small pure helpers shared by the Approvals places and the agent page. None of them decides anything. */
export type AgentApproval=Readonly<{id:string;status:string;agentId:string|null;toolName:string;category:string|null;requestedAt:string}>;
/** The requests one agent sent, newest first. Owner only on the server; an id that is not a plain agent id reads nothing. */
export async function agentApprovals(client:Pick<SessionClient,'request'>,agentId:string,signal?:AbortSignal):Promise<AgentApproval[]>{
 const path=agentApprovalsPath(agentId);if(!path)return [];
 const r=await client.request({method:'GET',path} as never,signal);if(r.status!==200)throw Error('approvals_unavailable');
 return ((r.body as {approvals?:AgentApproval[]}).approvals??[]).filter(a=>a.agentId===agentId);
}
export type ApprovalActivity=Readonly<{key:string;at:string;icon:UiIconName;tone:string;title:string;text:string;approvalId:string}>;
const lowerFirst=(v:string)=>v?v.charAt(0).toLowerCase()+v.slice(1):v;
/** Approval requests as plain timeline items: "Asked to send a message" · "Waiting for you". */
export function approvalActivity(list:readonly AgentApproval[]):ApprovalActivity[]{
 return list.map(a=>({key:'a'+a.id,at:a.requestedAt,icon:requestIcon(a.category),tone:a.status==='pending'?'blue':'teal',title:`Asked to ${lowerFirst(requestTitle(a.toolName,a.category))}`,text:approvalStatusLabel[a.status]??a.status,approvalId:a.id}));
}
/** Several timelines into one, newest first. */
export function mergeTimeline<T extends {at:string}>(...parts:readonly (readonly T[])[]):T[]{return parts.flat().sort((x,y)=>y.at.localeCompare(x.at));}
/** "2 of 3 people still needed" for a review row; null when the server sent no count. */
export function stillNeeded(item:{votesNeeded?:number;votesGiven?:number}):string|null{
 if(typeof item.votesNeeded!=='number'||typeof item.votesGiven!=='number')return null;
 const still=Math.max(0,item.votesNeeded-item.votesGiven);
 return still>0?`${still} of ${item.votesNeeded} ${item.votesNeeded===1?'person':'people'} still needed`:'Enough people agreed · the owner decides';
}
/** Reviews asked of me that still wait for my own answer. */
export function unansweredCount(items:readonly {ownVote?:unknown}[]):number{return items.filter(i=>!i.ownVote).length;}
/** Row selection like a desktop list: click picks one, ⌘/Ctrl toggles, Shift picks a range from the anchor. */
export function nextSelection(order:readonly string[],current:readonly string[],id:string,mods:{toggle?:boolean;range?:boolean},anchor?:string):string[]{
 if(mods.range&&anchor&&order.includes(anchor)){const a=order.indexOf(anchor),b=order.indexOf(id);if(b<0)return [...current];const [from,to]=a<b?[a,b]:[b,a];return order.slice(from,to+1);}
 if(mods.toggle){const next=current.includes(id)?current.filter(v=>v!==id):[...current,id];return order.filter(v=>next.includes(v));}
 return [id];
}
export type Mode='off'|'ask'|'allow';
export type ModeChange=Readonly<{agentId:string;category:string;from:Mode;to:Mode}>;
/** One change per selected agent whose current value differs; agents not read yet are left out. */
export function planChanges(rows:readonly {id:string;permissions?:{modes:Record<string,Mode>}}[],ids:readonly string[],category:string,to:Mode):ModeChange[]{
 return ids.flatMap(id=>{const from=rows.find(r=>r.id===id)?.permissions?.modes[category];return from&&from!==to?[{agentId:id,category,from,to}]:[];});
}
/** Undo of a group of changes: each one back to where it was. */
export function reverseChanges(changes:readonly ModeChange[]):ModeChange[]{return changes.map(c=>({...c,from:c.to,to:c.from}));}
/** The value every selected agent shares for one action, or null when they differ. */
export function sharedMode(rows:readonly {id:string;permissions?:{modes:Record<string,Mode>}}[],ids:readonly string[],category:string):Mode|null{
 const modes=new Set(ids.map(id=>rows.find(r=>r.id===id)?.permissions?.modes[category]));return modes.size===1?[...modes][0]??null:null;
}
/** Maps a registry name `mcp__<server>__<tool>` to its connection id and the tool's own name. */
export function mcpToolTarget(name:string,servers:readonly {id:string;name:string;tools:readonly {name:string}[]}[]):{serverId:string;tool:string}|null{
 const m=/^mcp__([a-z0-9-]+)__(.+)$/.exec(name);if(!m)return null;
 const server=servers.find(s=>s.name===m[1]);if(!server)return null;
 const tool=server.tools.find(t=>t.name===m[2])??server.tools.find(t=>t.name.replace(/[^A-Za-z0-9_-]/g,'_')===m[2]);
 return tool?{serverId:server.id,tool:tool.name}:null;
}
