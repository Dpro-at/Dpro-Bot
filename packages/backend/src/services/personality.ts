/**
 * Agent personality schema and behaviour mapping (CORE-01, D-PERSONALITY).
 *
 * Pure module: no database, no I/O. Traits are 0-100 sliders; presets are
 * starting points. traitsToBehavior() turns traits + dialect into concrete
 * chat parameters (temperature, max tokens) and a generated prompt block that
 * shapes answer length, verification, self-review, retries, exploration,
 * tone and when to ask the owner before continuing.
 *
 * SAFETY: personality only changes prompting and confirmation behaviour.
 * It never grants tools, permissions, scopes or approvals, and it can never
 * skip an approval the server requires (tools/grants.ts, tools/approvals.ts
 * decide those, independently of anything here).
 */

export const TRAIT_NAMES = [
  'doubt',
  'caution',
  'creativity',
  'thoroughness',
  'independence',
  'verbosity',
  'warmth',
  'curiosity',
  'persistence',
] as const;

export type TraitName = (typeof TRAIT_NAMES)[number];
export type Traits = Record<TraitName, number>;

/** Reply language/dialect codes: the 12 D-LANG languages plus Iraqi Arabic. */
export const DIALECTS = ['ar-IQ', 'ar', 'en', 'de', 'fr', 'es', 'zh', 'ja', 'ko', 'pt-BR', 'ru', 'tr', 'hi'] as const;
export type Dialect = (typeof DIALECTS)[number];

const DIALECT_LABEL: Record<Dialect, string> = {
  'ar-IQ': 'Arabic, Iraqi dialect',
  ar: 'Arabic (Modern Standard)',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  'pt-BR': 'Portuguese (Brazil)',
  ru: 'Russian',
  tr: 'Turkish',
  hi: 'Hindi',
};

/** Neutral starting point for an agent that has no stored personality yet. */
export const DEFAULT_TRAITS: Readonly<Traits> = Object.freeze({
  doubt: 50, caution: 50, creativity: 50, thoroughness: 50, independence: 50,
  verbosity: 50, warmth: 50, curiosity: 50, persistence: 50,
});
export const DEFAULT_DIALECT: Dialect = 'en';

/** Main agent v1 (CORE-01). Same values as migration 056 seeds. */
export const MAIN_AGENT_V1: Readonly<{ traits: Traits; dialect: Dialect }> = Object.freeze({
  traits: Object.freeze({
    doubt: 60, caution: 65, creativity: 45, thoroughness: 70, independence: 45,
    verbosity: 35, warmth: 70, curiosity: 55, persistence: 65,
  }) as Traits,
  dialect: 'ar-IQ',
});

export const PRESETS: Readonly<Record<string, { label: string; traits: Traits }>> = Object.freeze({
  'balanced-assistant': {
    label: 'Balanced assistant',
    traits: { doubt: 50, caution: 55, creativity: 50, thoroughness: 60, independence: 50, verbosity: 45, warmth: 65, curiosity: 50, persistence: 60 },
  },
  'careful-auditor': {
    label: 'Careful auditor',
    traits: { doubt: 85, caution: 85, creativity: 25, thoroughness: 90, independence: 30, verbosity: 55, warmth: 40, curiosity: 45, persistence: 70 },
  },
  'bold-creative': {
    label: 'Bold creative',
    traits: { doubt: 35, caution: 35, creativity: 90, thoroughness: 45, independence: 70, verbosity: 60, warmth: 70, curiosity: 85, persistence: 55 },
  },
  'precise-developer': {
    label: 'Precise developer',
    traits: { doubt: 70, caution: 60, creativity: 40, thoroughness: 85, independence: 60, verbosity: 30, warmth: 45, curiosity: 55, persistence: 80 },
  },
  // MEM-03: the independent evaluator questions everything and checks thoroughly.
  'strict-evaluator': {
    label: 'Strict evaluator',
    traits: { doubt: 90, caution: 75, creativity: 15, thoroughness: 90, independence: 40, verbosity: 40, warmth: 45, curiosity: 50, persistence: 60 },
  },
});

export type PresetId = keyof typeof PRESETS & string;

export function isPresetId(v: unknown): v is string {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, v);
}

