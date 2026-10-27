import {useEffect,useId,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import type {SessionClient} from './session';
import {SkillInstallController} from './skill-install-controller';
import {UiIcon} from './ui-icons';
import {SkillTile} from './SkillsWorkspace';
import {skillTitle} from './skill-display';
type Source=Readonly<{commit:string;sourcePath:string;targetName:string}>;
/** Selected manual-owner review. Mounting the parent catalogue never installs a skill. */
export function SkillInstallSheet({client,source,onClose}:{client:SessionClient;source:Source;onClose:(result:'applied'|'unknown'|'cancelled')=>void}){
 const controller=useMemo(()=>new SkillInstallController(client,{commit:source.commit,sourcePath:source.sourcePath,targetName:source.targetName}),[client,source.commit,source.sourcePath,source.targetName]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),session=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot),[code,setCode]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),dismiss=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null),confirm=useRef<HTMLButtonElement>(null),title=useId(),form=useId(),callback=useRef(onClose);callback.current=onClose;
 const owner=session.phase==='authenticated'&&session.user?.role==='owner';
 const close=()=>{const phase=controller.getSnapshot().phase;controller.cancel();setCode('');dialog.current?.close();callback.current(phase==='applied'?'applied':phase==='unknown'||phase==='applying'?'unknown':'cancelled');};
 useEffect(()=>{
  if(!owner)return;const invoker=document.activeElement,element=dialog.current,epoch=client.getSnapshot().epoch;let ended=false;
  element?.showModal();dismiss.current?.focus();void controller.load();
  const unsubscribe=client.subscribe(()=>{const current=client.getSnapshot();if(!ended&&(current.epoch!==epoch||current.phase!=='authenticated'||current.user?.role!=='owner')){ended=true;const phase=controller.getSnapshot().phase;controller.cancel();setCode('');element?.close();callback.current(phase==='applying'||phase==='unknown'?'unknown':'cancelled');}});
  return()=>{ended=true;unsubscribe();controller.cancel();setCode('');element?.close();if(invoker instanceof HTMLElement&&invoker.isConnected)invoker.focus();};
 },[client,controller,owner]);
 useEffect(()=>{if(state.phase==='code')input.current?.focus();if(state.phase==='verified')confirm.current?.focus();if(['applied','unknown','unavailable'].includes(state.phase))dismiss.current?.focus();},[state.phase]);
 if(!owner)return null;
 const review=state.review,busy=['loading','loading-code','verifying','applying'].includes(state.phase),done=['applied','unknown','unavailable'].includes(state.phase);
 const step=['code','loading-code','verifying'].includes(state.phase)?2:['verified','applying','applied'].includes(state.phase)?3:1,name=skillTitle(review?.name??source.targetName);
 return <dialog ref={dialog} className="verification-sheet skill-install-sheet sk-install" aria-labelledby={title} onCancel={event=>{event.preventDefault();close();}}>
  <header className="sk-install-head"><SkillTile name={source.targetName} size={34}/><span><h3 id={title}>Add {name}</h3><small>Official skills · fixed version</small></span></header>
  <ol className="sk-steps" aria-label="Steps">{['Read it','Your code','Add'].map((label,i)=><li key={label} aria-current={step===i+1?'step':undefined} data-done={step>i+1||state.phase==='applied'||undefined}><span>{step>i+1||state.phase==='applied'&&i===2?<UiIcon name="check" size={11}/>:i+1}</span>{label}</li>)}</ol>
  <div className="skill-install-body">
   {review&&<><p>{review.description}</p>
    <section className="sk-install-guide" aria-label="Reviewed skill content"><pre tabIndex={0}>{review.content}</pre></section>
    <details className="skill-install-source"><summary>Where it comes from</summary><dl><dt>File</dt><dd>{source.sourcePath}/SKILL.md</dd><dt>Version</dt><dd>{review.version}</dd></dl></details>
   </>}
   {busy&&<p role="status">{state.phase==='applying'?'Adding the guide you read…':state.phase==='verifying'?'Checking your code…':state.phase==='loading-code'?'Getting ready for your code…':'Loading the guide…'}</p>}
   {state.notice&&<p role="alert">{state.notice==='refused'?'That code was not accepted. Check your authenticator and try again.':state.notice==='limited'?'Too many attempts. Close this and wait before trying again.':state.notice==='expired'?'This took too long. Close it and read the skill again.':'Adding is not available right now. Close this and load the catalogue again.'}</p>}
   {(state.phase==='code'||state.phase==='verifying')&&<form id={form} onSubmit={event=>{event.preventDefault();const submitted=code;setCode('');void controller.verify(submitted);}}><fieldset disabled={state.phase==='verifying'}><label>Authenticator code<input ref={input} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={event=>setCode(event.target.value.replace(/[^0-9]/g,'').slice(0,6))}/></label><p className="fine-print">Your code alone does not add the skill.</p></fieldset></form>}
   {state.phase==='verified'&&<p role="status">Code accepted. Add exactly the guide you read?</p>}
   {state.phase==='applied'&&<p role="status">{review?.updating?'Guide updated.':'Added to Girru.'} It stays unassigned until you give it to an agent.</p>}
   {state.phase==='unknown'&&<p role="alert">The result could not be confirmed. Close this and load the catalogue again before trying again.</p>}
  </div>
  <footer className="actions"><span className="sk-muted">{review?.updating?'Updates guidance only.':'Adds guidance only.'} No tools, no agents.</span><button ref={dismiss} type="button" onClick={close}>{done?'Close':'Cancel'}</button>
   {state.phase==='review'&&<button className="primary" type="button" onClick={()=>void controller.startVerification()}>I read it · Continue</button>}
   {(state.phase==='code'||state.phase==='verifying')&&<button className="primary" type="submit" form={form} disabled={state.phase==='verifying'}>Verify code</button>}
   {state.phase==='verified'&&<button ref={confirm} className="primary" type="button" onClick={()=>void controller.apply()}>Add skill</button>}
  </footer>
 </dialog>;
}
