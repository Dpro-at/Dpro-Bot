import type {SessionClient} from './session';
import {allowedPractice,practiceResponse,type PracticeSnapshot} from './trading-practice-contract.js';
const base='/api/trading-paper/practice';
type Pending=Readonly<{path:string;body:Readonly<Record<string,unknown>>}>;
export type PracticeState=Readonly<{phase:'idle'|'loading'|'ready'|'busy'|'unknown'|'unavailable'|'closed';snapshot:PracticeSnapshot|null;notice:string|null}>;
/** Owner/epoch binding and exact-request retry; uncertain writes are never automatically repeated. */
export class TradingPracticeController{
 private state:PracticeState=Object.freeze({phase:'idle',snapshot:null,notice:null});private listeners=new Set<()=>void>();private pending:Pending|null=null;private generation=0;private closed=false;private unsubscribe:(()=>void)|undefined;private readonly epoch:number;private readonly owner:string;
 constructor(private readonly client:Pick<SessionClient,'request'|'getSnapshot'|'subscribe'>){const s=client.getSnapshot();this.epoch=s.epoch;this.owner=s.user?.id??'';}
 getSnapshot=()=>this.state;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private publish(p:Partial<PracticeState>){this.state=Object.freeze({...this.state,...p});this.listeners.forEach(fn=>fn());}
 private authorized(){const s=this.client.getSnapshot();return !this.closed&&!!this.owner&&s.phase==='authenticated'&&s.user?.id===this.owner&&s.user.role==='owner'&&s.epoch===this.epoch;}
 private guard(){if(!this.authorized()){this.close();return false;}if(!this.unsubscribe)this.unsubscribe=this.client.subscribe(()=>{if(!this.authorized())this.close();});return true;}
 close(){if(this.closed)return;this.closed=true;++this.generation;this.pending=null;this.unsubscribe?.();this.unsubscribe=undefined;this.publish({phase:'closed',snapshot:null,notice:null});}
 async load(){
  if(!this.guard()||this.state.phase==='busy')return;const generation=++this.generation;this.publish({phase:'loading',notice:null});
  try{
   const response=await this.client.request({method:'GET',path:base} as never);if(generation!==this.generation||!this.authorized())return;
   if(response.status!==200)throw Error('unavailable');const snapshot=practiceResponse(base,response.status,response.body) as PracticeSnapshot;
   if(this.pending){const p=this.pending,b=p.body,confirmed=p.path===base?snapshot.active:p.path.endsWith('/end')?!snapshot.active:p.path.endsWith('/stop-bot')?snapshot.sessionId===b.sessionId&&snapshot.bot?.stopped:snapshot.sessionId===b.sessionId&&snapshot.orders?.some(x=>x.requestId===b.requestId);if(confirmed)this.pending=null;}
   this.publish({snapshot,phase:this.pending?'unknown':'ready',notice:this.pending?'outcome_unknown':null});
  }catch{if(generation===this.generation&&this.authorized())this.publish({phase:this.pending?'unknown':'unavailable',notice:this.pending?'outcome_unknown':'practice_unavailable'});}
 }
 async start(){if(this.state.phase!=='ready'||this.state.snapshot?.active)return;await this.send({path:base,body:{}});}
 async order(symbol:string,side:'buy'|'sell',quantity:number){const id=this.state.snapshot?.sessionId;if(this.state.phase!=='ready'||!id)return;await this.send({path:base+'/orders',body:{sessionId:id,requestId:crypto.randomUUID(),symbol,side,quantity}});}
 async step(){const s=this.state.snapshot;if(this.state.phase!=='ready'||!s?.sessionId||s.bot?.stopped||!s.bot||s.bot.ticks>=s.bot.maxTicks)return;await this.send({path:base+'/step',body:{sessionId:s.sessionId,requestId:crypto.randomUUID()}});}
 async stopBot(){const id=this.state.snapshot?.sessionId;if(this.state.phase!=='ready'||!id)return;await this.send({path:base+'/stop-bot',body:{sessionId:id}});}
 async end(){const id=this.state.snapshot?.sessionId;if(this.state.phase!=='ready'||!id)return;await this.send({path:base+'/end',body:{sessionId:id}});}
 async retry(){if(this.state.phase==='unknown'&&this.pending)await this.send(this.pending);}
 private async send(input:Pending){
  if(!this.guard())return;if(this.state.phase==='busy'||this.state.phase==='loading')return;
  if(!allowedPractice('POST',input.path,input.body)){this.publish({notice:'invalid_practice_request'});return;}
  const pending=Object.freeze({path:input.path,body:Object.freeze({...input.body})});this.pending=pending;const generation=++this.generation;this.publish({phase:'busy',notice:null});
  try{
   const response=await this.client.request({method:'POST',path:pending.path,body:pending.body} as never);if(generation!==this.generation||!this.authorized())return;
   if(response.status!==200){if(response.status>=500)throw Error('unknown');this.pending=null;const code=(practiceResponse(pending.path,response.status,response.body) as {code:string}).code;this.publish({phase:code==='practice_conflict'?'unavailable':'ready',...(code==='practice_conflict'?{snapshot:null}:{}),notice:code});return;}
   const snapshot=practiceResponse(pending.path,200,response.body) as PracticeSnapshot;this.pending=null;this.publish({phase:'ready',snapshot,notice:snapshot.replayed?'already_applied':'applied'});
  }catch{if(generation===this.generation&&this.authorized())this.publish({phase:'unknown',notice:'outcome_unknown'});}
 }
}
