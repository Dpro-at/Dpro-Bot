import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dpro-personality-library-'));
process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'test.db');
process.env.JWT_SECRET=randomBytes(64).toString('hex');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');
const db=getDatabase();await db.initialize();
for(const [id,role]of [['library-owner','owner'],['library-admin','admin'],['library-user','user']])db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'fictional',?,'active')").run(id,id+'@example.invalid',id,role);
const {PersonalityLibrary,seedLibraryPersonality,libraryBehavior}=await import('../src/services/personality-library.ts');
const {blend,STARTERS,validateProfile}=await import('../src/services/personality-library-profile.ts');
const {sql,run}=await import('../src/repositories/sql-steps.ts');
const {getCurrentPersonality,savePersonalityVersion,setPersonalityLocked,rollbackPersonality}=await import('../src/services/personality-store.ts');
const {default:Fastify}=await import('fastify');const {registerAuthGate}=await import('../src/auth/auth-gate.ts');const {generateToken}=await import('../src/auth/jwt.ts');const {personalityLibraryRoutes}=await import('../src/api/routes/personality-library.ts');
const app=Fastify();registerAuthGate(app);await app.register(personalityLibraryRoutes);await app.ready();
const store=new PersonalityLibrary();await store.initialize();
const headers=id=>({authorization:'Bearer '+generateToken(id,1)});
const request=(method,url,payload,who='library-owner')=>app.inject({method,url,headers:headers(who),...(payload?{payload}:{})});
const base='/api/personality-library';
async function agent(id){await sql().tx(function*(){yield* run("INSERT INTO agents_config(id,name) VALUES(?,?)",id,id);yield* seedLibraryPersonality(id,'library-owner',{id:'temperament-balanced',revision:1});},{immediate:true});}
test('owner gates precede validation, including reads and writes',async()=>{
 for(const who of ['library-admin','library-user'])for(const [method,url,payload]of [['GET',base],['PUT',base+'/invalid',{bad:true}],['POST',base+'/blend',{bad:true}],['POST',base+'/assigned/test',{bad:true}]])assert.equal((await request(method,url,payload,who)).statusCode,403);
 assert.equal((await app.inject({method:'GET',url:base})).statusCode,401);
});
test('12 temperament starters are independent of occupations, valid and idempotent',async()=>{
 const first=await store.list();assert.equal(first.length,12);assert.equal(new Set(first.map(e=>e.id)).size,12);for(const e of first){assert.match(e.id,/^temperament-/);assert.equal(e.profile.archetype,'Temperament');validateProfile(e.profile);assert.equal(Object.keys(e.profile.traits).length,9);}
 assert.equal(first.find(p=>p.id==='temperament-calm').profile.temperament.emotionalStability,95);
 const p=await store.read('temperament-warm');p.profile.description='Saved edit';await store.save('library-owner',p.id,{revision:p.revision,profile:p.profile});await store.initialize();assert.equal((await store.read(p.id)).profile.description,'Saved edit');
});
test('linked changes bind the exact reviewed snapshot, preserve overrides, skip locked/copies',async()=>{
 for(const id of ['linked-one','locked-one','copy-one'])await agent(id);
 await savePersonalityVersion('linked-one',{traits:{warmth:91},lockedTraits:['caution']},'library-owner');
 await setPersonalityLocked('locked-one',true,'library-owner');
 await store.assign('library-owner','copy-one',{id:'temperament-balanced',revision:1,expectedVersion:1,linked:false});
 const e=await store.read('temperament-balanced');const draft=structuredClone(e.profile);draft.traits.creativity=95;draft.traits.caution=5;draft.traits.warmth=20;
 await assert.rejects(store.save('library-owner',e.id,{revision:e.revision,profile:draft}),/review_required/);
 const review=await store.preview(e.id,{revision:e.revision,profile:draft});
 await savePersonalityVersion('linked-one',{traits:{persistence:80}},'library-owner');
 await assert.rejects(store.save('library-owner',e.id,{revision:e.revision,profile:draft,confirmation:review.confirmation}),/review_required/);
 assert.equal((await store.read(e.id)).revision,1);
 const fresh=await store.preview(e.id,{revision:1,profile:draft});await store.save('library-owner',e.id,{revision:1,profile:draft,confirmation:fresh.confirmation});
 const p=await getCurrentPersonality('linked-one');assert.equal(p.traits.creativity,95);assert.equal(p.traits.warmth,91);assert.equal(p.traits.caution,e.profile.traits.caution);assert.equal(p.traits.persistence,80);
 assert.equal((await getCurrentPersonality('locked-one')).traits.creativity,e.profile.traits.creativity);assert.equal((await getCurrentPersonality('copy-one')).traits.creativity,e.profile.traits.creativity);
 assert.equal((await store.assignment('locked-one')).revision,1);assert.equal((await store.assignment('linked-one')).revision,2);
 await assert.rejects(store.save('library-owner',e.id,{revision:1,profile:draft}),/version_conflict/);
});
test('assignment is version fenced and never changes tool grants',async()=>{
 const before=await getCurrentPersonality('copy-one');const grants=db.prepare('SELECT * FROM agent_tool_grants WHERE agent_id=?').all('copy-one');
 await assert.rejects(store.assign('library-owner','copy-one',{id:'temperament-cautious',revision:1,expectedVersion:999,linked:true}),/version_conflict/);
 assert.equal((await getCurrentPersonality('copy-one')).version,before.version);
 await store.assign('library-owner','copy-one',{id:'temperament-cautious',revision:1,expectedVersion:before.version,linked:true});
 assert.deepEqual(db.prepare('SELECT * FROM agent_tool_grants WHERE agent_id=?').all('copy-one'),grants);
 assert.match((await libraryBehavior('copy-one')).promptBlock,/Additional working preferences/);
});
test('blend is deterministic, bounded, preserves both principles and rejects permission fields',()=>{
 const a=STARTERS[0].profile,b=STARTERS[1].profile;
 assert.deepEqual(blend(a,b,50),blend(a,b,50));assert.deepEqual(blend(a,b,100).traits,a.traits);assert.deepEqual(blend(a,b,0).traits,b.traits);
 assert.throws(()=>blend(a,b,NaN));assert.throws(()=>validateProfile({...a,tools:['exec']}));
});
test('archive is reversible and old links still read their snapshot',async()=>{
 const e=await store.read('temperament-cautious');await store.archive(e.id,{revision:e.revision,archived:true});await assert.rejects(store.read(e.id),/not_found/);
 assert.equal((await store.assignment('copy-one')).id,'temperament-cautious');assert.match((await libraryBehavior('copy-one')).promptBlock,/Additional working preferences/);
 await store.archive(e.id,{revision:e.revision,archived:false});assert.equal((await store.read(e.id)).id,e.id);
});
test('manual exams store exact profile revision and reject stale or invalid assessments',async()=>{
 const b={revision:1,answers:['I will ask.','I will try another way.','I need approval.'],ratings:[4,3,4]};
 const saved=await request('POST',base+'/temperament-cautious/exams',b);assert.equal(saved.statusCode,200,saved.body);assert.equal(saved.json().exams[0].score,92);
 assert.equal((await request('POST',base+'/temperament-cautious/exams',{...b,revision:999})).statusCode,409);
 assert.equal((await request('POST',base+'/temperament-cautious/exams',{...b,ratings:[5,3,4]})).statusCode,400);
});
test.after(async()=>{await app.close();closeDatabase();});

