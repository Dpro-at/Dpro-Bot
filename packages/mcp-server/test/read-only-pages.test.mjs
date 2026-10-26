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
 assert.match(TOOL_DEFINITIONS.find(t=>t.name==='agents').description,/Renaming, role, main agent, duplicate, hire and remove are done by the owner in the app/);
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
 for(const op of ['approve','allow','allow_always','deny','reject','vote','cast','verify','rule_save','activate','revoke','rule_off','turn_off','set_permissions','change_permissions'])await refused('workspace_approvals',{operation:op,id:row.id},calls,/owner in the app/);
 for(const input of [{operation:'history',status:'weird'},{operation:'history',status:'denied',agentId:'main-agent'},{operation:'history',agentId:'../x'},{operation:'rules',cursor:'x&y=1'},{operation:'waiting',agentId:'main-agent'},{operation:'coverage',body:{}},{operation:'other'}])await refused('workspace_approvals',input,calls);
});

test('workspace_apps reads channels, accounts, addons and catalogue with GET only and never returns keys or codes',async()=>{
 const {calls,backend}=fake({
  '/api/agent-connect/catalog':{configurable:true,channels:[{id:'telegram',label:'Telegram',enabled:false,hasSecrets:true,allowedUsers:['me'],environment:{TELEGRAM_BOT_TOKEN:'ENV-VALUE'},botToken:'tok-1',requiredEnv:['TELEGRAM_BOT_TOKEN']}]},
  '/api/connections':{connections:[{id:'genvr',status:'connecting',account:{name:'Me'},pending:{userCode:'ABCD-1234',verificationUri:'https://genvr.example/link'},accessToken:'tok-1'}]},
  '/api/chat/addons':{items:[{name:'lint',source:'codex',kind:'plugin',enabled:true,count:1}],sources:[]},
  '/api/marketplace/search?limit=100&offset=0':{total:1,items:[{id:'calendar',name:'Calendar',type:'app',apiKey:'sk-live'}]},
  '/api/chat/addons/catalogue':{items:[{id:'fmt',name:'Format',source:'claude-code',present:false}],sources:[]},
 });
 const results=[];
 for(const operation of ['channels','accounts','addons','catalogue']){const r=await callTool('workspace_apps',{operation},{backend});assert.notEqual(r.isError,true,operation);results.push(r);}
 assert.ok(calls.every(c=>c.method==='GET'&&c.body===undefined));
 assert.deepEqual(calls.map(c=>c.path),['/api/agent-connect/catalog','/api/connections','/api/chat/addons','/api/marketplace/search?limit=100&offset=0','/api/chat/addons/catalogue']);
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
