# StudyGPS Analysis / Study Plan Engine

这个模块把按知识点整理的测评成绩，转换成总时间预算内的补弱任务，并比较新旧计划，供 n8n 保存、安排日历和发送通知。它提供可运行的 JavaScript 核心、测试、演示材料，以及从同一核心生成的 n8n 单文件适配代码。

本次交付使用 Thermodynamics 的四个知识点。所有计算都是纯函数，不修改输入，不使用随机数、当前时间、网络、数据库或模型 API。相同参数得到相同结果。模块复用项目已有的 `src/priority.js` 成绩差距计算，再按建议学习时长计算本引擎的优先级；原有项目说明及队友的 workflow 保持独立。

## 本地运行

使用 **Node.js 22**。在仓库根目录运行核心演示和回归测试，无需安装依赖或提供 API Key：

```sh
node engine/scripts/demo.js
node --test tests/priority.test.js engine/tests/*.test.js
```

第一条命令运行三个案例，生成 `engine/examples/` 中的 `.output.json` 和完整的 `.request.json`。Alex 第二次请求中的 `previous_plan` 使用刚生成的 Alex 第一份输出，不是手写的简化计划。

网站交互测试使用 jsdom 开发依赖。运行完整测试与构建：

```sh
npm ci
npm test
npm run build
```

引擎与部署运行时没有第三方运行时依赖；安装依赖仅用于网页 DOM 测试。

生成和检查 n8n 文件：

```sh
node engine/scripts/build-n8n.js
node engine/scripts/build-n8n.js --check
```

`--check` 检查已生成适配文件是否与当前核心一致，不更新文件。修改核心后应重新生成适配文件并运行测试。本地核心入口：

```js
const { generateStudyPlan, comparePlans } = require('./engine');
const request = require('./engine/examples/alex-assessment-1.request.json');
const plan = generateStudyPlan(request.input, request.course, request.previous_plan);
// 后续测评：generateStudyPlan(nextInput, request.course, plan)
// 已有两份完整输出时：comparePlans(plan, nextPlan)
```

`generateStudyPlan(input, course, previousPlan = null)` 返回完整计划。`comparePlans(previousPlan, newPlan)` 独立返回 `{ plan_changed, changes }`。`explainPlan(plan)` 是独立说明接口，读取已计算计划并返回 `{ summary, priorities, explanation_mode }`；未来可在这里替换说明提供方，计算仍由核心负责。

## 输入合同

顶层 `input` 和 `course` 必须是对象。分数、权重、分钟数必须是真正的有限数字，不自动把数字字符串转成数字。所有必填文本都是非空、非纯空白且 Unicode 格式有效的字符串。

### `input`

| 字段 | 类型与要求 | 含义 |
| --- | --- | --- |
| `student_id` | 必填 string | 学生标识，参与稳定任务 ID。 |
| `course_id` | 必填 string | 必须与 `course.course_id` 完全一致。 |
| `assessment_id` | 必填 string | 本次测评标识；不参与任务 ID。 |
| `target_score` | number，0–100 | 每个知识点的参考目标。 |
| `available_minutes` | number，0–`Number.MAX_SAFE_INTEGER` | 本轮总时间预算，允许小数；不是每天的时间。 |
| `exam_date` | 可省略、null，或实际存在的 `YYYY-MM-DD` 日期 | 只传递元数据，不检查是否未来日期、不安排日期或时段。 |
| `topic_scores` | 必填 object 或 null | 键为课程中已有的 `topic_id`，值为 0–100 的数字或缺失成绩。完全无成绩时传 `{}` 或 `null`。 |

单个知识点的成绩省略、为 `null`、空字符串或纯空白字符串时，视为缺失；直接调用 JavaScript 时单个成绩值 `undefined` 也视为缺失。缺失值不会补成 0，不计算其差距、不为它生成补弱任务。数字 `0` 是有效成绩。整个 `topic_scores` 为 `null` 表示全部缺失；字段省略、值为 `undefined` 或空字符串则是输入错误。未知 `topic_id` 会报错，避免拼写错误被静默丢弃。不要从总分推测各知识点成绩。

### `course`

