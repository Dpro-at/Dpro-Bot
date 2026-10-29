import {useCallback,useEffect,useRef,useState} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent,MouseEvent as ReactMouseEvent} from 'react';
import type {SessionClient} from './session';
import {UiIcon} from './ui-icons';
import type {UiIconName} from './ui-icons';
import {ContextMenu,IconButton,Notice,Sheet,useMenu} from './desktop-ui';
import type {MenuItem} from './desktop-ui';
import {STORE_PATH,STORE_INSTALL_PATH,STORE_UNINSTALL_PATH} from './apps-contract.js';
import type {StoreData,StoreItem,StoreSource,StoreChange} from './apps-contract.js';
import {initial} from './memory-desktop';
import {skillTitle} from './skill-display';
/** Coding-app add-ons keep their package names; show them as words ("code-review" → "Code review"). */
export const itemName=(x:Pick<StoreItem,'name'|'source'>)=>x.source==='girru'?x.name:skillTitle(x.name);

/** The Store's places in the Apps sidebar (SA1): Home, Search, a category, a source, Updates. */
export type StorePlace={kind:'home'}|{kind:'search'}|{kind:'category';id:string}|{kind:'from';source:StoreSource}|{kind:'updates'};
export type IncludedApp='genvr'|'trading'|'terminal'|'code';
export const SOURCE_TITLES:Record<StoreSource,string>={girru:'Girru','claude-code':'Claude Code add-ons',codex:'Codex add-ons'};
/** Where an item comes from, in the words of its chip. */
export const sourceChip=(x:Pick<StoreItem,'id'|'source'>)=>x.source==='girru'?(x.id.startsWith('girru:')?'Made by Girru':'Girru’s registry'):x.source==='codex'?'Codex add-on':'Claude Code add-on';
const TINT:Record<string,string>={marketing:'#E07AB0',sales:'#5FB37A',developer:'#9AA4B2',worlds:'#6FD3C7',trading:'#F0C27A',productivity:'#7AA5FF',more:'#B49AF0'};
const ICONS=new Set<string>(['globe','chart','terminal','code','send','headset','calendar','puzzle','store']);
const includedApp=(x:StoreItem)=>x.state==='included'?x.id.slice(6) as IncludedApp:null;
/** Search: names that match first, then the rest of the words. */
export const matchStore=(items:StoreItem[],query:string)=>{const q=query.trim().toLowerCase();if(!q)return [];const named=(x:StoreItem)=>itemName(x).toLowerCase().includes(q)||x.name.toLowerCase().includes(q);return [...items.filter(named),...items.filter(x=>!named(x)&&`${x.summary} ${x.maker} ${x.description}`.toLowerCase().includes(q))];};
/** Items of one place, in the store's order. */
export function placeItems(data:StoreData,place:StorePlace,query=''):StoreItem[]{
 if(place.kind==='search')return matchStore(data.items,query);
 if(place.kind==='category')return data.items.filter(x=>x.category===place.id);
 if(place.kind==='from')return data.items.filter(x=>x.source===place.source);
 if(place.kind==='updates')return data.items.filter(x=>x.update);
 return data.items;
}

/** One read for the whole Store; read again after Add or Remove. */
export function useStore(client:SessionClient,enabled:boolean,refresh:number){
 const [data,setData]=useState<StoreData|null>(null),[error,setError]=useState(false),[n,setN]=useState(0);
 useEffect(()=>{if(!enabled)return;let stopped=false;setError(false);void client.request({method:'GET',path:STORE_PATH} as never).then(r=>{if(stopped)return;if(r.status!==200){setError(true);return;}setData(r.body as StoreData);}).catch(()=>{if(!stopped)setError(true);});return()=>{stopped=true;};},[client,enabled,refresh,n]);
 return {data,error,reload:useCallback(()=>setN(x=>x+1),[])};
}

/** The item's real icon on its category's colour; its initial when it has none. */
export function StoreIcon({item,size=44}:{item:Pick<StoreItem,'icon'|'name'|'category'>;size?:number}){
 return <span className="st-icon" aria-hidden="true" style={{'--tint':TINT[item.category]??TINT.more,inlineSize:size,blockSize:size,borderRadius:Math.round(size*.26),fontSize:Math.round(size*.42)} as never}>{item.icon&&ICONS.has(item.icon)?<UiIcon name={item.icon as UiIconName} size={Math.round(size*.46)}/>:initial(item.name)}</span>;
}
/** Free, Installed, or where to add it (no ratings or install counts: no real source yet). */
function Price({item}:{item:StoreItem}){
 if(item.state==='included'||item.state==='installed')return <span className="st-chip" data-tone="ok"><UiIcon name="check" size={11}/>Installed</span>;
 if(item.state==='elsewhere')return <span className="st-chip" data-tone={item.source}>{item.present?'On this computer':sourceChip(item)}</span>;
 return <span className="st-chip">Free</span>;
}

