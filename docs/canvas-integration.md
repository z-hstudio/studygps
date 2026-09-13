# Canvas in the existing StudyGPS website

Source baseline: GitHub `main` commit `67f562d99bf724a675c5a21c5a9c0c2bb5a31a76`. This change adds Canvas to `/portal.html`, using the existing Clerk sign-in, site navigation, bilingual interface and authenticated request helper. It does not deploy the earlier separate local Canvas server or replace the latest homepage, pricing, learning engine, teacher workspace, or database.

After signing in, enter a personal Canvas token in **My Canvas courses** and connect. The website reads all active student courses from `canvas.sydney.edu.au`, then reads each course sequentially. Grades appear directly in the workspace. Canvas's `enrollment_state=active` filter respects section/course/term overrides; institutions that leave old courses active can still return them. Empty/ungraded/excused/out-of-range scores are labelled, not zero-filled. No assignment-to-topic weights are inferred.

## Privacy and execution

`POST /api/canvas` requires the existing verified Clerk session and allowed frontend Origin. The body accepts only `{action, canvasToken, courseId?}`. Actions are `courses` and `grades`. Identity overrides are rejected. The website passes its Clerk session in the Authorization header; the Canvas token is separate and sent only to the fixed Canvas origin by the server. HTTPS is required for the deployed origin. No token is persisted, echoed, logged or sent to n8n. Response headers disable browser/CDN caching. No cross-origin API CORS is enabled.

Each read is capped at 20 seconds overall, 15 seconds and 5 MiB per page, with at most 30 pages and no redirect or cross-origin pagination. A failed course is marked; authentication/rate-limit errors stop further course requests. No fake success is returned. Grades remain in page memory only, survive locale rerender for the same identity, and clear on sign-out/account switch/full page refresh. Teachers do not gain access to another person's Canvas import. Existing saved assessments are unchanged.

This is an authenticated manual-start automatic import, not background scheduling or OAuth onboarding for general customers. Personal access-token support depends on university policy. For multi-user production onboarding, obtain a Canvas developer key and implement the institution-approved OAuth flow before presenting this as a fully supported LMS connection.

## Deployment checkpoint — 2026-09-13

- Latest website: `https://studygps-five.vercel.app` (public read succeeds).
- Requested canonical domain: `https://study-gps.z-hstudio.com` currently serves the old Cloudflare Worker site.
- Connected Vercel identity: `zzz-zzz147`; only `secondsight-web` is visible in its team. Lookup of `studygps-five.vercel.app` returns deployment not found. The StudyGPS Vercel project cannot currently be updated or configured from this session.
- No Vercel production deployment, DNS/domain reassignment, authentication change, database migration, or n8n publication was performed.

Required next steps once project access is granted:

1. Identify the existing StudyGPS Vercel project/team and deploy this reviewed branch there. Preserve its Clerk/Neon secrets, database and existing project configuration; do not create another competing website.
2. Register `study-gps.z-hstudio.com` on that project. Prepare the exact DNS target from Vercel and retain the old Cloudflare Worker/domain configuration for rollback. Remove only the conflicting StudyGPS custom-domain binding when ready to cut over; leave unrelated DNS unchanged.
3. Configure the existing backend's canonical `APP_ORIGIN` for the custom domain, and configure the existing Clerk application to support it. The repository supports one canonical origin; do not weaken origin validation or proxy protected requests through the old Worker to conceal a mismatch. The currently documented Clerk instance is development, not production-ready.
4. Verify HTTPS, homepage/pricing, sign-in/sign-out, account isolation, Canvas import, and existing assessment persistence at the custom domain. Do not claim the domain finished until these checks pass.

## Not completed

Canvas assignment grades are not automatically topic mastery. The existing private planner is tied to one configured Thermodynamics topic model. Verified multi-course mapping, durable personal Canvas snapshots, and actual n8n execution/persistence from this account workspace remain unimplemented. Existing n8n demo evidence is not evidence for this new authenticated path.

References: [Canvas Courses](https://developerdocs.instructure.com/services/canvas/resources/courses), [Assignments](https://developerdocs.instructure.com/services/canvas/resources/assignments), [Vercel domains](https://vercel.com/docs/domains).

Validation: 312/312 local tests passed; production asset build passed; scoped credential-pattern scan and Git whitespace check passed. UI/auth tests use synthetic identities and Canvas responses. Real Clerk + Canvas execution, Vercel deployment and custom-domain acceptance were not executed because the target Vercel project is inaccessible.
