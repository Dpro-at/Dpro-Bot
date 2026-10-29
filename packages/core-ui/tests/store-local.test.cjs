require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
const {viewItems,LOCAL_APPS}=require('../src/StoreView.tsx');
const it=(id,source,present,extra={})=>({id,kind:'app',source,name:id,summary:'',description:'',icon:null,maker:'',verified:false,version:null,updated:null,category:'developer',permissions:[],worksWith:[],languages:[],state:'elsewhere',present,update:null,hash:'a'.repeat(64),...extra});
test('SA5: a coding app’s place lists only its add-ons turned on on this computer',()=>{
 const data={schema:1,featured:null,collections:[],categories:[],limited:[],storeAsOf:null,items:[it('claude-code:github','claude-code',true),it('claude-code:figma','claude-code',false),it('codex:sentry','codex',true),it('girru:genvr','girru',true,{state:'included'})]};
 assert.deepEqual(LOCAL_APPS.map(([k])=>k),['claude-code','codex']);
 assert.deepEqual(viewItems(data,{kind:'all',category:'all',shelf:null,local:'claude-code'},'new').map(x=>x.id),['claude-code:github']);
 assert.deepEqual(viewItems(data,{kind:'all',category:'all',shelf:null,local:'codex'},'new').map(x=>x.id),['codex:sentry']);
 assert.equal(viewItems(data,{kind:'all',category:'all',shelf:null},'new').length,4,'the other places are unchanged');
});
