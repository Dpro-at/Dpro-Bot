export const APPS_CATALOGUE_PATH='/api/marketplace/search?limit=100&offset=0';
export const appsCatalogueRoute=path=>path===APPS_CATALOGUE_PATH;
export const allowedAppsCatalogue=(method,path,body)=>appsCatalogueRoute(path)&&method==='GET'&&body===undefined;
const text=(x,max)=>typeof x==='string'?x.slice(0,max).replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,''):'';
export function appsCatalogueResponse(status,body){
 if(status!==200)return {code:'catalogue_unavailable'};
 if(!body||!(body.success===true||Array.isArray(body.items))||!Array.isArray(body.extensions??body.items)||(body.extensions??body.items).length>100||!Number.isSafeInteger(body.total)||body.total<0)throw Error('protocol');
 return {total:body.total,items:(body.extensions??body.items).map(x=>{if(!x||typeof x.id!=='string'||!x.id.length||x.id.length>180||!['app','channel','tool','integration'].includes(x.type))throw Error('protocol');return {id:text(x.id,180),name:text(x.name,180),description:text(x.description,1500),author:text(x.author,180),version:text(x.version,80),type:x.type,permissions:Array.isArray(x.permissions)?x.permissions.filter(p=>typeof p==='string').slice(0,60).map(p=>text(p,120)):[],installed:x.installed===true,verified:x.verified===true};})};
}
export const SOURCE_CATALOGUE_PATH='/api/chat/addons/catalogue';
export const sourceCatalogueRoute=path=>path===SOURCE_CATALOGUE_PATH;
export const allowedSourceCatalogue=(method,path,body)=>sourceCatalogueRoute(path)&&method==='GET'&&body===undefined;
export function sourceCatalogueResponse(status,body){
 if(status!==200)return {code:'catalogue_unavailable'};
 if(!body||!Array.isArray(body.items)||body.items.length>800||!Array.isArray(body.sources)||body.sources.length>60)throw Error('protocol');
 const source=x=>['claude-code','codex'].includes(x);
 return {items:body.items.map(x=>{if(!x||typeof x.id!=='string'||x.id.length>320||!source(x.source)||typeof x.present!=='boolean')throw Error('protocol');return {id:text(x.id,320),name:text(x.name,150),description:text(x.description,1000),publisher:text(x.publisher,150),source:x.source,present:x.present};}),sources:body.sources.map(x=>{if(!x||!source(x.source)||!['limited','local_snapshot'].includes(x.status))throw Error('protocol');return {source:x.source,name:text(x.name,150),status:x.status};})};
}

/** Unified local app inventory; lifecycle changes use the existing reviewed services. */
export const WORKSPACE_APPS_PATH='/api/apps';
export const workspaceAppsRoute=path=>path===WORKSPACE_APPS_PATH;
export const allowedWorkspaceApps=(method,path,body)=>workspaceAppsRoute(path)&&method==='GET'&&body===undefined;
export function workspaceAppsResponse(status,body){
 if(status!==200)return {code:'apps_unavailable'};
 if(!body||!Array.isArray(body.items)||body.items.length>1000)throw Error('protocol');
 const seen=new Set();
 return {items:body.items.map(x=>{
  if(!x||typeof x.id!=='string'||!(/^(terminal|trading|genvr|mcp:[a-f0-9-]{36})$/).test(x.id)||seen.has(x.id)||!['builtin','mcp','api'].includes(x.kind)||!['included','disabled','connected','connecting','disconnected','attention','not_connected','expired'].includes(x.state)||!Number.isSafeInteger(x.tools)||x.tools<0||x.tools>10000||!Array.isArray(x.permissions)||x.permissions.length>60)throw Error('protocol');
  if(x.kind==='mcp'?(x.id!=='mcp:'+x.sourceId||x.removable!==true):x.sourceId!==(x.id==='genvr'?'genvr':null)||x.removable!==false)throw Error('protocol');
  if(x.kind!==(x.id==='genvr'?'api':x.id.startsWith('mcp:')?'mcp':'builtin'))throw Error('protocol');
  seen.add(x.id);
  return {id:x.id,name:text(x.name,180),kind:x.kind,version:x.version===null?null:text(x.version,80),summary:text(x.summary,1500),state:x.state,sourceId:x.sourceId,permissions:x.permissions.map(p=>{if(typeof p!=='string')throw Error('protocol');return text(p,180);}),tools:x.tools,removable:x.removable};
 })};
}
