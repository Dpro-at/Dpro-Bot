import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
test('backups MCP tool: reads, backs up now on instruction; never restores, deletes or moves',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return path==='/api/backups'&&method==='POST'?{backup:{id:'x',checked:true}}:{backups:[]};}};
 for(const [input,call] of [[{operation:'status'},{method:'GET',path:'/api/backups',body:undefined}],[{operation:'back_up_now'},{method:'POST',path:'/api/backups',body:{kind:'manual'}}],[{operation:'back_up_now',kind:'before_update'},{method:'POST',path:'/api/backups',body:{kind:'before-update'}}]]){
  assert.notEqual((await callTool('workspace_backups',input,{backend})).isError,true,JSON.stringify(input));assert.deepEqual(calls.at(-1),call);
 }
 const before=calls.length;
 for(const input of [{operation:'restore',id:'20261029-030000-daily'},{operation:'delete'},{operation:'folder',folder:'/tmp'},{operation:'status',id:'x'},{operation:'back_up_now',kind:'daily'}])assert.equal((await callTool('workspace_backups',input,{backend})).isError,true,JSON.stringify(input));
 assert.equal(calls.length,before);
 const def=TOOL_DEFINITIONS.find(t=>t.name==='workspace_backups');
 assert.deepEqual(def.inputSchema.properties.operation.enum,['status','back_up_now']);
});
