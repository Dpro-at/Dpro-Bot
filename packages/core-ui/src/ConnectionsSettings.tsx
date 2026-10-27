import {UiIcon} from './ui-icons';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { SessionClient } from './session';
import type { Connection, Publication } from './connections-contract.js';
import { CONNECTIONS_PATH } from './connections-contract.js';

const GENVR = `${CONNECTIONS_PATH}/genvr`;
const STATUS: Record<Connection['status'], string> = { not_connected: 'Not connected', connecting: 'Connecting…', connected: 'Connected', expired: 'Expired — connect again', error: 'Not connected' };
const MESSAGES: Record<string, string> = {
  relink_required: 'The Genvr link has expired or was revoked. Connect again.',
  missing_scope: 'This link does not allow that action. Connect again to grant it.',
  not_found: 'Genvr says this world is not yours or no longer exists.',
  conflict: 'The world changed on Genvr. Nothing was overwritten; try again to read the latest version.',
  link_expired: 'The approval code expired before it was approved. Start again.',
  other_account: 'The test world belongs to another Genvr account.',
  published_unpublish_first: 'The test world is already published.',
  upload_first: 'Upload the test world before publishing it.',
  forbidden: 'Only the owner can manage connections.',
  unavailable: 'Genvr could not be reached. Check the connection and try again.',
};
const message = (code?: string) => (code && MESSAGES[code]) || 'The request failed. Try again.';
const CONTENT = { violence: false, blood: false, horror: false, romance: false, userChat: false, paidItems: false };
const CONTENT_LABELS: Record<keyof typeof CONTENT, string> = { violence: 'Violence', blood: 'Blood', horror: 'Horror', romance: 'Romance', userChat: 'Visitors can chat', paidItems: 'Paid items' };
/** "Girru may" in plain words (AA5); a code Girru does not know yet is shown as it is. */
const SCOPE_WORDS: Record<string, string> = { 'worlds:read': 'See your spaces', 'worlds:write': 'Save worlds as private drafts', 'worlds:publish': 'Publish only after you agree', 'worlds:join': 'Join worlds' };
export const scopeWords = (scope: string) => SCOPE_WORDS[scope] ?? scope;
const date = (v: string | null) => v ? new Date(v).toLocaleString() : '';

