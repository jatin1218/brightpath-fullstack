# Brightpath — role-based learning center (v6 — connected classroom)

A React frontend and working Node.js backend with Learner, Educator and Coordinator accounts. No database and no demo accounts, courses, learners, syllabus, attendance or statistics. Everything displayed comes from submitted registrations and learning records.

## Run on Windows

1. Stop your previous server with Ctrl+C.
2. Extract the updated ZIP into a fresh folder.
3. Open `brightpath-fullstack` and double-click `START-WINDOWS.bat`.
4. Open http://localhost:3000.

Or open PowerShell inside the extracted `brightpath-fullstack` folder:

```powershell
node server/index.mjs
```

Node.js 22.13+ is required. The built frontend is included; npm install is not needed just to run it. The launcher locates the correct server folder automatically.

## Coordinator setup fix

The frontend now waits for one verified `/api/auth/status` response before displaying the login or signup form. A connection error or older backend shows a retry/version message instead of incorrectly requesting an invitation. The first Coordinator screen explicitly says **No invitation code is required** and has a **Create first Coordinator** button. Setup state is refreshed after logout, session expiry and signup failure. The backend determines whether a Coordinator exists and never grants staff roles from the dropdown alone.

If you still see the old form locally, stop the previous process, extract this version into a fresh folder, run START-WINDOWS.bat, and refresh localhost:3000. Do not run old and new copies on the same port. Restarting clears memory-only records.

## Set up your center

1. **First account:** create a Coordinator account. This initializes the empty center. There are no default passwords. Perform initial setup yourself before giving anyone access to your running server. The local server binds to your computer (127.0.0.1); the hosted Site retains its private access policy.
2. **Invite educators:** Coordinator → Educators → Invite educator. Enter the educator's email. Copy the code from Coordinators → Staff invitations and share it directly. The app does not send emails.
3. **Staff registration:** select Educator (or Coordinator), use the invited email and invitation code, and create a password. Staff invitations expire after 24 hours and work once for the named email and role.
4. **Learner registration:** learners choose Learner and create their own accounts without a staff code. They appear immediately in the coordinator's learner directory, with no courses or progress yet.
5. **Create a course:** Coordinator → Programs → Create course. Choose an educator and enter syllabus topics, one per line. Courses may be created unassigned and assigned later.
6. **Enroll learners:** Coordinator → Learners → Enroll learner. Choose a registered learner and a course.
7. **Teach and track:** Educator → My classes → Open course. Mark taught topics, add syllabus topics, update each enrolled learner's completed topics and learning notes, use the Attendance tab for class registers, and inspect attendance history.
8. **Review:** learners see only their own courses, notes, progress and attendance; coordinators see staff workload and center-wide syllabus coverage.

Select your registered role at login. The dropdown cannot change an account's role. To test multiple roles on one computer, sign out and sign in as another account, or use separate browser profiles.

## Access rules

| Capability | Learner | Educator | Coordinator |
| --- | --- | --- | --- |
| Own courses, progress, attendance | Yes | Own teaching scope | Center-wide |
| Other learner records | No | Assigned classes only | Yes |
| Educator and coordinator directories | No | No | Yes |
| Mark syllabus taught / add topics | No | Assigned courses only | Yes |
| Update learner completion / attendance | No | Assigned learners only | Yes |
| Create courses / assign educator / enroll learner | No | No | Yes |
| Invite staff | No | No | Yes |

Every API request enforces the stored server-side role. Restricted tabs are also hidden. Request payloads, URL parameters or a changed login dropdown cannot bypass permissions. Reassigning a course immediately removes the old educator's access. Student reports contain only that student's records, and educator reports contain only assigned records.

## Live lectures, recordings and learning materials

Open **Classroom** and select a course. Its tabs are Live lectures, Recordings, Materials, Assignments and My notes.

