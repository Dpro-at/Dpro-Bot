import {useEffect,useState} from 'react';
import type {SessionClient} from './session';
import {UiIcon} from './ui-icons';
import {addonName} from './skill-display';
import {ClaudeCodeIcon,CodexIcon} from './brand-icons';
import {CHAT_ADDONS_PATH} from './chat-addons-contract.js';
type Addon={name:string;source:'claude-code'|'codex';kind:'plugin'|'hook';enabled:boolean|null;installed:boolean|null;count:number;label?:string};
const APPS=[{source:'claude-code',name:'Claude Code',Icon:ClaudeCodeIcon},{source:'codex',name:'Codex',Icon:CodexIcon}] as const;
const plural=(n:number,one:string)=>`${n} ${one}${n===1?'':'s'}`;
/** Sidebar search over the add-on names (A1). */
export const matchAddons=(items:Addon[],query:string)=>{const q=query.trim().toLowerCase();return q?items.filter(x=>`${x.label??''} ${x.name}`.toLowerCase().includes(q)):items;};
/** One plain state per add-on; a plugin listed in settings but missing from disk says so (A9). */
export const addonState=(x:Pick<Addon,'kind'|'enabled'|'installed'>)=>x.kind==='hook'?'Not run here':x.installed===false?'Not on this computer':x.enabled===true?'On':x.enabled===false?'Off':'Unknown';
/**
 * Apps › Add-ons in my coding apps (AA2a): what Claude Code and Codex have
 * installed, one card per app. Read only; hook commands and settings stay
 * private and nothing runs. Dpro's own connections and skills are links.
 */
export function AppsAddons({client,refresh,query='',onConnections,onSkills}:{client:SessionClient;refresh:number;query?:string;onConnections:()=>void;onSkills?:()=>void}){
 const [data,setData]=useState<{items:Addon[];sources:{source:string;status:string}[]}|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let stopped=false;setError(false);void client.request({method:'GET',path:CHAT_ADDONS_PATH} as never).then(r=>{if(stopped)return;if(r.status!==200){setError(true);return;}setData(r.body as never);}).catch(()=>{if(!stopped)setError(true);});return()=>{stopped=true;};},[client,refresh]);
 return <div className="apps-addons">
  {error&&<p role="alert" className="apps-empty">The add-ons could not be read. Read again to try once more.</p>}
  {!data&&!error&&<p role="status" className="apps-empty">Reading add-ons…</p>}
  {data&&<div className="apps-addon-cards">{APPS.map(({source,name,Icon})=>{const all=data.items.filter(x=>x.source===source),items=matchAddons(all,query),plugins=items.filter(x=>x.kind==='plugin').length,hooks=items.filter(x=>x.kind==='hook').length,missing=data.sources.find(x=>x.source===source)?.status==='missing';
   return <section key={source} className="apps-addon-card" aria-label={name}><header><Icon size={22}/><strong>{name}</strong><small>{query.trim()&&all.length?`${items.length} of ${all.length} match`:items.length?[plugins&&plural(plugins,'plugin'),hooks&&plural(hooks,'hook group')].filter(Boolean).join(' · '):missing?'Not on this computer':'Nothing installed'}</small></header>
    {items.length?<ul>{items.map((x,i)=><li key={x.name+i}><UiIcon name={x.kind==='hook'?'history':'puzzle'} size={14}/><span title={x.name}>{x.kind==='hook'?`${x.label??x.name} (${plural(x.count,'rule')})`:addonName(x.label??x.name)}</span><small data-state={x.installed===false&&x.kind!=='hook'?'missing':undefined}>{addonState(x)}</small></li>)}</ul>:<p className="fine-print">{query.trim()&&all.length?'No add-on matches your search.':missing?`${name} was not found in this computer’s home folder.`:'No plugins or hooks found.'}</p>}
   </section>;})}</div>}
  <p className="apps-help">Dpro’s own: <button type="button" className="link-button" onClick={onConnections}>MCP connections</button>{onSkills&&<> · <button type="button" className="link-button" onClick={onSkills}>Skills</button></>} · Which coding apps can answer in Chat: Settings › Replies.</p>
 </div>;
}
