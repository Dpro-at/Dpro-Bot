import {useEffect,useRef,useState} from 'react';
import {displayName} from './session';
import type {SessionClient} from './session';
import {PreferenceGroup} from './Preferences';
import {VerificationSettings} from './VerificationSettings';
import {UiIcon} from './ui-icons';
const roleLine:Record<string,string>={owner:'Owner of this workspace',admin:'Admin',user:'Member',guest:'Guest · read only'};
/**
 * Settings › Account (ST2): who you are, two-step sign-in in place and the
 * sessions. Only this session is listed: the server has no device list yet.
 */
export function AccountSettings({client}:{client:SessionClient}){
 const state=client.getSnapshot(),user=state.user!;
 const [confirm,setConfirm]=useState(false);
 return <section className="account-settings" aria-label="Account">
  <div className="account-settings-head"><span className="team-avatar account-avatar" aria-hidden="true">{displayName(user).trim().slice(0,1).toUpperCase()||'?'}</span><div><strong><bdi>{displayName(user)}</bdi></strong><small><bdi>{user.email}</bdi> · {roleLine[user.role]??user.role}</small></div></div>
  <VerificationSettings client={client}/>
  <PreferenceGroup title="Signed in">
   <div className="preference-row"><span className="preference-icon"><UiIcon name="screen" size={18}/></span><div className="preference-label"><strong>This device</strong><small>{state.mode==='live'?'Now · this installation':state.mode==='mock'?'Now · offline practice with fictional data':'Now · preview'}</small></div></div>
   <div className="preference-row"><div className="preference-label"><strong>Sign out everywhere</strong><small>Ends every session of this account, on all devices.</small></div><div className="preference-control"><button type="button" onClick={()=>setConfirm(true)}>Sign out everywhere…</button></div></div>
  </PreferenceGroup>
  {confirm&&<SignOutEverywhere client={client} onClose={()=>setConfirm(false)}/>}
 </section>;
}
function SignOutEverywhere({client,onClose}:{client:SessionClient;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 return <dialog ref={dialog} className="verification-sheet st-sheet st-confirm" aria-labelledby="sign-out-everywhere" onCancel={event=>{event.preventDefault();onClose();}}>
  <h3 id="sign-out-everywhere">Sign out on every device?</h3>
  <p>Every device, this one too, will need to sign in again. Your agents keep working.</p>
  <div className="st-sheet-actions"><button type="button" autoFocus onClick={onClose}>Cancel</button><button type="button" className="danger" disabled={busy} onClick={()=>{setBusy(true);void client.logoutAllDevices();}}>Sign out everywhere</button></div>
 </dialog>;
}
