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
