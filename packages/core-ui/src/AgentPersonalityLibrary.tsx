import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {SessionClient} from './session';
import {ProfileEditor} from './PersonalityLibrary';
import {libraryRpc as rpc,P,type Entry,type Profile} from './personality-library';
import type {AgentCardController,PartDone} from './agent-card';
import type {PersonalityController} from './personality';
import {PersonalityReview} from './PersonalityReview';
import {Sheet} from './desktop-ui';
import {UiIcon} from './ui-icons';
import {personalityColour} from './agent-look';
import {forgetFacts} from './agent-facts';

type Assignment={id:string;revision:number;linked:boolean;profile:Profile}|null;
/** A personality's face: the smile on its own colour. */
export function PersonalityFace({name,size=46}:{name?:string|null;size?:number}){
 const c=personalityColour(name);
 return <span className="ag-pface" aria-hidden="true" style={{inlineSize:size,blockSize:size,color:c,background:`${c}22`,boxShadow:`inset 0 0 0 1.5px ${c}66`}}><UiIcon name="smile" size={Math.round(size*.52)}/></span>;
}

/**
 * PL5: which personality the agent has, whether it follows library changes,
 * its own small adjustments (saved as you go), its own suggestions one at a
 * time, and its versions. Lock stops every change until it is unlocked.
 */
export function AgentPersonalityLibrary({card,personality,onDone}:{card:AgentCardController;personality?:PersonalityController;onDone:PartDone}){
 const s=useSyncExternalStore(card.subscribe,card.getSnapshot,card.getSnapshot);
 const client=card.client as SessionClient,agentId=s.agentId,version=s.persona?.version??0,locked=!!s.persona?.locked;
 const [assignment,setAssignment]=useState<Assignment|undefined>(undefined),[draft,setDraft]=useState<Profile|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[choosing,setChoosing]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);const saved=useRef<Profile|null>(null);
 useEffect(()=>{let live=true;void rpc<{assignment:Assignment}>(client,'GET',`${P}/assigned/${agentId}`).then(r=>{if(live){setAssignment(r.assignment);setDraft(r.assignment?structuredClone(r.assignment.profile):null);saved.current=r.assignment?structuredClone(r.assignment.profile):null;}}).catch(()=>{if(live){setAssignment(null);setNotice('Could not read the assigned personality.');}});return()=>{live=false;};},[client,agentId,version]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const changed=()=>{forgetFacts(client,agentId);void card.load();};
 const current=()=>card.getSnapshot().persona?.version??version;
 async function tune(profile:Profile,before:Profile|null,undo=true){
  setBusy(true);setNotice('');
  try{await rpc(client,'POST',`${P}/assigned/${agentId}/tune`,{profile,expectedVersion:current()});changed();if(undo&&before)onDone('Personality adjusted',()=>tune(before,null,false));}
  catch{setNotice('Changed elsewhere or locked. Your adjustment was not saved; the latest is shown.');changed();}
  finally{setBusy(false);}
 }
 function adjust(next:Profile){setDraft(next);clearTimeout(timer.current);const before=saved.current;timer.current=setTimeout(()=>{if(JSON.stringify(next)!==JSON.stringify(before)){saved.current=next;void tune(next,before);}},900);}
 async function follow(linked:boolean){if(!assignment)return;setBusy(true);try{await rpc(client,'POST',`${P}/assigned/${agentId}/mode`,{linked,expectedVersion:current()});setAssignment({...assignment,linked});forgetFacts(client,agentId);onDone(linked?'Follows library changes':'Keeps its own copy',()=>follow(!linked));}catch{setNotice('Could not change this. Read the agent again and try once more.');}finally{setBusy(false);}}
 async function assign(entry:{id:string;revision:number;name:string},undoTo:Assignment|undefined){
  setBusy(true);setNotice('');
  try{await rpc(client,'POST',`${P}/assigned/${agentId}`,{id:entry.id,revision:entry.revision,expectedVersion:current(),linked:assignment?.linked??true});changed();
   onDone(`Now ${entry.name}`,undoTo?()=>assign({id:undoTo.id,revision:undoTo.revision,name:undoTo.profile.name},undefined):undefined);}
  catch{setNotice('Could not change the personality. The agent or the library changed; read it again first.');}
  finally{setBusy(false);}
 }
 async function lock(){const next=!locked;await card.lock(next);if(card.getSnapshot().saved)onDone(next?'Personality locked':'Personality unlocked',()=>void card.lock(!next));}
 const off=locked||busy||s.phase==='saving';
 const name=assignment?.profile.name;
 return <div className="ag-persona">
  <div className="ag-part">
   <div className="ag-pcard"><PersonalityFace name={name}/>
    <span className="ag-pcard-text"><b>{assignment===undefined?'Reading…':name??'Its own settings'}</b><small dir="auto">{assignment?.profile.description||(assignment===null?'Not from the library. Pick one to start from.':'')}</small></span>
    {assignment&&<label className="ag-switch-label" title={`When ${name} changes in the library, this agent gets it after your review`}><button type="button" role="switch" className="ag-switch" aria-checked={assignment.linked} aria-label="Follows library changes" disabled={off} onClick={()=>void follow(!assignment.linked)}><i/></button>Follows library changes</label>}
    <button type="button" disabled={off} onClick={()=>setChoosing(true)}>Change…</button>
    <button type="button" className="dk-icon" aria-label={locked?'Unlock the personality':'Lock the personality'} title={locked?'Unlock: allow changes again (⌘L)':'Lock: no changes until you unlock (⌘L)'} aria-pressed={locked} disabled={busy||s.phase==='saving'} onClick={()=>void lock()}><UiIcon name="lock" size={16}/></button>
   </div>
   {locked&&<p className="ag-muted"><UiIcon name="lock" size={13}/> Locked: nothing changes until you unlock it.</p>}
   {notice&&<p className="ag-alert" role="status">{notice}</p>}
   {personality&&<PersonalityReview controller={personality} agentName={s.agent?.name??'This agent'}/>}
   {draft&&assignment&&<section aria-label="Its own adjustments" className="ag-own"><div className="ag-head-row"><b>Its own adjustments</b><small className="ag-muted">only this agent · saved as you go</small></div>
    <fieldset disabled={off}><ProfileEditor value={draft} onChange={adjust}/></fieldset></section>}
  </div>
  <aside className="ag-versions" aria-label="Versions"><small className="ag-label">Versions</small>
   {s.versions?s.versions.map(v=>{const now=v.version===version;return <div key={v.version} className="ag-version" data-current={now||undefined}><span><span>Version {v.version}{v.note?` · ${v.note}`:''}</span><small>{v.source==='seed'?'first version':(v.createdAt??'').slice(0,16).replace('T',' ')}</small></span>
    {now?<small className="ag-ok">Now</small>:<button type="button" className="dk-icon" aria-label={`Restore version ${v.version}`} title="Restore as a new version" disabled={off} onClick={()=>void card.rollback(v.version).then(()=>{if(card.getSnapshot().saved){forgetFacts(client,agentId);onDone(`Version ${v.version} restored`);}})}><UiIcon name="history" size={14}/></button>}</div>;}):<p className="ag-muted" role="status">Reading versions…</p>}
   <small className="ag-muted">A personality changes how it talks, never its skills or permissions.</small>
  </aside>
  {choosing&&<ChoosePersonality client={client} current={assignment?.id} onClose={()=>setChoosing(false)} onPick={e=>{setChoosing(false);void assign({id:e.id,revision:e.revision,name:e.profile.name},assignment??undefined);}}/>}
 </div>;
}

