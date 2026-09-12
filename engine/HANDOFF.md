# 给 n8n 队友的交接

引擎接收课程配置、知识点成绩和上一份完整计划，输出补弱任务与变化。你负责保存计划、按稳定任务 ID 映射日历事件，以及通知和重复运行处理。

## 交给你的文件

- `engine/dist/n8n-code-node.js`：Code 节点直接粘贴的完整单文件代码。
- `engine/README.md`、`engine/HANDOFF.md`：输入输出合同、规则和交接说明。
- `engine/examples/course.json`：人工设定的 Thermodynamics 演示配置。
- `engine/examples/alex-assessment-1.request.json`、`sarah-assessment-1.request.json`、`alex-assessment-2.request.json`：三份可直接使用的完整请求。
- 上述三个案例对应的 `.output.json`：本地运行生成的预期输出，可用于检查接线结果。
- `engine/examples/resources/`：四份明确标记的本地演示材料。请发布到团队可访问的位置，或将 `resource_id` 映射至你们已有材料后更新传入的 `resource_ref`。

如需重建或修改源码，最方便是使用完整仓库。单独传文件时需包含整个 `engine/`、`src/priority.js`、`data/sample-grades.json` 和 `api/`（引擎测试目录也包含 HTTP 接口测试）。运行完整网站测试还需 `tests/`、`web/`、`package.json`、`package-lock.json`，并先执行 `npm ci`。

## 首次接入

1. Code 节点选择 **JavaScript → Run Once for All Items**，粘贴完整 `engine/dist/n8n-code-node.js`。模式说明见 [n8n Code 官方文档](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/)。
2. 上游每次传入**一条 item**，其 `json` 就是某份 `.request.json` 的内容，顶层必须有 `input`、`course`、`previous_plan`。首次显式传 `previous_plan: null`；零条、多条、缺少旧计划字段或无效内部数据会报 `VALIDATION_ERROR`。
3. 输出是 `[{ json: plan }]`。把 `json` 完整保存，下一轮按 `student_id` 和 `course_id` 找回后放入 `previous_plan`。数据结构见 [n8n 官方说明](https://docs.n8n.io/build/work-with-data/understand-n8ns-data-structure/)。
4. 用 Alex 第一轮请求验证输出，再用 Alex 第二轮请求验证变化。第二轮样例已嵌入代码生成的第一份计划，无需手工拼装。

本地核心演示和测试，在仓库根目录用 Node.js 22 运行，无需安装包或提供模型 Key：

```sh
node engine/scripts/demo.js
node --test engine/tests/*.test.js
```

网站另有 jsdom 开发测试依赖。运行包含网页交互的完整测试：`npm ci` 后 `npm test`。引擎及部署运行时没有第三方依赖。

核心变更后生成单文件，并检查同步状态：

```sh
node engine/scripts/build-n8n.js
node engine/scripts/build-n8n.js --check
```

## 下游应该怎样读结果

- `priorities` 是实际安排的任务数组，`duration_minutes` 已按 30 分钟块分配。`available_minutes` 是这一整轮的预算。`exam_date` 只提供元数据，具体日期和时段由你安排。
- `task_id` 格式为 `studygps:remedial:{student_id}:{course_id}:{topic_id}`；各段都 URI 编码后再用冒号连接。排名或测评改变不改变同一补弱任务的 ID。你保存 `task_id → calendar_event_id` 映射；本模块不生成事件 ID。
- 首次 `plan_changed: true`，`changes.type: "initial_plan"`，即使任务为空也是如此。后续先保存新完整结果，再按 `changes` 判断任务增删、顺序、时长、资料和活动是否需要更新。只换测评编号、说明措辞或成绩但任务没变时，`plan_changed` 为 false；`score_changes` 仍可能有内容。
- `status` 与 `warnings` 需一起看：缺失成绩不会补成 0，`overall_score` 会为 null。`target_met` 只表示已提供的有效成绩达标。无任务时无需强行创建日历事件。
- `resource_ref` 的仓库相对路径不能在 n8n 云端访问你本地文件。课程必须从上游传入，资料发布或 ID 映射也由你处理。

演示检查点：Alex/Sarah 第一轮的加权成绩均为 63.5，第一项分别为 Rankine Cycle / First Law；Alex 第二轮为 Second Law，任务分钟数依次为 60、90、30。权重与时长是演示配置，输出不预测提分，也不保证最终成绩。

**尚未在真实 n8n 环境验证。** 本地适配测试覆盖包装输入、错误行为及与核心的一致性；真实 n8n 版本、工作流、保存和跨运行去重、Google Calendar/Gmail 调用仍需由你的环境验证。完整字段及状态优先级见 [README.md](README.md)。

## Vercel HTTP 调用方式

本仓库另提供 `POST /api/study-plan`，可以在 n8n 中使用 HTTP Request 节点调用部署后的服务。请求头设置 `Content-Type: application/json`，JSON body 使用同一份 `.request.json` 的内容：`input`、`course`、`previous_plan`。

HTTP 成功响应直接是完整 `plan` 对象；Code 节点的返回值是 `[{ json: plan }]`，两者的包装层不同，内部计划相同。接口无需模型 Key，也不写入数据库；每轮都应由上游提供课程和上一份计划。服务是公开的原型计算接口，没有用户登录。

| HTTP 状态 | 含义 |
| --- | --- |
| 200 | 成功，返回完整计划。 |
| 400 | JSON 无效或数据校验失败；查看 `error.code`、`error.message` 和可用的 `error.issues`。 |
| 405 | 方法错误，使用 POST。 |
| 413 | 请求体超过 256 KiB。 |
| 415 | Content-Type 不是 application/json。 |
| 500 | 服务发生异常，返回通用错误而不暴露堆栈。 |

`GET /api/health` 提供服务健康信息。计算响应使用 `Cache-Control: no-store`；本模块不记录请求体、不保存测评数据。线上演示提供的四份资料有可访问路径，若从其他来源传入课程，请使用相应团队可访问的资料引用。

Vercel 的实际部署地址和验证记录会保存在仓库的 `engine/DEPLOYMENT.md`。HTTP 接口实测通过与真实 n8n 工作流接线验证是不同范围。
