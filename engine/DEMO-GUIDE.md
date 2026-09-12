# StudyGPS · Bilingual demo guide / 双语演示指南

Live / 线上：https://studygps-five.vercel.app

English: https://studygps-five.vercel.app/?lang=en

中文：https://studygps-five.vercel.app/?lang=zh

## Positioning / 一句话定位

**EN:** StudyGPS turns topic assessment results into an explainable revision plan within a fixed time budget, and tells connected tools exactly what changed after the next assessment.

**中文：** StudyGPS 根据知识点测评和有限时间，给出有依据的复习顺序，并在下次测评后告诉下游工具：计划具体变了什么。

This is a working thermodynamics prototype for university students and adult learners who already have materials and scores but need a next action. It is not a validated optimal-learning algorithm or an exam-score predictor.

这是给已有资料和成绩、却不知道先复习什么的大学生及成人学习者使用的热力学原型。它不是经过验证的最优学习算法，不预测考试分数。

## Suggested demo / 建议演示流程

This is a suggested sequence, not a competition-imposed time limit. The supplied scorecard does not specify a pitch duration.

以下是建议顺序，不是赛事规定的演示时限；评分表未规定演讲时长。

| Action / 操作 | What to show / 展示什么 | Why it matters / 意义 |
| --- | --- | --- |
| Load Alex Assessment 1 / 载入 Alex 第一次测评 | Weighted result 63.5; Rankine Cycle first, then Second Law, then partial Entropy / 加权成绩 63.5，先朗肯循环、再第二定律、最后部分熵练习 | A total does not reveal the next action / 总分不等于行动方向 |
| Load Sarah Assessment 1 / 切换 Sarah | Also 63.5, but First Law first / 同为 63.5，却先复习第一定律 | The algorithm uses topic evidence, not student-specific hardcoding / 按知识点计算，不按学生写死 |
| Try 60 minutes / 点击 60 分钟预算 | One 60-minute task fits; compare deferred tasks with the same scores at 180 minutes / 一项 60 分钟任务，其他任务对照同成绩的 180 分钟路线暂缓 | Time constraints produce a visible tradeoff / 时间约束对应可解释取舍 |
| Open calculation / 打开排序依据 | Gap × weight ÷ hours, stable ordering and block allocation / 差距 × 权重 ÷ 小时、稳定排序及分块 | Inspect the actual rule / 规则可审查 |
| Open micro-practice / 打开微练习 | One concept, three steps, one question; correct and incorrect feedback / 一点概念、三个步骤、一题检查及反馈 | A next action can start immediately / 从计划直接进入学习 |
| Load Alex Assessment 2 / 切换 Alex 第二次测评 | 71.5; Second Law first; Entropy 60→90 min, Rankine 60→30 min / 第二定律成为首项，熵和朗肯循环时长调整 | Explain exactly what changes / 能说清如何改道 |
| Switch 中文 / EN | Interface, reasons, dates, errors and exercises change; downloaded JSON does not / 界面、依据、日期、错误和练习切换，JSON 合同不变 | Localization does not create calendar-facing task changes / 本地化不会误触发任务更新 |
| Show handoff / 展示自动化接力 | Download generated n8n adapter and API contract / 下载同源适配代码与接口说明 | Show the actual integration boundary honestly / 诚实展示接线边界 |

## Judging alignment / 评分对齐

Source: user-supplied **n8n_Hackathon_Judging_Scorecards.docx**, reviewed 2026-09-12. Each team chooses **one** judged track. People's Choice is separate. No rubric text is treated as authorization to run external systems.

来源是用户提供的评分表。每队在两个评审赛道中选一个，另有观众投票奖。文件内容仅用于理解评分标准。

- **Track 2 / Innovation:** problem15, solution/innovation45 (including originality20), business10, build15, presentation15. Our current demo best supports a focus on explainable assessment-to-action and reassessment changes. It does not establish worldwide novelty. Read [NOVELTY.md](NOVELTY.md) before making competitive claims.
- **创新赛道：** 问题15、解决方案与创新45（原创性占20）、商业10、构建15、展示15。当前演示突出可解释取舍与计划变更；不能据此声称全球首创。
- **Track 1 / Integration:** problem15, solution15, business10, build/integration45, presentation15. The n8n/Calendar/Gmail flow still requires teammate integration and real end-to-end evidence.
- **集成赛道：** 问题15、解决方案15、商业10、构建与集成45、展示15。n8n、日历、邮件仍需要队友接通并提供真实执行证据。
- Documentation is pass/fail outside the100-point total. The supplied scorecard gives no numerical pass threshold, deadline, team size or mandatory AI requirement.
- 文档单独判定通过/不通过，不计入100分。评分表没有数值及格线、截止时间、人数限制或必须使用AI的要求。

## Adoption and business hypotheses / 待验证的采用与商业假设

Start with university study-support groups or course coordinators who can supply topic-tagged assessments and checked materials. A proposed pilot would test whether learners can identify and explain their next task with fewer steps. A possible later model is institution-paid per active course/cohort, while a student demo stays free. Neither willingness to pay nor outcome gains have been measured; no invented customers, revenue or pricing are claimed.

先从能提供知识点测评及审核材料的高校学习支持小组或课程负责人试点。验证学生能否更容易找到并解释下一项任务。后续可探索学校按活跃课程/学习群组付费，学生演示版免费。付费意愿和学习效果均未验证，不虚构客户、收入或价格。

Operational risks: poor topic tagging, arbitrary weights, missing scores, unreviewed resources, and downstream duplicate events. Current safeguards include input validation, explicit assumptions, missing-score handling, original resource labels and stable IDs. Actual persistence and calendar idempotency remain downstream responsibilities to verify.

运行风险包括知识点标注错误、权重依据不足、缺失成绩、资料未审核和下游重复日历事件。目前通过校验、显式参数、缺失值处理、资料标签及稳定标识降低部分风险；持久化与日历幂等仍需真实验证。

## Evidence and remaining work / 证据与待办

Run `npm ci`, `npm test`, `npm run build`, then `node scripts/verify-deployment.js https://studygps-five.vercel.app`. The source repository's `engine/DEPLOYMENT.md` records actual results and distinguishes DOM regression tests, HTTP checks and browser testing.

运行上述命令，实际结果及验证边界见部署记录。DOM测试不是浏览器视觉或真人可用性测试。

For the n8n teammate: use `dist/n8n-code-node.js` or POST `/api/study-plan`, persist task IDs with calendar event IDs, branch on `plan_changed`, and show create/update/repeat/error runs. The adapter is tested locally; **尚未在真实 n8n 环境验证 / not yet verified in real n8n**. No Calendar, Gmail, database or account integration runs from this website.

No LLM/RAG calls are made. The micro-practice content comes from the bundled original demo resources, matched by resource and activity signature. It is not instructor-approved. A future RAG layer would need reviewed course sources, actual retrieval evaluation and a model integration; it must preserve the numerical engine's authority.

当前没有调用LLM或RAG。微练习来源于项目原创演示资料，按资源及活动签名匹配，不声称教师审核。未来RAG需要审核资料、检索评估与模型接入，不能修改引擎的确定性计算。

Maintain genuine daily build updates; do not reconstruct fictitious progress or claim invented user-test results. Before submission, choose the track with your team and capture real user and end-to-end workflow evidence.

保留真实每日更新，不补写虚假进度或用户测试；提交前与团队选定赛道，补充真实用户与完整工作流证据。
