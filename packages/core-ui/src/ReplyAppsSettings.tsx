import {PreferenceGroup,PreferenceRow} from './Preferences';
import {UiIcon} from './ui-icons';
import {useEffect,useState} from 'react';
import type {SessionClient} from './session';
import {ClaudeCodeIcon,CodexIcon,GeminiIcon} from './brand-icons';
import {PluginsSheet,pluginsLine,useCodingAppPlugins} from './AppsAddons';
import type {CodingApp} from './AppsAddons';
const APPS=[{id:'subscription:claude',name:'Claude Code',plugins:'claude-code' as CodingApp,Icon:ClaudeCodeIcon,signIn:'Run claude in your terminal to sign in'},{id:'subscription:codex',name:'Codex',plugins:'codex' as CodingApp,Icon:CodexIcon,signIn:'Run codex login in your terminal to sign in'},{id:'subscription:gemini',name:'Google Gemini',plugins:null,Icon:GeminiIcon,signIn:'Antigravity CLI · run agy in your terminal to sign in'}] as const;
/** Read-only availability, from the same catalogue as the chat reply selector; each coding app's plugins open in a sheet (board AP1). */
export function ReplyAppsSettings({client,onOpenChat,onOpenStore}:{client:SessionClient;onOpenChat?:()=>void;onOpenStore?:(app:CodingApp)=>void}){
 const [apps,setApps]=useState<string[]|null>(null),[error,setError]=useState(false),[refresh,setRefresh]=useState(0),[sheet,setSheet]=useState<CodingApp|null>(null),plugins=useCodingAppPlugins(client);
 useEffect(()=>{let stopped=false;setError(false);void client.request({method:'GET',path:'/api/models'} as never).then(r=>{if(stopped)return;const b=r.body as {models?:{id:string;provider:string}[]};if(r.status!==200||!Array.isArray(b.models)){setError(true);return;}setApps(b.models.filter(x=>x.provider==='subscription').map(x=>x.id));}).catch(()=>{if(!stopped)setError(true);});return()=>{stopped=true;};},[client,refresh]);
 return <PreferenceGroup title="Coding apps that can answer in Chat" note="Ready means the app is installed here; its account is checked when you send.">{APPS.map(({id,name,plugins:app,Icon,signIn})=>{const ready=!!apps?.includes(id),line=app&&plugins?pluginsLine(plugins,app):'';return <div className="preference-row" key={id}><span className="preference-icon"><Icon size={18}/></span><div className="preference-label"><strong>{name}</strong><small>{ready?'Signs in from your terminal':signIn}{line&&app&&<> · <button type="button" className="link-button" onClick={()=>onOpenStore?onOpenStore(app):setSheet(app)}>{line}</button></>}</small></div><span className="preference-status st-state" data-state={error?'error':apps===null?'checking':ready?'ready':'off'}><i aria-hidden="true"/>{error?'Could not check':apps===null?'Checking…':ready?'Ready':'Not on this computer'}</span></div>;})}
  <PreferenceRow title="Reply source" description="Choose the app used for a conversation in Chat." icon="message"><button type="button" className="tool" title="Refresh coding app availability" aria-label="Refresh coding app availability" onClick={()=>{setApps(null);setRefresh(n=>n+1);}}><UiIcon name="refresh" size={14}/></button>{onOpenChat&&<button type="button" onClick={onOpenChat}>Open Chat</button>}</PreferenceRow>
  {sheet&&plugins&&<PluginsSheet app={sheet} items={plugins} onClose={()=>setSheet(null)}/>}</PreferenceGroup>;
}
