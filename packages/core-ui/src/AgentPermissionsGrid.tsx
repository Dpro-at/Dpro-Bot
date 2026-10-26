import {useCallback,useEffect,useRef,useState} from 'react';
import type {SessionClient} from './session';
import {Avatar} from './desktop-ui';
import {UiIcon,type UiIconName} from './ui-icons';
import {permissionCategories,riskyCategories as riskyList} from './hire-contract.js';
const riskyCategories:readonly string[]=riskyList;

type Mode='off'|'ask'|'allow';
type Permissions={memoryRead:string[];memoryWrite:string[];sharedMemory:boolean;modes:Record<string,Mode>;version:number};
type Row={id:string;name:string;role?:string|null;department?:string|null;permissions?:Permissions;error?:boolean};
type Change={agentId:string;category:string;from:Mode;to:Mode};

export const actionLabels:Record<string,{name:string;icon:UiIconName}>={browser:{name:'Use the browser',icon:'globe'},network:{name:'Reach the internet',icon:'wifi'},message:{name:'Send messages',icon:'send'},delete:{name:'Delete things',icon:'trash'},install:{name:'Install software',icon:'download'},money:{name:'Spend money',icon:'coin'},settings:{name:'Change settings',icon:'gear'}};
const roleWords:Record<string,string>={main:'Main agent',manager:'Manager',specialist:'Specialist',evaluator:'Reviewer'};
const modeWord:Record<Mode,string>={off:'Never',ask:'Asks you',allow:'Allowed'};
const next:Record<Mode,Mode>={off:'ask',ask:'allow',allow:'off'};

