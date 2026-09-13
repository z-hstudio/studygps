'use strict';

// Standalone adapter: no Canvas Learning Center source or dependencies are bundled.
const ORIGIN = 'https://canvas.sydney.edu.au';
const finite = value => typeof value === 'number' && Number.isFinite(value);

function normalizeAssignment(a) {
  const s = a.submission || {};
  const reasons = [];
  if (s.excused === true) reasons.push('excused');
  if (!finite(s.score)) reasons.push('ungraded');
  if (!finite(a.points_possible) || a.points_possible <= 0) reasons.push('no_positive_maximum');
  if (a.omit_from_final_grade === true) reasons.push('excluded_from_final_grade');
  const percent = finite(s.score) && finite(a.points_possible) && a.points_possible > 0
    ? s.score / a.points_possible * 100 : null;
  if (percent !== null && (percent < 0 || percent > 100)) reasons.push('outside_engine_range');
  return {
    assignment_id: String(a.id), name: a.name,
    assignment_group_id: String(a.assignment_group_id),
    score: finite(s.score) ? s.score : null,
    points_possible: finite(a.points_possible) ? a.points_possible : null,
    percentage: percent, eligible_score: reasons.length === 0 ? percent : null,
    missing: s.missing === true, late: s.late === true, reasons,
    mapping_status: 'needs_topic_mapping',
  };
}

function createClient(token, fetchImpl = fetch) {
  if (typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) throw new Error('Enter a valid Canvas token.');
  const deadline = AbortSignal.timeout(20000);
  async function read(path, list = false) {
    const first = new URL(path, ORIGIN);
    let next = first.href;
    const seen = new Set();
    const items = [];
    while (next) {
      const url = new URL(next, ORIGIN);
      if (url.origin !== ORIGIN || url.pathname !== first.pathname || url.username || url.password || url.searchParams.has('access_token')) {
        throw new Error('Canvas pagination left the allowed address range; stopped.');
      }
      if (seen.has(url.href) || seen.size >= 30) throw new Error('Canvas pagination incomplete; partial results withheld.');
      seen.add(url.href);
      let response;
      try {
        response = await fetchImpl(url.href, {
          method: 'GET', headers: { Authorization: `Bearer ${token.trim()}`, Accept: 'application/json' },
          redirect: 'error', signal: AbortSignal.any([deadline, AbortSignal.timeout(15000)]),
        });
      } catch { throw new Error('Canvas connection failed or timed out. Check your network.'); }
      if (!response.ok) throw new Error(`Canvas HTTP ${response.status}; 401/403 means invalid token or insufficient permission.`);
      let bytes = 0;
      const chunks = [];
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > 5 * 1024 * 1024) throw new Error('Canvas response too large; stopped.');
        chunks.push(Buffer.from(chunk));
      }
      let data;
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw new Error('Canvas returned invalid JSON.'); }
      if (!list) return data;
      if (!Array.isArray(data) || data.some(v => !v || typeof v !== 'object' || Array.isArray(v))) throw new Error('Canvas returned an invalid list.');
      items.push(...data);
      next = (response.headers.get('link') || '').match(/<([^>]+)>\s*;\s*rel="next"/)?.[1];
    }
    return items;
  }
  return {
    async courses() {
      const courses = await read('/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100', true);
      return courses.filter(c => c.name).map(c => ({ id: String(c.id), name: c.name, course_code: c.course_code }));
    },
    async grades(courseId) {
      if (typeof courseId !== 'string' || !/^\d+$/.test(courseId)) throw new Error('Invalid course ID.');
      const base = `/api/v1/courses/${courseId}`;
      const course = await read(base);
      const assignments = await read(`${base}/assignments?include[]=submission&per_page=100`, true);
      const groups = await read(`${base}/assignment_groups?per_page=100`, true);
      return {
        source: 'canvas_live', fetched_at: new Date().toISOString(),
        course: { id: String(course.id), name: course.name, apply_assignment_group_weights: course.apply_assignment_group_weights === true },
        assignment_groups: groups.map(g => ({ id: String(g.id), name: g.name, group_weight_percent: g.group_weight, rules: g.rules })),
        assignments: assignments.map(normalizeAssignment),
        engine_ready: false,
        notice: 'Displayed in the current workspace only. Topic mapping is required; not saved or sent to n8n.',
      };
    },
  };
}
module.exports = { createClient, normalizeAssignment };
