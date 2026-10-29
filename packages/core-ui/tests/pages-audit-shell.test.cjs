require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const shell=fs.readFileSync(path.join(__dirname,'../src/SignedInShell.tsx'),'utf8');
test('Personalities stays mounted so an unsaved draft survives a section switch',()=>{
 assert.match(shell,/<PersonalityLibrary client=\{client\} active=\{page==='personalities'\}/);
 assert.doesNotMatch(shell,/\{page==='personalities'&&<PersonalityLibrary/);
});
test('⌘K reaches every Apps, Library and Settings place; the approvals count stays on the footer badge',()=>{
 for(const s of ['Apps › ${label}','Apps › Trading','Settings › ${label}','Settings › MCP connections','Library › Personalities','Library › Specialties','Library › Skills'])assert.ok(shell.includes(s),s);
 assert.match(shell,/id:'go-store',group:'Store'/);assert.match(shell,/id:'store-updates'/);
 assert.match(shell,/id:'coding-app-plugins'/);
 for(const p of ['mine','channels','accounts','departments','replies','keys','schedules','move','about'])assert.match(shell,new RegExp(`\\['${p}',`));
 // Channels and Accounts are Settings places now, never Apps places.
 assert.doesNotMatch(shell,/openApps\('(channels|accounts)'\)/);assert.match(shell,/onSettings=\{tab=>openSettings\(tab\)\}/);
 assert.doesNotMatch(shell,/approvalLabel/);
});
test('Settings opens from the footer gear and ⌘, — no extra sidebar gear or account-menu item',()=>{
 assert.doesNotMatch(shell,/sidebar-settings/);assert.doesNotMatch(shell,/>Settings<\/button>/);
 assert.match(shell,/aria-label="Search or run a command \(⌘K\)"><UiIcon name="search" size=\{13\}\/>Commands<kbd>⌘K/);
});
test('an MCP connection is not an app: Apps links open it in Settings › MCP connections (S-10)',()=>{const {tileActions}=require('../src/WorkspaceApplications.tsx');
 assert.deepEqual(tileActions({id:'a',kind:'mcp',name:'X'},{owner:true},{open(){},onAccountConnections(){},onPermissions(){}}),[]);
 assert.match(shell,/onConnections=\{id=>\{if\(id\)setMcpOpen\(id\);setPage\('mcp'\);\}\}/);
 assert.match(shell,/<AppSettings key=\{settingsVisit\} mcpOpenId=\{mcpOpen\}/);
 assert.match(shell,/else if\(page==='mcp'\)openSettings\('mcp'\);/);
});
test('places inside Library, Apps and Settings show the way back on top of their sidebar (board SH1)',()=>{
 assert.match(shell,/placeParent[^=]*=\s*\{ personalities: 'library', specialties: 'library', skills: 'library', terminal: 'apps' \}/);
 assert.match(shell,/settingsCurrent=\{page==='settings'\}/);
 assert.match(shell,/className="agent-return place-return" onClick=\{\(\)=>setPage\(placeParent\[page\]!\)\}/);
 assert.match(shell,/onOpenMcp=\{\(\)=>setPage\('mcp'\)\} onOpenApprovals=\{\(\)=>setPage\('approvals'\)\}/);assert.doesNotMatch(shell,/connectorsFocus/);
});
test('Apps "Agent permissions…" opens Approvals › What agents may do (A4)',()=>{assert.match(shell,/setApprovalsPlace\(r=>\(\{place:'perms'/);assert.match(shell,/<ApprovalsWorkspace [^>]*placeRequest=\{approvalsPlace\}/);});
test('MCP connections stays inside Settings: its places nest under its row, no "← Settings" (visual check 16)',()=>{const fs=require('node:fs'),path=require('node:path');const st=fs.readFileSync(path.join(__dirname,'../src/AppSettings.tsx'),'utf8');
 assert.doesNotMatch(st,/mcp:\{[^}]*jump:true/);
 assert.match(st,/t\.value==='mcp'&&active_==='mcp'&&<div ref=\{setMcpNav\}/);
 assert.match(st,/<McpSection client=\{client!\} active=\{active\} nav=\{mcpNav\}/);
 assert.doesNotMatch(shell,/<McpSection /);
});
