const base='/api/trading-paper/practice';
const record=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const exact=(v,keys)=>record(v)&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k),'value'));
const uint=(v,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(v);
const symbols=['DEMO-ALPHA','DEMO-BETA','DEMO-GAMMA'],names=['Demo Alpha','Demo Beta','Demo Gamma'],prices=[1000,2500,5000];
const fail=()=>{throw Error('practice_protocol');};
export function practiceRoute(path){if(path===base)return 'session';if(path===base+'/orders')return 'order';if(path===base+'/step')return 'step';if(path===base+'/stop-bot')return 'stop';if(path===base+'/end')return 'end';return null;}
export function allowedPractice(method,path,body){
 const kind=practiceRoute(path);if(!kind)return false;
 if(method==='GET')return kind==='session'&&body===undefined;
 if(method!=='POST')return false;if(kind==='session')return exact(body,[]);
 if(!exact(body,kind==='order'?['sessionId','requestId','symbol','side','quantity']:kind==='step'?['sessionId','requestId']:['sessionId'])||!uuid(body.sessionId))return false;
 if(['order','step'].includes(kind)&&!uuid(body.requestId))return false;
 return kind!=='order'||symbols.includes(body.symbol)&&['buy','sell'].includes(body.side)&&uint(body.quantity,100)&&body.quantity>0;
}
export function practiceResponse(path,status,body){
 if(!practiceRoute(path))return fail();
 if(status!==200){const codes=['practice_conflict','practice_order_refused','practice_limit','invalid_practice_request','unauthenticated','forbidden','rate_limited'];return {code:record(body)&&codes.includes(body.code)?body.code:'practice_unavailable'};}
 const baseKeys=['mode','active','market','currency','initialCashMinor','feeBps','persistent'];
 if(!record(body)||typeof body.active!=='boolean'||!exact(body,[...baseKeys,...(body.active?['sessionId','expiresAt','cashMinor','marketValueMinor','equityMinor','netResultMinor','positions','orders','bot']:[]),...(Object.hasOwn(body,'replayed')?['replayed']:[])])||body.mode!=='practice'||body.currency!=='USD'||body.initialCashMinor!==1000000||body.feeBps!==25||body.persistent!==false||!Array.isArray(body.market)||body.market.length!==3)return fail();
 const market=body.market.map((x,i)=>{if(!exact(x,['symbol','name','priceMinor'])||x.symbol!==symbols[i]||x.name!==names[i]||x.priceMinor!==prices[i])return fail();return {...x};});
 const result={mode:'practice',active:body.active,market,currency:'USD',initialCashMinor:1000000,feeBps:25,persistent:false};
 if(Object.hasOwn(body,'replayed')&&typeof body.replayed!=='boolean')return fail();
 if(!body.active){if(Object.hasOwn(body,'replayed'))return fail();return result;}
 if(!uuid(body.sessionId)||!uint(body.expiresAt)||!uint(body.cashMinor,1000000)||!uint(body.marketValueMinor,1000000)||!uint(body.equityMinor,1000000)||!Number.isSafeInteger(body.netResultMinor)||body.equityMinor!==body.cashMinor+body.marketValueMinor||body.netResultMinor!==body.equityMinor-1000000||!Array.isArray(body.positions)||body.positions.length>3||!Array.isArray(body.orders)||body.orders.length>200||!exact(body.bot,['stopped','ticks','maxTicks'])||typeof body.bot.stopped!=='boolean'||body.bot.maxTicks!==20||!uint(body.bot.ticks,20))return fail();
 const seen=new Set(),positions=body.positions.map(x=>{const i=symbols.indexOf(x?.symbol);if(!exact(x,['symbol','quantity','costMinor','marketValueMinor'])||i<0||seen.has(x.symbol)||!uint(x.quantity,100000)||x.quantity===0||!uint(x.costMinor,1000000)||x.marketValueMinor!==x.quantity*prices[i])return fail();seen.add(x.symbol);return {...x};});
 if(positions.reduce((n,x)=>n+x.marketValueMinor,0)!==body.marketValueMinor)return fail();
 const ids=new Set(),requests=new Set(),orders=body.orders.map(x=>{const i=symbols.indexOf(x?.symbol);if(!exact(x,['id','requestId','quantity','priceMinor','feeMinor','totalMinor','symbol','side','createdAt','source'])||!uuid(x.id)||!uuid(x.requestId)||ids.has(x.id)||requests.has(x.requestId)||i<0||!['buy','sell'].includes(x.side)||!['manual','bot'].includes(x.source)||!uint(x.quantity,100)||x.quantity===0||x.priceMinor!==prices[i]||x.feeMinor!==Math.ceil(x.quantity*x.priceMinor*25/10000)||x.totalMinor!==x.quantity*x.priceMinor+(x.side==='buy'?x.feeMinor:-x.feeMinor)||!uint(x.createdAt))return fail();ids.add(x.id);requests.add(x.requestId);return {...x};});
 return {...result,sessionId:body.sessionId,expiresAt:body.expiresAt,cashMinor:body.cashMinor,marketValueMinor:body.marketValueMinor,equityMinor:body.equityMinor,netResultMinor:body.netResultMinor,positions,orders,bot:{...body.bot},...(Object.hasOwn(body,'replayed')?{replayed:body.replayed}:{})};
}
