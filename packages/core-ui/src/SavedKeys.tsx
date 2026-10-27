// CHAT-SECRETS-01: the keys saved from the chat. A secret typed in a message is
// stored encrypted by the backend; here the owner sees which ones exist (never
// their values), deletes one, and can move secrets of older chats once.
import { useEffect, useState } from 'react';
import type { ChatSecret, CleanupReport } from './chat-secrets-contract.js';
import { cleanupSecrets, deleteSecret, listSecrets, secretLabel } from './chat-secrets';
import type { SessionClient } from './session';
import { UiIcon } from './ui-icons';

const when = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The chat chip opens it as a small panel; Settings › Saved keys shows it as a page (`page`). */
export function SavedKeys({ client, owner, highlight, onClose, page = false }: { client: SessionClient; owner: boolean; highlight?: string; onClose?: () => void; page?: boolean }) {
  const [keys, setKeys] = useState<ChatSecret[] | null | 'error'>(null);
  const [scan, setScan] = useState<CleanupReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const load = async () => setKeys((await listSecrets(client)) ?? 'error');
  useEffect(() => { void load(); }, [client]);
  const remove = async (k: ChatSecret) => {
    if (!window.confirm(`Delete this ${secretLabel(k.type)} from the key store? The chat keeps the reference, but the agent can no longer use it.`)) return;
    setNote((await deleteSecret(client, k.id)) ? 'Deleted from the key store.' : 'It could not be deleted. Try again.');
    await load();
  };
  const check = async () => { setBusy(true); setNote(null); const r = await cleanupSecrets(client, false); setBusy(false); setScan(r); if (!r) setNote('Older chats could not be checked. Try again.'); };
  const move = async () => {
    setBusy(true); const r = await cleanupSecrets(client, true); setBusy(false); setScan(null);
    setNote(r ? `${plural(r.secrets, 'secret')} moved to the key store from ${plural(r.conversations, 'chat')}.` : 'Nothing was moved. Try again.');
    await load();
  };
  return <div className="saved-keys" data-page={page || undefined} role={page ? undefined : 'dialog'} aria-label="Saved keys" onKeyDown={e => { if (e.key === 'Escape') onClose?.(); }}>
    {!page && <div className="saved-keys-head"><UiIcon name="lock" size={14}/><strong>Saved keys</strong>
      <button type="button" className="tool" onClick={onClose} aria-label="Close"><UiIcon name="close" size={12}/></button></div>}
    <p className="chat-export-hint">{page ? 'Keys, tokens and passwords you pasted in chats are stored encrypted on this computer and never shown again. Agents use them by name; a tool gets the value after you approve that call.' : 'Keys, tokens and passwords you type in a chat are stored encrypted on this computer. The chat and the model only see a reference; a tool gets the value after you approve that call.'}</p>
    {keys === null ? <p className="chat-export-hint" role="status">Loading…</p>
      : keys === 'error' ? <p className="chat-export-note" role="alert">The saved keys could not be read.</p>
        : keys.length === 0 ? <p className="chat-export-hint">No keys saved from the chat yet.</p>
          : <ul className="saved-keys-list">{keys.map(k => <li key={k.id} data-highlight={k.id === highlight || undefined}>
            <span className="saved-key-name"><b>{secretLabel(k.type)}</b><code dir="ltr" title={k.id} aria-label={`ending in ${k.id.slice(-4)}`}>···{k.id.slice(-4)}</code></span>
            <span className="saved-key-when">{when(k.createdAt)}{k.lastUsed ? ` · used ${when(k.lastUsed)}` : ''}</span>
            <button type="button" className="tool" onClick={() => void remove(k)} aria-label={`Delete ${secretLabel(k.type)} ${k.id}`}><UiIcon name="trash" size={12}/></button>
          </li>)}</ul>}
    {owner && <div className="saved-keys-cleanup">
      {!scan ? <button type="button" className="link-button" disabled={busy} onClick={() => void check()}>{busy ? 'Checking…' : 'Check older chats for secrets'}</button>
        : scan.secrets === 0 ? <p className="chat-export-hint">No secrets found in your older chats.</p>
          : <><p className="chat-export-hint">Found {plural(scan.secrets, 'secret')} in {plural(scan.messages, 'message')} of {plural(scan.conversations, 'chat')}, saved before this protection. Move them to the key store and keep only a reference in the chat?</p>
            <div className="chat-export-actions"><button type="button" className="primary" disabled={busy} onClick={() => void move()}>{busy ? 'Moving…' : 'Move to key store'}</button>
              <button type="button" className="link-button" onClick={() => setScan(null)}>Not now</button></div></>}
    </div>}
    {note && <p className="chat-export-note" role="status">{note}</p>}
  </div>;
}