/** The library's personalities as faces; one click picks. */
export function PersonalityFaces({client,value,onPick,disabled,autoPick}:{client:SessionClient;value?:string;onPick:(e:Entry)=>void;disabled?:boolean;autoPick?:string}){
 const [entries,setEntries]=useState<Entry[]|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setFailed(false);void rpc<{personalities:Entry[]}>(client,'GET',P).then(r=>{if(!live)return;const all=r.personalities.filter(e=>!e.archived);setEntries(all);const first=autoPick&&!value&&all.find(e=>e.id===autoPick);if(first)onPick(first);}).catch(()=>{if(live)setFailed(true);});return()=>{live=false;};},[client,retry]);
 if(failed)return <p role="status">The personality library could not be read. <button type="button" className="link-button" onClick={()=>setRetry(n=>n+1)}>Try again</button></p>;
 if(!entries)return <p className="ag-muted" role="status">Reading personalities…</p>;
 return <div className="ag-faces" role="radiogroup" aria-label="Personality">{entries.map(e=><button type="button" role="radio" aria-checked={value===e.id} key={e.id} className="ag-face-card" disabled={disabled} onClick={()=>onPick(e)}><PersonalityFace name={e.profile.name} size={34}/><b>{e.profile.name}</b><small dir="auto">{e.profile.description}</small></button>)}</div>;
}
function ChoosePersonality({client,current,onPick,onClose}:{client:SessionClient;current?:string;onPick:(e:Entry)=>void;onClose:()=>void}){
 return <Sheet title="Choose a personality" wide onClose={onClose} actions={<button type="button" onClick={onClose}>Cancel</button>}><PersonalityFaces client={client} value={current} onPick={onPick}/><p className="fine-print">Edit the library's personalities in Personalities.</p></Sheet>;
}
