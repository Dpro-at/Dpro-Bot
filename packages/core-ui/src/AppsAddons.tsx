import {useEffect,useState} from 'react';
import type {SessionClient} from './session';
import {UiIcon} from './ui-icons';
import {addonName} from './skill-display';
import {Sheet} from './desktop-ui';
import {CHAT_ADDONS_PATH} from './chat-addons-contract.js';
export type Addon={name:string;source:'claude-code'|'codex';kind:'plugin'|'hook';enabled:boolean|null;installed:boolean|null;count:number;label?:string};
export type CodingApp='claude-code'|'codex';
export const CODING_APP_NAMES:Record<CodingApp,string>={'claude-code':'Claude Code',codex:'Codex'};
const plural=(n:number,one:string)=>`${n} ${one}${n===1?'':'s'}`;
/** Search over the plugin names (A1). */
export const matchAddons=(items:Addon[],query:string)=>{const q=query.trim().toLowerCase();return q?items.filter(x=>`${x.label??''} ${x.name}`.toLowerCase().includes(q)):items;};
/** One plain state per add-on; a plugin listed in settings but missing from disk says so (A9). */
export const addonState=(x:Pick<Addon,'kind'|'enabled'|'installed'>)=>x.kind==='hook'?'Not run here':x.installed===false?'Not on this computer':x.enabled===true?'On':x.enabled===false?'Off':'Unknown';
/** The quiet line on a coding app in Settings › Models and replies: "20 plugins" (board AP1). */
export const pluginsLine=(items:Addon[],app:CodingApp)=>{const n=items.filter(x=>x.source===app&&x.kind==='plugin').length;return n?plural(n,'plugin'):'';};

/** What Claude Code and Codex have installed, read once for Settings › Models and replies. Nothing runs. */
export function useCodingAppPlugins(client:SessionClient,enabled=true){
 const [items,setItems]=useState<Addon[]|null>(null);
 useEffect(()=>{if(!enabled)return;let stopped=false;void client.request({method:'GET',path:CHAT_ADDONS_PATH} as never).then(r=>{if(!stopped&&r.status===200)setItems((r.body as {items:Addon[]}).items);}).catch(()=>{/* No line: the rest of Replies still works. */});return()=>{stopped=true;};},[client,enabled]);
 return items;
}

/**
 * Claude Code plugins / Codex plugins (board AP1): the plugins and hook groups
 * that coding app has installed, read only. Hook commands and settings stay
 * private; Girru runs none of them.
 */
export function PluginsSheet({app,items,onClose}:{app:CodingApp;items:Addon[];onClose:()=>void}){
 const [query,setQuery]=useState(''),name=CODING_APP_NAMES[app];
 const all=items.filter(x=>x.source===app),shown=matchAddons(all,query),plugins=shown.filter(x=>x.kind==='plugin'),hooks=shown.filter(x=>x.kind==='hook');
 return <Sheet title={`${name} plugins`} onClose={onClose} actions={<button type="button" className="primary" onClick={onClose}>Done</button>}>
  <label className="dk-search plugins-search"><UiIcon name="search" size={13}/><input type="search" aria-label={`Search ${name} plugins`} placeholder="Search plugins" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  {shown.length?<ul className="plugins-list">{[...plugins,...hooks].map((x,i)=><li key={x.name+i}><UiIcon name={x.kind==='hook'?'history':'puzzle'} size={14}/><span title={x.name}>{x.kind==='hook'?`${x.label??x.name} (${plural(x.count,'rule')})`:addonName(x.label??x.name)}</span><small data-state={x.installed===false&&x.kind!=='hook'?'missing':undefined}>{addonState(x)}</small></li>)}</ul>
  :<p className="fine-print">{query.trim()&&all.length?'No plugin matches your search.':`No plugins found in ${name}.`}</p>}
  <p className="fine-print">Read only. Turn plugins on or off in {name} itself; Girru runs none of them.</p>
 </Sheet>;
}
