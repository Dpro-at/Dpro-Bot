require('./load.cjs');const {test}=require('node:test');const assert=require('node:assert/strict');const React=require('../node_modules/react');const {renderToStaticMarkup}=require('../node_modules/react-dom/server');
const {allowedRequest,SessionClient}=require('../src/session.ts');const {allowed}=require('../scripts/application-server.cjs');
const {STORE_PATH,STORE_INSTALL_PATH,STORE_UNINSTALL_PATH,storeResponse}=require('../src/apps-contract.js');const {StoreWorkspace,viewItems,sortStore,matchStore,sourceChip,itemName,STORE_KINDS}=require('../src/StoreView.tsx');
const hash='a'.repeat(64);
const item=(id,more={})=>({id,kind:'app',source:id.startsWith('claude-code:')?'claude-code':'girru',name:id.split(':')[1],summary:'One line.',description:'',icon:null,maker:'Maker',verified:false,version:null,updated:null,category:'developer',permissions:[],worksWith:[],languages:[],state:id.startsWith('girru:')?'included':id.startsWith('registry:')?'available':'elsewhere',present:false,update:null,hash,...more});
const raw={schema:1,featured:'girru:genvr',collections:[{id:'made-by-girru',title:'Made by Girru',items:['girru:genvr','gone']}],categories:[{id:'developer',title:'Developer tools',icon:'code'}],limited:[],
 items:[item('girru:genvr',{name:'GenVR',icon:'globe',category:'worlds',description:'3D worlds.'}),item('registry:weather',{name:'Weather',updated:'2026-10-29',description:'Reads a code review list.',permissions:['Read the weather'],download_url:'https://example.invalid/x.zip',rating_avg:5}),item('claude-code:code-review@acme',{name:'code-review',kind:'skill'})]};

test('the store routes are exact and shaped in both request gates',()=>{
 for(const gate of [allowedRequest,allowed]){
  assert.equal(gate('GET',STORE_PATH,undefined),true);assert.equal(gate('GET',STORE_PATH+'?source=x',undefined),false);assert.equal(gate('POST',STORE_PATH,{}),false);
  assert.equal(gate('POST',STORE_INSTALL_PATH,{id:'registry:weather',hash}),true);
  for(const body of [{id:'registry:weather'},{id:'registry:weather',hash,force:true},{id:'../x',hash},{id:'registry:weather',hash:'short'}])assert.equal(gate('POST',STORE_INSTALL_PATH,body),false,JSON.stringify(body));
  assert.equal(gate('POST',STORE_UNINSTALL_PATH,{id:'registry:weather'}),true);assert.equal(gate('POST',STORE_UNINSTALL_PATH,{id:'registry:weather',hash}),false);assert.equal(gate('GET',STORE_UNINSTALL_PATH,undefined),false);
 }
});
test('the reply keeps only contract fields, survives a second projection and refuses unknown states',()=>{
 const once=storeResponse(STORE_PATH,200,raw),twice=storeResponse(STORE_PATH,200,once);
 assert.deepEqual(twice,once);assert.deepEqual(once.collections[0].items,['girru:genvr']);
 const keys=new Set(once.items.flatMap(Object.keys));for(const k of ['download_url','rating_avg'])assert.ok(!keys.has(k),k);
 assert.throws(()=>storeResponse(STORE_PATH,200,{...raw,items:[{...raw.items[0],state:'paid'}]}));
 assert.throws(()=>storeResponse(STORE_PATH,200,{...raw,items:[{...raw.items[0],icon:'<svg/>'}]}));
 assert.deepEqual(storeResponse(STORE_PATH,503,{}),{code:'store_unavailable'});
 assert.deepEqual(storeResponse(STORE_INSTALL_PATH,200,{ok:true,state:'installed'}),{ok:true,state:'installed'});
 assert.deepEqual(storeResponse(STORE_INSTALL_PATH,409,{code:'changed',message:'It changed.',hash}),{code:'changed',message:'It changed.'});
});
test('members cannot reach the store',async()=>{let forwarded=0;const user={id:'store-member',email:'member@example.test',username:'Member',role:'user'};const c=new SessionClient({mock:async r=>{if(r.path==='/api/auth/login')return {status:200,body:{token:'fixture',user}};if(r.path==='/api/auth/me')return {status:200,body:{user}};forwarded++;return {status:200,body:{}};}});c.selectMode('mock');await c.login('member@example.test','fixture');
 await assert.rejects(c.request({method:'GET',path:STORE_PATH}));await assert.rejects(c.request({method:'POST',path:STORE_INSTALL_PATH,body:{id:'registry:weather',hash}}));assert.equal(forwarded,0);});
