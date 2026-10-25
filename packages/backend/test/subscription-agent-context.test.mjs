import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'subscription-context-')));
process.env.AGENT_PLAYER_DATA_DIR=root;process.env.DATABASE_PATH=path.join(root,'test.db');
process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');process.env.JWT_SECRET=randomBytes(64).toString('hex');
const {getDatabase,closeDatabase}=await import('../src/db/database.ts');
const db=getDatabase();await db.initialize();
const owner='context-owner';db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'fixture','owner','active')").run(owner,'context@example.invalid',owner);
const {centralSkills,skillBundle}=await import('../src/skills/central-store.ts');
const {SpecialtyTemplates}=await import('../src/services/specialty-templates.ts');
const {PersonalityLibrary}=await import('../src/services/personality-library.ts');
const {profile}=await import('../src/services/personality-library-profile.ts');
const {getAgentDir}=await import('../src/services/agent-files.ts');
const {subscriptionAgentContext,subscriptionReplyPrompt}=await import('../src/services/subscription-agent-context.ts');
const skills=centralSkills();await skills.initialize();const specialties=new SpecialtyTemplates(),library=new PersonalityLibrary();
await library.initialize();
const folder=path.join(root,'fixture-package');await fs.mkdir(path.join(folder,'references'),{recursive:true,mode:0o700});
await fs.writeFile(path.join(folder,'SKILL.md'),'---\nname: context-fixture\ndescription: Synthetic integration fixture\n---\nUse references/guide.md.\n');
await fs.writeFile(path.join(folder,'references/guide.md'),'RESOURCE_MARKER: separate evidence from guesses.\n');
const bundle=await skillBundle(folder),installed=(await skills.installFolder(folder,'test',bundle.hash)).skill;
const template=await specialties.save(randomUUID(),{name:'Fixture editor',department:'research',description:'Synthetic only',instructions:'SPECIALTY_MARKER: preserve quoted numbers.',revision:0,config:{primarySkill:installed.id,skills:[],tools:[],memoryRead:[],memoryWrite:[],sharedMemory:false,modes:Object.fromEntries(['browser','network','message','delete','install','money','settings'].map(k=>[k,'ask']))}});
const personality=await library.save(owner,'context-personality',{revision:0,profile:{...profile('Synthetic calm'),principles:{do:'PERSONALITY_MARKER: be calm and precise.',never:'Do not invent facts.',ask:''}}});
const created=await specialties.hire(owner,{templateId:template.id,revision:template.revision,requestId:randomUUID(),name:'Synthetic context agent',confirmed:true,confirmRisky:false,linked:true,libraryPersonality:{id:personality.id,revision:personality.revision}});
db.prepare('UPDATE agents_config SET system_prompt=? WHERE id=?').run('BASE_MARKER',created.id);
const agentDir=getAgentDir(created.id);await fs.mkdir(agentDir,{recursive:true,mode:0o700});await fs.writeFile(path.join(agentDir,'MEMORY.md'),'PRIVATE_MEMORY_MARKER');
test.after(()=>closeDatabase());
test('selected agent includes database style, linked specialty and complete immutable resources without private memory',async()=>{
 const before=db.prepare('SELECT * FROM agent_permissions WHERE agent_id=?').get(created.id);
 const context=await subscriptionAgentContext(created.id);
 for(const marker of ['BASE_MARKER','PERSONALITY_MARKER','SPECIALTY_MARKER','RESOURCE_MARKER','context-fixture/SKILL.md','context-fixture/references/guide.md'])assert.ok(context.includes(marker),marker);
 assert.ok(!context.includes('PRIVATE_MEMORY_MARKER'));
 assert.ok(!context.includes(path.join(root,'skill-library/objects')),'do not expose private storage paths');
 assert.deepEqual(db.prepare('SELECT * FROM agent_permissions WHERE agent_id=?').get(created.id),before);
 assert.equal(db.prepare('SELECT count(*) n FROM agent_tool_grants WHERE agent_id=?').get(created.id).n,0);
});
test('context belongs to the selected agent and unknown identities fail closed',async()=>{
 const other=await subscriptionAgentContext('main-agent');assert.ok(!other.includes('SPECIALTY_MARKER'));assert.ok(!other.includes('PERSONALITY_MARKER'));
 await assert.rejects(subscriptionAgentContext('missing-agent'),/agent_context_unavailable/);
});
test('history truncation retains complete instruction context and clearly labels missing history',()=>{
 const prompt=subscriptionReplyPrompt('CONTEXT_MARKER', 'old '.repeat(70000)+'LATEST_MESSAGE');
 assert.ok(prompt.includes('CONTEXT_MARKER'));assert.ok(prompt.includes('Earlier conversation omitted'));assert.ok(prompt.endsWith('LATEST_MESSAGE'));
 assert.ok(Buffer.byteLength(prompt)<200000);
 assert.throws(()=>subscriptionReplyPrompt('x'.repeat(90001),'hi'),/agent_context_too_large/);
 assert.throws(()=>subscriptionReplyPrompt('', '\u{1F642}'.repeat(100000)),/agent_context_too_large/);
});
test('assigned immutable resource corruption refuses context rather than claiming it was loaded',async()=>{
 const file=path.join(root,'skill-library/objects',installed.content_hash,'references/guide.md');const original=await fs.readFile(file);
 try{await fs.writeFile(file,'tampered');await assert.rejects(subscriptionAgentContext(created.id),/skill_unavailable/);}
 finally{await fs.writeFile(file,original);}
});
