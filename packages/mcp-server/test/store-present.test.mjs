import test from 'node:test';import assert from 'node:assert/strict';import {callTool} from '../src/tools.ts';
test('workspace_store search: present true lists only what is on this computer (SA5)',async()=>{
 const items=[{id:'claude-code:github',kind:'app',source:'claude-code',name:'GitHub',summary:'',maker:'',category:'developer',state:'elsewhere',present:true},{id:'claude-code:figma',kind:'app',source:'claude-code',name:'Figma',summary:'',maker:'',category:'developer',state:'elsewhere',present:false}];
 const backend={async request(){return {schema:1,featured:null,collections:[],categories:[],items,limited:[]};}};
 const r=await callTool('workspace_store',{operation:'search',source:'claude-code',present:true},{backend});
 assert.notEqual(r.isError,true);assert.match(JSON.stringify(r),/github/i);assert.doesNotMatch(JSON.stringify(r),/figma/i);
 assert.equal((await callTool('workspace_store',{operation:'search',present:'yes'},{backend})).isError,true);
});
