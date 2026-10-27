const base='/api/workspace-pack/specialty-upgrade-';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const key=v=>typeof v==='string'&&/^professional-role-[a-f0-9]{24}$/.test(v);
const id=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
const revision=v=>Number.isSafeInteger(v)&&v>0;
const list=(v,max,check)=>Array.isArray(v)&&v.length<=max&&v.every(check);
export function upgradeRoute(path){return ['preview','review','apply'].find(a=>path===base+a)||null;}
export function allowedUpgrade(method,path,body){
 const action=upgradeRoute(path);if(action==='preview')return method==='GET'&&body===undefined;
 return method==='POST'&&(action==='review'?exact(body,['sourceKey'])&&key(body.sourceKey):action==='apply'&&exact(body,['sourceKey','reviewToken','confirmed'])&&key(body.sourceKey)&&hash(body.reviewToken)&&body.confirmed===true);
}
const status=['current','content_update_available','local_conflict','ambiguous','unmatched','retired'];
function resource(v){if(!object(v)||!text(v.sourceId,64)||!text(v.name,100)||!['current','missing','conflict','ambiguous'].includes(v.status))throw Error('Invalid update resource');if(v.assigned!==undefined&&typeof v.assigned!=='boolean')throw Error('Invalid update resource');return {sourceId:v.sourceId,name:v.name,status:v.status,...(v.assigned!==undefined?{assigned:v.assigned}:{})};}
function role(v){
 if(!object(v)||!key(v.sourceKey)||!text(v.sourceId,64)||!status.includes(v.status)||!list(v.installedIds,30,id))throw Error('Invalid update role');
 const value={sourceKey:v.sourceKey,sourceId:v.sourceId,status:v.status,installedIds:[...v.installedIds]};
 if(v.status!=='retired'){if(!text(v.name,80)||!hash(v.contentRevision))throw Error('Invalid update role');Object.assign(value,{name:v.name,contentRevision:v.contentRevision});}
 if(v.revision!==undefined){if(!revision(v.revision)||!list(v.linkedAgentIds,10000,x=>text(x,200))||!list(v.packResources,100,object)||v.preservesConfiguration!==true)throw Error('Invalid update role');Object.assign(value,{revision:v.revision,linkedAgentIds:[...v.linkedAgentIds],packResources:v.packResources.map(resource),preservesConfiguration:true});}
 return value;
}
export function upgradeResponse(path,statusCode,b){
 if(statusCode!==200){const codes=['unauthenticated','forbidden','invalid_input','upgrade_not_available','resources_not_ready','review_changed','version_conflict','impact_confirmation_required','configuration_changed','invalid_permissions','tools_changed','skill_unavailable'];return {code:codes.includes(b?.code)?b.code:'upgrade_preview_unavailable'};}
 if(!object(b))throw Error('Invalid update response');
 const action=upgradeRoute(path);
 if(action==='preview'){
  if(b.namespace!=='professional-v1'||!hash(b.fingerprint)||b.readOnly!==true||b.applySupported!==true||b.requiresFreshReview!==true||!list(b.roles,10000,object)||!list(b.resources,100,object)||!list(b.unmatchedInstalledIds,10000,id))throw Error('Invalid update preview');
  return {namespace:b.namespace,fingerprint:b.fingerprint,readOnly:true,applySupported:true,requiresFreshReview:true,roles:b.roles.map(role),resources:b.resources.map(resource),unmatchedInstalledIds:[...b.unmatchedInstalledIds]};
 }
 if(!id(b.templateId)||!revision(b.revision)||!text(b.name,80))throw Error('Invalid update response');
 if(action==='apply')return {templateId:b.templateId,revision:b.revision,name:b.name};
 if(action!=='review'||!key(b.sourceKey)||!hash(b.reviewToken)||!list(b.changes,4,c=>object(c)&&['name','department','description','instructions'].includes(c.field)&&text(c.before,30001)&&text(c.after,30001))||!list(b.agents,10000,a=>object(a)&&text(a.id,200)&&text(a.name,200)))throw Error('Invalid update review');
 return {sourceKey:b.sourceKey,templateId:b.templateId,revision:b.revision,name:b.name,reviewToken:b.reviewToken,changes:b.changes.map(c=>({field:c.field,before:c.before,after:c.after})),agents:b.agents.map(a=>({id:a.id,name:a.name}))};
}
