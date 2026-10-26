require('./load.cjs');const {test}=require('node:test'),assert=require('node:assert/strict');
const {allowedFooter,footerPrefs,footerResponse,DEFAULT_FOOTER}=require('../src/footer-contract.js');
const {allowed}=require('../scripts/application-server.cjs'),{allowedRequest}=require('../src/session.ts');
test('footer route: only known sections pass, Settings can never be hidden',()=>{
 for(const gate of [allowedFooter.bind(null),(m,p,b)=>allowedRequest(m,p,b),(m,p,b)=>allowed(m,p,b)]){
  assert.ok(gate('GET','/api/me/footer',undefined));assert.ok(gate('PUT','/api/me/footer',{hidden:['board']}));
  for(const bad of [{hidden:['settings']},{order:['chat','chat']},{},{iconsOnly:1},{other:true}])assert.equal(!!gate('PUT','/api/me/footer',bad),false,JSON.stringify(bad));
 }
 assert.deepEqual(footerPrefs({order:['apps','nope']}).order.slice(0,2),['apps','chat']);
 assert.deepEqual(footerPrefs(null).hidden,DEFAULT_FOOTER.hidden);
 assert.deepEqual(Object.keys(footerResponse(200,{footer:{hidden:[]},secret:'x'})),['footer']);
});
test('footer shows the usual six sections, keeps the current one and Settings',()=>{const React=require('../node_modules/react'),{renderToStaticMarkup}=require('../node_modules/react-dom/server'),{ShellFooter}=require('../src/ShellFooter.tsx'),{FooterController}=require('../src/footer-prefs.ts');
 const c=new FooterController({request:async()=>({status:200,body:{footer:footerPrefs(null)}})}),e=(current=false,badge)=>({available:true,current,run(){},badge});
 const entries={chat:e(),agents:e(),board:e(),memory:e(),approvals:e(false,'3'),apps:e(),genvr:e(),terminal:e(),code:e(),skills:e(true),personalities:e(),specialties:e(),mcp:e()};
 const html=renderToStaticMarkup(React.createElement(ShellFooter,{controller:c,entries,status:null,settingsCurrent:false,onSettings(){},onCustomize(){}}));
 for(const s of ['Chat','Agents','Board','Memory','Approvals','Apps','Skills','Settings'])assert.match(html,new RegExp('>'+s+'<'));
 for(const s of ['GenVR','Terminal','Personalities'])assert.doesNotMatch(html,new RegExp('>'+s+'<'));
 assert.match(html,/Choose what the footer shows/);
});
