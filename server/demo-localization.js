'use strict';

const dataset = require('../demo/classroom-students.json');

// Older seeds store both authored translations in one database string. Select
// from that finite catalog at read time; never infer a translation from script,
// student names, or text entered by a real student or teacher.
const phrases = new Map();
function register(zh, en, separator = ' ') {
  phrases.set(`${zh}${separator}${en}`, { zh, en });
}
for (const student of dataset.students) {
  register(student.goal.zh, student.goal.en, '\n\n');
  for (const note of student.advice) register(note.message.zh, note.message.en, '\n\n');
}
register('【合成演示】探索机械工程，理解设备中的能量转换。', '[Synthetic demo] Explore mechanical engineering and energy conversion in machines.');
register('【合成演示】探索能源工程，理解效率与可持续能源系统。', '[Synthetic demo] Explore energy engineering, efficiency and sustainable energy systems.');
register('自行车传动、机械装置与能量效率。', 'Bicycle drivetrains, machines and energy efficiency.');
register('可持续能源、热泵与节能设计。', 'Sustainable energy, heat pumps and energy-saving design.');
register('【合成演示反馈】独立计算时容易漏掉单位和符号；希望用短练习检验理解，再解释自己的步骤。', '[Synthetic demo feedback] I sometimes miss units and signs. I want short practice followed by explaining my reasoning.');
register('热力学应用作业', 'Thermodynamics assignment', ' · ');
register('热力学测评', 'Thermodynamics assessment', ' · ');
register('画出系统边界，列出能量式，并解释单位与效率检查。', 'Sketch the system boundary, write the energy balance, and explain unit and efficiency checks.');
register('复习四个知识点，准备独立解题并解释关键假设。', 'Review the four topics, solve independently, and explain your assumptions.');

const names = new Map(dataset.students.map(student => {
  const [en, zh] = student.name.split(' · ');
  return [student.name, { en, zh }];
}));
const exact = (value, locale) => phrases.get(value)?.[locale] ?? value;
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function projectProfile(profile, locale) {
  if (profile?.isDemo !== true) return profile;
  const originalName = profile.name;
  return {
    ...profile,
    name: names.get(originalName)?.[locale] ?? originalName,
    goal: exact(profile.goal, locale),
    // Retain both authored names for roster search without displaying both.
    ...(names.has(originalName) ? { searchName: originalName } : {}),
  };
}

function projectContext(context, locale) {
  if (!context) return context;
  const result = { ...context };
  for (const key of ['semesterGoal', 'careerGoal', 'interests', 'feedback']) result[key] = exact(context[key], locale);
  result.deadlines = context.deadlines?.map(deadline => ({
    ...deadline, title: exact(deadline.title, locale), requirements: exact(deadline.requirements, locale),
  }));
  return result;
}

function projectDerived(value, locale, pattern) {
  if (typeof value === 'string') {
    // A teacher may have edited a seed note or quoted part of it. Protect the
    // entire unfamiliar value. Longest literal matches win, so a small custom
    // value such as "Thermodynamics" cannot split an intact catalog phrase.
    return value.replace(pattern, source => exact(source, locale));
  }
  if (Array.isArray(value)) return value.map(entry => projectDerived(entry, locale, pattern));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, projectDerived(child, key === 'en' || key === 'zh' ? key : locale, pattern)]));
}

function projectDemoView(view, locale) {
  if (locale !== 'en' && locale !== 'zh') return view;
  const result = structuredClone(view);
  result.user = projectProfile(result.user, locale);
  result.students = result.students?.map(student => projectProfile(student, locale));
  if (result.student) result.student = projectProfile(result.student, locale);
  const learner = view.student || (view.user?.role === 'student' ? view.user : null);
  if (learner?.isDemo !== true) return result;
  const context = view.context;
  const customText = [learner.goal, ...['semesterGoal', 'careerGoal', 'interests', 'feedback'].map(key => context?.[key]),
    ...(context?.deadlines || []).flatMap(deadline => [deadline.title, deadline.requirements]), ...(view.advice || []).map(note => note.message)]
    .filter(value => typeof value === 'string' && value && !phrases.has(value));
  const pattern = new RegExp([...new Set([...phrases.keys(), ...customText])].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|'), 'g');
  result.context = projectContext(result.context, locale);
  result.advice = result.advice?.map(note => ({ ...note, message: exact(note.message, locale) }));
  // Navigation has already been calculated from the original stored inputs.
  // Only prose is projected; IDs, schedule, priority, and completion are intact.
  result.navigation = projectDerived(result.navigation, locale, pattern);
  result.recommendation = projectDerived(result.recommendation, locale, pattern);
  return result;
}

module.exports = { projectDemoView };
