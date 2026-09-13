'use strict';

const { randomBytes, randomUUID } = require('node:crypto');
const { generateStudyPlan } = require('../engine');
const course = require('../engine/examples/course.json');
const { portalError } = require('./errors');

const TOPICS = ['first_law', 'second_law', 'entropy', 'rankine_cycle'];
const NAMES = { first_law: ['热力学第一定律', 'First Law'], second_law: ['热力学第二定律', 'Second Law'], entropy: ['熵', 'Entropy'], rankine_cycle: ['朗肯循环', 'Rankine Cycle'] };
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const invalid = (message) => portalError(400, 'VALIDATION_ERROR', message);
function text(value, label, max, optional = false) {
  if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw invalid(`${label} must be ${optional ? 'at most' : 'between 1 and'} ${max} characters.`);
  return value.trim();
}
function keys(value, allowed) {
  if (!isRecord(value) || Object.keys(value).some((key) => !allowed.includes(key))) throw invalid('Request contains unsupported fields.');
}
function requireRole(actor, role) {
  if (actor.role !== role) throw portalError(403, 'FORBIDDEN', `This action requires a ${role} account.`);
}
function validateNavigationContext(value) {
  const fields = ['semesterGoal', 'careerGoal', 'interests', 'preferredMethod', 'focusMinutes', 'availability', 'goalTopics', 'careerTopics', 'topicProgress', 'feedback', 'feedbackTopics', 'deadlines'];
  keys(value, [...fields, 'healthDemo']);
  if (fields.some((field) => !Object.hasOwn(value, field))) throw invalid('Complete all learning navigation fields.');
  const healthDemo = value.healthDemo === undefined ? 'off' : value.healthDemo;
  if (!['off', 'rested', 'short_sleep', 'no_data'].includes(healthDemo)) throw invalid('Choose a supported synthetic health scenario.');
  const bounded = (entry, label, max) => {
    if (typeof entry !== 'string' || entry.length > max) throw invalid(`${label} must be at most ${max} characters.`);
    return text(entry, label, max, true);
  };
  const topics = (entries, label, required = false) => {
    if (!Array.isArray(entries) || entries.length > TOPICS.length || (required && !entries.length) || new Set(entries).size !== entries.length || entries.some((topic) => !TOPICS.includes(topic))) throw invalid(`${label} must contain unique supported topics.`);
    return [...entries];
  };
  const time = (entry, label) => {
    if (typeof entry !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(entry)) throw invalid(`${label} must use HH:mm.`);
    return Number(entry.slice(0, 2)) * 60 + Number(entry.slice(3));
  };
  if (!['practice', 'explain', 'diagram', 'mixed'].includes(value.preferredMethod)) throw invalid('Choose a supported study method.');
  if (!Number.isSafeInteger(value.focusMinutes) || value.focusMinutes < 15 || value.focusMinutes > 60 || value.focusMinutes % 5) throw invalid('Focus time must be 15–60 minutes in five-minute steps.');
  keys(value.availability, ['days', 'startTime', 'minutesPerDay']);
  const { days, startTime, minutesPerDay } = value.availability;
  if (!Array.isArray(days) || days.length > 7 || new Set(days).size !== days.length || days.some((day) => !Number.isSafeInteger(day) || day < 1 || day > 7)) throw invalid('Available days must be unique ISO weekdays from 1 to 7.');
  if (!Number.isSafeInteger(minutesPerDay) || minutesPerDay < 30 || minutesPerDay > 240 || minutesPerDay % 5) throw invalid('Daily availability must be 30–240 minutes in five-minute steps.');
  const start = time(startTime, 'Availability start time');
  if (start < 360 || start + minutesPerDay > 1320) throw invalid('Study availability must stay between 06:00 and 22:00.');
  keys(value.topicProgress, TOPICS);
  if (TOPICS.some((topic) => !['not_started', 'learning', 'confident'].includes(value.topicProgress[topic]))) throw invalid('Record progress for each supported topic.');
  if (!Array.isArray(value.deadlines) || value.deadlines.length > 12) throw invalid('Add at most 12 deadlines.');
  const ids = new Set();
  const deadlines = value.deadlines.map((deadline) => {
    keys(deadline, ['id', 'title', 'kind', 'dueDate', 'dueTime', 'topicIds', 'requirements']);
    const id = text(deadline.id, 'Deadline ID', 80);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id) || ids.has(id)) throw invalid('Deadline IDs must be unique UUIDs or safe slugs.');
    ids.add(id);
    if (!['exam', 'assignment'].includes(deadline.kind)) throw invalid('Choose an exam or assignment deadline.');
    if (typeof deadline.dueDate !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(deadline.dueDate)) throw invalid('Deadline date must use YYYY-MM-DD.');
    const parsedDate = new Date(`${deadline.dueDate}T00:00:00.000Z`);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== deadline.dueDate) throw invalid('Choose a real calendar date.');
    time(deadline.dueTime, 'Deadline time');
    const title = text(deadline.title, 'Deadline title', 160);
    return { id, title, kind: deadline.kind, dueDate: deadline.dueDate, dueTime: deadline.dueTime, topicIds: topics(deadline.topicIds, 'Deadline topics', true), requirements: bounded(deadline.requirements, 'Deadline requirements', 1000) };
  });
  return {
    semesterGoal: bounded(value.semesterGoal, 'Semester goal', 500),
    careerGoal: bounded(value.careerGoal, 'Career goal', 300),
    interests: bounded(value.interests, 'Interests', 300),
    preferredMethod: value.preferredMethod,
    healthDemo,
    focusMinutes: value.focusMinutes,
    availability: { days: [...days], startTime, minutesPerDay },
    goalTopics: topics(value.goalTopics, 'Semester topics'),
    careerTopics: topics(value.careerTopics, 'Career topics'),
    topicProgress: Object.fromEntries(TOPICS.map((topic) => [topic, value.topicProgress[topic]])),
    feedback: bounded(value.feedback, 'Learning feedback', 1000),
    feedbackTopics: topics(value.feedbackTopics, 'Feedback topics'),
    deadlines,
  };
}
function recommendation(learning, navigation = null) {
  if (!learning) return null;
  if (navigation?.contextComplete && Array.isArray(navigation.sessions)) {
    const pending = navigation.sessions.filter(session => !session.completed);
    const scheduled = pending.filter(session => session.date && session.time);
    const next = scheduled.find(session => session.canComplete !== false) || scheduled[0];
    if (next) {
      const name = NAMES[next.topicId];
      const waiting = next.canComplete === false;
      return {
        topicId: next.topicId, source: 'deterministic-study-navigation',
        reason: {
          zh: `${name[0]}是当前导航中${waiting ? '接下来已排程' : '下一个可执行'}的未完成学习时段。${next.why?.[0]?.zh || '路线已结合当前测评与学习安排重新计算。'}`,
          en: `${name[1]} is the next ${waiting ? 'scheduled' : 'actionable'} unfinished block in the current navigation. ${next.why?.[0]?.en || 'The route reflects the current assessment and study arrangements.'}`,
        },
        action: {
          zh: `按 ${navigation.timezone} 时间，在 ${next.date} ${next.time} 安排 ${next.durationMinutes} 分钟${next.kind === 'review' ? '回忆复习' : next.kind === 'diagnostic' ? '检查理解' : '专注练习'}。${next.steps?.[1]?.zh || '先回忆，再练习并核对错误。'}${waiting ? '此日期为暂定安排；先完成前序学习，并在之后的当地日期回来复习。' : ''}`,
          en: `At ${next.time} on ${next.date} (${navigation.timezone}), spend ${next.durationMinutes} minutes on ${next.kind === 'review' ? 'retrieval review' : next.kind === 'diagnostic' ? 'a diagnostic check' : 'focused practice'}. ${next.steps?.[1]?.en || 'Recall, practise, and check mistakes.'}${waiting ? ' This date is provisional: complete the prerequisite first, then return on a later local day.' : ''}`,
        },
      };
    }
    return {
      topicId: null, source: 'deterministic-study-navigation',
      reason: {
        zh: pending.length ? '当前未完成的学习时段无法排进已填写的空闲时间或截止时间前。' : '当前导航没有尚待完成的学习时段。',
        en: pending.length ? 'The unfinished study blocks do not fit the recorded availability or deadlines.' : 'The current navigation has no unfinished study blocks.',
      },
      action: {
        zh: pending.length ? '与学生核对可用时间、任务范围和截止要求，再更新路线。' : '用新测评检查理解，或补充新的目标和要求后更新路线。完成时段不等于掌握知识。',
        en: pending.length ? 'Review availability, scope and deadline requirements with the learner, then update the route.' : 'Check understanding with a new assessment, or add new goals and requirements. Completing blocks does not establish mastery.',
      },
    };
  }
  const plan = learning.plan;
  const first = plan.priorities[0];
  if (!first) {
    const met = plan.status === 'target_met';
    return {
      topicId: null, source: 'deterministic-study-engine',
      reason: {
        zh: met ? '已记录的知识点已达到你的目标分数。' : '当前成绩或可用时间不足以安排一个 30 分钟学习模块。',
        en: met ? 'Your recorded topics meet your target score.' : 'The available scores or study time do not support a 30-minute study block.',
      },
      action: {
        zh: met ? '完成一次间隔复习，再用新测评检查掌握情况。' : '补充缺失成绩，或为学习留出至少 30 分钟。',
        en: met ? 'Schedule a spaced review, then check your understanding with a new assessment.' : 'Add missing scores or make at least 30 minutes available for study.',
      },
    };
  }
  const observed = learning.scores[first.topic_id];
  return {
    topicId: first.topic_id, source: 'deterministic-study-engine',
    reason: {
      zh: `${NAMES[first.topic_id][0]}当前为 ${observed} 分，目标为 ${learning.targetScore} 分。引擎综合分数差距、课程权重与预计用时，将它排在首位。`,
      en: `${NAMES[first.topic_id][1]} is at ${observed} against your target of ${learning.targetScore}. The engine ranks it first using the score gap, course weighting and estimated time.`,
    },
    action: {
      zh: `安排 ${first.duration_minutes} 分钟复习${NAMES[first.topic_id][0]}，先检查概念，再独立完成一道例题，并记录最不确定的一步。`,
      en: `Spend ${first.duration_minutes} minutes on ${NAMES[first.topic_id][1]}: review the concept, solve one example independently, and note the step you are least sure about.`,
    },
  };
}

