import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
test('standalone HTTP server preserves binary uploads and session-protected downloads',async()=>{
 const child=spawn(process.execPath,[fileURLToPath(new URL('./index.mjs',import.meta.url))],{env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 try{
 const base=await new Promise((resolve,reject)=>{let out='';const timeout=setTimeout(()=>reject(Error('HTTP test startup timed out')),10000);child.stdout.on('data',c=>{out+=c;const m=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timeout);resolve(m[0])}});child.once('error',e=>{clearTimeout(timeout);reject(e)});child.once('exit',code=>{clearTimeout(timeout);reject(Error('HTTP server exited '+code))});});
 let cookie='';async function call(path,body){const res=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});if(res.headers.has('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];assert.ok(res.ok,await res.clone().text());return res.json();}
 await call('auth/register',{name:'HTTP Test',email:'http@example.test',role:'coordinator',password:'HttpTesting123!'});const course=await call('courses',{title:'Binary test',topics:[]});const material=await call('classroom/materials',{courseId:course.id,title:'Binary PDF',kind:'pdf',hasUpload:true});
 const bytes=new Uint8Array([...new TextEncoder().encode('%PDF-1.4\n'),0,255,128,240,159,1,2,3]);const upload=await fetch(base+'/api/classroom/materials/'+material.id+'/file',{method:'POST',headers:{cookie,'content-type':'application/pdf','x-filename':'binary.pdf','x-revision':String(material.revision)},body:bytes});assert.equal(upload.status,200,await upload.clone().text());const f=(await upload.json()).file;
 const res=await fetch(base+f.url,{headers:{cookie}});assert.equal(res.status,200);assert.deepEqual(new Uint8Array(await res.arrayBuffer()),bytes);assert.equal((await fetch(base+f.url)).status,401);assert.equal((await fetch(base+'/')).status,200);
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit');}}
});
