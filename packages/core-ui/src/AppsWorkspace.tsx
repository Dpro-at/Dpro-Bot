import {WorkspaceApplications,builtinApps,CODE_ELSEWHERE} from './WorkspaceApplications';
export {builtinApps} from './WorkspaceApplications';
import {SourceCatalogue} from './SourceCatalogue';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import type {SessionClient} from './session';
import {UiIcon} from './ui-icons';
import type {UiIconName} from './ui-icons';
import {AppsAddons} from './AppsAddons';
import {APPS_CATALOGUE_PATH} from './apps-contract.js';
import {Tile} from './desktop-ui';
import type {MenuItem} from './desktop-ui';
import {footerFor} from './footer-prefs';
import type {FooterPrefs,FooterSection} from './footer-prefs';
/** My apps, and the Store with its two views (the catalogue, and the add-ons in my coding apps). */
export type AppsPlace='mine'|'catalogue'|'addons';
type CatalogueItem={id:string;name:string;description:string;author:string;version:string;type:string;permissions:string[];installed:boolean;verified:boolean};
const TITLES:Record<AppsPlace,string>={mine:'My apps',catalogue:'Store',addons:'Store · Add-ons in my coding apps'};
const SOURCES=[['claude-code','Claude Code'],['codex','Codex'],['dpro','Dpro']] as const;
/** Apps that also have a footer section (SH3b: "can be pinned from Apps"). */
const FOOTER_TOOLS:ReadonlyArray<string>=['genvr','terminal','code'];
/** The checked "Show in the footer" item for an app tile; it uses the same footer choice as Settings › Footer. */
export function footerToolItem(prefs:FooterPrefs,id:string,toggle:(id:FooterSection)=>void):MenuItem|null{if(!FOOTER_TOOLS.includes(id))return null;const shown=!prefs.hidden.includes(id as FooterSection);return {label:'Show in the footer',icon:'pin',checked:shown,run:()=>toggle(id as FooterSection)};}

/**
 * Apps: apps only. The sidebar has two places: My apps (the installed apps as
 * tiles: Terminal, Trading, GenVR, Code and any app installed) and Store (the
 * catalogue and the add-ons in my coding apps, read only). MCP connections,
 * Channels and Accounts are places in Settings.
 */
