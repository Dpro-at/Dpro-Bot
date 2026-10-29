import {WorkspaceApplications} from './WorkspaceApplications';
export {builtinApps} from './WorkspaceApplications';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import type {SessionClient} from './session';
import {UiIcon} from './ui-icons';
import {AppsAddons} from './AppsAddons';
import type {MenuItem} from './desktop-ui';
import {footerFor} from './footer-prefs';
import type {FooterPrefs,FooterSection} from './footer-prefs';
/** Places other pages can open: My apps, and the add-ons in my coding apps (shown under My apps). The Store is its own section. */
export type AppsPlace='mine'|'addons';
/** Apps that also have a footer section (SH3b: "can be pinned from Apps"). */
const FOOTER_TOOLS:ReadonlyArray<string>=['genvr','terminal','code'];
/** The checked "Show in the footer" item for an app tile; it uses the same footer choice as Settings › Footer. */
export function footerToolItem(prefs:FooterPrefs,id:string,toggle:(id:FooterSection)=>void):MenuItem|null{if(!FOOTER_TOOLS.includes(id))return null;const shown=!prefs.hidden.includes(id as FooterSection);return {label:'Show in the footer',icon:'pin',checked:shown,run:()=>toggle(id as FooterSection)};}

/**
 * Apps: My apps (the installed apps as tiles: Terminal, Trading, GenVR, Code
 * and any app installed) and, below them, the add-ons in my coding apps.
 * The Store is its own footer section (SA1 v2); the toolbar opens it. MCP
 * connections, Channels and Accounts are places in Settings.
 */
export function AppsWorkspace({client,active,sidebarSlot,onOpen,onConnections,onSettings,onPermissions,onCode,onSkills,onStore,placeRequest}:{client:SessionClient;active:boolean;sidebarSlot?:HTMLElement|null;onOpen:(id:'terminal'|'genvr'|'trading')=>void;onConnections:(id?:string)=>void;onSettings?:(place:'accounts')=>void;onChat?:()=>void;onPermissions:()=>void;onCode?:()=>void;onSkills?:()=>void;onStore?:()=>void;placeRequest?:{place:AppsPlace;n:number}}){
 const searchInput=useRef<HTMLInputElement>(null),footer=footerFor(client),{prefs:footerPrefs}=useSyncExternalStore(footer.subscribe,footer.getSnapshot,footer.getSnapshot);
 const owner=client.getSnapshot().user?.role==='owner';
 const [query,setQuery]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{if(placeRequest?.place==='addons')document.querySelector('.apps-mine-addons')?.scrollIntoView?.();},[placeRequest?.n]);
 const nav=<nav className="dk-sidebar apps-places" aria-label="Apps places">
  <div className="dk-side-top"><label className="dk-search"><UiIcon name="search" size={13}/><input ref={searchInput} type="search" aria-label="Search apps" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search  ⌘F"/></label></div>
  <button type="button" className="nav-item dk-place" aria-current="page"><UiIcon name="layers" size={15}/><span className="dk-place-name">My apps</span></button>
 </nav>;
 return <section className="apps-workspace" data-inline-sidebar={!sidebarSlot||undefined} aria-label="Apps" onKeyDown={e=>{if(e.defaultPrevented||e.currentTarget.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();searchInput.current?.focus();}}}>{active&&sidebarSlot?createPortal(nav,sidebarSlot):!sidebarSlot?nav:null}
 <div className="apps-main">
  <header className="apps-toolbar"><h2>My apps</h2>
   {owner&&<>{onStore&&<button className="tool" title="Find more in the Store" aria-label="Find more in the Store" onClick={onStore}><UiIcon name="store" size={15}/></button>}<button className="tool" title="Look again" aria-label="Refresh applications" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></>}
  </header>
  <div className="apps-mine">
   <WorkspaceApplications client={client} active={active} query={query} refresh={refresh} onOpen={onOpen} onCode={onCode} onPermissions={onPermissions} onAccountConnections={()=>onSettings?.('accounts')} footerItem={id=>footerToolItem(footerPrefs,id,x=>footer.toggle(x))}/>
   {owner&&<section className="apps-mine-addons" aria-label="Add-ons in my coding apps"><h3>Add-ons in my coding apps</h3><AppsAddons client={client} refresh={refresh} query={query} onConnections={onConnections} onSkills={onSkills}/></section>}
  </div>
 </div>
 </section>;
}
