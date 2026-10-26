import {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import type {SessionClient} from './session';
import {ApprovalPage,approvalPlaces,requestTitle} from './ApprovalPage';
import {AgentPermissionsGrid} from './AgentPermissionsGrid';
import {ReviewerPoliciesSettings} from './ReviewerPoliciesSettings';
import {PermissionCoverage} from './PermissionCoverage';
import {HumanReviewsController} from './human-reviews-controller';
import {ReviewerVerificationSheet} from './ReviewerVerificationSheet';
import type {ReviewerProofTarget} from './reviewer-proof-controller';
import {UiIcon} from './ui-icons';
import {Avatar,ContextMenu,useMenu} from './desktop-ui';
import {reviewerResponse} from './reviewers-contract.js';
import {stillNeeded,unansweredCount} from './approvals-actions';
import type {ReviewItem} from './human-reviews-controller';
const notices={verification:'Enable account verification before reviewing requests.',unavailable:'Reviews are unavailable. Reload to try again.',changed:'This request changed or is no longer available. Reload the list.',recorded:'Your decision was recorded. It did not execute the action.',unknown:'The decision outcome is unknown. Check with the owner before starting again.',refused:'The decision was refused. Reload and review the request again.',conflict:'A different decision is already recorded for this request.'};
function ReviewValue({value,depth=0}:{value:unknown;depth?:number}){
 if(value===null)return <span>None</span>;
 if(typeof value!=='object')return <span>{String(value)}</span>;
 if(!Array.isArray(value)&&(value as {masked?:boolean}).masked===true)return <span>Hidden</span>;
 if(depth>6)return <details><summary>More details</summary><pre tabIndex={0}>{JSON.stringify(value,null,2)}</pre></details>;
 return Array.isArray(value)?<ol>{value.map((v,i)=><li key={i}><ReviewValue value={v} depth={depth+1}/></li>)}</ol>:<dl>{Object.entries(value).map(([key,v])=><div key={key}><dt>{key.replaceAll('_',' ').replace(/([a-z])([A-Z])/g,'$1 $2')}</dt><dd><ReviewValue value={v} depth={depth+1}/></dd></div>)}</dl>;
}
/** Places another page may open in Approvals (for example `perms` from an app's "Agent permissions…"). */
export type ApprovalsPlaceRequest=Readonly<{place:'pending'|'reviews'|'rules'|'perms'|'reviewers'|'coverage'|'approved'|'executed'|'denied'|'failed'|'expired'|'all';n:number}>;
/** Reviews asked of me that still wait for my answer, for the sidebar badge. Reads only; null when unknown. */
export function useUnansweredReviews(client:SessionClient,enabled:boolean){
 const [count,setCount]=useState<number|null>(null),[version,setVersion]=useState(0);const reload=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{if(!enabled)return;const abort=new AbortController();let stopped=false;
  const read=async(path:string)=>{const r=await client.request({method:'GET',path},abort.signal),body=reviewerResponse(path,r.status,r.body);if(r.status!==200)throw Error(String(body.code));return body;};
  const load=async()=>{try{const {policies}=await read('/api/reviewer-requests/policies') as {policies:{id:string}[]};let n=0;for(const p of policies.slice(0,20)){const {items}=await read('/api/reviewer-requests/'+p.id) as {items:ReviewItem[]};n+=unansweredCount(items);}if(!stopped)setCount(n);}catch{if(!stopped)setCount(null);}};
  void load();const timer=setInterval(()=>void load(),30000);return()=>{stopped=true;abort.abort();clearInterval(timer);};},[client,enabled,version]);
 return {count,reload};
}
/** One Approvals sidebar (board AP1): search, what waits for me, reviews asked of me, then history places. */
export function ApprovalsWorkspace({client,active,slot,onDecision,onAccount,pendingCount,onAgent,placeRequest}:{client:SessionClient;active:boolean;slot:HTMLElement|null;onDecision:()=>void;onAccount:()=>void;pendingCount?:number|null;onAgent?:(id:string)=>void;placeRequest?:ApprovalsPlaceRequest|null}){
 const owner=client.getSnapshot().user?.role==='owner';const [place,setPlace]=useState<string>(owner?'pending':'reviews');const [query,setQuery]=useState('');const search=useRef<HTMLInputElement>(null);
 const rulePlaces=['rules','perms','reviewers','coverage'];const execution=place!=='reviews'&&!rulePlaces.includes(place);const choose=(id:string)=>{setQuery('');setPlace(id);};
 const reviews=useUnansweredReviews(client,active);
 // Another page asks for a place: each new request number opens it once; owner places stay owner-only.
 useEffect(()=>{if(!placeRequest)return;const id=placeRequest.place;if(id==='reviews'||owner&&(id==='pending'||rulePlaces.includes(id)||approvalPlaces.some(p=>p.id===id)))choose(id);},[placeRequest?.n]);// eslint-disable-line react-hooks/exhaustive-deps
 const placeButton=(id:string,name:string,icon:Parameters<typeof UiIcon>[0]['name'],badge?:number|null,badgeWords='waiting')=><button key={id} type="button" className="nav-item dk-place" aria-current={place===id?'page':undefined} onClick={()=>choose(id)}><UiIcon name={icon} size={15}/><span>{name}</span>{badge?<span className="dk-badge" aria-label={`${badge} ${badgeWords}`}>{badge>=100?'99+':badge}</span>:null}</button>;
 const sidebar=<nav className="dk-sidebar approvals-places" aria-label="Approvals places">{owner&&execution&&<label className="dk-search"><UiIcon name="search" size={13}/><input ref={search} type="search" aria-label="Search requests" placeholder="Search  ⌘F" value={query} onChange={e=>setQuery(e.target.value)}/></label>}{owner&&placeButton('pending','Waiting for me','inbox',pendingCount)}{placeButton('reviews','Reviews asked of me','shield',reviews.count,'waiting for your answer')}{owner&&<><p className="section-label dk-label">History</p>{approvalPlaces.filter(p=>p.history).map(p=>placeButton(p.id,p.name,p.icon))}<p className="section-label dk-label">Rules</p>{placeButton('rules','Approval rules','note')}{placeButton('perms','What agents may do','sliders')}{placeButton('reviewers','Reviewers','eye')}{placeButton('coverage','Tools without a rule','tool')}</>}</nav>;
 return <>{slot?(active?createPortal(sidebar,slot):null):sidebar}{owner&&<div hidden={!execution}><ApprovalPage client={client} active={active&&execution} onDecision={onDecision} filter={execution?place:'pending'} query={query} searchRef={search}/></div>}<div hidden={place!=='reviews'}><HumanReviewsPage client={client} active={active&&place==='reviews'} onAccount={onAccount} onRecorded={reviews.reload}/></div>{owner&&<>{place==='rules'&&<div className="approvals-rule-place"><ReviewerPoliciesSettings client={client} onAccount={onAccount}/></div>}{place==='perms'&&<AgentPermissionsGrid client={client} active={active} onAgent={onAgent}/>}{place==='reviewers'&&<div className="approvals-rule-place"><h2>Reviewers</h2><ReviewersPlace client={client} active={active} onAgent={onAgent}/></div>}{place==='coverage'&&<div className="approvals-rule-place"><h2>Tools without a rule</h2><PermissionCoverage client={client} active={active}/></div>}</>}</>;
}
type ReviewerRow={kind:'agent'|'person';id:string;name:string;line:string;ready:boolean;about:string;rules:string[]};
/** Board AP6: reviewer agents and the people in rules that are on, as one quiet list with details on the right. Read only. */
export function ReviewersPlace({client,active,onAgent}:{client:SessionClient;active:boolean;onAgent?:(id:string)=>void}){
 const [rows,setRows]=useState<ReviewerRow[]|null>(null),[peopleError,setPeopleError]=useState(false),[agentsError,setAgentsError]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{if(!active)return;const abort=new AbortController();let stopped=false;setRows(null);setPeopleError(false);setAgentsError(false);
  const read=async(path:string)=>{const r=await client.request({method:'GET',path},abort.signal),body=reviewerResponse(path,r.status,r.body);if(r.status!==200)throw Error(String(body.code));return body;};
  void (async()=>{
   let agents:ReviewerRow[]=[],people:ReviewerRow[]=[];
   try{const r=await client.request({method:'GET',path:'/api/agents'},abort.signal);if(r.status!==200)throw Error();agents=(((r.body as {agents?:{id:string;name?:string;role?:string|null;department?:string|null;description?:string|null}[]}).agents)??[]).filter(a=>a.role==='evaluator').map(a=>({kind:'agent',id:a.id,name:a.name||'Unnamed reviewer',line:'Reviewer agent'+(a.department?' · '+a.department:''),ready:true,about:a.description||'No responsibilities recorded.',rules:[]}));}catch{if(!stopped)setAgentsError(true);}
   try{
    // The same reads as Approval rules: rules that are on, then the people who may review (two-step sign-in on).
    const rules:{name:string;ids:string[]}[]=[];let cursor:string|null=null;const seen=new Set<string>();
    for(let page=0;page<20;page++){const path='/api/reviewer-policies'+(cursor?'?cursor='+encodeURIComponent(cursor):''),list=await read(path) as {items:{id:string;status:string}[];nextCursor:string|null};
     for(const item of list.items.filter(i=>i.status==='active')){const state=await read('/api/reviewer-policies/'+item.id) as {policy:{name:string;reviewerIds:string[]}|null};if(state.policy)rules.push({name:state.policy.name,ids:state.policy.reviewerIds});}
     if(list.nextCursor===null||seen.has(list.nextCursor))break;seen.add(list.nextCursor);cursor=list.nextCursor;}
    const wanted=new Set(rules.flatMap(r=>r.ids)),names:Record<string,string>={};cursor=null;seen.clear();
    for(let page=0;page<201&&wanted.size;page++){const path='/api/reviewer-policies/eligible-humans'+(cursor?'?cursor='+encodeURIComponent(cursor):''),list=await read(path) as {items:{id:string;name:string}[];nextCursor:string|null};for(const p of list.items)if(wanted.has(p.id))names[p.id]=p.name;if([...wanted].every(id=>names[id])||list.nextCursor===null||seen.has(list.nextCursor))break;seen.add(list.nextCursor);cursor=list.nextCursor;}
    people=[...wanted].map(id=>{const inRules=rules.filter(r=>r.ids.includes(id)).map(r=>r.name),ready=!!names[id];return {kind:'person',id,name:names[id]??'Someone in '+inRules[0],line:ready?'Person · in '+inRules.join(', '):'Person · needs two-step sign-in first',ready,about:ready?'Can answer reviews in these rules.':'This person cannot answer reviews until they turn on two-step sign-in.',rules:inRules};});
   }catch{if(!stopped)setPeopleError(true);}
   if(!stopped)setRows([...agents,...people]);
  })();
  return()=>{stopped=true;abort.abort();};
 },[client,active,refresh]);
 const shown=(rows??[]).filter(r=>(r.name+' '+r.line).toLowerCase().includes(query.toLowerCase())),row=shown.find(r=>r.kind+r.id===selected)??shown[0];
 return <section className="permission-coverage coverage-desktop reviewers-place" aria-label="Reviewers"><div className="coverage-toolbar"><label><UiIcon name="search" size={14}/><input type="search" aria-label="Find a reviewer" placeholder="Find a reviewer" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="tool" title="Read again" aria-label="Read the reviewers again" onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={15}/></button></div>
  {agentsError&&<p role="status">Reviewer agents could not be read.</p>}{peopleError&&<p role="status">The people in your rules could not be read. Check Approval rules.</p>}
  {!rows?<p role="status">Reading reviewers…</p>:<div className="coverage-panes"><div className="coverage-list" aria-label="Reviewers">{!shown.length?<p className="fine-print">{query?'No matching reviewers.':'No reviewer agents and no people in rules that are on.'}</p>:shown.map(r=><button key={r.kind+r.id} type="button" aria-current={row===r?'true':undefined} onClick={()=>setSelected(r.kind+r.id)}><Avatar name={r.name} size={20}/><span className="coverage-name"><bdi>{r.name}</bdi><small>{r.line}</small></span>{!r.ready&&<small className="coverage-guard" data-none>Not ready</small>}</button>)}</div>
  <div className="coverage-inspector" aria-label="Selected reviewer">{row&&<><h4><bdi>{row.name}</bdi></h4><dl><dt>Kind</dt><dd>{row.kind==='agent'?'Reviewer agent':'Person'}</dd><dt>State</dt><dd>{row.ready?'Ready':'Needs two-step sign-in'}</dd>{row.rules.length>0&&<><dt>In rules</dt><dd>{row.rules.join(', ')}</dd></>}</dl><p>{row.about}</p>{row.kind==='agent'&&onAgent&&<button type="button" className="link" onClick={()=>onAgent(row.id)}>Open reviewer profile…</button>}</>}</div></div>}
  <p className="fine-print">A reviewer's job title never gives it permissions. People must turn on two-step sign-in to review.</p>
 </section>;
}
export function HumanReviewsPage({client,active,onAccount,onRecorded}:{client:SessionClient;active:boolean;onAccount?:()=>void;onRecorded?:()=>void}){
 const controller=useMemo(()=>new HumanReviewsController(client),[client]),state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const [reviewed,setReviewed]=useState(false),[decision,setDecision]=useState<'approve'|'deny'>('approve'),[proof,setProof]=useState<ReviewerProofTarget|null>(null),[search,setSearch]=useState('');
 const verifyButton=useRef<HTMLButtonElement>(null),reloadButton=useRef<HTMLButtonElement>(null),restoreFocus=useRef(false),rows=useRef<(HTMLButtonElement|null)[]>([]),menu=useMenu();
 useEffect(()=>{if(active)void controller.load();else controller.cancel();return()=>controller.cancel();},[controller,active]);
 useEffect(()=>{setReviewed(false);setProof(null);setDecision(state.detail?.ownVote?.decision??'approve');},[state.detail]);
 useEffect(()=>{if(state.notice==='recorded')onRecorded?.();},[state.notice,onRecorded]);
 useEffect(()=>{const epoch=client.getSnapshot().epoch;return client.subscribe(()=>{if(client.getSnapshot().epoch!==epoch){controller.cancel();setProof(null);setReviewed(false);}});},[client,controller]);
 useEffect(()=>{if(restoreFocus.current&&!proof&&active&&state.phase!=='recording'){const target=verifyButton.current&&!verifyButton.current.disabled?verifyButton.current:reloadButton.current;target?.focus();restoreFocus.current=false;}},[proof,active,state.phase]);
 const closeProof=()=>{restoreFocus.current=true;setProof(null);};
 const busy=state.phase==='loading'||state.phase==='detail'||state.phase==='recording'||!!proof;
 const detail=state.detail,selected=state.items.find(i=>i.reference.approvalId===detail?.reference.approvalId),items=state.items.filter(i=>(i.toolName+' '+requestTitle(i.toolName,null)+' '+i.agentId+' '+(i.agentName??'')).toLowerCase().includes(search.toLowerCase()));
 const asker=(i:ReviewItem)=>i.agentName??'Agent name unavailable';
 return <div className="human-reviews" data-selected={!!detail} aria-label="Reviews asked of me">
  <header className="human-review-toolbar"><h2>Reviews asked of me</h2><label><span className="sr-only">Find a request</span><input type="search" placeholder="Find a request" value={search} disabled={busy} onChange={e=>setSearch(e.target.value)}/></label><button type="button" ref={reloadButton} className="tool" title="Reload reviews" aria-label="Reload reviews" disabled={busy} onClick={()=>void controller.load()}><UiIcon name="refresh" size={16}/></button></header>
  <label className="human-policy-picker">Review rule<select value={state.policyId??''} disabled={busy||!state.policies.length} onChange={e=>void controller.choosePolicy(e.target.value)}><option value="" disabled>Choose a rule</option>{state.policies.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {state.notice&&<p className="human-review-notice" role="status">{notices[state.notice]}</p>}{state.notice==='verification'&&onAccount&&<button type="button" onClick={onAccount}>Account verification</button>}
  {busy&&!proof&&<p role="status">{state.phase==='recording'?'Recording your decision…':'Loading reviews…'}</p>}
  {state.phase==='ready'&&!state.policies.length&&<p className="human-review-empty">No review rules are assigned to you.</p>}
  <div className="human-review-panes"><section className="human-review-list" aria-label="Assigned requests"><ul>{items.map((item,index)=><li key={item.reference.approvalId}><button type="button" ref={element=>{rows.current[index]=element;}} aria-pressed={detail?.reference.approvalId===item.reference.approvalId} disabled={busy} onClick={()=>void controller.open(item)} onContextMenu={e=>menu.at(e,[{label:'Review request',icon:'shield',run:()=>void controller.open(item),disabled:busy}])} onKeyDown={e=>{if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'){menu.at(e,[{label:'Review request',icon:'shield',run:()=>void controller.open(item),disabled:busy}]);return;}const next=e.key==='ArrowDown'?(index+1)%items.length:e.key==='ArrowUp'?(index-1+items.length)%items.length:e.key==='Home'?0:e.key==='End'?items.length-1:undefined;if(next!==undefined){e.preventDefault();rows.current[next]?.focus();}}}><UiIcon name="tool" size={18}/><span><strong>{requestTitle(item.toolName,null)}</strong><small className="human-review-asker"><Avatar name={asker(item)} size={14}/><bdi>{asker(item)}</bdi>{stillNeeded(item)?' · '+stillNeeded(item):''}{item.ownVote?' · '+(item.ownVote.status==='verification_required'?'Verify again':item.ownVote.decision==='approve'?'Approved':'Declined'):''}</small></span></button></li>)}</ul>{state.phase==='ready'&&state.policyId&&!items.length&&<p className="human-review-empty">No requests in this view.</p>}{state.nextCursor&&<button disabled={busy} onClick={()=>state.policyId&&void controller.choosePolicy(state.policyId,state.nextCursor!)}>Next requests</button>}</section>
  <section className="human-review-detail" aria-label="Selected review">{detail?<>
   <button type="button" className="tool human-review-back" title="Back to requests" aria-label="Back to requests" disabled={busy} onClick={()=>controller.closeDetail()}><UiIcon name="arrow-left" size={16}/></button><h3><UiIcon name="tool" size={18}/> {selected?requestTitle(selected.toolName,null):'Review this request'}</h3>{selected&&<p className="human-review-asker"><Avatar name={asker(selected)} size={16}/>Asked by <bdi>{asker(selected)}</bdi>{stillNeeded(selected)?' · '+stillNeeded(selected):''}</p>}<p className="fine-print">Hidden values stay hidden. Your answer never runs the action.</p><h4>What it wants to do</h4><div className="human-review-values"><ReviewValue value={detail.params}/></div><details><summary>Show where it runs</summary><ReviewValue value={detail.runScope}/></details>
   {detail.ownVote?.status==='current'?<p role="status">Your answer is saved: {detail.ownVote.decision==='approve'?'Agree':'Decline'}. It does not run the action.</p>:<>{detail.ownVote?.status==='verification_required'&&<p role="status">Your earlier answer needs your code again before it counts.</p>}<div className="human-review-answer" role="radiogroup" aria-label="Your answer">{(['approve','deny'] as const).map(d=><button key={d} type="button" role="radio" aria-checked={decision===d} data-answer={d} disabled={busy||state.locked||!!detail.ownVote} onClick={()=>{setDecision(d);setReviewed(false);}}>{d==='approve'?'Agree':'Decline'}</button>)}</div>
   <label className="check"><input type="checkbox" checked={reviewed} disabled={busy||state.locked||detail.params===null} onChange={e=>setReviewed(e.target.checked)}/>I checked this exact request and my answer.</label>
   <button type="button" className="primary" ref={verifyButton} disabled={busy||state.locked||!reviewed||detail.params===null} onClick={()=>setProof(Object.freeze({kind:'vote',reference:Object.freeze({...detail.reference,decision})}))}>{detail.ownVote?'Confirm again with code…':'Confirm with code…'}</button></> }
  </>:<p className="human-review-empty">Select a request to see what it wants to do.</p>}</section></div>
  {menu.menu&&<ContextMenu menu={menu.menu} onClose={menu.close}/>}
  {proof&&active&&detail&&<ReviewerVerificationSheet client={client} target={proof} subject={(decision==='approve'?'Approve':'Decline')+' · '+(selected?requestTitle(selected.toolName,null):'this request')} finalLabel="Record decision" onClose={closeProof} onConfirm={receipt=>{const reference=proof.kind==='vote'?proof.reference:null;closeProof();if(reference)void controller.record(reference,receipt);}}/>}
 </div>;
}
