import type {FastifyInstance} from 'fastify';
type Candle={time:number;open:number;high:number;low:number;close:number;volume:number};
type History={symbol:string;source:'Yahoo Finance';interval:'1h';fetchedAt:number;candles:Candle[]};
const symbols=['BTC-USD','ETH-USD','SPY','EURUSD=X','GC=F'];
/** Public historical research data and explicit local inference. No credential fallback or broker access. */
export async function tradingMarketRoutes(app:FastifyInstance,options:{fetch?:typeof fetch}={}){
 const request=options.fetch??fetch,cache=new Map<string,History>();let busy=false;
 async function json(url:string,init:RequestInit={},limit=2_000_000){const response=await request(url,{...init,redirect:'error',signal:AbortSignal.timeout(30_000)});if(!response.ok)throw Error('unavailable');const reader=response.body?.getReader();if(!reader)throw Error('empty');let size=0;const chunks:Uint8Array[]=[];try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('oversize');chunks.push(value);}}finally{await reader.cancel();}return JSON.parse(Buffer.concat(chunks).toString());}
 async function history(symbol:string):Promise<History>{const old=cache.get(symbol);if(old&&Date.now()-old.fetchedAt<60_000)return old;
  const x=await json('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range='+(symbol.endsWith('-USD')?'1mo':'6mo')+'&interval=1h',{headers:{'User-Agent':'Girru market research'}});const data=x?.chart?.result?.[0],q=data?.indicators?.quote?.[0];if(!q||!Array.isArray(data.timestamp)||data.timestamp.length>5000)throw Error('invalid');
  const candles:Candle[]=[];let previous=0;for(let i=0;i<data.timestamp.length;i++){const c={time:data.timestamp[i],open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i],volume:q.volume?.[i]??0};if(!Number.isSafeInteger(c.time)||c.time<=previous)throw Error('time');previous=c.time;if(!['open','high','low','close'].every(k=>typeof c[k as keyof Candle]==='number'&&Number.isFinite(c[k as keyof Candle])&&c[k as keyof Candle]>0&&c[k as keyof Candle]<1e12)||!Number.isFinite(c.volume)||c.volume<0||c.low>Math.min(c.open,c.close)||c.high<Math.max(c.open,c.close))continue;candles.push(c);}
  if(candles.length<512)throw Error('insufficient');const result:History={symbol,source:'Yahoo Finance',interval:'1h',fetchedAt:Date.now(),candles:candles.slice(-744)};cache.set(symbol,result);return result;
 }
 for(const forecast of [false,true])app.route({method:forecast?'POST':'GET',url:'/api/trading-market/:symbol'+(forecast?'/forecast':''),bodyLimit:256,config:{access:'owner',rateLimit:{max:forecast?6:30,timeWindow:'1 minute'}},handler:async(req,reply)=>{
  reply.header('Cache-Control','no-store');if(!req.authUser)return reply.code(401).send({code:'unauthenticated'});if(req.authUser.role!=='owner')return reply.code(403).send({code:'forbidden'});
  const symbol=(req.params as {symbol:string}).symbol;if(!symbols.includes(symbol)||Object.keys(req.query as object).length|| (forecast? !req.body||typeof req.body!=='object'||Array.isArray(req.body)||Object.keys(req.body).length!==0:req.body!==undefined))return reply.code(400).send({code:'invalid_market_request'});
  if(forecast&&busy)return reply.code(429).send({code:'model_busy'});if(forecast)busy=true;
  try{const data=await history(symbol);if(!forecast)return data;const result=await json('http://127.0.0.1:42530/api/dpro/forecast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({candles:data.candles.slice(-512)})},50_000);const last=data.candles.at(-1)!.time;if(result.model!=='Kronos-small'||!Array.isArray(result.points)||result.points.length!==24||!result.points.every((p:{time:number;close:number},i:number)=>p.time===last+(i+1)*3600&&Number.isFinite(p.close)&&p.close>0&&p.close<1e12))throw Error('invalid_forecast');return {...data,model:'Kronos-small',forecast:result.points.map((p:{time:number;close:number})=>({time:p.time,close:p.close}))};}
  catch{return reply.code(503).send({code:'market_unavailable'});}finally{if(forecast)busy=false;}
 }});
}