function createPortalService({ repository, uuid = randomUUID, invitation = () => randomBytes(10).toString('hex').toUpperCase(), now = () => new Date(), navigationBuilder = (input) => require('./navigation').buildNavigation(input) }) {
  async function requireStudent(teacherId, studentId) {
    const student = await repository.getAssignedStudent(teacherId, text(studentId, 'Student ID', 200));
    if (!student) throw portalError(404, 'NOT_FOUND', 'Student not found in your classroom.');
    return student;
  }
  return {
    async view(actor, requestedStudentId = null) {
      if (requestedStudentId !== null) requireRole(actor, 'teacher');
      // Identity is already verified. These independent reads do not need to wait
      // for the profile's email/role synchronization to complete.
      const profileRead = repository.ensureProfile(actor);
      const classroomRead = repository.getClassroom(actor.id, actor.role);
      const studentsRead = actor.role === 'teacher' ? repository.listStudents(actor.id) : Promise.resolve([]);
      const studentRead = requestedStudentId !== null ? requireStudent(actor.id, requestedStudentId) : Promise.resolve(null);
      // For a teacher detail view, private learning reads start only AFTER the
      // assignment query authorizes that exact student. Own student reads are
      // already authorized by the authenticated subject.
      const learningRead = studentRead.then(async (student) => {
        const learnerId = student?.id ?? (actor.role === 'student' ? actor.id : null);
        if (!learnerId) return [null, [], { context: null, progress: {} }];
        return Promise.all([repository.getLearning(learnerId), repository.getAdvice(learnerId, actor.role === 'teacher' ? actor.id : null), repository.getNavigation(learnerId)]);
      });
      const [user, classroom, students, student, [learning, advice, storedNavigation]] = await Promise.all([profileRead, classroomRead, studentsRead, studentRead, learningRead]);
      // The current server-fetched Clerk role, never the cached database role,
      // controls all permissions and the role returned to the browser.
      user.role = actor.role;
      const context = storedNavigation.context;
      const navigation = student || actor.role === 'student' ? navigationBuilder({ learning, profile: student || user, context, progress: storedNavigation.progress, advice, now: now() }) : null;
      return { user, classroom, students, learning, advice, context, navigation, recommendation: recommendation(learning, navigation), ...(student ? { student } : {}) };
    },
    async mutate(actor, payload) {
      if (!isRecord(payload) || typeof payload.action !== 'string') throw invalid('A supported action is required.');
      const actorProfile = await repository.ensureProfile(actor);
      switch (payload.action) {
        case 'save-profile': {
          keys(payload, ['action', 'name', 'goal', 'timezone']);
          const name = text(payload.name, 'Name', 80);
          const goal = text(payload.goal, 'Goal', 500, true);
          const timezone = text(payload.timezone, 'Timezone', 80);
          try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); } catch { throw invalid('Choose a valid IANA timezone.'); }
          await repository.saveProfile(actor.id, { name, goal, timezone });
          break;
        }
        case 'create-classroom': {
          requireRole(actor, 'teacher');
          keys(payload, ['action', 'name']);
          const name = text(payload.name, 'Classroom name', 80);
          await repository.createClassroom(actor.id, { id: uuid(), name, code: invitation() });
          break;
        }
        case 'join-classroom': {
          requireRole(actor, 'student');
          keys(payload, ['action', 'code']);
          const code = text(payload.code, 'Invitation code', 20).toUpperCase();
          if (!/^[A-F0-9]{20}$/.test(code)) throw invalid('Enter the 20-character classroom invitation code.');
          await repository.joinClassroom(actor.id, code);
          break;
        }
        case 'save-assessment': {
          requireRole(actor, 'student');
          keys(payload, ['action', 'scores', 'targetScore', 'minutes']);
          keys(payload.scores, TOPICS);
          if (TOPICS.some((topic) => !Object.hasOwn(payload.scores, topic) || (payload.scores[topic] !== null && !(typeof payload.scores[topic] === 'number' && Number.isFinite(payload.scores[topic]) && payload.scores[topic] >= 0 && payload.scores[topic] <= 100)))) throw invalid('Each topic needs a score from 0 to 100, or null when not assessed.');
          if (typeof payload.targetScore !== 'number' || !Number.isFinite(payload.targetScore) || payload.targetScore < 0 || payload.targetScore > 100) throw invalid('Target score must be a number from 0 to 100.');
          if (!Number.isSafeInteger(payload.minutes) || payload.minutes < 0 || payload.minutes > 1440) throw invalid('Available study time must be a whole number from 0 to 1440 minutes.');
          const previous = await repository.getLearning(actor.id);
          const id = uuid();
          const scores = Object.fromEntries(TOPICS.map((topic) => [topic, payload.scores[topic]]));
          const plan = generateStudyPlan({ student_id: actor.id, course_id: course.course_id, assessment_id: id, target_score: payload.targetScore, available_minutes: payload.minutes, topic_scores: scores }, course, previous?.plan ?? null);
          await repository.saveAssessment(actor.id, { id, scores, targetScore: payload.targetScore, minutes: payload.minutes, plan });
          break;
        }
        case 'complete-task': {
          requireRole(actor, 'student');
          keys(payload, ['action', 'taskId', 'completed']);
          const taskId = text(payload.taskId, 'Task ID', 500);
          if (typeof payload.completed !== 'boolean') throw invalid('Task completion must be true or false.');
          const learning = await repository.getLearning(actor.id);
          if (!learning?.plan.priorities.some((task) => task.task_id === taskId)) throw portalError(404, 'NOT_FOUND', 'Task not found in your current study plan.');
          await repository.completeTask(actor.id, taskId, payload.completed);
          break;
        }
        case 'save-advice': {
          requireRole(actor, 'teacher');
          keys(payload, ['action', 'studentId', 'message', 'focusTopic']);
          const message = text(payload.message, 'Advice', 2000);
          const focusTopic = payload.focusTopic ?? null;
          if (focusTopic !== null && !TOPICS.includes(focusTopic)) throw invalid('Choose a valid focus topic.');
          const student = await requireStudent(actor.id, payload.studentId);
          await repository.saveAdvice(actor.id, student.id, { id: uuid(), message, focusTopic });
          break;
        }
        case 'save-navigation-context': {
          requireRole(actor, 'student');
          keys(payload, ['action', 'context']);
          await repository.saveNavigationContext(actor.id, validateNavigationContext(payload.context));
          break;
        }
        case 'complete-navigation-session': {
          requireRole(actor, 'student');
          keys(payload, ['action', 'sessionId', 'completed']);
          const sessionId = text(payload.sessionId, 'Study session ID', 200);
          if (typeof payload.completed !== 'boolean') throw invalid('Study session completion must be true or false.');
          const [learning, advice, stored] = await Promise.all([repository.getLearning(actor.id), repository.getAdvice(actor.id), repository.getNavigation(actor.id)]);
          const currentTime = now();
          const navigation = navigationBuilder({ learning, profile: actorProfile, context: stored.context, progress: stored.progress, advice, now: currentTime });
          const currentSession = navigation.sessions.find((session) => session.id === sessionId);
          if (!currentSession) throw portalError(404, 'NOT_FOUND', 'Study session not found in your current navigation.');
          if (payload.completed && currentSession.canComplete === false) throw portalError(409, 'SESSION_NOT_READY', 'Complete the previous study block first, then return on a later local day for this review.');
          await repository.completeNavigationSession(actor.id, sessionId, payload.completed, new Date(currentTime).toISOString(), currentSession.durationMinutes, learning?.plan?.assessment_id ?? null);
          break;
        }
        default: throw invalid('Unsupported action.');
      }
      return { ok: true };
    },
  };
}

module.exports = { createPortalService, recommendation, TOPICS, validateNavigationContext };
