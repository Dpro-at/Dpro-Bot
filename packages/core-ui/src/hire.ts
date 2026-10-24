import { SessionFailure } from './session-failure';
import { traitNames } from './personality-contract.js';
import { department as validDepartment, dialects, displayName, presets, roles, riskyCategories, validCreateBody, MAX_GRANTS } from './hire-contract.js';
import type { SessionClient } from './session';

export type Role = 'main' | 'manager' | 'specialist' | 'evaluator';
export type Preset = 'balanced-assistant' | 'careful-auditor' | 'bold-creative' | 'precise-developer' | 'strict-evaluator';
export type Dialect = typeof dialects[number];
export type TraitName = 'doubt' | 'caution' | 'creativity' | 'thoroughness' | 'independence' | 'verbosity' | 'warmth' | 'curiosity' | 'persistence';
export type CreateBody = { name?: string; role: Role; department?: string; description?: string; libraryPersonality?: {id:string;revision:number}; personality?: { preset: Preset; dialect?: Dialect; traits?: Partial<Record<TraitName, number>> } };
export type HireRequest =
  | { method: 'POST'; path: '/api/agents'; body: CreateBody }
  | { method: 'GET'; path: string }
  | { method: 'PUT'; path: string; body: { grants: string[]; expectedVersion: number } }
  | { method: 'PUT'; path: string; body: PermissionsBody }
  | { method: 'POST'; path: '/api/onboarding/team-plan'; body: { size: 'solo' | 'small' | 'medium' | 'large'; departments: string[]; language?: string } }
  | { method: 'POST'; path: '/api/onboarding/team-distribution'; body: { departments: string[]; total?: number; counts?: Record<string, number> } }
  | { method: 'POST'; path: '/api/onboarding/team-batches'; body: { id: string; language?: string; departments: { department: string; count: number; presets?: Partial<Record<'manager' | 'specialist' | 'evaluator', Preset>> }[] } }
  | { method: 'POST'; path: string; body: { max?: number; retryFailed?: boolean } };

/** CORE-PERMS-01: memory scope and off / ask / allow per tool category. */
export type DrawerKind = 'owner' | 'project' | 'experience' | 'task' | 'people';
export type PermissionCategory = 'browser' | 'network' | 'message' | 'delete' | 'install' | 'money' | 'settings';
export type PermissionMode = 'off' | 'ask' | 'allow';
export type Permissions = Readonly<{ memoryRead: readonly DrawerKind[]; memoryWrite: readonly DrawerKind[]; sharedMemory: boolean; modes: Readonly<Record<PermissionCategory, PermissionMode>>; version: number }>;
export type PermissionsBody = { memoryRead: DrawerKind[]; memoryWrite: DrawerKind[]; sharedMemory: boolean; modes: Record<PermissionCategory, PermissionMode>; expectedVersion: number; confirmRisky?: boolean };
export const allDrawerKinds: readonly DrawerKind[] = ['owner', 'project', 'experience', 'task', 'people'];
export const drawerKindLabel: Record<DrawerKind, string> = { owner: 'About you', experience: 'Lessons learned', project: 'Projects', task: 'Tasks', people: 'People you know' };
export const allCategories: readonly PermissionCategory[] = ['browser', 'network', 'message', 'delete', 'install', 'money', 'settings'];
export const categoryLabel: Record<PermissionCategory, string> = {
  browser: 'Use a web browser', network: 'Read the internet and outside tools', message: 'Send messages for you', delete: 'Delete data',
  install: 'Install skills or code', money: 'Spend money or trade', settings: 'Change settings or saved keys',
};
export const modeLabel: Record<PermissionMode, string> = { off: 'Off', ask: 'Ask me first', allow: 'Allow' };
export const isRisky = (c: PermissionCategory) => (riskyCategories as readonly string[]).includes(c);

export type Tool = Readonly<{ name: string; description: string; requiresApproval: boolean; allowedByServer: boolean; execClass: boolean }>;
export type Draft = Readonly<{ name: string; role: Role; department: string; description: string; preset: Preset; presetChosen: boolean; libraryPersonality?:{id:string;revision:number}; dialect: Dialect | ''; traits: Readonly<Partial<Record<TraitName, number>>> }>;
export type Step = 'role' | 'persona' | 'memory' | 'permissions' | 'done';
export type HireState = Readonly<{
  step: Step; draft: Draft; owner: boolean;
  phase: 'editing' | 'creating' | 'loading' | 'saving' | 'done' | 'error' | 'unknown' | 'denied';
  agent?: Readonly<{ id: string; name?: string; version: number }>;
  tools: readonly Tool[]; selected: readonly string[]; grantsVersion?: number; scoped: boolean;
  /** CORE-PERMS-01: loaded with the tools; confirmRisky = the owner ticked "I understand" for a risky Allow. */
  permissions?: Permissions; confirmRisky: boolean;
  notice?: string;
}>;

