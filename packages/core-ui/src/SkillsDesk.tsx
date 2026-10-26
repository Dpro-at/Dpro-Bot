import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import type {SessionClient} from './session';
import {DiscoveryController,type DiscoveryUiState} from './discovery-controller';
import {UiIcon,type UiIconName} from './ui-icons';
import {AvailableSkillsWorkspace} from './AvailableSkillsWorkspace';
import {SkillAppsPlace,SkillsWorkspace,WhereSkillsComeFrom,type SkillPlace} from './SkillsWorkspace';
import {SkillFoundPlace} from './SkillFoundPlace';
type Place={key:SkillPlace;icon:UiIconName;label:string};
/** The places in the Skills sidebar (board SK1): what is in Dpro, then the three ways to add skills. */
export const skillPlaces:{title?:string;places:Place[]}[]=[
 {places:[{key:'installed',icon:'star',label:'Installed'},{key:'in-use',icon:'users',label:'In use by agents'}]},
 {title:'Add skills',places:[{key:'catalogue',icon:'download',label:'From Dpro’s catalogue'},{key:'apps',icon:'code',label:'From my coding apps'},{key:'found',icon:'folder',label:'Found on this computer'}]},
];
const EMPTY:{view:DiscoveryUiState['view']}={view:null},NONE=()=>()=>{};
/** Skills as a desktop section: its own sidebar (search + places), one place at a time on the right. */
export function SkillsDesk({client,active,slot,onOpenAgents,initialPlace='installed'}:{client:SessionClient;active:boolean;slot?:HTMLElement|null;onOpenAgents?:()=>void;initialPlace?:SkillPlace}){
 const [place,setPlace]=useState<SkillPlace>(initialPlace),[query,setQuery]=useState(''),[where,setWhere]=useState(false),[c,setC]=useState<DiscoveryController>(),search=useRef<HTMLInputElement>(null);
 useEffect(()=>{const x=new DiscoveryController(client);setC(x);return()=>x.dispose();},[client]);
 // The "found" badge reads the last scan (nothing is scanned or added by opening Skills).
 useEffect(()=>{if(active&&c&&c.getSnapshot().phase==='idle')void c.load();},[active,c]);
 const snapshot=c?.getSnapshot??(():{view:DiscoveryUiState['view']}=>EMPTY),found=useSyncExternalStore<{view:DiscoveryUiState['view']}>(c?.subscribe??NONE,snapshot,snapshot);
 const fresh=(found.view?.items??[]).filter(i=>i.kind==='skill'&&(i.state==='new'||i.state==='changed')).length;
 const pick=(key:SkillPlace)=>{setPlace(key);};
 const sidebar=<nav className="dk-sidebar sk-places" aria-label="Skills places">
  <label className="dk-search sk-search"><UiIcon name="search" size={13}/><input ref={search} type="search" aria-label="Search skills" placeholder="Search  ⌘F" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&query){e.preventDefault();setQuery('');}}}/></label>
  {skillPlaces.map((g,i)=><div key={i} className="sk-place-group">{g.title&&<p className="section-label dk-label"><span>{g.title}</span></p>}{g.places.map(p=><button key={p.key} type="button" className="nav-item dk-place" title={p.label} aria-current={place===p.key?'page':undefined} onClick={()=>pick(p.key)}><UiIcon name={p.icon} size={15}/><span className="dk-place-name">{p.label}</span>{p.key==='found'&&fresh?<span className="dk-badge-pill" aria-label={`${fresh} new`}>{fresh}</span>:null}</button>)}</div>)}
 </nav>;
 const session=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot),owner=session.phase==='authenticated'&&session.user?.role==='owner';
 const body=place==='catalogue'&&!owner?<div className="sk-empty"><UiIcon name="lock" size={28}/><p>Only the owner can add skills from Dpro’s catalogue.</p></div>:place==='catalogue'?<AvailableSkillsWorkspace client={client} active={active} query={query} searchRef={search} onOpenLibrary={()=>pick('installed')}/>
  :place==='apps'?<SkillAppsPlace client={client} active={active} query={query} searchRef={search} onPlace={pick}/>
  :place==='found'?(c?<SkillFoundPlace c={c} active={active}/>:null)
  :<SkillsWorkspace key={place} client={client} active={active} view={place==='in-use'?'in-use':'installed'} query={query} searchRef={search} onOpenAgents={onOpenAgents} onPlace={pick} onWhereFrom={()=>setWhere(true)}/>;
 return <section className="dk-mem sk-desk" aria-label="Skills" data-inline-sidebar={slot?undefined:'true'} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='f'&&!e.defaultPrevented){e.preventDefault();search.current?.focus();}}}>
  {slot?(active?createPortal(sidebar,slot):null):sidebar}
  <div className="dk-content sk-content">{body}</div>
  {where&&<WhereSkillsComeFrom onClose={()=>setWhere(false)}/>}
 </section>;
}
