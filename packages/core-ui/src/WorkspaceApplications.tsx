import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {SessionClient} from './session';
import type {Connector} from './connectors-contract.js';
import {ConnectorsController} from './connectors';
import {McpConnectionDialogs} from './McpWorkspace';
import {UiIcon} from './ui-icons';
import {TradingInstallView} from './TradingInstallView';
import {WORKSPACE_APPS_PATH,type WorkspaceApp} from './apps-contract.js';

export const builtinApps=[{id:'trading',name:'Trading preview',icon:'globe',summary:'Market terminal with clearly labelled sample data.'},{id:'terminal',name:'Terminal',icon:'terminal',summary:'Command sessions on this computer.'},{id:'genvr',name:'GenVR',icon:'layers',summary:'Virtual worlds and connected experiences.'}] as const;
export type AppKind='all'|'builtin'|'mcp'|'api';
const kinds={builtin:'Built-in',mcp:'MCP connection',api:'Account connection'};
const states:Record<WorkspaceApp['state'],string>={included:'Included',disabled:'Off',connected:'Connected',connecting:'Connecting…',disconnected:'Disconnected',attention:'Needs attention',not_connected:'Account not connected',expired:'Connect again'};
const icon=(app:WorkspaceApp)=>app.id==='terminal'?'terminal':app.id==='trading'?'globe':app.id==='genvr'?'layers':'link';
const publicApp:WorkspaceApp={id:'genvr',name:'GenVR',kind:'api',version:null,summary:'Virtual worlds and connected experiences.',state:'included',sourceId:'genvr',permissions:[],tools:0,removable:false};

