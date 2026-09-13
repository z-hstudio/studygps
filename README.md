# StudyGPS

StudyGPS is a learning navigator for university students: **what to study → when to study → how to study → continuous re-routing**. It turns assessment results, deadlines, teacher guidance and study availability into an explainable route, with an independent analysis-engine adapter for n8n.

Built as a starting point for the n8n University Hackathon.

## Homepage and private learning workspace

The bilingual [homepage](https://studygps-five.vercel.app) introduces StudyGPS with an original generated navigation landscape and interactive student/teacher feature previews. These previews are explicitly illustrative. The [account workspace](https://studygps-five.vercel.app/portal.html) uses Clerk authentication and Neon Postgres, with server-enforced student ownership and classroom-scoped teacher access.

Students save their own profile, topic scores, study budget, plans and task completion; they join a teacher's classroom using its invitation code. Teachers create a classroom, inspect only its enrolled students, review their scores and history, and save individualized advice. Suggestions use the deterministic study engine, with a teacher reviewing and editing the text before saving. Private learning records are never stored in browser localStorage. The homepage and account workspace both support Chinese and English, including Clerk's sign-in and sign-up components.

New accounts default to student. The deployment operator can configure `STUDYGPS_ADMIN_EMAIL` for a verified-primary-email administrator or set a teacher's Clerk **private metadata**. Neither signup forms nor public/user-editable metadata grant teacher access. See [account setup, data boundaries and API contract](docs/portal-security.md). The current provisioned Clerk application is a development instance; production deployment on Vercel does not change that authentication status. A production Clerk instance/domain is required before describing the authentication setup as production-ready.

Use Node.js 22: `npm ci`, configure `.env.local` from `.env.example`, then `npm run db:migrate`. `npm run dev` starts the local site at `http://127.0.0.1:3040`. `npm test` checks engine, HTTP, authentication, isolation and UI behavior; `npm run build` bundles only public assets and the public Clerk client. Secret keys and database URLs stay server-side. The pure analysis engine still works independently without Clerk, Neon or model credentials.

For a live teacher presentation, see the [six synthetic classroom scenarios and two-minute bilingual walkthrough](docs/classroom-demo.md). The operator-only seed command targets a verified administrator classroom, labels synthetic records explicitly, and preserves existing data when rerun. It creates no Clerk login accounts.

The website now defaults to English while preserving an explicit Chinese choice. The [learning-science navigation layer](docs/learning-science.md) combines assessment, deadlines, teacher feedback, progress, habits and explicitly linked goals into a 14-day route. Each block explains what, why now, when, how, duration and next review; saving new information replans the route. [Apple Health simulation](docs/apple-health.md) offers clearly synthetic sleep and blood-oxygen examples: short sleep reduces only today’s planned load, and oxygen is display-only. There is no live Apple Health connection or real health-data upload.

The dated route uses **Priority = Weakness × Impact × Urgency** as its primary topic order. Weakness is the gap to the student's reference target, Impact is the configured course weight, and Urgency comes from the nearest upcoming relevant deadline. Teacher guidance, progress and linked goals break equal-priority ties; they cannot override a higher formula score. Missing scores remain unknown. See the [rules, intervals and API contract](docs/learning-science.md).

The [interactive route demo](https://studygps-five.vercel.app/demo.html#navigation-demo) runs this same planner with fictional students. Change the assessment, deadline, synthetic sleep or feedback; simulate completion to see the next step. `GET /api/navigation-demo` accepts only documented scenario choices and never reads or changes account records. Its clock is explicitly fixed to noon on the current Sydney calendar date, so it can be presented at any time of day. Private routes use actual time.

[Pocket TTS study guides](docs/voice.md) are four real, pre-generated English audio files with Chinese transcripts, playback speed, pause and error recovery. Personal dates and priority remain in the live task, not in these public recordings. No live TTS service, microphone recording or voice cloning is used.

The separate bilingual [pricing page](https://studygps-five.vercel.app/pricing.html) presents proposed USD Silver ($29.99), Gold ($44.99) and Platinum ($79.99) subscriptions and an illustrative cost calculator. These are planned offers: checkout, billing, paid-tier enforcement, premium model routing and premium channels are not connected. The cost ranges are assumptions rather than measured margins.

See the [product audit and repeatable presentation flow](docs/product-audit.md) for screen-by-screen findings, corrections, final scores and verification limits.

## Thermodynamics demo and API

The public Analysis / Study Plan Engine demo is available at **[studygps-five.vercel.app/demo.html](https://studygps-five.vercel.app/demo.html)**. Choose [English](https://studygps-five.vercel.app/demo.html?lang=en) or [中文](https://studygps-five.vercel.app/demo.html?lang=zh). It includes localized explanations, errors, dates and four micro-exercises, a time-budget comparison using matched scores, a same-score/different-route demonstration and exact reassessment changes. The public demo is stateless and does not access private account records.

Call `POST /api/study-plan` with `{ input, course, previous_plan }` to use the same engine from n8n over HTTP. The API remains locale-neutral: UI translation never mutates the canonical task identity, content or comparison baseline. Learning translations are tied to fixed source signatures, so changed resources do not silently receive old activities.

Core-only checks remain available through `node --test engine/tests/*.test.js` without package installation. Account features require the dependencies and environment configuration described above.

See [the engine contract](engine/README.md), [English handoff](engine/HANDOFF.en.md), [中文交接](engine/HANDOFF.md), [bilingual demo guide](engine/DEMO-GUIDE.md), [originality research](engine/NOVELTY.md), and [earlier engine deployment record](engine/DEPLOYMENT.md). The website calls real APIs; n8n/Calendar/Gmail execution is still unverified. There are no LLM/RAG calls, grade-gain predictions or claims of worldwide novelty. The [hero artwork record](docs/hero-art.md) contains the exact built-in image-generation prompt and saved asset details.

## Original starter reference

The sections below document the original priority-only starter in `src/priority.js`. Its simpler formula and planned input form describe that legacy module, not the current time-aware engine and hosted interface above. Existing starter files are preserved.

## Problem

Students receive grades from quizzes, assignments, exams, and topic tests. These grades show how they performed, but do not always show what they should study next. A low score in an important topic may need more attention than a small gap in another topic.

## Solution

StudyGPS compares each topic's current score with a target score, then considers how much the topic matters. It returns a study list with the highest-priority topics first.

## How StudyGPS works

1. A student enters a topic, current score, target score, and importance.
2. StudyGPS calculates the gap between the current and target scores.
3. It multiplies that gap by the topic's importance.
4. It ranks all topics from highest to lowest priority.
5. The student starts with the topic at the top of the list.

The local priority engine and tests work now. The n8n integration and student input form are planned.

## Priority formula

```text
Weakness = max(Target Score - Current Score, 0)
Priority = Weakness × Importance
```

Use scores from 0 to 100 and importance weights from 0 to 1. Use the same scale for all topics being compared. A topic at or above its target has zero weakness and zero priority, and stays in the returned list. Topics with equal priority keep their input order.

The engine expects valid data. The planned n8n workflow will validate inputs before calculation.

## Example

| Topic | Current | Target | Importance | Weakness | Priority |
| --- | ---: | ---: | ---: | ---: | ---: |
| Calculus | 55 | 80 | 0.30 | 25 | 7.5 |
| Circuits | 70 | 80 | 0.40 | 10 | 4 |
| Programming | 75 | 80 | 0.20 | 5 | 1 |

Study order: **Calculus → Circuits → Programming**.

For example, Calculus has a weakness of `80 - 55 = 25`, so its priority is `25 × 0.30 = 7.5`.

The sample file includes five university topics, including one already above its target.

## Planned n8n workflow

```text
Student input
    ↓
n8n receives and validates data
    ↓
Calculate weakness and priority
    ↓
Rank topics
    ↓
Generate short study recommendations (optional AI)
    ↓
Return, store, or send the updated StudyGPS plan
```

n8n is the automation layer. It will connect the input, calculation, and delivery steps. The priority calculation stays simple enough to run in an n8n Code node or be called through a future application endpoint.

See [the architecture](docs/architecture.md), [the hackathon plan](docs/project-plan.md), and [the n8n notes](n8n/README.md).

## Repository structure

```text
studygps/
├── README.md
├── .gitignore
├── .env.example
├── docs/
│   ├── architecture.md
│   └── project-plan.md
├── n8n/
│   └── README.md
├── data/
│   └── sample-grades.json
├── src/
│   └── priority.js
└── tests/
    └── priority.test.js
```

## Run locally

Use **Node.js 22 or newer**. No packages or environment variables are needed.

From the repository root, run the sample calculation:

```bash
node src/priority.js
```

This prints a ranked JSON array using `data/sample-grades.json`. Each result includes the original fields plus `weakness` and `priority`.

Run the tests:

```bash
node --test tests/priority.test.js
```

To reuse the calculation in JavaScript:

```js
const { calculatePriorities } = require('./src/priority');
const grades = require('./data/sample-grades.json');

const studyPlan = calculatePriorities(grades);
console.log(studyPlan);
```

The function returns a new array without changing the input. An empty input array returns an empty array.

## Future features

- A Google Form or small frontend for entering grades.
- An n8n workflow that refreshes the plan when new grades arrive.
- Short study advice for each topic, with optional AI support.
- Email delivery or a simple results page.
- Progress tracking and study reminders.

## Team

- **Team member 1:** [Name] — [Role / GitHub profile]
- **Team member 2:** [Name] — [Role / GitHub profile]
