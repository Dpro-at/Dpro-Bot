import {WorkspaceApplications} from './WorkspaceApplications';
export {builtinApps} from './WorkspaceApplications';
import {SourceCatalogue} from './SourceCatalogue';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import type {SessionClient} from './session';
import {UiIcon} from './ui-icons';
import type {UiIconName} from './ui-icons';
import {AppsAddons} from './AppsAddons';
import {AgentConnectSettings} from './AgentConnectSettings';
import {ConnectionsSettings} from './ConnectionsSettings';
import {APPS_CATALOGUE_PATH} from './apps-contract.js';
import {ContextMenu,Tile,useMenu} from './desktop-ui';
import type {MenuItem} from './desktop-ui';
import {footerFor} from './footer-prefs';
import type {FooterPrefs,FooterSection} from './footer-prefs';
export type AppsPlace='mine'|'channels'|'accounts'|'addons'|'catalogue';
type CatalogueItem={id:string;name:string;description:string;author:string;version:string;type:string;permissions:string[];installed:boolean;verified:boolean};
type Row={kind:'place';id:AppsPlace;label:string;icon:UiIconName}|{kind:'jump';id:string;label:string;icon:UiIconName;run:()=>void}|{kind:'title';label:string};
const TITLES:Record<AppsPlace,string>={mine:'My apps',channels:'Channels',accounts:'Accounts',addons:'Add-ons in my coding apps',catalogue:'Catalogue'};
const SOURCES=[['claude-code','Claude Code'],['codex','Codex'],['dpro','Dpro']] as const;
/** Tools rows that also have a footer section (SH3b: "can be pinned from Apps"). */
const FOOTER_TOOLS:ReadonlyArray<string>=['genvr','terminal','code'];
/** The checked "Show in the footer" item for a Tools row; it uses the same footer choice as Settings › Footer. */
export function footerToolItem(prefs:FooterPrefs,id:string,toggle:(id:FooterSection)=>void):MenuItem|null{if(!FOOTER_TOOLS.includes(id))return null;const shown=!prefs.hidden.includes(id as FooterSection);return {label:'Show in the footer',icon:'pin',checked:shown,run:()=>toggle(id as FooterSection)};}

/**
 * Apps (boards AA1–AA5): everything outside Dpro that agents use or you open.
 * The sidebar holds My apps, Connections (MCP connections open their own
 * section; Channels and Accounts moved here from Settings), Tools that open
 * their pages, and the read-only add-on lists.
 */
