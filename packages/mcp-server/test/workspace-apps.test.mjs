import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
test('apps MCP tool reuses bounded owner routes and never starts or grants a connection',async()=>{
 const calls=[],id='00000000-0000-0000-0000-000000000001',backend={async request(method,path,body){calls.push({method,path,body});return {id,items:[]};}};
 assert.notEqual((await callTool('workspace_apps',{operation:'list'},{backend})).isError,true);assert.deepEqual(calls.at(-1),{method:'GET',path:'/api/apps',body:undefined});
 const connection={name:'sample',transport:'http',url:'http://127.0.0.1:9/mcp'};assert.notEqual((await callTool('workspace_apps',{operation:'add',connection},{backend})).isError,true);assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/mcp/servers',body:connection});
 assert.notEqual((await callTool('workspace_apps',{operation:'disable',id},{backend})).isError,true);assert.equal(calls.at(-2).path,'/api/mcp/servers/'+id+'/disable');
 for(const input of [{operation:'enable',id},{operation:'remove',id},{operation:'disable',id:'../secrets'},{operation:'list',connection:{}},{operation:'add',connection:{...connection,enabled:true}},{operation:'add',connection:{...connection,headers:{Authorization:'refused'}}},{operation:'add',connection:{...connection,args:['wrong transport']}},{operation:'add',connection:{name:'sample',transport:'stdio',command:'node',args:[{}]}}]){const n=calls.length;assert.equal((await callTool('workspace_apps',input,{backend})).isError,true);assert.equal(calls.length,n);}
 assert.ok(TOOL_DEFINITIONS.some(t=>t.name==='workspace_apps'));
});
test('apps MCP tool reads one connection, its tools and agents without starting, granting or leaking secrets',async()=>{
 const id='00000000-0000-0000-0000-000000000002',calls=[];
 const backend={async request(method,path,body){calls.push({method,path,body});
  if(path==='/api/mcp/servers/'+id)return {id,name:'calendar',transport:'stdio',command:'npx',args:['--token','inline-private'],env:{CALENDAR_KEY:'********'},enabled:false,active:true,lastError:null,tools:[{name:'list',title:'List events',description:'Lists',requiresApproval:true}]};
  if(path==='/api/agents')return {agents:[{id:'main-agent',name:'Main'},{id:'helper',name:'Helper'},{id:'small-local-agent',name:'Small'}]};
  if(path==='/api/agents/main-agent/tool-grants')return {grants:[{tool:'mcp__calendar__list'},{tool:'read'}]};
  if(path==='/api/agents/helper/tool-grants')return {grants:[{tool:'read'}]};
  throw Error('unexpected '+path);}};
 const r=await callTool('workspace_apps',{operation:'read',id},{backend});assert.notEqual(r.isError,true);
 const text=JSON.stringify(r);assert.match(text,/List events/);assert.match(text,/CALENDAR_KEY/);assert.match(text,/main-agent/);assert.doesNotMatch(text,/helper"|inline-private|\*\*\*\*/);
 assert.ok(calls.every(c=>c.method==='GET'),'reading only reads');assert.ok(!calls.some(c=>c.path.includes('small-local-agent')));
 for(const input of [{operation:'read'},{operation:'read',id:'../x'},{operation:'read',id,connection:{}},{operation:'grant',id},{operation:'enable',id}]){const n=calls.length;assert.equal((await callTool('workspace_apps',input,{backend})).isError,true);assert.equal(calls.length,n);}
 assert.match(TOOL_DEFINITIONS.find(t=>t.name==='workspace_apps').description,/always off/);
});
