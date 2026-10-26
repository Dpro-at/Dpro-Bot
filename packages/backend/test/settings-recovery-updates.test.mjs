// Settings: new recovery codes (two-step sign-in) and the update check. Throwaway DB, test-only secrets, no network.
// Run: node --import tsx --test test/settings-recovery-updates.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
const dir=mkdtempSync(join(tmpdir(),'ap-settings-recovery-'));
process.env.DATABASE_PATH=join(dir,'test.db');process.env.JWT_SECRET=randomBytes(64).toString('hex');process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');const db=getDatabase();await db.initialize();
const {default:bcrypt}=await import('bcryptjs');const password='Fixture-Setup-Password-729!';const hash=await bcrypt.hash(password,4);
for(const [id,role] of [['owner1','owner'],['member','user']])db.prepare("INSERT INTO users(id,email,username,password_hash,role,status,email_verified) VALUES(?,?,?,?,?,'active',1)").run(id,id+'@example.test',id,hash,role);
const {generateToken}=await import('../src/auth/jwt.ts');
const {registerAuthGate}=await import('../src/auth/auth-gate.ts');
const {verificationRoutes}=await import('../src/api/routes/verification.ts');
const {appUpdateRoutes}=await import('../src/api/routes/app-updates.ts');
const {createUpdateCheck}=await import('../src/maintenance/update-check.ts');
const {beginEnrollment,activateEnrollment,factorChallengeStep}=await import('../src/auth/verification/enrollment.ts');
const {decodeSecret,hotp}=await import('../src/auth/verification/totp.ts');
const {default:Fastify}=await import('fastify');
// The update check under test reads a fake git, never the real checkout or the network.
const calls=[];let behind=0;
const fakeRoot=mkdtempSync(join(tmpdir(),'ap-update-root-'));mkdirSync(join(fakeRoot,'.git'));writeFileSync(join(fakeRoot,'package.json'),JSON.stringify({version:'9.9.9'}));
const git=(args)=>{calls.push(args.join(' '));const a=args.join(' ');
 if(a==='rev-parse --is-inside-work-tree')return {code:0,stdout:'true'};
 if(a==='rev-parse --abbrev-ref HEAD')return {code:0,stdout:'main'};
 if(a==='rev-parse --abbrev-ref --symbolic-full-name @{u}')return {code:0,stdout:'origin/main'};
 if(a==='rev-list --left-right --count HEAD...@{u}')return {code:0,stdout:`0\t${behind}`};
 if(a==='rev-parse --git-path FETCH_HEAD')return {code:0,stdout:'.git/FETCH_HEAD'};
 if(a.startsWith('fetch'))return {code:0,stdout:''};
 return {code:1,stdout:''};};
