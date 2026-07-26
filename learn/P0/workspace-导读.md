# workspace 导读（Phase 0 版）

> 对应官方：`[docs/concepts.md#config-vs-workspace](../../docs/concepts.md)`  
> architecture 中的 Paths / Memory and Sessions 章节

---

## 一句话区分 config 与 workspace


|               | config.json            | workspace/         |
| ------------- | ---------------------- | ------------------ |
| **比喻**        | 游戏规则、装备栏               | 游戏存档、日记本           |
| **谁写**        | mostly 你（+ onboard 生成） | mostly agent 运行时写入 |
| **删了会怎样**     | 要重新配置 provider、渠道      | 会话历史、记忆没了（可重建）     |
| **Git 要不要提交** | 通常不提交（含 API Key）       | 看场景；记忆文件有时值得版本管理   |


你在 `concept.txt` 里写的：

> config 是能力，workspace 是状态

**完全正确。** 下面把它具体化。

---

## workspace 是什么

路径默认：`~/.nanobot/workspace/`（可在 config 的 `agents.defaults.workspace` 修改）

它是 **这一个 nanobot 实例的「家」**：

1. Agent **读写文件 tool** 默认在这里活动（你还开了 `restrictToWorkspace: false`，所以理论上能访问外面——见 `[config.md](./config.md)`）
2. **对话历史** 落盘在 `sessions/`
3. **长期记忆** 在 `memory/`
4. **人设与用户说明** 在根目录若干 `.md`
5. **定时/心跳任务** 读 `HEARTBEAT.md`、`cron/jobs.json`
6. **自定义 skill** 可放 `skills/`

Gateway 启动后，Dream、heartbeat 等后台任务也**读 workspace 里的文件**来决定干什么。

---



## 目录结构（默认 onboard 后）

```
workspace/
├── AGENTS.md          # 给 agent 的工作区说明（bootstrap，会进 system prompt）
├── SOUL.md            # 「灵魂/人设」（bootstrap）
├── USER.md            # 用户是谁、偏好（bootstrap）
├── HEARTBEAT.md       # 心跳要主动执行的任务列表
├── AWARENESS.md       # 可选，环境感知类说明
├── sessions/          # 各会话的对话 jsonl
│   └── <session-key>.jsonl
├── memory/
│   ├── MEMORY.md      # 长期记忆（Dream 整合后的精华）
│   └── history.jsonl  # Dream 读的原始历史流
├── skills/            # 用户安装的 skill（可空）
├── prompts/           # 如 Dream 的自定义 prompt
│   └── README.md
└── cron/
    └── jobs.json      # 用户/系统定时任务
```

**不一定每个文件一开始都存在**——首次用到时会从 `nanobot/templates/` 复制模板（见 `utils/helpers.py` 的 workspace 初始化逻辑）。

此外 agent 运行中还可能产生：

- `tool-results/` — 大 tool 输出落盘
- 你让 agent 创建的项目文件

---



## 各模块「干什么、何时被读/写」



### `sessions/*.jsonl` — 短期对话回放

- **是什么**：一行一条 JSON 的消息记录（user / assistant / tool）
- **何时写**：每轮对话结束后 AgentLoop/SessionManager 追加
- **何时读**：下一轮拼上下文时，取最近 N 条 replay 进 LLM
- **和 WebUI 关系**：你在界面看到的聊天记录，源头就是这些文件（加 WebUI 自己的展示层）

**Phase 0 动手**：发一条 WebUI 消息后，去 `sessions/` 找最新修改的 jsonl，打开看结构。

### `memory/MEMORY.md` — 长期记忆（精华）

- **是什么**：Markdown，人类也可编辑
- **何时写**：Dream 任务跑完后更新（你 config 里 `dream.intervalH: 2`）
- **何时读**：每次 `ContextBuilder.build_system_prompt()` 会把记忆段拼进 system prompt

**和 sessions 区别**：


| sessions  | memory         |
| --------- | -------------- |
| 完整对话流水    | 提炼后「值得长期记住的事实」 |
| 短期 replay | 跨很多轮仍保留        |
| 文件大、条数多   | 相对精炼           |




### `memory/history.jsonl` — Dream 的输入流

