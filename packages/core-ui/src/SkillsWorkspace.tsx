import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import type {SessionClient} from './session';
import {SKILLS_PATH} from './skill-library-contract.js';
import {validAgentId} from './agent-id.js';
import {UiIcon,type UiIconName} from './ui-icons';
import {Avatar,ContextMenu,IconButton,Notice,Popover,Sheet,useMenu,type MenuItem} from './desktop-ui';
import {SkillFilesView} from './SkillFilesView';
import {publisherSources} from './PublisherSources';
import {skillLook,skillSource,skillTitle,SOURCE_ORDER} from './skill-display';
type Skill={id:string;name:string;description:string;version:string;revision:number;origin:string};
type Source={id:string;name:string;description:string;origin:string;location?:string};
type Scan={id:string;status:string;visited:number;skipped:number;limited:boolean;sources:Source[]};
type File={path:string;content:string};
type Preview={name:string;hash:string;redactions:number;omitted:number;files:File[];existing:{id:string;hash:string;identical:boolean}|null};
type Agent={id:string;name:string};
export type SkillPlace='installed'|'in-use'|'catalogue'|'apps'|'found';
async function rpc<T>(client:SessionClient,method:string,path:string,body?:unknown):Promise<T>{const r=await client.request({method,path,...(body===undefined?{}:{body})} as never);if(r.status!==200)throw Error((r.body as {code?:string})?.code??'skill_unavailable');return r.body as T;}
const message=(e:unknown)=>e instanceof Error&&e.message==='preview_changed'?'The files changed on this computer. Select it again to read the latest files.':e instanceof Error&&e.message==='version_conflict'?'This skill changed elsewhere. Select it again before updating.':e instanceof Error&&e.message==='forbidden'?'Only the owner can read skill files and add skills.':e instanceof Error&&e.message==='too_many'?'An agent can have up to 50 skills. Take one back first.':'Skills could not be loaded or saved. Try again.';
/** A skill's coloured tile with its own icon. */
export function SkillTile({name,size=30,icon}:{name:string;size?:number;icon?:UiIconName}){const look=skillLook(name);return <span className="sk-tile" aria-hidden="true" style={{inlineSize:size,blockSize:size,color:look.colour,background:`color-mix(in srgb, ${look.colour} 16%, transparent)`}}><UiIcon name={icon??look.icon} size={Math.round(size*.5)}/></span>;}
/** Give a skill to an agent, or take it back, without touching the agent's other skills. */
export async function setAgentSkill(client:SessionClient,agentId:string,skillId:string,give:boolean){
 const now=await rpc<{selected:string[];revision:number}>(client,'GET',`${SKILLS_PATH}/agents/${agentId}`);
 const selected=give?[...new Set([...now.selected,skillId])]:now.selected.filter(x=>x!==skillId);if(selected.length>50)throw Error('too_many');
 if(selected.length===now.selected.length&&selected.every(x=>now.selected.includes(x)))return;
 await rpc(client,'PUT',`${SKILLS_PATH}/agents/${agentId}`,{selected,revision:now.revision});
}
/** "Where skills come from…": the publishers people can read about. Opening it adds nothing. */
export function WhereSkillsComeFrom({onClose}:{onClose:()=>void}){
 return <Sheet title="Where skills come from" onClose={onClose} actions={<button type="button" className="primary" onClick={onClose}>Done</button>}>
  <p className="sk-muted">Places that publish skills. Reading about them adds nothing to Dpro; Dpro keeps Markdown files only.</p>
  <ul className="sk-sources">{publisherSources.filter(s=>s.kind==='skill').map(s=><li key={s.id}><UiIcon name="globe" size={15}/><span><a className="publisher-link" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a><small>{s.publisher}</small><span>{s.note}</span></span></li>)}</ul>
 </Sheet>;
}
/** Give the selected skill to agents (or take it back); each change is saved at once and can be undone. */
function GiveSheet({client,skill,agents,users,onClose,onChanged}:{client:SessionClient;skill:Skill;agents:Agent[];users:string[];onClose:()=>void;onChanged:(agentId:string,give:boolean)=>void}){
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState('');
 const toggle=async(agent:Agent)=>{if(busy)return;const give=!users.includes(agent.id);setBusy(agent.id);setNotice('');try{await setAgentSkill(client,agent.id,skill.id,give);onChanged(agent.id,give);}catch(e){setNotice(message(e));}finally{setBusy('');}};
 return <Sheet title={`Give ${skillTitle(skill.name)} to an agent`} onClose={onClose} actions={<button type="button" className="primary" onClick={onClose}>Done</button>}>
  <p className="sk-muted">Agents use it from their next turn. Their permissions do not change.</p>
  {notice&&<p className="sk-alert" role="alert">{notice}</p>}
  {!agents.length?<p className="sk-muted">No agents yet. Make one in Agents first.</p>:<ul className="sk-give">{agents.map(a=>{const has=users.includes(a.id);return <li key={a.id}><Avatar name={a.name} size={22}/><span>{a.name}</span><button type="button" aria-pressed={has} disabled={!!busy} title={has?`Take back from ${a.name}`:`Give to ${a.name}`} onClick={()=>void toggle(a)}>{busy===a.id?'Saving…':has?<><UiIcon name="check" size={13}/>Has it</>:'Give'}</button></li>;})}</ul>}
 </Sheet>;
}

