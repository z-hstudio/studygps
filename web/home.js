(function () {
  'use strict';

  var messages = {
    zh: {
      pageTitle: 'StudyGPS · 学习，自有方向',
      pageDescription: 'StudyGPS 把知识点成绩变成清晰的个性化学习路线。学生掌握自己的下一步，老师为自己的班级提供针对性建议。',
      skip: '跳到主要内容', navigation: '主导航', language: '语言',
      navApproach: '学习方式', navTogether: '师生协作', navDemo: '体验演示 ↗', login: '登录',
      heroEyebrow: '你的学习导航系统', headlineFirst: '学习，', headlineSecond: '自有方向。',
      heroDescription: '把「还有很多没学」变成「下一步很清楚」。从你的薄弱点出发，让每一小时都走在自己的路上。',
      startRoute: '开启我的学习路线', tryDemo: '先试试看', heroNote: '从一次测评出发。每一步，都有依据。',
      annotationLabel: '下一站 · 演示路线', annotationTopic: '把朗肯循环，学明白。', annotationTime: '60 分钟 · 从薄弱点出发',
      discover: '找到你的下一步',
      approachEyebrow: '不止看见分数 · 更要看见你', approachFirst: '同样的分数，', approachSecond: '不同的下一步。',
      approachDescription: '学习无需把所有事情再做一遍。找到真正需要投入的地方，让有限时间有更清晰的安排。',
      diagnoseTag: '看清起点', diagnoseTitle: '总分相同，差距不同。', diagnoseDescription: '深入每个知识点，发现总分没有告诉你的事。',
      diagnosisAlt: '演示：Alex 与 Sarah 加权总分同为 63.5。第一定律分别为 85、50；朗肯循环分别为 50、85。',
      sameScore: '相同加权总分', firstLaw: '第一定律', rankine: '朗肯循环', diagnoseFootnote: '热力学演示数据 · 使用配置权重计算',
      timeTag: '掌握节奏', timeTitle: '把时间，花在重点上。', timeDescription: '选择你的时间预算，把复习拆成可开始的小段。',
      timeUnit: '分钟 / 学习分块', timeFootnote: '每块 30 分钟 · 按预算安排任务',
      rerouteTag: '随你调整', rerouteTitle: '你在前进，路线也是。', rerouteDescription: '新测评到来，重新识别重点，让下一步跟上你。',
      alexDemo: 'Alex · 演示', newPriority: '新的优先学习点', secondLaw: '第二定律', rerouteFootnote: '两次模拟测评 · 非产品提分效果',
      approachNote: '每条路线，都能查看排序与时间分配的依据。', exploreEngine: '动手试一试',
      togetherEyebrow: '各自的空间 · 共同的成长', togetherFirst: '每个学生，', togetherSecond: '都值得被看见。',
      togetherDescription: '学生拥有自己的学习空间。老师看清自己班级中每个人的不同，把理解变成具体的个性化建议。',
      roleTabs: '查看不同角色', studentTab: '我是学生', teacherTab: '我是老师',
      studentBenefit1: '自己的计划，在自己的账户里', studentBenefit2: '回看知识点成绩与学习进度', studentBenefit3: '收到老师专门为你写的建议',
      teacherBenefit1: '在管理空间查看自己班级的学生', teacherBenefit2: '逐人查看成绩、计划与学习进度', teacherBenefit3: '保存针对不同学生的个性化建议',
      openSpace: '进入我的空间', illustration: '功能示意', personalSpace: '个人学习空间', helloAlex: 'Alex，找到你的节奏。',
      yourNextStep: '你的下一步', minutes: '分钟', mockRouteDescription: '先看懂循环中的四个过程，再做一次概念自检。',
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
      pageDescription: 'Turn topic scores into a clear, personal study route. Students find their next step; teachers offer individual guidance within their own classes.',
      skip: 'Skip to main content', navigation: 'Main navigation', language: 'Language',
      navApproach: 'Our approach', navTogether: 'Learn together', navDemo: 'Explore the demo ↗', login: 'Log in',
      heroEyebrow: 'YOUR PERSONAL LEARNING COMPASS', headlineFirst: 'Learning,', headlineSecond: 'with direction.',
      heroDescription: 'Turn “there’s so much to study” into “I know where to begin”. Start with what needs your attention, and give every hour a sense of direction.',
      startRoute: 'Find my study route', tryDemo: 'Try the demo', heroNote: 'One assessment. A clearer next step.',
      annotationLabel: 'NEXT STOP · DEMO ROUTE', annotationTopic: 'Make sense of the Rankine cycle.', annotationTime: '60 minutes · Start with the gap',
      discover: 'Find your next step',
      approachEyebrow: 'BEYOND A SCORE. A PICTURE OF YOU.', approachFirst: 'The same score.', approachSecond: 'A different next step.',
      approachDescription: 'You don’t need to study everything again. Find what needs your attention, then make a clear plan for the time you have.',
      diagnoseTag: 'Find your starting point', diagnoseTitle: 'Same score. Different gaps.', diagnoseDescription: 'Look closer at each topic. Discover what the total leaves out.',
      diagnosisAlt: 'Demo: Alex and Sarah both have a weighted score of 63.5. Their First Law scores are 85 and 50; their Rankine cycle scores are 50 and 85.',
      sameScore: 'Same weighted score', firstLaw: 'First Law', rankine: 'Rankine cycle', diagnoseFootnote: 'Thermodynamics demo · Configured weights',
      timeTag: 'Set your pace', timeTitle: 'Make time for what matters.', timeDescription: 'Choose your time budget. Break revision into sessions you can start.',
      timeUnit: 'MINUTES / STUDY BLOCK', timeFootnote: '30-minute blocks · Planned to fit your budget',
      rerouteTag: 'Adapt as you go', rerouteTitle: 'You move forward. So does your route.', rerouteDescription: 'A new assessment brings a fresh view of what to focus on next.',
      alexDemo: 'Alex · Demo', newPriority: 'Your new learning priority', secondLaw: 'Second Law', rerouteFootnote: 'Simulated assessments · Not a product outcome',
      approachNote: 'See the reasoning behind every priority and every block of time.', exploreEngine: 'Try it for yourself',
      togetherEyebrow: 'PERSONAL SPACES. SHARED PROGRESS.', togetherFirst: 'Every student', togetherSecond: 'deserves to be seen.',
      togetherDescription: 'A personal space for each student. A clearer view for their teacher. Turn an understanding of individual needs into specific, thoughtful guidance.',
      roleTabs: 'Explore a role', studentTab: 'For students', teacherTab: 'For teachers',
      studentBenefit1: 'Your own plan, in your own account', studentBenefit2: 'Review topic scores and study progress', studentBenefit3: 'Read advice written for you by your teacher',
      teacherBenefit1: 'Manage students in your own classes', teacherBenefit2: 'Review individual scores, plans and progress', teacherBenefit3: 'Save personal advice for each student',
      openSpace: 'Enter my workspace', illustration: 'Feature preview', personalSpace: 'PERSONAL WORKSPACE', helloAlex: 'Alex, find your rhythm.',
      yourNextStep: 'YOUR NEXT STEP', minutes: 'min', mockRouteDescription: 'Understand the four stages of the cycle, then check your grasp of the concepts.',
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
    try { return window.localStorage.getItem('studygps-locale'); } catch (_) { return null; }
  }

  function getInitialLocale() {
    var query = new URL(window.location.href).searchParams.get('lang');
    if (query === 'en' || query === 'zh') return query;
    var saved = storedLocale();
    if (saved === 'en' || saved === 'zh') return saved;
    return 'zh';
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
    try { window.localStorage.setItem('studygps-locale', locale); } catch (_) { /* Private browsing still supports the selected language. */ }
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
