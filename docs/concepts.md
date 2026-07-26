# Concepts

Use this page when you want to understand nanobot before changing advanced settings. It explains the moving parts without requiring you to read the source first.

If you want source-file ownership and extension points, read `[architecture.md](./architecture.md)` after this page.

## Runtime Shape

nanobot has one small core loop and several ways to enter it:


| Part       | What it does                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Agent loop | Builds context, selects the session, calls the provider, runs tools, and publishes replies                                   |
| Providers  | LLM backends such as OpenRouter, Anthropic, OpenAI, Bedrock, Ollama, vLLM, and other OpenAI-compatible APIs                  |
| Channels   | User-facing transports such as CLI, WebUI/WebSocket, Telegram, Discord, Slack, Feishu, WeChat, Email, Mattermost, and others |
| Tools      | Capabilities the model may call, including files, shell, web search/fetch, MCP, cron, image generation, and subagents        |
| Memory     | Workspace files and session history that keep useful context across turns                                                    |
| Gateway    | Long-running process that connects enabled channels and serves the health endpoint                                           |


The simplest path is `nanobot agent -m "Hello!"`: one inbound message goes through the agent loop and prints the reply in your terminal. The long-running path is `nanobot gateway`: channels receive messages from chat apps or the WebUI, publish them to the same agent loop, and send replies back to the originating channel.

## Config vs Workspace

The default instance lives under `~/.nanobot/`:


| Path                     | Meaning                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `~/.nanobot/config.json` | Instance configuration: providers, model defaults, channels, tools, gateway, API, and runtime options |
| `~/.nanobot/workspace/`  | Agent workspace: memory, sessions, heartbeat tasks, cron jobs, skills, and generated artifacts        |


You can override both with command flags:

```bash
nanobot onboard --config ./bot-a/config.json --workspace ./bot-a/workspace
nanobot agent --config ./bot-a/config.json --workspace ./bot-a/workspace -m "Hello"
nanobot gateway --config ./bot-a/config.json --workspace ./bot-a/workspace
```

The config file controls what nanobot may use. The workspace is where nanobot keeps state for that instance.

## Config Format

`config.json` accepts both camelCase and snake_case keys. The docs use camelCase because nanobot writes config back to disk with camelCase aliases, for example `apiKey`, `modelPresets`, `intervalS`, and `maxToolResultChars`.

Most examples are partial snippets. Merge them into the existing file created by `nanobot onboard`; do not replace the whole file unless you want to reset the instance.

## One Agent Turn

A normal turn follows this flow:

1. A channel receives a user message and publishes it to the message bus.
2. The agent loop chooses a session key and builds context from the workspace, skills, memory, recent messages, channel metadata, and runtime settings.
3. The provider receives the model request.
4. If the model asks for tools, the runner executes them and feeds results back to the model.
5. The final reply is saved to the session and sent back through the channel.

That flow is the same whether the message starts in the CLI, WebUI, Telegram, Discord, or another channel.

## CLI, Gateway, API, and WebUI


| Entry point           | Command                                  | Use it for                                                        |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| CLI one-shot          | `nanobot agent -m "..."`                 | First-run checks, scripts, and quick local questions              |
| CLI interactive       | `nanobot agent`                          | Terminal chat with persistent session history                     |
| Gateway               | `nanobot gateway`                        | Chat apps, WebUI, heartbeat, Dream, and long-running service mode |
| OpenAI-compatible API | `nanobot serve`                          | Programmatic access through `/v1/chat/completions`                |
| WebUI                 | `nanobot gateway` plus WebSocket channel | Browser workbench served by the WebSocket channel on port `8765`  |


The gateway health endpoint is on `gateway.port` (`18790` by default). The browser WebUI is served by the WebSocket channel (`8765` by default), not by the health endpoint.

## Provider and Model Selection

The active model should normally come from a named `modelPresets` entry selected by `agents.defaults.modelPreset`. Direct `agents.defaults.provider` and `agents.defaults.model` still form the implicit `default` preset for older or minimal configs. The active provider is resolved in this order:

1. If the active preset provider or implicit default provider is not `"auto"`, nanobot uses that provider.
2. If provider is `"auto"`, nanobot tries to infer the provider from the model name, configured API keys, local provider base URLs, or gateway providers.
3. OAuth providers such as OpenAI Codex and GitHub Copilot require explicit login and explicit provider/model selection inside the active preset.

