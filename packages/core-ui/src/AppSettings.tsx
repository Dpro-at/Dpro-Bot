import {FooterSettings} from './FooterSettings';
import {PrimaryReplySettings} from './PrimaryReplySettings';
import {WorkspacePackSettings} from './WorkspacePackSettings';
import {ScheduledTasks} from './ScheduledTasks';
import {PreferenceGroup,PreferenceRow} from './Preferences';
import {AccountSettings} from './SettingsAccount';
import {ReplyAppsSettings} from './ReplyAppsSettings';
import {SavedKeys} from './SavedKeys';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SessionClient } from './session';
import { useAppInfo } from './app-navigation';
import type { ThemePreference } from './app-navigation';
import { MemorySettings, MEMORY_PANES } from './MemorySettings';
import type { MemorySettingsPane } from './MemorySettings';
import { UiIcon } from './ui-icons';
import type { UiIconName } from './ui-icons';
export type SettingsTab='general'|'replies'|'account'|'keys'|'memory'|'schedules'|'move'|'about';
type Place={value:SettingsTab;label:string;icon:UiIconName;words:string};
// Search finds settings inside the pages, not only page names.
const PLACES:Record<SettingsTab,Place>={
 general:{value:'general',label:'General',icon:'sun',words:'theme appearance light dark system language english'},
 replies:{value:'replies',label:'Replies',icon:'cpu',words:'main agent model ollama local coding apps claude code codex gemini answer chat'},
 account:{value:'account',label:'Account',icon:'contact',words:'two-step sign-in authenticator code password sign out everywhere devices session email role'},
 keys:{value:'keys',label:'Saved keys',icon:'key',words:'secrets tokens passwords key store older chats'},
 memory:{value:'memory',label:'Memory',icon:'database',words:MEMORY_PANES.map(p=>p.label).join(' ')},
 schedules:{value:'schedules',label:'Schedules',icon:'clock',words:'scheduled tasks cron run now pause permission code recent runs'},
 move:{value:'move',label:'Move to another computer',icon:'archive',words:'export import share settings file agents personalities specialties skills bring in take'},
 about:{value:'about',label:'About and updates',icon:'info',words:'version updates connection installation'},
};
const NOTES:Partial<Record<SettingsTab,string>>={general:'Changes save by themselves.',replies:'Saves as you choose.',move:'Keys, accounts, chats and memories never go in the file.'};
/**
 * Settings keeps only settings of this program and your account (boards
 * ST1–ST14). In the signed-in window the places are the sidebar (the shell
 * gives a slot; Memory has its own sub-places); without a slot (signed out,
 * tests) the same places sit on the left of the page.
 */
