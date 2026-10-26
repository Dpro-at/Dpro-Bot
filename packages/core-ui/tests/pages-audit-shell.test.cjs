require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const shell=fs.readFileSync(path.join(__dirname,'../src/SignedInShell.tsx'),'utf8');
test('Personalities stays mounted so an unsaved draft survives a section switch',()=>{
 assert.match(shell,/<PersonalityLibrary client=\{client\} active=\{page==='personalities'\}/);
 assert.doesNotMatch(shell,/\{page==='personalities'&&<PersonalityLibrary/);
});
test('⌘K reaches every Apps and Settings place; the approvals count stays on the footer badge',()=>{
 for(const s of ['Apps › ${label}','Apps › Trading','Settings › ${label}'])assert.ok(shell.includes(s),s);
 for(const p of ['channels','accounts','addons','catalogue','replies','keys','schedules','move','about'])assert.match(shell,new RegExp(`\\['${p}',`));
 assert.doesNotMatch(shell,/approvalLabel/);
});
test('Settings opens from the footer gear and ⌘, — no extra sidebar gear or account-menu item',()=>{
 assert.doesNotMatch(shell,/sidebar-settings/);assert.doesNotMatch(shell,/>Settings<\/button>/);
 assert.match(shell,/Search or run a command<kbd>⌘K/);
});
test('Apps "Manage in MCP connections" opens that connection in MCP (S-10)',()=>{const {tileActions}=require('../src/WorkspaceApplications.tsx');let got;
 const items=tileActions({id:'a',kind:'mcp',name:'X'},{owner:true,busy:false,server:{id:'srv-1',enabled:true}},{open(){},onAccountConnections(){},onPermissions(){},onManageConnections:id=>{got=id;},toggle(){},edit(){},reconnect(){},remove(){}});
 items.find(i=>i&&i.label==='Manage in MCP connections').run();assert.equal(got,'srv-1');
 assert.match(shell,/<McpSection [^>]*openId=\{mcpOpen\}/);
});
test('places inside Agents and Apps show the way back on top of their sidebar (board SH1)',()=>{
 assert.match(shell,/placeParent[^=]*=\s*\{ personalities: 'agents', specialties: 'agents', skills: 'agents', mcp: 'apps', terminal: 'apps' \}/);
 assert.match(shell,/className="agent-return place-return" onClick=\{\(\)=>setPage\(placeParent\[page\]!\)\}/);
 assert.match(shell,/onOpenMcp=\{\(\)=>setPage\('mcp'\)\} onOpenApprovals=\{\(\)=>setPage\('approvals'\)\}/);assert.doesNotMatch(shell,/connectorsFocus/);
});
test('Apps "Agent permissions…" opens Approvals › What agents may do (A4)',()=>{assert.match(shell,/setApprovalsPlace\(r=>\(\{place:'perms'/);assert.match(shell,/<ApprovalsWorkspace [^>]*placeRequest=\{approvalsPlace\}/);});
