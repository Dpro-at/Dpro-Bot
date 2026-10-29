import {createHash} from 'node:crypto';
import {addonCatalogue} from './addon-catalogue.js';
import {searchMarketplace,checkForUpdates,installExtension,uninstallExtension,getExtensionDetails} from './extension-marketplace.js';
import {readStoreRepo,type RepoRead} from './store-repo.js';
import {parseStoreIndex,STORE_CATEGORIES,type CatalogueSource,type StoreIndex,type StoreManifest,type StoreCategoryId} from './store-index.js';

/**
 * Store config (STORE-UI-01). The featured app is a config value, not a
 * guess: Girru picks it here (or GIRRU_STORE_FEATURED) until the store
 * repository's index.json carries it. Ratings, reviews, install counts and
 * prices have no real source yet, so the index has no fields for them and
 * every item is free (SA4 decisions 1, 2 and 4 are still open).
 */
export const STORE_CONFIG={featured:process.env.GIRRU_STORE_FEATURED||'girru:genvr'};

/** The apps that come with Girru, as store manifests (the same apps as My apps). */
const INCLUDED:ReadonlyArray<StoreManifest>=([
 {id:'girru:genvr',name:'GenVR',icon:'globe',category:'worlds',summary:'3D worlds for your agents.',description:'Give your agents a place to live and work: build 3D spaces, walk through them with your team and publish them when you are ready. Uses your GenVR account connection.',permissions:['Uses your GenVR account once you connect it','Publishing a world always waits for your OK']},
 {id:'girru:trading',name:'Trading',icon:'chart',category:'trading',summary:'Practice trading with an agent team.',description:'Paper practice with fictional money and prices: your agents research, propose and keep a journal while nothing real is bought or sold.',permissions:['Practice money only; live orders are not connected','Setting up practice waits for your OK']},
 {id:'girru:terminal',name:'Terminal',icon:'terminal',category:'developer',summary:'Your shell next to your agents.',description:'Command sessions on this computer, beside your chats. Agents only run commands you allow.',permissions:['Uses your computer account when you start a shell']},
 {id:'girru:code',name:'Code',icon:'code',category:'developer',summary:'The project editor beside your chats.',description:'Open a project folder and edit it next to your chats, in the Girru desktop app.',permissions:['Opens only in the Girru desktop app that has the editor','Edits files in the project folder you open']},
] as const).map(x=>({...x,kind:'app' as const,source:'girru' as const,maker:'Girru',verified:true,version:null,updated:null,permissions:[...x.permissions],worksWith:[],languages:[]}));
const INCLUDED_APP:Record<string,string>={'girru:genvr':'genvr','girru:trading':'trading','girru:terminal':'terminal','girru:code':'code'};
/** The id of the app a Girru item opens (for the window's Open button). */
export const includedApp=(id:string)=>INCLUDED_APP[id]??null;

const category=(x:unknown):StoreCategoryId=>{const v=typeof x==='string'?x.trim().toLowerCase():'';return STORE_CATEGORIES.find(c=>c.id===v||c.title.toLowerCase()===v)?.id??'more';};

/** Today's source: the local catalogues on this computer. Reading never downloads or installs. */
export function localCatalogue(options:{home?:string;repo?:()=>Promise<RepoRead>}={}):LocalCatalogue{
 let limited:string[]=[],have:Have={installed:new Set(),present:new Set()},asOf:string|null=null;
 return {
  limited:()=>limited,
  have:()=>have,
  asOf:()=>asOf,
  async read(ownerId){
   limited=[];have={installed:new Set(),present:new Set()};asOf=null;
   const items:StoreManifest[]=[...INCLUDED];
   // APPS-06: the Girru Store repository. Its words win for the apps that come with Girru;
   // anything else it lists is shown as "store:<id>" (adding those comes with real installs).
   const repo=await (options.repo??readStoreRepo)().catch(():RepoRead=>({index:null,asOf:null,fresh:false}));
   asOf=repo.asOf;if(!repo.fresh)limited.push('store');
   for(const r of repo.index?.items??[]){
    const at=items.findIndex(x=>x.id===r.id);
    if(at>=0)items[at]={...items[at],summary:r.summary||items[at].summary,description:r.description||items[at].description,icon:r.icon??items[at].icon,version:r.version,updated:r.updated,category:r.category,permissions:r.permissions.length?r.permissions:items[at].permissions,worksWith:r.worksWith,languages:r.languages};
    else items.push({...r,id:'store:'+r.id.slice(6)});
   }
   try{
    const {extensions}=await searchMarketplace({userId:ownerId,limit:200,offset:0});
    for(const x of extensions){if(x.installed)have.installed.add('registry:'+x.id);items.push({id:'registry:'+x.id,kind:'app',source:'girru',name:x.name||'Unnamed app',summary:(x.description??'').split(/(?<=\.)\s/)[0]??'',description:x.description??'',icon:null,maker:x.author||'',verified:x.verified===true,version:x.version||null,updated:x.updated_at?String(x.updated_at).slice(0,10):null,category:category(x.category),permissions:x.permissions??[],worksWith:[],languages:[]});}
   }catch{limited.push('registry');}
   const addons=await addonCatalogue(options.home);
   for(const x of addons.items){if(x.present)have.present.add(x.source+':'+x.id);items.push({id:x.source+':'+x.id,kind:'app',source:x.source,name:x.name,summary:x.description.split(/(?<=\.)\s/)[0]??'',description:x.description,icon:null,maker:x.publisher,verified:false,version:null,updated:null,category:'developer',permissions:[],worksWith:[],languages:[]});}
   const of=(source:string)=>items.filter(x=>x.source===source).slice(0,8).map(x=>x.id);
   return parseStoreIndex({schema:1,featured:STORE_CONFIG.featured,collections:[
    {id:'made-by-girru',title:'Made by Girru',items:[...INCLUDED.map(x=>x.id),...items.filter(x=>x.id.startsWith('store:')&&x.maker==='Girru').map(x=>x.id)]},
    {id:'new',title:'New in the store',items:items.filter(x=>x.id.startsWith('store:')).sort((a,b)=>(b.updated??'').localeCompare(a.updated??'')).slice(0,12).map(x=>x.id)},
    {id:'registry',title:'From Girru’s registry',items:items.filter(x=>x.id.startsWith('registry:')).slice(0,8).map(x=>x.id)},
    {id:'claude-code',title:'Claude Code add-ons',items:of('claude-code')},
    {id:'codex',title:'Codex add-ons',items:of('codex')},
   ].filter(c=>c.items.length),items});
  },
 };
}

