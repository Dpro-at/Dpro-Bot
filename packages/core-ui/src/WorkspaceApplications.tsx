import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {SessionClient} from './session';
import type {Connector} from './connectors-contract.js';
import {ConnectorsController} from './connectors';
import {McpConnectionDialogs} from './McpWorkspace';
import {UiIcon} from './ui-icons';
import {TradingInstallView} from './TradingInstallView';
import {ContextMenu,useMenu} from './desktop-ui';
import type {MenuItem} from './desktop-ui';
import {WORKSPACE_APPS_PATH,type WorkspaceApp} from './apps-contract.js';

export const builtinApps=[{id:'trading',name:'Trading preview',icon:'globe',summary:'Local paper practice with fictional money and prices.'},{id:'terminal',name:'Terminal',icon:'terminal',summary:'Command sessions on this computer.'},{id:'genvr',name:'GenVR',icon:'layers',summary:'Virtual worlds and connected experiences.'}] as const;
const kinds={builtin:'Built-in',mcp:'MCP connection',api:'Account connection'};
const states:Record<WorkspaceApp['state'],string>={included:'Included',disabled:'Off',connected:'Connected',connecting:'Connecting…',disconnected:'Disconnected',attention:'Needs attention',not_connected:'Account not connected',expired:'Connect again'};
const icon=(app:WorkspaceApp)=>app.id==='terminal'?'terminal':app.id==='trading'?'chart':app.id==='genvr'?'globe':'link';
// Status dot only when it says something: green connected, amber needs you.
const dot=(app:WorkspaceApp)=>app.state==='connected'?'ready':['attention','expired','disconnected'].includes(app.state)?'warn':undefined;
type TileHandlers={open:()=>void;onAccountConnections:()=>void;onPermissions:()=>void;onManageConnections:(id?:string)=>void;toggle:()=>void;edit:()=>void;reconnect:()=>void;remove:()=>void};
/** Right-click on a tile (A3): the same actions as its inspector and ⋯ menu, with the same owner-only gates. */
export function tileActions(app:Pick<WorkspaceApp,'id'|'kind'|'name'>,{owner,busy,server}:{owner:boolean;busy:boolean;server?:{id?:string;enabled:boolean}},h:TileHandlers):MenuItem[]{
 if(app.kind==='mcp')return owner?[{label:server?.enabled?'Turn off':'Turn on',icon:'power',disabled:busy||!server,run:h.toggle},{label:'Edit connection…',icon:'pencil',disabled:busy||!server,run:h.edit},{label:'Reconnect and refresh tools',icon:'refresh',disabled:busy||!server?.enabled,run:h.reconnect},'sep',{label:'Agent permissions…',icon:'shield',run:h.onPermissions},{label:'Manage in MCP connections',icon:'link',run:()=>h.onManageConnections(server?.id)},'sep',{label:'Remove connection…',icon:'trash',danger:true,disabled:busy||!server,run:h.remove}]:[];
 const items:MenuItem[]=[{label:`Open ${app.name}`,icon:'open',run:h.open}];
 if(!owner)return items;
 if(app.id==='genvr')items.push({label:'Account connection…',icon:'contact',run:h.onAccountConnections});
 if(app.id==='terminal'||app.id==='genvr')items.push({label:'Agent permissions…',icon:'shield',run:h.onPermissions});
 return items;
}
const publicApp:WorkspaceApp={id:'genvr',name:'GenVR',kind:'api',version:null,summary:'Virtual worlds and connected experiences.',state:'included',sourceId:'genvr',permissions:[],tools:0,removable:false};

