import type { FastifyInstance } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import { requireAdmin, requireMember, ScopeError } from '../../repositories/scope.js';
import { repositories } from '../../repositories/index.js';
import { CentralSkills, centralSkills, SkillLibraryError } from '../../skills/central-store.js';
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const hex=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const record=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export async function skillLibraryRoutes(app:FastifyInstance,options:{store?:CentralSkills}={}){
 const store=options.store??centralSkills();await store.initialize();await store.seedBundled();
 const owner=(request:any)=>{const actor=requireAdmin(actorOf(request));if(actor.kind!=='user'||!actor.userId)throw new ScopeError(403,'Forbidden');return actor.userId;};
 const error=(reply:any,e:unknown)=>reply.code(e instanceof ScopeError?e.status:e instanceof SkillLibraryError?e.status:503).send({code:e instanceof ScopeError?'forbidden':e instanceof SkillLibraryError?e.code:'skill_unavailable'});
 const agent=async(request:any,id:string)=>{requireAdmin(actorOf(request));if(!/^[A-Za-z0-9_-]{1,100}$/.test(id)||id==='small-local-agent')throw new SkillLibraryError('invalid_agent');if(!(await repositories.agents.getConfig(actorOf(request),id)))throw new SkillLibraryError('agent_not_found',404);};
 app.get('/api/skill-library',async(request,reply)=>{try{requireMember(actorOf(request));return {skills:await store.list()};}catch(e){return error(reply,e);}});
 app.get('/api/skill-library/usage',async(request,reply)=>{try{owner(request);return await store.usage();}catch(e){return error(reply,e);}});
 // Owner only, never through MCP: the app asks once before it sends this.
 app.delete<{Params:{id:string}}>('/api/skill-library/items/:id',{bodyLimit:1024},async(request,reply)=>{try{const actor=requireAdmin(actorOf(request));if(actor.kind!=='user'||actor.role!=='owner'||!actor.userId)throw new ScopeError(403,'Forbidden');const body=request.body;
  if(!uuid(request.params.id)||!record(body)||Object.keys(body).sort().join(',')!=='confirmed,revision'||body.confirmed!==true||!Number.isSafeInteger(body.revision)||body.revision<1)throw new SkillLibraryError('invalid_input');
  try{return await store.removeUnused(request.params.id,body.revision);}catch(e){const used=(e as {used?:{agents:number;specialties:number}}).used;if(used)return reply.code(409).send({code:'skill_in_use',...used});throw e;}}catch(e){return error(reply,e);}});
 app.get<{Params:{id:string}}>('/api/skill-library/items/:id',async(request,reply)=>{try{owner(request);if(!uuid(request.params.id))throw new SkillLibraryError('invalid_input');return await store.read(request.params.id);}catch(e){return error(reply,e);}});
 app.post('/api/skill-library/scan',async(request,reply)=>{try{const id=owner(request);if(request.body!==undefined&&(!record(request.body)||Object.keys(request.body).length))throw new SkillLibraryError('invalid_input');return store.publicScan(store.startScan(id));}catch(e){return error(reply,e);}});
 app.get<{Params:{id:string}}>('/api/skill-library/scans/:id',async(request,reply)=>{try{const id=owner(request);if(!uuid(request.params.id))throw new SkillLibraryError('invalid_input');return store.publicScan(store.getScan(id,request.params.id));}catch(e){return error(reply,e);}});
 app.post('/api/skill-library/preview',{bodyLimit:2048},async(request,reply)=>{try{const id=owner(request),body=request.body;if(!record(body)||Object.keys(body).sort().join(',')!=='scanId,sourceId'||!uuid(body.scanId)||!uuid(body.sourceId))throw new SkillLibraryError('invalid_input');return await store.preview(id,body.scanId,body.sourceId);}catch(e){return error(reply,e);}});
 app.post('/api/skill-library/import',{bodyLimit:2048},async(request,reply)=>{try{const id=owner(request),body=request.body;if(!record(body)||!['hash,scanId,sourceId','hash,replaceHash,scanId,sourceId'].includes(Object.keys(body).sort().join(','))||!uuid(body.scanId)||!uuid(body.sourceId)||!hex(body.hash)||(body.replaceHash!==undefined&&!hex(body.replaceHash)))throw new SkillLibraryError('invalid_input');return await store.importSource(id,body.scanId,body.sourceId,body.hash,body.replaceHash);}catch(e){return error(reply,e);}});
 app.get<{Params:{id:string}}>('/api/skill-library/agents/:id',async(request,reply)=>{try{await agent(request,request.params.id);return await store.assignments(request.params.id);}catch(e){return error(reply,e);}});
 app.put<{Params:{id:string}}>('/api/skill-library/agents/:id',async(request,reply)=>{try{await agent(request,request.params.id);const body=request.body;if(!record(body)||Object.keys(body).sort().join(',')!=='revision,selected'||!Number.isSafeInteger(body.revision)||body.revision<0||body.revision>=Number.MAX_SAFE_INTEGER||!Array.isArray(body.selected)||body.selected.length>50||!body.selected.every(uuid)||new Set(body.selected).size!==body.selected.length)throw new SkillLibraryError('invalid_input');return await store.assign(request.params.id,body.selected,body.revision);}catch(e){return error(reply,e);}});
}
