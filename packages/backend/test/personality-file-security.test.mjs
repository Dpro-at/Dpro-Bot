import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dpro-personality-files-'));process.env.AGENT_PLAYER_DATA_DIR=root;
const {readPersonality,writePersonality,initializeAgentDir,getAgentDir,MAX_PERSONALITY_BYTES}=await import('../src/services/agent-files.ts');
test('profile defaults and owner edits are bounded private regular files',async()=>{
 await initializeAgentDir('fictional-profile');const first=await readPersonality('fictional-profile');assert.match(first,/Agent Personality/);await writePersonality('fictional-profile','Reviewed profile');assert.equal(await readPersonality('fictional-profile'),'Reviewed profile');const st=await fs.stat(path.join(getAgentDir('fictional-profile'),'PERSONALITY.md'));if(process.platform!=='win32')assert.equal(st.mode&0o777,0o600);await assert.rejects(writePersonality('fictional-profile','x'.repeat(MAX_PERSONALITY_BYTES+1)));assert.equal(await readPersonality('fictional-profile'),'Reviewed profile');
});
test('invalid ids are refused instead of being aliased to another agent',async()=>{
 for(const id of ['../fictional-profile','a/fictional-profile','a\\fictional-profile','..','.','',null]){assert.throws(()=>getAgentDir(id));await assert.rejects(writePersonality(id,'wrong'));}assert.equal(await readPersonality('fictional-profile'),'Reviewed profile');
});
test('profile symlinks and hardlinks never disclose or truncate their targets',async()=>{
 const outside=path.join(root,'outside');await fs.writeFile(outside,'PRIVATE FIXTURE');
 for(const [id,link]of [['profile-symlink',fs.symlink],['profile-hardlink',fs.link]]){const dir=getAgentDir(id);await fs.mkdir(dir,{mode:0o700});await link(outside,path.join(dir,'PERSONALITY.md'));await assert.rejects(readPersonality(id));await assert.rejects(writePersonality(id,'replacement'));assert.equal(await fs.readFile(outside,'utf8'),'PRIVATE FIXTURE');}
});
test('symlinked agent folders and knowledge folders do not receive default writes',async()=>{
 const outside=path.join(root,'outside-folder');await fs.mkdir(outside);await fs.symlink(outside,path.join(root,'agents','linked-folder'));await assert.rejects(writePersonality('linked-folder','replacement'));await assert.rejects(initializeAgentDir('linked-folder'));assert.deepEqual(await fs.readdir(outside),[]);
 const dir=getAgentDir('linked-knowledge');await fs.mkdir(dir,{mode:0o700});await fs.symlink(outside,path.join(dir,'knowledge'));await assert.rejects(initializeAgentDir('linked-knowledge'));assert.deepEqual(await fs.readdir(outside),[]);
});
test('a leaf replaced with a symlink immediately before rename cannot overwrite the linked target',async()=>{
 await writePersonality('swap-profile','old');const outside=path.join(root,'swap-outside'),file=path.join(getAgentDir('swap-profile'),'PERSONALITY.md');await fs.writeFile(outside,'PRIVATE FIXTURE');const rename=fs.rename;
 fs.rename=async(from,to)=>{if(to===file){await fs.unlink(file);await fs.symlink(outside,file);}return rename(from,to);};
 try{await writePersonality('swap-profile','new');assert.equal(await fs.readFile(outside,'utf8'),'PRIVATE FIXTURE');assert.equal(await readPersonality('swap-profile'),'new');}finally{fs.rename=rename;}
});

test('failed publication preserves the previous profile and removes only its temporary file',async()=>{
 await writePersonality('failed-write','original');const file=path.join(getAgentDir('failed-write'),'PERSONALITY.md'),rename=fs.rename;
 fs.rename=async(from,to)=>{if(to===file)throw Object.assign(Error('fixture failure'),{code:'EIO'});return rename(from,to);};
 try{await assert.rejects(writePersonality('failed-write','replacement'));assert.equal(await readPersonality('failed-write'),'original');assert.deepEqual((await fs.readdir(getAgentDir('failed-write'))).filter(n=>n.startsWith('.personality-')),[]);}finally{fs.rename=rename;}
});
