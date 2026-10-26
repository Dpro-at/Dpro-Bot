import test from 'node:test';import assert from 'node:assert/strict';
import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
const id='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222',P='/api/specialty-templates';
const draft={name:'Fictional tester',department:'testing',description:'Checks fictional work',instructions:'# Tester',revision:1,config:{}};
test('specialty MCP operations use the owner-only specialty routes',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {accepted:true};}};
 for(const [args,method,path,body] of [
  [{operation:'list'},'GET',P,undefined],[{operation:'catalogue'},'GET',P+'/catalogue',undefined],[{operation:'read',id},'GET',`${P}/${id}`,undefined],
  [{operation:'agents',id},'GET',`${P}/${id}/agents`,undefined],[{operation:'impact',id},'GET',`${P}/${id}/impact`,undefined],[{operation:'assigned',agentId:'main-agent'},'GET',`${P}/assigned/main-agent`,undefined],
  [{operation:'give',id,agentId:'main-agent',revision:3},'POST',`${P}/${id}/agents`,{agentId:'main-agent',revision:3,linked:true}],
  [{operation:'takeBack',id,agentId:'main-agent',revision:3},'POST',`${P}/${id}/agents`,{agentId:'main-agent',revision:3,linked:false}],
  [{operation:'preview',id,body:draft},'POST',`${P}/${id}/preview`,draft],[{operation:'save',id,body:draft},'PUT',`${P}/${id}`,draft],
  [{operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:true,confirmRisky:false,linked:true}},'POST',P+'/hire',{templateId:id,revision:1,requestId,confirmed:true,confirmRisky:false,linked:true}]]){
  const out=await callTool('specialty_library',args,{backend});assert.notEqual(out.isError,true,JSON.stringify(args));assert.deepEqual(calls.at(-1),{method,path,body});
 }
 assert.ok(TOOL_DEFINITIONS.some(t=>t.name==='specialty_library'));
});
test('specialty MCP tool keeps the owner gates of the page',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {};}};
 for(const args of [
  {operation:'save',id,body:{...draft,confirmImpact:'a'.repeat(64)}},
  {operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:false,confirmRisky:false}},
  {operation:'hire',body:{templateId:id,revision:1,confirmed:true,confirmRisky:false}},
  {operation:'read',id:'../keys'},{operation:'give',id,agentId:'small-local-agent',revision:1},{operation:'give',id,agentId:'main-agent'},
  {operation:'give',id,agentId:'main-agent',revision:1,body:{linked:false}},{operation:'list',body:{}},{operation:'assigned',agentId:'../x'},{operation:'remove',id},{operation:'list',extra:true}]){
  const n=calls.length;assert.equal((await callTool('specialty_library',args,{backend})).isError,true,JSON.stringify(args));assert.equal(calls.length,n);
 }
});
