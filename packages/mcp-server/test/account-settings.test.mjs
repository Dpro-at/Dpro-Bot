import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
test('account settings MCP tool: reads, one device sign-out and the update look; never the password steps',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {ok:true};}};
 const id='a'.repeat(24);
 for(const [input,call] of [[{operation:'two_step'},{method:'GET',path:'/api/auth/verification'}],[{operation:'devices'},{method:'GET',path:'/api/auth/sessions'}],[{operation:'updates'},{method:'GET',path:'/api/system/updates'}],[{operation:'check_updates'},{method:'POST',path:'/api/system/updates/check'}],[{operation:'sign_out_device',id},{method:'POST',path:`/api/auth/sessions/${id}/sign-out`}]]){
  assert.notEqual((await callTool('account_settings',input,{backend})).isError,true,JSON.stringify(input));assert.deepEqual(calls.at(-1),{...call,body:undefined});
 }
 const before=calls.length;
 for(const input of [{operation:'sign_out_device'},{operation:'sign_out_device',id:'../x'},{operation:'devices',id},{operation:'recovery_codes'},{operation:'disable'},{operation:'two_step',password:'x'}])assert.equal((await callTool('account_settings',input,{backend})).isError,true,JSON.stringify(input));
 assert.equal(calls.length,before);
 assert.ok(TOOL_DEFINITIONS.some(t=>t.name==='account_settings'));
});
