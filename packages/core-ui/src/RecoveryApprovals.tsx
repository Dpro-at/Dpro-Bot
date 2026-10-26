import { useEffect, useRef, useState } from 'react';
import {ApprovalVerificationSheet} from './ApprovalVerificationSheet';
import type { SessionClient } from './session';
import type { RecoveryApproval } from './recovery-approvals-contract.js';
import { UiIcon } from './ui-icons';
import { paramView, requestTitle } from './ApprovalPage';

/** Explicit reads and per-call decisions. Never retries a mutation. */
export function RecoveryApprovals({ client, conversationId }: { client: SessionClient; conversationId: string }) {
  const [items, setItems] = useState<RecoveryApproval[]>([]);
  const [detail, setDetail] = useState<RecoveryApproval>();
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verificationOpen,setVerificationOpen]=useState(false);
  const approvalButton=useRef<HTMLButtonElement>(null),wasVerificationOpen=useRef(false);
  const [notice, setNotice] = useState('');
  const epoch = client.getSnapshot().epoch;
  const serial = useRef(0);
  const busyRef = useRef(false);
  useEffect(() => { serial.current++; busyRef.current = false; setItems([]); setDetail(undefined); setReviewed(false); setNotice(''); setBusy(false); setVerificationOpen(false); return () => { serial.current++; }; }, [client, conversationId, epoch]);
  useEffect(()=>{if(wasVerificationOpen.current&&!verificationOpen&&!approvalButton.current?.disabled)approvalButton.current?.focus();wasVerificationOpen.current=verificationOpen;},[verificationOpen]);
  if (client.getSnapshot().user?.role !== 'owner') return <p>Only the owner can review tools.</p>;
  const send = async (path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const attempt = ++serial.current;
    const current = () => attempt === serial.current && client.getSnapshot().epoch === epoch && client.getSnapshot().phase === 'authenticated';
    setBusy(true); setNotice(''); setReviewed(false);
    try {
      const response = await client.request(method === 'GET' ? { method: 'GET', path } : { method: 'POST', path, ...(body === undefined ? {} : { body }) });
      if (!current()) return;
      const refusal=(response.body as {code?:string})?.code;
      if(response.status===403&&refusal&&['reviewer_quorum_required','reviewer_denied','reviewer_policy_unavailable'].includes(refusal)){setNotice(refusal==='reviewer_denied'?'A reviewer declined this action. Nothing was run.':refusal==='reviewer_quorum_required'?'Waiting for the people this rule needs. Nothing was run.':'The required review policy is unavailable. Nothing was run. Ask the owner to review the policy.');return;}
      if(response.status===403&&(response.body as {code?:string})?.code==='verification_required'){if(detail)setDetail({...detail,verificationRequired:true});setNotice('Your code is needed. Check the action again, then choose Allow once.');return;}
      if (response.status !== 200 || !response.body) { setDetail(undefined); setNotice(method === 'POST' ? 'Decision not confirmed. Reload pending tools and review before deciding again.' : 'Tools could not be loaded. Try again.'); return; }
      const result = response.body as { approvals?: RecoveryApproval[]; approval?: RecoveryApproval };
      if (result.approvals) { const mine = result.approvals.filter(a => a.sessionId === conversationId); setItems(mine); setDetail(undefined); if (!mine.length) setNotice('Nothing from this chat is waiting.'); }
      if (result.approval) {
        if (result.approval.sessionId !== conversationId) { setDetail(undefined); setNotice('This tool belongs to another conversation.'); return; }
        if (method === 'GET') { setDetail(result.approval); if (!items.some(i => i.id === result.approval!.id)) setItems([...items, result.approval]); }
        else { setItems(items.filter(a => a.id !== result.approval!.id)); setDetail(undefined); setNotice(result.approval.status === 'executed' ? 'Done. Continue the chat to use its result.' : result.approval.status === 'denied' ? 'Rejected. It did not run.' : `Saved: ${result.approval.status}.`); }
      }
    } catch {
      if (current()) { setDetail(undefined); setNotice(method === 'POST' ? 'Outcome unknown. Reload pending tools before another decision; nothing was retried.' : 'Tools could not be loaded.'); }
    } finally { if (current()) { busyRef.current = false; setBusy(false); } }
  };
  const allow=(d:RecoveryApproval)=>d.verificationRequired?setVerificationOpen(true):void send(`/api/approvals/${d.id}/approve`,'POST',{paramsHash:d.paramsHash});
  return <section className="panel recovery-approvals" aria-label="Waiting actions after restart">
    <p className="recovery-head">Some actions of this chat are waiting for you. Nothing runs again by itself.</p>
    {!items.length&&!detail&&<button type="button" disabled={busy || verificationOpen} onClick={() => void send('/api/approvals?status=pending')}>Show waiting actions</button>}
    <ul className="recovery-cards">{items.map(a => { const open=detail?.id===a.id; return <li key={a.id} className="recovery-card" data-open={open||undefined}>
      <div className="recovery-card-row"><span className="approval-category"><UiIcon name="tool" size={15}/></span><strong>{requestTitle(a.toolName,null)}</strong>
        {!open&&<button type="button" className="link" disabled={busy || verificationOpen} onClick={() => void send(`/api/approvals/${a.id}`)}>Details</button>}
        <button type="button" disabled={busy || verificationOpen} onClick={() => void send(`/api/approvals/${a.id}/deny`, 'POST')}>Reject</button>
        {open&&detail&&<button ref={approvalButton} type="button" className="primary" disabled={busy || verificationOpen || !reviewed || !detail.paramsHash || detail.params === null || detail.status !== 'pending'} onClick={()=>allow(detail)}>Allow once</button>}</div>
      {open&&detail&&<div className="recovery-detail">
        {detail.params===null?<p>The full request is unavailable, so it cannot be allowed.</p>:(()=>{const view=paramView(detail.params,detail.maskedFields??[]);return <>{view.complete&&<dl className="approval-plain">{view.rows.map(([k,v,hidden])=><div key={k}><dt>{k}</dt><dd data-hidden={hidden||undefined}>{v}</dd></div>)}</dl>}<details className="approval-scope" open={!view.complete}><summary>{view.complete?'Show the exact request':'This request is long; here it is in full'}</summary><pre dir="auto" tabIndex={0}>{JSON.stringify(detail.params, null, 2)}</pre></details></>;})()}
        {!!detail.maskedFields?.length&&<p className="approval-masked">Some values are hidden. Allowing uses the exact saved values.</p>}
        <label className="check"><input type="checkbox" checked={reviewed} disabled={busy || verificationOpen || detail.status !== 'pending'} onChange={e => setReviewed(e.target.checked)}/>I checked it is safe to run after the interruption.</label>
        {detail.verificationRequired&&<small>Allow once asks for your code first.</small>}
      </div>}
    </li>;})}</ul>
    {notice && <p role="status">{notice}</p>}
    {verificationOpen&&detail?.paramsHash&&<ApprovalVerificationSheet key={detail.id+detail.paramsHash} client={client} id={detail.id} paramsHash={detail.paramsHash} toolName={requestTitle(detail.toolName,null)} onClose={()=>setVerificationOpen(false)} onApprove={receipt=>{setVerificationOpen(false);void send(`/api/approvals/${detail.id}/approve`,'POST',{paramsHash:detail.paramsHash,verificationReceipt:receipt});}}/>}
  </section>;
}
