# StudyGPS

StudyGPS turns topic assessment results into an explainable revision plan within a fixed time budget, with an adapter for n8n.

Built as a starting point for the n8n University Hackathon.

## Thermodynamics demo and API

The Analysis / Study Plan Engine is available at **[studygps-five.vercel.app](https://studygps-five.vercel.app)**. Choose [English](https://studygps-five.vercel.app/?lang=en) or [中文](https://studygps-five.vercel.app/?lang=zh). The website includes localized explanations, errors, dates and four micro-exercises, a time-budget comparison using matched scores, a same-score/different-route demonstration and exact reassessment changes. Locale preferences persist locally; scores and plans are not stored by the application.

Call `POST /api/study-plan` with `{ input, course, previous_plan }` to use the same engine from n8n over HTTP. The API remains locale-neutral: UI translation never mutates the canonical task identity, content or comparison baseline. Learning translations are tied to fixed source signatures, so changed resources do not silently receive old activities.

Use Node.js22 and run `npm ci` once for the jsdom development test dependency. Then `npm run dev` starts the local page, `npm test` runs all tests, and `npm run build` builds static assets. The engine and deployed runtime require no third-party runtime packages or model keys. Core-only checks remain available through `node --test engine/tests/*.test.js` without package installation.

See [the engine contract](engine/README.md), [English handoff](engine/HANDOFF.en.md), [中文交接](engine/HANDOFF.md), [bilingual demo guide](engine/DEMO-GUIDE.md), [originality research](engine/NOVELTY.md), and [deployment verification record](engine/DEPLOYMENT.md). The website calls a real API; n8n/Calendar/Gmail integration is still unverified. There are no LLM/RAG calls, persistent accounts, grade-gain predictions or claims of worldwide novelty.

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
