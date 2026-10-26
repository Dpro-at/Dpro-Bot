import { useEffect, useState, useSyncExternalStore } from 'react';
import type { SessionClient } from './session';
import { ChatController, retryNotice } from './chat';
import { isDeveloperBuild } from './developer-build';
export function ChatDestination({ client }: { client: SessionClient }) {
  const [controller, setController] = useState<ChatController>();
  useEffect(() => { const c = new ChatController(client); setController(c); return () => c.dispose(); }, [client]);
  return <section className="chat-destination" aria-label="Chat"><h2>Chat</h2>
    <p>{client.getSnapshot().mode === 'mock' ? 'Offline fictional streaming exercise — no network or model calls.' : 'Authenticated chat — sends only after you press Send.'}{isDeveloperBuild(client) ? ' Copy: English draft.' : ''}</p>
    <p>Current sign-in conversation only; history is kept in memory and cleared on sign-out. Past server conversations are not loaded. Closing the reader does not prove server execution stopped.</p>
    {controller ? <ChatReview controller={controller}/> : <p>Chat is not connected.</p>}
  </section>;
}
export function ChatReview({ controller }: { controller: ChatController }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const blocked = ['sending', 'unknown', 'denied'].includes(s.phase);
  return <>
    <label>Agent ID (optional)<input value={s.agentId} disabled={!!s.turns.length || s.phase !== 'ready'} onChange={e => controller.selectAgent(e.target.value)} maxLength={128}/></label>
    <p>Blank uses the server-selected primary agent or fallback. An ID is sent as agentId; it is not a permission grant or a verified agent selection. No project/task/people scope override is sent.</p>
    {s.sessionId && <p>Conversation: <bdi>{s.sessionId}</bdi></p>}
    <div className="chat-history" aria-label="Current conversation">
      {s.turns.map(t => <article key={t.key}>
        <h3>You</h3><pre>{t.prompt}</pre><h3>Assistant</h3><pre>{t.content || (s.phase === 'sending' ? 'Waiting for text…' : 'No message text received.')}</pre>
        {t.runId && <p>Run: <bdi>{t.runId}</bdi> · Message: <bdi>{t.messageId}</bdi></p>}
        {t.events > 0 && <p>{t.events} tool activity events received. Tool parameters/results are not displayed; no execution verdict is inferred.</p>}
        {t.replayed && <p>Server marked this response as replayed.</p>}
        {t.partial && <p>Incomplete or truncated response.</p>}
      </article>)}
    </div>
    <p role="status">{s.notice ?? (s.phase === 'sending' ? 'Receiving response…' : s.phase === 'denied' ? 'Chat requires an active non-guest session.' : 'Ready to send.')}</p>
    <form method="post" onSubmit={e => { e.preventDefault(); void controller.send(); }}>
      <label htmlFor="chat-composer">Message</label><textarea id="chat-composer" value={s.draft} onChange={e => controller.edit(e.target.value)} maxLength={32768} disabled={blocked} required/>
      <button className="primary" disabled={blocked || !s.draft.trim()}>Send</button>
      {s.phase === 'sending' && <button type="button" onClick={() => controller.cancel()}>Cancel reading and clear messages</button>}
      {s.phase === 'unknown' && <button type="button" disabled title={retryNotice}>Retry unavailable</button>}
    </form>
  </>;
}
