import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'specialty-distribution-'));
process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'test.db');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');process.env.JWT_SECRET=randomBytes(64).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');
const db=getDatabase();await db.initialize();
const {SpecialtyTemplates}=await import('../src/services/specialty-templates.ts');
const {SpecialtyDistribution,professionalSourceManifest,importedSpecialtyId,validateProfessionalSource}=await import('../src/services/specialty-distribution.ts');
const pack=JSON.parse(fs.readFileSync(new URL('../skills/professional-workspace-settings.json',import.meta.url),'utf8'));
const history=JSON.parse(fs.readFileSync(new URL('../skills/professional-source-history.json',import.meta.url),'utf8'));
const templates=new SpecialtyTemplates(),distribution=new SpecialtyDistribution(templates);
const {PERMISSION_CATEGORIES}=await import('../src/tools/agent-permissions.ts');
const config={primarySkill:null,skills:[],tools:[],memoryRead:[],memoryWrite:[],sharedMemory:false,modes:Object.fromEntries(PERMISSION_CATEGORIES.map(x=>[x,'ask']))};
const owner='distribution-owner',legacy=history.releases[0],current=history.releases[1];
const draft=(role,revision=0)=>({name:role.name,department:role.department,description:role.description,instructions:role.instructions,config,revision});
const role=pack.specialties[0],id=importedSpecialtyId(owner,legacy.fingerprint,role.id);
after(()=>{closeDatabase();});
test('manifest pins bundled content and preserves importer identity compatibility',()=>{
 const manifest=professionalSourceManifest();assert.equal(manifest.fingerprint,current.fingerprint);assert.equal(manifest.roles.length,132);assert.equal(new Set(manifest.roles.map(x=>x.sourceId)).size,132);
 const h=createHash('sha256').update(JSON.stringify(owner+':'+legacy.fingerprint+':specialty:'+role.id)).digest('hex');
 assert.equal(id,h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32));
});
test('legacy identity recognizes current content, local edits conflict, same names never match',async()=>{
 await templates.save(id,draft(role));const unknown=randomUUID();await templates.save(unknown,draft(role));
 let preview=await distribution.preview(owner);assert.equal(preview.roles[0].status,'current');assert.deepEqual(preview.roles[0].installedIds,[id]);assert.ok(preview.unmatchedInstalledIds.includes(unknown));assert.equal(preview.applySupported,false);
 await templates.save(id,{...draft(role,1),instructions:'Owner-authored local instructions.'});assert.equal((await distribution.preview(owner)).roles[0].status,'local_conflict');
 assert.equal((await distribution.preview('different-owner')).roles[0].status,'unmatched');
});
test('unaltered historical content offers an update without applying it',async()=>{
 const old=JSON.parse(fs.readFileSync(new URL('./fixtures/professional-legacy-role.json',import.meta.url),'utf8'));
 const oldId=importedSpecialtyId(owner,legacy.fingerprint,old.id);await templates.save(oldId,draft(old));
 const before=await templates.get(oldId),entry=(await distribution.preview(owner)).roles.find(x=>x.sourceId===old.id);
 assert.equal(entry.status,'content_update_available');assert.equal(entry.revision,1);assert.deepEqual(await templates.get(oldId),before);
 assert.ok(entry.packResources.every(r=>r.status==='missing'));assert.equal(entry.preservesConfiguration,true);
});
test('multiple recognized imports remain ambiguous',async()=>{
 await templates.save(importedSpecialtyId(owner,current.fingerprint,role.id),draft(role));const entry=(await distribution.preview(owner)).roles[0];assert.equal(entry.status,'ambiguous');assert.equal(entry.installedIds.length,2);
});
test('package mismatch is a separate conflict and never silently replaced',async()=>{
 const {CentralSkills}=await import('../src/skills/central-store.ts');const store=new CentralSkills(root,path.join(root,'skill-library'));
 const source=pack.skills[0];await store.installPortable(source.name,source.files);
 let resource=(await distribution.preview(owner)).resources.find(r=>r.sourceId===source.id);assert.equal(resource.status,'current');
 db.prepare('UPDATE central_skills SET content_hash=? WHERE name=?').run('0'.repeat(64),source.name);
 resource=(await distribution.preview(owner)).resources.find(r=>r.sourceId===source.id);assert.equal(resource.status,'conflict');
 assert.equal(db.prepare('SELECT content_hash FROM central_skills WHERE name=?').get(source.name).content_hash,'0'.repeat(64));
});
test('preview succeeds with SQL writes forbidden and preserves rows and object bytes',async()=>{
 const tables=['specialty_templates','specialty_template_versions','agents_config','agent_specialties','agent_tool_grants','central_skills'];
 const snapshot=()=>tables.map(t=>db.prepare('SELECT * FROM '+t+' ORDER BY 1').all());
 const files=()=>fs.readdirSync(path.join(root,'specialty-templates/objects')).map(n=>[n,fs.readFileSync(path.join(root,'specialty-templates/objects',n),'utf8')]);
 const before=snapshot(),objects=files();db.prepare('PRAGMA query_only = ON').run();
 try{assert.equal((await distribution.preview(owner)).readOnly,true);assert.deepEqual(snapshot(),before);assert.deepEqual(files(),objects);}finally{db.prepare('PRAGMA query_only = OFF').run();}
});
test('explicit stable keys survive position changes and identify retired roles',async()=>{
 const edited=structuredClone(history),target=pack.specialties[6];
 const historical=edited.releases[0].roles.find(r=>r.id===target.id);historical.id='specialty-999';
 const shiftedId=importedSpecialtyId(owner,legacy.fingerprint,historical.id);await templates.save(shiftedId,draft(target));
 const retiredKey='professional-role-'+ 'a'.repeat(24);edited.releases[0].roles.push({id:'specialty-888',sourceKey:retiredKey,contentHash:'a'.repeat(64)});
 const retiredId=importedSpecialtyId(owner,legacy.fingerprint,'specialty-888');await templates.save(retiredId,draft(target));
 const preview=await new SpecialtyDistribution(templates,()=>validateProfessionalSource(pack,edited)).preview(owner);
 assert.deepEqual(preview.roles.find(r=>r.sourceId===target.id).installedIds,[shiftedId]);
 assert.equal(preview.roles.find(r=>r.sourceKey===retiredKey).status,'retired');assert.ok(!preview.unmatchedInstalledIds.includes(retiredId));
});
test('invalid history, duplicate stable keys and unregistered content fail closed',()=>{
 for(const change of [h=>{h.version=2;},h=>{h.releases[0].fingerprint='bad';},h=>{h.releases[0].roles[0].sourceKey=h.releases[0].roles[1].sourceKey;},h=>{h.releases[1].roles[0].contentHash='0'.repeat(64);},h=>{h.releases.pop();}]){const h=structuredClone(history);change(h);assert.throws(()=>validateProfessionalSource(pack,h));}
 const changed=structuredClone(pack);changed.specialties[0].instructions+=' Modified';assert.throws(()=>validateProfessionalSource(changed,history),/source_revision_unregistered/);
});
test('all bundled specialties round-trip through the actual save normalization',async()=>{
 for(const role of pack.specialties)await templates.save(importedSpecialtyId('roundtrip-owner',current.fingerprint,role.id),draft(role));
 const preview=await distribution.preview('roundtrip-owner');assert.equal(preview.roles.length,132);assert.ok(preview.roles.every(r=>r.status==='current'));
});
test('preview route authorizes before work and refuses owner override',async()=>{
 const {default:Fastify}=await import('fastify'),{workspacePackRoutes}=await import('../src/api/routes/workspace-pack.ts');const app=Fastify();let called=0;
 app.addHook('onRequest',async(req)=>{if(req.headers['x-fixture-role'])req.authUser={id:owner,role:req.headers['x-fixture-role']};});
 await app.register(workspacePackRoutes,{distribution:{preview:async(id)=>{called++;assert.equal(id,owner);return {readOnly:true};}}});
 try{for(const [headers,status]of [[{},401],[{'x-fixture-role':'user'},403],[{'x-fixture-role':'owner'},200]])assert.equal((await app.inject({url:'/api/workspace-pack/specialty-upgrade-preview',headers})).statusCode,status);
 assert.equal(called,1);assert.equal((await app.inject({url:'/api/workspace-pack/specialty-upgrade-preview?owner=other',headers:{'x-fixture-role':'owner'}})).statusCode,400);assert.equal(called,1);
 }finally{await app.close();}
 const failed=Fastify();failed.addHook('onRequest',async(req)=>{req.authUser={id:owner,role:'owner'};});
 await failed.register(workspacePackRoutes,{distribution:{preview:async()=>{throw new Error('private storage path');}}});
 try{const response=await failed.inject({url:'/api/workspace-pack/specialty-upgrade-preview'});assert.equal(response.statusCode,503);assert.equal(response.headers['cache-control'],'no-store');assert.deepEqual(response.json(),{code:'upgrade_preview_unavailable'});}finally{await failed.close();}
});
