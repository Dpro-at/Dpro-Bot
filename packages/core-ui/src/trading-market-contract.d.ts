export type MarketData={symbol:string;source:'Yahoo Finance';interval:'1h';fetchedAt:number;candles:{time:number;open:number;high:number;low:number;close:number;volume:number}[];forecast:{time:number;close:number}[]|null;model:'Kronos-small'|null};
export function marketRoute(path:string):{symbol:string;forecast:boolean}|null;
export function allowedMarket(method:string,path:string,body?:unknown):boolean;
export function marketResponse(path:string,status:number,body:unknown):MarketData|{code:string};
