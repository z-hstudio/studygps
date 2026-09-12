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
function recommendation(learning) {
  if (!learning) return null;
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

function createPortalService({ repository, uuid = randomUUID, invitation = () => randomBytes(10).toString('hex').toUpperCase() }) {
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
        if (!learnerId) return [null, []];
        return Promise.all([repository.getLearning(learnerId), repository.getAdvice(learnerId, actor.role === 'teacher' ? actor.id : null)]);
      });
      const [user, classroom, students, student, [learning, advice]] = await Promise.all([profileRead, classroomRead, studentsRead, studentRead, learningRead]);
      // The current server-fetched Clerk role, never the cached database role,
      // controls all permissions and the role returned to the browser.
      user.role = actor.role;
      return { user, classroom, students, learning, advice, recommendation: recommendation(learning), ...(student ? { student } : {}) };
    },
    async mutate(actor, payload) {
      if (!isRecord(payload) || typeof payload.action !== 'string') throw invalid('A supported action is required.');
      await repository.ensureProfile(actor);
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
        default: throw invalid('Unsupported action.');
      }
      return { ok: true };
    },
  };
}

module.exports = { createPortalService, recommendation, TOPICS };