/** Uses the existing MCP lifecycle and account Settings. There is no second installation store. */
export function WorkspaceApplications({client,active,query,kind,refresh,addRequest,onOpen,onAccountConnections,onPermissions,onManageConnections}:{client:SessionClient;active:boolean;query:string;kind:AppKind;refresh:number;addRequest:number;onOpen:(id:'terminal'|'genvr'|'trading')=>void;onAccountConnections:()=>void;onPermissions:()=>void;onManageConnections:()=>void}){
 const owner=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot).user?.role==='owner';
 const [c]=useState(()=>new ConnectorsController(client));
 const connection=useSyncExternalStore(c.subscribe,c.getSnapshot,c.getSnapshot);
 const [items,setItems]=useState<WorkspaceApp[]>([]),[phase,setPhase]=useState<'loading'|'ready'|'error'>('loading'),[selected,setSelected]=useState(''),[setup,onSetup]=useState<Connector|'new'|null>(null),[remove,onRemove]=useState<Connector|null>(null),[notice,setNotice]=useState('');
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
 const rows=(owner?items:[publicApp]).filter(x=>(kind==='all'||x.kind===kind)&&`${x.name} ${x.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
 const app=(!owner||phase==='ready')?rows.find(x=>x.id===selected):undefined,server=app?.kind==='mcp'?connection.servers.find(x=>x.id===app.sourceId):undefined;
 const busy=!!connection.busy||connection.phase==='loading'||!!setup||!!remove;
 const act=async(operation:()=>Promise<void>)=>{setNotice('');await operation();await load();};
 const open=(item:WorkspaceApp)=>{if(item.id==='terminal'||item.id==='trading'||item.id==='genvr')onOpen(item.id);};
 const move=(e:React.KeyboardEvent<HTMLDivElement>)=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key)||!rows.length)return;e.preventDefault();const index=rows.findIndex(x=>x.id===selected),next=e.key==='Home'?0:e.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,index+(e.key==='ArrowDown'?1:-1)));setSelected(rows[next].id);list.current?.querySelectorAll<HTMLButtonElement>('[role=option]')[next]?.focus();};
 return <><div className="apps-panes" data-selected={!!app} onKeyDown={e=>{if(e.defaultPrevented)return;if(e.shiftKey&&e.key==='F10'&&selected==='trading'){e.preventDefault();e.currentTarget.querySelector<HTMLElement>('summary[aria-label="Paper setup actions"]')?.click();}}}>
 <div className="apps-list">
 {owner&&phase==='loading'&&<p className="apps-empty" role="status">Reading applications…</p>}
 {owner&&phase==='error'?<div className="apps-empty" role="alert"><p>Applications could not be loaded. Your connections have not changed.</p><button onClick={()=>{void load();void c.load();}}>Try again</button></div>:<div ref={list} role="listbox" aria-label="Applications" onKeyDown={move}>{rows.map(x=><button key={x.id} role="option" tabIndex={selected===x.id||!rows.some(row=>row.id===selected)&&x===rows[0]?0:-1} aria-selected={selected===x.id} className="apps-row" onClick={()=>setSelected(x.id)} onDoubleClick={()=>open(x)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setSelected(x.id);open(x);}}}><span className="apps-icon"><UiIcon name={icon(x)} size={20}/></span><span><strong>{x.name}</strong><small>{kinds[x.kind]}</small></span><small>{x.id==='trading'?'Included preview':states[x.state]}</small></button>)}</div>}
 {(!owner||phase==='ready')&&!rows.length&&<div className="apps-empty"><p>{query?'No applications match your search.':kind==='mcp'?'Add a connection to give your agents access to an app.':'No applications of this kind yet.'}</p>{kind==='mcp'&&owner&&<button onClick={()=>onSetup('new')}>Add connection</button>}</div>}
 </div>
 <aside className="apps-inspector" aria-label="Selected application"><button className="apps-back" onClick={()=>setSelected('')}><UiIcon name="arrow-left" size={15}/>Back to apps</button>
 {app?<><header><UiIcon name={icon(app)} size={30}/><h3>{app.name}</h3><p>{kinds[app.kind]} · {states[app.state]}</p></header><p>{app.summary}</p>
 {app.id==='trading'?<TradingInstallView client={client} active={active} onPreview={()=>onOpen('trading')} onPermissions={onPermissions}/>:app.kind==='mcp'?<>
 <div className="apps-connection-actions"><button className="primary" disabled={busy||!server} onClick={()=>server&&void act(()=>server.enabled?c.disable(server.id):c.enable(server.id))}><UiIcon name="power" size={16}/>{server?.enabled?'Turn off':'Turn on'}</button>
 <button title="Edit connection" aria-label="Edit connection" disabled={busy||!server} onClick={()=>server&&onSetup(server)}><UiIcon name="pencil" size={16}/></button>
 <button title="Reconnect and refresh tools" aria-label="Reconnect and refresh tools" disabled={busy||!server?.enabled} onClick={()=>server&&void act(()=>c.reconnect(server.id))}><UiIcon name="refresh" size={16}/></button>
 <button title="Remove connection" aria-label="Remove connection" disabled={busy||!server} onClick={()=>server&&onRemove(server)}><UiIcon name="trash" size={16}/></button></div>
 {connection.phase==='error'&&<p role="alert">Connection controls could not be loaded. <button onClick={()=>void c.load()}>Try again</button></p>}
 <p className="fine-print">{app.tools?`${app.tools} discovered tools. Choose which agents may use them in Permissions.`:'Turn on the connection to discover its tools.'}</p>
 <button className="apps-quiet" onClick={onPermissions}><UiIcon name="shield" size={15}/>Agent permissions</button><button className="apps-quiet" onClick={onManageConnections}><UiIcon name="sliders" size={15}/>Connection settings</button>
 </>:<><button className="primary" onClick={()=>open(app)}><UiIcon name={icon(app)} size={16}/>Open {app.name}</button>{app.id==='genvr'&&owner&&<button className="apps-quiet" onClick={onAccountConnections}><UiIcon name="link" size={15}/>Manage account connection</button>}{owner&&app.id==='terminal'&&<button className="apps-quiet" onClick={onPermissions}><UiIcon name="shield" size={15}/>Agent permissions</button>}</>}
 {owner&&<details className="apps-access"><summary>Access and permissions</summary><ul>{app.permissions.map(x=><li key={x}>{x}</li>)}</ul><p>Adding an application never grants tools to an agent automatically.</p></details>}
 </>:<p className="apps-empty">Select an application to open it or manage its connection.</p>}
 </aside></div>
 {(notice||connection.notice)&&<p className="apps-notice" role="status">{notice||connection.notice}</p>}
 {owner&&active&&<McpConnectionDialogs c={c} setup={setup} onSetup={onSetup} remove={remove} onRemove={onRemove} onSaved={id=>{setSelected('mcp:'+id);setNotice(setup==='new'?'Connection added off. Review access before turning it on.':'Connection saved. Review access if its target changed.');void load();}} onRemoved={()=>{setSelected('');void load();}}/>}
 </>;
}
