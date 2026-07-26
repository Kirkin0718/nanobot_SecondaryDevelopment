## 在 MessageBus 加临时日志，观察 WebUI 一条消息的 inbound/outbound 时序

### 1.修改 `nanobot/bus/queue.py`

```
"""Async message queue for decoupled channel-agent communication."""

import asyncio
import time
import json
from datetime import datetime
from typing import Any

from nanobot.bus.events import InboundMessage, OutboundMessage


class MessageBus:
    """
    Async message bus that decouples chat channels from the agent core.

    Channels push messages to the inbound queue, and the agent processes
    them and pushes responses to the outbound queue.
    """

    def __init__(self, debug: bool = False):
        self.inbound: asyncio.Queue[InboundMessage] = asyncio.Queue()
        self.outbound: asyncio.Queue[OutboundMessage] = asyncio.Queue()
        self.debug = debug
        self._counter = 0

    def _log(self, direction: str, event: str, msg: Any, queue_size: int | None = None) -> None:
        """统一的日志输出格式"""
        if not self.debug:
            return

        self._counter += 1
        seq = self._counter
        ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]

        # 提取消息摘要
        if isinstance(msg, InboundMessage):
            summary = f"channel={msg.channel} chat={msg.chat_id} content={msg.content[:50]}..."
        elif isinstance(msg, OutboundMessage):
            summary = f"channel={msg.channel} chat={msg.chat_id} content={msg.content[:50]}..."
        else:
            summary = str(msg)[:50]

        size_info = f" queue_size={queue_size}" if queue_size is not None else ""

        print(f"[{ts}] [{seq:04d}] {direction} {event} | {summary}{size_info}")

    async def publish_inbound(self, msg: InboundMessage) -> None:
        """Publish a message from a channel to the agent."""
        self._log("IN", "publish", msg, self.inbound.qsize())
        await self.inbound.put(msg)
        self._log("IN", "after_put", msg, self.inbound.qsize())

    async def consume_inbound(self) -> InboundMessage:
        """Consume the next inbound message (blocks until available)."""
        self._log("IN", "waiting", "waiting for message...", self.inbound.qsize())
        msg = await self.inbound.get()
        self._log("IN", "consumed", msg, self.inbound.qsize())
        return msg

    async def publish_outbound(self, msg: OutboundMessage) -> None:
        """Publish a response from the agent to channels."""
        self._log("OUT", "publish", msg, self.outbound.qsize())
        await self.outbound.put(msg)
        self._log("OUT", "after_put", msg, self.outbound.qsize())

    async def consume_outbound(self) -> OutboundMessage:
        """Consume the next outbound message (blocks until available)."""
        self._log("OUT", "waiting", "waiting for message...", self.outbound.qsize())
        msg = await self.outbound.get()
        self._log("OUT", "consumed", msg, self.outbound.qsize())
        return msg

    @property
    def inbound_size(self) -> int:
        return self.inbound.qsize()

    @property
    def outbound_size(self) -> int:
        return self.outbound.qsize()
```

### 2.开启调试模式；在 `queue.py` 顶部加入：

```
import os

class MessageBus:
    def __init__(self, debug: bool = None):
        if debug is None:
            debug = os.environ.get("NANOBOT_BUS_DEBUG", "").lower() in ("1", "true", "yes")
        self.debug = debug
        # ... 其他代码
```

### 3.启动

```
(base) C:\Windows\System32>cd /d D:\agent\nanobot
(base) C:\Windows\System32>conda activate nanobot
(nanobot) C:\Windows\System32>set NANOBOT_BUS_DEBUG=1
(nanobot) C:\Windows\System32>python -m nanobot gateway
```

### 4.查看日志

Gateway 已经启动，端口 8765（WebSocket）和 18790（Health）都正常监听。

