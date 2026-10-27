/**
 * Secrets bootstrap (INST-02).
 *
 * On start the backend makes sure its required secrets exist without anyone
 * editing `.env` by hand:
 *  - A value already in the environment (for example from `.env`) wins and is
 *    never written to disk again, so existing installs keep working.
 *  - Otherwise the value is read from `<data dir>/secrets.env` (mode 0600,
 *    directory 0700).
 *  - Otherwise a new value is generated with the OS random generator and
 *    appended to that file. Existing values in the file are never replaced.
 *  - Known placeholder values (`change-me`, `your-secret-here`, ...) stop the
 *    boot with a clear error that names the variable, never its value.
 *
 * Nothing here prints or logs a secret value; reports contain names only.
 * This module has no dependencies besides Node built-ins so the CLI
 * (`agent-player setup` / `doctor --fix`) can keep the same rules.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { dataRootOverride } from './data-root.js';

export const SECRETS_FILE_NAME = 'secrets.env';

export interface SecretSpec {
  name: string;
  /** Random bytes for a generated value (written as hex). */
  bytes: number;
  /** Extra format rule for values that come from the environment or the file. */
  pattern?: RegExp;
  formatHint?: string;
}

export const REQUIRED_SECRETS: readonly SecretSpec[] = [
  { name: 'JWT_SECRET', bytes: 64 },
  {
    name: 'ENCRYPTION_KEY',
    bytes: 32,
    pattern: /^[0-9a-fA-F]{64}$/,
    formatHint: '64 hex characters (32 bytes)',
  },
  { name: 'MASTER_ENCRYPTION_KEY', bytes: 32 },
  { name: 'WORKFLOW_SECRET', bytes: 32 },
];

/** Minimum length for values that come from outside (generated ones are longer). */
export const MIN_SECRET_LENGTH = 32;

/** Exact placeholder values shipped in examples and docs (compared case-insensitively). */
const PLACEHOLDER_VALUES: ReadonlySet<string> = new Set([
  'change-me',
  'changeme',
  'change_me',
  'secret',
  'password',
  'your-secret-here',
  'your-secret-key',
  'your-secret-key-here',
  'your-secret-key-here-change-this-immediately',
  'your-encryption-key',
  'your-encryption-key-here',
  'development-secret-change-in-production',
  'default-encryption-key-change-in-production',
  'super-secret-key-change-me',
]);

/** Fragments that only placeholder text contains. */
const PLACEHOLDER_FRAGMENTS: readonly string[] = [
  'change-me',
  'change_me',
  'changeme',
  'change-this',
  'change_this',
  'change-in-production',
  'your-secret',
  'your_secret',
  'your-key',
  'secret-here',
  'key-here',
  'placeholder',
];

export function isPlaceholderSecret(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (PLACEHOLDER_VALUES.has(v)) return true;
  return PLACEHOLDER_FRAGMENTS.some((f) => v.includes(f));
}

export class SecretsBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretsBootstrapError';
  }
}

export type SecretSource = 'env' | 'file' | 'generated';

export interface SecretsReport {
  file: string;
  /** Name → where the value came from. Never the value. */
  sources: Record<string, SecretSource>;
  generated: string[];
  /** Names whose value is shorter than MIN_SECRET_LENGTH (kept, but weak). */
  weak: string[];
}

/** `AGENT_PLAYER_DATA_DIR` when set (and no cwd is given), else `<cwd>/.data`. */
export function defaultDataDir(cwd?: string): string {
  if (cwd === undefined) {
    const root = dataRootOverride();
    if (root) return root;
  }
  return path.join(cwd ?? process.cwd(), '.data');
}

export function secretsFilePath(dataDir: string = defaultDataDir()): string {
  return path.join(dataDir, SECRETS_FILE_NAME);
}

