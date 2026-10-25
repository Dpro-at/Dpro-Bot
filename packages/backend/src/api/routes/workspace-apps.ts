import type {FastifyInstance} from 'fastify';
import {listWorkspaceApps,type WorkspaceAppsSources} from '../../services/workspace-apps.js';

export async function workspaceAppsRoutes(app:FastifyInstance,options:{sources?:WorkspaceAppsSources}={}){
  app.get('/api/apps',{config:{access:'owner'}},async(request,reply)=>{
    if(!request.authUser)return reply.code(401).send({code:'unauthenticated'});
    if(request.authUser.role!=='owner')return reply.code(403).send({code:'forbidden'});
    if(Object.keys(request.query as object).length)return reply.code(400).send({code:'invalid_input'});
    reply.header('Cache-Control','no-store');
    try{return await listWorkspaceApps(request.authUser.id,options.sources);}
    catch{return reply.code(503).send({code:'apps_unavailable'});}
  });
}
