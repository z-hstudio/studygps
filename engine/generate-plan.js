'use strict';

const BLOCK_MINUTES = 30;

function taskId(studentId, courseId, topicId, taskType = 'remedial') {
  return ['studygps', taskType, studentId, courseId, topicId].map(encodeURIComponent).join(':');
}

function allocateTasks(input, course, rankedTopics) {
  const configured = new Map(course.topics.map((topic) => [topic.topic_id, topic]));
  const priorities = [];
  const warnings = [];
  let remaining = input.available_minutes;
  for (const topic of rankedTopics) {
    if (remaining < BLOCK_MINUTES) break;
    const duration = Math.floor(Math.min(remaining, topic.estimated_minutes) / BLOCK_MINUTES) * BLOCK_MINUTES;
    if (duration === 0) {
      warnings.push({ code: 'TOPIC_BELOW_BLOCK_SIZE', topic_id: topic.topic_id, message: `${topic.topic_name} has a configured estimate below 30 minutes, so no full learning block fits.` });
      continue;
    }
    const resource = configured.get(topic.topic_id);
    priorities.push({
      task_id: taskId(input.student_id, input.course_id, topic.topic_id),
      task_type: 'remedial',
      topic_id: topic.topic_id,
      topic_name: topic.topic_name,
      priority: priorities.length + 1,
      duration_minutes: duration,
      estimated_minutes: topic.estimated_minutes,
      is_partial: duration < topic.estimated_minutes,
      resource_id: resource.resource_id,
      resource_ref: resource.resource_ref,
      activity: resource.activity,
      reason: '',
    });
    remaining -= duration;
  }
  return { priorities, warnings };
}

module.exports = { allocateTasks, taskId, BLOCK_MINUTES };
