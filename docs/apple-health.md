# Apple Health concept / Apple Health 演示边界

StudyGPS currently has **no Apple Health connection**. `server/health-demo.js` creates seven days of fictional sleep and blood-oxygen samples for adult university-student demonstrations. Dates are labels relative to the supplied planner date, not device observations. Every result has `source: "synthetic"` and `connected: false`. This module accepts an enum and a calendar date; it rejects uploaded health measurements.

目前**未连接 Apple Health**。模块只生成面向成年大学生的虚构睡眠、血氧数据；日期不是设备采集记录。它不接收真实健康数值，也不把真实健康记录共享给老师；班级老师可以查看标明为合成数据的演示情境。

| Scenario / 场景 | Samples / 记录 | Planning rule / 规划规则 |
| --- | --- | --- |
| `off` | None / 无 | No change / 不调整 |
| `no_data` | None / 无 | No change; absence does not indicate short sleep or denied access. / 不把空数据解释为睡眠不足或拒绝权限。 |
| `rested` | Seven fictional days; latest sleep 7.8 h / 七天虚构记录，最近7.8小时 | No change / 不调整 |
| `short_sleep` | Seven fictional days; latest sleep 5.2 h / 七天虚构记录，最近5.2小时 | Only the supplied date: half the available study budget, focus blocks capped at 20 minutes. / 仅指定当天：学习预算减半，专注段最多20分钟。 |

The adjustment is a product demonstration rule, not a diagnosis, validated readiness score or claim that a particular sleep duration causes a particular learning result. The navigation caller must apply it only to the current planner date. Oxygen values are display-only: no ability rating, medical inference, “normal/danger” bands or threshold-based task changes.

上述调整是产品演示规则，不是诊断、精力评分或学习效果结论。血氧仅供展示，不用于判断能力、病症或是否应改变任务，也不显示“正常/危险”标签。Apple describes its Blood Oxygen app as intended for general fitness and wellness, not medical use, and for people aged 18 or above. [Apple Blood Oxygen guidance](https://support.apple.com/en-gb/120358)

## Future native companion / 未来原生端方案（未实现）

A real integration would require a native companion using HealthKit and a separate implementation review. Enable the HealthKit capability, explain the read purpose with `NSHealthShareUsageDescription`, check device support, and request read access separately for sleep analysis and oxygen saturation, only when needed. Use an empty `toShare` set: this proposal writes nothing into HealthKit. A person can change permissions later. A successful authorization request does not establish that each read permission was granted; empty results must remain “no available data.” Respect any limited history window the OS exposes. [Apple: authorizing access to health data](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data)

未来方案需要原生伴侣应用，按数据类型申请只读权限。权限申请成功不等于所有读取权限已获准；没有返回记录时，应显示“暂无可用数据”。用户可随时调整授权。

Any future server transfer would need an additional explicit opt-in, an authenticated student owner, minimal daily aggregates, provenance and timezone, a retention/deletion policy, and a way to disconnect. HealthKit permission alone does not authorize uploading records or sharing them with a classroom. The current teacher API must not expose personal health values. This is a proposed boundary, **not a live endpoint or completed integration**.

若未来向服务器传送数据，还需单独征得同意，并实现本人身份绑定、最小化汇总、来源与时区、保留与删除规则及断开入口。HealthKit读取许可不等于上传或向班级共享许可。这些属于未来规范，**目前没有真实健康数据上传接口**。
