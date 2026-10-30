// APPS-06: the Telegram and Discord apps come from the Girru Store and run on Girru's channel host
// through api.hostChannel(). Fixture apps in a temp extensions folder stand in for them: the host
// adds their routes (owner/admin only, token never sent back, the saver becomes the channel owner),
// and an app that is not a channel Girru has a transport for cannot use it. No provider is
// contacted: the fixture channel stays off, so the host never connects.
// Run: node --import tsx --test test/channel-host-sdk.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-channel-host-sdk-'));
const backendDir = process.cwd();
process.chdir(dir);
process.env.HOME = dir;
process.env.GIRRU_EXTENSIONS_DIR = join(dir, 'extensions');
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

// A channel app as the Store's Telegram package is built: the host does the work, the app adds a send tool.
const channelApp = (tool) => `let channel;
export default {
  async register(api) {
    channel = api.hostChannel();
    api.registerTool({ name: '${tool}', description: 'send', input_schema: { type: 'object', properties: {} },
      async execute(params, context) {
        try { api.authorizeChannelUser(context?.userId); await channel.send(params.to, params.text); return { content: [{ type: 'text', text: 'sent' }] }; }
        catch (error) { return { error: error.message, content: [{ type: 'text', text: 'not sent' }] }; }
      } });
  },
  async onDisable() { await channel?.stop(); },
};
`;
const apps = { telegram: channelApp('fixture_telegram_send'), 'not-a-channel': channelApp('fixture_other_send') };
for (const [id, code] of Object.entries(apps)) {
  mkdirSync(join(dir, 'extensions', id), { recursive: true });
  writeFileSync(join(dir, 'extensions', id, 'agentplayer.plugin.json'), JSON.stringify({ id, name: id, version: '1.0.0', main: 'index.js', permissions: ['database', 'tools'] }));
  writeFileSync(join(dir, 'extensions', id, 'index.js'), code);
}

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { ExtensionRunner } = await import(join(backendDir, 'src/plugins/extension-runner.ts'));
const tools = await import(join(backendDir, 'src/tools/index.ts'));
const { default: Fastify } = await import('fastify');

const db = getDatabase();
await db.initialize();
const addUser = (id, role, status = 'active') => db.prepare(
  `INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, ?)`
).run(id, `${id}@example.test`, id, role, status);
addUser('u-owner', 'owner');
addUser('u-user', 'user');
addUser('u-suspended', 'admin', 'suspended');
const token = (id) => `Bearer ${generateToken(id, 1)}`;
// On as an app, the channel itself off: the host never starts a provider connection here.
db.prepare(`INSERT OR REPLACE INTO extension_configs (extension_id, enabled, config_json) VALUES ('telegram', 1, ?)`).run(JSON.stringify({ enabled: false }));
db.prepare(`INSERT OR REPLACE INTO extension_configs (extension_id, enabled) VALUES ('not-a-channel', 1)`).run();

const quiet = console.error; console.error = () => {};
const app = Fastify();
const runner = new ExtensionRunner(join(dir, 'extensions'));
await runner.initialize(app, { register() {}, unregister() {} });
await app.ready();
console.error = quiet;

test.after(async () => {
  for (const [, ext] of runner.getLoadedExtensions()) { try { await ext.onDisable?.({}); } catch {} }
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const call = (method, url, who, payload) => app.inject({ method, url, ...(who ? { headers: { authorization: token(who) } } : {}), ...(payload ? { payload } : {}) });
const SECRET = 'fixture-bot-token-value';

test('a channel app runs on the host: its routes are owner/admin only and come from Girru', async () => {
  assert.ok(runner.getLoadedExtensions().has('telegram'));
  assert.equal((await call('GET', '/api/ext/telegram/config')).statusCode, 401);
  assert.equal((await call('GET', '/api/ext/telegram/config', 'u-user')).statusCode, 403);
  assert.equal((await call('GET', '/api/ext/telegram/config', 'u-suspended')).statusCode, 403);
  const status = await call('GET', '/api/ext/telegram/status', 'u-owner');
  assert.equal(status.statusCode, 200, status.body);
  assert.equal(status.json().enabled, false);
  assert.equal((await call('POST', '/api/ext/telegram/webhook', 'u-owner', {})).statusCode, 410, 'no unauthenticated webhook intake');
});

test('settings: the saver becomes the channel owner, the token is never sent back, a blank token keeps it', async () => {
  const saved = await call('PUT', '/api/ext/telegram/config', 'u-owner', { config: { bot_token: SECRET, allowed_users: 'sender-1', owner_user_id: 'u-user' } });
  assert.equal(saved.statusCode, 200, saved.body);
  const stored = () => JSON.parse(db.prepare("SELECT config_json FROM extension_configs WHERE extension_id = 'telegram'").get().config_json);
  assert.equal(stored().owner_user_id, 'u-owner', 'the owner comes from the signed-in account, never the body');
  assert.equal(stored().bot_token, SECRET);
  const read = await call('GET', '/api/ext/telegram/config', 'u-owner');
  assert.equal(read.json().hasToken, true);
  assert.ok(!read.body.includes(SECRET));
  assert.equal((await call('PUT', '/api/ext/telegram/config', 'u-owner', { config: { bot_token: '', allowed_users: 'sender-1,sender-2' } })).statusCode, 200);
  assert.equal(stored().bot_token, SECRET);
  assert.equal((await call('PUT', '/api/ext/telegram/config', 'u-user', { config: { bot_token: 'other' } })).statusCode, 403);
  assert.equal(stored().bot_token, SECRET);
});

test('the send handle refuses while the channel is off; the tool refuses anyone but an active owner or admin', async () => {
  const tool = tools.getExtensionTools('telegram').find((t) => t.name === 'fixture_telegram_send');
  assert.ok(tool, 'the app registered its tool');
  assert.match((await tool.execute({ to: 'chat-1', text: 'hi' }, { userId: 'u-user' })).error, /owner or admin/);
  assert.match((await tool.execute({ to: 'chat-1', text: 'hi' }, {})).error ?? '', /./);
  assert.match((await tool.execute({ to: 'chat-1', text: 'hi' }, { userId: 'u-owner' })).error, /disabled or unconfigured/);
});

test('an app that is not a channel Girru has a transport for cannot use the host', async () => {
  assert.equal(runner.getLoadedExtensions().has('not-a-channel'), false);
  assert.equal((await call('GET', '/api/ext/not-a-channel/config', 'u-owner')).statusCode, 404);
});