```
🐈 Starting nanobot gateway version 0.2.2 on port 18790...
2026-07-15 19:26:43 | INFO  | - | Runtime model switched for next turn: deepseek-chat -> deepseek-chat
2026-07-15 19:26:43 | INFO  | - | Registered 19 tools: ['apply_patch', 'run_cli_app', 'complete_goal', 'cron', 'edit_file', 'exec', 'find_files', 'grep', 'list_dir', 'list_exec_sessions', 'long_task', 'message', 'read_file', 'spawn', 'web_fetch', 'web_search', 'write_file', 'write_stdin', 'my']
2026-07-15 19:26:43 | INFO  | - | WebSocket channel enabled
✓ Channels enabled: websocket
✓ Cron: 2 scheduled jobs
✓ Heartbeat: every 1800s
2026-07-15 19:26:43 | INFO  | - | Cron: registered system job 'dream' (dream)
✓ Dream: every 2h
2026-07-15 19:26:43 | INFO  | - | Cron: registered system job 'heartbeat' (heartbeat)
2026-07-15 19:26:43 | INFO  | - | Cron service started with 2 jobs
2026-07-15 19:26:43 | INFO  | - | Agent loop started
2026-07-15 19:26:43 | INFO  | - | Starting websocket channel...
2026-07-15 19:26:43 | INFO  | - | Local trigger queue started
[19:26:43.382] [0001] IN waiting      | waiting... q=0
2026-07-15 19:26:43 | INFO  | - | Outbound dispatcher started
2026-07-15 19:26:43 | INFO  | websocket | WebSocket server listening on ws://127.0.0.1:8765/
[19:26:43.387] [0002] OUT waiting      | waiting... q=0
✓ Health endpoint: http://127.0.0.1:18790/health
[19:26:44.422] [0003] IN waiting      | waiting... q=0
[19:26:44.423] [0004] OUT waiting      | waiting... q=0
[19:26:45.442] [0005] IN waiting      | waiting... q=0
[19:26:45.447] [0006] OUT waiting      | waiting... q=0
```

> （nanobot）C:\Windows\System32>python -m nanobot gateway
> 🐈 正在端口 18790 上启动 nanobot 网关 0.2.2 版本...
> 2026-07-15 19:26:43 | 信息  | - | 下一轮运行时模型已切换：deepseek-chat -> deepseek-chat
> 2026-07-15 19:26:43 | 信息  | - | 已注册 19 个工具：['apply_patch'， 'run_cli_app'， 'complete_goal'， 'cron'， 'edit_file'， 'exec'， 'find_files'， 'grep'， 'list_dir'， 'list_exec_sessions'， 'long_task'， 'message'， 'read_file'， 'spawn'， 'web_fetch'， 'web_search'， 'write_file'， 'write_stdin'， 'my']
> 2026-07-15 19:26:43 | 信息  | - | WebSocket 通道已启用
> ✓ 已启用通道：websocket
> ✓ Cron：2 个已调度任务
> ✓ 心跳：每 1800 秒
> 2026-07-15 19:26:43 | 信息  | - | Cron：已注册系统任务“dream”（梦境）
> ✓ 梦境：每 2 小时
> 2026-07-15 19:26:43 | 信息  | - | Cron：已注册系统任务“heartbeat”（心跳）
> 2026-07-15 19:26:43 | 信息  | - | Cron 服务已启动，共 2 个任务
> 2026-07-15 19:26:43 | 信息  | - | Agent 循环已启动
> 2026-07-15 19:26:43 | 信息  | - | 正在启动 WebSocket 通道...
> 2026-07-15 19:26:43 | 信息  | - | 本地触发器队列已启动
> [19:26:43.382] [0001] IN waiting      | 等待中... q=0
> 2026-07-15 19:26:43 | 信息  | - | 出站调度器已启动
> 2026-07-15 19:26:43 | 信息  | websocket | WebSocket 服务器正在 ws://127.0.0.1:8765/ 上监听
> [19:26:43.387] [0002] OUT waiting      | 等待中... q=0
> ✓ 健康检查端点：http://127.0.0.1:18790/health
> [19:26:44.422] [0003] IN waiting      | 等待中... q=0
> [19:26:44.423] [0004] OUT waiting      | 等待中... q=0
> [19:26:45.442] [0005] IN waiting      | 等待中... q=0
> [19:26:45.447] [0006] OUT waiting      | 等待中... q=0

> **日志解读**：
>
> * `IN waiting` — AgentLoop 在 **等待** inbound 队列有消息（`consume_inbound()` 阻塞中）
> * `OUT waiting` — Channel（WebUI）在 **等待** outbound 队列有消息（`consume_outbound()` 阻塞中）
> * `q=0` — 两个队列都是空的，没有待处理消息
> * 每秒钟打印一次，说明有定时器或健康检查在轮询
>
> **系统处于空闲状态，等待用户发消息。**

### 5.查看完整流程

浏览器访问 `http://127.0.0.1:8765`

输入消息 （比如 "你好"）并发送

