import {createHash} from 'node:crypto';
import {q,sql,all,run,dialect,type Step} from '../repositories/sql-steps.js';
import {CentralSkills,centralSkills} from '../skills/central-store.js';
import {SpecialtyTemplates,type TemplateConfig} from './specialty-templates.js';
import {SpecialtyDistribution,UpgradeError,loadProfessionalSource} from './specialty-distribution.js';
const stable=(v:any):string=>JSON.stringify(v&&typeof v==='object'?(Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))]))):v);
const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
const selected=(config:TemplateConfig)=>[config.primarySkill,...config.skills];
// Fixed tables only. This conservative snapshot also invalidates review on unrelated roster changes.
function* snapshot():Step<any>{
 const templates=yield* all<any>('SELECT id,name,revision,config_json FROM specialty_templates ORDER BY id');
 const links=yield* all<any>('SELECT agent_id,template_id FROM agent_specialties ORDER BY agent_id,template_id');
 const assignments=yield* all<any>('SELECT agent_id,skill_id FROM central_agent_skills ORDER BY agent_id,skill_id');
 const copies=yield* all<any>('SELECT agent_id,primary_skill_id,config_json FROM agent_template_snapshots ORDER BY agent_id');
 const agents=yield* all<any>('SELECT id,name FROM agents_config ORDER BY id');
 return {templates,links,assignments,copies,agents};
}
function consumers(scope:any,skillId:string|null){
 const specialties=skillId?scope.templates.filter((t:any)=>selected(JSON.parse(t.config_json)).includes(skillId)):[];
 const ids=new Set(specialties.map((t:any)=>t.id)),agentIds=new Set<string>();
 for(const a of scope.assignments)if(a.skill_id===skillId)agentIds.add(a.agent_id);
 for(const a of scope.links)if(ids.has(a.template_id))agentIds.add(a.agent_id);
 for(const a of scope.copies)if(skillId&&(a.primary_skill_id===skillId||selected(JSON.parse(a.config_json)).includes(skillId)))agentIds.add(a.agent_id);
 return {specialties:specialties.map((t:any)=>({id:t.id,name:t.name})),agents:scope.agents.filter((a:any)=>agentIds.has(a.id)).map((a:any)=>({id:a.id,name:a.name}))};
}
export class SpecialtyResourcePreparation{
 constructor(private templates=new SpecialtyTemplates(),private skills:CentralSkills=centralSkills(),private load=loadProfessionalSource){}
 private async state(owner:string,sourceKey:string,resourceId:string){
  if(typeof sourceKey!=='string'||!/^professional-role-[a-f0-9]{24}$/.test(sourceKey)||typeof resourceId!=='string'||!(/^(bindings|skill-[1-9][0-9]*)$/).test(resourceId))throw new UpgradeError('invalid_input',400);
  const preview=await new SpecialtyDistribution(this.templates,this.load).preview(owner),entry=preview.roles.find(r=>r.sourceKey===sourceKey);
  if(!entry||entry.status!=='content_update_available'||entry.installedIds.length!==1)throw new UpgradeError('upgrade_not_available');
  const loaded=this.load();if(loaded.fingerprint!==preview.fingerprint)throw new UpgradeError('review_changed');
  const role=loaded.pack.specialties.find(r=>r.id===entry.sourceId)!;
  const live=await this.templates.get(entry.installedIds[0]);if(live.revision!==entry.revision)throw new UpgradeError('review_changed');
  const scope=await sql().read(snapshot()),fingerprint=loaded.fingerprint;
  if(resourceId==='bindings'){
   const required=[];
   for(const ref of role.skills){const source=loaded.pack.skills.find(s=>s.id===ref)!,bundle=this.skills.validatePortable(source.name,source.files);const rows=await q.all<any>('SELECT id,name,revision,content_hash FROM central_skills WHERE name=?',source.name);if(rows.length!==1||rows[0].content_hash!==bundle.hash)throw new UpgradeError('resources_not_ready');required.push(rows[0]);}
   const added=required.filter(s=>!selected(live.config).includes(s.id));if(!added.length)throw new UpgradeError('upgrade_not_available');
   const proposed={name:live.name,department:live.department,description:live.description,instructions:live.instructions,revision:live.revision,config:{...structuredClone(live.config),skills:[...live.config.skills,...added.map(s=>s.id)]}};
   const impact=await this.templates.impact(live.id,proposed);
   const review={kind:'bindings' as const,sourceKey,resourceId,templateId:live.id,revision:live.revision,name:live.name,files:[],specialties:[{id:live.id,name:live.name}],agents:impact.agents,bindings:added.map(s=>s.name)};
   const token=hash({owner,fingerprint,review,proposed,required,impact:impact.confirmation,scope});
   return {kind:'bindings' as const,review,token,scope,fingerprint,live,proposed,impact,required};
  }
  if(!role.skills.includes(resourceId))throw new UpgradeError('invalid_input',400);
  const source=loaded.pack.skills.find(s=>s.id===resourceId)!;
  const bundle=this.skills.validatePortable(source.name,source.files),files=bundle.files,expectedHash=bundle.hash;
  const duplicate=await q.one<{name:string}>('SELECT name FROM central_skills WHERE content_hash=?',expectedHash);
  if(duplicate&&duplicate.name!==source.name)throw new UpgradeError('resources_not_ready');
  const rows=await q.all<any>('SELECT id,name,revision,content_hash FROM central_skills WHERE name=?',source.name);
  if(rows.length>1)throw new UpgradeError('resources_not_ready');const existing=rows[0]??null;
  if(existing?.content_hash===expectedHash)throw new UpgradeError('upgrade_not_available');
  const oldFiles=existing?(await this.skills.read(existing.id)).files:[];
  const paths=[...new Set([...oldFiles.map(f=>f.path),...files.map(f=>f.path)])].sort();
  const changes=paths.map(path=>({path,before:oldFiles.find(f=>f.path===path)?.content??'',after:files.find(f=>f.path===path)?.content??''})).filter(f=>f.before!==f.after);
  const affected=consumers(scope,existing?.id??null);
  const review={kind:'package' as const,sourceKey,resourceId,templateId:live.id,revision:existing?.revision??0,name:source.name,files:changes,...affected,bindings:[]};
  const expected={id:existing?.id??null,revision:existing?.revision??0,hash:existing?.content_hash??null};
  const token=hash({owner,fingerprint,review,live,scope,expected,expectedHash});
  return {kind:'package' as const,review,token,scope,fingerprint,source,expected};
 }
 async review(owner:string,sourceKey:string,resourceId:string){const state=await this.state(owner,sourceKey,resourceId);return {...state.review,reviewToken:state.token};}
 async apply(owner:string,sourceKey:string,resourceId:string,reviewToken:string){
  if(typeof reviewToken!=='string'||!/^([a-f0-9]{64})$/.test(reviewToken))throw new UpgradeError('invalid_input',400);
  const state=await this.state(owner,sourceKey,resourceId);if(state.token!==reviewToken)throw new UpgradeError('review_changed');
  const load=this.load,expectedScope=hash(state.scope);
  const guard=function*():Step<void>{
   const d=yield* dialect();
   if(d==='postgres')yield* run('LOCK TABLE central_skills,specialty_templates,agent_specialties,central_agent_skills,agent_template_snapshots,agents_config IN SHARE ROW EXCLUSIVE MODE');
   if(load().fingerprint!==state.fingerprint||hash(yield* snapshot())!==expectedScope)throw new UpgradeError('review_changed');
   if(state.kind==='bindings')for(const expected of state.required){const rows=yield* all<any>('SELECT id,name,revision,content_hash FROM central_skills WHERE name=?',expected.name);if(rows.length!==1||hash(rows[0])!==hash(expected))throw new UpgradeError('resources_not_ready');}
  };
  let revision:number;
  if(state.kind==='bindings'){
   const saved=await this.templates.save(state.live.id,{...state.proposed,confirmImpact:state.impact.confirmation},guard);revision=saved.revision;
  }else{
   const result=await this.skills.installReviewedPortable(state.source.name,state.source.files,state.expected,guard);revision=result.skill.revision;
  }
  return {kind:state.kind,sourceKey,resourceId,templateId:state.review.templateId,revision,name:state.review.name};
 }
}
