# Unified website on Cloudflare

Deploy the same GitHub website and API handlers to the existing `studygps` Worker and its existing `study-gps.z-hstudio.com` domain. Vercel project access is not required. The Cloudflare adapter reuses the application handlers, including Clerk authentication, Neon persistence, Canvas import and the public planning engine. It does not proxy authenticated requests to Vercel or rewrite the algorithms.

Build with Node.js 22: `npm ci`, `npm run build:cloudflare`. Deploy the reviewed GitHub commit using Wrangler 4.127.1 or a compatible version: `wrangler deploy --var SOURCE_COMMIT:$(git rev-parse HEAD)`. The repository contains the Cloudflare target and asset/security-header configuration. No Cloudflare or app credentials belong in Git. This records the deployed GitHub commit; it does not configure automatic builds on every GitHub push.

Application secrets must be set on the existing Worker in Cloudflare Settings → Variables and Secrets: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`. Use the same original Clerk and Neon services. Preserve optional `STUDYGPS_ADMIN_EMAIL` if the operator needs the existing administrator role. `APP_ORIGIN` is the custom domain and `NODE_ENV` is production. Do not change global origin validation or expose private records through a public proxy. Configure Clerk for the custom domain before account acceptance. The currently documented Clerk application is a development instance.

If any required account setting is absent, `/api/auth-config` returns `configured:false` and the portal explains that login/storage setup is incomplete. Public pages and the public synthetic route/engine remain available. Missing configuration is not a working login, Canvas import, personal persistence, or n8n integration.

Pre-deployment evidence: 315 local tests passed; build and Wrangler dry-run passed. Local Workers runtime verified pricing, portal, public navigation and an engine response exactly equal to the Alex fixture. The homepage root required explicit index routing with `html_handling:none`; this is covered by the adapter test. Authentication and Canvas real-account tests were not run without required settings.

Previous live Worker version for rollback: `dce5b341-8955-403f-bc55-ffc1e9890987`. No DNS changes are required for the existing Worker custom domain. Keep this version until the new deployment is accepted. The latest migration should be verified at `/api/deployment`, `/api/health`, `/pricing.html?lang=en`, `/portal.html?lang=en`, `/demo.html?lang=en`, and the homepage in both languages.