```
2026-07-15 19:27:50 | INFO  | - | Response to websocket:anon-d9e2a966c4bf: 你好！😊 有什么我可以帮你的吗？
[19:27:50.471] [0167] OUT publish      | websocket | 你好！😊 有什么我可以帮你的吗？... q=1
[19:27:50.475] [0168] OUT after_put    | websocket | 你好！😊 有什么我可以帮你的吗？... q=2
[19:27:50.477] [0169] OUT publish      | websocket | ... q=2
[19:27:50.479] [0170] OUT after_put    | websocket | ... q=3
[19:27:50.480] [0171] OUT publish      | websocket | ... q=3
[19:27:50.482] [0172] OUT after_put    | websocket | ... q=4
[19:27:50.483] [0173] OUT consumed     | websocket | ... q=3
[19:27:50.830] [0174] OUT waiting      | waiting... q=3
[19:27:50.831] [0175] OUT consumed     | websocket | 你好！😊 有什么我可以帮你的吗？... q=2
[19:27:50.833] [0176] OUT waiting      | waiting... q=2
[19:27:50.833] [0177] OUT consumed     | websocket | ... q=1
[19:27:50.841] [0178] OUT waiting      | waiting... q=1
[19:27:50.841] [0179] OUT consumed     | websocket | ... q=0
[19:27:50.843] [0180] OUT waiting      | waiting... q=0
```

> **日志解读：**
>
> 1. Agent 回复被拆分成多个 chunk（流式输出）：每生成一段文本就发一个 `OutboundMessage`，而不是等全部生成完再发。
> 2. 队列积压：q 从 1 涨到 4，Agent 生产消息的速度 **快于** WebUI Channel 消费的速度，消息在 outbound 队列里积压了。
> 3. 消费者批量取走：消费者（WebUI Channel）逐个取走消息，每次 `consumed` 后 `q` 减 1，直到队列清空。

完整时序图

```
时间 ──────────────────────────────────────────────────────────────────────→

Agent (生产者)                    MessageBus                    WebUI Channel (消费者)
     │                                │                                │
     │ ① publish (chunk 1)            │                                │
     │───────────────────────────────→│ q=1                            │
     │ ② publish (chunk 2)            │                                │
     │───────────────────────────────→│ q=2                            │
     │ ③ publish (chunk 3)            │                                │
     │───────────────────────────────→│ q=3                            │
     │ ④ publish (chunk 4)            │                                │
     │───────────────────────────────→│ q=4                            │
     │                                │                                │
     │                                │ ⑤ consumed (chunk 1)           │
     │                                │───────────────────────────────→│ q=3
     │                                │                                │
     │                                │ ⑥ consumed (chunk 2)           │
     │                                │───────────────────────────────→│ q=2
     │                                │                                │
     │                                │ ⑦ consumed (chunk 3)           │
     │                                │───────────────────────────────→│ q=1
     │                                │                                │
     │                                │ ⑧ consumed (chunk 4)           │
     │                                │───────────────────────────────→│ q=0
```

### 6.你观察到了什么？

1. **为什么 `IN` 日志没有出现？** — 因为 `IN` 日志是在 Agent **消费** inbound 消息时打印的，而这条消息是 Agent 的**回复**，走的是 outbound 队列，所以只有 `OUT` 日志。
2. **如果你想看完整的 inbound + outbound 流程**，需要在 WebUI 发一条**需要调用工具**的消息（比如 "帮我查一下天气"），这样能看到：

   - `IN publish`（用户消息进入队列）
   - `IN consumed`（Agent 取走消息）
   - `OUT publish`（Agent 回复进入队列，可能多条）
   - `OUT consumed`（WebUI 取走回复）

### 7.尝试发一条工具调用消息

比如：

- "帮我查一下当前时间"
- "列出当前目录的文件"
- "搜索一下今天的新闻"

这样你会看到 **完整的 inbound + outbound + tool call 流程**，理解 MessageBus 如何承载整个对话生命周期。

### 8.完整流程分析：

#### 阶段 1：用户消息入站 (Inbound)

```
[19:34:28.372] [0956] IN waiting      | waiting... q=0        ← Agent 在等待消息
[19:34:28.558] [0957] IN publish      | websocket | 搜索一下今天的新闻... q=0  ← WebUI 发布消息
[19:34:28.560] [0958] IN after_put    | websocket | 搜索一下今天的新闻... q=1  ← 消息入队，队列有 1 条待处理
[19:34:28.592] [0959] IN consumed     | websocket | 搜索一下今天的新闻... q=0  ← Agent 取走消息，队列清空
```

**观察**：从 `publish` 到 `consumed` 只用了 **32ms**，消息传递非常快。

---

#### 阶段 2：Agent 启动 + 工具调用

```
[19:34:30.426] [1000] OUT publish      | search "今日新闻 2026年7月15日"... q=1
[19:34:30.428] [1001] OUT after_put    | search "今日新闻 2026年7月15日"... q=2
2026-07-15 19:34:30 | INFO  | - | Tool call: web_search({"query": "今日新闻 2026年7月15日", "count": 10})
[19:34:31.330] [1002] OUT consumed     | ... q=1
[19:34:31.352] [1004] OUT consumed     | search "今日新闻 2026年7月15日"... q=0
```

