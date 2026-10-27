require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {skillTitle,skillSource,skillLook,fileTitle}=require('../src/skill-display.ts'),{SkillFilesView}=require('../src/SkillFilesView.tsx'),{setAgentSkill,SkillAppsPlace}=require('../src/SkillsWorkspace.tsx'),{SKILLS_PATH,allowedSkillLibrary,skillLibraryResponse}=require('../src/skill-library-contract.js'),{allowed}=require('../scripts/application-server.cjs'),{allowedRequest}=require('../src/session.ts');
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
test('skills show readable names and sources, never raw slugs or origin codes',()=>{
 assert.equal(skillTitle('content-studio'),'Content studio');assert.equal(skillTitle('activity_coaching'),'Activity coaching');assert.equal(skillTitle('Content Studio'),'Content Studio');assert.equal(skillTitle(''),'Untitled skill');
 for(const [origin,line] of [['workspace','Made in this workspace'],['managed','Made in this workspace'],['bundled','Comes with Girru'],['genvr-sdk','From GenVR'],['reviewed-marketplace','From Girru’s catalogue'],['claude','From Claude Code'],['claude-command','From Claude Code'],['codex','From Codex'],['mystery-code','From another place']])assert.equal(skillSource(origin).line,line);
 assert.deepEqual(skillLook('content-studio'),skillLook('content-studio'));assert.equal(skillLook('content-studio').icon,'pencil');assert.equal(fileTitle('SKILL.md'),'Main guide');assert.equal(fileTitle('references/claims-and-voice.md'),'Claims and voice');
});
test('who-uses-a-skill read is a narrow owner GET that keeps only ids',()=>{
 const path=SKILLS_PATH+'/usage';for(const check of [allowedSkillLibrary,allowed,allowedRequest])assert.ok(check('GET',path,undefined));
 for(const [method,body] of [['POST',{}],['PUT',{}],['DELETE',undefined],['GET',{}]])assert.equal(allowed(method,path,body),false);
 assert.deepEqual(skillLibraryResponse(path,200,{usage:[{skillId:id,agentIds:['main-agent','../keys'],secret:'x'}],owner:'x'}),{usage:[{skillId:id,agentIds:['main-agent']}]});
 assert.throws(()=>skillLibraryResponse(path,200,{usage:[{skillId:'../x',agentIds:[]}]}));
});
test('giving a skill keeps the agent’s other skills, uses its revision, and taking back removes only it',async()=>{
 const calls=[];let state={selected:[other],revision:4};const client={request:async r=>{calls.push(r);if(r.method==='GET')return {status:200,body:state};state={selected:r.body.selected,revision:state.revision+1};return {status:200,body:{revision:state.revision}};}};
 await setAgentSkill(client,'main-agent',id,true);assert.deepEqual(calls[1],{method:'PUT',path:SKILLS_PATH+'/agents/main-agent',body:{selected:[other,id],revision:4}});
 await setAgentSkill(client,'main-agent',id,true);assert.equal(calls.length,3,'giving twice writes nothing');
 await setAgentSkill(client,'main-agent',id,false);assert.deepEqual(calls.at(-1).body,{selected:[other],revision:5});
 const full={request:async()=>({status:200,body:{selected:Array.from({length:50},(_,i)=>`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`),revision:1}})};await assert.rejects(setAgentSkill(full,'main-agent',id,true),/too_many/);
});
test('a skill’s files open read-only with files, page and outline, and no editing controls',()=>{
 const html=renderToStaticMarkup(React.createElement(SkillFilesView,{title:'Content studio',sub:'Made in this workspace · version 1.4',files:[{path:'references/claims.md',content:'# Claims\nText'},{path:'SKILL.md',content:'---\nname: x\n---\n# Content studio\n## Read the brief\nWords here'}],onBack(){},onGive(){}}));
 assert.match(html,/read only/);assert.match(html,/Main guide/);assert.match(html,/Claims/);assert.match(html,/Read the brief/);assert.match(html,/Give to an agent/);assert.match(html,/Markdown · read only/);assert.doesNotMatch(html,/textarea|contenteditable|Replace|Save|dangerouslySetInnerHTML/);assert.doesNotMatch(html,/name: x/);
});
test('coding-apps place renders without contacting the computer during render',()=>{let calls=0;const html=renderToStaticMarkup(React.createElement(SkillAppsPlace,{client:{request:async()=>{calls++;throw Error();}}}));assert.equal(calls,0);assert.match(html,/From my coding apps/);assert.match(html,/Look again/);assert.match(html,/Nothing in your folders changes/);});