| 字段 | 类型与要求 | 含义 |
| --- | --- | --- |
| `course_id` | 必填 string | 课程标识。 |
| `topics` | 非空 array | 配置顺序也是优先级相同时的顺序。 |
| `topics[].topic_id` | 必填 string，课程内唯一 | 知识点标识。 |
| `topics[].topic_name` | 必填 string | 显示名称。 |
| `topics[].importance` | number，0–1 | 人工配置的重要性；全部权重之和须为 1，容差 `1e-9`。 |
| `topics[].estimated_minutes` | 有限 number，> 0，≤ `Number.MAX_SAFE_INTEGER` | 该知识点本轮最多安排的建议学习时长；也用于优先级计算。极小到会使优先级溢出的数值会拒绝。 |
| `topics[].resource_id` | 必填 string | 下游可映射的资料标识。 |
| `topics[].resource_ref` | 必填 string | 资料引用；核心不读取文件、不检查外部链接。 |
| `topics[].activity` | 必填 string | 具体学习活动。 |

演示配置位于 `engine/examples/course.json`：

| 配置顺序 | `topic_id` | `importance` | `estimated_minutes` |
| --- | --- | ---: | ---: |
| 1 | `first_law` | 0.30 | 60 |
| 2 | `second_law` | 0.30 | 60 |
| 3 | `entropy` | 0.10 | 90 |
| 4 | `rankine_cycle` | 0.30 | 60 |

这些是人工设定的演示参数，不是学校官方考试权重，也不是经过验证的学习时长。四份引用材料实际位于 `engine/examples/resources/`，明确标为 demo，包含练习和参考答案。引用路径相对于仓库根目录；n8n 不会通过这些路径访问你电脑上的文件。队友需将材料发布到适合团队使用的位置，或按 `resource_id` 映射到已有资料，并把可用引用传入 `course`。

### `previousPlan`

首次本地调用可省略或传 `null`；后续传入同一学生、同一课程的上一份完整引擎输出。n8n 包装字段名是 `previous_plan`，必须显式存在，首次为 `null`。

比较时要求 `schema_version: "1.0"`，有效学生/课程 ID、`priorities` 数组和 `topic_analysis` 数组。任务需有有效文本字段、`task_type: "remedial"`、与数组位置一致的连续排名、正的 30 分钟整数倍时长；任务 ID、任务知识点及分析知识点不得重复，每个任务必须有对应分析。成绩须为有效数字或 `null`。学生或课程不匹配、同一任务 ID 被复用于不同知识点都会报错。存储端应保留完整输出，不要仅保存第一名或自行裁剪后作为上一份计划。

## 算法与边界

对于有成绩的知识点：

```text
observed_score = input.topic_scores[topic_id]
target_gap = max(0, target_score - observed_score)
priority_score = target_gap × importance ÷ (estimated_minutes / 60)
```

`observed_score` 是本次实际测评结果，不是精确的“真实掌握程度”。参考目标按知识点应用只是 MVP 简化规则。所有知识点都有成绩时：

```text
overall_score = Σ(observed_score × importance) / Σ(importance)
```

权重要求和为 1，公式仍除以实际权重总和，以容纳校验容差内的浮点误差。缺少任何知识点成绩时，`overall_score` 为 `null` 并附 warning。该值是演示配置下的加权测评结果，不是预测考试分数。

计算、排序和比较均使用 JavaScript 原始数值，**不先四舍五入再排序**。英文 `reason` 和 `summary` 中的数值最多展示四位小数，并去掉末尾的 0；例如计算值 `2.6666666666666665` 展示为 `2.6667`。JSON 数字保留实际计算精度；分数变化信息 `score_changes[].message` 使用原始成绩值。

只对 `target_gap > 0` 的知识点排序，按 `priority_score` 从高到低；相同时按 `course.topics` 原始顺序。对数学上相同、但因浮点运算产生细微偏差的分数，比较容差是 `8 × Number.EPSILON × max(abs(a), abs(b))`：差值在容差内按并列处理，原始数字仍保持不变。例如目标 80、First Law 成绩 77、Entropy 成绩 66.5 时，两者理论排序分数均为 0.9，按配置顺序先 First Law。极小正分数仍排在 0 之前。权重为 0 的有差距知识点仍是候选项，优先级为 0。目标差距为 0 或成绩缺失的知识点不产生补弱任务。

依次从排序结果分配时间，每个任务的时长为：

```text
duration_minutes = floor(min(剩余预算, estimated_minutes) / 30) × 30
```

最多安排至该知识点的 `estimated_minutes`，总时长不超过预算。非 30 分钟倍数的配置向下取整，例如建议 45 分钟最多安排 30 分钟，并标记 `is_partial: true`。候选项的建议时长不足 30 分钟时跳过，记录 warning，继续尝试下一项；剩余预算不足 30 分钟时停止。无需为了用完预算增加任务。

