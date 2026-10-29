// RULES-01: workspace_rules reads the owner's rules, suggests one, and changes only through the owner routes.
import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';

const RID='3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b';
const R={id:RID,text:'Chat in Arabic',projectId:null,who:'all',targets:[],paused:false,status:'active',source:'owner',reason:null,version:1,createdAt:'x',createdBy:'secret-owner-id'};
function fake(){const calls=[];return {calls,backend:{async request(method,path,body){calls.push({method,path,body});
 if(method==='GET'&&path==='/api/agent-rules')return {rules:[R,{...R,id:'b',paused:true}],suggestions:[{...R,id:'c',status:'suggested',source:'agent',reason:'why'}],departments:['development']};
 if(method==='GET'&&path.startsWith('/api/agent-rules/effective?'))return {rules:[R]};
 if(method==='POST'&&path==='/api/agent-rules/suggestions')return {rule:{...R,...body,status:'suggested'}};
 if(method==='POST'&&path==='/api/agent-rules')return {rule:{...R,...body}};
 if(method==='PUT'&&path===`/api/agent-rules/${RID}`)return {rule:{...R,...body}};
 if(method==='POST'&&path===`/api/agent-rules/${RID}/delete`)return {ok:true};
 if(method==='POST'&&path===`/api/agent-rules/${RID}/accept`)return {rule:{...R}};
 throw Error('unexpected '+method+' '+path);}}};}

test('workspace_rules: list and effective read; only rule fields come back', async () => {
 const {backend}=fake();
 const r=await callTool('workspace_rules',{operation:'list'},{backend});
 assert.match(r.content[0].text,/2 rules \(1 paused\), 1 suggestions waiting/);
 assert.deepEqual(Object.keys(r.structuredContent.rules[0]).sort(),['id','paused','projectId','reason','source','status','targets','text','version','who']);
 assert.doesNotMatch(JSON.stringify(r),/secret-owner-id/);
 const e=await callTool('workspace_rules',{operation:'effective',agentId:'a-dev',projectId:'p1'},{backend});
 assert.equal(e.structuredContent.rules[0].text,'Chat in Arabic');
});

test('workspace_rules: suggest waits for the owner; changes go to the same owner routes as the page', async () => {
 const {backend,calls}=fake();
 const s=await callTool('workspace_rules',{operation:'suggest',text:'Read the README first',reason:'missed steps'},{backend});
 assert.match(s.content[0].text,/waits for the owner/);
 assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/agent-rules/suggestions',body:{text:'Read the README first',reason:'missed steps'}});
 await callTool('workspace_rules',{operation:'pause',id:RID,paused:true},{backend});
 assert.deepEqual(calls.at(-1).body,{paused:true});
 await callTool('workspace_rules',{operation:'delete',id:RID},{backend});
 assert.equal(calls.at(-1).path,`/api/agent-rules/${RID}/delete`);
 await callTool('workspace_rules',{operation:'accept',id:RID},{backend});
 for(const bad of [{operation:'delete',id:'nope'},{operation:'pause',id:RID},{operation:'list',text:'x'},{operation:'rewrite'}]){
  const r=await callTool('workspace_rules',bad,{backend});assert.equal(r.isError,true,JSON.stringify(bad));
 }
 assert.ok(TOOL_DEFINITIONS.find(t=>t.name==='workspace_rules').description.includes('Only on the owner’s explicit instruction'));
});
