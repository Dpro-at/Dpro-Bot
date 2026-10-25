export const APPS_CATALOGUE_PATH:string;
export function appsCatalogueRoute(path:string):boolean;
export function allowedAppsCatalogue(method:string,path:string,body?:unknown):boolean;
export function appsCatalogueResponse(status:number,body:unknown):unknown;
export const SOURCE_CATALOGUE_PATH:string;
export function sourceCatalogueRoute(path:string):boolean;
export function allowedSourceCatalogue(method:string,path:string,body?:unknown):boolean;
export function sourceCatalogueResponse(status:number,body:unknown):unknown;

export type WorkspaceApp={id:string;name:string;kind:'builtin'|'mcp'|'api';version:string|null;summary:string;state:'included'|'disabled'|'connected'|'connecting'|'disconnected'|'attention'|'not_connected'|'expired';sourceId:string|null;permissions:string[];tools:number;removable:boolean};
export const WORKSPACE_APPS_PATH:'/api/apps';
export function workspaceAppsRoute(path:string):boolean;
export function allowedWorkspaceApps(method:string,path:string,body?:unknown):boolean;
export function workspaceAppsResponse(status:number,body:unknown):{items:WorkspaceApp[]}|{code:string};
