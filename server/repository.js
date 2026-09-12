'use strict';

const { portalError } = require('./errors');

const iso = (value) => value ? new Date(value).toISOString() : null;
function profile(row) {
  return row ? { id: row.user_id, name: row.name, email: row.email, role: row.role, goal: row.goal, timezone: row.timezone } : null;
}
function classroom(row, includeCode = false) {
  return row ? { id: row.id, name: row.name, ...(includeCode ? { code: row.code } : {}) } : null;
}

function createRepository({ env = process.env, sql: injectedSql } = {}) {
  let connection = injectedSql;
  function db() {
    if (!connection) {
      if (!env.DATABASE_URL) throw portalError(503, 'SERVICE_UNAVAILABLE', 'Learning storage is not configured.');
      connection = require('@neondatabase/serverless').neon(env.DATABASE_URL);
    }
    return connection;
  }
  return {
    async ensureProfile(actor) {
      const sql = db();
      const rows = await sql`INSERT INTO studygps_profiles (user_id, name, email, role)
        VALUES (${actor.id}, ${actor.name}, ${actor.email}, ${actor.role})
        ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role
        RETURNING user_id, name, email, role, goal, timezone`;
      return profile(rows[0]);
    },
    async saveProfile(actorId, values) {
      const sql = db();
      await sql`UPDATE studygps_profiles SET name=${values.name}, goal=${values.goal}, timezone=${values.timezone}, updated_at=now() WHERE user_id=${actorId}`;
    },
    async getClassroom(actorId, role) {
      const sql = db();
      const rows = role === 'teacher'
        ? await sql`SELECT id, name, code FROM studygps_classrooms WHERE teacher_id=${actorId}`
        : await sql`SELECT c.id, c.name FROM studygps_classrooms c INNER JOIN studygps_enrollments e ON e.classroom_id=c.id WHERE e.student_id=${actorId}`;
      return classroom(rows[0], role === 'teacher');
    },
    async createClassroom(actorId, values) {
      const sql = db();
      const rows = await sql`INSERT INTO studygps_classrooms (id, teacher_id, name, code) VALUES (${values.id}, ${actorId}, ${values.name}, ${values.code})
        ON CONFLICT (teacher_id) DO NOTHING RETURNING id`;
      if (!rows.length) throw portalError(409, 'CLASSROOM_EXISTS', 'Your classroom already exists.');
    },
    async joinClassroom(actorId, code) {
      const sql = db();
      const target = await sql`SELECT c.id FROM studygps_classrooms c INNER JOIN studygps_profiles p ON p.user_id=c.teacher_id AND p.role='teacher' WHERE c.code=${code}`;
      if (!target.length) throw portalError(404, 'NOT_FOUND', 'Classroom not found. Check the invitation code.');
      await sql`INSERT INTO studygps_enrollments (student_id, classroom_id) VALUES (${actorId}, ${target[0].id}) ON CONFLICT (student_id) DO NOTHING`;
      const current = await sql`SELECT classroom_id FROM studygps_enrollments WHERE student_id=${actorId}`;
      if (current[0]?.classroom_id !== target[0].id) throw portalError(409, 'ALREADY_ENROLLED', 'You already belong to a classroom. Contact your teacher to change classes.');
    },
    async getAssignedStudent(teacherId, studentId) {
      const sql = db();
      const rows = await sql`SELECT p.user_id, p.name, p.email, p.role, p.goal, p.timezone
        FROM studygps_profiles p INNER JOIN studygps_enrollments e ON e.student_id=p.user_id
        INNER JOIN studygps_classrooms c ON c.id=e.classroom_id
        WHERE c.teacher_id=${teacherId} AND p.user_id=${studentId}`;
      return profile(rows[0]);
    },
    async listStudents(teacherId) {
      const sql = db();
      const rows = await sql`SELECT p.user_id, p.name, p.email, p.goal,
        l.plan->>'overall_score' AS overall_score, l.plan->'priorities' AS priorities,
        l.completed_task_ids, l.updated_at
        FROM studygps_profiles p INNER JOIN studygps_enrollments e ON e.student_id=p.user_id
        INNER JOIN studygps_classrooms c ON c.id=e.classroom_id
        LEFT JOIN studygps_learning l ON l.student_id=p.user_id
        WHERE c.teacher_id=${teacherId} ORDER BY p.name, p.user_id LIMIT 1000`;
      return rows.map((row) => ({
        id: row.user_id, name: row.name, email: row.email, goal: row.goal,
        overallScore: row.overall_score === null ? null : Number(row.overall_score),
        completedTasks: row.completed_task_ids?.length ?? 0, totalTasks: row.priorities?.length ?? 0,
        focusTopic: row.priorities?.[0]?.topic_id ?? null, updatedAt: iso(row.updated_at),
      }));
    },
    async getLearning(studentId) {
      const sql = db();
      const rows = await sql`SELECT scores, target_score, minutes, plan, completed_task_ids, updated_at,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', h.id, 'overall_score', h.overall_score, 'created_at', h.created_at)
          ORDER BY h.created_at DESC, h.id DESC), '[]'::jsonb)
          FROM (SELECT id, overall_score, created_at FROM studygps_assessments
            WHERE student_id=${studentId} ORDER BY created_at DESC, id DESC LIMIT 30) h) AS history
        FROM studygps_learning WHERE student_id=${studentId}`;
      const row = rows[0];
      if (!row) return null;
      return {
        scores: row.scores, targetScore: row.target_score, minutes: row.minutes, plan: row.plan,
        completedTaskIds: row.completed_task_ids, updatedAt: iso(row.updated_at),
        history: row.history.map((entry) => ({ id: entry.id, createdAt: iso(entry.created_at), overallScore: entry.overall_score })),
      };
    },
    async saveAssessment(studentId, values) {
      const sql = db();
      await sql.transaction([
        sql`INSERT INTO studygps_assessments (id, student_id, scores, overall_score)
          VALUES (${values.id}, ${studentId}, ${JSON.stringify(values.scores)}::jsonb, ${values.plan.overall_score})`,
        sql`INSERT INTO studygps_learning (student_id, scores, target_score, minutes, plan, completed_task_ids)
          VALUES (${studentId}, ${JSON.stringify(values.scores)}::jsonb, ${values.targetScore}, ${values.minutes}, ${JSON.stringify(values.plan)}::jsonb, '[]'::jsonb)
          ON CONFLICT (student_id) DO UPDATE SET scores=EXCLUDED.scores, target_score=EXCLUDED.target_score,
            minutes=EXCLUDED.minutes, plan=EXCLUDED.plan, completed_task_ids='[]'::jsonb, updated_at=now()`,
        sql`DELETE FROM studygps_assessments WHERE student_id=${studentId} AND id IN
          (SELECT id FROM studygps_assessments WHERE student_id=${studentId} ORDER BY created_at DESC, id DESC OFFSET 30)`,
      ]);
    },
    async completeTask(studentId, taskId, completed) {
      const sql = db();
      // Mutate the JSON array atomically; concurrent checkbox updates cannot erase
      // each other, and a replaced plan cannot receive a nonexistent task ID.
      const rows = await sql`UPDATE studygps_learning SET completed_task_ids =
        CASE WHEN ${completed} THEN
          CASE WHEN completed_task_ids ? ${taskId} THEN completed_task_ids ELSE completed_task_ids || jsonb_build_array(${taskId}::text) END
        ELSE completed_task_ids - ${taskId} END, updated_at=now()
        WHERE student_id=${studentId} AND EXISTS
          (SELECT 1 FROM jsonb_array_elements(plan->'priorities') task WHERE task->>'task_id'=${taskId}) RETURNING student_id`;
      if (!rows.length) throw portalError(409, 'PLAN_CHANGED', 'This task is no longer in your plan. Refresh and try again.');
    },
    async getAdvice(studentId, teacherId = null) {
      const sql = db();
      // A teacher sees their own notes only; students see notes by their current
      // assigned teacher. Reassignment never reveals an earlier teacher's notes.
      const rows = await sql`SELECT a.id, a.message, a.focus_topic, a.created_at, p.name AS teacher_name
        FROM studygps_advice a INNER JOIN studygps_profiles p ON p.user_id=a.teacher_id
        INNER JOIN studygps_enrollments e ON e.student_id=a.student_id
        INNER JOIN studygps_classrooms c ON c.id=e.classroom_id AND c.teacher_id=a.teacher_id
        WHERE a.student_id=${studentId} AND (${teacherId}::text IS NULL OR a.teacher_id=${teacherId})
        ORDER BY a.created_at DESC, a.id DESC LIMIT 50`;
      return rows.map((row) => ({ id: row.id, message: row.message, focusTopic: row.focus_topic, teacherName: row.teacher_name, createdAt: iso(row.created_at) }));
    },
    async saveAdvice(teacherId, studentId, values) {
      const sql = db();
      const result = await sql.transaction([
        sql`INSERT INTO studygps_advice (id, student_id, teacher_id, message, focus_topic)
          SELECT ${values.id}, e.student_id, c.teacher_id, ${values.message}, ${values.focusTopic}
          FROM studygps_enrollments e INNER JOIN studygps_classrooms c ON c.id=e.classroom_id
          WHERE e.student_id=${studentId} AND c.teacher_id=${teacherId} RETURNING id`,
        sql`DELETE FROM studygps_advice WHERE student_id=${studentId} AND teacher_id=${teacherId} AND id IN
          (SELECT id FROM studygps_advice WHERE student_id=${studentId} AND teacher_id=${teacherId} ORDER BY created_at DESC, id DESC OFFSET 50)`,
      ]);
      if (!result[0].length) throw portalError(404, 'NOT_FOUND', 'Student not found in your classroom.');
    },
  };
}

module.exports = { createRepository };