/** My apps (AA1): big icons like a launcher. Uses the existing MCP lifecycle; there is no second installation store. */
export function WorkspaceApplications({client,active,query,refresh,addRequest,onOpen,onAccountConnections,onPermissions,onManageConnections}:{client:SessionClient;active:boolean;query:string;refresh:number;addRequest:number;onOpen:(id:'terminal'|'genvr'|'trading')=>void;onAccountConnections:()=>void;onPermissions:()=>void;onManageConnections:(id?:string)=>void}){
 const owner=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot).user?.role==='owner';
 const [c]=useState(()=>new ConnectorsController(client));
 const connection=useSyncExternalStore(c.subscribe,c.getSnapshot,c.getSnapshot);
 const [items,setItems]=useState<WorkspaceApp[]>([]),[phase,setPhase]=useState<'loading'|'ready'|'error'>('loading'),[selected,setSelected]=useState(''),[setup,onSetup]=useState<Connector|'new'|null>(null),[remove,onRemove]=useState<Connector|null>(null),[notice,setNotice]=useState('');
 const {menu:tileMenu,at,close}=useMenu();
 const sequence=useRef(0),seenAdd=useRef(addRequest),list=useRef<HTMLDivElement>(null);
 const load=useCallback(async()=>{
  const seq=++sequence.current;setPhase('loading');
  try{const result=await client.request({method:'GET',path:WORKSPACE_APPS_PATH} as never);if(seq!==sequence.current)return;if(result.status!==200)throw Error('unavailable');setItems((result.body as {items:WorkspaceApp[]}).items);setPhase('ready');}
  catch{if(seq===sequence.current){setItems([]);setPhase('error');}}
 },[client]);
 useEffect(()=>{if(active&&owner){void load();void c.load();}return()=>{sequence.current++;};},[active,owner,load,c,refresh]);
 useEffect(()=>{if(!owner||!active||connection.busy||seenAdd.current===addRequest)return;seenAdd.current=addRequest;onSetup('new');},[addRequest,owner,active,connection.busy]);
 useEffect(()=>{if(!active||!owner){onSetup(null);onRemove(null);c.cancelApproval();}},[active,owner,c]);
 useEffect(()=>{if(active&&owner&&connection.phase==='ready')void load();},[active,owner,connection.servers,connection.phase,load]);
 const rows=(owner?items:[publicApp]).filter(x=>`${x.name} ${x.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
 const app=(!owner||phase==='ready')?rows.find(x=>x.id===selected):undefined,server=app?.kind==='mcp'?connection.servers.find(x=>x.id===app.sourceId):undefined;
 const busy=!!connection.busy||connection.phase==='loading'||!!setup||!!remove;
 const act=async(operation:()=>Promise<void>)=>{setNotice('');await operation();await load();};
 const open=(item:WorkspaceApp)=>{if(item.id==='terminal'||item.id==='trading'||item.id==='genvr')onOpen(item.id);};
 const contextFor=(e:React.MouseEvent|React.KeyboardEvent,x:WorkspaceApp)=>{const srv=x.kind==='mcp'?connection.servers.find(s=>s.id===x.sourceId):undefined;const items=tileActions(x,{owner,busy,server:srv},{open:()=>open(x),onAccountConnections,onPermissions,onManageConnections,toggle:()=>srv&&void act(()=>srv.enabled?c.disable(srv.id):c.enable(srv.id)),edit:()=>srv&&onSetup(srv),reconnect:()=>srv&&void act(()=>c.reconnect(srv.id)),remove:()=>srv&&onRemove(srv)});setSelected(x.id);if(items.length)at(e,items);};
 const groups=[{name:'Comes with Dpro',apps:rows.filter(x=>x.kind==='builtin'||x.id==='genvr')},{name:'Connected services',apps:rows.filter(x=>x.kind!=='builtin'&&x.id!=='genvr')}].filter(g=>g.apps.length);
 const ordered=groups.flatMap(g=>g.apps);
 const move=(e:React.KeyboardEvent<HTMLDivElement>)=>{if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key)||!ordered.length)return;e.preventDefault();const index=ordered.findIndex(x=>x.id===selected),step=e.key==='ArrowDown'||e.key==='ArrowRight'?1:-1,next=e.key==='Home'?0:e.key==='End'?ordered.length-1:Math.max(0,Math.min(ordered.length-1,index+step));setSelected(ordered[next].id);list.current?.querySelectorAll<HTMLButtonElement>('[role=option]')[next]?.focus();};
 const menu=(items:{label:string;run:()=>void;disabled?:boolean}[])=>items.length?<details className="st-menu apps-more"><summary className="tool" aria-label={`More for ${app?.name}`} title="More"><UiIcon name="more" size={15}/></summary><div role="menu">{items.map(x=><button key={x.label} type="button" role="menuitem" aria-label={x.label.replace(/…$/,'')} disabled={x.disabled} onClick={e=>{(e.currentTarget.closest('details') as HTMLDetailsElement|null)?.removeAttribute('open');x.run();}}>{x.label}</button>)}</div></details>:null;
 return <><div className="apps-panes" data-selected={!!app} onKeyDown={e=>{if(e.defaultPrevented)return;if(e.shiftKey&&e.key==='F10'&&selected==='trading'){e.preventDefault();e.currentTarget.querySelector<HTMLElement>('summary[aria-label="Paper setup actions"]')?.click();}}}>
 <div className="apps-list apps-launcher">
 {owner&&phase==='loading'&&<p className="apps-empty" role="status">Reading applications…</p>}
 {owner&&phase==='error'?<div className="apps-empty" role="alert"><p>Applications could not be loaded. Your connections have not changed.</p><button onClick={()=>{void load();void c.load();}}>Try again</button></div>:<div ref={list} role="listbox" aria-label="Applications" aria-orientation="horizontal" onKeyDown={move}>{groups.map(g=><div key={g.name} role="group" aria-label={g.name} className="apps-group"><p className="apps-group-name">{g.name}</p><div className="apps-tiles">{g.apps.map(x=><button key={x.id} role="option" tabIndex={selected===x.id||!ordered.some(row=>row.id===selected)&&x===ordered[0]?0:-1} aria-selected={selected===x.id} className="apps-tile" data-app={x.id} title="Double-click to open" onClick={()=>setSelected(x.id)} onDoubleClick={()=>open(x)} onContextMenu={e=>contextFor(e,x)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setSelected(x.id);open(x);}else if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'&&x.id!=='trading'){contextFor(e,x);}}}><span className="apps-tile-icon" aria-hidden="true"><UiIcon name={icon(x)} size={26}/>{dot(x)&&<i data-state={dot(x)}/>}</span><span className="apps-tile-name">{x.name}</span><small>{x.id==='trading'?'Included preview':states[x.state]}</small></button>)}</div></div>)}</div>}
 {(!owner||phase==='ready')&&!rows.length&&<div className="apps-empty"><p>{query?'No app matches your search.':'Add a connection to give your agents access to an app.'}</p>{!query&&owner&&<button onClick={()=>onSetup('new')}>Add connection</button>}</div>}
 </div>
 <aside className="apps-inspector" aria-label="Selected application"><button className="apps-back" onClick={()=>setSelected('')}><UiIcon name="arrow-left" size={15}/>Back to apps</button>
 {app?<><div className="apps-inspector-head"><span className="apps-tile-icon" data-app={app.id} aria-hidden="true"><UiIcon name={icon(app)} size={22}/></span><div><h3>{app.name}</h3><p className="apps-inspector-line">{kinds[app.kind]} · {app.id==='trading'?'Included preview':states[app.state]}</p></div></div><p>{app.summary}</p>
 {app.id==='trading'?<TradingInstallView client={client} active={active} onPreview={()=>onOpen('trading')} onPermissions={onPermissions}/>:app.kind==='mcp'?<>
 <div className="apps-actions"><button className="primary" disabled={busy||!server} onClick={()=>server&&void act(()=>server.enabled?c.disable(server.id):c.enable(server.id))}><UiIcon name="power" size={15}/>{server?.enabled?'Turn off':'Turn on'}</button>
 {menu([{label:'Edit connection…',disabled:busy||!server,run:()=>server&&onSetup(server)},{label:'Reconnect and refresh tools',disabled:busy||!server?.enabled,run:()=>server&&void act(()=>c.reconnect(server.id))},{label:'Agent permissions…',run:onPermissions},{label:'Manage in MCP connections',run:()=>onManageConnections(server?.id)},{label:'Remove connection…',disabled:busy||!server,run:()=>server&&onRemove(server)}])}</div>
 {connection.phase==='error'&&<p role="alert">Connection controls could not be loaded. <button onClick={()=>void c.load()}>Try again</button></p>}
 <p className="fine-print">{app.tools?`${app.tools} tools found. Choose which agents may use them in their permissions.`:'Turn the connection on to find its tools.'}</p>
 </>:<div className="apps-actions"><button className="primary" onClick={()=>open(app)}><UiIcon name={icon(app)} size={15}/>Open {app.name}</button>{owner&&menu([...(app.id==='genvr'?[{label:'Account connection…',run:onAccountConnections}]:[]),...(app.id==='terminal'||app.id==='genvr'?[{label:'Agent permissions…',run:onPermissions}]:[])])}</div>}
 {owner&&<section className="apps-may" aria-label="What it may do"><h4>What it may do</h4>{app.permissions.length?<ul>{app.permissions.map(x=><li key={x}>{x}</li>)}</ul>:<p className="fine-print">Nothing listed.</p>}<p className="fine-print">Adding an app never gives its tools to an agent.</p></section>}
 </>:<p className="apps-empty">Choose an app to open it or see what it may do.</p>}
 </aside></div>
 <ContextMenu menu={tileMenu} onClose={close}/>
 {(notice||connection.notice)&&<p className="apps-notice" role="status">{notice||connection.notice}</p>}
 {owner&&active&&<McpConnectionDialogs c={c} setup={setup} onSetup={onSetup} remove={remove} onRemove={onRemove} onSaved={id=>{setSelected('mcp:'+id);setNotice(setup==='new'?'Connection added off. Review access before turning it on.':'Connection saved. Review access if its target changed.');void load();}} onRemoved={()=>{setSelected('');void load();}}/>}
 </>;
}
