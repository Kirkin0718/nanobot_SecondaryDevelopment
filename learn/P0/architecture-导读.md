# architecture.md 导读（Phase 0 版）

> 对应官方文档：[`docs/architecture.md`](../../docs/architecture.md)  
> 前置阅读：[`concept.txt`](./concept.txt)（concepts 笔记）

`architecture.md` 不是「再讲一遍 concepts」，而是 **把运行时行为映射到具体源码文件**。  
第一次读觉得乱，通常是因为：**概念你懂了，但还不知道「出问题该打开哪个 .py 文件」**——这正是 architecture 要解决的。

---

## 读 architecture 的正确姿势

1. **不要一次读完 498 行**。Phase 0 只读下面「Phase 0 必读章节」。
2. **每看到一个组件，问两个问题**：
   - 它在数据流的哪一步出现？
   - 如果它坏了，用户会看到什么现象？
3. **把表格当「调试地图」**，不是当背诵题。

---

## 一张图串起全文

官方 Core Flow 图（简化中文）：

```
Channel（入口）
    ↓ InboundMessage
MessageBus（入队）
    ↓
AgentLoop（选 session、拼上下文、协调本轮）
    ↓
AgentRunner（调 LLM ↔ 执行 Tool 的循环）
    ↓                    ↑
Provider（模型 API）    Tools（文件/shell/web…）
    ↓
AgentLoop（写 session、发出回复）
    ↓ OutboundMessage
MessageBus（出队）
    ↓
Channel（把回复展示给你）
```

**AgentLoop 旁边还连着一块「状态」**（虚线）：Session、Memory、Skills、Templates——这些都从 **workspace** 读出来（见 [`workspace-导读.md`](./workspace-导读.md)）。

---

## Phase 0 必读章节 ↔ 你要记住什么

### 1. Core Flow + Main files 表格

| 官方 Area | 源码文件 | 一句话 |
|-----------|----------|--------|
| Message events and queue | `bus/events.py`, `bus/queue.py` | 消息的「信封格式」和「排队」 |
| Turn orchestration | `agent/loop.py` | 一轮对话的总导演 |
| Provider/tool loop | `agent/runner.py` | 和模型来回对话、跑 tool |
| Context construction | `agent/context.py` | 拼 system prompt（身份+记忆+skill） |
| Session storage | `session/manager.py` | 会话 jsonl 读写、压缩 |
| Memory / Dream | `agent/memory.py` | 长期记忆整合 |

**Phase 0 不用打开这些文件细读**，知道文件名即可。

### 2. Agent Loop vs Agent Runner（最重要）

这是 architecture 里 Phase 0 **必须吃透** 的一段。

| | AgentLoop | AgentRunner |
|---|-----------|-------------|
| **面向谁** | Channel / 用户 / 会话 | LLM Provider / Tools |
| **典型工作** | 收消息、定 session、选 workspace、拼上下文、发 outbound | 发 API 请求、收 streaming、执行 tool call、迭代直到出答案 |
| **出问题先看** | 消息没进会话、回复没回到 WebUI、workspace 选错 | 模型 429/500、tool 没执行、迭代次数用尽 |

**记忆口诀**：Loop 管「这一轮对话怎么组织」，Runner 管「模型和工具怎么来回跑」。

你在 `concept.txt` 里画的 turn 流程基本正确；补一点：**「调用 LLM、执行 Tool」主要在 Runner 里**，Loop 负责把上下文交给 Runner，再把结果写回 session 和 Channel。

### 3. WebUI and Gateway（两个端口别混）

| 表面 | 默认地址 | 干什么 |
|------|----------|--------|
| Health endpoint | `http://127.0.0.1:18790/health` | 进程是否活着 |
| WebUI / WebSocket | `http://127.0.0.1:8765` | 浏览器聊天界面 |

你平时在浏览器里聊天，走的是 **8765（WebSocket channel）**，不是 18790。

`nanobot gateway` 一次启动会带上：已启用的 channels、Dream、heartbeat、cron 等（详见 workspace 导读）。

### 4. Tools 表格（知道去哪找就行）

Tools 在 `nanobot/agent/tools/` 自动发现。常见：

| 能力 | 文件 |
|------|------|
| 读写信件夹 | `filesystem.py`（含 `list_dir`） |
| Shell | `shell.py` |
| 网页搜索/抓取 | `web.py` |
| MCP | `mcp.py` |
| 自检 runtime | `self.py`（即 `my` tool） |

config 里 `tools.*` 决定**启用哪些**；源码目录决定**有哪些实现**。

### 5. Config and Paths + Memory and Sessions

这两节和 workspace 强相关，**详细解释见 [`workspace-导读.md`](./workspace-导读.md)**。

architecture 在这里的核心信息：

| 存什么 | 路径 |
|--------|------|
| 配置 | `~/.nanobot/config.json` |
| 工作区根 | `~/.nanobot/workspace/` |
| 会话 | `<workspace>/sessions/*.jsonl` |
| 长期记忆 | `<workspace>/memory/MEMORY.md` |
| Dream 源历史 | `<workspace>/memory/history.jsonl` |
| 定时任务 | `<workspace>/cron/jobs.json` |

### 6. Extension Points（Phase 0 扫一眼）

| 想加什么 | 加在哪 |
|----------|--------|
| 新模型后端 | `providers/` |
| 新聊天平台 | `channels/` |
| 新能力（查天气） | `agent/tools/` |
| 使用说明/知识 | `<workspace>/skills/` 或 `nanobot/skills/` |
| 外部工具服务 | config 里 `tools.mcpServers` |

**不要**把新功能直接塞进 `loop.py` / `runner.py`（见 design.md）。

---

## architecture 里 Phase 0 可以跳过的部分

- Provider 各厂商实现细节 → **Phase 3**
- Channel 插件开发 → **Phase 6**
- Security 边界细节 → **Phase 8**
- Testing 命令 → 用到再查

---

## 自测：读完导读后你应该能答

1. WebUI 聊天走哪个端口？health check 又是哪个？
2. 模型一直 429，你先打开 `loop.py` 还是 `runner.py`？
3. `list_dir` 大概在哪个目录的哪个文件里？
4. 会话历史存在 workspace 的哪个子目录？

---

## 和 concept.txt 的对应关系

你在 concept 笔记里写的 turn 流程与 architecture **一致**。需要修正/强化的只有一点：

- Context Builder 在源码里是 `agent/context.py`，属于 AgentLoop 准备上下文的一部分
- 「LLM Provider」在 Runner 里被调用；Provider 实现类在 `providers/` 目录

建议：对照 [`concept.txt`](./concept.txt) 第六节「Provider 和模型选择」，你的 config 里实际是 **modelPreset → deepseek**（见 [`config.md`](./config.md)），这比文档里的 `auto` 例子更具体，值得在笔记里写一句「我的实例实际走 deepseek-chat」。