export function Store({client,data,error,onReload,place,query,onPlace,onOpenApp,openRequest}:{client:SessionClient;data:StoreData|null;error:boolean;onReload:()=>void;place:StorePlace;query:string;onPlace:(p:StorePlace)=>void;onOpenApp:(id:IncludedApp)=>void;openRequest?:{id:string;n:number}}){
 const [page,setPage]=useState<string|null>(null),[adding,setAdding]=useState<StoreItem|null>(null),[busy,setBusy]=useState(false),[problem,setProblem]=useState(''),[toast,setToast]=useState<{id:number;text:string;undo:boolean;show?:unknown}|null>(null);
 const undoRef=useRef<(()=>void)|null>(null),root=useRef<HTMLDivElement>(null),{menu,at,close}=useMenu();
 const placeKey=JSON.stringify(place);
 useEffect(()=>{setPage(null);root.current?.querySelector('.st-scroll')?.scrollTo?.(0,0);},[placeKey]);
 useEffect(()=>{if(openRequest)setPage(openRequest.id);},[openRequest?.n]);
 const item=page?data?.items.find(x=>x.id===page)??null:null;
 const say=(text:string,undo?:()=>void)=>{undoRef.current=undo??null;setToast({id:Date.now(),text,undo:!!undo});};
 const change=async(path:string,body:object)=>{const r=await client.request({method:'POST',path,body} as never);return r.body as StoreChange;};
 async function add(x:StoreItem){
  setBusy(true);setProblem('');
  try{const r=await change(STORE_INSTALL_PATH,{id:x.id,hash:x.hash});
   if('ok' in r){setAdding(null);onReload();say(`${itemName(x)} added.`,()=>void remove(x,true));}
   else{setProblem(r.message||'It could not be added.');if(r.code==='changed')onReload();}
  }catch{setProblem('It could not be added. Try again.');}finally{setBusy(false);}
 }
 async function remove(x:StoreItem,quiet=false){
  try{const r=await change(STORE_UNINSTALL_PATH,{id:x.id});onReload();if(!quiet)say('ok' in r?`${itemName(x)} removed.`:r.message||'It could not be removed.','ok' in r?()=>void change(STORE_INSTALL_PATH,{id:x.id,hash:x.hash}).then(onReload):undefined);}
  catch{say('It could not be removed. Try again.');}
 }
 /** The one action of an item: Open what is installed, Get what is free, read about the rest. */
 const act=(x:StoreItem)=>{const app=includedApp(x);if(app)onOpenApp(app);else if(x.state==='available'){setProblem('');setAdding(x);}else setPage(x.id);};
 const actionLabel=(x:StoreItem)=>x.state==='included'?'Open':x.state==='available'?'Get':null;
 const itemMenu=(x:StoreItem):MenuItem[]=>[{label:'Show details',icon:'info',run:()=>setPage(x.id)},...(actionLabel(x)?[{label:actionLabel(x)!,icon:x.state==='included'?'open':'download',run:()=>act(x)} as MenuItem]:[]),...(x.state==='installed'?['sep' as const,{label:'Remove',icon:'trash',run:()=>void remove(x)} as MenuItem]:[])];
 const onKey=(e:ReactKeyboardEvent)=>{if(e.defaultPrevented)return;const mod=e.metaKey||e.ctrlKey;if(mod&&e.key==='['&&page){e.preventDefault();setPage(null);}else if(mod&&e.key.toLowerCase()==='r'){e.preventDefault();onReload();}};
 const open=(x:StoreItem)=>setPage(x.id),ctx=(x:StoreItem)=>(e:ReactMouseEvent)=>at(e,itemMenu(x));
 const title=item?itemName(item):place.kind==='home'?'Home':place.kind==='search'?'Search':place.kind==='updates'?'Updates':place.kind==='from'?SOURCE_TITLES[place.source]:data?.categories.find(c=>c.id===place.id)?.title??'Category';
 const items=data?placeItems(data,place,query):[];
 return <div className="apps-main st-store" ref={root} onKeyDown={onKey}>
  <header className="apps-toolbar">{item&&<IconButton icon="arrow-left" label="Back" shortcut="⌘[" onClick={()=>setPage(null)}/>}<h2>{title}</h2>
   <IconButton icon="more" label="More" onClick={e=>at(e,[{label:'Check for new apps',icon:'refresh',shortcut:'⌘R',run:onReload}])}/></header>
  <div className="st-scroll">
   {error&&!data?<div className="dk-empty st-empty"><p>The store could not be read.</p><button type="button" onClick={onReload}>Try again</button></div>
   :!data?<p className="st-empty" role="status">Reading the store…</p>
   :item?<AppPage item={item} data={data} onAct={act} onRemove={()=>void remove(item)} onPlace={onPlace}/>
   :place.kind==='home'?<Home data={data} onOpen={open} onAct={act} onMenu={ctx} onPlace={onPlace}/>
   :place.kind==='updates'&&!items.length?<div className="st-empty st-calm"><UiIcon name="refresh" size={20}/><strong>Everything is up to date.</strong><p>Apps that have a newer version show here.</p></div>
   :place.kind==='search'&&!query.trim()?<p className="st-empty">Type in the search field to find apps from Girru, Claude Code and Codex.</p>
   :!items.length?<p className="st-empty">{place.kind==='search'?'Nothing in the store matches.':'Nothing here yet.'}</p>
   :<section className="st-list" aria-label={title}>{items.map((x,i)=><Row key={x.id} item={x} rank={place.kind==='category'?i+1:undefined} onOpen={open} onAct={act} label={actionLabel(x)} onMenu={ctx(x)}/>)}{place.kind==='search'&&<p className="st-help">Results from Girru, Claude Code and Codex together; the chip says where each comes from.</p>}</section>}
   {data&&data.limited.includes('registry')&&!item&&<p className="st-help">Girru’s registry could not be read; the rest of the store is shown.</p>}
  </div>
  {adding&&<Sheet title={`Add ${itemName(adding)}?`} onClose={()=>setAdding(null)} actions={<><button type="button" onClick={()=>setAdding(null)}>Cancel</button><button type="button" className="primary" disabled={busy} onClick={()=>void add(adding)}>Add</button></>}>
   <div className="st-sheet-head"><StoreIcon item={adding} size={36}/><span>{adding.maker?`by ${adding.maker}`:sourceChip(adding)}</span></div>
   {adding.permissions.length?<><p>It will be able to:</p><ul className="st-asks">{adding.permissions.map(p=><li key={p}><UiIcon name="shield" size={13}/>{p}</li>)}</ul></>:<p>It does not ask for anything.</p>}
   {problem&&<p className="st-problem" role="alert">{problem}</p>}
  </Sheet>}
  <ContextMenu menu={menu} onClose={close}/>
  <Notice toast={toast} onUndo={()=>{const u=undoRef.current;setToast(null);u?.();}} onDone={id=>setToast(t=>t?.id===id?null:t)}/>
 </div>;
}

