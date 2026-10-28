/**
 * Images in a chat (CHAT-GAPS-01, Mohamed 2026-10-28): kept with the conversation in
 * Girru's own data folder, at most 5 MB each and 4 per message, PNG, JPEG, GIF or WebP
 * only (checked by their first bytes, never by the name). They go to a model that can
 * see; they are removed with the chat. Nothing here reads a path given by a caller.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataPath } from '../config/data-root.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_MESSAGE = 4;
export type ImageType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
export type ChatImage = { id: string; type: ImageType; size: number; name: string };
export class ChatImageError extends Error {}

const ID = /^[a-f0-9]{32}$/;
const CHAT = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/;
const EXT: Record<ImageType, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

/** The image type from its first bytes, or null. */
export function sniffImage(b: Buffer): ImageType | null {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && (b.subarray(0, 6).toString('latin1') === 'GIF87a' || b.subarray(0, 6).toString('latin1') === 'GIF89a')) return 'image/gif';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

const folder = (conversationId: string) => {
  if (!CHAT.test(conversationId)) throw new ChatImageError('bad chat');
  return path.join(dataPath('chat-images'), conversationId);
};
const cleanName = (name: unknown) => (typeof name === 'string' ? name.replace(/[\u0000-\u001f\\/]/g, ' ').trim().slice(0, 120) : '') || 'image';

/** Saves one image of a chat (the caller checked the chat is the owner's). */
export function saveChatImage(conversationId: string, base64: unknown, name?: unknown): ChatImage {
  if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new ChatImageError('An image can be up to 5 MB.');
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new ChatImageError('An image can be up to 5 MB.');
  const type = sniffImage(bytes);
  if (!type) throw new ChatImageError('Only PNG, JPEG, GIF and WebP images can be attached.');
  const id = randomUUID().replace(/-/g, '');
  const dir = folder(conversationId);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(path.join(dir, `${id}.${EXT[type]}`), bytes, { mode: 0o600, flag: 'wx' });
  writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ type, size: bytes.length, name: cleanName(name) }), { mode: 0o600, flag: 'wx' });
  return { id, type, size: bytes.length, name: cleanName(name) };
}

/** One saved image of a chat with its bytes, or null. */
export function readChatImage(conversationId: string, id: unknown): (ChatImage & { bytes: Buffer; file: string }) | null {
  if (typeof id !== 'string' || !ID.test(id)) return null;
  try {
    const dir = folder(conversationId);
    const meta = JSON.parse(readFileSync(path.join(dir, `${id}.json`), 'utf8')) as { type: ImageType; size: number; name: string };
    if (!EXT[meta.type]) return null;
    const file = path.join(dir, `${id}.${EXT[meta.type]}`);
    const bytes = readFileSync(file);
    if (sniffImage(bytes) !== meta.type) return null;
    return { id, type: meta.type, size: bytes.length, name: cleanName(meta.name), bytes, file };
  } catch { return null; }
}

/** Removes every image of a chat (when the chat is deleted). */
export function deleteChatImages(conversationId: string) {
  try { const dir = folder(conversationId); if (existsSync(dir)) rmSync(dir, { recursive: true, force: true }); } catch { /* nothing to remove */ }
}