// ---------------------------------------------------------------------------
// Role defaults (MEM-03)
// ---------------------------------------------------------------------------

/** Organisational role of an agent (stored on agents_config.role). */
export const AGENT_ROLES = ['main', 'manager', 'specialist', 'evaluator'] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export function isAgentRole(v: unknown): v is AgentRole {
  return typeof v === 'string' && (AGENT_ROLES as readonly string[]).includes(v);
}

/** Lowercase, trimmed, inner whitespace collapsed; '' -> null. Max 64 characters. */
export function normalizeDepartment(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new PersonalityInputError('department must be a string');
  const out = v.trim().toLowerCase().replace(/\s+/g, ' ');
  if (out.length > 64) throw new PersonalityInputError('department must be at most 64 characters');
  return out || null;
}

/** Specialist departments with their own preset; anything else is balanced-assistant. */
const DEPARTMENT_PRESET: Readonly<Record<string, PresetId>> = Object.freeze({
  development: 'precise-developer',
  dev: 'precise-developer',
  engineering: 'precise-developer',
  software: 'precise-developer',
  marketing: 'bold-creative',
  accounting: 'careful-auditor',
  finance: 'careful-auditor',
  security: 'careful-auditor',
});

/**
 * Default preset for an agent's role (MEM-03, pure):
 *  - manager (any department)  -> balanced-assistant
 *  - specialist                -> by department: development precise-developer,
 *                                 marketing bold-creative, accounting/finance and
 *                                 security careful-auditor, other balanced-assistant
 *  - evaluator                 -> strict-evaluator
 *  - main                      -> null (the main agent uses MAIN_AGENT_V1, not a preset)
 *  - no or unknown role        -> balanced-assistant
 */
export function defaultPresetForRole(input: { role?: unknown; department?: unknown }): PresetId | null {
  const role = input.role;
  if (role === 'main') return null;
  if (role === 'evaluator') return 'strict-evaluator';
  if (role === 'specialist') {
    let dept: string | null = null;
    try { dept = normalizeDepartment(input.department); } catch { dept = null; }
    if (dept && Object.prototype.hasOwnProperty.call(DEPARTMENT_PRESET, dept)) return DEPARTMENT_PRESET[dept];
    return 'balanced-assistant';
  }
  return 'balanced-assistant';
}

/** Version 1 for a new agent of this role: the preset's traits (main: MAIN_AGENT_V1). */
export function defaultPersonalityForRole(input: { role?: unknown; department?: unknown }): { preset: PresetId | null; traits: Traits; dialect: Dialect } {
  const preset = defaultPresetForRole(input);
  if (preset === null) return { preset: null, traits: { ...MAIN_AGENT_V1.traits }, dialect: MAIN_AGENT_V1.dialect };
  return { preset, traits: { ...PRESETS[preset].traits }, dialect: DEFAULT_DIALECT };
}

/** Thrown for invalid input; the message is safe to return to the client. */
export class PersonalityInputError extends Error {}

export function isTraitName(v: unknown): v is TraitName {
  return typeof v === 'string' && (TRAIT_NAMES as readonly string[]).includes(v);
}

export function isDialect(v: unknown): v is Dialect {
  return typeof v === 'string' && (DIALECTS as readonly string[]).includes(v);
}

function isTraitValue(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100;
}

/** A complete, valid traits object, or a PersonalityInputError. */
export function validateTraits(value: unknown): Traits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PersonalityInputError('traits must be an object');
  }
  const obj = value as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (!isTraitName(k)) throw new PersonalityInputError(`Unknown trait: ${k.slice(0, 40)}`);
  }
  const out = {} as Traits;
  for (const name of TRAIT_NAMES) {
    if (!(name in obj)) throw new PersonalityInputError(`Missing trait: ${name}`);
    if (!isTraitValue(obj[name])) throw new PersonalityInputError(`Trait ${name} must be an integer from 0 to 100`);
    out[name] = obj[name] as number;
  }
  return out;
}

/** Partial update: only known traits, each an integer 0-100. */
export function validateTraitPatch(value: unknown): Partial<Traits> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PersonalityInputError('traits must be an object');
  }
  const out: Partial<Traits> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!isTraitName(k)) throw new PersonalityInputError(`Unknown trait: ${k.slice(0, 40)}`);
    if (!isTraitValue(v)) throw new PersonalityInputError(`Trait ${k} must be an integer from 0 to 100`);
    out[k] = v;
  }
  return out;
}

