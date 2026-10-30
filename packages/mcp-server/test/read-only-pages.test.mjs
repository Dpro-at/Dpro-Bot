import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';

const SECRET=/sk-live|cred-1|SYSTEM-PROMPT|ABCD-1234|deadbeef|tok-1|secret-value|ENV-VALUE/;
function fake(routes){const calls=[];return {calls,backend:{async request(method,path,body){calls.push({method,path,body});if(!Object.hasOwn(routes,path))throw Error('unexpected '+method+' '+path);return structuredClone(routes[path]);}}};}
async function refused(tool,input,calls,pattern){const n=calls.length,r=await callTool(tool,input,{backend:{async request(m,p,b){calls.push({method:m,path:p,body:b});return {};}}});assert.equal(r.isError,true,JSON.stringify(input));assert.equal(calls.length,n,'no backend call for '+JSON.stringify(input));if(pattern)assert.match(r.content[0].text,pattern);}

const agentRow={id:'main-agent',name:'Main',emoji:'*',role:'main',department:'ops',model:'qwen',provider:'ollama',isPrimary:true,description:'Leads',system_prompt:'SYSTEM-PROMPT',api_key:'sk-live',api_key_credential_id:'cred-1',apiKeySet:true,temperature:0.2};

test('agents tool reads list, one agent and permissions with GET only and strips keys and prompts',async()=>{
 const {calls,backend}=fake({'/api/agents':{agents:[agentRow]},'/api/agents/main-agent':{agent:agentRow},'/api/agents/main-agent/permissions':{agentId:'main-agent',modes:{money:'ask'},version:2,token:'tok-1',nested:{apiKey:'sk-live',ok:true}}});
 const list=await callTool('agents',{operation:'list'},{backend});assert.notEqual(list.isError,true);
 assert.deepEqual(list.structuredContent.agents[0],{id:'main-agent',name:'Main',emoji:'*',role:'main',department:'ops',specialty:null,model:'qwen',provider:'ollama',isMainAgent:true,description:'Leads'});
 const one=await callTool('agents',{operation:'read',id:'main-agent'},{backend});assert.equal(one.structuredContent.agent.name,'Main');
 const perms=await callTool('agents',{operation:'permissions',id:'main-agent'},{backend});assert.deepEqual(perms.structuredContent.permissions,{agentId:'main-agent',modes:{money:'ask'},version:2,nested:{ok:true}});
 assert.deepEqual(calls.map(c=>[c.method,c.path,c.body]),[['GET','/api/agents',undefined],['GET','/api/agents/main-agent',undefined],['GET','/api/agents/main-agent/permissions',undefined]]);
 for(const r of [list,one,perms])assert.doesNotMatch(JSON.stringify(r),SECRET);
 for(const op of ['rename','update','set_role','set_main','set_primary','duplicate','hire','create','remove','delete'])await refused('agents',{operation:op,id:'main-agent'},calls,/owner in the app/);
 for(const input of [{operation:'read'},{operation:'read',id:'../x'},{operation:'read',id:'a/b'},{operation:'list',id:'x'},{operation:'permissions'},{operation:'nope'}])await refused('agents',input,calls);
 assert.match(TOOL_DEFINITIONS.find(t=>t.name==='agents').description,/Renaming an agent, role, main agent, duplicate, hire and remove are done by the owner in the app/);
});