/** Apps › Accounts (AA5): online accounts linked to this Girru, today GenVR (owner only). */
export function ConnectionsSettings({ client, onOpenGenvr }: { client: SessionClient; onOpenGenvr?: () => void }) {
  const owner = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot).user?.role === 'owner';
  const [genvr, setGenvr] = useState<Connection>();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [confirmOff, setConfirmOff] = useState(false), [testing, setTesting] = useState(false);
  const send = useCallback(async (method: 'GET' | 'POST', path: string, body?: unknown) => {
    const r = await client.request({ method, path, ...(body === undefined ? {} : { body }) } as never);
    return { ok: r.status === 200, body: r.body as Record<string, any> };
  }, [client]);
  const load = useCallback(async () => {
    try { const r = await send('GET', CONNECTIONS_PATH); if (!r.ok) { setPhase('error'); return; } setGenvr(r.body.connections.find((c: Connection) => c.id === 'genvr')); setPhase('ready'); }
    catch { setPhase('error'); }
  }, [send]);
  useEffect(() => { if (owner) void load(); }, [owner, load]);
  // While the owner approves on the Genvr website, the backend polls; the page only reads the state.
  useEffect(() => { if (genvr?.status !== 'connecting') return; const t = setInterval(() => void load(), 3000); return () => clearInterval(t); }, [genvr?.status, load]);
  const act = async (path: string, body: unknown) => {
    if (busy) return; setBusy(true); setNotice('');
    try { const r = await send('POST', path, body); if (r.ok) setGenvr(r.body.connection); else setNotice(message(r.body?.code)); }
    catch { setNotice(message()); } finally { setBusy(false); setConfirmOff(false); }
  };
  if (!owner) return <section aria-label="Accounts"><p className="fine-print">Only the owner can see and manage connected accounts.</p></section>;
  const linked = genvr?.status === 'connected';
  return <section aria-label="Accounts" className="connections apps-accounts"><div className="apps-panes" data-selected={!!genvr}>
    <div className="apps-list">
      {phase === 'loading' && <p role="status" className="apps-empty">Loading connections…</p>}
      {phase === 'error' && <div role="alert" className="apps-empty"><p>Connections could not be loaded.</p><button type="button" onClick={() => void load()}>Try again</button></div>}
      {genvr && <div role="listbox" aria-label="Accounts"><button type="button" role="option" aria-selected="true" className="apps-row"><span className="apps-icon" data-app="genvr"><UiIcon name="globe" size={18}/></span><span><strong>GenVR</strong><small>Your world account</small></span><span className="st-state" data-state={linked ? 'ready' : genvr.status === 'expired' ? 'warn' : 'off'}><i aria-hidden="true"/>{STATUS[genvr.status]}</span></button></div>}
      <p className="apps-help">More accounts will appear here when Girru can link them.</p>
    </div>
    <aside className="apps-inspector" aria-label="Selected account">{genvr && <article className="connection-card" aria-label="Genvr connection">
      <div className="apps-inspector-head"><span className="apps-tile-icon" data-app="genvr" aria-hidden="true"><UiIcon name="globe" size={22}/></span><div><h3>GenVR</h3><p className="apps-inspector-line" role="status">{linked && genvr.account ? `${genvr.account.name} · connected` : STATUS[genvr.status]}</p></div>
        {(linked || genvr.status === 'expired') && <details className="st-menu"><summary className="tool" aria-label="More for GenVR" title="More"><UiIcon name="more" size={15}/></summary><div role="menu">{linked && <button type="button" role="menuitem" onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setTesting(true); }}>Try publishing a test world…</button>}<button type="button" role="menuitem" disabled={busy} onClick={e => { e.currentTarget.closest('details')?.removeAttribute('open'); setConfirmOff(true); }}>Disconnect…</button></div></details>}</div>
      {genvr.status === 'connecting' && genvr.pending && <div className="connection-pending">
        <p>Open GenVR, sign in, and approve <b>Girru</b>. Check that this code is shown there:</p>
        <p className="connection-code" aria-label="Approval code">{genvr.pending.userCode}</p>
        <div className="connection-actions"><a className="button primary" href={genvr.pending.verificationUri} target="_blank" rel="noopener noreferrer">Open GenVR to approve</a>
          <button type="button" disabled={busy} onClick={() => void act(`${GENVR}/cancel`, {})}>Cancel</button></div>
        <p className="fine-print">Waiting for your OK · the code works until {date(genvr.pending.expiresAt)}. Your GenVR password is never typed in Girru.</p>
      </div>}
      {linked && <><h4>Girru may</h4><ul className="apps-may-list">{genvr.scopes.map(x => <li key={x}>{scopeWords(x)}</li>)}</ul><dl className="apps-facts"><dt>Linked</dt><dd>{date(genvr.linkedAt)}</dd><dt>Valid until</dt><dd>{date(genvr.expiresAt)}</dd></dl></>}
      {genvr.error && genvr.status !== 'connecting' && <p role="alert" className="error">{message(genvr.error)}</p>}
      {confirmOff && <div className="apps-confirm" role="alertdialog" aria-label="Disconnect GenVR"><p>Disconnect GenVR? Girru removes the link; your worlds stay on GenVR.</p><div className="connection-actions"><button type="button" onClick={() => setConfirmOff(false)}>Keep</button><button type="button" className="danger" disabled={busy} onClick={() => void act(`${GENVR}/disconnect`, { confirm: true })}>Disconnect</button></div></div>}
      <div className="apps-actions">
        {(genvr.status === 'not_connected' || genvr.status === 'error' || genvr.status === 'expired') && <button type="button" className="primary" disabled={busy} onClick={() => void act(`${GENVR}/link`, {})}>{genvr.status === 'expired' ? 'Connect again' : 'Connect GenVR'}</button>}
        {linked && onOpenGenvr && <button type="button" className="primary" onClick={onOpenGenvr}>Open GenVR</button>}
      </div>
      {notice && <p role="alert" className="error">{notice}</p>}
      {!linked && genvr.status !== 'connecting' && <p className="fine-print">Connect shows a code to approve in GenVR. Credentials stay in the encrypted key store.</p>}
      {linked && testing && <details open className="preference-help" onToggle={e => { if (!e.currentTarget.open) setTesting(false); }}><summary>Try publishing a test world</summary><TestPublication send={send}/></details>}
    </article>}</aside>
  </div></section>;
}

