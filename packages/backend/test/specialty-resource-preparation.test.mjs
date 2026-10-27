import test,{after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'specialty-resource-'));process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'fixture.db');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');process.env.JWT_SECRET=randomBytes(64).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();
for(const [id,role]of [['resource-owner','owner'],['resource-user','user']])db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'fixture',?,'active')").run(id,id+'@example.invalid',id,role);
const {SpecialtyTemplates}=await import('../src/services/specialty-templates.ts'),{SpecialtyDistribution,loadProfessionalSource}=await import('../src/services/specialty-distribution.ts'),{SpecialtyResourcePreparation}=await import('../src/services/specialty-resource-preparation.ts'),{CentralSkills}=await import('../src/skills/central-store.ts');
let bindingFixture;
const templates=new SpecialtyTemplates(),store=new CentralSkills(root,path.join(root,'skill-library')),service=new SpecialtyResourcePreparation(templates,store),distribution=new SpecialtyDistribution(templates);
await templates.initialize();const loaded=loadProfessionalSource(),sourceRole=loaded.pack.specialties.find(r=>r.name==='AI application developer'),sourceKey=loaded.current.roles.find(r=>r.id===sourceRole.id).sourceKey,templateId=loaded.seeds.find(r=>r.sourceKey===sourceKey).id,resourceId=sourceRole.skills[0],source=loaded.pack.skills.find(s=>s.id===resourceId);
const oldFiles=source.files.map(f=>({...f,content:f.content+(f.path==='SKILL.md'?'\nFictional older package.\n':'')})),old=(await store.installPortable(source.name,oldFiles)).skill;
async function reset(){db.prepare('UPDATE central_skills SET content_hash=?,revision=revision+1 WHERE id=?').run(old.content_hash,old.id);}
const agent=()=>{const id=randomUUID();db.prepare('INSERT INTO agents_config(id,name,system_prompt) VALUES(?,?,?)').run(id,'Fixture '+id,'Keep rules');return id;};
const protect=()=>['agent_tool_grants','agent_permissions','agent_specialties','central_agent_skills','agent_template_snapshots'].map(t=>db.prepare('SELECT * FROM '+t+' ORDER BY 1').all());
after(()=>closeDatabase());
test('review lists shared specialties and linked/direct/copied agents; package save preserves bindings and authority',async()=>{
 const live=await templates.get(templateId),{id,...draft}=live;await templates.save(id,{...draft,config:{...draft.config,skills:[old.id]}});
 const linked=agent(),direct=agent(),copied=agent();db.prepare('INSERT INTO agent_specialties(agent_id,template_id,linked_by) VALUES(?,?,?)').run(linked,id,'resource-owner');db.prepare('INSERT INTO central_agent_skills(agent_id,skill_id) VALUES(?,?)').run(direct,old.id);
 db.prepare('INSERT INTO agent_template_snapshots(agent_id,template_id,template_revision,content_hash,config_json,primary_skill_id) VALUES(?,?,?,?,?,?)').run(copied,id,1,'f'.repeat(64),JSON.stringify({...draft.config,skills:[]}),old.id);
 const before=protect(),packages=db.prepare('SELECT * FROM central_skills').all();db.prepare('PRAGMA query_only=ON').run();let review;
 try{review=await service.review('resource-owner',sourceKey,resourceId);}finally{db.prepare('PRAGMA query_only=OFF').run();}
 assert.equal(review.kind,'package');assert.ok(review.specialties.some(t=>t.id===id));for(const a of [linked,direct,copied])assert.ok(review.agents.some(x=>x.id===a));assert.ok(review.files.some(f=>f.path==='SKILL.md'&&f.before.includes('Fictional older package')&&!f.after.includes('Fictional older package')));assert.deepEqual(protect(),before);assert.deepEqual(db.prepare('SELECT * FROM central_skills').all(),packages);
 const configBefore=db.prepare('SELECT config_json FROM specialty_templates WHERE id=?').get(id).config_json;
 const receipt=await service.apply('resource-owner',sourceKey,resourceId,review.reviewToken);assert.equal(receipt.revision,review.revision+1);assert.deepEqual(protect(),before);assert.equal(db.prepare('SELECT config_json FROM specialty_templates WHERE id=?').get(id).config_json,configBefore);assert.ok(fs.existsSync(path.join(root,'skill-library/objects',old.content_hash,'SKILL.md')));
 assert.equal((await distribution.preview('resource-owner')).roles.find(r=>r.sourceKey===sourceKey).packResources[0].status,'current');await assert.rejects(service.apply('resource-owner',sourceKey,resourceId,review.reviewToken),/upgrade_not_available/);
});
test('proof binds owner, package revision and affected set',async()=>{
 await reset();let review=await service.review('resource-owner',sourceKey,resourceId);await assert.rejects(service.apply('resource-user',sourceKey,resourceId,review.reviewToken),/review_changed/);await assert.rejects(service.apply('resource-owner',sourceKey,resourceId,'a'.repeat(64)),/review_changed/);
 const added=agent();db.prepare('INSERT INTO central_agent_skills(agent_id,skill_id) VALUES(?,?)').run(added,old.id);await assert.rejects(service.apply('resource-owner',sourceKey,resourceId,review.reviewToken),/review_changed/);
 review=await service.review('resource-owner',sourceKey,resourceId);db.prepare('UPDATE central_skills SET revision=revision+1 WHERE id=?').run(old.id);await assert.rejects(service.apply('resource-owner',sourceKey,resourceId,review.reviewToken),/review_changed/);
});
test('an affected-set change inside persistence refuses the package update',async()=>{
 await reset();const delegate=Object.create(store);delegate.installReviewedPortable=async(...args)=>{agent();return store.installReviewedPortable(...args);};const racing=new SpecialtyResourcePreparation(templates,delegate),review=await racing.review('resource-owner',sourceKey,resourceId),before=db.prepare('SELECT * FROM central_skills WHERE id=?').get(old.id);
 await assert.rejects(racing.apply('resource-owner',sourceKey,resourceId,review.reviewToken),/review_changed/);assert.deepEqual(db.prepare('SELECT * FROM central_skills WHERE id=?').get(old.id),before);
});
test('missing package and later binding are separately reviewed; content and permissions stay unchanged',async()=>{
 const entry=(await distribution.preview('resource-owner')).roles.find(r=>r.status==='content_update_available'&&r.packResources.length===1&&r.packResources[0].status==='missing'),ref=entry.packResources[0].sourceId;
 bindingFixture=entry.sourceKey;
 const linked=agent();db.prepare('INSERT INTO agent_specialties(agent_id,template_id,linked_by) VALUES(?,?,?)').run(linked,entry.installedIds[0],'resource-owner');
 const {setAgentGrants}=await import('../src/tools/grants.ts'),{createAgentToolsRegistry}=await import('../src/tools/index.ts'),{loadAgentPermissions,setAgentPermissions}=await import('../src/tools/agent-permissions.ts');
 await setAgentGrants(linked,{grants:['read']},'resource-owner',(await createAgentToolsRegistry({workspaceDir:root})).listRegistered());const permissions=await loadAgentPermissions(linked);await setAgentPermissions(linked,{memoryRead:['task'],memoryWrite:[],sharedMemory:false,modes:permissions.modes},permissions.version,'resource-owner');
 const before=await templates.get(entry.installedIds[0]),configuration=structuredClone(before.config),protectedBefore=protect();
 const review=await service.review('resource-owner',entry.sourceKey,ref);assert.equal(review.revision,0);assert.ok(review.files.every(f=>f.before===''));
 await service.apply('resource-owner',entry.sourceKey,ref,review.reviewToken);assert.deepEqual(await templates.get(before.id),before);await assert.rejects(distribution.review('resource-owner',entry.sourceKey),/resources_not_ready/);
 const binding=await service.review('resource-owner',entry.sourceKey,'bindings');assert.equal(binding.kind,'bindings');assert.ok(binding.bindings.length);assert.ok(binding.agents.some(a=>a.id===linked));const receipt=await service.apply('resource-owner',entry.sourceKey,'bindings',binding.reviewToken);assert.equal(receipt.revision,before.revision+1);
 const after=await templates.get(before.id);assert.equal(after.instructions,before.instructions);assert.equal(after.description,before.description);assert.deepEqual({...after.config,skills:configuration.skills},configuration);assert.deepEqual(protect(),protectedBefore);assert.equal(db.prepare('SELECT COUNT(*) n FROM specialty_template_versions WHERE template_id=?').get(before.id).n,1);assert.ok((await distribution.review('resource-owner',entry.sourceKey)).reviewToken);
});
test('HTTP requires authenticated owner, exact fields and explicit confirmation',async()=>{
 const {default:Fastify}=await import('fastify'),{workspacePackRoutes}=await import('../src/api/routes/workspace-pack.ts'),{registerAuthGate}=await import('../src/auth/auth-gate.ts'),{generateToken}=await import('../src/auth/jwt.ts');const app=Fastify();registerAuthGate(app);await app.register(workspacePackRoutes);const url='/api/workspace-pack/specialty-upgrade-prepare-apply',body={sourceKey,resourceId,reviewToken:'a'.repeat(64),confirmed:true};
 try{assert.equal((await app.inject({method:'POST',url,payload:body})).statusCode,401);assert.equal((await app.inject({method:'POST',url,payload:body,headers:{authorization:'Bearer '+generateToken('resource-user',1)}})).statusCode,403);
 for(const payload of [{...body,confirmed:false},{sourceKey,resourceId,reviewToken:body.reviewToken},{...body,config:{}},{...body,owner:'other'}])assert.equal((await app.inject({method:'POST',url,payload,headers:{authorization:'Bearer '+generateToken('resource-owner',1)}})).statusCode,400);
 }finally{await app.close();}
});

