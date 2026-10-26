import {useEffect,useState,useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import {UiIcon} from './ui-icons';
import {ContextMenu,useMenu} from './desktop-ui';
import type {MenuItem} from './desktop-ui';
import {footerSections} from './footer-prefs';
import type {FooterController,FooterSection} from './footer-prefs';

/** `parent`: the section this one is a place of (Skills → Agents); it lights up while this one is hidden. */
export type FooterEntry={available:boolean;current:boolean;run:()=>void;badge?:string;parent?:FooterSection};

/**
 * SH1 + SH3: the footer switches sections. The person chooses which sections
 * it shows (right-click or ⋯), drags them into order and can undo; hidden
 * sections stay in ⌘K. The Settings gear and the section you are in always show.
 */
export function ShellFooter({controller,entries,status,extra,settingsCurrent,onSettings,onCustomize}:{controller:FooterController;entries:Record<FooterSection,FooterEntry>;status:ReactNode;extra?:ReactNode;settingsCurrent:boolean;onSettings:()=>void;onCustomize:()=>void}){
 const {prefs,undo,notice}=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const {menu,at,close}=useMenu(),[dragging,setDragging]=useState<FooterSection|null>(null);
 useEffect(()=>{void controller.load();const back=()=>void controller.load();window.addEventListener('focus',back);return()=>window.removeEventListener('focus',back);},[controller]);
 const shown=prefs.order.filter(id=>{const e=entries[id];return e.available&&(!prefs.hidden.includes(id)||(e.current&&!e.parent)||(id==='approvals'&&prefs.approvalsWhenWaiting&&!!e.badge));});
 // A hidden place lights up its section instead (Personalities → Agents).
 const lit=(id:FooterSection)=>entries[id].current||prefs.order.some(c=>entries[c].current&&entries[c].parent===id&&!shown.includes(c));
 // Each section keeps its ⌘ number from the footer order, shown or not (board SH3: hiding one never shifts the others).
 const numbered=prefs.order.filter(id=>entries[id].available),keyOf=(id:FooterSection)=>{const n=numbered.indexOf(id);return n>=0&&n<9?`⌘${n+1}`:undefined;};
 // ⌘1–⌘9 open the footer's sections in their order; ⌘Z undoes a footer change while its notice shows.
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!(e.metaKey||e.ctrlKey)||e.altKey||e.shiftKey)return;const n=Number(e.key);if(n>=1&&n<=9&&numbered[n-1]){e.preventDefault();entries[numbered[n-1]].run();}else if(e.key==='z'&&undo&&notice&&!(e.target as HTMLElement)?.closest?.('input,textarea,[contenteditable]')){e.preventDefault();controller.undo();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>controller.clearNotice(),8000);return()=>clearTimeout(t);},[notice,controller]);
 const items=():MenuItem[]=>[
  ...prefs.order.filter(id=>entries[id].available).map((id):MenuItem=>{return {label:footerSections[id].label+(entries[id].current?' — you are here':''),icon:footerSections[id].icon,checked:!prefs.hidden.includes(id),disabled:entries[id].current,shortcut:keyOf(id),run:()=>controller.toggle(id)};}),
  'sep',
  {label:'Icons only',checked:prefs.iconsOnly,run:()=>void controller.change({iconsOnly:!prefs.iconsOnly},prefs.iconsOnly?'Names shown':'Icons only')},
  'sep',
  {label:'Customize footer…',icon:'gear',run:onCustomize},
 ];
 return <footer className="statusbar shell-footer" data-icons-only={prefs.iconsOnly||undefined} onContextMenu={e=>at(e,items())}>
  <span className="statusbar-group">
   {status}
   {shown.map(id=>{const e=entries[id],s=footerSections[id];return <button key={id} type="button" className="status-item" draggable aria-current={lit(id)?'page':undefined} data-dragging={dragging===id||undefined}
    title={[prefs.iconsOnly?s.label:'',keyOf(id)?`(${keyOf(id)})`:''].filter(Boolean).join(' ')||undefined} aria-label={prefs.iconsOnly?s.label+(e.badge?`, ${e.badge} waiting`:''):undefined} onClick={e.run}
    onDragStart={ev=>{setDragging(id);ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',id);}} onDragEnd={()=>setDragging(null)}
    onDragOver={ev=>{if(dragging&&dragging!==id){ev.preventDefault();ev.dataTransfer.dropEffect='move';}}} onDrop={ev=>{ev.preventDefault();if(dragging)controller.move(dragging,id);setDragging(null);}}>
    <UiIcon name={s.icon} size={14}/>{!prefs.iconsOnly&&<span>{s.label}</span>}{e.badge&&<span className="footer-badge">{e.badge}</span>}</button>;})}
  </span>
  <span className="statusbar-group">
   {notice&&<span className="status-item footer-notice" role="status">{notice}{undo&&<button type="button" className="link-button" onClick={()=>controller.undo()}>Undo</button>}</span>}
   {extra}
   <button type="button" className="status-item footer-more" aria-label="Choose what the footer shows" title="Choose what the footer shows (right-click works too)" onClick={e=>at(e,items())}><UiIcon name="more" size={14}/></button>
   <button type="button" className="status-item" aria-current={settingsCurrent?'page':undefined} title="Settings (⌘,)" aria-label={prefs.iconsOnly?'Settings':undefined} onClick={onSettings}><UiIcon name="gear" size={14}/>{!prefs.iconsOnly&&<span>Settings</span>}</button>
  </span>
  <ContextMenu menu={menu} onClose={close}/>
 </footer>;
}
