import {useEffect,useMemo,useRef,useState} from 'react';
import {MarkdownDocument} from './DocumentEditor';
import {UiIcon} from './ui-icons';
import {IconButton} from './desktop-ui';
import {fileTitle,folderTitle} from './skill-display';
type File={path:string;content:string};
/** SK2: a skill's files opened like a document — files on the left, the page in the middle
 *  (read here, never edited), its outline on the right. Esc or ⌘[ goes back. */
export function SkillFilesView({title,sub,files,onBack,onGive,giveLabel='Give to an agent…'}:{title:string;sub:string;files:readonly File[];onBack:()=>void;onGive?:()=>void;giveLabel?:string}){
 const sorted=useMemo(()=>[...files].sort((a,b)=>a.path==='SKILL.md'?-1:b.path==='SKILL.md'?1:a.path.localeCompare(b.path)),[files]);
 const [path,setPath]=useState(sorted[0]?.path??''),[mode,setMode]=useState<'page'|'source'>('page'),[finding,setFinding]=useState(false),[query,setQuery]=useState('');
 const root=useRef<HTMLElement>(null),findInput=useRef<HTMLInputElement>(null),body=useRef<HTMLDivElement>(null);
 const file=sorted.find(f=>f.path===path)??sorted[0],text=(file?.content??'').replace(/^---\n[\s\S]*?\n---\n/,''),lines=text.split('\n');
 const outline=lines.flatMap((line,i)=>/^#{1,4} /.test(line)?[{name:line.replace(/^#+ /,''),depth:(/^#+/.exec(line)?.[0].length??1)-1,line:i}]:[]);
 const matches=query?text.toLowerCase().split(query.toLowerCase()).length-1:0,words=text.trim()?text.trim().split(/\s+/).length:0;
 useEffect(()=>{root.current?.focus();},[]);
 useEffect(()=>{body.current?.scrollTo?.({top:0});},[path]);
 const goTo=(o:{name:string;line:number})=>{const box=body.current;if(!box)return;if(mode==='source'){box.querySelector<HTMLElement>(`[data-line="${o.line}"]`)?.scrollIntoView({block:'start'});return;}[...box.querySelectorAll<HTMLElement>('h1,h2,h3,h4')].find(h=>h.textContent?.trim()===o.name.trim())?.scrollIntoView({block:'start'});};
 const mark=(line:string)=>{if(!query)return line||' ';const out:React.ReactNode[]=[],low=line.toLowerCase(),q=query.toLowerCase();let at=0,i=low.indexOf(q);while(i!==-1){out.push(line.slice(at,i),<mark key={i}>{line.slice(i,i+q.length)}</mark>);at=i+q.length;i=low.indexOf(q,at);}out.push(line.slice(at));return out;};
 let lastFolder='';
 return <section ref={root} tabIndex={-1} className="sk-files" aria-label={`${title} files`} onKeyDown={e=>{const mod=e.metaKey||e.ctrlKey;if(mod&&e.key.toLowerCase()==='f'){e.preventDefault();e.stopPropagation();setFinding(true);setMode('source');queueMicrotask(()=>findInput.current?.focus());return;}if(mod&&e.key==='['){e.preventDefault();e.stopPropagation();onBack();return;}if(mod&&e.key.toLowerCase()==='g'&&onGive){e.preventDefault();e.stopPropagation();onGive();return;}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(finding){setFinding(false);setQuery('');}else onBack();}}}>
  <header className="sk-files-bar"><IconButton icon="arrow-left" label="Back to skills" shortcut="⌘[" onClick={onBack}/><b>{title}</b><span className="sk-muted">read only</span><span className="sk-gap"/>
   <div className="sk-segmented" role="group" aria-label="View">{(['page','source'] as const).map(m=><button key={m} type="button" aria-pressed={mode===m} onClick={()=>setMode(m)}>{m==='page'?'Page':'Source'}</button>)}</div>
   <IconButton icon="search" label="Find" shortcut="⌘F" pressed={finding} onClick={()=>{setFinding(v=>!v);if(!finding){setMode('source');queueMicrotask(()=>findInput.current?.focus());}else setQuery('');}}/>
   {onGive&&<button type="button" className="primary sk-main" title={`${giveLabel.replace('…','')} (⌘G)`} onClick={onGive}>{giveLabel}</button>}
  </header>
  {finding&&<div className="sk-find"><UiIcon name="search" size={14}/><input ref={findInput} type="search" aria-label="Find in this file" placeholder="Find in this file" value={query} onChange={e=>setQuery(e.target.value)}/><span className="sk-muted" role="status">{query?`${matches} ${matches===1?'match':'matches'}`:''}</span></div>}
  <div className="sk-files-panes">
   <div className="sk-files-list" role="group" aria-label="Files">{sorted.map(f=>{const folder=folderTitle(f.path),head=folder&&folder!==lastFolder?folder:'';lastFolder=folder||lastFolder;return <div key={f.path} className="sk-files-item">{head&&<span className="sk-files-folder"><UiIcon name="folder" size={13}/>{head}</span>}<button type="button" data-depth={folder?1:0} aria-current={file?.path===f.path?'page':undefined} title={f.path} onClick={()=>setPath(f.path)}><UiIcon name={f.path==='SKILL.md'?'book':'file'} size={13}/><span>{fileTitle(f.path)}</span></button></div>;})}</div>
   <div ref={body} className="sk-files-page" tabIndex={0} aria-label={`${file?fileTitle(file.path):'File'}, read only`}>{!file?<p className="sk-muted">This skill has no files to show.</p>:mode==='page'?<article className="sk-page"><MarkdownDocument text={text}/></article>:<pre className="sk-source">{lines.map((line,i)=><span key={i} data-line={i}>{mark(line)}{'\n'}</span>)}</pre>}</div>
   <aside className="sk-files-outline" aria-label="Outline"><span className="sk-label">Outline</span>{outline.length?outline.map(o=><button key={o.line} type="button" data-depth={Math.min(o.depth,3)} onClick={()=>goTo(o)}>{o.name}</button>):<span className="sk-muted">No headings in this file.</span>}<hr/><span className="sk-muted">{sub}</span><span className="sk-muted">Only Markdown files are kept; scripts and links are not added.</span></aside>
  </div>
  <footer className="sk-files-status"><span>{file?fileTitle(file.path).toLowerCase():''}</span><span>{words.toLocaleString()} words</span><span className="sk-gap"/><span>Markdown · read only</span></footer>
 </section>;
}
