import {listServers,connectionState,type McpServerView} from '../mcp-client/index.js';
import {genvrConnection,type GenvrConnection} from './genvr-account.js';

export type WorkspaceApp = {
  id:string; name:string; kind:'builtin'|'mcp'|'api'; version:string|null; summary:string;
  state:'included'|'disabled'|'connected'|'connecting'|'disconnected'|'attention'|'not_connected'|'expired';
  sourceId:string|null; permissions:string[]; tools:number; removable:boolean;
};
export const BUNDLED_APPS:ReadonlyArray<WorkspaceApp> = [
  {id:'terminal',name:'Terminal',kind:'builtin',version:null,summary:'Command sessions on this computer.',state:'included',sourceId:null,permissions:['Host account access when you start a shell'],tools:0,removable:false},
  {id:'trading',name:'Trading preview',kind:'builtin',version:null,summary:'Local paper practice with fictional money and prices.',state:'included',sourceId:null,permissions:['Paper setup requires owner review','Live orders are not connected'],tools:0,removable:false},
];
export interface WorkspaceAppsSources {
  servers:()=>Promise<McpServerView[]>;
  account:(ownerId:string)=>Promise<GenvrConnection>;
  state:(serverId:string)=>string;
}
const defaults:WorkspaceAppsSources={servers:listServers,account:genvrConnection,state:connectionState};
/** A projection of existing registries. Reading this list never installs, connects or grants tools. */
export async function listWorkspaceApps(ownerId:string,sources:WorkspaceAppsSources=defaults):Promise<{items:WorkspaceApp[]}> {
  const [servers,account]=await Promise.all([sources.servers(),sources.account(ownerId)]);
  const items:WorkspaceApp[]=BUNDLED_APPS.map(x=>({...x,permissions:[...x.permissions]}));
  items.push({id:'genvr',name:'GenVR',kind:'api',version:null,summary:'Virtual worlds with your existing GenVR account connection.',state:account.status==='error'?'attention':account.status,sourceId:'genvr',permissions:['Account access is reviewed in Connections','World publishing needs owner approval'],tools:0,removable:false});
  const seen=new Set(items.map(x=>x.id));
  for(const server of servers){
    const id='mcp:'+server.id;
    if(seen.has(id))continue;
    seen.add(id);
    const live=sources.state(server.id);
    const state:WorkspaceApp['state']=!server.enabled?'disabled':!server.active||server.lastError?'attention':live==='connected'?'connected':live==='connecting'?'connecting':'disconnected';
    items.push({id,name:server.name,kind:'mcp',version:null,summary:server.description||'Tools from a configured connection.',state,sourceId:server.id,permissions:['Tools require a separate grant for each agent',...(server.transport==='stdio'?['Local program launch requires owner approval']:['Connects to the configured service'])],tools:server.tools.length,removable:true});
  }
  return {items};
}