let clock=1_000_000;
const check=createUpdateCheck({root:fakeRoot,git,now:()=>clock});
const app=Fastify();registerAuthGate(app);await app.register(verificationRoutes);await app.register(appUpdateRoutes(check));await app.ready();
const tokens=new Map();const headers=(id,v=1)=>{const k=id+v;if(!tokens.has(k))tokens.set(k,generateToken(id,v));return {authorization:'Bearer '+tokens.get(k)};};
test.after(async()=>{await app.close();closeDatabase();});
let secret;
const code=(t=Date.now())=>hotp(decodeSecret(secret),BigInt(Math.floor(t/30000)));
test('two-step on: the state says how many recovery codes are left',async()=>{
 const t=Date.now()-120000,b={userId:'owner1',sessionHash:'e'.repeat(64),tokenVersion:1};
 const pending=await beginEnrollment(b,t);secret=pending.secret;
 const first=await activateEnrollment(b,code(t),t);assert.equal(first.recoveryCodes.length,8);
 const r=await app.inject({url:'/api/auth/verification',headers:headers('owner1',2)});
 assert.equal(r.statusCode,200);assert.deepEqual(r.json(),{enabled:true,recoveryLeft:8});
 const off=await app.inject({url:'/api/auth/verification',headers:headers('member')});assert.deepEqual(off.json(),{enabled:false});
 globalThis.firstCodes=first.recoveryCodes;
});
test('new recovery codes need the password and a fresh code; the old ones stop working, the sign-in stays',async()=>{
 const send=payload=>app.inject({method:'POST',url:'/api/auth/verification/recovery-codes',headers:headers('owner1',2),payload});
 assert.equal((await send({password:'wrong',code:code()})).statusCode,403);
 assert.equal((await send({password,code:'000000'})).statusCode,403);
 assert.equal((await send({password,code:code(),extra:1})).statusCode,400);
 assert.equal((await app.inject({method:'POST',url:'/api/auth/verification/recovery-codes',headers:headers('member'),payload:{password,code:'123456'}})).statusCode,403);
 const ok=await send({password,code:code(Date.now()+30000)});assert.equal(ok.statusCode,200,ok.body);
 const fresh=ok.json().recoveryCodes;assert.equal(fresh.length,8);assert.equal(ok.json().requiresSignIn,undefined);assert.equal(ok.headers['cache-control'],'no-store');
 assert.ok(fresh.every(c=>!globalThis.firstCodes.includes(c)));
 // Still signed in with the same session.
 const state=await app.inject({url:'/api/auth/verification',headers:headers('owner1',2)});assert.equal(state.statusCode,200);assert.equal(state.json().recoveryLeft,8);
 // An old code is no longer stored; a new one is.
 const {createHash}=await import('node:crypto');const h=c=>createHash('sha256').update(JSON.stringify(['verification-recovery-v1','owner1',1,c])).digest('hex');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM verification_recovery_codes WHERE code_hash=?').get(h(globalThis.firstCodes[0])).n,0);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM verification_recovery_codes WHERE code_hash=? AND consumed_at IS NULL').get(h(fresh[0])).n,1);
 assert.equal(typeof factorChallengeStep,'function');
});
test('update check: owner only, local read never fetches, Check now fetches once per 30 seconds',async()=>{
 assert.equal((await app.inject({url:'/api/system/updates'})).statusCode,401);
 assert.equal((await app.inject({url:'/api/system/updates',headers:headers('member')})).statusCode,403);
 assert.equal((await app.inject({method:'POST',url:'/api/system/updates/check',headers:headers('member')})).statusCode,403);
 behind=3;calls.length=0;
 const r=await app.inject({url:'/api/system/updates',headers:headers('owner1',2)});assert.equal(r.statusCode,200,r.body);
 assert.deepEqual({...r.json(),lookedAt:null},{kind:'git',version:'9.9.9',branch:'main',follows:'origin/main',ahead:0,behind:3,lookedAt:null,command:'agent-player update'});
 assert.ok(!calls.some(c=>c.startsWith('fetch')));assert.ok(!r.body.includes('http'));
 assert.equal((await app.inject({url:'/api/system/updates?x=1',headers:headers('owner1',2)})).statusCode,400);
 const looked=await app.inject({method:'POST',url:'/api/system/updates/check',headers:headers('owner1',2)});assert.equal(looked.statusCode,200);assert.equal(looked.json().looked,true);
 assert.equal(calls.filter(c=>c.startsWith('fetch')).length,1);
 clock+=1000;const again=await app.inject({method:'POST',url:'/api/system/updates/check',headers:headers('owner1',2)});assert.equal(again.json().looked,false);
 assert.equal(calls.filter(c=>c.startsWith('fetch')).length,1);
 clock+=31000;await app.inject({method:'POST',url:'/api/system/updates/check',headers:headers('owner1',2)});assert.equal(calls.filter(c=>c.startsWith('fetch')).length,2);
});
test('an install that is not a git checkout reports only its version',async()=>{
 const plain=createUpdateCheck({root:mkdtempSync(join(tmpdir(),'ap-update-plain-')),git:()=>({code:1,stdout:''})});
 assert.deepEqual(plain.read(),{kind:'installed',version:'unknown',branch:null,follows:null,behind:null,ahead:null,lookedAt:null,command:null});
 assert.equal((await plain.check()).looked,false);
});
