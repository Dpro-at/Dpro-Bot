import {useCallback,useEffect,useRef,useState,type MouseEvent as ReactMouseEvent} from 'react';
import type {SessionClient} from './session';
import {Avatar} from './desktop-ui';
import {UiIcon,type UiIconName} from './ui-icons';
import {permissionCategories,riskyCategories as riskyList} from './hire-contract.js';
import {nextSelection,planChanges,reverseChanges,sharedMode,type ModeChange} from './approvals-actions';
const riskyCategories:readonly string[]=riskyList;

type Mode='off'|'ask'|'allow';
type Permissions={memoryRead:string[];memoryWrite:string[];sharedMemory:boolean;modes:Record<string,Mode>;version:number};
type Row={id:string;name:string;role?:string|null;department?:string|null;permissions?:Permissions;error?:boolean};
type Change=ModeChange;

export const actionLabels:Record<string,{name:string;icon:UiIconName}>={browser:{name:'Use the browser',icon:'globe'},network:{name:'Reach the internet',icon:'wifi'},message:{name:'Send messages',icon:'send'},delete:{name:'Delete things',icon:'trash'},install:{name:'Install software',icon:'download'},money:{name:'Spend money',icon:'coin'},settings:{name:'Change settings',icon:'gear'}};
const roleWords:Record<string,string>={main:'Main agent',manager:'Manager',specialist:'Specialist',evaluator:'Reviewer'};
const modeWord:Record<Mode,string>={off:'Never',ask:'Asks you',allow:'Allowed'};
const next:Record<Mode,Mode>={off:'ask',ask:'allow',allow:'off'};

/** Board AP5: what every agent may do, one row per agent and one dot per action. Changes save at once and undo with ⌘Z.
 * ⌘/Ctrl-click or Shift-click selects several agents; the inspector then changes each of them, and one undo restores all. */
