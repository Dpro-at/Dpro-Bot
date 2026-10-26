import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {DiscoveryController} from './discovery-controller';
import {UiIcon} from './ui-icons';
import {IconButton} from './desktop-ui';
import {SkillTile} from './SkillsWorkspace';
import {skillTitle} from './skill-display';
const RANK:Record<string,number>={new:0,changed:1,decision:2,imported:3,gone:4};
const STATE:Record<string,string>={new:'new',changed:'changed since it was added',decision:'needs your decision',imported:'in Dpro',gone:'gone from this computer'};
/** SK3c: skills found on this computer by the same folder scan as Memory, one at a time (J / K).
 *  Add it (off) · Don't show again · Take out of Dpro — the file on this computer never changes. */
export function SkillFoundPlace({c,active}:{c:DiscoveryController;active:boolean}){
 const s=useSyncExternalStore(c.subscribe,c.getSnapshot,c.getSnapshot),[at,setAt]=useState(0),root=useRef<HTMLElement>(null);
 const items=(s.view?.items??[]).filter(i=>i.kind==='skill'&&i.state!=='ignored').sort((a,b)=>(RANK[a.state]??5)-(RANK[b.state]??5)||a.name.localeCompare(b.name));
 const index=Math.min(at,Math.max(0,items.length-1)),item=items[index],p=s.preview&&s.preview.kind==='skill'&&s.preview.id===item?.id?s.preview:null;
 // Automatic first: the current one opens by itself, so its text is there to read.
 useEffect(()=>{if(active&&item&&!p&&s.previewLoading!==item.id&&!s.busy)void c.open(item.id);},[active,item?.id,p,s.busy]);
 const move=(by:number)=>{if(!items.length)return;setAt(Math.max(0,Math.min(items.length-1,index+by)));};
 const where=(id:string|null)=>s.view?.roots.find(r=>r.id===id)?.name??'This computer';
 if(s.phase==='error')return <div className="sk-found"><div className="sk-empty"><p>{s.notice??'The scan could not be read.'}</p><button type="button" onClick={()=>void c.load()}>Try again</button></div></div>;
 if(s.phase!=='ready'||!s.view)return <div className="sk-found"><p className="sk-empty" role="status">Reading what the scan found…</p></div>;
 return <section ref={root} className="sk-found" aria-label="Skills found on this computer" tabIndex={-1} onKeyDown={e=>{if((e.target as HTMLElement).closest('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='j'||e.key==='ArrowDown'){e.preventDefault();move(1);}else if(e.key==='k'||e.key==='ArrowUp'){e.preventDefault();move(-1);}}}>
  <header className="sk-found-head"><h2>Found on this computer</h2>{items.length>0&&<span className="sk-muted">{index+1} of {items.length} · J / K next</span>}<span className="sk-gap"/><IconButton icon="arrow-up" label="Previous" shortcut="K" disabled={index<=0} onClick={()=>move(-1)}/><IconButton icon="arrow-down" label="Next" shortcut="J" disabled={index>=items.length-1} onClick={()=>move(1)}/><IconButton icon="refresh" label="Scan now" disabled={s.scanning} onClick={()=>void c.scan()}/></header>
  {s.result&&<p className="sk-ok" role="status">{s.result}</p>}
  {s.notice&&<p className="sk-alert" role="alert">{s.notice}</p>}
  {!item?<div className="sk-empty"><UiIcon name="folder" size={28}/><p>No skills found yet. Allow more folders in Settings › Memory › Folders and drives, then scan.</p><button type="button" disabled={s.scanning} onClick={()=>void c.scan()}>Scan now</button></div>:<>
   <div className="sk-found-title"><SkillTile name={item.name} size={34}/><span><b>{skillTitle(item.name)}</b><small>In {where(item.rootId)} · {item.from} · {STATE[item.state]??item.state}</small></span></div>
   <pre className="sk-found-text" dir="auto" tabIndex={0} aria-label={`${skillTitle(item.name)} text`}>{p?`${p.text.slice(0,8000)}${p.truncated||p.text.length>8000?'\n…':''}`:s.previewLoading===item.id?'Opening…':''}</pre>
   {p?.blocked&&<p className="sk-alert">{p.blocked}</p>}
   <div className="sk-insp-actions">{item.state==='imported'?<button type="button" disabled={s.busy} onClick={()=>void c.remove(item.id)}>Take out of Dpro</button>:<button type="button" className="primary sk-main" disabled={s.busy||!p||!!p.blocked} onClick={()=>void c.importOpen()}>Add it (off)</button>}<button type="button" disabled={s.busy} onClick={()=>void c.ignore(item.id,true)}>Don’t show again</button></div>
   <p className="sk-hint">{item.state==='imported'?'Taking it out leaves the file on this computer.':'Added skills start off; you give them to agents.'} Which folders are read: Settings › Memory › Folders and drives.</p>
  </>}
 </section>;
}
