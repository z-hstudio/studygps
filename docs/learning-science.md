# Learning navigation and learning science

StudyGPS now connects current assessment → stated destination → a 14-day route → replanning after updated information. The existing deterministic assessment engine and n8n bundle are unchanged. `server/navigation.js` adds a calendar and study-method layer, using `server/study-priority.js` for the new route formula; `web/navigation-ui.js` presents it in English and Chinese.

## Research and implementation

| Reference | What informs the product | Actual implementation |
| --- | --- | --- |
| [UC Berkeley: Neuroscience and How Students Learn](https://gsi.berkeley.edu/gsi-guide-contents/learning-theory-research/neuroscience/) | Active participation and adequate rest support learning. | Tasks require students to try, check, correct and take a break; availability stays between 06:00 and 22:00. |
| [UC Berkeley: Cognitive Science, Memory and Learning](https://gsi.berkeley.edu/gsi-guide-contents/learning-theory-research/memory/) | Retrieval, meaningful connections and staged work; fixed learning-style matching lacks evidence. | Closed-note recall, practice and checking; explicit goal links; flexible explain/diagram/practice preferences. |
| [Cepeda et al., 2006: Distributed practice in verbal recall tasks](https://pubmed.ncbi.nlm.nih.gov/16719566/) | Spacing can help retention; suitable gaps depend on the retention interval. | Target review gaps of 1, 3 and 7 days, moved to feasible study windows and anchored to actual completion. |

These sources are references, not institutional endorsement or a partnership. The chosen focus lengths, breaks, review gaps, night boundary and priority boosts are transparent product defaults. They are not research-validated optimal values, exam-score predictions or guarantees. Preferences are ways to start an activity, not fixed learner types.

## Planning rules

- The **new route’s primary score is Priority = Weakness × Impact × Urgency**. Weakness is `max(0, target score − observed score)` in score points. Impact is the configured course importance fraction (e.g. 0.3 = 30%); grading weights are not automatically imported from assessment documents.
- Urgency uses the nearest future topic deadline, including local due time: up to 1 day → 4; up to 3 days → 3; up to 7 days → 2; up to 14 days → 1.5; later or no deadline → 1. Remaining time uses local civil date and time, not a claim of precise elapsed hours across daylight-saving changes. For example, a 15-point gap × 30% impact × 3 urgency gives priority 13.5.
- For **equal formula scores**, context contributes +5 for teacher focus in the last 30 days, +3 for student-entered feedback topics, +2 for explicitly linked semester topics and +1 for career topics. Self-reported progress adds +1 for not started and subtracts 1 for confident. Remaining ties use course order. These context points do not change or override the displayed formula score; they also inform task instructions.
- Unknown scores keep weakness and priority null. They create a separate diagnostic queue after observed gaps and before zero-gap maintenance; they are never treated as zero-score remediation. Completed legacy course tasks start with a retrieval check.
- Reserve initial focus blocks in priority order, then successive review waves. Use only the learner’s selected weekdays and local study windows, reserving five-minute breaks too. No overlapping blocks, no past start times, no deadline-bound sessions after their deadlines, and no nighttime overflow.
- Reviews are provisional until earlier work is done. The completion API requires the preceding block to be completed and at least a new local calendar day before a review can be completed. Missed reviews move forward without stacking the same topic’s review chain on one day.
- Show unscheduled work explicitly if it cannot fit the 14-day horizon or a deadline. Past deadlines produce a prompt to update requirements, not a claim that they can still be met.
- Each task includes its topic, evidence for priority, date/time, method and steps, focus/break minutes, resource, and next scheduled review date (or an explicit absence).

This is a small rolling route, not a claim to finish every estimated course hour. The original assessment-only plan and public engine demo remain available as a separate legacy reference, with their existing budget-based formula and n8n contract. Focus-block completion is recorded separately from those course tasks and from assessment results. A new assessment creates new session IDs; changing context preserves completion records for the current assessment. Completed blocks, including earlier assessments on the same day, consume the daily route budget. Reopening earlier work keeps existing later completion history visible.

The route is rebuilt on authenticated reads and after saves to context, scores, task completion or teacher guidance. The UI refreshes after mutations and on returning to the page, preserving unsaved form edits. There is no scheduled background push, automatic LMS/calendar import or newly verified n8n execution.

## API and data

`studygps_navigation` stores one context and an atomic completion map per student. `save-navigation-context` and `complete-navigation-session` are student-only actions. Teachers read only assigned learners after the existing authorization check. No browser local storage contains personal context, health scenarios or completion records; only locale preferences use local storage.

Optional `healthDemo` selects a synthetic scenario; see [Apple Health demo and future connection](apple-health.md). No real health data is accepted. The short-sleep scenario reduces only today’s available budget and focus length, while preserving deadline ordering and future availability.

## Running and presenting

```sh
npm test
npm run build
npm run db:migrate
node --env-file=.env.local scripts/seed-navigation-demo.js --classroom-id <owned-demo-classroom-uuid>
node --env-file=.env.local scripts/seed-navigation-demo.js --classroom-id <owned-demo-classroom-uuid> --apply
npm run dev
```

The seed verifies the configured administrator’s verified Clerk identity and existing synthetic classroom membership. It adds context only where absent, without overwriting existing student work. Demo deadlines are dated relative to the seed day and should be refreshed explicitly before a later event.

For a live presentation: open a synthetic student in the teacher’s classroom, show the context and why-now evidence, then use a QA/student account to edit a deadline or health simulation. Saving should visibly change the route; completing the first focus block should preserve its timestamp and set up future retrieval reviews. Switch language using the locale control. A fresh visit defaults to English; `?lang=zh` or a saved Chinese choice remains Chinese.