test('source replacement inside package persistence refuses before changing the index',async()=>{
 await reset();let changed=false;const loader=()=>{const s=loadProfessionalSource();if(changed)s.fingerprint='a'.repeat(64);return s;};const delegate=Object.create(store);delegate.installReviewedPortable=async(...args)=>{changed=true;return store.installReviewedPortable(...args);};const racing=new SpecialtyResourcePreparation(templates,delegate,loader),review=await racing.review('resource-owner',sourceKey,resourceId),before=db.prepare('SELECT * FROM central_skills WHERE id=?').get(old.id);
 await assert.rejects(racing.apply('resource-owner',sourceKey,resourceId,review.reviewToken),/review_changed/);assert.deepEqual(db.prepare('SELECT * FROM central_skills WHERE id=?').get(old.id),before);
});
test('binding refuses a package revision changed inside the save boundary',async()=>{
 let entry=(await distribution.preview('resource-owner')).roles.find(r=>r.sourceKey===bindingFixture);const live=await templates.get(entry.installedIds[0]),{id,...body}=live,draft={...body,config:{...body.config,skills:[]}},impact=await templates.impact(id,draft);await templates.save(id,{...draft,confirmImpact:impact.confirmation});entry=(await distribution.preview('resource-owner')).roles.find(r=>r.sourceKey===bindingFixture);assert.ok(entry.packResources.some(s=>s.assigned===false));
 const before=db.prepare('SELECT * FROM specialty_templates WHERE id=?').get(entry.installedIds[0]);const delegate=Object.create(templates);delegate.save=async(...args)=>{const ref=entry.packResources[0],s=loaded.pack.skills.find(x=>x.id===ref.sourceId);db.prepare('UPDATE central_skills SET revision=revision+1 WHERE name=?').run(s.name);return templates.save(...args);};const racing=new SpecialtyResourcePreparation(delegate,store),review=await racing.review('resource-owner',entry.sourceKey,'bindings');
 await assert.rejects(racing.apply('resource-owner',entry.sourceKey,'bindings',review.reviewToken),/resources_not_ready/);assert.deepEqual(db.prepare('SELECT * FROM specialty_templates WHERE id=?').get(entry.installedIds[0]),before);
});

