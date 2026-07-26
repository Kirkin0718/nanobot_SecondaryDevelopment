# Workspace 布局与文件模板

> 将下列目录与文件约定部署到 `~/.nanobot/workspace/`（或你 config 里的 `agents.defaults.workspace`）。

---

## 目录树

```
workspace/
├── AGENTS.md                 # 已有；追加教练工作流约定（见 templates/AGENTS.coach-snippet.md）
├── HEARTBEAT.md              # 从 HEARTBEAT.example.md 拷贝
├── inbox/                    # 未整理碎片（capture Skill 写入）
│   └── YYYY-MM-DD.md         # 按日聚合（推荐）
├── goals/
│   └── active.md             # 当前 1～2 个长期目标（人类可读）
├── learning/
│   └── {topic-slug}/         # 每个学习/专项主题一个目录
│       ├── path.md           # 路径 + 阶段 + 今日推荐（真源）
│       ├── syllabus.md       # 可选：资源链接、大纲
│       └── log.md            # 每日学习/进展记录
├── briefs/
│   └── YYYY-MM-DD-morning.md # 晨间简报输出
├── prompts/
│   └── dream.md              # 可选：/dream-prompt init 后定制 Dream 规则
├── memory/                   # 已有
├── sessions/                 # 已有
└── skills/                   # 安装本落地包的 Skill（见 README）
```

---

## 初始化步骤

1. 在 workspace 下创建空目录：`inbox goals learning briefs`
2. 拷贝 [`HEARTBEAT.example.md`](./HEARTBEAT.example.md) → `HEARTBEAT.md`
3. 拷贝 [`templates/goals-active.md`](./templates/goals-active.md) → `goals/active.md`
4. 将 [`skills/`](./skills/) 下三个 Skill 安装到 `workspace/skills/`（或合并进内置 skills 开发）
5. 在 `AGENTS.md` 末尾追加 [`templates/AGENTS.coach-snippet.md`](./templates/AGENTS.coach-snippet.md) 内容
6. （可选）`/dream-prompt init` 后参考 [`prompts/dream-coach.example.md`](./prompts/dream-coach.example.md) 编辑 `prompts/dream.md`

---

## 文件模板

### `inbox/YYYY-MM-DD.md`

```markdown
# Inbox 2026-07-23

> 未整理碎片。Capture Skill 只 append；Dream 或 agent 归档后可在条目前加 [x]。

- [ ] 14:32 子网划分错题：要分清主机位和网络位
- [ ] 16:05 客户希望导出 CSV（side project）
```

### `goals/active.md`

见 [`templates/goals-active.md`](./templates/goals-active.md)。

### `learning/{topic}/path.md`

见 [`templates/learning-path.md`](./templates/learning-path.md)。

### `learning/{topic}/log.md`

```markdown
# Log — {topic}

## 2026-07-23
- 完成 path 阶段 1 习题 5 道
- 错题：…
```

### `briefs/YYYY-MM-DD-morning.md`

见 [`templates/morning-brief-output.md`](./templates/morning-brief-output.md)。

---

## 命名约定

| 类型 | 规则 | 示例 |
|------|------|------|
| topic-slug | 小写、短横线、无空格 | `ruankao`, `python-da`, `mvp-login` |
| 日期文件 | ISO `YYYY-MM-DD` | `inbox/2026-07-23.md` |
| 简报 | `{date}-morning.md` | `briefs/2026-07-23-morning.md` |

---

## 与 long_task 的对齐

- 每个 **learning/** 或 **办公大目标** 应对应一条 active `long_task`
- `goals/active.md` 是给人看的摘要；**goal 字符串** 以 idempotent 方式写在 long_task 里（见 learning-coach Skill）
- 完成或更换目标：`complete_goal` → 更新 `goals/active.md` → 必要时新建 path.md

---

## Dream 归档预期

Dream 运行后（config 里 `dream.intervalH`，默认约 2 小时）：

| 来源 | 去向 |
|------|------|
| inbox 中工作/学习相关碎片 | `memory/MEMORY.md` 或 `learning/*/log.md` |
| 用户偏好、沟通风格 | `USER.md` |
| 已归档 inbox 条 | 条目前标记 `[x]` 或移到 log |

可选：用 `prompts/dream.md` 强化上述规则（见 dream-coach.example.md）。
