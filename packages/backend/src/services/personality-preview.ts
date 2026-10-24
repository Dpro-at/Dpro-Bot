import {runOllamaAgentLoop} from './ollama-agent-loop.js';
import {DEFAULT_OLLAMA_MODEL} from '../llm/ollama.js';
import {defaultOllamaUrl} from '../config/ollama-url.js';
import {traitsToBehavior} from './personality.js';
import {validateProfile,profileInstructions,LibraryError} from './personality-library-profile.js';
/** One local, tool-free reply. No chat history, memory, grants or cloud fallback. */
export async function personalityPreview(raw:unknown,prompt:unknown,fetchImpl:typeof fetch=fetch){
 const p=validateProfile(raw);
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)throw new LibraryError('invalid_input');
 const url=new URL(defaultOllamaUrl());
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new LibraryError('local_model_required',409);
 const behavior=traitsToBehavior(p.traits,p.dialect);
 try{
  const result=await runOllamaAgentLoop({url:url.origin,model:DEFAULT_OLLAMA_MODEL,messages:[{role:'system',content:behavior.promptBlock+'\n'+profileInstructions(p)+'\nThis is a reply preview. You have no tools or memory. Do not claim to have performed any action.'},{role:'user',content:prompt}],tools:[],execute:async()=>{throw new Error('No tools in preview');},write:()=>{},signal:AbortSignal.timeout(20000),temperature:behavior.temperature,maxTokens:Math.min(behavior.maxTokens,1024),think:false,maxSteps:1,fetchImpl:(input,init)=>fetchImpl(input,{...init,redirect:'error'})});
  if(result.aborted||!result.answer.trim())throw new LibraryError('preview_unavailable',503);
  return {reply:result.answer.slice(0,8000),model:DEFAULT_OLLAMA_MODEL,generated:true};
 }catch(e){if(e instanceof LibraryError)throw e;throw new LibraryError('preview_unavailable',503);}
}
