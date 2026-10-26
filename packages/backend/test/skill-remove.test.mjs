import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dpro-skill-remove-'));process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'agent-player.db');process.env.JWT_SECRET=randomBytes(64).toString('hex');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();for(const [id,role] of [['remove-owner','owner'],['remove-admin','admin']])db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'fixture',?,'active')").run(id,id+'@example.invalid',id,role);
const {default:Fastify}=await import('fastify'),{registerAuthGate}=await import('../src/auth/auth-gate.ts'),{generateToken}=await import('../src/auth/jwt.ts'),{CentralSkills}=await import('../src/skills/central-store.ts'),{skillLibraryRoutes}=await import('../src/api/routes/skill-library.ts');
const store=new CentralSkills(root,path.join(root,'skill-library'),[]),app=Fastify();registerAuthGate(app);await app.register(skillLibraryRoutes,{store});await app.ready();
const owner={authorization:'Bearer '+generateToken('remove-owner',1)},admin={authorization:'Bearer '+generateToken('remove-admin',1)},del=(id,payload,headers=owner)=>app.inject({method:'DELETE',url:'/api/skill-library/items/'+id,headers,payload});
const add=async name=>(await store.installMarkdown(`---\nname: ${name}\ndescription: Fictional skill\n---\nUse the fictional notebook.\n`,name,'test')).skill;
test.after(async()=>{await app.close();closeDatabase();await fs.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});});

test('remove a skill: owner only, after a confirm, only when nothing uses it',async()=>{
 const free=await add('fictional-free'),given=await add('fictional-given'),asked=await add('fictional-asked');
 db.prepare("INSERT INTO agents_config(id,name,role) VALUES('remove-agent','Fictional agent','specialist')").run();
 db.prepare('INSERT INTO central_agent_skills(agent_id,skill_id) VALUES(?,?)').run('remove-agent',given.id);
 db.prepare("INSERT INTO specialty_templates(id,name,department,description,revision,content_hash,config_json) VALUES(?,?,?,?,1,?,?)").run(randomUUID(),'Fictional job','Testing','',('a'.repeat(64)),JSON.stringify({primarySkill:asked.id,skills:[]}));
 const n=()=>db.prepare('SELECT COUNT(*) n FROM central_skills').get().n,before=n();
 assert.equal((await del(free.id,{revision:free.revision,confirmed:true},admin)).statusCode,403);
 for(const body of [undefined,{revision:free.revision},{revision:free.revision,confirmed:false},{revision:0,confirmed:true},{revision:free.revision,confirmed:true,force:true}])assert.equal((await del(free.id,body)).statusCode,400,JSON.stringify(body));
 assert.equal((await del('not-a-uuid',{revision:1,confirmed:true})).statusCode,400);
 assert.equal((await del(free.id,{revision:free.revision+1,confirmed:true})).json().code,'version_conflict');
 let r=await del(given.id,{revision:given.revision,confirmed:true});assert.equal(r.statusCode,409);assert.deepEqual(r.json(),{code:'skill_in_use',agents:1,specialties:0});
 r=await del(asked.id,{revision:asked.revision,confirmed:true});assert.equal(r.statusCode,409);assert.deepEqual(r.json(),{code:'skill_in_use',agents:0,specialties:1});
 assert.equal(n(),before);
 r=await del(free.id,{revision:free.revision,confirmed:true});assert.equal(r.statusCode,200,r.body);assert.deepEqual(r.json(),{removed:true});assert.equal(n(),before-1);
 assert.equal((await del(free.id,{revision:free.revision,confirmed:true})).statusCode,404);
});
