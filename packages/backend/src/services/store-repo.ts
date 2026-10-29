/**
 * The Girru Store repository as a catalogue source (APPS-06 step 1, D-STORE-REPO).
 *
 * github.com/Dpro-at/girru-store keeps one folder per item and an index.json built
 * from them. Girru reads that index when the Store opens (at most every few hours),
 * keeps the last good copy in the data folder, and shows it when there is no
 * internet ("showing the store from <date>"). Reading never installs anything.
 * Everything goes through parseStoreIndex, so the repository cannot widen what the
 * Store shows. Items are free only; the repository's `pricing` field is ignored
 * until paid apps open (STORE-PAID-01).
 */
import fs from 'node:fs';
import path from 'node:path';
import { dataPath } from '../config/data-root.js';
import { parseStoreIndex, type StoreIndex } from './store-index.js';

export const STORE_INDEX_URL = 'https://raw.githubusercontent.com/Dpro-at/girru-store/main/index.json';
const MAX_AGE_MS = 6 * 3_600_000;
const MAX_BYTES = 2 * 1024 * 1024;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface RepoRead { index: StoreIndex | null; asOf: string | null; fresh: boolean }
type Fetch = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** The repository's index in Girru's catalogue shape: ids get the "girru:" prefix, sources are Girru's. */
export function fromRepo(raw: unknown): StoreIndex {
  const r = raw as { schema?: unknown; featured?: unknown; collections?: unknown; items?: unknown };
  if (!r || typeof r !== 'object' || !Array.isArray(r.items) || !Array.isArray(r.collections)) throw new TypeError('store index');
  const id = (x: unknown) => { if (typeof x !== 'string' || !ID.test(x)) throw new TypeError('store index'); return `girru:${x}`; };
  return parseStoreIndex({
    schema: r.schema,
    featured: typeof r.featured === 'string' && ID.test(r.featured) ? `girru:${r.featured}` : null,
    collections: (r.collections as Array<Record<string, unknown>>).map((c) => ({ id: c?.id, title: c?.title, items: Array.isArray(c?.items) ? (c.items as unknown[]).filter((x) => typeof x === 'string' && ID.test(x)).map(id) : [] })),
    items: (r.items as Array<Record<string, unknown>>).map((x) => {
      if (!x || typeof x !== 'object') throw new TypeError('store index');
      const { pricing: _pricing, ...rest } = x;
      return { ...rest, id: id(x.id), source: 'girru' };
    }),
  });
}

const cacheFile = () => dataPath('store', 'girru-store.json');
function readCache(): { fetchedAt: string; index: StoreIndex } | null {
  try {
    const c = JSON.parse(fs.readFileSync(cacheFile(), 'utf8')) as { fetchedAt?: unknown; raw?: unknown };
    if (typeof c.fetchedAt !== 'string' || Number.isNaN(Date.parse(c.fetchedAt))) return null;
    return { fetchedAt: c.fetchedAt, index: fromRepo(c.raw) };
  } catch { return null; }
}
function writeCache(fetchedAt: string, raw: unknown) {
  try {
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true, mode: 0o700 });
    const tmp = `${cacheFile()}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ fetchedAt, raw }), { mode: 0o600 });
    fs.renameSync(tmp, cacheFile());
  } catch { /* the Store still shows what it read now */ }
}

/**
 * The repository's index: the cached copy while it is young, else a fresh read;
 * when the read fails, the last good copy with its date (or nothing the first time).
 * GIRRU_STORE_REPO=off leaves the repository out (tests, closed networks).
 */
export async function readStoreRepo(options: { now?: Date; fetch?: Fetch } = {}): Promise<RepoRead> {
  if ((process.env.GIRRU_STORE_REPO ?? '').trim().toLowerCase() === 'off') return { index: null, asOf: null, fresh: true };
  const now = options.now ?? new Date();
  const cached = readCache();
  if (cached && now.getTime() - Date.parse(cached.fetchedAt) < MAX_AGE_MS) return { index: cached.index, asOf: cached.fetchedAt, fresh: true };
  try {
    const get = options.fetch ?? (globalThis.fetch as unknown as Fetch);
    const res = await get(STORE_INDEX_URL, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json', 'User-Agent': 'Girru' } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new Error('too large');
    const raw = JSON.parse(text) as unknown;
    const index = fromRepo(raw);
    const fetchedAt = now.toISOString();
    writeCache(fetchedAt, raw);
    return { index, asOf: fetchedAt, fresh: true };
  } catch {
    return cached ? { index: cached.index, asOf: cached.fetchedAt, fresh: false } : { index: null, asOf: null, fresh: false };
  }
}
