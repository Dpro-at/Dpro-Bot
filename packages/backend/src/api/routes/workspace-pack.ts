import type {FastifyInstance} from 'fastify';
import {SpecialtyDistribution,UpgradeError} from '../../services/specialty-distribution.js';
import {WorkspacePacks,PackError} from '../../services/workspace-pack.js';
const exact=(v:any,keys:string[])=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export async function workspacePackRoutes(app:FastifyInstance,options:{store?:WorkspacePacks;distribution?:SpecialtyDistribution}={}){
 const distribution=options.distribution??new SpecialtyDistribution();
 app.get('/api/workspace-pack/specialty-upgrade-preview',{config:{access:'owner',rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
  reply.header('Cache-Control','no-store');
  if(!req.authUser)return reply.code(401).send({code:'unauthenticated'});
  if(req.authUser.role!=='owner')return reply.code(403).send({code:'forbidden'});
  if(Object.keys(req.query as object).length)return reply.code(400).send({code:'invalid_input'});
  try{return await distribution.preview(req.authUser.id);}catch{return reply.code(503).send({code:'upgrade_preview_unavailable'});}
 });
 for(const action of ['review','apply'] as const)app.post('/api/workspace-pack/specialty-upgrade-'+action,{bodyLimit:2000,config:{access:'owner',rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
  reply.header('Cache-Control','no-store');
  if(!req.authUser)return reply.code(401).send({code:'unauthenticated'});
  if(req.authUser.role!=='owner')return reply.code(403).send({code:'forbidden'});
  const b=req.body as any;
  if(Object.keys(req.query as object).length||!exact(b,action==='review'?['sourceKey']:['sourceKey','reviewToken','confirmed'])||typeof b.sourceKey!=='string'||!/^professional-role-[a-f0-9]{24}$/.test(b.sourceKey)||action==='apply'&&(b.confirmed!==true||typeof b.reviewToken!=='string'||!/^[a-f0-9]{64}$/.test(b.reviewToken)))return reply.code(400).send({code:'invalid_input'});
  try{return action==='review'?await distribution.review(req.authUser.id,b.sourceKey):await distribution.apply(req.authUser.id,b.sourceKey,b.reviewToken);}
  catch(error){
   const known=['version_conflict','impact_confirmation_required','configuration_changed','invalid_permissions','tools_changed','skill_unavailable'];
   if(error instanceof UpgradeError)return reply.code(error.status).send({code:error.code});
   if(error&&typeof error==='object'&&'code' in error&&known.includes(String(error.code)))return reply.code(409).send({code:error.code});
   return reply.code(503).send({code:'upgrade_preview_unavailable'});
  }
 });
 const store=options.store??new WorkspacePacks();for(const action of ['export','preview','import'] as const)app.post('/api/workspace-pack/'+action,{bodyLimit:2_100_000,config:{access:'owner',rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
  reply.header('Cache-Control','no-store');if(!req.authUser)return reply.code(401).send({code:'unauthenticated'});if(req.authUser.role!=='owner')return reply.code(403).send({code:'forbidden'});const b=req.body as any;if(Object.keys(req.query as object).length)return reply.code(400).send({code:'invalid_pack'});
  try{if(action==='export'){if(!exact(b,['agents','personalities','specialties','skills'])||!Object.values(b).every(x=>typeof x==='boolean')||!Object.values(b).some(Boolean))throw new PackError('invalid_pack');return {pack:await store.export(b)};}
   if(!exact(b,action==='preview'?['pack']:['pack','fingerprint','confirmed'])||action==='import'&&(b.confirmed!==true||typeof b.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(b.fingerprint)))throw new PackError('invalid_pack');return action==='preview'?await store.preview(b.pack):await store.import(req.authUser.id,b.pack,b.fingerprint);
  }catch(error){return reply.code(error instanceof PackError?error.status:400).send({code:error instanceof PackError?error.code:'invalid_pack'});}
 });
}
