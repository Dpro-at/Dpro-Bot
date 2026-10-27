// Run from the repository root. Verification needs both published commits (a full-history checkout).
// This bootstrap covers two immutable releases only; preserve recorded sourceKey values for future renames.
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
const stable=v=>JSON.stringify(v&&typeof v==='object'?(Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))]))):v);
const hash=v=>crypto.createHash('sha256').update(stable(v)).digest('hex');
const content=x=>({name:x.name.trim(),department:x.department.trim(),description:x.description,instructions:x.instructions.replace(/\r\n?/g,'\n').trim()+'\n'});
const releases=['1bc80cff0893bd0a2b03950c0c57eaffb5569130','b9ba5a0f96a545dc737df77964bd2f4de5f57eed'].map(ref=>{const p=JSON.parse(cp.execFileSync('git',['show',ref+':packages/backend/skills/professional-workspace-settings.json'],{encoding:'utf8',maxBuffer:5e6}));return {fingerprint:hash(p),roles:p.specialties.map(x=>({id:x.id,sourceKey:'professional-role-'+hash([x.name,x.department]).slice(0,24),contentHash:hash(content(x))}))};});
// Freeze the built-in seed from a published revision, rather than trusting live names.
const seedRef='1bc80cff0893bd0a2b03950c0c57eaffb5569130';
const seedText=cp.execFileSync('git',['show',seedRef+':packages/backend/src/services/company-specialties.ts'],{encoding:'utf8'});
const items=JSON.parse(seedText.slice(seedText.indexOf('['),seedText.lastIndexOf(']')+1).replace(/,\s*\]$/,']'));
// Wellness advisors remain outside the reviewed digital-content rollout.
const seeds=items.filter(x=>x.department!=='wellness').map(x=>{const h=crypto.createHash('sha256').update(x.department+':'+x.name).digest('hex');return {id:h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20,32),sourceKey:'professional-role-'+hash([x.name,x.department]).slice(0,24),contentHashes:[releases[0].roles.find(r=>r.sourceKey==='professional-role-'+hash([x.name,x.department]).slice(0,24)).contentHash,hash(content({...x,instructions:'# '+x.name+'\n\n'+x.description+'\n\nUse only assigned tools and memory drawers. Ask when approval is required.'}))]};});
const file=require('node:path').join(__dirname,'../skills/professional-source-history.json');
const output=JSON.stringify({version:1,releases,seeds},null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw new Error('history differs from published source');}else fs.writeFileSync(file,output);
