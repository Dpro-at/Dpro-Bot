// Settings › Account › Signed in: device list and signing out one device. Throwaway DB, test-only secrets, no network.
// Run: node --import tsx --test test/device-sessions.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
const dir=mkdtempSync(join(tmpdir(),'ap-device-sessions-'));
process.env.DATABASE_PATH=join(dir,'test.db');process.env.JWT_SECRET=randomBytes(64).toString('hex');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();
for(const [id,role] of [['ds-owner','owner'],['ds-other','user']])db.prepare("INSERT INTO users(id,email,username,password_hash,role,status,email_verified) VALUES(?,?,?,'x',?,'active',1)").run(id,id+'@example.test',id,role);
const {generateToken,verifyRequestToken}=await import('../src/auth/jwt.ts');
const {recordSession,deviceLabel}=await import('../src/auth/sessions.ts');
const {registerAuthGate}=await import('../src/auth/auth-gate.ts');
const {deviceSessionRoutes}=await import('../src/api/routes/device-sessions.ts');
const {default:Fastify}=await import('fastify');
const app=Fastify();registerAuthGate(app);await app.register(deviceSessionRoutes);await app.ready();
test.after(async()=>{await app.close();closeDatabase();});
const mac='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const win='Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0';
const a=generateToken('ds-owner',1),b=generateToken('ds-owner',1),other=generateToken('ds-other',1);
const h=t=>({authorization:'Bearer '+t});
test('labels are short and plain; the raw browser text is not kept',async()=>{
 assert.equal(deviceLabel(mac),'Chrome on Mac');assert.equal(deviceLabel(win),'Firefox on Windows');
 assert.equal(deviceLabel('Mozilla/5.0 (Macintosh) Electron/38 Dpro'),'Dpro app on Mac');assert.equal(deviceLabel(undefined),'Unknown device');
 await recordSession(a,mac);await recordSession(b,win);await recordSession(other,mac);
 assert.ok(!JSON.stringify(db.prepare('SELECT * FROM auth_sessions').all()).includes('AppleWebKit'));
});
test('the list shows only my own live devices and marks this one',async()=>{
 const r=await app.inject({url:'/api/auth/sessions',headers:h(a)});assert.equal(r.statusCode,200,r.body);
 const list=r.json().sessions;assert.equal(list.length,2);
 assert.deepEqual(list.map(s=>s.label).sort(),['Chrome on Mac','Firefox on Windows']);
 assert.equal(list.find(s=>s.current).label,'Chrome on Mac');assert.ok(list.every(s=>/^[a-f0-9]{24}$/.test(s.id)));
 assert.equal((await app.inject({url:'/api/auth/sessions'})).statusCode,401);
});
test('signing out one device refuses only that token; another account cannot touch it',async()=>{
 const list=(await app.inject({url:'/api/auth/sessions',headers:h(a)})).json().sessions,win=list.find(s=>!s.current);
 assert.equal((await app.inject({method:'POST',url:`/api/auth/sessions/${win.id}/sign-out`,headers:h(other)})).statusCode,404);
 assert.equal((await app.inject({method:'POST',url:`/api/auth/sessions/${win.id}/sign-out?x=1`,headers:h(a)})).statusCode,400);
 assert.equal((await app.inject({method:'POST',url:'/api/auth/sessions/nothex/sign-out',headers:h(a)})).statusCode,404);
 const ok=await app.inject({method:'POST',url:`/api/auth/sessions/${win.id}/sign-out`,headers:h(a)});assert.equal(ok.statusCode,200);assert.deepEqual(ok.json(),{success:true});
 assert.equal((await app.inject({url:'/api/auth/sessions',headers:h(b)})).statusCode,401);
 assert.throws(()=>verifyRequestToken({headers:h(b)}),/Signed out on this device/);
 assert.equal((await app.inject({url:'/api/auth/sessions',headers:h(a)})).json().sessions.length,1);
 assert.equal((await app.inject({method:'POST',url:`/api/auth/sessions/${win.id}/sign-out`,headers:h(a)})).statusCode,404);
});
test('sign out everywhere (token_version bump) empties the list; a token with no row still works until then',async()=>{
 const plain=generateToken('ds-owner',1);assert.equal((await app.inject({url:'/api/auth/sessions',headers:h(plain)})).statusCode,200);
 db.prepare("UPDATE users SET token_version=2 WHERE id='ds-owner'").run();
 const fresh=generateToken('ds-owner',2);await recordSession(fresh,mac);
 const list=(await app.inject({url:'/api/auth/sessions',headers:h(fresh)})).json().sessions;assert.equal(list.length,1);assert.equal(list[0].current,true);
 assert.equal((await app.inject({url:'/api/auth/sessions',headers:h(a)})).statusCode,401);
});
test('a signed-out row is never cleaned up before its token expires',async()=>{
 const t=generateToken('ds-other',1);await recordSession(t,win);
 const id=(await app.inject({url:'/api/auth/sessions',headers:h(t)})).json().sessions.find(s=>s.current).id;
 await app.inject({method:'POST',url:`/api/auth/sessions/${id}/sign-out`,headers:h(other)});
 let last;for(let i=0;i<55;i++){last=generateToken('ds-other',1);await recordSession(last,mac,Date.now()+i);}
 assert.equal((await app.inject({url:'/api/auth/sessions',headers:h(t)})).statusCode,401);
 // The oldest live devices beyond 50 are signed out, not deleted.
 assert.equal((await app.inject({url:'/api/auth/sessions',headers:h(other)})).statusCode,401);
 assert.equal((await app.inject({url:'/api/auth/sessions',headers:h(last)})).json().sessions.length,50);
});
