import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {q} from '../repositories/sql-steps.js';
import {SpecialtyTemplates} from './specialty-templates.js';
import {validateWorkspacePack} from './workspace-pack.js';

const stable=(value:any):string=>JSON.stringify(value&&typeof value==='object'?(Array.isArray(value)?value.map(v=>JSON.parse(stable(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(stable(value[k]))]))):value);
const digest=(value:unknown)=>createHash('sha256').update(stable(value)).digest('hex');
const content=(role:{name:string;department:string;description:string;instructions:string})=>({name:role.name.trim(),department:role.department.trim(),description:role.description,instructions:role.instructions.replace(/\r\n?/g,'\n').trim()+'\n'});
// Compatibility with portable-pack imports. The authenticated owner is part of the identity.
export function importedSpecialtyId(owner:string,fingerprint:string,sourceId:string){
 const h=digest(owner+':'+fingerprint+':specialty:'+sourceId);
 return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);
}
type Release={fingerprint:string;roles:{id:string;sourceKey:string;contentHash:string}[]};
export function validateProfessionalSource(rawPack:unknown,history:any){
 const pack=validateWorkspacePack(rawPack);
 const hex=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 if(history.version!==1||!Array.isArray(history.releases)||history.releases.length>30||history.releases.some((r:any)=>!hex(r.fingerprint)||!Array.isArray(r.roles)||r.roles.length>300||new Set(r.roles.map((x:any)=>x.id)).size!==r.roles.length||new Set(r.roles.map((x:any)=>x.sourceKey)).size!==r.roles.length||r.roles.some((x:any)=>typeof x.id!=='string'||!/^specialty-[1-9][0-9]*$/.test(x.id)||typeof x.sourceKey!=='string'||!/^professional-role-[a-f0-9]{24}$/.test(x.sourceKey)||!hex(x.contentHash))))throw new Error('invalid_source_history');
 const releases:Release[]=history.releases;
 if(new Set(releases.map(r=>r.fingerprint)).size!==releases.length)throw new Error('invalid_source_history');
 const fingerprint=digest(pack),current=releases.find(r=>r.fingerprint===fingerprint);
 if(!current||current.roles.length!==pack.specialties.length||pack.specialties.some(r=>current.roles.find(x=>x.id===r.id)?.contentHash!==digest(content(r))))throw new Error('source_revision_unregistered');
 return {pack,releases,fingerprint,current};
}
function source(){return validateProfessionalSource(JSON.parse(readFileSync(new URL('../../skills/professional-workspace-settings.json',import.meta.url),'utf8')),JSON.parse(readFileSync(new URL('../../skills/professional-source-history.json',import.meta.url),'utf8')));}

export function professionalSourceManifest(){
 const {pack,fingerprint,current}=source();
 return {namespace:'professional-v1',fingerprint,roles:pack.specialties.map(r=>({sourceKey:current.roles.find(x=>x.id===r.id)!.sourceKey,sourceId:r.id,contentRevision:digest(content(r)),name:r.name,skills:[...r.skills]}))};
}
/** Read-only advice. No confirmation token, apply operation, role-name matching or grant changes. Resource names are advisory. */
export class SpecialtyDistribution{
 constructor(private templates=new SpecialtyTemplates(),private loadSource=source){}
 async preview(owner:string){
  const {pack,releases,fingerprint,current}=this.loadSource();
  const installed=await q.all<{id:string}>('SELECT id FROM specialty_templates');
  const ids=new Set(installed.map(r=>r.id));
  const skills=await q.all<{id:string;name:string;content_hash:string}>('SELECT id,name,content_hash FROM central_skills');
  const resources=pack.skills.map(s=>{
   const matches=skills.filter(x=>x.name===s.name);
   const files=s.files.map(f=>({path:f.path,content:f.content.replace(/\r\n?/g,'\n').trim()+'\n'})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
   const contentHash=createHash('sha256').update(JSON.stringify(files)).digest('hex');
   return {sourceId:s.id,name:s.name,status:matches.length===0?'missing':matches.length>1?'ambiguous':matches[0].content_hash===contentHash?'current':'conflict'};
  });
  const matched=new Set<string>();
  const roles=[];
  for(const role of pack.specialties){
   const sourceKey=current.roles.find(r=>r.id===role.id)!.sourceKey;
   const candidates=releases.flatMap(release=>release.roles.filter(r=>r.sourceKey===sourceKey).map(r=>({id:importedSpecialtyId(owner,release.fingerprint,r.id),baseline:r.contentHash}))).filter(r=>ids.has(r.id));
   candidates.forEach(r=>matched.add(r.id));
   const contentRevision=digest(content(role));
   if(candidates.length!==1){roles.push({sourceKey,sourceId:role.id,name:role.name,contentRevision,status:candidates.length?'ambiguous':'unmatched',installedIds:candidates.map(r=>r.id)});continue;}
   const candidate=candidates[0],live=await this.templates.get(candidate.id),liveHash=digest(content(live));
   const links=await q.all<{agent_id:string}>('SELECT agent_id FROM agent_specialties WHERE template_id=? ORDER BY agent_id',live.id);
   // The config is never replaced. Package changes may affect other consumers and need separate review.
   roles.push({sourceKey,sourceId:role.id,name:role.name,contentRevision,installedIds:[live.id],revision:live.revision,linkedAgentIds:links.map(r=>r.agent_id),status:liveHash===contentRevision?'current':liveHash===candidate.baseline?'content_update_available':'local_conflict',packResources:resources.filter(r=>role.skills.includes(r.sourceId)),preservesConfiguration:true});
  }
  const currentKeys=new Set(current.roles.map(r=>r.sourceKey));
  for(const release of releases)for(const role of release.roles){
   const id=importedSpecialtyId(owner,release.fingerprint,role.id);
   if(!currentKeys.has(role.sourceKey)&&ids.has(id)&&!matched.has(id)){matched.add(id);roles.push({sourceKey:role.sourceKey,sourceId:role.id,status:'retired',installedIds:[id]});}
  }
  return {namespace:'professional-v1',fingerprint,readOnly:true,applySupported:false,requiresFreshReview:true,roles,resources,unmatchedInstalledIds:installed.filter(r=>!matched.has(r.id)).map(r=>r.id)};
 }
}
