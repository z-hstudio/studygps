'use strict';
const { generateStudyPlan } = require('../engine');
const { buildNavigation } = require('../server/navigation');
const course = require('../engine/examples/course.json');
const INPUTS = {
  alex1: require('../engine/examples/alex-assessment-1.input.json'),
  alex2: require('../engine/examples/alex-assessment-2.input.json'),
  sarah1: require('../engine/examples/sarah-assessment-1.input.json'),
};
const names = { alex1: 'Alex · Assessment 1', alex2: 'Alex · Assessment 2', sarah1: 'Sarah · Assessment 1' };
const TIMEZONE = 'Australia/Sydney';

function demoClock(now) {
  const format = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = (date) => Object.fromEntries(format.formatToParts(date).map(part => [part.type, part.value]));
  const today = parts(new Date(now));
  const date = `${today.year}-${today.month}-${today.day}`;
  const nominalNoon = Date.parse(`${date}T12:00:00Z`);
  const probe = parts(new Date(nominalNoon));
  // Sydney's noon is unambiguous on both DST transition days. Derive that
  // day's UTC offset instead of hard-coding +10/+11 or changing private time.
  const offset = Date.parse(`${probe.year}-${probe.month}-${probe.day}T${probe.hour}:${probe.minute}:00Z`) - nominalNoon;
  return { timestamp: new Date(nominalNoon - offset), simulationClock: { date, time: '12:00', timezone: TIMEZONE } };
}

function createNavigationDemoHandler({ now = () => new Date() } = {}) {
  return function navigationDemo(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(405, { error: 'Use GET to explore synthetic navigation.' }); }
    const query = new URL(req.url, 'https://studygps.invalid').searchParams;
    const choices = { preset: ['alex1', 'alex2', 'sarah1'], urgency: ['none', 'today', 'soon', 'later'], sleep: ['off', 'rested', 'short_sleep', 'no_data'], feedback: ['none', 'units'], completed: ['0', '1'] };
    if ([...query].some(([key, value]) => !Object.hasOwn(choices, key) || !choices[key].includes(value) || query.getAll(key).length > 1)) return send(400, { error: 'Choose only the supported fictional scenarios.' });
    const preset = query.get('preset') || 'alex1';
    const urgency = query.get('urgency') || 'none';
    const healthDemo = query.get('sleep') || 'off';
    const { timestamp, simulationClock } = demoClock(now());
    const { date } = simulationClock;
    const dueDate = new Date(Date.parse(`${date}T12:00:00Z`) + ({ today: 0, soon: 2, later: 20 }[urgency] || 0) * 86400000).toISOString().slice(0, 10);
    const input = INPUTS[preset];
    const plan = generateStudyPlan(input, course);
    const context = {
      semesterGoal: 'Explain energy systems and show clear reasoning', careerGoal: 'Explore sustainable engineering', interests: 'Power stations and energy efficiency',
      preferredMethod: 'mixed', focusMinutes: 25, healthDemo,
      availability: { days: [1, 2, 3, 4, 5, 6, 7], startTime: '18:00', minutesPerDay: 120 },
      goalTopics: [], careerTopics: [], feedback: '', feedbackTopics: [],
      topicProgress: Object.fromEntries(course.topics.map(topic => [topic.topic_id, 'learning'])),
      deadlines: urgency === 'none' ? [] : [{ id: 'demo-second-law-deadline', title: 'Second-law assignment · 第二定律作业', kind: 'assignment', dueDate, dueTime: '21:00', topicIds: ['second_law'], requirements: 'Explain the efficiency limit and show each calculation with units.' }],
    };
    const learning = { scores: input.topic_scores, targetScore: input.target_score, minutes: input.available_minutes, completedTaskIds: [], plan, updatedAt: timestamp.toISOString() };
    const advice = query.get('feedback') === 'units' ? [{ focusTopic: 'entropy', message: 'Check the units and explain what a positive entropy change means. 核对单位，并解释正熵变的含义。', createdAt: timestamp.toISOString() }] : [];
    const args = { learning, profile: { timezone: 'Australia/Sydney' }, context, advice, now: timestamp, progress: {} };
    let navigation = buildNavigation(args);
    if (query.get('completed') === '1') {
      const first = navigation.sessions.find(session => session.canComplete && !session.prerequisiteId);
      if (first) {
        args.progress[first.id] = { completed: true, completedAt: timestamp.toISOString(), durationMinutes: first.durationMinutes };
        navigation = buildNavigation(args);
      }
    }
    return send(200, { source: 'synthetic', persisted: false, simulationClock, learner: names[preset], overallScore: plan.overall_score, context, navigation });
  };
}
module.exports = createNavigationDemoHandler();
module.exports.createNavigationDemoHandler = createNavigationDemoHandler;
