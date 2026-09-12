# StudyGPS account workspace release — 2026-09-12

Canonical site: https://studygps-five.vercel.app

## Delivered

- Original image-generated navigation artwork, responsive Chinese/English homepage, reduced-motion support and student/teacher feature previews clearly labelled as illustrations.
- Chinese/English Clerk sign-in and sign-up, with language preserved between the homepage, account workspace and public engine demo.
- Neon-backed student profiles, assessment scores, plans, task completion and assessment history.
- Classroom invitation codes, enrolled-student roster and details, and teacher-reviewed personalized advice. Teachers cannot inspect students outside their own classroom or change student scores/completion.
- Server-controlled teacher roles, verified-primary-email bootstrap for the configured administrator, Bearer session verification, origin checks, private/no-store responses and immediate client data clearing on logout/account changes.

## Verification

- `npm test`: 141 passed, zero failed or skipped, including signed-token verification, role escalation, two-student/two-teacher isolation, streamed request-size limits and UI lifecycle behavior.
- Clerk asynchronous component cleanup has three regression tests. Browser login/logout cycles for a student and a teacher passed after replacing entire retired component hosts, without deleting SDK-owned children or emitting the prior React `removeChild` error.
- `npm run build`: passed; generated n8n artifact matches engine source.
- `npm audit --omit=dev`: zero reported vulnerabilities.
- Public and project artifacts scanned against current private environment values: zero matches. Only the publishable Clerk configuration reaches the browser.
- Real Clerk and Neon verification used four dedicated QA accounts and two separate classrooms. Student ownership, class membership, role isolation, plan persistence and advice persistence passed.
- Browser verification covered real student password/verification-code login, teacher sign-in, saved task completion, editable teacher advice, student visibility of that advice, read-only teacher plan details, signup rendering, Chinese/English switching and logout clearing private content.
- Canonical production site: `node scripts/verify-deployment.js https://studygps-five.vercel.app` passed 37 HTTP checks, including all three engine baselines, public assets, anonymous/forged authentication rejection and cross-origin mutation rejection.
- Authenticated browser requests on the canonical production origin returned the student's own plan and teacher advice, rejected another student's ID with HTTP 403, and sent `private, no-store`. A 390px mobile student workspace had no horizontal overflow.
- Homepage checked on desktop and 360px mobile in both languages, including enlarged text and reduced-motion behavior.

QA accounts and records are retained. Their credentials and browser artifacts are outside the repository and are not deployment assets.

## Operating boundaries

The provisioned Clerk application uses a **development instance**. A Ready Vercel production deployment does not make the identity provider a production instance. Before formal launch, configure a Clerk production instance/domain and update its keys and the explicit CSP domain together.

New accounts are students by default. The designated administrator must sign up or sign in with the configured email and verify it as the primary Clerk email. The application does not fabricate verification or create that account in advance. Teachers see students who join their class by invitation code.

Advice drafts use the deterministic study engine and require the teacher to save the text. This release does not execute LLM/RAG calls, send email, or run n8n/Calendar/Gmail workflows. The earlier public engine demo remains available at `/demo.html`.

Production `APP_ORIGIN` accepts only the canonical site. Arbitrary Vercel deployment URLs are intentionally not authorized login origins. See [portal-security.md](portal-security.md) for setup and the API contract.
