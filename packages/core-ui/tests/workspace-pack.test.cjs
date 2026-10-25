require('./load.cjs');require.extensions['.css']=()=>{};
const {test}=require('node:test'),assert=require('node:assert/strict');
const {allowedPack,packResponse}=require('../src/workspace-pack-contract.js');
const {allowedRequest}=require('../src/session.ts'),{allowed}=require('../scripts/application-server.cjs');
const base='/api/workspace-pack/',pack={format:'dpro-workspace-pack',version:1,personalities:[],skills:[],specialties:[],agents:[]},fingerprint='a'.repeat(64);
test('portable settings routes have matching browser and bridge confirmation gates',()=>{
 for(const action of ['export','preview','import']){const body=action==='export'?{agents:true,personalities:true,specialties:true,skills:true}:action==='preview'?{pack}:{pack,fingerprint,confirmed:true};for(const gate of [allowedPack,allowedRequest,allowed]){assert.equal(gate('POST',base+action,body),true);assert.equal(gate('GET',base+action,body),false);assert.equal(gate('POST',base+action,{...body,apiKey:'private'}),false);}}
 for(const body of [{pack,fingerprint},{pack,fingerprint,confirmed:false},{pack:{...pack,accounts:[]},fingerprint,confirmed:true}])for(const gate of [allowedPack,allowedRequest,allowed])assert.equal(gate('POST',base+'import',body),false);
});
test('portable response projection rejects malformed counts and removes unexpected data',()=>{
 const counts={agents:0,personalities:0,specialties:0,skills:0},names={agents:[],personalities:[],specialties:[],skills:[]};
 assert.deepEqual(packResponse(base+'preview',200,{fingerprint,counts,names,token:'hidden'}),{fingerprint,counts,names});
 assert.throws(()=>packResponse(base+'preview',200,{fingerprint,counts:{...counts,agents:1},names}));
 assert.throws(()=>packResponse(base+'import',200,{fingerprint,counts,completed:0,agentIds:['not-an-import-id']}));
 assert.deepEqual(packResponse(base+'import',500,{code:'database-password',error:'private'}),{code:'pack_unavailable'});
 assert.deepEqual(packResponse(base+'export',200,{pack}),{pack});
});
