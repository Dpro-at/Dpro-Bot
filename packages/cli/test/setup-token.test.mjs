// INSTALLER-07, CLI side: `setup` / `start` show a one-time owner setup code
// on an interactive terminal only, store just its hash (0600) in the data
// folder in the format the backend checks, and never pass it to the log.
// Fake install in a temp folder; nothing starts, nothing is installed.
// Run (from the repo root): node --import tsx --test packages/cli/test/setup-token.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'ap-cli-setup-token-')));
process.env.HOME = join(tmp, 'home');
process.env.AGENT_PLAYER_CONFIG_DIR = join(tmp, 'home', '.config', 'agent-player');
delete process.env.AGENT_PLAYER_ROOT;
delete process.env.AGENT_PLAYER_DATA_DIR;
mkdirSync(process.env.HOME, { recursive: true });

const st = await import('../src/utils/setup-token.ts');
const ir = await import('../src/utils/install-root.ts');
const { setupCommand } = await import('../src/commands/setup.ts');
const backend = await import('../../backend/src/auth/setup-token.ts');

test.after(() => rmSync(tmp, { recursive: true, force: true }));

function fakeInstall(name) {
  const root = join(tmp, name);
  mkdirSync(join(root, 'packages', 'backend'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'agent-player' }));
  writeFileSync(join(root, 'packages', 'backend', 'package.json'), JSON.stringify({ name: '@agent-player/backend' }));
  return root;
}
const tty = () => { const out = []; return { out, terminal: { isTTY: true, write: (t) => out.push(t) } }; };
const codeIn = (text) => /Setup code: {2}([A-Za-z0-9_-]{43})/.exec(text)?.[1];

test('terminal: a code is shown with a local link; only its hash is stored (0600); the backend accepts it', () => {
  const dataDir = join(tmp, 'd1');
  const logs = []; const { out, terminal } = tty();
  assert.equal(st.offerSetupToken({ dataDir, log: (m) => logs.push(m), terminal }), 'issued');
  const text = out.join('');
  const code = codeIn(text);
  assert.ok(code, text);
  assert.ok(text.includes(`http://127.0.0.1:42522/#setup=${code}`));
  assert.ok(!logs.join('\n').includes(code), 'the code never goes to the log');
  const file = join(dataDir, st.SETUP_TOKEN_FILE);
  assert.ok(!readFileSync(file, 'utf8').includes(code), 'plain code not stored');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(backend.checkSetupToken(code, dataDir), 'ok', 'same file format as the backend');
  // A second run replaces the code: the old one stops working.
  const again = tty();
  st.offerSetupToken({ dataDir, log: () => {}, terminal: again.terminal });
  assert.equal(backend.checkSetupToken(code, dataDir), 'invalid');
  assert.equal(backend.checkSetupToken(codeIn(again.out.join('')), dataDir), 'ok');
});

test('no terminal (daemon child, service): nothing issued, hint only', () => {
  const dataDir = join(tmp, 'd2');
  const logs = []; const writes = [];
  assert.equal(st.offerSetupToken({ dataDir, log: (m) => logs.push(m), terminal: { isTTY: false, write: (t) => writes.push(t) } }), 'no-terminal');
  assert.equal(existsSync(join(dataDir, st.SETUP_TOKEN_FILE)), false);
  assert.deepEqual(writes, []);
  assert.match(logs.join('\n'), /girru setup/);
});

test('setup finished: no code', () => {
  const dataDir = join(tmp, 'd3');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, st.SETUP_FLAG_FILE), '{}');
  const { out, terminal } = tty();
  assert.equal(st.offerSetupToken({ dataDir, log: () => {}, terminal }), 'done');
  assert.deepEqual(out, []);
  assert.equal(existsSync(join(dataDir, st.SETUP_TOKEN_FILE)), false);
});

test('`agent-player setup` issues the code into the backend data folder (AGENT_PLAYER_DATA_DIR wins)', () => {
  const root = fakeInstall('i1');
  const paths = ir.pathsFor(root, 'env');
  const logs = []; const { out, terminal } = tty();
  assert.equal(setupCommand({ paths, log: (m) => logs.push(m), env: {}, configDir: join(tmp, 'cfg'), terminal }), 0);
  const code = codeIn(out.join(''));
  assert.equal(backend.checkSetupToken(code, paths.dataDir), 'ok');
  assert.ok(!logs.join('\n').includes(code));

  const other = join(tmp, 'custom-data');
  const second = tty();
  assert.equal(setupCommand({ paths, log: () => {}, env: { AGENT_PLAYER_DATA_DIR: other }, configDir: join(tmp, 'cfg'), terminal: second.terminal }), 0);
  assert.equal(backend.checkSetupToken(codeIn(second.out.join('')), other), 'ok');
});