function Card({item,onOpen,onMenu}:{item:StoreItem;onOpen:(x:StoreItem)=>void;onMenu:(e:ReactMouseEvent)=>void}){
 return <button type="button" className="st-card" onClick={()=>onOpen(item)} onContextMenu={onMenu} title={itemName(item)}><StoreIcon item={item}/><span className="st-card-text"><strong>{itemName(item)}</strong><small>{item.summary||sourceChip(item)}</small><Price item={item}/></span></button>;
}
function Row({item,rank,onOpen,onAct,label,onMenu}:{item:StoreItem;rank?:number;onOpen:(x:StoreItem)=>void;onAct:(x:StoreItem)=>void;label:string|null;onMenu:(e:ReactMouseEvent)=>void}){
 return <div className="st-row" onContextMenu={onMenu}>{rank!==undefined&&<span className="st-rank">{rank}</span>}<button type="button" className="st-row-main" onClick={()=>onOpen(item)}><StoreIcon item={item} size={36}/><span><strong>{itemName(item)}</strong><small>{item.summary||item.maker}</small></span></button><span className="st-chip" data-tone={item.source}>{sourceChip(item)}</span>{label?<button type="button" className="st-get" onClick={()=>onAct(item)}>{label}</button>:item.state==='elsewhere'?(item.present&&<span className="st-chip" data-tone="ok">On this computer</span>):<Price item={item}/>}</div>;
}

