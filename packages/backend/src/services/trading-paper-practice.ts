/** Ephemeral practice only: existing paper ledger/risk/fill engine, fixed fictional inputs, no main database. */
import Database from 'better-sqlite3';
import {randomUUID} from 'node:crypto';
import {initializePaperLedger,provisionPaperAccount,reservePaperOrder} from './trading-paper-ledger.js';
import {initializePaperExecution,configurePaperExecution,recordPaperExecutionQuote} from './trading-paper-execution.js';
import {initializePaperSells,reservePaperSell} from './trading-paper-sells.js';
import {settlePaperRiskInTransaction} from './trading-paper-risk-execution.js';
import {initializePaperBots,provisionPaperBot,runPaperBotTickInTransaction,stopPaperBot} from './trading-paper-bots.js';
export const PRACTICE_MARKET=Object.freeze([
 {symbol:'DEMO-ALPHA',name:'Demo Alpha',priceMinor:1000},
 {symbol:'DEMO-BETA',name:'Demo Beta',priceMinor:2500},
 {symbol:'DEMO-GAMMA',name:'Demo Gamma',priceMinor:5000},
].map(x=>Object.freeze(x)));
const INITIAL_CASH=1000000,TTL=2*60*60*1000,FEE_BPS=25;
export type PracticeOrder={sessionId:string;requestId:string;symbol:string;side:'buy'|'sell';quantity:number};
type Fill={id:string;requestId:string;symbol:string;side:'buy'|'sell';quantity:number;priceMinor:number;feeMinor:number;totalMinor:number;createdAt:number;source:'manual'|'bot'};
type Session={id:string;owner:string;db:Database.Database;createdAt:number;expiresAt:number;quoteRevision:number;orders:Fill[];receipts:Map<string,string>};
export class PracticeError extends Error{constructor(public readonly code:'practice_unavailable'|'practice_conflict'|'practice_order_refused'|'practice_limit',public readonly status=409){super(code);}}
/** One bounded in-memory session per owner, owned and disposed by one server instance. */
export class PaperPracticeStore{
 private sessions=new Map<string,Session>();private closed=false;
 constructor(private readonly clock:()=>number=Date.now,private readonly maxSessions=16){}
 close(){this.closed=true;for(const s of this.sessions.values())if(s.db.open)s.db.close();this.sessions.clear();}
 private now(){const now=this.clock();if(this.closed||!Number.isSafeInteger(now)||now<0)throw new PracticeError('practice_unavailable',503);return now;}
 private find(owner:string,now:number){const s=this.sessions.get(owner);if(s&&(now>=s.expiresAt||now<s.createdAt)){s.db.close();this.sessions.delete(owner);return undefined;}return s;}
 private required(owner:string,id:string,now:number){const s=this.find(owner,now);if(!s||s.id!==id)throw new PracticeError('practice_conflict');return s;}
 read(owner:string){const now=this.now(),s=this.find(owner,now);return s?this.snapshot(s):this.inactive();}
 private inactive(){return {mode:'practice' as const,active:false as const,market:PRACTICE_MARKET,currency:'USD' as const,initialCashMinor:INITIAL_CASH,feeBps:FEE_BPS,persistent:false as const};}
 start(owner:string){
  const now=this.now(),current=this.find(owner,now);if(current)return this.snapshot(current);
  for(const key of this.sessions.keys())this.find(key,now);
  if(this.sessions.size>=this.maxSessions)throw new PracticeError('practice_limit',429);
  const db=new Database(':memory:');
  try{
   initializePaperLedger(db);initializePaperExecution(db);initializePaperSells(db);initializePaperBots(db);
   const expiresAt=now+TTL;
   provisionPaperAccount(db,{cash:INITIAL_CASH,exposure:0,policy:{id:'practice-policy',ownerId:owner,accountId:'practice-account',revision:1,appRevision:1,currency:'USD',mode:'paper',enabled:true,expiresAt,symbols:PRACTICE_MARKET.map(x=>x.symbol),maxOrder:100000,maxExposure:INITIAL_CASH,maxDailyLoss:100000,maxOrders:200,cooldownMs:0,maxQuoteAgeMs:5000}});
   configurePaperExecution(db,{ownerId:owner,accountId:'practice-account',revision:1,feeBps:FEE_BPS,slippageBps:0,unitScale:1,currency:'USD'});
   const bot=provisionPaperBot(db,{botId:'practice-bot',ownerId:owner,accountId:'practice-account',policyId:'practice-policy',policyRevision:1,appRevision:1,expiresAt,maxSuccessfulTicks:20,cooldownMs:0},()=>now);
   if(!bot.ok)throw new PracticeError('practice_unavailable',503);
   const s:Session={id:randomUUID(),owner,db,createdAt:now,expiresAt,quoteRevision:0,orders:[],receipts:new Map()};const snapshot=this.snapshot(s);this.sessions.set(owner,s);return snapshot;
  }catch(error){db.close();throw error;}
 }
 end(owner:string,id:string){const now=this.now(),s=this.find(owner,now);if(s&&s.id!==id)throw new PracticeError('practice_conflict');if(s){s.db.close();this.sessions.delete(owner);}return this.inactive();}
 stopBot(owner:string,id:string){const s=this.required(owner,id,this.now());if((s.db.prepare('SELECT status FROM paper_bots WHERE bot_id=?').get('practice-bot') as {status:string}).status!=='stopped'&&!stopPaperBot(s.db,owner,'practice-bot').ok)throw new PracticeError('practice_order_refused');return this.snapshot(s);}
 order(owner:string,input:PracticeOrder,bot=false){
  const now=this.now(),s=this.required(owner,input.sessionId,now),instrument=PRACTICE_MARKET.find(x=>x.symbol===input.symbol);
  if(!instrument||!['buy','sell'].includes(input.side)||!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>100)throw new PracticeError('practice_order_refused');
  const intent=JSON.stringify([input.symbol,input.side,input.quantity,bot]),old=s.receipts.get(input.requestId);
  if(old){if(old!==intent)throw new PracticeError('practice_conflict');return {...this.snapshot(s),replayed:true};}
  if(s.orders.length>=200)throw new PracticeError('practice_limit',429);
  const revision=s.quoteRevision+1,gross=instrument.priceMinor*input.quantity,budget=gross+Math.ceil(gross*FEE_BPS/10000);
  try{
   const fill=s.db.transaction(()=>{
    recordPaperExecutionQuote(s.db,{accountId:'practice-account',symbol:instrument.symbol,priceMinor:instrument.priceMinor,quotedAt:now,revision,currency:'USD',unitScale:1});
    const common={accountId:'practice-account',policyId:'practice-policy',policyRevision:1,appRevision:1,currency:'USD',symbol:instrument.symbol,idempotencyKey:input.requestId};
    const reservation=input.side==='buy'?reservePaperOrder(s.db,owner,{...common,side:'buy',notional:budget},()=>now):reservePaperSell(s.db,owner,{...common,quantityUnits:input.quantity},()=>now);
    if(!reservation.ok)throw new PracticeError('practice_order_refused');
    const result=bot?runPaperBotTickInTransaction(s.db,owner,{botId:'practice-bot',tickKey:input.requestId,side:input.side,reservationId:reservation.reservationId},now):settlePaperRiskInTransaction(s.db,owner,{side:input.side,accountId:'practice-account',reservationId:reservation.reservationId,executionKey:input.requestId},now,'new_only');
    if(!result.ok)throw new PracticeError('practice_order_refused');
    const row=(input.side==='buy'?s.db.prepare('SELECT fill_id id,quantity_units quantity,price_minor priceMinor,fee_minor feeMinor,total_minor totalMinor FROM paper_fills WHERE reservation_id=?'):s.db.prepare('SELECT id,quantity_units quantity,price_minor priceMinor,fee_minor feeMinor,net_minor totalMinor FROM paper_sell_fills WHERE reservation_id=?')).get(reservation.reservationId) as Omit<Fill,'requestId'|'symbol'|'side'|'createdAt'|'source'>;
    if(!row||row.quantity!==input.quantity)throw new PracticeError('practice_order_refused');
    return {...row,requestId:input.requestId,symbol:input.symbol,side:input.side,createdAt:now,source:bot?'bot' as const:'manual' as const};
   }).immediate();
   s.quoteRevision=revision;s.orders.push(fill);s.receipts.set(input.requestId,intent);return {...this.snapshot(s),replayed:false};
  }catch(error){if(error instanceof PracticeError)throw error;throw new PracticeError('practice_order_refused');}
 }
 private snapshot(s:Session){
  const account=s.db.prepare('SELECT cash FROM paper_accounts WHERE account_id=?').get('practice-account') as {cash:number};
  const rows=s.db.prepare('SELECT symbol,quantity_units quantity,cost_minor costMinor FROM paper_positions WHERE account_id=? ORDER BY symbol').all('practice-account') as {symbol:string;quantity:number;costMinor:number}[];
  const positions=rows.filter(x=>x.quantity>0).map(x=>({...x,marketValueMinor:x.quantity*PRACTICE_MARKET.find(m=>m.symbol===x.symbol)!.priceMinor}));
  const marketValueMinor=positions.reduce((sum,x)=>sum+x.marketValueMinor,0),equityMinor=account.cash+marketValueMinor;
  const bot=s.db.prepare('SELECT status,successful_ticks ticks FROM paper_bots WHERE bot_id=?').get('practice-bot') as {status:string;ticks:number};
  return {...this.inactive(),active:true as const,sessionId:s.id,expiresAt:s.expiresAt,cashMinor:account.cash,marketValueMinor,equityMinor,netResultMinor:equityMinor-INITIAL_CASH,positions,orders:s.orders.map(x=>({...x})).reverse(),bot:{stopped:bot.status!=='active',ticks:bot.ticks,maxTicks:20}};
 }
}
