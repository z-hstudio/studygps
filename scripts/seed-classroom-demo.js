'use strict';

const { createHash } = require('node:crypto');
const { generateStudyPlan } = require('../engine');
const course = require('../engine/examples/course.json');

function stableId(value) {
  const h = createHash('sha256').update(value).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function required(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${label}`);
  return value.trim();
}
function bilingual(value, max) {
  const joined = `${required(value?.zh, 'Chinese copy', max)}\n\n${required(value?.en, 'English copy', max)}`;
  if (joined.length > max) throw new Error('Bilingual copy is too long');
  return joined;
}

function buildDemoRows({ classroomId, teacherId, referenceDate, dataset }) {
  required(classroomId, 'classroom ID', 80);
  required(teacherId, 'teacher ID', 200);
  const reference = new Date(referenceDate);
  if (!Number.isFinite(reference.getTime())) throw new Error('Invalid reference date');
  if (dataset?.version !== 1 || !Array.isArray(dataset.students) || !dataset.students.length || dataset.students.length > 25) throw new Error('Invalid demo dataset');
  const namespace = createHash('sha256').update(classroomId).digest('hex').slice(0, 20);
  const keys = new Set();
  const date = (daysAgo) => {
    if (!Number.isSafeInteger(daysAgo) || daysAgo < 0 || daysAgo > 3650) throw new Error('Invalid historical offset');
    return new Date(reference.getTime() - daysAgo * 86400000).toISOString();
  };
  const students = dataset.students.map((fixture) => {
    if (!/^[a-z][a-z0-9-]{1,40}$/.test(fixture.key) || keys.has(fixture.key)) throw new Error('Demo student keys must be unique');
    keys.add(fixture.key);
    const id = `demo_studygps_${namespace}_${fixture.key}`;
    const name = required(fixture.name, 'student name', 80);
    const goal = bilingual(fixture.goal, 500);
    if (!Array.isArray(fixture.assessments) || fixture.assessments.length < 2 || fixture.assessments.length > 30) throw new Error('Invalid assessment history');
    let previous = null;
    let previousOffset = Infinity;
    const assessments = fixture.assessments.map((entry, index) => {
      if (entry.daysAgo >= previousOffset) throw new Error('Assessments must be oldest to newest');
      previousOffset = entry.daysAgo;
      const createdAt = date(entry.daysAgo);
      const assessmentId = stableId(`${id}:assessment:${index}`);
      const plan = generateStudyPlan({ student_id: id, course_id: course.course_id, assessment_id: assessmentId,
        topic_scores: entry.scores, target_score: fixture.targetScore, available_minutes: fixture.minutes }, course, previous);
      previous = plan;
      return { id: assessmentId, scores: entry.scores, overallScore: plan.overall_score, createdAt, plan };
    });
    const latest = assessments.at(-1);
    if (!Number.isSafeInteger(fixture.completionCount) || fixture.completionCount < 0 || fixture.completionCount > latest.plan.priorities.length) throw new Error('Invalid demo task completion count');
    if (!Array.isArray(fixture.advice) || fixture.advice.length > 10) throw new Error('Invalid demo guidance');
    const advice = fixture.advice.map((entry, index) => {
      if (entry.focusTopic !== null && !course.topics.some(topic => topic.topic_id === entry.focusTopic)) throw new Error('Invalid guidance topic');
      return { id: stableId(`${id}:advice:${index}`), studentId: id, teacherId,
        message: bilingual(entry.message, 2000), focusTopic: entry.focusTopic, createdAt: date(entry.daysAgo) };
    });
    return { id, name, goal, email: `${fixture.key}.${namespace}@example.invalid`, isDemo: true,
      assessments, advice, learning: { scores: latest.scores, targetScore: fixture.targetScore, minutes: fixture.minutes,
        plan: latest.plan, completedTaskIds: latest.plan.priorities.slice(0, fixture.completionCount).map(task => task.task_id), updatedAt: latest.createdAt } };
  });
  return { students };
}

function assertNoDemoConflicts(existingRows, classroomId) {
  for (const row of existingRows) {
    if (row.is_demo !== true || row.role !== 'student' || (row.classroom_id && row.classroom_id !== classroomId)) {
      throw new Error('Demo namespace conflicts with an existing account or another classroom; no changes made');
    }
  }
}

async function seedClassroomDemo({ classroomId, apply = false, referenceDate = new Date(), env = process.env, sql: injectedSql, clerk: injectedClerk, dataset = require('../demo/classroom-students.json') }) {
  required(classroomId, 'explicit target classroom ID', 80);
  const email = required(env.STUDYGPS_ADMIN_EMAIL, 'configured administrator email', 320).toLowerCase();
  const sql = injectedSql || require('@neondatabase/serverless').neon(required(env.DATABASE_URL, 'database configuration', 4096));
  const clerk = injectedClerk || require('@clerk/backend').createClerkClient({ secretKey: required(env.CLERK_SECRET_KEY, 'Clerk configuration', 4096) });
  const classrooms = await sql`SELECT c.id, c.name, c.teacher_id, p.email, p.role FROM studygps_classrooms c
    JOIN studygps_profiles p ON p.user_id=c.teacher_id WHERE c.id=${classroomId} AND lower(p.email)=${email} AND p.role='teacher'`;
  if (classrooms.length !== 1) throw new Error('Target classroom must belong to the configured teacher administrator');
  const classroom = classrooms[0];
  const user = await clerk.users.getUser(classroom.teacher_id);
  const primary = user.emailAddresses?.find(item => item.id === user.primaryEmailAddressId);
  if (user.id !== classroom.teacher_id || user.banned || user.locked || primary?.verification?.status !== 'verified' || primary.emailAddress.toLowerCase() !== email) throw new Error('Administrator identity verification failed');
  const { students } = buildDemoRows({ classroomId, teacherId: user.id, referenceDate, dataset });
  const ids = students.map(student => student.id);
  const existing = await sql`SELECT p.user_id,p.role,p.is_demo,e.classroom_id FROM studygps_profiles p
    LEFT JOIN studygps_enrollments e ON e.student_id=p.user_id WHERE p.user_id=ANY(${ids}::text[])`;
  assertNoDemoConflicts(existing, classroomId);
  const summary = { classroom: classroom.name, students: students.length, newStudents: students.length - existing.length,
    assessments: students.reduce((n, s) => n + s.assessments.length, 0), guidanceNotes: students.reduce((n, s) => n + s.advice.length, 0), applied: apply };
  if (!apply) return summary;

  // One transaction; inserts only. Reruns preserve existing plans, progress,
  // assessment dates and teacher edits. Synthetic IDs never provision logins.
  const queries = [];
  for (const student of students) {
    queries.push(sql`INSERT INTO studygps_profiles (user_id,name,email,role,goal,timezone,is_demo)
      VALUES (${student.id},${student.name},${student.email},'student',${student.goal},'Australia/Sydney',true) ON CONFLICT (user_id) DO NOTHING`);
    queries.push(sql`INSERT INTO studygps_enrollments (student_id,classroom_id) VALUES (${student.id},${classroomId}) ON CONFLICT (student_id) DO NOTHING`);
    for (const assessment of student.assessments) queries.push(sql`INSERT INTO studygps_assessments (id,student_id,scores,overall_score,created_at)
      VALUES (${assessment.id},${student.id},${JSON.stringify(assessment.scores)}::jsonb,${assessment.overallScore},${assessment.createdAt}) ON CONFLICT (id) DO NOTHING`);
    const l = student.learning;
    queries.push(sql`INSERT INTO studygps_learning (student_id,scores,target_score,minutes,plan,completed_task_ids,updated_at)
      VALUES (${student.id},${JSON.stringify(l.scores)}::jsonb,${l.targetScore},${l.minutes},${JSON.stringify(l.plan)}::jsonb,${JSON.stringify(l.completedTaskIds)}::jsonb,${l.updatedAt}) ON CONFLICT (student_id) DO NOTHING`);
    for (const advice of student.advice) queries.push(sql`INSERT INTO studygps_advice (id,student_id,teacher_id,message,focus_topic,created_at)
      VALUES (${advice.id},${student.id},${user.id},${advice.message},${advice.focusTopic},${advice.createdAt}) ON CONFLICT (id) DO NOTHING`);
  }
  await sql.transaction(queries);
  return summary;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const allowed = new Set(['--classroom-id', '--apply']);
  let classroomId;
  let apply = false;
  let invalid = false;
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) { invalid = true; break; }
    if (args[i] === '--apply') apply = true;
    else classroomId = args[++i];
  }
  if (invalid || !classroomId) {
    console.error('Usage: npm run demo:seed -- --classroom-id <UUID> [--apply]');
    process.exitCode = 1;
  } else seedClassroomDemo({ classroomId, apply }).then(result => console.log(JSON.stringify(result, null, 2))).catch(() => {
    console.error('Demo seed failed. Verify the target classroom, administrator identity, migration and fixture data; private diagnostics are not printed.');
    process.exitCode = 1;
  });
}

module.exports = { buildDemoRows, assertNoDemoConflicts, seedClassroomDemo };
