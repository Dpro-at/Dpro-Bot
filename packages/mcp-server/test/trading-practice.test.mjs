import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
test('practice MCP uses only the bounded fictional routes and preserves explicit retry identity',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {active:true};}},sessionId='00000000-0000-0000-0000-000000000001',requestId='00000000-0000-0000-0000-000000000002';
 for(const operation of ['read','start','step','stop','end']){const args={operation,...(!['read','start'].includes(operation)?{sessionId}:{}),...(operation==='step'?{requestId}:{})};assert.notEqual((await callTool('trading_practice',args,{backend})).isError,true);}
 const input={operation:'order',sessionId,requestId,symbol:'DEMO-ALPHA',side:'buy',quantity:1};await callTool('trading_practice',input,{backend});const first=calls.at(-1);await callTool('trading_practice',input,{backend});assert.deepEqual(calls.at(-1),first);
 for(const args of [{...input,price:1},{...input,quantity:0},{...input,symbol:'REAL'},{...input,mode:'live'},{...input,sessionId:'../private'},{operation:'start',cash:999},{operation:'enable-live'}]){const n=calls.length;assert.equal((await callTool('trading_practice',args,{backend})).isError,true);assert.equal(calls.length,n);}
 assert.ok(TOOL_DEFINITIONS.some(t=>t.name==='trading_practice'));
});
