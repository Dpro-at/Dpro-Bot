import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import type {SessionClient} from './session';
import {ApprovalVerificationController} from './approval-verification-controller';
/** Board AP2a: six code boxes; the code is checked as soon as six digits are typed, then one explicit "Allow once". */
export function ApprovalVerificationSheet({client,id,paramsHash,toolName,onClose,onApprove}:{client:SessionClient;id:string;paramsHash:string;toolName:string;onClose:()=>void;onApprove:(receipt:string)=>void}){
 const controller=useMemo(()=>new ApprovalVerificationController(client,id,paramsHash),[client,id,paramsHash]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),dialog=useRef<HTMLDialogElement>(null),[code,setCode]=useState('');
 useEffect(()=>{const element=dialog.current;element?.showModal();void controller.start();return()=>{controller.cancel();element?.close();};},[controller]);
 const close=()=>{controller.cancel();setCode('');dialog.current?.close();onClose();};
 const closeRef=useRef(close);closeRef.current=close;
 useEffect(()=>{const epoch=client.getSnapshot().epoch;return client.subscribe(()=>{const current=client.getSnapshot();if(current.epoch!==epoch||current.phase!=='authenticated')closeRef.current();});},[client,controller]);
 const submit=(value:string)=>{if(!/^[0-9]{6}$/.test(value)||state.phase!=='code')return;setCode('');void controller.verify(value);};
 return <dialog ref={dialog} className="verification-sheet code-sheet" aria-labelledby="approval-verification-title" onCancel={event=>{event.preventDefault();close();}}>
  <h3 id="approval-verification-title">Confirm with your code</h3><p className="approval-verification-tool">{toolName} · one time</p>
  {(state.phase==='loading'||state.phase==='verifying')&&<p role="status">{state.phase==='loading'?'Getting ready…':'Checking the code…'}</p>}
  {state.notice&&<p role="alert">{state.notice==='refused'?'That code did not work. Check your authenticator app and try again.':state.notice==='limited'?'Too many tries. Wait a little, then start again.':state.notice==='expired'?'This took too long. Close this window and start again.':'Checking codes is not possible right now. Close this window and try again.'}</p>}
  {(state.phase==='code'||state.phase==='verifying')&&<form id="approval-verification-form" onSubmit={event=>{event.preventDefault();submit(code);}}><fieldset disabled={state.phase==='verifying'}><label htmlFor="approval-verification-code" className="code-boxes"><span className="sr-only">Code from your authenticator app</span><input id="approval-verification-code" autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={event=>{const v=event.target.value.replace(/\D/g,'').slice(0,6);setCode(v);if(v.length===6)submit(v);}}/>{[0,1,2,3,4,5].map(i=><span key={i} className="code-box" data-active={i===Math.min(code.length,5)||undefined} aria-hidden="true">{code[i]??''}</span>)}</label><p className="fine-print">From your authenticator app. The code alone never runs anything.</p></fieldset></form>}
  {state.phase==='verified'&&<p role="status">Code accepted. Allow this request once?</p>}
  <div className="actions">
   <button type="button" onClick={close}>Cancel</button>
   {(state.phase==='code'||state.phase==='verifying')&&<button form="approval-verification-form" type="submit" className="primary" disabled={state.phase==='verifying'||code.length!==6}>Check code</button>}
   {state.phase==='verified'&&<button type="button" className="primary" autoFocus onClick={()=>{const receipt=controller.takeReceipt();if(!receipt)return;dialog.current?.close();onApprove(receipt);}}>Allow once</button>}
  </div>
 </dialog>;
}
