const symbols=['BTC-USD','ETH-USD','SPY','EURUSD=X','GC=F'];
export function marketRoute(path){const m=/^\/api\/trading-market\/([^/]+)(\/forecast)?$/.exec(path);return m&&symbols.includes(m[1])?{symbol:m[1],forecast:!!m[2]}:null;}
export function allowedMarket(method,path,body){const r=marketRoute(path);return !!r&&(r.forecast?method==='POST'&&!!body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).length===0:method==='GET'&&body===undefined);}
export function marketResponse(path,status,body){
 const r=marketRoute(path);if(!r)throw Error('Invalid market route');
 if(status!==200)return {code:body?.code==='model_busy'?'model_busy':'market_unavailable'};
 const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<1e12;
 if(!body||body.symbol!==r.symbol||body.source!=='Yahoo Finance'||body.interval!=='1h'||!Number.isSafeInteger(body.fetchedAt)||!Array.isArray(body.candles)||body.candles.length<512||body.candles.length>744)throw Error('Invalid market history');
 let previous=0;const candles=body.candles.map(c=>{if(!c||!Number.isSafeInteger(c.time)||c.time<=previous||!['open','high','low','close'].every(k=>number(c[k]))||!Number.isFinite(c.volume)||c.volume<0||c.low>Math.min(c.open,c.close)||c.high<Math.max(c.open,c.close)||c.low>c.high)throw Error('Invalid candle');previous=c.time;return {time:c.time,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume};});
 let forecast=null;if(r.forecast){if(body.model!=='Kronos-small'||!Array.isArray(body.forecast)||body.forecast.length!==24)throw Error('Invalid forecast');forecast=body.forecast.map((p,i)=>{if(p.time!==previous+3600*(i+1)||!number(p.close))throw Error('Invalid forecast point');return {time:p.time,close:p.close};});}
 return {symbol:r.symbol,source:'Yahoo Finance',interval:'1h',fetchedAt:body.fetchedAt,candles,forecast,model:r.forecast?'Kronos-small':null};
}
