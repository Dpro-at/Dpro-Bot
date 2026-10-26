import {useEffect,useSyncExternalStore} from 'react';
import type {SessionClient} from './session';
import type {TraitName} from './hire';
export type Profile={name:string;description:string;archetype:string;strengths:string;blindSpots:string;bestFor:string;notFor:string;samples:string[];traits:Record<TraitName,number>;dialect:string;temperament:{extraversion:number;emotionalStability:number};pace:'deliberate'|'balanced'|'fast';formality:'casual'|'neutral'|'formal';humour:'off'|'light'|'playful';seniority:'junior'|'senior'|'lead';principles:{do:string;never:string;ask:string}};
export type Entry={id:string;revision:number;profile:Profile;archived:boolean;usedBy?:number;starter?:boolean;agents?:{id:string;name:string}[]};
export type TeamAgent={id:string;name:string;department:string|null;traits:Record<TraitName,number>;locked:boolean;linked:boolean;version:number|null;personalityId:string|null};
export const P='/api/personality-library';
export async function libraryRpc<T>(client:SessionClient,method:string,path:string,body?:unknown):Promise<T>{const r=await client.request({method,path,...(body===undefined?{}:{body})} as never);if(r.status!==200)throw Error((r.body as {code?:string})?.code??'library_unavailable');return r.body as T;}
export function defaultLibraryId(_role:string,_department:string){return 'temperament-balanced';}
export const labels:Record<TraitName,string>={doubt:'Confidence',caution:'Caution',creativity:'Inventiveness',thoroughness:'Attention to detail',independence:'Independence',verbosity:'Reply length',warmth:'Friendliness',curiosity:'Curiosity',persistence:'Persistence'};
export const inverse=(k:TraitName)=>k==='doubt';
/** The library's personalities, read once per client and shared by every face and library mark (kept up to a minute). */
type Shared={entries?:Entry[];at:number;loading?:Promise<void>};
const shared=new WeakMap<SessionClient,Shared>(),watchers=new Set<()=>void>();let tick=0;
const told=()=>{tick++;watchers.forEach(f=>f());};
export function rememberLibrary(client:SessionClient,entries:Entry[]){shared.set(client,{entries,at:Date.now()});told();}
export function useLibraryEntries(client:SessionClient|null|undefined,enabled=true):Entry[]|undefined{
 useSyncExternalStore(f=>{watchers.add(f);return()=>{watchers.delete(f);};},()=>tick,()=>tick);
 useEffect(()=>{if(!client||!enabled)return;const c=shared.get(client)??{at:0};shared.set(client,c);if(c.loading||c.entries&&Date.now()-c.at<60000)return;
  c.loading=libraryRpc<{personalities:Entry[]}>(client,'GET',P).then(r=>{c.entries=r.personalities;}).catch(()=>{}).finally(()=>{c.at=Date.now();c.loading=undefined;told();});},[client,enabled]);
 return client?shared.get(client)?.entries:undefined;
}
