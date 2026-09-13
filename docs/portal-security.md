# StudyGPS accounts, permissions and API

## Runtime and account setup

StudyGPS uses Clerk session authentication and Neon Postgres persistence. The existing public `/api/study-plan` endpoint remains a stateless calculator: it cannot read or write account data. `/api/portal` is the account workspace and never falls back to demo users, browser storage, or fabricated authentication.

Run `node --env-file=.env.local scripts/migrate-db.js` with Node 22 after installing dependencies. The migration is idempotent and creates only StudyGPS tables; it does not create users, seed learning records, or grant roles. Configure `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and the exact canonical `APP_ORIGIN` in the deployment environment. Never put the secret key or database connection string in browser assets. Local development allows `http://localhost:3040` and `http://127.0.0.1:3040` outside Vercel/production.

New accounts default to students. An operator can designate the first administrator with the server-only `STUDYGPS_ADMIN_EMAIL` environment variable: it must exactly match the current Clerk user's **verified primary email**, ignoring letter case and surrounding whitespace. An unverified email, secondary email, similar address, browser form field, or client-supplied claim does not match. The configured email is not committed to the repository or returned in public configuration.

An operator who already has access to the Clerk application can designate additional teachers by setting a user's **private metadata** to `{ "studygpsRole": "teacher" }`. Preserve other metadata fields. These are administrative operations, not signup options. Public metadata, unsafe metadata, email domain, browser UI role choice, JWT custom role claims, and request-body roles grant no privileges. The backend verifies the session and fetches the current Clerk user on every request. To revoke a teacher, remove both any matching bootstrap-email configuration and their private teacher flag; the change takes effect on subsequent requests with the updated server configuration. Banned, locked, deleted, invalid, pending, and expired sessions are denied. Only a verified primary email is copied into the learning profile.

## Access and data boundaries

- Students can edit their own profile, assessment and current task completion. Their verified Clerk subject chooses the owner; no request field chooses a different owner.
- A teacher creates one classroom with an 80-bit random invitation code. A student actively enters that code to enroll in one classroom. The UI explains the learning information shared before enrollment. Joining another classroom returns `409 ALREADY_ENROLLED`; there is no implicit transfer or unassignment.
- Teachers can list and open only students enrolled in their own classroom. Other or nonexistent student IDs return the same `404 NOT_FOUND`. Students cannot list students, open teacher detail routes, create classrooms, or write teacher advice.
- Shared information is limited to name, verified primary email, study goal, timezone, recorded topic scores, target score, available minutes, assessment score history, current plan and completion status. Passwords, session tokens, Clerk metadata, account credentials and information from another classroom are never returned.
- Teachers can write advice for assigned students; they cannot alter student scores or mark their tasks complete. Students see advice from their currently assigned teacher. A teacher sees their own notes. Suggestions are deterministic study-engine templates, explicitly labelled as such, with separate Chinese and English text; teachers can edit the suggestion before saving. No LLM claim, email delivery, n8n execution, or notification is implied.
- SQL values are parameterized. Assessment writes update the plan and history in one database transaction. Completion updates are atomic and validate the task against the current saved plan. Advice insertion checks classroom ownership again in SQL.
- The latest 30 assessments and 50 advice records per student/teacher are retained; API lists are bounded. The current implementation supports one course and at most 1,000 displayed students per classroom. Class transfer, record deletion/export, organization-wide administration, and multi-course teaching are not exposed by this API.
- Every API response, including errors, is `private, no-store`; CDN caching is explicitly disabled. Authentication uses an explicit Bearer session token, never ambient cookies. Mutations require the configured frontend Origin, reject cross-site Fetch Metadata, require JSON, and enforce a 64 KiB request limit (including bilingual deadline context). Unknown request fields, including attempted role or owner overrides, are rejected.

## HTTP contract

Send `Authorization: Bearer <Clerk session.getToken()>` for every request. Mutations also require `Content-Type: application/json` and the browser-supplied same-origin `Origin`. Do not persist the response in localStorage or share it between sessions.

`GET /api/portal` returns:

```json
{
  "user": { "id": "user_…", "name": "…", "email": "…", "role": "student", "goal": "…", "timezone": "Australia/Sydney" },
  "classroom": null,
  "students": [],
  "learning": null,
  "advice": [],
  "recommendation": null
}
```

