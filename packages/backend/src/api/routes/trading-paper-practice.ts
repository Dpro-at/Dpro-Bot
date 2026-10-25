import type {FastifyInstance} from 'fastify';
import {PaperPracticeStore,PracticeError} from '../../services/trading-paper-practice.js';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(v);
const exact=(v:unknown,keys:string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export async function tradingPaperPracticeRoutes(app:FastifyInstance,options:{store?:PaperPracticeStore}={}){
 const store=options.store??new PaperPracticeStore(),base='/api/trading-paper/practice';
 app.addHook('onClose',async()=>store.close());
 app.addHook('onSend',async(_r,reply,payload)=>{reply.header('Cache-Control','no-store');return payload;});
 for(const action of ['read','start','end','order','step','stop'] as const){
  const method=action==='read'?'GET':'POST',url=base+({read:'',start:'',end:'/end',order:'/orders',step:'/step',stop:'/stop-bot'}[action]);
  app.route({method,url,config:{access:'owner',rateLimit:{max:60,timeWindow:'1 minute'}},bodyLimit:2048,handler:async(request,reply)=>{
   const user=request.authUser;if(!user)return reply.code(401).send({code:'unauthenticated'});if(user.role!=='owner')return reply.code(403).send({code:'forbidden'});
   if(Object.keys(request.query as object).length)return reply.code(400).send({code:'invalid_practice_request'});
   const body=request.body;
   if(action==='read'?body!==undefined:action==='start'?!exact(body,[]):!exact(body,action==='order'?['sessionId','requestId','symbol','side','quantity']:action==='step'?['sessionId','requestId']:['sessionId'])||!uuid(body.sessionId)||(['step','order'].includes(action)&&!uuid(body.requestId)))return reply.code(400).send({code:'invalid_practice_request'});
   if(action==='order'&&(!['buy','sell'].includes(String((body as Record<string,unknown>).side))||typeof (body as Record<string,unknown>).symbol!=='string'||!Number.isSafeInteger((body as Record<string,unknown>).quantity)))return reply.code(400).send({code:'invalid_practice_request'});
   try{
    if(action==='read')return store.read(user.id);if(action==='start')return store.start(user.id);
    const b=body as Record<string,unknown>,id=b.sessionId as string;
    if(action==='end')return store.end(user.id,id);if(action==='stop')return store.stopBot(user.id,id);
    return store.order(user.id,{sessionId:id,requestId:b.requestId as string,symbol:action==='step'?'DEMO-ALPHA':b.symbol as string,side:action==='step'?'buy':b.side as 'buy'|'sell',quantity:action==='step'?1:b.quantity as number},action==='step');
   }catch(error){return reply.code(error instanceof PracticeError?error.status:503).send({code:error instanceof PracticeError?error.code:'practice_unavailable'});}
  }});
 }
}
