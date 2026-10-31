'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSystemTray}=require('../src/system-tray.cjs');
for(const platform of ['darwin','win32'])test(`${platform} tray exposes tools and checks updates without installing`,async()=>{
 let menu,template=false,checked=0,quit=0;const opened=[];let shown=0;
 const image={resize(){return this;},setTemplateImage(value){template=value;}};
 const electron={nativeImage:{createFromPath:()=>image},Tray:class{setToolTip(t){assert.equal(t,'Girru');}setContextMenu(m){menu=m;}on(){}},Menu:{buildFromTemplate:t=>t},app:{quit(){quit++;}}};
 const tray=createSystemTray({electron,platform,getWindow:()=>({isDestroyed:()=>false,isMinimized:()=>true,restore(){},show(){shown++;},focus(){}}),navigate:p=>opened.push(p),checkUpdates:()=>{checked++;}});
 assert.ok(tray);assert.equal(template,platform==='darwin');
 menu.find(x=>x.label==='New Chat').click();assert.deepEqual(opened,['new-chat']);
 menu.find(x=>x.label==='Tools').submenu[0].click();assert.equal(opened.at(-1),'agents');
 menu.find(x=>x.label==='Check for Updates…').click();await Promise.resolve();assert.equal(checked,1);assert.equal(opened.at(-1),'about');assert.equal(shown,3);
 menu.find(x=>x.label==='Quit Girru').click();assert.equal(quit,1);
});
