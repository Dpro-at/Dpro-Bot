import {DEFAULT_OLLAMA_MODEL} from '../llm/ollama.js';
import {PERMISSION_CATEGORIES} from '../tools/agent-permissions.js';
import {localModelOrigin,localModelReply} from './personality-preview.js';
import {redactImportText} from '../memory/import/redact.js';
import {TemplateError} from './specialty-templates.js';
import type {TemplateConfig} from './specialty-templates.js';

export type DraftCatalogue={skills:{id:string;name:string}[];tools:{name:string;description:string;fingerprint:string|null;available:boolean}[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clean=(v:unknown,max:number)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f‪-‮⁦-⁩]/g,'').trim().slice(0,max):'';
const names=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,60).map(x=>x.trim().toLowerCase()):[];
const MAX_SKILLS=200,MAX_TOOLS=150;

/** The first JSON object in a model answer (models often wrap it in prose or a code fence). */
export function firstJsonObject(answer:string):Record<string,unknown>|null{
 const start=answer.indexOf('{');if(start<0)return null;
 let depth=0,inString=false,escaped=false;
 for(let i=start;i<answer.length;i++){const c=answer[i];
  if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}
  if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{const v=JSON.parse(answer.slice(start,i+1));return object(v)?v:null;}catch{return null;}}
 }
 return null;
}

/**
 * Board SP3b "Describe it": the local model drafts a new specialty from a few
 * lines. Local model only (the same loopback path as the personality preview):
 * no paid model, no tools, no memory. Skills and tools come only from the
 * catalogue; unknown names are dropped. Nothing is saved; the owner checks the
 * draft and keeps it with the normal save.
 */
export async function draftSpecialty(input:unknown,catalogue:DraftCatalogue,fetchImpl:typeof fetch=fetch){
 if(!object(input)||Object.keys(input).some(k=>!['description','departments'].includes(k)))throw new TemplateError('invalid_input');
 const description=input.description,departments=input.departments??[];
 if(typeof description!=='string'||!description.trim()||description.length>2000)throw new TemplateError('invalid_input');
 if(!Array.isArray(departments)||departments.length>30||!departments.every(d=>typeof d==='string'&&!!d.trim()&&d.length<=64))throw new TemplateError('invalid_input');
 const origin=localModelOrigin();
 if(!origin)throw new TemplateError('local_model_required',409);
 const skills=catalogue.skills.slice(0,MAX_SKILLS),tools=catalogue.tools.filter(t=>t.available).slice(0,MAX_TOOLS);
 const system=['You draft a job description ("specialty") for an AI agent in a desktop program.',
  'Answer with one JSON object only, no other text, with these keys:',
  '"name" (a short job title, at most 6 words), "department" (one of the listed departments, or a short new one), "responsibilities" (two or three plain sentences),',
  '"instructions" (Markdown with the headings "# How you work", "## Before you start", "## Done means", "## Never"), "skills" (names from the skill list that fit, may be empty), "tools" (names from the tool list that fit, may be empty).',
  'Write in the language of the description. Never invent skills or tools that are not listed. Never ask for more permissions than the job needs.',
  `Departments: ${departments.length?departments.join('; '):'(none listed)'}`,
  `Skills: ${skills.map(s=>s.name).join('; ')||'(none)'}`,
  `Tools: ${tools.map(t=>`${t.name} (${t.description.slice(0,80)})`).join('; ')||'(none)'}`].join('\n');
 let answer:string;
 try{answer=await localModelReply(origin,{system,prompt:description,temperature:0.3,maxTokens:1500,timeoutMs:60000},fetchImpl);}catch{throw new TemplateError('draft_unavailable',503);}
 const raw=firstJsonObject(answer);if(!raw)throw new TemplateError('draft_unavailable',503);
 const wantedSkills=new Set(names(raw.skills)),wantedTools=new Set(names(raw.tools));
 const pickedSkills=skills.filter(s=>wantedSkills.has(s.name.trim().toLowerCase())).slice(0,49).map(s=>s.id);
 const pickedTools=tools.filter(t=>wantedTools.has(t.name.toLowerCase())).slice(0,30).map(t=>({name:t.name,fingerprint:t.fingerprint}));
 const department=clean(raw.department,64),known=departments.find(d=>d.toLowerCase()===department.toLowerCase());
 const instructions=redactImportText(clean(raw.instructions,30000)).text.trim();
 const config:TemplateConfig={primarySkill:null,skills:[...new Set(pickedSkills)],tools:pickedTools,memoryRead:['project','experience','task'],memoryWrite:['project','experience','task'],sharedMemory:false,modes:Object.fromEntries(PERMISSION_CATEGORIES.map(c=>[c,'ask']))};
 return {draft:{name:clean(raw.name,80)||'New specialty',department:known??(department||departments[0]||'Organisation and services'),description:redactImportText(clean(raw.responsibilities,1800)).text.trim(),instructions:instructions||'# How you work\n\n'+description.trim(),config},model:DEFAULT_OLLAMA_MODEL,generated:true};
}