- Dream 读这里「自上次 cursor 之后的新条目」，整合进 `MEMORY.md`
- Phase 0 知道存在即可；Phase 5 再深入



### `SOUL.md` / `USER.md` / `AGENTS.md` — Bootstrap 文件

源码 `agent/context.py` 里：

```python
BOOTSTRAP_FILES = ["AGENTS.md", "SOUL.md", "USER.md"]
```

启动一轮对话拼 prompt 时会读这三个文件（若存在且非空模板）。  
**改 SOUL.md = 改 agent 性格**，和改 `templates/identity.md` 类似但作用层级不同（workspace 级 vs 包内模板）。

### `HEARTBEAT.md` — 主动任务

- Gateway 心跳（你 config：`gateway.heartbeat.intervalS: 1800`，即 30 分钟）会读这个文件
- 只有 `## Active Tasks` 下的任务会被执行
- 结果发到「最近活跃的聊天」， mundane 的「无变化」会被抑制

你在 concept 笔记里说「这块复杂」——Phase 0 只需知道：**它是 agent 的「待办 cron 清单」**，不是普通对话。

### `cron/jobs.json` — 定时任务存储

- 用户通过 tool / WebUI 创建的提醒、周期任务
- 与 HEARTBEAT 用的同一套 cron 服务，但**用户任务**和**系统 heartbeat** 路径不同



### `skills/` — 工作区 skill

- 内置 skill 在代码包 `nanobot/skills/`
- 你可在 workspace 下再加 skill；对话里 `/skill` 能看到启用的列表

---



## workspace 在一次对话里怎么被用到

```
用户发消息
  → AgentLoop 确定 session_key
  → ContextBuilder 从 workspace 读取：
        SOUL.md / USER.md / AGENTS.md
        memory/MEMORY.md
        skills/
        sessions/<key>.jsonl 里最近历史
  → Runner 执行 tool 时可能读写 workspace 内文件
  → 回合结束 → 追加 sessions/<key>.jsonl
  → （定时）Dream 读 memory/history.jsonl → 更新 MEMORY.md
```

---



## config 里和 workspace 相关的项（对照你的 config）


| 配置项                             | 你的值                    | 含义                                |
| ------------------------------- | ---------------------- | --------------------------------- |
| `agents.defaults.workspace`     | `~/.nanobot/workspace` | 工作区根路径                            |
| `agents.defaults.dream.enabled` | `true`                 | 会定期写 memory                       |
| `gateway.heartbeat.enabled`     | `true`                 | 会读 HEARTBEAT.md                   |
| `tools.file`                    | 启用                     | 可读写 workspace 文件                  |
| `tools.restrictToWorkspace`     | `false`                | **文件 tool 可访问工作区外**（学习期 OK，生产要收紧） |


---



## 和 `~/.nanobot/` 下其他目录的区别

config.json 在 `~/.nanobot/`，但还有一些**不在 workspace 里**的运行时数据（architecture 提到）：


| 路径                  | 内容                  |
| ------------------- | ------------------- |
| `~/.nanobot/webui/` | WebUI 侧状态、sidebar 等 |
| `~/.nanobot/media/` | 媒体缓存                |
| `~/.nanobot/logs/`  | 日志                  |


**Phase 0 规则**：会话/记忆/人设 → workspace；全局 UI 状态 → config 目录其他子文件夹。

---



## 自测清单

- [x] 能说出 sessions 和 memory 的区别
- [x] 知道改 SOUL.md 会影响 agent 行为
- [x] 知道 HEARTBEAT.md 谁在读、多久读一次（看你的 gateway 配置）
- [x] 能在磁盘上找到你刚才 WebUI 对话对应的 session 文件

---



## 建议笔记练习

在 `learn/P0/` 新建 `workspace-观察.md`，填写：

1. 你的 workspace 绝对路径
2. `sessions/` 下有几个 jsonl，最新一个的文件名
3. `memory/MEMORY.md` 前 5 行（若为空就写「空」）
4. `HEARTBEAT.md` 里有没有 Active Tasks

做完这份观察，workspace 就从「知道有哪些模块」变成「看过真实文件长什么样」了。