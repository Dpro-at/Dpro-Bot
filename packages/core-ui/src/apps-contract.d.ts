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

export type StoreState='included'|'installed'|'available'|'elsewhere';
export type StoreSource='girru'|'claude-code'|'codex';
export type StoreItem={id:string;kind:string;source:StoreSource;name:string;summary:string;description:string;icon:string|null;maker:string;verified:boolean;version:string|null;updated:string|null;category:string;permissions:string[];worksWith:string[];languages:string[];state:StoreState;present:boolean;update:string|null;hash:string};
export type StoreData={schema:1;featured:string|null;collections:{id:string;title:string;items:string[]}[];categories:{id:string;title:string;icon:string}[];items:StoreItem[];limited:string[]};
export type StoreChange={ok:true;state:StoreState}|{code:string;message?:string};
export const STORE_PATH:'/api/store';
export const STORE_INSTALL_PATH:'/api/store/install';
export const STORE_UNINSTALL_PATH:'/api/store/uninstall';
export function storeRoute(path:string):boolean;
export function allowedStore(method:string,path:string,body?:unknown):boolean;
export function storeResponse(path:string,status:number,body:unknown):StoreData|StoreChange|{code:string};
