import {upgradeResponse} from './specialty-update-contract.js';
const base='/api/workspace-pack/specialty-upgrade-';
export class SpecialtyUpdateController{
 constructor(client,onApplied=()=>{}){this.client=client;this.context=client.getSnapshot();this.onApplied=onApplied;this.state={phase:'idle',preview:null,review:null,confirmed:false,error:null,receipt:null};this.listeners=new Set();this.sequence=0;this.disposed=false;}
 subscribe(fn){if(this.disposed){this.disposed=false;this.state={...this.state,phase:'idle',review:null,confirmed:false};}this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 emit(patch){if(this.disposed)return;this.state={...this.state,...patch};for(const fn of this.listeners)fn(this.state);}
 get busy(){return ['loading','reviewing','saving'].includes(this.state.phase);}
 validContext(){const now=this.client.getSnapshot();return now.phase==='authenticated'&&now.user?.role==='owner'&&now.epoch===this.context.epoch&&now.user.id===this.context.user?.id&&now.mode===this.context.mode;}
 async request(action,body){if(!this.validContext())throw Object.assign(Error('forbidden'),{status:403});this.abort=new AbortController();const response=await this.client.request({method:action==='preview'?'GET':'POST',path:base+action,...(body?{body}:{})},this.abort.signal);if(!this.validContext())throw action==='apply'?Error('review_changed'):Object.assign(Error('forbidden'),{status:403});const result=upgradeResponse(base+action,response.status,response.body);if(response.status!==200)throw Object.assign(new Error(result.code),{status:response.status});return result;}
 async load(){if(this.busy||this.disposed)return;const n=++this.sequence;this.emit({phase:'loading',review:null,confirmed:false,error:null,receipt:null});try{const preview=await this.request('preview');if(n===this.sequence)this.emit({phase:'ready',preview});}catch(e){if(n===this.sequence)this.emit({phase:'error',error:e.message});}}
 async review(sourceKey){if(this.busy||this.disposed)return;const role=this.state.preview?.roles.find(r=>r.sourceKey===sourceKey);if(role?.status!=='content_update_available')return;const n=++this.sequence;this.emit({phase:'reviewing',review:null,confirmed:false,error:null,receipt:null});try{const review=await this.request('review',{sourceKey});if(review.sourceKey!==sourceKey||review.templateId!==role.installedIds[0]||review.revision!==role.revision)throw Error('upgrade_preview_unavailable');if(n===this.sequence)this.emit({phase:'review',review});}catch(e){if(n===this.sequence)this.emit({phase:'error',error:e.message});}}
 confirm(value){if(this.state.phase==='review')this.emit({confirmed:value===true});}
 back(){if(!this.busy)this.emit({phase:'ready',review:null,confirmed:false,error:null});}
 async apply(){
  if(this.disposed||this.state.phase!=='review'||!this.state.confirmed||!this.state.review)return;
  const review=this.state.review,n=++this.sequence;this.emit({phase:'saving',confirmed:false,error:null});
  let receipt;
  try{receipt=await this.request('apply',{sourceKey:review.sourceKey,reviewToken:review.reviewToken,confirmed:true});if(receipt.templateId!==review.templateId||receipt.revision!==review.revision+1||receipt.name!==review.name)throw Error('upgrade_preview_unavailable');}
  catch(e){if(n===this.sequence)this.emit({phase:e.status&&e.status<500?'error':'unknown',review:null,confirmed:false,error:e.message});return;}
  if(n!==this.sequence||this.disposed)return;const preview=this.state.preview?{...this.state.preview,roles:this.state.preview.roles.map(r=>r.sourceKey===review.sourceKey?{...r,status:'current',revision:receipt.revision}:r)}:null;this.emit({phase:'receipt',review:null,receipt,preview});this.onApplied(receipt);
 }
 destroy(){this.abort?.abort();this.disposed=true;this.sequence++;this.listeners.clear();}
}
