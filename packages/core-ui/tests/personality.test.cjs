require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest, createSameOriginTransport } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { PersonalityController } = require('../src/personality.ts');
const { PersonalityReview } = require('../src/PersonalityReview.tsx');
const { createPersonalityMock } = require('../src/personality-mock.ts');
const { fictionalPersonalityProposal: fixture } = require('../src/personality-fixture.ts');
const { parsePersonalityProposal, personalityResponse, traitNames } = require('../src/personality-contract.js');
const { allowed, createApplicationServer } = require('../scripts/application-server.cjs');
const http = require('node:http');
const root = '/api/agents/sample-main/personality/proposals';
const detail = `${root}/${fixture.id}`;
const hashBody = { expectedReviewHash: fixture.reviewHash };
const clone = () => structuredClone(fixture);
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
async function setup(t, wrapper = f => f, role = 'owner') {
  const mock = createPersonalityMock(), auth = createLoginMock(), calls = [];
  const base = async r => {
    if (r.path.includes('/personality/')) return mock.transport(r);
    const result = await auth(r);
    if (result.body?.user) result.body.user = { ...result.body.user, role };
    return result;
  };
  const transport = wrapper(base);
  const client = new SessionClient({ mock: async r => { calls.push(r); return transport(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid','mock-only');
  const c = new PersonalityController(client); t.after(() => c.dispose()); c.select('sample-main');
  return { c, client, calls, mock };
}
async function open(s) { await s.c.list(); await s.c.open(fixture.id); }
const writes = s => s.calls.filter(r => r.path.includes('/personality/') && r.method === 'POST');
const markup = c => renderToStaticMarkup(React.createElement(PersonalityReview,{controller:c}));

test('fixture reviewHash matches backend canonical array and trait order', () => {
  const p = fixture;
  assert.equal(createHash('sha256').update(JSON.stringify(['personality-proposal-review/v1',p.id,p.agentId,p.baseVersion,Object.fromEntries(traitNames.map(n => [n,p.proposedTraits[n]])),p.reason,p.evidence])).digest('hex'),p.reviewHash);
});
for (const action of ['approve','reject']) test(`explicit full review then ${action}; no repeated decision`, async t => {
  const s = await setup(t); await open(s);
  await s.c.decide(action); assert.equal(writes(s).length,0);
  const html = markup(s.c); for (const n of traitNames) assert.match(html,new RegExp(n));
  for (const value of [fixture.reason,...fixture.evidence,fixture.reviewHash,'—','+5']) assert.ok(html.includes(value), value);
  assert.match(html,/disabled="">Agree</);
  s.c.review(true); await s.c.decide(action);
  assert.equal(writes(s).length,1); assert.deepEqual(writes(s)[0].body,hashBody);
  assert.equal(s.c.getSnapshot().phase,action === 'approve' ? 'approved' : 'rejected');
  await s.c.decide(action); assert.equal(writes(s).length,1);
});
for (const mutate of ['list','open','selection','session','uncheck']) test(`${mutate} invalidates consent`, async t => {
  const s = await setup(t); await open(s); s.c.review(true);
  if (mutate === 'list') await s.c.list();
  if (mutate === 'open') await s.c.open(fixture.id);
  if (mutate === 'selection') { s.c.select('sample-helper'); s.c.select('sample-main'); await open(s); }
  if (mutate === 'session') s.client.cancel();
  if (mutate === 'uncheck') s.c.review(false);
  await s.c.decide('approve'); assert.equal(writes(s).length,0); assert.equal(s.c.getSnapshot().consent,false);
});
for (const role of ['admin','user','guest']) test(`${role} cannot read or decide owner personality`, async t => {
  const s = await setup(t, f => f,role); await open(s); s.c.review(true); await s.c.decide('approve');
  assert.equal(s.calls.filter(r => r.path.includes('/personality/')).length,0);
  await assert.rejects(s.client.request({method:'GET',path:root}));
});
for (const field of ['hidden','baseTraits','proposedTraits','delta','evidence']) test(`reject hidden or malformed ${field} without dropping hashed content`, () => {
  const p = clone(); if (field === 'hidden') p.hidden = 'secret';
  else if (field === 'evidence') p.evidence = [{ hidden:'secret' }]; else p[field].hidden = 1;
  assert.throws(() => parsePersonalityProposal(p));
  assert.throws(() => personalityResponse(root,200,{agentId:p.agentId,proposals:[p]}));
});
for (const [label, mutate] of [
  ['delta mismatch', p => p.delta.caution = 4], ['drift too large',p => {p.proposedTraits.caution=56;p.delta.caution=6;}],
  ['missing trait', p => delete p.baseTraits.warmth], ['fraction',p => p.baseTraits.warmth=2.5],
  ['long reason',p => p.reason='x'.repeat(1001)], ['long evidence',p => p.evidence=['x'.repeat(201)]],
  ['many evidence',p => p.evidence=Array(21).fill('x')], ['control evidence',p => p.evidence=['a\nb']],
  ['pending decision',p => p.decidedBy='owner'], ['unknown status',p => p.status='done'],
  ['unknown source',p => p.source='admin'], ['invalid hash',p => p.reviewHash='A'.repeat(64)],
  ['negative version',p => p.baseVersion=-1], ['extra evidence field',p => p.evidence=[{text:'x'}]],
]) test(`strict schema: ${label}`, () => { const p=clone();mutate(p);assert.throws(() => parsePersonalityProposal(p)); });
for (const path of ['/api/agents/sample-main/personality/versions','/api/agents/sample-main/personality/lock',root+'?status=pending',root+'/../../other',detail+'/approve?x=1',root.replace('sample-main','%73ample-main'),detail+'/reject/']) test(`narrow deny ${path}`, () => {
  assert.equal(allowedRequest('POST',path,hashBody),false);assert.equal(allowed('POST',path,hashBody),false);
});
test('allowlist parity accepts only read and hash-only decisions', () => {
  for (const policy of [allowedRequest,allowed]) {
    for (const path of [root,detail]) assert.equal(policy('GET',path),true);
    for (const action of ['approve','reject']) {
      assert.equal(policy('POST',detail+'/'+action,hashBody),true);
      for (const body of [{...hashBody,note:'not in this slice'},{...hashBody,agentId:'other'},{...hashBody,traits:{}},{expectedReviewHash:'bad'}]) assert.equal(policy('POST',detail+'/'+action,body),false);
    }
    assert.equal(policy('POST',root,{traits:{},reason:'x'}),false);
  }
});
for (const code of ['personality_locked','already_decided','stale','review_changed']) test(`409 ${code} refreshes GET once and requires renewed review`, async t => {
  let once = true;
  const s = await setup(t, base => async r => {
    if (r.method === 'POST' && r.path.includes('/personality/') && once) { once=false; return {status:409,body:{code,error:'never rendered'}}; }
    return base(r);
  });
  await open(s); s.c.review(true);await s.c.decide('approve');
  assert.equal(writes(s).length,1); assert.equal(s.c.getSnapshot().consent,false); assert.match(s.c.getSnapshot().notice,/Conflict/);
  assert.equal(s.calls.at(-1).path,detail); assert.equal(s.calls.at(-1).method,'GET');
  await s.c.decide('approve');assert.equal(writes(s).length,1);
  s.c.review(true);await s.c.decide('reject');assert.equal(s.c.getSnapshot().phase,'rejected');
});
for (const kind of ['lost-before','lost-after','500','malformed','wrong-hash','wrong-evidence']) test(`unknown ${kind} persists across selection and remount; never retries`, async t => {
  const s = await setup(t,base => async r => {
    if (r.method !== 'POST' || !r.path.includes('/personality/')) return base(r);
    if (kind === 'lost-before') throw Error('do not reveal');
    const result = await base(r);
    if (kind === 'lost-after') throw Error('do not reveal');
    if (kind === '500') return {status:500,body:{error:'do not reveal'}};
    if (kind === 'malformed') result.body.version.hidden = 'do not reveal';
    if (kind === 'wrong-hash') result.body.proposal.reviewHash='f'.repeat(64);
    if (kind === 'wrong-evidence') result.body.proposal.evidence=['changed'];
    return result;
  });
  await open(s);s.c.review(true);await s.c.decide('approve');
  assert.equal(s.c.getSnapshot().phase,'unknown');assert.doesNotMatch(markup(s.c),/do not reveal/);
  s.c.dispose();const replacement=new PersonalityController(s.client);t.after(()=>replacement.dispose());replacement.select('sample-main');
  await replacement.list();await replacement.open(fixture.id);replacement.review(true);await replacement.decide('approve');
  assert.equal(replacement.getSnapshot().phase,'unknown');assert.equal(writes(s).length,1);
});
for (const status of [400,401,403,404,421,429]) test(`status ${status} no automatic retry and private data cleared`, async t => {
  const s=await setup(t,base=>async r=>r.method==='POST'&&r.path.includes('/personality/')?{status,body:{code:status===403?'inactive_user':'review_hash_required',error:'hidden'}}:base(r));
  await open(s);s.c.review(true);await s.c.decide('approve');assert.equal(writes(s).length,1);assert.equal(s.c.getSnapshot().detail,undefined);
  if(status===401||status===403) assert.equal(s.client.getSnapshot().phase,'signed-out');
  assert.doesNotMatch(markup(s.c),/hidden/);
});
test('selection change ignores delayed detail',async t=>{
  const gate=deferred();let hold=false;
  const s=await setup(t,base=>async r=>{const result=await base(r);if(hold&&r.path===detail) await gate.promise;return result;});
  await s.c.list();hold=true;const pending=s.c.open(fixture.id);s.c.select('sample-helper');gate.resolve();await pending;
  assert.equal(s.c.getSnapshot().agentId,'sample-helper');assert.equal(s.c.getSnapshot().detail,undefined);
});
test('logout during a decision clears immediately and stale success cannot repopulate',async t=>{
  const gate=deferred(),started=deferred();
  const s=await setup(t,base=>async r=>{const result=await base(r);if(r.method==='POST'&&r.path.includes('/personality/')){started.resolve();await gate.promise;}return result;});
  await open(s);s.c.review(true);const pending=s.c.decide('approve');await started.promise;
  await s.client.logoutAllDevices();assert.equal(s.c.getSnapshot().detail,undefined);gate.resolve();await pending;
  assert.equal(s.c.getSnapshot().detail,undefined);assert.equal(writes(s).length,1);
});
test('double decision has one in-flight write',async t=>{
  const gate=deferred();const s=await setup(t,base=>async r=>{if(r.method==='POST'&&r.path.includes('/personality/'))await gate.promise;return base(r);});
  await open(s);s.c.review(true);const first=s.c.decide('approve');await s.c.decide('reject');assert.equal(writes(s).length,1);gate.resolve();await first;
});
test('faithful mock stale base is terminal; lock blocks approval but permits rejection',async t=>{
  const s=await setup(t);await open(s);s.mock.advanceVersion();s.c.review(true);await s.c.decide('approve');
  assert.equal(s.c.getSnapshot().detail.status,'stale');s.c.review(true);assert.equal(s.c.getSnapshot().consent,false);
  const other=await setup(t);await open(other);other.mock.lock();other.c.review(true);await other.c.decide('approve');
  assert.equal(other.c.getSnapshot().detail.status,'pending');other.c.review(true);await other.c.decide('reject');assert.equal(other.c.getSnapshot().phase,'rejected');
});
test('default fictional login mock exposes scoped proposals with no network',async()=>{
  const c=new SessionClient({mock:createLoginMock()});c.selectMode('mock');await c.login('demo@example.invalid','mock-only');
  assert.equal((await c.request({method:'GET',path:root})).body.proposals.length,1);
});
test('injected real adapter sends only reviewed body, Bearer and omit credentials',async()=>{
  let seen;const transport=createSameOriginTransport('http://127.0.0.1:42522',async(url,init)=>{seen={url,init};return new Response(JSON.stringify({code:'review_changed',error:'hidden'}),{status:409,headers:{'Content-Type':'application/json'}});});
  const r=await transport({method:'POST',path:detail+'/approve',body:hashBody,headers:{Authorization:'Bearer fictional'},signal:new AbortController().signal});
  assert.deepEqual(r.body,{code:'review_changed'});assert.equal(seen.init.credentials,'omit');assert.equal(seen.init.redirect,'error');assert.equal(seen.init.body,JSON.stringify(hashBody));
});

test('ephemeral fictional HTTP bridge: exact responses, rejected hidden fields, narrow body and endpoint boundaries',async t=>{
  const mock=createPersonalityMock(), calls=[];let payload;
  const upstream=http.createServer(async(req,res)=>{
    const chunks=[];for await(const c of req)chunks.push(c);
    const body=chunks.length?JSON.parse(Buffer.concat(chunks)):undefined;
    calls.push({path:req.url,body,headers:req.headers});
    const result=payload??await mock.transport({method:req.method,path:req.url,body,headers:{},signal:new AbortController().signal});
    res.writeHead(result.status,{'Content-Type':'application/json'});res.end(JSON.stringify(result.body));
  });
  await new Promise(r=>upstream.listen(0,'127.0.0.1',r));t.after(()=>{upstream.closeAllConnections();return new Promise(r=>upstream.close(r));});
  const bridge=createApplicationServer({channel:'candidate',upstreamPort:upstream.address().port});
  await new Promise(r=>bridge.listen(0,'127.0.0.1',r));t.after(()=>{bridge.closeAllConnections();return new Promise(r=>bridge.close(r));});
  const origin=`http://127.0.0.1:${bridge.address().port}`;
  const send=(path,method='GET',body,headers={})=>fetch(origin+path,{method,mode:'same-origin',headers:{Authorization:'Bearer fictional',Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  let r=await send(root);assert.equal(r.status,200);assert.deepEqual((await r.json()).proposals,[fixture]);
  r=await send(detail);assert.deepEqual(await r.json(),fixture);
  const before=calls.length;
  for(const [path,body,headers] of [[root,hashBody,{}],[detail+'/approve',{...hashBody,note:'no'},{}],[detail+'/approve',hashBody,{Origin:'http://evil.invalid'}],['/api/agents/sample-main/personality/lock',hashBody,{}],[detail+'/approve',hashBody,{'X-Extra':'bad'}]]) {
    r=await send(path,'POST',body,headers);assert.ok(r.status>=400);
  }
  assert.equal(calls.length,before);
  payload={status:200,body:{...clone(),proposedTraits:{...fixture.proposedTraits,hidden:100}}};
  r=await send(detail);assert.equal(r.status,502);assert.equal(await r.json(),null);
  payload={status:409,body:{code:'review_changed',error:'private fictional error',hidden:'private'}};
  r=await send(detail+'/approve','POST',hashBody);assert.equal(r.status,409);assert.deepEqual(await r.json(),{code:'review_changed'});
  payload={status:421,body:{code:'host_not_allowed',error:'private'}};
  const count=calls.length;r=await send(detail+'/approve','POST',hashBody);assert.equal(r.status,502);assert.equal(calls.length,count+1);
  payload=undefined;r=await send(detail+'/approve','POST',hashBody);assert.equal(r.status,200);const approved=await r.json();assert.equal(approved.proposal.status,'approved');
  assert.deepEqual(calls.at(-1).body,hashBody);assert.equal(calls.at(-1).headers.authorization,'Bearer fictional');
  assert.equal(calls.at(-1).headers.cookie,undefined);
});

test('read version/hash change requires review of new snapshot',async t=>{
  let changed=false;const s=await setup(t,base=>async r=>{
    const result=await base(r);if(changed&&r.path===detail&&r.method==='GET')result.body={...result.body,baseVersion:2,reviewHash:'b'.repeat(64)};return result;
  });
  await open(s);s.c.review(true);changed=true;await s.c.open(fixture.id);assert.equal(s.c.getSnapshot().detail.baseVersion,2);
  await s.c.decide('approve');assert.equal(writes(s).length,0);
});
test('untrusted reason/evidence renders escaped text without active links',async t=>{
  const s=await setup(t,base=>async r=>{const result=await base(r);if(r.path===detail&&r.method==='GET'){result.body.reason='<img src=x onerror=alert(1)>';result.body.evidence=['https://example.invalid/<script>'];}return result;});
  await open(s);const html=markup(s.c);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img|<script|href=/);
});
test('dispose cannot send and frozen review cannot mutate consent snapshot',async t=>{
  const s=await setup(t);await open(s);s.c.review(true);assert.ok(Object.isFrozen(s.c.getSnapshot().detail.proposedTraits));
  s.c.dispose();const count=s.calls.length;await s.c.list();s.c.review(true);await s.c.decide('approve');assert.equal(s.calls.length,count);
});
test('selected agent version change invalidates the full review',async t=>{
  const s=await setup(t);s.c.select('sample-main',1);await open(s);s.c.review(true);s.c.select('sample-main',2);
  assert.equal(s.c.getSnapshot().detail,undefined);assert.equal(s.c.getSnapshot().consent,false);await s.c.decide('approve');assert.equal(writes(s).length,0);
});