export function AppsWorkspace({client,active,sidebarSlot,onOpen,onConnections,onPermissions,onCode,onSkills,placeRequest}:{client:SessionClient;active:boolean;sidebarSlot?:HTMLElement|null;onOpen:(id:'terminal'|'genvr'|'trading')=>void;onConnections:()=>void;onChat?:()=>void;onPermissions:()=>void;onCode?:()=>void;onSkills?:()=>void;placeRequest?:{place:AppsPlace;n:number}}){
 const searchInput=useRef<HTMLInputElement>(null),{menu,at,close}=useMenu(),footer=footerFor(client),{prefs:footerPrefs}=useSyncExternalStore(footer.subscribe,footer.getSnapshot,footer.getSnapshot);
 const owner=client.getSnapshot().user?.role==='owner';
 const [catalogueSource,setCatalogueSource]=useState<'dpro'|'claude-code'|'codex'>('claude-code'),[place,setPlace]=useState<AppsPlace>('mine'),[query,setQuery]=useState(''),[selected,setSelected]=useState(''),[items,setItems]=useState<CatalogueItem[]|null>(null),[total,setTotal]=useState(0),[error,setError]=useState(false),[refresh,setRefresh]=useState(0),[addRequest,setAddRequest]=useState(0);
 useEffect(()=>{if(placeRequest&&(owner||placeRequest.place==='mine'))change(placeRequest.place);},[placeRequest?.n]);
 useEffect(()=>{if(!active||place!=='catalogue'||catalogueSource!=='dpro'||!owner)return;let stopped=false;setError(false);setItems(null);void client.request({method:'GET',path:APPS_CATALOGUE_PATH} as never).then(r=>{if(stopped)return;if(r.status!==200){setError(true);return;}const b=r.body as {items:CatalogueItem[];total:number};setItems(b.items);setTotal(b.total);}).catch(()=>{if(!stopped)setError(true);});return()=>{stopped=true;};},[active,place,catalogueSource,owner,client,refresh]);
 function change(next:AppsPlace){setPlace(next);setQuery('');setSelected('');}
 const rows:Row[]=owner?[{kind:'place',id:'mine',label:'My apps',icon:'layers'},{kind:'title',label:'Connections'},{kind:'jump',id:'mcp',label:'MCP connections',icon:'link',run:onConnections},{kind:'place',id:'channels',label:'Channels',icon:'message'},{kind:'place',id:'accounts',label:'Accounts',icon:'contact'},{kind:'title',label:'Tools'},{kind:'jump',id:'terminal',label:'Terminal',icon:'terminal',run:()=>onOpen('terminal')},{kind:'jump',id:'genvr',label:'GenVR',icon:'globe',run:()=>onOpen('genvr')},...(onCode?[{kind:'jump' as const,id:'code',label:'Code',icon:'code' as const,run:onCode}]:[]),{kind:'title',label:'Find more'},{kind:'place',id:'addons',label:'Add-ons in my coding apps',icon:'puzzle'},{kind:'place',id:'catalogue',label:'Catalogue',icon:'store'}]
  :[{kind:'place',id:'mine',label:'My apps',icon:'layers'},{kind:'title',label:'Tools'},{kind:'jump',id:'genvr',label:'GenVR',icon:'globe',run:()=>onOpen('genvr')}];
 const searchable=place==='mine'||place==='addons'||place==='catalogue';
 const toolMenu=(e:React.MouseEvent|React.KeyboardEvent,id:string,run:()=>void)=>{const item=footerToolItem(footerPrefs,id,x=>footer.toggle(x));if(item)at(e,[{label:'Open',icon:'open',run},'sep',item]);};
 const nav=<nav className="dk-sidebar apps-places" aria-label="Apps places">
  <div className="dk-side-top"><label className="dk-search"><UiIcon name="search" size={13}/><input ref={searchInput} type="search" aria-label="Search apps" disabled={!searchable} value={query} onChange={e=>setQuery(e.target.value)} placeholder={searchable?'Search  ⌘F':'Search'}/></label></div>
  {rows.map((r,i)=>r.kind==='title'?<p key={'t'+i} className="section-label dk-label">{r.label}</p>:<button type="button" className="nav-item dk-place" key={r.id} aria-current={r.kind==='place'&&place===r.id?'page':undefined} onClick={()=>r.kind==='place'?change(r.id):r.run()} onContextMenu={r.kind==='jump'&&FOOTER_TOOLS.includes(r.id)?e=>toolMenu(e,r.id,r.run):undefined} onKeyDown={r.kind==='jump'&&FOOTER_TOOLS.includes(r.id)?e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')toolMenu(e,r.id,r.run);}:undefined}><UiIcon name={r.icon} size={15}/><span className="dk-place-name">{r.label}</span></button>)}
 </nav>;
 const catalogue=(items??[]).filter(x=>`${x.name} ${x.author} ${x.type}`.toLowerCase().includes(query.toLowerCase()));
 const item=catalogue.find(x=>x.id===selected);
 return <section className="apps-workspace" data-inline-sidebar={!sidebarSlot||undefined} aria-label="Apps" onKeyDown={e=>{if(e.defaultPrevented||e.currentTarget.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'&&searchable){e.preventDefault();searchInput.current?.focus();}}}>{active&&sidebarSlot?createPortal(nav,sidebarSlot):!sidebarSlot?nav:null}
 <div className="apps-main">
 <header className="apps-toolbar"><h2>{TITLES[place]}</h2>
  {place==='mine'&&owner&&<><button className="tool" title="Add connection" aria-label="Add connection" onClick={()=>setAddRequest(n=>n+1)}><UiIcon name="plus" size={15}/></button><button className="tool" title="Look again" aria-label="Refresh applications" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></>}
  {place==='addons'&&<><span className="apps-toolbar-note">read from this computer · nothing is run</span><button className="tool" title="Read again" aria-label="Read again" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></>}
  {place==='catalogue'&&<><div className="st-seg" role="radiogroup" aria-label="Catalogue source">{SOURCES.map(([value,label])=><label key={value} data-on={catalogueSource===value||undefined}><input type="radio" name="apps-catalogue-source" checked={catalogueSource===value} onChange={()=>{setCatalogueSource(value);setSelected('');}}/>{label}</label>)}</div><button className="tool" title="Read again" aria-label="Refresh available catalogue" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></>}
 </header>
 {place==='mine'?<WorkspaceApplications client={client} active={active} query={query} refresh={refresh} addRequest={addRequest} onOpen={onOpen} onPermissions={onPermissions} onAccountConnections={()=>change('accounts')} onManageConnections={onConnections}/>
 :place==='channels'&&owner?<AgentConnectSettings client={client}/>
 :place==='accounts'&&owner?<ConnectionsSettings client={client} onOpenGenvr={()=>onOpen('genvr')}/>
 :place==='addons'&&owner?<AppsAddons client={client} refresh={refresh} query={query} onConnections={onConnections} onSkills={onSkills}/>
 :place==='catalogue'&&catalogueSource!=='dpro'&&owner?<SourceCatalogue client={client} source={catalogueSource} query={query} refresh={refresh}/>
 :place==='catalogue'&&owner?<div className="apps-panes" data-selected={!!item}><div className="apps-list"><div role="listbox" aria-label="Available extensions" onKeyDown={e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const ids=catalogue.map(x=>x.id);const at=ids.indexOf(selected as never),index=e.key==='Home'?0:e.key==='End'?ids.length-1:Math.max(0,Math.min(ids.length-1,at+(e.key==='ArrowDown'?1:-1)));if(ids[index]){setSelected(ids[index]);e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=option]')[index]?.focus();}}}>
 {catalogue.map(x=><button className="apps-row" role="option" key={x.id} aria-selected={selected===x.id} onClick={()=>setSelected(x.id)}><Tile name={x.name||'?'} size={32}/><span><strong>{x.name||'Unnamed extension'}</strong><small>{x.author||'Publisher not given'}</small></span><small>{x.installed?'On this computer':''}</small></button>)}
 </div>{error?<div className="apps-empty"><p>The catalogue could not be read.</p><button onClick={()=>setRefresh(n=>n+1)}>Try again</button></div>:items===null?<p className="apps-empty" role="status">Reading catalogue…</p>:!catalogue.length?<p className="apps-empty">{query?'No listing matches.':'Nothing is listed in Dpro’s own registry yet.'}</p>:total>100?<p className="apps-help">Showing the first 100 listings.</p>:null}<p className="apps-help">Listings saved in this Dpro. A listing is not a security review and Dpro installs nothing from here.</p></div>
 <aside className="apps-inspector" aria-label="Selected application"><button className="apps-back" onClick={()=>setSelected('')}><UiIcon name="arrow-left" size={15}/>Back to the list</button>{item?<><h3>{item.name}</h3><p className="apps-inspector-line">by {item.author||'a publisher not given'} · {item.version||'no version given'}</p><p>{item.description||'No description given.'}</p><dl className="apps-facts"><dt>Asks for</dt><dd>{item.permissions.length?item.permissions.join(', '):'Nothing listed'}</dd><dt>Checked</dt><dd>{item.verified?'Marked verified by the catalogue (not a security review)':'Not marked verified'}</dd></dl><p className="apps-limit">Installing from this registry is not connected yet. A listing does not give access or run code.</p></>:<p className="apps-empty">Choose a listing to see its details.</p>}</aside></div>
 :null}
 </div><ContextMenu menu={menu} onClose={close}/></section>;
}