test('individual style overrides survive linked edits and rollback restores style',async()=>{
 const initial=await getCurrentPersonality('linked-one');const assigned=await store.assignment('linked-one');
 await store.tune('library-owner','linked-one',{expectedVersion:initial.version,profile:{...assigned.profile,formality:'formal',humour:'light'}});
 assert.match((await libraryBehavior('linked-one')).promptBlock,/Communication: formal; humour light/);
 const e=await store.read('temperament-balanced');const changed={...e.profile,pace:'fast'};const review=await store.preview(e.id,{revision:e.revision,profile:changed});await store.save('library-owner',e.id,{revision:e.revision,profile:changed,confirmation:review.confirmation});
 assert.match((await libraryBehavior('linked-one')).promptBlock,/Communication: formal; humour light/);assert.match((await libraryBehavior('linked-one')).promptBlock,/Pace: fast/);
 await rollbackPersonality('linked-one',initial.version,'library-owner');assert.doesNotMatch((await libraryBehavior('linked-one')).promptBlock,/Communication: formal; humour light/);assert.equal((await store.assignment('linked-one')).profile.traits.warmth,91);
});
test('preview is local-only, tools-free and redirect-refusing',async()=>{
 const {personalityPreview}=await import('../src/services/personality-preview.ts');const before=process.env.OLLAMA_URL;process.env.OLLAMA_URL='http://127.0.0.1:11434';
 const calls=[];const fetcher=async(url,init)=>{calls.push({url:String(url),init,body:JSON.parse(init.body)});return new Response(JSON.stringify({message:{content:'I will try another approach.'},done:true})+'\n',{status:200,headers:{'content-type':'application/x-ndjson'}});};
 try{const result=await personalityPreview(STARTERS[0].profile,'What next?',fetcher);assert.equal(result.generated,true);assert.equal(calls.length,1);assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].body.tools,undefined);assert.equal(calls[0].body.messages.length,2);process.env.OLLAMA_URL='https://example.invalid';await assert.rejects(personalityPreview(STARTERS[0].profile,'What next?',fetcher),/local_model_required/);assert.equal(calls.length,1);}finally{if(before===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=before;}
});

