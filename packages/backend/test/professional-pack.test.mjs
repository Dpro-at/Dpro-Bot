import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'professional-pack-'));
process.env.AGENT_PLAYER_DATA_DIR = root;
process.env.DATABASE_PATH = path.join(root, 'test.db');
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
process.env.JWT_SECRET = randomBytes(64).toString('hex');
const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase(); await db.initialize();
db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES('pack-owner','owner@example.invalid','Pack fixture','fixture','owner','active')").run();
const { WorkspacePacks, validateWorkspacePack } = await import('../src/services/workspace-pack.ts');
const { CentralSkills } = await import('../src/skills/central-store.ts');
const { SpecialtyTemplates } = await import('../src/services/specialty-templates.ts');
const { PersonalityLibrary } = await import('../src/services/personality-library.ts');
const source = fileURLToPath(new URL('../skills/', import.meta.url));
const pack = JSON.parse(fs.readFileSync(path.join(source, 'professional-workspace-settings.json'), 'utf8'));
const skills = new CentralSkills(root, path.join(root, 'skill-library'), []);
await skills.initialize();
const templates = new SpecialtyTemplates();
const store = new WorkspacePacks(skills, templates, new PersonalityLibrary());
after(() => { closeDatabase(); fs.rmSync(root, { recursive: true, force: true }); });

test('portable professional pack has complete source-bound resources and no private workspace objects', () => {
 assert.deepEqual(validateWorkspacePack(pack), pack);
 assert.equal(pack.skills.length, 41); assert.equal(pack.specialties.length, 122);
 assert.deepEqual(pack.agents, []); assert.deepEqual(pack.personalities, []);
 const ids = new Set(pack.skills.map(skill => skill.id));
 for (const skill of pack.skills) for (const file of skill.files) {
  assert.match(file.path, /\.md$/i);
  const disk = fs.readFileSync(path.join(source, skill.name, file.path), 'utf8');
  assert.equal(file.content.replace(/\r\n?/g, '\n').trim(), disk.replace(/\r\n?/g, '\n').trim());
 }
 for (const specialty of pack.specialties) {
  assert.ok(specialty.instructions.length > 100);
  assert.ok(specialty.skills.length > 0 && specialty.skills.every(id => ids.has(id)));
 }
});
test('full collection imports and replays without creating agents or assignments', async () => {
 const count = table => db.prepare('SELECT count(*) AS n FROM '+table).get().n;
 const protectedBefore = ['agents_config', 'agent_specialties', 'central_agent_skills'].map(count);
 const preview = await store.preview(pack);
 assert.deepEqual(preview.counts, { agents: 0, personalities: 0, specialties: 122, skills: 41 });
 await store.import('pack-owner', pack, preview.fingerprint);
 assert.equal(count('central_skills'), 41); assert.equal(count('specialty_templates'), 122);
 await store.import('pack-owner', pack, preview.fingerprint);
 assert.equal(count('central_skills'), 41); assert.equal(count('specialty_templates'), 122);
 assert.deepEqual(['agents_config', 'agent_specialties', 'central_agent_skills'].map(count), protectedBefore);
 for (const row of db.prepare('SELECT id FROM specialty_templates').all()) {
  const saved = await templates.get(row.id);
  assert.equal(saved.config.skills.length, 1);
  assert.deepEqual(saved.config.tools, []);
  assert.ok(Object.values(saved.config.modes).every(mode => mode === 'ask'));
 }
});


