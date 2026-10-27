/**
 * Project variables (CHAT-BUILD-01 stage 3, CH5): named values a project's
 * commands and terminal get as environment variables (an API base URL, a
 * test token). Stored encrypted in the credential store (AES-256-GCM), one
 * row per variable: name `project:<projectId>:<NAME>`, skill `chat-project`,
 * owned by the user. Values are never returned by an API, never given to a
 * model and never written to a chat; lists show names only.
 */
import { getCredentialManager } from '../credentials/manager.js';
import { getCredentialStorage } from '../credentials/storage.js';
import { CredentialType } from '../credentials/types.js';

export const PROJECT_VARIABLE_SKILL = 'chat-project';
export const MAX_VARIABLES = 32;
const NAME = /^[A-Z_][A-Z0-9_]{0,63}$/;
/** Names a variable may not take: they change how programs start or where they look. */
const RESERVED = /^(PATH|HOME|USER|LOGNAME|SHELL|TMPDIR|TEMP|TMP|LANG|LC_[A-Z_]+|TERM|PWD|OLDPWD|IFS|ENV|BASH_ENV|PS[0-9]|PROMPT_COMMAND|LD_[A-Z_]+|DYLD_[A-Z_]+|NODE_OPTIONS|NODE_PATH|PYTHONPATH|PYTHONSTARTUP|PYTHONHOME|PERL5LIB|PERL5OPT|RUBYOPT|RUBYLIB|GIT_[A-Z_]+|SSH_[A-Z_]+|AGENT_PLAYER_[A-Z_]*|DPRO_[A-Z_]*|GIRRU_[A-Z_]*)$/;
export const MAX_VALUE_CHARS = 8000;

export class ProjectVariableError extends Error {}

const rowName = (projectId: string, name: string) => `project:${projectId}:${name}`;
let ready: Promise<void> | null = null;
const storeReady = () => (ready ??= getCredentialStorage().initialize().catch((err) => { ready = null; throw err; }));

async function rows(userId: string, projectId: string) {
  await storeReady();
  const prefix = `project:${projectId}:`;
  return (await getCredentialStorage().getByUser(userId)).filter((c) => c.skillId === PROJECT_VARIABLE_SKILL && c.name.startsWith(prefix));
}

/** The project's variable names (never values), sorted. */
export async function listVariables(userId: string, projectId: string): Promise<string[]> {
  return (await rows(userId, projectId)).map((c) => c.name.slice(`project:${projectId}:`.length)).sort();
}

/** Adds or replaces one variable. */
export async function setVariable(userId: string, projectId: string, name: string, value: string): Promise<void> {
  if (!NAME.test(name)) throw new ProjectVariableError('A variable name uses capital letters, digits and _ (like API_URL)');
  if (RESERVED.test(name)) throw new ProjectVariableError(`${name} cannot be set here: it changes how programs start`);
  if (typeof value !== 'string' || !value || value.length > MAX_VALUE_CHARS || /[\0]/.test(value)) throw new ProjectVariableError(`A value is 1-${MAX_VALUE_CHARS} characters`);
  const existing = await rows(userId, projectId);
  const same = existing.find((c) => c.name === rowName(projectId, name));
  if (!same && existing.length >= MAX_VARIABLES) throw new ProjectVariableError(`A project can have at most ${MAX_VARIABLES} variables`);
  const manager = getCredentialManager();
  if (same) await manager.delete(same.id);
  await manager.create({ name: rowName(projectId, name), type: CredentialType.SECRET, value, description: `project:${projectId}`, skillId: PROJECT_VARIABLE_SKILL, userId });
}

export async function deleteVariable(userId: string, projectId: string, name: string): Promise<boolean> {
  const row = (await rows(userId, projectId)).find((c) => c.name === rowName(projectId, name));
  if (!row) return false;
  await getCredentialManager().delete(row.id);
  return true;
}

/** Every variable of a deleted project goes with it. */
export async function deleteProjectVariables(userId: string, projectId: string): Promise<void> {
  for (const row of await rows(userId, projectId)) await getCredentialManager().delete(row.id);
}

/** The values, for the project's commands and terminal only (an unreadable value is skipped). */
export async function variablesEnv(userId: string, projectId: string): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  const storage = getCredentialStorage();
  for (const row of await rows(userId, projectId)) {
    const name = row.name.slice(`project:${projectId}:`.length);
    if (!NAME.test(name) || RESERVED.test(name)) continue;
    try { env[name] = await storage.decrypt(row); } catch { /* key changed: left out */ }
  }
  return env;
}
