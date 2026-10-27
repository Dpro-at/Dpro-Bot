import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const backend=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'type-contracts-'));
process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'test.db');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');process.env.JWT_SECRET=randomBytes(64).toString('hex');
for(const k of ['SMTP_HOST','SMTP_USER','SMTP_PASS'])process.env[k]='';
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();
db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES('types-owner','owner@example.invalid','types-owner','fixture','owner','active')").run();
const {default:Fastify}=await import('fastify');
const {registerEmailRoutes}=await import('../src/api/routes/email.ts');const {generateToken}=await import('../src/auth/jwt.ts');const {emailService}=await import('../src/services/email-service.ts');
const headers={authorization:'Bearer '+generateToken('types-owner',1)};
after(()=>{process.chdir(backend);closeDatabase();});
test('email failures use FastifyReply and never attempt real delivery',async()=>{
 const app=Fastify();await registerEmailRoutes(app);
 const original={isConfigured:emailService.isConfigured,verify:emailService.verify,sendTestEmail:emailService.sendTestEmail};let calls=0;
 emailService.isConfigured=()=>false;emailService.verify=async()=>{calls++;return false;};emailService.sendTestEmail=async()=>{calls++;return false;};
 try{
  for(const [method,url]of [['GET','/api/email/status'],['POST','/api/email/verify'],['POST','/api/email/test']]){const r=await app.inject({method,url,payload:method==='POST'?{}:undefined});assert.equal(r.statusCode,401,r.body);}
  assert.equal((await app.inject({method:'POST',url:'/api/email/verify',headers})).statusCode,400);
  for(const payload of [{},{to:'bad'},{to:'fake@example.invalid'}])assert.equal((await app.inject({method:'POST',url:'/api/email/test',headers,payload})).statusCode,400);
  assert.equal(calls,0);emailService.isConfigured=()=>true;
  const response=await app.inject({method:'POST',url:'/api/email/test',headers,payload:{to:'fake@example.invalid'}});assert.equal(response.statusCode,500);assert.equal(response.json().error,'Failed to send test email');assert.equal(calls,1);
 }finally{Object.assign(emailService,original);await app.close();}
});
test('extension permission refusal keeps its error and records valid audit severity',async()=>{
 const {createExtensionApi}=await import('../src/plugins/sdk.ts');const app=Fastify();const registrations=[];const engine={register:(...args)=>registrations.push(args)};
 process.chdir(root);
 try{
  const api=createExtensionApi('fixture-denied',app,db,engine,root);
  assert.throws(()=>api.db,/missing permission: database/);
  assert.throws(()=>api.registerTool({name:'fixture_tool',description:'fixture',input_schema:{type:'object',properties:{}},execute:async()=>({content:[]})}),/missing permission/);
  assert.throws(()=>api.registerCronJob('0 0 * * *',async()=>{},'job'),/missing permission/);
  const rows=db.prepare("SELECT severity FROM audit_logs WHERE event_type='extension.permission.denied' ORDER BY id").all();assert.equal(rows.length,3);assert.deepEqual(rows.map(r=>r.severity).sort(),['error','warning','warning']);assert.equal(registrations.length,0);
  const dir=path.join(root,'extensions/fixture-allowed');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'agentplayer.plugin.json'),JSON.stringify({permissions:['cron']}));
  const allowed=createExtensionApi('fixture-allowed',app,db,engine,dir);allowed.registerCronJob('0 0 * * *',async()=>{},'job');assert.equal(registrations.length,1);assert.equal(registrations[0][0],'ext:fixture-allowed:job');assert.equal(registrations[0][1],'0 0 * * *');assert.equal(typeof registrations[0][2],'function');assert.equal(db.prepare("SELECT severity FROM audit_logs WHERE event_type='extension.cron.registered'").get().severity,'info');
 }finally{process.chdir(backend);await app.close();}
});
test('example result decoder preserves structured values and rejects malformed consumed fields',async()=>{
 const {exampleData}=await import('../src/tools/example-data.ts');
 assert.deepEqual(exampleData({content:[]}),{});
 const data={path:'fixture.png',viewport:{width:800,height:600},metadata:{title:'Fictional',description:null,keywords:['fictional','fixture']},memories:[{content:'fixture',importance:8,tags:['fixture']}],extra:'retained'};
 assert.deepEqual(exampleData({content:[],data}),data);
 for(const data of [[],false,'bad',{count:'bad'},{memories:[{importance:'bad'}]},{metadata:{title:42}}])assert.throws(()=>exampleData({content:[],data}));
});
test('IMAP folder traversal handles typed nested boxes without opening a connection',async()=>{
 const {imapService}=await import('../src/services/imap-service.ts');
 const folders=await imapService.listFolders({getBoxes:async()=>({INBOX:{delimiter:'/',attribs:['\\Inbox'],children:{Archive:{delimiter:'/',attribs:[]}}}})});
 assert.equal(folders[0].path,'INBOX');assert.equal(folders[0].children[0].path,'INBOX/Archive');
});