export const roleLabel: Record<Role, string> = { main: 'Lead', manager: 'Manager', specialist: 'Specialist', evaluator: 'Reviewer' };
export const roleHelp: Record<Role, string> = {
  main: 'Runs the team and talks to you first.',
  manager: 'Splits work and checks on the others.',
  specialist: 'Does one kind of work very well.',
  evaluator: 'Checks results before they reach you.',
};
export const presetLabel: Record<Preset, string> = {
  'balanced-assistant': 'Balanced', 'careful-auditor': 'Careful auditor', 'bold-creative': 'Bold creative',
  'precise-developer': 'Precise developer', 'strict-evaluator': 'Strict reviewer',
};
export const presetHelp: Record<Preset, string> = {
  'balanced-assistant': 'Even temper; a good default for most roles.',
  'careful-auditor': 'Doubts first, double-checks numbers and risks.',
  'bold-creative': 'Takes initiative and proposes new ideas.',
  'precise-developer': 'Thorough, exact and persistent with technical work.',
  'strict-evaluator': 'Hard to convince; looks for what is wrong.',
};
export const traitLabel: Record<TraitName, string> = {
  doubt: 'Doubt', caution: 'Caution', creativity: 'Creativity', thoroughness: 'Thoroughness', independence: 'Independence',
  verbosity: 'Detail in replies', warmth: 'Warmth', curiosity: 'Curiosity', persistence: 'Persistence',
};
export const dialectLabel: Record<Dialect, string> = {
  'ar-IQ': 'Arabic (Iraqi)', ar: 'Arabic', en: 'English', de: 'German', fr: 'French', es: 'Spanish', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', 'pt-BR': 'Portuguese (Brazil)', ru: 'Russian', tr: 'Turkish', hi: 'Hindi',
};
export const allRoles = roles as readonly Role[];
export const allPresets = presets as readonly Preset[];
export const allDialects = dialects as readonly Dialect[];
export const allTraits = traitNames as readonly TraitName[];

/** The persona a role or department suggests (the owner can always change it). */
export function suggestedPreset(role: Role, department: string): Preset {
  const d = department.trim().toLowerCase();
  if (['development', 'dev', 'engineering', 'software'].includes(d)) return 'precise-developer';
  if (d === 'marketing') return 'bold-creative';
  if (['accounting', 'finance', 'security'].includes(d)) return 'careful-auditor';
  return role === 'evaluator' ? 'strict-evaluator' : 'balanced-assistant';
}

/** Memory tools are shown on their own step; everything else is a permission. */
export const memoryTool = (name: string) => name.startsWith('memory_') || name.startsWith('storage_');

export function normalizedDepartment(x: string) { return x.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase(); }
export function normalizedName(x: string) { return x.normalize('NFKC').replace(/\s+/g, ' ').trim(); }

export function createBody(d: Draft): CreateBody | null {
  const name = normalizedName(d.name); const department = normalizedDepartment(d.department); const description = d.description.trim();
  if (name && !displayName(name)) return null;
  if (department && !validDepartment(department)) return null;
  const traits = Object.fromEntries(Object.entries(d.traits).filter(([, v]) => v !== undefined));
  const body: CreateBody = {
    ...(name ? { name } : {}), role: d.role, ...(department ? { department } : {}), ...(description ? { description } : {}),
    ...(d.libraryPersonality?{libraryPersonality:d.libraryPersonality}:{personality: { preset: d.preset, ...(d.dialect ? { dialect: d.dialect } : {}), ...(Object.keys(traits).length ? { traits } : {}) }}),
  };
  return validCreateBody(body) ? body : null;
}

const emptyDraft: Draft = Object.freeze({ name: '', role: 'specialist', department: '', description: '', preset: 'balanced-assistant', presetChosen: false, dialect: '', traits: Object.freeze({}) });
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

