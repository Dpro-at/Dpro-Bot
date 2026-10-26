import {PreferenceGroup} from './Preferences';
import {useEffect,useState} from 'react';
import type {SessionClient} from './session';
import {ClaudeCodeIcon,CodexIcon,GeminiIcon} from './brand-icons';
const APPS=[{id:'subscription:claude',name:'Claude Code',Icon:ClaudeCodeIcon,signIn:'Run claude in your terminal to sign in'},{id:'subscription:codex',name:'Codex',Icon:CodexIcon,signIn:'Run codex login in your terminal to sign in'},{id:'subscription:gemini',name:'Google Gemini',Icon:GeminiIcon,signIn:'Run agy in your terminal to sign in'}] as const;
/** Read-only availability, from the same catalogue as the chat reply selector. */
export function ReplyAppsSettings({client}:{client:SessionClient}){
 const [apps,setApps]=useState<string[]|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let stopped=false;setError(false);void client.request({method:'GET',path:'/api/models'} as never).then(r=>{if(stopped)return;const b=r.body as {models?:{id:string;provider:string}[]};if(r.status!==200||!Array.isArray(b.models)){setError(true);return;}setApps(b.models.filter(x=>x.provider==='subscription').map(x=>x.id));}).catch(()=>{if(!stopped)setError(true);});return()=>{stopped=true;};},[client]);
 return <PreferenceGroup title="Coding apps that can answer in Chat" note="Ready means the app is installed here; its account is checked when you send.">{APPS.map(({id,name,Icon,signIn})=>{const ready=!!apps?.includes(id);return <div className="preference-row" key={id}><span className="preference-icon"><Icon size={18}/></span><div className="preference-label"><strong>{name}</strong><small>{ready?'Signs in from your terminal':signIn}</small></div><span className="preference-status st-state" data-state={error?'error':apps===null?'checking':ready?'ready':'off'}><i aria-hidden="true"/>{error?'Could not check':apps===null?'Checking…':ready?'Ready':'Not on this computer'}</span></div>;})}</PreferenceGroup>;
}
