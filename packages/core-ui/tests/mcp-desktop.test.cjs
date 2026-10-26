require('./load.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('../node_modules/react');
const {renderToStaticMarkup}=require('../node_modules/react-dom/server');
const {stateOf,nextStep,problemReason,commandLine,roundTrips,exactLine,guessKind,guessName,planGrants,restoreGrants,useLevel,writeAgent,loadAgentUse,toolPrefix}=require('../src/mcp-desktop.ts');
const {ConnectorsController,splitArgs}=require('../src/connectors.ts');
const {McpWorkspace,McpConnectionDialogs}=require('../src/McpWorkspace.tsx');

const ID='0f8fad5b-d9cb-469f-a165-70867728950e';
const base={id:ID,name:'calendar',description:'Team calendar',transport:'stdio',command:'npx',args:['-y','@scope/calendar-server','--port','3333'],url:null,allowRemote:false,envNames:['CALENDAR_KEY'],headerNames:[],enabled:false,active:true,launchApproved:false,status:'disabled',lastError:null,lastDiscoveredAt:null,tools:[]};
const fixed=server=>({request:async r=>r.method==='GET'?{status:200,body:{servers:[server]}}:{status:500,body:{}}});
async function loaded(server){const c=new ConnectorsController(fixed(server));await c.load();return c;}
const primaries=html=>html.match(/<button[^>]*class="primary"[^>]*>[^<]*/g)??[];

test('MC1 plain states and the one next step that fits',()=>{
 assert.equal(stateOf(base).words,'Off');
 assert.equal(stateOf({...base,enabled:true,active:false}).words,'Blocked by this computer’s settings');
 assert.equal(stateOf({...base,enabled:true,lastError:'mcp_http: 401 Unauthorized'}).words,'Needs you · wrong key');
 assert.equal(stateOf({...base,enabled:true,connectionState:'connected'}).words,'Connected');
 assert.equal(problemReason('spawn npx ENOENT'),'program not found');
 assert.deepEqual([nextStep(base).action,nextStep(base).label],['enable','Turn on…']);
 assert.equal(nextStep({...base,transport:'http',url:'http://127.0.0.1:9/mcp'}).label,'Turn on');
 assert.equal(nextStep({...base,enabled:true,active:false}).action,null,'a blocked program offers no way around the computer setting');
 assert.equal(nextStep({...base,enabled:true,lastError:'x'}).action,'reconnect');
 assert.equal(nextStep({...base,enabled:true,connectionState:'connected'}).action,null);
});

test('MC2a one command line round-trips; names and kinds are filled from a paste',()=>{
 const line=commandLine('npx',['-y','@scope/calendar-server','--port','3333']);assert.equal(line,'npx -y @scope/calendar-server --port 3333');
 assert.deepEqual(splitArgs(commandLine('node',['my server.js',''])),['node','my server.js','']);
 assert.equal(roundTrips('node',['say "hi" it\'s']),false,'parts with both quotes are edited one by one');
 assert.equal(exactLine('node',['a b','c']),'node "a b" c');
 assert.equal(guessKind('https://mcp.github.example/v1'),'web');assert.equal(guessKind('npx -y pkg'),'program');
 assert.equal(guessName('npx -y @scope/calendar-server --port 3333'),'calendar');
 assert.equal(guessName('https://mcp.github.example/v1'),'github');
 assert.match(guessName('node /Users/someone/Tools/Files Server.js'),/^[a-z0-9-]{0,24}$/);
});

test('choosing agents changes only this connection’s tools and undo restores only them',async()=>{
 const p=toolPrefix('calendar'),tools=['mcp__calendar__list','mcp__calendar__add'];
 assert.deepEqual(planGrants(['read','mcp__calendar__list'],tools,p,true),['read','mcp__calendar__list','mcp__calendar__add']);
 assert.deepEqual(planGrants(['read','mcp__calendar__list','mcp__github__x'],tools,p,false),['read','mcp__github__x']);
 assert.deepEqual(restoreGrants(['read','web','mcp__calendar__list','mcp__calendar__add'],['read','mcp__calendar__list'],p),['read','web','mcp__calendar__list'],'later changes to other tools are kept');
 assert.equal(useLevel({grants:['mcp__calendar__list'],tools},p),'some');assert.equal(useLevel({grants:tools,tools},p),'all');assert.equal(useLevel({grants:['read'],tools},p),'none');
 const calls=[];let grants=['read'];
 const client={request:async r=>{calls.push(r);if(r.path==='/api/agents')return {status:200,body:{agents:[{id:'main-agent',name:'Main'},{id:'small-local-agent',name:'Small'}]}};if(r.method==='GET')return {status:200,body:{version:4,grants:grants.map(tool=>({tool})),available:[{name:'mcp__calendar__list',allowedByServer:true},{name:'mcp__calendar__add',allowedByServer:false},{name:'read',allowedByServer:true}]}};grants=r.body.grants;return {status:200,body:{version:5,grants:[]}};}};
 const use=await loadAgentUse(client,{...base});assert.deepEqual(use.map(a=>a.id),['main-agent'],'the small local agent is never offered connection tools');assert.deepEqual(use[0].tools,['mcp__calendar__list'],'tools blocked by this computer are not granted');
 const before=await writeAgent(client,'main-agent',(g,t)=>planGrants(g,t,p,true),p);
 assert.deepEqual(before,['read']);const put=calls.find(r=>r.method==='PUT');assert.equal(put.path,'/api/agents/main-agent/tool-grants');assert.deepEqual(put.body,{grants:['read','mcp__calendar__list'],expectedVersion:4,keepScopes:true});
 assert.ok(calls.every(r=>!/\/api\/mcp\/servers/.test(r.path)),'choosing agents never starts or changes the connection');
});

test('MC1 window: off program offers one filled "Turn on…"; blocked offers none; no stat tiles',async()=>{
 const off=renderToStaticMarkup(React.createElement(McpWorkspace,{client:{},controller:await loaded(base),active:false,openId:ID}));
 assert.deepEqual(primaries(off).map(b=>b.replace(/.*>/,'')),['Turn on…']);assert.match(off,/Ready to start\. Turning it on asks you once/);assert.match(off,/Turning on never gives tools to agents/);assert.match(off,/Program on this computer · off/);assert.doesNotMatch(off,/stdio|transport/i);
 const blocked=renderToStaticMarkup(React.createElement(McpWorkspace,{client:{},controller:await loaded({...base,enabled:true,active:false}),active:false,openId:ID}));
 assert.equal(primaries(blocked).length,0);assert.match(blocked,/administrator must allow/);
 const tools=renderToStaticMarkup(React.createElement(McpWorkspace,{client:{},controller:await loaded({...base,enabled:true,connectionState:'connected',lastDiscoveredAt:'2026-10-03T10:00:00Z',tools:[{name:'publish_world',title:null,description:'Publishes',requiresApproval:true,requiresApprovalOverride:null}]}),active:false,openId:ID}));
 assert.match(tools,/publish world/);assert.match(tools,/asks first/);assert.match(tools,/found last time/);assert.match(tools,/When publish world asks first/);
});

test('MC2 sheets keep every owner gate: exact program, one-time allow, remove cannot be undone',async()=>{
 const c=await loaded(base);
 const add=renderToStaticMarkup(React.createElement(McpConnectionDialogs,{c,setup:'new',onSetup(){},remove:null,onRemove(){},onSaved(){},onRemoved(){}}));
 for(const label of ['Add a connection','Program on this computer','Web address','Command','What it is for','Add a secret','Advanced','Saved off. Secrets are stored encrypted'])assert.ok(add.includes(label),label);assert.doesNotMatch(add,/stdio/);
 const gate=new ConnectorsController({request:async r=>r.method==='GET'?{status:200,body:{servers:[base]}}:{status:409,body:{code:'launch_approval_required',error:'x',launch:{command:'npx',args:['-y','@scope/calendar-server','--port','3333'],envNames:['CALENDAR_KEY']},launchHash:'sha256:abc'}}});await gate.load();await gate.enable(ID);
 const allow=renderToStaticMarkup(React.createElement(McpConnectionDialogs,{c:gate,setup:null,onSetup(){},remove:null,onRemove(){},onSaved(){},onRemoved(){}}));
 assert.match(allow,/Allow calendar to run this program\?/);assert.match(allow,/npx -y @scope\/calendar-server --port 3333/);assert.match(allow,/CALENDAR_KEY/);assert.match(allow,/Allow and turn on/);assert.match(allow,/asks again/);assert.equal(gate.getSnapshot().servers[0].enabled,false,'nothing runs before the owner allows it');
 const edit=renderToStaticMarkup(React.createElement(McpConnectionDialogs,{c,setup:base,onSetup(){},remove:null,onRemove(){},onSaved(){},onRemoved(){}}));assert.match(edit,/Edit calendar/);assert.match(edit,/Saved: CALENDAR_KEY \(hidden\)/);assert.doesNotMatch(edit,/type="password"[^>]*value="[^"]+"/);
 const rm=renderToStaticMarkup(React.createElement(McpConnectionDialogs,{c,setup:null,onSetup(){},remove:{...base,enabled:true},onRemove(){},onSaved(){},onRemoved(){}}));assert.match(rm,/Remove calendar\?/);assert.match(rm,/cannot be undone/);assert.match(rm,/Turn off instead/);
});
