import type {CardTab} from './agent-card';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent,MouseEvent as ReactMouseEvent} from 'react';
import type {AgentsController,PublicAgent} from './agents';
import {Avatar,ContextMenu,IconButton,Notice,Popover,Sheet,useMenu} from './desktop-ui';
import type {MenuItem} from './desktop-ui';
import {UiIcon} from './ui-icons';
import type {UiIconName} from './ui-icons';
import {departmentIcon,departmentName,departmentTone,personalityColour,ROLE_CARDS,roleWord,tileStyle} from './agent-look';
import {permissionLine,useAgentFacts,useFaces,forgetFacts,retryFacts} from './agent-facts';
import {PersonalityMark} from './PersonalityLibrary';
import {useLibraryEntries,type Profile} from './personality-library';

type Toast={id:number;text:string;undo:boolean}|null;
/** A department's icon on its colour tile (sidebar, list, pickers). */
export function DepartmentTile({department,size=18}:{department?:string|null;size?:number}){
 return <span className="ag-tile" aria-hidden="true" style={{...tileStyle(departmentTone(department)),inlineSize:size,blockSize:size}}><UiIcon name={departmentIcon(department)} size={Math.round(size*.62)}/></span>;
}
/** An agent's round avatar with the small face of its personality (the same face the library draws). */
export function AgentFace({agent,face,profile,size=30}:{agent:Pick<PublicAgent,'name'>;face?:string|null;profile?:Profile;size?:number}){
 const colour=personalityColour(face);
 return <span className="ag-face"><Avatar name={agent.name??'?'} size={size}/>{face!==undefined&&(profile?<span className="ag-face-mark" title={face??undefined}><PersonalityMark profile={profile} size={15}/></span>:<span className="ag-face-mark" title={face??'No personality from the library'} style={{color:colour,boxShadow:`0 0 0 1px ${colour}88`}}><UiIcon name="smile" size={10}/></span>)}</span>;
}

/**
 * AG1: the staff as a quiet list (avatar with its personality face, name and
 * job, department tile) and the selected agent on the right with what makes
 * it. Owner actions live in the ⋯ and right-click menus; Remove confirms once.
 */
