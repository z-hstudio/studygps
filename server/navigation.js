'use strict';

// A calendar layer around the unchanged assessment engine. All ranking boosts,
// focus lengths and review intervals are product rules, not efficacy estimates.
const { createHash } = require('node:crypto');
const course = require('../engine/examples/course.json');
const { calculateStudyPriority } = require('./study-priority');
const pair = (zh, en) => ({ zh, en });
const NAMES = {
  first_law: pair('第一定律', 'First law'), second_law: pair('第二定律', 'Second law'),
  entropy: pair('熵', 'Entropy'), rankine_cycle: pair('朗肯循环', 'Rankine cycle'),
};
const PRACTICE = {
  first_law: pair('画出系统边界，写出能量平衡式，检查热量和功的正负号。', 'Draw the system boundary, write the energy balance, and check the signs of heat and work.'),
  second_law: pair('计算热机效率上限，并解释一个看似合理的效率为什么不可能。', 'Calculate a heat engine’s efficiency limit and explain why a plausible efficiency may be impossible.'),
  entropy: pair('完成一道熵变计算，核对单位，再检查总熵变化。', 'Solve one entropy-change problem, check the units, then check the total entropy change.'),
  rankine_cycle: pair('凭记忆标出循环的四个装置，计算净功、输入热量和效率。', 'Label the four cycle devices from memory, then calculate net work, heat input and efficiency.'),
};
const METHODS = {
  practice: pair('主动回忆 → 动手解题 → 核对并修正', 'Recall → solve a problem → check and correct'),
  explain: pair('主动回忆 → 用自己的话讲解 → 核对并修正', 'Recall → explain in your own words → check and correct'),
  diagram: pair('主动回忆 → 画出关系 → 核对并修正', 'Recall → draw the relationships → check and correct'),
  mixed: pair('主动回忆 → 解题并讲解或画图 → 核对并修正', 'Recall → solve, explain or sketch → check and correct'),
};
function localParts(value, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(value).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const addDays = (date, amount) => new Date(Date.parse(`${date}T12:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
const later = (a, b) => a > b ? a : b;

function buildNavigation({ learning, profile = {}, context = null, progress = {}, advice = [], now = new Date() }) {
  const timestamp = new Date(now);
  let timezone = profile.timezone || 'Australia/Sydney';
  try { localParts(timestamp, timezone); } catch { timezone = 'Australia/Sydney'; }
  const current = localParts(timestamp, timezone);
  const result = {
    version: 1, generatedAt: timestamp.toISOString(), timezone, horizonDays: 14,
    windowStart: current.date, contextComplete: Boolean(context), sessions: [], warnings: [], signals: [],
    summary: {
      what: pair('先记录目前的成绩与目标。', 'Start with your current assessment and destination.'),
      when: pair('填写真实空闲时段和考试、作业时间。', 'Add your actual availability and exam or assignment deadlines.'),
      how: pair('先尝试回忆，再动手练习，核对后间隔复习。', 'Retrieve from memory, practise, check, and return for spaced review.'),
    },
  };
  if (!learning?.plan) result.warnings.push(pair('先保存一次测评；不确定的知识点可以留空，再安排检查理解。', 'Save an assessment first; leave unknown scores blank to plan a check of your understanding.'));
  if (!context) result.warnings.push(pair('保存目标与可用时间后，才会安排具体学习时段。', 'Save your goals and availability before scheduling study blocks.'));
  if (!learning?.plan || !context) return result;

  const health = require('./health-demo').buildHealthDemo({ scenario: context.healthDemo || 'off', date: current.date });
  result.health = health;

  const availability = context.availability;
  const completedTasks = new Set(learning.completedTaskIds || []);
  const completeTopics = new Set((learning.plan.priorities || []).filter(task => completedTasks.has(task.task_id)).map(task => task.topic_id));
  const deadlineKey = deadline => `${deadline.dueDate}T${deadline.dueTime}`;
  const activeDeadlines = context.deadlines.filter(deadline => deadlineKey(deadline) > `${current.date}T${current.time}`)
    .sort((a, b) => deadlineKey(a).localeCompare(deadlineKey(b)) || a.id.localeCompare(b.id));
  for (const deadline of context.deadlines.filter(item => !activeDeadlines.includes(item))) {
    result.warnings.push(pair(`“${deadline.title}”的截止时间已过，请更新要求或联系老师；路线不会声称已经赶上。`, `The deadline for “${deadline.title}” has passed. Update the requirement or contact your teacher; this route cannot recover a missed deadline.`));
  }
  const recentAdvice = [...advice].filter(note => {
    const age = timestamp - new Date(note.createdAt);
    return Number.isFinite(age) && age >= 0 && age <= 30 * 86400000;
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  // Assessment-scoped IDs survive context edits, reprioritization and midnight.
  const assessment = createHash('sha256').update(String(learning.plan.assessment_id || learning.updatedAt || JSON.stringify(learning.scores))).digest('hex').slice(0, 16);
  const idFor = (topicId, suffix) => `nav:${assessment}:${topicId}:${suffix}`;
  const candidates = course.topics.map((topic, index) => {
    const id = topic.topic_id;
    const analysis = learning.plan.topic_analysis.find(item => item.topic_id === id) || {};
    const known = typeof analysis.observed_score === 'number';
    let contextRank = 0;
    const deadline = activeDeadlines.find(item => item.topicIds.includes(id)) || null;
    const priority = calculateStudyPriority({ observedScore: known ? analysis.observed_score : null, targetScore: learning.targetScore, impact: topic.importance, deadline, current });
    const why = [];
    if (known) why.push(pair(`已记录成绩 ${analysis.observed_score}，参考目标 ${learning.targetScore}。优先级 = 薄弱程度 × 课程影响 × 截止紧迫度。`, `Recorded score ${analysis.observed_score}; reference target ${learning.targetScore}. Priority = Weakness × Impact × Urgency.`));
    else {
      why.push(pair('尚无这个知识点的成绩，先检查理解，不把缺失成绩当作零分。', 'No score is recorded for this topic. Check understanding first; an unknown score is not zero.'));
    }
    if (deadline) {
      why.push(pair(`“${deadline.title}”将于 ${deadline.dueDate} ${deadline.dueTime} 截止，先安排相关准备。`, `“${deadline.title}” is due ${deadline.dueDate} at ${deadline.dueTime}; make room for the related preparation.`));
    }
    const teacher = recentAdvice.find(note => note.focusTopic === id);
    if (teacher) {
      contextRank += 5;
      why.push(pair(`老师最近 30 天的重点反馈：${teacher.message}`, `Teacher focus from the last 30 days: ${teacher.message}`));
    }
    const generalAdvice = recentAdvice.find(note => !note.focusTopic);
    if (generalAdvice) why.push(pair(`老师近期的整体建议：${generalAdvice.message}`, `Recent general teacher guidance: ${generalAdvice.message}`));
    if (context.feedbackTopics.includes(id)) {
      contextRank += 3;
      why.push(pair(`你标记了相关反馈${context.feedback ? `：${context.feedback}` : '，需要跟进。'}`, `You flagged feedback on this topic${context.feedback ? `: ${context.feedback}` : ' for follow-up.'}`));
    }
    if (context.goalTopics.includes(id)) {
      contextRank += 2;
      why.push(pair(`你将它关联到本学期目标${context.semesterGoal ? `：${context.semesterGoal}` : '。'}`, `You linked this topic to your semester goal${context.semesterGoal ? `: ${context.semesterGoal}` : '.'}`));
    }
    if (context.careerTopics.includes(id)) {
      contextRank += 1;
      why.push(pair(`你将它关联到长期方向${context.careerGoal ? `：${context.careerGoal}` : '。'}`, `You linked this topic to your longer-term direction${context.careerGoal ? `: ${context.careerGoal}` : '.'}`));
    }
    if (context.topicProgress[id] === 'not_started') {
      contextRank += 1;
      why.push(pair('你记录为“还没开始”，从基础概念起步。', 'You marked this as not started; begin with the foundation.'));
    } else if (context.topicProgress[id] === 'confident') {
      contextRank -= 1;
      why.push(pair('你感觉比较有把握，用闭卷检查验证；自信不会覆盖测评结果。', 'You feel confident; verify with a closed-book check. Confidence does not replace assessment evidence.'));
    } else why.push(pair('你记录为“正在学习”，下一步把理解用在练习上。', 'You marked this as still learning; apply your understanding in practice.'));
    const legacyComplete = completeTopics.has(id);
    if (legacyComplete) why.push(pair('对应课程任务已完成，先做回忆检查，不重复安排同一个完整任务。', 'The course task is complete. Start with a retrieval check instead of repeating the full task.'));
    const relevant = !known || analysis.target_gap > 0 || deadline || teacher || context.goalTopics.includes(id) || context.careerTopics.includes(id) || context.feedbackTopics.includes(id) || context.topicProgress[id] === 'not_started' || legacyComplete;
    return { topic, index, known, priority, contextRank, why, deadline, legacyComplete, relevant };
  }).filter(item => item.relevant).sort((a, b) => {
    // Unknown evidence remains a diagnostic queue, after scored gaps and before
    // maintenance work. It never receives an invented numeric weakness/score.
    if (a.priority.score === null && b.priority.score !== null) return b.priority.score > 0 ? 1 : -1;
    if (b.priority.score === null && a.priority.score !== null) return a.priority.score > 0 ? -1 : 1;
    const difference = a.priority.score === null ? b.priority.urgency - a.priority.urgency : b.priority.score - a.priority.score;
    const tolerance = 8 * Number.EPSILON * Math.max(Math.abs(a.priority.score || 0), Math.abs(b.priority.score || 0));
    return Math.abs(difference) <= tolerance ? b.contextRank - a.contextRank || a.index - b.index : difference;
  });

  const spentByDate = new Map();
  for (const [id, record] of Object.entries(progress)) {
    if (!id.startsWith('nav:') || !record?.completed || !Number.isFinite(Date.parse(record.completedAt)) || new Date(record.completedAt) > timestamp) continue;
    const date = localParts(new Date(record.completedAt), timezone).date;
    const duration = Number.isFinite(record.durationMinutes) && record.durationMinutes > 0 ? record.durationMinutes : context.focusMinutes;
    spentByDate.set(date, (spentByDate.get(date) || 0) + duration + 5);
  }
  const slots = Array.from({ length: 14 }, (_, offset) => {
    const date = addDays(current.date, offset);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
    const start = minutes(availability.startTime);
    const budget = offset ? availability.minutesPerDay : Math.floor(availability.minutesPerDay * health.adjustment.todayBudgetFactor / 5) * 5;
    return { date, start: offset ? start : Math.max(start, Math.ceil((minutes(current.time) + 1) / 5) * 5), end: start + budget, remaining: Math.max(0, budget - (spentByDate.get(date) || 0)), enabled: availability.days.includes(weekday) };
  });
  function reserve(duration, earliest, deadline) {
    if (!earliest) return null;
    for (const slot of slots) {
      if (!slot.enabled || slot.date < earliest) continue;
      const end = slot.date === deadline?.dueDate ? Math.min(slot.end, minutes(deadline.dueTime)) : slot.end;
      if (deadline && slot.date > deadline.dueDate) continue;
      // Reserve the break as well: the displayed block always fits the window.
      const actualDuration = slot.date === current.date && health.adjustment.focusCapMinutes ? Math.min(duration, health.adjustment.focusCapMinutes) : duration;
      if (slot.start + actualDuration + 5 > end || actualDuration + 5 > slot.remaining) continue;
      const selected = { date: slot.date, time: clock(slot.start), durationMinutes: actualDuration };
      slot.start += actualDuration + 5;
      slot.remaining -= actualDuration + 5;
      return selected;
    }
    return null;
  }
  const completion = id => {
    const value = progress[id];
    if (!value?.completed || !Number.isFinite(Date.parse(value.completedAt)) || new Date(value.completedAt) > timestamp) return null;
    return { ...localParts(new Date(value.completedAt), timezone), completedAt: value.completedAt, ...(Number.isFinite(value.durationMinutes) && value.durationMinutes > 0 ? { durationMinutes: value.durationMinutes } : {}) };
  };
  const makeSession = (candidate, suffix, kind, earliest, reviewNumber = 0) => {
    const topicId = candidate.topic.topic_id;
    const id = idFor(topicId, suffix);
    const done = completion(id);
    const requestedDuration = kind === 'review' ? Math.min(15, context.focusMinutes) : context.focusMinutes;
    const slot = done || reserve(requestedDuration, earliest, candidate.deadline);
    const durationMinutes = slot?.durationMinutes || requestedDuration;
    const name = NAMES[topicId];
    const why = [...candidate.why];
    if (!done && slot?.date === current.date && health.scenario === 'short_sleep') why.push(health.message);
    if (kind === 'review') why.push(pair('隔一段时间再尝试回忆，并核对错误。复习间隔会让位于实际空闲时间与截止任务。', 'Return after a gap, retrieve again and check mistakes. Review timing adapts to availability and deadlines.'));
    if (reviewNumber) why.push(pair('这次复习以之前学习的完成时间为依据；尚未完成时，日期是暂定安排。', 'This review is anchored to the earlier block’s completion; until then its date is provisional.'));
    const steps = [pair('先收起笔记，写出你记得的关键概念或解题步骤；不会的地方留个问号。', 'Close your notes. Recall the key idea or solution steps; mark anything you cannot recall.')];
    if (context.preferredMethod === 'explain') steps.push(pair('用自己的话讲给一个刚开始学习的人听，指出每一步为什么成立。', 'Explain it to a beginner in your own words, including why each step works.'));
    else if (context.preferredMethod === 'diagram') steps.push(pair('凭记忆画一张关系图，标注变量、方向与条件。', 'Sketch the relationships from memory, including variables, directions and conditions.'));
    steps.push(PRACTICE[topicId]);
    if (candidate.deadline?.requirements) steps.push(pair(`按你录入的要求检查一次：${candidate.deadline.requirements}`, `Check against the requirements you entered: ${candidate.deadline.requirements}`));
    if (context.careerTopics.includes(topicId) && context.careerGoal) steps.push(pair(`尝试说明这一概念与“${context.careerGoal}”的联系；不确定时请老师核对。`, `Try to explain a connection to “${context.careerGoal}”; ask your teacher to check it if uncertain.`));
    else if (context.interests) steps.push(pair(`尝试用你感兴趣的“${context.interests}”举例，再检查这个类比是否准确。`, `Try an example from your interest in “${context.interests}”, then check whether the analogy is accurate.`));
    steps.push(pair('打开对应练习核对，修正一个错误，记下仍不理解的问题；结束后离开屏幕休息 5 分钟。', 'Check against the topic practice, correct one mistake and record an open question. Then take a 5-minute break away from the screen.'));
    if (kind === 'diagnostic') steps.push(pair('这次是检查理解。完成后在测评中记录实际结果，系统会据此重排路线。', 'This is a diagnostic check. Record the observed result in your assessment to update the route.'));
    return {
      id, topicId, title: pair(`${kind === 'review' ? '回忆复习' : kind === 'diagnostic' ? '检查理解' : '专注练习'} · ${name.zh}`, `${kind === 'review' ? 'Retrieval review' : kind === 'diagnostic' ? 'Check understanding' : 'Focus practice'} · ${name.en}`),
      kind, priority: { ...candidate.priority }, why, date: slot?.date || null, time: slot?.time || null, durationMinutes, breakMinutes: 5,
      completed: Boolean(done), completedAt: done?.completedAt || null,
      deadline: candidate.deadline ? { id: candidate.deadline.id, title: candidate.deadline.title, dueDate: candidate.deadline.dueDate, dueTime: candidate.deadline.dueTime } : null,
      nextReviewDate: null, method: METHODS[context.preferredMethod], steps, resourceRef: candidate.topic.resource_ref,
    };
  };
  // Schedule initial blocks in priority order; then distribute successive review
  // waves across the remaining capacity. A delayed review cannot stack with its
  // predecessor on the same day, even when several target intervals are overdue.
  const chains = candidates.map(candidate => {
    const first = makeSession(candidate, 'learn', candidate.legacyComplete ? 'review' : candidate.known ? 'learn' : 'diagnostic', current.date);
    return { candidate, sessions: [first], anchor: first.date };
  });
  [1, 3, 7].forEach((gap, index) => {
    chains.forEach(chain => {
      const previous = chain.sessions.at(-1);
      const earliest = chain.anchor && previous.date ? later(addDays(chain.anchor, gap), addDays(previous.date, 1)) : null;
      const session = makeSession(chain.candidate, `review-${index + 1}`, 'review', earliest, index + 1);
      chain.sessions.push(session);
    });
  });
  for (const chain of chains) {
    chain.sessions.forEach((session, index) => { session.nextReviewDate = chain.sessions.slice(index + 1).find(next => !next.completed && next.date)?.date || null; });
    chain.sessions.forEach((session, index) => {
      const previous = chain.sessions[index - 1];
      session.prerequisiteId = previous?.id || null;
      session.canComplete = !previous || Boolean(previous.completed && previous.date < current.date);
    });
  }
  result.sessions = chains.flatMap(chain => chain.sessions).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return `${a.date || '9999'}T${a.time || '99:99'}`.localeCompare(`${b.date || '9999'}T${b.time || '99:99'}`);
  });
  const unscheduled = result.sessions.filter(session => !session.date);
  if (!availability.days.length) result.warnings.push(pair('目前没有可用的学习日。请选择真实空闲时间后再安排。', 'No study days are available. Choose real availability before scheduling.'));
  if (unscheduled.length) result.warnings.push(pair(`${unscheduled.length} 个学习或复习时段无法排进未来 14 天的空闲时间及相应截止时间前。请调整时间、范围或截止要求。`, `${unscheduled.length} study or review blocks do not fit available time in the next 14 days before their deadlines. Adjust your availability, scope or deadline requirements.`));
  if (!activeDeadlines.length) result.warnings.push(pair('尚无未来截止任务；当前路线依据成绩、反馈、进度与目标。', 'There are no upcoming deadlines; this route uses assessment, feedback, progress and goals.'));
  if (!candidates.length) result.warnings.push(pair('已记录知识点达到参考目标，当前没有新的重点。可以补充近期要求或用新测评检查理解。', 'Recorded topics meet the reference target and no new focus is flagged. Add upcoming requirements or check understanding with a new assessment.'));
  result.warnings.push(pair('复习日期在学习尚未完成时为暂定安排；完成后会据实更新。保留夜间休息，不用熬夜补满路线。', 'Review dates are provisional until study is completed and update afterwards. Keep time for sleep; do not fill the route by cramming overnight.'));
  if (health.scenario !== 'off') result.warnings.push(health.message);
  const next = result.sessions.find(session => !session.completed && session.date);
  const first = next || result.sessions.find(session => !session.completed);
  if (first) result.summary.what = NAMES[first.topicId];
  result.summary.when = next ? pair(`${next.date} ${next.time}，专注 ${next.durationMinutes} 分钟。`, `${next.date} at ${next.time}, for ${next.durationMinutes} focused minutes.`) : pair('当前没有可安排的时段，请查看需要调整的事项。', 'No block is currently scheduled. Check what needs adjusting.');
  result.summary.how = METHODS[context.preferredMethod];
  result.signals = [
    { label: pair('当前位置', 'Current position'), value: pair(`${learning.plan.overall_score === null ? '测评不完整' : `测评 ${learning.plan.overall_score}%`} · 已完成 ${completedTasks.size} 个课程任务`, `${learning.plan.overall_score === null ? 'Incomplete assessment' : `Assessment ${learning.plan.overall_score}%`} · ${completedTasks.size} course tasks completed`) },
    { label: pair('学期目的地', 'Semester destination'), value: pair(context.semesterGoal || profile.goal || '尚未填写', context.semesterGoal || profile.goal || 'Not set') },
    { label: pair('长期方向', 'Longer-term direction'), value: pair(context.careerGoal || '尚未填写', context.careerGoal || 'Not set') },
    { label: pair('最新路况', 'Route inputs'), value: pair(`${activeDeadlines.length} 项未来截止任务 · ${recentAdvice.length} 条近期老师反馈`, `${activeDeadlines.length} upcoming deadlines · ${recentAdvice.length} recent teacher notes`) },
  ];
  result.totals = { scheduledMinutes: result.sessions.filter(session => session.date && !session.completed).reduce((sum, session) => sum + session.durationMinutes, 0), unscheduledBlocks: unscheduled.length };
  return result;
}

module.exports = { buildNavigation };
