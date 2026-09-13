'use strict';

const { buildDemoRows, assertNoDemoConflicts } = require('./seed-classroom-demo');
const { validateNavigationContext, TOPICS } = require('../server/portal-service');

function required(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${label}`);
  return value.trim();
}

function buildNavigationDemoContexts({ classroomId, teacherId, referenceDate = new Date(), dataset = require('../demo/classroom-students.json') }) {
  const reference = new Date(referenceDate);
  if (!Number.isFinite(reference.getTime())) throw new Error('Invalid demo reference date');
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(reference).map((part) => [part.type, part.value]));
  const localDay = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const dueDate = (days) => new Date(Date.parse(`${localDay}T12:00:00.000Z`) + days * 86400000).toISOString().slice(0, 10);
  const { students } = buildDemoRows({ classroomId, teacherId, referenceDate, dataset });
  if (students.length !== 6) throw new Error('Navigation demo expects the six authored synthetic students');
  const availability = [
    { days: [1, 3, 5], startTime: '18:00', minutesPerDay: 90 },
    { days: [2, 4, 6, 7], startTime: '16:30', minutesPerDay: 120 },
    { days: [1, 2, 4, 6], startTime: '19:00', minutesPerDay: 90 },
    { days: [2, 5, 7], startTime: '18:30', minutesPerDay: 60 },
    { days: [3, 6, 7], startTime: '10:00', minutesPerDay: 60 },
    { days: [1, 4, 7], startTime: '17:00', minutesPerDay: 90 },
  ];
  return students.map((student, index) => {
    const fixture = dataset.students[index];
    const mechanical = index % 2 === 0;
    const careerTopics = mechanical ? ['first_law', 'rankine_cycle'] : ['second_law', 'entropy'];
    const goalTopics = student.learning.plan.priorities.slice(0, 2).map((task) => task.topic_id);
    const context = validateNavigationContext({
      semesterGoal: student.goal,
      careerGoal: mechanical ? '【合成演示】探索机械工程，理解设备中的能量转换。 [Synthetic demo] Explore mechanical engineering and energy conversion in machines.' : '【合成演示】探索能源工程，理解效率与可持续能源系统。 [Synthetic demo] Explore energy engineering, efficiency and sustainable energy systems.',
      interests: mechanical ? '自行车传动、机械装置与能量效率。 Bicycle drivetrains, machines and energy efficiency.' : '可持续能源、热泵与节能设计。 Sustainable energy, heat pumps and energy-saving design.',
      preferredMethod: ['diagram', 'practice', 'explain', 'mixed', 'practice', 'explain'][index],
      healthDemo: ['rested', 'short_sleep', 'off', 'no_data', 'short_sleep', 'rested'][index],
      focusMinutes: [25, 50, 25, 25, 25, 50][index],
      availability: availability[index],
      goalTopics: goalTopics.length ? goalTopics : ['second_law', 'entropy'],
      careerTopics,
      topicProgress: Object.fromEntries(TOPICS.map((topic) => [topic, student.learning.scores[topic] >= student.learning.targetScore ? 'confident' : student.learning.scores[topic] >= 60 ? 'learning' : 'not_started'])),
      feedback: '【合成演示反馈】独立计算时容易漏掉单位和符号；希望用短练习检验理解，再解释自己的步骤。 [Synthetic demo feedback] I sometimes miss units and signs. I want short practice followed by explaining my reasoning.',
      feedbackTopics: goalTopics.length ? [goalTopics[0]] : ['entropy'],
      deadlines: [
        { id: `demo-assignment-${fixture.key}`, title: '热力学应用作业 · Thermodynamics assignment', kind: 'assignment', dueDate: dueDate(5), dueTime: '17:00', topicIds: careerTopics, requirements: '画出系统边界，列出能量式，并解释单位与效率检查。 Sketch the system boundary, write the energy balance, and explain unit and efficiency checks.' },
        { id: `demo-exam-${fixture.key}`, title: '热力学测评 · Thermodynamics assessment', kind: 'exam', dueDate: dueDate(12), dueTime: '09:00', topicIds: [...TOPICS], requirements: '复习四个知识点，准备独立解题并解释关键假设。 Review the four topics, solve independently, and explain your assumptions.' },
      ],
    });
    return { studentId: student.id, context };
  });
}

async function seedNavigationDemo({ classroomId, apply = false, referenceDate = new Date(), env = process.env, sql: injectedSql, clerk: injectedClerk, dataset = require('../demo/classroom-students.json') }) {
  required(classroomId, 'explicit target classroom ID', 80);
  const email = required(env.STUDYGPS_ADMIN_EMAIL, 'configured administrator email', 320).toLowerCase();
  const sql = injectedSql || require('@neondatabase/serverless').neon(required(env.DATABASE_URL, 'database configuration', 4096));
  const clerk = injectedClerk || require('@clerk/backend').createClerkClient({ secretKey: required(env.CLERK_SECRET_KEY, 'Clerk configuration', 4096) });
  const classrooms = await sql`SELECT c.id, c.name, c.teacher_id FROM studygps_classrooms c
    JOIN studygps_profiles p ON p.user_id=c.teacher_id
    WHERE c.id=${classroomId} AND lower(p.email)=${email} AND p.role='teacher' AND p.is_demo=false`;
  if (classrooms.length !== 1) throw new Error('Target classroom must belong to the configured administrator');
  const classroom = classrooms[0];
  const user = await clerk.users.getUser(classroom.teacher_id);
  const primary = user.emailAddresses?.find((entry) => entry.id === user.primaryEmailAddressId);
  if (user.id !== classroom.teacher_id || user.banned || user.locked || primary?.verification?.status !== 'verified' || primary.emailAddress.trim().toLowerCase() !== email) throw new Error('Administrator identity verification failed');
  const rows = buildNavigationDemoContexts({ classroomId, teacherId: user.id, referenceDate, dataset });
  const ids = rows.map((row) => row.studentId);
  const existing = await sql`SELECT p.user_id, p.role, p.is_demo, e.classroom_id FROM studygps_profiles p
    LEFT JOIN studygps_enrollments e ON e.student_id=p.user_id WHERE p.user_id=ANY(${ids}::text[])`;
  assertNoDemoConflicts(existing, classroomId);
  if (existing.length !== 6 || existing.some((row) => row.classroom_id !== classroomId)) throw new Error('All six synthetic students must already belong to this classroom');
  const present = await sql`SELECT student_id FROM studygps_navigation WHERE student_id=ANY(${ids}::text[])`;
  const summary = { classroom: classroom.name, syntheticStudents: rows.length, newContexts: rows.length - present.length, applied: apply };
  if (!apply) return summary;
  // Insert context only; retain existing contexts, study-block completion, scores,
  // core plans, historical assessments, teacher advice and all account records.
  const results = await sql.transaction(rows.map((row) => sql`INSERT INTO studygps_navigation (student_id, context)
    SELECT p.user_id, ${JSON.stringify(row.context)}::jsonb FROM studygps_profiles p
    JOIN studygps_enrollments e ON e.student_id=p.user_id JOIN studygps_classrooms c ON c.id=e.classroom_id
    WHERE p.user_id=${row.studentId} AND p.is_demo=true AND p.role='student' AND e.classroom_id=${classroomId} AND c.teacher_id=${user.id}
    ON CONFLICT (student_id) DO NOTHING RETURNING student_id`));
  return { ...summary, insertedContexts: results.reduce((count, result) => count + result.length, 0) };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let classroomId;
  let apply = false;
  let valid = true;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--apply') apply = true;
    else if (args[index] === '--classroom-id' && !classroomId) classroomId = args[++index];
    else valid = false;
  }
  if (!valid || !classroomId) {
    process.stderr.write('Usage: node scripts/seed-navigation-demo.js --classroom-id <UUID> [--apply]\n');
    process.exitCode = 1;
  } else seedNavigationDemo({ classroomId, apply }).then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)).catch(() => {
    process.stderr.write('Navigation demo seed failed. Check classroom ownership, verified administrator identity, migration and the six existing synthetic records.\n');
    process.exitCode = 1;
  });
}

module.exports = { buildNavigationDemoContexts, seedNavigationDemo };
