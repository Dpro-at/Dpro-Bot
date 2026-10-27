// CHAT-BUILD-01 stage 2: the chats tool reads the sidebar and changes only what the owner asked for.
import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';

const CID='3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b',PID='9a8b7c6d-1d2a-4f4e-9b1a-6c7d8e9f0a1b';
function fake(){const calls=[];return {calls,backend:{async request(method,path,body){calls.push({method,path,body});
 if(method==='GET'&&path==='/api/chat/conversations')return {conversations:[{id:CID,title:'Plan the site',preview:'',projectId:PID,pinned:false,archived:true,parentId:PID,running:true,waiting:2,updatedAt:'2026-10-27 10:00:00',agentId:'secret-agent'}]};
 if(method==='GET'&&path==='/api/chat/projects')return {projects:[{id:PID,name:'Website',folder:'/Users/me/site',repoUrl:'x'}]};
 if(method==='GET'&&path===`/api/chat/conversations/${CID}/usage`)return {usage:[{model:'qwen3:8b',tokensIn:900,tokensOut:120,replies:2}]};
 if(method==='GET'&&path===`/api/chat/conversations/${CID}/team`)return {team:[{agentId:'qa',agentName:'QA Tester',model:'subscription:claude',status:'answered',at:'x'}]};
 if(method==='GET'&&path===`/api/chat/conversations/${CID}/schedule`)return {schedule:{every:'daily',at:'09:00',weekday:null,message:'secret plan',paused:false,nextRun:'2026-10-28T08:00:00Z'}};
 if(method==='PUT'&&path===`/api/chat/conversations/${CID}`)return {conversation:{id:CID,title:body.title??'Plan the site',preview:'',projectId:'projectId' in body?body.projectId:PID,pinned:!!body.pinned,archived:!!body.archived,updatedAt:''}};
 throw Error('unexpected '+method+' '+path);}}};}

test('chats: list and projects read the sidebar; writes go to the one chat with only the asked field',async()=>{
 const {calls,backend}=fake();
 const list=await callTool('chats',{operation:'list'},{backend});
 assert.deepEqual(list.structuredContent.chats,[{id:CID,name:'Plan the site',projectId:PID,pinned:false,mode:'auto',thinking:'normal',archived:true,openedFrom:PID,workingNow:true,waitingForOwner:2,updatedAt:'2026-10-27 10:00:00'}]);
 assert.deepEqual((await callTool('chats',{operation:'projects'},{backend})).structuredContent.projects,[{id:PID,name:'Website',folder:'/Users/me/site',folders:[]}]);
 assert.equal((await callTool('chats',{operation:'rename',id:CID,title:' New name '},{backend})).structuredContent.chat.name,'New name');
 await callTool('chats',{operation:'pin',id:CID,pinned:true},{backend});
 await callTool('chats',{operation:'archive',id:CID,archived:false},{backend});
 await callTool('chats',{operation:'move',id:CID,projectId:null},{backend});
 await callTool('chats',{operation:'set_mode',id:CID,mode:'ask'},{backend});
 await callTool('chats',{operation:'set_thinking',id:CID,thinking:'deep'},{backend});
 assert.deepEqual(calls.filter(c=>c.method==='PUT').map(c=>c.body),[{title:'New name'},{pinned:true},{archived:false},{projectId:null},{mode:'ask'},{thinking:'deep'}]);
});

test('chats: bad input is refused before the backend; deleting and reading messages are not offered',async()=>{
 const {calls,backend}=fake();
 for(const input of [{operation:'delete',id:CID},{operation:'messages',id:CID},{operation:'rename',id:'../x',title:'a'},{operation:'rename',id:CID,title:''},{operation:'pin',id:CID,pinned:'yes'},{operation:'archive',id:CID},{operation:'move',id:CID,projectId:'a/b'},{operation:'list',id:CID},{operation:'set_mode',id:CID,mode:'accept_edits'},{operation:'variables',projectId:'../x'}]){
  const r=await callTool('chats',input,{backend});assert.equal(r.isError,true,JSON.stringify(input));
 }
 assert.equal(calls.length,0);
 assert.match(TOOL_DEFINITIONS.find(t=>t.name==='chats').description,/explicit instruction/);
});

test('chats: status reads tokens by model, the team and the schedule (never the message text)',async()=>{
 const {backend}=fake();
 const r=await callTool('chats',{operation:'status',id:CID},{backend});
 assert.equal(r.structuredContent.usage[0].model,'qwen3:8b');
 assert.deepEqual(r.structuredContent.team,[{agent:'QA Tester',model:'subscription:claude',status:'answered',at:'x'}]);
 assert.equal(r.structuredContent.schedule.every,'daily');
 assert.doesNotMatch(JSON.stringify(r),/secret plan/);
});
