import test from 'node:test';import assert from 'node:assert/strict';
import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',scanId='33333333-3333-4333-8333-333333333333',hash='a'.repeat(64);
function fixture(selected=[other]){const calls=[];let revision=3;const backend={async request(method,path,body){calls.push({method,path,body});if(path.startsWith('/api/skill-library/agents/')){if(method==='GET')return {selected,revision};selected=body.selected;revision++;return {revision};}if(path==='/api/skill-library')return {skills:[{id,name:'content-studio'}]};if(path==='/api/skill-library/usage')return {usage:[{skillId:id,agentIds:['main-agent']}]};return {accepted:true};}};return {backend,calls};}
test('skill MCP reads use the bounded skill-library routes',async()=>{
 const f=fixture();
 for(const [args,method,path] of [[{operation:'read',id},'GET','/api/skill-library/items/'+id],[{operation:'agent',agentId:'main-agent'},'GET','/api/skill-library/agents/main-agent'],[{operation:'catalogue'},'GET','/api/skills/reviewed-installs/catalogue'],[{operation:'look'},'POST','/api/skill-library/scan'],[{operation:'look_status',scanId},'GET','/api/skill-library/scans/'+scanId],[{operation:'preview',scanId,sourceId:id},'POST','/api/skill-library/preview']]){const out=await callTool('skill_library',args,{backend:f.backend});assert.notEqual(out.isError,true,JSON.stringify(args));assert.deepEqual([f.calls.at(-1).method,f.calls.at(-1).path],[method,path]);}
 const list=await callTool('skill_library',{operation:'list'},{backend:f.backend});assert.notEqual(list.isError,true);assert.deepEqual(list.structuredContent.usage,[{skillId:id,agentIds:['main-agent']}]);
});
test('give and take back change one skill for one agent with its revision',async()=>{
 const f=fixture();await callTool('skill_library',{operation:'give',id,agentId:'main-agent'},{backend:f.backend});assert.deepEqual(f.calls.at(-1),{method:'PUT',path:'/api/skill-library/agents/main-agent',body:{selected:[other,id],revision:3}});
 const n=f.calls.length,again=await callTool('skill_library',{operation:'give',id,agentId:'main-agent'},{backend:f.backend});assert.equal(again.structuredContent.changed,false);assert.equal(f.calls.length,n+1,'only the read');
 await callTool('skill_library',{operation:'take_back',id,agentId:'main-agent'},{backend:f.backend});assert.deepEqual(f.calls.at(-1).body,{selected:[other],revision:4});
});
test('owner gates: update needs confirmed, catalogue install is app-only, bad ids never reach the backend',async()=>{
 const f=fixture();
 for(const args of [{operation:'update',scanId,sourceId:id,hash,replaceHash:hash},{operation:'update',scanId,sourceId:id,hash,replaceHash:hash,confirmed:'yes'},{operation:'install',id},{operation:'stage'},{operation:'remove',id},{operation:'read',id:'../../keys'},{operation:'give',id,agentId:'../keys'},{operation:'give',id,agentId:'small-local-agent'},{operation:'add',scanId,sourceId:id,hash:'x'},{operation:'add',scanId,sourceId:id,hash,replaceHash:hash},{operation:'list',extra:true}]){const n=f.calls.length,out=await callTool('skill_library',args,{backend:f.backend});assert.equal(out.isError,true,JSON.stringify(args));assert.equal(f.calls.length,n,JSON.stringify(args));}
 const refused=await callTool('skill_library',{operation:'install'},{backend:f.backend});assert.match(refused.content[0].text,/owner in the app/);
 await callTool('skill_library',{operation:'add',scanId,sourceId:id,hash},{backend:f.backend});assert.deepEqual(f.calls.at(-1),{method:'POST',path:'/api/skill-library/import',body:{scanId,sourceId:id,hash}});
 await callTool('skill_library',{operation:'update',scanId,sourceId:id,hash,replaceHash:'b'.repeat(64),confirmed:true},{backend:f.backend});assert.deepEqual(f.calls.at(-1).body,{scanId,sourceId:id,hash,replaceHash:'b'.repeat(64)});
 const tool=TOOL_DEFINITIONS.find(t=>t.name==='skill_library');assert.ok(tool);assert.match(tool.description,/authenticator code/);assert.ok(!tool.inputSchema.properties.operation.enum.some(o=>/install|remove|stage|apply/.test(o)));
});
