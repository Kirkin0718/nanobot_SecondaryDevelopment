## CLI模式

### 关键入口：`agent` 命令（交互模式）

```python
@app.command()
def agent(
    message: str = typer.Option(None, "--message", "-m"),
    session_id: str = typer.Option("cli:direct", "--session", "-s"),
    workspace: str | None = typer.Option(None, "--workspace", "-w"),
    config: str | None = typer.Option(None, "--config", "-c"),
    markdown: bool = typer.Option(True, "--markdown/--no-markdown"),
    logs: bool = typer.Option(False, "--logs/--no-logs"),
):
```

### 启动流程（交互模式，`message` 为空时）

```python
# 1. 加载配置
config = _load_runtime_config(config, workspace)

# 2. 创建 MessageBus
bus = MessageBus()

# 3. 创建 AgentLoop
agent_loop = AgentLoop.from_config(config, bus, ...)

# 4. 启动 agent_loop.run() 作为后台任务
bus_task = asyncio.create_task(agent_loop.run())

# 5. 启动 outbound 消费者（监听 Agent 的回复）
outbound_task = asyncio.create_task(_consume_outbound())

# 6. 循环读取用户输入
while True:
    user_input = await _read_interactive_input_async()
  
    # 7. 发布入站消息
    await bus.publish_inbound(InboundMessage(
        channel="cli",
        sender_id="user",
        chat_id="direct",
        content=user_input,
    ))
  
    # 8. 等待 Agent 回复（turn_done 事件）
    await turn_done.wait()
```

### CLI 模式启动流程

│  1. 用户执行: nanobot agent -m "你好"
│                    │
│                    ▼
│  2. agent() 命令函数执行:
│     • 加载 config.json
│     • 创建 MessageBus()  ←── 命令层创建总线
│     • 创建 AgentLoop.from_config(config, bus) ←── 注入总线
│                    │
│                    ▼
│  3. 如果是单条消息 (有 -m 参数):
│     • agent_loop.process_direct("你好")
│     • 直接调用，不经过 MessageBus
│     • 打印回复 → 退出
│                    │
│                    ▼
│  4. 如果是交互模式 (无 -m 参数):
│     • 创建后台任务: asyncio.create_task(agent_loop.run())
│     • 创建后台任务: asyncio.create_task(_consume_outbound())
│     • 进入循环: 等待用户输入
│                    │
│                    ▼
│  5. 用户输入 "你好" → bus.publish_inbound(InboundMessage)
│                    │
│                    ▼
│  6. AgentLoop.run() 从 bus.consume_inbound() 取出消息
│     → 调用 Provider (LLM)
│     → 调用 Tools (如果需要)
│     → bus.publish_outbound(OutboundMessage)
│                    │
│                    ▼
│  7. _consume_outbound() 从 bus.consume_outbound() 取出消息
│     → 打印到终端（彩色/Markdown）

---

## gateway模式

关键入口：`gateway` 命令

`gateway` 命令实际调用 `_run_gateway()`：

```python
def _run_gateway(config, port, open_browser_url, ...):
    # 1. 创建 MessageBus
    bus = MessageBus()
  
    # 2. 创建 RuntimeEventBus（内部事件）
    runtime_events = RuntimeEventBus()
  
    # 3. 创建 SessionManager
    session_manager = SessionManager(config.workspace_path)
  
    # 4. 创建 AgentLoop
    agent = AgentLoop.from_config(
        config, bus,
        provider=...,
        model=...,
        session_manager=session_manager,
        runtime_events=runtime_events,
        ...
    )
  
    # 5. 创建 ChannelManager（管理所有 Channel）
    channels = ChannelManager(
        config,
        bus,
        session_manager=session_manager,
        ...
    )
  
    # 6. 在 async run() 中启动三个后台任务
    tasks = [
        asyncio.create_task(agent.run(), name="nanobot-agent-loop"),
        asyncio.create_task(channels.start_all(), name="nanobot-channels"),
        asyncio.create_task(run_local_trigger_queue(...)),
    ]
```

### Gateway 模式启动流程

│  1. 用户执行: nanobot gateway
│                    │
│                    ▼
│  2. _run_gateway() 函数执行:
│     • 加载 config.json
│     • 创建 MessageBus()  ←── 网关层创建总线
│     • 创建 SessionManager()
│     • 创建 CronService()
│     • 创建 AgentLoop.from_config(config, bus, session_manager)
│     • 创建 ChannelManager(config, bus, session_manager)
│                    │
│                    ▼

│  3. 并发启动三个后台任务 (asyncio.gather):

│     │  agent.run()           │  │ channels.start_all()      │  │ health_server  │
│     │  消费 inbound       │  │  启动 WebUI/Telegram│  │  /health 端点     │
│     │  生产 outbound    │  │  消费 outbound              │  │           		       │
│      └───┬────┘   └────┬─────┘   └───────┘
│                        │                                                │
│                        └───MessageBus──┘
│                                           (双向通信)
│                                                                           
│  4. 用户通过浏览器访问 WebUI: http://127.0.0.1:8765
│                    │
│                    ▼
│  5. WebUI Channel (WebSocket) 收到消息:
│     → bus.publish_inbound(InboundMessage)
│                    │
│                    ▼
│  6. AgentLoop.run() 从 bus.consume_inbound() 取出消息
│     → 调用 Provider
│     → 调用 Tools
│     → bus.publish_outbound(OutboundMessage)
│                    │
│                    ▼
│  7. WebUI Channel 从 bus.consume_outbound() 取出消息
│     → 通过 WebSocket 推送到浏览器

---

## 核心发现

