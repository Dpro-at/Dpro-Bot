// CLI-02: safe import pipeline (select -> redact -> immutable preview ->
// confirm/new version -> commit to quarantine as memory proposals -> cancel /
// roll back). Owner only; secrets never stored anywhere; audit without content.
// Run: node --import tsx --test test/import-pipeline.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-import-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const quiet = { log: console.log, warn: console.warn, error: console.error };
console.log = () => {}; console.warn = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('im-owner', 'owner');
addUser('im-admin', 'admin');
addUser('im-user', 'user');
db.prepare('UPDATE agents_config SET is_primary = 0').run();
db.prepare(`INSERT INTO agents_config (id, name, is_primary) VALUES ('im-agent', 'Im Agent', 1)`).run();

const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { memoryFilesRoutes } = await import(join(backendDir, 'src/api/routes/memory-files.ts'));
const { memoryImportRoutes } = await import(join(backendDir, 'src/api/routes/memory-import.ts'));
const R = await import(join(backendDir, 'src/memory/import/redact.ts'));
const P = await import(join(backendDir, 'src/memory/import/pipeline.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');

const app = Fastify();
registerAuthGate(app);
await app.register(memoryFilesRoutes);
await app.register(memoryImportRoutes);
await app.ready();
console.log = quiet.log; console.warn = quiet.warn;

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const auth = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const quietly = async (fn) => { const l = console.log; const w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };
const call = (method, url, payload, who = 'im-owner') => quietly(() => app.inject({ method, url, headers: auth(who), payload }));

// UI-IP-04: approve/reject send back the reviewHash of the proposal as reviewed.
const decide = async (id, action, payload = {}) => {
  const r = await call('GET', `/api/memory/proposals/${id}`);
  return call('POST', `/api/memory/proposals/${id}/${action}`, { expectedReviewHash: r.json().reviewHash, ...payload });
};
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const file = (name, text) => ({ name, contentBase64: b64(text) });
const preview = (files, extra = {}) => call('POST', '/api/memory/import/preview', { files, ...extra });
const opKey = () => randomBytes(16).toString('hex');
const memCount = () => db.prepare('SELECT COUNT(*) AS n FROM memories').get().n;

// Test-only secret values (never real), from a seeded generator so every run
// sees the same values (FU-01: unseeded values made a redaction miss show up
// in ~3% of runs). Set IMPORT_TEST_SEED to try other values.
const SEED = process.env.IMPORT_TEST_SEED || 'cli-02-import-pipeline';
let seedCounter = 0;
const seededBytes = (n) => {
  const out = [];
  while (out.length < n) out.push(...createHash('sha256').update(`${SEED}:${seedCounter++}`).digest());
  return out.slice(0, n);
};
const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const rnd = (n, chars = AL) => Array.from(seededBytes(n), (b) => chars[b % chars.length]).join('');
const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const HEX = '0123456789abcdef';
const B64 = AL + '+/';
const SECRETS = {
  openai_key: `sk-proj-${rnd(40)}`,
  anthropic_key: `sk-ant-api03-${rnd(48)}`,
  github_token: `ghp_${rnd(36)}`,
  gitlab_token: `glpat-${rnd(20)}`,
  slack_token: `xoxb-${rnd(12, '0123456789')}-${rnd(24)}`,
  slack_webhook: `https://hooks.slack.com/services/T${rnd(8, UP)}/B${rnd(8, UP)}/${rnd(24)}`,
  stripe_key: `sk_live_${rnd(24)}`,
  aws_access_key: `AKIA${rnd(16, UP)}`,
  aws_secret_key: `${rnd(39, B64)}/`, // ends in a non-word character on purpose
  gcp_api_key: `AIza${rnd(35)}`,
  gcp_oauth_token: `ya29.${rnd(40)}`,
  azure_storage_key: `${rnd(86, B64)}==`,
  azure_sas_signature: rnd(43, AL),
  jwt: `eyJ${rnd(20)}.eyJ${rnd(30)}.${rnd(43)}`,
  bearer_token: rnd(40),
  private_key: rnd(64, B64),
  password: `pw-${rnd(14)}`,
  url_credentials: `dbpw${rnd(16)}`,
  huggingface_token: `hf_${rnd(34)}`,
  npm_token: `npm_${rnd(36)}`,
  sendgrid_key: `SG.${rnd(22)}.${rnd(43)}`,
  twilio_key: `SK${rnd(32, HEX)}`,
  telegram_bot_token: `${rnd(9, '123456789')}:AA${rnd(33)}`,
  secret_assignment: `cs-${rnd(24)}`,
  password_prose: `prose-${rnd(12)}`,
  password_ar: `ar-${rnd(12)}`,
};
const SECRET_DOC = [
  '# Project notes',
  '',
  'We deploy with the CLI. The OpenAI key is ' + SECRETS.openai_key + ' and Anthropic uses ' + SECRETS.anthropic_key + '.',
  `GitHub: ${SECRETS.github_token}, GitLab: ${SECRETS.gitlab_token}. Slack bot ${SECRETS.slack_token} posts to ${SECRETS.slack_webhook}.`,
  `Stripe live: ${SECRETS.stripe_key}. HF ${SECRETS.huggingface_token}, npm ${SECRETS.npm_token}, SendGrid ${SECRETS.sendgrid_key}, Twilio ${SECRETS.twilio_key}.`,
  `Telegram bot ${SECRETS.telegram_bot_token}.`,
  '',
  '## Cloud',
  '',
  `AWS id ${SECRETS.aws_access_key} with aws_secret_access_key = ${SECRETS.aws_secret_key}`,
  `Google key ${SECRETS.gcp_api_key}, oauth ${SECRETS.gcp_oauth_token}.`,
  `Azure: DefaultEndpointsProtocol=https;AccountName=acct;AccountKey=${SECRETS.azure_storage_key};EndpointSuffix=core.windows.net`,
  `SAS link https://acct.blob.core.windows.net/c/f?sv=2022-11-02&sig=${SECRETS.azure_sas_signature}`,
  '',
  '## Auth',
  '',
  `Session JWT ${SECRETS.jwt}`,
  `Authorization: Bearer ${SECRETS.bearer_token}`,
  `password = "${SECRETS.password}"`,
  `client_secret: ${SECRETS.secret_assignment}`,
  `The database is postgres://admin:${SECRETS.url_credentials}@db.example.test/app`,
  `My password is ${SECRETS.password_prose}`,
  `كلمة السر: ${SECRETS.password_ar}`,
  '',
  '```',
  '-----BEGIN OPENSSH PRIVATE KEY-----',
  SECRETS.private_key,
  '-----END OPENSSH PRIVATE KEY-----',
  '```',
  '',
].join('\n');

/** Every string in every table, plus the raw database files on disk. */
function storedEverywhere(needle) {
  const hits = [];
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map((r) => r.name);
  for (const t of tables) {
    const rows = db.prepare(`SELECT * FROM "${t}"`).all();
    for (const r of rows) for (const v of Object.values(r)) if (typeof v === 'string' && v.includes(needle)) hits.push(t);
  }
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && statSync(p).size < 50 * 1024 * 1024 && readFileSync(p).includes(Buffer.from(needle))) hits.push(p);
    }
  };
  walk(dir);
  return hits;
}

