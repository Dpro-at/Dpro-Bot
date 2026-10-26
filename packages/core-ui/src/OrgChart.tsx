import {useEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties,DragEvent as ReactDragEvent,KeyboardEvent as ReactKeyboardEvent,MouseEvent as ReactMouseEvent} from 'react';
import type {PublicAgent} from './agents';
import {Avatar,IconButton} from './desktop-ui';
import {UiIcon} from './ui-icons';
import {roleWord,departmentName} from './agent-look';
import {canMoveUnder,chartStep,layoutChart,linkPath,movable,type ChartNode,type LineStyle} from './org-chart';

// Zoom and folding are kept for this run of the app (no browser storage in the app source).
const memory:{folded:Set<string>;zoom:number;lines:LineStyle}={folded:new Set(),zoom:1,lines:'elbow'};
const LINE_BUTTONS:{style:LineStyle;label:string;icon:'line-elbow'|'line-curved'|'line-straight'}[]=[{style:'elbow',label:'Lines with right angles',icon:'line-elbow'},{style:'curved',label:'Curved lines',icon:'line-curved'},{style:'straight',label:'Straight lines',icon:'line-straight'}];

/**
 * OC1–OC2: who is under whom. The main agent on top, the agents under it
 * side by side, deeper levels stacked; sub-agents hang on a dashed line.
 * Drag a card onto another agent to change who it reports to (the parent
 * gives Undo). Folding and zoom are kept while the app runs.
 */
