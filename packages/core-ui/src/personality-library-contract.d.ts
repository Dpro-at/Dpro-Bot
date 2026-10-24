export const LIBRARY_PATH:string;
export function validProfile(x:unknown):boolean;
export function libraryPath(x:string):boolean;
export function allowedLibrary(method:string,path:string,body?:unknown):boolean;
export function libraryResponse(path:string,status:number,body:unknown):unknown;
