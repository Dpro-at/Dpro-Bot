require('./load.cjs');
const {test}=require('node:test');const assert=require('node:assert/strict');const React=require('../node_modules/react');const {renderToStaticMarkup}=require('../node_modules/react-dom/server');
const {PublicShell}=require('../src/PublicShell.tsx');const {AuthBoundary}=require('../src/AuthBoundary.tsx');const {SessionClient}=require('../src/session.ts');const {AppSettings}=require('../src/AppSettings.tsx');
test('signed-out shell never mounts account form or private children and locks work destinations',()=>{
 let mounted=0;function Private(){mounted++;return React.createElement('div',null,'PRIVATE_HISTORY_SENTINEL')}
 const html=renderToStaticMarkup(React.createElement(PublicShell,{setup:'login'},React.createElement(Private)));
 assert.equal(mounted,0);assert.doesNotMatch(html,/PRIVATE_HISTORY_SENTINEL|Create the owner/);assert.match(html,/Welcome to Girru/);assert.match(html,/Your agents and your work stay private until you sign in\./);assert.match(html,/>Sign in<\/button>/);
 // CH11: one screen, one action. No sidebar, locked sections, Settings, About or status bar before sign-in.
 assert.doesNotMatch(html,/class="sidebar"|Conversations|Agents &amp; tools|>Settings<|About Girru|class="statusbar"|Open settings/);
 assert.equal((html.match(/<button/g)||[]).length,1);
});
test('live signed-out boundary renders immediate welcome without private network requests',()=>{
 const requests=[];const client=new SessionClient({live:async request=>{requests.push(request);throw Error('No private requests expected')}});client.selectMode('live');
 const html=renderToStaticMarkup(React.createElement(AuthBoundary,{client},React.createElement('div',null,'FIXTURE_PRIVATE_SENTINEL')));
 assert.match(html,/Welcome to Girru/);assert.doesNotMatch(html,/FIXTURE_PRIVATE_SENTINEL|auth-password|Create the owner/);assert.equal(requests.length,0);
});
test('public settings exposes appearance/about and a sign-in gate, never account details or unsupported updater',()=>{
 const html=renderToStaticMarkup(React.createElement(AppSettings,{signedIn:false,preference:'system',onTheme(){},onAccount(){}}));
 assert.match(html,/role="radiogroup" aria-label="Theme"/);assert.match(html,/aria-label="System"[^>]*checked=""|checked=""[^>]*aria-label="System"/);assert.match(html,/Settings sections/);assert.match(html,/>About and updates</);assert.match(html,/Sign in to see your account/);assert.match(html,/>Account<|>Models and replies</);assert.doesNotMatch(html,/>Saved keys<|>Scheduled tasks<|>Permissions<|>Share settings</);assert.doesNotMatch(html,/aria-label="Application information"/);const about=renderToStaticMarkup(React.createElement(AppSettings,{signedIn:false,preference:'system',onTheme(){},onAccount(){},aboutOnly:true}));assert.match(about,/Automatic updates are not available/);assert.doesNotMatch(html,/Google|password_hash|token|Check for Updates|Check now/);
});
