require('./load.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('../../backend/node_modules/jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,HTMLButtonElement:dom.window.HTMLButtonElement,Event:dom.window.Event,MouseEvent:dom.window.MouseEvent,KeyboardEvent:dom.window.KeyboardEvent,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
const React=require('../node_modules/react'),{act}=React,{createRoot}=require('../node_modules/react-dom/client'),{SessionClient}=require('../src/session.ts'),{SkillsWorkspace}=require('../src/SkillsWorkspace.tsx'),{allowedSkillLibrary,skillLibraryResponse,SKILLS_PATH}=require('../src/skill-library-contract.js'),{allowed}=require('../scripts/application-server.cjs');
const text=node=>node.textContent.replace(/\s+/g,' ').trim();
const button=(root,name)=>[...root.querySelectorAll('button')].find(node=>text(node)===name||node.getAttribute('aria-label')===name);
async function flush(){for(let i=0;i<3;i++)await act(async()=>{await new Promise(resolve=>setImmediate(resolve));});}
async function click(node){assert.ok(node,'Expected rendered control');await act(async()=>{node.click();});await flush();}
const free='11111111-1111-4111-8111-111111111111',used='22222222-2222-4222-8222-222222222222',hash='a'.repeat(64);
const skill=(id,name)=>({id,name,description:'Fictional',version:'1.0.0',revision:3,content_hash:id===free?hash:'b'.repeat(64),origin:'workspace'});
async function mount(t,role,deleteReply={status:200,body:{removed:true}}){
 const user={id:'sk-user',username:'User',email:'user@example.invalid',role},calls=[];
 const transport=async request=>{if(request.path==='/api/auth/login')return {status:200,body:{token:'fixture',deviceToken:'d'.repeat(43),user}};if(request.path==='/api/auth/me')return {status:200,body:{user}};calls.push(request);
  if(request.method==='DELETE')return deleteReply;
  if(request.path===SKILLS_PATH)return {status:200,body:{skills:[skill(free,'fictional-free'),skill(used,'fictional-used')]}};
  if(request.path===SKILLS_PATH+'/usage')return {status:200,body:{usage:[{skillId:used,agentIds:['main-agent']}]}};
  if(request.path==='/api/agents')return {status:200,body:{agents:[{id:'main-agent',name:'Mira'}]}};
  if(request.path.startsWith(SKILLS_PATH+'/items/'))return {status:200,body:{skill:skill(request.path.endsWith(free)?free:used,'x'),files:[{path:'SKILL.md',content:'# x'}]}};
  return {status:404,body:{code:'not_found'}};};
 const client=new SessionClient({live:transport});client.selectMode('live');await client.login(user.email,'Fixture only');
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 await act(async()=>{root.render(React.createElement(SkillsWorkspace,{client,active:true}));});await flush();
 t.after(async()=>{await act(async()=>root.unmount());client.cancel();container.remove();});
 const menuFor=async id=>{const row=container.querySelector(`[data-id="${id}"]`);assert.ok(row);await act(async()=>{row.dispatchEvent(new dom.window.MouseEvent('contextmenu',{bubbles:true,clientX:5,clientY:5}));});await flush();};
 return {calls,container,menuFor};
}
test('remove a skill: contract is a narrow owner DELETE with a confirm and its revision',()=>{
 const path=`${SKILLS_PATH}/items/${free}`;for(const check of [allowedSkillLibrary,allowed])assert.equal(check('DELETE',path,{revision:3,confirmed:true}),true);
 for(const body of [undefined,{revision:3},{revision:3,confirmed:false},{revision:0,confirmed:true},{revision:3,confirmed:true,force:true}])assert.equal(allowedSkillLibrary('DELETE',path,body),false);
 assert.equal(allowedSkillLibrary('DELETE',SKILLS_PATH+'/usage',{revision:3,confirmed:true}),false);
 assert.deepEqual(skillLibraryResponse(path,200,{removed:true}),{removed:true});assert.throws(()=>skillLibraryResponse(path,200,{removed:true,extra:1}));
 assert.deepEqual(skillLibraryResponse(path,409,{code:'skill_in_use',agents:1,specialties:0,secret:'x'}),{code:'skill_in_use',agents:1,specialties:0});
});
test('the owner removes an unused skill after one question; a used skill cannot be removed',async t=>{
 const x=await mount(t,'owner');
 await x.menuFor(used);const blocked=button(document.body,'Remove from Dpro (an agent uses it)');assert.ok(blocked);assert.equal(blocked.disabled,true);
 await act(async()=>{document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));});await flush();
 await x.menuFor(free);await click(button(document.body,'Remove from Dpro…'));
 assert.match(text(document.body),/Remove Fictional free from Dpro\?/);assert.equal(x.calls.filter(c=>c.method==='DELETE').length,0);
 await click(button(document.body,'Remove'));
 const sent=x.calls.find(c=>c.method==='DELETE');assert.equal(sent.path,`${SKILLS_PATH}/items/${free}`);assert.deepEqual(sent.body,{revision:3,confirmed:true});
 assert.equal(x.container.querySelector(`[data-id="${free}"]`),null);assert.match(text(document.body),/removed from Dpro/);
});
test('a refusal stays in the sheet in plain words; others never see the remove item',async t=>{
 const x=await mount(t,'owner',{status:409,body:{code:'skill_in_use',agents:1,specialties:0}});
 await x.menuFor(free);await click(button(document.body,'Remove from Dpro…'));await click(button(document.body,'Remove'));
 assert.match(text(document.body),/An agent or a specialty uses it now\. Take it back first, then remove it\./);assert.ok(x.container.querySelector(`[data-id="${free}"]`));
 const y=await mount(t,'admin');await y.menuFor(free);assert.equal(button(document.body,'Remove from Dpro…'),undefined);
});