test('approvals tool reads waiting, history, permissions, rules and coverage with GET only',async()=>{
 const row={id:'00000000-0000-0000-0000-0000000000aa',status:'pending',agentId:'main-agent',toolName:'send_email',paramsPreview:{to:'a@b.c',password:'secret-value'},paramsHash:'deadbeef',code:'ABCD-1234'};
 const {calls,backend}=fake({
  '/api/approvals?status=pending':{approvals:[row]},
  '/api/approvals?limit=100':{approvals:[row]},
  '/api/approvals?status=denied&limit=100':{approvals:[]},
  '/api/approvals?agentId=main-agent&limit=100':{approvals:[row]},
  '/api/agents':{agents:[agentRow,{id:'small-local-agent',name:'Small'}]},
  '/api/agents/main-agent/permissions':{agentId:'main-agent',modes:{delete:'ask'},version:1,fingerprint:'deadbeef'},
  '/api/reviewer-policies':{items:[{id:'00000000-0000-0000-0000-0000000000bb',name:'Money',status:'active',policyHash:'deadbeef'}],nextCursor:null},
  '/api/reviewer-policies?cursor=00000000-0000-0000-0000-0000000000bb':{items:[],nextCursor:null},
  '/api/security/coverage':{scope:'workspace_catalogue',limited:false,separatePaths:[],tools:[{name:'send_email',category:'message',independentApproval:true,secret:'secret-value'}]},
 });
 const results=[];
 for(const input of [{operation:'waiting'},{operation:'history'},{operation:'history',status:'denied'},{operation:'history',agentId:'main-agent'},{operation:'permissions'},{operation:'permissions',agentId:'main-agent'},{operation:'rules'},{operation:'rules',cursor:'00000000-0000-0000-0000-0000000000bb'},{operation:'coverage'}]){
  const r=await callTool('workspace_approvals',input,{backend});assert.notEqual(r.isError,true,JSON.stringify(input)+r.content[0].text);results.push(r);
 }
 assert.ok(calls.every(c=>c.method==='GET'&&c.body===undefined));
 assert.deepEqual(calls.map(c=>c.path),['/api/approvals?status=pending','/api/approvals?limit=100','/api/approvals?status=denied&limit=100','/api/approvals?agentId=main-agent&limit=100','/api/agents','/api/agents/main-agent/permissions','/api/agents/main-agent/permissions','/api/reviewer-policies','/api/reviewer-policies?cursor=00000000-0000-0000-0000-0000000000bb','/api/security/coverage']);
 for(const r of results)assert.doesNotMatch(JSON.stringify(r),SECRET);
 assert.equal(results[0].structuredContent.approvals[0].toolName,'send_email');assert.equal(results[0].structuredContent.approvals[0].paramsPreview.to,'a@b.c');
 assert.equal(results[4].structuredContent.agents.length,1);assert.equal(results[4].structuredContent.agents[0].permissions.modes.delete,'ask');
 assert.equal(results[6].structuredContent.items[0].name,'Money');assert.equal(results[8].structuredContent.tools[0].independentApproval,true);
 for(const op of ['approve','allow','allow_always','deny','reject','vote','cast','verify','rule_save','activate','revoke','rule_off','turn_off','set_permissions','change_permissions','change_task','edit_task','edit_request'])await refused('workspace_approvals',{operation:op,id:row.id},calls,/owner in the app/);
 for(const input of [{operation:'history',status:'weird'},{operation:'history',status:'denied',agentId:'main-agent'},{operation:'history',agentId:'../x'},{operation:'rules',cursor:'x&y=1'},{operation:'waiting',agentId:'main-agent'},{operation:'coverage',body:{}},{operation:'other'}])await refused('workspace_approvals',input,calls);
});

test('workspace_apps reads channels, accounts, addons and catalogue with GET only and never returns keys or codes',async()=>{
 const {calls,backend}=fake({
  '/api/agent-connect/catalog':{configurable:true,channels:[{id:'telegram',label:'Telegram',enabled:false,hasSecrets:true,allowedUsers:['me'],environment:{TELEGRAM_BOT_TOKEN:'ENV-VALUE'},botToken:'tok-1',requiredEnv:['TELEGRAM_BOT_TOKEN']}]},
  '/api/connections':{connections:[{id:'genvr',status:'connecting',account:{name:'Me'},pending:{userCode:'ABCD-1234',verificationUri:'https://genvr.example/link'},accessToken:'tok-1'}]},
  '/api/chat/addons':{items:[{name:'lint',source:'codex',kind:'plugin',enabled:true,count:1}],sources:[]},
  '/api/marketplace/search?limit=100&offset=0':{total:1,items:[{id:'calendar',name:'Calendar',type:'app',apiKey:'sk-live'}]},
  '/api/chat/addons/catalogue':{items:[{id:'fmt',name:'Format',source:'claude-code',present:false}],sources:[]},
  '/api/apps':{items:[{id:'code',name:'Code',kind:'builtin'},{id:'mcp:00000000-0000-0000-0000-000000000001',name:'private-connection',kind:'mcp'}]},
 });
 const results=[];
 for(const operation of ['channels','accounts','addons','catalogue']){const r=await callTool('workspace_apps',{operation},{backend});assert.notEqual(r.isError,true,operation);results.push(r);}
 assert.ok(calls.every(c=>c.method==='GET'&&c.body===undefined));
 assert.deepEqual(calls.map(c=>c.path),['/api/agent-connect/catalog','/api/connections','/api/chat/addons','/api/apps','/api/marketplace/search?limit=100&offset=0','/api/chat/addons/catalogue']);
 assert.deepEqual(results[3].structuredContent.included.map(x=>x.id),['code'],'included lists the apps that come with Girru, not MCP connections');
 for(const r of results)assert.doesNotMatch(JSON.stringify(r),SECRET);
 const ch=results[0].structuredContent.channels.channels[0];assert.equal(ch.label,'Telegram');assert.equal(ch.hasSecrets,true);assert.equal(ch.environment,undefined);
 assert.equal(results[1].structuredContent.accounts.connections[0].pending.verificationUri,'https://genvr.example/link');
 assert.equal(results[3].structuredContent.apps.items[0].name,'Calendar');assert.equal(results[3].structuredContent.codingApps.items[0].name,'Format');
 for(const op of ['channel_on','channel_off','activate','keys','set_keys','config','who_may_write','connect','genvr_connect','disconnect','publish','upload'])await refused('workspace_apps',{operation:op},calls,/owner in the app/);
 for(const input of [{operation:'channels',id:'telegram'},{operation:'accounts',connection:{}}])await refused('workspace_apps',input,calls);
 assert.match(TOOL_DEFINITIONS.find(t=>t.name==='workspace_apps').description,/stay with the owner in the app/);
});

