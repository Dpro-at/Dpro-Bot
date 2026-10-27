import {useEffect,useMemo,useRef,useState,useSyncExternalStore,type RefObject} from 'react';
import type {SessionClient} from './session';
import {SkillCatalogueController} from './skill-catalogue-controller';
import {SkillInstallSheet} from './SkillInstallSheet';
import {UiIcon} from './ui-icons';
import {ContextMenu,IconButton,useMenu,type MenuItem} from './desktop-ui';
import {SkillTile} from './SkillsWorkspace';
import {skillTitle} from './skill-display';
/** A place inside the existing Skills section; no second navigation or automatic install. */
export function AvailableSkillsWorkspace({client,active,onOpenLibrary,query,searchRef}:{client:SessionClient;active:boolean;onOpenLibrary:()=>void;query?:string;searchRef?:RefObject<HTMLInputElement|null>}){
 const session=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot);
 return active&&session.phase==='authenticated'&&session.user?.role==='owner'?<AvailableSkillsContent key={session.epoch} client={client} onOpenLibrary={onOpenLibrary} query={query} searchRef={searchRef}/>:null;
}
function AvailableSkillsContent({client,onOpenLibrary,query:outer,searchRef}:{client:SessionClient;onOpenLibrary:()=>void;query?:string;searchRef?:RefObject<HTMLInputElement|null>}){
 const controller=useMemo(()=>new SkillCatalogueController(client),[client]),state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),[ownQuery,setOwnQuery]=useState(''),[where,setWhere]=useState(false),{menu,at,close:closeMenu}=useMenu();
 const ownSearch=useRef<HTMLInputElement>(null),search=searchRef??ownSearch,list=useRef<HTMLDivElement>(null),reviewButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{void controller.load();return()=>controller.close();},[controller]);
 const query=(outer??ownQuery).trim().toLowerCase();
 const matches=state.skills.filter(s=>!query||`${skillTitle(s.targetName)} ${s.targetName}`.toLowerCase().includes(query)),selected=state.selected,unknown=!!selected&&state.unknownTargets.includes(selected.targetName),busy=state.phase==='loading'||!!state.review;
 useEffect(()=>{if(selected&&!matches.some(s=>s.targetName===selected.targetName))controller.select('');},[query]);
 const choose=(name:string)=>{controller.select(name);setWhere(false);};
 const review=()=>{closeMenu();controller.beginReview();};
 const refresh=()=>{closeMenu();void controller.load();};
 const step=(by:number|'first'|'last')=>{if(!matches.length||busy)return;const i=matches.findIndex(s=>s.targetName===selected?.targetName),next=by==='first'?0:by==='last'?matches.length-1:Math.max(0,Math.min(matches.length-1,i<0?0:i+by));const s=matches[next];choose(s.targetName);list.current?.querySelector<HTMLButtonElement>(`[data-id="${s.targetName}"]`)?.focus();};
 const close=(result:'applied'|'unknown'|'cancelled')=>{const ticket=controller.getSnapshot().review?.ticket;if(ticket===undefined)return;controller.finishReview(ticket,result);reviewButton.current?.focus();};
 const moreMenu:MenuItem[]=[{label:'Read and add the selected skill…',icon:'download',disabled:!state.canReview,run:review},{label:'Clear search',icon:'eraser',disabled:!ownQuery,run:()=>setOwnQuery('')},'sep',{label:'Open Installed',icon:'star',run:onOpenLibrary}];
 const rowMenu:MenuItem[]=[{label:'Read and add…',icon:'download',disabled:!state.canReview,run:review},{label:'Where it comes from',icon:'globe',run:()=>setWhere(true)}];
 const notice=state.notice==='verification'?'Turn on account verification in Settings › Account, then load the catalogue again.':state.notice==='limited'?'Too many attempts. Wait a little before loading the catalogue again.':state.notice==='unavailable'?'The catalogue could not be loaded. Load it again to retry.':state.notice==='applied'?'Added to Girru. It stays unassigned until you give it to an agent.':state.notice?'The last add has no confirmed result. Load the catalogue again, then read it again if needed.':'';
 return <section className="sk-place available-skills" aria-label="Available skills" onKeyDown={event=>{if(state.review)return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'){event.preventDefault();search.current?.focus();}if(event.key==='Escape'&&!menu){controller.select('');}}}>
  <div className="sk-main-pane">
   <header className="sk-toolbar"><h2>From Girru’s catalogue</h2>{outer===undefined&&<label className="dk-search sk-own-search"><UiIcon name="search" size={13}/><input ref={ownSearch} type="search" aria-label="Search available skills" placeholder="Search skills" disabled={busy} value={ownQuery} onChange={event=>setOwnQuery(event.target.value)}/></label>}<span className="sk-gap"/><IconButton icon="refresh" label="Load the catalogue again" disabled={busy} onClick={refresh}/><IconButton icon="more" label="More: read and add, clear search, open Installed" disabled={busy} onClick={e=>at(e,moreMenu)}/></header>
   {notice&&<p className="sk-notice" role="status">{notice}</p>}
   <div ref={list} className="sk-list" role="listbox" aria-label="Available skill catalogue" onKeyDown={e=>{if(e.target instanceof HTMLInputElement)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();step(e.key==='ArrowDown'?1:-1);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();step(e.key==='Home'?'first':'last');}else if(e.key==='Enter'&&state.canReview){e.preventDefault();review();}else if((e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')&&selected)at(e,rowMenu);}}>
    {state.phase==='loading'?<div className="sk-empty" role="status"><p>Loading the catalogue…</p></div>:state.phase==='unavailable'?<div className="sk-empty"><UiIcon name={state.notice==='verification'?'shield':'download'} size={28}/><p>{state.notice==='verification'?'The catalogue opens after you turn on account verification (Settings › Verification).':'The catalogue is not available right now.'}</p><button type="button" onClick={refresh}>{state.notice==='verification'?'Check again':'Load again'}</button></div>:!matches.length?<div className="sk-empty"><UiIcon name="download" size={28}/><p>{query?'No skills match.':'The catalogue has no skills to add right now.'}</p></div>
    :matches.map(skill=><button key={skill.sourcePath} type="button" data-id={skill.targetName} className="sk-row" role="option" aria-selected={selected?.targetName===skill.targetName} disabled={busy} onClick={()=>choose(skill.targetName)} onDoubleClick={()=>{choose(skill.targetName);review();}} onContextMenu={event=>{choose(skill.targetName);at(event,rowMenu);}}><SkillTile name={skill.targetName}/><span className="sk-row-text"><span className="sk-row-name">{skillTitle(skill.targetName)}</span><span className="sk-row-sub">Official skills · fixed version</span></span>{state.unknownTargets.includes(skill.targetName)&&<span className="sk-chip" data-state="update">Check result</span>}</button>)}
   </div>
  </div>
  <aside className="sk-inspector" aria-label="Selected available skill">{!selected?<div className="sk-empty"><UiIcon name="download" size={30}/><p>Select a skill to read it, then add it to Girru.</p><small>Adding asks for your authenticator code.</small></div>:<div className="sk-insp">
   <header className="sk-insp-head"><IconButton icon="arrow-left" label="Back to the catalogue" onClick={()=>controller.select('')}/><SkillTile name={selected.targetName} size={46}/><span><b>{skillTitle(selected.targetName)}</b><small>Official skills · fixed version</small></span></header>
   <p className="sk-insp-text">Read the whole guide, confirm with your authenticator code, then add it. It adds guidance only — no tools and no agents.</p>
   {unknown?<><p className="sk-alert" role="alert">{state.canAcknowledge?'The result is still not confirmed. You can read the current guide again on purpose.':'The last add has no confirmed result. Load the catalogue again before reading it again.'}</p><div className="sk-insp-actions"><button type="button" className="primary sk-main" disabled={!state.canAcknowledge||busy} onClick={()=>{if(controller.acknowledgeUnknown(selected.targetName))review();}}>Read it again…</button></div></>:<div className="sk-insp-actions"><button ref={reviewButton} type="button" className="primary sk-main" disabled={!state.canReview||busy} onClick={review}>Read and add…</button><IconButton icon="more" label="More for this skill" onClick={e=>at(e,rowMenu)}/></div>}
   {state.notice==='applied'&&<button type="button" className="sk-link" onClick={onOpenLibrary}>Open Installed</button>}
   {where&&<div className="sk-fact"><UiIcon name="globe" size={16}/><span><small>Where it comes from</small><span>The official skills collection, file {selected.sourcePath}/SKILL.md</span></span></div>}
   <p className="sk-hint">It stays unassigned until you give it to an agent.</p>
  </div>}</aside>
  <ContextMenu menu={menu} onClose={closeMenu}/>
  {state.review&&<SkillInstallSheet key={state.review.ticket} client={client} source={state.review.source} onClose={close}/>}
 </section>;
}
