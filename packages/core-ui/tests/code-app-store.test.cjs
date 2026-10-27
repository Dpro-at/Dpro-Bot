require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {workspaceAppsResponse}=require('../src/apps-contract.js');const {builtinApps,tileActions}=require('../src/WorkspaceApplications.tsx');
const code={id:'code',name:'Code',kind:'builtin',version:null,summary:'The project editor beside your chats, in the Girru desktop app.',state:'included',sourceId:null,permissions:['Opens only in the Girru desktop app that has the editor'],tools:0,removable:false};
test('Code comes from the server app list like Terminal, Trading and GenVR',()=>{
 assert.deepEqual(workspaceAppsResponse(200,{items:[code]}).items.map(x=>x.id),['code']);
 assert.throws(()=>workspaceAppsResponse(200,{items:[{...code,kind:'api'}]}));assert.throws(()=>workspaceAppsResponse(200,{items:[{...code,sourceId:'code'}]}));
 const src=fs.readFileSync(path.join(__dirname,'../src/WorkspaceApplications.tsx'),'utf8');assert.doesNotMatch(src,/codeApp/,'no second client-only Code tile');
});
test('Store › Catalogue (Girru) lists the apps that come with Girru, Code included',()=>{
 assert.deepEqual(builtinApps.map(x=>x.id).sort(),['code','genvr','terminal','trading']);
 const ws=fs.readFileSync(path.join(__dirname,'../src/AppsWorkspace.tsx'),'utf8');assert.match(ws,/aria-label="Comes with Girru"/);assert.match(ws,/if\(id==='code'\)onCode\?\.\(\);else onOpen\(id\)/);
});
test('without the desktop editor, Open Code is shown but disabled',()=>{
 const h={open(){},onAccountConnections(){},onPermissions(){}};
 assert.equal(tileActions(code,{owner:true},{...h,canOpen:false})[0].disabled,true);assert.equal(tileActions(code,{owner:true},{...h,canOpen:true})[0].disabled,false);
});
