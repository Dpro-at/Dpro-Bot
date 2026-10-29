import {WorkspaceApplications} from './WorkspaceApplications';
export {builtinApps} from './WorkspaceApplications';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import type {SessionClient} from './session';
import {UiIcon} from './ui-icons';
import type {UiIconName} from './ui-icons';
import {AppsAddons} from './AppsAddons';
import {Store,useStore,SOURCE_TITLES} from './StoreView';
import type {StorePlace,IncludedApp} from './StoreView';
import type {StoreSource} from './apps-contract.js';
import type {MenuItem} from './desktop-ui';
import {footerFor} from './footer-prefs';
import type {FooterPrefs,FooterSection} from './footer-prefs';
/** Places other pages can open: My apps, the Store (home), the add-ons in my coding apps (under My apps), Updates. */
export type AppsPlace='mine'|'catalogue'|'addons'|'updates';
type Place={kind:'mine'}|StorePlace;
/** Apps that also have a footer section (SH3b: "can be pinned from Apps"). */
const FOOTER_TOOLS:ReadonlyArray<string>=['genvr','terminal','code'];
/** The checked "Show in the footer" item for an app tile; it uses the same footer choice as Settings › Footer. */
export function footerToolItem(prefs:FooterPrefs,id:string,toggle:(id:FooterSection)=>void):MenuItem|null{if(!FOOTER_TOOLS.includes(id))return null;const shown=!prefs.hidden.includes(id as FooterSection);return {label:'Show in the footer',icon:'pin',checked:shown,run:()=>toggle(id as FooterSection)};}
const FROM:ReadonlyArray<[StoreSource,UiIconName]>=[['girru','check'],['claude-code','puzzle'],['codex','puzzle']];

/**
 * Apps: the Store and My apps in one sidebar (SA1). Store places: Home,
 * Search, Categories, From (Girru · Claude Code · Codex) and, under Mine,
 * My apps (with the add-ons in my coding apps) and Updates. Opening an item
 * shows its page (SA2); Get opens a short sheet (SA3). MCP connections,
 * Channels and Accounts are places in Settings.
 */
export function AppsWorkspace({client,active,sidebarSlot,onOpen,onConnections,onSettings,onPermissions,onCode,onSkills,placeRequest}:{client:SessionClient;active:boolean;sidebarSlot?:HTMLElement|null;onOpen:(id:'terminal'|'genvr'|'trading')=>void;onConnections:(id?:string)=>void;onSettings?:(place:'accounts')=>void;onChat?:()=>void;onPermissions:()=>void;onCode?:()=>void;onSkills?:()=>void;placeRequest?:{place:AppsPlace;n:number}}){
 const searchInput=useRef<HTMLInputElement>(null),footer=footerFor(client),{prefs:footerPrefs}=useSyncExternalStore(footer.subscribe,footer.getSnapshot,footer.getSnapshot);
 const owner=client.getSnapshot().user?.role==='owner';
 const [place,setPlace]=useState<Place>({kind:'mine'}),[query,setQuery]=useState(''),[refresh,setRefresh]=useState(0);
 const store=useStore(client,active&&owner,refresh);
 useEffect(()=>{if(!placeRequest||(!owner&&placeRequest.place!=='mine'))return;const p=placeRequest.place;change(p==='catalogue'?{kind:'home'}:p==='updates'?{kind:'updates'}:{kind:'mine'});},[placeRequest?.n]);
 // The field filters My apps there and searches the store elsewhere: moving between the two starts empty.
 function change(next:Place){if(next.kind!=='search'||place.kind==='mine')setQuery('');setPlace(next);}
 const mine=place.kind==='mine',same=(p:Place)=>JSON.stringify(p)===JSON.stringify(place);
 const updates=store.data?.items.filter(x=>x.update).length??0;
 const row=(p:Place,label:string,icon:UiIconName,badge=0)=><button type="button" className="nav-item dk-place" key={JSON.stringify(p)} aria-current={same(p)?'page':undefined} onClick={()=>change(p)}><UiIcon name={icon} size={15}/><span className="dk-place-name">{label}</span>{badge?<span className="dk-badge-pill" aria-label={`${badge} waiting`}>{badge}</span>:null}</button>;
 const label=(text:string)=><p className="section-label dk-label">{text}</p>;
 const nav=<nav className="dk-sidebar apps-places" aria-label="Apps places">
  <div className="dk-side-top"><label className="dk-search"><UiIcon name="search" size={13}/><input ref={searchInput} type="search" aria-label={owner&&!mine?'Search the store':'Search apps'} value={query} onChange={e=>{setQuery(e.target.value);if(owner&&!mine&&place.kind!=='search')setPlace({kind:'search'});}} placeholder={owner&&!mine?'Search the store  ⌘F':'Search  ⌘F'}/></label></div>
  {owner&&<>{row({kind:'home'},'Home','home')}{row({kind:'search'},'Search','search')}
   {!!store.data?.categories.length&&<div className="dk-group">{label('Categories')}{store.data.categories.map(c=>row({kind:'category',id:c.id},c.title,c.icon as UiIconName))}</div>}
   <div className="dk-group">{label('From')}{FROM.map(([source,icon])=>row({kind:'from',source},SOURCE_TITLES[source],icon))}</div>
   {label('Mine')}</>}
  {row({kind:'mine'},'My apps','layers')}
  {owner&&row({kind:'updates'},'Updates','refresh',updates)}
 </nav>;
 const openApp=(id:IncludedApp)=>{if(id==='code')onCode?.();else onOpen(id);};
 return <section className="apps-workspace" data-inline-sidebar={!sidebarSlot||undefined} aria-label="Apps" onKeyDown={e=>{if(e.defaultPrevented||e.currentTarget.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();searchInput.current?.focus();}}}>{active&&sidebarSlot?createPortal(nav,sidebarSlot):!sidebarSlot?nav:null}
 {mine||!owner?<div className="apps-main">
  <header className="apps-toolbar"><h2>My apps</h2>
   {owner&&<><button className="tool" title="Find more in the Store" aria-label="Find more in the Store" onClick={()=>change({kind:'home'})}><UiIcon name="store" size={15}/></button><button className="tool" title="Look again" aria-label="Refresh applications" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></>}
  </header>
  <div className="apps-mine">
   <WorkspaceApplications client={client} active={active} query={query} refresh={refresh} onOpen={onOpen} onCode={onCode} onPermissions={onPermissions} onAccountConnections={()=>onSettings?.('accounts')} footerItem={id=>footerToolItem(footerPrefs,id,x=>footer.toggle(x))}/>
   {owner&&<section className="apps-mine-addons" aria-label="Add-ons in my coding apps"><h3>Add-ons in my coding apps</h3><AppsAddons client={client} refresh={refresh} query={query} onConnections={onConnections} onSkills={onSkills}/></section>}
  </div>
 </div>
 :<Store client={client} data={store.data} error={store.error} onReload={store.reload} place={place} query={query} onPlace={change} onOpenApp={openApp}/>}
 </section>;
}
