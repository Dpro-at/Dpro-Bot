// CHAT-BUILD-01 stage 4 (CH8 Place › Schedule): run this chat on a schedule — the saved message is sent
// to the chat again at the chosen time, as if the owner typed it (same Mode and gates). Change, Pause, Remove.
import { useEffect, useState } from 'react';
import type { SessionClient } from './session';
import { Sheet } from './desktop-ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type Draft = { every: 'hourly' | 'daily' | 'weekly'; at: string; weekday: number; message: string; paused: boolean };

export function ScheduleSheet({ client, chatId, onClose }: { client: SessionClient; chatId: string; onClose: () => void }) {
  const path = `/api/chat/conversations/${chatId}/schedule`;
  const [draft, setDraft] = useState<Draft>({ every: 'daily', at: '09:00', weekday: 1, message: '', paused: false });
  const [exists, setExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void (async () => { try { const r = await client.request({ method: 'GET', path } as never); const v = (r.body as any)?.schedule; if (r.status === 200 && v) { setExists(true); setDraft({ every: v.every, at: v.at, weekday: v.weekday ?? 1, message: v.message, paused: v.paused }); } } catch { /* a new schedule */ } })(); }, [client, path]);
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const r = await client.request({ method: 'PUT', path, body: { every: draft.every, at: draft.at, ...(draft.every === 'weekly' ? { weekday: draft.weekday } : {}), message: draft.message, paused: draft.paused } } as never);
      if (r.status === 200) onClose(); else setError('The schedule was not saved. Check the time and the message.');
    } catch { setError('The schedule was not saved (no connection).'); }
    setBusy(false);
  };
  const remove = async () => { setBusy(true); try { await client.request({ method: 'DELETE', path } as never); onClose(); } catch { setError('The schedule was not removed.'); setBusy(false); } };
  return <Sheet title="Run this chat on a schedule" onClose={onClose} actions={<>
    {exists && <button type="button" className="link-button danger" disabled={busy} onClick={() => void remove()}>Remove schedule</button>}
    <span className="dk-spacer"/>
    <button type="button" onClick={onClose}>Cancel</button>
    <button type="button" className="primary" disabled={busy || !draft.message.trim()} onClick={() => void save()}>{exists ? 'Save' : 'Start schedule'}</button></>}>
    <label className="sheet-field"><span>How often</span>
      <select value={draft.every} onChange={e => setDraft({ ...draft, every: e.target.value as Draft['every'] })}><option value="hourly">Every hour</option><option value="daily">Every day</option><option value="weekly">Every week</option></select></label>
    {draft.every === 'weekly' && <label className="sheet-field"><span>Day</span><select value={draft.weekday} onChange={e => setDraft({ ...draft, weekday: Number(e.target.value) })}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>}
    <label className="sheet-field"><span>{draft.every === 'hourly' ? 'At minute' : 'At'}</span><input type="time" value={draft.at} onChange={e => setDraft({ ...draft, at: e.target.value })}/></label>
    <label className="sheet-field"><span>Message</span><textarea rows={3} maxLength={4000} value={draft.message} placeholder="What the team should do each time" onChange={e => setDraft({ ...draft, message: e.target.value })}/></label>
    {exists && <label className="sheet-check"><input type="checkbox" checked={draft.paused} onChange={e => setDraft({ ...draft, paused: e.target.checked })}/>Paused</label>}
    <p className="fine-print">Runs while Girru is open on this computer. The chat’s Mode applies; anything that needs you waits for you.</p>
    {error && <p className="project-error" role="alert">{error}</p>}
  </Sheet>;
}