`classroom` is `null` or `{id,name}`; **only teachers** receive `code` in that object. Teacher `students` summaries are `{id,name,email,goal,overallScore,completedTasks,totalTasks,focusTopic,updatedAt}`. `overallScore`, `focusTopic` and `updatedAt` can be null.

When saved, `learning` is `{scores,targetScore,minutes,plan,completedTaskIds,history,updatedAt}`. `scores` has exactly `first_law`, `second_law`, `entropy`, and `rankine_cycle`, each a finite 0–100 number or `null` when not assessed. `plan` is the existing `generateStudyPlan` JSON result, including `priorities`, `topic_analysis`, `overall_score`, and `changes`; it is not wrapped in an n8n `json` item. `history` is newest first, with `{id,createdAt,overallScore}` entries. Dates are ISO strings. A new assessment resets current task completion and compares only with that same student's previous saved plan.

`GET /api/portal?studentId=user_…` is teacher-only and returns the same view plus `student:{id,name,email,role,goal,timezone}`. `user` remains the teacher actor; `learning`, `advice`, and `recommendation` refer to the selected assigned student. The teacher's classroom and roster remain present. Without `studentId`, a teacher receives `learning:null`, `advice:[]`, and `recommendation:null`.

`advice` entries are `{id,message,focusTopic,teacherName,createdAt}`. `focusTopic` can be null. `recommendation` is null without a saved assessment, otherwise `{topicId,reason:{zh,en},action:{zh,en},source:"deterministic-study-engine"}`. `topicId` is null when no task can be allocated.

All successful `POST /api/portal` mutations return `{ "ok": true }`; fetch the current view again to obtain server state.

| action | Fields | Access |
| --- | --- | --- |
| `save-profile` | `name` (1–80 chars), `goal` (0–500 chars), `timezone` (IANA name) | Own profile |
| `create-classroom` | `name` (1–80 chars) | Teacher |
| `join-classroom` | `code` (20 hexadecimal chars, case insensitive) | Student |
| `save-assessment` | `scores` (four keys), `targetScore` (finite 0–100), `minutes` (integer 0–1440) | Student's own record |
| `complete-task` | `taskId` (current plan task ID), `completed` (boolean) | Student's own record |
| `save-advice` | `studentId`, `message` (1–2000 chars), optional `focusTopic` (topic ID or null) | Teacher's assigned student |

Errors are `{error:{code,message}}`. Clients should localize `code`, and treat `message` as plain text.

| Status | Codes |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_JSON` |
| 401 | `AUTH_REQUIRED`, `AUTH_INVALID` |
| 403 | `FORBIDDEN`, `ORIGIN_NOT_ALLOWED` |
| 404 | `NOT_FOUND` |
| 405 | `METHOD_NOT_ALLOWED` |
| 409 | `ALREADY_ENROLLED`, `CLASSROOM_EXISTS`, `PLAN_CHANGED` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 503 | `SERVICE_UNAVAILABLE` |

## Verification boundaries

The 34 permission/authentication/HTTP tests inject test-only authenticators and repositories directly into exported factories; no environment variable or deployed HTTP parameter activates these fakes. They cover two students, two teachers, anonymous access, cross-classroom reads and writes, owner/role escalation attempts, invalid input, and sensitive error handling. Separate SDK verification tests exercise forged, expired and wrong-origin JWT rejection using actual Clerk verification with a generated test signing key. A real local HTTP socket also verifies oversized chunked requests receive a JSON 413. Independent workspace queries run concurrently; tests prove that a teacher's learning/advice reads remain blocked until the assignment check succeeds. Current learning and its bounded assessment history are retrieved in one SQL statement. Clerk permissions and private data are never cached.

On 2026-09-12, a separate runtime check created four clearly marked Clerk **development QA accounts**, read their actual verified identities and trusted roles, and used the real Neon repository to persist two classrooms, two enrollments, distinct study plans, task completion and teacher advice. Fresh repository instances confirmed persistence. Cross-classroom reads/writes and student administration were denied. Accounts and records were retained; no email was sent. This establishes database/service behavior, not browser sign-in or HTTP session-token transport. Live sign-in must be reported separately. A Clerk development instance and its test accounts remain a development setup until a production Clerk instance, production domain and operator-managed teacher accounts are configured.

References: [Clerk request authentication](https://clerk.com/docs/reference/backend/authenticate-request), [Clerk session tokens](https://clerk.com/docs/guides/sessions/session-tokens).
