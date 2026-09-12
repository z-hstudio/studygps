# StudyGPS originality check

Checked on 2026-09-12, Australia/Sydney. Purpose: support the supplied judging scorecard's Track 2 A8 originality criterion, worth 20 points. This is a bounded review of four public first-party product/template descriptions, not an exhaustive market search or an independent product test.

## Finding

Study planners, personalized learning, task prioritization, and n8n study-plan-to-calendar workflows already exist. StudyGPS should demonstrate its particular combination of transparent assessment analysis, a strict revision-time budget, and explicit changes between plans. These sources do not establish that the combination is globally unique.

## Four relevant existing offerings

| Offering and direct source | What its official page currently describes | Implication for StudyGPS |
| --- | --- | --- |
| [Shovel study planner](https://shovelapp.io/) | Imports a syllabus PDF or syncs supported school platforms, organizes study tasks, finds available study time, and supports scheduling tasks and adjusting the schedule. | Study scheduling, time awareness, and student-specific positioning alone are established features. Demonstrate how observed topic scores determine the next revision task. |
| [Quizlet Learn](https://help.quizlet.com/hc/en-us/articles/360030986971-Studying-with-Learn) | Creates a personalized learning path using session goals and familiarity with a study set; offers question-type and answer-language settings where applicable. | Personalized or adaptive study and language options alone are not sufficient novelty claims. Demonstrate the visible score-gap calculation, allocation limits, and reassessment comparison. |
| [Reclaim 2.0 Tasks overview](https://help.reclaim.ai/en/articles/16558552-reclaim-2-0-tasks-overview) | Uses task metadata, deadlines, priorities, calendar context, and stated preferences to recommend 3–5 relevant tasks or identify at-risk work. Its 2.0 description distinguishes this from individual-task calendar autoscheduling and refers users seeking that behavior to Reclaim 1.0. | Do not claim that recommending what to work on next or adapting to context is new. Focus StudyGPS on educational assessment evidence and its reproducible, inspectable rules. Do not conflate Reclaim versions. |
| [n8n study scheduling template by Incrementors](https://n8n.io/workflows/16028-plan-daily-study-schedules-with-gpt-4o-mini-google-calendar-sheets-and-gmail/) | Collects exam and availability details through a form, uses GPT-4o-mini to create a daily plan, creates Google Calendar study events, logs sessions in Google Sheets, and emails the schedule through Gmail. | The proposed Form → AI plan → Calendar → Sheets → Gmail chain already has a published community template. It cannot be presented as StudyGPS's original invention. |

The n8n source is a creator-published template listing on n8n's own platform. Its description was inspected; its workflow was not imported or executed. The other sources describe their own products; their performance and marketing claims were not independently validated.

## What StudyGPS can demonstrate honestly

These are claims about our implementation, not claims that competitors cannot do the same things.

1. **Same aggregate result, different next action.** The supplied Alex and Sarah first assessments both calculate to 63.5 under the configured weights. Their topic-score distributions produce different first tasks: Rankine Cycle and First Law. This demonstrates why a single total score does not identify the next revision task. Evidence: `engine/examples/*.input.json`, `engine/analyse-performance.js` and the generated outputs.
2. **A visible, deterministic decision rule.** Display observed score → reference-target gap → configured importance and duration → priority. Allocate whole 30-minute blocks in ranked order, cap each topic at its configured estimate, and never exceed the total budget. Explain partial or deferred work. The weights and durations are demo assumptions; the formula is not a validated optimal-learning algorithm.
3. **Reassessment changes that downstream tools can act on.** Stable task IDs and explicit additions, removals, order, duration, resource, and activity changes make the intended update inspectable. Changing only an assessment ID or explanatory wording does not mark executable tasks as changed. Evidence: `engine/generate-plan.js`, `engine/compare-plans.js`, and corresponding tests.
4. **A clear n8n boundary.** The same calculation is available locally, as a generated standalone Code node, and through the hosted HTTP API. It requires no model key. This is a reproducibility and handoff property, not proof of a completed n8n/Calendar/Gmail integration.
5. **English/Chinese use as a product improvement.** The interface and demo activities now have both locales, with localized explanations, errors and dates. Source references, numerical values, stable IDs and the calendar-facing contract are preserved. DOM regression checks cover these behaviors; real user usability and visual verification are separate evidence. This is a product accessibility improvement, not a new learning method.

## Claims to avoid and evidence still needed

- Do not say “the first AI study planner,” “no similar solution exists,” “uniquely adaptive,” or “adding RAG makes it novel.” The pages above already show significant overlap with the broader concept.
- Describe task IDs and diffs as **enabling selective downstream updates**. Avoid claiming measured calendar-churn reduction, zero duplicates, or live idempotency until the n8n teammate demonstrates persisted event mapping and repeat-run behavior in a real workflow.
- A competitor page not documenting an exact feature is not proof that the feature is absent. No paid accounts, internal algorithms, complete template source, or comprehensive competitor catalogue were inspected.
- The strongest next evidence is a recorded demonstration using actual engine results: Alex versus Sarah, a smaller time budget, Alex's second assessment, an unchanged-plan repeat, and a resource change. Label any downstream simulation clearly.
- Add a short real user evaluation of whether students can identify their next task and understand the reason. Do not convert usability observations into predicted exam-score improvements.

Suggested positioning: **“StudyGPS turns topic assessment results into an explainable revision plan within a fixed time budget, and tells connected tools exactly what changed after the next assessment.”** This describes a demonstrable product focus without asserting worldwide novelty.
