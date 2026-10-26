import {useCallback,useEffect,useRef,useState} from 'react';
import type {SessionClient} from './session';
import type {PublicAgent} from './agents';
import {UiIcon} from './ui-icons';
import {Notice,Sheet} from './desktop-ui';
import {PreferenceGroup} from './Preferences';
import {DepartmentTile} from './StaffDirectory';
import {departmentName as shownName} from './agent-look';
import {DEPARTMENT_RENAME_PATH,departmentName as validDepartment} from './departments-contract.js';

type Toast={id:number;text:string;undo:boolean}|null;
/** The department value as the agent page saves it: lowercase, single spaces. */
export const cleanDepartment=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');
/** Departments in use, each with its agents, sorted by name; agents without one come last. */
export function groupDepartments(agents:readonly PublicAgent[]){
 const map=new Map<string,PublicAgent[]>();
 for(const a of agents)if(a.department)map.set(a.department,[...(map.get(a.department)??[]),a]);
 return {departments:[...map].sort(([a],[b])=>a.localeCompare(b)).map(([name,list])=>({name,agents:list})),none:agents.filter(a=>!a.department)};
}

/**
 * Settings › Departments (owner): the only place departments are listed. A
 * department is the agents' own department value, so renaming one moves all
 * its agents; moving one agent changes only that agent. A new department is
 * made by moving agents into it. Changes save at once and can be undone.
 * Agents can do the same through MCP (agents: departments, rename_department,
 * set_department).
 */