- **Live lectures:** assigned Educators and Coordinators schedule a title, time, duration and HTTPS meeting link. Create the actual meeting in Google Meet, Zoom, Teams or another provider, then paste that provider's link. The Join/Open meeting button opens a separate tab; your notes can stay open in Brightpath. Mark live and Complete lecture control the listing here, not the provider's call. Cancelling or completing here does not end the provider meeting. Times use each viewer's device timezone.
- **Video service boundary:** this is a working meeting-link classroom integration, not an embedded conferencing server. Camera, microphone, admission, provider sign-in, participant limits and recording permissions are handled by the chosen provider. No meeting is automatically provisioned, and no call is automatically recorded. Attendance remains educator-submitted in the Attendance tab.
- **Recordings:** educators publish a hosted recording URL or upload MP4/WebM (maximum 20 MB). Uploaded videos have an in-page player with HTTP byte-range support and a download link. Full-length recordings should use a hosted link. External recordings open at their provider; its own sharing permissions apply, so grant students viewing access there.
- **Materials:** publish shared class notes as text, HTTPS resources, or PDF/TXT/PNG/JPG files up to 10 MB. Files are checked for permitted types and basic signatures, not antivirus-scanned. Downloads require an authorized course session. Failed uploads leave a staff-only pending material with a retry control.
- **Assignments:** publish instructions, optional attachment/link and due date. Learners submit text and/or a PDF/TXT/image attachment. Late work is accepted and labelled. A learner can update their own submission until reviewed. Assigned staff grades out of 100 and publishes private feedback. Other students cannot read the answer, file or feedback. Assignments with submissions cannot be deleted.
- **My notes:** each user's course notebook is private, limited to 20,000 characters and saved manually. Download it as TXT to keep an offline copy. Revision checks prevent silent overwriting by another tab. A conflict offers loading the saved version; download unsaved text first if needed. These notes are distinct from educator feedback and shared class notes.
- All course lists, writes, file downloads, submissions and notes enforce current enrollment/teaching assignments on the server. Reassigning an educator revokes access to the old course. No demo lectures, URLs, files or accounts are seeded.

Files, notes and recordings remain **memory-only**. Total uploaded storage is capped at 40 MB per process, with upload reservations to bound memory consumption. Space can fill before an individual file's limit; delete an unused material or use a hosted link. Server restart/redeployment clears uploaded files and records. On hosted edge workers, different instances may have different memory, so this is not permanent shared cloud storage. The single-process Node edition retains coherent records while it runs. Provider-hosted links reference files retained by that provider, independently of Brightpath.

## Class attendance workflow

1. Coordinator creates a course, assigns its educator and enrolls learners.
2. Open **Attendance → New session**. Choose course, date (India time), period 1–12, and Lecture/Tutorial/Lab. Room/section and topic are optional.
3. The register captures learners enrolled on that date. Later enrollments do not change a historical session roster. Each row shows the learner's email and enrollment ID; this ID is generated by the app, not a university-issued roll number.
4. Mark each learner **Present, Absent, Late or Excused**. Search by name/email; bulk buttons apply only to visible rows. Add optional remarks, visible to that learner.
5. **Save draft** preserves incomplete work without affecting attendance totals. **Submit & lock** requires every learner to be marked and locks the record.
6. Educators can manage only sessions in assigned courses. After submission, only a Coordinator can correct attendance. A reason of at least five characters is required. Audit history records actor, timestamp, previous/new status and remark changes.
7. A Coordinator may cancel an incorrectly entered session with a reason. The cancelled record and audit history remain, but its attendance is excluded. Cancelled sessions cannot be edited.
8. Use course and date filters for summaries and session history. Export **Summary CSV** or **Register CSV**; exports enforce the same role permissions. Search filters both exports; the shortage checkbox additionally filters the summary export. Summary CSV includes earlier daily records; Register CSV contains submitted session registers only.
9. Select a course as Coordinator to change **Minimum %** (1–99). The default 75% is a configurable institutional assumption, not a claim about every university's policy.
10. Learners see only their own submitted attendance and course standing; they cannot mark or modify attendance.

## Real data calculations

