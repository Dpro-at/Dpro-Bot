export type Pack={format:'dpro-workspace-pack';version:1;agents:unknown[];personalities:unknown[];skills:unknown[];specialties:unknown[]};
export type PackPreview={fingerprint:string;counts:Record<'agents'|'personalities'|'skills'|'specialties',number>;names:Record<'agents'|'personalities'|'skills'|'specialties',string[]>};
export function packRoute(path:string):string|null;
export function validPack(pack:unknown):pack is Pack;
export function allowedPack(method:string,path:string,body?:unknown):boolean;
export function packResponse(path:string,status:number,body:unknown):unknown;