/** SK1: Installed skills and the ones in use by agents — a quiet list grouped by where each came from,
 *  the selected skill on the right, its files in their own view (SK2). */
export function SkillsWorkspace({client,active=true,view='installed',query,searchRef,onOpenAgents,onPlace,onWhereFrom}:{client:SessionClient;active?:boolean;view?:'installed'|'in-use'|'discover';query?:string;searchRef?:RefObject<HTMLInputElement|null>;onOpenAgents?:()=>void;onPlace?:(place:SkillPlace)=>void;onWhereFrom?:()=>void;onDiscover?:()=>void}){
 if(view==='discover')return <SkillAppsPlace client={client} active={active} query={query} searchRef={searchRef} onPlace={onPlace}/>;
 return <InstalledSkills client={client} active={active} inUse={view==='in-use'} query={query} searchRef={searchRef} onOpenAgents={onOpenAgents} onPlace={onPlace} onWhereFrom={onWhereFrom}/>;
}
function InstalledSkills({client,active,inUse,query:outer,searchRef,onOpenAgents,onPlace,onWhereFrom}:{client:SessionClient;active:boolean;inUse:boolean;query?:string;searchRef?:RefObject<HTMLInputElement|null>;onOpenAgents?:()=>void;onPlace?:(place:SkillPlace)=>void;onWhereFrom?:()=>void}){
 const [skills,setSkills]=useState<Skill[]>([]),[phase,setPhase]=useState<'loading'|'ready'|'error'>('loading'),[usage,setUsage]=useState<Record<string,string[]>|null>(null),[agents,setAgents]=useState<Agent[]>([]),[ownQuery,setOwnQuery]=useState(''),[source,setSource]=useState(''),[onlyUsed,setOnlyUsed]=useState(false),[sort,setSort]=useState<'source'|'name'>('source'),[selected,setSelected]=useState(''),[files,setFiles]=useState<File[]|null>(null),[reading,setReading]=useState(false),[filesError,setFilesError]=useState(''),[open,setOpen]=useState(false),[give,setGive]=useState(false),[filter,setFilter]=useState(false),[where,setWhere]=useState(false),[notice,setNotice]=useState(''),[toast,setToast]=useState<{id:number;text:string;undo:boolean;agentId:string;give:boolean;skillId:string}|null>(null);
 const ownSearch=useRef<HTMLInputElement>(null),search=searchRef??ownSearch,list=useRef<HTMLDivElement>(null),sequence=useRef(0),{menu,at,close}=useMenu();
 const query=outer??ownQuery;
 const load=useCallback(async()=>{setPhase(p=>p==='ready'?p:'loading');try{const r=await rpc<{skills:Skill[]}>(client,'GET',SKILLS_PATH);setSkills(r.skills);setPhase('ready');}catch(e){setNotice(message(e));setPhase('error');}
  // Who uses each skill and the agents' names are owner reads; without them the list still works.
  try{const u=await rpc<{usage:{skillId:string;agentIds:string[]}[]}>(client,'GET',SKILLS_PATH+'/usage');setUsage(Object.fromEntries(u.usage.map(x=>[x.skillId,x.agentIds])));}catch{setUsage(null);}
  try{const a=await rpc<{agents:{id:string;name?:string}[]}>(client,'GET','/api/agents');setAgents(a.agents.filter(x=>validAgentId(x.id)&&x.id!=='small-local-agent').map(x=>({id:x.id,name:x.name||'Unnamed agent'})));}catch{setAgents([]);}
 },[client]);
 useEffect(()=>{if(active)void load();},[active,load]);
 const names=(ids:string[]|undefined)=>(ids??[]).map(id=>agents.find(a=>a.id===id)?.name).filter((x):x is string=>!!x);
 const users=(id:string)=>usage?.[id]??[];
 const q=query.trim().toLowerCase();
 const shown=skills.filter(s=>(!inUse||users(s.id).length>0)&&(!onlyUsed||users(s.id).length>0)&&(!source||skillSource(s.origin).key===source)&&(!q||`${skillTitle(s.name)} ${s.name} ${s.description} ${skillSource(s.origin).line} ${names(users(s.id)).join(' ')}`.toLowerCase().includes(q)));
 const ordered=[...shown].sort((a,b)=>sort==='source'?SOURCE_ORDER.indexOf(skillSource(a.origin).key)-SOURCE_ORDER.indexOf(skillSource(b.origin).key)||skillTitle(a.name).localeCompare(skillTitle(b.name)):skillTitle(a.name).localeCompare(skillTitle(b.name)));
 const item=skills.find(s=>s.id===selected),present=[...new Set(skills.map(s=>skillSource(s.origin)))].filter((s,i,all)=>all.findIndex(x=>x.key===s.key)===i).sort((a,b)=>SOURCE_ORDER.indexOf(a.key)-SOURCE_ORDER.indexOf(b.key));
 const select=async(id:string)=>{const seq=++sequence.current;setSelected(id);setFiles(null);setFilesError('');setReading(true);try{const r=await rpc<{skill:Skill;files:File[]}>(client,'GET',`${SKILLS_PATH}/items/${id}`);if(seq!==sequence.current)return false;setFiles(r.files);setSkills(old=>old.map(x=>x.id===id?r.skill:x));return true;}catch(e){if(seq===sequence.current)setFilesError(e instanceof Error&&e.message==='forbidden'?'Only the owner can open its files.':'Its files could not be read.');return false;}finally{if(seq===sequence.current)setReading(false);}};
 const deselect=()=>{sequence.current++;setSelected('');setFiles(null);setOpen(false);};
 useEffect(()=>{if(selected&&!ordered.some(s=>s.id===selected))deselect();},[q,source,onlyUsed,inUse,skills.length]);
 useEffect(()=>{if(!active){setOpen(false);setGive(false);close();}},[active]);
 const changed=(skillId:string,agentId:string,given:boolean)=>setUsage(old=>{const now=old?.[skillId]??[];return {...(old??{}),[skillId]:given?[...new Set([...now,agentId])]:now.filter(x=>x!==agentId)};});
 const onChanged=(agentId:string,given:boolean)=>{if(!item)return;changed(item.id,agentId,given);const who=agents.find(a=>a.id===agentId)?.name??'the agent';setToast({id:Date.now(),text:given?`Given to ${who}.`:`Taken back from ${who}.`,undo:true,agentId,give:given,skillId:item.id});};
 const undo=async()=>{const t=toast;if(!t)return;setToast(null);try{await setAgentSkill(client,t.agentId,t.skillId,!t.give);changed(t.skillId,t.agentId,!t.give);}catch(e){setNotice(message(e));}};
 const sourcePlace=(s:Skill):SkillPlace|null=>{const k=skillSource(s.origin).key;return k==='catalogue'?'catalogue':['claude','codex','shared','project'].includes(k)?'apps':null;};
 const canGive=!!usage&&!!item;
 const openFiles=(s:Skill)=>{if(s.id===selected&&files)setOpen(true);else void select(s.id).then(ok=>{if(ok)setOpen(true);});};
 const itemMenu=(s:Skill):MenuItem[]=>[{label:'Open its files',icon:'open',shortcut:'Enter',run:()=>openFiles(s)},{label:'Give to an agent…',icon:'user-give',shortcut:'⌘G',disabled:!usage,run:()=>{if(s.id!==selected)void select(s.id);setGive(true);}},...(onPlace&&sourcePlace(s)?[{label:'Check its source for an update',icon:'refresh' as UiIconName,run:()=>onPlace(sourcePlace(s)!)}]:[]),...(onOpenAgents?['sep' as const,{label:'Open Agents',icon:'users' as UiIconName,run:onOpenAgents}]:[])];
 const moreMenu:MenuItem[]=[{label:'Sort by source',checked:sort==='source',run:()=>setSort('source')},{label:'Sort by name',checked:sort==='name',run:()=>setSort('name')},'sep',{label:'Reload',icon:'refresh',run:()=>{setNotice('');void load();}},{label:'Clear filters',icon:'eraser',disabled:!source&&!onlyUsed&&!ownQuery,run:()=>{setSource('');setOnlyUsed(false);setOwnQuery('');}},'sep',{label:'Where skills come from…',icon:'globe',run:()=>onWhereFrom?onWhereFrom():setWhere(true)}];
 const step=(by:number|'first'|'last')=>{if(!ordered.length)return;const i=ordered.findIndex(s=>s.id===selected),next=by==='first'?0:by==='last'?ordered.length-1:Math.max(0,Math.min(ordered.length-1,i<0?0:i+by));const s=ordered[next];void select(s.id);list.current?.querySelector<HTMLButtonElement>(`[data-id="${s.id}"]`)?.focus();};
 const giveSheet=give&&item&&usage?<GiveSheet client={client} skill={item} agents={agents} users={users(item.id)} onClose={()=>setGive(false)} onChanged={onChanged}/>:null;
 const notices=<Notice toast={toast} onUndo={()=>void undo()} onDone={id=>setToast(t=>t?.id===id?null:t)}/>;
 if(open&&item&&files)return <><SkillFilesView title={skillTitle(item.name)} sub={`${skillSource(item.origin).line} · version ${item.version}`} files={files} onBack={()=>{setOpen(false);queueMicrotask(()=>list.current?.querySelector<HTMLButtonElement>(`[data-id="${item.id}"]`)?.focus());}} onGive={canGive?()=>setGive(true):undefined}/>{giveSheet}{notices}</>;
 let group='';
 return <section className="sk-place" aria-label={inUse?'Skills in use by agents':'Central skills'} onKeyDown={e=>{if(!active)return;const mod=e.metaKey||e.ctrlKey;if(mod&&e.key.toLowerCase()==='f'){e.preventDefault();search.current?.focus();return;}if(mod&&e.key.toLowerCase()==='g'&&canGive){e.preventDefault();setGive(true);return;}if(mod&&!e.shiftKey&&e.key.toLowerCase()==='z'&&toast?.undo&&!(e.target as HTMLElement).closest('input,textarea')){e.preventDefault();void undo();return;}if(e.key==='Escape'&&selected&&!menu)deselect();}}>
  <div className="sk-main-pane">
   <header className="sk-toolbar"><h2>{inUse?'In use by agents':'Installed'}</h2>{outer===undefined&&<label className="dk-search sk-own-search"><UiIcon name="search" size={13}/><input ref={ownSearch} type="search" aria-label="Search skills" placeholder="Search skills" value={ownQuery} onChange={e=>setOwnQuery(e.target.value)}/></label>}<span className="sk-gap"/>
    <span className="sk-anchor" data-popover-anchor><IconButton icon="filter" label="Show: from one source, or only skills in use" pressed={!!source||onlyUsed} onClick={()=>setFilter(v=>!v)}/><Popover open={filter} onClose={()=>setFilter(false)} label="Show"><div className="sk-show"><label>From<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Every source</option>{present.map(s=><option key={s.key} value={s.key}>{s.group}</option>)}</select></label>{!inUse&&<label className="sk-check"><input type="checkbox" checked={onlyUsed} disabled={!usage} onChange={e=>setOnlyUsed(e.target.checked)}/>Only skills in use</label>}</div></Popover></span>
    <IconButton icon="more" label="More: sort, reload, where skills come from" onClick={e=>at(e,moreMenu)}/>
   </header>
   {notice&&<p className="sk-notice" role="status">{notice}</p>}
   <div ref={list} className="sk-list" role="listbox" aria-label={inUse?'Skills in use':'Installed skills'} onKeyDown={e=>{if(e.target instanceof HTMLInputElement)return;const mod=e.metaKey||e.ctrlKey;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();step(e.key==='ArrowDown'?1:-1);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();step(e.key==='Home'?'first':'last');}else if(e.key==='Enter'&&item&&!mod){e.preventDefault();openFiles(item);}else if((e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')&&item){at(e,itemMenu(item));}}}>
    {phase==='loading'?<div className="sk-empty" role="status"><p>Loading skills…</p></div>:phase==='error'?<div className="sk-empty"><p>Skills could not be loaded.</p><button type="button" onClick={()=>{setNotice('');void load();}}>Load again</button></div>:!ordered.length?<div className="sk-empty"><UiIcon name={inUse?'users':'book'} size={28}/><p>{q||source||onlyUsed?'No skills match.':inUse?'No agent has a skill yet. Select a skill in Installed and give it to an agent.':'No skills in Dpro yet. Add one from Dpro’s catalogue or your coding apps.'}</p>{!q&&!source&&!onlyUsed&&onPlace&&(inUse?<button type="button" onClick={()=>onPlace('installed')}>Open Installed</button>:<button type="button" onClick={()=>onPlace('apps')}>Look in my coding apps</button>)}</div>
    :ordered.map(s=>{const src=skillSource(s.origin),head=sort==='source'&&src.group!==group?src.group:'';group=src.group;const who=names(users(s.id));return <div key={s.id} className="sk-row-wrap">{head&&<p className="sk-group"><UiIcon name={src.icon} size={13}/>{head}</p>}<button type="button" data-id={s.id} className="sk-row" role="option" aria-selected={selected===s.id} onClick={()=>void select(s.id)} onDoubleClick={()=>openFiles(s)} onContextMenu={e=>{if(s.id!==selected)void select(s.id);at(e,itemMenu(s));}}><SkillTile name={s.name}/><span className="sk-row-text"><span className="sk-row-name">{skillTitle(s.name)}</span><span className="sk-row-sub">{s.description||src.line}</span></span>{who.length>0&&<span className="sk-faces" aria-label={`Used by ${who.join(', ')}`}>{who.slice(0,3).map(n=><Avatar key={n} name={n} size={22}/>)}{who.length>3&&<span className="sk-more">+{who.length-3}</span>}</span>}</button></div>;})}
   </div>
  </div>
  <aside className="sk-inspector" aria-label="Selected skill">{!item?<div className="sk-empty"><UiIcon name="book" size={30}/><p>Select a skill to see what it does and who uses it.</p><small>↑ ↓ move · Enter opens its files · ⌘G gives it</small></div>:<div className="sk-insp">
   <header className="sk-insp-head"><IconButton icon="arrow-left" label="Back to skills" onClick={deselect}/><SkillTile name={item.name} size={46}/><span><b>{skillTitle(item.name)}</b><small>{skillSource(item.origin).line} · version {item.version}</small></span></header>
   {item.description&&<p className="sk-insp-text">{item.description}</p>}
   <div className="sk-insp-actions"><button type="button" className="primary sk-main" title="Give to an agent (⌘G)" disabled={!canGive} onClick={()=>setGive(true)}>Give to an agent…</button><IconButton icon="open" label="Open its files" shortcut="Enter" disabled={!files} onClick={()=>setOpen(true)}/><IconButton icon="more" label="More for this skill" onClick={e=>at(e,itemMenu(item))}/></div>
   <hr/>
   <div className="sk-fact"><UiIcon name="users" size={16}/><span><small>Used by</small><span>{!usage?'Only the owner can see who uses it.':names(users(item.id)).length?names(users(item.id)).join(', '):'No agent yet.'}</span></span></div>
   <div className="sk-fact"><UiIcon name="file" size={16}/><span><small>Its files</small><span>{reading?'Reading…':filesError?filesError:files?`${files.length>1?`Main guide and ${files.length-1} ${files.length-1===1?'note':'notes'}`:'Main guide'} · open with Enter`:''}</span></span></div>
   {filesError&&!reading&&<button type="button" className="sk-link" onClick={()=>void select(item.id)}>Try again</button>}
   <div className="sk-fact"><UiIcon name="shield" size={16}/><span><small>Permissions</small><span>None. Agents keep their own permissions.</span></span></div>
   <p className="sk-hint">A skill is written guidance. It never gives an agent tools, connections or memory.</p>
  </div>}</aside>
  <ContextMenu menu={menu} onClose={close}/>
  {giveSheet}
  {where&&<WhereSkillsComeFrom onClose={()=>setWhere(false)}/>}
  {notices}
 </section>;
}

const APP_COLOUR:Record<string,string>={claude:'#D97757',codex:'#9AA4B2',shared:'#6FD3C7',project:'#9DBBFF',other:'#9AA4B2'};
/** SK3b: skill packages from coding apps on this computer. New ones say Add, changed ones say Update.
 *  Nothing in those folders changes; only Markdown files are copied into Dpro. */
export function SkillAppsPlace({client,active=true,query:outer,searchRef,onPlace}:{client:SessionClient;active?:boolean;query?:string;searchRef?:RefObject<HTMLInputElement|null>;onPlace?:(place:SkillPlace)=>void}){
 const [skills,setSkills]=useState<Skill[]>([]),[scan,setScan]=useState<Scan|null>(null),[looked,setLooked]=useState<Date|null>(null),[preview,setPreview]=useState<Preview|null>(null),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[reading,setReading]=useState(false),[notice,setNotice]=useState(''),[ownQuery,setOwnQuery]=useState(''),[open,setOpen]=useState(false),[usage,setUsage]=useState<Record<string,string[]>>({}),[source,setSource]=useState(''),[sort,setSort]=useState<'source'|'name'>('source'),[filter,setFilter]=useState(false);
 const ownSearch=useRef<HTMLInputElement>(null),search=searchRef??ownSearch,list=useRef<HTMLDivElement>(null),sequence=useRef(0),lock=useRef(false),started=useRef(false),{menu,at,close}=useMenu();
 const query=(outer??ownQuery).trim().toLowerCase();
 const reload=useCallback(async()=>{try{setSkills((await rpc<{skills:Skill[]}>(client,'GET',SKILLS_PATH)).skills);}catch{/* the chips fall back to Add */}try{const u=await rpc<{usage:{skillId:string;agentIds:string[]}[]}>(client,'GET',SKILLS_PATH+'/usage');setUsage(Object.fromEntries(u.usage.map(x=>[x.skillId,x.agentIds])));}catch{setUsage({});}},[client]);
 const look=useCallback(async()=>{if(lock.current)return;lock.current=true;setBusy(true);setNotice('');setLooked(null);sequence.current++;setPreview(null);setSelected('');try{setScan(await rpc<Scan>(client,'POST',SKILLS_PATH+'/scan',{}));}catch(e){setNotice(message(e));}finally{lock.current=false;setBusy(false);}},[client]);
 // Automatic first: opening the place looks once; "Look again" repeats it.
 useEffect(()=>{if(!active)return;void reload();if(!started.current){started.current=true;void look();}},[active,reload,look]);
 useEffect(()=>{if(!active||!scan||scan.status!=='scanning')return;let stopped=false,running=false;const timer=setInterval(()=>{if(running)return;running=true;void rpc<Scan>(client,'GET',`${SKILLS_PATH}/scans/${scan.id}`).then(r=>{if(!stopped)setScan(r);}).catch(e=>{if(!stopped)setNotice(message(e));}).finally(()=>{running=false;});},1000);return()=>{stopped=true;clearInterval(timer);};},[active,client,scan?.id,scan?.status]);
 useEffect(()=>{if(scan&&scan.status!=='scanning')setLooked(new Date());},[scan?.id,scan?.status]);
 // Old Import view parity: one source at a time, sorted by source (app) or by name.
 const byTitle=(a:Source,b:Source)=>skillTitle(a.name).localeCompare(skillTitle(b.name));
 const sources=(scan?.sources??[]).filter(s=>(!source||skillSource(s.origin).key===source)&&(!query||`${skillTitle(s.name)} ${s.name} ${s.description} ${s.location??''}`.toLowerCase().includes(query))).sort((a,b)=>sort==='source'?SOURCE_ORDER.indexOf(skillSource(a.origin).key)-SOURCE_ORDER.indexOf(skillSource(b.origin).key)||byTitle(a,b):byTitle(a,b));
 const present=(scan?.sources??[]).map(s=>skillSource(s.origin)).filter((s,i,all)=>all.findIndex(x=>x.key===s.key)===i).sort((a,b)=>SOURCE_ORDER.indexOf(a.key)-SOURCE_ORDER.indexOf(b.key));
 const item=scan?.sources.find(s=>s.id===selected),installed=(name:string)=>skills.find(s=>s.name===name);
 const state=(s:Source):'add'|'update'|'have'=>{if(s.id===selected&&preview)return !preview.existing?'add':preview.existing.identical?'have':'update';return installed(s.name)?'have':'add';};
 const select=async(id:string)=>{if(busy||!scan)return false;const seq=++sequence.current;setSelected(id);setPreview(null);setNotice('');setReading(true);try{const p=await rpc<Preview>(client,'POST',SKILLS_PATH+'/preview',{scanId:scan.id,sourceId:id});if(seq!==sequence.current)return false;setPreview(p);return true;}catch(e){if(seq===sequence.current)setNotice(message(e));return false;}finally{if(seq===sequence.current)setReading(false);}};
 const deselect=()=>{sequence.current++;setSelected('');setPreview(null);};
 useEffect(()=>{if(selected&&!sources.some(s=>s.id===selected))deselect();},[source,query]);
 // Update replaces the files only through the explicit Update button shown with its explanation (replaceHash).
 const add=async(update:boolean)=>{if(!scan||!preview||busy)return;const p=preview;setBusy(true);setNotice('');try{const r=await rpc<{skill:Skill;duplicate:boolean}>(client,'POST',SKILLS_PATH+'/import',{scanId:scan.id,sourceId:selected,hash:p.hash,...(update&&p.existing&&!p.existing.identical?{replaceHash:p.existing.hash}:{})});await reload();setPreview({...p,existing:{id:r.skill.id,hash:p.hash,identical:true}});setNotice(r.duplicate?'Already in Dpro. Nothing was added twice.':update?'Updated. Agents that have it use the new files from their next turn; their permissions stay the same.':'Added to Dpro. It stays unassigned until you give it to an agent.');}catch(e){setNotice(message(e));}finally{setBusy(false);}};
 const appOf=(s:Source)=>skillSource(s.origin),fromLine=(s:Source)=>[appOf(s).app??appOf(s).line,(s.location??'').replace(/\/?SKILL\.md$/i,'')].filter(Boolean).join(' · ');
 const step=(by:number|'first'|'last')=>{if(!sources.length||busy)return;const i=sources.findIndex(s=>s.id===selected),next=by==='first'?0:by==='last'?sources.length-1:Math.max(0,Math.min(sources.length-1,i<0?0:i+by));const s=sources[next];void select(s.id);list.current?.querySelector<HTMLButtonElement>(`[data-id="${s.id}"]`)?.focus();};
 if(open&&item&&preview)return <SkillFilesView title={skillTitle(preview.name)} sub={`${fromLine(item)} · not changed by Dpro`} files={preview.files} onBack={()=>setOpen(false)}/>;
 const st=item?state(item):'add',agentsWith=preview?.existing?(usage[preview.existing.id]??[]).length:0;
 const scanning=busy&&!scan||scan?.status==='scanning';
 const status=scanning?'Looking on this computer…':scan?.status==='error'?'The look did not finish. Look again.':looked?`Looked ${Date.now()-looked.getTime()<60000?'just now':'at '+looked.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}`:'';
 const rowMenu=(s:Source):MenuItem[]=>[{label:'Read its files',icon:'open',shortcut:'Enter',run:()=>{if(s.id===selected&&preview)setOpen(true);else void select(s.id).then(ok=>{if(ok)setOpen(true);});}},{label:'Look again',icon:'refresh',shortcut:'⌘R',run:()=>void look()}];
 const chip={add:'Add',update:'Update',have:'In Dpro'};
 const moreMenu:MenuItem[]=[{label:'Sort by source',checked:sort==='source',run:()=>setSort('source')},{label:'Sort by name',checked:sort==='name',run:()=>setSort('name')},'sep',{label:'Look again',icon:'refresh',shortcut:'⌘R',disabled:busy,run:()=>void look()},{label:'Clear filters',icon:'eraser',disabled:!source&&!ownQuery,run:()=>{setSource('');setOwnQuery('');}}];
 let group='';
 return <section className="sk-place" aria-label="Skills from my coding apps" onKeyDown={e=>{if(!active)return;const mod=e.metaKey||e.ctrlKey;if(mod&&e.key.toLowerCase()==='f'){e.preventDefault();search.current?.focus();return;}if(mod&&e.key.toLowerCase()==='r'){e.preventDefault();void look();return;}if(e.key==='Escape'&&selected&&!menu)deselect();}}>
  <div className="sk-main-pane">
   <header className="sk-toolbar"><h2>From my coding apps</h2>{status&&<span className="sk-status" role="status">{!scanning&&scan?.status!=='error'&&<UiIcon name="check" size={13}/>}{status}{scan&&scan.skipped>0?` · ${scan.skipped===1?'1 place':`${scan.skipped} places`} could not be read`:''}{scan?.limited?' · only part of this computer was read':''}</span>}{outer===undefined&&<label className="dk-search sk-own-search"><UiIcon name="search" size={13}/><input ref={ownSearch} type="search" aria-label="Search skills" placeholder="Search skills" value={ownQuery} onChange={e=>setOwnQuery(e.target.value)}/></label>}<span className="sk-gap"/><IconButton icon="refresh" label="Look again" shortcut="⌘R" disabled={scanning} onClick={()=>void look()}/>
    <span className="sk-anchor" data-popover-anchor><IconButton icon="filter" label="Show: from one app" pressed={!!source} onClick={()=>setFilter(v=>!v)}/><Popover open={filter} onClose={()=>setFilter(false)} label="Show"><div className="sk-show"><label>From<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Every app</option>{present.map(s=><option key={s.key} value={s.key}>{s.group}</option>)}</select></label></div></Popover></span>
    <IconButton icon="more" label="More: sort, look again, clear filters" onClick={e=>at(e,moreMenu)}/></header>
   {notice&&<p className="sk-notice" role="status">{notice}</p>}
   <div ref={list} className="sk-list" role="listbox" aria-label="Skill packages found in coding apps" onKeyDown={e=>{if(e.target instanceof HTMLInputElement)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();step(e.key==='ArrowDown'?1:-1);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();step(e.key==='Home'?'first':'last');}else if(e.key==='Enter'&&preview){e.preventDefault();setOpen(true);}else if((e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')&&item)at(e,rowMenu(item));}}>
    {!sources.length?<div className="sk-empty"><UiIcon name="code" size={28}/><p>{query||source?'No skill packages match.':scanning?'Looking for skill packages from Claude Code, Codex and others…':scan?'No skill packages found in your coding apps.':'Dpro looks for skill packages from Claude Code, Codex and others.'}</p>{!scanning&&!query&&!source&&<button type="button" onClick={()=>void look()}>Look again</button>}{source&&<button type="button" onClick={()=>setSource('')}>Show every app</button>}</div>
    :sources.map(s=>{const k=state(s),colour=APP_COLOUR[appOf(s).key]??APP_COLOUR.other,head=sort==='source'&&appOf(s).group!==group?appOf(s).group:'';group=appOf(s).group;return <div key={s.id} className="sk-row-wrap">{head&&<p className="sk-group"><UiIcon name={appOf(s).icon} size={13}/>{head}</p>}<button type="button" data-id={s.id} className="sk-row" role="option" aria-selected={selected===s.id} disabled={busy} onClick={()=>void select(s.id)} onContextMenu={e=>{if(s.id!==selected)void select(s.id);at(e,rowMenu(s));}}><span className="sk-tile" aria-hidden="true" style={{inlineSize:28,blockSize:28,color:colour,background:`color-mix(in srgb, ${colour} 14%, transparent)`}}><UiIcon name={appOf(s).icon} size={14}/></span><span className="sk-row-text"><span className="sk-row-name">{skillTitle(s.name)}</span><span className="sk-row-sub">{fromLine(s)}</span></span><span className="sk-chip" data-state={k}>{chip[k]}</span></button></div>;})}
   </div>
  </div>
  <aside className="sk-inspector" aria-label="Selected package">{!item?<div className="sk-empty"><UiIcon name="code" size={30}/><p>Select a package to read it, then add it to Dpro.</p><small>Nothing in your folders changes.</small></div>:<div className="sk-insp">
   <header className="sk-insp-head"><IconButton icon="arrow-left" label="Back to the list" onClick={deselect}/><SkillTile name={item.name} size={40}/><span><b>{skillTitle(item.name)}</b><small>{fromLine(item)}</small></span></header>
   {item.description&&<p className="sk-insp-text">{item.description}</p>}
   {reading?<p className="sk-muted" role="status">Reading its files…</p>:!preview?<><p className="sk-muted">Its files could not be read.</p><button type="button" className="sk-link" onClick={()=>void select(item.id)}>Try again</button></>:<>
    <p className="sk-insp-text">{st==='add'?'Not in Dpro yet.':st==='have'?'The same as the one in Dpro.':'A different copy than the one in Dpro.'}</p>
    {st==='update'&&<div className="sk-box">Updating replaces its files{agentsWith?` for the ${agentsWith===1?'agent':`${agentsWith} agents`} that ${agentsWith===1?'has':'have'} it, on their next turn`:''}. The old files are kept. Their permissions do not change.</div>}
    <div className="sk-insp-actions">{st==='add'&&<button type="button" className="primary sk-main" disabled={busy} onClick={()=>void add(false)}>{busy?'Adding…':'Add'}</button>}{st==='update'&&<><button type="button" className="primary sk-main" disabled={busy} onClick={()=>void add(true)}>{busy?'Updating…':'Update'}</button><button type="button" disabled={busy} onClick={()=>{deselect();setNotice('Kept the copy in Dpro.');}}>Keep mine</button></>}{st==='have'&&onPlace&&<button type="button" onClick={()=>onPlace('installed')}>Open in Installed</button>}</div>
    <button type="button" className="sk-link" onClick={()=>setOpen(true)}>{st==='update'?'Read the new files first':'Read its files'}</button>
    <p className="sk-hint">Markdown only.{preview.redactions>0?` ${preview.redactions===1?'1 secret was':`${preview.redactions} secrets were`} hidden.`:''}{preview.omitted>0?` ${preview.omitted===1?'1 script or link was':`${preview.omitted} scripts or links were`} left out.`:' Scripts and links are never added.'} It starts unassigned; you give it to agents.</p>
   </>}
  </div>}</aside>
  <ContextMenu menu={menu} onClose={close}/>
 </section>;
}
