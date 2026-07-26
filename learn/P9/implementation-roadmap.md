# 实施路线图（3 个 PR）

> 选题：个人办公/学习教练（A+B）  
> 原则：Skill + workspace 约定优先；每个 PR 可独立演示。

---

## 总览

| PR | 主题 | 难度 | 预计 | 验收 |
|----|------|------|------|------|
| PR-1 | 捕获 + 目录约定 | ⭐ | 1 周 | 记一条 + 建一条路径 |
| PR-2 | 长期目标 + 路径联动 | ⭐⭐ | 1～2 周 | 3 天进度一致 + 停滞提醒 |
| PR-3 | 晨间简报闭环 | ⭐⭐ | 1～2 周 | 无人提问的早晨有简报 |

---

## PR-1：捕获 + 目录约定

### 目标

用户 10 分钟内完成：**丢一条碎片** + **建一个学习/办公路径**。

### 任务清单

- [ ] workspace 创建 `inbox/`、`goals/`、`learning/`、`briefs/`
- [ ] 安装 Skill：`capture`、`learning-coach`（初版）
- [ ] 提供模板：`goals/active.md`、`learning/path.md`
- [ ] `AGENTS.md` 追加 coach 工作流片段
- [ ] 文档：[`workspace-layout.md`](./workspace-layout.md)

### 自测

```text
1. 「记一下：明天交周报」→ inbox/今日.md 有条目
2. 「我想 8 周学完 Python 数据分析，建路径」→ learning/python-da/path.md + long_task
3. goals/active.md 有一条摘要
```

### 涉及路径

- `learn/P9/skills/*` → 复制到 `workspace/skills/`
- `learn/P9/templates/*` → 复制到 workspace
- 不改 Python core

---

## PR-2：长期目标 + 路径联动

### 目标

long-goal、path.md、goals/active.md 三者一致；停滞有提醒。

### 任务清单

- [ ] 扩展 `learning-coach`：更新 path 时同步 goals/active.md
- [ ] 进度汇报话术：用户说「今天学了…」→ append log.md + 更新 path 当前阶段
- [ ] HEARTBEAT 增加 **停滞检测** 任务（见 HEARTBEAT.example.md 任务 2）
- [ ] 限制：新 long_task 前检查 active 数量 ≤ 2

### 自测

```text
1. 模拟 3 次进度汇报 → path.md 的「当前进度」与 log 一致
2. 3 天不改 path/log → HEARTBEAT 触发停滞提醒（或简报中带一句）
3. 第三个 long_task 请求 → agent 提示先 complete 一个
```

### 可选 Tool（PR-2 后期）

- `update_goal_summary`：读 long-goal metadata，重写 goals/active.md（减少 Skill 幻觉）

---

## PR-3：晨间简报闭环

### 目标

早晨自动生成简报；Dream 夜间归档 inbox。

### 任务清单

- [x] 安装 Skill：`morning-brief`（`install.ps1`）
- [x] 部署 `HEARTBEAT.example.md` → workspace `HEARTBEAT.md`
- [x] 幂等与通知契约文档：[`brief-ops.md`](./brief-ops.md)
- [x] Eval：`brief-*`（四段结构 / 覆盖幂等 / 空场景安静 / 禁安装）
- [ ] （可选）cron 固定 7:30 推送
- [ ] （可选）`prompts/dream.md` 从 dream-coach.example.md 定制
- [ ] 确认本机 config：`gateway.heartbeat.enabled=true`，`agents.defaults.dream.enabled=true`

### 自测

```text
1. inbox 有未归档条目 + path 有进度 → 生成 briefs/YYYY-MM-DD-morning.md
2. 简报含四段：今日重点 / 长期目标 / 昨日归档摘要 / 今日动作
3. python learn/P9/eval/run_eval.py → brief-* PASS
4. （可选）Dream 跑后 inbox 条目被标记或写入 MEMORY/log
```

### config 参考

```json
{
  "agents": {
    "defaults": {
      "dream": { "enabled": true, "intervalH": 2 }
    }
  },
  "gateway": {
    "heartbeat": { "enabled": true, "interval_s": 1800 }
  }
}
```

> **说明**：内置 heartbeat 默认每 30 分钟读 HEARTBEAT.md；简报任务应 **幂等**（同日已生成则跳过或覆盖）。若需精确 7:30，用 cron 触发一条「生成简报」任务更可靠。

---

## 进度记录

| 日期 | PR | 分支 | 状态 | 备注 |
|------|-----|------|------|------|
| 2026-07-23 | — | — | 落地包已写 | 待开始 PR-1 |
| 2026-07-26 | PR-3 | main | 契约+mock eval | [`brief-ops.md`](./brief-ops.md)；17/17 |
| | PR-1 | | 已演示 | |
| | PR-2 | | 进行中 | Skill 已强化 |

---

## 风险与规避

| 风险 | 规避 |
|------|------|
| HEARTBEAT 太频繁打扰 | 简报任务检查「今日 brief 是否已存在」 |
| Dream 乱改 MEMORY | 用 prompts/dream.md 限定 inbox→log 规则 |
| 目标过多变泛助手 | Skill 硬限制 active long-goal ≤ 2 |
| 路径与聊天脱节 | path.md 为真源；每次汇报必须改文件 |
| 阶段说明让人云里雾里 | learning-coach **人话阶段模板**；聊天只讲今天 |
| 擅自 winget/装 JDK | Skill + AGENTS：**无明确同意不得安装** |
| sustained-goal 空转误关 | **禁止**因「用户未开始」而 `complete_goal` |

---

## 完成后

- 更新 [`README.md`](./README.md) 记录表
- 在对话回复 **「Phase 9 PR-N 完成」** 做结对 review
- 可选：贡献内置 skill 到 `nanobot/skills/`（需符合上游规范）
