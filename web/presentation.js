'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StudyGPSPresentation = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // This module projects immutable engine results. Never translate the API contract.
  const strings = {
    zh: {
      skip:'跳到学习导航', language:'界面语言', planJson:'完整学习计划 JSON', navigation:'网站导航', navPlan:'学习导航', navStory:'为什么不同', navFlow:'自动化接力',
      eyebrow:'学习导航 · 热力学演示', headline:'每一小时，都有方向。', intro:'你不缺资料。你需要知道：现在，先学哪一块。',
      introNote:'从知识点成绩出发，把有限时间变成下一步。', inputTitle:'设定你的起点', inputStep:'01 / 输入',
      presetLabel:'选择一个学习者', alex1:'Alex · 第一次测评', sarah1:'Sarah · 第一次测评', alex2:'Alex · 第二次测评',
      fieldsLegend:'成绩与时间预算', scores:'知识点成绩', first_law:'第一定律', second_law:'第二定律', entropy:'熵', rankine_cycle:'朗肯循环',
      missingShort:'未测', missing:'未测评', scoreNote:'百分比为演示权重。留空是未测评，不是 0 分。',
      target:'参考目标', budget:'本轮总预算', min:'分钟', budgetNote:'按 30 分钟分块；预算是本轮总时间。',
      generate:'规划我的下一步', generating:'正在规划…', reset:'重置当前案例', assumptions:'这份计划基于什么？',
      assumptionsText:'权重和建议时长是人工设定的演示参数。第一定律、第二定律、朗肯循环各 60 分钟，熵 90 分钟。排序可解释，但不预测提分，也不保证考试结果。',
      routeLabel:'02 / 路线', routeTitle:'你的复习路线', errorTitle:'暂时无法生成计划', retry:'重试',
      loadingTitle:'正在寻找你的下一步', loadingNote:'用真实计算，把成绩和时间连起来。', startWith:'从这里开始', startLearning:'先学一点 →',
      weightedScore:'加权测评结果', notPrediction:'演示权重 · 非预测分数', plannedTime:'已安排时间',
      lensTitle:'如果我只有……', lensNote:'只改变时间，看看哪些任务还能放得下。', budgetChoices:'选择时间预算并重新计算',
      taskTitle:'把重点，变成行动', whyOrder:'为什么这样排？查看计算依据', formula:'优先分 = 目标差距 × 配置权重 ÷ 建议小时数',
      analysisCaption:'所有知识点的优先级计算', topic:'知识点', observed:'成绩', gap:'差距', weight:'权重', estimate:'建议时长', priority:'优先分',
      formulaNote:'分数相同按课程配置顺序排序；只安排有成绩且低于目标的知识点。没有额外前置知识推断。',
      changesTitle:'新测评，路线会改变', changeNote:'任务标识保持稳定，供队友更新原任务。这里只比较计划，尚未修改日历。',
      warnings:'还需要留意', summaryTitle:'阅读完整计划说明', templateNote:'说明随当前计算结果生成；当前版本使用模板，没有调用大模型。',
      viewJson:'查看计划 JSON', downloadJson:'下载计划 JSON ↓', insightsEyebrow:'看见总分背后的差别',
      insightsTitle:'同样的分数，不同的下一步。', insightsCopy:'总分会掩盖差距。试试两位学习者，再看一次新测评如何重新规划路线。',
      proofNote:'演示数据由同一引擎生成；案例中的成绩变化不是产品提分效果。',
      flowEyebrow:'从一次测评，到下一次行动', flowTitle:'一个能接力的学习循环。',
      flowCopy:'分析负责决定“学什么”，n8n 负责把计划送到日历和通知。每次测评，只传递真正发生的变化。',
      flowAssessment:'测评输入', flowAssessmentNote:'知识点成绩与预算', runnable:'已可运行',
      flowEngine:'分析与计划', flowEngineNote:'校验 → 排序 → 分块', flowDiff:'变化识别', flowDiffNote:'稳定任务标识与差异',
      flowN8n:'n8n · 日历 · 邮件', flowN8nNote:'适配代码已备好，待队友接通', pending:'真实流程未验证',
      handoffCopy:'用同一份引擎连接网页和 n8n。切换语言只改变展示，任务标识和对接数据保持一致。',
      downloadAdapter:'n8n 适配代码 ↗', downloadHandoff:'中文对接说明 ↗', downloadGuide:'双语演示指南 ↗',
      footer:'少一点猜测。多一点方向。', demoLabel:'原创练习 · 演示参数 · 无账号存储', learningLabel:'学习一小步', close:'关闭',
      title:'StudyGPS · 每一小时，都有方向', description:'把知识点成绩变成有依据的下一步。试算时间预算，查看复习路线，测评后重新规划。',
      loading:'正在载入演示案例…', calculating:'正在根据当前成绩与预算计算…', stale:'输入已修改。下方是上次结果，请重新生成计划。',
      staleShort:'待重新计算', errorStatus:'本次计划未生成，请查看错误提示。', inputError:'请检查输入', loadingShort:'正在载入', computingShort:'正在计算',
      networkError:'无法连接计算服务。请检查网络后重试。', responseError:'服务返回的数据不完整，请重试。', serverError:'计算服务暂时不可用，请稍后重试。',
      validationError:'部分输入不符合要求，请检查下方字段。', invalidScore:'请输入 0–100 之间的数字；知识点成绩也可以留空。',
      invalidTarget:'参考目标必须是 0–100 之间的数字，不能留空。', invalidBudget:'总预算必须是非负数字，且不超过 9,007,199,254,740,991。', configurationError:'案例配置不符合要求，请重置当前案例后重试。',
      previousMismatch:'上一份计划必须属于同一学生、同一课程。', previousNote:'与 Alex 第一次测评的原计划比较。预算推演不会覆盖这份比较基准。',
      exam:'考试日期', examUnset:'未设置', ready:'计划已就绪', no_scores:'等待测评成绩', target_met:'已有成绩达标', no_study_time:'没有可用时间', insufficient_block_time:'不足一个学习块',
      no_scoresTitle:'先补充一点测评信息', no_scoresBody:'填写至少一个知识点成绩，再生成有依据的计划。没有成绩的知识点不会被当成弱项。',
      target_metTitle:'已有成绩达到参考目标', target_metBody:'这一轮没有补弱任务。尚未测评的知识点仍需补充成绩后再判断。',
      no_study_timeTitle:'给学习留一点时间', no_study_timeBody:'当前预算为 0 分钟。差距已分析，但本轮没有安排任务。',
      insufficient_block_timeTitle:'还放不下一个完整学习块', insufficient_block_timeBody:'任务以 30 分钟为单位。需要同时满足预算和知识点建议时长，才能安排练习。',
      noTasks:'本轮没有安排任务', taskReason:'查看这项任务的依据', microPractice:'打开微练习 →', partial:'部分练习', complete:'完整时长',
      retained:'保留', deferred:'暂缓', removed:'移除', added:'新增', adjusted:'调整', unchanged:'无需改动任务', updated:'需要更新任务', initial:'首次计划',
      previous:'上次首要任务', current:'本次首要任务', orderChanged:'已有任务的顺序发生变化。', sameTasks:'可执行任务没有变化，无需因说明或分数变化重建任务。',
      resourceChanged:'学习材料已变化', activityChanged:'学习活动已变化', detailChanged:'任务名称或类型已变化', scoreChanges:'测评变化',
      showCase:'载入这个案例 ↗', sameScore:'同分，不同路线', reassessment:'新测评，重新规划',
      proofUnavailable:'对比案例暂时无法加载，请刷新页面重试。', learnConcept:'看一点', learnSteps:'动手试试', learnCheck:'答一道题',
      correct:'答对了。', incorrect:'再看一下计算。', quizNote:'这是热身检查，不计入测评成绩，也不会自动改写学习计划。',
      fullResource:'阅读原始演示材料（英文）↗', originalActivity:'本材料暂未提供中文版本，请阅读原始说明。',
      lensBase:'当前为 180 分钟参考路线。试试其他预算，比较同一组成绩会怎样分配时间。',
      lensSame:'与 180 分钟参考路线相比，可执行任务相同。多余时间不会被强行填满。',
      taskCount:'项任务', blocks:'个学习块', planned:'已安排', unused:'未分配', currentBudget:'当前预算', versus:'对比 180 分钟参考路线',
      missingWarning:'部分知识点尚未测评，因此不计算总分，也不会将其当作 0 分安排任务。',
      roundedWarning:'建议时长按完整的 30 分钟学习块向下取整。', shortWarning:'该知识点的建议时长不足 30 分钟，无法安排完整学习块。',
      unusedWarning:'剩余时间不足一个完整学习块，或已达到任务的建议时长。', genericWarning:'请检查输入或课程配置；本轮计划可能不完整。',
      readOnlyResult:'上次结果', reasonConclusion:'按此规则排序，不代表预计提分。',
    },
    en: {
      skip:'Skip to learning navigation', language:'Interface language', planJson:'Complete study plan JSON', navigation:'Site navigation', navPlan:'Learning navigation', navStory:'Why it is different', navFlow:'Automation handoff',
      eyebrow:'STUDY NAVIGATION · THERMODYNAMICS DEMO', headline:'Give every hour a direction.', intro:'You have the materials. Now know what to study next.',
      introNote:'Turn topic-level results into a next step that fits your time.', inputTitle:'Set your starting point', inputStep:'01 / INPUT',
      presetLabel:'Choose a learner', alex1:'Alex · Assessment 1', sarah1:'Sarah · Assessment 1', alex2:'Alex · Assessment 2',
      fieldsLegend:'Scores and time budget', scores:'Topic scores', first_law:'First Law', second_law:'Second Law', entropy:'Entropy', rankine_cycle:'Rankine Cycle',
      missingShort:'Unscored', missing:'Unscored', scoreNote:'Percentages are demo weights. Blank means unscored, never zero.',
      target:'Reference target', budget:'Total time budget', min:'min', budgetNote:'Allocated in 30-minute blocks for this whole round.',
      generate:'Find my next step', generating:'Planning…', reset:'Reset this example', assumptions:'What is this plan based on?',
      assumptionsText:'Weights and study times are manually configured demo assumptions. First Law, Second Law and Rankine Cycle each have 60 minutes; Entropy has 90. The ranking is explainable, but does not predict improvements or guarantee exam results.',
      routeLabel:'02 / YOUR ROUTE', routeTitle:'Your revision route', errorTitle:'We could not build your plan', retry:'Try again',
      loadingTitle:'Finding your next step', loadingNote:'Connecting your scores and your time through real calculations.', startWith:'START HERE', startLearning:'Try a small step →',
      weightedScore:'Weighted assessment', notPrediction:'Demo weights · not a forecast', plannedTime:'Time allocated',
      lensTitle:'What if I only have…', lensNote:'Change only the time. See which tasks still fit.', budgetChoices:'Choose a time budget and recalculate',
      taskTitle:'Turn priorities into action', whyOrder:'Why this order? See the calculation', formula:'Priority = target gap × configured weight ÷ estimated hours',
      analysisCaption:'Priority calculations for every topic', topic:'Topic', observed:'Score', gap:'Gap', weight:'Weight', estimate:'Estimate', priority:'Priority',
      formulaNote:'Ties follow the course order. Only scored topics below the target receive tasks. No prerequisite knowledge is inferred.',
      changesTitle:'New assessment. New direction.', changeNote:'Stable task IDs let a teammate update existing tasks. This view compares plans; it has not changed a calendar.',
      warnings:'Keep in mind', summaryTitle:'Read the full plan explanation', templateNote:'Explanations follow the current calculation. This version uses templates, with no model calls.',
      viewJson:'Inspect plan JSON', downloadJson:'Download plan JSON ↓', insightsEyebrow:'LOOK BEYOND THE TOTAL',
      insightsTitle:'Same score. A different next step.', insightsCopy:'A total can hide the gaps. Try two learners, then see how a new assessment changes the route.',
      proofNote:'Demo outputs are generated by the same engine. The example score changes are not evidence of product-driven gains.',
      flowEyebrow:'FROM ASSESSMENT TO ACTION', flowTitle:'A learning loop built for handoffs.',
      flowCopy:'Analysis decides what to study. n8n can take the plan to calendars and notifications, using the changes identified after each assessment.',
      flowAssessment:'Assessment input', flowAssessmentNote:'Topic scores and time budget', runnable:'Working',
      flowEngine:'Analysis & plan', flowEngineNote:'Validate → rank → allocate', flowDiff:'Change detection', flowDiffNote:'Stable task IDs and exact diffs',
      flowN8n:'n8n · Calendar · Email', flowN8nNote:'Adapter ready for teammate integration', pending:'Live flow unverified',
      handoffCopy:'One engine powers the web and n8n adapter. Switching language changes the presentation; task IDs and integration data stay the same.',
      downloadAdapter:'n8n adapter code ↗', downloadHandoff:'Integration guide (English) ↗', downloadGuide:'Bilingual demo guide ↗',
      footer:'Less guessing. More direction.', demoLabel:'Original exercises · demo assumptions · no account storage', learningLabel:'A SMALL LEARNING STEP', close:'Close',
      title:'StudyGPS · Give every hour a direction', description:'Turn topic scores into an explainable next step. Explore time budgets, follow a revision route, and replan after reassessment.',
      loading:'Loading an example…', calculating:'Calculating from your current scores and budget…', stale:'Inputs have changed. The previous result is shown below; generate a new plan.',
      staleShort:'Recalculate needed', errorStatus:'No new plan was generated. Review the error below.', inputError:'Check inputs', loadingShort:'Loading', computingShort:'Calculating',
      networkError:'Cannot reach the planning service. Check your connection and try again.', responseError:'The service returned incomplete data. Please try again.', serverError:'The planning service is unavailable. Please try again shortly.',
      validationError:'Some inputs need attention. Check the fields below.', invalidScore:'Enter a number from 0 to 100, or leave a topic score blank.',
      invalidTarget:'The reference target must be a number from 0 to 100 and cannot be blank.', invalidBudget:'The total budget must be a non-negative number no greater than 9,007,199,254,740,991.', configurationError:'The example configuration is invalid. Reset the example and try again.',
      previousMismatch:'The previous plan must belong to the same student and course.', previousNote:'Compared with Alex’s original Assessment 1 plan. Budget experiments never replace that reference.',
      exam:'Exam date', examUnset:'Not set', ready:'Plan ready', no_scores:'Awaiting scores', target_met:'Available scores meet target', no_study_time:'No time available', insufficient_block_time:'No full block fits',
      no_scoresTitle:'Start with a little assessment data', no_scoresBody:'Add at least one topic score to build an evidence-based plan. Unscored topics are not treated as weaknesses.',
      target_metTitle:'Available scores meet your target', target_metBody:'No remedial tasks are needed this round. Add results for any unscored topics before judging those.',
      no_study_timeTitle:'Make a little time for learning', no_study_timeBody:'Your budget is zero. Score gaps have been analysed, but no tasks can be allocated this round.',
      insufficient_block_timeTitle:'A full learning block does not fit yet', insufficient_block_timeBody:'Tasks use 30-minute blocks. Both your budget and the configured topic estimates must allow a full block.',
      noTasks:'No tasks allocated this round', taskReason:'See the basis for this task', microPractice:'Open micro-practice →', partial:'Partial practice', complete:'Full allocation',
      retained:'Retained', deferred:'Deferred', removed:'Removed', added:'Added', adjusted:'Adjusted', unchanged:'Tasks unchanged', updated:'Task updates needed', initial:'Initial plan',
      previous:'Previous first priority', current:'Current first priority', orderChanged:'The relative order of retained tasks changed.', sameTasks:'Executable tasks are unchanged. Wording or score changes alone do not require rebuilding tasks.',
      resourceChanged:'Learning resource changed', activityChanged:'Learning activity changed', detailChanged:'Task name or type changed', scoreChanges:'Assessment changes',
      showCase:'Load this example ↗', sameScore:'Same score, different route', reassessment:'Reassessed and rerouted',
      proofUnavailable:'Comparison examples could not load. Refresh the page to try again.', learnConcept:'See the idea', learnSteps:'Try it yourself', learnCheck:'Check your understanding',
      correct:'That is right.', incorrect:'Let’s check the calculation.', quizNote:'This is a warm-up check. It does not change assessment scores or automatically update your plan.',
      fullResource:'Read the original demo material (English) ↗', originalActivity:'Read the original activity instructions for this resource.',
      lensBase:'This is the 180-minute reference route. Try another budget to compare allocations for these same scores.',
      lensSame:'The tasks match the 180-minute reference route. Spare time is not filled just to use the budget.',
      taskCount:'tasks', blocks:'learning blocks', planned:'Allocated', unused:'unallocated', currentBudget:'Current budget', versus:'Compared with the 180-minute reference route',
      missingWarning:'Some topics are unscored, so the overall result is unavailable. Missing scores are never treated as zero.',
      roundedWarning:'The estimated duration is rounded down to full 30-minute learning blocks.', shortWarning:'This topic estimate is under 30 minutes, so no full learning block can be allocated.',
      unusedWarning:'The remaining time cannot fit a full block, or the tasks have reached their configured estimates.', genericWarning:'Check the input or course configuration; the plan may be incomplete.',
      readOnlyResult:'Previous result', reasonConclusion:'This is a ranking rule, not a prediction of score gains.',
    }
  };
  const localeTag = (locale) => locale === 'en' ? 'en-AU' : 'zh-CN';
  function t(locale, key) {
    const value = strings[locale === 'en' ? 'en' : 'zh'][key];
    if (value === undefined) throw new Error('Missing translation: ' + key);
    return value;
  }
  function number(locale, value, digits = 2) {
    return value === null || value === undefined ? '—' : new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: digits }).format(value);
  }
  function date(locale, value) {
    if (!value) return t(locale, 'examUnset');
    // Explicit UTC prevents a date-only exam from moving to the preceding day.
    return new Intl.DateTimeFormat(localeTag(locale), { year:'numeric', month:'short', day:'numeric', timeZone:'UTC' }).format(new Date(value + 'T00:00:00Z'));
  }
  function topic(locale, id, fallback = id) { return strings[locale]?.[id] || fallback; }
  function minutes(locale, value) { return number(locale, value) + (locale === 'zh' ? ' 分钟' : ' min'); }
  function reason(locale, plan, task) {
    const a = plan.topic_analysis.find((item) => item.topic_id === task.topic_id);
    if (!a) return t(locale, 'responseError');
    const n = (v) => number(locale, v, 4);
    const partial = task.is_partial ? (locale === 'zh' ? '这是部分练习，尚未覆盖全部建议时长。' : 'This is partial practice, below the full configured estimate.') : '';
    return locale === 'zh'
      ? '当前成绩 ' + n(a.observed_score) + '，距参考目标 ' + n(plan.target_score) + ' 差 ' + n(a.target_gap) + ' 分。优先分：' + n(a.target_gap) + ' × ' + n(a.importance) + ' ÷ ' + n(a.estimated_minutes / 60) + ' = ' + n(a.priority_score) + '。本轮安排 ' + minutes(locale, task.duration_minutes) + '。' + partial
      : 'Your score is ' + n(a.observed_score) + ', with a ' + n(a.target_gap) + '-point gap to the ' + n(plan.target_score) + ' reference target. Priority: ' + n(a.target_gap) + ' × ' + n(a.importance) + ' ÷ ' + n(a.estimated_minutes / 60) + ' = ' + n(a.priority_score) + '. Allocated ' + minutes(locale, task.duration_minutes) + '. ' + partial;
  }
  function summary(locale, plan) {
    if (!plan.priorities.length) return t(locale, plan.status + 'Body');
    const first = topic(locale, plan.priorities[0].topic_id, plan.priorities[0].topic_name);
    const count = plan.priorities.length;
    return locale === 'zh'
      ? '从' + first + '开始。按目标差距、配置权重和建议时长排序，共安排 ' + count + ' 项任务，用时 ' + minutes(locale, plan.total_planned_minutes) + '，总预算 ' + minutes(locale, plan.available_minutes) + '。' + (plan.priorities.some(x => x.is_partial) ? '其中包含部分练习。' : '') + (plan.overall_score === null ? t(locale,'missingWarning') : '') + t(locale,'reasonConclusion')
      : 'Start with ' + first + '. ' + count + (count === 1 ? ' task uses ' : ' tasks use ') + minutes(locale, plan.total_planned_minutes) + ' of your ' + minutes(locale, plan.available_minutes) + ' budget, ordered by target gap, configured weight and estimated study time. ' + (plan.priorities.some(x => x.is_partial) ? 'Includes partial practice. ' : '') + (plan.overall_score === null ? t(locale,'missingWarning') + ' ' : '') + t(locale,'reasonConclusion');
  }
  function budgetDiff(reference, current) {
    if (reference.student_id !== current.student_id || reference.course_id !== current.course_id) throw new Error('Budget comparison scope mismatch');
    return current.topic_analysis.map(a => {
      const before = reference.priorities.find(x => x.topic_id === a.topic_id)?.duration_minutes || 0;
      const after = current.priorities.find(x => x.topic_id === a.topic_id)?.duration_minutes || 0;
      return { topic_id:a.topic_id, before, after, state:before === after ? 'retained' : after === 0 ? 'deferred' : before === 0 ? 'added' : 'adjusted' };
    }).filter(x => x.before || x.after);
  }
  function warning(locale, item) {
    const key = ({ MISSING_TOPIC_SCORE:'missingWarning', INCOMPLETE_OVERALL_SCORE:'missingWarning', TOPIC_BELOW_BLOCK_SIZE:'shortWarning' })[item.code] || 'genericWarning';
    return (item.topic_id ? topic(locale,item.topic_id) + ': ' : '') + t(locale,key);
  }
  function errorIssue(locale, issue) {
    if (/previous/i.test(issue.path)) return t(locale,'previousMismatch');
    if (issue.path === 'input.target_score') return t(locale,'invalidTarget');
    if (issue.path === 'input.available_minutes') return t(locale,'invalidBudget');
    if (issue.path.startsWith('input.topic_scores.')) return topic(locale,issue.path.split('.').pop()) + ': ' + t(locale,'invalidScore');
    return t(locale,'configurationError');
  }
  function changes(locale, plan, previousPlan) {
    const c = plan.changes, result = [];
    const lookup = new Map([...(previousPlan?.priorities || []), ...plan.priorities].map(x => [x.task_id,x]));
    const name = id => topic(locale,lookup.get(id)?.topic_id,lookup.get(id)?.topic_name || id);
    for (const id of c.tasks_added) result.push(t(locale,'added') + ': ' + name(id));
    for (const id of c.tasks_removed) result.push(t(locale,'removed') + ': ' + name(id));
    for (const item of c.duration_changes) result.push(name(item.task_id) + ': ' + minutes(locale,item.previous_minutes) + ' → ' + minutes(locale,item.new_minutes));
    if (c.task_order_changed) result.push(t(locale,'orderChanged'));
    for (const [field,key] of [['resource_changes','resourceChanged'],['activity_changes','activityChanged'],['task_details_changes','detailChanged']]) {
      for (const item of c[field]) result.push(name(item.task_id) + ': ' + t(locale,key));
    }
    if (!plan.plan_changed) result.push(t(locale,'sameTasks'));
    for (const item of c.score_changes) result.push(t(locale,'scoreChanges') + ' · ' + topic(locale,item.topic_id) + ': ' + (item.previous_score === null ? t(locale,'missing') : number(locale,item.previous_score)) + ' → ' + (item.new_score === null ? t(locale,'missing') : number(locale,item.new_score)));
    return result;
  }
  return { strings, t, number, date, topic, minutes, reason, summary, budgetDiff, warning, errorIssue, changes };
});
