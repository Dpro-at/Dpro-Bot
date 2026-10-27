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
 const busy=['loading','reviewing','saving'].includes(state.phase),review=state.review,prep=state.preparation,activeReview=review||prep;
 const error=state.error==='invalid_permissions'?copy.configuration:state.error==='resources_not_ready'?copy.blocked:['review_changed','version_conflict','impact_confirmation_required','configuration_changed'].includes(state.error??'')?copy.stale:['forbidden','unauthenticated'].includes(state.error??'')?copy.denied:copy.error;
 return <dialog ref={dialogRef} className="verification-sheet sp-update-dialog" aria-label={copy.title} onClose={onClose} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><h3>{copy.title}</h3><div className="dk-sheet-body">
  <p className="sp-sub">{copy.intro}</p>
  {busy&&<p role="status">{state.phase==='saving'?copy.saving:state.phase==='reviewing'?copy.reviewing:copy.loading}</p>}
  {state.phase==='error'&&<p role="alert">{error}</p>}
  {state.phase==='unknown'&&<p role="alert">{copy.unknown}</p>}
  {state.phase==='receipt'&&<p role="status">{state.preparationReceipt?copy.prepareSaved:copy.saved}</p>}
  {prep?<div className="sp-upgrade-review"><h4>{prep.name}</h4><p>{prep.kind==='package'?copy.shared:copy.bindIntro}</p>
   <h5>{copy.specialties}</h5>{prep.specialties.length?<ul>{prep.specialties.map(s=><li key={s.id}>{s.name}</li>)}</ul>:<p>{copy.noConsumers}</p>}
   <h5>{copy.agents}</h5>{prep.agents.length?<ul>{prep.agents.map(a=><li key={a.id}>{a.name}</li>)}</ul>:<p>{copy.none}</p>}
   {prep.bindings.length>0&&<><h5>{copy.package}</h5><ul>{prep.bindings.map(name=><li key={name}>{name}</li>)}</ul></>}
   {prep.files.map(file=><section key={file.path}><h5>{file.path}</h5><details><summary>{copy.before}</summary><pre className="sp-quote">{file.before}</pre></details><details><summary>{copy.after}</summary><pre className="sp-quote">{file.after}</pre></details></section>)}
  </div>:review?<div className="sp-upgrade-review"><h4>{review.name}</h4><h5>{copy.agents}</h5>{review.agents.length?<ul>{review.agents.map(a=><li key={a.id}>{a.name}</li>)}</ul>:<p>{copy.none}</p>}
   {review.changes.map(c=><section key={c.field}><h5>{copy.fields[c.field as keyof typeof copy.fields]}</h5><details><summary>{copy.before}</summary><pre className="sp-quote">{c.before}</pre></details><details open><summary>{copy.after}</summary><pre className="sp-quote">{c.after}</pre></details></section>)}
   <label className="sp-upgrade-confirm"><input type="checkbox" disabled={busy} checked={state.confirmed} onChange={e=>controller.confirm(e.target.checked)}/>{copy.confirm}</label>
  </div>:state.preview&&<div className="sp-upgrade-list">
   {actionable.map((role,i)=>{const blocked=role.packResources?.some(r=>r.status!=='current'||r.assigned===false);return <section key={role.sourceKey+':'+i} className="sp-upgrade-row"><div><h4>{role.name??copy.retired}</h4><p>{copy.statuses[role.status]}</p></div>
    {role.packResources&&<details open={!!blocked}><summary>{copy.package}</summary><ul>{role.packResources.map(r=><li key={r.sourceId}>{r.name} · {copy.resources[r.status]}{r.assigned===false&&` · ${copy.unassigned}`}{role.status==='content_update_available'&&['missing','conflict'].includes(r.status)&&<button type="button" disabled={busy||state.phase==='unknown'} onClick={()=>void controller.prepare(role.sourceKey,r.sourceId)}>{copy.skillReview}</button>}</li>)}</ul></details>}
    {role.status==='content_update_available'&&<><button type="button" disabled={busy||!!blocked||state.phase==='unknown'} onClick={()=>void controller.review(role.sourceKey)}>{copy.review}</button>{blocked&&<p className="sp-sub">{copy.blocked} {role.packResources?.every(r=>r.status==='current')&&<button type="button" disabled={busy||state.phase==='unknown'} onClick={()=>void controller.prepare(role.sourceKey,'bindings')}>{copy.bindingReview}</button>}</p>}</>}
   </section>;})}
   {!actionable.length&&<p>{copy.empty}</p>}
   {actionable.length>0&&state.preview.roles.length>actionable.length&&<p className="sp-sub">{copy.quiet}</p>}
  </div>}
 </div>{prep&&<label className="sp-upgrade-confirm"><input type="checkbox" disabled={busy} checked={state.confirmed} onChange={e=>controller.confirm(e.target.checked)}/>{copy.prepareConfirm}</label>}<div className="dk-sheet-actions">
  {activeReview&&<button type="button" disabled={busy} onClick={()=>controller.back()}>{copy.back}</button>}
  <button type="button" disabled={busy} onClick={onClose}>{copy.close}</button>
  {activeReview?<button type="button" className="primary" disabled={busy||!state.confirmed} onClick={()=>void controller.apply()}>{prep?copy.prepareSave:copy.save}</button>:<button type="button" disabled={busy} onClick={()=>void controller.load()}>{copy.reload}</button>}
 </div></dialog>;
}
