import {SERVICE_IDS,SERVICE_MARKS} from './service-logo-data';

/** The mark for a channel id or an MCP server name, or null (the caller keeps its letter tile). */
export function serviceMark(idOrName:string|undefined|null){
 if(!idOrName)return null;
 const key=idOrName.toLowerCase().trim();
 const slug=SERVICE_IDS[key]??(SERVICE_MARKS[key]?key:Object.keys(SERVICE_MARKS).find(s=>key.replace(/[\s_]+/g,'-').includes(s)));
 return slug?SERVICE_MARKS[slug]??null:null;
}
// Marks that are nearly white or black take the text colour, so they read in light and dark.
const plain=(hex:string)=>{const h=hex.replace('#','');const f=h.length===3?h.split('').map(c=>c+c).join(''):h.slice(0,6);const n=parseInt(f,16);const l=(0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255))/255;return l>0.9||l<0.12;};

/** A service's brand mark in its own colour (AA4 Channels, MCP connections). */
export function ServiceLogo({id,size=16}:{id:string|undefined|null;size?:number}){
 const mark=serviceMark(id);
 if(!mark)return null;
 const colour=plain(mark.color)?'currentColor':mark.color;
 return <svg className="service-logo" width={size} height={size} viewBox={mark.viewBox} aria-hidden="true" focusable="false">{mark.paths.map((p,i)=><path key={i} d={p.d} fill={p.fill??colour} fillRule={p.rule}/>)}</svg>;
}
