import {useEffect,useState} from 'react';
import type {SessionClient} from './session';
import {PreferenceGroup,PreferenceRow} from './Preferences';
import {primaryReplyModels,savePrimaryReply,type PrimaryAgent as Agent,type ReplyModel as Model} from './primary-reply';
export function PrimaryReplySettings({client}:{client:SessionClient}){
 const [agent,setAgent]=useState<Agent|null>(null),[models,setModels]=useState<Model[]>([]),[chosen,setChosen]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let stopped=false;void Promise.all([client.request({method:'GET',path:'/api/agents'} as never),client.request({method:'GET',path:'/api/models'} as never)]).then(([a,m])=>{
  if(stopped)return;const body=a.body as {agents?:Agent[]},catalog=m.body as {models?:Model[]};if(a.status!==200||m.status!==200)throw Error();
  const primary=body.agents?.find(x=>x.isPrimary);setAgent(primary??null);setChosen(primary?.model??'');setModels(primaryReplyModels(catalog.models??[]));
 }).catch(()=>{if(!stopped)setNotice('Could not load the primary agent.');});return()=>{stopped=true;};},[client,refresh]);
 const save=async()=>{if(!agent||!models.some(m=>m.id===chosen))return;setBusy(true);setNotice('');try{
  setAgent(await savePrimaryReply(client,agent,models,chosen));setNotice('Primary reply source saved. Existing conversation overrides stay.');
 }catch{setNotice('Could not save. Reload settings before trying again.');}finally{setBusy(false);}};
 return <PreferenceGroup title="Primary agent" note="Official coding apps use their own terminal account sign-in. Ollama lists installed chat models. Ollama must be running to list its installed chat models. No model is downloaded. Tool access follows this agent’s existing permissions."><PreferenceRow title={agent?.name??'Primary agent'} description="Choose the model that powers your primary agent." icon="cpu"><select aria-label="Primary agent reply source" value={chosen} disabled={!agent||busy} onChange={e=>setChosen(e.target.value)}>{!models.some(m=>m.id===chosen)&&<option value={chosen}>{chosen||'No primary agent'}</option>}{models.map(m=><option key={m.id} value={m.id}>{m.label??m.name??m.id}</option>)}</select><button aria-label="Refresh primary reply sources" disabled={busy} onClick={()=>setRefresh(n=>n+1)}>Refresh</button><button disabled={!agent||busy||chosen===agent.model||!models.some(m=>m.id===chosen)} onClick={()=>void save()}>Save</button></PreferenceRow>{notice&&<p role="status">{notice}</p>}</PreferenceGroup>;
}