export function DepartmentsSettings({client,onAgent}:{client:SessionClient;onAgent?:(id:string)=>void}){
 const [agents,setAgents]=useState<PublicAgent[]|null>(null),[error,setError]=useState(false),[busy,setBusy]=useState(false);
 const [renaming,setRenaming]=useState<{from:string;to:string}|null>(null),[creating,setCreating]=useState<{name:string;ids:string[]}|null>(null);
 const [toast,setToast]=useState<Toast>(null),[problem,setProblem]=useState('');const undo=useRef<(()=>Promise<void>)|null>(null);
 const load=useCallback(async()=>{setError(false);try{const r=await client.request({method:'GET',path:'/api/agents'} as never);if(r.status!==200)throw Error();setAgents([...(r.body as {agents:PublicAgent[]}).agents]);}catch{setError(true);}},[client]);
 useEffect(()=>{void load();},[load]);
 const say=(text:string,back?:()=>Promise<void>)=>{undo.current=back??null;setToast({id:Date.now(),text,undo:!!back});};
 const rename=async(from:string,to:string,quiet=false)=>{
  const target=cleanDepartment(to);if(!validDepartment(target)){setProblem('Use lowercase letters, numbers, spaces, - or _ (up to 64).');return false;}
  if(target===from){setRenaming(null);return true;}
  const merged=!!agents?.some(a=>a.department===target);
  setBusy(true);setProblem('');
  try{const r=await client.request({method:'POST',path:DEPARTMENT_RENAME_PATH,body:{from,to:target}} as never);if(r.status!==200)throw Error((r.body as {code?:string})?.code??'unavailable');
   setRenaming(null);await load();
   if(!quiet)say(merged?`${shownName(from)} joined ${shownName(target)}.`:`${shownName(from)} is now ${shownName(target)}.`,merged?undefined:async()=>{await rename(target,from,true);say(`${shownName(from)} is back.`);});
   return true;}
  catch(e){setProblem(e instanceof Error&&e.message==='not_found'?'That department has no agents any more. The list is read again.':'The department was not renamed. Try again.');void load();return false;}
  finally{setBusy(false);}
 };
 // One agent at a time with the version it was read at; a changed agent stops the move and the list is read again.
 const move=async(list:PublicAgent[],department:string|null)=>{
  const done:{agent:PublicAgent;before:string|null}[]=[];setBusy(true);setProblem('');
  try{for(const a of list){const r=await client.request({method:'PUT',path:`/api/agents/${encodeURIComponent(a.id)}`,body:{expectedVersion:a.version,department}} as never);if(r.status!==200)throw Error(r.status===409?'changed':'unavailable');done.push({agent:a,before:a.department??null});}return done;}
  catch(e){setProblem(e instanceof Error&&e.message==='changed'?'Someone changed an agent meanwhile. The list is read again; try once more.':'Not every agent was moved. Try again.');return done;}
  finally{setBusy(false);await load();}
 };
 const moveOne=async(a:PublicAgent,value:string)=>{
  if(value==='__new'){setCreating({name:'',ids:[a.id]});return;}
  const to=value||null;if(to===(a.department??null))return;
  const done=await move([a],to);
  if(done.length)say(`${a.name??'The agent'} moved to ${shownName(to)}.`,async()=>{const fresh=await client.request({method:'GET',path:`/api/agents/${encodeURIComponent(a.id)}`} as never);const now=(fresh.body as {agent?:PublicAgent})?.agent;if(now)await move([now],done[0].before);});
 };
 const create=async()=>{if(!creating||!agents)return;const name=cleanDepartment(creating.name);if(!validDepartment(name)){setProblem('Use lowercase letters, numbers, spaces, - or _ (up to 64).');return;}
  const list=agents.filter(a=>creating.ids.includes(a.id));const done=await move(list,name);setCreating(null);if(done.length)say(`${shownName(name)} has ${done.length===1?'1 agent':`${done.length} agents`}.`);};
 if(error)return <div className="dept-empty" role="alert"><p>Departments could not be read.</p><button type="button" onClick={()=>void load()}>Try again</button></div>;
 if(!agents)return <p className="dept-empty" role="status">Reading departments…</p>;
 const {departments,none}=groupDepartments(agents);
 const choices=departments.map(d=>d.name);
 const agentRow=(a:PublicAgent)=><li key={a.id} className="dept-agent"><button type="button" className="link-button" title="Open the agent" disabled={!onAgent} onClick={()=>onAgent?.(a.id)}><bdi>{a.name??'Name unavailable'}</bdi>{a.isPrimary&&<span className="ag-tag">Main agent</span>}</button>
  <select aria-label={`Department of ${a.name??'this agent'}`} value={a.department??''} disabled={busy} onChange={e=>void moveOne(a,e.target.value)}>{choices.map(d=><option key={d} value={d}>{shownName(d)}</option>)}<option value="">No department</option><option value="__new">New department…</option></select></li>;
 return <>
  <PreferenceGroup title="Departments" note="A department groups agents and shows as a chip on their row. Rename one to move all its agents; choose another department on an agent to move only that one.">
   <div className="dept-toolbar"><button type="button" disabled={busy||!agents.length} onClick={()=>{setProblem('');setCreating({name:'',ids:[]});}}><UiIcon name="plus" size={14}/>New department…</button></div>
   {problem&&<p className="dept-problem" role="alert">{problem}</p>}
   {!departments.length&&<p className="dept-empty">No department yet. Make one and move agents into it.</p>}
   <ul className="dept-list" aria-label="Departments">{departments.map(d=><li key={d.name} className="dept-item">
    <div className="dept-head"><DepartmentTile department={d.name} size={26}/>
     {renaming?.from===d.name?<form className="dept-rename" onSubmit={e=>{e.preventDefault();void rename(d.name,renaming.to);}}><input aria-label={`New name for ${shownName(d.name)}`} autoFocus maxLength={64} value={renaming.to} disabled={busy} onChange={e=>setRenaming({from:d.name,to:e.target.value})} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setRenaming(null);}}}/><button type="submit" className="primary" disabled={busy||!renaming.to.trim()}>Rename</button><button type="button" disabled={busy} onClick={()=>setRenaming(null)}>Cancel</button></form>
     :<><span className="dept-name"><strong>{shownName(d.name)}</strong><small>{d.agents.length===1?'1 agent':`${d.agents.length} agents`}</small></span><button type="button" className="tool" title="Rename (moves every agent in it)" aria-label={`Rename ${shownName(d.name)}`} disabled={busy} onClick={()=>{setProblem('');setRenaming({from:d.name,to:d.name});}}><UiIcon name="pencil" size={14}/></button></>}
    </div>
    <ul className="dept-agents">{d.agents.map(agentRow)}</ul>
   </li>)}
   {none.length>0&&<li className="dept-item" data-none><div className="dept-head"><DepartmentTile department={null} size={26}/><span className="dept-name"><strong>No department</strong><small>{none.length===1?'1 agent':`${none.length} agents`}</small></span></div><ul className="dept-agents">{none.map(agentRow)}</ul></li>}
   </ul>
  </PreferenceGroup>
  {creating&&<Sheet title="New department" onClose={()=>setCreating(null)} actions={<><button type="button" onClick={()=>setCreating(null)}>Cancel</button><button type="button" className="primary" disabled={busy||!creating.name.trim()||!creating.ids.length} onClick={()=>void create()}>Make department</button></>}>
   <label className="dk-field">Name<input autoFocus maxLength={64} value={creating.name} onChange={e=>setCreating({...creating,name:e.target.value})} placeholder="for example research"/></label>
   <p className="fine-print">A department exists while an agent is in it. Choose who moves into it.</p>
   <ul className="dept-pick" aria-label="Agents to move">{agents.map(a=><li key={a.id}><label><input type="checkbox" checked={creating.ids.includes(a.id)} onChange={e=>setCreating({...creating,ids:e.target.checked?[...creating.ids,a.id]:creating.ids.filter(x=>x!==a.id)})}/><bdi>{a.name??'Name unavailable'}</bdi><small>{shownName(a.department)}</small></label></li>)}</ul>
  </Sheet>}
  <Notice toast={toast} onUndo={()=>{const u=undo.current;undo.current=null;setToast(null);if(u)void u();}} onDone={id=>setToast(t=>t?.id===id?null:t)}/>
 </>;
}
