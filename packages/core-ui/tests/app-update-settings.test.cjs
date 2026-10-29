require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {noteLines,appUpdateBridge,AppUpdateSettings}=require('../src/AppUpdateSettings.tsx');
test('About and updates in the installed app: release notes as plain lines, nothing without the app bridge',()=>{
 assert.deepEqual(noteLines('## New\n- **Tasks** that repeat\n\n* The task page\n> quoted'),['New','Tasks that repeat','The task page','quoted']);
 assert.equal(noteLines(Array.from({length:20},(_,i)=>`- line ${i}`).join('\n')).length,8);
 assert.equal(appUpdateBridge(),null,'a browser or dev run has no app updater');
 const bridge={state:async()=>null,check:async()=>null,install:async()=>null,openRelease:async()=>null,onState:()=>()=>{}};
 assert.equal(renderToStaticMarkup(React.createElement(AppUpdateSettings,{bridge})),'','nothing until the app answers');
});
