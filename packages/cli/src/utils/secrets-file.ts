/**
 * CLI side of the secrets bootstrap (INST-02, used by `setup` and `doctor`).
 *
 * Same rules and file format as the backend module
 * packages/backend/src/config/secrets-bootstrap.ts (a test keeps the two lists
 * in sync): <data dir>/secrets.env, mode 0600, existing values never replaced,
 * values from the environment / .env win, placeholders refused. Values are
 * never printed; results contain names only.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const SECRETS_FILE_NAME = 'secrets.env';

export interface SecretSpec {
  name: string;
  bytes: number;
  pattern?: RegExp;
  formatHint?: string;
}

export const REQUIRED_SECRETS: readonly SecretSpec[] = [
  { name: 'JWT_SECRET', bytes: 64 },
  { name: 'ENCRYPTION_KEY', bytes: 32, pattern: /^[0-9a-fA-F]{64}$/, formatHint: '64 hex characters (32 bytes)' },
  { name: 'MASTER_ENCRYPTION_KEY', bytes: 32 },
  { name: 'WORKFLOW_SECRET', bytes: 32 },
];

export const MIN_SECRET_LENGTH = 32;

export const PLACEHOLDER_VALUES: ReadonlySet<string> = new Set([
  'change-me', 'changeme', 'change_me', 'secret', 'password',
  'your-secret-here', 'your-secret-key', 'your-secret-key-here',
  'your-secret-key-here-change-this-immediately', 'your-encryption-key', 'your-encryption-key-here',
  'development-secret-change-in-production', 'default-encryption-key-change-in-production',
  'super-secret-key-change-me',
]);

export const PLACEHOLDER_FRAGMENTS: readonly string[] = [
  'change-me', 'change_me', 'changeme', 'change-this', 'change_this', 'change-in-production',
  'your-secret', 'your_secret', 'your-key', 'secret-here', 'key-here', 'placeholder',
];

export function isPlaceholderSecret(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (PLACEHOLDER_VALUES.has(v)) return true;
  return PLACEHOLDER_FRAGMENTS.some((f) => v.includes(f));
}

export function parseEnvText(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value[value.length - 1] === value[0]) {
      value = value.slice(1, -1);
    }
    if (/^[A-Z][A-Z0-9_]*$/.test(key)) out.set(key, value);
  }
  return out;
}

export function readEnvFile(file: string): Map<string, string> {
  try {
    return parseEnvText(fs.readFileSync(file, 'utf-8'));
  } catch {
    return new Map();
  }
}

export type SecretState = 'ok' | 'missing' | 'placeholder' | 'bad-format' | 'weak';

export interface SecretStatus {
  name: string;
  state: SecretState;
  /** Where the value that the backend will use comes from. */
  source: 'env' | '.env' | 'file' | 'none';
}

/**
 * Status of each required secret, in the backend's order of precedence:
 * process environment, then the .env files, then the secrets file.
 */
export function inspectSecrets(
  dataDir: string,
  dotenv: Map<string, string>,
  env: Record<string, string | undefined> = {},
): SecretStatus[] {
  const file = readEnvFile(path.join(dataDir, SECRETS_FILE_NAME));
  return REQUIRED_SECRETS.map((spec) => {
    let value: string | undefined;
    let source: SecretStatus['source'] = 'none';
    if (env[spec.name]) { value = env[spec.name]; source = 'env'; }
    else if (dotenv.get(spec.name)) { value = dotenv.get(spec.name); source = '.env'; }
    else if (file.get(spec.name)) { value = file.get(spec.name); source = 'file'; }
    if (!value) return { name: spec.name, state: 'missing', source };
    const v = value.trim();
    if (isPlaceholderSecret(v)) return { name: spec.name, state: 'placeholder', source };
    if (spec.pattern && !spec.pattern.test(v)) return { name: spec.name, state: 'bad-format', source };
    if (v.length < MIN_SECRET_LENGTH) return { name: spec.name, state: 'weak', source };
    return { name: spec.name, state: 'ok', source };
  });
}

/**
 * Append newly generated values for the given names to the secrets file
 * (created 0600 in a 0700 folder). Names already in the file are skipped.
 * Returns the names written.
 */
export function addMissingSecrets(dataDir: string, names: readonly string[]): string[] {
  const file = path.join(dataDir, SECRETS_FILE_NAME);
  let text = '';
  try { text = fs.readFileSync(file, 'utf-8'); } catch (err: any) { if (err?.code !== 'ENOENT') throw err; }
  const existing = parseEnvText(text);
  const added: string[] = [];
  const lines: string[] = [];
  for (const spec of REQUIRED_SECRETS) {
    if (!names.includes(spec.name) || existing.get(spec.name)) continue;
    lines.push(`${spec.name}=${crypto.randomBytes(spec.bytes).toString('hex')}`);
    added.push(spec.name);
  }
  if (added.length === 0) return [];
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  let next = text;
  if (!next) {
    next = '# Dpro Bot secrets: created automatically, private to this user (0600).\n'
      + '# Do not share or commit this file. Values set in .env take precedence.\n';
  } else if (!next.endsWith('\n')) {
    next += '\n';
  }
  next += `${lines.join('\n')}\n`;
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try {
    fs.writeSync(fd, next);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
  if (process.platform !== 'win32') fs.chmodSync(file, 0o600);
  return added;
}

/** The .env values the backend loads (backend folder first, then the root). */
export function readInstallDotenv(backendDir: string, root: string): Map<string, string> {
  const merged = new Map<string, string>();
  for (const file of [path.join(root, '.env'), path.join(backendDir, '.env')]) {
    for (const [k, v] of readEnvFile(file)) merged.set(k, v);
  }
  return merged;
}
