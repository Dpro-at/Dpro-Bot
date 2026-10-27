require('./load.cjs');require.extensions['.css']=()=>{};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {stage1Route}=require('../scripts/application-server.cjs');
const {allowedUpgrade,upgradeResponse}=require('../src/specialty-update-contract.js'),{allowedRequest}=require('../src/session.ts'),{allowed}=require('../scripts/application-server.cjs'),{SpecialtyUpdateController}=require('../src/specialty-update-controller.js');
const React=require('../node_modules/react'),{renderToStaticMarkup}=require('../node_modules/react-dom/server'),{SpecialtyUpdatesView}=require('../src/SpecialtyUpdates.tsx');
const base='/api/workspace-pack/specialty-upgrade-',key='professional-role-'+ 'a'.repeat(24),id='11111111-1111-4111-a111-111111111111',proof='a'.repeat(64);
const preview={namespace:'professional-v1',fingerprint:proof,readOnly:true,applySupported:true,requiresFreshReview:true,roles:[{sourceKey:key,sourceId:'specialty-1',status:'content_update_available',installedIds:[id],name:'Fictional specialty',contentRevision:proof,revision:1,linkedAgentIds:[],packResources:[],preservesConfiguration:true}],resources:[],unmatchedInstalledIds:[]};
const review={sourceKey:key,templateId:id,revision:1,name:'Fictional specialty',reviewToken:proof,changes:[{field:'instructions',before:'Before',after:'After <script>unsafe()</script>'}],agents:[{id:'fixture-agent',name:'Fictional agent'}]},receipt={templateId:id,revision:2,name:'Fictional specialty'};
function fake(handler){const calls=[];return {calls,client:{getSnapshot:()=>({phase:'authenticated',epoch:1,mode:'live',user:{id:'fixture-owner',role:'owner'}}),request:async request=>{calls.push(request);return handler(request);}}};}
test('browser and desktop bridge accept only exact owner review/apply request shapes',()=>{
 assert.equal(stage1Route('GET',base+'preview'),false);assert.equal(stage1Route('POST',base+'review'),false);assert.equal(stage1Route('POST',base+'apply'),false);
 for(const gate of [allowedUpgrade,allowedRequest,allowed]){
  assert.equal(gate('GET',base+'preview'),true);assert.equal(gate('POST',base+'review',{sourceKey:key}),true);assert.equal(gate('POST',base+'apply',{sourceKey:key,reviewToken:proof,confirmed:true}),true);
  for(const body of [{sourceKey:key,reviewToken:proof},{sourceKey:key,reviewToken:proof,confirmed:false},{sourceKey:key,reviewToken:proof,confirmed:true,config:{}},{sourceKey:key,reviewToken:'bad',confirmed:true}])assert.equal(gate('POST',base+'apply',body),false);
  assert.equal(gate('GET',base+'apply'),false);assert.equal(gate('GET',base+'preview?owner=other'),false);assert.equal(gate('POST',base+'review',{sourceKey:key,owner:'other'}),false);
 }
});
test('response boundaries project only recognized fields and reject forged changes',()=>{
 assert.deepEqual(upgradeResponse(base+'review',200,{...review,secret:'hidden'}),review);assert.deepEqual(upgradeResponse(base+'apply',200,{...receipt,config:{secret:true}}),receipt);assert.deepEqual(upgradeResponse(base+'preview',200,preview),preview);
 assert.throws(()=>upgradeResponse(base+'review',200,{...review,changes:[{field:'config',before:'old',after:'new'}]}));assert.throws(()=>upgradeResponse(base+'preview',200,{...preview,roles:[{...preview.roles[0],status:'ready-to-auto-apply'}]}));assert.deepEqual(upgradeResponse(base+'apply',500,{code:'private-path',secret:'hidden'}),{code:'upgrade_preview_unavailable'});
});
test('controller requires selection review and checkbox, sends one exact confirmed apply and invalidates proof after success',async()=>{
 let applied=0;const f=fake(r=>({status:200,body:r.path.endsWith('preview')?preview:r.path.endsWith('review')?review:receipt})),c=new SpecialtyUpdateController(f.client,()=>applied++);
 await c.load();await c.apply();assert.equal(f.calls.length,1);await c.review(key);await c.apply();assert.equal(f.calls.length,2);c.confirm(true);await c.apply();assert.deepEqual(f.calls[2].body,{sourceKey:key,reviewToken:proof,confirmed:true});assert.equal(c.state.phase,'receipt');assert.equal(c.state.preview.roles[0].status,'current');assert.equal(c.state.review,null);assert.equal(applied,1);await c.apply();assert.equal(f.calls.length,3);
});
test('ambiguous origin cannot start review; changed or lost replies discard proof and never auto-replay',async()=>{
 const f=fake(r=>r.path.endsWith('apply')?Promise.reject(Error('lost')):{status:200,body:r.path.endsWith('preview')?preview:review}),c=new SpecialtyUpdateController(f.client);
 await c.load();await c.review('professional-role-'+ 'b'.repeat(24));assert.equal(f.calls.length,1);await c.review(key);c.confirm(true);await c.apply();assert.equal(c.state.phase,'unknown');assert.equal(c.state.review,null);await c.apply();assert.equal(f.calls.length,3);await c.load();assert.equal(f.calls[3].method,'GET');
 const changed=fake(r=>({status:r.path.endsWith('apply')?409:200,body:r.path.endsWith('preview')?preview:r.path.endsWith('review')?review:{code:'review_changed'}})),d=new SpecialtyUpdateController(changed.client);await d.load();await d.review(key);d.confirm(true);await d.apply();assert.equal(d.state.phase,'error');assert.equal(d.state.confirmed,false);assert.equal(d.state.review,null);
});
test('unmount rejects late results; effect reattachment can load without stale proof',async()=>{
 let resolve;const f=fake(()=>new Promise(r=>resolve=r)),c=new SpecialtyUpdateController(f.client);const pending=c.load();c.destroy();resolve({status:200,body:preview});await pending;assert.equal(c.state.preview,null);c.subscribe(()=>{});f.client.request=async()=>({status:200,body:preview});await c.load();assert.equal(c.state.phase,'ready');assert.equal(c.state.review,null);
});
test('review view shows affected agents and escaped changes with checkbox-gated save',()=>{
 const controller={back(){},apply(){},load(){},confirm(){},review(){}};const state={phase:'review',preview,review,confirmed:false,error:null,receipt:null};let html=renderToStaticMarkup(React.createElement(SpecialtyUpdatesView,{controller,state,onClose(){}}));
 assert.match(html,/Fictional agent/);assert.match(html,/Current content/);assert.match(html,/Updated content/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/<button[^>]*disabled=""[^>]*>Save reviewed update/);assert.match(html,/type="checkbox"/);
 html=renderToStaticMarkup(React.createElement(SpecialtyUpdatesView,{controller,state:{...state,confirmed:true},onClose(){}}));assert.doesNotMatch(html,/<button[^>]*disabled=""[^>]*>Save reviewed update/);
 html=renderToStaticMarkup(React.createElement(SpecialtyUpdatesView,{controller,state:{...state,phase:'unknown',review:null},onClose(){}}));assert.match(html,/could not be confirmed/);assert.doesNotMatch(html,/Save reviewed update/);
});

