require('./load.cjs');const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const React=require('../node_modules/react');const {renderToStaticMarkup}=require('../node_modules/react-dom/server');
const src=name=>fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
const {AppsAddons,matchAddons,addonState}=require('../src/AppsAddons.tsx');const {tileActions}=require('../src/WorkspaceApplications.tsx');const {sourceFacts}=require('../src/SourceCatalogue.tsx');const {scopeWords}=require('../src/ConnectionsSettings.tsx');const {footerToolItem,AppsWorkspace}=require('../src/AppsWorkspace.tsx');const {usualFooter}=require('../src/footer-prefs.ts');
const plugin=(name,extra={})=>({name,source:'codex',kind:'plugin',enabled:true,installed:true,count:0,...extra});
test('A1: add-ons can be searched from the sidebar by name or label',()=>{
 const items=[plugin('alpha@pub',{label:'Code review'}),plugin('beta@pub'),{...plugin('hooks'),kind:'hook',label:'Session start'}];
 assert.deepEqual(matchAddons(items,'').map(x=>x.name),['alpha@pub','beta@pub','hooks']);assert.deepEqual(matchAddons(items,' REVIEW ').map(x=>x.name),['alpha@pub']);assert.deepEqual(matchAddons(items,'beta').map(x=>x.name),['beta@pub']);assert.deepEqual(matchAddons(items,'session').map(x=>x.name),['hooks']);
 const ws=src('AppsWorkspace.tsx');assert.match(ws,/searchable=place==='mine'\|\|place==='addons'\|\|place==='catalogue'/);assert.match(ws,/<AppsAddons client=\{client\} refresh=\{refresh\} query=\{query\}/);
 const html=renderToStaticMarkup(React.createElement(AppsAddons,{client:{request:()=>new Promise(()=>{})},refresh:0,query:'x',onConnections(){}}));assert.match(html,/Reading add-ons/);
});
test('A9: a plugin missing from this computer says so instead of On/Off',()=>{
 assert.equal(addonState(plugin('a',{installed:false,enabled:true})),'Not on this computer');assert.equal(addonState(plugin('a',{installed:true,enabled:true})),'On');assert.equal(addonState(plugin('a',{installed:null,enabled:false})),'Off');assert.equal(addonState(plugin('a',{installed:null,enabled:null})),'Unknown');assert.equal(addonState({kind:'hook',installed:false,enabled:null}),'Not run here');
});
test('A3: right-click on a tile offers the inspector actions and keeps owner gates',()=>{
 const calls=[];const h=Object.fromEntries(['open','onAccountConnections','onPermissions','onManageConnections','toggle','edit','reconnect','remove'].map(k=>[k,()=>calls.push(k)]));
 const labels=items=>items.filter(x=>x!=='sep').map(x=>x.label);
 assert.deepEqual(labels(tileActions({id:'genvr',kind:'api',name:'GenVR'},{owner:true,busy:false},h)),['Open GenVR','Account connection…','Agent permissions…']);
 assert.deepEqual(labels(tileActions({id:'genvr',kind:'api',name:'GenVR'},{owner:false,busy:false},h)),['Open GenVR']);
 assert.deepEqual(labels(tileActions({id:'terminal',kind:'builtin',name:'Terminal'},{owner:true,busy:false},h)),['Open Terminal','Agent permissions…']);
 const mcp={id:'mcp:1',kind:'mcp',name:'Sample'};assert.deepEqual(tileActions(mcp,{owner:false,busy:false,server:{enabled:true}},h),[]);
 const off=tileActions(mcp,{owner:true,busy:false,server:{enabled:false}},h).filter(x=>x!=='sep');assert.deepEqual(labels(off),['Turn on','Edit connection…','Reconnect and refresh tools','Agent permissions…','Manage in MCP connections','Remove connection…']);assert.equal(off.find(x=>x.label.startsWith('Reconnect')).disabled,true);assert.equal(off.find(x=>x.label.startsWith('Remove')).danger,true);
 const busy=tileActions(mcp,{owner:true,busy:true,server:{enabled:true}},h).filter(x=>x!=='sep');assert.equal(busy[0].label,'Turn off');for(const x of busy)if(!['Agent permissions…','Manage in MCP connections'].includes(x.label))assert.equal(x.disabled,true,x.label);
 off.find(x=>x.label==='Manage in MCP connections').run();assert.deepEqual(calls,['onManageConnections']);
 assert.match(src('WorkspaceApplications.tsx'),/onContextMenu=\{e=>contextFor\(e,x\)\}/);
});
test('A6: the source catalogue uses the board words and letter tiles',()=>{
 assert.deepEqual(sourceFacts({present:true}).map(x=>x[0]),['On this computer','Works in Dpro','Asks for']);assert.equal(sourceFacts({present:false})[0][1],'Not found');
 const s=src('SourceCatalogue.tsx');assert.doesNotMatch(s,/Local presence|Compatibility|Activation|Present locally/);assert.match(s,/<Tile name=\{x\.name\}/);assert.match(s,/it may be out of date/);assert.match(s,/Dpro does not copy its keys/);
});
test('A8: GenVR access is shown in plain words, unknown codes pass through',()=>{
 assert.equal(scopeWords('worlds:read'),'See your spaces');assert.equal(scopeWords('worlds:write'),'Save worlds as private drafts');assert.equal(scopeWords('worlds:publish'),'Publish only after you agree');assert.equal(scopeWords('worlds:join'),'Join worlds');assert.equal(scopeWords('items:new'),'items:new');
 assert.match(src('ConnectionsSettings.tsx'),/\{scopeWords\(x\)\}/);
});
test('S5: GenVR, Terminal and Code rows can be shown in or hidden from the footer',()=>{
 const prefs=usualFooter(),toggled=[];
 for(const id of ['genvr','terminal','code']){const item=footerToolItem(prefs,id,x=>toggled.push(x));assert.equal(item.label,'Show in the footer');assert.equal(item.checked,!prefs.hidden.includes(id));item.run();}
 assert.deepEqual(toggled,['genvr','terminal','code']);assert.equal(footerToolItem(prefs,'mcp',()=>{}),null);
 assert.equal(footerToolItem({...prefs,hidden:[...prefs.hidden,'genvr']},'genvr',()=>{}).checked,false);assert.equal(footerToolItem({...prefs,hidden:prefs.hidden.filter(x=>x!=='genvr')},'genvr',()=>{}).checked,true);
 assert.match(src('FooterSettings.tsx'),/can be pinned from Apps/);
 const html=renderToStaticMarkup(React.createElement(AppsWorkspace,{client:{getSnapshot:()=>({user:{id:'o',username:'Owner',email:'o@example.test',role:'owner'}})},active:true,onOpen(){},onConnections(){},onPermissions(){}}));assert.match(html,/GenVR/);
});
