// An open specialty's unsaved draft (board SP2, "In this draft"): what changed against the
// version agents use now. The draft is not kept in browser storage (it may hold pasted secrets);
// it survives switching sections because the Specialties page stays mounted.

export type DraftShape={id:string;name:string;department:string;description:string;instructions:string;revision:number;config:Record<string,unknown>&{primarySkill:string|null;skills:string[]}};
export type DraftPart='overview'|'instructions'|'skills'|'tools'|'memory'|'permissions';
export type DraftChange={field:string;part:DraftPart};

const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

/** The fields and parts of the draft that differ from the saved version; a new specialty lists every part it has. */
export function draftChanges(draft:DraftShape,saved:DraftShape|null):DraftChange[]{
 const before=saved,out:DraftChange[]=[];
 for(const field of ['name','department','description'] as const)if(!before||draft[field]!==before[field])out.push({field,part:'overview'});
 if(!before||draft.instructions!==before.instructions)out.push({field:'instructions',part:'instructions'});
 const c=draft.config,b=before?.config;
 const pick=(cfg:typeof c|undefined,keys:string[])=>cfg?keys.map(k=>cfg[k]):null;
 if(!b||!same([c.primarySkill,c.skills],[b.primarySkill,b.skills]))out.push({field:'skills',part:'skills'});
 if(!b||!same(pick(c,['tools','requirements']),pick(b,['tools','requirements'])))out.push({field:'tools',part:'tools'});
 if(!b||!same(pick(c,['memoryRead','memoryWrite','sharedMemory']),pick(b,['memoryRead','memoryWrite','sharedMemory'])))out.push({field:'memory',part:'memory'});
 if(!b||!same(c.modes,b.modes))out.push({field:'permissions',part:'permissions'});
 return out;
}
