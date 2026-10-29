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
  if(!x||typeof x.id!=='string'||!(/^(terminal|trading|code|genvr|mcp:[a-f0-9-]{36})$/).test(x.id)||seen.has(x.id)||!['builtin','mcp','api'].includes(x.kind)||!['included','disabled','connected','connecting','disconnected','attention','not_connected','expired'].includes(x.state)||!Number.isSafeInteger(x.tools)||x.tools<0||x.tools>10000||!Array.isArray(x.permissions)||x.permissions.length>60)throw Error('protocol');
  if(x.kind==='mcp'?(x.id!=='mcp:'+x.sourceId||x.removable!==true):x.sourceId!==(x.id==='genvr'?'genvr':null)||x.removable!==false)throw Error('protocol');
  if(x.kind!==(x.id==='genvr'?'api':x.id.startsWith('mcp:')?'mcp':'builtin'))throw Error('protocol');
  seen.add(x.id);
  return {id:x.id,name:text(x.name,180),kind:x.kind,version:x.version===null?null:text(x.version,80),summary:text(x.summary,1500),state:x.state,sourceId:x.sourceId,permissions:x.permissions.map(p=>{if(typeof p!=='string')throw Error('protocol');return text(p,180);}),tools:x.tools,removable:x.removable};
 })};
}

/** The Store (STORE-UI-01): one read for the window, Add bound to the shown hash, Remove. */
export const STORE_PATH='/api/store',STORE_INSTALL_PATH='/api/store/install',STORE_UNINSTALL_PATH='/api/store/uninstall';
export const storeRoute=path=>path===STORE_PATH||path===STORE_INSTALL_PATH||path===STORE_UNINSTALL_PATH;
const STORE_ID=/^[a-z0-9][a-z0-9._@:-]{0,319}$/i,STORE_HASH=/^[a-f0-9]{64}$/;
const plain=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export function allowedStore(method,path,body){
 if(path===STORE_PATH)return method==='GET'&&body===undefined;
 if(path===STORE_INSTALL_PATH)return method==='POST'&&plain(body,['id','hash'])&&typeof body.id==='string'&&STORE_ID.test(body.id)&&typeof body.hash==='string'&&STORE_HASH.test(body.hash);
 if(path===STORE_UNINSTALL_PATH)return method==='POST'&&plain(body,['id'])&&typeof body.id==='string'&&STORE_ID.test(body.id);
 return false;
}
const STORE_STATES=['included','installed','available','elsewhere'],STORE_SOURCES=['girru','claude-code','codex'];
const texts=(x,max,each)=>{if(!Array.isArray(x)||x.length>max)throw Error('protocol');return x.map(v=>{if(typeof v!=='string')throw Error('protocol');return text(v,each);});};
export function storeResponse(path,status,body){
 if(path!==STORE_PATH){
  if(status===200){if(!body||body.ok!==true||!STORE_STATES.includes(body.state))throw Error('protocol');return {ok:true,state:body.state};}
  return {code:['not_found','not_installable','changed','refused','invalid_input'].includes(body?.code)?body.code:'store_unavailable',message:text(body?.message,300)};
 }
 if(status!==200)return {code:'store_unavailable'};
 if(!body||body.schema!==1||!Array.isArray(body.items)||body.items.length>2000||!Array.isArray(body.collections)||body.collections.length>20||!Array.isArray(body.categories)||body.categories.length>20)throw Error('protocol');
 const seen=new Set();
 const items=body.items.map(x=>{
  if(!x||typeof x.id!=='string'||!STORE_ID.test(x.id)||seen.has(x.id)||!STORE_STATES.includes(x.state)||!STORE_SOURCES.includes(x.source)||typeof x.hash!=='string'||!STORE_HASH.test(x.hash)||(x.icon!==null&&(typeof x.icon!=='string'||!/^[a-z][a-z-]{0,39}$/.test(x.icon))))throw Error('protocol');
  seen.add(x.id);
  return {id:x.id,kind:text(x.kind,20),source:x.source,name:text(x.name,150),summary:text(x.summary,200),description:text(x.description,3000),icon:x.icon,maker:text(x.maker,150),verified:x.verified===true,version:x.version===null?null:text(x.version,80),updated:x.updated===null?null:text(x.updated,40),category:text(x.category,40),permissions:texts(x.permissions,60,200),worksWith:texts(x.worksWith,20,120),languages:texts(x.languages,20,60),state:x.state,present:x.present===true,update:x.update===null?null:text(x.update,80),hash:x.hash};
 });
 // Projected twice (application server, then the window): the result passes its own check.
 return {schema:1,featured:typeof body.featured==='string'&&seen.has(body.featured)?body.featured:null,
  collections:body.collections.map(c=>({id:text(c?.id,80),title:text(c?.title,80),items:texts(c?.items,60,320).filter(id=>seen.has(id))})),
  categories:body.categories.map(c=>{if(!c||typeof c.icon!=='string'||!/^[a-z][a-z-]{0,39}$/.test(c.icon))throw Error('protocol');return {id:text(c.id,40),title:text(c.title,80),icon:c.icon};}),
  items,limited:texts(body.limited??[],10,40),
  // APPS-06: when the Girru Store repository was last read (the copy shown without internet).
  storeAsOf:typeof body.storeAsOf==='string'&&!Number.isNaN(Date.parse(body.storeAsOf))?body.storeAsOf.slice(0,40):null};
}
