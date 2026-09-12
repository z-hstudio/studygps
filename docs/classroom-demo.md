# 教师端两分钟演示 / Two-minute teacher walkthrough

这些是专门编写的**合成学生与演示记录**，不是实际学生、考试结果或产品效果证据。数据源为 `demo/classroom-students.json`；每人有四次测评（21、14、7、0天前）、学习目标和两条教师建议。时间相对装载日期计算。所有变化仅用于展示产品行为，不能说明建议或系统带来了提分。

These **synthetic students and records** illustrate product behavior. They are not real student records, exam results or evidence of learning impact. Each student has four assessments, a learning goal and two teacher notes. Relative dates are resolved when loaded; the score changes do not establish an effect of the product or advice.

| 时间 / Time | 操作 / Action | 讲解 / Talking point |
| --- | --- | --- |
| 0:00–0:15 | 打开自己的教师班级，说明数据为合成演示。 / Open your teacher classroom and identify the synthetic data. | 六名学生、四次测评和不同学习目标。教师只查看自己班级的学生。 / Six students, four assessments each and distinct goals. Teachers see their own enrolled students. |
| 0:15–0:50 | 依次选择 Alex Chen 和 Sarah Lin。 / Select Alex Chen, then Sarah Lin. | 两人当前加权总分均为63.5；Alex先复习朗肯循环，Sarah先复习第一定律。相同总分不等于相同学习需求。 / Both have a weighted score of 63.5; Alex starts with the Rankine cycle, Sarah with the first law. Equal totals can hide different needs. |
| 0:50–1:10 | 选择 Maya Zhou，再选择 Noah Xu，查看历史。 / Compare Maya Zhou's and Noah Xu's histories. | Maya的演示记录稳步上升，Noah近期回落。趋势帮助老师决定先讨论什么，不把波动解释成学生能力或原因。 / Maya's synthetic trend rises; Noah's falls. Use the history to open a conversation, without inferring the cause or labelling ability. |
| 1:10–1:30 | 选择 Lina Guo，查看60分钟预算和计划。 / Select Lina Guo and inspect her 60-minute plan. | 系统在时间约束下安排一项朗肯循环任务，而不是要求同时复习所有短板。 / One Rankine-cycle task fits the available hour; the plan respects the time budget. |
| 1:30–1:45 | 选择 Ethan Song。 / Select Ethan Song. | 四个模块均达到85分目标，因此没有当前补弱任务；老师仍可给自选拓展建议。 / All topics meet the target of 85, so no remedial tasks are assigned. The teacher can still offer optional extension work. |
| 1:45–2:00 | 回到 Alex，阅读建议草稿并编辑保存一句具体反馈。 / Return to Alex, review a draft and save one concrete note. | “先画四设备能量流向，再计算净功与效率。”展示老师保留判断与修改权。 / “Sketch energy flow through the four devices, then calculate net work and efficiency.” The teacher reviews and edits the guidance. |

现场可优先展示 Alex、Sarah、Lina 三人，其余用于回答评委追问。建议保存会进入该合成学生的记录；它不会发送邮件。计划来自课程权重、目标差距和复习时间的确定性规则；这一步没有调用大模型，也不是考试成绩预测。

For a shorter demo, focus on Alex, Sarah and Lina, then use the other profiles for questions. Saving a note updates the synthetic student's record and sends no email. The plan uses deterministic rules based on topic weights, target gaps and study time; this step makes no LLM call and does not predict exam scores.

## 数据装载 / Loading the fixtures

Run the schema migration with the project environment, then target an explicit classroom UUID:

```sh
npm run db:migrate
npm run demo:seed -- --classroom-id <classroom-uuid>
npm run demo:seed -- --classroom-id <classroom-uuid> --apply
```

The first seed command previews counts. The apply command verifies that the classroom belongs to the configured `STUDYGPS_ADMIN_EMAIL` and that its current Clerk primary email is verified. It creates only class-specific synthetic profile IDs, marked `is_demo=true`, with reserved `example.invalid` emails. It creates no Clerk login accounts and sends no messages. IDs are stable within a classroom and different across classrooms.

装载只添加演示记录，不覆盖现有计划、完成情况、测评日期或老师编辑的建议。重复执行不会重复添加；如标识与真实账号或其他班级冲突，装载会停止。学生端不能修改演示标记；正常班级权限仍由服务端检查。

Loading is additive and idempotent: reruns preserve existing plans, completion, assessment dates and teacher edits. A collision with a real profile or another classroom is rejected. Demo provenance cannot be set through the public profile API, and the usual server-side classroom access checks still apply.

## Verification — 2026-09-12

154 tests passed and the web build passed. Live verification in the designated administrator classroom found six explicitly marked demo students, 24 assessment-history entries, 12 guidance notes and 12 current tasks (two completed). An unrelated teacher could not resolve any of these students. Reapplying the seed produced zero new students and left the database fingerprints of profiles, enrollments, plans, histories and advice unchanged. The administrator's signed-in Safari view displayed the roster and Alex's real persisted details on the canonical Vercel site.