test('owner only: anonymous 401, admin and user 403', async () => {
  const routes = [
    ['GET', '/api/memory/import/settings'], ['PUT', '/api/memory/import/settings'], ['POST', '/api/memory/import/preview'],
    ['GET', '/api/memory/import'], ['GET', `/api/memory/import/${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}`],
    ['POST', '/api/memory/import/x/revise'], ['POST', '/api/memory/import/x/commit'], ['POST', '/api/memory/import/x/cancel'],
  ];
  for (const [method, url] of routes) {
    const payload = method === 'GET' ? undefined : {};
    assert.equal((await quietly(() => app.inject({ method, url, payload }))).statusCode, 401, `${method} ${url} anon`);
    for (const who of ['im-admin', 'im-user']) assert.equal((await call(method, url, payload, who)).statusCode, 403, `${method} ${url} ${who}`);
  }
  // Another account never sees the owner's batch (404, not 403).
  const res = await preview([file('a.md', '# A\n\nSome text here.')]);
  assert.equal(res.statusCode, 201, res.body);
  addUser('im-owner2', 'owner');
  assert.equal((await call('GET', `/api/memory/import/${res.json().batchId}`, undefined, 'im-owner2')).statusCode, 404);
  await call('POST', `/api/memory/import/${res.json().batchId}/cancel`, {});
});