test('owner context is fenced before dispatch and a context change after apply is unknown',async()=>{
 let context={phase:'authenticated',epoch:1,mode:'live',user:{id:'fixture-owner',role:'owner'}};const f=fake(r=>{if(r.path.endsWith('apply'))context={...context,mode:'mock'};return {status:200,body:r.path.endsWith('preview')?preview:r.path.endsWith('review')?review:receipt};});f.client.getSnapshot=()=>context;const c=new SpecialtyUpdateController(f.client);await c.load();await c.review(key);c.confirm(true);await c.apply();assert.equal(c.state.phase,'unknown');assert.equal(c.state.receipt,null);
 const denied=fake(()=>({status:200,body:preview}));denied.client.getSnapshot=()=>({...context,user:{id:'member',role:'user'}});const d=new SpecialtyUpdateController(denied.client);await d.load();assert.equal(denied.calls.length,0);assert.equal(d.state.phase,'error');
});

test('updates show only actionable rows and explain missing bindings with a quiet empty state',()=>{
 const controller={back(){},apply(){},load(){},confirm(){},review(){}};
 const role=preview.roles[0],roles=[{...role,name:'Update me',packResources:[{sourceId:'skill-1',name:'Fictional skill',status:'current',assigned:false}]},{...role,name:'Already current',status:'current'},{...role,name:'Not installed',status:'unmatched',installedIds:[]}];
 const render=roles=>renderToStaticMarkup(React.createElement(SpecialtyUpdatesView,{controller,state:{phase:'ready',preview:{...preview,roles},review:null,confirmed:false,error:null,receipt:null},onClose(){}}));
 const html=render(roles);assert.match(html,/Update me/);assert.doesNotMatch(html,/Already current|Not installed|No matching import/);assert.match(html,/Not assigned/);assert.match(html,/Review skill assignment/);assert.match(html,/<button[^>]*disabled=""[^>]*>Review changes/);
 const empty=render(roles.slice(1));assert.match(empty,/No installed specialties need an update here/);assert.match(empty,/>Refresh</);assert.doesNotMatch(empty,/sp-upgrade-row/);
 assert.equal(upgradeResponse(base+'preview',200,{...preview,roles:[roles[0]]}).roles[0].packResources[0].assigned,false);
 assert.throws(()=>upgradeResponse(base+'preview',200,{...preview,roles:[{...roles[0],packResources:[{...roles[0].packResources[0],assigned:'yes'}]}]}));
});