export function validateLockedTraits(value: unknown): TraitName[] {
  if (!Array.isArray(value)) throw new PersonalityInputError('lockedTraits must be an array of trait names');
  const out: TraitName[] = [];
  for (const v of value) {
    if (!isTraitName(v)) throw new PersonalityInputError('lockedTraits must be an array of trait names');
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * Slow drift from verified outcomes (built on Evolution later): each trait
 * moves at most `maxStep` points per version and locked traits never move.
 */
export function boundedDrift(current: Traits, proposed: Partial<Traits>, lockedTraits: readonly TraitName[], maxStep = 5): Traits {
  const out = { ...current };
  for (const name of TRAIT_NAMES) {
    const want = proposed[name];
    if (want === undefined || lockedTraits.includes(name)) continue;
    const delta = Math.max(-maxStep, Math.min(maxStep, Math.round(want) - current[name]));
    out[name] = Math.max(0, Math.min(100, current[name] + delta));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Behaviour mapping
// ---------------------------------------------------------------------------

export type Band = 'low' | 'mid' | 'high';

/** 0-33 low, 34-66 mid, 67-100 high. */
export function band(value: number): Band {
  if (value <= 33) return 'low';
  if (value <= 66) return 'mid';
  return 'high';
}

export interface Behavior {
  /** Sampling temperature sent to the model (creativity). */
  temperature: number;
  /** Max output tokens sent to the model (verbosity). */
  maxTokens: number;
  responseLength: 'brief' | 'balanced' | 'detailed';
  /** Independent sources/checks before stating a fact or acting on a claim (doubt). */
  verificationChecks: number;
  /** Self-review passes before delivering (thoroughness). */
  selfReviewPasses: number;
  /**
   * When to stop and ask the owner before continuing (caution vs independence):
   *  'ambiguous' - whenever the request is ambiguous or any step is irreversible
   *  'significant' - for significant or irreversible steps only
   *  'irreversible' - only for irreversible steps
   * Prompting only: server-side approvals and grants still apply in full.
   */
  confirmBefore: 'ambiguous' | 'significant' | 'irreversible';
  /** Attempts with a different approach before escalating (persistence). */
  retryBudget: number;
  exploration: 'on-scope' | 'adjacent' | 'explore';
  tone: 'formal' | 'neutral' | 'warm';
  dialect: Dialect;
  /** Generated system-prompt section (from numbers only, never free text). */
  promptBlock: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Pure and deterministic: the same traits + dialect always give the same behaviour. */
export function traitsToBehavior(traits: Traits, dialect: Dialect): Behavior {
  const t = validateTraits(traits);
  const d: Dialect = isDialect(dialect) ? dialect : DEFAULT_DIALECT;

  const temperature = round2(0.1 + (t.creativity / 100) * 0.9); // 0.10 .. 1.00
  const maxTokens = Math.round((512 + (t.verbosity / 100) * 3584) / 64) * 64; // 512 .. 4096
  const responseLength = ({ low: 'brief', mid: 'balanced', high: 'detailed' } as const)[band(t.verbosity)];
  const verificationChecks = 1 + Math.floor(t.doubt / 25); // 1 .. 5
  const selfReviewPasses = Math.min(3, Math.floor(t.thoroughness / 30)); // 0 .. 3
  const askScore = t.caution - t.independence; // -100 .. 100
  const confirmBefore = askScore > 20 ? 'ambiguous' : askScore < -20 ? 'irreversible' : 'significant';
  const retryBudget = 1 + Math.floor(t.persistence / 25); // 1 .. 5
  const exploration = ({ low: 'on-scope', mid: 'adjacent', high: 'explore' } as const)[band(t.curiosity)];
  const tone = ({ low: 'formal', mid: 'neutral', high: 'warm' } as const)[band(t.warmth)];

  const lines = [
    '## Working style (personality settings)',
    'These settings shape how you answer. They never give you extra tools or permissions, and they never replace an approval the system asks for.',
    `- Language: answer in ${DIALECT_LABEL[d]} by default; if the user writes in another language, answer in that language.`,
    {
      brief: '- Length: keep answers short and to the point; expand only when asked.',
      balanced: '- Length: give complete but compact answers.',
      detailed: '- Length: give detailed answers with explanation and examples where useful.',
    }[responseLength],
    `- Verification: check at least ${verificationChecks} independent source${verificationChecks === 1 ? '' : 's'} or checks before you state a fact as certain or act on a claim; say clearly when something is unverified.`,
    selfReviewPasses === 0
      ? '- Self-review: a quick read before sending is enough.'
      : `- Self-review: review your answer ${selfReviewPasses} time${selfReviewPasses === 1 ? '' : 's'} for errors and gaps before sending.`,
    {
      ambiguous: '- Asking first: when the request is ambiguous or a step cannot be undone, stop and ask the owner before continuing.',
      significant: '- Asking first: decide small steps yourself; ask the owner before significant or irreversible steps.',
      irreversible: '- Asking first: work independently; ask the owner before any step that cannot be undone.',
    }[confirmBefore],
    `- Persistence: if an approach fails, try up to ${retryBudget} different approach${retryBudget === 1 ? '' : 'es'} before reporting the problem.`,
    {
      'on-scope': '- Scope: stay strictly on what was asked.',
      adjacent: '- Scope: mention closely related points briefly when they help.',
      explore: '- Scope: suggest useful ideas beyond the request, clearly marked as optional.',
    }[exploration],
    {
      formal: '- Tone: formal and businesslike.',
      neutral: '- Tone: friendly and professional.',
      warm: '- Tone: warm and personal, while staying professional.',
    }[tone],
    {
      low: '- Approach: prefer proven, conventional solutions.',
      mid: '- Approach: balance proven solutions with new ideas.',
      high: '- Approach: look for creative, novel solutions and say when an idea is untested.',
    }[band(t.creativity)],
  ];

  return {
    temperature, maxTokens, responseLength, verificationChecks, selfReviewPasses,
    confirmBefore, retryBudget, exploration, tone, dialect: d,
    promptBlock: lines.join('\n'),
  };
}

// ---------------------------------------------------------------------------
// Readable export (PERSONALITY.md). The database is canonical.
// ---------------------------------------------------------------------------

export const EXPORT_BEGIN = '<!-- personality-settings:begin (generated from the database; edits here are ignored) -->';
export const EXPORT_END = '<!-- personality-settings:end -->';
const EXPORT_BLOCK = /\n*<!-- personality-settings:begin[^>]*-->[\s\S]*?<!-- personality-settings:end -->\n*/g;

export interface PersonalityExportInput {
  version: number;
  traits: Traits;
  preset: string | null;
  dialect: Dialect;
  locked: boolean;
  lockedTraits: readonly TraitName[];
}

export function renderPersonalityExport(p: PersonalityExportInput): string {
  const rows = TRAIT_NAMES.map((n) => `| ${n} | ${p.traits[n]}${p.lockedTraits.includes(n) ? ' (locked)' : ''} |`);
  return [
    EXPORT_BEGIN,
    `## Personality settings (version ${p.version})`,
    '',
    `- Preset: ${p.preset ?? 'custom'}`,
    `- Dialect: ${p.dialect}`,
    `- Locked: ${p.locked ? 'yes' : 'no'}`,
    '',
    '| Trait | Value (0-100) |',
    '|---|---|',
    ...rows,
    EXPORT_END,
  ].join('\n');
}

/** Remove the generated block (the chat prompt uses the database values instead). */
export function stripPersonalityExport(markdown: string): string {
  return markdown.replace(EXPORT_BLOCK, '\n\n').trim();
}

/** The generated block as it is in the file (markers included), or null. */
export function personalityExportBlock(markdown: string): string | null {
  const m = /<!-- personality-settings:begin[^>]*-->[\s\S]*?<!-- personality-settings:end -->/.exec(markdown);
  return m ? m[0] : null;
}

/** Replace (or append) the generated block, keeping the hand-written text. */
export function upsertPersonalityExport(markdown: string, block: string): string {
  const rest = stripPersonalityExport(markdown);
  return rest ? `${rest}\n\n${block}\n` : `${block}\n`;
}
