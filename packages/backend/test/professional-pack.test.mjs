import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

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