Pin the provider inside the preset when setting up for the first time. It is easier to debug:

```json
{
  "modelPresets": {
    "primary": {
      "provider": "openrouter",
      "model": "anthropic/claude-opus-4.5"
    }
  },
  "agents": {
    "defaults": {
      "modelPreset": "primary"
    }
  }
}
```

See `[providers.md](./providers.md)` for practical examples and `[configuration.md#providers](./configuration.md#providers)` for the full provider reference.

## Channels and Sessions

Each channel maps inbound messages to a session key. That lets independent conversations keep separate history. The WebUI also supports multiple chats and workspace-scoped metadata for project workspaces.

`agents.defaults.unifiedSession` can intentionally share one session across channels for a single-user multi-device setup. Leave it off if you expect separate people, groups, channels, or projects to keep separate context.

## Memory, Sessions, and Dream

nanobot uses two related stores:


| Store    | Location                                                              | Purpose                                         |
| -------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| Sessions | `<workspace>/sessions/*.jsonl`                                        | Recent conversation turns replayed into context |
| Memory   | `<workspace>/memory/MEMORY.md` and `<workspace>/memory/history.jsonl` | Long-term facts and consolidated history        |


Dream is a periodic consolidation job. It reads accumulated history and updates workspace memory so useful context can survive beyond short session replay.

See `[memory.md](./memory.md)` for the detailed design.

## Tools and Safety

Tools are discovered automatically from built-in modules and plugin entry points. Common tool groups include:

- file read/write/edit and patching;
- shell execution with configurable sandboxing;
- web search and web fetch with SSRF checks;
- MCP servers;
- cron reminders, local triggers, and heartbeat tasks;
- image generation;
- subagents and runtime self-inspection.

Security-sensitive controls live in `[configuration.md#security](./configuration.md#security)`. For production or shared chat apps, also configure channel access controls such as `allowFrom`, pairing, or WebSocket tokens.

## Background Jobs

When `nanobot gateway` starts, it runs workspace-scoped automations and
registers system jobs:

- `dream`, when `agents.defaults.dream.enabled` is true;
- `heartbeat`, when `gateway.heartbeat.enabled` is true.

Heartbeat reads `<workspace>/HEARTBEAT.md`. If the file has tasks under `## Active Tasks`, nanobot executes them and sends only useful/actionable results to the most recently active chat target. Routine "nothing changed" results are suppressed.

User-created reminders use the same cron service but are not the same as the
protected heartbeat system job. They run as scheduled turns in their origin
chat/session and normally deliver the result back to that channel.

Local triggers are also session-bound, but they do not have their own
schedule. Create one from the target chat with `/trigger <name>`, then call
`nanobot trigger <id> "<message>"` when a local script or external service wants
nanobot to respond in that session. Webhook servers, third-party auth, and
event-to-message formatting stay outside nanobot. Trigger deliveries are stored
in the workspace until the linked agent turn finishes successfully. If the
target session is busy, the trigger waits until that session is idle instead of
being injected into the active turn. The message is recorded as an automation
turn in that session. Delivery is at-least-once, so external systems should
tolerate repeated trigger messages; a delivery that reaches the agent but fails
is marked failed rather than retried forever.

## Where to Go Next


| Need                      | Read                                         |
| ------------------------- | -------------------------------------------- |
| First working install     | `[quick-start.md](./quick-start.md)`         |
| Provider/model setup      | `[providers.md](./providers.md)`             |
| Chat app setup            | `[chat-apps.md](./chat-apps.md)`             |
| Complete config reference | `[configuration.md](./configuration.md)`     |
| Runtime debugging         | `[troubleshooting.md](./troubleshooting.md)` |




# 概念

当你想在更改高级设置之前理解 nanobot 时，请使用此页面。它解释了各个组成部分，无需你先阅读源代码。

如果你想要源码文件的所有权和扩展点，请在阅读此页面之后阅读 `[architecture.md](./architecture.md)`。

## 运行时形态

nanobot 有一个小的核心循环和几种进入它的方式：


