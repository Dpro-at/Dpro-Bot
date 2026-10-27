import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {q,one,dialect,type Step} from '../repositories/sql-steps.js';
import {forUpdate} from '../db/pg/dialect.js';
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
export class UpgradeError extends Error{constructor(readonly code:string,readonly status=409){super(code);}}
type Release={fingerprint:string;roles:{id:string;sourceKey:string;contentHash:string}[]};
export function validateProfessionalSource(rawPack:unknown,history:any){
 const pack=validateWorkspacePack(rawPack);
 const hex=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 if(history.version!==1||!Array.isArray(history.releases)||history.releases.length>30||history.releases.some((r:any)=>!hex(r.fingerprint)||!Array.isArray(r.roles)||r.roles.length>300||new Set(r.roles.map((x:any)=>x.id)).size!==r.roles.length||new Set(r.roles.map((x:any)=>x.sourceKey)).size!==r.roles.length||r.roles.some((x:any)=>typeof x.id!=='string'||!/^specialty-[1-9][0-9]*$/.test(x.id)||typeof x.sourceKey!=='string'||!/^professional-role-[a-f0-9]{24}$/.test(x.sourceKey)||!hex(x.contentHash))))throw new Error('invalid_source_history');
 const seeds:{id:string;sourceKey:string;contentHashes:string[]}[]=history.seeds??[];
 if(!Array.isArray(seeds)||seeds.length>300||new Set(seeds.map(r=>r?.id)).size!==seeds.length||new Set(seeds.map(r=>r?.sourceKey)).size!==seeds.length||seeds.some(r=>!r||typeof r.id!=='string'||!/^[a-f0-9-]{36}$/.test(r.id)||typeof r.sourceKey!=='string'||!/^professional-role-[a-f0-9]{24}$/.test(r.sourceKey)||!Array.isArray(r.contentHashes)||r.contentHashes.length<1||r.contentHashes.length>10||!r.contentHashes.every(hex)))throw new Error('invalid_source_history');
 const releases:Release[]=history.releases;
 if(new Set(releases.map(r=>r.fingerprint)).size!==releases.length)throw new Error('invalid_source_history');
 const fingerprint=digest(pack),current=releases.find(r=>r.fingerprint===fingerprint);
 if(!current||current.roles.length!==pack.specialties.length||pack.specialties.some(r=>current.roles.find(x=>x.id===r.id)?.contentHash!==digest(content(r))))throw new Error('source_revision_unregistered');
 return {pack,releases,fingerprint,current,seeds};
}
function source(){return validateProfessionalSource(JSON.parse(readFileSync(new URL('../../skills/professional-workspace-settings.json',import.meta.url),'utf8')),JSON.parse(readFileSync(new URL('../../skills/professional-source-history.json',import.meta.url),'utf8')));}

