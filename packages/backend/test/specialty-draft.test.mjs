import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {randomBytes} from 'node:crypto';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dpro-specialty-draft-'));process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'agent-player.db');process.env.JWT_SECRET=randomBytes(64).toString('hex');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');
const before=process.env.OLLAMA_URL;process.env.OLLAMA_URL='http://127.0.0.1:11434';
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();for(const [id,role] of [['draft-owner','owner'],['draft-member','user']])db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'fictional',?,'active')").run(id,id+'@example.invalid',id,role);
const {draftSpecialty,firstJsonObject}=await import('../src/services/specialty-draft.ts');
const catalogue={skills:[{id:'11111111-1111-1111-1111-111111111111',name:'Newsletter writing'},{id:'22222222-2222-2222-2222-222222222222',name:'Accounting'}],tools:[{name:'web_fetch',description:'Read a web page',fingerprint:null,available:true},{name:'execute_code',description:'Run code',fingerprint:null,available:false}]};
const answer=JSON.stringify({name:'Newsletter writer',department:'creative work',responsibilities:'Writes the weekly newsletter.',instructions:'# How you work\n\nWrite it.',skills:['Newsletter writing','Invented skill'],tools:['web_fetch','execute_code','made_up_tool']});
const ollama=(content,calls=[])=>async(url,init)=>{calls.push({url:String(url),init,body:JSON.parse(init.body)});return new Response(JSON.stringify({message:{content},done:true})+'\n',{status:200,headers:{'content-type':'application/x-ndjson'}});};
test.after(()=>{if(before===undefined)delete process.env.OLLAMA_URL;else process.env.OLLAMA_URL=before;closeDatabase();return fs.rm(root,{recursive:true,force:true});});

test('SP3b: the local model drafts a specialty; only catalogue skills and available tools are kept',async()=>{
 const calls=[];const result=await draftSpecialty({description:'Writes our weekly newsletter.',departments:['Creative work','Business and customers']},catalogue,ollama('Here it is:\n```json\n'+answer+'\n```',calls));
 assert.equal(calls.length,1);assert.equal(calls[0].url,'http://127.0.0.1:11434/api/chat');assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].body.tools,undefined);assert.equal(calls[0].body.messages.length,2);
 assert.equal(result.generated,true);assert.equal(result.draft.name,'Newsletter writer');assert.equal(result.draft.department,'Creative work');
 assert.deepEqual(result.draft.config.skills,['11111111-1111-1111-1111-111111111111']);assert.deepEqual(result.draft.config.tools,[{name:'web_fetch',fingerprint:null}]);
 assert.equal(result.draft.config.primarySkill,null);assert.ok(Object.values(result.draft.config.modes).every(m=>m==='ask'));
});
test('SP3b: never reaches a model that is not on this computer, and refuses bad input',async()=>{
 const calls=[];process.env.OLLAMA_URL='https://example.invalid';
 try{await assert.rejects(draftSpecialty({description:'A job.'},catalogue,ollama(answer,calls)),/local_model_required/);}finally{process.env.OLLAMA_URL='http://127.0.0.1:11434';}
 assert.equal(calls.length,0);
 for(const input of [{},{description:''},{description:'x'.repeat(2001)},{description:'ok',model:'paid'},{description:'ok',departments:'Creative'}])await assert.rejects(draftSpecialty(input,catalogue,ollama(answer,calls)),/invalid_input/);
 assert.equal(calls.length,0);
 await assert.rejects(draftSpecialty({description:'A job.'},catalogue,ollama('no json here')),/draft_unavailable/);
 await assert.rejects(draftSpecialty({description:'A job.'},catalogue,async()=>{throw new Error('connection refused');}),/draft_unavailable/);
});
test('SP3b: the JSON reader takes the first whole object and ignores braces inside strings',()=>{
 assert.deepEqual(firstJsonObject('x {"a":"}{","b":{"c":1}} y {"d":2}'),{a:'}{',b:{c:1}});
 assert.equal(firstJsonObject('{"a":'),null);assert.equal(firstJsonObject('[1,2]'),null);
});
test('SP3b route: owner only, one draft at a time, nothing saved',async()=>{
 const {default:Fastify}=await import('fastify'),{registerAuthGate}=await import('../src/auth/auth-gate.ts'),{generateToken}=await import('../src/auth/jwt.ts'),{specialtyTemplateRoutes}=await import('../src/api/routes/specialty-templates.ts');
 let release;const gate=new Promise(r=>{release=r;});const slow=async(url,init)=>{await gate;return ollama(answer)(url,init);};
 const app=Fastify();registerAuthGate(app);await app.register(specialtyTemplateRoutes,{fetchImpl:slow});await app.ready();
 try{
  const owner={authorization:'Bearer '+generateToken('draft-owner',1)},member={authorization:'Bearer '+generateToken('draft-member',1)},url='/api/specialty-templates/draft',payload={description:'Writes our weekly newsletter.'};
  const count=db.prepare('SELECT COUNT(*) n FROM specialty_templates').get().n;
  assert.equal((await app.inject({method:'POST',url,headers:member,payload})).statusCode,403);
  const first=app.inject({method:'POST',url,headers:owner,payload});await new Promise(r=>setTimeout(r,50));
  const busy=await app.inject({method:'POST',url,headers:owner,payload});assert.equal(busy.statusCode,429);assert.equal(busy.json().code,'draft_busy');
  release();const done=await first;assert.equal(done.statusCode,200,done.body);assert.equal(done.json().draft.name,'Newsletter writer');
  assert.equal((await app.inject({method:'POST',url,headers:owner,payload})).statusCode,200);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM specialty_templates').get().n,count);
 }finally{await app.close();}
});
