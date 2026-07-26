# Phase 0：环境与全景

**目标**：知道 nanobot 是什么、怎么跑、config 与 workspace 各管什么、核心数据流长什么样。

**预估**：2–3 天

---

## 你的当前进度（2026-07-14）

| 任务 | 状态 | 备注 |
|------|------|------|
| 跑通 gateway + WebUI | ✅ | |
| 阅读 [`docs/concepts.md`](../../docs/concepts.md) | ✅ | 笔记见 [`concept.txt`](./concept.txt) |
| architecture 导读 + 自测 | ✅ | [`architecture-导读.md`](./architecture-导读.md) |
| 查看 config.json | ✅ | 笔记见 [`config.md`](./config.md) |
| 理解 workspace | ✅ | [`workspace-导读.md`](./workspace-导读.md)；sessions vs memory 已澄清 |
| 尝试斜杠指令 | ✅ | |
| 消息流程图 | ✅ | 已补 AgentRunner；待写正式检验题 |
| Phase 0 正式检验 | ⏳ 进行中 | 见 [`检验题.md`](./检验题.md) |
| 阅读 [`AGENTS.md`](../../AGENTS.md) / design / gotchas | 可选 | 答完检验可边学边补 |

---

## 必读顺序

1. [`concept.txt`](./concept.txt) — 你已读完，可对照官方 [`concepts.md`](../../docs/concepts.md) 查漏
2. [`architecture-导读.md`](./architecture-导读.md) — **architecture 的中文拆解**（比直接读英文 doc 更容易）
3. [`workspace-导读.md`](./workspace-导读.md) — **workspace 专题**
4. [`config.md`](./config.md) — 你的 config 解读
5. [`AGENTS.md`](../../AGENTS.md) — 子系统地图
6. [`.agent/design.md`](../../.agent/design.md) — 改代码前必须知道的边界

---

## 动手任务

### 任务 A：观察一条消息的日志

1. 终端 A 运行 `nanobot gateway`（保持前台，看日志）
2. 浏览器 WebUI 发一句：「列出当前目录有哪些文件」
3. 在 gateway 日志里找这些关键词（不一定按顺序）：
   - inbound / outbound
   - session
   - provider / deepseek
   - `[tool]` 或 `list_dir`

**写下你看到的顺序**（哪怕不完整），放进本目录的笔记即可。

### 任务 B：斜杠指令再试 3 个

在 WebUI 对话里输入：

| 指令 | 你要观察什么 |
|------|-------------|
| `/model` | 当前用的 preset 和 model |
| `/status` | gateway / 渠道状态 |
| `/skill` | agent 加载了哪些 skill |

对比 [`docs/chat-commands.md`](../../docs/chat-commands.md) 里的说明。

### 任务 C：画流程图

用纸笔或任意工具，画：

```
用户 → ? → ? → AgentLoop → AgentRunner → ? → 用户
```

至少标出 **Channel、MessageBus、AgentLoop、AgentRunner、Provider、Tools** 六个名字。

### 任务 D：打开 workspace 里一个 session 文件

路径：`<workspace>/sessions/*.jsonl`（见 [`workspace-导读.md`](./workspace-导读.md)）

打开你刚才对话对应的 jsonl，找一条 `"role": "assistant"` 和一条 tool 相关记录，不用全懂，先建立「对话会被写进文件」的直觉。

---

## 验收标准

- [x] 能口述核心数据流（流程图已提交并校正）
- [x] 能区分 config 与 workspace
- [x] 能区分 sessions 与 memory
- [x] 理解 Loop vs Runner（导读自测通过）
- [ ] **正式检验题通过**（见 [`检验题.md`](./检验题.md)）

---

## 本 Phase 配套笔记

| 文件 | 内容 |
|------|------|
| [`concept.txt`](./concept.txt) | concepts 学习笔记 |
| [`config.md`](./config.md) | config.json 结构解读 |
| [`architecture-导读.md`](./architecture-导读.md) | architecture 白话版 |
| [`workspace-导读.md`](./workspace-导读.md) | workspace 专题 |
| [`检验题.md`](./检验题.md) | 正式检验题 |
| [`检验题-答案.md`](./检验题-答案.md) | 作答模板 |

---

## 下一步

1. 作答 [`检验题.md`](./检验题.md)（写入 [`检验题-答案.md`](./检验题-答案.md) 或直接发对话）
2. 导师点评通过后 → 进入 Phase 1（[`../P1/README.md`](../P1/README.md)）