本轮不推断前置知识关系、不称前置知识“已满足”、不预测提分，也不保证达到目标成绩。

## 输出合同 `schema_version: "1.0"`

`priorities` 仅包含实际分配了时间的任务；全部知识点结果在 `topic_analysis`，按课程配置顺序排列。

| 顶层字段 | 类型 | 含义 |
| --- | --- | --- |
| `schema_version` | string | 当前固定 `"1.0"`；下游应据此管理合同兼容。 |
| `student_id` | string | 输入学生标识。 |
| `course_id` | string | 输入课程标识。 |
| `assessment_id` | string | 本次测评标识。 |
| `exam_date` | string 或 null | 输入日期；省略时输出 null。 |
| `status` | string | 见下方状态表。 |
| `overall_score` | number 或 null | 配置权重下的加权测评结果；存在缺失成绩时为 null。 |
| `overall_score_basis` | string | 固定 `"configured_importance_weighted_assessment"`。 |
| `target_score` | number | 每个知识点的参考目标。 |
| `available_minutes` | number | 本轮总预算。 |
| `total_planned_minutes` | number | 已安排任务时长之和。 |
| `unused_minutes` | number | `available_minutes - total_planned_minutes`。 |
| `topic_analysis` | array | 全部课程知识点的分析，含缺失值。 |
| `priorities` | array | 按实际执行优先级排列的学习任务，可为空。 |
| `summary` | string | 根据实际计算动态生成的英文简述。 |
| `explanation_mode` | string | 当前固定 `"template"`。没有实现 `prepared_mock` 或模型调用。 |
| `plan_changed` | boolean | 可执行任务是否变化；首次生成固定为 true。 |
| `changes` | object | 首次标记及新旧差异，见下文。 |
| `warnings` | array | 可继续生成计划的资料缺失或学习块限制，可为空。 |

### `status`：从上到下匹配，命中后停止

| 优先级 | 值 | 条件及含义 |
| --- | --- | --- |
| 1 | `no_scores` | 全部知识点成绩缺失；任务为空。 |
| 2 | `target_met` | 至少一个有效成绩，且所有已提供成绩都达到参考目标；任务为空。缺失成绩仍附 warning，不能解释为未测知识点也已达标。 |
| 3 | `no_study_time` | 仍有目标差距，但预算为 0；任务为空。 |
| 4 | `insufficient_block_time` | 仍有差距、预算 > 0，但预算或候选项建议时长不足以安排任何完整 30 分钟块。 |
| 5 | `ready` | 至少安排一个任务；可以同时有缺失成绩 warning 或剩余时间。 |

例如无成绩且预算为 0 时返回 `no_scores`；全部有效成绩达标且预算为 0 时返回 `target_met`。`status` 不是预测的考试状态，也不是 n8n 工作流执行状态。

### `topic_analysis[]`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `topic_id` | string | 知识点标识。 |
| `topic_name` | string | 配置名称。 |
| `observed_score` | number 或 null | 原始测评成绩；缺失为 null。 |
| `target_gap` | number 或 null | 非负目标差距；缺失为 null。 |
| `importance` | number | 配置重要性。 |
| `estimated_minutes` | number | 配置建议时长。 |
| `priority_score` | number 或 null | 未舍入的排序分数；缺失为 null。 |

### `priorities[]`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `task_id` | string | 与测评编号和排名无关的稳定 ID，格式见下文。 |
| `task_type` | string | 当前固定 `"remedial"`。 |
| `topic_id` | string | 任务所属知识点。 |
| `topic_name` | string | 任务显示名称。 |
| `priority` | number | 从 1 开始的连续排名，与数组位置一致。 |
| `duration_minutes` | number | 实际分配时长，为正的 30 分钟整数倍。 |
| `estimated_minutes` | number | 该知识点原始建议时长。 |
| `is_partial` | boolean | 分配时长是否小于建议时长。 |
| `resource_id` | string | 配置的资料标识。 |
| `resource_ref` | string | 配置的资料引用。 |
| `activity` | string | 配置的学习活动。 |
| `reason` | string | 根据当前成绩、差距、重要性、建议时长和实际时长生成的英文说明；部分练习明确标注。 |

任务 ID 使用以下顺序，各段先执行 `encodeURIComponent`，再以冒号连接：

```text
studygps:remedial:{student_id}:{course_id}:{topic_id}
```

