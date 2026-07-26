# 个人办公/学习教练 — 产品说明

> Phase 9 选题：**楔子 A（晨间简报 + 晚间归档）+ 楔子 B（长期目标指导）**  
> 定位：个人办公/学习助手，不是泛聊机器人。

---

## 一句话

**白天随手丢碎片，夜间自动归档，早晨按你的长期目标推送今日学习/办公行动。**

---

## 解决什么问题

| 痛点 | 本产品怎么做 |
|------|--------------|
| 信息散在聊天、笔记、浏览器里 | **inbox/** 零摩擦捕获 + Dream 归档 |
| 学习计划写一次就忘 | **learning/{topic}/path.md** + **long_task** 跨天续上 |
| 不知道今天该干什么 | **晨间简报**（HEARTBEAT）固定 3 分钟结构 |
| 长期目标半途而废 | **goals/active.md** + 停滞提醒 |
| 和普通 ChatGPT 没区别 | **文件可见 + 主动推送 + 目标上限** |

---

## 目标用户

- 需要 **办公碎片整理** 的独立开发者、小团队负责人
- 需要 **学习路径 + 每日一步** 的自学者、备考者
- 已跑通 nanobot gateway，愿意用 WebUI / Telegram / CLI 之一作为日常入口

**不是目标用户**：需要企业多租户、复杂审批流、全自动 LMS 的场景。

---

## 核心约束（保持「教练感」）

1. **同时 active 的 long-goal ≤ 2**（建议：办公 1 + 学习 1）
2. **简报必须短**：读完 ≤ 3 分钟（Skill 强制结构）
3. **捕获零分类**：用户只丢内容，分类由 Dream / agent 事后做
4. **路径是真源**：学习进度以 `learning/*/path.md` 为准，不只靠聊天记忆

---

## 用户故事

### 故事 1 · 学习（备考 / 自学）

**小李** 备考软考，在 WebUI 说：「我想 3 个月过完网络章节，帮我建学习路径。」

- Agent 调用 `long_task`，创建 `learning/ruankao/path.md`
- 白天刷题随手发：「记一下：子网划分错题 3 道」
- 夜间 Dream 把要点写入 `learning/ruankao/log.md` 与 `memory/MEMORY.md`
- 早 7:30（cron 或 HEARTBEAT 窗口内）收到简报：
  - 今日：章节 3 习题 10 道
  - 进度：阶段 1 / 4，上次停在 2.3
  - 昨日碎片已归档 2 条

### 故事 2 · 办公（Side project / 独立开发）

**小王** 做 MVP，long-goal：「4 周内上线登录 + 列表页」。

- 开会碎片：「记一下：客户要加导出 CSV」
- Dream 归档需求到 MEMORY；inbox 清空或标记已处理
- 简报：今日完成登录 API；inbox 3 条已并入 MEMORY；距离里程碑还有 5 天

---

## 每日工作流

```
白天   → 丢碎片（capture）/ 汇报进度 / 问问题
夜间   → Dream 整合 → MEMORY / USER / learning log
早晨   → HEARTBEAT 或 cron → morning-brief → 推送/WebUI
随时   → long-goal 会话内持续推进
```

详见 [`workspace-layout.md`](./workspace-layout.md)。

---

## 与 nanobot 架构的映射

| 产品能力 | nanobot 机制 | 二次开发形态 |
|----------|--------------|--------------|
| 碎片捕获 | Skill + write_file | `skills/capture` |
| 学习路径 | long_task + workspace 文件 | `skills/learning-coach` |
| 长期目标 | long_task + goals/active.md | learning-coach + AGENTS 约定 |
| 晚间归档 | Dream | `prompts/dream.md` 可选微调 |
| 晨间简报 | HEARTBEAT + Skill | `skills/morning-brief` + HEARTBEAT.example.md |
| 定时推送 | gateway.heartbeat / cron | config + HEARTBEAT |

**原则**：优先 Skill + workspace 约定，不改 `loop.py` / `runner.py`。

---

## 验收指标（MVP）

| 指标 | 标准 |
|------|------|
| 捕获 | 用户说「记一下」→ 10 秒内 `inbox/` 有记录 |
| 路径 | 用户立项学习/办公目标 → 生成 `path.md` + `long_task` |
| 归档 | Dream 跑完后，inbox 要点出现在 MEMORY 或 learning/log |
| 简报 | 无用户主动提问的早晨，仍能生成 `briefs/YYYY-MM-DD-morning.md` |
| 目标 | 同时 active long-goal ≤ 2；停滞 3 天有提醒 |

---

## 对外话术（差异化）

> ChatGPT 是「你问它答」。  
> 这是「你丢碎片、它夜里整理、早上推今日三步」的 **个人办公/学习教练** —— 路径和进度在 workspace 里看得见，长期目标跨天续上。

---

## 相关文档

- [`workspace-layout.md`](./workspace-layout.md) — 目录与文件模板
- [`implementation-roadmap.md`](./implementation-roadmap.md) — 3 个 PR 里程碑
- [`skills/`](./skills/) — capture / learning-coach / morning-brief
- [`HEARTBEAT.example.md`](./HEARTBEAT.example.md) — 拷贝到 workspace
- [`prompts/dream-coach.example.md`](./prompts/dream-coach.example.md) — Dream 归档规则（可选）
