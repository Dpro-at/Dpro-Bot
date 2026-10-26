import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dpro-specialty-versions-'));process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'agent-player.db');process.env.JWT_SECRET=randomBytes(64).toString('hex');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();for(const [id,role] of [['versions-owner','owner'],['versions-member','user']])db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'fictional',?,'active')").run(id,id+'@example.invalid',id,role);
const {default:Fastify}=await import('fastify'),{registerAuthGate}=await import('../src/auth/auth-gate.ts'),{generateToken}=await import('../src/auth/jwt.ts'),{specialtyTemplateRoutes}=await import('../src/api/routes/specialty-templates.ts');
const app=Fastify();registerAuthGate(app);await app.register(specialtyTemplateRoutes);await app.ready();
const owner={authorization:'Bearer '+generateToken('versions-owner',1)},member={authorization:'Bearer '+generateToken('versions-member',1)},base='/api/specialty-templates',call=(method,url,payload,headers=owner)=>app.inject({method,url,headers,...(payload===undefined?{}:{payload})});
const config={primarySkill:null,skills:[],tools:[],memoryRead:['task'],memoryWrite:[],sharedMemory:false,modes:{browser:'ask',network:'ask',message:'ask',delete:'ask',install:'ask',money:'ask',settings:'ask'}};
test.after(async()=>{await app.close();closeDatabase();await fs.rm(root,{recursive:true,force:true});});

test('SP2: every save keeps the replaced revision; versions are owner-only reads',async()=>{
 const id=randomUUID();let body={name:'Fictional editor',department:'Creative work',description:'Edits fictional texts.',instructions:'# Version one',config,revision:0};
 let saved=await call('PUT',base+'/'+id,body);assert.equal(saved.statusCode,200,saved.body);
 assert.deepEqual((await call('GET',base+'/'+id+'/versions')).json().versions.map(v=>[v.revision,v.current]),[[1,true]]);
 for(const [n,text] of [[1,'# Version two'],[2,'# Version three']]){saved=await call('PUT',base+'/'+id,{...body,name:'Fictional editor '+(n+1),instructions:text,revision:n});assert.equal(saved.statusCode,200,saved.body);}
 const list=(await call('GET',base+'/'+id+'/versions')).json().versions;
 assert.deepEqual(list.map(v=>[v.revision,v.current,v.name]),[[3,true,'Fictional editor 3'],[2,false,'Fictional editor 2'],[1,false,'Fictional editor']]);assert.equal(list[0].replacedAt,null);assert.ok(list[1].replacedAt);
 const one=(await call('GET',base+'/'+id+'/versions/1')).json();assert.match(one.instructions,/Version one/);assert.equal(one.revision,1);assert.equal(one.name,'Fictional editor');
 assert.match((await call('GET',base+'/'+id+'/versions/3')).json().instructions,/Version three/);
 const count=db.prepare('SELECT COUNT(*) n FROM specialty_template_versions').get().n,live=db.prepare('SELECT * FROM specialty_templates WHERE id=?').get(id);
 assert.equal((await call('GET',base+'/'+id+'/versions',undefined,member)).statusCode,403);assert.equal((await call('GET',base+'/'+id+'/versions/1',undefined,member)).statusCode,403);
 for(const r of ['0','01','abc','1.5','9999999999'])assert.equal((await call('GET',base+'/'+id+'/versions/'+r)).statusCode,400,r);
 assert.equal((await call('GET',base+'/'+id+'/versions/7')).statusCode,404);assert.equal((await call('GET',base+'/'+randomUUID()+'/versions')).statusCode,404);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM specialty_template_versions').get().n,count);assert.deepEqual(db.prepare('SELECT * FROM specialty_templates WHERE id=?').get(id),live);
 // Restoring is a normal save of the old text over the live revision: it becomes revision 4 and revision 3 is kept.
 const restored=await call('PUT',base+'/'+id,{name:one.name,department:one.department,description:one.description,instructions:one.instructions,config:one.config,revision:3});assert.equal(restored.statusCode,200,restored.body);assert.equal(restored.json().revision,4);
 assert.deepEqual((await call('GET',base+'/'+id+'/versions')).json().versions.map(v=>v.revision),[4,3,2,1]);
});
