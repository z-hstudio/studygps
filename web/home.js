(function () {
  'use strict';

  var messages = {
    zh: {
      pageTitle: 'StudyGPS · 学习，自有方向',
      pageDescription: '明确学什么、何时学、怎么学。StudyGPS 结合你的目标、截止日期、时间习惯和学习记录，规划下一段学习路线。',
      skip: '跳到主要内容', navigation: '主导航', language: '语言',
      navPricing: '价格方案', navApproach: '学习方式', navTogether: '师生协作', navDemo: '体验演示 ↗', login: '登录',
      heroEyebrow: '为大学生设计的学习导航', headlineFirst: '学习，', headlineSecond: '自有方向。',
      heroDescription: '学什么，何时学，怎么学。从你现在的位置出发，把目标和可用时间变成一条可以开始、随进度调整的学习路线。',
      startRoute: '开启我的学习路线', tryDemo: '先试试看', heroNote: '当前位置 → 目标 → 学习路线 → 更新后重新规划。',
      annotationLabel: '下一站 · 演示路线', annotationTopic: '把朗肯循环，学明白。', annotationTime: '25 分钟专注 · 从薄弱点出发',
      discover: '找到你的下一步',
      approachEyebrow: '不止看见分数 · 更要看见你', approachFirst: '同样的分数，', approachSecond: '不同的下一步。',
      approachDescription: '填写截止日期、课程要求、目标与时间习惯。结合本站成绩、进度和教师反馈，看清你的下一步。',
      diagnoseTag: '看清起点', diagnoseTitle: '总分相同，差距不同。', diagnoseDescription: '深入每个知识点，发现总分没有告诉你的事。',
      diagnosisAlt: '演示：Alex 与 Sarah 加权总分同为 63.5。第一定律分别为 85、50；朗肯循环分别为 50、85。',
      sameScore: '相同加权总分', firstLaw: '第一定律', rankine: '朗肯循环', diagnoseFootnote: '热力学演示数据 · 使用配置权重计算',
      timeTag: '掌握节奏', timeTitle: '把时间，花在重点上。', timeDescription: '按你填写的截止日期与可用时段，将任务排进接下来14天的路线。',
      timeUnit: '分钟 / 学习分块', timeFootnote: '带日期与学习方法 · 按可用时间安排',
      rerouteTag: '随你调整', rerouteTitle: '你在前进，路线也是。', rerouteDescription: '新测评到来，重新识别重点，让下一步跟上你。',
      alexDemo: 'Alex · 演示', newPriority: '新的优先学习点', secondLaw: '第二定律', rerouteFootnote: '推荐 → 完成 → 新测评 → 重规划 · 合成演示',
      routeStart: '当前位置', routeGoal: '学习目标', routePlan: '学习路线', routeUpdate: '更新并重规划',
      scienceTitle: '学习科学', scienceIntro: '把研究中的学习方法，变成今天的小行动。',
      recallTitle: '主动回忆', recallText: '合上笔记，解释概念，再核对遗漏。',
      spacingTitle: '间隔复习', spacingText: '把旧知识放回后续时段，分次再练习。',
      focusTitle: '专注练习', focusText: '每次解决一个明确问题，并复核思路。',
      restTitle: '休息与睡眠', restText: '给休息和充足睡眠留出空间。',
      scienceNeuroscience: '神经科学与学习 ↗', scienceMemory: '记忆与学习 ↗', scienceSpacing: '间隔练习研究 ↗',
      scienceNote: '参考 Berkeley 教学资料；复习间隔为可调整的规划规则。无 Berkeley 背书或合作关系。',
      problemTitle: '知道哪天要交，还需要知道今天先做什么。', problemCopy: '笔记、截止日期和任务清单提供了信息。StudyGPS 把它们与你的掌握程度、可用时间和目标连接起来，帮助你确定下一步，再根据完成情况与新测评重新规划。',
      priorityTitle: 'StudyGPS 如何安排优先级', priorityContext: '学习空间与交互演示 · 透明的路线规则', priorityPlain: '一个知识点越薄弱、越重要、越紧迫，就越值得优先学习。', priorityFormulaLabel: '优先级等于薄弱程度乘以影响乘以紧迫程度', priority: '优先级', weakness: '薄弱程度', impact: '影响', urgency: '紧迫程度',
      weaknessDefinition: '薄弱程度 = max(0, 目标分 − 已记录成绩)。差距越大，越值得先投入。', impactDefinition: '影响 = 课程配置权重。优先考虑对课程更重要的知识点。', urgencyDefinition: '紧迫程度随未来截止日期临近而上升。越临近，就越需要优先准备。',
      urgencyRules: '截止时间距今不超过 1 / 3 / 7 / 14 天，系数分别为 4 / 3 / 2 / 1.5；更远或无截止日期时为 1。这些是产品规则，并非研究证实的最优系数。',
      priorityExample: '同样的差距，不同的紧迫程度', priorityNear: '3 天后截止', priorityLater: '超过 14 天后截止', priorityNote: '示例：分数差距 20、权重 30%。缺失成绩先安排检查理解，不按零分处理。学习空间和交互演示中带日期的路线都使用此公式；演示页下方仅基于测评的参考引擎保留原有计算。',
      approachNote: '每条路线，都能查看排序与时间分配的依据。', exploreEngine: '动手试一试',
      togetherEyebrow: '各自的空间 · 共同的成长', togetherFirst: '每个学生，', togetherSecond: '都值得被看见。',
      togetherDescription: '学生拥有自己的学习空间。老师看清自己班级中每个人的不同，把理解变成具体的个性化建议。',
      roleTabs: '查看不同角色', studentTab: '我是学生', teacherTab: '我是老师',
      studentBenefit1: '自己的计划，在自己的账户里', studentBenefit2: '回看知识点成绩与学习进度', studentBenefit3: '收到老师专门为你写的建议',
      teacherBenefit1: '在管理空间查看自己班级的学生', teacherBenefit2: '逐人查看成绩、计划与学习进度', teacherBenefit3: '保存针对不同学生的个性化建议',
      openSpace: '进入我的空间', illustration: '功能示意', personalSpace: '个人学习空间', helloAlex: 'Alex，找到你的节奏。',
      yourNextStep: '你的下一步', minutes: '分钟', mockRouteDescription: '用一段专注时间，先凭记忆画出四个过程，再对照资料检查。',
      understand: '理解', practice: '练习', review: '复习', assess: '测评', teacherAdvice: '来自老师的建议 · 示例',
      mockAdvice: '先画出 T-s 图，再解释每一段能量如何流动。你对第一定律的理解可以帮上忙。',
      teachingSpace: '班级管理空间', classTitle: '看清每一种不同。', exampleClass: '热力学 · 示例班级', twoStudents: '2 位学生',
      alexFocus: '重点：朗肯循环', sarahFocus: '重点：第一定律', adviceForSarah: '给 Sarah 的个性化建议 · 示例',
      sarahAdvice: '从封闭系统的能量平衡开始，用一个活塞案例区分功与热量。', noteExample: '建议记录示意',
      sceneCaption: '角色与界面示意。实际数据在登录后的专属空间查看。',
      closingEyebrow: '少一点迷茫 · 多一个清晰的开始', closingFirst: '下一步，', closingSecond: '为你而定。',
      closingDescription: '带上你的目标。我们一起找到起点。', footerNote: '让每一小时，都有方向。', sourceCode: '查看源代码'
    },
    en: {
      pageTitle: 'StudyGPS · Learning, with direction',
      pageDescription: 'Know what to learn, when to study and how to practise. Plan a study route around your goals, deadlines, available time and learning records.',
      skip: 'Skip to main content', navigation: 'Main navigation', language: 'Language',
      navPricing: 'Pricing', navApproach: 'Our approach', navTogether: 'Learn together', navDemo: 'Explore the demo ↗', login: 'Log in',
      heroEyebrow: 'LEARNING NAVIGATION FOR UNIVERSITY STUDENTS', headlineFirst: 'Learning,', headlineSecond: 'with direction.',
      heroDescription: 'Know what to learn, when to study and how to practise. Turn where you are, where you want to go and the time you have into your next study route.',
      startRoute: 'Find my study route', tryDemo: 'Try the demo', heroNote: 'Your position → your goal → a route → replan as you go.',
      annotationLabel: 'NEXT STOP · DEMO ROUTE', annotationTopic: 'Make sense of the Rankine cycle.', annotationTime: '25-minute focus · Start with the gap',
      discover: 'Find your next step',
      approachEyebrow: 'BEYOND A SCORE. A PICTURE OF YOU.', approachFirst: 'The same score.', approachSecond: 'A different next step.',
      approachDescription: 'Enter your deadlines, course requirements, goals and study habits. Bring them together with your scores, progress and teacher feedback in StudyGPS.',
      diagnoseTag: 'Find your starting point', diagnoseTitle: 'Same score. Different gaps.', diagnoseDescription: 'Look closer at each topic. Discover what the total leaves out.',
      diagnosisAlt: 'Demo: Alex and Sarah both have a weighted score of 63.5. Their First Law scores are 85 and 50; their Rankine cycle scores are 50 and 85.',
      sameScore: 'Same weighted score', firstLaw: 'First Law', rankine: 'Rankine cycle', diagnoseFootnote: 'Thermodynamics demo · Configured weights',
      timeTag: 'Set your pace', timeTitle: 'Make time for what matters.', timeDescription: 'Use your deadlines and available study times to place tasks along a 14-day route.',
      timeUnit: 'MINUTES / STUDY BLOCK', timeFootnote: 'Dated tasks and study methods · Built around your time',
      rerouteTag: 'Adapt as you go', rerouteTitle: 'You move forward. So does your route.', rerouteDescription: 'A new assessment brings a fresh view of what to focus on next.',
      alexDemo: 'Alex · Demo', newPriority: 'Your new learning priority', secondLaw: 'Second Law', rerouteFootnote: 'Recommend → complete → reassess → replan · Synthetic demo',
      routeStart: 'Your position', routeGoal: 'Your goal', routePlan: 'Your study route', routeUpdate: 'Update and replan',
      scienceTitle: 'Science behind Study GPS', scienceIntro: 'Practical methods, informed by learning research.',
      recallTitle: 'Active recall', recallText: 'Close your notes, explain the idea, then check what you missed.',
      spacingTitle: 'Spaced review', spacingText: 'Return to earlier topics across separate sessions.',
      focusTitle: 'Focused practice', focusText: 'Solve one clear problem and review the reasoning.',
      restTitle: 'Rest and sleep', restText: 'Leave room for breaks and adequate sleep.',
      scienceNeuroscience: 'Neuroscience and learning ↗', scienceMemory: 'Memory and learning ↗', scienceSpacing: 'Spacing evidence ↗',
      scienceNote: 'References inform these methods. Review intervals are adjustable planning rules. No Berkeley endorsement or partnership.',
      problemTitle: 'Knowing what is due still leaves a next step to choose.', problemCopy: 'Notes, deadlines and task lists provide information. StudyGPS connects them with your understanding, available time and goals to choose a next step, then replans after completed work and a new assessment.',
      priorityTitle: 'How StudyGPS prioritises your study', priorityContext: 'Workspace and interactive demo · Transparent route rules', priorityPlain: 'The weaker, more important and more urgent a topic is, the higher it moves.', priorityFormulaLabel: 'Priority equals weakness times impact times urgency', priority: 'Priority', weakness: 'Weakness', impact: 'Impact', urgency: 'Urgency',
      weaknessDefinition: 'Weakness = max(0, target score − recorded score). Larger gaps deserve attention.', impactDefinition: 'Impact = the configured course weight. Give more attention to topics that matter more in the course.', urgencyDefinition: 'Urgency increases as a future deadline approaches, bringing related preparation forward.',
      urgencyRules: 'Due within 1 / 3 / 7 / 14 days: factors 4 / 3 / 2 / 1.5. Later or no deadline: 1. These are product rules, not research-validated optimal factors.',
      priorityExample: 'Same gap. Different urgency.', priorityNear: 'Due in 3 days', priorityLater: 'More than 14 days away', priorityNote: 'Example: a 20-point gap and 30% weight. Unknown scores trigger a check of understanding, not a zero-score assumption. Dated routes in your workspace and the interactive demo use this formula; the assessment-only reference below the interactive demo retains its original calculation.',
      approachNote: 'See the reasoning behind every priority and every block of time.', exploreEngine: 'Try it for yourself',
      togetherEyebrow: 'PERSONAL SPACES. SHARED PROGRESS.', togetherFirst: 'Every student', togetherSecond: 'deserves to be seen.',
      togetherDescription: 'A personal space for each student. A clearer view for their teacher. Turn an understanding of individual needs into specific, thoughtful guidance.',
      roleTabs: 'Explore a role', studentTab: 'For students', teacherTab: 'For teachers',
      studentBenefit1: 'Your own plan, in your own account', studentBenefit2: 'Review topic scores and study progress', studentBenefit3: 'Read advice written for you by your teacher',
      teacherBenefit1: 'Manage students in your own classes', teacherBenefit2: 'Review individual scores, plans and progress', teacherBenefit3: 'Save personal advice for each student',
      openSpace: 'Enter my workspace', illustration: 'Feature preview', personalSpace: 'PERSONAL WORKSPACE', helloAlex: 'Alex, find your rhythm.',
      yourNextStep: 'YOUR NEXT STEP', minutes: 'min', mockRouteDescription: 'Use one focus block to sketch the four stages from memory, then check your explanation against the material.',
      understand: 'Learn', practice: 'Practise', review: 'Review', assess: 'Assess', teacherAdvice: 'TEACHER GUIDANCE · EXAMPLE',
      mockAdvice: 'Sketch the T-s diagram first. Then explain the energy flow at each stage. Your understanding of the First Law will help.',
      teachingSpace: 'CLASS WORKSPACE', classTitle: 'See each student clearly.', exampleClass: 'Thermodynamics · Sample class', twoStudents: '2 students',
      alexFocus: 'Focus: Rankine cycle', sarahFocus: 'Focus: First Law', adviceForSarah: 'PERSONAL GUIDANCE FOR SARAH · EXAMPLE',
      sarahAdvice: 'Start with the energy balance of a closed system. Use a piston example to distinguish work from heat.', noteExample: 'Example guidance record',
      sceneCaption: 'Illustrative interface. Sign in to view real data in your own workspace.',
      closingEyebrow: 'LESS GUESSWORK. A CLEARER BEGINNING.', closingFirst: 'Your next step.', closingSecond: 'Made for you.',
      closingDescription: 'Bring your ambition. Let’s find your starting point.', footerNote: 'Give every hour a sense of direction.', sourceCode: 'View source'
    }
  };

  function storedLocale() {
    try {
      var current = window.localStorage.getItem('studygps-locale');
      if (current === 'en' || current === 'zh') return current;
      var legacy = window.localStorage.getItem('studygps.locale');
      return legacy === 'en' || legacy === 'zh' ? legacy : null;
    } catch (_) { return null; }
  }

  function getInitialLocale() {
    var query = new URL(window.location.href).searchParams.get('lang');
    if (query === 'en' || query === 'zh') return query;
    var saved = storedLocale();
    if (saved === 'en' || saved === 'zh') return saved;
    return 'en';
  }

  function applyLocale(locale, updateAddress) {
    if (!Object.prototype.hasOwnProperty.call(messages, locale)) return;
    var dictionary = messages[locale];
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = dictionary.pageTitle;
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', dictionary.pageDescription);
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      var key = element.getAttribute('data-i18n');
      if (Object.prototype.hasOwnProperty.call(dictionary, key)) element.textContent = dictionary[key];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (element) {
      var key = element.getAttribute('data-i18n-aria');
      if (Object.prototype.hasOwnProperty.call(dictionary, key)) element.setAttribute('aria-label', dictionary[key]);
    });
    document.querySelectorAll('[data-locale]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-locale') === locale));
    });
    document.querySelectorAll('[data-locale-link], [data-home-link]').forEach(function (link) {
      var target = new URL(link.getAttribute('href'), window.location.href);
      target.searchParams.set('lang', locale);
      link.setAttribute('href', target.pathname + target.search + target.hash);
    });
    try { window.localStorage.setItem('studygps-locale', locale); window.localStorage.setItem('studygps.locale', locale); } catch (_) { /* Private browsing still supports the selected language. */ }
    if (updateAddress) {
      try {
        var address = new URL(window.location.href);
        address.searchParams.set('lang', locale);
        window.history.replaceState(null, '', address.pathname + address.search + address.hash);
      } catch (_) { /* The interface remains usable when history updates are unavailable. */ }
    }
  }

  document.querySelectorAll('[data-locale]').forEach(function (button) {
    button.addEventListener('click', function () { applyLocale(button.getAttribute('data-locale'), true); });
  });
  window.addEventListener('popstate', function () { applyLocale(getInitialLocale(), false); });
  applyLocale(getInitialLocale(), false);

  var roleTabs = Array.from(document.querySelectorAll('[data-role-tab]'));
  function selectRole(role, focus) {
    if (role !== 'student' && role !== 'teacher') return;
    roleTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-role-tab') === role;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
      var benefits = document.getElementById(tab.getAttribute('data-role-tab') + '-benefits');
      if (benefits) benefits.hidden = !active;
      if (active && focus) tab.focus();
    });
  }
  roleTabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { selectRole(tab.getAttribute('data-role-tab'), false); });
    tab.addEventListener('keydown', function (event) {
      var nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % roleTabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index + roleTabs.length - 1) % roleTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = roleTabs.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      selectRole(roleTabs[nextIndex].getAttribute('data-role-tab'), true);
    });
  });

  var motionPreference = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
  var hero = document.querySelector('.hero');
  var artwork = document.querySelector('.hero-art');
  if (hero && artwork && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', function (event) {
      if (motionPreference.matches) return;
      var bounds = hero.getBoundingClientRect();
      var x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
      var y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 9;
      artwork.style.setProperty('--art-x', x.toFixed(2) + 'px');
      artwork.style.setProperty('--art-y', y.toFixed(2) + 'px');
    });
    hero.addEventListener('pointerleave', function () {
      artwork.style.setProperty('--art-x', '0px');
      artwork.style.setProperty('--art-y', '0px');
    });
  }

  // Content is visible by default. Reveals use only optional Web Animations;
  // no class can leave the page hidden if a browser lacks a required feature.
  if ('IntersectionObserver' in window && !motionPreference.matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (motionPreference.matches || typeof entry.target.animate !== 'function') return;
        try {
          entry.target.animate([
            { opacity: 0.45, transform: 'translateY(18px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'none' });
        } catch (_) { /* Animation failure never hides content. */ }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(function (section) { observer.observe(section); });
  }
}());