const COLLECTION_PLACE:Record<string,StorePlace>={'made-by-girru':{kind:'from',source:'girru'},registry:{kind:'from',source:'girru'},'claude-code':{kind:'from',source:'claude-code'},codex:{kind:'from',source:'codex'}};
function Home({data,onOpen,onAct,onMenu,onPlace}:{data:StoreData;onOpen:(x:StoreItem)=>void;onAct:(x:StoreItem)=>void;onMenu:(x:StoreItem)=>(e:ReactMouseEvent)=>void;onPlace:(p:StorePlace)=>void}){
 const featured=data.items.find(x=>x.id===data.featured),find=(id:string)=>data.items.find(x=>x.id===id)!;
 return <>
  {featured&&<section className="st-hero" style={{'--tint':TINT[featured.category]??TINT.more} as never} aria-label="Featured app">
   <div className="st-hero-text"><p className="st-eyebrow">Featured · {sourceChip(featured)}</p><div className="st-hero-name"><StoreIcon item={featured} size={52}/><h3>{itemName(featured)}</h3></div><p>{featured.description||featured.summary}</p>
    <div className="st-hero-actions">{(featured.state==='included'||featured.state==='available')&&<button type="button" className="primary" onClick={()=>onAct(featured)}>{featured.state==='included'?'Open':'Get'}</button>}<Price item={featured}/><button type="button" className="link-button" onClick={()=>onOpen(featured)}>Details</button></div></div>
   <div className="st-hero-art" aria-hidden="true">{Array.from({length:7},(_,i)=><span key={i}><i/><i/>{i%3===0&&<i/>}</span>)}</div>
  </section>}
  {data.collections.map(c=><section key={c.id} className="st-shelf" aria-label={c.title}><header><h3>{c.title}</h3>{COLLECTION_PLACE[c.id]&&<button type="button" className="link-button" onClick={()=>onPlace(COLLECTION_PLACE[c.id])}>See all</button>}</header>
   <div className="st-cards">{c.items.map(find).map(x=><Card key={x.id} item={x} onOpen={onOpen} onMenu={onMenu(x)}/>)}</div></section>)}
  {data.categories.length>0&&<section className="st-shelf" aria-label="Browse by category"><header><h3>Browse by category</h3></header>
   <div className="st-cats">{data.categories.map(c=><button type="button" key={c.id} className="st-cat" style={{'--tint':TINT[c.id]??TINT.more} as never} onClick={()=>onPlace({kind:'category',id:c.id})}><UiIcon name={(ICONS.has(c.icon)?c.icon:'puzzle') as UiIconName} size={15}/>{c.title}</button>)}</div></section>}
 </>;
}

function AppPage({item,data,onAct,onRemove,onPlace}:{item:StoreItem;data:StoreData;onAct:(x:StoreItem)=>void;onRemove:()=>void;onPlace:(p:StorePlace)=>void}){
 const category=data.categories.find(c=>c.id===item.category);
 const facts:[string,string][]=[['Maker',item.maker||'Not given'],['From',sourceChip(item)],...(item.version?[['Version',item.version] as [string,string]]:[]),...(item.update?[['Newer version',item.update] as [string,string]]:[]),...(item.updated?[['Updated',item.updated] as [string,string]]:[]),...(item.languages.length?[['Languages',item.languages.join(', ')] as [string,string]]:[]),['Price','Free']];
 const label=item.state==='included'?'Open':item.state==='available'?'Get':null;
 return <article className="st-app" aria-label={itemName(item)}>
  <header className="st-app-head"><StoreIcon item={item} size={88}/><div><h3>{itemName(item)}</h3>
   <p className="st-maker">{item.verified&&<UiIcon name="shield" size={13}/>}{item.maker||sourceChip(item)}</p>
   <p className="st-meta">{category&&<button type="button" className="link-button" onClick={()=>onPlace({kind:'category',id:category.id})}>{category.title}</button>}<span>Free</span></p></div>
   <div className="st-app-actions">{label?<button type="button" className="primary" onClick={()=>onAct(item)}>{label}</button>:item.state==='installed'?<><span className="st-chip" data-tone="ok"><UiIcon name="check" size={11}/>Installed</span><button type="button" onClick={onRemove}>Remove</button></>:<span className="st-chip" data-tone={item.source}>{item.present?'On this computer':sourceChip(item)}</span>}</div></header>
  <div className="st-app-body"><div>
   <section><h4>What it does</h4><p>{item.description||item.summary||'No description given.'}</p>{item.state==='elsewhere'&&<p className="st-help">Add it in {item.source==='codex'?'Codex':'Claude Code'} itself. Girru does not copy its keys.</p>}</section>
   <section><h4>What it asks for</h4>{item.permissions.length?<ul className="st-asks">{item.permissions.map(p=><li key={p}><UiIcon name="shield" size={13}/>{p}</li>)}</ul>:<p className="st-help">Nothing listed.</p>}</section>
  </div><aside>
   <section><h4>Information</h4><dl className="st-facts">{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>
   {item.worksWith.length>0&&<section><h4>Works well with</h4><p>{item.worksWith.join(', ')}</p></section>}
  </aside></div>
 </article>;
}
