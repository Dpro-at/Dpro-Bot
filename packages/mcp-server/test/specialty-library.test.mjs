import test from 'node:test';import assert from 'node:assert/strict';
import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
const id='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222',P='/api/specialty-templates';
const draft={name:'Fictional tester',department:'testing',description:'Checks fictional work',instructions:'# Tester',revision:1,config:{}};
test('specialty MCP operations use the owner-only specialty routes',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {accepted:true};}};
 for(const [args,method,path,body] of [
  [{operation:'list'},'GET',P,undefined],[{operation:'catalogue'},'GET',P+'/catalogue',undefined],[{operation:'read',id},'GET',`${P}/${id}`,undefined],
  [{operation:'agents',id},'GET',`${P}/${id}/agents`,undefined],[{operation:'impact',id},'GET',`${P}/${id}/impact`,undefined],[{operation:'assigned',agentId:'main-agent'},'GET',`${P}/assigned/main-agent`,undefined],
  [{operation:'versions',id},'GET',`${P}/${id}/versions`,undefined],[{operation:'version',id,revision:2},'GET',`${P}/${id}/versions/2`,undefined],
  [{operation:'draft',body:{description:'Writes the newsletter.'}},'POST',P+'/draft',{description:'Writes the newsletter.'}],[{operation:'draft',body:{description:'Writes it.',departments:['Creative work']}},'POST',P+'/draft',{description:'Writes it.',departments:['Creative work']}],
  [{operation:'preview',id,body:draft},'POST',`${P}/${id}/preview`,draft],[{operation:'save',id,body:draft},'PUT',`${P}/${id}`,draft],
  [{operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:true}},'POST',P+'/hire',{templateId:id,revision:1,requestId,confirmed:true,confirmRisky:false,linked:true}],
  [{operation:'hire',body:{templateId:id,revision:1,requestId,name:'Lina',confirmed:true,libraryPersonality:{id:'temperament-calm',revision:2}}},'POST',P+'/hire',{templateId:id,revision:1,requestId,name:'Lina',confirmed:true,confirmRisky:false,linked:true,libraryPersonality:{id:'temperament-calm',revision:2}}]]){
  const out=await callTool('specialty_library',args,{backend});assert.notEqual(out.isError,true,JSON.stringify(args));assert.deepEqual(calls.at(-1),{method,path,body});
 }
 assert.ok(TOOL_DEFINITIONS.some(t=>t.name==='specialty_library'));
});
test('specialty MCP tool keeps the owner gates of the page',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {};}};
 for(const args of [
  {operation:'save',id,body:{...draft,confirmImpact:'a'.repeat(64)}},
  {operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:false}},
  {operation:'hire',body:{templateId:id,revision:1,confirmed:true}},
  // Sensitive-action consent and the link choice are the owner's, in the app.
  {operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:true,confirmRisky:true}},
  {operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:true,confirmRisky:false}},
  {operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:true,linked:false}},
  {operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:true,permissions:{modes:{money:'allow'}}}},
  {operation:'hire',body:{templateId:id,revision:1,requestId,confirmed:true,libraryPersonality:{id:'calm',revision:1,extra:true}}},
  // Giving to existing agents or taking back is done in the app after its review sheet.
  {operation:'give',id,agentId:'main-agent',revision:1},{operation:'takeBack',id,agentId:'main-agent',revision:1},
  {operation:'read',id:'../keys'},{operation:'read',id,agentId:'main-agent'},{operation:'list',body:{}},{operation:'assigned',agentId:'../x'},{operation:'remove',id},{operation:'list',extra:true},
  {operation:'versions'},{operation:'version',id},{operation:'version',id,revision:0},{operation:'version',id,revision:'2'},{operation:'versions',id,revision:1},{operation:'read',id,revision:1},{operation:'versions',id,body:{}},
  {operation:'draft'},{operation:'draft',body:{description:''}},{operation:'draft',id,body:{description:'x'}},{operation:'draft',body:{description:'x',model:'paid'}},{operation:'draft',body:{description:'x',departments:'one'}}]){
  const n=calls.length;assert.equal((await callTool('specialty_library',args,{backend})).isError,true,JSON.stringify(args));assert.equal(calls.length,n);
 }
});

test('source updates retain exact owner review/apply contract and reject confirmation shortcuts',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {};}};
 const sourceKey='professional-role-'+'a'.repeat(24),reviewToken='b'.repeat(64),base='/api/workspace-pack/specialty-upgrade-';
 for(const [args,method,path,body] of [
 [{operation:'updates'},'GET',base+'preview',undefined],
 [{operation:'update_review',body:{sourceKey}},'POST',base+'review',{sourceKey}],
 [{operation:'update_apply',body:{sourceKey,reviewToken,confirmed:true}},'POST',base+'apply',{sourceKey,reviewToken,confirmed:true}]]){
 assert.notEqual((await callTool('specialty_library',args,{backend})).isError,true);assert.deepEqual(calls.at(-1),{method,path,body});}
 for(const args of [{operation:'updates',body:{}},{operation:'update_review',id,body:{sourceKey}},{operation:'update_apply',body:{sourceKey,reviewToken}},{operation:'update_apply',body:{sourceKey,reviewToken,confirmed:false}},{operation:'update_apply',body:{sourceKey,reviewToken,confirmed:true,config:{}}}]){
 const n=calls.length;assert.equal((await callTool('specialty_library',args,{backend})).isError,true);assert.equal(calls.length,n);}
});

test('skill preparation can be inspected through MCP but only confirmed inside the app',async()=>{
 const calls=[],backend={async request(method,path,body){calls.push({method,path,body});return {};}};const sourceKey='professional-role-'+'a'.repeat(24);
 assert.notEqual((await callTool('specialty_library',{operation:'update_prepare_review',body:{sourceKey,resourceId:'skill-1'}},{backend})).isError,true);assert.deepEqual(calls[0],{method:'POST',path:'/api/workspace-pack/specialty-upgrade-prepare-review',body:{sourceKey,resourceId:'skill-1'}});
 assert.equal((await callTool('specialty_library',{operation:'update_prepare_apply',body:{sourceKey,resourceId:'skill-1',reviewToken:'a'.repeat(64),confirmed:true}},{backend})).isError,true);assert.equal(calls.length,1);
});
