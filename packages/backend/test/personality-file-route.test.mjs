import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {randomBytes} from 'node:crypto';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dpro-personality-route-'));process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'test.db');process.env.JWT_SECRET=randomBytes(64).toString('hex');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();
for(const [id,role]of [['profile-owner','owner'],['profile-admin','admin'],['profile-member','user']])db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'fictional',?,'active')").run(id,id+'@example.invalid',id,role);
const {default:Fastify}=await import('fastify'),{registerAuthGate}=await import('../src/auth/auth-gate.ts'),{generateToken}=await import('../src/auth/jwt.ts'),{agentFilesRoutes}=await import('../src/api/routes/agent-files.ts');
const app=Fastify();registerAuthGate(app);await app.register(agentFilesRoutes);await app.ready();
const url='/api/agents/fictional-profile/personality',headers=id=>({authorization:'Bearer '+generateToken(id,1)});
test('raw personality reads and writes require an owner before examining input',async()=>{
 for(const method of ['GET','PUT']){assert.equal((await app.inject({method,url,...(method==='PUT'?{payload:{content:'denied'}}:{})})).statusCode,401);for(const id of ['profile-admin','profile-member'])assert.equal((await app.inject({method,url,headers:headers(id),...(method==='PUT'?{payload:{content:'denied'}}:{})})).statusCode,403);}
 await assert.rejects(fs.stat(path.join(root,'agents','fictional-profile')),{code:'ENOENT'});
});
test('the owner can edit the fixed profile and malformed or aliased input is refused',async()=>{
 const owner=headers('profile-owner');assert.equal((await app.inject({method:'PUT',url,headers:owner,payload:{content:'Owner-reviewed personality'}})).statusCode,200);assert.equal((await app.inject({method:'GET',url,headers:owner})).json().content,'Owner-reviewed personality');
 for(const content of [null,{},[],42,''])assert.equal((await app.inject({method:'PUT',url,headers:owner,payload:{content}})).statusCode,400);
 assert.equal((await app.inject({method:'PUT',url,headers:owner,payload:{content:'new',path:'/outside'}})).statusCode,400);
 assert.equal((await app.inject({method:'PUT',url:'/api/agents/a%2Ffictional-profile/personality',headers:owner,payload:{content:'wrong'}})).statusCode,400);
 assert.equal((await app.inject({method:'GET',url,headers:owner})).json().content,'Owner-reviewed personality');
});
test.after(async()=>{await app.close();closeDatabase();});