例如 `studygps:remedial:alex:thermodynamics_demo:rankine_cycle`。原始 ID 中的冒号等字符会被编码，避免段分隔冲突。不要将 `priority`、`assessment_id`、时间或随机数加入 ID。队友可以用此 ID 查找并更新同一任务；本模块不生成 `calendar_event_id`，也不负责持久化、跨运行去重或版本管理。

### `changes`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `type` | string | `initial_plan`、`updated_plan` 或 `unchanged_plan`。 |
| `first_priority_changed` | boolean | 非首次计划的首个任务 ID 是否变化，包括有任务与无任务之间的变化；首次为 false。 |
| `tasks_added` | string[] | 新增任务 ID；首次为当前所有任务 ID。 |
| `tasks_removed` | string[] | 删除任务 ID；首次为空。 |
| `task_order_changed` | boolean | 两份计划共同保留的任务之间，相对顺序是否改变。单纯新增/删除由对应字段记录，不必同时触发本项。 |
| `duration_changes` | object[] | 保留任务的实际时长变化。 |
| `resource_changes` | object[] | 保留任务的资料 ID 或引用变化。 |
| `activity_changes` | object[] | 保留任务的活动文字变化。 |
| `task_details_changes` | object[] | 保留任务的知识点显示名或任务类型变化；当前合同仅接受 `remedial` 类型。 |
| `score_changes` | object[] | 知识点成绩变化；可单独存在而任务保持不变。首次为空。 |

差异数组的对象字段：

| 数组 | 每项字段 |
| --- | --- |
| `duration_changes` | `task_id`、`previous_minutes`、`new_minutes`：稳定 ID、旧/新实际分钟数。 |
| `resource_changes` | `task_id`、`previous_resource_id`、`new_resource_id`、`previous_resource_ref`、`new_resource_ref`：旧/新资料标识及引用。 |
| `activity_changes` | `task_id`、`previous_activity`、`new_activity`：旧/新活动文字。 |
| `task_details_changes` | `task_id`、`previous_topic_name`、`new_topic_name`、`previous_task_type`、`new_task_type`：旧/新名称与类型。 |
| `score_changes` | `topic_id`、`previous_score`、`new_score`、`message`：旧/新数字或 null，以及英文变化信息，例如 `Rankine Cycle: 50% → 78%`；null 显示为 `missing`。 |

首次即使没有任务，仍返回 `plan_changed: true`、`changes.type: "initial_plan"`，方便存储端记录第一次结果。之后，首项、增删、保留任务顺序、实际时长、资料、活动或任务显示名变化才触发 `plan_changed: true`。只改变成绩、目标或预算但没有改变实际任务，或者只改变 `assessment_id`、`exam_date`、`summary`、`reason`、排序计算分数，都不会单独触发更新。仅改变建议时长/`is_partial`、实际任务时长不变时也不触发。此时 `changes.type` 为 `unchanged_plan`；有成绩变化仍会记录 `score_changes`。

下游可始终保存新的完整分析结果，再根据 `plan_changed` 和差异决定是否更新任务。`plan_changed` 不表示必须删除重建所有日历事件；具体日期变更规则、稳定 ID 到事件 ID 的映射及外部调用由队友实现。

### `warnings[]`

每项含 `code` 和英文 `message`；知识点级 warning 还含 `topic_id`。

| `code` | 条件 |
| --- | --- |
| `MISSING_TOPIC_SCORE` | 某知识点成绩缺失，每个缺失知识点一条；包含 `topic_id`。 |
| `INCOMPLETE_OVERALL_SCORE` | 有任一知识点成绩缺失，额外记录一条；无 `topic_id`，整体分数为 null。 |
| `TOPIC_BELOW_BLOCK_SIZE` | 分配过程中遇到建议时长小于 30 分钟的候选项，跳过后继续下一项；包含 `topic_id`。若预算已不足 30 分钟，分配会先停止，不再遍历余下候选项。 |

部分练习通过 `is_partial`、`reason` 和 `summary` 说明，不另产生 warning。

## 错误处理

无效输入及不可比较的计划会抛出 `StudyPlanValidationError`，而不是返回一份看似成功的空计划：

| 属性 | 含义 |
| --- | --- |
| `name` | `"StudyPlanValidationError"`。 |
| `code` | `"VALIDATION_ERROR"`。 |
| `message` | 汇总路径及可理解的英文原因。 |
| `issues` | `{ path, message }` 数组；例如路径 `input.topic_scores.entropy`、`course.topics[0].estimated_minutes` 或 `previousPlan.student_id`。 |

