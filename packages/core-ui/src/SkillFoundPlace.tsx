import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {DiscoveryController} from './discovery-controller';
import {UiIcon} from './ui-icons';
import {IconButton,Tile} from './desktop-ui';
import {SkillTile} from './SkillsWorkspace';
import {skillTitle} from './skill-display';
const RANK:Record<string,number>={new:0,changed:1,decision:2,imported:3,gone:4};
const STATE:Record<string,string>={new:'new',changed:'changed since it was added',decision:'needs your decision',imported:'in Dpro',gone:'gone from this computer'};
/** SK3c / MC4: skills or MCP servers found on this computer by the same folder scan as Memory, one at a time (J / K).
 *  Add it (off) · Don't show again · Take out of Dpro — the file on this computer never changes.
 *  An MCP server with a key first asks: Credentials or Leave it. Turning it on stays in All connections. */
export function SkillFoundPlace({c,active,kind='skill'}:{c:DiscoveryController;active:boolean;kind?:'skill'|'mcp'}){
 const mcp=kind==='mcp',word=mcp?'MCP servers':'skills',title=(name:string)=>mcp?name:skillTitle(name);
 const s=useSyncExternalStore(c.subscribe,c.getSnapshot,c.getSnapshot),[at,setAt]=useState(0),root=useRef<HTMLElement>(null);
 const items=(s.view?.items??[]).filter(i=>i.kind===kind&&i.state!=='ignored').sort((a,b)=>(RANK[a.state]??5)-(RANK[b.state]??5)||a.name.localeCompare(b.name));
 const index=Math.min(at,Math.max(0,items.length-1)),item=items[index],p=s.preview&&s.preview.kind===kind&&s.preview.id===item?.id?s.preview:null;
 // Automatic first: the current one opens by itself, so its text is there to read.
 useEffect(()=>{if(active&&item&&!p&&s.previewLoading!==item.id&&!s.busy)void c.open(item.id);},[active,item?.id,p,s.busy]);
 const move=(by:number)=>{if(!items.length)return;setAt(Math.max(0,Math.min(items.length-1,index+by)));};
 const where=(id:string|null)=>s.view?.roots.find(r=>r.id===id)?.name??'This computer';
 if(s.phase==='error')return <div className="sk-found"><div className="sk-empty"><p>{s.notice??'The scan could not be read.'}</p><button type="button" onClick={()=>void c.load()}>Try again</button></div></div>;
 if(s.phase!=='ready'||!s.view)return <div className="sk-found"><p className="sk-empty" role="status">Reading what the scan found…</p></div>;
 return <section ref={root} className="sk-found" aria-label={`${mcp?'MCP servers':'Skills'} found on this computer`} tabIndex={-1} onKeyDown={e=>{if((e.target as HTMLElement).closest('input,textarea,select')||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='j'||e.key==='ArrowDown'){e.preventDefault();move(1);}else if(e.key==='k'||e.key==='ArrowUp'){e.preventDefault();move(-1);}}}>
  <header className="sk-found-head"><h2>Found on this computer</h2>{items.length>0&&<span className="sk-muted">{index+1} of {items.length} · J / K next</span>}<span className="sk-gap"/><IconButton icon="arrow-up" label="Previous" shortcut="K" disabled={index<=0} onClick={()=>move(-1)}/><IconButton icon="arrow-down" label="Next" shortcut="J" disabled={index>=items.length-1} onClick={()=>move(1)}/><IconButton icon="refresh" label="Scan now" disabled={s.scanning} onClick={()=>void c.scan()}/></header>
  {s.result&&<p className="sk-ok" role="status">{s.result}</p>}
  {s.notice&&<p className="sk-alert" role="alert">{s.notice}</p>}
  {!item?<div className="sk-empty"><UiIcon name="folder" size={28}/><p>No {word} found yet. Allow more folders in Settings › Memory › Folders and drives, then scan.</p><button type="button" disabled={s.scanning} onClick={()=>void c.scan()}>Scan now</button></div>:<>
   <div className="sk-found-title">{mcp?<Tile name={item.name} size={34}/>:<SkillTile name={item.name} size={34}/>}<span><b>{title(item.name)}</b><small>In {where(item.rootId)} · {item.from} · {STATE[item.state]??item.state}</small></span></div>
   <pre className="sk-found-text" dir="auto" tabIndex={0} aria-label={`${title(item.name)} text`}>{p?`${p.text.slice(0,8000)}${p.truncated||p.text.length>8000?'\n…':''}`:s.previewLoading===item.id?'Opening…':''}</pre>
   {mcp&&p&&p.secrets.length>0&&item.state!=='imported'&&<div className="sk-found-ask"><p>It has a key. Save it in Credentials, or leave it on this computer?</p><div className="dk-segmented" role="group" aria-label="The key">{(['credentials','leave'] as const).map(v=><button key={v} type="button" aria-pressed={s.secret===v} disabled={s.busy} onClick={()=>c.setSecret(v)}>{v==='credentials'?'Credentials':'Leave it'}</button>)}</div></div>}
   {p?.blocked&&<p className="sk-alert">{p.blocked}</p>}
   <div className="sk-insp-actions">{item.state==='imported'?<button type="button" disabled={s.busy} onClick={()=>void c.remove(item.id)}>{mcp?'Take out':'Take out of Dpro'}</button>:<button type="button" className="primary sk-main" disabled={s.busy||!p||!!p.blocked} onClick={()=>void c.importOpen()}>Add it (off)</button>}<button type="button" disabled={s.busy} onClick={()=>void c.ignore(item.id,true)}>Don’t show again</button></div>
   <p className="sk-hint">{item.state==='imported'?'Taking it out leaves the file on this computer.':mcp?'Added connections start off; you turn them on in All connections.':'Added skills start off; you give them to agents.'} Which folders are read: Settings › Memory › Folders and drives.</p>
  </>}
 </section>;
}