| 部分       | 功能                                                                            |
| -------- | ----------------------------------------------------------------------------- |
| Agent 循环 | 构建上下文、选择会话、调用提供商、运行工具并发布回复                                                    |
| 提供商      | LLM 后端，如 OpenRouter、Anthropic、OpenAI、Bedrock、Ollama、vLLM 及其他兼容 OpenAI API 的服务 |
| 渠道       | 面向用户的传输方式，如 CLI、WebUI/WebSocket、Telegram、Discord、Slack、飞书、微信、邮件、Mattermost 等  |
| 工具       | 模型可能调用的能力，包括文件、shell、网页搜索/抓取、MCP、定时任务、图像生成和子 Agent                            |
| 记忆       | 工作区文件和会话历史，用于在轮次之间保留有用上下文                                                     |
| 网关       | 长期运行的进程，连接已启用的渠道并提供健康检查端点                                                     |


最简单的路径是 `nanobot agent -m "Hello!"`：一条入站消息经过 Agent 循环，并在终端中打印回复。长期运行的路径是 `nanobot gateway`：渠道从聊天应用或 WebUI 接收消息，将其发布到同一个 Agent 循环，并将回复发送回原始渠道。

## 配置与工作区

默认实例位于 `~/.nanobot/` 下：


| 路径                       | 含义                                 |
| ------------------------ | ---------------------------------- |
| `~/.nanobot/config.json` | 实例配置：提供商、模型默认值、渠道、工具、网关、API 和运行时选项 |
| `~/.nanobot/workspace/`  | Agent 工作区：记忆、会话、心跳任务、定时任务、技能和生成的文件 |


你可以使用命令行标志覆盖这两者：

```bash
nanobot onboard --config ./bot-a/config.json --workspace ./bot-a/workspace
nanobot agent --config ./bot-a/config.json --workspace ./bot-a/workspace -m "Hello"
nanobot gateway --config ./bot-a/config.json --workspace ./bot-a/workspace
```

配置文件控制 nanobot 可以使用哪些内容。工作区是 nanobot 为该实例保存状态的地方。

## 配置格式

`config.json` 接受驼峰命名法和蛇形命名法的键。文档使用驼峰命名法，因为 nanobot 会使用驼峰命名法的别名将配置写回磁盘，例如 `apiKey`、`modelPresets`、`intervalS` 和 `maxToolResultChars`。

大多数示例是部分片段。请将它们合并到由 `nanobot onboard` 创建的现有文件中；除非你想重置实例，否则不要替换整个文件。

## 一次 Agent 交互轮次

一次正常的交互轮次遵循以下流程：

1. 渠道接收用户消息并将其发布到消息总线。
2. Agent 循环选择会话键，并从工作区、技能、记忆、最近消息、渠道元数据和运行时设置中构建上下文。
3. 提供商接收模型请求。
4. 如果模型请求调用工具，运行器执行这些工具并将结果反馈给模型。
5. 最终回复被保存到会话中，并通过渠道发送回去。

无论消息是从 CLI、WebUI、Telegram、Discord 还是其他渠道开始的，该流程都是相同的。

## CLI、网关、API 和 WebUI


| 入口点             | 命令                                | 用途                                 |
| --------------- | --------------------------------- | ---------------------------------- |
| CLI 单次          | `nanobot agent -m "..."`          | 首次运行检查、脚本和快速本地提问                   |
| CLI 交互式         | `nanobot agent`                   | 终端聊天，支持持久会话历史                      |
| 网关              | `nanobot gateway`                 | 聊天应用、WebUI、心跳、Dream 和长期运行的服务模式     |
| 兼容 OpenAI 的 API | `nanobot serve`                   | 通过 `/v1/chat/completions` 进行程序化访问  |
| WebUI           | `nanobot gateway` 加上 WebSocket 渠道 | 由 WebSocket 渠道在端口 `8765` 提供的浏览器工作台 |


网关健康检查端点在 `gateway.port`（默认为 `18790`）。浏览器 WebUI 由 WebSocket 渠道（默认为 `8765`）提供，而不是由健康检查端点提供。

## 提供商和模型选择

活动模型通常应来自 `modelPresets` 中的命名条目，由 `agents.defaults.modelPreset` 选择。直接的 `agents.defaults.provider` 和 `agents.defaults.model` 仍然为较旧或最小配置形成隐式的 `default` 预设。活动提供商按以下顺序解析：

1. 如果活动预设的提供商或隐式默认提供商不是 `"auto"`，nanobot 使用该提供商。
2. 如果提供商是 `"auto"`，nanobot 尝试从模型名称、已配置的 API 密钥、本地提供商基础 URL 或网关提供商推断提供商。
3. OAuth 提供商（如 OpenAI Codex 和 GitHub Copilot）需要显式登录以及在活动预设内显式选择提供商和模型。

