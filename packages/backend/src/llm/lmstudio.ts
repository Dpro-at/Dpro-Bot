/**
 * LM Studio as a local model provider (CHAT-PRO-02 G).
 *
 * LM Studio serves an OpenAI-compatible API on this computer. Girru talks to
 * it on the IPv4 loopback only: `LMSTUDIO_API_URL` is used when it is a
 * loopback http URL (the isolated launcher sets it), anything else is
 * ignored, so a model call can never leave the machine. Default
 * `http://127.0.0.1:1234/v1` (LM Studio's own default port).
 *
 * Nothing is configured by the owner: the model list asks the server what it
 * has; when LM Studio is not running its models simply are not listed, and a
 * turn that still names one gets a clear "not running" error.
 *
 * Chat model ids carry the prefix `lmstudio:` so the chat knows which local
 * server a picked model belongs to (`lmstudio:qwen/qwen3-8b`).
 */

export const DEFAULT_LMSTUDIO_API_URL = 'http://127.0.0.1:1234/v1';
export const LMSTUDIO_PREFIX = 'lmstudio:';

/** Model ids LM Studio may report (publisher/name, quantization tags). */
const LMSTUDIO_MODEL = /^[A-Za-z0-9][A-Za-z0-9_.:@\/-]{0,89}$/;

function loopbackHttp(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || u.username || u.password || u.search || u.hash) return null;
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

/** The OpenAI-compatible base URL (always http://127.0.0.1:<port>/…). */
export function lmStudioApiUrl(env: NodeJS.ProcessEnv = process.env): string {
  const set = (env.LMSTUDIO_API_URL ?? '').trim();
  return (set && loopbackHttp(set)) || DEFAULT_LMSTUDIO_API_URL;
}

/** "127.0.0.1:1234" for messages. */
export function lmStudioAddress(env: NodeJS.ProcessEnv = process.env): string {
  return new URL(lmStudioApiUrl(env)).host;
}

export const isLmStudioModelId = (id: string): boolean => id.startsWith(LMSTUDIO_PREFIX);

/** The model name LM Studio knows, from a chat model id ('' when it is not one). */
export function lmStudioModelName(id: string): string {
  if (!isLmStudioModelId(id)) return '';
  const name = id.slice(LMSTUDIO_PREFIX.length);
  return LMSTUDIO_MODEL.test(name) ? name : '';
}

/** Shown to the owner when a picked LM Studio model cannot be reached. */
export function lmStudioNotRunningMessage(env: NodeJS.ProcessEnv = process.env): string {
  return `LM Studio is not running on ${lmStudioAddress(env)}. Open LM Studio, load the model and start its local server, then send again.`;
}

export interface LmStudioModels {
  running: boolean;
  models: string[];
}

/**
 * The models LM Studio offers right now (GET /v1/models). Never throws:
 * not running, a refusal or a strange answer all mean "nothing listed".
 * Embedding models are left out (they cannot chat).
 */
export async function listLmStudioModels(opts: { fetchImpl?: typeof fetch; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}): Promise<LmStudioModels> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(`${lmStudioApiUrl(opts.env)}/models`, { signal: AbortSignal.timeout(opts.timeoutMs ?? 1500) });
    if (!res.ok) {
      try { await res.body?.cancel(); } catch { /* ignore */ }
      return { running: false, models: [] };
    }
    const data = await res.json() as { data?: unknown };
    const rows = Array.isArray(data?.data) ? data.data : [];
    const models = [...new Set(rows
      .map((m: any) => (m && typeof m.id === 'string' ? m.id : ''))
      .filter((id: string) => LMSTUDIO_MODEL.test(id) && !/(^|[\/_-])(text-)?embed(ding)?/i.test(id)))]
      .slice(0, 100) as string[];
    return { running: true, models };
  } catch {
    return { running: false, models: [] };
  }
}
