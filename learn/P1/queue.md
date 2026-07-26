```
"""Async message queue for decoupled channel-agent communication."""

import asyncio

from nanobot.bus.events import InboundMessage, OutboundMessage


class MessageBus:
    """
    Async message bus that decouples chat channels from the agent core.

    Channels push messages to the inbound queue, and the agent processes
    them and pushes responses to the outbound queue.
    """

    def __init__(self):
        self.inbound: asyncio.Queue[InboundMessage] = asyncio.Queue()
        self.outbound: asyncio.Queue[OutboundMessage] = asyncio.Queue()

    async def publish_inbound(self, msg: InboundMessage) -> None:
        """Publish a message from a channel to the agent."""
        await self.inbound.put(msg)

    async def consume_inbound(self) -> InboundMessage:
        """Consume the next inbound message (blocks until available)."""
        return await self.inbound.get()

    async def publish_outbound(self, msg: OutboundMessage) -> None:
        """Publish a response from the agent to channels."""
        await self.outbound.put(msg)

    async def consume_outbound(self) -> OutboundMessage:
        """Consume the next outbound message (blocks until available)."""
        return await self.outbound.get()

    @property
    def inbound_size(self) -> int:
        """Number of pending inbound messages."""
        return self.inbound.qsize()

    @property
    def outbound_size(self) -> int:
        """Number of pending outbound messages."""
        return self.outbound.qsize()

```


## 代码结构解剖

```python
"""Async message queue for decoupled channel-agent communication."""
```

这句 docstring 已经点明核心目的：**解耦**。

---

### 导入部分

```python
import asyncio
from nanobot.bus.events import InboundMessage, OutboundMessage
```

- `asyncio`：异步 I/O 库，说明这个总线是**非阻塞**的
- `InboundMessage`：**入站消息**（用户 → Agent）。通常包含：`channel_id`, `user_id`, `content`, `session_id` 等
- `OutboundMessage`：**出站消息**（Agent → 用户）。通常包含：`response`, `channel_id`, `session_id` 等

---

### `__init__` 初始化

```python
def __init__(self):
    self.inbound: asyncio.Queue[InboundMessage] = asyncio.Queue()
    self.outbound: asyncio.Queue[OutboundMessage] = asyncio.Queue()
```

- 创建了**两个独立的队列**：
  - `inbound`：存放待处理的用户消息
  - `outbound`：存放待发送的 Agent 回复
- `asyncio.Queue` 是**线程安全**的异步队列，支持多个生产者/消费者并发操作

---

### 入站相关（用户 → Agent）

```python
async def publish_inbound(self, msg: InboundMessage) -> None:
    """Publish a message from a channel to the agent."""
    await self.inbound.put(msg)
```

- **生产者**：Channel（如 WebUI/Telegram）调用此方法
- `put(msg)`：将消息**放入队列尾部**，如果队列满了会阻塞等待

```python
async def consume_inbound(self) -> InboundMessage:
    """Consume the next inbound message (blocks until available)."""
    return await self.inbound.get()
```

- **消费者**：AgentLoop 调用此方法
- `get()`：从队列**头部取出**一条消息，如果队列为空会阻塞等待

---

### 出站相关（Agent → 用户）

```python
async def publish_outbound(self, msg: OutboundMessage) -> None:
    """Publish a response from the agent to channels."""
    await self.outbound.put(msg)
```

- **生产者**：AgentLoop 调用此方法，把回复放进去；如果队列满了会阻塞等待

```python
async def consume_outbound(self) -> OutboundMessage:
    """Consume the next outbound message (blocks until available)."""
    return await self.outbound.get()
```

- **消费者**：Channel 调用此方法，取出回复发回 WebUI/Telegram；如果队列为空会阻塞等待

---

### 辅助属性（调试用）

```python
@property
def inbound_size(self) -> int:
    return self.inbound.qsize()

@property
def outbound_size(self) -> int:
    return self.outbound.qsize()
```

- `qsize()`：返回队列中待处理的消息数量
- 用途：监控积压情况、健康检查、调试

---

## 关键洞察（先不理论，从代码推断）

**现在看这段代码，回答我三个问题：**

1. **Channel 和 Agent 是否直接调用彼此？** （看代码里有没有互相引用对方的类）
2. **如果 Channel 发消息很慢，Agent 处理很快，会发生什么？**（看队列的行为）
3. **如果 Agent 想主动给 Channel 发消息（比如定时任务推送），能通过 MessageBus 实现吗？**

> 1. **不直接调用** ——代码里没有任何 `Channel` 或 `Agent` 类的引用，两个队列是完全独立的
> 2. **队列会空** ——`consume_inbound` 会阻塞在 `get()`，直到有新消息进来。这其实是 **好事** ，让 Agent 在没有消息时能休眠，不浪费 CPU
> 3. **理论上可以，但设计上不应该** ——`OutboundMessage` 的语义是"Agent 对用户消息的回复"，如果 Agent 主动推送（比如定时提醒），虽然技术上通过 `publish_outbound` 能发，但会 **破坏"请求-响应"的语义** 。这种场景应该走另外的机制（比如 `HEARTBEAT.md` 触发）

---



## 从代码中提炼的关键设计原则

| 事实                | 证据                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **单向依赖**  | Channel 只知道 `publish_inbound` / `consume_outbound`Agent 只知道 `consume_inbound` / `publish_outbound` |
| **异步阻塞**  | `await queue.get()` 会阻塞直到有消息，避免忙轮询浪费 CPU                                                            |
| **FIFO 顺序** | `asyncio.Queue` 保证先到先处理                                                                                      |
| **解耦**      | 两边不直接知道对方的存在，只通过队列交换数据                                                                          |
