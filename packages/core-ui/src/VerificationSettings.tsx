import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import type {SessionClient} from './session';
import {VerificationController} from './verification-controller';
import {PreferenceGroup} from './Preferences';
import {UiIcon} from './ui-icons';
const notices={refused:'Password or code refused. Check them and try again.',limited:'Too many attempts. Wait before trying again.',expired:'Setup expired. Start again for a new key.',unknown:'Outcome unknown. Check your account status before trying again.'};
/** Settings › Account › Two-step sign-in (ST2): the state in place, turning it on or off in a small sheet (ST11, ST12). */
export function VerificationSettings({client}:{client:SessionClient}){
 const controller=useMemo(()=>new VerificationController(client),[client]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const [sheet,setSheet]=useState<'on'|'off'|'codes'|null>(null),[checked,setChecked]=useState(false);
 const guest=client.getSnapshot().user?.role==='guest';
 useEffect(()=>{if(guest)return;setChecked(true);void controller.load();return()=>controller.cancel();},[controller,guest]);
 if(guest)return null;
 const ready=state.phase==='ready'&&state.enabled!==undefined;
 return <PreferenceGroup title="Two-step sign-in"><div className="preference-row">
  <span className="preference-icon" data-on={state.enabled?'true':undefined}><UiIcon name="shield" size={18}/></span>
  <div className="preference-label"><strong>{!checked||state.phase==='loading'?'Checking verification…':state.phase==='unavailable'?'Could not check two-step sign-in':state.enabled?'On · your authenticator app':'Off · sign-in uses your password'}</strong><small>{state.enabled?'Needed for approvals with a code, approval rules and schedules.':'Add a code from an authenticator app and recovery codes. Approvals with a code, rules and schedules need it.'}</small></div>
  <div className="preference-control">{state.phase==='unavailable'?<button type="button" onClick={()=>void controller.load()}>Check again</button>:<button type="button" disabled={!ready} onClick={()=>setSheet(state.enabled?'off':'on')}>{state.enabled?'Turn off…':'Turn on…'}</button>}</div>
 </div>
 {state.enabled&&<div className="preference-row"><span className="preference-icon"><UiIcon name="key" size={18}/></span><div className="preference-label"><strong>Recovery codes{state.recoveryLeft!==undefined?` · ${state.recoveryLeft} of 8 left`:''}</strong><small>{state.recoveryLeft===0?'None left. Make new ones so a lost phone does not lock you out.':'Each one signs you in once if your phone is lost.'}</small></div><div className="preference-control"><button type="button" disabled={!ready} onClick={()=>setSheet('codes')}>New codes…</button></div></div>}
 {sheet==='codes'&&<RecoveryCodesSheet controller={controller} onClose={()=>{setSheet(null);controller.forgetCodes();void controller.load();}}/>}
 {(sheet==='on'||sheet==='off')&&<TwoStepSheet controller={controller} mode={sheet} onClose={()=>{setSheet(null);void controller.load();}}/>}</PreferenceGroup>;
}
function TwoStepSheet({controller,mode,onClose}:{controller:VerificationController;mode:'on'|'off';onClose:()=>void}){
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const dialog=useRef<HTMLDialogElement>(null),[password,setPassword]=useState(''),[code,setCode]=useState(''),[copied,setCopied]=useState(false);
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 const close=()=>{setPassword('');setCode('');dialog.current?.close();onClose();};
 const busy=state.phase==='working',setup=state.setup;
 // With the key shown, adding it to the app and typing its code happen on one screen.
 const step=mode==='off'?-1:setup?1:0;
 const submit=()=>{const p=password,c=code;setPassword('');setCode('');void controller.act(mode==='off'?'disable':setup?'confirm':'enroll',p,c);};
 const copy=async()=>{if(!setup)return;try{await navigator.clipboard.writeText(setup.secret);setCopied(true);}catch{setCopied(false);}};
 return <dialog ref={dialog} className="verification-sheet st-sheet" aria-labelledby="two-step-title" onCancel={event=>{event.preventDefault();close();}}>
  <h3 id="two-step-title">{mode==='off'?'Turn off two-step sign-in?':'Turn on two-step sign-in'}</h3>
  {mode==='on'&&<ol className="st-steps" aria-label="Steps">{['Password','Add to your app','Code'].map((s,i)=><li key={s} aria-current={i===step||setup&&i===2?'step':undefined} data-done={i<step||undefined}><span>{i<step?'✓':i+1}</span>{s}</li>)}</ol>}
  {mode==='off'&&<p>Approvals with a code, approval rules and schedule permissions stop working until you turn it on again.</p>}
  {state.phase==='unavailable'?<p role="alert">Two-step sign-in could not be checked. Close this and look at your account again.</p>:<>
   {state.notice&&<p role="alert">{notices[state.notice]}</p>}
   {setup&&<section className="st-key" aria-label="Authenticator setup"><p>Add this key in your authenticator app as Dpro.</p><div className="st-key-row"><code className="verification-setup-key">{setup.secret}</code><button type="button" onClick={()=>void copy()}><UiIcon name={copied?'check':'copy'} size={14}/>{copied?'Copied':'Copy'}</button></div><p className="fine-print">Keep it private. It works for ten minutes.</p></section>}
   <form id="two-step-form" onSubmit={event=>{event.preventDefault();submit();}}><fieldset disabled={busy}>
    <label htmlFor="verification-settings-password">{setup?'Your password again':'Password'}</label><input id="verification-settings-password" autoFocus type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={event=>setPassword(event.target.value)}/>
    {(mode==='off'||setup)&&<><label htmlFor="verification-settings-code">Code from your app</label><input id="verification-settings-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={event=>setCode(event.target.value.trim())}/></>}
   </fieldset></form>
   {busy&&<p role="status">Checking…</p>}
  </>}
  <div className="st-sheet-actions"><span className="fine-print">{mode==='off'||setup?'Every device signs out at the end; you sign in again.':''}</span><button type="button" onClick={close}>{mode==='off'?'Keep it on':'Cancel'}</button>{state.phase!=='unavailable'&&<button type="submit" form="two-step-form" className={mode==='off'?'danger':'primary'} disabled={busy}>{mode==='off'?'Turn off':setup?'Turn on':'Next'}</button>}</div>
 </dialog>;
}
/** ST11b: new recovery codes after the password and a code; shown once, kept only in memory. */
function RecoveryCodesSheet({controller,onClose}:{controller:VerificationController;onClose:()=>void}){
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const dialog=useRef<HTMLDialogElement>(null),[password,setPassword]=useState(''),[code,setCode]=useState(''),[saved,setSaved]=useState(false),[copied,setCopied]=useState(false);
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 const close=()=>{setPassword('');setCode('');dialog.current?.close();onClose();};
 const codes=state.codes,busy=state.phase==='working';
 const copy=async()=>{if(!codes)return;try{await navigator.clipboard.writeText(codes.join('\n'));setCopied(true);}catch{setCopied(false);}};
 return <dialog ref={dialog} className="verification-sheet st-sheet" aria-labelledby="recovery-title" onCancel={event=>{event.preventDefault();if(!codes||saved)close();}}>
  <h3 id="recovery-title">{codes?'Save your new recovery codes':'Make new recovery codes?'}</h3>
  {codes?<>
   <p>Each code signs you in once if your phone is lost. Your old codes no longer work.</p>
   <ol className="st-recovery-codes" aria-label="Recovery codes">{codes.map(c=><li key={c}><code>{c}</code></li>)}</ol>
   <div className="st-key-row"><span className="fine-print">They are shown only now.</span><button type="button" onClick={()=>void copy()}><UiIcon name={copied?'check':'copy'} size={14}/>{copied?'Copied':'Copy all'}</button></div>
   <label className="check"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I have saved these codes</label>
   <div className="st-sheet-actions"><span/><button type="button" className="primary" disabled={!saved} onClick={close}>Done</button></div>
  </>:<>
   <p>Your old codes stop working. You stay signed in on every device.</p>
   {state.phase==='unavailable'?<p role="alert">Two-step sign-in could not be checked. Close this and look at your account again.</p>:<>
    {state.notice&&<p role="alert">{notices[state.notice]}</p>}
    <form id="recovery-form" onSubmit={event=>{event.preventDefault();const p=password,c=code;setPassword('');setCode('');void controller.newRecoveryCodes(p,c);}}><fieldset disabled={busy}>
     <label htmlFor="recovery-password">Password</label><input id="recovery-password" autoFocus type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={e=>setPassword(e.target.value)}/>
     <label htmlFor="recovery-code">Code from your app</label><input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={e=>setCode(e.target.value.trim())}/>
    </fieldset></form>{busy&&<p role="status">Checking…</p>}</>}
   <div className="st-sheet-actions"><span/><button type="button" onClick={close}>Cancel</button>{state.phase!=='unavailable'&&<button type="submit" form="recovery-form" className="primary" disabled={busy}>Make new codes</button>}</div>
  </>}
 </dialog>;
}