export function professionalSourceManifest(){
 const {pack,fingerprint,current}=source();
 return {namespace:'professional-v1',fingerprint,roles:pack.specialties.map(r=>({sourceKey:current.roles.find(x=>x.id===r.id)!.sourceKey,sourceId:r.id,contentRevision:digest(content(r)),name:r.name,skills:[...r.skills]}))};
}
/** Known source identities only. Content saves retain configuration and agent authority. */
export class SpecialtyDistribution{
 constructor(private templates=new SpecialtyTemplates(),private loadSource=source){}
 async review(owner:string,sourceKey:string){
  const state=await this.reviewState(owner,sourceKey);
  return {sourceKey,templateId:state.live.id,revision:state.live.revision,name:state.proposed.name,reviewToken:state.token,changes:state.changes,agents:state.impact.agents};
 }
 private async reviewState(owner:string,sourceKey:string){
  if(typeof sourceKey!=='string'||!/^professional-role-[a-f0-9]{24}$/.test(sourceKey))throw new UpgradeError('invalid_input',400);
  const preview=await this.preview(owner),entry=preview.roles.find(r=>r.sourceKey===sourceKey);
  if(!entry||entry.status!=='content_update_available'||entry.installedIds.length!==1)throw new UpgradeError('upgrade_not_available');
  const loaded=this.loadSource();
  if(loaded.fingerprint!==preview.fingerprint)throw new UpgradeError('review_changed');
  const record=loaded.current.roles.find(r=>r.sourceKey===sourceKey),role=loaded.pack.specialties.find(r=>r.id===record?.id);
  if(!role)throw new UpgradeError('review_changed');
  const live=await this.templates.get(entry.installedIds[0]);
  if(live.revision!==entry.revision)throw new UpgradeError('review_changed');
  const selected=new Set([live.config.primarySkill,...live.config.skills]);
  const resources=[];
  for(const ref of role.skills){
   const source=loaded.pack.skills.find(r=>r.id===ref)!;
   const files=source.files.map(f=>({path:f.path,content:f.content.replace(/\r\n?/g,'\n').trim()+'\n'})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
   const expected=createHash('sha256').update(JSON.stringify(files)).digest('hex');
   const rows=await q.all<{id:string;name:string;content_hash:string}>('SELECT id,name,content_hash FROM central_skills WHERE name=?',source.name);
   if(rows.length!==1||rows[0].content_hash!==expected||!selected.has(rows[0].id))throw new UpgradeError('resources_not_ready');
   resources.push({...rows[0]});
  }
  const proposed={...content(role),instructions:role.instructions,revision:live.revision,config:structuredClone(live.config)};
  const impact=await this.templates.impact(live.id,proposed,live.config);
  const changes=impact.changes.map(c=>c.field==='instructions'?{...c,after:content(proposed).instructions}:c).filter(c=>c.before!==c.after);
  const token=digest({owner,sourceKey,fingerprint:loaded.fingerprint,templateId:live.id,proposed,resources,impact:impact.confirmation,changes});
  return {live,proposed,resources,impact,changes,token,fingerprint:loaded.fingerprint};
 }
 async apply(owner:string,sourceKey:string,reviewToken:string){
  if(typeof reviewToken!=='string'||!(/^[a-f0-9]{64}$/).test(reviewToken))throw new UpgradeError('invalid_input',400);
  const state=await this.reviewState(owner,sourceKey);
  if(state.token!==reviewToken)throw new UpgradeError('review_changed');
  const loadSource=this.loadSource;
  const guard=function*():Step<void>{
   if(loadSource().fingerprint!==state.fingerprint)throw new UpgradeError('review_changed');
   const d=yield* dialect();
   for(const expected of [...state.resources].sort((a,b)=>a.id.localeCompare(b.id))){
    const row=yield* one<{name:string;content_hash:string}>('SELECT name,content_hash FROM central_skills WHERE id=?'+forUpdate(d),expected.id);
    if(!row||row.name!==expected.name||row.content_hash!==expected.content_hash)throw new UpgradeError('resources_not_ready');
   }
  };
  const result=await this.templates.save(state.live.id,{...state.proposed,confirmImpact:state.impact.confirmation},guard,state.live.config);
  return {templateId:result.id,revision:result.revision,name:result.name};
 }
 async preview(owner:string){
  const {pack,releases,fingerprint,current,seeds}=this.loadSource();
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
   const candidates=releases.flatMap(release=>release.roles.filter(r=>r.sourceKey===sourceKey).map(r=>({id:importedSpecialtyId(owner,release.fingerprint,r.id),baselines:[r.contentHash]}))).concat(seeds.filter(r=>r.sourceKey===sourceKey).map(r=>({id:r.id,baselines:r.contentHashes}))).filter(r=>ids.has(r.id));
   candidates.forEach(r=>matched.add(r.id));
   const contentRevision=digest(content(role));
   if(candidates.length!==1){roles.push({sourceKey,sourceId:role.id,name:role.name,contentRevision,status:candidates.length?'ambiguous':'unmatched',installedIds:candidates.map(r=>r.id)});continue;}
   const candidate=candidates[0],live=await this.templates.get(candidate.id),liveHash=digest(content(live));
   const links=await q.all<{agent_id:string}>('SELECT agent_id FROM agent_specialties WHERE template_id=? ORDER BY agent_id',live.id);
   const configuredSkills=[live.config?.primarySkill,...(Array.isArray(live.config?.skills)?live.config.skills:[])];
   // The config is never replaced. Package changes may affect other consumers and need separate review.
   roles.push({sourceKey,sourceId:role.id,name:role.name,contentRevision,installedIds:[live.id],revision:live.revision,linkedAgentIds:links.map(r=>r.agent_id),status:liveHash===contentRevision?'current':candidate.baselines.includes(liveHash)?'content_update_available':'local_conflict',packResources:resources.filter(r=>role.skills.includes(r.sourceId)).map(r=>({...r,assigned:skills.some(s=>s.name===r.name&&configuredSkills.includes(s.id))})),preservesConfiguration:true});
  }
  const currentKeys=new Set(current.roles.map(r=>r.sourceKey));
  for(const release of releases)for(const role of release.roles){
   const id=importedSpecialtyId(owner,release.fingerprint,role.id);
   if(!currentKeys.has(role.sourceKey)&&ids.has(id)&&!matched.has(id)){matched.add(id);roles.push({sourceKey:role.sourceKey,sourceId:role.id,status:'retired',installedIds:[id]});}
  }
  return {namespace:'professional-v1',fingerprint,readOnly:true,applySupported:true,requiresFreshReview:true,roles,resources,unmatchedInstalledIds:installed.filter(r=>!matched.has(r.id)).map(r=>r.id)};
 }
}

export {source as loadProfessionalSource};
