// How a skill looks on screen (boards SK1–SK3): a readable title instead of the package
// name, where it came from as a group with an icon, and its own icon and colour.
import type {UiIconName} from './ui-icons';

/** "content-studio" → "Content studio"; names that already read like words stay as they are. */
export function skillTitle(name:string){
 const clean=name.trim();if(!clean)return 'Untitled skill';
 if(/[A-Z ]/.test(clean)&&!/[-_]/.test(clean))return clean;
 const words=clean.replace(/\.md$/i,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
 return words.charAt(0).toUpperCase()+words.slice(1);
}

export type SkillSource={key:string;group:string;line:string;icon:UiIconName;app?:string};
const SOURCES:Record<string,SkillSource>={
 workspace:{key:'workspace',group:'Made in this workspace',line:'Made in this workspace',icon:'pencil'},
 bundled:{key:'bundled',group:'Comes with Dpro',line:'Comes with Dpro',icon:'box'},
 genvr:{key:'genvr',group:'From GenVR',line:'From GenVR',icon:'dice'},
 catalogue:{key:'catalogue',group:'From Dpro’s catalogue',line:'From Dpro’s catalogue',icon:'download'},
 claude:{key:'claude',group:'From Claude Code',line:'From Claude Code',icon:'code',app:'Claude Code'},
 codex:{key:'codex',group:'From Codex',line:'From Codex',icon:'code',app:'Codex'},
 shared:{key:'shared',group:'From shared agent skills',line:'From shared agent skills',icon:'code',app:'Shared agent skills'},
 project:{key:'project',group:'From a project folder',line:'From a project folder',icon:'folder',app:'A project folder'},
 other:{key:'other',group:'Other places',line:'From another place',icon:'folder'},
};
/** The place a skill came from, in plain words (raw origin codes never reach the screen). */
export function skillSource(origin:string):SkillSource{
 const o=origin.toLowerCase();
 if(['workspace','managed','existing','local'].includes(o))return SOURCES.workspace;
 if(o==='bundled')return SOURCES.bundled;
 if(o.startsWith('genvr'))return SOURCES.genvr;
 if(o==='reviewed-marketplace')return SOURCES.catalogue;
 if(o==='codex')return SOURCES.codex;
 if(o==='shared')return SOURCES.shared;
 if(o==='project')return SOURCES.project;
 if(o.startsWith('claude'))return SOURCES.claude;
 return SOURCES.other;
}
/** The order source groups appear in the list. */
export const SOURCE_ORDER=['workspace','bundled','genvr','catalogue','claude','codex','shared','project','other'];

const LOOKS:[RegExp,UiIconName][]=[[/content|write|writer|post|copy|blog|newsletter|brand|story/,'pencil'],[/analytic|data|chart|metric|report|sql|dashboard/,'chart'],[/course|teach|learn|lesson|tutor|study/,'cap'],[/audio|podcast|voice|speech|music|sound/,'mic'],[/calc|math|unit|number/,'calc'],[/computer|discover|desktop|system/,'laptop'],[/world|genvr|game|scene|3d/,'dice'],[/code|review|debug|test|program|dev/,'code'],[/design|logo|colour|color|image|graphic|thumbnail|visual/,'palette'],[/pdf|doc|word|sheet|xlsx|pptx|slide|file/,'file'],[/trade|money|finance|invoice|tax/,'coin'],[/mail|email|message|chat/,'message'],[/search|research|seo|keyword/,'search'],[/security|safe|guard|permission/,'shield'],[/plan|task|project|board/,'board']];
const COLOURS=['#C4A5FF','#6FD3C7','#F0B86E','#F29BC0','#8FD6B0','#9DBBFF','#E8A27C','#B9C46B'];
/** A skill's own icon and colour, chosen from its name so it stays the same everywhere. */
export function skillLook(name:string):{icon:UiIconName;colour:string}{
 const n=name.toLowerCase(),icon=LOOKS.find(([pattern])=>pattern.test(n))?.[1]??'book';
 let hash=0;for(const ch of n)hash=(hash*31+ch.charCodeAt(0))>>>0;
 return {icon,colour:COLOURS[hash%COLOURS.length]};
}

/** A package file in plain words: SKILL.md is the main guide, "references/claims-and-voice.md" → "Claims and voice". */
export function fileTitle(path:string){
 if(path==='SKILL.md')return 'Main guide';
 const base=path.split('/').pop()??path;return skillTitle(base.replace(/\.md$/i,''));
}
export function folderTitle(path:string){const parts=path.split('/');return parts.length>1?skillTitle(parts.slice(0,-1).join(' › ')):'';}