**观察**：

- Agent 决定调用 `web_search` 工具
- 工具调用信息通过 outbound 队列**回传给 WebUI**（显示"正在搜索..."）
- 第二次工具调用：

```
[19:34:35.427] [1020] OUT after_put    | search "2026年7月15日 今日要闻 热点新闻"... q=2
2026-07-15 19:34:35 | INFO  | - | Tool call: web_search({"query": "2026年7月15日 今日要闻 热点新闻", "count": 10})
```

Agent 优化了搜索词，调用了第二次搜索。

---

#### 阶段 3：网页抓取 (web_fetch)

```
[19:35:01.445] [1083] OUT after_put    | fetch https://www.bbc.com/zhongwen/simp, fetch htt... q=2
2026-07-15 19:35:01 | INFO  | - | Tool call: web_fetch({"url": "https://www.bbc.com/zhongwen/simp", "maxChars": 8000})
2026-07-15 19:35:01 | INFO  | - | Tool call: web_fetch({"url": "https://www.chinanews.com.cn/", "maxChars": 8000})
```

Agent 同时抓取了两个新闻网站。

---

#### 阶段 4：流式回复 (Streaming)

```
[19:35:04.601] [1097] OUT publish      | 好的... q=0
[19:35:04.744] [1101] OUT publish      | ，... q=0
[19:35:04.759] [1105] OUT publish      | 以下是... q=0
[19:35:04.793] [1117] OUT publish      | 202... q=0
[19:35:04.801] [1120] OUT publish      | 6... q=0
[19:35:04.808] [1124] OUT publish      | 年... q=0
[19:35:04.813] [1128] OUT publish      | 7... q=0
[19:35:04.820] [1132] OUT publish      | 月... q=0
[19:35:04.826] [1136] OUT publish      | 15... q=0
[19:35:04.833] [1141] OUT publish      | 日... q=0
[19:35:04.841] [1144] OUT publish      | ）... q=0
```

**关键观察**：

- 每个中文字符/词都是一个独立的 `OutboundMessage`
- 这是**字符级流式输出**，实现打字机效果
- 每个 chunk 的 `q=0` 说明 WebUI 消费速度跟上了 Agent 的生产速度

---

#### 总结：工具调用 vs 普通聊天

| 阶段     | 普通聊天 | 工具调用 (本次)                                      |
| -------- | -------- | ---------------------------------------------------- |
| Inbound  | 用户消息 | 用户消息                                             |
| Outbound | 直接回复 | 先发工具调用状态 → 执行工具 → 整合结果 → 流式回复 |
| 工具调用 | 无       | `web_search` × 2 + `web_fetch` × 2             |
| 耗时     | ~2-3s    | ~35s (工具执行耗时)                                  |

---


## 总结：

1. ✅ **Inbound 路径**：WebUI → MessageBus → Agent
2. ✅ **Outbound 路径**：Agent → MessageBus → WebUI
3. ✅ **工具调用**：Agent 通过 outbound 通知前端 → 执行工具 → 继续处理
4. ✅ **流式输出**：逐字符/逐词推送，实现打字机效果
5. ✅ **队列积压**：当生产者快于消费者时，q 值会增长

### MessageBus 在 nanobot 中的角色

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         MessageBus 时序图                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WebUI Channel          MessageBus              AgentLoop                │
│       │                     │                      │                     │
│       │ ① publish_inbound   │                      │                     │
│       │────────────────────→│                      │                     │
│       │                     │ ② consumed           │                     │
│       │                     │─────────────────────→│                     │
│       │                     │                      │                     │
│       │                     │                      │ ③ 调用 LLM          │
│       │                     │                      │ ④ 决定调用 Tool     │
│       │                     │                      │                     │
│       │                     │ ⑤ publish_outbound   │                     │
│       │                     │←─────────────────────│                     │
│       │ ⑥ consumed          │                      │                     │
│       │←────────────────────│                      │                     │
│       │                     │                      │                     │
│       │  (用户看到"正在搜索...")                    │                     │
│       │                     │                      │                     │
│       │                     │                      │ ⑦ 执行 Tool         │
│       │                     │                      │ ⑧ 整合结果           │
│       │                     │                      │ ⑨ 生成回复           │
│       │                     │                      │                     │
│       │                     │ ⑩ publish_outbound   │                     │
│       │                     │←─────────────────────│                     │
│       │ ⑪ consumed (流式)   │                      │                     │
│       │←────────────────────│                      │                     │
│       │                     │                      │                     │
│  (打字机效果逐字显示)        │                      │                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**MessageBus 就是整个系统的"神经系统"**——所有通信都经过它，所有组件都通过它解耦。
