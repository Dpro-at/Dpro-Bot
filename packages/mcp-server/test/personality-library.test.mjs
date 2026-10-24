import test from 'node:test';import assert from 'node:assert/strict';
import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
test('personality MCP operations use bounded backend routes and preserve review data',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {accepted:true};}};
 for(const [operation,id,body,path,method]of [['list',undefined,undefined,'/api/personality-library','GET'],['assignment','agent-one',undefined,'/api/personality-library/assigned/agent-one','GET'],['tune','agent-one',{expectedVersion:1,profile:{}},'/api/personality-library/assigned/agent-one/tune','POST'],['save','guardian',{revision:1,profile:{},confirmation:'reviewed'},'/api/personality-library/guardian','PUT'],['lock','agent-one',undefined,'/api/agents/agent-one/personality/lock','POST'],['restore','agent-one',{version:1},'/api/agents/agent-one/personality/rollback','POST']]){
 const out=await callTool('personality_library',{operation,...(id?{id}:{}),...(body?{body}:{})},{backend});assert.notEqual(out.isError,true);assert.deepEqual(calls.at(-1),{method,path,body});
 }
 const before=calls.length;assert.equal((await callTool('personality_library',{operation:'save',id:'../keys',body:{}},{backend})).isError,true);assert.equal(calls.length,before);
 assert.ok(TOOL_DEFINITIONS.some(t=>t.name==='personality_library'));
});