export class HireController {
  #state: HireState = Object.freeze({ step: 'role', draft: emptyDraft, owner: false, phase: 'denied', tools: [], selected: [], scoped: false, confirmRisky: false });
  #listeners = new Set<() => void>();
  #disposed = false; #ticket = 0; #abort?: AbortController; #identity = ''; #unsubscribe: () => void;
  constructor(readonly client: SessionClient) { this.#unsubscribe = client.subscribe(this.#sync); this.#sync(); }
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  #publish(patch: Partial<HireState>) { this.#state = Object.freeze({ ...this.#state, ...patch }); this.#listeners.forEach(fn => fn()); }
  #sync = () => {
    const s = this.client.getSnapshot(); const identity = `${s.mode}:${s.epoch}:${s.phase}:${s.user?.id ?? ''}:${s.user?.role ?? ''}`;
    if (identity === this.#identity) return;
    this.#identity = identity; this.#invalidate();
    const owner = s.phase === 'authenticated' && s.user?.role === 'owner';
    this.#publish({ step: 'role', draft: emptyDraft, owner, phase: owner ? 'editing' : 'denied', agent: undefined, tools: [], selected: [], grantsVersion: undefined, scoped: false, permissions: undefined, confirmRisky: false,
      notice: s.phase === 'authenticated' && !owner ? 'Only the owner can hire agents.' : undefined });
  };
  #invalidate() { this.#ticket++; this.#abort?.abort(); }
  #begin(phase: HireState['phase']) { this.#invalidate(); this.#abort = new AbortController(); this.#publish({ phase, notice: undefined }); return this.#ticket; }
  #busy() { return ['creating', 'loading', 'saving'].includes(this.#state.phase); }
  #denied(status: number, body?: unknown) {
    if (status === 403 && record(body) && body.code === 'read_only_stage') {
      this.#invalidate(); this.#publish({ phase: 'error', notice: 'This test server does not accept changes yet. Nothing was saved.' }); return true;
    }
    if (status !== 401 && status !== 403) return false;
    this.#invalidate(); this.#publish({ phase: 'denied', notice: 'Access denied. Sign in again as the owner.' }); return true;
  }
  dispose() { this.#disposed = true; this.#invalidate(); this.#unsubscribe(); this.#publish({ owner: false, phase: 'denied', tools: [], selected: [], notice: undefined }); }

  /** Start over with an empty form (after a hire, or to discard the draft). */
  restart() {
    if (!this.#state.owner || this.#busy()) return;
    this.#invalidate();
    this.#publish({ step: 'role', draft: emptyDraft, phase: 'editing', agent: undefined, tools: [], selected: [], grantsVersion: undefined, scoped: false, permissions: undefined, confirmRisky: false, notice: undefined });
  }
  edit(patch: Partial<Omit<Draft, 'traits' | 'presetChosen'>>) {
    if (!this.#state.owner || this.#state.agent || this.#busy()) return;
    const draft = { ...this.#state.draft, ...patch };
    if(patch.libraryPersonality)draft.presetChosen=true;
    if (patch.preset) draft.presetChosen = true;
    if((patch.role||patch.department!==undefined)&&!patch.libraryPersonality)draft.libraryPersonality=undefined;
    if (!draft.presetChosen && (patch.role || patch.department !== undefined)) draft.preset = suggestedPreset(draft.role, draft.department);
    this.#publish({ draft: Object.freeze(draft), phase: 'editing', notice: undefined });
  }
  setTrait(name: TraitName, value: number | undefined) {
    if (!this.#state.owner || this.#state.agent || this.#busy() || !allTraits.includes(name)) return;
    if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 100)) return;
    const traits = { ...this.#state.draft.traits }; if (value === undefined) delete traits[name]; else traits[name] = value;
    this.#publish({ draft: Object.freeze({ ...this.#state.draft, traits: Object.freeze(traits) }) });
  }
  go(step: 'role' | 'persona') {
    if (!this.#state.owner || this.#state.agent || this.#busy()) return;
    if (step === 'persona') {
      const name = normalizedName(this.#state.draft.name), dep = normalizedDepartment(this.#state.draft.department);
      if (name && !displayName(name)) return this.#publish({ notice: 'Name: up to 60 characters, no hidden characters.' });
      if (dep && !validDepartment(dep)) return this.#publish({ notice: 'Department: up to 64 letters, numbers, spaces, - or _.' });
    }
    this.#publish({ step, notice: undefined });
  }
  next() { if (this.#state.step === 'memory' && !this.#busy()) this.#publish({ step: 'permissions', notice: undefined }); }
  back() { if (this.#state.step === 'permissions' && !this.#busy()) this.#publish({ step: 'memory', notice: undefined }); }
  toggle(tool: string) {
    const s = this.#state;
    if (!s.owner || !s.agent || this.#busy() || s.phase === 'done' || s.phase === 'unknown') return;
    const t = s.tools.find(x => x.name === tool); if (!t) return;
    const on = s.selected.includes(tool);
    if (!on && !t.allowedByServer) return;
    const selected = on ? s.selected.filter(x => x !== tool) : [...s.selected, tool];
    if (selected.length > MAX_GRANTS) return;
    this.#publish({ selected: Object.freeze(selected), phase: 'editing' });
  }

  /** Memory scope: read / write per drawer kind (write needs read), and team-shared memories. */
  setMemory(kind: DrawerKind, patch: { read?: boolean; write?: boolean }) {
    const s = this.#state; const p = s.permissions;
    if (!s.owner || !p || this.#busy() || s.phase === 'done' || s.phase === 'unknown') return;
    let read = [...p.memoryRead]; let write = [...p.memoryWrite];
    if (patch.read === false) { read = read.filter(k => k !== kind); write = write.filter(k => k !== kind); }
    if (patch.read === true && !read.includes(kind)) read.push(kind);
    if (patch.write === false) write = write.filter(k => k !== kind);
    if (patch.write === true && read.includes(kind) && !write.includes(kind)) write.push(kind);
    const order = (x: DrawerKind[]) => allDrawerKinds.filter(k => x.includes(k));
    this.#publish({ permissions: Object.freeze({ ...p, memoryRead: order(read), memoryWrite: order(write) }), phase: 'editing' });
  }
  setShared(on: boolean) {
    const s = this.#state; const p = s.permissions;
    if (!s.owner || !p || this.#busy() || s.phase === 'done' || s.phase === 'unknown') return;
    this.#publish({ permissions: Object.freeze({ ...p, sharedMemory: on }), phase: 'editing' });
  }
  setMode(category: PermissionCategory, mode: PermissionMode) {
    const s = this.#state; const p = s.permissions;
    if (!s.owner || !p || this.#busy() || s.phase === 'done' || s.phase === 'unknown' || !allCategories.includes(category)) return;
    const modes = Object.freeze({ ...p.modes, [category]: mode });
    const stillRisky = allCategories.some(c => isRisky(c) && modes[c] === 'allow');
    this.#publish({ permissions: Object.freeze({ ...p, modes }), confirmRisky: stillRisky && s.confirmRisky, phase: 'editing' });
  }
  setConfirmRisky(on: boolean) { if (this.#state.permissions && !this.#busy()) this.#publish({ confirmRisky: on }); }
  /** Categories set to Allow that run without approval and need the owner's confirmation. */
  riskyAllowed(): PermissionCategory[] { const p = this.#state.permissions; return p ? allCategories.filter(c => isRisky(c) && p.modes[c] === 'allow') : []; }

  /** One deliberate create; an unknown outcome is never retried automatically. */
  async create() {
    const s = this.#state;
    if (!s.owner || s.agent || this.#busy() || s.phase === 'unknown' || this.#disposed) return;
    const body = createBody(s.draft);
    if (!body) return this.#publish({ notice: 'Check the name and department, then try again.' });
    const ticket = this.#begin('creating');
    try {
      const r = await this.client.request({ method: 'POST', path: '/api/agents', body }, this.#abort!.signal);
      if (ticket !== this.#ticket) return;
      if (this.#denied(r.status, r.body)) return;
      const b = r.body as { agent?: { id: string; name?: string; version: number }; code?: string } | null;
      if (r.status === 201 && b?.agent) {
        this.#publish({ agent: Object.freeze({ ...b.agent }), step: 'memory', phase: 'editing', notice: undefined });
        return this.#loadTools(b.agent.id);
      }
      const notice = b?.code === 'name_taken' ? 'That name is already used in your company (names are never reused). Pick another or leave it empty.'
        : b?.code === 'invalid_role' ? 'The role or department was refused.' : b?.code === 'invalid_personality' ? 'The persona was refused.' : 'The agent was not created.';
      this.#publish({ phase: 'error', step: b?.code === 'invalid_personality' ? 'persona' : 'role', notice });
    } catch (error) {
      if (ticket !== this.#ticket) return;
      if (error instanceof SessionFailure && error.code === 'blocked') return this.#publish({ phase: 'editing', notice: 'Nothing was sent. Check the form.' });
      this.#publish({ phase: 'unknown', notice: 'The result is unknown: the agent may or may not exist. Open Your team and check before hiring again.' });
    }
  }

  async #loadTools(agentId: string) {
    const ticket = this.#begin('loading');
    try {
      const r = await this.client.request({ method: 'GET', path: `/api/agents/${agentId}/tool-grants` }, this.#abort!.signal);
      if (ticket !== this.#ticket) return;
      if (this.#denied(r.status, r.body)) return;
      const b = r.body;
      if (r.status !== 200 || !record(b) || !Array.isArray(b.available) || !Array.isArray(b.grants)) throw Error();
      const grants = b.grants as { tool: string; scoped: boolean }[];
      const tools = Object.freeze((b.available as Tool[]).map(t => Object.freeze({ ...t })));
      const scoped = grants.some(g => g.scoped);
      const pr = await this.client.request({ method: 'GET', path: `/api/agents/${agentId}/permissions` }, this.#abort!.signal);
      if (ticket !== this.#ticket) return;
      if (this.#denied(pr.status, pr.body)) return;
      if (pr.status !== 200 || !record(pr.body)) throw Error();
      const permissions = Object.freeze({ ...(pr.body as Permissions) });
      this.#publish({ tools, selected: Object.freeze(grants.map(g => g.tool)), grantsVersion: b.version as number, scoped, permissions, confirmRisky: false, phase: 'editing',
        notice: scoped ? 'Some tools have limits (for example only certain chats). Saving keeps those limits.' : undefined });
    } catch {
      if (ticket === this.#ticket) this.#publish({ phase: 'error', notice: 'The agent was hired, but its permissions could not be read. Try again.' });
    }
  }
  async reloadTools() { const a = this.#state.agent; if (a && this.#state.owner && !this.#busy()) await this.#loadTools(a.id); }

  async save() {
    const s = this.#state;
    if (!s.owner || !s.agent || this.#busy() || s.grantsVersion === undefined || s.phase === 'unknown' || s.phase === 'done') return;
    if (this.riskyAllowed().length && !s.confirmRisky) return this.#publish({ notice: 'Confirm that the risky tools may run without asking you, or set them to Ask me first.' });
    const ticket = this.#begin('saving');
    const path = `/api/agents/${s.agent.id}/tool-grants`;
    try {
      const r = await this.client.request({ method: 'PUT', path, body: { grants: [...s.selected], expectedVersion: s.grantsVersion, keepScopes: true } }, this.#abort!.signal);
      if (ticket !== this.#ticket) return;
      if (this.#denied(r.status, r.body)) return;
      const b = r.body as { version?: number; code?: string } | null;
      if (r.status === 409 && b?.code === 'version_conflict') {
        await this.#loadTools(s.agent.id);
        return this.#publish({ notice: 'Permissions changed elsewhere. The latest ones are shown; review and save again.' });
      }
      if (r.status !== 200 || !b?.version) return this.#publish({ phase: 'error', notice: 'Permissions were not saved.' });
      this.#publish({ grantsVersion: b.version });
      // CORE-PERMS-01: then the memory scope and the off / ask / allow modes.
      const p = s.permissions;
      if (p) {
        const body: PermissionsBody = { memoryRead: [...p.memoryRead], memoryWrite: [...p.memoryWrite], sharedMemory: p.sharedMemory, modes: { ...p.modes }, expectedVersion: p.version,
          ...(this.riskyAllowed().length ? { confirmRisky: s.confirmRisky } : {}) };
        const pr = await this.client.request({ method: 'PUT', path: `/api/agents/${s.agent.id}/permissions`, body }, this.#abort!.signal);
        if (ticket !== this.#ticket) return;
        if (this.#denied(pr.status, pr.body)) return;
        const pb = pr.body as (Permissions & { code?: string }) | null;
        if (pr.status === 409 && pb?.code === 'version_conflict') {
          await this.#loadTools(s.agent.id);
          return this.#publish({ notice: 'Permissions changed elsewhere. The latest ones are shown; review and save again.' });
        }
        if (pr.status !== 200 || !pb || typeof pb.version !== 'number') {
          return this.#publish({ phase: 'error', notice: pb?.code === 'risky_not_confirmed' ? 'Confirm that the risky tools may run without asking you, or set them to Ask me first.' : 'The tools were saved, but memory and approval settings were not. Try saving again.' });
        }
        this.#publish({ permissions: Object.freeze({ ...pb }) });
      }
      this.#publish({ phase: 'done', step: 'done', notice: undefined });
    } catch (error) {
      if (ticket !== this.#ticket) return;
      if (error instanceof SessionFailure && error.code === 'blocked') return this.#publish({ phase: 'editing', notice: 'Nothing was sent.' });
      this.#publish({ phase: 'unknown', notice: 'The save result is unknown. Reload the permissions to see what is stored.' });
    }
  }
  async reconcile() {
    if (this.#state.phase !== 'unknown' || !this.#state.agent) return;
    await this.#loadTools(this.#state.agent.id);
  }
}
