import type {SessionClient} from './session';
import type {TraitName} from './hire';
export type Profile={name:string;description:string;archetype:string;strengths:string;blindSpots:string;bestFor:string;notFor:string;samples:string[];traits:Record<TraitName,number>;dialect:string;temperament:{extraversion:number;emotionalStability:number};pace:'deliberate'|'balanced'|'fast';formality:'casual'|'neutral'|'formal';humour:'off'|'light'|'playful';seniority:'junior'|'senior'|'lead';principles:{do:string;never:string;ask:string}};
export type Entry={id:string;revision:number;profile:Profile;archived:boolean;usedBy?:number};
export const P='/api/personality-library';
export async function libraryRpc<T>(client:SessionClient,method:string,path:string,body?:unknown):Promise<T>{const r=await client.request({method,path,...(body===undefined?{}:{body})} as never);if(r.status!==200)throw Error((r.body as {code?:string})?.code??'library_unavailable');return r.body as T;}
export function defaultLibraryId(_role:string,_department:string){return 'temperament-balanced';}
export const labels:Record<TraitName,string>={doubt:'Confidence',caution:'Caution',creativity:'Inventiveness',thoroughness:'Attention to detail',independence:'Independence',verbosity:'Reply length',warmth:'Friendliness',curiosity:'Curiosity',persistence:'Persistence'};
export const inverse=(k:TraitName)=>k==='doubt';
