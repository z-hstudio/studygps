# 实际验证记录

> 历史记录：本文件记录初版核心交付时的 55 项测试及当时未推送、未部署的状态，不代表当前全部产品范围。现在完整测试包含 HTTP 与双语网页，共 92 项；最新验证记录见 [DEPLOYMENT.md](DEPLOYMENT.md)。以下通配符命令是当时执行的原始命令，当前运行完整测试需先 `npm ci`；无依赖的核心回归命令为 `node --test tests/priority.test.js engine/tests/*.test.js`。

验证日期：2026-09-12（Australia/Sydney）。本机 Node.js：`v24.15.0`。

工作目录：`/Users/yveszhou/Documents/ChatGPT/n8n/studygps-review`。
原始仓库基线：`28e5292d47470e4bc97515253f55f0a01ee640de`。

## 执行结果

已实际执行：

```bash
node engine/scripts/demo.js
node engine/scripts/build-n8n.js
node --test tests/*.test.js engine/tests/*.test.js
```

测试结果：**55 项通过，0 项失败，0 项跳过**。

| 测试文件 | 通过数 | 验证内容 |
| --- | ---: | --- |
| `tests/priority.test.js` | 4 | 现有排序模块回归测试 |
| `engine/tests/engine.test.js` | 43 | 三份演示、额外学生、目标与预算变化、缺失成绩、错误输入、稳定排序、任务 ID、计划比较、不修改输入、动态英文说明、无外部服务运行 |
| `engine/tests/n8n-adapter.test.js` | 8 | 生成文件一致性、三份适配输入输出、120 组额外组合、错误封装、跨学生/课程拒绝比较、材料存在性 |

适配组合覆盖 5 组成绩（包括 null、空对象、部分缺失、数学并列、全部达标）、6 个预算和 4 个目标分数。每组生成前后两份计划，检查单文件沙箱与核心函数结果一致，以及只更换测评编号时不产生可执行任务变化。

本地 VM 沙箱没有 Node `require`、`process` 或文件接口，网络调用、随机数和当前时间调用被设为抛错，三份演示均在此执行并与核心对照。核心测试另在 `env={}` 的子进程中加载模块后禁用文件访问与网络入口，并运行 Alex 第一轮示例。这验证了核心计算与适配代码不需要模型 API Key、网络、数据库或运行时读取课程文件。模块源码加载和构建/演示脚本本身仍使用本地文件系统。

## 代码生成的演示结果

| 案例 | 配置加权测评结果 | 实际安排 | 对比类型 |
| --- | ---: | --- | --- |
| Alex Assessment 1 | 63.5 | Rankine Cycle 60m → Second Law 60m → Entropy 60m（部分练习） | `initial_plan` |
| Sarah Assessment 1 | 63.5 | First Law 60m → Second Law 60m → Entropy 60m（部分练习） | `initial_plan` |
| Alex Assessment 2 | 71.5 | Second Law 60m → Entropy 90m → Rankine Cycle 30m（部分练习） | `updated_plan` |

三份计划均安排 180 分钟。Alex 第二轮识别了首项及顺序变化、Entropy 60→90 分钟、Rankine Cycle 60→30 分钟和成绩变化；同一知识点的任务 ID 保持一致。

JSON 输出与完整 n8n 请求均由 `demo.js` 实际运行生成，测试逐份验证与当前核心结果一致。独立复核发现的浮点并列问题已经修复，并有回归测试：First Law 77 与 Entropy 66.5 在目标 80 下数学优先分数均为 0.9，保留课程顺序。

## 验证范围

**尚未在真实 n8n 环境验证。** 本机检查未找到 `n8n` 可执行程序；这里的适配测试是 Node VM 模拟 Code 节点输入输出，不能证明 n8n 实例、工作流、凭据或线上集成已经完成。

未调用 Google Calendar、Gmail、Canvas、模型 API 或数据库；未验证日历更新、持久化、跨运行去重或真实通知。这些由 n8n 队友继续对接。本轮没有推送、部署、创建远程 PR 或修改 GitHub 权限。

四份本地材料是原创、未经教师审核的演示练习；检查了引用文件存在和演示计算，不构成真实课程内容审核、考试权重验证或学习效果验证。