export function OrgChart({agents,selected,query,owner,onSelect,onOpen,onMenu,onMove,folded:foldedProp,onFold}:{agents:readonly PublicAgent[];selected:string|null;query:string;owner:boolean;onSelect:(id:string)=>void;onOpen:(id:string)=>void;onMenu:(e:ReactMouseEvent|ReactKeyboardEvent,agent:PublicAgent)=>void;onMove:(id:string,target:string)=>void;folded?:ReadonlySet<string>;onFold?:(id:string)=>void}){
 const [ownFolded,setOwnFolded]=useState<Set<string>>(()=>new Set(memory.folded)),[zoom,setZoom]=useState(memory.zoom),[lines,setLines]=useState<LineStyle>(memory.lines),[drag,setDrag]=useState<string|null>(null),[over,setOver]=useState<string|null>(null);
 const folded=foldedProp??ownFolded;
 const fold=onFold??((id:string)=>setOwnFolded(f=>{const n=new Set(f);if(n.has(id))n.delete(id);else n.add(id);memory.folded=n;return n;}));
 const box=useRef<HTMLDivElement>(null),[room,setRoom]=useState(Infinity);
 // The rows fit the visible width (at the current zoom).
 useEffect(()=>{const b=box.current;if(!b||typeof ResizeObserver==='undefined')return;const o=new ResizeObserver(()=>setRoom(b.clientWidth||Infinity));o.observe(b);setRoom(b.clientWidth||Infinity);return()=>o.disconnect();},[]);
 const chart=useMemo(()=>layoutChart(agents,folded,query,room/zoom),[agents,folded,query,room,zoom]);
 const byId=useMemo(()=>new Map(agents.map(a=>[a.id,a])),[agents]);
 const setZ=(z:number)=>{const v=Math.round(Math.max(.3,Math.min(1.6,z))*100)/100;setZoom(v);memory.zoom=v;};
 const fit=()=>{const b=box.current;if(!b)return;setZ(Math.min(1,(b.clientWidth-8)/chart.width,(b.clientHeight-8)/chart.height));};
 // A search moves the view to the first match.
 useEffect(()=>{if(!query.trim())return;const m=chart.nodes.find(n=>n.match);if(m&&box.current)box.current.scrollTo({left:Math.max(0,m.x*zoom-80),top:Math.max(0,m.y*zoom-80),behavior:'smooth'});},[query,chart,zoom]);
 // ⌘+ / ⌘− / ⌘0 while the chart is on screen and no sheet is open.
 useEffect(()=>{const on=(e:KeyboardEvent)=>{if(!(e.metaKey||e.ctrlKey)||e.altKey||!box.current?.offsetParent||document.querySelector('dialog[open],[role="dialog"]'))return;
  if(e.key==='='||e.key==='+'){e.preventDefault();setZ(zoom+.1);}else if(e.key==='-'){e.preventDefault();setZ(zoom-.1);}else if(e.key==='0'){e.preventDefault();fit();}};
  window.addEventListener('keydown',on);return()=>window.removeEventListener('keydown',on);});
 function key(e:ReactKeyboardEvent,n:ChartNode){
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=chartStep(chart,n.agent.id,e.key);if(next){onSelect(next);box.current?.querySelector<HTMLElement>(`[data-agent="${CSS.escape(next)}"]`)?.focus();}}
  else if(e.key==='Enter'){e.preventDefault();onOpen(n.agent.id);}
  else if(e.key===' '&&n.kids){e.preventDefault();fold(n.agent.id);}
  else if((e.key==='F10'&&e.shiftKey)||e.key==='ContextMenu'){e.preventDefault();onSelect(n.agent.id);onMenu(e,n.agent);}
 }
 const dragged=drag?byId.get(drag):undefined;
 const allowed=(target:PublicAgent)=>owner&&!!dragged&&canMoveUnder(dragged,target,agents);
 function dropOn(e:ReactDragEvent,target:PublicAgent){e.preventDefault();const id=drag;setDrag(null);setOver(null);if(id&&allowed(target))onMove(id,target.id);}
 if(!chart.nodes.length)return <div className="ag-empty"><UiIcon name="users" size={28}/><p>No one here yet.</p></div>;
 const lonely=chart.nodes.length===1&&chart.nodes[0].depth===0;
 return <div className="oc-wrap">
  <div className="oc-plane" ref={box} role="tree" aria-label="Who reports to whom">
   <div className="oc-sizer" style={{inlineSize:chart.width*zoom,blockSize:chart.height*zoom}}>
    <div className="oc-canvas" style={{inlineSize:chart.width,blockSize:chart.height,transform:`scale(${zoom})`}}>
     <svg className="oc-links" aria-hidden="true" width={chart.width} height={chart.height}>{chart.links.map((l,i)=><path key={i} d={linkPath(l,lines)} className={l.dashed?'oc-link oc-dashed':'oc-link'}/>)}</svg>
     {chart.nodes.map(n=>{const a=n.agent,can=drag?allowed(a):false;
      return <div key={a.id} className="oc-slot" style={{insetInlineStart:n.x,insetBlockStart:n.y,inlineSize:n.w,blockSize:n.h} as CSSProperties}>
       {over===a.id&&can&&<span className="oc-drop-tag" role="status">Reports to {a.name??'this agent'}</span>}
       <button type="button" role="treeitem" data-agent={a.id} aria-selected={selected===a.id} aria-expanded={n.kids?!n.folded:undefined} aria-level={n.depth+1}
        aria-label={`${a.name??'Agent'}, ${n.sub?'sub-agent':a.placed==='main'?'main agent':roleWord(a.role)}`} tabIndex={selected===a.id||(!selected&&n.depth===0)?0:-1} draggable={owner&&movable(a)}
        className={['oc-card',n.sub&&'oc-sub',a.placed==='main'&&'oc-main',n.match&&'oc-match',drag===a.id&&'oc-lifted',drag&&drag!==a.id&&!can&&'oc-dim',over===a.id&&can&&'oc-target'].filter(Boolean).join(' ')}
        title={n.sub?`Sub-agent of ${byId.get(a.manager??'')?.name??'its agent'}`:a.placed==='auto'?'Placed by Dpro. Drag it onto another agent to change who it reports to.':undefined}
        onClick={()=>onSelect(a.id)} onDoubleClick={()=>onOpen(a.id)} onKeyDown={e=>key(e,n)} onContextMenu={e=>{e.preventDefault();onSelect(a.id);onMenu(e,a);}}
        onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',a.id);setDrag(a.id);onSelect(a.id);}} onDragEnd={()=>{setDrag(null);setOver(null);}}
        onDragOver={e=>{if(allowed(a)){e.preventDefault();e.dataTransfer.dropEffect='move';if(over!==a.id)setOver(a.id);}}} onDragLeave={()=>{if(over===a.id)setOver(null);}} onDrop={e=>dropOn(e,a)}>
        <Avatar name={a.name??'?'} size={n.sub?24:30}/>
        <span className="oc-text"><span className="oc-name"><bdi>{a.name??'Name unavailable'}</bdi>{a.placed==='main'&&<span className="ag-tag">Main</span>}</span><span className="oc-role">{n.sub?'Sub-agent':a.placed==='main'?'Talks to you first':[roleWord(a.role),a.department?departmentName(a.department):null].filter(Boolean).join(' · ')}</span></span>
        {n.sub&&<span className="oc-mark" aria-hidden="true"><UiIcon name="sub-agent" size={13}/></span>}
        {n.folded&&<span className="oc-stack" title={`${n.hidden.length} under ${a.name??'it'} — click the arrow to show`}>{n.hidden.slice(0,3).map(h=><Avatar key={h.id} name={h.name??'?'} size={14}/>)}</span>}
       </button>
       {n.kids>0&&<button type="button" className="oc-fold" aria-label={n.folded?`Show the agents under ${a.name??'it'}`:`Hide the agents under ${a.name??'it'}`} title={n.folded?'Show the agents under it (Space)':'Hide the agents under it (Space)'} onClick={()=>fold(a.id)}><UiIcon name="chevron" size={11}/></button>}
      </div>;})}
    </div>
   </div>
   {lonely&&<p className="oc-lonely">Your main agent works alone for now. Hire an agent and it shows up here, under the agent it reports to.</p>}
  </div>
  {owner&&!lonely&&<span className="oc-hint">Drag a card onto another agent to change who it reports to · ⌘Z undoes · dashed line = sub-agent</span>}
  <div className="oc-zoom" role="toolbar" aria-label="Zoom and lines">
   <IconButton icon="zoom-out" label="Zoom out" shortcut="⌘−" onClick={()=>setZ(zoom-.1)}/>
   <IconButton icon="zoom-in" label="Zoom in" shortcut="⌘+" onClick={()=>setZ(zoom+.1)}/>
   <IconButton icon="fit" label="Fit the whole team" shortcut="⌘0" onClick={fit}/>
   <span className="oc-zoom-sep" aria-hidden="true"/>
   {LINE_BUTTONS.map(b=><IconButton key={b.style} icon={b.icon} label={b.label} pressed={lines===b.style} onClick={()=>{setLines(b.style);memory.lines=b.style;}}/>)}
  </div>
 </div>;
}
