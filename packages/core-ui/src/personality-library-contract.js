import {traitNames} from './personality-contract.js';
import {dialects} from './hire-contract.js';
export const LIBRARY_PATH='/api/personality-library';
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>object(x)&&Object.keys(x).every(k=>keys.includes(k));
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(x);
const text=(x,n)=>typeof x==='string'&&x.length<=n;
const version=x=>Number.isSafeInteger(x)&&x>=0;
const score=x=>version(x)&&x<=100;
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function validProfile(p){return exact(p,['name','description','archetype','strengths','blindSpots','bestFor','notFor','samples','traits','dialect','temperament','pace','formality','humour','seniority','principles'])&&text(p.name,80)&&!!p.name.trim()&&['description','archetype','strengths','blindSpots','bestFor','notFor'].every(k=>text(p[k],1000))&&Array.isArray(p.samples)&&p.samples.length<=3&&p.samples.every(x=>text(x,1500))&&exact(p.traits,traitNames)&&traitNames.every(k=>score(p.traits[k]))&&dialects.includes(p.dialect)&&exact(p.temperament,['extraversion','emotionalStability'])&&score(p.temperament.extraversion)&&score(p.temperament.emotionalStability)&&['deliberate','balanced','fast'].includes(p.pace)&&['casual','neutral','formal'].includes(p.formality)&&['off','light','playful'].includes(p.humour)&&['junior','senior','lead'].includes(p.seniority)&&exact(p.principles,['do','never','ask'])&&['do','never','ask'].every(k=>text(p.principles[k],2000));}
export function libraryPath(path){if(!path.startsWith(LIBRARY_PATH))return false;const tail=path.slice(LIBRARY_PATH.length);return tail===''||/^\/(team|blend)$/.test(tail)||/^\/assigned\/[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}(\/(tune|mode))?$/.test(tail)||/^\/[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}(\/(preview|versions|archive|exams|try))?$/.test(tail);}
export function allowedLibrary(method,path,b){
 if(!libraryPath(path))return false;const p=path.slice(LIBRARY_PATH.length+1).split('/');
 if(method==='GET')return b===undefined&&!['blend','preview','archive','try'].includes(p.at(-1));
 if(method==='POST'&&p[0]==='blend')return exact(b,['a','b','weight'])&&validProfile(b.a)&&validProfile(b.b)&&score(b.weight);
 if(method==='POST'&&p[0]==='assigned'&&p[2]==='mode')return exact(b,['linked','expectedVersion'])&&typeof b.linked==='boolean'&&version(b.expectedVersion);
 if(method==='POST'&&p[0]==='assigned'&&p[2]==='tune')return exact(b,['profile','expectedVersion'])&&validProfile(b.profile)&&version(b.expectedVersion);
 if(method==='POST'&&p[0]==='assigned')return exact(b,['id','revision','expectedVersion','linked'])&&id(b.id)&&version(b.revision)&&b.revision>0&&version(b.expectedVersion)&&typeof b.linked==='boolean';
 if(method==='POST'&&p[1]==='archive')return exact(b,['revision','archived'])&&version(b.revision)&&typeof b.archived==='boolean';
 if(method==='POST'&&p[1]==='try')return exact(b,['profile','prompt'])&&validProfile(b.profile)&&text(b.prompt,2000)&&!!b.prompt.trim();
 if(method==='POST'&&p[1]==='exams')return exact(b,['revision','answers','ratings'])&&version(b.revision)&&Array.isArray(b.answers)&&b.answers.length===3&&b.answers.every(x=>text(x,4000)&&!!x.trim())&&Array.isArray(b.ratings)&&b.ratings.length===3&&b.ratings.every(x=>version(x)&&x<=4);
 return ((method==='PUT'&&p.length===1&&id(p[0]))||(method==='POST'&&p[1]==='preview'))&&exact(b,['revision','profile','confirmation'])&&version(b.revision)&&validProfile(b.profile)&&(b.confirmation===undefined||digest(b.confirmation));
}
export function libraryResponse(path,status,b){
 if(status!==200)return object(b)&&text(b.code,80)?{code:b.code}:null;
 const fail=()=>{throw Error('Invalid personality library response');};
 const entry=e=>{if(!object(e)||!id(e.id)||!version(e.revision)||e.revision<1||!validProfile(e.profile)||typeof e.archived!=='boolean')fail();return {id:e.id,revision:e.revision,profile:structuredClone(e.profile),archived:e.archived};};
 if(path===LIBRARY_PATH){if(!object(b)||!Array.isArray(b.personalities)||b.personalities.length>10000)fail();return {personalities:b.personalities.map(e=>{entry(e);if(!version(e.usedBy))fail();return {...entry(e),usedBy:e.usedBy};})};}
 if(path.endsWith('/blend')){if(!validProfile(b?.profile))fail();return {profile:structuredClone(b.profile)};}
 if(path.includes('/assigned/')){if(object(b)&&version(b.version))return {version:b.version};if(!object(b)||b.assignment!==null&&(!object(b.assignment)||!id(b.assignment.id)||!version(b.assignment.revision)||typeof b.assignment.linked!=='boolean'||!validProfile(b.assignment.profile)))fail();return {assignment:b.assignment===null?null:{id:b.assignment.id,revision:b.assignment.revision,linked:b.assignment.linked,profile:structuredClone(b.assignment.profile)}};}
 if(path.endsWith('/archive')){if(typeof b?.archived!=='boolean')fail();return {archived:b.archived};}
 if(path.endsWith('/preview')){if(!object(b)||!digest(b.confirmation)||!validProfile(b.profile)||!Array.isArray(b.agents)||b.agents.length>10000||!b.agents.every(a=>object(a)&&id(a.id)&&text(a.name,100)&&version(a.version)&&typeof a.locked==='boolean'&&typeof a.linked==='boolean'&&Array.isArray(a.lockedTraits)&&a.lockedTraits.every(k=>traitNames.includes(k))))fail();return {confirmation:b.confirmation,profile:structuredClone(b.profile),agents:b.agents.map(a=>({id:a.id,name:a.name,version:a.version,locked:a.locked,linked:a.linked,lockedTraits:[...a.lockedTraits]}))};}
 if(path.endsWith('/versions')){if(!object(b)||!Array.isArray(b.versions)||b.versions.length>10000||!b.versions.every(v=>object(v)&&version(v.revision)&&text(v.profile_json,25000)&&validProfile(JSON.parse(v.profile_json))&&text(v.created_at,50)))fail();return {versions:b.versions.map(v=>({revision:v.revision,profile_json:v.profile_json,created_at:v.created_at}))};}
 if(path.endsWith('/try')){if(!object(b)||!text(b.reply,8000)||!text(b.model,200)||b.generated!==true)fail();return {reply:b.reply,model:b.model,generated:true};}
 if(path.endsWith('/exams')){if(!object(b)||!Array.isArray(b.exams)||b.exams.length>1000||!b.exams.every(e=>object(e)&&version(e.revision)&&score(e.score)&&text(e.created_at,50)&&text(e.answers_json,20000)&&text(e.ratings_json,100)))fail();return {exams:b.exams.map(e=>({revision:e.revision,score:e.score,answers_json:e.answers_json,ratings_json:e.ratings_json,created_at:e.created_at}))};}
 if(path.endsWith('/team')){if(!object(b)||!Array.isArray(b.agents)||b.agents.length>10000||!b.agents.every(a=>object(a)&&id(a.id)&&text(a.name,100)&&object(a.traits)&&traitNames.every(k=>score(a.traits[k])))||!Array.isArray(b.gaps)||!b.gaps.every(g=>text(g,200)))fail();return {agents:b.agents.map(a=>({id:a.id,name:a.name,department:typeof a.department==='string'?a.department:null,traits:Object.fromEntries(traitNames.map(k=>[k,a.traits[k]]))})),gaps:[...b.gaps]};}
 return entry(b);
}
