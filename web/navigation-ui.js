(function () {
  'use strict';
  const TOPICS = ['first_law', 'second_law', 'entropy', 'rankine_cycle'];
  const TEXT = {
    en: {
      priorityLabel: 'Priority calculation', priorityUnknown: 'Not scored — check understanding', priorityFormula: '{weakness} score gap × {impact}% course impact × {urgency} urgency = {score} priority', priorityNote: 'Urgency uses the nearest upcoming deadline; its multipliers are product planning rules. Ties consider feedback, progress and goal links.',
      title: 'Your next 14 days', eyebrow: 'From a starting point to a next step', what: 'What to study', when: 'When to study', how: 'How to study', why: 'Why now', duration: 'Time to set aside', nextReview: 'Next review', deadline: 'Working towards', timezone: 'Times shown in', generated: 'Updated',
      setupTitle: 'Your starting point & destination', setupCopy: 'Tell us what matters, when you are free, and what is due. We will connect that context with your saved assessment and your teacher’s guidance.', setupNeeded: 'Give your route a real starting point', setupNeededCopy: 'Add your goals, availability and deadlines below to build a schedule that fits your week.', editContext: 'Adjust your goals, time & deadlines', jumpToBlock: 'Jump to next study block ↓', readContext: 'View this student’s planning context', noContext: 'This student has not saved their planning context yet.',
      goalsGroup: 'Goals & direction', semesterGoal: 'This semester, I want to…', careerGoal: 'Longer-term or career goal', interests: 'What I am interested in', goalTopics: 'Topics that support my semester goal', careerTopics: 'Topics that connect with my longer-term goal', topicMapping: 'Choose these connections yourself. StudyGPS does not infer subject relevance from your career or goal text.',
      timeGroup: 'Time & learning approach', days: 'Days I can study', startTime: 'Start time', minutesPerDay: 'Available minutes each day', focusMinutes: 'Focus block length', preferredMethod: 'Preferred starting approach', practice: 'Work through problems', explain: 'Explain it in my own words', diagram: 'Draw the relationships', mixed: 'Mix the approaches', scheduleHint: 'Study windows must fit between 06:00 and 22:00. Leave all days unchecked if you cannot schedule time yet.',
      progressGroup: 'Where I am now', progressNote: 'Your own confidence check complements assessment results; it is not a mastery certification.', not_started: 'Not started', learning: 'Still learning', confident: 'Feeling confident',
      feedbackGroup: 'Feedback to act on', feedback: 'Feedback from a teacher or from my own practice', feedbackPlaceholder: 'For example: I can choose a formula, but I still mix up the signs for heat and work.', feedbackTopics: 'Topics this feedback refers to', feedbackNote: 'Saved classroom advice is also considered. This field is for additional feedback you enter yourself.',
      deadlinesGroup: 'Exams & assignments', deadlineTitle: 'Title', deadlineKind: 'Type', exam: 'Exam', assignment: 'Assignment', dueDate: 'Due date', dueTime: 'Due time', deadlineTopics: 'Topics covered', requirements: 'Requirements or instructions', addDeadline: 'Add an exam or assignment', removeDeadline: 'Remove deadline', deadlineLimit: 'Up to 12 deadlines.', noDeadlines: 'No deadlines added. You can still plan from your goals and assessment.',
      save: 'Save context & update my route ↗', cancel: 'Cancel changes', saving: 'Saving…', manualNote: 'This context is entered by you and combined with your StudyGPS records. Your LMS, calendar and n8n are not automatically connected here.', methodNote: 'Retrieval practice and spaced review inform this approach. The 1/3/7-day target gaps and focus minutes are product defaults; dates adapt to availability and actual completion. They are not a uniquely optimal schedule established by research.', source: 'Berkeley · Learning & memory ↗', retrievalSource: 'Berkeley · Retrieval practice ↗',
      learn: 'Learn', review: 'Review', diagnostic: 'Check understanding', unscheduled: 'Not scheduled', noSessions: 'No study blocks can be scheduled yet', noSessionsCopy: 'Review the guidance below and update your availability, progress or assessment.', warnings: 'What needs your attention', planningNotes: 'Planning notes', noReview: 'No further review date scheduled in this route', reviewBeyond: 'Next review', completed: 'Completed', markComplete: 'Mark this study block complete', markIncomplete: 'Reopen this study block', prerequisite: 'Complete the earlier block, then return on a later day.', blockNote: 'Study-block completion is separate from course-task completion and does not demonstrate mastery.', readOnly: 'You can read this student’s route and context. Students update their own context and study blocks.', openPractice: 'Open topic practice ↗', minutes: 'min', focus: 'focus', break: 'break', noTime: 'Time not set', noSummary: 'Save your context to choose a direction.',
      invalidWindow: 'This study window ends after 22:00. Choose an earlier start or fewer minutes.', invalidTopics: 'Choose at least one topic for each exam or assignment.', invalidDeadline: 'Complete each deadline’s title, date, time and topics, or remove that deadline.', saveFailed: 'The context could not be saved. Please try again.', reviewDefault: 'Default review intervals', weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      healthGroup: 'Apple Health simulation', healthScenario: 'Synthetic scenario', off: 'Off', rested: 'Rested', short_sleep: 'Short sleep', no_data: 'No data', healthBadge: 'Synthetic · Not connected', healthNote: 'These are made-up demonstration readings. StudyGPS has not imported or shared any real Apple Health data.', latestSleep: 'Latest sleep', latestOxygen: 'Latest blood oxygen', hours: 'h', sleepTrend: '7-day sleep example', oxygenNote: 'Blood oxygen is displayed only; it does not change the study intensity. Apple describes these readings as being for general wellness, not medical use.', healthEmpty: 'No simulated readings for this scenario. Your chosen learning settings are retained.', healthToday: 'Today’s simulation adjustment', focusCap: 'Focus blocks up to', budgetFactor: 'of today’s time budget', tomorrow: 'Only today is adjusted in this route; later dates use your usual availability. The simulation rolls forward each day until you switch it off.', healthKitSource: 'Apple · HealthKit ↗', oxygenSource: 'Apple · Blood Oxygen information ↗', healthDefaults: 'This optional scenario demonstrates a planning rule. It is not a health assessment or a medical recommendation.',
      first_law: 'First law', second_law: 'Second law', entropy: 'Entropy', rankine_cycle: 'Rankine cycle',
    },
    zh: {
      priorityLabel: '优先级计算', priorityUnknown: '尚无分数，先检查理解', priorityFormula: '{weakness} 分差距 × {impact}% 课程权重 × {urgency} 紧急系数 = {score} 优先分', priorityNote: '紧急系数参考最近的未来截止任务，是产品规划规则。同分时会参考反馈、学习进度与目标关联。',
      title: '未来 14 天，知道怎么学', eyebrow: '从你的起点，找到下一步', what: '学什么', when: '什么时候学', how: '怎么学', why: '为什么现在学', duration: '预留多久', nextReview: '下次复习', deadline: '对应的截止任务', timezone: '时间所用时区', generated: '更新于',
      setupTitle: '你的起点与目的地', setupCopy: '告诉我们目标、空闲时间和截止日期。我们会结合你保存的测评与老师建议，安排下一步。', setupNeeded: '给这条路线一个真实起点', setupNeededCopy: '在下方填写目标、可用时间与截止任务，生成符合你这一周安排的学习路线。', editContext: '调整目标、时间与截止任务', jumpToBlock: '跳到下一段学习 ↓', readContext: '查看这位学生的规划背景', noContext: '这位学生尚未保存规划背景。',
      goalsGroup: '目标与方向', semesterGoal: '这个学期，我想做到……', careerGoal: '长期目标或职业方向', interests: '我感兴趣的内容', goalTopics: '与本学期目标相关的知识点', careerTopics: '与长期目标相关的知识点', topicMapping: '这些关联由你手动选择。StudyGPS 不会根据职业或目标文本自动推断学科关联。',
      timeGroup: '时间与学习方式', days: '每周可以学习的日子', startTime: '开始时间', minutesPerDay: '每天可以用多少分钟', focusMinutes: '每段专注时长', preferredMethod: '偏好的起步方式', practice: '动手解题', explain: '用自己的话解释', diagram: '画出关系', mixed: '组合不同方式', scheduleHint: '学习时段需落在 06:00–22:00 之间。如果暂时无法安排，可以不选择任何日子。',
      progressGroup: '我目前学到哪里', progressNote: '这是你对理解程度的自我判断，会与测评一起参考；不代表已经掌握。', not_started: '还没开始', learning: '正在学习', confident: '感觉比较有把握',
      feedbackGroup: '把反馈变成下一步', feedback: '老师反馈，或我练习时发现的问题', feedbackPlaceholder: '例如：我会选公式，但热量与功的正负号还容易混淆。', feedbackTopics: '这些反馈涉及哪些知识点', feedbackNote: '已保存的班级老师建议也会被参考。这里用于补充你自己录入的反馈。',
      deadlinesGroup: '考试与作业', deadlineTitle: '名称', deadlineKind: '类型', exam: '考试', assignment: '作业', dueDate: '截止日期', dueTime: '截止时间', deadlineTopics: '涉及的知识点', requirements: '要求或说明', addDeadline: '添加考试或作业', removeDeadline: '移除截止任务', deadlineLimit: '最多添加 12 项。', noDeadlines: '尚未添加截止任务。仍然可以依据目标与测评规划。',
      save: '保存背景并更新路线 ↗', cancel: '取消修改', saving: '正在保存…', manualNote: '这些背景由你填写，并与 StudyGPS 内的学习记录结合使用；这里尚未自动连接学校 LMS、日历或 n8n。', methodNote: '学习方式参考主动回忆与间隔复习。1、3、7 天目标间隔及专注分钟数是产品默认值，日期会随可用时间与实际完成情况调整，并非研究证明的唯一最优安排。', source: 'Berkeley · 学习与记忆参考 ↗', retrievalSource: 'Berkeley · 主动回忆参考 ↗',
      learn: '学习', review: '复习', diagnostic: '检查理解', unscheduled: '尚未安排', noSessions: '暂时无法安排学习时段', noSessionsCopy: '查看下方说明，补充或调整可用时间、学习进度或测评。', warnings: '需要你留意', planningNotes: '规划说明', noReview: '这条路线尚未安排后续复习日期', reviewBeyond: '下次复习', completed: '已完成', markComplete: '标记本次学习时段已完成', markIncomplete: '重新打开这次学习时段', prerequisite: '完成前一步后，隔一天再来复习。', blockNote: '学习时段的完成与课程任务完成分别记录，也不代表已经掌握知识点。', readOnly: '你可以查看这位学生的路线与背景。规划背景及学习时段完成情况由学生自己更新。', openPractice: '打开对应练习 ↗', minutes: '分钟', focus: '专注', break: '休息', noTime: '时间未设置', noSummary: '保存规划背景后，再确定方向。',
      invalidWindow: '学习时段超过了 22:00，请提前开始或减少每天分钟数。', invalidTopics: '请为每个考试或作业至少选择一个知识点。', invalidDeadline: '请补全每个截止任务的名称、日期、时间和知识点，或移除该任务。', saveFailed: '暂时无法保存规划背景，请重试。', reviewDefault: '默认复习间隔', weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      healthGroup: 'Apple Health 健康模拟', healthScenario: '合成演示情境', off: '关闭', rested: '休息充分', short_sleep: '睡眠较短', no_data: '没有数据', healthBadge: '合成数据 · 尚未连接', healthNote: '这些读数仅为虚构演示。StudyGPS 尚未导入或共享任何真实 Apple Health 数据。', latestSleep: '最近一次睡眠', latestOxygen: '最近一次血氧', hours: '小时', sleepTrend: '7 天睡眠示例', oxygenNote: '血氧仅作展示，不决定学习强度。Apple 说明这些读数用于一般健康参考，不用于医疗用途。', healthEmpty: '这个情境没有模拟读数，保留你选择的学习设置。', healthToday: '仅今天的模拟调整', focusCap: '每段专注最多', budgetFactor: '的今日时间预算', tomorrow: '本次路线只调整今天，后续日期使用原有安排；保留此演示选项会随日期滚动。', healthKitSource: 'Apple · HealthKit 说明 ↗', oxygenSource: 'Apple · 血氧功能说明 ↗', healthDefaults: '这个可选情境用于演示规划规则，不是健康评估或医疗建议。',
      first_law: '第一定律', second_law: '第二定律', entropy: '熵', rankine_cycle: '朗肯循环',
    },
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function append(parent, ...children) { for (const child of children.flat()) if (child) parent.append(child); return parent; }
  function button(label, className) { const node = element('button', className || 'button button-outline', label); node.type = 'button'; return node; }
  function render(options) {
    const locale = options.locale === 'zh' ? 'zh' : 'en';
    const copy = TEXT[locale];
    const readOnly = options.readOnly === true;
    const hideContext = options.hideContext === true;
    const compact = options.compact === true;
    const context = options.context || null;
    const navigation = options.navigation || null;
    const t = key => copy[key] || key;
    const localized = value => value && typeof value === 'object' ? (value[locale] || value.en || '') : '';
    const topic = id => TOPICS.includes(id) ? t(id) : id;
    const number = value => new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 1 }).format(value || 0);
    const zone = navigation?.timezone || options.timezone || 'Australia/Sydney';
    const date = value => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return t('unscheduled');
      return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-AU', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
    };
    const root = element('section', 'navigation-space');
    root.setAttribute('aria-label', t('title'));
    const summary = element('section', 'navigation-hero');
    append(summary, element('p', 'eyebrow', t('eyebrow')), element('h2', null, t('title')));
    const summaryGrid = element('div', 'navigation-summary');
    ['what', 'when', 'how'].forEach((key, index) => {
      append(summaryGrid, append(element('div', 'navigation-summary-item'), element('span', 'navigation-label', String(index + 1).padStart(2, '0') + ' / ' + t(key)), element('p', null, localized(navigation?.summary?.[key]) || t('noSummary'))));
    });
    append(summary, summaryGrid, element('p', 'navigation-zone', t('timezone') + ' · ' + zone));
    const summaryActions = element('div', 'navigation-summary-actions');
    if (!hideContext) {
      const edit = button(t(readOnly ? 'readContext' : context ? 'editContext' : 'setupTitle'), 'button button-lime navigation-edit-link');
      edit.addEventListener('click', () => {
        const editor = root.querySelector('.navigation-context > details');
        if (!editor) return;
        editor.open = true;
        editor.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        editor.querySelector('summary')?.focus({ preventScroll: true });
      });
      summaryActions.append(edit);
    }
    const nextBlock = navigation?.sessions?.find(session => !session.completed && session.date && session.time && session.canComplete !== false);
    if (nextBlock) {
      const jump = button(t('jumpToBlock'), 'button button-outline navigation-jump-link');
      jump.addEventListener('click', () => {
        const card = [...root.querySelectorAll('.navigation-session')].find(item => item.dataset.sessionId === nextBlock.id);
        if (!card) return;
        card.open = true;
        card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        card.querySelector('summary')?.focus({ preventScroll: true });
      });
      summaryActions.append(jump);
    }
    if (summaryActions.childElementCount) summary.append(summaryActions);
    if (!compact) root.append(summary);
    if (!compact && navigation?.health?.source === 'synthetic' && navigation.health.connected === false && navigation.health.scenario !== 'off') root.append(healthCard(navigation.health));

    if (!context && !hideContext) root.append(append(element('div', 'empty-state navigation-empty'), element('h3', null, t(readOnly ? 'noContext' : 'setupNeeded')), element('p', null, t(readOnly ? 'readOnly' : 'setupNeededCopy'))));
    if (!compact && navigation?.signals?.length) {
      const signals = element('div', 'navigation-signals');
      navigation.signals.forEach(signal => append(signals, append(element('div', 'navigation-signal'), element('span', null, localized(signal.label)), element('strong', null, localized(signal.value)))));
      root.append(signals);
    }
    if (navigation?.warnings?.length) {
      const warnings = compact
        ? append(element('details', 'navigation-warnings navigation-planning-notes'), element('summary', null, `${t('planningNotes')} (${navigation.warnings.length})`))
        : append(element('aside', 'navigation-warnings'), element('h3', null, t('warnings')));
      const list = element('ul');
      navigation.warnings.forEach(warning => list.append(element('li', null, localized(warning))));
      warnings.append(list);
      root.append(warnings);
    }
    if (context || navigation?.sessions?.length) {
      const sessions = navigation?.sessions || [];
      const agenda = element('div', 'navigation-agenda');
      if (!sessions.length) agenda.append(append(element('div', 'empty-state'), element('h3', null, t('noSessions')), element('p', null, t('noSessionsCopy'))));
      const firstActionable = sessions.find(session => !session.completed && session.date && session.time && session.canComplete !== false) || sessions.find(session => !session.completed);
      sessions.forEach(session => {
        const card = element('details', 'navigation-session' + (session.completed ? ' is-complete' : '') + (!session.date ? ' is-unscheduled' : ''));
        card.dataset.sessionId = session.id;
        card.open = session === firstActionable;
        const header = element('summary', 'navigation-session-header');
        const kind = element('span', 'navigation-kind kind-' + (['learn', 'review', 'diagnostic'].includes(session.kind) ? session.kind : 'learn'), t(session.kind));
        const identity = append(element('span', 'navigation-session-name'), kind, element('strong', null, localized(session.title) || topic(session.topicId)));
        const time = append(element('span', 'navigation-session-time'), element('strong', null, session.date ? date(session.date) + (session.time ? ' · ' + session.time : '') : t('unscheduled')), element('span', null, number(session.durationMinutes) + ' ' + t('minutes') + (session.completed ? ' · ' + t('completed') : '')));
        append(header, identity, time, element('span', 'navigation-expand', '+'));
        const body = element('div', 'navigation-session-body');
        const facts = element('div', 'navigation-facts');
        append(facts,
          append(element('div'), element('span', 'navigation-label', t('duration')), element('p', null, number(session.durationMinutes) + ' ' + t('minutes') + ' ' + t('focus') + ' + ' + number(session.breakMinutes) + ' ' + t('minutes') + ' ' + t('break'))),
          append(element('div'), element('span', 'navigation-label', t('nextReview')), element('p', null, session.nextReviewDate ? date(session.nextReviewDate) : t('noReview'))));
        body.append(facts);
        if (session.priority) {
          const priority = session.priority;
          const calculation = element('div', 'navigation-priority navigation-deadline navigation-why');
          let formula = t('priorityUnknown');
          if ([priority.weakness, priority.impact, priority.urgency, priority.score].every(value => typeof value === 'number' && Number.isFinite(value))) {
            formula = t('priorityFormula');
            const priorityNumber = new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 6 });
            for (const [key, value] of Object.entries({ weakness: priority.weakness, impact: priority.impact * 100, urgency: priority.urgency, score: priority.score })) formula = formula.replace('{' + key + '}', priorityNumber.format(value));
          }
          append(calculation, element('span', 'navigation-label', t('priorityLabel')), element('strong', null, formula), element('p', 'form-note', t('priorityNote')));
          body.append(calculation);
        }
        const why = append(element('div', 'navigation-why'), element('h3', null, t('why')));
        const reasons = element('ul');
        (session.why || []).forEach(reason => reasons.append(element('li', null, localized(reason))));
        why.append(reasons);
        body.append(why);
        append(body, element('h3', null, t('how')), element('p', 'navigation-method', localized(session.method)));
        const steps = element('ol', 'navigation-steps');
        (session.steps || []).forEach(step => steps.append(element('li', null, localized(step))));
        body.append(steps);
        if (window.StudyGPSAudio) body.append(window.StudyGPSAudio.create({ topicId: session.topicId, locale, fallbackText: {
          en: [session.method?.en, ...(session.steps || []).map(step => step.en)].filter(Boolean).join('\n\n'),
          zh: [session.method?.zh, ...(session.steps || []).map(step => step.zh)].filter(Boolean).join('\n\n'),
        } }));
        if (session.deadline) {
          append(body, append(element('div', 'navigation-deadline'), element('span', 'navigation-label', t('deadline')), element('strong', null, session.deadline.title), element('span', null, date(session.deadline.dueDate) + (session.deadline.dueTime ? ' · ' + session.deadline.dueTime : ''))));
        }
        const actions = element('div', 'navigation-session-actions');
        const resource = String(session.resourceRef || '');
        if (/^\/?engine\/examples\/resources\/(first-law|second-law|entropy|rankine-cycle)\.md$/.test(resource)) {
          const link = element('a', 'text-link', t('openPractice'));
          link.href = '/' + resource.replace(/^\//, ''); link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
        }
        if (!readOnly && session.date && session.time) {
          const complete = button(t(session.completed ? 'markIncomplete' : 'markComplete'), 'button button-outline button-small');
          complete.disabled = !session.completed && session.canComplete === false;
          complete.addEventListener('click', () => { if (!complete.disabled) void options.onComplete?.({ sessionId: session.id, completed: !session.completed }, actions, complete); });
          actions.append(complete);
          if (complete.disabled) actions.append(element('p', 'form-note navigation-prerequisite', t('prerequisite')));
        }
        body.append(actions);
        append(card, header, body);
        agenda.append(card);
      });
      root.append(agenda);
      if (!hideContext) root.append(element('p', 'form-note navigation-block-note', t(readOnly ? 'readOnly' : 'blockNote')));
    }
    if (!hideContext) root.append(contextEditor());
    const source = element('div', 'navigation-evidence');
    source.append(element('p', null, t('methodNote')));
    const link = element('a', 'text-link', t('source'));
    link.href = 'https://gsi.berkeley.edu/gsi-guide-contents/learning-theory-research/neuroscience/';
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    source.append(link); const memoryLink = element('a', 'text-link', t('retrievalSource')); memoryLink.href = 'https://gsi.berkeley.edu/gsi-guide-contents/learning-theory-research/memory/'; memoryLink.target = '_blank'; memoryLink.rel = 'noopener noreferrer'; source.append(memoryLink); root.append(source);
    return root;

    function healthCard(health) {
      const card = element('section', 'panel navigation-health');
      append(card, append(element('div', 'panel-heading'), append(element('div'), element('span', 'section-index', t('healthBadge')), element('h3', null, t('healthGroup'))), element('span', 'navigation-health-symbol', '◷')));
      card.append(element('p', 'form-note', t('healthNote')));
      const safeNumber = value => typeof value === 'number' && Number.isFinite(value) ? number(value) : '—';
      if (health.latest) {
        const metrics = element('div', 'navigation-health-metrics');
        append(metrics,
          append(element('div'), element('span', 'navigation-label', t('latestSleep')), append(element('strong'), document.createTextNode(safeNumber(health.latest.sleepHours)), element('small', null, t('hours')))),
          append(element('div'), element('span', 'navigation-label', t('latestOxygen')), append(element('strong'), document.createTextNode(safeNumber(health.latest.oxygenPercent)), element('small', null, '%'))));
        card.append(metrics);
      } else card.append(element('p', 'panel-copy', t('healthEmpty')));
      const samples = Array.isArray(health.samples) ? health.samples.slice(-7) : [];
      if (samples.length) {
        const figure = element('figure', 'navigation-sleep-figure');
        figure.append(element('figcaption', null, t('sleepTrend')));
        const chart = element('div', 'navigation-sleep-bars');
        samples.forEach(sample => {
          const column = element('div', 'navigation-sleep-day');
          column.setAttribute('aria-label', date(sample.date) + ': ' + safeNumber(sample.sleepHours) + ' ' + t('hours') + ', ' + safeNumber(sample.oxygenPercent) + '%');
          const value = element('span', 'navigation-sleep-value', safeNumber(sample.sleepHours)); value.setAttribute('aria-hidden', 'true');
          const track = element('div', 'navigation-sleep-track'); track.setAttribute('aria-hidden', 'true');
          const bar = element('span', 'navigation-sleep-bar');
          bar.style.height = (typeof sample.sleepHours === 'number' && Number.isFinite(sample.sleepHours) ? Math.max(0, Math.min(12, sample.sleepHours)) / 12 * 100 : 0) + '%';
          track.append(bar);
          const day = element('span', 'navigation-sleep-date', String(sample.date || '').slice(-2)); day.setAttribute('aria-hidden', 'true');
          append(column, value, track, day); chart.append(column);
        });
        figure.append(chart); card.append(figure);
      }
      if (health.adjustment?.focusCapMinutes && health.adjustment?.todayBudgetFactor < 1) {
        const adjustment = element('div', 'navigation-health-adjustment');
        append(adjustment, element('span', 'navigation-label', t('healthToday')), element('p', null, t('focusCap') + ' ' + number(health.adjustment.focusCapMinutes) + ' ' + t('minutes') + ' · ' + number(health.adjustment.todayBudgetFactor * 100) + '% ' + t('budgetFactor')), element('p', 'form-note', t('tomorrow')));
        card.append(adjustment);
      }
      if (localized(health.message)) card.append(element('p', 'panel-copy', localized(health.message)));
      card.append(element('p', 'form-note navigation-health-caveat', t('oxygenNote')));
      const links = element('div', 'navigation-health-links');
      for (const [label, url] of [['healthKitSource', 'https://developer.apple.com/documentation/healthkit'], ['oxygenSource', 'https://support.apple.com/en-gb/120358']]) {
        const link = element('a', 'text-link', t(label)); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link);
      }
      card.append(links); return card;
    }

    function contextEditor() {
      const section = element('section', 'panel navigation-context');
      const details = element('details', 'profile-details');
      details.open = !context;
      details.append(element('summary', null, t(readOnly ? 'readContext' : context ? 'editContext' : 'setupTitle')));
      if (readOnly && !context) { details.append(element('p', 'panel-copy', t('noContext'))); section.append(details); return section; }
      const form = element('form', 'form-grid');
      form.id = 'navigation-context-form';
      const controls = element('fieldset');
      controls.disabled = readOnly;
      const current = context || {
        semesterGoal: options.goal || '', careerGoal: '', interests: '', preferredMethod: 'mixed', focusMinutes: 25,
        availability: { days: [1, 2, 3, 4, 5], startTime: '18:00', minutesPerDay: 60 },
        goalTopics: [], careerTopics: [], topicProgress: Object.fromEntries(TOPICS.map(id => [id, 'not_started'])), feedback: '', feedbackTopics: [], deadlines: [],
      };
      const fields = {};
      const group = (label, open) => {
        const wrapper = element('details', 'navigation-form-group'); wrapper.open = Boolean(open);
        wrapper.append(element('summary', null, label));
        const content = element('div', 'form-grid'); wrapper.append(content); controls.append(wrapper); return content;
      };
      const field = (parent, name, label, config = {}) => {
        const wrapper = element('div', 'field'); const caption = element('label', null, label);
        const input = element(config.choices ? 'select' : config.multiline ? 'textarea' : 'input');
        input.id = 'nav-' + name; input.name = name; caption.htmlFor = input.id;
        if (!config.choices && !config.multiline) input.type = config.type || 'text';
        for (const key of ['min', 'max', 'step', 'maxLength', 'required', 'placeholder', 'rows']) if (config[key] !== undefined) input[key] = config[key];
        if (config.choices) config.choices.forEach(choice => { const option = element('option', null, choice.label); option.value = choice.value; input.append(option); });
        input.value = config.value ?? current[name] ?? '';
        append(wrapper, caption, input); parent.append(wrapper); return input;
      };
      const topicPicker = (parent, name, label, selected) => {
        const group = element('fieldset', 'navigation-topic-picker'); group.append(element('legend', null, label));
        const inputs = TOPICS.map(id => {
          const label = element('label', 'navigation-choice'); const input = element('input'); input.type = 'checkbox'; input.value = id; input.name = name; input.checked = (selected || []).includes(id);
          append(label, input, element('span', null, topic(id))); group.append(label); return input;
        });
        parent.append(group); return () => inputs.filter(input => input.checked).map(input => input.value);
      };
      const goals = group(t('goalsGroup'), true);
      goals.append(element('p', 'panel-copy', t('setupCopy')));
      fields.semesterGoal = field(goals, 'semesterGoal', t('semesterGoal'), { multiline: true, maxLength: 500, rows: 2 });
      fields.careerGoal = field(goals, 'careerGoal', t('careerGoal'), { maxLength: 300 });
      fields.interests = field(goals, 'interests', t('interests'), { maxLength: 300 });
      const goalTopics = topicPicker(goals, 'goalTopics', t('goalTopics'), current.goalTopics);
      const careerTopics = topicPicker(goals, 'careerTopics', t('careerTopics'), current.careerTopics);
      goals.append(element('p', 'form-note', t('topicMapping')));
      const time = group(t('timeGroup'), !context);
      const dayGroup = element('fieldset', 'navigation-day-picker'); dayGroup.append(element('legend', null, t('days')));
      const days = copy.weekdays.map((label, index) => { const item = element('label', 'navigation-choice'); const input = element('input'); input.type = 'checkbox'; input.value = String(index + 1); input.checked = current.availability.days.includes(index + 1); input.name = 'days'; append(item, input, element('span', null, label)); dayGroup.append(item); return input; });
      time.append(dayGroup);
      const timeFields = element('div', 'two-fields'); time.append(timeFields);
      const startTime = field(timeFields, 'startTime', t('startTime'), { type: 'time', min: '06:00', max: '21:30', required: true, value: current.availability.startTime });
      const minutes = field(timeFields, 'minutesPerDay', t('minutesPerDay'), { type: 'number', min: 30, max: 240, step: 5, required: true, value: current.availability.minutesPerDay });
      fields.focusMinutes = field(time, 'focusMinutes', t('focusMinutes'), { type: 'number', min: 15, max: 60, step: 5, required: true });
      fields.preferredMethod = field(time, 'preferredMethod', t('preferredMethod'), { choices: ['practice', 'explain', 'diagram', 'mixed'].map(value => ({ value, label: t(value) })) });
      time.append(element('p', 'form-note', t('scheduleHint')));
      const health = group(t('healthGroup'));
      fields.healthDemo = field(health, 'healthDemo', t('healthScenario'), { value: current.healthDemo || 'off', choices: ['off', 'rested', 'short_sleep', 'no_data'].map(value => ({ value, label: t(value) })) });
      append(health, element('p', 'form-note', t('healthNote')), element('p', 'form-note', t('healthDefaults')));
      const progress = group(t('progressGroup'));
      progress.append(element('p', 'form-note', t('progressNote')));
      const progressFields = Object.fromEntries(TOPICS.map(id => [id, field(progress, 'progress-' + id, topic(id), { value: current.topicProgress[id], choices: ['not_started', 'learning', 'confident'].map(value => ({ value, label: t(value) })) })]));
      const feedback = group(t('feedbackGroup'));
      fields.feedback = field(feedback, 'feedback', t('feedback'), { multiline: true, maxLength: 1000, rows: 3, placeholder: t('feedbackPlaceholder') });
      const feedbackTopics = topicPicker(feedback, 'feedbackTopics', t('feedbackTopics'), current.feedbackTopics);
      feedback.append(element('p', 'form-note', t('feedbackNote')));
      const deadlines = group(t('deadlinesGroup'), !context);
      const deadlineList = element('div', 'navigation-deadline-list');
      const deadlineRows = [];
      const noDeadlines = element('p', 'form-note', t('noDeadlines'));
      const add = button(t('addDeadline'), 'button button-outline button-small');
      const syncDeadlines = () => { noDeadlines.hidden = deadlineRows.length > 0; add.disabled = readOnly || deadlineRows.length >= 12; };
      const addDeadline = existing => {
        if (deadlineRows.length >= 12) return;
        const entry = existing || { id: crypto.randomUUID(), title: '', kind: 'assignment', dueDate: '', dueTime: '17:00', topicIds: [], requirements: '' };
        const row = element('fieldset', 'navigation-deadline-editor');
        const identity = 'deadline-' + entry.id;
        const title = field(row, identity + '-title', t('deadlineTitle'), { value: entry.title, required: true, maxLength: 160 });
        const kind = field(row, identity + '-kind', t('deadlineKind'), { value: entry.kind, choices: ['exam', 'assignment'].map(value => ({ value, label: t(value) })) });
        const dates = element('div', 'two-fields'); row.append(dates);
        const dueDate = field(dates, identity + '-date', t('dueDate'), { type: 'date', value: entry.dueDate, required: true });
        const dueTime = field(dates, identity + '-time', t('dueTime'), { type: 'time', value: entry.dueTime, required: true });
        const topicIds = topicPicker(row, identity + '-topics', t('deadlineTopics'), entry.topicIds);
        const requirements = field(row, identity + '-requirements', t('requirements'), { multiline: true, value: entry.requirements, maxLength: 1000, rows: 3 });
        const item = { node: row, read: () => ({ id: entry.id, title: title.value.trim(), kind: kind.value, dueDate: dueDate.value, dueTime: dueTime.value, topicIds: topicIds(), requirements: requirements.value.trim() }) };
        deadlineRows.push(item);
        if (!readOnly) { const remove = button(t('removeDeadline'), 'button button-small navigation-remove'); remove.addEventListener('click', () => { deadlineRows.splice(deadlineRows.indexOf(item), 1); row.remove(); syncDeadlines(); }); row.append(remove); }
        deadlineList.append(row); syncDeadlines();
      };
      (current.deadlines || []).forEach(addDeadline);
      append(deadlines, noDeadlines, deadlineList);
      if (!readOnly) { add.addEventListener('click', () => addDeadline()); append(deadlines, add, element('p', 'form-note', t('deadlineLimit'))); }
      syncDeadlines(); form.append(controls);
      const status = element('p', 'navigation-form-error'); status.setAttribute('role', 'alert'); status.hidden = true; form.append(status);
      if (!readOnly) {
        const actions = element('div', 'form-actions'); const save = button(t('save'), 'button button-dark'); save.type = 'submit'; const cancel = button(t('cancel'), 'button button-outline');
        cancel.addEventListener('click', () => { const replacement = contextEditor(); section.replaceWith(replacement); });
        append(actions, save, cancel); append(form, actions, element('p', 'form-note', t('manualNote')));
        form.addEventListener('submit', async event => {
          event.preventDefault(); status.hidden = true;
          const invalid = [...form.querySelectorAll('input,textarea,select')].find(input => !input.checkValidity());
          if (invalid) { for (let parent = invalid.parentElement; parent && parent !== form; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true; invalid.reportValidity(); return; }
          const [hour, minute] = startTime.value.split(':').map(Number);
          if (hour * 60 + minute + Number(minutes.value) > 1320) { status.textContent = t('invalidWindow'); status.hidden = false; return; }
          const deadlineValues = deadlineRows.map(item => item.read());
          if (deadlineValues.some(item => !item.topicIds.length)) { status.textContent = t('invalidTopics'); status.hidden = false; return; }
          const result = {
            semesterGoal: fields.semesterGoal.value.trim(), careerGoal: fields.careerGoal.value.trim(), interests: fields.interests.value.trim(), preferredMethod: fields.preferredMethod.value,
            focusMinutes: Number(fields.focusMinutes.value), healthDemo: fields.healthDemo.value, availability: { days: days.filter(input => input.checked).map(input => Number(input.value)), startTime: startTime.value, minutesPerDay: Number(minutes.value) },
            goalTopics: goalTopics(), careerTopics: careerTopics(), topicProgress: Object.fromEntries(TOPICS.map(id => [id, progressFields[id].value])), feedback: fields.feedback.value.trim(), feedbackTopics: feedbackTopics(), deadlines: deadlineValues,
          };
          try { await options.onSave?.({ context: result }, form, save); } catch (_) { status.textContent = t('saveFailed'); status.hidden = false; }
        });
      }
      details.append(form); section.append(details); return section;
    }
  }
  window.StudyGPSNavigationUI = Object.freeze({ render });
})();
