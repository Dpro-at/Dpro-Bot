/**
 * The Store's catalogue contract (STORE-UI-01, D-STORE-REPO).
 *
 * A catalogue is one index shaped like the future public store repository's
 * index.json: folders specialties/, apps/, mcp/, skills/ with one manifest per
 * item. Every source (the local catalogues today, the repository later) is an
 * adapter that returns this index; parseStoreIndex is the only way in, so a
 * new source cannot widen what the Store shows or installs.
 */
export const STORE_SCHEMA=1;
export const STORE_KINDS=['app','mcp','skill','specialty'] as const;
export const STORE_SOURCES=['girru','claude-code','codex'] as const;
export const STORE_CATEGORIES=[
 {id:'marketing',title:'Marketing',icon:'send'},
 {id:'sales',title:'Sales and support',icon:'headset'},
 {id:'developer',title:'Developer tools',icon:'code'},
 {id:'worlds',title:'Worlds and 3D',icon:'globe'},
 {id:'trading',title:'Trading',icon:'chart'},
 {id:'productivity',title:'Productivity',icon:'calendar'},
 {id:'more',title:'More',icon:'puzzle'},
] as const;
export type StoreKind=typeof STORE_KINDS[number];
export type StoreSource=typeof STORE_SOURCES[number];
export type StoreCategoryId=typeof STORE_CATEGORIES[number]['id'];

/** One item's manifest: what its folder in the store repository describes. */
export interface StoreManifest{
 id:string; kind:StoreKind; source:StoreSource;
 name:string; summary:string; description:string;
 /** A Girru icon name, or null for the item's initial on its colour. */
 icon:string|null;
 maker:string; verified:boolean; version:string|null; updated:string|null;
 category:StoreCategoryId;
 /** What it asks for, in plain words. */
 permissions:string[];
 /** Specialty names that work well with it. */
 worksWith:string[];
 languages:string[];
}
export interface StoreCollection{id:string;title:string;items:string[]}
export interface StoreIndex{schema:typeof STORE_SCHEMA;featured:string|null;collections:StoreCollection[];items:StoreManifest[]}

/** A catalogue source. The local catalogues and, later, the store repository each implement it. */
export interface CatalogueSource{read(ownerId:string):Promise<StoreIndex>}

const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const clean=(x:string,max:number)=>x.slice(0,max).replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g,'');
const text=(x:unknown,max:number,need=false)=>{if(typeof x!=='string'||(need&&!x.trim()))throw new TypeError('store index');return clean(x,max);};
const maybe=(x:unknown,max:number)=>x===null||x===undefined?null:text(x,max);
const list=(x:unknown,max:number,each:number)=>{if(x===undefined)return [];if(!Array.isArray(x)||x.length>max)throw new TypeError('store index');return x.map(v=>text(v,each,true));};
const ID=/^[a-z0-9][a-z0-9._@:-]{0,319}$/i;
const ICON=/^[a-z][a-z-]{0,39}$/;

/** Validates an index from any source; throws on anything outside the contract. */
export function parseStoreIndex(raw:unknown):StoreIndex{
 if(!record(raw)||raw.schema!==STORE_SCHEMA||!Array.isArray(raw.items)||raw.items.length>2000||!Array.isArray(raw.collections)||raw.collections.length>20)throw new TypeError('store index');
 const seen=new Set<string>();
 const items=raw.items.map((x):StoreManifest=>{
  if(!record(x)||typeof x.id!=='string'||!ID.test(x.id)||seen.has(x.id)||!STORE_KINDS.includes(x.kind as StoreKind)||!STORE_SOURCES.includes(x.source as StoreSource)||!STORE_CATEGORIES.some(c=>c.id===x.category))throw new TypeError('store index');
  if(x.icon!==null&&x.icon!==undefined&&(typeof x.icon!=='string'||!ICON.test(x.icon)))throw new TypeError('store index');
  seen.add(x.id);
  return {id:x.id,kind:x.kind as StoreKind,source:x.source as StoreSource,name:text(x.name,150,true),summary:text(x.summary??'',200),description:text(x.description??'',3000),icon:(x.icon as string|undefined)??null,maker:text(x.maker??'',150),verified:x.verified===true,version:maybe(x.version,80),updated:maybe(x.updated,40),category:x.category as StoreCategoryId,permissions:list(x.permissions,60,200),worksWith:list(x.worksWith,20,120),languages:list(x.languages,20,60)};
 });
 const collections=raw.collections.map((c):StoreCollection=>{if(!record(c)||typeof c.id!=='string'||!ID.test(c.id))throw new TypeError('store index');return {id:c.id,title:text(c.title,80,true),items:list(c.items,60,320).filter(id=>seen.has(id))};});
 const featured=typeof raw.featured==='string'&&seen.has(raw.featured)?raw.featured:null;
 return {schema:STORE_SCHEMA,featured,collections,items};
}
