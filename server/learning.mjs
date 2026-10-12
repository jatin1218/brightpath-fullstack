import {fail,permit,listUsers,publicUser} from './auth.mjs';
import {attendanceRecords,attendanceSummary,hasAttendance} from './attendance.mjs';
const courses=new Map(),enrollments=new Map();
const id=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
function text(v,label,max=120){if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail(`${label} must contain 1–${max} characters.`);return v.trim();}
export function courseFor(a,courseId,write=false){const c=courses.get(courseId);if(!c)fail('Course not found',404);if(a.role==='coordinator')return c;if(a.role==='educator'&&c.educatorId===a.id)return c;if(!write&&a.role==='learner'&&[...enrollments.values()].some(e=>e.courseId===c.id&&e.learnerId===a.id))return c;fail('You do not have access to this course.',403);}
export const courseEnrollments=courseId=>[...enrollments.values()].filter(e=>e.courseId===courseId);
function enrollmentFor(a,eid,write=false){const e=enrollments.get(eid);if(!e)fail('Enrollment not found',404);if(a.role==='learner'){if(write||e.learnerId!==a.id)fail('You do not have access to this learner record.',403);}else courseFor(a,e.courseId,true);return e;}
export function visibleCourses(a){return [...courses.values()].filter(c=>a.role==='coordinator'||a.role==='educator'&&c.educatorId===a.id||a.role==='learner'&&[...enrollments.values()].some(e=>e.courseId===c.id&&e.learnerId===a.id));}
function enrollmentInfo(e,users){const c=courses.get(e.courseId),l=users.find(u=>u.id===e.learnerId);const records=attendanceRecords(e);const completed=e.completedTopicIds.filter(tid=>c.topics.some(t=>t.id===tid)).length;return {id:e.id,learnerId:e.learnerId,learnerName:l?.name||'',learnerEmail:l?.email||'',courseId:c.id,courseTitle:c.title,educatorId:c.educatorId,educatorName:users.find(u=>u.id===c.educatorId)?.name||'Unassigned',completedTopicIds:e.completedTopicIds,completedTopics:completed,totalTopics:c.topics.length,progress:c.topics.length?Math.round(completed/c.topics.length*100):0,attendanceRate:attendanceSummary(records,c.attendanceThreshold??75).rate,attendance:records,notes:e.notes,createdAt:e.createdAt,updatedAt:e.updatedAt};}
function courseInfo(c,users){return {...c,educatorName:users.find(u=>u.id===c.educatorId)?.name||'Unassigned',learnerCount:[...enrollments.values()].filter(e=>e.courseId===c.id).length,coveredTopics:c.topics.filter(t=>t.covered).length,coverage:c.topics.length?Math.round(c.topics.filter(t=>t.covered).length/c.topics.length*100):0};}
export function snapshot(a){
 const users=listUsers(),cs=visibleCourses(a),ids=new Set(cs.map(c=>c.id));
 const es=[...enrollments.values()].filter(e=>ids.has(e.courseId)&&(a.role!=='learner'||e.learnerId===a.id));
 const learnerIds=new Set(es.map(e=>e.learnerId));
 const learners=users.filter(u=>u.role==='learner'&&(a.role==='coordinator'||a.role==='educator'&&learnerIds.has(u.id)||a.role==='learner'&&u.id===a.id));
 const educators=a.role==='coordinator'?users.filter(u=>u.role==='educator').map(u=>{const own=cs.filter(c=>c.educatorId===u.id),topics=own.flatMap(c=>c.topics);return {...u,courses:own.length,learners:new Set(es.filter(e=>own.some(c=>c.id===e.courseId)).map(e=>e.learnerId)).size,totalTopics:topics.length,coveredTopics:topics.filter(t=>t.covered).length,coverage:topics.length?Math.round(topics.filter(t=>t.covered).length/topics.length*100):0};}):[];
 const rows=es.map(e=>enrollmentInfo(e,users)),attendance=rows.flatMap(e=>e.attendance),topics=cs.flatMap(c=>c.topics);
 const data={user:publicUser(a),courses:cs.map(c=>courseInfo(c,users)),enrollments:rows,learners,stats:{learners:learners.length,courses:cs.length,totalTopics:topics.length,coveredTopics:topics.filter(t=>t.covered).length,coverage:topics.length?Math.round(topics.filter(t=>t.covered).length/topics.length*100):0,attendance:attendanceSummary(attendance).rate,progress:rows.length?Math.round(rows.reduce((n,e)=>n+e.progress,0)/rows.length):0},updatedAt:now()};
 if(a.role==='coordinator'){data.educators=educators;data.coordinators=users.filter(u=>u.role==='coordinator');data.stats.educators=educators.length;}
 return data;
}
export function requireView(a,view){if(['educators','coordinators','people'].includes(view))permit(a,'coordinator');if(view==='learners')permit(a,'coordinator','educator');if(view&&!['overview','educators','coordinators','people','learners','courses','learning','attendance'].includes(view))fail('Unknown view',400);}
export function readArea(a,area){if(area==='educators'||area==='coordinators')permit(a,'coordinator');if(area==='learners')permit(a,'coordinator','educator');return snapshot(a)[area]||[];}
export function writeLearning(a,p,method,b){
 if(p[0]==='courses'&&p.length===1&&method==='POST'){
  permit(a,'coordinator');if(courses.size>=500)fail('Course limit reached.');const title=text(b.title,'Course title');const description=typeof b.description==='string'?b.description.trim():'';if(description.length>2000)fail('Description must be under 2,000 characters.');
  const educatorId=b.educatorId||null;if(educatorId&&!listUsers().some(u=>u.id===educatorId&&u.role==='educator'))fail('Select a registered educator.');
  const names=b.topics??[];if(!Array.isArray(names)||names.length>100)fail('Provide at most 100 topics.');const topics=names.map(t=>({id:id(),title:text(t,'Topic'),covered:false,coveredAt:null}));
  const c={id:id(),title,description,educatorId,topics,attendanceThreshold:75,createdAt:now(),updatedAt:now()};courses.set(c.id,c);return {status:201,data:courseInfo(c,listUsers())};
 }
 if(p[0]==='courses'&&p.length===2&&method==='PATCH'){
  permit(a,'coordinator');const c=courseFor(a,p[1],true);if(!Object.keys(b).length||Object.keys(b).some(k=>!['title','description','educatorId','attendanceThreshold'].includes(k)))fail('Only title, description, educator assignment and attendance threshold can be edited.');
  const next={...c};if('attendanceThreshold'in b){if(!Number.isInteger(b.attendanceThreshold)||b.attendanceThreshold<1||b.attendanceThreshold>99)fail('Minimum attendance must be a whole percentage from 1 to 99.');next.attendanceThreshold=b.attendanceThreshold;}if('title'in b)next.title=text(b.title,'Course title');if('description'in b){if(typeof b.description!=='string'||b.description.length>2000)fail('Invalid description');next.description=b.description.trim();}
  if('educatorId'in b){if(b.educatorId!==null&&!listUsers().some(u=>u.role==='educator'&&u.id===b.educatorId))fail('Select a registered educator.');next.educatorId=b.educatorId;}
  next.updatedAt=now();courses.set(c.id,next);return {data:courseInfo(next,listUsers())};
 }
 if(p[0]==='courses'&&p[2]==='topics'&&p.length===3&&method==='POST'){
  permit(a,'coordinator','educator');const c=courseFor(a,p[1],true);if(c.topics.length>=100)fail('Topic limit reached.');const topic={id:id(),title:text(b.title,'Topic'),covered:false,coveredAt:null};c.topics.push(topic);c.updatedAt=now();return {status:201,data:topic};
 }
 if(p[0]==='courses'&&p[2]==='topics'&&p.length===4&&method==='PATCH'){
  permit(a,'coordinator','educator');const c=courseFor(a,p[1],true),topic=c.topics.find(t=>t.id===p[3]);if(!topic)fail('Topic not found',404);if(typeof b.covered!=='boolean')fail('covered must be true or false');topic.covered=b.covered;topic.coveredAt=b.covered?now():null;c.updatedAt=now();return {data:topic};
 }
 if(p[0]==='enrollments'&&p.length===1&&method==='POST'){
  permit(a,'coordinator');courseFor(a,b.courseId,true);if(!listUsers().some(u=>u.role==='learner'&&u.id===b.learnerId))fail('Choose a registered learner.');if([...enrollments.values()].some(e=>e.courseId===b.courseId&&e.learnerId===b.learnerId))fail('This learner is already enrolled.',409);if(enrollments.size>=5000)fail('Enrollment limit reached.');
  const e={id:id(),learnerId:b.learnerId,courseId:b.courseId,completedTopicIds:[],attendance:{},notes:'',createdAt:now(),updatedAt:now()};enrollments.set(e.id,e);return {status:201,data:enrollmentInfo(e,listUsers())};
 }
 if(p[0]==='enrollments'&&p.length===2&&method==='PATCH'){
  permit(a,'coordinator','educator');const e=enrollmentFor(a,p[1],true),c=courses.get(e.courseId);if(Object.keys(b).some(k=>!['completedTopicIds','notes'].includes(k)))fail('Only learner completion and learning notes can be edited.');
  if('completedTopicIds'in b&&(!Array.isArray(b.completedTopicIds)||b.completedTopicIds.some(tid=>!c.topics.some(t=>t.id===tid))))fail('Choose topics from this course.');
  if('notes'in b&&(typeof b.notes!=='string'||b.notes.length>2000))fail('Notes must be under 2,000 characters.');
  if('completedTopicIds'in b)e.completedTopicIds=[...new Set(b.completedTopicIds)];if('notes'in b)e.notes=b.notes.trim();e.updatedAt=now();return {data:enrollmentInfo(e,listUsers())};
 }
 if(p[0]==='enrollments'&&p[2]==='attendance'&&p.length===3&&method==='POST'){permit(a,'coordinator','educator');enrollmentFor(a,p[1],true);fail('Daily attendance entry has been replaced. Use the Attendance tab to create a class session.',410);}
 if(p[0]==='enrollments'&&p.length===2&&method==='DELETE'){permit(a,'coordinator');const e=enrollmentFor(a,p[1],true);if(hasAttendance(e.id)||Object.keys(e.attendance).length)fail('This enrollment has attendance history and cannot be removed.',409);enrollments.delete(e.id);return {data:{ok:true}};}
 fail('Route not found',404);
}
function csvCell(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function report(a,url){const view=url.searchParams.get('view')||'overview';requireView(a,view);const s=snapshot(a);let rows,keys;if(view==='educators'){rows=s.educators;keys=['name','email','courses','learners','coveredTopics','totalTopics','coverage'];}else if(view==='coordinators'){rows=s.coordinators;keys=['name','email','createdAt'];}else if(view==='courses'){rows=s.courses;keys=['title','educatorName','learnerCount','coveredTopics','coverage'];}else{rows=s.enrollments;keys=['learnerName','courseTitle','educatorName','progress','attendanceRate','completedTopics','totalTopics','notes'];}const q=(url.searchParams.get('q')||'').toLowerCase(),courseId=url.searchParams.get('courseId');rows=rows.filter(r=>(!courseId||r.courseId===courseId||r.id===courseId)&&Object.values(r).join(' ').toLowerCase().includes(q));return '\uFEFF'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(csvCell).join(',')).join('\r\n');}
