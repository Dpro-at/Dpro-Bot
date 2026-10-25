import type {FastifyInstance} from 'fastify';
import {WorkspacePacks,PackError} from '../../services/workspace-pack.js';
const exact=(v:any,keys:string[])=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export async function workspacePackRoutes(app:FastifyInstance,options:{store?:WorkspacePacks}={}){
 const store=options.store??new WorkspacePacks();for(const action of ['export','preview','import'] as const)app.post('/api/workspace-pack/'+action,{bodyLimit:2_100_000,config:{access:'owner',rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
  reply.header('Cache-Control','no-store');if(!req.authUser)return reply.code(401).send({code:'unauthenticated'});if(req.authUser.role!=='owner')return reply.code(403).send({code:'forbidden'});const b=req.body as any;if(Object.keys(req.query as object).length)return reply.code(400).send({code:'invalid_pack'});
  try{if(action==='export'){if(!exact(b,['agents','personalities','specialties','skills'])||!Object.values(b).every(x=>typeof x==='boolean')||!Object.values(b).some(Boolean))throw new PackError('invalid_pack');return {pack:await store.export(b)};}
   if(!exact(b,action==='preview'?['pack']:['pack','fingerprint','confirmed'])||action==='import'&&(b.confirmed!==true||typeof b.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(b.fingerprint)))throw new PackError('invalid_pack');return action==='preview'?await store.preview(b.pack):await store.import(req.authUser.id,b.pack,b.fingerprint);
  }catch(error){return reply.code(error instanceof PackError?error.status:400).send({code:error instanceof PackError?error.code:'invalid_pack'});}
 });
}