test('pilot recommendations save as versioned templates without changing agent authority', async () => {
 const recommendations = JSON.parse(fs.readFileSync(path.join(source, 'professional-role-profiles.json'), 'utf8'));
 assert.equal(recommendations.profiles.length, 39);
 assert.throws(()=>validateWorkspacePack(recommendations),error=>error.code==='invalid_pack');
 const frontendId = db.prepare("SELECT id FROM specialty_templates WHERE name='Frontend developer'").get().id;
 const frontend = await templates.get(frontendId);
 const fixtureAgent = await templates.hire('pack-owner', {
  templateId: frontendId, revision: frontend.revision, requestId: randomUUID(),
  name: 'Pilot Fixture Developer', confirmed: true, confirmRisky: false, linked: true,
 });
 assert.ok(fixtureAgent.id);
 assert.equal(db.prepare('SELECT count(*) n FROM agent_specialties WHERE agent_id=?').get(fixtureAgent.id).n, 1);
 const {setAgentGrants} = await import('../src/tools/grants.ts');
 const {createAgentToolsRegistry} = await import('../src/tools/index.ts');
 const {loadAgentPermissions,setAgentPermissions,permissionCategory} = await import('../src/tools/agent-permissions.ts');
 await setAgentGrants(fixtureAgent.id,{grants:['read']},'pack-owner',(await createAgentToolsRegistry({workspaceDir:root})).listRegistered());
 assert.equal(permissionCategory({name:'web_fetch'}),'network');
 const initialPermissions = await loadAgentPermissions(fixtureAgent.id);
 await setAgentPermissions(fixtureAgent.id,{memoryRead:['task'],memoryWrite:[],sharedMemory:false,modes:initialPermissions.modes},initialPermissions.version,'pack-owner');
 assert.ok(db.prepare('SELECT count(*) n FROM agent_tool_grants WHERE agent_id=?').get(fixtureAgent.id).n>0);
 assert.ok(db.prepare('SELECT count(*) n FROM agent_permissions WHERE agent_id=?').get(fixtureAgent.id).n>0);
 const protectedTables = ['agents_config', 'agent_specialties', 'central_agent_skills', 'agent_permissions', 'agent_tool_grants'];
 const before = protectedTables.map(table => db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all());
 const previousExec = process.env.AGENT_EXEC_TOOLS;
 process.env.AGENT_EXEC_TOOLS = 'true'; // Catalogue fixture only; no tool execution.
 try {
  for (const profile of recommendations.profiles) {
   const row = db.prepare('SELECT id FROM specialty_templates WHERE name=?').get(profile.name);
   assert.ok(row);
   const current = await templates.get(row.id);
   const skill = db.prepare('SELECT id FROM central_skills WHERE name=?').get(profile.package);
   assert.ok(skill, 'Resolve the actual fixture skill ID');
   assert.ok([current.config.primarySkill,...current.config.skills].includes(skill.id),'Preserve the existing role package binding');
   for (const resource of new Set(['SKILL.md',...(current.instructions.match(/(?:references|assets)\/[a-z0-9_-]+\.md/g)||[])])) assert.ok(fs.existsSync(path.join(source,profile.package,resource)),resource);
   for (const resource of profile.references) assert.ok(fs.existsSync(path.join(source, profile.package, resource)));
   const config = {
    primarySkill: skill.id, skills: [], tools: profile.tools,
    memoryRead: profile.memoryRead, memoryWrite: profile.memoryWrite,
    sharedMemory: profile.sharedMemory, modes: profile.modes,
    requirements: profile.requirements.map((item, index) => ({
     id: 'f00d0000-0000-4000-a000-'+String(index+1).padStart(12,'0'),
     name: item.name, toolName: item.toolName, server: null,
    })),
   };
   const draft = {name: current.name, department: current.department, description: current.description,
    instructions: current.instructions, revision: current.revision, config};
   const impact = await templates.impact(current.id, draft);
   if (profile.name==='Frontend developer') {
    assert.ok(impact.agents.some(agent=>agent.id===fixtureAgent.id),'Linked fixture agent must be in the impact');
    await assert.rejects(templates.save(current.id, draft), error => error.code === 'impact_confirmation_required');
    await assert.rejects(templates.save(current.id, {...draft, instructions: draft.instructions+' Unreviewed change.', confirmImpact: impact.confirmation}), error => error.code === 'impact_confirmation_required');
   }
   else assert.equal(impact.agents.length,0);
   if (profile.tools.some(tool=>tool.name==='ask_coding_app')) {
    delete process.env.AGENT_EXEC_TOOLS;
    try { await assert.rejects(templates.save(current.id,{...draft,confirmImpact:impact.confirmation}),error=>error.code==='tools_changed'); }
    finally { process.env.AGENT_EXEC_TOOLS='true'; }
    assert.deepEqual(await templates.get(current.id),current);
   }
   const updated = await templates.save(current.id, {...draft, confirmImpact: impact.confirmation});
   assert.equal(updated.revision, current.revision+1);
   assert.equal(updated.config.primarySkill, skill.id);
   assert.deepEqual(updated.config.tools, profile.tools);
   assert.deepEqual(updated.config.modes, profile.modes);
   assert.deepEqual(updated.config.memoryRead,profile.memoryRead);
   assert.deepEqual(updated.config.memoryWrite,profile.memoryWrite);
   assert.equal(updated.config.sharedMemory,profile.sharedMemory);
   assert.deepEqual(updated.config.requirements,config.requirements);
   const history = await templates.version(current.id, String(current.revision));
   assert.deepEqual(history.config, current.config);
   assert.equal(history.instructions, current.instructions);
   await assert.rejects(templates.save(current.id, draft), error => error.code === 'version_conflict');
   assert.equal((await templates.get(current.id)).revision, updated.revision);
  }
 } finally {
  if (previousExec === undefined) delete process.env.AGENT_EXEC_TOOLS;
  else process.env.AGENT_EXEC_TOOLS = previousExec;
 }
 assert.deepEqual(protectedTables.map(table => db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()), before);
});

test('pilot recommendation bindings reject unknown tools and preserve the prior template', async () => {
 const row = db.prepare("SELECT id FROM specialty_templates WHERE name='Copywriter'").get();
 const current = await templates.get(row.id);
 const {id, ...draft} = current;
 draft.config = {...current.config, tools: [{name:'nonexistent_fixture_capability',fingerprint:null}]};
 await assert.rejects(templates.save(id, draft), error => error.code === 'tools_changed');
 assert.deepEqual(await templates.get(id), current);
});
