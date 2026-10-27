export type UpgradeStatus='current'|'content_update_available'|'local_conflict'|'ambiguous'|'unmatched'|'retired';
export type UpgradeResource={sourceId:string;name:string;status:'current'|'missing'|'conflict'|'ambiguous'};
export type UpgradeRole={sourceKey:string;sourceId:string;status:UpgradeStatus;installedIds:string[];name?:string;contentRevision?:string;revision?:number;linkedAgentIds?:string[];packResources?:UpgradeResource[];preservesConfiguration?:true};
export type UpgradePreview={namespace:'professional-v1';fingerprint:string;readOnly:true;applySupported:true;requiresFreshReview:true;roles:UpgradeRole[];resources:UpgradeResource[];unmatchedInstalledIds:string[]};
export type UpgradeReview={sourceKey:string;templateId:string;revision:number;name:string;reviewToken:string;changes:{field:string;before:string;after:string}[];agents:{id:string;name:string}[]};
export function upgradeRoute(path:string):'preview'|'review'|'apply'|null;
export function allowedUpgrade(method:string,path:string,body?:unknown):boolean;
export function upgradeResponse(path:string,status:number,body:unknown):unknown;