function TestPublication({ send }: { send: (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<{ ok: boolean; body: Record<string, any> }> }) {
  const [pub, setPub] = useState<Publication | null>(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [uploadOk, setUploadOk] = useState(false), [publishOk, setPublishOk] = useState(false);
  const [title, setTitle] = useState('Girru test world'), [type, setType] = useState<'social' | 'game' | 'event'>('social'), [access, setAccess] = useState<'public' | 'friends' | 'invite'>('public');
  const [content, setContent] = useState(CONTENT);
  useEffect(() => { void send('GET', `${GENVR}/publications`).then(r => { if (r.ok) setPub(r.body.publications.find((p: Publication) => p.localId === 'dpro.publication.test') ?? null); }).catch(() => undefined); }, [send]);
  const run = async (path: string, body: unknown) => {
    if (busy) return; setBusy(true); setNotice('');
    try { const r = await send('POST', path, body); if (r.ok) setPub(r.body.publication); else setNotice(message(r.body?.code)); }
    catch { setNotice(message()); } finally { setBusy(false); setUploadOk(false); setPublishOk(false); }
  };
  return <section className="connection-publish" aria-label="Test world publication">
    <h4>Test world publication</h4>
    <p className="fine-print">A new small world made here: flat ground and one built-in bench. No private library, voice, model or existing world is sent.</p>
    {pub && <dl className="settings-facts"><dt>Genvr world</dt><dd>{pub.serverId}</dd><dt>State</dt><dd>{pub.status === 'published' ? `Published (${pub.access})` : 'Private draft'} · version {pub.version}</dd>{pub.link && <><dt>Link</dt><dd><a href={pub.link} target="_blank" rel="noopener noreferrer">{pub.link}</a></dd></>}</dl>}
    {pub?.status !== 'published' && <>
      <label className="check"><input type="checkbox" checked={uploadOk} disabled={busy} onChange={e => setUploadOk(e.target.checked)}/>{pub ? 'Upload the test world again to the same private draft.' : 'Create one private draft on my Genvr account and upload the test world.'}</label>
      <div className="connection-actions"><button type="button" disabled={busy || !uploadOk} onClick={() => void run(`${GENVR}/test-world/upload`, { confirm: true })}>{pub ? 'Upload again' : 'Create draft and upload'}</button></div>
    </>}
    {pub && pub.status === 'draft' && pub.version > 0 && <fieldset className="connection-form" disabled={busy}><legend>Publish (separate confirmation)</legend>
      <label className="field"><span>Title</span><input value={title} maxLength={120} onChange={e => setTitle(e.target.value)}/></label>
      <label className="field"><span>Type</span><select value={type} onChange={e => setType(e.target.value as typeof type)}><option value="social">Social</option><option value="game">Game</option><option value="event">Event</option></select></label>
      <label className="field"><span>Who can enter</span><select value={access} onChange={e => setAccess(e.target.value as typeof access)}><option value="public">Everyone (public)</option><option value="friends">Friends</option><option value="invite">Invite only</option></select></label>
      <p className="fine-print">Content questions (answer truthfully; Genvr checks them):</p>
      {(Object.keys(CONTENT) as (keyof typeof CONTENT)[]).map(k => <label key={k} className="check"><input type="checkbox" checked={content[k]} onChange={e => setContent({ ...content, [k]: e.target.checked })}/>{CONTENT_LABELS[k]}</label>)}
      <label className="check"><input type="checkbox" checked={publishOk} onChange={e => setPublishOk(e.target.checked)}/>Publish this world on Genvr as “{title.trim() || '…'}” ({access}).</label>
      <div className="connection-actions"><button type="button" className="primary" disabled={!publishOk || !title.trim()} onClick={() => void run(`${GENVR}/test-world/publish`, { confirm: true, title: title.trim(), type, access, content })}>Publish</button></div>
    </fieldset>}
    {notice && <p role="alert" className="error">{notice}</p>}
  </section>;
}