test('personality_library refuses No on a suggestion like Yes, and still reads proposals',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {proposals:[]};}};
 const proposalId='00000000-0000-0000-0000-0000000000cc';
 for(const operation of ['reject','approve']){const n=calls.length,r=await callTool('personality_library',{operation,id:'agent-one',proposalId,body:{}},{backend});assert.equal(r.isError,true);assert.match(r.content[0].text,/Approving or declining a suggestion is done by the owner in the app/);assert.equal(calls.length,n);}
 assert.notEqual((await callTool('personality_library',{operation:'proposals',id:'agent-one'},{backend})).isError,true);assert.deepEqual(calls.at(-1),{method:'GET',path:'/api/agents/agent-one/personality/proposals',body:undefined});
 assert.notEqual((await callTool('personality_library',{operation:'proposal',id:'agent-one',proposalId},{backend})).isError,true);assert.deepEqual(calls.at(-1),{method:'GET',path:'/api/agents/agent-one/personality/proposals/'+proposalId,body:undefined});
 const ops=TOOL_DEFINITIONS.find(t=>t.name==='personality_library').inputSchema.properties.operation.enum;assert.ok(!ops.includes('reject')&&!ops.includes('approve'));
});

test('agents tool: departments read, rename a department and move one agent, nothing else',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});if(path==='/api/agents'&&method==='GET')return {agents:[agentRow,{...agentRow,id:'b',name:'Bo',isPrimary:false,department:null,api_key:'sk-live'}]};if(path==='/api/agents/b'&&method==='GET')return {agent:{...agentRow,id:'b',version:4}};if(path==='/api/agents/b'&&method==='PUT')return {agent:{...agentRow,id:'b',department:body.department}};if(path==='/api/agents/departments/rename')return {from:body.from,to:body.to,moved:1};throw Error('unexpected '+method+' '+path);}};
 const d=await callTool('agents',{operation:'departments'},{backend});assert.notEqual(d.isError,true);
 assert.deepEqual(d.structuredContent,{departments:[{department:'ops',agents:[{id:'main-agent',name:'Main'}]}],noDepartment:[{id:'b',name:'Bo'}]});assert.doesNotMatch(JSON.stringify(d),SECRET);
 const r=await callTool('agents',{operation:'rename_department',from:'ops',to:' Field  Ops '},{backend});assert.notEqual(r.isError,true);assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/agents/departments/rename',body:{from:'ops',to:'field ops'}});
 const m=await callTool('agents',{operation:'set_department',id:'b',department:'sales'},{backend});assert.notEqual(m.isError,true);assert.deepEqual(calls.at(-1),{method:'PUT',path:'/api/agents/b',body:{expectedVersion:4,department:'sales'}});
 await callTool('agents',{operation:'set_department',id:'b',department:null},{backend});assert.deepEqual(calls.at(-1).body,{expectedVersion:4,department:null});
 for(const input of [{operation:'rename_department',from:'ops'},{operation:'rename_department',from:'ops',to:'x'.repeat(65)},{operation:'rename_department',from:'ops',to:'Ops!'},{operation:'rename_department',from:'ops',to:'a',id:'b'},{operation:'set_department',department:'a'},{operation:'set_department',id:'../x',department:'a'},{operation:'departments',id:'b'}])await refused('agents',input,calls);
});

