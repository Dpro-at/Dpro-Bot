require('./load.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('../../backend/node_modules/jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,Event:dom.window.Event,MouseEvent:dom.window.MouseEvent,KeyboardEvent:dom.window.KeyboardEvent,IS_REACT_ACT_ENVIRONMENT:true});Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
const React=require('../node_modules/react'),{act}=React,{createRoot}=require('../node_modules/react-dom/client'),{SessionClient}=require('../src/session.ts'),{SpecialtyLibrary,SpecialtyVersions}=require('../src/SpecialtyLibrary.tsx'),{allowedTemplates,templatesResponse,DRAFT_PATH}=require('../src/specialty-contract.js');
const text=node=>node.textContent.replace(/\s+/g,' ').trim();
const button=(root,name)=>[...root.querySelectorAll('button')].find(node=>text(node)===name||node.getAttribute('aria-label')===name);
async function flush(){for(let i=0;i<3;i++)await act(async()=>{await new Promise(resolve=>setImmediate(resolve));});}
async function click(node){assert.ok(node,'Expected rendered control');await act(async()=>{node.click();});await flush();}
async function fill(node,value){assert.ok(node);await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});}
const config={primarySkill:null,skills:[],tools:[{name:'web_fetch',fingerprint:null}],memoryRead:['project','experience','task'],memoryWrite:['project','experience','task'],sharedMemory:false,modes:{browser:'ask',network:'ask',message:'ask',delete:'ask',install:'ask',money:'ask',settings:'ask'}};
const draft={name:'Newsletter writer',department:'Creative work',description:'Writes the weekly newsletter.',instructions:'# How you work\n\nWrite it.',config};
async function mount(t,draftReply){
 const user={id:'sp-owner',username:'Owner',email:'owner@example.invalid',role:'owner'},calls=[];
 const transport=async request=>{
  if(request.path==='/api/auth/login')return {status:200,body:{token:'fixture',deviceToken:'d'.repeat(43),user}};if(request.path==='/api/auth/me')return {status:200,body:{user}};
  calls.push({method:request.method,path:request.path,body:request.body});
  if(request.path==='/api/specialty-templates')return {status:200,body:{templates:[]}};
  if(request.path==='/api/specialty-templates/catalogue')return {status:200,body:{skills:[],tools:[{name:'web_fetch',description:'Read a page',server:null,fingerprint:null,available:true}]}};
  if(request.path===DRAFT_PATH)return draftReply;
  return {status:200,body:{agents:[],personalities:[],templates:[]}};
 };
 const client=new SessionClient({live:transport});client.selectMode('live');await client.login(user.email,'Fixture only');
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 await act(async()=>{root.render(React.createElement(SpecialtyLibrary,{client,active:true}));});await flush();
 t.after(async()=>{await act(async()=>root.unmount());client.cancel();container.remove();});
 return {calls,container};
}
test('SP3b contract: the draft route takes only a description and department names; GET is refused',()=>{
 assert.equal(allowedTemplates('POST',DRAFT_PATH,{description:'A job.',departments:['Creative work']}),true);
 for(const body of [{},{description:''},{description:'x'.repeat(2001)},{description:'ok',model:'paid'},{description:'ok',departments:[1]}])assert.equal(allowedTemplates('POST',DRAFT_PATH,body),false);
 assert.equal(allowedTemplates('GET',DRAFT_PATH),false);
 assert.deepEqual(templatesResponse(DRAFT_PATH,409,{code:'local_model_required'}),{code:'local_model_required'});
 assert.throws(()=>templatesResponse(DRAFT_PATH,200,{draft,model:'local',generated:false}));
 assert.equal(templatesResponse(DRAFT_PATH,200,{draft,model:'local',generated:true}).draft.name,'Newsletter writer');
});
test('SP3b: Describe it is the first start; the local draft opens unsaved for checking',async t=>{
 const x=await mount(t,{status:200,body:{draft,model:'qwen-local',generated:true}});
 await click(button(x.container,'New specialty'));
 const describe=[...x.container.querySelectorAll('[role=radio]')].find(n=>/Describe it/.test(text(n)));assert.equal(describe?.getAttribute('aria-checked'),'true');
 assert.equal(button(x.container,'Make the draft').disabled,true);
 await fill(x.container.querySelector('textarea'),'Writes our weekly newsletter.');
 await click(button(x.container,'Make the draft'));
 const sent=x.calls.find(c=>c.path===DRAFT_PATH);assert.equal(sent.body.description,'Writes our weekly newsletter.');assert.ok(sent.body.departments.includes('Creative work'));
 assert.match(text(x.container),/Newsletter writer/);assert.match(text(x.container),/Drafted by your local model/);
 assert.equal(x.calls.filter(c=>c.method==='PUT').length,0);
});
test('SP3b: with no local model the sheet says one plain sentence and stays open',async t=>{
 const x=await mount(t,{status:409,body:{code:'local_model_required'}});
 await click(button(x.container,'New specialty'));await fill(x.container.querySelector('textarea'),'A job.');await click(button(x.container,'Make the draft'));
 assert.match(text(x.container),/Girru needs a local model on this computer to draft it\. Copy one or start empty instead\./);
 assert.ok(button(x.container,'Make the draft'));
});