test('kinds, the category row, New · A–Z, search order and words',()=>{
 const data=storeResponse(STORE_PATH,200,raw),v=(x)=>({kind:'all',category:'all',shelf:null,...x});
 assert.deepEqual(STORE_KINDS.map(k=>k[1]),['All','Apps','MCP servers','Skills','Specialties']);
 assert.deepEqual(viewItems(data,v({category:'developer'}),'az').map(x=>x.id),['claude-code:code-review@acme','registry:weather']);
 assert.deepEqual(viewItems(data,v({category:'developer'}),'new').map(x=>x.id),['registry:weather','claude-code:code-review@acme'],'newest first');
 assert.deepEqual(viewItems(data,v({kind:'skill'}),'new').map(x=>x.id),['claude-code:code-review@acme']);
 assert.deepEqual(viewItems(data,v({kind:'mcp'}),'new'),[]);
 assert.deepEqual(viewItems(data,v({shelf:'girru'}),'new').map(x=>x.id),['girru:genvr']);
 assert.deepEqual(sortStore(data.items,'new').map(x=>x.id),['registry:weather','girru:genvr','claude-code:code-review@acme']);
 assert.deepEqual(matchStore(data.items,'review').map(x=>x.id),['claude-code:code-review@acme','registry:weather'],'names first, every kind');
 assert.deepEqual(matchStore(data.items,'  '),[]);
 assert.deepEqual(data.items.map(sourceChip),['Made by Girru','Girru’s registry','Claude Code add-on']);assert.equal(itemName(data.items[2]),'Code review');
});
test('the store page: kinds in the sidebar, one featured app, two shelves, no ratings, counts or prices',()=>{
 const data=storeResponse(STORE_PATH,200,raw);let reads=0;
 const client={getSnapshot:()=>({user:{id:'o',username:'Owner',email:'o@example.test',role:'owner'}}),request:async()=>{reads++;return {status:200,body:data};}};
 const props={onOpenApp(){},onPermissions(){},onAccounts(){}};
 const html=renderToStaticMarkup(React.createElement(StoreWorkspace,{client,active:false,...props}));
 const nav=html.split('</nav>')[0];const order=['All','My apps','Apps','MCP servers','Skills','Specialties'].map(k=>nav.indexOf('>'+k+'<'));assert.ok(order.every((x,i)=>x>0&&(i===0||x>order[i-1])),'All, then My apps, then the kinds');assert.doesNotMatch(nav,/Find more/);for(const gone of ['Home','Categories','From','Mine','Updates'])assert.doesNotMatch(nav,new RegExp('>'+gone+'<'),gone);
 // SA6: the owner's Store opens on All; members have My apps only.
 assert.match(html,/<h2>All<\/h2>/);assert.match(html,/Reading the store/);assert.equal(reads,0,'nothing is read while rendering');
 const member=renderToStaticMarkup(React.createElement(StoreWorkspace,{client:{...client,getSnapshot:()=>({user:{id:'m',role:'user'}})},active:false,...props}));
 assert.match(member,/<h2>My apps<\/h2>/);assert.doesNotMatch(member,/>All<|>MCP servers<|aria-label="More"/,'members have My apps only');assert.match(member,/aria-label="Look again"/);
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/StoreView.tsx'),'utf8');
 assert.match(src,/title:'Made by Girru'/);assert.match(src,/title:'New in the store'/);assert.match(src,/s==='new'\?'New':'A–Z'/);assert.doesNotMatch(src,/★|rating_avg|install_count|installCount/);
});
