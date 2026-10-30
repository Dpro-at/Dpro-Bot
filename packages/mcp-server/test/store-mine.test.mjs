import test from 'node:test';import assert from 'node:assert/strict';import {callTool} from '../src/tools.ts';
// SA6: My apps is the Store's first place; long lists come in parts; a private app is the owner's own click.
test('workspace_store mine lists My apps with private apps; MCP connections stay in Settings',async()=>{
 const backend={async request(method,path){assert.equal(method,'GET');assert.equal(path,'/api/apps');return {items:[{id:'terminal',kind:'builtin',name:'Terminal',summary:''},{id:'app:my-crm',kind:'added',origin:'private',sourceId:'my-crm',name:'My CRM',summary:''},{id:'app:notes',kind:'added',origin:'store',sourceId:'notes',name:'Notes',summary:''},{id:'mcp:x',kind:'mcp',name:'Server',summary:''}]};}};
 const r=await callTool('workspace_store',{operation:'mine'},{backend}),text=JSON.stringify(r);
 assert.notEqual(r.isError,true);assert.match(text,/private:my-crm/);assert.match(text,/private app/);assert.match(text,/store:notes/);assert.doesNotMatch(text,/Server/);
});
test('workspace_store search pages: 40 by default, limit and after, with a next value',async()=>{
 const items=Array.from({length:95},(_,i)=>({id:`girru:a${i}`,kind:'app',source:'girru',name:`App ${i}`,summary:'',maker:'',category:'more',state:'available'}));
 const backend={async request(){return {schema:1,featured:null,collections:[],categories:[],items,limited:[]};}};
 const r1=await callTool('workspace_store',{operation:'search'},{backend});assert.match(JSON.stringify(r1),/after 40/);
 const r2=await callTool('workspace_store',{operation:'search',limit:50,after:90},{backend});assert.match(JSON.stringify(r2),/App 94/);assert.doesNotMatch(JSON.stringify(r2),/App 89/);
 for(const bad of [{limit:0},{limit:101},{after:-1},{after:1.5}])assert.equal((await callTool('workspace_store',{operation:'search',...bad},{backend})).isError,true,JSON.stringify(bad));
});
test('workspace_store add_private is refused: only the owner adds a private app, in the app',async()=>{
 let called=false;const backend={async request(){called=true;return {};}};
 const r=await callTool('workspace_store',{operation:'add_private'},{backend});
 assert.equal(r.isError,true);assert.match(JSON.stringify(r),/Add an app from a folder/);assert.equal(called,false);
});
