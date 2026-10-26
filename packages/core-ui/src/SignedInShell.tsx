import {PersonalityLibrary} from './PersonalityLibrary';
import {WorkspaceModes,editorBounds,useNabuAvailability} from './WorkspaceModes';
import {TradingWorkspace} from './TradingWorkspace';
import {AppsWorkspace} from './AppsWorkspace';
import type {AppsPlace} from './AppsWorkspace';
import {SpecialtyLibrary} from './SpecialtyLibrary';
import {NewChatDialog} from './NewChatDialog';
import {usePendingApprovalCount} from './ApprovalPage';
import {ApprovalsWorkspace} from './HumanReviewsPage';
import type {ApprovalsPlaceRequest} from './HumanReviewsPage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { SessionClient } from './session';
import { displayName } from './session';
import { ConversationsController } from './conversations';
import { ChatView } from './ChatView';
import { ConversationList } from './ConversationList';
import { AgentsDestination } from './AgentsDestination';
import { BoardController } from './board';
import { TaskBoard } from './TaskBoard';
import { GenVRPage } from './GenVRPage';
import type {SettingsTab} from './AppSettings';
import { AppSettings } from './AppSettings';
import { useAppNavigation, useAppTheme } from './app-navigation';
import { MemoryWindow } from './MemoryDesktop';
import type { MemoryFocus, SettingsTarget } from './MemoryDesktop';
import type { MemorySettingsPane } from './MemorySettings';
import { McpSection, SkillsSection, TerminalSection } from './ToolSections';
import { Icon } from './icons';
import type { IconName } from './icons';
import { UiIcon } from './ui-icons';
import { CommandPalette } from './CommandPalette';
import { ShellFooter } from './ShellFooter';
import type { FooterEntry } from './ShellFooter';
import { footerFor } from './footer-prefs';
import type { FooterSection } from './footer-prefs';
import { ChatSearchController } from './chat-search';
import type { Command } from './CommandPalette';

