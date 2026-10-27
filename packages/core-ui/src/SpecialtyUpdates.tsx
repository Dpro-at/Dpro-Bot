import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import type {RefObject} from 'react';
import type {SessionClient} from './session';
import {SpecialtyUpdateController,type UpdateState} from './specialty-update-controller.js';
import {updateCopy as copy} from './specialty-update-copy';
export function SpecialtyUpdates({client,onClose,onApplied}:{client:SessionClient;onClose:()=>void;onApplied:()=>void}){
 const session=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot),dialog=useRef<HTMLDialogElement>(null),closeRef=useRef(onClose),appliedRef=useRef(onApplied);closeRef.current=onClose;appliedRef.current=onApplied;
 const owner=session.phase==='authenticated'&&session.user?.role==='owner';
 const controller=useMemo(()=>new SpecialtyUpdateController(client,()=>appliedRef.current()),[client,session.epoch,session.user?.id,session.mode]);
 const [state,setState]=useState(controller.state);
 useEffect(()=>{if(!owner)return;const invoker=document.activeElement;dialog.current?.showModal();setState(controller.state);const off=controller.subscribe(setState);void controller.load();const epoch=client.getSnapshot().epoch,user=client.getSnapshot().user?.id,mode=client.getSnapshot().mode;const unbind=client.subscribe(()=>{const now=client.getSnapshot();if(now.mode!==mode||now.epoch!==epoch||now.user?.id!==user||now.user?.role!=='owner'||now.phase!=='authenticated'){controller.destroy();dialog.current?.close();closeRef.current();}});return()=>{off();unbind();controller.destroy();dialog.current?.close();if(invoker instanceof HTMLElement&&invoker.isConnected)invoker.focus();};},[controller,owner,client]);
 if(!owner)return null;
 return <SpecialtyUpdatesView controller={controller} state={state} onClose={onClose} dialogRef={dialog}/>;
}
export function SpecialtyUpdatesView({controller,state,onClose,dialogRef}:{controller:SpecialtyUpdateController;state:UpdateState;onClose:()=>void;dialogRef?:RefObject<HTMLDialogElement|null>}){
 const actionable=state.preview?.roles.filter(r=>['content_update_available','local_conflict','ambiguous','retired'].includes(r.status))??[];
 const busy=['loading','reviewing','saving'].includes(state.phase),review=state.review;
 const error=state.error==='invalid_permissions'?copy.configuration:state.error==='resources_not_ready'?copy.blocked:['review_changed','version_conflict','impact_confirmation_required','configuration_changed'].includes(state.error??'')?copy.stale:['forbidden','unauthenticated'].includes(state.error??'')?copy.denied:copy.error;
 return <dialog ref={dialogRef} className="verification-sheet sp-update-dialog" aria-label={copy.title} onClose={onClose} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><h3>{copy.title}</h3><div className="dk-sheet-body">
  <p className="sp-sub">{copy.intro}</p>
  {busy&&<p role="status">{state.phase==='saving'?copy.saving:state.phase==='reviewing'?copy.reviewing:copy.loading}</p>}
  {state.phase==='error'&&<p role="alert">{error}</p>}
  {state.phase==='unknown'&&<p role="alert">{copy.unknown}</p>}
  {state.phase==='receipt'&&<p role="status">{copy.saved}</p>}
  {review?<div className="sp-upgrade-review"><h4>{review.name}</h4><h5>{copy.agents}</h5>{review.agents.length?<ul>{review.agents.map(a=><li key={a.id}>{a.name}</li>)}</ul>:<p>{copy.none}</p>}
   {review.changes.map(c=><section key={c.field}><h5>{copy.fields[c.field as keyof typeof copy.fields]}</h5><details><summary>{copy.before}</summary><pre className="sp-quote">{c.before}</pre></details><details open><summary>{copy.after}</summary><pre className="sp-quote">{c.after}</pre></details></section>)}
   <label className="sp-upgrade-confirm"><input type="checkbox" disabled={busy} checked={state.confirmed} onChange={e=>controller.confirm(e.target.checked)}/>{copy.confirm}</label>
  </div>:state.preview&&<div className="sp-upgrade-list">
   {actionable.map((role,i)=>{const blocked=role.packResources?.some(r=>r.status!=='current'||r.assigned===false);return <section key={role.sourceKey+':'+i} className="sp-upgrade-row"><div><h4>{role.name??copy.retired}</h4><p>{copy.statuses[role.status]}</p></div>
    {role.packResources&&<details><summary>{copy.package}</summary><ul>{role.packResources.map(r=><li key={r.sourceId}>{r.name} · {copy.resources[r.status]}{r.assigned===false&&` · ${copy.unassigned}`}</li>)}</ul></details>}
    {role.status==='content_update_available'&&<><button type="button" disabled={busy||!!blocked||state.phase==='unknown'} onClick={()=>void controller.review(role.sourceKey)}>{copy.review}</button>{blocked&&<p className="sp-sub">{copy.blocked} {copy.resourceHelp}</p>}</>}
   </section>;})}
   {!actionable.length&&<p>{copy.empty}</p>}
   {actionable.length>0&&state.preview.roles.length>actionable.length&&<p className="sp-sub">{copy.quiet}</p>}
  </div>}
 </div><div className="dk-sheet-actions">
  {review&&<button type="button" disabled={busy} onClick={()=>controller.back()}>{copy.back}</button>}
  <button type="button" disabled={busy} onClick={onClose}>{copy.close}</button>
  {review?<button type="button" className="primary" disabled={busy||!state.confirmed} onClick={()=>void controller.apply()}>{copy.save}</button>:<button type="button" disabled={busy} onClick={()=>void controller.load()}>{copy.reload}</button>}
 </div></dialog>;
}
