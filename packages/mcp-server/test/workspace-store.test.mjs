import test from 'node:test';import assert from 'node:assert/strict';import {callTool,TOOL_DEFINITIONS} from '../src/tools.ts';
const hash='b'.repeat(64);
const store={schema:1,featured:'girru:genvr',collections:[{id:'made-by-girru',title:'Made by Girru',items:['girru:genvr']}],categories:[{id:'worlds',title:'Worlds and 3D',icon:'globe'}],limited:[],items:[
 {id:'girru:genvr',name:'GenVR',summary:'3D worlds.',description:'',source:'girru',category:'worlds',state:'included',maker:'Girru',verified:true,version:null,updated:null,permissions:['Account'],worksWith:[],languages:[],update:null,hash:'a'.repeat(64)},
 {id:'registry:weather',name:'Weather',summary:'Forecasts.',description:'',source:'girru',category:'productivity',state:'available',maker:'Acme',verified:false,version:'1.0.0',updated:null,permissions:['Read the weather'],worksWith:[],languages:[],update:null,hash},
 {id:'claude-code:seo@acme',name:'seo',summary:'SEO.',description:'',source:'claude-code',category:'developer',state:'elsewhere',maker:'acme',verified:false,version:null,updated:null,permissions:[],worksWith:[],languages:[],update:null,hash:'c'.repeat(64)}]};
const fake=()=>{const calls=[];return {calls,backend:{async request(method,path,body){calls.push({method,path,body});if(path==='/api/store')return store;if(path==='/api/store/install')return {ok:true,state:'installed'};if(path==='/api/store/uninstall')return {ok:true,state:'available'};throw Error('unexpected '+path);}}};};
test('store MCP: the same browse, details and Add / Remove as the window, behind the same hash',async()=>{
 const {calls,backend}=fake();
 const home=await callTool('workspace_store',{operation:'home'},{backend});assert.equal(home.structuredContent.featured.id,'girru:genvr');assert.equal(home.structuredContent.collections[0].items[0].name,'GenVR');
 const found=await callTool('workspace_store',{operation:'search',query:'fore'},{backend});assert.deepEqual(found.structuredContent.items.map(x=>x.id),['registry:weather']);
 assert.deepEqual((await callTool('workspace_store',{operation:'search',source:'claude-code'},{backend})).structuredContent.items.map(x=>x.state),['elsewhere']);
 const page=await callTool('workspace_store',{operation:'app',id:'registry:weather'},{backend});assert.equal(page.structuredContent.hash,hash);assert.deepEqual(page.structuredContent.permissions,['Read the weather']);
 assert.equal((await callTool('workspace_store',{operation:'app',id:'girru:genvr'},{backend})).structuredContent.hash,null,'nothing to add for an included app');
 assert.ok(calls.every(c=>c.method==='GET'&&c.path==='/api/store'),'reading only reads');
 assert.notEqual((await callTool('workspace_store',{operation:'install',id:'registry:weather',hash},{backend})).isError,true);assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/store/install',body:{id:'registry:weather',hash}});
 assert.notEqual((await callTool('workspace_store',{operation:'uninstall',id:'registry:weather'},{backend})).isError,true);assert.deepEqual(calls.at(-1),{method:'POST',path:'/api/store/uninstall',body:{id:'registry:weather'}});
 for(const input of [{operation:'install',id:'registry:weather'},{operation:'install',id:'registry:weather',hash:'short'},{operation:'install',id:'../x',hash},{operation:'app'},{operation:'app',id:'nobody'},{operation:'home',id:'x'},{operation:'rate',id:'registry:weather'},{operation:'search',query:5}]){const n=calls.filter(c=>c.method==='POST').length;assert.equal((await callTool('workspace_store',input,{backend})).isError,true,JSON.stringify(input));assert.equal(calls.filter(c=>c.method==='POST').length,n);}
 const d=TOOL_DEFINITIONS.find(t=>t.name==='workspace_store');assert.match(d.description,/explicit instruction/);assert.match(d.description,/no ratings/);
});