test('select: only UTF-8 text/Markdown; size, archive, binary, structured and credential files blocked', async () => {
  const big = 'a'.repeat(P.MAX_FILE_BYTES + 1);
  const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), randomBytes(40)]).toString('base64');
  const res = await preview([
    file('ok.md', '# Hello\n\nA readable note.'),
    file('notes.txt', 'Plain text paragraph one.\n\nParagraph two.'),
    file('huge.md', big),
    { name: 'export.zip', contentBase64: zip },
    { name: 'sneaky.md', contentBase64: zip },
    { name: 'nul.md', contentBase64: Buffer.from('abc\u0000def').toString('base64') },
    { name: 'latin1.md', contentBase64: Buffer.from([0x48, 0xe9, 0x6c, 0x6c, 0x6f]).toString('base64') },
    file('conversations.json', '[{"title":"x"}]'),
    file('.env', 'A=1'),
    file('.env.md', '# x\n\ntext'),
    file('id_rsa', 'x'),
    file('credentials.md', '# c\n\ntext'),
    file('image.png', 'x'),
    file('config.md', 'API_URL=http://x\nDB_HOST=localhost\nDB_USER=app\nDB_NAME=app\n'),
    file('../../etc/passwd.md', '# Path\n\nOnly the basename is kept.'),
    file('empty.md', ''),
  ], { source: 'chatgpt' });
  assert.equal(res.statusCode, 201, res.body);
  const v = res.json();
  const by = Object.fromEntries(v.files.map((f) => [f.name, f]));
  assert.equal(by['ok.md'].outcome, 'eligible');
  assert.equal(by['notes.txt'].outcome, 'eligible');
  assert.equal(by['huge.md'].outcome, 'blocked');
  assert.match(by['huge.md'].reason, /larger/);
  assert.equal(by['export.zip'].outcome, 'blocked');
  assert.match(by['sneaky.md'].reason, /archive/);
  assert.match(by['nul.md'].reason, /binary/);
  assert.match(by['latin1.md'].reason, /UTF-8/);
  assert.equal(by['conversations.json'].outcome, 'unsupported');
  assert.match(by['conversations.json'].reason, /later release/);
  for (const n of ['.env', '.env.md', 'id_rsa', 'credentials.md']) {
    assert.equal(by[n].outcome, 'blocked', n);
    assert.match(by[n].reason, /credential\/config/, n);
  }
  assert.equal(by['image.png'].outcome, 'unsupported');
  assert.match(by['config.md'].reason, /environment\/config/);
  assert.equal(by['passwd.md'].outcome, 'eligible', 'path parts are dropped, never used');
  assert.equal(by['empty.md'].outcome, 'unsupported');
  assert.equal(v.summary.files.eligible, 3);
  assert.ok(v.items.every((i) => [0, 1, 14].includes(i.file)), 'items only from eligible files');
  await call('POST', `/api/memory/import/${v.batchId}/cancel`, {});

  // Hard limits on the whole request.
  const many = Array.from({ length: P.MAX_FILES + 1 }, (_, i) => file(`f${i}.md`, 'x y z'));
  assert.equal((await preview(many)).statusCode, 413);
  const half = 'b'.repeat(1.9 * 1024 * 1024);
  const tooMuch = Array.from({ length: 6 }, (_, i) => file(`t${i}.md`, half));
  const t = await preview(tooMuch);
  assert.equal(t.statusCode, 413, t.body);
  assert.equal((await preview([])).statusCode, 400);
  assert.equal((await preview([{ name: 'x.md', contentBase64: '***' }])).statusCode, 400);
  assert.equal((await preview([file('x.md', 'text')], { source: 'mystery' })).statusCode, 400);
  assert.equal((await preview([file('x.md', 'text')], { drawer: 'project:../x' })).statusCode, 400);
  // Too many candidates (one proposal each; the review queue is bounded).
  const lots = Array.from({ length: P.MAX_ITEMS + 1 }, (_, i) => `# H${i}\n\nbody ${i}`).join('\n\n');
  assert.equal((await preview([file('lots.md', lots)])).statusCode, 413);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM memory_import_batches WHERE status = 'preview'`).get().n, 0, 'refused requests store nothing');
});

test('redact: many secret formats become [REDACTED:<type>]; the originals are stored nowhere', async () => {
  const res = await preview([file('project-notes.md', SECRET_DOC)], { source: 'claude-code', drawer: 'project:alpha' });
  assert.equal(res.statusCode, 201, res.body);
  for (const [k, value] of Object.entries(SECRETS)) assert.ok(!res.body.includes(value), `response leaks ${k}`);
  const v = res.json();
  const all = v.items.map((i) => i.content).join('\n');
  for (const type of ['openai_key', 'anthropic_key', 'github_token', 'gitlab_token', 'slack_token', 'slack_webhook', 'stripe_key',
    'aws_access_key', 'aws_secret_key', 'gcp_api_key', 'gcp_oauth_token', 'azure_connection_string', 'azure_sas_signature', 'jwt',
    'bearer_token', 'password', 'secret_assignment', 'url_credentials', 'private_key', 'huggingface_token', 'npm_token',
    'sendgrid_key', 'twilio_key', 'telegram_bot_token']) {
    assert.ok(all.includes(`[REDACTED:${type}]`), `marker for ${type}`);
    assert.ok((v.summary.redactions[type] ?? 0) >= 1, `count for ${type}`);
  }
  assert.ok(v.summary.redactions.password >= 3, 'assignment, prose and Arabic passwords');
  assert.match(all, /postgres:\/\/admin:\[REDACTED:url_credentials\]@db\.example\.test/, 'user and host kept');
  assert.match(all, /We deploy with the CLI/, 'ordinary text kept');
  assert.ok(v.items.every((i) => i.drawer === 'project:alpha'), 'fixed drawer');
  assert.equal(v.sourceKind, 'claude-code');

  // Commit, approve one: still nothing of the originals anywhere (DB tables, raw DB/WAL files, exports).
  const c = await call('POST', `/api/memory/import/${v.batchId}/commit`, { version: v.version, contentHash: v.contentHash, operationKey: opKey(), confirm: true });
  assert.equal(c.statusCode, 201, c.body);
  const ap = await decide(c.json().proposals[0].proposalId, 'approve');
  assert.equal(ap.statusCode, 200, ap.body);
  db.prepare('PRAGMA wal_checkpoint(FULL)').get();
  for (const [k, value] of Object.entries(SECRETS)) assert.deepEqual(storedEverywhere(value), [], `${k} stored`);
  // Rollback for the later tests' queue.
  await call('POST', `/api/memory/import/${v.batchId}/cancel`, {});
});

test('redact: pure function edge cases, idempotent, placeholders kept', () => {
  const once = R.redactImportText(`token=${SECRETS.github_token}`);
  assert.equal(once.text, 'token=[REDACTED:github_token]');
  assert.equal(once.total, 1, 'no double count by the key=value rule');
  assert.deepEqual(R.redactImportText(once.text).total, 0, 'markers are not redacted again');
  assert.equal(R.redactImportText('password = <your password>').total, 0);
  assert.equal(R.redactImportText('API_KEY=${OPENAI_API_KEY}').total, 0);
  assert.equal(R.redactImportText('max_tokens: 4096').total, 0);
  assert.equal(R.redactImportText('password=123456').text, 'password=[REDACTED:password]', 'numeric password');
  assert.equal(R.redactImportText('My PIN is 4321').text, 'My PIN is [REDACTED:password]');
  // An AWS secret key can end in '+', '/' or '=' (no word boundary after it).
  for (const end of ['+', '/', '=', 'Q']) {
    const key = `${'A1b2C3d4E5'.repeat(4).slice(0, 39)}${end}`;
    assert.equal(R.redactImportText(`aws_secret_access_key = ${key}\nnext`).text, 'aws_secret_access_key = [REDACTED:aws_secret_key]\nnext', `ends in ${end}`);
  }
  assert.equal(R.redactImportText(`aws_secret_access_key = ${'A'.repeat(41)}`).text.includes('[REDACTED:aws_secret_key]'), false, '41 characters is not an AWS secret key');
  const contact = 'Mail owner@example.test or call +49 170 1234567 on 2026-10-14.';
  assert.equal(R.redactImportText(contact).total, 0, 'contacts kept by default');
  const red = R.redactImportText(contact, { emails: true, phones: true });
  assert.equal(red.text, 'Mail [REDACTED:email] or call [REDACTED:phone] on 2026-10-14.');
});

test('owner setting: e-mail / phone redaction', async () => {
  assert.deepEqual((await call('GET', '/api/memory/import/settings')).json(), { redactEmails: false, redactPhones: false });
  assert.equal((await call('PUT', '/api/memory/import/settings', { redactEmails: 'yes' })).statusCode, 400);
  assert.deepEqual((await call('PUT', '/api/memory/import/settings', { redactEmails: true, redactPhones: true })).json(), { redactEmails: true, redactPhones: true });
  const res = await preview([file('contacts.md', '# People\n\nAnna: anna@example.test, +44 20 7946 0958')]);
  const v = res.json();
  assert.match(v.items[0].content, /\[REDACTED:email\].*\[REDACTED:phone\]/);
  assert.ok(!res.body.includes('anna@example.test'));
  assert.equal(v.options.redactEmails, true);
  // A request can override the setting.
  const off = (await preview([file('c2.md', '# P\n\nbob@example.test')], { redactEmails: false })).json();
  assert.match(off.items[0].content, /bob@example\.test/);
  for (const id of [v.batchId, off.batchId]) await call('POST', `/api/memory/import/${id}/cancel`, {});
  await call('PUT', '/api/memory/import/settings', { redactEmails: false, redactPhones: false });
});

test('preview: chunked by heading, proposed drawers/types, duplicates flagged; hash lock + immutable versions', async () => {
  const doc = '# About me\n\nI work on Girru.\n\n## Lessons learned\n\nAlways run the tests before a commit.\n\n## Again\n\nI work on Girru.\n\n# Empty\n\n## Code\n\n```\n# not a heading\nline\n```\n';
  const res = await preview([file('CLAUDE.md', doc), file('SKILL.md', '# Deploy skill\n\nHow to deploy the backend.')], { source: 'claude-code' });
  assert.equal(res.statusCode, 201, res.body);
  const v1 = res.json();
  assert.equal(v1.version, 1);
  assert.match(v1.contentHash, /^[0-9a-f]{64}$/);
  const items = v1.items;
  assert.deepEqual(items.map((i) => i.heading), ['About me', 'About me > Lessons learned', 'About me > Again', 'Empty > Code', 'Deploy skill']);
  assert.equal(items[0].drawer, 'owner');
  assert.equal(items[1].drawer, 'experience');
  assert.equal(items[1].type, 'insight');
  assert.equal(items[4].drawer, 'experience');
  assert.equal(items[4].type, 'skill');
  assert.equal(items[2].status, 'eligible', 'different section text');
  assert.ok(items[3].content.includes('# not a heading'), 'code fence kept together');

  const dupRes = await preview([file('a.md', '# X\n\nSame text.'), file('b.md', '# X\n\nSame text.')]);
  const dup = dupRes.json();
  assert.deepEqual(dup.items.map((i) => [i.status, i.include]), [['eligible', true], ['duplicate', false]]);
  await call('POST', `/api/memory/import/${dup.batchId}/cancel`, {});

  // Hash lock: a wrong hash or version is refused.
  const base = `/api/memory/import/${v1.batchId}`;
  assert.equal((await call('POST', `${base}/revise`, { version: 1, contentHash: 'f'.repeat(64), includeAll: false })).statusCode, 409);
  assert.equal((await call('POST', `${base}/commit`, { version: 1, contentHash: 'f'.repeat(64), operationKey: opKey(), confirm: true })).statusCode, 409);
  assert.equal((await call('POST', `${base}/commit`, { version: 1, contentHash: v1.contentHash, operationKey: opKey() })).statusCode, 400, 'confirm required');
  assert.equal((await call('POST', `${base}/commit`, { version: 1, contentHash: v1.contentHash, operationKey: 'short', confirm: true })).statusCode, 400);

  // Edit -> new version; version 1 stays exactly as it was.
  const stored1 = { ...db.prepare('SELECT * FROM memory_import_previews WHERE batch_id = ? AND version = 1').get(v1.batchId) };
  const r2 = await call('POST', `${base}/revise`, {
    version: 1, contentHash: v1.contentHash,
    items: [{ id: 'i1', drawer: 'project:agent-player' }, { id: 'i3', include: false }, { id: 'i4', type: 'skill' }],
  });
  assert.equal(r2.statusCode, 201, r2.body);
  const v2 = r2.json();
  assert.equal(v2.version, 2);
  assert.notEqual(v2.contentHash, v1.contentHash);
  assert.equal(v2.items[0].drawer, 'project:agent-player');
  assert.equal(v2.items[2].include, false);
  assert.equal(v2.items[3].type, 'skill');
  assert.deepEqual({ ...db.prepare('SELECT * FROM memory_import_previews WHERE batch_id = ? AND version = 1').get(v1.batchId) }, stored1, 'old version unchanged');
  assert.equal((await call('GET', `${base}?version=1`)).json().contentHash, v1.contentHash);
  assert.equal((await call('GET', base)).json().version, 2);
  // The old version can no longer be revised or committed.
  assert.equal((await call('POST', `${base}/revise`, { version: 1, contentHash: v1.contentHash, includeAll: true })).statusCode, 409);
  assert.equal((await call('POST', `${base}/commit`, { version: 1, contentHash: v1.contentHash, operationKey: opKey(), confirm: true })).statusCode, 409);
  // Content is never edited in place; bad drawer/type/no-op refused.
  assert.equal((await call('POST', `${base}/revise`, { version: 2, contentHash: v2.contentHash, items: [{ id: 'i1', content: 'other' }] })).statusCode, 400);
  assert.equal((await call('POST', `${base}/revise`, { version: 2, contentHash: v2.contentHash, items: [{ id: 'i1', drawer: 'project:BAD' }] })).statusCode, 400);
  assert.equal((await call('POST', `${base}/revise`, { version: 2, contentHash: v2.contentHash, items: [{ id: 'i1', type: 'weird' }] })).statusCode, 400);
  assert.equal((await call('POST', `${base}/revise`, { version: 2, contentHash: v2.contentHash, items: [{ id: 'nope', include: true }] })).statusCode, 400);
  assert.equal((await call('POST', `${base}/revise`, { version: 2, contentHash: v2.contentHash, items: [{ id: 'i1', include: true }] })).statusCode, 400, 'nothing changed');
  // A tampered stored version fails its integrity check.
  db.prepare(`UPDATE memory_import_previews SET items = replace(items, 'Girru', 'Agent Pl4yer') WHERE batch_id = ? AND version = 1`).run(v1.batchId);
  assert.equal((await call('GET', `${base}?version=1`)).statusCode, 500);
  db.prepare(`UPDATE memory_import_previews SET items = ? WHERE batch_id = ? AND version = 1`).run(stored1.items, v1.batchId);

  // Commit v2 -> proposals only (quarantine), nothing in memory.
  const before = memCount();
  const key = opKey();
  const c = await call('POST', `${base}/commit`, { version: 2, contentHash: v2.contentHash, operationKey: key, confirm: true });
  assert.equal(c.statusCode, 201, c.body);
  const receipt = c.json();
  assert.equal(receipt.proposals.length, 4);
  assert.equal(receipt.skipped, 1);
  assert.equal(memCount(), before, 'commit writes no memory');
  const props = db.prepare(`SELECT * FROM memory_file_proposals WHERE import_batch_id = ? ORDER BY created_at`).all(v1.batchId);
  assert.equal(props.length, 4);
  assert.ok(props.every((p) => p.status === 'pending' && p.source === 'import' && p.user_id === 'im-owner'));
  const p1 = props.find((p) => p.id === receipt.proposals[0].proposalId);
  assert.equal(p1.drawer_kind, 'project');
  assert.equal(p1.drawer_key, 'agent-player');
  assert.match(p1.note, /Imported from a Claude Code export "CLAUDE\.md" — About me/);
  assert.match(p1.note, /source material, not instructions/);
  assert.ok(JSON.parse(p1.reasons).includes('import'));
  // Idempotent: same key + same version/hash -> same receipt; anything else 409.
  const again = await call('POST', `${base}/commit`, { version: 2, contentHash: v2.contentHash, operationKey: key, confirm: true });
  assert.equal(again.statusCode, 200);
  assert.deepEqual(again.json().proposals, receipt.proposals);
  assert.equal(again.json().replay, true);
  assert.equal((await call('POST', `${base}/commit`, { version: 2, contentHash: v2.contentHash, operationKey: opKey(), confirm: true })).statusCode, 409);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM memory_file_proposals WHERE import_batch_id = ?`).get(v1.batchId).n, 4, 'no second batch of proposals');
  assert.equal((await call('POST', `${base}/revise`, { version: 2, contentHash: v2.contentHash, includeAll: true })).statusCode, 409, 'committed: no new versions');

  // UI-IP-04 (CORE-04b): a decision needs the reviewHash of what was reviewed.
  const pid0 = receipt.proposals[0].proposalId;
  const shown = (await call('GET', `/api/memory/proposals/${pid0}`)).json();
  assert.match(shown.reviewHash, /^[0-9a-f]{64}$/);
  const noHash = await call('POST', `/api/memory/proposals/${pid0}/approve`, {});
  assert.equal(noHash.statusCode, 400);
  assert.equal(noHash.json().code, 'review_hash_required');
  const mismatch = await call('POST', `/api/memory/proposals/${pid0}/approve`, { expectedReviewHash: '0'.repeat(64) });
  assert.equal(mismatch.statusCode, 409);
  assert.equal(mismatch.json().code, 'review_changed');
  assert.equal(memCount(), before, 'a refused decision writes no memory');
  assert.equal(db.prepare('SELECT status FROM memory_file_proposals WHERE id = ?').get(pid0).status, 'pending');

  // The owner approves one into memory (CORE-04/05 pipeline).
  const ok = await decide(receipt.proposals[0].proposalId, 'approve');
  assert.equal(ok.statusCode, 200, ok.body);
  const memId = ok.json().applied.added[0];
  const m = db.prepare('SELECT * FROM memories WHERE id = ?').get(memId);
  assert.equal(m.content, v2.items[0].content);
  assert.equal(JSON.parse(m.metadata).source, 'import');
  assert.equal(memCount(), before + 1);

  // Roll back: not-approved proposals removed, approved memory kept and reported.
  const rb = await call('POST', `${base}/cancel`, {});
  assert.equal(rb.statusCode, 200, rb.body);
  assert.equal(rb.json().status, 'rolled_back');
  assert.equal(rb.json().removedProposals, 3);
  assert.deepEqual(rb.json().approvedKept, [{ proposalId: receipt.proposals[0].proposalId, memoryIds: [memId] }]);
  assert.deepEqual(db.prepare(`SELECT status FROM memory_file_proposals WHERE import_batch_id = ?`).all(v1.batchId).map((r) => r.status), ['approved']);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM memory_import_previews WHERE batch_id = ?').get(v1.batchId).n, 0, 'preview text removed');
  assert.ok(db.prepare('SELECT id FROM memories WHERE id = ?').get(memId), 'approved memory stays (forget only on request)');
  assert.equal((await call('POST', `${base}/cancel`, {})).statusCode, 409);
  // Replaying the old commit after rollback returns the receipt but creates nothing.
  const late = await call('POST', `${base}/commit`, { version: 2, contentHash: v2.contentHash, operationKey: key, confirm: true });
  assert.equal(late.statusCode, 200);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM memory_file_proposals WHERE import_batch_id = ?`).get(v1.batchId).n, 1);
});