| 组件                    | 在哪创建                         | 谁启动                                |
| ----------------------- | -------------------------------- | ------------------------------------- |
| `MessageBus`          | `_run_gateway()` / `agent()` | 直接实例化                            |
| `AgentLoop`           | `AgentLoop.from_config()`      | `agent.run()` 作为后台任务          |
| `ChannelManager`      | `_run_gateway()`               | `channels.start_all()` 作为后台任务 |
| `Channel`（如 WebUI） | `ChannelManager` 内部          | `channels.start_all()` 遍历启动     |

---

## 对比总结

| 对比项                    | CLI 模式                          | Gateway 模式                       |
| ------------------------- | --------------------------------- | ---------------------------------- |
| **入口**            | `nanobot agent`                 | `nanobot gateway`                |
| **谁创建 Bus**      | `agent()` 命令函数              | `_run_gateway()` 函数            |
| **Channel**         | 无（直接终端交互）                | ChannelManager 管理多个 Channel    |
| **Agent 消费者**    | `agent_loop.run()` 后台任务     | `agent.run()` 后台任务           |
| **Outbound 消费者** | CLI 的 `_consume_outbound()`    | 每个 Channel 自己消费              |
| **用户交互**        | 终端输入/输出                     | 浏览器/Telegram/微信等             |
| **并发任务**        | 2 个（agent + outbound consumer） | 3+ 个（agent + channels + health） |

---


## MessageBus 解耦的好处

1. 可以独立替换 Channel（加微信/加 Discord，Agent 不用改）
2. 可以独立替换 Agent 逻辑（改推理方式，Channel 不用改）
3. 可以独立测试（Mock MessageBus 即可测试 Channel 或 Agent）
4. 可以横向扩展（多个 Agent 实例消费同一个 inbound 队列）

---



## 现在回答几个问题（从代码验证）

1. **CLI 交互模式**和**Gateway 模式**，谁创建了 `MessageBus`？谁消费 inbound/outbound？
2. **CLI 模式下**，用户输入走哪条路径？Agent 回复又走哪条路径？（看 `publish_inbound` 和 `_consume_outbound` 在哪）
3. **Gateway 模式下**，`ChannelManager.start_all()` 会启动 WebUI Channel，那 WebUI Channel 会调用 `bus.publish_inbound` 和 `bus.consume_outbound` 吗？（提示：Channel 的职责是什么）
4. **`agent.run()` 和 `channels.start_all()` 是并发执行的**，它们通过什么通信？

> **CLI 交互模式（`nanobot agent`）**
>
> | 操作                      | 谁做的                                              | 代码位置                                                |
> | ------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
> | **创建 MessageBus** | `agent()` 命令函数                                | `bus = MessageBus()`                                  |
> | **消费 inbound**    | `AgentLoop`（通过 `agent_loop.run()` 后台任务） | `agent_loop.run()` 内部调用 `bus.consume_inbound()` |
> | **消费 outbound**   | CLI 的 `_consume_outbound()` 后台任务             | `asyncio.create_task(_consume_outbound())`            |
> | **生产 inbound**    | 主循环（用户输入）                                  | `bus.publish_inbound(InboundMessage(...))`            |
> | **生产 outbound**   | `AgentLoop`                                       | `bus.publish_outbound(OutboundMessage(...))`          |
>
> **Gateway 模式（`nanobot gateway`）**
>
> | 操作                      | 谁做的                                         | 代码位置                                             |
> | ------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
> | **创建 MessageBus** | `_run_gateway()` 函数                        | `bus = MessageBus()`                               |
> | **消费 inbound**    | `AgentLoop`（通过 `agent.run()` 后台任务） | `agent.run()` 内部调用 `bus.consume_inbound()`   |
> | **消费 outbound**   | `ChannelManager` 管理的各个 Channel          | 每个 Channel 自己调用 `bus.consume_outbound()`     |
> | **生产 inbound**    | 各个 Channel（WebUI/Telegram等）               | Channel 收到用户消息后调用 `bus.publish_inbound()` |
> | **生产 outbound**   | `AgentLoop`                                  | `bus.publish_outbound(OutboundMessage(...))`       |

> **用户输入路径（生产 inbound）：**`b`
>
> `用户输入` → `_read_interactive_input_async()` → `bus.publish_inbound()` → **inbound 队列** → `agent_loop.run()` 消费
>
> **Agent 回复路径（生产 outbound）：**
>
> `AgentLoop` → `bus.publish_outbound()` → **outbound 队列** → `_consume_outbound()` → `_print_agent_response()` → **终端显示**

> 会的，这是 Channel 的核心职责；
>
>  **Channel 对 MessageBus 的双向使用** ：
>
> * **作为生产者** ：收到用户消息 → `publish_inbound()`
> * **作为消费者** ：`consume_outbound()` → 推送给用户
>
> `ChannelManager` 把 `bus` 传给每个 Channel ——Channel 需要既能发 inbound，又能收 outbound。

> 通过 MessageBus 通信。 这是 MessageBus 存在的全部意义。
>
>  通信方式 ：
>
> * **Channel → Agent** ：通过 `inbound` 队列（Channel 是生产者，Agent 是消费者）
> * **Agent → Channel** ：通过 `outbound` 队列（Agent 是生产者，Channel 是消费者）
>
>  **关键点** ：
>
> * 两者**从不直接调用对方的方法**
> * 两者 **不知道对方的存在** （Channel 不知道 Agent 是谁，Agent 不知道 Channel 是谁）
> * 它们只认识 `MessageBus` 的接口（`publish_inbound` / `consume_inbound` / `publish_outbound` / `consume_outbound`）
