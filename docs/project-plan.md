# StudyGPS hackathon plan

## MVP

A student submits topic grades and receives a ranked study plan through one working n8n workflow. The plan shows which topic to study first and the score gap behind that choice.

The repository currently provides the calculation engine, sample data, and local tests. The tasks below describe the remaining hackathon build.

## Must-have features

- One input route: a Google Form, small frontend, or webhook demo request.
- Inputs for topic, current score, target score, and importance.
- Validation of required fields, number types, and ranges.
- Weakness and priority calculations using the agreed formula.
- All topics sorted from highest to lowest priority.
- An n8n workflow connecting input, calculation, and output.
- One clear output, such as a webhook response or simple results display.
- A short recommendation based on the highest-ranked topic.
- A saved n8n workflow export and setup notes for the other developer.

## Nice-to-have features

- AI-generated study tips after ranking.
- Email delivery of the plan.
- A simple visual priority chart.
- Study reminders or progress history.

Keep these optional until the complete input-to-output demo works. A rule-based message such as “Study Calculus first; it is 25 points below your target” is enough for the MVP.

## Tasks for two developers

These are work areas, with no developer names assigned yet.

| Work area | Tasks | Handoff |
| --- | --- | --- |
| Developer slot 1: priority logic and results | Maintain the formula and tests, define the result fields, prepare the sample plan, build a small results display only if needed | Example input and expected output |
| Developer slot 2: n8n and input | Set up one input route, validate data, reproduce the calculation in a Code node, connect output, export the workflow | A working workflow and setup notes |
| Shared integration | Compare n8n results with the local engine, test invalid and empty input, rehearse the demo, update the README | One repeatable end-to-end demo |

Agree on the input fields and output array before building the integration. Choose only one input route and one output route for the MVP.

## Build order

1. Run the local sample and tests together.
2. Agree on the input and output format.
3. Build the n8n input, validation, calculation, and response steps.
4. Verify the workflow matches the local sample results.
5. Add a short recommendation and polish the demo.
6. Export the workflow to `n8n/` and document how to run it.

## Demo flow

1. Explain the problem: grades do not tell students what to study next.
2. Submit the five topics from `data/sample-grades.json`.
3. Show n8n receiving and processing the data.
4. Show the ranking: Calculus (7.5), Linear Algebra (5), Circuits (4), Programming (1), Engineering Mechanics (0).
5. Explain why Calculus is first and why Engineering Mechanics has zero priority.
6. Update Calculus from 55 to 78 and submit again. Its priority becomes 0.6, so Linear Algebra moves to the top.
7. Show the updated recommendation and close with the next feature the team would build.

## MVP completion check

The MVP is ready when one real input passes through n8n, produces the expected ranked plan, and reaches the chosen output. Passing local tests alone does not complete the automation demo.
