# StudyGPS architecture

StudyGPS has a small calculation engine and a planned n8n automation workflow.

```text
Student
   ↓
Google Form / Frontend
   ↓
n8n
   ↓
StudyGPS Priority Engine
   ↓
Ranked Study Plan
   ↓
Student
```

## Student input

Each topic contains:

| Field | Meaning |
| --- | --- |
| `topic` | The subject or topic name |
| `currentScore` | The student's current score, from 0 to 100 |
| `targetScore` | The student's target score, from 0 to 100 |
| `importance` | How much the topic matters, on a scale from 0 to 1 |

The form or frontend collects these values. Use fictional data for the demo.

## n8n responsibilities

- Receive grade data from a form or frontend.
- Check that the input is an array of topics with non-empty names and finite numeric values in the expected ranges.
- Run the priority logic when new data arrives.
- Optionally add short study advice after ranking.
- Return, store, or send the ranked plan using the chosen demo output.
- Return a clear message when input is invalid.

n8n owns the connections and automation between these steps. The MVP can reproduce the small calculation in a Code node. A separate API is not needed for the first demo.

## Application responsibilities

- Keep the priority formula in `src/priority.js` easy to understand and test.
- Calculate `weakness = Math.max(targetScore - currentScore, 0)`.
- Calculate `priority = weakness * importance`.
- Return all topics in descending priority order, with their weakness and priority.
- Provide the input form and results display if the team chooses to build a small frontend.

The current engine expects validated data. It does not make network requests, store student records, or generate AI advice. Input validation belongs to the planned workflow boundary.

If the logic is copied into n8n, check it against the same sample data and expected rankings. Optional AI advice should explain the plan without changing its calculated order.

## Current scope

The repository includes the local engine, sample data, and basic tests. The form, n8n workflow, and delivery step are not implemented yet. Authentication, a database, and a large frontend framework are outside this starting scope.
