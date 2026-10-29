import {useEffect,useState} from 'react';
import {UiIcon} from './ui-icons';

export type AppUpdateView={version:string;checkedAt:string|null;busy:null|'checking'|'downloading'|'backing-up'|'installing';error:string|null;update:null|{version:string;publishedAt:string|null;notes:string;page:string;canInstall:boolean}};
type Bridge={state:()=>Promise<AppUpdateView|null>;check:()=>Promise<AppUpdateView|null>;install:()=>Promise<AppUpdateView|null>;openRelease:()=>Promise<null>;onState:(cb:(v:AppUpdateView)=>void)=>()=>void};
/** The installed app's updater (desktop preload); absent in a browser or a dev run. */
export const appUpdateBridge=():Bridge|null=>{const b=typeof window==='undefined'?undefined:(window as unknown as {dproApp?:{appUpdate?:Bridge}}).dproApp?.appUpdate;return b&&typeof b.state==='function'?b:null;};
const BUSY:Record<string,string>={checking:'Looking for a new version…',downloading:'Downloading the new version…','backing-up':'Backing up your data…',installing:'Putting the new version in place…'};
const day=(at:string|null)=>at?new Date(at).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
/** "What is new": the release notes as short lines (no Markdown rendering, no links). */
export const noteLines=(notes:string)=>notes.split('\n').map(l=>l.replace(/^[\s#*>-]+/,'').replace(/[*_`]/g,'').trim()).filter(Boolean).slice(0,8);

/**
 * Settings › About and updates in the installed app (MACAPP-01, board MacApp1):
 * the version, a new one when GitHub has it (looked for once a day), and one main
 * button, "Back up and update". It never updates by itself.
 */
export function AppUpdateSettings({bridge}:{bridge:Bridge}){
 const [view,setView]=useState<AppUpdateView|null>(null);
 useEffect(()=>{let live=true;void bridge.state().then(v=>{if(live&&v)setView(v);}).catch(()=>{});const off=bridge.onState(v=>{if(live)setView(v);});return()=>{live=false;off();};},[bridge]);
 if(!view)return null;
 const u=view.update,busy=view.busy;
 return <section className="preference-section app-update" aria-label="Updates">
  <div className="app-update-head"><h3>Updates</h3>
   {u?<button type="button" className="primary" disabled={!!busy||!u.canInstall} onClick={()=>void bridge.install()} title={u.canInstall?'Back up and update':'Download it from the release page'}><UiIcon name="download" size={14}/>Back up and update</button>
     :<button type="button" disabled={!!busy} onClick={()=>void bridge.check()} title="Look for a new version now"><UiIcon name="refresh" size={14}/>Check now</button>}
  </div>
  <div className="preference-group">
   <div className="preference-row"><span className="preference-icon"><UiIcon name="info" size={17}/></span><div className="preference-label"><strong>Version</strong></div><div className="preference-control"><span className="preference-status">Girru {view.version}</span></div></div>
   <div className="preference-row"><span className="preference-icon"><UiIcon name="download" size={17}/></span><div className="preference-label"><strong>Update</strong>{view.checkedAt&&<small>Looked {day(view.checkedAt)}</small>}</div><div className="preference-control"><span className="preference-status">{u?<>Girru {u.version} is ready{u.publishedAt?` · ${day(u.publishedAt)}`:''}</>:view.checkedAt?'Girru is up to date':'Not looked yet'}</span></div></div>
   <div className="preference-row"><span className="preference-icon"><UiIcon name="shield" size={17}/></span><div className="preference-label"><strong>Before updating</strong></div><div className="preference-control"><span className="preference-status">A backup is made first</span></div></div>
  </div>
  {u&&noteLines(u.notes).length>0&&<div className="app-update-notes"><strong>What is new in {u.version}</strong><ul>{noteLines(u.notes).map((l,i)=><li key={i}>{l}</li>)}</ul></div>}
  {u&&!u.canInstall&&<p className="preference-note">This computer updates from the release page. <button type="button" className="link" onClick={()=>void bridge.openRelease()}>Open the release page</button></p>}
  {busy&&<p role="status" className="preference-note">{BUSY[busy]}</p>}
  {view.error&&<p role="alert" className="preference-note app-update-error"><UiIcon name="alert" size={13}/>{view.error}</p>}
  <p className="preference-note">Girru looks for a new version once a day (the releases of Girru on GitHub). It never updates by itself.</p>
 </section>;
}
