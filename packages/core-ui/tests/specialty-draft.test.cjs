require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {draftChanges}=require('../src/specialty-draft.ts');
const {templatesResponse,TEMPLATES_PATH:P}=require('../src/specialty-contract.js');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),library=read('SpecialtyLibrary.tsx'),agentPart=read('AgentSpecialtiesSkills.tsx');
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const config=()=>({primarySkill:null,skills:[],tools:[],requirements:[],memoryRead:[],memoryWrite:[],sharedMemory:false,modes:{money:'ask'}});
const base=()=>({id,name:'Fictional editor',department:'research',description:'Edits',instructions:'# How you work',revision:3,config:config()});

test('the draft pane lists only what changed and points at its part (S-3)',()=>{
 const saved=base(),draft={...base(),instructions:'# Changed',config:{...config(),skills:['s'],modes:{money:'allow'}}};
 assert.deepEqual(draftChanges(draft,saved),[{field:'instructions',part:'instructions'},{field:'skills',part:'skills'},{field:'permissions',part:'permissions'}]);
 assert.deepEqual(draftChanges(base(),base()),[]);
 assert.equal(draftChanges({...base(),revision:0},null).length,8,'a new specialty lists every part');
 // The pane reuses the existing handlers and field names, and shows only while there are unsaved changes.
 assert.match(library,/const draftPane=view==='open'&&draft&&changed&&<aside className="sp-inspector sp-draft-pane" aria-label="In this draft">/);
 assert.match(library,/\{\.\.\.fieldName,skills:/);assert.match(library,/onClick=\{\(\)=>void reviewChanges\(\)\}><UiIcon name="diff" size=\{13\}\/>Compare with what agents use now/);assert.match(library,/onClick=\{throwAway\}><UiIcon name="undo" size=\{13\}\/>Throw the draft away/);
 assert.match(library,/\{view==='library'\?inspectorPane:draftPane\}/);
});

test('a specialty draft is never written to browser storage (it may hold pasted secrets)',()=>{const fs=require('node:fs'),path=require('node:path');
 for(const f of ['specialty-draft.ts','SpecialtyLibrary.tsx'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),/localStorage|sessionStorage|indexedDB/,f);
});
test('skills show readable titles, never package slugs',()=>{
 assert.match(library,/return s\?skillTitle\(s\.name\):'Skill no longer in Girru'/);assert.match(library,/<b>\{skillTitle\(s\.name\)\}<\/b>/);
 assert.match(agentPart,/return s\?skillTitle\(s\.name\):'A skill'/);assert.match(agentPart,/<b>\{skillTitle\(s\.name\)\}<\/b>/);
 assert.doesNotMatch(library+agentPart,/<b>\{s\.name\}<\/b>/);
 const {skillTitle}=require('../src/skill-display.ts');assert.equal(skillTitle('content-studio'),'Content studio');
});

test('a skill given directly that a specialty also brings can be taken back with Undo (S-2)',()=>{
 assert.match(agentPart,/const direct=selected\.includes\(id\)/);assert.match(agentPart,/also given directly/);
 assert.match(agentPart,/takeBackDirect=\(id:string\)=>void setSkills_\(selected\.filter\(x=>x!==id\)/,'reuses the same save, which offers Undo');
 assert.match(agentPart,/label:'Take back',icon:'unlink' as const/);
});

test('the Give sheet shows each agent’s role and department (S-5)',()=>{
 const body={agents:[{id:'main-agent',name:'Lina',role:'main',department:null,linked:false,missingTools:[]},{id:'helper',name:'Sam',role:'x'.repeat(41),department:'sales',linked:true,missingTools:[]}]};
 const out=templatesResponse(P+'/'+id+'/agents',200,body);
 assert.deepEqual(out.agents[0],{id:'main-agent',name:'Lina',linked:false,missingTools:[],role:'main'});
 assert.deepEqual(out.agents[1],{id:'helper',name:'Sam',linked:true,missingTools:[],department:'sales'},'an over-long role is dropped');
 assert.match(library,/\[a\.role\?roleLabel\[a\.role as Role\]\?\?a\.role:'',departmentName\(a\.department\)\]/);
});