校验覆盖分数越界、非数字、负时间、无效日期、课程不匹配、重复知识点、未知成绩键、无效权重及建议时长，以及前述旧计划合同。缺失单科成绩是 warning；非法字段或错误归属是 error。调用方应处理错误并修正输入，不要自动以 0 分或空旧计划替代。

## 三份演示数据

共同目标 80、总预算 180 分钟，实际结果由演示命令生成：

| 案例 | 加权测评结果 | 实际任务顺序和分钟数 |
| --- | ---: | --- |
| Alex Assessment 1 | 63.5 | Rankine Cycle 60 → Second Law 60 → Entropy 60（部分练习） |
| Sarah Assessment 1 | 63.5 | First Law 60 → Second Law 60 → Entropy 60（部分练习） |
| Alex Assessment 2 | 71.5 | Second Law 60 → Entropy 90 → Rankine Cycle 30（部分练习） |

Alex 第一轮的优先级分数：Rankine Cycle 9、Second Law 4.5、Entropy 3。第二轮：Second Law 5.4、Entropy 约 2.6667、Rankine Cycle 0.6（表中为便于阅读的显示值）。Alex 与 Sarah 第一轮总分相同但首要任务不同，说明决策使用知识点数据。第二轮对比第一轮会记录首项、任务顺序、Entropy 和 Rankine Cycle 时长，以及成绩变化。

每个案例都有以下三个文件，均在 `engine/examples/`：

- `alex-assessment-1.input.json`、`.output.json`、`.request.json`
- `sarah-assessment-1.input.json`、`.output.json`、`.request.json`
- `alex-assessment-2.input.json`、`.output.json`、`.request.json`

这里的后缀简称共用该行完整文件名前缀。`.input.json` 是学生测评；`.output.json` 是实际生成的完整计划；`.request.json` 是包含课程及旧计划的完整 n8n 请求。输出与请求均由脚本生成，不应手工修改来配合预期结果。

测试范围包括三个演示、额外成绩组合、目标和预算变化、缺失/无效输入、0 和不足一块的时间、建议时长取整、稳定顺序及 ID、输入不变、新旧任务差异、跨学生/课程拒绝比较、离线核心，以及单文件适配输入输出和与核心结果的一致性。初版核心的 55 项测试记录见 [VALIDATION.md](VALIDATION.md)；加入 HTTP 和双语网页后，完整测试为 92 项，当前验证范围见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## n8n Code 节点接入

将 `engine/dist/n8n-code-node.js` 的完整内容粘贴到 **Code** 节点，语言选择 **JavaScript**，模式选择 **Run Once for All Items**。这是 n8n Code 节点的全部项目一次运行模式；参见 [n8n Code 节点官方说明](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/)。

这个适配器的合同是**每次恰好一条输入 item**，不接受批量多学生。它读取 `$input.all()[0].json`，该对象必须包含：

| 字段 | 要求 |
| --- | --- |
| `input` | 上述学生测评对象。 |
| `course` | 上述完整课程配置，由上游传入。 |
| `previous_plan` | 必须显式存在；首次为 null，之后为同一学生、同一课程的上一份完整输出。 |

使用生成的 `engine/examples/alex-assessment-1.request.json` 作为首轮真实 JSON 样例；它没有省略号或占位字段。上游节点应把文件内容作为 item 的 `json` 对象，避免额外包一层 `body` 或 `request`。使用 Webhook 时由上游先整理到这个顶层合同。

适配器返回 `[{ json: plan }]`，其中 `plan` 就是核心完整结果，`priorities` 保留为数组。n8n 节点间采用带 `json` 的 item 数组传递数据；参见 [n8n 数据结构官方说明](https://docs.n8n.io/build/work-with-data/understand-n8ns-data-structure/)。如果后续要逐任务处理日历，可由队友在下游拆分 `priorities`。

输入条数、包装字段或内部数据无效时会抛出 `code: "VALIDATION_ERROR"` 的校验错误，并附明确路径和原因。适配器不吞掉错误、不自动把缺失的 `previous_plan` 当作首次调用。源代码与适配代码由无依赖构建脚本保持一致，不维护第二套算法，也不要求 n8n 安装第三方包或读取本地课程文件。

**尚未在真实 n8n 环境验证。** 本地适配测试使用模拟 `$input` 验证输入输出和错误行为，不能证明真实 n8n 的节点版本、工作流接线、部署环境或外部服务已经集成成功。本模块没有 Google Calendar/Gmail 真实调用、数据库、登录、Canvas、持久化或跨运行去重。

交付清单与队友首次接入步骤见 [HANDOFF.md](HANDOFF.md)。
