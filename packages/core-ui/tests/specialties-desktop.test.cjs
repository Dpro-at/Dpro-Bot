require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
const React=require('../node_modules/react'),{renderToStaticMarkup}=require('../node_modules/react-dom/server'),fs=require('node:fs'),path=require('node:path');
const {SpecialtyLibrary,specialtyFamily}=require('../src/SpecialtyLibrary.tsx');
const source=fs.readFileSync(path.join(__dirname,'../src/SpecialtyLibrary.tsx'),'utf8');
test('the Specialties section owns its sidebar places and departments (SP1)',()=>{
 const html=renderToStaticMarkup(React.createElement(SpecialtyLibrary,{client:{}}));
 for(const place of ['In my team','All specialties','Coming soon','Departments','Technology and security','Creative work','Business and customers','Education and knowledge','People and support','Industry and environment','Organisation and services'])assert.match(html,new RegExp(place));
 assert.match(html,/aria-label="Find a specialty"/);assert.match(html,/aria-label="New specialty"/);assert.match(html,/title="New specialty \(⌘N\)"/);assert.match(html,/title="Show or hide details \(⌥⌘I\)"/);
 assert.doesNotMatch(html,/[▸⌄→]/,'no text glyphs as controls');assert.ok((html.match(/class="primary/g)??[]).length<=1,'at most one filled button');assert.doesNotMatch(html,/Previous|Next/,'one scrolling list, no pages');
});
test('pick mode for hiring keeps the places but no New or Give',()=>{
 const html=renderToStaticMarkup(React.createElement(SpecialtyLibrary,{client:{},hire:true}));assert.match(html,/Choose specialty template/);assert.match(html,/Choose a specialty/);assert.doesNotMatch(html,/New specialty|Give to/);
});
test('catalogue departments fall into the seven sidebar departments',()=>{
 assert.equal(specialtyFamily('Software development'),'Technology and security');assert.equal(specialtyFamily('Cyber security'),'Technology and security');assert.equal(specialtyFamily('Marketing'),'Business and customers');assert.equal(specialtyFamily('Human resources'),'People and support');assert.equal(specialtyFamily('Something else'),'Organisation and services');
});
test('every page action keeps its owner gate and plain words (SP2–SP6)',()=>{
 // Update needs the reviewed impact confirmation; the page never invents one.
 assert.match(source,/confirmImpact:snapshot\.confirmation/);assert.match(source,/\/preview`,body/);
 // Giving sends the expected current agents so a stale screen cannot overwrite links; Undo replays the opposite step.
 assert.match(source,/expectedAgentIds:expected/);assert.match(source,/assign\(step\.before,step\.after,true\)/);
 // Hire keeps one request id across retries and needs the owner's check.
 assert.match(source,/const body=pending\?\?/);assert.match(source,/disabled=\{busy\|\|!confirmed\|\|!hirePersonality/);
 // A changed tool definition is never silently accepted.
 assert.match(source,/fingerprint:before\?before\.fingerprint:t\.fingerprint/);
 for(const words of ['Give to an agent…','Take back','Update ${plural','Hire with this…','Throw the draft away','Copy as a new specialty','Needs something Girru doesn’t have yet…','Remove old choice','No tool or memory permission changes.','Their personality and own rules stay.','I checked the job, its tools and what it asks before.'])assert.ok(source.includes(words),words);
 assert.doesNotMatch(source,/localStorage|sessionStorage|dangerouslySetInnerHTML/);
 // Long texts open the shared editor; the only plain box is the few lines for "Describe it" (board SP3b).
 assert.equal((source.match(/<textarea/g)??[]).length,1);assert.match(source,/Describe the job in a few lines<textarea rows=\{4\} maxLength=\{2000\}/);
});
