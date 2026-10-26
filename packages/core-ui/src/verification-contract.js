export const VERIFICATION_PATH='/api/auth/verification';
const routes=new Set([VERIFICATION_PATH,...['enroll','confirm','disable','recovery-codes'].map(action=>VERIFICATION_PATH+'/'+action)]);
const recoveryList=codes=>Array.isArray(codes)&&codes.length===8&&codes.every(code=>typeof code==='string'&&/^[a-f0-9]{32}$/.test(code))&&new Set(codes).size===8;
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export const verificationRoute=path=>typeof path==='string'&&routes.has(path);
export function allowedVerification(method,path,body){
 if(!verificationRoute(path))return false;
 if(path===VERIFICATION_PATH)return method==='GET'&&body===undefined;
 if(method!=='POST'||!record(body))return false;
 const fields=path.endsWith('/enroll')?['password']:['password','code'];
 return Object.keys(body).length===fields.length&&fields.every(field=>Object.hasOwn(body,field))&&typeof body.password==='string'&&body.password.length>=1&&body.password.length<=1024
  &&(fields.length===1||(typeof body.code==='string'&&/^[0-9]{6}$/.test(body.code)));
}
/** Sensitive setup/recovery values cross this contract only after fresh-password server proof. */
export function verificationResponse(path,status,body){
 if(!verificationRoute(path)||!record(body))return null;
 if(status===401&&body.code==='unauthenticated')return {code:'unauthenticated'};
 if(status===403&&['inactive_user','forbidden'].includes(body.code))return {code:body.code};
 if(status!==200)return [400,401,403,409,503].includes(status)&&body.code==='verification_refused'?{code:'verification_refused'}:status===429&&body.code==='rate_limited'?{code:'rate_limited'}:null;
 if(path===VERIFICATION_PATH){
  if(typeof body.enabled!=='boolean')return null;
  // How many unused recovery codes are left, only while two-step sign-in is on.
  return body.enabled&&Number.isSafeInteger(body.recoveryLeft)&&body.recoveryLeft>=0&&body.recoveryLeft<=8?{enabled:true,recoveryLeft:body.recoveryLeft}:{enabled:body.enabled};
 }
 // New recovery codes: the old ones stop working, every sign-in stays.
 if(path.endsWith('/recovery-codes'))return recoveryList(body.recoveryCodes)&&!['token','user','deviceToken','requiresSignIn'].some(key=>Object.hasOwn(body,key))?{recoveryCodes:[...body.recoveryCodes]}:null;
 if(path.endsWith('/enroll'))return typeof body.secret==='string'&&/^[A-Z2-7]{32}$/.test(body.secret)&&Number.isSafeInteger(body.expiresAt)&&body.expiresAt>=0?{secret:body.secret,expiresAt:body.expiresAt}:null;
 if(body.requiresSignIn!==true||['token','user','deviceToken'].some(key=>Object.hasOwn(body,key)))return null;
 if(path.endsWith('/disable'))return {requiresSignIn:true};
 if(!recoveryList(body.recoveryCodes))return null;
 return {requiresSignIn:true,recoveryCodes:[...body.recoveryCodes]};
}