test('cancel before commit discards the preview; expired previews are removed', async () => {
  const v = (await preview([file('n.md', '# N\n\nsome note text')])).json();
  const before = memCount();
  const res = await call('POST', `/api/memory/import/${v.batchId}/cancel`, {});
  assert.equal(res.json().status, 'cancelled');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM memory_import_previews WHERE batch_id = ?').get(v.batchId).n, 0);
  assert.equal((await call('POST', `/api/memory/import/${v.batchId}/commit`, { version: 1, contentHash: v.contentHash, operationKey: opKey(), confirm: true })).statusCode, 409);
  assert.equal((await call('GET', `/api/memory/import/${v.batchId}`)).statusCode, 404);
  assert.equal(memCount(), before);

  const e = (await preview([file('e.md', '# E\n\nexpiring text')])).json();
  db.prepare(`UPDATE memory_import_batches SET expires_at = '2000-01-01T00:00:00.000Z' WHERE id = ?`).run(e.batchId);
  assert.equal((await call('POST', `/api/memory/import/${e.batchId}/commit`, { version: 1, contentHash: e.contentHash, operationKey: opKey(), confirm: true })).statusCode, 409);
  assert.equal(db.prepare('SELECT status FROM memory_import_batches WHERE id = ?').get(e.batchId).status, 'expired');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM memory_import_previews WHERE batch_id = ?').get(e.batchId).n, 0);
  const list = (await call('GET', '/api/memory/import')).json().imports;
  assert.ok(list.some((b) => b.batchId === e.batchId && b.status === 'expired'));
  assert.ok(list.every((b) => !('items' in b)), 'list has no content');
});

