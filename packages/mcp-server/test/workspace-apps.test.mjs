import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
test('apps MCP tool reuses bounded owner routes and never starts or grants a connection',async()=>{
 const calls=[],id='00000000-0000-0000-0000-000000000001',backend={async request(method,path,body){calls.push({method,path,body});return {id,items:[]};}};
 assert.notEqual((await callTool('workspace_apps',{operation:'list'},{backend})).isError,true);assert.deepEqual(calls.at(-1),{method:'GET',path:'/api/apps',body:undefined});
 const connection={name:'sample',transport:'http',url:'http://127.0.0.1:9/mcp'};assert.notEqual((await callTool('workspace_apps',{operation:'add',connection},{backend})).isError,true);assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/mcp/servers',body:connection});
 assert.notEqual((await callTool('workspace_apps',{operation:'disable',id},{backend})).isError,true);assert.equal(calls.at(-2).path,'/api/mcp/servers/'+id+'/disable');
 for(const input of [{operation:'enable',id},{operation:'remove',id},{operation:'disable',id:'../secrets'},{operation:'list',connection:{}},{operation:'add',connection:{...connection,enabled:true}},{operation:'add',connection:{...connection,headers:{Authorization:'refused'}}},{operation:'add',connection:{...connection,args:['wrong transport']}},{operation:'add',connection:{name:'sample',transport:'stdio',command:'node',args:[{}]}}]){const n=calls.length;assert.equal((await callTool('workspace_apps',input,{backend})).isError,true);assert.equal(calls.length,n);}
 assert.ok(TOOL_DEFINITIONS.some(t=>t.name==='workspace_apps'));
});
