const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=path.resolve(__dirname,'../scripts/professional-source-history.cjs'),source=fs.readFileSync(script,'utf8'),history=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../skills/professional-source-history.json'))),pack=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../skills/professional-workspace-settings.json')));
function generate(recorded,current){let result;vm.runInNewContext(source,{require:name=>name==='node:fs'?{readFileSync:file=>JSON.stringify(String(file).endsWith('professional-source-history.json')?recorded:current),writeFileSync:(file,bytes)=>{result=JSON.parse(bytes);}}:require(name),__dirname:path.dirname(script),process:{argv:[]}});return result;}
test('future source generation preserves every prior release and seed baseline as an immutable prefix',()=>{
 const future=structuredClone(pack);future.specialties[0].description+=' Future release fixture.';const generated=generate(history,future);
 assert.deepEqual(generated.releases.slice(0,history.releases.length),history.releases);assert.equal(generated.releases.length,history.releases.length+1);
 for(const seed of history.seeds){const next=generated.seeds.find(s=>s.id===seed.id);assert.equal(next.sourceKey,seed.sourceKey);assert.deepEqual(next.contentHashes.slice(0,seed.contentHashes.length),seed.contentHashes);const role=history.releases.at(-1).roles.find(r=>r.sourceKey===seed.sourceKey);assert.ok(next.contentHashes.includes(role.contentHash));}
});
test('published source prefix tampering is refused by regeneration',()=>{
 const tampered=structuredClone(history);tampered.releases[0].roles[0].contentHash='0'.repeat(64);assert.throws(()=>generate(tampered,pack),/published release prefix changed/);
});

test('registered third-release removal, tampering and extra unpinned releases fail closed',()=>{
 for(const edit of [h=>h.releases.pop(),h=>{h.releases[2].roles[0].contentHash='0'.repeat(64)},h=>{h.releases.push({...h.releases[2],fingerprint:'a'.repeat(64)},{...h.releases[2],fingerprint:'b'.repeat(64)})}]){const changed=structuredClone(history);edit(changed);assert.throws(()=>generate(changed,pack),/unpinned release/);}
});

test('working-release role tampering and fabricated seed baselines are refused',()=>{
 const future=structuredClone(pack);future.specialties[0].description+=' Future fixture.';const generated=generate(history,future);generated.releases[3].roles[0].contentHash='f'.repeat(64);assert.throws(()=>generate(generated,future),/unpinned release/);
 const fabricated=structuredClone(history);fabricated.seeds[0].contentHashes.push('f'.repeat(64));assert.throws(()=>generate(fabricated,pack),/seed identity changed/);
});
