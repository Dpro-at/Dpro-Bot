import {useCallback,useEffect,useState} from 'react';
import type {SessionClient} from './session';
import {PreferenceGroup,PreferenceRow} from './Preferences';
import {UiIcon} from './ui-icons';
import {UPDATES_PATH,UPDATES_CHECK_PATH} from './account-settings-contract.js';
import type {UpdateState} from './account-settings-contract.js';
const when=(t:number)=>new Date(t).toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
/**
 * Settings › About and updates (owner). Reading never goes online; "Check now"
 * asks the server to look once. Installing stays the `agent-player update`
 * command: it stops Girru, makes a backup and goes back if anything fails.
 */
export function UpdateSettings({client}:{client:SessionClient}){
 const [state,setState]=useState<UpdateState|null|'error'>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const take=(r:{status:number;body:unknown})=>{const b=r.body as UpdateState;return r.status===200&&b&&typeof b==='object'&&'kind'in b?b:'error' as const;};
 const load=useCallback(async()=>{try{setState(take(await client.request({method:'GET',path:UPDATES_PATH} as never)));}catch{setState('error');}},[client]);
 useEffect(()=>{void load();},[load]);
 const check=async()=>{setBusy(true);setNotice('');try{const next=take(await client.request({method:'POST',path:UPDATES_CHECK_PATH} as never));setState(next);
  setNotice(next==='error'?'Could not look for updates. Try again later.':next.looked?'Looked just now.':'Looked a moment ago; try again in half a minute.');}catch{setNotice('Could not look for updates. Try again later.');}finally{setBusy(false);}};
 if(state===null)return <PreferenceGroup title="Updates"><PreferenceRow title="Looking at this copy…" icon="refresh"><span/></PreferenceRow></PreferenceGroup>;
 if(state==='error')return <PreferenceGroup title="Updates"><PreferenceRow title="Updates could not be read" icon="refresh"><button type="button" className="tool" aria-label="Look again" title="Look again" onClick={()=>void load()}><UiIcon name="refresh" size={14}/></button></PreferenceRow></PreferenceGroup>;
 if(state.kind==='installed'||!state.follows)return <PreferenceGroup title="Updates"><PreferenceRow title="Manual updates" description={state.kind==='installed'?'Automatic updates are not available in this build. Install a new version by hand.':'This copy follows no branch, so there is nothing to compare with. Install a new version by hand.'} icon="refresh"><span className="preference-status">Version {state.version}</span></PreferenceRow></PreferenceGroup>;
 const waiting=(state.behind??0)>0;
 return <PreferenceGroup title="Updates" note={`The check only reads what was last downloaded; Check now looks online once. Install with ${state.command??'agent-player update'} in a terminal: it stops Girru, makes a backup and goes back if anything fails.`}>
  <div className="preference-row"><span className="preference-icon" data-on={waiting?'true':undefined}><UiIcon name={waiting?'download':'check'} size={18}/></span>
   <div className="preference-label"><strong>{state.behind===null?'Could not compare with the update source':waiting?`${state.behind} update${state.behind===1?'':'s'} waiting`:'Up to date'}</strong><small title={`${state.branch??'no branch'} follows ${state.follows}`}>Version {state.version}{state.lookedAt?` · last looked ${when(state.lookedAt)}`:' · never looked online'}{state.ahead?` · ${state.ahead} local change${state.ahead===1?'':'s'} not in the updates`:''}</small></div>
   <div className="preference-control"><button type="button" disabled={busy} onClick={()=>void check()}><UiIcon name="refresh" size={14}/>{busy?'Looking…':'Check now'}</button></div>
  </div>
  {waiting&&<div className="preference-row"><div className="preference-label"><strong>Install</strong><small>Run this in a terminal on this computer.</small></div><div className="preference-control"><code className="st-command">{state.command??'agent-player update'} --stop</code></div></div>}
  {notice&&<p role="status" className="preference-inline-notice">{notice}</p>}
 </PreferenceGroup>;
}
