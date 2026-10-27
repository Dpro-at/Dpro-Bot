import {useEffect,useState} from 'react';
import {modelDisplayName} from './model-names';
import type {SessionClient} from './session';
import {PreferenceGroup,PreferenceRow} from './Preferences';
import {UiIcon} from './ui-icons';
import {primaryReplyModels,savePrimaryReply,type PrimaryAgent as Agent,type ReplyModel as Model} from './primary-reply';
/** Settings › Replies (ST5): who answers for the main agent (saves as you choose) and the models on this computer. */
export function PrimaryReplySettings({client,onAgents}:{client:SessionClient;onAgents?:()=>void}){
 const [agent,setAgent]=useState<Agent|null>(null),[models,setModels]=useState<Model[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let stopped=false;setNotice('');void Promise.all([client.request({method:'GET',path:'/api/agents'} as never),client.request({method:'GET',path:'/api/models'} as never)]).then(([a,m])=>{
  if(stopped)return;const body=a.body as {agents?:Agent[]},catalog=m.body as {models?:Model[]};if(a.status!==200||m.status!==200)throw Error();
  setAgent(body.agents?.find(x=>x.isPrimary)??null);setModels(primaryReplyModels(catalog.models??[]));setLoaded(true);
 }).catch(()=>{if(!stopped)setNotice('Could not load the main agent.');});return()=>{stopped=true;};},[client,refresh]);
 const choose=async(chosen:string)=>{if(!agent||busy||chosen===agent.model||!models.some(m=>m.id===chosen))return;setBusy(true);setNotice('');try{
  setAgent(await savePrimaryReply(client,agent,models,chosen));setNotice('Saved. Chats that chose their own source keep it.');
 }catch{setNotice('Could not save. Look again before choosing.');}finally{setBusy(false);}};
 const local=models.filter(m=>m.provider==='local'||m.provider==='ollama');
 const current=agent?.model??'';
 return <><PreferenceGroup title="Main agent" note="Tool access follows this agent’s permissions. No model is downloaded."><PreferenceRow title={`${agent?.name??'Main agent'} answers with`} description="Each agent can choose its own on its page; each chat can too." icon="cpu"><select aria-label="Main agent answers with" value={current} disabled={!agent||busy} onChange={e=>void choose(e.target.value)}>{!models.some(m=>m.id===current)&&<option value={current}>{modelDisplayName(current)||'No main agent'}</option>}{models.map(m=><option key={m.id} value={m.id}>{m.label??m.name??m.id}</option>)}</select>{onAgents&&<button type="button" className="tool" aria-label="Open Agents" title="Open Agents" onClick={onAgents}><UiIcon name="users" size={14}/></button>}</PreferenceRow>{notice&&<p role="status" className="preference-inline-notice">{notice}</p>}</PreferenceGroup>
  <PreferenceGroup title="Models on this computer">{!loaded&&!notice?<PreferenceRow title="Looking for models…"><span/></PreferenceRow>:local.map(m=><PreferenceRow key={m.id} title={m.label??m.name??m.id} icon="screen"><span className="preference-status">Ready</span></PreferenceRow>)}<PreferenceRow title={loaded&&!local.length?'No models found on this computer':'Ollama must be running to list its models.'} description={loaded&&!local.length?'Start Ollama, then look again.':undefined}><button type="button" className="tool" aria-label="Look again" title="Look again" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><UiIcon name="refresh" size={14}/></button></PreferenceRow></PreferenceGroup></>;
}