- Syllabus coverage = taught topics ÷ course topic count.
- Learner progress = completed topics ÷ assigned course topic count.
- Attendance = (Present + Late) ÷ (Present + Late + Absent), shown to one decimal place. Excused, draft and cancelled sessions are excluded. Each period counts equally as one session, including a lab.
- No counted attendance displays “—” rather than a fabricated percentage. Excused counts remain visible.
- Shortage is based on the unrounded percentage and course minimum. The catch-up figure gives the number of consecutive attended sessions needed to reach that minimum, assuming no further absences.
- Date-filtered reports calculate percentages and shortage within that selected period. Clear dates to see the complete recorded history.
- Multiple periods may be recorded on one day. An active course/date/period combination cannot be duplicated.
- Submissions use revision checks to prevent one staff member silently overwriting another's changes. On conflict, reload the register before editing again.
- Session dates must be between course creation and today in Asia/Kolkata; only learners enrolled by the chosen date appear. There is no future-session scheduling.
- Enrollments with attendance history cannot be deleted, preserving the register. Daily attendance writes from the older API now return 410; historical daily records remain readable. A session cannot be added on a date already containing daily records, avoiding double counting.
- Dashboard attendance uses submitted session data. The dashboard refreshes every 15 seconds; use the Attendance refresh button to reload registers and avoid overwriting unsaved work.
- New topics can lower completion percentages because they increase total syllabus.

## Memory-only limitation

Accounts, password hashes, invitations, sessions, courses, enrollments, progress, attendance sessions and audit trails are stored in shared process-local JavaScript Maps. No database, localStorage, writable JSON data file or disk persistence is used. Passwords are stored as salted PBKDF2 hashes. Login sessions use HTTP-only SameSite cookies and expire after 8 hours.

Signing out does not erase account records. Signing in again to the same running server restores that user's data. **Stopping or restarting the Node server clears all accounts and records, including the initial Coordinator account.** You must set up the center again. This satisfies memory-only storage; it cannot provide permanent records.

The hosted edition retains its private ChatGPT access boundary. Its edge workers have per-instance memory, which can reset on inactivity/redeployment or differ across instances. Use the downloadable single Node process for coherent shared tracking while the server remains running. This is not a durable production record system; permanent multi-user storage requires an agreed persistence option.

There is no email verification or password-reset email service. Staff invitations are copied and shared manually. Limits: 1,000 accounts, 2,000 login sessions, 500 courses, 100 topics per course, 5,000 enrollments, 10,000 attendance sessions, 300 learners per register and 500 audit events per register per running process.

## Modify and rebuild

```sh
npm install
npm run build
npm test
npm start
```

