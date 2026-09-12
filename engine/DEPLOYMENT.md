# StudyGPS Vercel 部署记录

更新日期：2026-09-12。版本：双语学习驾驶舱。目标：Production。状态：**READY**，已由 Vercel CLI 和部署 API 确认。

- 正式地址：https://studygps-five.vercel.app
- 中文：https://studygps-five.vercel.app/?lang=zh
- English: https://studygps-five.vercel.app/?lang=en
- 部署 ID：`dpl_AmLx9LjgaJiJdbHnzGu9RvVP9sni`
- 唯一部署：https://studygps-qfas6wf4z-yves-projects-de611e27.vercel.app
- 项目：`studygps` / `prj_9JGpANBHwrZUcsq9fcmvGQ3oWvmY`
- 团队：`yves-projects-de611e27`
- 构建：静态 HTML/CSS/JavaScript + 两个 Node.js22 Vercel Functions。部署日志显示构建2秒完成；区域iad1。
- 来源：本地未提交工作目录，经 Vercel CLI 上传。Git基线仍是`28e5292`，不能把这个旧提交视作完整部署源码。没有推送Git或更改GitHub权限。

## 当前版本完成的功能

- 中英文界面、说明、错误、日期、数字、状态、无障碍标签和微练习；语言偏好保存于浏览器，支持直接分享语言链接。
- 同分不同路线：两个63.5分案例按实际知识点分数生成不同首要任务。
- 时间预算推演：修改预算，并以相同成绩/目标下的180分钟计划作比较。保留独立的上一轮测评基准。
- 新旧测评路线和具体变化：添加、移除、时长、顺序、资料、活动及分数。移除不误标为预算暂缓。
- 四份双语微练习，概念、步骤、选择题及解释性反馈；不改写测评结果。资源与活动签名固定绑定已写好的翻译，来源变化时显示原始资料而不套用旧微练习。
- 原始JSON合同、英文核心说明和稳定任务标识保持不变。中文/英文交接文档、双语演示指南和有来源的竞品比较可下载。
- 请求过期保护、15秒请求超时、错误重试；本轮只存语言偏好，不保存成绩或计划。

## 已执行的验证

使用Node.js22运行：

```sh
npm ci
npm test
npm run build
node --check web/app.js
node --check web/presentation.js
git diff --check
node scripts/verify-deployment.js http://127.0.0.1:3040
node scripts/verify-deployment.js https://studygps-five.vercel.app
```

- **92项测试全部通过**：原有排序4项、引擎43项、n8n适配8项、HTTP接口18项、新增展示与DOM回归19项。
- **25项本地HTTP检查通过**。
- **25项生产HTTP检查通过**：主页/英文入口、运行脚本/CSS/图标、适配代码与双语交接文件及演示指南下载、健康接口、三个案例、零预算、错误方法/JSON/Content-Type、跨学生计划拒绝、四份原始材料。
- 三个生产API响应与本地通用引擎的完整输出深度一致。
- 部署后的`app.js`、`presentation.js`、`learning-content.js`和`styles.css`内容与本地构建产物逐字节一致，确认不是旧版静态文件。
- DOM测试检查语言切换不改变JSON、错误文本、无成绩/零预算、过期请求、预算基准、微练习答题、资源更新回退、初次失败重试和任务移除语义。

**验证边界：** 本轮网页交互通过jsdom模拟DOM测试；它不渲染页面。本次没有重新做真实浏览器视觉、手机截图或真人可用性测试。前一版的浏览器检查不能作为本次新版的视觉证据。响应式布局已实现，仍应在正式演示设备上做现场预演。

## n8n与RAG边界

接口：`POST https://studygps-five.vercel.app/api/study-plan`，`Content-Type: application/json`，完整请求见`engine/examples/*.request.json`。

```sh
curl https://studygps-five.vercel.app/api/study-plan \
  -H 'Content-Type: application/json' \
  --data-binary @engine/examples/alex-assessment-1.request.json
```

HTTP返回计划对象，Code适配器返回`[{json:plan}]`，内部计划相同。资料相对路径需相对正式站点根路径解析；如果替换为完整URL或更新材料，后续轮次沿用相同课程配置。

**尚未在真实n8n环境验证。** 网页已如实标明n8n/Calendar/Gmail仍待队友接通；没有真实日历、邮件、Canvas、数据库或登录。稳定ID支持下游更新原事件，但实际持久化与重复运行去重尚未验证。

说明模式仍为`template`。当前没有RAG或LLM调用。四份资源为原创未审核演示材料，权重和建议时长是人工配置，不预测成绩，不保证竞赛名次。竞品研究和评分对应见`DEMO-GUIDE.md`和`NOVELTY.md`。

## 后续发布

```sh
npm ci
npm test
npm run build
vercel deploy --prod --yes --scope yves-projects-de611e27
node scripts/verify-deployment.js https://studygps-five.vercel.app
```

项目链接位于被忽略的`.vercel/project.json`。正式域名保持不变，当前由本地CLI发布，不依赖Git自动部署。`public/`为构建生成目录，可重新生成，勿在那里编辑源码。

上一版本部署为`dpl_4F5gTyCbpkHwMUximBkQrqL2b9K5`；其73项测试和18项HTTP检查是历史记录，以上92/25为本次新版结果。

发布后读取本次部署的error级日志：`vercel logs dpl_AmLx9LjgaJiJdbHnzGu9RvVP9sni --no-follow --level error --since 1h --limit 20 --json --scope yves-projects-de611e27`。命令成功退出，未返回error条目。这是发布时单次检查，没有创建持续监控。本轮临时本地开发服务已停止，线上服务继续运行。
