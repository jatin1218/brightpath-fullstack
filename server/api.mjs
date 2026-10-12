import {classroomData,classroomWrite,uploadFile,serveFile} from './classroom.mjs';
import {attendanceData,writeAttendance,attendanceCsv} from './attendance.mjs';
import {authAction,getAccount,fail} from './auth.mjs';
import {snapshot,requireView,readArea,writeLearning,report} from './learning.mjs';
export async function handleApi(request){
 const url=new URL(request.url),p=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=request.method;
 const headers={'content-type':'application/json','cache-control':'no-store'},json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
 try{
  if(!['GET','POST','PATCH','DELETE'].includes(method))fail('Method not allowed',405);
  const origin=request.headers.get('origin');if(method!=='GET'&&origin&&origin!==url.origin)fail('Cross-origin writes are not allowed',403);
  if(p[0]==='classroom'&&((p.length===4&&p[3]==='file'&&method==='POST')||(p[1]==='files'&&p.length===3&&method==='GET'))){const a=getAccount(request);if(!a)fail('Please sign in again.',401);if(method==='GET')return serveFile(a,p[2],request);return json(await uploadFile(a,p,request));}
  let body={};if(['POST','PATCH'].includes(method)){const raw=await request.text();if(raw.length>150000)fail('Request too large',413);try{body=JSON.parse(raw||'{}')}catch{fail('Invalid JSON')};if(!body||typeof body!=='object'||Array.isArray(body))fail('Expected a JSON object');}
  if(p[0]==='health'&&method==='GET')return json({ok:true,storage:'memory',database:false});
  if(p[0]==='auth'){const r=await authAction(request,url,body,headers);return json(r.payload,r.status);}
  const account=getAccount(request);if(!account)fail('Your session ended. Please sign in again.',401);
  if(p[0]==='classroom'){if(method==='GET'&&p.length===1)return json(classroomData(account,url));return json(classroomWrite(account,p,method,body),method==='POST'?201:200);}
  if(p[0]==='attendance'){
   if(method==='GET'&&p.length===1)return json(attendanceData(account,url));
   if(method==='GET'&&p[1]==='report'&&p.length===2)return new Response(attendanceCsv(account,url),{headers:{...headers,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename=attendance.csv'}});
   const r=writeAttendance(account,p,method,body);return json(r.data,r.status||200);
  }
  if(p[0]==='data'&&method==='GET'){requireView(account,url.searchParams.get('view'));return json(snapshot(account));}
  if(['learners','educators','coordinators','courses','enrollments'].includes(p[0])&&p.length===1&&method==='GET')return json(readArea(account,p[0]));
  if(p[0]==='report'&&method==='GET')return new Response(report(account,url),{headers:{...headers,'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="brightpath-report.csv"'}});
  const r=writeLearning(account,p,method,body);return json(r.data,r.status||200);
 }catch(e){return json({error:e.code?e.message:'Something went wrong. Please retry.'},e.code||500);}
}
