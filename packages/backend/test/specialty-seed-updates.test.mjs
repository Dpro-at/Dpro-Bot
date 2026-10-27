import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'specialty-seeds-'));
process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'fixture.db');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');process.env.JWT_SECRET=randomBytes(64).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();
const {SpecialtyTemplates}=await import('../src/services/specialty-templates.ts');
const {SpecialtyDistribution}=await import('../src/services/specialty-distribution.ts');
db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES('seed-owner','seed@example.invalid','seed-owner','fixture','owner','active')").run();
const templates=new SpecialtyTemplates(),distribution=new SpecialtyDistribution(templates);
after(()=>closeDatabase());
test('built-in seed identities offer digital updates and never adopt a same-name copy',async()=>{
 await templates.initialize();const before=db.prepare('SELECT * FROM specialty_templates ORDER BY id').all();
 const preview=await distribution.preview('seed-owner');
 assert.equal(preview.roles.filter(r=>r.status==='content_update_available').length,117);
 assert.deepEqual(db.prepare('SELECT * FROM specialty_templates ORDER BY id').all(),before);
 const entry=preview.roles.find(r=>r.status==='content_update_available'),live=await templates.get(entry.installedIds[0]);
 const {id:ignored,...draft}=live;const copy=randomUUID();await templates.save(copy,{...draft,revision:0});
 const repeated=await distribution.preview('seed-owner');assert.ok(repeated.unmatchedInstalledIds.includes(copy));assert.deepEqual(repeated.roles.find(r=>r.sourceKey===entry.sourceKey).installedIds,[live.id]);
 await templates.save(live.id,{...draft,instructions:'Owner local edit.',revision:live.revision});
 assert.equal((await distribution.preview('seed-owner')).roles.find(r=>r.sourceKey===entry.sourceKey).status,'local_conflict');
});

test('seed content save retains exact config and links, adds history, and becomes current',async()=>{
 const preview=await distribution.preview('seed-owner'),entry=preview.roles.find(r=>r.status==='content_update_available');
 const live=await templates.get(entry.installedIds[0]),{id,...draft}=live;
 const pack=JSON.parse(fs.readFileSync(new URL('../skills/professional-workspace-settings.json',import.meta.url))),role=pack.specialties.find(r=>r.id===entry.sourceId);
 const {CentralSkills}=await import('../src/skills/central-store.ts');const store=new CentralSkills(root,path.join(root,'skill-library')),bindings=[];
 for(const ref of role.skills){const skill=pack.skills.find(s=>s.id===ref);bindings.push((await store.installPortable(skill.name,skill.files)).skill.id);}
 await assert.rejects(distribution.review('seed-owner',entry.sourceKey),/resources_not_ready/);
 const unassigned=(await distribution.preview('seed-owner')).roles.find(r=>r.sourceKey===entry.sourceKey);assert.ok(unassigned.packResources.every(r=>r.assigned===false));
 await templates.save(id,{...draft,config:{...draft.config,skills:bindings}});
 const config=db.prepare('SELECT config_json FROM specialty_templates WHERE id=?').get(id).config_json;
 const agent=randomUUID();db.prepare('INSERT INTO agents_config(id,name,system_prompt) VALUES(?,?,?)').run(agent,'Fictional colleague','Retain rules');
 db.prepare('INSERT INTO agent_specialties(agent_id,template_id,linked_by) VALUES(?,?,?)').run(agent,id,'seed-owner');
 const links=db.prepare('SELECT * FROM agent_specialties').all(),versions=db.prepare('SELECT COUNT(*) n FROM specialty_template_versions WHERE template_id=?').get(id).n;
 const review=await distribution.review('seed-owner',entry.sourceKey);assert.equal(review.agents.length,1);
 const receipt=await distribution.apply('seed-owner',entry.sourceKey,review.reviewToken);assert.equal(receipt.revision,3);
 assert.equal(db.prepare('SELECT config_json FROM specialty_templates WHERE id=?').get(id).config_json,config);
 assert.deepEqual(db.prepare('SELECT * FROM agent_specialties').all(),links);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM specialty_template_versions WHERE template_id=?').get(id).n,versions+1);
 assert.equal((await distribution.preview('seed-owner')).roles.find(r=>r.sourceKey===entry.sourceKey).status,'current');
 await assert.rejects(distribution.review('seed-owner',entry.sourceKey),/upgrade_not_available/);
});
test('seed and recognised import together are ambiguous and cannot be reviewed',async()=>{
 const {importedSpecialtyId}=await import('../src/services/specialty-distribution.ts');
 const history=JSON.parse(fs.readFileSync(new URL('../skills/professional-source-history.json',import.meta.url)));
 const entry=(await distribution.preview('seed-owner')).roles.find(r=>r.status==='content_update_available');
 const {id,...draft}=await templates.get(entry.installedIds[0]);
 await templates.save(importedSpecialtyId('seed-owner',history.releases[0].fingerprint,entry.sourceId),{...draft,revision:0});
 assert.equal((await distribution.preview('seed-owner')).roles.find(r=>r.sourceKey===entry.sourceKey).status,'ambiguous');
 await assert.rejects(distribution.review('seed-owner',entry.sourceKey),/upgrade_not_available/);
});

test('a built-in id also recognises the immutable first-release professional content',async()=>{
 const old=JSON.parse(fs.readFileSync(new URL('./fixtures/professional-legacy-role.json',import.meta.url)));
 const history=JSON.parse(fs.readFileSync(new URL('../skills/professional-source-history.json',import.meta.url)));
 const {createHash}=await import('node:crypto'),key='professional-role-'+createHash('sha256').update(JSON.stringify([old.name,old.department])).digest('hex').slice(0,24);
 const seed=history.seeds.find(r=>r.sourceKey===key),live=await templates.get(seed.id);
 const canonical={department:old.department,description:old.description,instructions:old.instructions.replace(/\r\n?/g,'\n').trim()+'\n',name:old.name};
 assert.equal(createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),seed.contentHashes[0]);
 const draft={name:old.name,department:old.department,description:old.description,instructions:old.instructions,config:live.config,revision:live.revision};
 const impact=await templates.impact(seed.id,draft);await templates.save(seed.id,{...draft,confirmImpact:impact.confirmation});
 assert.equal((await distribution.preview('seed-owner')).roles.find(r=>r.sourceKey===key).status,'content_update_available');
});
