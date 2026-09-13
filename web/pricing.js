(function () {
  'use strict';
  var copy = {
    en: {
      title: 'StudyGPS · Plans for the road ahead', description: 'Explore proposed StudyGPS plans in USD and an interactive illustration of usage costs and gross margin. Planned pricing only; no checkout or paid subscriptions are available.',
      plansLabel: 'Pricing plans', skip: 'Skip to pricing', navigation: 'Main navigation', home: 'The product', pricing: 'Pricing', demo: 'Current demo ↗', language: 'Language', login: 'Log in',
      eyebrow: 'A PLAN FOR EVERY AMBITION', headline: 'More direction.', headlineAccent: 'Room to grow.', intro: 'Three proposed ways to turn learning context into action. Choose the level of support you would want as StudyGPS grows.',
      concept: 'Planned pricing · Not on sale', conceptNote: 'These are proposed paid tiers, not features you can purchase today. Explore the current demo or sign in to the existing workspace.',
      currency: 'All prices and cost examples are in USD.', monthly: '/ month', planned: 'PLANNED', popular: 'THE EVERYDAY UPGRADE', silverFor: 'A clear starting point for independent learners.', goldFor: 'More context, more guidance, a closer fit.', platinumFor: 'An ambitious vision for deeper personal support.',
      silverPdfs: '5 PDFs per month', goldPdfs: '20 PDFs per month', platinumPdfs: 'Unlimited PDFs*',
      silverModel: 'Lightweight model class', goldModel: 'Advanced model class', platinumModel: 'Deep reasoning model class',
      silverRefresh: '1 AI refresh per day', instantRefresh: 'On-demand AI refresh', emailSlack: 'Email and Slack delivery', goldChannels: 'Email, Slack and WhatsApp', platinumChannels: 'Email, Slack, WhatsApp and SMS',
      matching: 'Learning-resource matching', feedback: 'Personalised feedback', voice: 'Voice study coach', simulator: 'Exploratory grade simulator†',
      start: 'Start learning', explore: 'Explore current demo',
      deliveryNote: 'PDF processing, model-based refresh, channel delivery, resource matching, expanded feedback, voice coaching and grade simulation are planned services. Availability, usage policies and delivery limits are not yet validated.',
      currentTitle: 'Already here. Ready to explore.', currentBody: 'Student and teacher workspaces, saved assessments and explainable study routes are available now. The current rule-based route recalculates when your information changes; it does not call an LLM or consume a proposed AI-refresh allowance.',
      fairTitle: '* Unlimited needs a real boundary.', fairBody: 'The proposed Platinum PDF allowance would be subject to fair-use, file-size and compute budgets. Those limits still need validation; unlimited documents would not mean unlimited processing cost.',
      simulatorTitle: '† Explore a scenario, not a promised grade.', simulatorBody: 'The proposed simulator would compare assumptions and possible outcomes. It would not predict an exam result or replace a teacher’s assessment.',
      economicsEyebrow: 'SHOW THE ASSUMPTIONS', economicsTitle: 'A sustainable plan starts', economicsAccent: 'with visible costs.', economicsIntro: 'Move the cost slider to explore a business assumption. These illustrative costs are not measured StudyGPS usage or a supplier quote.',
      choosePlan: 'Select a plan for the cost illustration', costLabel: 'Assumed direct cost per paid subscription / month', costHint: 'Illustrative AI and delivery cost; move the slider to test heavier usage.', calcRevenue: 'Monthly revenue', calcMargin: 'Illustrative gross margin', calcTarget: '80% target: direct-cost ceiling', calcFormula: 'Gross margin = (revenue − assumed direct cost) ÷ revenue × 100%', above: 'At or above the 80% target', below: 'Below the 80% target', loss: 'Assumed direct cost exceeds revenue',
      costTableTitle: 'Monthly planning assumptions', tierColumn: 'Plan', costColumn: 'Assumed direct cost', marginColumn: 'Illustrative gross margin', targetColumn: 'Cost ceiling at 80%',
      economicsNote: 'Gross margin is not net profit. These examples do not fully include payment fees, taxes, support, staffing or all other costs. Actual usage and complete costs must be measured before setting a sustainable offer.',
      extensionTitle: 'A wider road ahead.', extensionBody: 'Annual billing, institutional site licences and usage add-ons are future options. No annual offer, checkout or recurring payment is active.', extensionLink: 'See what you can use today', footer: 'Give every hour a sense of direction.', source: 'View source'
    },
    zh: {
      title: 'StudyGPS · 为未来的学习选择方案', description: '了解 StudyGPS 拟议的美元定价，交互查看使用成本与毛利假设。目前为价格方案概念，没有结账或付费订阅。',
      plansLabel: '价格方案', skip: '跳到价格方案', navigation: '主导航', home: '产品介绍', pricing: '价格方案', demo: '体验现有演示 ↗', language: '语言', login: '登录',
      eyebrow: '让每一种目标，都有合适的支持', headline: '方向更清楚，', headlineAccent: '成长更从容。', intro: '三档未来方案，把学习背景变成具体行动。看看随着 StudyGPS 成长，你希望获得哪一种支持。',
      concept: '拟议价格 · 尚未销售', conceptNote: '以下是未来付费方案，不是现在可以购买的功能。你可以先体验现有演示，或登录已开放的学习空间。',
      currency: '所有价格和成本示例均以美元 USD 计。', monthly: '/ 月', planned: '规划中', popular: '面向日常学习的进阶方案', silverFor: '适合希望建立清晰起点的自主学习者。', goldFor: '更多学习背景，更贴合个人的指导。', platinumFor: '面向更深入个人支持的未来构想。',
      silverPdfs: '每月 5 份 PDF', goldPdfs: '每月 20 份 PDF', platinumPdfs: '不限 PDF 份数*',
      silverModel: '轻量模型等级', goldModel: '高级模型等级', platinumModel: '深度推理模型等级',
      silverRefresh: '每天 1 次 AI 更新', instantRefresh: '按需即时请求 AI 更新', emailSlack: '邮件与 Slack 推送', goldChannels: '邮件、Slack 与 WhatsApp', platinumChannels: '邮件、Slack、WhatsApp 与短信',
      matching: '学习资源匹配', feedback: '个性化反馈', voice: '语音学习教练', simulator: '探索性成绩情景模拟†',
      start: '开启学习', explore: '体验现有演示',
      deliveryNote: 'PDF 处理、模型生成更新、多渠道推送、资源匹配、扩展反馈、语音教练和成绩情景模拟均为规划中的服务。可用性、使用政策与交付限制尚待验证。',
      currentTitle: '现在就能开始的学习。', currentBody: '学生与老师空间、测评记录和可解释的学习路线已经开放。当前规则引擎会随输入更新重新规划，不调用大模型，也不消耗拟议的 AI 更新额度。',
      fairTitle: '* 不限份数，也需要合理边界。', fairBody: '拟议的 Platinum PDF 额度将受合理使用、文件大小与计算预算限制。这些限制仍待验证；不限文档份数不等于无限处理成本。',
      simulatorTitle: '† 探索情景，不承诺成绩。', simulatorBody: '拟议的模拟器用于比较不同假设及可能情景，不预测考试成绩，也不取代老师的评价。',
      economicsEyebrow: '把假设摆出来', economicsTitle: '可持续的方案，', economicsAccent: '从看清成本开始。', economicsIntro: '拖动成本滑块，看看商业假设如何变化。这里的成本是示例，既非 StudyGPS 实测用量，也非供应商报价。',
      choosePlan: '选择要试算的方案', costLabel: '每份付费订阅每月的假设直接成本', costHint: '示例 AI 与交付成本；移动滑块，看看更高用量的影响。', calcRevenue: '每月收入', calcMargin: '示例毛利率', calcTarget: '80% 毛利目标对应的直接成本上限', calcFormula: '毛利率 =（收入 − 假设直接成本）÷ 收入 × 100%', above: '达到或超过 80% 目标', below: '低于 80% 目标', loss: '假设直接成本已超过收入',
      costTableTitle: '每月成本规划假设', tierColumn: '方案', costColumn: '假设直接成本', marginColumn: '示例毛利率', targetColumn: '80% 目标成本上限',
      economicsNote: '毛利不是净利润。这些示例未全面计入支付费用、税费、客服、人力及其他成本。确定可持续的正式方案前，还需实测用量与完整成本。',
      extensionTitle: '为更大的学习场景留出空间。', extensionBody: '年付、学校或机构站点授权，以及超额用量附加包都属于未来选项。目前没有年付报价、结账或自动扣款。', extensionLink: '看看现在能用什么', footer: '让每一小时，都有方向。', source: '查看源代码'
    }
  };
  var plans = {
    silver: { name: 'Silver', price: 29.99, low: 2, high: 3, initialCost: 2.5 },
    gold: { name: 'Gold', price: 44.99, low: 7, high: 9, initialCost: 8 },
    platinum: { name: 'Platinum', price: 79.99, low: 15, high: 18, initialCost: 16.5 }
  };
  var selected = 'silver';
  var locale = initialLocale();
  function initialLocale() {
    var query = new URL(window.location.href).searchParams.get('lang');
    if (query === 'en' || query === 'zh') return query;
    try {
      var current = localStorage.getItem('studygps-locale');
      if (current === 'en' || current === 'zh') return current;
      var legacy = localStorage.getItem('studygps.locale');
      if (legacy === 'en' || legacy === 'zh') return legacy;
    } catch (_) { /* Optional preference storage. */ }
    return 'en';
  }
  function usd(value, digits) { return 'USD ' + value.toFixed(digits === undefined ? 2 : digits); }
  function margin(price, cost) { return (price - cost) / price * 100; }
  function updateCalculator() {
    var plan = plans[selected];
    var slider = document.getElementById('unit-cost');
    var cost = Number(slider.value);
    if (!Number.isFinite(cost)) cost = plan.initialCost;
    cost = Math.min(Number(slider.max), Math.max(Number(slider.min), cost));
    var percent = margin(plan.price, cost);
    document.getElementById('cost-value').textContent = usd(cost);
    slider.setAttribute('aria-valuetext', usd(cost));
    document.getElementById('calc-revenue').textContent = usd(plan.price);
    var displayedPercent = percent < 80 && percent.toFixed(2) === '80.00' ? '<80.00' : percent.toFixed(2);
    document.getElementById('calc-margin').textContent = displayedPercent + '%';
    document.getElementById('calc-ceiling').textContent = usd(plan.price * 0.2, 3);
    var status = document.getElementById('margin-status');
    status.dataset.state = percent < 0 ? 'loss' : percent >= 80 - 1e-10 ? 'above' : 'below';
    status.textContent = copy[locale][status.dataset.state];
    document.querySelectorAll('[data-calculator-tier]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.calculatorTier === selected)); });
  }
  function applyLocale(next, updateAddress) {
    if (next !== 'en' && next !== 'zh') return;
    locale = next;
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
    document.title = copy[next].title;
    document.querySelector('meta[name="description"]').content = copy[next].description;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = copy[next][el.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', copy[next][el.dataset.i18nAria]); });
    document.querySelectorAll('[data-locale]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.locale === next)); });
    document.querySelectorAll('[data-locale-link]').forEach(function (link) {
      var target = new URL(link.getAttribute('href'), window.location.href); target.searchParams.set('lang', next);
      link.setAttribute('href', target.pathname + target.search + target.hash);
    });
    try { localStorage.setItem('studygps-locale', next); localStorage.setItem('studygps.locale', next); } catch (_) { /* Optional preference storage. */ }
    if (updateAddress) {
      var address = new URL(window.location.href); address.searchParams.set('lang', next);
      history.replaceState(null, '', address.pathname + address.search + address.hash);
    }
    updateCalculator();
  }
  document.querySelectorAll('[data-locale]').forEach(function (button) { button.addEventListener('click', function () { applyLocale(button.dataset.locale, true); }); });
  document.querySelectorAll('[data-calculator-tier]').forEach(function (button) {
    button.addEventListener('click', function () { selected = button.dataset.calculatorTier; document.getElementById('unit-cost').value = plans[selected].initialCost; updateCalculator(); });
  });
  document.getElementById('unit-cost').addEventListener('input', updateCalculator);
  window.addEventListener('popstate', function () { applyLocale(initialLocale(), false); });
  applyLocale(locale, false);
}());