test('link mode preserves local overrides and remains version fenced',async()=>{
 const current=await getCurrentPersonality('linked-one'),before=await libraryBehavior('linked-one');await store.mode('linked-one',{expectedVersion:current.version,linked:false});assert.equal((await store.assignment('linked-one')).linked,false);assert.deepEqual((await getCurrentPersonality('linked-one')).traits,current.traits);assert.equal((await libraryBehavior('linked-one')).promptBlock,before.promptBlock);await assert.rejects(store.mode('linked-one',{expectedVersion:0,linked:true}),/version_conflict/);
});
test('new library hires are atomic, reject stale selection and never grant tools',async()=>{
 const {repositories}=await import('../src/repositories/index.ts');const {userActor}=await import('../src/repositories/actor.ts');const owner=userActor({id:'library-owner',role:'owner'}),admin=userActor({id:'library-admin',role:'admin'});
 const agent=await repositories.agents.createConfig(owner,{name:'Fictional Library Hire',role:'specialist',libraryPersonality:{id:'temperament-cautious',revision:1}});
 assert.equal((await store.assignment(agent.id)).id,'temperament-cautious');assert.equal((await getCurrentPersonality(agent.id)).traits.caution,95);assert.equal(db.prepare('SELECT COUNT(*) n FROM agent_tool_grants WHERE agent_id=?').get(agent.id).n,0);
 const before=db.prepare('SELECT COUNT(*) n FROM agents_config').get().n;
 await assert.rejects(repositories.agents.createConfig(owner,{name:'Fictional Stale Hire',role:'specialist',libraryPersonality:{id:'temperament-cautious',revision:999}}),/version_conflict/);assert.equal(db.prepare('SELECT COUNT(*) n FROM agents_config').get().n,before);
 await assert.rejects(repositories.agents.createConfig(admin,{name:'Fictional Admin Hire',role:'specialist',libraryPersonality:{id:'temperament-cautious',revision:1}}),/Only the owner/);
});
test('batch hires persist the reviewed library selection across runs',async()=>{
 const {createBatch,runBatch}=await import('../src/services/team-batch.ts');const input={id:'library-test-batch',departments:[{department:'security',count:1,personalities:{manager:{id:'temperament-cautious',revision:1},specialist:{id:'temperament-cautious',revision:1}}}]};
 await createBatch('library-owner',input);const first=await runBatch('library-owner',input.id);assert.equal(first.progress.created,1);assert.equal((await store.assignment(first.results[0].agentId)).id,'temperament-cautious');assert.equal((await runBatch('library-owner',input.id)).results.length,0);
 await assert.rejects(createBatch('library-owner',{...input,departments:[{...input.departments[0],personalities:{specialist:{id:'temperament-warm',revision:2}}}]}),/different batch/);
});