type Have={installed:Set<string>;present:Set<string>};
/** A source that also knows what this owner already has (installed registry apps, add-ons present on this computer). */
export type LocalCatalogue=CatalogueSource&{limited:()=>string[];have:()=>Have;asOf?:()=>string|null};

export type StoreState='included'|'installed'|'available'|'elsewhere';
export type StoreEntry=StoreManifest&{state:StoreState;present:boolean;update:string|null;hash:string};
/**
 * The hash an Add is bound to: the item and exactly what it asks for. If the
 * listing changes between showing it and adding it, the Add is refused.
 */
export const consentHash=(x:Pick<StoreManifest,'id'|'version'|'permissions'>)=>createHash('sha256').update(JSON.stringify([x.id,x.version,x.permissions])).digest('hex');

/** The index joined with what this owner has: one call for the whole Store window. */
export async function readStore(ownerId:string,source:LocalCatalogue=localCatalogue()){
 const index:StoreIndex=await source.read(ownerId);
 let updates:Awaited<ReturnType<typeof checkForUpdates>>=[];
 try{updates=await checkForUpdates(ownerId);}catch{/* No registry here: no registry updates. */}
 const {installed:registry,present}=source.have();
 const items:StoreEntry[]=index.items.map(x=>{
  const state:StoreState=x.id.startsWith('girru:')?'included':x.id.startsWith('registry:')?(registry.has(x.id)?'installed':'available'):x.id.startsWith('store:')?'available':'elsewhere';
  const update=updates.find(u=>'registry:'+u.extension_id===x.id)?.latest_version??null;
  return {...x,state,present:state==='included'||state==='installed'||present.has(x.id),update:state==='installed'?update:null,hash:consentHash(x)};
 });
 return {schema:index.schema,featured:index.featured,collections:index.collections,// The category row is fixed (SA1 v2); More shows only when something is in it.
 categories:STORE_CATEGORIES.filter(c=>c.id!=='more'||items.some(x=>x.category===c.id)).map(c=>({...c})),items,limited:source.limited(),storeAsOf:source.asOf?.()??null};
}

export type StoreChange={ok:true;state:StoreState}|{ok:false;code:'not_found'|'not_installable'|'changed'|'refused';message:string};
const registryId=(id:string)=>id.startsWith('registry:')?id.slice(9):null;
const refuseOther=(id:string):StoreChange=>({ok:false,code:'not_installable',message:id.startsWith('girru:')?'It comes with Girru. It is already in My apps.':id.startsWith('store:')?'Adding apps from the Girru Store comes with the next update.':'Add it in that coding app itself. Girru does not copy its keys.'});

/** Add one registry app, only with the hash of exactly what the owner was shown. */
export async function installFromStore(ownerId:string,id:string,hash:string):Promise<StoreChange>{
 const ext=registryId(id);if(!ext)return refuseOther(id);
 const x=await getExtensionDetails(ext,ownerId);if(!x||x.status!=='active')return {ok:false,code:'not_found',message:'This app is not in the store any more.'};
 if(consentHash({id,version:x.version||null,permissions:x.permissions??[]})!==hash)return {ok:false,code:'changed',message:'This app changed since you saw it. Read what it asks for again.'};
 const r=await installExtension(ext,ownerId);
 return r.success?{ok:true,state:'installed'}:{ok:false,code:'refused',message:r.error||'It could not be added.'};
}
export async function uninstallFromStore(ownerId:string,id:string):Promise<StoreChange>{
 const ext=registryId(id);if(!ext)return refuseOther(id);
 const r=await uninstallExtension(ext,ownerId);
 return r.success?{ok:true,state:'available'}:{ok:false,code:'refused',message:r.error||'It could not be removed.'};
}
