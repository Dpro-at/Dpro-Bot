require('./load.cjs');require.extensions['.css']=()=>{};
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const React=require('../node_modules/react'),{renderToStaticMarkup}=require('../node_modules/react-dom/server');
const lib=require('../src/PersonalityLibrary.tsx');
const {libraryResponse,LIBRARY_PATH:P}=require('../src/personality-library-contract.js');
const traits=Object.fromEntries(['doubt','caution','creativity','thoroughness','independence','verbosity','warmth','curiosity','persistence'].map(k=>[k,50]));
const profile={name:'Calm',description:'Composed and gentle',archetype:'Temperament',strengths:'',blindSpots:'',bestFor:'',notFor:'',samples:[],traits,dialect:'en',temperament:{extraversion:35,emotionalStability:70},pace:'deliberate',formality:'neutral',humour:'light',seniority:'senior',principles:{do:'Check evidence',never:'',ask:''}};
const render=(C,props)=>renderToStaticMarkup(React.createElement(C,props));
const source=fs.readFileSync(path.join(__dirname,'../src/PersonalityLibrary.tsx'),'utf8');

test('PL1 places: sidebar places, "Made by me" means not shipped, archived stays apart',()=>{
 assert.deepEqual(lib.places.map(p=>p.name),['All personalities','In my team','Made by me','Team balance','Archived']);
 const e=(o)=>({id:'x',revision:1,profile,archived:false,usedBy:0,starter:true,...o});
 assert.equal(lib.inPlace(e(),'all'),true);assert.equal(lib.inPlace(e(),'mine'),false);assert.equal(lib.inPlace(e({starter:false}),'mine'),true);
 assert.equal(lib.inPlace(e(),'team'),false);assert.equal(lib.inPlace(e({usedBy:2}),'team'),true);
 assert.equal(lib.inPlace(e({archived:true}),'all'),false);assert.equal(lib.inPlace(e({archived:true}),'archived'),true);
 assert.equal(lib.inPlace(e(),'all','gentle'),true);assert.equal(lib.inPlace(e(),'all','loud'),false);
});
test('faces are drawn from traits, never a generic contact icon',()=>{
 assert.equal(lib.faceIcon(profile),'face-calm');assert.equal(lib.faceIcon({...profile,temperament:{extraversion:60,emotionalStability:50},traits:{...traits,creativity:80}}),'face-curious');
 assert.equal(lib.faceIcon({...profile,temperament:{extraversion:70,emotionalStability:50},traits:{...traits,doubt:20}}),'face-bold');
 assert.match(render(lib.PersonalityMark,{profile}),/pl-face/);assert.doesNotMatch(source,/name="contact"/);
});
test('PL2 Character shows ten sliders with word ends; Speaking holds reply length; all eleven kept',()=>{
 const c=render(lib.CharacterPart,{p:profile,onChange(){}}),s=render(lib.SpeakingPart,{p:profile,onChange(){}});
 assert.equal((c.match(/type="range"/g)||[]).length,10);assert.equal((s.match(/type="range"/g)||[]).length,1);
 for(const w of ['Quiet','Outgoing','Sensitive','Steady','Unsure','Sure','Keeps going'])assert.match(c,new RegExp(w));assert.match(s,/Reply length/);assert.match(s,/Short/);
 assert.equal(new Set([...lib.characterKeys,'verbosity']).size,11);
 assert.doesNotMatch(c+s,/<details|<summary|Seniority/);assert.match(c,/never its skills or permissions/);
 assert.match(c,/aria-label="Name"/);assert.match(c,/In one line/);
 for(const g of ['Pace','Formality','Humour'])assert.match(s,new RegExp(`role="radiogroup" aria-label="${g}"`));assert.match(s,/Language and dialect/);
});
test('confidence stays the inverse of doubt and zero stays a real value',()=>{
 const p={...profile,traits:{...traits,doubt:85}};assert.equal(lib.sliderValue(p,'doubt'),15);assert.equal(lib.withSlider(p,'doubt',0).traits.doubt,100);assert.equal(lib.withSlider(p,'warmth',0).traits.warmth,0);assert.equal(lib.withSlider(p,'extraversion',10).temperament.extraversion,10);
});
test('PL3c exam: three fixed questions, five dots each with words, no model and the approval rule kept',()=>{
 const html=render(lib.PersonalityExam,{client:{},entry:{id:'calm',revision:3,profile,archived:false}});
 assert.equal((html.match(/role="radio"/g)||[]).length,15);for(const w of lib.ratingWords)assert.match(html,new RegExp(`title="${w}"`));
 assert.match(html,/no model runs here/);assert.match(html,/Never rate skipping an approval as a match/);assert.match(html,/Save the rating/);
 assert.match(render(lib.PersonalityExam,{client:{},entry:{id:'n',revision:0,profile,archived:false}}),/Keep the personality first/);
});
test('Try it uses the local model only and says so',()=>{
 const html=render(lib.HowItSounds,{client:{},tryId:'calm',profile,compact:true});assert.match(html,/How it sounds/);assert.match(html,/updates when you stop moving a slider/);
 assert.match(source,/never uses a paid model instead/);assert.match(source,/`\$\{P\}\/\$\{tryId\}\/try`/);
});
test('PL4 team balance groups by working preference, never by skill',()=>{
 assert.equal(lib.workStyle({...traits,thoroughness:80}),'thorough');assert.equal(lib.workStyle({...traits,creativity:80}),'inventive');assert.equal(lib.workStyle(traits),'balanced');
 assert.match(source,/never measures skill or gives access/);
});
test('desktop rules: no text glyph controls, linked updates confirmed by the owner, undo instead of Save/Discard',()=>{
 assert.doesNotMatch(source,/[▸⌄→]/);assert.doesNotMatch(source,/>Save changes<|>Discard</);
 assert.match(source,/confirmation:r\.confirmation/);assert.match(source,/Keep editing/);assert.match(source,/Throw the draft away/);
 assert.match(source,/d\.review\|\|d\.saving/,'a personality agents follow never saves by itself');
 for(const k of ['⌘N','⌘G','⌘Z','Enter','Esc','⌘F'])assert.ok(source.includes(k),k);
 assert.doesNotMatch(source,/\bfetch\(|localStorage|sessionStorage/);
});
test('list and team responses carry faces data but drop anything unknown',()=>{
 const e={id:'calm',revision:1,profile,archived:false,usedBy:1,starter:true,agents:[{id:'agent-one',name:'Calm leader',secret:'x'}],privateKey:'no'};
 const out=libraryResponse(P,200,{personalities:[e]}).personalities[0];assert.equal(out.starter,true);assert.deepEqual(out.agents,[{id:'agent-one',name:'Calm leader'}]);assert.equal(out.privateKey,undefined);
 assert.equal(libraryResponse(P,200,{personalities:[{...e,starter:undefined,agents:undefined}]}).personalities[0].starter,false);
 assert.throws(()=>libraryResponse(P,200,{personalities:[{...e,agents:[{id:'../x',name:'bad'}]}]}));
 const t=libraryResponse(P+'/team',200,{agents:[{id:'agent-one',name:'Calm leader',department:null,traits,locked:false,linked:true,version:4,personalityId:'calm',grants:['exec']}],gaps:[]}).agents[0];
 assert.deepEqual(t,{id:'agent-one',name:'Calm leader',department:null,traits,locked:false,linked:true,version:4,personalityId:'calm'});
 assert.throws(()=>libraryResponse(P+'/team',200,{agents:[{id:'a',name:'A',traits,personalityId:'../x'}],gaps:[]}));
});
test('new personality starts empty in the middle',()=>{const p=lib.emptyProfile(profile);assert.equal(p.name,'New personality');assert.ok(Object.values(p.traits).every(v=>v===50));assert.deepEqual(p.temperament,{extraversion:50,emotionalStability:50});assert.equal(p.seniority,'senior');});
test('hiring and the company wizard pick a personality by its face, not a plain select',()=>{
 const html=render(lib.PersonalityPicker,{client:{request:async()=>({status:200,body:{personalities:[]}})},onPick(){}});
 assert.match(html,/class="pl-picker"/);assert.match(html,/aria-haspopup="dialog"/);assert.doesNotMatch(html,/<select/);assert.match(html,/Choose a personality/);
});

test('seniority shows in Speaking, in the summary and in the change list (tone only)',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{SpeakingPart}=require('../src/PersonalityLibrary.tsx');
 const html=renderToStaticMarkup(React.createElement(SpeakingPart,{p:profile,onChange:()=>{}}));
 assert.match(html,/aria-label="Sounds like"/);assert.match(html,/role="radio" aria-checked="true">Senior</);assert.match(html,/tone only, never rank or permissions/);
 assert.deepEqual(lib.profileChanges(profile,{...profile,seniority:'lead'}).map(c=>[c.label,c.before,c.after]),[['Sounds like','Senior','Lead']]);
});