export function AgentPermissionsGrid({client,active,onAgent,focus}:{client:SessionClient;active:boolean;onAgent?:(id:string)=>void;focus?:{agent:string;category?:string;n:number}}){
 const [rows,setRows]=useState<Row[]>([]),[phase,setPhase]=useState<'loading'|'ready'|'error'>('loading'),[picked,setPicked]=useState<string[]>([]),[notice,setNotice]=useState(''),[risky,setRisky]=useState<Change[]|null>(null),[busy,setBusy]=useState(false);
 const undo=useRef<Change[]|null>(null),anchor=useRef('');
 const setSelected=(id:string)=>{anchor.current=id;setPicked([id]);};
 const readOne=useCallback(async(id:string)=>{const r=await client.request({method:'GET',path:`/api/agents/${id}/permissions`} as never);return r.status===200?r.body as Permissions:undefined;},[client]);
 const load=useCallback(async()=>{setPhase('loading');try{const r=await client.request({method:'GET',path:'/api/agents'} as never);if(r.status!==200)throw Error();const agents=((r.body as {agents?:Row[]}).agents??[]).filter(a=>a.id!=='small-local-agent').map(a=>({id:a.id,name:a.name||'Name unavailable',role:a.role,department:a.department}));setRows(agents);setPhase('ready');setPicked(s=>s.length?s.filter(id=>agents.some(a=>a.id===id)):agents[0]?[agents[0].id]:[]);
  // Read each agent's permissions a few at a time so a large team stays responsive.
  for(let i=0;i<agents.length;i+=6){const part=agents.slice(i,i+6);const read=await Promise.all(part.map(async a=>{try{return [a.id,await readOne(a.id)] as const;}catch{return [a.id,undefined] as const;}}));setRows(old=>old.map(row=>{const hit=read.find(([id])=>id===row.id);return hit?{...row,permissions:hit[1],error:!hit[1]}:row;}));}
 }catch{setPhase('error');}},[client,readOne]);
 useEffect(()=>{if(active)void load();},[active,load]);
 // CH6: opened from a chat's approval, that agent is picked and its action marked (once per request).
 const focused=useRef(0);useEffect(()=>{if(focus&&focused.current!==focus.n&&rows.some(r=>r.id===focus.agent)){focused.current=focus.n;setSelected(focus.agent);}},[focus?.n,rows]);// eslint-disable-line react-hooks/exhaustive-deps
 const save=useCallback(async(change:Change,confirmRisky=false)=>{const row=rows.find(r=>r.id===change.agentId);const p=row?.permissions;if(!p)return;setBusy(true);setNotice('');try{const modes={...p.modes,[change.category]:change.to};const r=await client.request({method:'PUT',path:`/api/agents/${change.agentId}/permissions`,body:{memoryRead:p.memoryRead,memoryWrite:p.memoryWrite,sharedMemory:p.sharedMemory,modes,expectedVersion:p.version,...(confirmRisky?{confirmRisky:true}:{})}} as never);
  if(r.status!==200){const fresh=await readOne(change.agentId).catch(()=>undefined);setRows(old=>old.map(x=>x.id===change.agentId?{...x,permissions:fresh}:x));setNotice(r.status===409?'This agent changed meanwhile. The latest values are shown; choose again.':'The change was not saved.');return false;}
  const fresh=await readOne(change.agentId).catch(()=>undefined);setRows(old=>old.map(x=>x.id===change.agentId?{...x,permissions:fresh??{...p,modes,version:p.version+1}}:x));return true;
 }catch{setNotice('The change was not saved (no connection).');return false;}finally{setBusy(false);}},[client,rows,readOne]);
 // Saves each change through the same request as one dot; undo keeps the ones that were saved.
 const apply=useCallback(async(changes:readonly Change[],confirmRisky=false)=>{const done:Change[]=[];for(const c of changes)if(await save(c,confirmRisky&&riskyCategories.includes(c.category)&&c.to==='allow'))done.push(c);else break;
  if(!done.length)return;undo.current=done;const first=done[0],who=done.length===1?rows.find(r=>r.id===first.agentId)?.name??'Agent':`${done.length} agents`;setNotice(`${who}: ${actionLabels[first.category].name} · ${modeWord[first.to]}${done.length<changes.length?` · ${changes.length-done.length} not saved`:''}`);},[save,rows]);
 const undoLast=useCallback(()=>{const c=undo.current;if(!c||busy)return;undo.current=null;void apply(reverseChanges(c),c.some(x=>riskyCategories.includes(x.category)&&x.from==='allow'));},[apply,busy]);
 // A risky Allow asks once, for every selected agent together.
 const choose=(ids:readonly string[],category:string,to:Mode)=>{if(busy)return;const changes=planChanges(rows,ids,category,to);if(!changes.length)return;if(to==='allow'&&riskyCategories.includes(category)){setRisky(changes);return;}void apply(changes);};
 useEffect(()=>{if(!active)return;const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='z'&&undo.current&&!busy&&!(e.target as HTMLElement).closest('input,textarea')){e.preventDefault();undoLast();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[active,busy,undoLast]);
 const selected=picked.filter(id=>rows.some(r=>r.id===id)),person=selected.length===1?rows.find(r=>r.id===selected[0]):undefined,group=selected.length>1?rows.filter(r=>selected.includes(r.id)):[];
 const pick=(e:ReactMouseEvent,id:string)=>{const next=nextSelection(rows.map(r=>r.id),selected,id,{toggle:e.metaKey||e.ctrlKey,range:e.shiftKey},anchor.current);if(!e.shiftKey)anchor.current=id;setPicked(next.length?next:[id]);};
 return <section className="perm-grid" aria-label="What agents may do">
  <header className="approval-toolbar"><h2>What agents may do</h2><span className="perm-legend" aria-hidden="true">{(['off','ask','allow'] as Mode[]).map(m=><span key={m}><i className="perm-dot" data-mode={m}/>{modeWord[m]}</span>)}</span></header>
  {notice&&<p className="approval-notice" role="status">{notice}{undo.current&&<button type="button" className="link" onClick={undoLast}>Undo</button>}</p>}
  {risky&&<p className="approval-notice perm-risky" role="alert"><UiIcon name="alert" size={14}/>Allow {risky.length===1?rows.find(r=>r.id===risky[0].agentId)?.name:`${risky.length} agents`} to {actionLabels[risky[0].category].name.toLowerCase()} without asking you?<button type="button" className="primary" onClick={()=>{const c=risky;setRisky(null);void apply(c,true);}}>Allow</button><button type="button" onClick={()=>setRisky(null)}>Cancel</button></p>}
  <div className="perm-panes">
   <div className="perm-table" role="grid" aria-label="Agents and actions">
    <div className="perm-row perm-head" role="row"><span role="columnheader">Agent</span>{permissionCategories.map(c=><span key={c} role="columnheader" title={actionLabels[c].name} aria-label={actionLabels[c].name}><UiIcon name={actionLabels[c].icon} size={15}/></span>)}</div>
    {phase==='loading'&&!rows.length&&<p className="approval-empty" role="status">Reading your team…</p>}
    {phase==='error'&&<div className="approval-empty"><p>The team could not be read.</p><button type="button" onClick={()=>void load()}>Try again</button></div>}
    {phase==='ready'&&!rows.length&&<p className="approval-empty">No agents yet. Hire one in Agents.</p>}
    {rows.map(r=><div key={r.id} className="perm-row" role="row" aria-selected={selected.includes(r.id)} onClick={e=>pick(e,r.id)}><span role="rowheader" className="perm-agent"><Avatar name={r.name} size={22}/><bdi>{r.name}</bdi></span>{permissionCategories.map(c=>{const m=r.permissions?.modes[c] as Mode|undefined;return <span key={c} role="gridcell">{m?<button type="button" className="perm-dot" data-mode={m} disabled={busy} title={`${actionLabels[c].name}: ${modeWord[m]} · click for ${modeWord[next[m]]}`} aria-label={`${r.name}, ${actionLabels[c].name}: ${modeWord[m]}`} onClick={e=>{e.stopPropagation();setSelected(r.id);choose([r.id],c,next[m]);}}/>:<span className="perm-dot" data-mode="unknown" title={r.error?'Could not be read':'Reading…'}/>}</span>;})}</div>)}
   </div>
   <aside className="perm-inspector" aria-label="Selected agent">{person?<><div className="perm-person"><Avatar name={person.name} size={40}/><div><strong><bdi>{person.name}</bdi></strong><small>{[person.role?roleWords[person.role]??person.role:'',person.department].filter(Boolean).join(' · ')||'No department'}</small></div></div>
    {person.permissions?permissionCategories.map(c=><div key={c} className="perm-choice" data-focus={focus&&focus.agent===person.id&&focus.category===c||undefined}><UiIcon name={actionLabels[c].icon} size={15}/><span>{actionLabels[c].name}</span><span role="radiogroup" aria-label={actionLabels[c].name} className="perm-seg">{(['off','ask','allow'] as Mode[]).map(m=><button key={m} type="button" role="radio" aria-checked={person.permissions!.modes[c]===m} disabled={busy} onClick={()=>choose([person.id],c,m)}>{m==='off'?'Never':m==='ask'?'Ask':'Allow'}</button>)}</span></div>):<p className="approval-empty">Reading…</p>}
    {onAgent&&<button type="button" className="link" onClick={()=>onAgent(person.id)}>Its tools and connections…</button>}
    <small className="perm-note">"Asks you" sends a request to Waiting for me each time.</small></>:group.length?<><div className="perm-person"><UiIcon name="users" size={22}/><div><strong>{group.length} agents</strong><small>{group.map(g=>g.name).join(', ')}</small></div></div>
    {permissionCategories.map(c=>{const shared=sharedMode(group,selected,c);return <div key={c} className="perm-choice"><UiIcon name={actionLabels[c].icon} size={15}/><span>{actionLabels[c].name}{shared===null&&<small className="perm-mixed"> · mixed</small>}</span><span role="radiogroup" aria-label={actionLabels[c].name} className="perm-seg">{(['off','ask','allow'] as Mode[]).map(m=><button key={m} type="button" role="radio" aria-checked={shared===m} disabled={busy||group.some(g=>!g.permissions)} onClick={()=>choose(selected,c,m)}>{m==='off'?'Never':m==='ask'?'Ask':'Allow'}</button>)}</span></div>;})}
    <small className="perm-note">Each choice changes every selected agent. ⌘Z undoes it for all of them.</small></>:<p className="approval-empty">Select an agent. ⌘-click or Shift-click selects several.</p>}</aside>
  </div>
 </section>;
}
