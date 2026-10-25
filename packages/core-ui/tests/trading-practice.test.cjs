require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {allowedRequest,SessionClient}=require('../src/session.ts'),{allowed}=require('../scripts/application-server.cjs'),{allowedPractice,practiceResponse,practiceRoute}=require('../src/trading-practice-contract.js'),{TradingPracticeController}=require('../src/trading-practice-controller.ts');
const base='/api/trading-paper/practice',id='00000000-0000-0000-0000-000000000001';
const inactive=()=>({mode:'practice',active:false,market:[{symbol:'DEMO-ALPHA',name:'Demo Alpha',priceMinor:1000},{symbol:'DEMO-BETA',name:'Demo Beta',priceMinor:2500},{symbol:'DEMO-GAMMA',name:'Demo Gamma',priceMinor:5000}],currency:'USD',initialCashMinor:1000000,feeBps:25,persistent:false});
const started=()=>({...inactive(),active:true,sessionId:id,expiresAt:1800000000000,cashMinor:1000000,marketValueMinor:0,equityMinor:1000000,netResultMinor:0,positions:[],orders:[],bot:{stopped:false,ticks:0,maxTicks:20}});
test('practice transport exact routes agree in browser and bridge; no provider/price/balance overrides',()=>{
 const body={sessionId:id,requestId:randomUUID(),symbol:'DEMO-ALPHA',side:'buy',quantity:1};
 for(const gate of [allowedPractice,allowedRequest,allowed]){
 assert.equal(gate('GET',base),true);assert.equal(gate('POST',base,{}),true);assert.equal(gate('POST',base+'/orders',body),true);
 for(const extra of [{priceMinor:1},{ownerId:'other'},{cash:1},{mode:'live'}])assert.equal(gate('POST',base+'/orders',{...body,...extra}),false);
 for(const path of [base+'?url=x',base+'/orders/../live',base+'/orders/',base+'%2forders','toString','constructor','__proto__'])assert.equal(gate('POST',path,body),false);
 assert.equal(gate('POST',base+'/orders',{...body,quantity:0}),false);assert.equal(gate('POST',base+'/orders',{...body,quantity:1.2}),false);
 }
 assert.equal(practiceRoute('toString'),null);
});
test('practice responses validate values, arithmetic, instrument identity and bounded arrays',()=>{
 for(const body of [inactive(),started()])assert.deepEqual(practiceResponse(base,200,practiceResponse(base,200,body)),body);
 for(const patch of [{priceMinor:1},{persistent:true},{currency:'EUR'},{cashMinor:1},{equityMinor:1000001},{netResultMinor:1},{market:[]},{positions:[{symbol:'REAL',quantity:1,costMinor:1,marketValueMinor:1}]},{orders:Array(201).fill({})},{bot:{stopped:false,ticks:21,maxTicks:20}}])assert.throws(()=>practiceResponse(base,200,{...started(),...patch}));
 assert.deepEqual(practiceResponse(base,500,{secret:'private',code:'private'}),{code:'practice_unavailable'});
});
function fixture(){let session={epoch:1,phase:'authenticated',user:{id:'owner',role:'owner'}},snapshot=inactive(),lost=false;const calls=[],listeners=new Set();
 const client={getSnapshot:()=>session,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},async request(r){calls.push(JSON.parse(JSON.stringify(r)));if(r.method==='GET')return {status:200,body:snapshot};if(r.path===base)snapshot=started();else if(r.path.endsWith('/orders')){const existing=snapshot.orders.find(x=>x.requestId===r.body.requestId);if(!existing){snapshot={...snapshot,cashMinor:998997,marketValueMinor:1000,equityMinor:999997,netResultMinor:-3,positions:[{symbol:'DEMO-ALPHA',quantity:1,costMinor:1000,marketValueMinor:1000}],orders:[{id:randomUUID(),requestId:r.body.requestId,quantity:1,priceMinor:1000,feeMinor:3,totalMinor:1003,symbol:'DEMO-ALPHA',side:'buy',createdAt:1000,source:'manual'}]};}if(lost){lost=false;throw Error('lost response');}}return {status:200,body:snapshot};}};
 return {client,calls,get snapshot(){return snapshot;},setLost:()=>lost=true,switchRole:role=>{session={...session,epoch:2,user:{id:'other',role}};listeners.forEach(fn=>fn());}};
}
test('unknown write is held, never retried automatically, and explicit retry reuses its exact id',async()=>{
 const f=fixture(),c=new TradingPracticeController(f.client);await c.load();await c.start();f.setLost();await c.order('DEMO-ALPHA','buy',1);assert.equal(c.getSnapshot().phase,'unknown');const request=f.calls.at(-1);await c.order('DEMO-ALPHA','buy',1);assert.deepEqual(f.calls.at(-1),request);await c.retry();assert.deepEqual(f.calls.at(-1),request);assert.equal(c.getSnapshot().snapshot.orders.length,1);assert.equal(c.getSnapshot().phase,'ready');c.close();
});
test('readback confirms a lost fill; owner/epoch change wipes state and blocks new requests',async()=>{
 const f=fixture(),c=new TradingPracticeController(f.client);await c.load();await c.start();f.setLost();await c.order('DEMO-ALPHA','buy',1);await c.load();assert.equal(c.getSnapshot().phase,'ready');assert.equal(c.getSnapshot().snapshot.orders.length,1);f.switchRole('user');assert.equal(c.getSnapshot().phase,'closed');assert.equal(c.getSnapshot().snapshot,null);const n=f.calls.length;await c.load();await c.order('DEMO-ALPHA','buy',1);assert.equal(f.calls.length,n);
});
test('a member cannot forward practice routes through SessionClient',async()=>{
 let forwarded=0;const user={id:'member',username:'Member',email:'member@example.invalid',role:'user'},client=new SessionClient({mock:async r=>{if(r.path==='/api/auth/login')return {status:200,body:{token:'fixture',user}};if(r.path==='/api/auth/me')return {status:200,body:{user}};forwarded++;return {status:200,body:inactive()};}});client.selectMode('mock');await client.login(user.email,'fixture');await assert.rejects(client.request({method:'GET',path:base}));assert.equal(forwarded,0);
});
