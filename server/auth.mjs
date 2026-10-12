// Runtime-only accounts, invitations, password hashes and sessions. No database.
const accounts=new Map(),sessions=new Map(),attempts=new Map(),invites=new Map(),pendingEmails=new Set(),pendingInvites=new Set();
let bootstrapPending=false;
const hasCoordinator=()=>[...accounts.values()].some(a=>a.role==='coordinator');
const encoder=new TextEncoder(),SESSION_MS=8*60*60*1000;
export const roles=['learner','educator','coordinator'];
export const publicUser=a=>({id:a.id,name:a.name,email:a.email,role:a.role,createdAt:a.createdAt});
export const listUsers=()=>[...accounts.values()].map(publicUser);
export function fail(message,code=400){throw Object.assign(new Error(message),{code});}
export function permit(account,...allowed){if(!allowed.includes(account.role))fail('You do not have permission to access this area.',403);}
const token=r=>r.headers.get('cookie')?.match(/(?:^|;\s*)brightpath_auth=([a-z0-9-]{36})/)?.[1];
const cookie=(value,url,maxAge=SESSION_MS/1000)=>`brightpath_auth=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${url.protocol==='https:'?'; Secure':''}`;
function sweep(){const now=Date.now();for(const [id,s] of sessions)if(s.expires<=now)sessions.delete(id);for(const [id,a] of attempts)if(a.until<=now)attempts.delete(id);}
function limit(email){sweep();if(attempts.size>=1000&&!attempts.has(email))fail('Too many requests. Try again later.',429);const a=attempts.get(email)||{count:0,until:Date.now()+15*60*1000};if(a.count>=10)fail('Too many attempts. Try again in 15 minutes.',429);a.count++;attempts.set(email,a);}
const cleanEmail=v=>typeof v==='string'?v.trim().toLowerCase():'';
function checkEmail(email){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)fail('Enter a valid email address.');}
async function derive(password,salt){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256));}
function equal(a,b){let diff=a.length^b.length;for(let i=0;i<a.length;i++)diff|=a[i]^(b[i]||0);return diff===0;}
export function getAccount(request){sweep();const s=sessions.get(token(request));return s?accounts.get(s.email):undefined;}
function start(request,url,headers,a){sweep();if(sessions.size>=2000)fail('Session limit reached.',503);sessions.delete(token(request));const id=crypto.randomUUID();sessions.set(id,{email:a.email,expires:Date.now()+SESSION_MS});headers['set-cookie']=cookie(id,url);return {user:publicUser(a)};}
export async function authAction(request,url,body,headers){
 const action=url.pathname.replace(/\/$/,'').split('/').pop(),method=request.method;
 if(action==='status'&&method==='GET'){const a=getAccount(request);return {payload:{user:a?publicUser(a):null,needsCoordinator:!hasCoordinator(),apiVersion:4},status:200};}
 if(action==='setup'&&method==='GET')return {payload:{needsCoordinator:!hasCoordinator(),apiVersion:4},status:200};
 if(action==='me'&&method==='GET'){const a=getAccount(request);if(!a)fail('Please sign in. Accounts reset when the server restarts.',401);return {payload:{user:publicUser(a)},status:200};}
 if(action==='logout'&&method==='POST'){sessions.delete(token(request));headers['set-cookie']=cookie('',url,0);return {payload:{ok:true},status:200};}
 if(action==='invites'){
  const a=getAccount(request);if(!a)fail('Please sign in.',401);permit(a,'coordinator');
  if(method==='GET')return {payload:[...invites.values()].map(i=>({...i,status:i.used?'Used':Date.now()>i.expires?'Expired':'Active'})),status:200};
  if(method==='POST'){
   if(!['educator','coordinator'].includes(body.role))fail('Choose an educator or coordinator role.');const email=cleanEmail(body.email);checkEmail(email);
   if(accounts.has(email))fail('This email already has an account. Roles cannot be changed at login.',409);
   if(invites.size>=1000)fail('Invitation limit reached.',503);
   const code=crypto.randomUUID();const invitation={code,email,role:body.role,createdAt:new Date().toISOString(),expires:Date.now()+86400000,used:false};invites.set(code,invitation);return {payload:invitation,status:201};
  }
  fail('Method not allowed',405);
 }
 if(!['login','register'].includes(action)||method!=='POST')fail('Authentication route not found',404);
 const email=cleanEmail(body.email),password=body.password,role=body.role;checkEmail(email);
 if(typeof password!=='string'||password.length<8||password.length>128)fail('Password must contain 8–128 characters.');
 if(!roles.includes(role))fail('Select Learner, Educator or Coordinator.');limit(email);
 if(action==='login'){
  const a=accounts.get(email),candidate=await derive(password,a?.salt||new Uint8Array(16));
  if(!a||!equal(candidate,a.hash))fail('Incorrect email or password.',401);
  if(a.role!==role)fail('The selected role does not match your registered account.',403);
  attempts.delete(email);return {payload:start(request,url,headers,a),status:200};
 }
 const name=typeof body.name==='string'?body.name.trim():'';if(name.length<2||name.length>80)fail('Name must contain 2–80 characters.');
 if(accounts.has(email)||pendingEmails.has(email))fail('This email is already registered. Please sign in.',409);
 if(accounts.size+pendingEmails.size>=1000)fail('Account limit reached.',503);
 const first=!hasCoordinator();let invitation;
 if(first){if(role!=='coordinator')fail('Set up the first Coordinator account before registering learners or educators.',403);if(bootstrapPending)fail('Coordinator setup is already in progress. Try again.',409);}
 else if(role!=='learner'){
  const code=typeof body.inviteCode==='string'?body.inviteCode.trim():'';invitation=invites.get(code);if(!invitation||invitation.used||invitation.expires<Date.now()||invitation.email!==email||invitation.role!==role||pendingInvites.has(invitation?.code))fail('A valid invitation from your coordinator is required for this staff role.',403);
 }
 pendingEmails.add(email);if(first)bootstrapPending=true;if(invitation)pendingInvites.add(invitation.code);
 try{
  const salt=crypto.getRandomValues(new Uint8Array(16)),hash=await derive(password,salt);
  const a={id:crypto.randomUUID(),name,email,role,salt,hash,createdAt:new Date().toISOString()};accounts.set(email,a);if(invitation)invitation.used=true;attempts.delete(email);
  return {payload:start(request,url,headers,a),status:201};
 }finally{pendingEmails.delete(email);if(first)bootstrapPending=false;if(invitation)pendingInvites.delete(invitation.code);}
}