| File | Purpose |
| --- | --- |
| frontend/App.jsx | Login, role selection, first coordinator setup and staff signup |
| frontend/Dashboard.jsx | Role-specific dashboards and data-entry forms |
| frontend/Classroom.jsx | Lectures, materials, assignment work and private notebooks |
| server/classroom.mjs | Course authorization, upload/download, playback, submission and private-note APIs |
| frontend/Attendance.jsx | Session register, summaries, shortage, corrections and history |
| server/attendance.mjs | Attendance validation, access control, audit trails and exports |
| frontend/styles.css | Cream-and-teal design and responsive layout |
| server/auth.mjs | Accounts, roles, staff invitations, password hashing and sessions |
| server/learning.mjs | Shared learning records, permissions and calculated metrics |
| server/api.mjs | API routing, validation, authorization and CSV exports |
| server/index.mjs | Single-port Node HTTP server |
| server/roles.test.mjs | Authorization and actual-data workflow tests |

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /api/auth/status | Combined versioned setup and current-user status |
| GET | /api/auth/setup | Whether first coordinator setup is required |
| POST | /api/auth/register | Register with name, email, password, role and staff inviteCode when required |
| POST | /api/auth/login | Sign in with email, password and registered role |
| GET | /api/auth/me | Current user and stored role |
| POST | /api/auth/logout | Invalidate login session |
| GET / POST | /api/auth/invites | Coordinator-only staff invitations |
| GET | /api/data | Role-scoped shared learning snapshot |
| GET | /api/learners | Coordinator: all; educator: assigned; learner: denied |
| GET | /api/educators or /api/coordinators | Coordinator-only directories |
| GET / POST | /api/courses | Scoped read; coordinator-only course creation |
| PATCH | /api/courses/:id | Coordinator updates course or educator assignment |
| POST | /api/courses/:id/topics | Assigned educator or coordinator adds topic |
| PATCH | /api/courses/:id/topics/:topicId | Mark a topic taught / pending |
| GET / POST | /api/enrollments | Scoped read; coordinator-only enrollment |
| PATCH | /api/enrollments/:id | Assigned staff updates completedTopicIds and notes |
| POST | /api/enrollments/:id/attendance | Retired daily-write endpoint; returns 410 |
| GET | /api/attendance | Scoped sessions and course-wise summaries; courseId/from/to filters |
| POST | /api/attendance | Assigned staff creates a session and snapshots its roster |
| PATCH | /api/attendance/:id | Save draft, submit, coordinator correction or cancellation with revision |
| GET | /api/attendance/report | Scoped summary or register CSV |
| DELETE | /api/enrollments/:id | Coordinator removes enrollment and its records |
| GET | /api/report?view=overview | Role-scoped CSV report |

## Classroom API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /api/classroom?courseId=... | Authorized lectures, materials, scoped submissions and own notebook |
| POST | /api/classroom/lectures | Schedule a lecture with a provider meeting URL |
| PATCH | /api/classroom/lectures/:id | Revision-checked live/completed/cancelled transition |
| POST / DELETE | /api/classroom/materials[/:id] | Publish or remove course materials |
| POST | /api/classroom/materials/:id/file | Authorized raw-byte attachment upload; X-Filename and X-Revision headers |
| GET | /api/classroom/files/:id | Authorized binary download or video range response |
| PATCH | /api/classroom/notes/:courseId | Save only the current user's private notebook |
| POST | /api/classroom/materials/:id/submissions | Create/update the learner's own assignment answer |
| POST | /api/classroom/submissions/:id/file | Attach the learner's own assignment file |
| PATCH | /api/classroom/submissions/:id | Assigned staff grade and feedback |

## Verification

Tests cover blank initialization, privileged signup controls, email-bound staff invitations, role mismatch, direct API denials, cross-learner and cross-educator isolation, real syllabus progress, attendance corrections, coordinator tracking, reassignment, logout, session expiration and rate limits. Production builds and local HTTP integration were checked. Automated React DOM interaction checks additionally exercised startup failure and retry, first Coordinator creation without a code, all role tabs, three-role signup/login/logout, invitations and copying, course creation and assignment, enrollment, progress editing, attendance/history, syllabus updates, learner visibility and CSV controls. These are DOM simulation checks, not a visual test in a full browser; visual QA remains unavailable.

The v5 attendance checks cover bulk drafts/submission, duplicate periods, incomplete marks, concurrent revision conflicts, locked educator records, audited Coordinator corrections, cancellation, late/excused calculations, configurable shortage, scoped CSVs and learner-only visibility. All 19 API tests pass. React DOM interaction tests exercise these controls through the frontend and real API handler. No full-browser visual test was available.

The v6 checks additionally cover lecture lifecycle, unsafe links, course/file isolation, byte-preserving uploads, recording ranges, private notebook isolation/conflicts, late assignment submissions, reviewed-answer locking, grading visibility and access revocation. Automated React DOM interaction checks exercised teacher and learner lecture/material/note/submission flows. These tests do not verify a real external meeting, provider recording permissions, codecs in a real browser or video-provider availability.

Final v6 validation: 27 API and standalone HTTP tests passed, including binary-file integrity over actual local HTTP. Production builds and the teacher/student React DOM workflow passed. External conference calls and full-browser visual/video playback were not exercised.
