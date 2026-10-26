// Plain words and small pure helpers for the MCP connections window (boards MC1, MC2).
// No network here: the window and the sheets call the owner-gated controller.
import type {Connector} from './connectors-contract.js';
import type {SessionClient} from './session';
import {splitArgs} from './connectors';

export type McpFilter='all'|'on'|'off'|'problem';
export type McpKind='program'|'web';
/** A connection that is on but cannot work: it needs the owner. */
export const isProblem=(x:Connector)=>x.enabled&&(!!x.lastError||!x.active);
export const matchesFilter=(x:Connector,filter:McpFilter)=>filter==='all'||filter==='off'&&!x.enabled||filter==='problem'&&isProblem(x)||filter==='on'&&x.enabled;
export const kindWords=(transport:string)=>transport==='stdio'?'Program on this computer':'Web address';
export const cleanError=(e:string)=>e.replace(/^[a-z_]+:\s*/,'');
/** A short reason a connection needs the owner, in plain words. */
export function problemReason(error:string){return /\b(401|403)\b|unauthori|forbidden|credential|api.?key|token|auth/i.test(error)?'wrong key':/ENOENT|not found|spawn|executable/i.test(error)?'program not found':/timed? ?out|timeout/i.test(error)?'no answer':'could not connect';}
export type Tone='ok'|'warn'|'block'|'off'|'on';
export function stateOf(x:Connector):{words:string;tone:Tone}{
 if(!x.enabled)return {words:'Off',tone:'off'};
 if(!x.active)return {words:'Blocked by this computer’s settings',tone:'block'};
 if(x.lastError)return {words:`Needs you · ${problemReason(x.lastError)}`,tone:'warn'};
 return x.connectionState==='connected'?{words:'Connected',tone:'ok'}:x.connectionState==='connecting'?{words:'Connecting',tone:'on'}:x.connectionState==='disconnected'?{words:'Disconnected',tone:'warn'}:{words:'On',tone:'on'};
}
export type NextStep={text:string;action:'enable'|'reconnect'|null;label:string};
/** The selected connection's next step in one line, and the one button that fits. */
export function nextStep(x:Connector):NextStep{
 const program=x.transport==='stdio';
 if(!x.enabled)return program?{text:'Ready to start. Turning it on asks you once to allow its program.',action:'enable',label:'Turn on…'}:{text:'Ready to connect. The service must already be running at its address.',action:'enable',label:'Turn on'};
 if(!x.active)return {text:'This computer’s settings do not let programs run. An administrator must allow them first.',action:null,label:''};
 if(x.lastError)return {text:program?'It could not start or answer. Check its program and secrets in Edit, then reconnect.':'It could not be reached. Check that the service runs, and its address and secrets in Edit, then reconnect.',action:'reconnect',label:'Reconnect'};
 if(x.connectionState==='connected')return {text:'Connected. Choose which agents may use its tools.',action:null,label:''};
 return {text:'Not connected right now. Reconnect to open it again.',action:'reconnect',label:'Reconnect'};
}
const bare=/^[^\s"'\\]+$/;
/** One editable command line; quotes only where a part has spaces. */
export function commandLine(command:string,args:readonly string[]){return [command,...args].map(a=>bare.test(a)?a:!a.includes('"')?`"${a}"`:!a.includes("'")?`'${a}'`:JSON.stringify(a)).join(' ');}
/** Whether the one-line field can hold this program exactly; otherwise it is edited part by part. */
export function roundTrips(command:string,args:readonly string[]){return JSON.stringify(splitArgs(commandLine(command,args)))===JSON.stringify([command,...args]);}
/** The exact program for an approval: every part unambiguous. */
export function exactLine(command:string,args:readonly string[]){return [command,...args].map(a=>bare.test(a)?a:JSON.stringify(a)).join(' ');}
export const guessKind=(text:string):McpKind=>/^\s*https?:\/\//i.test(text)?'web':'program';
const slug=(x:string)=>x.toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').replace(/^mcp-|-mcp-server$|-mcp$|-server$/g,'').slice(0,24).replace(/-$/,'');
/** A name suggested from a pasted address or command ("@scope/calendar-server" → "calendar"). */
export function guessName(text:string){
 const t=text.trim();if(!t)return '';
 if(guessKind(t)==='web'){try{const u=new URL(t),skip=new Set(['www','mcp','api','localhost','com','net','org','io','dev','app','example']);const label=u.hostname.split('.').find(p=>!skip.has(p)&&!/^\d+$/.test(p))??u.pathname.split('/').find(p=>p&&!skip.has(p))??'';return slug(label);}catch{return '';}}
 const parts=splitArgs(t),pick=parts.slice(1).find(p=>!p.startsWith('-')&&!/^\d+$/.test(p)&&!['run','dlx','exec','x','-m'].includes(p))??parts[0]??'';
 return slug(pick.replace(/^@[^/]+\//,'').replace(/@[^/]*$/,'').split(/[\\/]/).pop()!.replace(/\.(m?js|ts|py|exe)$/,''));
}
export const toolPrefix=(name:string)=>`mcp__${name}__`;
export type AgentUse={id:string;name:string;version:number;grants:string[];tools:string[]};
/** How much of this connection an agent may use. */
export function useLevel(a:AgentUse,prefix:string):'all'|'some'|'none'{const n=a.grants.filter(g=>g.startsWith(prefix)).length;return !n?'none':a.tools.length>0&&a.tools.every(t=>a.grants.includes(t))?'all':'some';}
/** New grants for one agent: every current tool of this connection, or none of them. Other tools stay untouched. */
export function planGrants(grants:readonly string[],tools:readonly string[],prefix:string,give:boolean){const rest=grants.filter(g=>!g.startsWith(prefix));return give?[...rest,...tools.filter(t=>t.startsWith(prefix))]:rest;}
/** Undo: put this connection's part of the grants back as it was, keeping every other change. */
export function restoreGrants(current:readonly string[],before:readonly string[],prefix:string){return [...current.filter(g=>!g.startsWith(prefix)),...before.filter(g=>g.startsWith(prefix))];}

type GrantView={version:number;grants:{tool:string}[];available:{name:string;allowedByServer:boolean}[]};
async function rpc<T>(client:SessionClient,method:string,path:string,body?:unknown):Promise<T>{const r=await client.request({method,path,...(body===undefined?{}:{body})} as never);if(r.status!==200)throw Error((r.body as {code?:string})?.code??'unavailable');return r.body as T;}
const grantsPath=(id:string)=>`/api/agents/${encodeURIComponent(id)}/tool-grants`;
/** Every agent (except the small local one, which never gets connection tools) and how much of this connection it may use. */
export async function loadAgentUse(client:SessionClient,server:Connector):Promise<AgentUse[]>{
 const a=await rpc<{agents:{id:string;name?:string}[]}>(client,'GET','/api/agents'),prefix=toolPrefix(server.name);
 return Promise.all(a.agents.filter(x=>x.id!=='small-local-agent').slice(0,200).map(async x=>{const g=await rpc<GrantView>(client,'GET',grantsPath(x.id));return {id:x.id,name:x.name||x.id,version:g.version,grants:g.grants.map(t=>t.tool),tools:g.available.filter(t=>t.name.startsWith(prefix)&&t.allowedByServer).map(t=>t.name)};}));
}
/** Writes one agent's grants for this connection with the existing per-agent grant API (fresh version, other tools kept). Returns the grants before. */
export async function writeAgent(client:SessionClient,id:string,next:(grants:string[],tools:string[])=>string[],prefix:string){const g=await rpc<GrantView>(client,'GET',grantsPath(id));const grants=g.grants.map(t=>t.tool),tools=g.available.filter(t=>t.name.startsWith(prefix)&&t.allowedByServer).map(t=>t.name);await rpc(client,'PUT',grantsPath(id),{grants:[...new Set(next(grants,tools))],expectedVersion:g.version,keepScopes:true});return grants;}
