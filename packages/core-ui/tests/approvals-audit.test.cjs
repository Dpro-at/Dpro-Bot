// Approvals audit gaps: right-click on requests, people still needed, several agents at once,
// stale text, reviews badge, tools menu, agent Activity and the per-agent request list.
require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const React=require('../node_modules/react'),{renderToStaticMarkup}=require('../node_modules/react-dom/server');
const actions=require('../src/approvals-actions.ts'),{agentApprovalsPath,allowedApproval}=require('../src/approvals-contract.js'),{reviewerResponse}=require('../src/reviewers-contract.js');
const {allowed}=require('../scripts/application-server.cjs'),{allowedRequest}=require('../src/session.ts');
const src=name=>fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
const hash='a'.repeat(64),PID='11111111-1111-4111-8111-111111111111',AID='22222222-2222-4222-8222-222222222222';
const ref={policyId:PID,policyRevision:1,approvalId:AID,paramsHash:hash,requestHash:hash,policyHash:hash,decision:'approve'};

test('1: request rows have a right-click menu whose Allow once and Reject use the same checks as the buttons',()=>{
 const s=src('ApprovalPage.tsx');
 assert.match(s,/onContextMenu=\{e=>menu\.at\(e,rowMenu\(row\)\)\}/);
 assert.match(s,/e\.key==='ContextMenu'\|\|e\.shiftKey&&e\.key==='F10'\)menu\.at\(e,rowMenu\(row\)\)/);
 // Allow once runs the same allow() as the button (which opens the code sheet when needed) and only when the button could.
 assert.match(s,/shortcut:'A',disabled:!here\|\|!canAllow,run:allow\}/);
 assert.match(s,/shortcut:'R',disabled:!here\|\|!canReject,run:\(\)=>void decide\('deny'\)\}/);
 assert.match(s,/<button title="Reject \(R\)" disabled=\{!canReject\}/);
 assert.match(s,/label:'Show the exact request'/);
 assert.match(s,/<ContextMenu menu=\{menu\.menu\}/);
});
test('8, 16: notice says Approvals › Approval rules; the hidden sidebar is gone',()=>{
 const s=src('ApprovalPage.tsx');assert.match(s,/Check it in Approvals › Approval rules\./);assert.doesNotMatch(s,/Settings › Approval rules|sidebarSlot|createPortal|approval-sidebar/);
 const html=renderToStaticMarkup(React.createElement(require('../src/ApprovalPage.tsx').ApprovalPage,{client:{},active:true}));assert.doesNotMatch(html,/Approval places/);
});
test('3: review rows say how many people are still needed, from a checked server count',()=>{
 assert.equal(actions.stillNeeded({votesNeeded:3,votesGiven:1}),'2 of 3 people still needed');
 assert.equal(actions.stillNeeded({votesNeeded:1,votesGiven:0}),'1 of 1 person still needed');
 assert.equal(actions.stillNeeded({votesNeeded:2,votesGiven:2}),'Enough people agreed · the owner decides');
 assert.equal(actions.stillNeeded({}),null);
 const path='/api/reviewer-requests/'+PID,item={reference:ref,toolName:'make_call',agentId:'calm-leader',agentName:'Calm leader',requestedAt:'2026-10-26T10:00:00Z',ownVote:null,votesNeeded:3,votesGiven:1};
 const out=reviewerResponse(path,200,{items:[item],nextCursor:null}).items[0];assert.equal(out.agentName,'Calm leader');assert.equal(out.votesNeeded,3);assert.equal(out.votesGiven,1);
 for(const bad of [{votesGiven:4},{votesNeeded:0},{votesGiven:-1},{votesNeeded:'3'},{agentName:'x\u0000'},{agentName:'x'.repeat(201)}])assert.throws(()=>reviewerResponse(path,200,{items:[{...item,...bad}],nextCursor:null}));
 const older=reviewerResponse(path,200,{items:[{reference:ref,toolName:'make_call',agentId:'calm-leader',requestedAt:'2026-10-26T10:00:00Z'}],nextCursor:null}).items[0];assert.equal(older.votesNeeded,undefined);assert.equal(older.agentName,undefined);
 const s=src('HumanReviewsPage.tsx');assert.match(s,/<Avatar name=\{asker\(item\)\} size=\{14\}\/><bdi>\{asker\(item\)\}<\/bdi>\{stillNeeded\(item\)/);assert.doesNotMatch(s,/agentId\.replaceAll/);
});
test('15: the Reviews asked of me badge counts reviews without my own answer',()=>{
 assert.equal(actions.unansweredCount([{ownVote:null},{ownVote:{decision:'approve'}},{}]),2);
 const s=src('HumanReviewsPage.tsx');assert.match(s,/placeButton\('reviews','Reviews asked of me','shield',reviews\.count,'waiting for your answer'\)/);assert.match(s,/n\+=unansweredCount\(items\)/);
});
test('5: several agents change together; one undo restores all; risky allow asks once',()=>{
 const order=['a','b','c','d'];
 assert.deepEqual(actions.nextSelection(order,['a'],'c',{}),['c']);
 assert.deepEqual(actions.nextSelection(order,['a'],'c',{toggle:true}),['a','c']);
 assert.deepEqual(actions.nextSelection(order,['a','c'],'a',{toggle:true}),['c']);
 assert.deepEqual(actions.nextSelection(order,['b'],'d',{range:true},'b'),['b','c','d']);
 assert.deepEqual(actions.nextSelection(order,['c'],'a',{range:true},'c'),['a','b','c']);
 const rows=[{id:'a',permissions:{modes:{money:'off'}}},{id:'b',permissions:{modes:{money:'ask'}}},{id:'c',permissions:{modes:{money:'allow'}}},{id:'d'}];
 const plan=actions.planChanges(rows,['a','b','c','d'],'money','allow');
 assert.deepEqual(plan,[{agentId:'a',category:'money',from:'off',to:'allow'},{agentId:'b',category:'money',from:'ask',to:'allow'}]);
 assert.deepEqual(actions.reverseChanges(plan),[{agentId:'a',category:'money',from:'allow',to:'off'},{agentId:'b',category:'money',from:'allow',to:'ask'}]);
 assert.equal(actions.sharedMode(rows,['a','b'],'money'),null);assert.equal(actions.sharedMode(rows,['c'],'money'),'allow');
 const s=src('AgentPermissionsGrid.tsx');
 assert.match(s,/if\(to==='allow'&&riskyCategories\.includes\(category\)\)\{setRisky\(changes\);return;\}/);
 assert.match(s,/undo\.current=done;/);assert.match(s,/void apply\(reverseChanges\(c\)/);
 assert.match(s,/onClick=\{\(\)=>choose\(selected,c,m\)\}/);
});
test('4: Always ask first uses the MCP connection switch; built-in tools show it turned off',()=>{
 const servers=[{id:'33333333-3333-4333-8333-333333333333',name:'github',tools:[{name:'merge.pr'},{name:'list'}]}];
 assert.deepEqual(actions.mcpToolTarget('mcp__github__merge_pr',servers),{serverId:servers[0].id,tool:'merge.pr'});
 assert.deepEqual(actions.mcpToolTarget('mcp__github__list',servers),{serverId:servers[0].id,tool:'list'});
 assert.equal(actions.mcpToolTarget('mcp__gitlab__list',servers),null);assert.equal(actions.mcpToolTarget('web_fetch',servers),null);
 const s=src('PermissionCoverage.tsx');assert.match(s,/method:'PUT',path:`\$\{CONNECTORS_PATH\}\/\$\{target\.serverId\}\/tools\/\$\{encodeURIComponent\(target\.tool\)\}`,body:\{requiresApproval:true\}/);
 assert.match(s,/label:`Always ask first · \$\{t\.origin==='builtin'\?'built into Dpro':'set by the extension'\}`,icon:'shield',disabled:true/);
 const {separatePathsLine}=require('../src/PermissionCoverage.tsx');assert.equal(separatePathsLine(['coding_apps','terminal','workspace_scheduler']),'Coding apps, the terminal and schedules use their own checks and are not listed here.');assert.equal(separatePathsLine([]),'');
});
test('11: one ⋯ menu for a rule; right-click adds Edit… and Turn off, which still goes through the code sheet',()=>{
 const s=src('ReviewerPoliciesSettings.tsx');assert.doesNotMatch(s,/<details>/);assert.match(s,/aria-label="More for this rule"/);
 assert.match(s,/label:'Turn off with code…',icon:'power' as const,danger:true,disabled:!canRevoke,run:\(\)=>void prepare\('revoke'\)/);
 assert.match(s,/onContextMenu=\{e=>menu\.at\(e,rowItems\(row\.id,e\.currentTarget\)\)\}/);
});
test('A3: one agent\'s requests: exact path, owner contract, merged Activity items',async()=>{
 assert.equal(agentApprovalsPath('calm-leader'),'/api/approvals?agentId=calm-leader&limit=100');
 for(const bad of ['','../keys','a b','x&status=pending','-x',{}])assert.equal(agentApprovalsPath(bad),null);
 for(const allow of [allowedApproval,allowed,allowedRequest]){assert.equal(allow('GET','/api/approvals?agentId=calm-leader&limit=100'),true);assert.equal(allow('GET','/api/approvals?agentId=calm-leader&limit=100',{}),false);assert.equal(allow('GET','/api/approvals?agentId=a%20b&limit=100'),false);assert.equal(allow('GET','/api/approvals?agentId=calm-leader'),false);}
 const calls=[],client={request:async r=>{calls.push(r);return {status:200,body:{approvals:[{id:'1',status:'pending',agentId:'calm-leader',toolName:'telegram_send',category:'message',requestedAt:'2026-10-26T10:00:00Z'},{id:'2',status:'denied',agentId:'other',toolName:'x',category:null,requestedAt:'2026-10-26T11:00:00Z'}]}};}};
 const list=await actions.agentApprovals(client,'calm-leader');assert.deepEqual(calls.map(c=>c.path),['/api/approvals?agentId=calm-leader&limit=100']);assert.deepEqual(list.map(a=>a.id),['1']);
 assert.deepEqual(await actions.agentApprovals(client,'../x'),[]);assert.equal(calls.length,1);
 await assert.rejects(()=>actions.agentApprovals({request:async()=>({status:403,body:{}})},'calm-leader'));
 const items=actions.approvalActivity(list);assert.equal(items[0].title,'Asked to send a Telegram message');assert.equal(items[0].text,'Waiting for you');assert.equal(items[0].icon,'send');
 const merged=actions.mergeTimeline([{at:'2026-10-26T09:00:00Z',k:'note'}],items,[{at:'2026-10-26T12:00:00Z',k:'persona'}]);assert.deepEqual(merged.map(i=>i.k??i.approvalId),['persona','1','note']);
 const card=src('AgentCard.tsx'),part=card.slice(card.indexOf('function ActivityPart'),card.indexOf('const noop'));assert.match(part,/agentApprovals\(card\.client as never,s\.agentId,abort\.signal\)/);assert.match(part,/i\.approvalId&&onOpenApprovals\?<button/);assert.match(part,/if\(!owner\)\{setAsked\(\[\]\);return;\}/);
});
test('placeRequest opens a place once per request number; owner places stay owner-only',()=>{
 const s=src('HumanReviewsPage.tsx');assert.match(s,/placeRequest\?:ApprovalsPlaceRequest\|null/);assert.match(s,/if\(id==='reviews'\|\|owner&&\(id==='pending'\|\|rulePlaces\.includes\(id\)\|\|approvalPlaces\.some\(p=>p\.id===id\)\)\)choose\(id\);\},\[placeRequest\?\.n\]\)/);
 assert.doesNotMatch(s,/ReviewerDirectory/);assert.match(s,/<h2>Reviewers<\/h2><ReviewersPlace/);
});
test('12: approval colours come from light/dark tokens; narrow window stacks the permissions inspector',()=>{
 const css=src('approvals-desktop.css'),body=css.split('\n').filter(l=>!/^:root,\.shell\{|^\.shell\[data-theme="dark"\]\{/.test(l)).join('\n');
 assert.doesNotMatch(body,/#[0-9A-Fa-f]{3,8}\b/);assert.match(css,/@media \(max-width:1000px\)\{\.perm-panes\{/);
});