test('agents tool: org chart reads, set_reports_to and add_sub_agent with the app\u2019s gates',async()=>{
 const sub={...agentRow,id:'helper-1',name:'Helper',isPrimary:false,manager:'b',placed:'sub',subAgentOf:'b'};
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});
  if(path==='/api/agents'&&method==='GET')return {agents:[{...agentRow,manager:null,placed:'main',subAgentOf:null},{...agentRow,id:'b',name:'Bo',isPrimary:false,manager:'main-agent',placed:'auto',subAgentOf:null},sub,{id:'small-local-agent',name:'Small',placed:'none'}]};
  if(path==='/api/agents/b/sub-agent-work')return {work:[{id:'w1',kind:'helper',agentId:'helper-1',status:'running',summary:null,token:'tok-1'}]};
  if(path==='/api/agents/b/reports-to')return {id:'b',reportsTo:body.reportsTo,version:3};
  if(path==='/api/agents/b/tool-grants')return {available:[{name:'memory_search',execClass:false,requiresApproval:false},{name:'exec',execClass:true,requiresApproval:true},{name:'memory_forget',execClass:false,requiresApproval:true}]};
  if(path==='/api/agents/b/sub-agents')return {agent:{...sub,id:'helper-2',name:body.name??'Helper 2'}};
  throw Error('unexpected '+method+' '+path);}};
 const org=await callTool('agents',{operation:'org'},{backend});assert.notEqual(org.isError,true);
 assert.deepEqual(org.structuredContent.agents.map(a=>[a.id,a.manager,a.placed,a.subAgentOf]),[['main-agent',null,'main',null],['b','main-agent','auto',null],['helper-1','b','sub','b']]);
 assert.doesNotMatch(JSON.stringify(org),SECRET);
 assert.deepEqual((await callTool('agents',{operation:'sub_agents',id:'b'},{backend})).structuredContent.subAgents.map(a=>a.id),['helper-1']);
 const work=await callTool('agents',{operation:'sub_agent_work',id:'b'},{backend});assert.equal(work.structuredContent.work[0].status,'running');assert.doesNotMatch(JSON.stringify(work),SECRET);
 await callTool('agents',{operation:'set_reports_to',id:'b',reportsTo:'main-agent'},{backend});assert.deepEqual(calls.at(-1),{method:'PUT',path:'/api/agents/b/reports-to',body:{reportsTo:'main-agent'}});
 await callTool('agents',{operation:'set_reports_to',id:'b',reportsTo:null},{backend});assert.deepEqual(calls.at(-1).body,{reportsTo:null});
 const added=await callTool('agents',{operation:'add_sub_agent',id:'b',name:' Checker ',tools:['memory_search']},{backend});assert.notEqual(added.isError,true,added.content[0].text);
 assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/agents/b/sub-agents',body:{startsAs:'copy',tools:['memory_search'],name:'Checker'}});
 for(const tools of [['exec'],['memory_forget'],['unknown_tool']]){const n=calls.length;const r=await callTool('agents',{operation:'add_sub_agent',id:'b',tools},{backend});assert.equal(r.isError,true);assert.match(r.content[0].text,/owner gives it/);assert.ok(calls.slice(n).every(c=>c.method==='GET'),'nothing created');}
 for(const input of [{operation:'set_reports_to',id:'b'},{operation:'set_reports_to',id:'b',reportsTo:'../x'},{operation:'add_sub_agent',id:'b'},{operation:'add_sub_agent',id:'b',tools:[],startsAs:'specialty'},{operation:'org',id:'b'},{operation:'sub_agents'},{operation:'sub_agent_work',id:'a/b'}])await refused('agents',input,calls);
 for(const op of ['remove','delete'])await refused('agents',{operation:op,id:'helper-1'},calls,/owner in the app/);
});

