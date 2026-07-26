# Heartbeat Tasks — 个人办公/学习教练

<!--
拷贝本文件到 workspace/HEARTBEAT.md
前提：gateway.heartbeat.enabled = true（默认开启）

内置 heartbeat 约每 30 分钟执行一次；任务应幂等、无事可报则保持安静。
若需精确「每天 7:30 简报」，请额外用 cron 添加一次性定时任务（见 implementation-roadmap.md PR-3）。
-->

## Active Tasks

### 1. 晨间简报（morning-brief）

**When**: 每天第一次 heartbeat 触发且本地时间 ≥ 07:00，且 `briefs/YYYY-MM-DD-morning.md` 尚不存在或为空。

**Do**:
1. 阅读并遵循 skill `morning-brief`。
2. 生成 `briefs/YYYY-MM-DD-morning.md`。
3. 若存在未处理的 inbox `[ ]`、active goals、或 path.md 的 Today 建议 → **向用户发送简报正文**（markdown）。
4. 若没有任何 active goal、inbox 为空、无学习路径 → **不要通知用户**。

**Do not**: 重复发送同一份简报（检查今日 brief 文件是否已在过去 1 小时内写入且内容非空）。

---

### 2. 长期目标停滞提醒

**When**: 每次 heartbeat；每个 active 目标独立判断。

**Do**:
1. 读 `goals/active.md` 与 `learning/*/log.md` 最后日期。
2. 若某目标 **≥ 3 天** 无 log 或 path 更新 → 发送 **一条短提醒**（≤ 2 句）：目标名 + 建议的下一小步（来自 path.md Today）。
3. 同一目标 **每 3 天最多提醒一次**（可在 log 或 brief 里记 last_nudge 日期，避免刷屏）。

**Do not**: 与晨间简报同轮重复发送相同内容；若简报已含停滞警告，跳过单独提醒。

---

### 3. Inbox 积压提示（可选）

**When**: `inbox/` 中未处理 `- [ ]` 条目 **> 10 条**。

**Do**: 一条短消息：「inbox 有 N 条待归档，晚间 Dream 会整理；也可现在让我帮你归类。」

**Do not**: 每天最多 1 次。

<!--  completed tasks: delete from this file, do not leave checked items here -->
