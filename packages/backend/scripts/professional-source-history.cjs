// Run from the repository root. Verification needs both published commits (a full-history checkout).
// Preserve published releases and append the working source release; preserve recorded sourceKey values for future role renames.
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
const stable=v=>JSON.stringify(v&&typeof v==='object'?(Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))]))):v);
const hash=v=>crypto.createHash('sha256').update(stable(v)).digest('hex');
const content=x=>({name:x.name.trim(),department:x.department.trim(),description:x.description,instructions:x.instructions.replace(/\r\n?/g,'\n').trim()+'\n'});
const releases=['1bc80cff0893bd0a2b03950c0c57eaffb5569130','b9ba5a0f96a545dc737df77964bd2f4de5f57eed'].map(ref=>{const p=JSON.parse(cp.execFileSync('git',['show',ref+':packages/backend/skills/professional-workspace-settings.json'],{encoding:'utf8',maxBuffer:5e6}));return {fingerprint:hash(p),roles:p.specialties.map(x=>({id:x.id,sourceKey:'professional-role-'+hash([x.name,x.department]).slice(0,24),contentHash:hash(content(x))}))};});
// Preserve every previously registered release. Never rebuild away a past importer identity.
const file=require('node:path').join(__dirname,'../skills/professional-source-history.json');
const recorded=JSON.parse(fs.readFileSync(file,'utf8'));
if(recorded.version!==1||!Array.isArray(recorded.releases)||recorded.releases.length<2||stable(recorded.releases.slice(0,2))!==stable(releases))throw Error('published release prefix changed');
// Immutable registered release metadata digests extend the two git-pinned bootstraps.
// Add a digest deliberately when approving a new release; never replace an existing digest.
const pinnedDigests=['8c45c3e9109b04c04396dcf9ffb820650fb93e902f725d8d02c83999af3cbc5f'];
const currentPack=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../skills/professional-workspace-settings.json'),'utf8'));
const working=()=>({fingerprint:hash(currentPack),roles:currentPack.specialties.map(x=>({id:x.id,sourceKey:'professional-role-'+hash([x.name,x.department]).slice(0,24),contentHash:hash(content(x))}))});
if(recorded.releases.length<2+pinnedDigests.length||recorded.releases.length>3+pinnedDigests.length)throw Error('unpinned release');
for(const [index,release] of recorded.releases.slice(2).entries()){
 if(index<pinnedDigests.length?hash(release)!==pinnedDigests[index]:stable(release)!==stable(working()))throw Error('unpinned release');
 if(releases.some(r=>r.fingerprint===release.fingerprint))throw Error('duplicate recorded release');
 releases.push(release);
}
if(!releases.some(r=>r.fingerprint===hash(currentPack)))releases.push(working());
// Freeze the built-in seed from a published revision, rather than trusting live names.
const seedRef='1bc80cff0893bd0a2b03950c0c57eaffb5569130';
const seedText=cp.execFileSync('git',['show',seedRef+':packages/backend/src/services/company-specialties.ts'],{encoding:'utf8'});
const items=JSON.parse(seedText.slice(seedText.indexOf('['),seedText.lastIndexOf(']')+1).replace(/,\s*\]$/,']'));
// Wellness advisors remain outside the reviewed digital-content rollout.
const seeds=items.filter(x=>x.department!=='wellness').map(x=>{const h=crypto.createHash('sha256').update(x.department+':'+x.name).digest('hex');return {id:h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20,32),sourceKey:'professional-role-'+hash([x.name,x.department]).slice(0,24),contentHashes:[releases[0].roles.find(r=>r.sourceKey==='professional-role-'+hash([x.name,x.department]).slice(0,24)).contentHash,hash(content({...x,instructions:'# '+x.name+'\n\n'+x.description+'\n\nUse only assigned tools and memory drawers. Ask when approval is required.'}))]};});
// Current content is recognized directly; its hash becomes a seed baseline when a later source is registered.
// A seeded specialty can already contain a reviewed published release. Keep each as a baseline.
for(const seed of seeds)for(const release of releases.filter(r=>r.fingerprint!==hash(currentPack))){const role=release.roles.find(r=>r.sourceKey===seed.sourceKey);if(role&&!seed.contentHashes.includes(role.contentHash))seed.contentHashes.push(role.contentHash);}
// Existing seed baselines are append-only as well.
for(const seed of seeds){const old=recorded.seeds?.find(s=>s.id===seed.id);if(old){if(old.sourceKey!==seed.sourceKey||old.contentHashes.some(h=>!seed.contentHashes.includes(h)))throw Error('seed identity changed');seed.contentHashes=[...old.contentHashes,...seed.contentHashes.filter(h=>!old.contentHashes.includes(h))];}}
const output=JSON.stringify({version:1,releases,seeds},null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw new Error('history differs from published source');}else fs.writeFileSync(file,output);