/** Parse KEY=VALUE lines (no expansion; optional matching quotes are removed). */
export function parseSecretsFile(text: string): Map<string, string> {
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

export function generateSecret(spec: SecretSpec): string {
  return crypto.randomBytes(spec.bytes).toString('hex');
}

/** Problem with a value, as text that names the variable only; null when fine. */
export function checkSecretValue(spec: SecretSpec, value: string, where: string): string | null {
  if (isPlaceholderSecret(value)) {
    return `${spec.name} in ${where} is a known placeholder value. Remove it so a new one is generated, or set a real random value.`;
  }
  if (spec.pattern && !spec.pattern.test(value)) {
    return `${spec.name} in ${where} has the wrong format (expected ${spec.formatHint}).`;
  }
  return null;
}

function ensurePrivateDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

function readSecretsFile(file: string): { text: string; values: Map<string, string> } {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
  }
  return { text, values: parseSecretsFile(text) };
}

/** Write the whole file through a 0600 temp file and rename (no partial file). */
function writePrivateFile(file: string, text: string): void {
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try {
    fs.writeSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
  if (process.platform !== 'win32') fs.chmodSync(file, 0o600);
}

export interface BootstrapOptions {
  dataDir?: string;
  env?: NodeJS.ProcessEnv;
  specs?: readonly SecretSpec[];
  /** Names-only notices (default console.warn). */
  log?: (message: string) => void;
}

/**
 * Make sure every required secret is set in `env` (default process.env).
 * Throws SecretsBootstrapError for placeholder or malformed values.
 */
export function bootstrapSecrets(options: BootstrapOptions = {}): SecretsReport {
  const env = options.env ?? process.env;
  const specs = options.specs ?? REQUIRED_SECRETS;
  const dataDir = options.dataDir ?? defaultDataDir();
  const log = options.log ?? ((m: string) => console.warn(m));
  const file = secretsFilePath(dataDir);

  const { text, values } = readSecretsFile(file);
  const sources: Record<string, SecretSource> = {};
  const generated: string[] = [];
  const weak: string[] = [];
  const problems: string[] = [];
  const additions: string[] = [];

  for (const spec of specs) {
    const fromEnv = env[spec.name];
    if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
      const problem = checkSecretValue(spec, fromEnv.trim(), 'the environment (.env)');
      if (problem) problems.push(problem);
      if (fromEnv.trim().length < MIN_SECRET_LENGTH) weak.push(spec.name);
      sources[spec.name] = 'env';
      continue;
    }
    const fromFile = values.get(spec.name);
    if (typeof fromFile === 'string' && fromFile !== '') {
      const problem = checkSecretValue(spec, fromFile, SECRETS_FILE_NAME);
      if (problem) problems.push(problem);
      if (fromFile.length < MIN_SECRET_LENGTH) weak.push(spec.name);
      env[spec.name] = fromFile;
      sources[spec.name] = 'file';
      continue;
    }
    const value = generateSecret(spec);
    additions.push(`${spec.name}=${value}`);
    env[spec.name] = value;
    sources[spec.name] = 'generated';
    generated.push(spec.name);
  }

  if (problems.length > 0) {
    throw new SecretsBootstrapError(`Refusing to start: ${problems.join(' ')}`);
  }

  if (additions.length > 0) {
    ensurePrivateDir(dataDir);
    let next = text;
    if (!next) {
      next = '# Girru secrets: created automatically, private to this user (0600).\n'
        + '# Do not share or commit this file. Values set in .env take precedence.\n';
    } else if (!next.endsWith('\n')) {
      next += '\n';
    }
    next += `${additions.join('\n')}\n`;
    writePrivateFile(file, next);
    log(`[Secrets] Generated ${generated.join(', ')} in ${file} (values not shown).`);
  } else if (fs.existsSync(file) && process.platform !== 'win32') {
    // Our own file: keep it private even if someone loosened its mode.
    const mode = fs.statSync(file).mode & 0o777;
    if (mode & 0o077) {
      fs.chmodSync(file, 0o600);
      log(`[Secrets] ${file} was readable by other users; mode set to 0600.`);
    }
  }

  if (weak.length > 0) {
    log(`[Secrets] ${weak.join(', ')} shorter than ${MIN_SECRET_LENGTH} characters; consider a longer random value.`);
  }

  return { file, sources, generated, weak };
}
