require('./load.cjs');require.extensions['.css']=()=>{};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {allowedLibrary,libraryResponse,validProfile,LIBRARY_PATH:P}=require('../src/personality-library-contract.js');
const {allowedRequest}=require('../src/session.ts'),{allowed}=require('../scripts/application-server.cjs');
const {validCreateBody,validBatchBody}=require('../src/hire-contract.js');
const {defaultLibraryId}=require('../src/personality-library.ts');
const {createBody}=require('../src/hire.ts');
const React=require('../node_modules/react'),{renderToStaticMarkup}=require('../node_modules/react-dom/server');
const {ProfileEditor,profileChanges}=require('../src/PersonalityLibrary.tsx');
const traits=Object.fromEntries(['doubt','caution','creativity','thoroughness','independence','verbosity','warmth','curiosity','persistence'].map(k=>[k,50]));
const profile={name:'Fictional reviewer',description:'Checks the brief',archetype:'Reviewer',strengths:'Review',blindSpots:'Speed',bestFor:'Checking',notFor:'Unreviewed action',samples:['I will check.','This requires approval.'],traits,dialect:'en',temperament:{extraversion:50,emotionalStability:50},pace:'balanced',formality:'neutral',humour:'off',seniority:'senior',principles:{do:'Check evidence',never:'Invent evidence',ask:'When approval is required'}};
test('library request allowlists agree at browser and bridge boundaries',()=>{
 const valid=[['GET',P],['GET',P+'/guardian/versions'],['PUT',P+'/new-id',{revision:0,profile}],['POST',P+'/guardian/preview',{revision:1,profile}],['POST',P+'/assigned/agent-one',{id:'guardian',revision:1,expectedVersion:0,linked:true}],['POST',P+'/assigned/agent-one/tune',{profile,expectedVersion:1}],['POST',P+'/guardian/try',{profile,prompt:'What next?'}]];
 for(const args of valid)for(const fn of [allowedLibrary,allowedRequest,allowed])assert.equal(fn(...args),true,JSON.stringify(args));
 for(const args of [['GET',P+'/../keys'],['PUT',P+'/new-id',{revision:0,profile:{...profile,tools:['exec']}}],['POST',P+'/guardian/try',{profile,prompt:'a'.repeat(2001)}],['POST',P+'/assigned/agent-one',{id:'guardian',revision:1,expectedVersion:0,linked:true,grants:['exec']}]] )for(const fn of [allowedLibrary,allowedRequest,allowed])assert.equal(fn(...args),false);
});
test('library responses reject malformed data and never project arbitrary metadata',()=>{
 const e={id:'guardian',revision:1,profile,archived:false,usedBy:0,privateKey:'not-for-client'};assert.equal(validProfile(profile),true);
 const projected=libraryResponse(P,200,{personalities:[e]});assert.equal(projected.personalities[0].privateKey,undefined);
 assert.throws(()=>libraryResponse(P,200,{personalities:[{...e,profile:{...profile,traits:{doubt:10}}}]}));
 assert.equal(libraryResponse(P,500,{error:'private server error'}),null);
});
test('hire and batch contracts select a library revision without traits',()=>{
 assert.equal(validCreateBody({role:'specialist',libraryPersonality:{id:'guardian',revision:1}}),true);
 assert.equal(validCreateBody({role:'specialist',libraryPersonality:{id:'guardian',revision:1},personality:{preset:'balanced-assistant'}}),false);
 assert.equal(validBatchBody({id:'fictional-batch',departments:[{department:'security',count:1,personalities:{specialist:{id:'guardian',revision:1}}}]}),true);
 const body=createBody({name:'',role:'specialist',department:'security',description:'',preset:'balanced-assistant',presetChosen:true,dialect:'',traits:{},libraryPersonality:{id:'guardian',revision:1}});assert.deepEqual(body.libraryPersonality,{id:'guardian',revision:1});assert.equal(body.personality,undefined);
});
test('role defaults match backend precedence',()=>{assert.equal(defaultLibraryId('main','security'),'main-agent');assert.equal(defaultLibraryId('manager','security'),'balanced-assistant');assert.equal(defaultLibraryId('evaluator','marketing'),'strict-evaluator');assert.equal(defaultLibraryId('specialist','dev'),'precise-developer');});
test('Big Five editing keeps confidence separate from emotional stability and inverts doubt',()=>{
 const html=renderToStaticMarkup(React.createElement(ProfileEditor,{value:{...profile,traits:{...traits,doubt:85}},onChange(){}}));assert.match(html,/Confidence/);assert.match(html,/Emotional stability/);assert.match(html,/value="15"/);
 const changes=profileChanges(profile,{...profile,traits:{...traits,doubt:85}});assert.deepEqual(changes,[{label:'Confidence',before:'50',after:'15'}]);
});
