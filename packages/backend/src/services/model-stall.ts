/**
 * CHAT-BUILD-01: a local model (Ollama, LM Studio) that stops sending is
 * treated as hung instead of holding the chat forever. Loading a big model
 * may take minutes, so the first piece gets longer than the gaps after it.
 */
export const FIRST_CHUNK_MS = 300_000;
export const IDLE_CHUNK_MS = 120_000;

export interface StallGuard {
  /** The caller's signal plus the stall timer. */
  readonly signal: AbortSignal;
  /** A piece arrived: the next gap may be IDLE ms. */
  tick(): void;
  done(): void;
  readonly stalled: boolean;
}

export function stallGuard(parent: AbortSignal, ms: { first?: number; idle?: number } = {}): StallGuard {
  const own = new AbortController();
  let stalled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = (t: number) => { clearTimeout(timer); timer = setTimeout(() => { stalled = true; own.abort(); }, t); timer.unref?.(); };
  arm(ms.first ?? FIRST_CHUNK_MS);
  return {
    signal: AbortSignal.any([parent, own.signal]),
    tick: () => arm(ms.idle ?? IDLE_CHUNK_MS),
    done: () => clearTimeout(timer),
    get stalled() { return stalled; },
  };
}