test('skill preparation routes require exact confirmation and remain outside the read-only stage',()=>{
 for(const gate of [allowedUpgrade,allowedRequest,allowed]){
  assert.equal(gate('POST',base+'prepare-review',{sourceKey:key,resourceId:'skill-1'}),true);
  assert.equal(gate('POST',base+'prepare-apply',{sourceKey:key,resourceId:'bindings',reviewToken:proof,confirmed:true}),true);
  for(const body of [{sourceKey:key,resourceId:'skill-1',reviewToken:proof},{sourceKey:key,resourceId:'skill-1',reviewToken:proof,confirmed:false},{sourceKey:key,resourceId:'skill-1',reviewToken:proof,confirmed:true,files:[]}])assert.equal(gate('POST',base+'prepare-apply',body),false);
 }
 for(const path of ['prepare-review','prepare-apply'])assert.equal(stage1Route('POST',base+path),false);
});
const preparation={kind:'package',sourceKey:key,resourceId:'skill-1',templateId:id,revision:2,name:'fictional-skill',reviewToken:proof,files:[{path:'SKILL.md',before:'Old guide',after:'New guide <script>unsafe</script>'}],specialties:[{id,name:'Fictional specialty'}],agents:[{id:'fictional-agent',name:'Fictional colleague'}],bindings:[]};
const blockedPreview={...preview,roles:[{...preview.roles[0],packResources:[{sourceId:'skill-1',name:'fictional-skill',status:'conflict',assigned:true}]}]};
test('shared skill review shows the full diff and all consumers and requires its own checkbox',async()=>{
 const f=fake(r=>({status:200,body:r.path.endsWith('preview')?blockedPreview:r.path.endsWith('prepare-review')?preparation:{kind:preparation.kind,sourceKey:key,resourceId:'skill-1',templateId:id,revision:3,name:preparation.name}})),c=new SpecialtyUpdateController(f.client);
 await c.load();await c.prepare(key,'skill-1');assert.equal(c.state.preparation.kind,'package');await c.apply();assert.equal(f.calls.length,2);
 let html=renderToStaticMarkup(React.createElement(SpecialtyUpdatesView,{controller:c,state:c.state,onClose(){}}));assert.match(html,/Fictional colleague/);assert.match(html,/Affected specialties/);assert.match(html,/shared skill/);assert.match(html,/&lt;script&gt;/);assert.match(html,/<button[^>]*disabled=""[^>]*>Save reviewed skill changes/);
 c.confirm(true);await c.apply();assert.equal(c.state.preparation,null);assert.equal(c.state.preparationReceipt.revision,3);assert.deepEqual(f.calls[2].body,{sourceKey:key,resourceId:'skill-1',reviewToken:proof,confirmed:true});await c.apply();assert.equal(f.calls.length,3);
});
test('lost skill apply responses discard the proof, fence context changes and never retry',async()=>{
 const f=fake(r=>r.path.endsWith('prepare-apply')?Promise.reject(Error('lost')):{status:200,body:r.path.endsWith('preview')?blockedPreview:preparation}),c=new SpecialtyUpdateController(f.client);
 await c.load();await c.prepare(key,'skill-1');c.confirm(true);await c.apply();assert.equal(c.state.phase,'unknown');assert.equal(c.state.preparation,null);await c.prepare(key,'skill-1');await c.apply();assert.equal(f.calls.length,3);
 const invalid={...preparation,files:[{path:'SKILL.md',before:'a',after:8}]};assert.throws(()=>upgradeResponse(base+'prepare-review',200,invalid));
 const hidden=upgradeResponse(base+'prepare-review',200,{...preparation,config:{secret:true}});assert.deepEqual(hidden,preparation);
});
test('binding review is allowed only after every required package matches',async()=>{
 const ready={...blockedPreview,roles:[{...blockedPreview.roles[0],packResources:[{sourceId:'skill-1',name:'fictional-skill',status:'current',assigned:false}]}]};
 const binding={...preparation,kind:'bindings',resourceId:'bindings',revision:1,name:'Fictional specialty',files:[],bindings:['fictional-skill']};const f=fake(r=>({status:200,body:r.path.endsWith('preview')?ready:binding})),c=new SpecialtyUpdateController(f.client);
 await c.load();await c.prepare(key,'bindings');assert.equal(c.state.preparation.kind,'bindings');const html=renderToStaticMarkup(React.createElement(SpecialtyUpdatesView,{controller:c,state:c.state,onClose(){}}));assert.match(html,/Tool access, memory and action permissions stay/);assert.match(html,/fictional-skill/);
});

test('deterministic skill refusal is an error rather than an uncertain save',async()=>{
 const f=fake(r=>({status:r.path.endsWith('prepare-apply')?400:200,body:r.path.endsWith('preview')?blockedPreview:r.path.endsWith('prepare-review')?preparation:{code:'invalid_skill'}})),c=new SpecialtyUpdateController(f.client);await c.load();await c.prepare(key,'skill-1');c.confirm(true);await c.apply();assert.equal(c.state.phase,'error');assert.equal(c.state.error,'invalid_skill');assert.equal(c.state.preparation,null);
});