type Page = 'code' | 'trading' | 'apps' | 'approvals' | 'chat' | 'genvr' | 'agents' | 'board' | 'memory' | 'skills' | 'mcp' | 'terminal' | 'account' | 'settings' | 'about' | 'specialties' | 'personalities';
/** Sections that own the sidebar with their own places (the chat list shows only in Chat). */
const placeParent: Partial<Record<Page, 'agents' | 'apps'>> = { personalities: 'agents', specialties: 'agents', skills: 'agents', mcp: 'apps', terminal: 'apps' };
const OWN_SIDEBAR: ReadonlyArray<Page> = ['memory', 'settings', 'agents', 'skills', 'mcp', 'terminal','specialties','personalities','board','approvals','apps','trading'];
const pages: ReadonlyArray<{ key: Page; label: string; icon: IconName | 'board' }> = [
  { key: 'chat', label: 'Chat', icon: 'message-circle' },
  { key: 'agents', label: 'Agents', icon: 'user' },
  { key: 'board', label: 'Board', icon: 'board' },
  { key: 'approvals', label: 'Approvals', icon: 'clock' },
  { key: 'memory', label: 'Memory', icon: 'database' },
  { key: 'genvr', label: 'GenVR', icon: 'dice' },
  { key: 'apps', label: 'Apps', icon: 'settings' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

/**
 * The signed-in workspace: one left sidebar owned by the open section (the
 * chat list in Chat; Memory, Settings, Agents, Skills, MCP connections and
 * Terminal show their own places in it), every page in the status bar, the
 * page area and a status bar. Every page
 * stays mounted and only the active one is shown, so a conversation or an
 * unsaved agent draft survives switching pages.
 */
export function SignedInShell({ client, notice }: { client: SessionClient; notice: ReactNode }) {
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  const [page, setPage] = useState<Page>('chat');
  const nativeEditor=useNabuAvailability();
  useEffect(()=>{if(page!=='code'){const {top,bottom}=editorBounds();void window.dproApp?.nabu?.select('chat',top,bottom).catch(()=>{});}},[page]);
  useEffect(()=>()=>{void window.dproApp?.nabu?.select('chat',48,32).catch(()=>{});},[]);
  const openCode=()=>{setPage('code');const {top,bottom}=editorBounds();void window.dproApp?.nabu?.select('code',top,bottom).catch(()=>{});};
  const appearance = useAppTheme();
  const theme = appearance.theme;
  // The title-bar switch goes back to "system" when it lands on the system's own theme.
  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; const system = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; appearance.setPreference(next === system ? 'system' : next); };
  useAppNavigation(destination => setPage(destination === 'home' ? 'chat' : destination));
  const [chat, setChat] = useState<ConversationsController>();
  useEffect(() => { const c = new ConversationsController(client); setChat(c); void c.load(); return () => c.dispose(); }, [client]);
  // CHAT-PRO-02 D: search inside the chats (the sidebar box and the ⌘K box each keep their own).
  const [search, setSearch] = useState<{ side: ChatSearchController; palette: ChatSearchController }>();
  useEffect(() => { const s = { side: new ChatSearchController(client), palette: new ChatSearchController(client) }; setSearch(s); return () => { s.side.dispose(); s.palette.dispose(); }; }, [client]);
  const [board, setBoard] = useState<BoardController>();
  useEffect(() => { const b = new BoardController(client); setBoard(b); return () => b.dispose(); }, [client]);
  const chatState = useSyncExternalStore(
    chat ? chat.subscribe : noopSubscribe,
    chat ? chat.getSnapshot : nullSnapshot,
    chat ? chat.getSnapshot : nullSnapshot);
  const user = state.user!;
  const pendingApprovals=usePendingApprovalCount(client,user.role==='owner');
  const mode = state.mode === 'mock' ? 'mock' : 'live';
  const [rail, setRail] = useState(true);
  const [palette, setPalette] = useState(false);
  const [choosingChat,setChoosingChat]=useState(false);
  const [settingsTab,setSettingsTab]=useState<SettingsTab>('general');
  const [memoryPane,setMemoryPane]=useState<MemorySettingsPane>('rules');
  const [slot,setSlot]=useState<HTMLElement|null>(null);
  const ownSidebar=OWN_SIDEBAR.includes(page);
  const [settingsVisit,setSettingsVisit]=useState(0);
  const [terminalRequest,setTerminalRequest]=useState(0);
  const openSettings=(tab:SettingsTab)=>{setSettingsTab(tab);setSettingsVisit(n=>n+1);setPage('settings');};
  const [appsPlace,setAppsPlace]=useState<{place:AppsPlace;n:number}>();
  const openApps=(place:AppsPlace)=>{setAppsPlace(r=>({place,n:(r?.n??0)+1}));setPage('apps');};
  // The separate Account and About pages are gone: menus and "Account verification" buttons open the Settings places.
  useEffect(()=>{if(page==='account')openSettings('account');else if(page==='about')openSettings('about');},[page]);
  const openTerminal=()=>{if(user.role!=='owner')return;setTerminalRequest(n=>n+1);setPage('chat');};
  const openMemorySettings=(target:SettingsTarget)=>{setMemoryPane(target);setSettingsTab('memory');setSettingsVisit(n=>n+1);setPage('settings');};
  const tools=[
    {id:'genvr',label:'GenVR',icon:<Icon name="dice"/>,run:()=>setPage('genvr')},
    ...(user.role==='owner'?[
      {id:'terminal',label:'Terminal',icon:<UiIcon name="terminal" size={14}/>,run:()=>setPage('terminal')},
      ...(nativeEditor?[{id:'code',label:'Code',icon:<UiIcon name="code" size={14}/>,run:openCode}]:[]),
      {id:'skills',label:'Skills',icon:<UiIcon name="file" size={14}/>,run:()=>setPage('skills')},
      {id:'personalities',label:'Personalities',icon:<UiIcon name="contact" size={14}/>,run:()=>setPage('personalities')},
      {id:'specialties',label:'Specialties',icon:<Icon name="user"/>,run:()=>setPage('specialties')},
      {id:'mcp',label:'MCP connections',icon:<UiIcon name="tool" size={14}/>,run:()=>setPage('mcp')},
    ]:[]),
  ];
  const [mcpOpen,setMcpOpen]=useState<string>();
  const [approvalsPlace,setApprovalsPlace]=useState<ApprovalsPlaceRequest|null>(null);
  const [agentFocus,setAgentFocus]=useState<{id:string;n:number}|null>(null);
  const [memoryFocus, setMemoryFocus] = useState<MemoryFocus | null>(null);
  const boardState = useSyncExternalStore(board ? board.subscribe : noopSubscribe, board ? board.getSnapshot : nullSnapshot, board ? board.getSnapshot : nullSnapshot);
  // ⌘K / Ctrl+K opens the command box anywhere in the workspace; ⌘, / Ctrl+, opens Settings.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(v => !v); }
      else if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); setPage('settings'); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  const newChat = () => {setChoosingChat(true);setPage('chat');};
  const commands: Command[] = [
    ...pages.filter(p=>p.key!=='genvr'&&(p.key!=='approvals'||user.role!=='guest')).map(p => ({ id: `go-${p.key}`, group: 'Go to', label: p.label, icon:p.icon==='board'?<UiIcon name="board" size={14}/>:<Icon name={p.icon}/>, run: () => setPage(p.key) })),
    ...tools.map(t=>({...t,id:'tool-'+t.id,group:'Tools',keywords:t.id==='specialties'?'agent templates':t.id==='skills'?'skill abilities':t.id==='terminal'?'console shell':t.id==='genvr'?'spaces worlds':'connectors'})),
    ...(user.role==='owner'?[{id:'scheduled-tasks',group:'Settings',label:'Scheduled tasks',keywords:'schedule cron automation paused active',icon:<UiIcon name="clock" size={14}/>,run:()=>openSettings('schedules')}]:[]),
    ...(user.role!=='guest'?([['mine','My apps'],['channels','Channels'],['accounts','Accounts'],['addons','Add-ons in my coding apps'],['catalogue','Catalogue']] as const).map(([place,label])=>({id:`apps-${place}`,group:'Apps',label:`Apps › ${label}`,keywords:'apps connections',icon:<UiIcon name="puzzle" size={14}/>,run:()=>openApps(place)})):[]),
    ...(user.role==='owner'?[{id:'go-trading',group:'Apps',label:'Apps › Trading',keywords:'paper practice stocks',icon:<UiIcon name="chart" size={14}/>,run:()=>setPage('trading')}]:[]),
    ...([['general','General'],['replies','Replies'],['account','Account'],['keys','Saved keys'],['memory','Memory'],['schedules','Schedules'],['move','Move to another computer'],['about','About and updates']] as const).filter(([tab])=>user.role==='owner'||!['keys','memory','schedules','move'].includes(tab)).map(([tab,label])=>({id:`settings-${tab}`,group:'Settings',label:`Settings › ${label}`,icon:<UiIcon name="gear" size={14}/>,run:()=>openSettings(tab)})),
    { id: 'new-chat', group: 'Actions', icon:<UiIcon name="compose" size={14}/>, label: 'New chat', run: newChat },
    ...(chatState?.conversations ?? []).slice(0, 30).map(c => ({ id: `chat-${c.id}`, group: 'Conversations', icon:<Icon name="message-circle"/>, label: c.title || c.preview || 'New chat', run: () => { void chat?.open(c.id); setPage('chat'); } })),
    { id: 'theme', group: 'Actions', icon:<UiIcon name={theme==='dark'?'sun':'moon'} size={14}/>, label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', run: toggleTheme },
    { id: 'rail', group: 'Actions', icon:<UiIcon name="sidebar" size={14}/>, label: rail ? 'Hide the sidebar' : 'Show the sidebar', run: () => setRail(v => !v) },
  ];
  const active = chatState?.conversations.find(c => c.id === chatState.activeId);
  const pageTitle = page === 'code'?'Code':page === 'personalities'?'Personalities':page === 'trading'?'Trading':page === 'specialties'?'Specialties':page === 'chat' && active ? (active.title || 'Chat') : page === 'skills' ? 'Skills' : page === 'mcp' ? 'MCP connections' : page === 'terminal' ? 'Terminal' : pages.find(p => p.key === page)?.label ?? '';
  const footer=footerFor(client);
  const owner=user.role==='owner',go=(p:Page)=>()=>setPage(p);
  const entry=(id:Page,available=true,run=go(id),badge?:string,parent?:FooterSection):FooterEntry=>({available,current:page===id,run,badge,parent});
  const footerEntries:Record<FooterSection,FooterEntry>={chat:entry('chat'),agents:entry('agents'),board:entry('board'),memory:entry('memory'),approvals:entry('approvals',user.role!=='guest',go('approvals'),pendingApprovals.count?(pendingApprovals.count===100?'100+':String(pendingApprovals.count)):undefined),apps:entry('apps'),genvr:entry('genvr',true,go('genvr'),undefined,'apps'),
    terminal:entry('terminal',owner,go('terminal'),undefined,'apps'),code:entry('code',owner&&nativeEditor,openCode,undefined,'apps'),skills:entry('skills',owner,go('skills'),undefined,'agents'),personalities:entry('personalities',owner,go('personalities'),undefined,'agents'),specialties:entry('specialties',owner,go('specialties'),undefined,'agents'),mcp:entry('mcp',owner,go('mcp'),undefined,'apps')};

  const sidebarShown = rail && (page === 'chat' || ownSidebar);
  return <div className="shell app-shell" data-theme={theme} data-rail={sidebarShown ? 'open' : 'closed'} data-section={page} lang="en" dir="ltr">
    {choosingChat&&chat&&<NewChatDialog controller={chat} onClose={()=>setChoosingChat(false)}/>}
    <header className="titlebar">
      <WorkspaceModes onModeChange={mode=>{if(mode==='code')setPage('code');else if(page==='code')setPage('chat');}}/>
      <div className="titlebar-tools">
        <button type="button" className="tool" aria-label={rail ? 'Hide the sidebar' : 'Show the sidebar'} title={rail ? 'Hide the sidebar' : 'Show the sidebar'} aria-pressed={rail} onClick={() => setRail(v => !v)}><UiIcon name="sidebar" size={14}/></button>
        {page === 'chat' && <button type="button" className="tool" aria-label="New chat" title="New chat" onClick={newChat}><UiIcon name="compose" size={14}/></button>}
      </div>
      <p className="titlebar-title">{pageTitle}</p>
      <div className="titlebar-tools end">
        <button type="button" className="titlebar-cmdk" onClick={() => setPalette(true)} aria-label="Search or run a command (⌘K)"><UiIcon name="search" size={13}/>Search or run a command<kbd>⌘K</kbd></button>
        <button type="button" className="tool" onClick={toggleTheme} aria-label="Switch theme" title="Switch theme"><UiIcon name={theme === 'dark' ? 'sun' : 'moon'} size={14}/></button>
      </div>
    </header>
    <aside className="sidebar">
      {/* The open section owns the sidebar: the chat list only in Chat; other sections render their places into the slot. */}
      {/* A place inside a section (Skills in Agents, MCP in Apps) shows the way back on top, like an open agent's "All staff" (board SH1). */}
      {placeParent[page]&&<button type="button" className="agent-return place-return" onClick={()=>setPage(placeParent[page]!)}><UiIcon name="arrow-left" size={13}/>{placeParent[page]==='agents'?'Agents':'Apps'}</button>}
      <div className="section-sidebar" ref={setSlot} hidden={page === 'chat'}/>
      {page === 'chat' && <><button className="nav-item new-chat" onClick={newChat}>
        <UiIcon name="compose" size={15}/>New chat
      </button>
      <p className="section-label"><span className="checker" aria-hidden="true"/>Conversations</p>
      <div className="session-list">
        {chat && <ConversationList controller={chat} search={user.role === 'guest' ? undefined : search?.side} onOpen={() => setPage('chat')}/>}
      </div></>}
      <div className="sidebar-footer">
        <details className="account-menu"><summary className="user-chip" title="Account">
          <span className="avatar" aria-hidden="true">{(displayName(user) || '?').slice(0, 1).toUpperCase()}</span>
          <span className="user-name"><bdi>{displayName(user)}</bdi><small>{user.role}</small></span>
        </summary><div><button onClick={() => openSettings('account')}>Account</button><button onClick={() => client.cancel()}>Sign out on this device</button></div></details>
      </div>
    </aside>
    <main id="content" className="page-area">
      {notice && <p className="page-notice" role="status">{notice}</p>}
      <section className="page page-chat" aria-label="Chat" hidden={page !== 'chat'}>
        {chat ? <ChatView active={page === 'chat'} onChooseContext={newChat} terminalRequest={terminalRequest} controller={chat} mode={mode} client={client} onAddConnector={() => setPage('mcp')}
          onOpenCard={(boardId, cardId) => { setPage('board'); void board?.reveal(boardId, cardId); }}
          onOpenMemory={(drawerId, memoryId) => { setMemoryFocus(f => ({ drawerId, memoryId, n: (f?.n ?? 0) + 1 })); setPage('memory'); }}/> : null}
      </section>
      <section className="page page-agents" hidden={page !== 'agents'}><AgentsDestination client={client} active={page === 'agents'} onPersonalities={()=>setPage('personalities')} onSpecialties={()=>setPage('specialties')} onSkills={()=>setPage('skills')} sidebarSlot={slot} onOpenMcp={()=>setPage('mcp')} onOpenApprovals={()=>setPage('approvals')} focusAgent={agentFocus} onChat={agentId => { if (chat) { chat.newChat(); chat.selectAgent(agentId); } setPage('chat'); }} onOpenMemory={agentId => { if (agentId) setMemoryFocus(f => ({ scope: `agent:${agentId}`, n: (f?.n ?? 0) + 1 })); setPage('memory'); }}/></section>
      <section className="page page-board" hidden={page !== 'board'}>{board && <TaskBoard controller={board} sidebarSlot={slot} active={page === 'board'} onOpenChat={id => { void chat?.open(id); setPage('chat'); }}/>}</section>
      {user.role!=='guest'&&<section className="page page-approvals" hidden={page!=='approvals'}><ApprovalsWorkspace client={client} active={page==='approvals'} placeRequest={approvalsPlace} slot={slot} onDecision={pendingApprovals.reload} onAccount={()=>openSettings('account')} pendingCount={pendingApprovals.count} onAgent={id=>{setAgentFocus(f=>({id,n:(f?.n??0)+1}));setPage('agents');}}/></section>}
      <section className="page page-ui mem-desk" hidden={page !== 'memory'}><MemoryWindow client={client} active={page === 'memory'} focus={memoryFocus} sidebarSlot={slot} onOpenChat={id => { void chat?.open(id); setPage('chat'); }} onOpenSettings={openMemorySettings}/></section>
      {user.role === 'owner' && <>
        <section className="page page-personalities" hidden={page !== 'personalities'}><PersonalityLibrary client={client} active={page==='personalities'} sidebarSlot={slot} onOpenAgent={id=>{setAgentFocus(f=>({id,n:(f?.n??0)+1}));setPage('agents');}}/></section>
        <section className="page page-specialties" hidden={page !== 'specialties'}><SpecialtyLibrary client={client} active={page==='specialties'} sidebarSlot={slot} onOpenAgent={id=>{setAgentFocus(f=>({id,n:(f?.n??0)+1}));setPage('agents');}} onOpenConnections={()=>setPage('mcp')}/></section>
        <section className="page page-skills mem-desk" hidden={page !== 'skills'}><SkillsSection client={client} active={page === 'skills'} slot={slot} onOpenAgents={()=>setPage('agents')}/></section>
        <section className="page page-mcp mem-desk" hidden={page !== 'mcp'}><McpSection client={client} active={page === 'mcp'} slot={slot} openId={mcpOpen} onOpenAgents={()=>setPage('agents')}/></section>
        <section className="page page-ui mem-desk" hidden={page !== 'terminal'}><TerminalSection client={client} active={page === 'terminal'} slot={slot} onOpenTerminal={openTerminal}/></section>
      </>}
      <section className="page page-ui" hidden={page!=='code'}><p role="status" className="fine-print">Select Code in the bottom bar to open or reconnect the project editor.</p></section>
      <section className="page page-apps" hidden={page!=='apps'}><AppsWorkspace client={client} active={page==='apps'} sidebarSlot={slot} placeRequest={appsPlace} onOpen={id=>setPage(id)} onConnections={id=>{if(id)setMcpOpen(id);setPage('mcp');}} onSkills={()=>setPage('skills')} onCode={nativeEditor&&user.role==='owner'?openCode:undefined} onPermissions={()=>{if(user.role!=='owner'){setPage('agents');return;}setApprovalsPlace(r=>({place:'perms',n:(r?.n??0)+1}));setPage('approvals');}}/></section>
      {user.role==='owner'&&<section className="page page-trading" hidden={page!=='trading'}><TradingWorkspace client={client} active={page==='trading'} sidebarSlot={slot} onBack={()=>setPage('apps')}/></section>}
      <section className="page page-genvr" hidden={page !== 'genvr'}><GenVRPage key={user.id} client={client} active={page === 'genvr'}/></section>
      {page === 'settings' && <section className="page page-settings"><AppSettings key={settingsVisit} initialTab={settingsTab} initialMemoryPane={memoryPane} sidebarSlot={slot} active signedIn client={client} preference={appearance.preference} onTheme={appearance.setPreference} onAccount={() => openSettings('account')} onAgents={() => setPage('agents')} onOpenMemory={() => setPage('memory')} onOpenChat={() => setPage('chat')} onOpenApps={() => setPage('apps')} onOpenTool={tool => setPage(tool)} onOpenGenvr={() => setPage('genvr')} onApprovals={() => setPage('approvals')} onBoard={() => setPage('board')} onAgent={id => { setAgentFocus(f => ({ id, n: (f?.n ?? 0) + 1 })); setPage('agents'); }}/></section>}
    </main>
    <ShellFooter controller={footer} settingsCurrent={page==='settings'} onSettings={()=>setPage('settings')} onCustomize={()=>openSettings('general')}
      status={mode === 'mock' ? <span className="status-item"><span className={`status-dot ${mode}`} aria-hidden="true"/>Offline practice — fictional data</span>
        : <span className="status-item status-dot-only" title="Connected · this installation" aria-label="Connected · this installation" role="img"><span className={`status-dot ${mode}`} aria-hidden="true"/></span>}
      extra={client.canUse('mock') && <button className="status-item statusbar-button" onClick={() => client.selectMode('fixture')} title="Clears this local session; the server sign-in stays until you sign out">Leave to fixture</button>}
      entries={footerEntries}/>
    <CommandPalette open={palette} commands={commands} onClose={() => setPalette(false)}
      search={chat && search && user.role !== 'guest' ? { controller: search.palette, onOpen: (id, messageId) => { void chat.openAt(id, messageId); setPage('chat'); } } : undefined}/>
  </div>;
}

const noopSubscribe = () => () => {};
const nullSnapshot = () => undefined;