const tid='33333333-3333-4333-8333-333333333333';
test('SP2 contract: versions are owner GET reads only; the projection keeps only known fields',()=>{
 assert.equal(allowedTemplates('GET',`/api/specialty-templates/${tid}/versions`),true);assert.equal(allowedTemplates('GET',`/api/specialty-templates/${tid}/versions/2`),true);
 for(const [m,path,body] of [['POST',`/api/specialty-templates/${tid}/versions`,{}],['PUT',`/api/specialty-templates/${tid}/versions/2`,draft],['GET',`/api/specialty-templates/${tid}/versions/0`],['GET',`/api/specialty-templates/${tid}/versions/02`],['GET',`/api/specialty-templates/${tid}/versions/x`],['GET',`/api/specialty-templates/${tid}/versions/2/x`]])assert.equal(allowedTemplates(m,path,body),false,path);
 const list=templatesResponse(`/api/specialty-templates/${tid}/versions`,200,{versions:[{revision:2,name:'A',department:'B',replacedAt:null,current:true},{revision:1,name:'A',department:'B',replacedAt:'2026-10-26T10:00:00.000Z',current:false}]});assert.equal(list.versions.length,2);
 assert.throws(()=>templatesResponse(`/api/specialty-templates/${tid}/versions`,200,{versions:[{revision:2,name:'A',department:'B',replacedAt:null,current:true,secret:'x'}]}));
 assert.throws(()=>templatesResponse(`/api/specialty-templates/${tid}/versions/1`,200,{...draft,id:'44444444-4444-4444-8444-444444444444',revision:1}));
 assert.equal(templatesResponse(`/api/specialty-templates/${tid}/versions/1`,200,{...draft,id:tid,revision:1}).revision,1);
});
test('SP2: Versions lists earlier versions and restores one as a draft without saving',async t=>{
 const user={id:'sp-owner',username:'Owner',email:'owner@example.invalid',role:'owner'},calls=[];
 const transport=async request=>{if(request.path==='/api/auth/login')return {status:200,body:{token:'fixture',deviceToken:'d'.repeat(43),user}};if(request.path==='/api/auth/me')return {status:200,body:{user}};calls.push(request);
  if(request.path.endsWith('/versions'))return {status:200,body:{versions:[{revision:2,name:'Editor',department:'Creative work',replacedAt:null,current:true},{revision:1,name:'Old editor',department:'Creative work',replacedAt:'2026-10-20T10:00:00.000Z',current:false}]}};
  if(request.path.endsWith('/versions/1'))return {status:200,body:{...draft,id:tid,name:'Old editor',instructions:'# The first text',revision:1}};
  throw Error('Unexpected route '+request.path);};
 const client=new SessionClient({live:transport});client.selectMode('live');await client.login(user.email,'Fixture only');
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container),restored=[];
 await act(async()=>{root.render(React.createElement(SpecialtyVersions,{client,template:{...draft,id:tid,name:'Editor',revision:2},disabled:false,onRestore:v=>restored.push(v)}));});await flush();
 t.after(async()=>{await act(async()=>root.unmount());client.cancel();container.remove();});
 assert.match(text(container),/Version 2\s*In use now/);assert.match(text(container),/Version 1 · Old editor/);assert.match(text(container),/The first text/);
 await click(button(container,'Restore as draft'));assert.equal(restored.length,1);assert.equal(restored[0].revision,1);assert.match(restored[0].instructions,/The first text/);
 assert.ok(calls.every(c=>c.method==='GET'));
});
