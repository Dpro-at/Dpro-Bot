// SA6 (board StoreOne): Apps moved into the Store as My apps; private apps come from a folder;
// long lists in every Store place draw one part at a time.
require('./load.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {workspaceAppsResponse,allowedStore,storeResponse,STORE_PRIVATE_PATH}=require('../src/apps-contract.js');
const {allowed}=require('../scripts/application-server.cjs');
const {tileActions}=require('../src/WorkspaceApplications.tsx');
const {STORE_PART,addedItem}=require('../src/StoreView.tsx');
const src=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');

test('My apps lists added apps: from the Store or private (from a folder), always removable',()=>{
 const base={summary:'',version:'0.1.0',state:'included',permissions:[],tools:0,removable:true};
 const r=workspaceAppsResponse(200,{items:[{...base,id:'app:my-crm',name:'My CRM',kind:'added',sourceId:'my-crm',origin:'private'}]});
 assert.equal(r.items[0].origin,'private');
 for(const bad of [{id:'app:my-crm',kind:'added',sourceId:'other',origin:'private'},{id:'app:my-crm',kind:'added',sourceId:'my-crm',origin:'web'},{id:'app:My_Crm',kind:'added',sourceId:'My_Crm',origin:'store'},{id:'app:x',kind:'builtin',sourceId:null,origin:'store'}])
  assert.throws(()=>workspaceAppsResponse(200,{items:[{...base,name:'X',...bad}]}),undefined,JSON.stringify(bad));
 const menu=tileActions({id:'app:my-crm',kind:'added',name:'My CRM'},{owner:true},{open(){},onAccountConnections(){},onPermissions(){},remove(){}});
 assert.deepEqual(menu.filter(x=>x!=='sep').map(x=>x.label),['Agent permissions…','Remove']);
 assert.deepEqual(tileActions({id:'app:my-crm',kind:'added',name:'My CRM'},{owner:false},{open(){},onAccountConnections(){},onPermissions(){},remove(){}}),[]);
 assert.equal(addedItem({name:'My CRM',sourceId:'my-crm',origin:'private'}).id,'private:my-crm');
});

test('adding a private app: one folder path, owner only, through the window and the local bridge',()=>{
 for(const gate of [allowedStore,(m,p,b)=>allowed(m,p,b)]){
  assert.ok(gate('POST',STORE_PRIVATE_PATH,{folder:'~/Projects/my-crm'}));
  for(const bad of [{},{folder:''},{folder:'   '},{folder:'a\0b'},{folder:'x'.repeat(1025)},{folder:'a',more:1}])assert.equal(!!gate('POST',STORE_PRIVATE_PATH,bad),false,JSON.stringify(bad));
  assert.equal(!!gate('GET',STORE_PRIVATE_PATH,undefined),false);
 }
 assert.deepEqual(storeResponse(STORE_PRIVATE_PATH,200,{ok:true,state:'installed',id:'my-crm',name:'My CRM',restart:'manual',secret:'x'}),{ok:true,state:'installed',id:'my-crm',name:'My CRM',restart:'manual'});
 assert.deepEqual(storeResponse(STORE_PRIVATE_PATH,409,{code:'refused',message:'It makes a table (users) that is not named after it'}),{code:'refused',message:'It makes a table (users) that is not named after it'});
 const view=src('StoreView.tsx');assert.match(view,/Add an app from a folder…/);assert.match(view,/Nobody reviewed it/);assert.match(view,/owner&&<IconButton icon="more"/);
});

test('long lists draw one part at a time, with Show more for the keyboard; no page numbers',()=>{
 assert.equal(STORE_PART,40);const view=src('StoreView.tsx');
 assert.match(view,/items\.slice\(0,shown\)\.map/);assert.match(view,/IntersectionObserver/);assert.match(view,/>Show more</);assert.doesNotMatch(view,/Page \d|page \{|of \{pages\}/);
});

test('the footer has no Apps section; every way to Apps opens Store › My apps',()=>{
 const shell=src('SignedInShell.tsx');
 assert.doesNotMatch(shell,/apps:entry\(/);assert.match(shell,/store:entry\('store',true,openMyApps\)/);assert.match(shell,/if\(page==='apps'\)openMyApps\(\)/);
 assert.match(shell,/onOpenApps=\{openMyApps\}/);assert.match(shell,/onBack=\{openMyApps\}/);
});
