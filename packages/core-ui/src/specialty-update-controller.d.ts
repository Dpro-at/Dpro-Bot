import type {SessionClient} from './session';
import type {UpgradePreview,UpgradeReview} from './specialty-update-contract.js';
export type UpdateReceipt={templateId:string;revision:number;name:string};
export type UpdateState={phase:'idle'|'loading'|'ready'|'reviewing'|'review'|'saving'|'receipt'|'error'|'unknown';preview:UpgradePreview|null;review:UpgradeReview|null;confirmed:boolean;error:string|null;receipt:UpdateReceipt|null};
export class SpecialtyUpdateController{
 constructor(client:SessionClient,onApplied?:(receipt:UpdateReceipt)=>void);
 state:UpdateState;readonly busy:boolean;
 subscribe(fn:(state:UpdateState)=>void):()=>void;
 load():Promise<void>;review(sourceKey:string):Promise<void>;confirm(value:boolean):void;back():void;apply():Promise<void>;destroy():void;
}