test('agents tool: agent files read, write_file only for Knowledge on a fresh version',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});
  if(path==='/api/agents/b/library')return {files:[{name:'PERSONALITY.md',kind:'who',size:10,read:true},{name:'MEMORY.md',kind:'mind',size:5,read:true},{name:'notes.md',kind:'knowledge',size:3,read:false}],removed:[]};
  if(path.startsWith('/api/agents/b/library/file?'))return {name:'notes.md',kind:'knowledge',content:'hi',hash:'a'.repeat(64),managed:null,token:'tok-1'};
  if(path==='/api/agents/b/library/file'&&method==='PUT')return {hash:'b'.repeat(64),redacted:false};
  if(path==='/api/agents/b/library/file'&&method==='POST')return {hash:'c'.repeat(64),redacted:true};
  if(path==='/api/agents/b/library/read')return {name:body.name,read:body.read};
  throw Error('unexpected '+method+' '+path);}};
 const f=await callTool('agents',{operation:'files',id:'b'},{backend});assert.notEqual(f.isError,true);
 assert.deepEqual(f.structuredContent.files.map(x=>[x.name,x.kind,x.read]),[['PERSONALITY.md','who it is',true],['MEMORY.md','what it keeps in mind',true],['notes.md','knowledge',false]]);
 const one=await callTool('agents',{operation:'file',id:'b',name:'notes.md'},{backend});assert.equal(one.structuredContent.content,'hi');assert.doesNotMatch(JSON.stringify(one),SECRET);
 await callTool('agents',{operation:'write_file',id:'b',name:'notes.md',content:'new'},{backend});assert.deepEqual(calls.at(-1),{method:'PUT',path:'/api/agents/b/library/file',body:{name:'notes.md',content:'new',expectedHash:'a'.repeat(64)}});
 assert.deepEqual(calls.at(-2),{method:'POST',path:'/api/agents/b/library/read',body:{name:'notes.md',read:false}},'an agent-written file is off until the owner turns it on');
 const added=await callTool('agents',{operation:'write_file',id:'b',name:'plan.md',content:'x'},{backend});assert.match(added.content[0].text,/secrets were hidden/);assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/agents/b/library/file',body:{name:'plan.md',content:'x',read:false}});
 for(const input of [{operation:'write_file',id:'b',name:'MEMORY.md',content:'x'},{operation:'write_file',id:'b',name:'personality.md',content:'x'},{operation:'write_file',id:'b',name:'run.sh',content:'x'},{operation:'write_file',id:'b',name:'../x.md',content:'x'},{operation:'file',id:'b',name:'x.exe'},{operation:'file',id:'b',name:'PERSONALITY.md'},{operation:'files'}])await refused('agents',input,calls);
 for(const op of ['remove','delete'])await refused('agents',{operation:op,id:'b',name:'notes.md'},calls,/owner in the app/);
});

test('agents tool: chart choices read and saved',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});if(path==='/api/me/agents-chart')return {chart:method==='GET'?{view:'chart',mode:'departments',lines:'curved',zoom:0.8,folded:[]}:{view:'chart',mode:'reports',lines:'curved',zoom:0.8,folded:[]}};throw Error('unexpected '+method+' '+path);}};
 const c=await callTool('agents',{operation:'chart'},{backend});assert.deepEqual(c.structuredContent,{view:'chart',mode:'departments',lines:'curved',zoom:0.8});
 await callTool('agents',{operation:'set_chart',mode:'reports'},{backend});assert.deepEqual(calls.at(-1),{method:'PUT',path:'/api/me/agents-chart',body:{mode:'reports'}});
 for(const input of [{operation:'set_chart'},{operation:'set_chart',zoom:9},{operation:'set_chart',lines:'wavy'},{operation:'chart',view:'list'}])await refused('agents',input,calls);
});

test('FIRSTRUN-01: agents read setup tools, suggest a split and propose hires; they never hire',async()=>{
 const {calls,backend}=fake({'/api/first-run/tools':{tools:[{id:'claude',name:'Claude Code',installed:true,signedIn:false,install:null,signIn:'claude',account:'x@example.test'}]},'/api/onboarding/team-distribution':{shares:[{department:'sales',count:3}]}});
 const tools=await callTool('agents',{operation:'setup_tools'},{backend});assert.notEqual(tools.isError,true);
 assert.deepEqual(tools.structuredContent.tools,[{id:'claude',name:'Claude Code',installed:true,signedIn:false,install:null,signIn:'claude'}]);
 const split=await callTool('agents',{operation:'suggest_team',total:3,departments:[' Sales ']},{backend});assert.notEqual(split.isError,true);
 assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/onboarding/team-distribution',body:{departments:['sales'],total:3}});
 const n=calls.length;
 const p=await callTool('agents',{operation:'propose_hire',name:'Nora',department:'marketing',description:'Write our Instagram posts'},{backend});assert.notEqual(p.isError,true);
 assert.equal(calls.length,n,'a proposal calls nothing');
 assert.deepEqual(p.structuredContent.proposal,{name:'Nora',role:'specialist',department:'marketing',description:'Write our Instagram posts',startsAs:'careful'});
 for(const input of [{operation:'suggest_team',total:0,departments:['sales']},{operation:'suggest_team',total:3,departments:[]},{operation:'propose_hire'},{operation:'propose_hire',description:'x',role:'main'},{operation:'hire',description:'x'}])await refused('agents',input,calls);
});