export function AppSettings({ signedIn, preference, onTheme, onAccount, onAgents, client, aboutOnly = false, initialTab = 'general', initialMemoryPane = 'rules', sidebarSlot, active = true, onOpenMemory, onOpenChannels }: { signedIn: boolean; preference: ThemePreference; onTheme: (v: ThemePreference) => void; onAccount: () => void; onAgents?: () => void; client?: SessionClient; aboutOnly?: boolean; initialTab?: SettingsTab; initialMemoryPane?: MemorySettingsPane; sidebarSlot?: HTMLElement | null; active?: boolean; onOpenMemory?: () => void; onOpenChannels?: () => void }) {
  const [query,setQuery]=useState('');const search=useRef<HTMLInputElement>(null);
  const info=useAppInfo();const [tab,setTab]=useState<SettingsTab>(initialTab);
  const [pane,setPane]=useState<MemorySettingsPane>(initialMemoryPane);
  useEffect(()=>{setTab(initialTab);},[initialTab]);useEffect(()=>{setPane(initialMemoryPane);},[initialMemoryPane]);
  const user=signedIn?client?.getSnapshot().user:undefined,owner=user?.role==='owner';
  const groups:{name:string;keys:SettingsTab[]}[]=signedIn&&client?[{name:'This program',keys:owner?['general','replies']:['general']},{name:'You',keys:['account','keys']},...(owner?[{name:'Workspace',keys:['memory','schedules','move'] as SettingsTab[]}]:[]),{name:'',keys:['about']}]:[{name:'',keys:['general','about']}];
  const allowed=groups.flatMap(g=>g.keys);
  const active_=aboutOnly?'about':allowed.includes(tab)?tab:'general';
  const q=query.trim().toLowerCase(),found=(p:Place)=>!q||`${p.label} ${p.words}`.toLowerCase().includes(q);
  // ⌘F searches inside settings while this window is open.
  useEffect(()=>{if(!active||aboutOnly)return;const onKey=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='f'&&!document.querySelector('dialog[open]')){e.preventDefault();search.current?.focus();}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[active,aboutOnly]);
  const sidebar=<nav className="dk-sidebar settings-sidebar" aria-label="Settings sections">
    <div className="dk-side-top"><label className="dk-search"><UiIcon name="search" size={13}/><input ref={search} type="search" aria-label="Search settings" placeholder="Search settings" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('');}}/></label></div>
    {groups.map(group=>{const rows=group.keys.map(k=>PLACES[k]).filter(found);return rows.length?<div key={group.name||'end'} className="settings-nav-group">{group.name&&<p className="section-label dk-label">{group.name}</p>}{rows.map(t=><div key={t.value} className="dk-group"><button type="button" className="nav-item dk-place" aria-current={active_===t.value?'page':undefined} aria-expanded={t.value==='memory'?active_==='memory':undefined} onClick={()=>setTab(t.value)}><UiIcon name={t.icon} size={15}/><span className="dk-place-name">{t.label}</span></button>{t.value==='memory'&&active_==='memory'&&MEMORY_PANES.map(p=><button key={p.key} type="button" className="nav-item dk-place" data-nested aria-current={pane===p.key?'page':undefined} onClick={()=>setPane(p.key)}><span className="dk-place-name">{p.label}</span></button>)}</div>)}</div>:null;})}
    {q&&!groups.some(g=>g.keys.some(k=>found(PLACES[k])))&&<p className="settings-search-empty">No setting matches “{query.trim()}”.</p>}
    {!signedIn&&<div className="settings-signin-note"><p>Sign in to see your account, keys and workspace settings.</p><button type="button" onClick={onAccount}>Sign in</button></div>}
  </nav>;
  const label=active_==='memory'?`Memory · ${MEMORY_PANES.find(p=>p.key===pane)?.label??'Settings'}`:PLACES[active_].label;
  const page=<div id="settings-view-panel" aria-label={label} className="settings-content settings-st" data-pane={active_}><div className="preferences-page">
      {active_!=='schedules'&&active_!=='memory'&&<h2 className="settings-page-title">{label}</h2>}
      {active_==='general'&&<>
        <PreferenceGroup title="Appearance"><div className="preference-row settings-theme-row"><div className="preference-label"><strong>Theme</strong><small>The sun and moon in the title bar switch it too.</small></div>
          <div className="settings-themes" role="radiogroup" aria-label="Theme">{(['system','light','dark'] as const).map(v=><label key={v} className="settings-theme" data-theme-choice={v}><input type="radio" name="app-theme" value={v} checked={preference===v} onChange={()=>onTheme(v)} aria-label={v==='system'?'System':v==='light'?'Light':'Dark'}/><span className="settings-theme-picture" aria-hidden="true"/><span>{v==='system'?'System':v==='light'?'Light':'Dark'}</span></label>)}</div></div></PreferenceGroup>
        {signedIn&&client&&<FooterSettings client={client}/>}
        <PreferenceGroup title="Language"><PreferenceRow title="Program language" description="More languages come later."><span className="preference-status">English</span></PreferenceRow></PreferenceGroup>
      </>}
      {active_==='replies'&&owner&&client&&<><PrimaryReplySettings client={client} onAgents={onAgents}/><ReplyAppsSettings client={client}/></>}
      {active_==='account'&&signedIn&&client&&<AccountSettings client={client}/>}
      {active_==='keys'&&signedIn&&client&&<SavedKeys client={client} owner={owner} page/>}
      {active_==='memory'&&owner&&client&&<MemorySettings client={client} pane={pane} onOpenMemory={onOpenMemory}/>}
      {active_==='schedules'&&owner&&client&&<ScheduledTasks client={client} active={active} onOpenConnections={onOpenChannels}/>}
      {active_==='move'&&owner&&client&&<WorkspacePackSettings client={client}/>}
      {active_==='about'&&<>
        <div className="settings-about-head"><span className="settings-about-mark" aria-hidden="true">D</span><div><strong>Dpro</strong><small>Version {info?.version??'development preview'} · {info?(info.connection==='local'?'runs on this computer':'connected installation'):'local browser preview'}</small></div></div>
        <PreferenceGroup title="Updates"><PreferenceRow title="Updates" description="Automatic updates are not available in this build. Install a new version by hand."><span className="preference-status">Not available</span></PreferenceRow></PreferenceGroup>
        <PreferenceGroup title="This installation" note="The log folder and the workspace choice stay in the program menu (Help, File)."><PreferenceRow title="Connected to"><span className="preference-status">{info?(info.connection==='local'?'This computer':'Connected installation'):'Local browser preview'}</span></PreferenceRow></PreferenceGroup>
      </>}
      {NOTES[active_]&&<p className="settings-page-note">{NOTES[active_]}</p>}
    </div>
    </div>;
  return <div className="app-settings settings-workspace page-ui" data-inline-sidebar={!sidebarSlot&&!aboutOnly?'true':undefined}>
    {!aboutOnly&&sidebarSlot&&active?createPortal(sidebar,sidebarSlot):null}
    {!aboutOnly&&!sidebarSlot&&sidebar}
    {page}
  </div>;
}
