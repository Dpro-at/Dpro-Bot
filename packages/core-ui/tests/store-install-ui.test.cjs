require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
const {allowedStore,storeResponse,storeRoute,storeJobPath}=require('../src/apps-contract.js');const {allowed}=require('../scripts/application-server.cjs');const {allowedRequest}=require('../src/session.ts');
const job='0b6f2c2e-7a3c-4b1e-9d6a-3c2f1e0a9b8d';
test('APPS-06: the add job and remove-with-confirm pass both gates; nothing else does',()=>{
 for(const [m,p,b] of [['GET',storeJobPath(job)],['POST','/api/store/uninstall',{id:'store:notes'}],['POST','/api/store/uninstall',{id:'store:notes',confirm:true}],['POST','/api/store/install',{id:'store:notes',hash:'a'.repeat(64)}]]){assert.ok(storeRoute(p));assert.ok(allowedStore(m,p,b),`${m} ${p}`);assert.ok(allowed(m,p,b),`bridge ${p}`);assert.ok(allowedRequest(m,p,b),`client ${p}`);}
 for(const [m,p,b] of [['GET','/api/store/install/../../x'],['POST',storeJobPath(job)],['GET',storeJobPath(job),{}],['POST','/api/store/uninstall',{id:'store:notes',confirm:false}],['POST','/api/store/uninstall',{id:'store:notes',confirm:true,force:1}]]){assert.equal(allowed(m,p,b),false,`${m} ${p}`);assert.equal(allowedRequest(m,p,b),false,`client ${m} ${p}`);}
});
test('APPS-06: answers pass back only what the window shows, the same when projected twice',()=>{
 const steps=[{step:'checking',done:false},{step:'adding',done:true,ok:true,message:'Notes is added. Girru starts again to finish.',restart:'auto',path:'/secret'}];
 for(const b of steps){const once=storeResponse(storeJobPath(job),200,b);assert.deepEqual(storeResponse(storeJobPath(job),200,once),once);assert.ok(!JSON.stringify(once).includes('/secret'));}
 assert.throws(()=>storeResponse(storeJobPath(job),200,{step:'hacking',done:false}));
 const added=storeResponse('/api/store/install',200,{ok:true,state:'adding',job});assert.deepEqual(added,{ok:true,state:'adding',job});assert.deepEqual(storeResponse('/api/store/install',200,added),added);
 const removed=storeResponse('/api/store/uninstall',200,{ok:true,state:'available',copy:'/Users/x/Girru Backups/app-data/notes.json',restart:'manual'});assert.deepEqual(removed,{ok:true,state:'available',restart:'manual',copied:true});assert.deepEqual(storeResponse('/api/store/uninstall',200,removed),removed);
 const asked=storeResponse('/api/store/uninstall',409,{code:'has_data',message:'It keeps data of its own.',data:[{table:'notes_items',rows:2}]});assert.deepEqual(asked.data,[{table:'notes_items',rows:2}]);assert.deepEqual(storeResponse('/api/store/uninstall',409,asked),asked);
});
