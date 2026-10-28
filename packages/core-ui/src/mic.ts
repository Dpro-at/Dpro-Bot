import type { SessionClient } from './session';
import { MAX_AUDIO_CHARS, TRANSCRIBE_PATH } from './conversation-contract.js';

export type MicPhase = 'unknown' | 'off' | 'idle' | 'recording' | 'transcribing';
export type MicState = Readonly<{ phase: MicPhase; seconds: number; error?: string; missing?: readonly string[] }>;
/** Recording stops by itself after this long (keeps clips inside the size cap). */
export const MAX_RECORD_SECONDS = 180;

const record = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
/** Browser hooks (tests pass fakes). */
export type MicDevice = {
  open(): Promise<{ stop(): Promise<Blob> }>;
};

/** The browser microphone: MediaRecorder on a single audio track. */
export const browserMic: MicDevice = {
  async open() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32_000 });
    const parts: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.start(1000);
    return {
      stop: () => new Promise<Blob>(resolve => {
        rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); resolve(new Blob(parts, { type: rec.mimeType || type || 'audio/webm' })); };
        if (rec.state === 'inactive') rec.onstop(new Event('stop')); else rec.stop();
      }),
    };
  },
};

async function base64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Dictation for the chat composer: record, then turn the clip into text on
 * this computer (owner only). The text goes to `onText`; nothing is sent to
 * the agent until the owner presses send.
 */
export class MicController {
  #state: MicState = Object.freeze({ phase: 'unknown', seconds: 0 });
  #listeners = new Set<() => void>();
  #rec: { stop(): Promise<Blob> } | null = null;
  #tick: ReturnType<typeof setInterval> | undefined;
  #disposed = false;
  #opening = false; #held = false; #letGo = false;
  constructor(private readonly client: SessionClient, private readonly onText: (text: string) => void, private readonly device: MicDevice = browserMic) {}
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  private publish(p: Partial<MicState>) { if (this.#disposed) return; this.#state = Object.freeze({ ...this.#state, ...p }); this.#listeners.forEach(fn => fn()); }

  /** Asks the server whether speech-to-text is set up (owner only). */
  async check() {
    if (this.client.getSnapshot().user?.role !== 'owner') { this.publish({ phase: 'off' }); return; }
    try {
      const r = await this.client.request({ method: 'GET', path: TRANSCRIBE_PATH } as never);
      const ok = r.status === 200 && record(r.body) && r.body.available === true;
      this.publish({ phase: ok ? 'idle' : 'off', missing: record(r.body) && Array.isArray(r.body.missing) ? r.body.missing as string[] : [] });
    } catch { this.publish({ phase: 'off' }); }
  }

  async start() {
    if (this.#state.phase !== 'idle' || this.#opening) return;
    this.#opening = true; this.#letGo = false;
    let rec: { stop(): Promise<Blob> };
    try { rec = await this.device.open(); }
    catch { this.#opening = false; this.#held = false; this.publish({ error: 'The microphone is blocked. Allow it for this page and try again.' }); return; }
    this.#opening = false;
    // Let go (or closed) before the microphone opened: a short tap records nothing.
    if (this.#letGo || this.#disposed) { this.#letGo = false; await rec.stop().catch(() => null); return; }
    this.#rec = rec;
    this.publish({ phase: 'recording', seconds: 0, error: undefined });
    this.#tick = setInterval(() => {
      const seconds = this.#state.seconds + 1;
      this.publish({ seconds });
      if (seconds >= MAX_RECORD_SECONDS) void this.stop();
    }, 1000);
  }

  /** ⌥Space push-to-talk: recording runs while the keys are held (only when nothing else is recording). */
  hold() { if (this.#state.phase !== 'idle' || this.#opening || this.#held) return; this.#held = true; void this.start(); }
  /** The keys were let go: transcribe what was said; before the microphone opened, nothing is recorded. */
  release() { if (!this.#held) return; this.#held = false; if (this.#opening) this.#letGo = true; else void this.stop(); }

  /** Stops recording and transcribes the clip. */
  async stop() {
    if (this.#state.phase !== 'recording' || !this.#rec) return;
    this.#held = false;
    clearInterval(this.#tick);
    const rec = this.#rec; this.#rec = null;
    this.publish({ phase: 'transcribing' });
    try {
      const audio = await base64(await rec.stop());
      if (!audio) { this.publish({ phase: 'idle' }); return; }
      if (audio.length > MAX_AUDIO_CHARS) { this.publish({ phase: 'idle', error: 'The recording is too long.' }); return; }
      const r = await this.client.request({ method: 'POST', path: TRANSCRIBE_PATH, body: { audio } } as never);
      if (r.status === 200 && record(r.body) && typeof r.body.text === 'string') {
        this.publish({ phase: 'idle' });
        if (r.body.text.trim()) this.onText(r.body.text.trim()); else this.publish({ error: 'No speech was heard.' });
        return;
      }
      const code = record(r.body) ? r.body.code : undefined;
      this.publish({ phase: code === 'stt_unavailable' ? 'off' : 'idle', error: code === 'stt_busy' ? 'Still working on the last recording. Try again in a moment.' : 'The recording could not be turned into text.' });
    } catch { this.publish({ phase: 'idle', error: 'The recording could not be turned into text (no connection).' }); }
  }

  /** Drops the recording without transcribing it. */
  async cancel() {
    clearInterval(this.#tick); this.#held = false;
    if (this.#opening) this.#letGo = true;
    const rec = this.#rec; this.#rec = null;
    if (rec) await rec.stop().catch(() => null);
    if (this.#state.phase === 'recording') this.publish({ phase: 'idle', seconds: 0 });
  }
  dispose() { void this.cancel(); this.#disposed = true; this.#listeners.clear(); }
}