test('queue limit: a commit that would overflow the review queue is refused as a whole', async () => {
  const doc = Array.from({ length: 150 }, (_, i) => `# Q${i}\n\nqueue item ${i}`).join('\n\n');
  const a = (await preview([file('q1.md', doc)])).json();
  const ca = await call('POST', `/api/memory/import/${a.batchId}/commit`, { version: 1, contentHash: a.contentHash, operationKey: opKey(), confirm: true });
  assert.equal(ca.statusCode, 201, ca.body);
  const doc2 = Array.from({ length: 60 }, (_, i) => `# R${i}\n\nsecond queue item ${i}`).join('\n\n');
  const b = (await preview([file('q2.md', doc2)])).json();
  const cb = await call('POST', `/api/memory/import/${b.batchId}/commit`, { version: 1, contentHash: b.contentHash, operationKey: opKey(), confirm: true });
  assert.equal(cb.statusCode, 409);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM memory_file_proposals WHERE import_batch_id = ?`).get(b.batchId).n, 0, 'nothing partial');
  for (const id of [a.batchId, b.batchId]) await call('POST', `/api/memory/import/${id}/cancel`, {});
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM memory_file_proposals WHERE import_batch_id = ?`).get(a.batchId).n, 0);
});

test('audit: every stage recorded with counts only (no content, names or secrets)', async () => {
  const rows = db.prepare(`SELECT action, metadata, resource_id FROM audit_logs WHERE action LIKE 'memory_import.%'`).all();
  const actions = new Set(rows.map((r) => r.action));
  for (const a of ['memory_import.preview', 'memory_import.revise', 'memory_import.commit', 'memory_import.cancel', 'memory_import.rollback', 'memory_import.settings']) {
    assert.ok(actions.has(a), a);
  }
  const text = rows.map((r) => `${r.metadata} ${r.resource_id}`).join('\n');
  for (const value of Object.values(SECRETS)) assert.ok(!text.includes(value));
  for (const s of ['project-notes.md', 'CLAUDE.md', 'We deploy', 'Girru', 'anna@example.test', 'REDACTED:']) assert.ok(!text.includes(s), `audit contains ${s}`);
  const commit = JSON.parse(rows.find((r) => r.action === 'memory_import.commit').metadata);
  assert.ok(Number.isInteger(commit.proposals) && /^[0-9a-f]{64}$/.test(commit.contentHash));
});
