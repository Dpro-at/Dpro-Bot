// TASKLOG-01: workspace_tasks reads the projects' task files and continues a task; the switch and card changes stay in the app.
import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';

const T={no:'T-7',title:'Fix the sign-in timeout',state:'In progress',department:'Development',agent:'Backend Lead',apps:['Claude Code','Codex'],projectId:'p1',projectName:'Dpro',boardId:'b1',cardId:'c1',problem:null,finished:false};
function fake(){const calls=[];return {calls,backend:{async request(method,path,body){calls.push({method,path,body});
 if(method==='GET'&&(path==='/api/boards/tasks'||path==='/api/boards/tasks?projectId=p1'))return {tasks:[T,{...T,no:'T-1',finished:true}],problems:[{projectId:'p1',line:4,message:'A task heading needs a number'}]};
 if(method==='GET'&&path==='/api/boards/b1/cards/c1/task')return {task:{...T,done:['x']}};
 if(method==='GET'&&path==='/api/boards/b1/cards/c2/task')return {task:null};
 if(method==='POST'&&path==='/api/chat/task-continue')return {conversation:{id:'s9'}};
 if(method==='POST'&&path==='/api/boards/b0/cards/c3/task-sort')return {boardId:'b2'};
 if(method==='GET'&&path==='/api/boards/b1/cards/c1/page')return {page:{release:'Nabu'}};
 if(method==='GET'&&path==='/api/boards/b1/cards/c1/activity')return {items:[{kind:'comment'}],more:false};
 if(method==='PUT'&&path==='/api/boards/b1/cards/c1/people')return {people:[{kind:'agent',id:'a-dev',role:body.role}]};
 if(method==='POST'&&path==='/api/boards/b1/cards/c1/checklist')return {items:[{id:'i1',text:body.text}]};
 if(method==='PUT'&&path==='/api/boards/b1/cards/c1/checklist/i1')return {items:[{id:'i1',...body}]};
 if(method==='GET'&&path==='/api/boards/b1/cards/c1/schedule')return {schedule:null};
 if(method==='PUT'&&path==='/api/boards/b1/cards/c1/schedule')return {schedule:body.every==='never'?null:{...body}};
 throw Error('unexpected '+method+' '+path);}}};}

test('workspace_tasks: list and get read; continue starts a chat; everything else is refused', async () => {
 const {backend,calls}=fake();
 const l=await callTool('workspace_tasks',{operation:'list',projectId:'p1'},{backend});
 assert.match(l.content[0].text,/1 open tasks, 1 finished, 1 lines to fix/);
 assert.equal(l.structuredContent.tasks[0].no,'T-7');
 const g=await callTool('workspace_tasks',{operation:'get',boardId:'b1',cardId:'c1'},{backend});
 assert.deepEqual(g.structuredContent.task.done,['x']);
 assert.equal((await callTool('workspace_tasks',{operation:'get',boardId:'b1',cardId:'c2'},{backend})).isError,true);
 const c=await callTool('workspace_tasks',{operation:'continue',boardId:'b1',cardId:'c1',agentId:'a-dev',model:'subscription:codex'},{backend});
 assert.equal(c.structuredContent.conversation.id,'s9');
 assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/chat/task-continue',body:{boardId:'b1',cardId:'c1',agentId:'a-dev',model:'subscription:codex'}});
 const so=await callTool('workspace_tasks',{operation:'sort',boardId:'b0',cardId:'c3',department:'research'},{backend});
 assert.equal(so.structuredContent.boardId,'b2');
 assert.deepEqual(calls.at(-1).body,{department:'research'});
 const ac=await callTool('workspace_tasks',{operation:'activity',boardId:'b1',cardId:'c1'},{backend});
 assert.equal(ac.structuredContent.page.release,'Nabu');
 const pe=await callTool('workspace_tasks',{operation:'people',boardId:'b1',cardId:'c1',kind:'agent',id:'a-dev',role:'tests'},{backend});
 assert.equal(pe.structuredContent.people[0].role,'tests');
 await callTool('workspace_tasks',{operation:'checklist',boardId:'b1',cardId:'c1',text:'Check Windows'},{backend});
 const gi=await callTool('workspace_tasks',{operation:'checklist',boardId:'b1',cardId:'c1',itemId:'i1',ownerKind:'agent',ownerId:'a-qa'},{backend});
 assert.deepEqual(gi.structuredContent.items[0].owner,{kind:'agent',id:'a-qa'});
 assert.equal((await callTool('workspace_tasks',{operation:'schedule',boardId:'b1',cardId:'c1'},{backend})).structuredContent.schedule,null);
 const sc=await callTool('workspace_tasks',{operation:'schedule',boardId:'b1',cardId:'c1',every:'daily',at:'09:00',agentId:'a-dev'},{backend});
 assert.deepEqual(sc.structuredContent.schedule,{every:'daily',at:'09:00',agentId:'a-dev'});
 assert.deepEqual(calls.at(-1).body,{every:'daily',at:'09:00',agentId:'a-dev'});
 await callTool('workspace_tasks',{operation:'schedule',boardId:'b1',cardId:'c1',every:'never'},{backend});
 assert.deepEqual(calls.at(-1).body,{every:'never'});
 const before=calls.length;
 for(const a of [{operation:'on',projectId:'p1'},{operation:'off'},{operation:'move',cardId:'c1'},{operation:'list',projectId:'../x'},{operation:'continue',boardId:'b1',cardId:'c1',extra:1},{operation:'get',boardId:'b1'},{operation:'sort',boardId:'b0',cardId:'c3'},{operation:'people',boardId:'b1',cardId:'c1',kind:'agent',id:'a-dev'},{operation:'checklist',boardId:'b1',cardId:'c1',itemId:'i1'},{operation:'checklist',boardId:'b1',cardId:'c1',text:'x',done:true},{operation:'archive',boardId:'b1',cardId:'c1'},{operation:'schedule',boardId:'b1',cardId:'c1',at:'09:00'},{operation:'schedule',boardId:'b1',cardId:'c1',every:'daily',at:'9am'}]){
  assert.equal((await callTool('workspace_tasks',a,{backend})).isError,true,JSON.stringify(a));
 }
 assert.equal(calls.length,before,'no refused call reaches the backend');
 const def=TOOL_DEFINITIONS.find(t=>t.name==='workspace_tasks');
 assert.deepEqual(def.inputSchema.properties.operation.enum,['list','get','activity','continue','sort','people','checklist','schedule']);
 assert.match(def.description,/on the owner’s explicit instruction/);
});
