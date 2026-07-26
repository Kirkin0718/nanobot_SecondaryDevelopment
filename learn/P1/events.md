```
"""Event types for the message bus."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from nanobot.bus.outbound_events import OutboundEvent

# Optional ``OutboundMessage.metadata`` key for structured, channel-agnostic UI
# payloads. Value is JSON-serializable with at least ``kind``; rich clients may
# render it and other channels may ignore unknown keys.
OUTBOUND_META_AGENT_UI = "_agent_ui"

# Internal-only inbound metadata used by in-process channels to ask the agent
# loop to update runtime state without going through a user session.
INBOUND_META_RUNTIME_CONTROL = "_runtime_control"
RUNTIME_CONTROL_ACK = "_ack"
RUNTIME_CONTROL_MCP_RELOAD = "mcp_reload"


@dataclass
class InboundMessage:
    """Message received from a chat channel."""

    channel: str  # telegram, discord, slack, whatsapp
    sender_id: str  # User identifier
    chat_id: str  # Chat/channel identifier
    content: str  # Message text
    timestamp: datetime = field(default_factory=datetime.now)
    media: list[str] = field(default_factory=list)  # Media URLs
    metadata: dict[str, Any] = field(default_factory=dict)  # Channel-specific data
    session_key_override: str | None = None  # Optional override for thread-scoped sessions

    @property
    def session_key(self) -> str:
        """Unique key for session identification."""
        return self.session_key_override or f"{self.channel}:{self.chat_id}"


@dataclass
class OutboundMessage:
    """Message to send to a chat channel.

    ``event`` carries internal runtime/UI semantics. ``metadata`` is reserved
    for channel routing context (``message_id``, thread ids, etc.) and optional
    ``OUTBOUND_META_AGENT_UI`` blobs for rich clients.
    """

    channel: str
    chat_id: str
    content: str
    reply_to: str | None = None
    media: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    buttons: list[list[str]] = field(default_factory=list)
    event: "OutboundEvent | None" = None

```

# 各字段含义

## `InboundMessage` - 用户发来的消息

```python
@dataclass
class InboundMessage:
    channel: str          # 哪个渠道来的（webui/telegram/discord）
    sender_id: str        # 谁发的（用户ID）
    chat_id: str          # 哪个对话（群聊ID/私聊ID）
    content: str          # 消息内容
    timestamp: datetime   # 时间戳
    media: list[str]      # 附件（图片/文件URL）
    metadata: dict        # 渠道特有数据（如telegram的message_id）
    session_key_override: str | None  # 可覆盖session_key
```

**关键属性**：

```python
@property
def session_key(self) -> str:
    return self.session_key_override or f"{self.channel}:{self.chat_id}"
```

- `session_key` = `channel + chat_id` 的组合
- 比如 `"webui:user-123"` 或 `"telegram:group-456"`
- **作用**：同一个聊天窗口的所有消息共享同一个 session_key，从而共享对话历史

---

## `OutboundMessage` - Agent 回复的消息

```python
@dataclass
class OutboundMessage:
    channel: str          # 发给哪个渠道
    chat_id: str          # 发给哪个对话
    content: str          # 回复内容
    reply_to: str | None  # 回复哪条消息（消息ID）
    media: list[str]      # 附带的媒体
    metadata: dict        # 路由信息（message_id, thread_id等）
    buttons: list[list[str]]  # 按钮（比如telegram的inline keyboard）
    event: OutboundEvent | None  # 特殊语义事件
```

---

## 两个常量（先记下，后面会用到）

```python
OUTBOUND_META_AGENT_UI = "_agent_ui"
INBOUND_META_RUNTIME_CONTROL = "_runtime_control"
```

- `_agent_ui`：metadata 里放这个 key，表示"这是给富客户端的结构化UI数据"（比如渲染一个表格/图表）
- `_runtime_control`：**内部通道**用来控制 Agent 运行时状态（比如 `mcp_reload` 重新加载工具）

---

## 现在回答我几个问题（从代码推断）：

1. **如果同一个用户在 WebUI 和 Telegram 同时和 Agent 聊天**，它们的 session_key 会冲突吗？为什么？
2. **`OutboundMessage.buttons` 字段**是给谁用的？Channel 收到后应该怎么处理？
3. 看 `InboundMessage.metadata` 里的 `INBOUND_META_RUNTIME_CONTROL` 常量，**什么场景会用到**？（提示：不是用户发的普通消息）

> 1. **不会冲突**；session_key = channel + chat_id 的组合， `webui:chat-123` 和 `telegram:chat-123` 是不同的 key，所以会话完全隔离。
> 2. **Buttons 是给 Channel 渲染用的** ——WebUI 可以渲染成点击按钮，Telegram 渲染成 inline_keyboard，Slack 渲染成 Block Kit。 **Channel 层负责"翻译"成对应平台的 UI 组件** ——这正是 Channel 存在的意义之一
> 3. **控制 Agent 运行时** ——比如 WebUI 里点"重新加载工具"，会发一条 `InboundMessage`，但 `metadata` 里带了 `_runtime_control: "mcp_reload"`。AgentLoop 收到后会检查这个标记， **不把它当普通对话，而是执行控制命令** 。这就是"带外信号"（out-of-band signaling）。
