import test from 'node:test';
import assert from 'node:assert/strict';
import { runTeamAssignment } from '../src/services/team-delegation.ts';
import { teamDelegateTool, teamListTool } from '../src/tools/tasks/team.ts';
import { approvalCategory } from '../src/tools/approvals.ts';
import { isToolAllowedByExecPolicy } from '../src/tools/exec-policy.ts';

const assignment = { agentId: 'specialist', agentName: 'Reviewer', model: 'subscription:codex', request: 'Review this synthetic result.', instructions: 'Be precise.' };
const lookup = { name: 'read', description: 'Read allowed fixture', input_schema: { type: 'object', properties: {} } };
const runtime = { signal: new AbortController().signal, tools: [lookup], execute: async () => ({ content: [{ type: 'text', text: 'fixture evidence' }] }) };

test('child tool receipts reach the child and its attributed result reaches the coordinator', async () => {
  let count = 0;
  const result = await runTeamAssignment(assignment, { ...runtime, reply: async prompt => {
    assert.match(prompt, /Be precise/);
    if (++count === 1) return '{"type":"tool","name":"read","arguments":{}}';
    assert.match(prompt, /fixture evidence/);
    return '{"type":"answer","text":"Evidence checked; one limitation remains."}';
  } });
  const receipt = JSON.parse(result.content[0].text);
  assert.equal(receipt.agentId, 'specialist'); assert.equal(receipt.model, 'subscription:codex');
  assert.equal(receipt.status, 'answered'); assert.match(receipt.answer, /limitation/);
  assert.equal(count, 2);
  assert.equal(result.details.executionSource, 'dpro_registry');
  assert.deepEqual(result.details.toolExecutions, [{name:'read',outcome:'returned'}]);
});

test('recursive and alternate native delegation are not offered or executable', async () => {
  for (const name of ['team_delegate', 'team_list', 'task_create', 'ask_coding_app', 'claude_cli', 'gemini_cli']) {
    let executed = false;
    await assert.rejects(runTeamAssignment(assignment, { ...runtime, tools: [lookup, { ...lookup, name }], execute: async () => { executed = true; return { content: [] }; }, reply: async prompt => {
      assert.ok(!prompt.includes(`"name":"${name}"`));
      return JSON.stringify({ type: 'tool', name, arguments: {} });
    } }), /cli_tool_invalid/);
    assert.equal(executed, false);
  }
});

test('pending approval stays unfinished and never triggers another model request', async () => {
  let calls = 0;
  const result = await runTeamAssignment(assignment, { ...runtime,
    reply: async () => { calls++; return '{"type":"tool","name":"read","arguments":{}}'; },
    execute: async () => ({ content: [{ type: 'text', text: 'Owner approval required' }], details: { status: 'pending_approval' } }),
  });
  assert.equal(calls, 1); assert.equal(result.details.status, 'pending_approval');
  assert.deepEqual(result.details.toolExecutions, [{name:'read',outcome:'pending_approval'}]);
  assert.equal(JSON.parse(result.content[0].text).status, 'waiting_approval');
});

test('aborted, oversized and unoffered requests fail without accepting a claimed result', async () => {
  const signal = AbortSignal.abort();
  await assert.rejects(runTeamAssignment(assignment, { ...runtime, signal, reply: async () => { throw Error('must not run'); } }), /cancelled/);
  await assert.rejects(runTeamAssignment(assignment, { ...runtime, reply: async () => 'x'.repeat(17000) }), /team_result_too_large/);
  let calls = 0;
  await assert.rejects(runTeamAssignment(assignment, { ...runtime, reply: async () => '{"type":"tool","name":"unknown","arguments":{}}', execute: async () => { calls++; return { content: [] }; } }), /cli_tool_invalid/);
  assert.equal(calls, 0);
});

test('team execution needs explicit grants, owner approval and enabled host execution', () => {
  assert.equal(approvalCategory(teamDelegateTool), 'other');
  assert.ok(!teamDelegateTool.selfOnly && !teamListTool.selfOnly);
  const previous = process.env.AGENT_EXEC_TOOLS;
  try { delete process.env.AGENT_EXEC_TOOLS; assert.equal(isToolAllowedByExecPolicy('team_delegate'), false); }
  finally { if (previous === undefined) delete process.env.AGENT_EXEC_TOOLS; else process.env.AGENT_EXEC_TOOLS = previous; }
});

test('outside, nested and unidentified callers are rejected before storage or inference', async () => {
  for (const context of [undefined, { workspaceDir: '/tmp' }, { workspaceDir: '/tmp', userId: 'owner', agentId: 'main', sessionId: 'session', toolPolicy: {} }, { workspaceDir: '/tmp', userId: 'owner', agentId: 'main', sessionId: 'session', delegatedFrom: ['parent'] }]) {
    assert.ok((await teamListTool.execute({}, context)).error);
    assert.ok((await teamDelegateTool.execute({ agent_id: 'other', request: 'test' }, context)).error);
  }
});


test('a model claiming tool execution cannot forge application-side execution evidence',async()=>{
 const result=await runTeamAssignment(assignment,{...runtime,reply:async()=>JSON.stringify({type:'answer',text:'I executed read and write successfully.'})});
 assert.deepEqual(result.details.toolExecutions,[]);
 assert.equal(result.details.executionSource,'dpro_registry');
});
