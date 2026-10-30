require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient } = require('../src/session.ts');
const { HireController, careOf, careFields } = require('../src/hire.ts');
const { HireAgent } = require('../src/HireAgent.tsx');
const { CompanyController } = require('../src/company.ts');
const { CompanyWizard, TeamPicture, personalityLine, teamRoleLabel } = require('../src/CompanyWizard.tsx');
const { movePeople, rolesSummary, rolesFor } = require('../src/team-split.ts');
const { createAgentsMock } = require('../src/agents-mock.ts');
const { createLoginMock } = require('../src/session-mock.ts');

const src = name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');
async function signedIn(t) {
  const calls = []; const base = createLoginMock(createAgentsMock());
  const client = new SessionClient({ mock: async r => { calls.push(r); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  return { client, calls };
}
const creates = calls => calls.filter(c => c.method === 'POST' && c.path === '/api/agents');
const hireMarkup = h => renderToStaticMarkup(React.createElement(HireAgent, { controller: h, onClose() {} }));

test('A4: nothing is created before Hire; changing the care choice keeps it; closing early leaves nothing', async t => {
  const { client, calls } = await signedIn(t);
  const h = new HireController(client); t.after(() => h.dispose());
  h.edit({ name: 'Late Hire', role: 'specialist', libraryPersonality: { id: 'temperament-balanced', revision: 1 } });
  h.go('persona'); h.go('care');
  let s = h.getSnapshot();
  assert.equal(s.step, 'care'); assert.equal(s.agent, undefined); assert.equal(creates(calls).length, 0, 'Next on Personality creates nothing');
  assert.equal(careOf(s.permissions), 'careful', 'Careful is the default before hiring');
  const html = hireMarkup(h);
  assert.match(html, /Hire <bdi>Late Hire<\/bdi>/); assert.match(html, />Cancel</, 'FR4a: one sheet, no steps to go back through'); assert.doesNotMatch(html, /Finish hiring|>Back</);
  h.applyCare('normal'); h.go('persona'); assert.equal(h.getSnapshot().step, 'persona');
  h.go('care'); assert.equal(careOf(h.getSnapshot().permissions), 'normal', 'the choice survives Back');
  h.restart();
  assert.equal(creates(calls).length, 0, 'closing or starting over created nothing');
  assert.equal(calls.filter(c => c.method === 'PUT').length, 0);
});

test('A4: "Hire <name>" creates once and saves the chosen care over the stored permissions', async t => {
  const { client, calls } = await signedIn(t);
  const h = new HireController(client); t.after(() => h.dispose());
  h.edit({ name: 'Care Late', role: 'specialist' }); h.go('persona'); h.go('care');
  h.applyCare('trusted');
  await h.hire();
  assert.match(h.getSnapshot().notice, /Confirm that the risky tools/); assert.equal(creates(calls).length, 0, 'an unconfirmed risky Allow sends nothing');
  h.setConfirmRisky(true); await h.hire();
  const s = h.getSnapshot();
  assert.equal(s.step, 'done', s.notice); assert.equal(creates(calls).length, 1);
  const put = calls.find(c => c.method === 'PUT' && c.path.endsWith('/permissions'));
  assert.deepEqual(put.body.modes, careFields.trusted.modes); assert.equal(put.body.confirmRisky, true); assert.equal(put.body.expectedVersion, 1, 'the stored version, not the draft');
  await h.hire(); assert.equal(creates(calls).length, 1, 'never a second create');
});

test('A5: moving the line keeps one person on each side and the total unchanged', () => {
  assert.deepEqual(movePeople(5, 3, 2), [7, 1]);
  assert.deepEqual(movePeople(5, 3, 9), [7, 1]);
  assert.deepEqual(movePeople(5, 3, -9), [1, 7]);
  assert.deepEqual(movePeople(5, 3, 0.6), [6, 2]);
  for (const d of [-20, -1, 0, 1, 20]) { const [a, b] = movePeople(10, 4, d); assert.equal(a + b, 14); assert.ok(a >= 1 && b >= 1); }
});

const share = (department, count, extra = {}) => ({ department, departmentLabel: department[0].toUpperCase() + department.slice(1), count,
  presets: { manager: 'balanced-assistant', specialist: 'precise-developer', evaluator: 'strict-evaluator' }, titles: { manager: 'Lead dev', specialist: 'Developer', evaluator: 'Tester' }, ...extra });

test('A5: the team picture is the editor (bands open "Change…", lines between them move people)', () => {
  const shares = [share('development', 8), share('support', 5)];
  const html = renderToStaticMarkup(React.createElement(TeamPicture, { shares, onOpen() {}, onMove() {} }));
  assert.match(html, /aria-label="Development: 8 agents. Change…"/);
  assert.equal((html.match(/role="separator"/g) || []).length, 1, 'one line between two departments');
  assert.match(html, /Move people between Development and Support/); assert.match(html, /aria-valuemax="12"/);
  const still = renderToStaticMarkup(React.createElement(TeamPicture, { shares }));
  assert.doesNotMatch(still, /role="separator"/, 'without an editor the picture is only a picture');
  const line = personalityLine(share('development', 8, { personalities: { manager: { id: 'calm', revision: 1 } } }), [{ id: 'calm', profile: { name: 'Calm' } }]);
  assert.equal(line, 'Managers: Calm · Specialists: Precise developer · Reviewers: Strict reviewer');
});

test('A5 + A8: Build company review shows the picture and one line per department, not the long form', async t => {
  const { client } = await signedIn(t);
  const w = new CompanyController(client); t.after(() => w.dispose());
  await w.loadCatalogue(); w.chooseTotal(30); w.toggleDepartment('marketing'); w.toggleDepartment('support');
  await w.propose();
  w.editShare('marketing', { count: 20 }); w.editShare('support', { count: 10 });
  const html = renderToStaticMarkup(React.createElement(CompanyWizard, { controller: w, onClose() {} }));
  assert.match(html, /class="ag-team-picture"/); assert.match(html, /role="separator"/); assert.match(html, /Change…/);
  assert.doesNotMatch(html, /Specialty 1 name|Agents in Marketing|Show the 20 agents/, 'count, specialties and agents are in the Change… sheet');
  assert.match(html, /Hire 30 agents/);
  assert.doesNotMatch(html, /\bLeads?\b|Persona\b|Dpro Agent/);
  assert.match(html, /1 manager/);
});

test('A8: plain words in Build company and hire', () => {
  assert.equal(rolesSummary(rolesFor(40)), '2 managers · 34 specialists · 4 reviewers');
  assert.deepEqual(teamRoleLabel, { manager: 'Managers', specialist: 'Specialists', evaluator: 'Reviewers' });
  const wizard = src('CompanyWizard.tsx');
  assert.doesNotMatch(wizard, /Dpro Agent|'Leads'|Persona for|>×</);
  assert.match(wizard, /Personality for/); assert.match(wizard, /UiIcon name="close"/);
});

test('A9 + A10: members stay on the inspector; the dead Agent connections view is gone', () => {
  const page = src('AgentsDestination.tsx');
  assert.doesNotMatch(page, /MemberAgent|ConnectorsSection|Agent connections|setConnections/);
  assert.match(page, /open && controller && personality && owner/);
  assert.match(page, /onOpenMcp=\{onOpenMcp\} onOpenApprovals=\{onOpenApprovals\}/);
  const card = src('AgentCard.tsx');
  assert.match(card, /<AgentPermissions card=\{card\} onDone=\{onDone\} onOpenMcp=\{onOpenMcp\}\/>/);
  assert.match(card, /<ActivityPart card=\{card\} onOpenApprovals=\{onOpenApprovals\}\/>/);
});

test('A6: timeline dots are tints that work in light and dark', () => {
  const css = src('agents-desktop.css');
  const dots = css.split('\n').filter(l => l.startsWith('.ag-dot')).join('\n');
  assert.match(dots, /color-mix/); assert.doesNotMatch(dots, /#172034|#11302E|#2A1F3D/);
});