test('binding guard rejects a newly affected agent inside save without a new Version',async()=>{
 const entry=(await distribution.preview('resource-owner')).roles.find(r=>r.sourceKey===bindingFixture),id=entry.installedIds[0],before=db.prepare('SELECT * FROM specialty_templates WHERE id=?').get(id),versions=db.prepare('SELECT COUNT(*) n FROM specialty_template_versions WHERE template_id=?').get(id).n;
 const delegate=Object.create(templates);delegate.save=async(...args)=>{const added=agent();db.prepare('INSERT INTO agent_specialties(agent_id,template_id,linked_by) VALUES(?,?,?)').run(added,id,'resource-owner');return templates.save(...args);};const racing=new SpecialtyResourcePreparation(delegate,store),review=await racing.review('resource-owner',entry.sourceKey,'bindings');
 await assert.rejects(racing.apply('resource-owner',entry.sourceKey,'bindings',review.reviewToken),/review_changed/);assert.deepEqual(db.prepare('SELECT * FROM specialty_templates WHERE id=?').get(id),before);assert.equal(db.prepare('SELECT COUNT(*) n FROM specialty_template_versions WHERE template_id=?').get(id).n,versions);
});
test('portable validation rejects an invalid bundle before review; HTTP reports deterministic refusal and owner stale/success',async()=>{
 await reset();const badLoader=()=>{const loaded=loadProfessionalSource();loaded.pack.skills.find(s=>s.id===resourceId).files.push({path:'not-markdown.txt',content:'Fictional invalid artifact'});return loaded;};const bad=new SpecialtyResourcePreparation(templates,store,badLoader),before=db.prepare('SELECT * FROM central_skills WHERE id=?').get(old.id);await assert.rejects(bad.review('resource-owner',sourceKey,resourceId),/invalid_skill/);assert.deepEqual(db.prepare('SELECT * FROM central_skills WHERE id=?').get(old.id),before);
 const {default:Fastify}=await import('fastify'),{workspacePackRoutes}=await import('../src/api/routes/workspace-pack.ts'),{registerAuthGate}=await import('../src/auth/auth-gate.ts'),{generateToken}=await import('../src/auth/jwt.ts'),headers={authorization:'Bearer '+generateToken('resource-owner',1)},base='/api/workspace-pack/specialty-upgrade-prepare-';
 const invalid=Fastify();registerAuthGate(invalid);await invalid.register(workspacePackRoutes,{preparation:bad});try{const r=await invalid.inject({method:'POST',url:base+'review',headers,payload:{sourceKey,resourceId}});assert.equal(r.statusCode,400);assert.equal(r.json().code,'invalid_skill');}finally{await invalid.close();}
 const app=Fastify();registerAuthGate(app);await app.register(workspacePackRoutes,{preparation:service});
 try{let r=await app.inject({method:'POST',url:base+'review',headers,payload:{sourceKey,resourceId}});assert.equal(r.statusCode,200);const initial=r.json();agent();r=await app.inject({method:'POST',url:base+'apply',headers,payload:{sourceKey,resourceId,reviewToken:initial.reviewToken,confirmed:true}});assert.equal(r.statusCode,409);assert.equal(r.json().code,'review_changed');
 r=await app.inject({method:'POST',url:base+'review',headers,payload:{sourceKey,resourceId}});const current=r.json();r=await app.inject({method:'POST',url:base+'apply',headers,payload:{sourceKey,resourceId,reviewToken:current.reviewToken,confirmed:true}});assert.equal(r.statusCode,200);assert.equal(r.json().revision,current.revision+1);
 }finally{await app.close();}
});

test('duplicate package bytes appearing after the consumer guard return a deterministic conflict and roll back',async()=>{
 await reset();const {run}=await import('../src/repositories/sql-steps.ts'),foreign=randomUUID(),hash=store.validatePortable(source.name,source.files).hash,delegate=Object.create(store);
 delegate.installReviewedPortable=(name,files,expected,guard)=>store.installReviewedPortable(name,files,expected,function*(){yield* guard();yield* run('INSERT INTO central_skills(id,name,description,version,revision,content_hash,origin) VALUES(?,?,?,?,1,?,?)',foreign,'fictional-concurrent-copy','Fictional race','1.0.0',hash,'fixture');});
 const racing=new SpecialtyResourcePreparation(templates,delegate),review=await racing.review('resource-owner',sourceKey,resourceId),before=db.prepare('SELECT * FROM central_skills WHERE id=?').get(old.id);
 await assert.rejects(racing.apply('resource-owner',sourceKey,resourceId,review.reviewToken),e=>e.code==='version_conflict'&&e.status===409);assert.deepEqual(db.prepare('SELECT * FROM central_skills WHERE id=?').get(old.id),before);assert.equal(db.prepare('SELECT * FROM central_skills WHERE id=?').get(foreign),undefined);
});
