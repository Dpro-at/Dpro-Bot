import type {FastifyInstance} from 'fastify';
import {authorizeActiveRole} from '../../auth/route-guards.js';
import {isLoopbackPeer} from './terminal.js';
import {extensionsAvailable} from '../../plugins/extension-runner.js';
import {readStore,localCatalogue,installFromStore,uninstallFromStore} from '../../services/store-catalogue.js';

const ID=/^[a-z0-9][a-z0-9._@:-]{0,319}$/i,HASH=/^[a-f0-9]{64}$/;
const body=(x:unknown,keys:string[])=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k));

/**
 * The Store (STORE-UI-01): one read for the whole window, and Add / Remove for
 * apps from Girru's registry. Owner only, from this computer only (the index
 * includes the coding apps' local catalogue copies). An Add carries the hash
 * of exactly what the owner was shown; the MCP tool uses the same routes.
 */
export async function storeRoutes(app:FastifyInstance,options:{home?:string}={}){
 const guard=(request:Parameters<typeof authorizeActiveRole>[0],reply:Parameters<typeof authorizeActiveRole>[1])=>{
  if(!authorizeActiveRole(request,reply,['owner']))return false;
  if(!isLoopbackPeer(request)){reply.code(403).send({code:'not_loopback'});return false;}
  return true;
 };
 app.get('/api/store',{config:{access:'owner'}},async(request,reply)=>{
  if(!guard(request,reply))return;
  if(Object.keys(request.query as object).length)return reply.code(400).send({code:'invalid_input'});
  reply.header('Cache-Control','no-store');
  try{return await readStore(request.authUser!.id,localCatalogue({home:options.home}));}
  catch{return reply.code(503).send({code:'store_unavailable'});}
 });
 app.post('/api/store/install',{config:{access:'owner'}},async(request,reply)=>{
  if(!guard(request,reply))return;
  const b=request.body as {id?:unknown;hash?:unknown};
  if(!body(b,['id','hash'])||typeof b.id!=='string'||!ID.test(b.id)||typeof b.hash!=='string'||!HASH.test(b.hash))return reply.code(400).send({code:'invalid_input'});
  if(b.id.startsWith('registry:')&&!extensionsAvailable())return reply.code(409).send({code:'not_installable',message:'Adding apps from the registry works only with the local database.'});
  const r=await installFromStore(request.authUser!.id,b.id,b.hash);
  return r.ok?r:reply.code(r.code==='not_found'?404:409).send({code:r.code,message:r.message});
 });
 app.post('/api/store/uninstall',{config:{access:'owner'}},async(request,reply)=>{
  if(!guard(request,reply))return;
  const b=request.body as {id?:unknown};
  if(!body(b,['id'])||typeof b.id!=='string'||!ID.test(b.id))return reply.code(400).send({code:'invalid_input'});
  const r=await uninstallFromStore(request.authUser!.id,b.id);
  return r.ok?r:reply.code(409).send({code:r.code,message:r.message});
 });
}
