// Board AG3a: an agent's memories as the same quiet list as the Memory window
// (one search field, no row of filters), grouped by topic, with an inspector
// for the selected memory: Edit, Move, History and Forget.
import { useMemo, useSyncExternalStore } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { MemoryExplorerController } from './memory-explorer';
import type { ExplorerItem } from './memory-pages-contract.js';
import { ago, drawerName, oneLine } from './memory-store';
import { kindOf } from './MemoryDesktop';
import { IconButton, WithSwatches } from './desktop-ui';
import { UiIcon } from './ui-icons';

const CHANGE: Record<string, string> = { create: 'created', update: 'changed', move: 'moved', delete: 'deleted', forget: 'forgotten', restore: 'restored' };
const topicName = (t: string) => t.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

export function AgentMemoryList({ c }: { c: MemoryExplorerController }) {
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot, c.getSnapshot);
  const groups = useMemo(() => {
    const by = new Map<string, ExplorerItem[]>();
    for (const i of s.items) { const key = i.topicKey ?? ''; by.set(key, [...(by.get(key) ?? []), i]); }
    const named = [...by.entries()].filter(([key]) => key).sort((a, b) => b[1].length - a[1].length);
    return [...named, ...(by.has('') ? [['', by.get('')!] as [string, ExplorerItem[]]] : [])];
  }, [s.items]);
  const flat = groups.flatMap(([, items]) => items);
  const open = c.item(s.open);
  function keys(e: ReactKeyboardEvent) {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    const at = flat.findIndex(f => f.id === s.open);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = flat[Math.max(0, Math.min(flat.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (next) void c.openMemory(next.id);
    } else if (e.key === 'Enter' && s.open) { e.preventDefault(); c.startEdit(); }
    else if ((e.key === 'Backspace' || e.key === 'Delete') && s.open) { e.preventDefault(); c.askForget(); }
    else if (e.key === 'Escape' && s.open) { e.preventDefault(); c.close(); }
  }
  return <div className="ag-mem">
    <form className="ag-mem-search" role="search" onSubmit={e => { e.preventDefault(); void c.searchMeaning(); }}>
      <UiIcon name="search" size={13}/>
      <input type="search" aria-label="Search this agent’s memories" placeholder="Search (Enter searches by meaning)" value={s.query} onChange={e => c.setQuery(e.target.value)} onKeyUp={e => { if (e.key !== 'Enter' && !s.query) void c.load(); }}/>
    </form>
    {s.notice && s.phase !== 'error' && <p className="card-notice" role="alert">{s.notice}</p>}
    {s.result && <p className="dk-inline-ok" role="status">{s.result}</p>}
    <div className="ag-mem-split" data-open={open ? 'true' : undefined}>
      <div className="dk-list" tabIndex={0} role="listbox" aria-label="Memories" onKeyDown={keys}>
        {s.phase === 'error' && <div className="dk-empty"><p>{s.notice}</p><button type="button" onClick={() => void c.load()}>Try again</button></div>}
        {(s.phase === 'loading' || s.phase === 'idle') && <p className="dk-empty" role="status">Reading memories…</p>}
        {s.meaning && <p className="dk-inline-ok">Found by meaning. <button type="button" className="link-button" onClick={() => void c.load()}>Show word matches</button></p>}
        {s.phase === 'ready' && s.items.length === 0 && <p className="dk-empty">{s.query ? 'No memory matches.' : 'It has not saved anything yet.'}</p>}
        {groups.map(([topic, items]) => <section key={topic || '_'} className="dk-list-group">{(topic || groups.length > 1) && <h3>{topic ? topicName(topic) : 'Other'}</h3>}
          {items.map(i => { const kind = kindOf(i); return <div key={i.id} className="dk-row" role="option" aria-selected={s.open === i.id} onClick={() => void c.openMemory(i.id)} onDoubleClick={() => void c.openMemory(i.id).then(() => c.startEdit())}>
            <span className="dk-row-icon" title={kind.word}><UiIcon name={kind.icon} size={14}/></span>
            <span className="dk-row-text"><span className="dk-row-main" dir="auto"><WithSwatches text={oneLine(i.preview)}/></span><span className="dk-row-sub">{kind.word} · {ago(i.createdAt)} · {drawerName(i.drawerId)}</span></span>
          </div>; })}
        </section>)}
        {s.nextCursor && !s.meaning && <p className="dk-more-row" role="status">{s.busy ? 'Loading more…' : <button type="button" className="link-button" onClick={() => void c.more()}>Load more</button>}</p>}
      </div>
      {open && <aside className="dk-insp ag-mem-insp" aria-label="Selected memory">
        {s.editing ? <form className="dk-edit" onSubmit={e => { e.preventDefault(); void c.saveEdit(); }}>
          <textarea aria-label="Memory text" dir="auto" rows={6} value={s.draft} maxLength={50000} autoFocus onChange={e => c.editDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void c.saveEdit(); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); c.cancelEdit(); } }}/>
          <label className="dk-field-inline">Importance<input type="range" min={1} max={10} value={s.draftImportance} onChange={e => c.editImportance(Number(e.target.value))}/><span>{s.draftImportance}</span></label>
          <div className="actions"><button type="button" onClick={() => c.cancelEdit()}>Cancel</button><button type="submit" className="primary" disabled={s.busy || !s.draft.trim()}>Save</button></div>
          <p className="fine-print">Saved as a new version; History keeps the old one.</p>
        </form> : <p className="dk-insp-text" dir="auto"><WithSwatches text={s.full ?? open.preview}/></p>}
        {!s.editing && !s.moving && !s.confirmForget && <div className="dk-insp-icons">
          <IconButton icon="pencil" label="Edit" shortcut="↩" onClick={() => c.startEdit()}/>
          <IconButton icon="move" label="Move…" onClick={() => c.startMove()}/>
          <IconButton icon="trash" label="Forget…" shortcut="⌫" onClick={() => c.askForget()} danger/>
          <IconButton icon="close" label="Close" shortcut="esc" onClick={() => c.close()}/>
        </div>}
        {s.moving && <div className="ag-mem-ask">
          <label className="field">Move to<select value={s.moveTo} onChange={e => c.setMoveTo(e.target.value)}><option value="">Choose a place…</option>
            {[...new Set(['owner', 'experience', ...Object.keys(s.facets.drawer)])].filter(d => d && d !== '?' && d !== open.drawerId).map(d => <option key={d} value={d}>{drawerName(d)}</option>)}</select></label>
          <div className="actions"><button type="button" onClick={() => c.cancelMove()}>Cancel</button><button type="button" className="primary" disabled={!s.moveTo || s.busy} onClick={() => void c.move()}>Move</button></div>
        </div>}
        {s.confirmForget && <div className="ag-mem-ask"><p>Forget this memory for good? Its text and history are removed.</p>
          <div className="actions"><button type="button" onClick={() => c.cancelForget()}>Keep</button><button type="button" className="danger-solid" disabled={s.busy} onClick={() => void c.forget()}>Forget</button></div></div>}
        <dl className="dk-facts">
          <dt>Kind</dt><dd><UiIcon name={kindOf(open).icon} size={13}/>{kindOf(open).word} · importance {open.importance}</dd>
          <dt>Where</dt><dd>{drawerName(open.drawerId)}</dd>
          <dt>From</dt><dd>{new Date(`${open.createdAt}Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</dd>
          {s.detail && s.detail.id === open.id && <><dt>Used</dt><dd>{s.detail.usage.usedIn ? `in ${s.detail.usage.usedIn} ${s.detail.usage.usedIn === 1 ? 'reply' : 'replies'}` : 'not used in a reply yet'}</dd></>}
          <dt>History</dt><dd>{s.versions === null ? '…' : `${s.versions.length} ${s.versions.length === 1 ? 'version' : 'versions'}`}</dd>
        </dl>
        {s.versions && s.versions.length > 1 && <ol className="ag-mem-history">{s.versions.map(v => <li key={v.version}><span className="fine-print">{ago(v.createdAt)} · {CHANGE[v.change] ?? v.change}</span><span dir="auto">{v.content ? oneLine(v.content) : '—'}</span></li>)}</ol>}
      </aside>}
    </div>
  </div>;
}
