'use strict';

const { portalError } = require('../server/errors');
const copy = (value) => structuredClone(value);
function memoryRepository() {
  const profiles = new Map();
  const classrooms = new Map();
  const enrollments = new Map();
  const learning = new Map();
  const navigation = new Map();
  const advice = [];
  const reads = [];
  return {
    profiles, classrooms, enrollments, learning, navigation, advice, reads,
    async ensureProfile(actor) {
      const existing = profiles.get(actor.id);
      const row = { ...actor, goal: '', timezone: 'Australia/Sydney', ...existing, email: actor.email, role: actor.role };
      profiles.set(actor.id, row);
      return copy(row);
    },
    async saveProfile(id, values) { Object.assign(profiles.get(id), values); },
    async getClassroom(id, role) {
      const row = role === 'teacher' ? [...classrooms.values()].find((value) => value.teacherId === id) : classrooms.get(enrollments.get(id));
      return row ? { id: row.id, name: row.name, ...(role === 'teacher' ? { code: row.code } : {}) } : null;
    },
    async createClassroom(id, values) {
      if ([...classrooms.values()].some((value) => value.teacherId === id)) throw portalError(409, 'CLASSROOM_EXISTS', 'Classroom already exists.');
      classrooms.set(values.id, { ...values, teacherId: id });
    },
    async joinClassroom(id, code) {
      const classroom = [...classrooms.values()].find((value) => value.code === code);
      if (!classroom) throw portalError(404, 'NOT_FOUND', 'Classroom not found.');
      if (enrollments.has(id) && enrollments.get(id) !== classroom.id) throw portalError(409, 'ALREADY_ENROLLED', 'Already enrolled.');
      enrollments.set(id, classroom.id);
    },
    async getAssignedStudent(teacherId, studentId) {
      reads.push(['assigned', teacherId, studentId]);
      return classrooms.get(enrollments.get(studentId))?.teacherId === teacherId ? copy(profiles.get(studentId)) : null;
    },
    async listStudents(teacherId) {
      reads.push(['students', teacherId]);
      return [...profiles.values()].filter((row) => classrooms.get(enrollments.get(row.id))?.teacherId === teacherId).map((row) => {
        const state = learning.get(row.id);
        return { id: row.id, name: row.name, email: row.email, goal: row.goal, overallScore: state?.plan.overall_score ?? null, completedTasks: state?.completedTaskIds.length ?? 0, totalTasks: state?.plan.priorities.length ?? 0, updatedAt: state?.updatedAt ?? null, focusTopic: state?.plan.priorities[0]?.topic_id ?? null, focusBasis: 'assessment' };
      });
    },
    async getLearning(id) { reads.push(['learning', id]); return copy(learning.get(id) ?? null); },
    async getNavigation(id) { reads.push(['navigation', id]); return copy(navigation.get(id) ?? { context: null, progress: {} }); },
    async saveNavigationContext(id, context) {
      const current = navigation.get(id) ?? { context: null, progress: {} };
      navigation.set(id, { ...current, context: copy(context) });
    },
    async completeNavigationSession(id, sessionId, completed, completedAt, durationMinutes, assessmentId) {
      if (!assessmentId || learning.get(id)?.plan.assessment_id !== assessmentId) throw portalError(409, 'PLAN_CHANGED', 'Assessment changed.');
      const current = navigation.get(id) ?? { context: null, progress: {} };
      if (!(completed && current.progress[sessionId]?.completed)) current.progress[sessionId] = { completed, completedAt: completed ? completedAt : null, durationMinutes };
      navigation.set(id, current);
    },
    async saveAssessment(id, values) {
      const history = learning.get(id)?.history ?? [];
      learning.set(id, { scores: copy(values.scores), targetScore: values.targetScore, minutes: values.minutes, plan: copy(values.plan), completedTaskIds: [], updatedAt: '2026-09-12T00:00:00.000Z', history: [{ id: values.id, overallScore: values.plan.overall_score, createdAt: '2026-09-12T00:00:00.000Z' }, ...history].slice(0, 30) });
    },
    async completeTask(id, taskId, completed) {
      const value = learning.get(id);
      if (!value.plan.priorities.some((task) => task.task_id === taskId)) throw portalError(409, 'PLAN_CHANGED', 'Plan changed.');
      value.completedTaskIds = value.completedTaskIds.filter((task) => task !== taskId);
      if (completed) value.completedTaskIds.push(taskId);
    },
    async getAdvice(studentId, teacherId) {
      reads.push(['advice', studentId]);
      const assigned = classrooms.get(enrollments.get(studentId))?.teacherId;
      return copy(advice.filter((item) => item.studentId === studentId && item.teacherId === assigned && (!teacherId || item.teacherId === teacherId)).map(({ id, message, focusTopic, teacherId: owner }) => ({ id, message, focusTopic, teacherName: profiles.get(owner).name, createdAt: '2026-09-12T00:00:00.000Z' })));
    },
    async saveAdvice(teacherId, studentId, values) {
      if (classrooms.get(enrollments.get(studentId))?.teacherId !== teacherId) throw portalError(404, 'NOT_FOUND', 'Student not found.');
      advice.unshift({ ...copy(values), teacherId, studentId });
    },
  };
}
const actors = {
  studentA: { id: 'user_studentA', name: 'Student A', email: 'a@example.test', role: 'student' },
  studentB: { id: 'user_studentB', name: 'Student B', email: 'b@example.test', role: 'student' },
  teacherA: { id: 'user_teacherA', name: 'Teacher A', email: 'teacher-a@example.test', role: 'teacher' },
  teacherB: { id: 'user_teacherB', name: 'Teacher B', email: 'teacher-b@example.test', role: 'teacher' },
};
function assessment(overrides = {}) { return { action: 'save-assessment', scores: { first_law: 85, second_law: 65, entropy: 35, rankine_cycle: 50 }, targetScore: 80, minutes: 180, ...overrides }; }

module.exports = { memoryRepository, actors, assessment };