首次设置时，请在预设内固定提供商。这样更容易调试：

```json
{
  "modelPresets": {
    "primary": {
      "provider": "openrouter",
      "model": "anthropic/claude-opus-4.5"
    }
  },
  "agents": {
    "defaults": {
      "modelPreset": "primary"
    }
  }
}
```

请参阅 `[providers.md](./providers.md)` 获取实际示例，参阅 `[configuration.md#providers](./configuration.md#providers)` 获取完整的提供商参考。

## 渠道和会话

每个渠道将入站消息映射到一个会话键。这样可以让独立的对话保持各自独立的历史记录。WebUI 还支持多个聊天和工作区范围的项目工作区元数据。

`agents.defaults.unifiedSession` 可以有意地在多个渠道之间共享一个会话，适用于单用户多设备的场景。如果你期望不同的人、群组、渠道或项目保持独立的上下文，请保持关闭。

## 记忆、会话和 Dream

nanobot 使用两个相关的存储：


| 存储  | 位置                                                                  | 用途               |
| --- | ------------------------------------------------------------------- | ---------------- |
| 会话  | `<workspace>/sessions/*.jsonl`                                      | 最近的对话轮次，会重放到上下文中 |
| 记忆  | `<workspace>/memory/MEMORY.md` 和 `<workspace>/memory/history.jsonl` | 长期事实和整合后的历史记录    |


Dream 是一个定期的整合任务。它读取累积的历史记录并更新工作区记忆，使有用的上下文能够超越短暂的会话重放而保留下来。

请参阅 `[memory.md](./memory.md)` 了解详细设计。

## 工具与安全

工具从内置模块和插件入口点自动发现。常见的工具组包括：

- 文件读写/编辑和补丁；
- Shell 执行，支持可配置的沙箱；
- 网页搜索和网页抓取，带有 SSRF 检查；
- MCP 服务器；
- 定时提醒、本地触发器和心跳任务；
- 图像生成；
- 子 Agent 和运行时自检。

安全相关的控制项位于 `[configuration.md#security](./configuration.md#security)`。对于生产环境或共享聊天应用，还需配置渠道访问控制，例如 `allowFrom`、配对或 WebSocket 令牌。

## 后台任务

当 `nanobot gateway` 启动时，它会运行工作区范围的自动化并注册系统任务：

- `dream`，当 `agents.defaults.dream.enabled` 为 true 时；
- `heartbeat`，当 `gateway.heartbeat.enabled` 为 true 时。

Heartbeat 读取 `<workspace>/HEARTBEAT.md`。如果该文件在 `## Active Tasks` 下有任务，nanobot 会执行这些任务，并仅将有用/可操作的结果发送到最近活跃的聊天目标。常规的“无变化”结果会被抑制。

用户创建的提醒使用相同的定时任务服务，但与受保护的心跳系统任务不同。它们会在其来源聊天/会话中按计划执行轮次，并通常将结果传回该渠道。

本地触发器也与会话绑定，但它们没有自己的调度。从目标聊天中使用 `/trigger <name>` 创建触发器，然后当本地脚本或外部服务希望 nanobot 在该会话中响应时，调用 `nanobot trigger <id> "<message>"`。Webhook 服务器、第三方认证和事件到消息的格式化保持在 nanobot 之外。触发器投递会存储在工作区中，直到关联的 Agent 轮次成功完成。如果目标会话正忙，触发器会等待该会话空闲，而不是被注入到当前活动的轮次中。该消息会作为该会话中的一次自动化轮次被记录。投递是至少一次（at-least-once）的，因此外部系统应容忍重复的触发器消息；已到达 Agent 但失败的投递会被标记为失败，而不是无限重试。

## 接下来去哪里


| 需求       | 阅读                                           |
| -------- | -------------------------------------------- |
| 首次工作安装   | `[quick-start.md](./quick-start.md)`         |
| 提供商/模型设置 | `[providers.md](./providers.md)`             |
| 聊天应用设置   | `[chat-apps.md](./chat-apps.md)`             |
| 完整配置参考   | `[configuration.md](./configuration.md)`     |
| 运行时调试    | `[troubleshooting.md](./troubleshooting.md)` |


