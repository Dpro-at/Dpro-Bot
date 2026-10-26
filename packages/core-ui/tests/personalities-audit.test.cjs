require('./load.cjs');require.extensions['.css']=()=>{};
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const React=require('../node_modules/react'),{renderToStaticMarkup}=require('../node_modules/react-dom/server');
const lib=require('../src/PersonalityLibrary.tsx');
const {PersonalityReview}=require('../src/PersonalityReview.tsx');
const {fictionalPersonalityProposal:fixture}=require('../src/personality-fixture.ts');
const traits=Object.fromEntries(['doubt','caution','creativity','thoroughness','independence','verbosity','warmth','curiosity','persistence'].map(k=>[k,50]));
const profile={name:'Calm',description:'Composed and gentle',archetype:'Temperament',strengths:'',blindSpots:'',bestFor:'',notFor:'',samples:[],traits,dialect:'en',temperament:{extraversion:35,emotionalStability:70},pace:'deliberate',formality:'neutral',humour:'light',seniority:'senior',principles:{do:'',never:'',ask:''}};
const render=(C,props)=>renderToStaticMarkup(React.createElement(C,props));
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');

test('P-4: the "Update N agents" review uses the editor’s own words',()=>{
 const after={...profile,description:'New line',archetype:'Steady',blindSpots:'Slow',bestFor:'Reviews',notFor:'Rush jobs',pace:'fast',temperament:{extraversion:60,emotionalStability:70},samples:['Hi'],principles:{do:'Check twice',never:'Guess',ask:'When unsure'}};
 const labels=lib.profileChanges(profile,after).map(c=>c.label);
 for(const w of ['In one line','Style','Things to watch','Works well for','Less suited to','Social energy','Pace','Prefer','Avoid','When to ask','Example replies'])assert.ok(labels.includes(w),w);
 for(const old of ['Description','Archetype','Blind spots','Best for','Not for','Extraversion','Do','Never','When to stop and ask','Sample replies'])assert.ok(!labels.includes(old),old);
 assert.deepEqual(lib.profileChanges(profile,after).find(c=>c.label==='Pace'),{label:'Pace',before:'Deliberate',after:'Fast'});
 assert.deepEqual(lib.profileChanges(profile,{...profile,traits:{...traits,doubt:85}}),[{label:'Confidence',before:'50',after:'15'}]);
});
test('P-6: the library inspector says "Starter" for a personality shipped with Dpro',()=>{
 const props={team:null,busy:false,onOpen(){},onGive(){},onRestore(){},onMenu(){},onClose(){}};
 assert.match(render(lib.Inspector,{...props,entry:{id:'calm',revision:1,profile,archived:false,usedBy:2,starter:true}}),/Starter · used by 2 agents/);
 const mine=render(lib.Inspector,{...props,entry:{id:'mine',revision:1,profile,archived:false,usedBy:1,starter:false}});
 assert.doesNotMatch(mine,/Starter/);assert.match(mine,/Used by 1 agent</);
});
const controller=state=>({subscribe:()=>()=>{},getSnapshot:()=>state,list(){},open(){},review(){},decide(){}});
test('P-8: earlier suggestions stay listed, and Source and Created are back',()=>{
 const old={...fixture,id:fixture.id.replace(/.$/,c=>c==='a'?'b':'a'),status:'approved',reason:'Shorter status updates',decidedBy:'owner',decidedAt:'2026-10-15T10:00:00.000Z'};
 const base={agentId:fixture.agentId,owner:true,phase:'ready',consent:false};
 const only=render(PersonalityReview,{controller:controller({...base,proposals:[old]})});
 assert.match(only,/Earlier suggestions/);assert.match(only,/Agreed/);assert.match(only,/Shorter status updates/);
 const open=render(PersonalityReview,{controller:controller({...base,proposals:[fixture,old],detail:fixture})});
 assert.match(open,/Earlier suggestions/);assert.match(open,/<dt>Source<\/dt><dd>The agent<\/dd>/);assert.match(open,/<dt>Created<\/dt>/);assert.match(open,/1 of 1/);
 assert.equal(render(PersonalityReview,{controller:controller({...base,proposals:[]})}),'');
});
test('P-3: the agent’s own adjustments use the library sliders with a mark at the library value, and a Speaking sheet',()=>{
 const html=render(lib.Slider,{k:'warmth',p:profile,mark:70,markName:'Calm',onChange(){}});
 assert.match(html,/class="pl-mark"/);assert.match(html,/Calm: 70%/);assert.doesNotMatch(render(lib.Slider,{k:'warmth',p:profile,onChange(){}}),/pl-mark/);
 const src=read('AgentPersonalityLibrary.tsx');
 assert.doesNotMatch(src,/ProfileEditor/);assert.match(src,/characterKeys\.map/);assert.match(src,/Speaking, language and guidelines…/);assert.match(src,/<SpeakingPart/);
});
test('P-2 and P-5: ⌘L has a handler, and every personality face is drawn by PersonalityMark',()=>{
 const src=read('AgentPersonalityLibrary.tsx');
 assert.match(src,/key\.toLowerCase\(\)==='l'/);assert.doesNotMatch(src,/PersonalityFace\(|PersonalityFace name/);
 assert.match(read('StaffDirectory.tsx'),/<PersonalityMark profile=\{profile\}/);
 assert.match(render(lib.PersonalityMark,{profile:null}),/pl-face/);
});
test('P-7: Team balance rows drag onto a personality in the sidebar and use give() with Undo',()=>{
 const src=read('PersonalityLibrary.tsx');
 assert.match(src,/draggable=\{!a\.locked\}/);assert.match(src,/onDrop=\{ev=>/);assert.match(src,/void give\(a,e\)/);
 assert.match(src,/Drag an agent onto another personality in the sidebar/);
});
