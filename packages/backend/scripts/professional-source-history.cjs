// Run from the repository root. Verification needs both published commits (a full-history checkout).
// This bootstrap covers two immutable releases only; preserve recorded sourceKey values for future renames.
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');
const stable=v=>JSON.stringify(v&&typeof v==='object'?(Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))]))):v);
const hash=v=>crypto.createHash('sha256').update(stable(v)).digest('hex');
const content=x=>({name:x.name.trim(),department:x.department.trim(),description:x.description,instructions:x.instructions.replace(/\r\n?/g,'\n').trim()+'\n'});
const releases=['1bc80cff0893bd0a2b03950c0c57eaffb5569130','b9ba5a0f96a545dc737df77964bd2f4de5f57eed'].map(ref=>{const p=JSON.parse(cp.execFileSync('git',['show',ref+':packages/backend/skills/professional-workspace-settings.json'],{encoding:'utf8',maxBuffer:5e6}));return {fingerprint:hash(p),roles:p.specialties.map(x=>({id:x.id,sourceKey:'professional-role-'+hash([x.name,x.department]).slice(0,24),contentHash:hash(content(x))}))};});
const file=require('node:path').join(__dirname,'../skills/professional-source-history.json');
const output=JSON.stringify({version:1,releases},null,2)+'\n';
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw new Error('history differs from published source');}else fs.writeFileSync(file,output);