/** Board AP5: what every agent may do, one row per agent and one dot per action. Changes save at once and undo with ⌘Z. */
export function AgentPermissionsGrid({client,active,onAgent}:{client:SessionClient;active:boolean;onAgent?:(id:string)=>void}){
 const [rows,setRows]=useState<Row[]>([]),[phase,setPhase]=useState<'loading'|'ready'|'error'>('loading'),[selected,setSelected]=useState(''),[notice,setNotice]=useState(''),[risky,setRisky]=useState<Change|null>(null),[busy,setBusy]=useState(false);
 const undo=useRef<Change|null>(null);
 const readOne=useCallback(async(id:string)=>{const r=await client.request({method:'GET',path:`/api/agents/${id}/permissions`} as never);return r.status===200?r.body as Permissions:undefined;},[client]);
 const load=useCallback(async()=>{setPhase('loading');try{const r=await client.request({method:'GET',path:'/api/agents'} as never);if(r.status!==200)throw Error();const agents=((r.body as {agents?:Row[]}).agents??[]).filter(a=>a.id!=='small-local-agent').map(a=>({id:a.id,name:a.name||'Name unavailable',role:a.role,department:a.department}));setRows(agents);setPhase('ready');setSelected(s=>s||agents[0]?.id||'');
  // Read each agent's permissions a few at a time so a large team stays responsive.
  for(let i=0;i<agents.length;i+=6){const part=agents.slice(i,i+6);const read=await Promise.all(part.map(async a=>{try{return [a.id,await readOne(a.id)] as const;}catch{return [a.id,undefined] as const;}}));setRows(old=>old.map(row=>{const hit=read.find(([id])=>id===row.id);return hit?{...row,permissions:hit[1],error:!hit[1]}:row;}));}
 }catch{setPhase('error');}},[client,readOne]);
 useEffect(()=>{if(active)void load();},[active,load]);
 const save=useCallback(async(change:Change,confirmRisky=false)=>{const row=rows.find(r=>r.id===change.agentId);const p=row?.permissions;if(!p)return;setBusy(true);setNotice('');try{const modes={...p.modes,[change.category]:change.to};const r=await client.request({method:'PUT',path:`/api/agents/${change.agentId}/permissions`,body:{memoryRead:p.memoryRead,memoryWrite:p.memoryWrite,sharedMemory:p.sharedMemory,modes,expectedVersion:p.version,...(confirmRisky?{confirmRisky:true}:{})}} as never);
  if(r.status!==200){const fresh=await readOne(change.agentId).catch(()=>undefined);setRows(old=>old.map(x=>x.id===change.agentId?{...x,permissions:fresh}:x));setNotice(r.status===409?'This agent changed meanwhile. The latest values are shown; choose again.':'The change was not saved.');return false;}
  const fresh=await readOne(change.agentId).catch(()=>undefined);setRows(old=>old.map(x=>x.id===change.agentId?{...x,permissions:fresh??{...p,modes,version:p.version+1}}:x));undo.current=change;setNotice(`${row.name}: ${actionLabels[change.category].name} · ${modeWord[change.to]}`);return true;
 }catch{setNotice('The change was not saved (no connection).');return false;}finally{setBusy(false);}},[client,rows,readOne]);
 const choose=(agentId:string,category:string,to:Mode)=>{const row=rows.find(r=>r.id===agentId),from=row?.permissions?.modes[category];if(!row?.permissions||!from||from===to||busy)return;const change={agentId,category,from,to};if(to==='allow'&&riskyCategories.includes(category)){setRisky(change);return;}void save(change);};
 useEffect(()=>{if(!active)return;const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='z'&&undo.current&&!busy&&!(e.target as HTMLElement).closest('input,textarea')){e.preventDefault();const c=undo.current;undo.current=null;void save({...c,from:c.to,to:c.from},riskyCategories.includes(c.category)&&c.from==='allow');}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[active,busy,save]);
 const person=rows.find(r=>r.id===selected);
 return <section className="perm-grid" aria-label="What agents may do">
  <header className="approval-toolbar"><h2>What agents may do</h2><span className="perm-legend" aria-hidden="true">{(['off','ask','allow'] as Mode[]).map(m=><span key={m}><i className="perm-dot" data-mode={m}/>{modeWord[m]}</span>)}</span></header>
  {notice&&<p className="approval-notice" role="status">{notice}{undo.current&&<button type="button" className="link" onClick={()=>{const c=undo.current;if(!c)return;undo.current=null;void save({...c,from:c.to,to:c.from},riskyCategories.includes(c.category)&&c.from==='allow');}}>Undo</button>}</p>}
  {risky&&<p className="approval-notice perm-risky" role="alert"><UiIcon name="alert" size={14}/>Allow {rows.find(r=>r.id===risky.agentId)?.name} to {actionLabels[risky.category].name.toLowerCase()} without asking you?<button type="button" className="primary" onClick={()=>{const c=risky;setRisky(null);void save(c,true);}}>Allow</button><button type="button" onClick={()=>setRisky(null)}>Cancel</button></p>}
  <div className="perm-panes">
   <div className="perm-table" role="grid" aria-label="Agents and actions">
    <div className="perm-row perm-head" role="row"><span role="columnheader">Agent</span>{permissionCategories.map(c=><span key={c} role="columnheader" title={actionLabels[c].name} aria-label={actionLabels[c].name}><UiIcon name={actionLabels[c].icon} size={15}/></span>)}</div>
    {phase==='loading'&&!rows.length&&<p className="approval-empty" role="status">Reading your team…</p>}
    {phase==='error'&&<div className="approval-empty"><p>The team could not be read.</p><button type="button" onClick={()=>void load()}>Try again</button></div>}
    {phase==='ready'&&!rows.length&&<p className="approval-empty">No agents yet. Hire one in Agents.</p>}
    {rows.map(r=><div key={r.id} className="perm-row" role="row" aria-selected={selected===r.id} onClick={()=>setSelected(r.id)}><span role="rowheader" className="perm-agent"><Avatar name={r.name} size={22}/><bdi>{r.name}</bdi></span>{permissionCategories.map(c=>{const m=r.permissions?.modes[c] as Mode|undefined;return <span key={c} role="gridcell">{m?<button type="button" className="perm-dot" data-mode={m} disabled={busy} title={`${actionLabels[c].name}: ${modeWord[m]} · click for ${modeWord[next[m]]}`} aria-label={`${r.name}, ${actionLabels[c].name}: ${modeWord[m]}`} onClick={e=>{e.stopPropagation();setSelected(r.id);choose(r.id,c,next[m]);}}/>:<span className="perm-dot" data-mode="unknown" title={r.error?'Could not be read':'Reading…'}/>}</span>;})}</div>)}
   </div>
   <aside className="perm-inspector" aria-label="Selected agent">{person?<><div className="perm-person"><Avatar name={person.name} size={40}/><div><strong><bdi>{person.name}</bdi></strong><small>{[person.role?roleWords[person.role]??person.role:'',person.department].filter(Boolean).join(' · ')||'No department'}</small></div></div>
    {person.permissions?permissionCategories.map(c=><div key={c} className="perm-choice"><UiIcon name={actionLabels[c].icon} size={15}/><span>{actionLabels[c].name}</span><span role="radiogroup" aria-label={actionLabels[c].name} className="perm-seg">{(['off','ask','allow'] as Mode[]).map(m=><button key={m} type="button" role="radio" aria-checked={person.permissions!.modes[c]===m} disabled={busy} onClick={()=>choose(person.id,c,m)}>{m==='off'?'Never':m==='ask'?'Ask':'Allow'}</button>)}</span></div>):<p className="approval-empty">Reading…</p>}
    {onAgent&&<button type="button" className="link" onClick={()=>onAgent(person.id)}>Its tools and connections…</button>}
    <small className="perm-note">"Asks you" sends a request to Waiting for me each time.</small></>:<p className="approval-empty">Select an agent.</p>}</aside>
  </div>
 </section>;
}