export function StaffDirectory({controller,department,query='',notice,onOpen,onMemory,onHire,onCompany,onChat}:{controller:AgentsController;department:string;query?:string;notice?:{id:number;text:string}|null;onDepartment?:(d:string)=>void;onOpen:(id:string,section?:CardTab)=>void;onMemory?:(id:string)=>void;onHire?:()=>void;onCompany?:()=>void;onChat?:(id:string)=>void}){
 const s=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const owner=!!onHire;
 const [role,setRole]=useState('all'),[sort,setSort]=useState('name'),[selected,setSelected]=useState<string|null>(null),[showing,setShowing]=useState(false),[removing,setRemoving]=useState<PublicAgent|null>(null),[toast,setToast]=useState<Toast>(null),[busy,setBusy]=useState(false);
 const rows=useRef<HTMLDivElement>(null);const menu=useMenu();
 useEffect(()=>{if(notice)setToast({id:notice.id,text:notice.text,undo:false});},[notice?.id]);
 const q=query.trim().toLowerCase();
 const shown=s.agents.filter(a=>(department==='all'||(department==='main'?a.isPrimary:department==='none'?!a.department:a.department===department))&&(role==='all'||a.role===role)&&(!q||[a.name,a.department,roleWord(a.role)].some(x=>x?.toLowerCase().includes(q)))).sort((a,b)=>Number(!!b.isPrimary)-Number(!!a.isPrimary)||(sort==='department'?(a.department??'~').localeCompare(b.department??'~'):sort==='role'?roleWord(a.role).localeCompare(roleWord(b.role)):0)||(a.name??'').localeCompare(b.name??''));
 const faces=useFaces(controller.client,shown.map(a=>a.id),owner&&!!controller.client),library=useLibraryEntries(controller.client,owner);
 const agent=shown.find(a=>a.id===selected);
 const say=(text:string,undo=false)=>setToast({id:Date.now(),text,undo});
 async function act(kind:'main'|'copy'|'remove',a:PublicAgent){
  if(busy)return;setBusy(true);
  const r=kind==='main'?await controller.setPrimary(a.id):kind==='copy'?await controller.duplicate(a.id):await controller.remove(a.id);
  setBusy(false);say(r.notice);
  if(r.ok&&controller.client)forgetFacts(controller.client,a.id);
  if(r.ok&&kind==='copy'&&r.id)setSelected(r.id);if(r.ok&&kind==='remove')setSelected(null);
 }
 const items=(a:PublicAgent):MenuItem[]=>[{label:'Open',icon:'contact',shortcut:'Enter',run:()=>onOpen(a.id)},...(onChat?[{label:'Chat',icon:'message' as UiIconName,run:()=>onChat(a.id)}]:[]),
  ...(owner?['sep' as const,{label:'Make main agent',icon:'sparkle' as UiIconName,disabled:!!a.isPrimary||busy,run:()=>void act('main',a)},{label:'Duplicate',icon:'copy' as UiIconName,disabled:busy,run:()=>void act('copy',a)}]:[]),
  ...(onMemory?[{label:'Saved memories',icon:'brain' as UiIconName,run:()=>onMemory(a.id)}]:[]),
  ...(owner?['sep' as const,{label:'Remove agent…',icon:'trash' as UiIconName,danger:true,shortcut:'⌫',disabled:busy,run:()=>setRemoving(a)}]:[])];
 function select(id:string){setSelected(id);}
 function key(e:ReactKeyboardEvent){
  const mod=e.metaKey||e.ctrlKey;
  if(mod&&e.key.toLowerCase()==='f'){e.preventDefault();document.getElementById('ag-staff-search')?.focus();}
  if(mod&&e.key.toLowerCase()==='n'&&onHire){e.preventDefault();onHire();}
  if(e.key==='Escape'&&!menu.menu)setSelected(null);
 }
 function rowKey(e:ReactKeyboardEvent<HTMLButtonElement>,a:PublicAgent){
  if(e.key==='Enter'){e.preventDefault();onOpen(a.id);}
  if((e.key==='F10'&&e.shiftKey)||e.key==='ContextMenu'){select(a.id);menu.at(e,items(a));}
  if((e.key==='Delete'||e.key==='Backspace')&&owner){e.preventDefault();setRemoving(a);}
 }
 function move(e:ReactKeyboardEvent){if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const at=shown.findIndex(a=>a.id===selected),n=e.key==='Home'?0:e.key==='End'?shown.length-1:Math.max(0,Math.min(shown.length-1,at+(e.key==='ArrowDown'?1:-1)));if(shown[n]){select(shown[n].id);rows.current?.querySelectorAll<HTMLButtonElement>('[role=option]')[n]?.focus();}}
 const title=department==='all'?'All staff':department==='main'?'Main agent':departmentName(department==='none'?null:department);
 return <section className="ag-staff" aria-label="Staff directory" onKeyDown={key}>
 <div className="ag-list-pane">
  <header className="ag-toolbar"><h2>{title}</h2>
   <span className="ag-anchor" data-popover-anchor><IconButton icon="filter" label="Show" pressed={showing||role!=='all'||sort!=='name'} onClick={()=>setShowing(v=>!v)}/>
    <Popover open={showing} onClose={()=>setShowing(false)} label="Show"><div className="ag-show"><label>Role<select aria-label="Staff role" value={role} onChange={e=>setRole(e.target.value)}><option value="all">Every role</option>{ROLE_CARDS.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select></label><label>Sort by<select aria-label="Sort staff" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Name</option><option value="department">Department</option><option value="role">Role</option></select></label><button type="button" className="ghost" disabled={s.phase==='listing'} onClick={()=>{if(controller.client)forgetFacts(controller.client);void controller.list();}}><UiIcon name="refresh" size={14}/>Read the team again</button></div></Popover></span>
   {onCompany&&<IconButton icon="building" label="Build your company (many agents at once)" onClick={onCompany}/>}
   {onHire&&<button type="button" className="primary ag-main-button" title="Hire an agent (⌘N)" onClick={onHire}><UiIcon name="plus" size={14}/>Hire agent</button>}
  </header>
  <div className="ag-rows" ref={rows} role="listbox" aria-label="Staff" onKeyDown={move}>
   {shown.map(a=><button type="button" key={a.id} role="option" aria-selected={selected===a.id} tabIndex={selected===a.id||!agent&&shown[0]?.id===a.id?0:-1} className="ag-row" onClick={()=>select(a.id)} onDoubleClick={()=>onOpen(a.id)} onKeyDown={e=>rowKey(e,a)} onContextMenu={(e:ReactMouseEvent)=>{select(a.id);menu.at(e,items(a));}}>
    <AgentFace agent={a} face={owner?faces[a.id]:undefined} profile={owner&&faces[a.id]?library?.find(e=>e.profile.name===faces[a.id])?.profile:undefined}/>
    <span className="ag-row-text"><span className="ag-row-name"><bdi>{a.name??'Name unavailable'}</bdi>{a.isPrimary&&<span className="ag-tag">Main agent</span>}</span><span className="ag-row-sub">{a.isPrimary?'Talks to you first':roleWord(a.role)}</span></span>
    <span className="ag-row-dept"><DepartmentTile department={a.department}/>{departmentName(a.department)}</span>
   </button>)}
   {!shown.length&&<div className="ag-empty"><UiIcon name="users" size={28}/><p>{s.phase==='listing'||s.phase==='idle'?'Loading the team…':s.phase==='error'?'The team could not be loaded.':s.agents.length?'No one here matches.':'Hire your first agent.'}</p>{s.phase==='error'&&<button type="button" onClick={()=>void controller.list()}>Try again</button>}{s.phase==='ready'&&!s.agents.length&&onHire&&<button type="button" className="primary" onClick={onHire}>Hire agent</button>}</div>}
  </div>
 </div>
 <aside className="ag-inspector" aria-label="Selected agent">{agent?<Inspector controller={controller} agent={agent} owner={owner} onOpen={onOpen} onChat={onChat} onMenu={e=>menu.at(e,items(agent))} onClose={()=>setSelected(null)}/>:<div className="ag-empty"><UiIcon name="avatar" size={28}/><p>Select a staff member to see what makes it.</p></div>}</aside>
 <ContextMenu menu={menu.menu} onClose={menu.close}/>
 {removing&&<Sheet title={`Remove ${removing.name??'this agent'}?`} onClose={()=>setRemoving(null)} actions={<><button type="button" onClick={()=>setRemoving(null)}>Cancel</button><button type="button" className="primary ag-danger" disabled={busy||!!removing.isPrimary&&s.agents.length>1} onClick={()=>{const a=removing;setRemoving(null);void act('remove',a);}}>Remove</button></>}>
  <p>{removing.isPrimary&&s.agents.length>1?'This is the main agent. Make another agent the main agent first.':'It leaves the team for good. This cannot be undone.'}</p></Sheet>}
 <Notice toast={toast} onUndo={()=>{}} onDone={id=>setToast(t=>t?.id===id?null:t)}/>
 </section>;
}

function Inspector({controller,agent,owner,onOpen,onChat,onMenu,onClose}:{controller:AgentsController;agent:PublicAgent;owner:boolean;onClose:()=>void;onOpen:(id:string,section?:CardTab)=>void;onChat?:(id:string)=>void;onMenu:(e:ReactMouseEvent)=>void}){
 const facts=useAgentFacts(controller.client,agent.id,owner&&!!controller.client);
 const rows:{icon:UiIconName;title:string;text:string;section:CardTab}[]=facts?[
  {icon:'smile',title:'Personality',text:facts.personality?`${facts.personality.name} · ${facts.personality.linked?'follows library changes':'its own copy'}`:'Its own settings',section:'persona'},
  {icon:'layers',title:'Specialties',text:facts.specialties.map(x=>x.name).join(' · ')||'No specialty yet',section:'skills'},
  {icon:'star',title:'Skills',text:facts.inherited+facts.extra?`${facts.inherited} from its specialties · ${facts.extra} extra`:'No skills yet',section:'skills'},
  {icon:'lock',title:'Permissions',text:permissionLine(facts.modes),section:'permissions'},
  {icon:'cpu',title:'Answers with',text:agent.model?`${agent.model}${agent.provider==='claude'?' · Claude':' · on this computer'}`:'The default model',section:'profile'},
 ]:[];
 return <div className="ag-insp">
  <div className="ag-insp-head"><span className="ag-insp-back"><IconButton icon="arrow-left" label="Back to the list" onClick={onClose}/></span><Avatar name={agent.name??'?'} size={52}/><span><b><bdi>{agent.name??'Agent'}</bdi></b><small>{roleWord(agent.role)} · {departmentName(agent.department)}</small></span></div>
  <div className="ag-insp-actions"><button type="button" onClick={()=>onOpen(agent.id)}>Open</button>{onChat&&<button type="button" onClick={()=>onChat(agent.id)}>Chat</button>}<IconButton icon="more" label="More for this agent" onClick={onMenu}/></div>
  <p className="ag-insp-text" dir="auto">{agent.description||'No responsibilities yet.'}</p>
  <hr/>
  {!owner?<p className="ag-muted">Only the owner sees and changes how this agent works.</p>:facts===undefined?<p className="ag-muted" role="status">Reading what makes it…</p>:facts===null?<p className="ag-muted" role="status">What makes it could not be read. <button type="button" className="link-button" onClick={()=>retryFacts(controller.client,agent.id)}>Try again</button></p>:
   rows.map(r=><button type="button" key={r.title} className="ag-fact" onClick={()=>onOpen(agent.id,r.section)}><UiIcon name={r.icon} size={16}/><span><small>{r.title}</small><span dir="auto">{r.text}</span></span><UiIcon name="chevron" size={12}/></button>)}
  <small className="ag-hint">Double-click or Enter opens the agent. Right-click for the same actions.</small>
 </div>;
}
