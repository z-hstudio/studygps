# n8n workflows

Exported n8n workflow JSON files will be stored in this directory later. No workflow export is included yet.

## Intended workflow

1. **Receive student grade data.** Start with one form integration or webhook input.
2. **Validate data.** Require an array of topic objects, non-empty topic names, finite numeric scores from 0 to 100, and importance from 0 to 1. Return a clear error for invalid data; an empty array can return an empty plan.
3. **Calculate weakness.** Use `Math.max(targetScore - currentScore, 0)` for each topic.
4. **Calculate priority.** Multiply weakness by importance.
5. **Sort topics.** Put the highest priority first and keep all topics, including those with zero priority.
6. **Optionally use AI for short study advice.** Base advice on the ranked results. The basic demo can use a short rule-based message without AI.
7. **Return, store, or send the ranked study plan.** Choose one output route for the MVP.

The calculation should match `src/priority.js`. A Code node can reproduce this small function; there is no need to build a separate service yet. Keep the order of tied topics unchanged and preserve the original input fields in the output.

## Data contract

Use `data/sample-grades.json` as the input example. Each topic has `topic`, `currentScore`, `targetScore`, and `importance`.

Return a ranked array with those fields plus `weakness` and `priority`. For example:

```json
[
  {
    "topic": "Calculus",
    "currentScore": 55,
    "targetScore": 80,
    "importance": 0.3,
    "weakness": 25,
    "priority": 7.5
  }
]
```

## When adding a workflow

- Start with one workflow and one input-to-output path.
- Compare its results with `node src/priority.js` using the same sample data.
- Document the trigger, expected payload, output, and any setup steps.
- Export the workflow JSON here after the end-to-end demo works.
- Before committing an export, remove real student data, pinned execution data, and any embedded secrets. Configure credentials through n8n.