export function AppsWorkspace({client,active,sidebarSlot,onOpen,onConnections,onSettings,onPermissions,onCode,onSkills,placeRequest}:{client:SessionClient;active:boolean;sidebarSlot?:HTMLElement|null;onOpen:(id:'terminal'|'genvr'|'trading')=>void;onConnections:(id?:string)=>void;onSettings?:(place:'accounts')=>void;onChat?:()=>void;onPermissions:()=>void;onCode?:()=>void;onSkills?:()=>void;placeRequest?:{place:AppsPlace;n:number}}){
 const searchInput=useRef<HTMLInputElement>(null),footer=footerFor(client),{prefs:footerPrefs}=useSyncExternalStore(footer.subscribe,footer.getSnapshot,footer.getSnapshot);
 const owner=client.getSnapshot().user?.role==='owner';
 const [catalogueSource,setCatalogueSource]=useState<'dpro'|'claude-code'|'codex'>('claude-code'),[place,setPlace]=useState<AppsPlace>('mine'),[query,setQuery]=useState(''),[selected,setSelected]=useState(''),[items,setItems]=useState<CatalogueItem[]|null>(null),[total,setTotal]=useState(0),[error,setError]=useState(false),[refresh,setRefresh]=useState(0);
 useEffect(()=>{if(placeRequest&&(owner||placeRequest.place==='mine'))change(placeRequest.place);},[placeRequest?.n]);
 useEffect(()=>{if(!active||place!=='catalogue'||catalogueSource!=='dpro'||!owner)return;let stopped=false;setError(false);setItems(null);void client.request({method:'GET',path:APPS_CATALOGUE_PATH} as never).then(r=>{if(stopped)return;if(r.status!==200){setError(true);return;}const b=r.body as {items:CatalogueItem[];total:number};setItems(b.items);setTotal(b.total);}).catch(()=>{if(!stopped)setError(true);});return()=>{stopped=true;};},[active,place,catalogueSource,owner,client,refresh]);
 function change(next:AppsPlace){setPlace(next);setQuery('');setSelected('');}
 const searchable=place==='mine'||place==='addons'||place==='catalogue';
 // Store has two views, nested under it while it is open (like Memory in Settings).
 const store=place==='catalogue'||place==='addons';
 const row=(id:AppsPlace,label:string,icon:UiIconName,nested=false)=><button type="button" className="nav-item dk-place" key={id} data-nested={nested||undefined} aria-current={place===id?'page':undefined} onClick={()=>change(id)}><UiIcon name={icon} size={nested?13:15}/><span className="dk-place-name">{label}</span></button>;
 const nav=<nav className="dk-sidebar apps-places" aria-label="Apps places">
  <div className="dk-side-top"><label className="dk-search"><UiIcon name="search" size={13}/><input ref={searchInput} type="search" aria-label="Search apps" disabled={!searchable} value={query} onChange={e=>setQuery(e.target.value)} placeholder={searchable?'Search  ⌘F':'Search'}/></label></div>
  {row('mine','My apps','layers')}
  {owner&&<div className="dk-group"><button type="button" className="nav-item dk-place" aria-expanded={store} onClick={()=>change('catalogue')}><UiIcon name="store" size={15}/><span className="dk-place-name">Store</span></button>
   {store&&<>{row('catalogue','Catalogue','store',true)}{row('addons','Add-ons in my coding apps','puzzle',true)}</>}</div>}
 </nav>;
 const catalogue=(items??[]).filter(x=>`${x.name} ${x.author} ${x.type}`.toLowerCase().includes(query.toLowerCase()));
 // Dpro's source lists the apps that come with Dpro first (Terminal, Trading, GenVR, Code), then its registry.
 const included=builtinApps.filter(x=>`${x.name} ${x.summary}`.toLowerCase().includes(query.toLowerCase()));
 const keys=[...included.map(x=>'included:'+x.id),...catalogue.map(x=>'listing:'+x.id)];
 const item=catalogue.find(x=>'listing:'+x.id===selected),own=included.find(x=>'included:'+x.id===selected);
 const openIncluded=(id:typeof builtinApps[number]['id'])=>{if(id==='code')onCode?.();else onOpen(id);};
 return <section className="apps-workspace" data-inline-sidebar={!sidebarSlot||undefined} aria-label="Apps" onKeyDown={e=>{if(e.defaultPrevented||e.currentTarget.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'&&searchable){e.preventDefault();searchInput.current?.focus();}}}>{active&&sidebarSlot?createPortal(nav,sidebarSlot):!sidebarSlot?nav:null}
 <div className="apps-main">
 <header className="apps-toolbar"><h2>{TITLES[place]}</h2>
  {place==='mine'&&owner&&<><button className="tool" title="Find more in the Store" aria-label="Find more in the Store" onClick={()=>change('catalogue')}><UiIcon name="store" size={15}/></button><button className="tool" title="Look again" aria-label="Refresh applications" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></>}
  {place==='addons'&&<><span className="apps-toolbar-note">read from this computer · nothing is run</span><button className="tool" title="Read again" aria-label="Read again" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></>}
  {place==='catalogue'&&<><div className="st-seg" role="radiogroup" aria-label="Catalogue source">{SOURCES.map(([value,label])=><label key={value} data-on={catalogueSource===value||undefined}><input type="radio" name="apps-catalogue-source" checked={catalogueSource===value} onChange={()=>{setCatalogueSource(value);setSelected('');}}/>{label}</label>)}</div><button className="tool" title="Read again" aria-label="Refresh available catalogue" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></>}
 </header>
 {place==='mine'?<WorkspaceApplications client={client} active={active} query={query} refresh={refresh} onOpen={onOpen} onCode={onCode} onPermissions={onPermissions} onAccountConnections={()=>onSettings?.('accounts')} footerItem={id=>footerToolItem(footerPrefs,id,x=>footer.toggle(x))}/>
 :place==='addons'&&owner?<AppsAddons client={client} refresh={refresh} query={query} onConnections={onConnections} onSkills={onSkills}/>
 :place==='catalogue'&&catalogueSource!=='dpro'&&owner?<SourceCatalogue client={client} source={catalogueSource} query={query} refresh={refresh}/>
 :place==='catalogue'&&owner?<div className="apps-panes" data-selected={!!item||!!own}><div className="apps-list"><div role="listbox" aria-label="Available extensions" onKeyDown={e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const at=keys.indexOf(selected),index=e.key==='Home'?0:e.key==='End'?keys.length-1:Math.max(0,Math.min(keys.length-1,at+(e.key==='ArrowDown'?1:-1)));if(keys[index]){setSelected(keys[index]);e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=option]')[index]?.focus();}}}>
 {included.length>0&&<div role="group" aria-label="Comes with Dpro"><p className="apps-group-name" aria-hidden="true">Comes with Dpro</p>{included.map(x=><button className="apps-row" role="option" key={x.id} aria-selected={selected==='included:'+x.id} onClick={()=>setSelected('included:'+x.id)} onDoubleClick={()=>openIncluded(x.id)}><span className="apps-icon" aria-hidden="true"><UiIcon name={x.icon} size={16}/></span><span><strong>{x.name}</strong><small>Dpro</small></span><small>In My apps</small></button>)}</div>}
 {catalogue.length>0&&<div role="group" aria-label="Dpro’s registry"><p className="apps-group-name" aria-hidden="true">Dpro’s registry</p>{catalogue.map(x=><button className="apps-row" role="option" key={x.id} aria-selected={selected==='listing:'+x.id} onClick={()=>setSelected('listing:'+x.id)}><Tile name={x.name||'?'} size={32}/><span><strong>{x.name||'Unnamed extension'}</strong><small>{x.author||'Publisher not given'}</small></span><small>{x.installed?'On this computer':''}</small></button>)}</div>}
 </div>{error?<div className="apps-empty"><p>The catalogue could not be read.</p><button onClick={()=>setRefresh(n=>n+1)}>Try again</button></div>:items===null?<p className="apps-empty" role="status">Reading catalogue…</p>:!catalogue.length?<p className="apps-empty">{query?'No listing matches.':'Nothing is listed in Dpro’s own registry yet.'}</p>:total>100?<p className="apps-help">Showing the first 100 listings.</p>:null}<p className="apps-help">Listings saved in this Dpro. A listing is not a security review and Dpro installs nothing from here.</p></div>
 <aside className="apps-inspector" aria-label="Selected application"><button className="apps-back" onClick={()=>setSelected('')}><UiIcon name="arrow-left" size={15}/>Back to the list</button>{own?<><h3>{own.name}</h3><p className="apps-inspector-line">by Dpro · comes with Dpro</p><p>{own.summary}</p><button className="primary" disabled={own.id==='code'&&!onCode} title={own.id==='code'&&!onCode?CODE_ELSEWHERE:undefined} onClick={()=>openIncluded(own.id)}><UiIcon name={own.icon} size={15}/>Open {own.name}</button>{own.id==='code'&&!onCode&&<p className="fine-print">{CODE_ELSEWHERE}.</p>}<p className="apps-limit">Already in My apps. Nothing to install.</p></>:item?<><h3>{item.name}</h3><p className="apps-inspector-line">by {item.author||'a publisher not given'} · {item.version||'no version given'}</p><p>{item.description||'No description given.'}</p><dl className="apps-facts"><dt>Asks for</dt><dd>{item.permissions.length?item.permissions.join(', '):'Nothing listed'}</dd><dt>Checked</dt><dd>{item.verified?'Marked verified by the catalogue (not a security review)':'Not marked verified'}</dd></dl><p className="apps-limit">Installing from this registry is not connected yet. A listing does not give access or run code.</p></>:<p className="apps-empty">Choose a listing to see its details.</p>}</aside></div>
 :null}
 </div></section>;
}
