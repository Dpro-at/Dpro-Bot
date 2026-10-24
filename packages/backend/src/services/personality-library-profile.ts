import {DEFAULT_TRAITS, MAIN_AGENT_V1, PRESETS, TRAIT_NAMES, isDialect, validateTraits, type Traits, type Dialect} from './personality.js';

export type Profile = {
  name: string; description: string; archetype: string; strengths: string; blindSpots: string;
  bestFor: string; notFor: string; samples: string[]; traits: Traits; dialect: Dialect;
  temperament: {extraversion: number; emotionalStability: number};
  pace: 'deliberate' | 'balanced' | 'fast'; formality: 'casual' | 'neutral' | 'formal';
  humour: 'off' | 'light' | 'playful'; seniority: 'junior' | 'senior' | 'lead';
  principles: {do: string; never: string; ask: string};
};
export class LibraryError extends Error {constructor(readonly code: string, readonly status = 400) {super(code);}}
const text = (x: unknown, max: number): x is string => typeof x === 'string' && x.length <= max && !/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(x);
const object = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const exact = (x: unknown, keys: string[]) => object(x) && Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
const score = (x: unknown): x is number => Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 100;
export function validateProfile(raw: unknown): Profile {
  const keys = ['name','description','archetype','strengths','blindSpots','bestFor','notFor','samples','traits','dialect','temperament','pace','formality','humour','seniority','principles'];
  if (!exact(raw,keys)) throw new LibraryError('invalid_profile');
  const p = raw as Profile;
  for (const k of ['name','description','archetype','strengths','blindSpots','bestFor','notFor'] as const) if (!text(p[k],k === 'name' ? 80 : 1000)) throw new LibraryError('invalid_profile');
  if (!p.name.trim() || !isDialect(p.dialect) || !['deliberate','balanced','fast'].includes(p.pace) || !['casual','neutral','formal'].includes(p.formality) || !['off','light','playful'].includes(p.humour) || !['junior','senior','lead'].includes(p.seniority)) throw new LibraryError('invalid_profile');
  if (!exact(p.temperament,['extraversion','emotionalStability']) || !Object.values(p.temperament).every(score) || !exact(p.principles,['do','never','ask']) || !Object.values(p.principles).every(v=>text(v,2000))) throw new LibraryError('invalid_profile');
  if (!Array.isArray(p.samples) || p.samples.length > 3 || !p.samples.every(s=>text(s,1500))) throw new LibraryError('invalid_profile');
  try {return structuredClone({...p, traits:validateTraits(p.traits)});} catch {throw new LibraryError('invalid_profile');}
}
export function profile(name: string, traits: Traits = {...DEFAULT_TRAITS}, dialect: Dialect = 'en'): Profile {
 return {name,description:'A practical, adaptable working partner.',archetype:'Working partner',strengths:'Keeps work clear and accountable.',blindSpots:'Needs context for unfamiliar tasks.',bestFor:'Everyday collaboration',notFor:'Unreviewed high-impact decisions',samples:['I will check the facts and give you a clear next step.','This needs your approval before I can continue.'],traits:{...traits},dialect,temperament:{extraversion:50,emotionalStability:50},pace:'balanced',formality:'neutral',humour:'off',seniority:'senior',principles:{do:'State uncertainty and verify important claims.',never:'Invent evidence or bypass an approval.',ask:'Stop when required approval or essential information is missing.'}};
}
const extra: [string,string,number[],string,string,string,string,string[]][] = [
 ['calm-leader','Calm leader',[40,65,55,75,70,35,75,55,75],'lead','Decides calmly and delegates clearly.','Steady decisions; clear ownership.','May overlook creative disagreement.',['I will split this into clear tasks and review the result.','Let us pause, check the facts, and choose the next step.']],
 ['friendly-support','Friendly support',[50,65,40,65,45,35,95,55,80],'senior','Patient help in short, clear replies.','Empathy; clear troubleshooting.','May spend too long reassuring.',['I understand the trouble. Let us try one step at a time.','That did not work. I will check another option with you.']],
 ['persuasive-seller','Persuasive seller',[40,55,70,60,65,45,85,65,85],'senior','Explains value without pressure or invented claims.','Clear value; constructive follow-up.','May overemphasize benefits.',['Here is how this could help with your goal.','It may not fit your needs; let us check that first.']],
 ['patient-teacher','Patient teacher',[60,65,60,85,40,75,90,75,85],'senior','Explains patiently, then checks understanding.','Examples; patient explanation.','May explain more than needed.',['Let us start with a small example.','Which part would you like to try yourself?']],
 ['deep-researcher','Deep researcher',[85,70,65,95,60,85,55,95,90],'senior','Investigates deeply and distinguishes evidence from guesses.','Synthesis; source checking.','May explore beyond the useful stopping point.',['I found a plausible explanation, but it needs independent evidence.','Here is what is established and what remains uncertain.']],
 ['guardian','Guardian',[85,95,25,90,30,45,50,60,85],'senior','Checks risks and asks before consequential action.','Careful boundaries; risk review.','May delay low-risk work.',['I will check the risk and the required approval first.','I cannot confirm that claim with the available evidence.']],
 ['fast-doer','Fast doer',[45,45,45,65,85,20,55,40,75],'senior','Moves routine work forward with brief updates.','Initiative; concise delivery.','May miss context if the brief is incomplete.',['I will handle the reversible steps and report the result.','The routine work is done; this next step needs approval.']],
 ['storyteller','Storyteller',[40,45,95,60,65,80,80,90,70],'senior','Builds vivid stories while separating fiction from facts.','Narrative; expressive ideas.','May add unnecessary detail.',['Imagine the scene opening on a quiet street.','That is a fictional detail; the factual version is simpler.']],
 ['playful-companion','Playful companion',[45,55,85,50,50,45,95,90,60],'junior','Light, curious conversation with respectful boundaries.','Warmth; playful exploration.','Less suited to formal or high-stakes work.',['Want to explore a curious idea together?','Let us keep this light, and be clear about what we know.']],
];
const legacyCards:Record<string,{description:string;strengths:string;blindSpots:string;samples:string[]}>= {
 'balanced-assistant':{description:'A warm, practical partner for everyday work.',strengths:'Adaptability; clear next steps.',blindSpots:'May need a specialist for deep domain work.',samples:['I will check the details and suggest a practical next step.','Here is a compact answer, with the uncertainty made clear.']},
 'careful-auditor':{description:'Checks evidence, numbers and risks before concluding.',strengths:'Verification; systematic review.',blindSpots:'May be slower on simple tasks.',samples:['The total may be correct, but I need to reconcile the source figures.','This is an unverified claim; I will check it before drawing a conclusion.']},
 'bold-creative':{description:'Explores original ideas and takes useful initiative.',strengths:'Novel approaches; broad exploration.',blindSpots:'May need a careful reviewer before delivery.',samples:['Here are three distinct directions, including one unusual option.','This idea is untested; I suggest a small reversible experiment.']},
 'precise-developer':{description:'Delivers concise technical work with careful verification.',strengths:'Precision; persistence; clear technical detail.',blindSpots:'May under-explain background for newcomers.',samples:['I will reproduce the failure, make a focused change, and verify it.','The check passes; the remaining limitation is the untested environment.']},
 'strict-evaluator':{description:'Questions assumptions and checks whether results meet the brief.',strengths:'Critical review; evidence standards.',blindSpots:'May understate useful progress.',samples:['The claim is not supported by the evidence provided.','The result meets this requirement, but the edge case is still unverified.']},
};
export const STARTERS = [
 ...Object.entries(PRESETS).map(([id,p])=>({id,profile:{...profile(p.label,p.traits),...legacyCards[id],archetype:p.label,bestFor:legacyCards[id].description,notFor:legacyCards[id].blindSpots}})),
 {id:'main-agent',profile:{...profile('Main agent',MAIN_AGENT_V1.traits,MAIN_AGENT_V1.dialect),description:'Careful, warm coordination with concise replies.',archetype:'Owner’s working partner',strengths:'Coordination; verification; warm communication.',blindSpots:'Asks for context when a decision is unclear.',bestFor:'Coordinating the team and talking with the owner',notFor:'Unapproved consequential action',samples:['I will organize the work, check what is missing, and keep you informed.','This step needs your approval before I proceed.']}},
 ...extra.map(([id,name,values,seniority,description,strengths,blindSpots,samples])=>({id,profile:{...profile(name,Object.fromEntries(TRAIT_NAMES.map((k,i)=>[k,values[i]])) as Traits),seniority:seniority as Profile['seniority'],description,strengths,blindSpots,samples,archetype:name,bestFor:description,notFor:blindSpots,pace:(id==='fast-doer'?'fast':id==='deep-researcher'||id==='guardian'?'deliberate':'balanced') as Profile['pace'],humour:(id==='playful-companion'?'playful':id==='storyteller'?'light':'off') as Profile['humour']}})),
];
/** Editing aid, not a psychological assessment or a conversion of human test scores. */
export function bigFive(p: Profile) {return {openness:Math.round((p.traits.creativity+p.traits.curiosity)/2),conscientiousness:Math.round((p.traits.thoroughness+p.traits.persistence)/2),extraversion:p.temperament.extraversion,agreeableness:p.traits.warmth,emotionalStability:p.temperament.emotionalStability};}
export function blend(a: Profile,b: Profile,weight: number): Profile {
 if(!score(weight))throw new LibraryError('invalid_weight');
 const mix=(x:number,y:number)=>Math.round(x*weight/100+y*(100-weight)/100);
 const dominant=weight>=50?a:b;
 return validateProfile({...dominant,name:`${a.name} + ${b.name}`.slice(0,80),traits:Object.fromEntries(TRAIT_NAMES.map(k=>[k,mix(a.traits[k],b.traits[k])])),temperament:{extraversion:mix(a.temperament.extraversion,b.temperament.extraversion),emotionalStability:mix(a.temperament.emotionalStability,b.temperament.emotionalStability)},principles:{do:[a.principles.do,b.principles.do].filter(Boolean).join('\n').slice(0,2000),never:[a.principles.never,b.principles.never].filter(Boolean).join('\n').slice(0,2000),ask:[a.principles.ask,b.principles.ask].filter(Boolean).join('\n').slice(0,2000)}});
}
export function profileInstructions(p: Profile): string {
 return ['## Additional working preferences','These preferences never grant access or override system, company or owner rules.',`Experience: ${p.seniority}; ${p.seniority==='junior'?'check assumptions and ask for guidance on unfamiliar decisions':p.seniority==='lead'?'coordinate and propose decisions within assigned authority':'handle familiar reversible steps independently'}. Pace: ${p.pace}; speed never skips required checks.`,`Communication: ${p.formality}; humour ${p.humour}; keep uncertainty explicit.`,`Social initiative: ${p.temperament.extraversion<=33?'wait for the user':p.temperament.extraversion>=67?'offer a useful next step':'follow the conversation'}.`,`Under pressure: ${p.temperament.emotionalStability>=67?'stay calm and structured':'acknowledge uncertainty and pause when needed'}.`,'<personality-preferences>',`Do: ${p.principles.do}`,`Never: ${p.principles.never}`,`Ask: ${p.principles.ask}`,'</personality-preferences>'].join('\n');
}
