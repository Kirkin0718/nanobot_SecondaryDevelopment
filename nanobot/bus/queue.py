"""Async message queue for decoupled channel-agent communication."""

import asyncio
import os
from datetime import datetime

from nanobot.bus.events import InboundMessage, OutboundMessage


class MessageBus:
    """
    Async message bus that decouples chat channels from the agent core.

    Channels push messages to the inbound queue, and the agent processes
    them and pushes responses to the outbound queue.
    """

    def __init__(self, debug: bool = None):
        if debug is None:
            debug = os.environ.get("NANOBOT_BUS_DEBUG", "").lower() in ("1", "true", "yes")
        self.debug = debug
        self.inbound: asyncio.Queue[InboundMessage] = asyncio.Queue()
        self.outbound: asyncio.Queue[OutboundMessage] = asyncio.Queue()
        self._counter = 0

    def _log(self, direction: str, event: str, msg, queue_size: int | None = None) -> None:
        if not self.debug:
            return

        self._counter += 1
        ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]

        if isinstance(msg, InboundMessage):
            summary = f"{msg.channel} | {msg.content[:50]}..."
        elif isinstance(msg, OutboundMessage):
            summary = f"{msg.channel} | {msg.content[:50]}..."
        else:
            summary = str(msg)[:50]

        size = f" q={queue_size}" if queue_size is not None else ""
        print(f"[{ts}] [{self._counter:04d}] {direction} {event:12} | {summary}{size}")

    async def publish_inbound(self, msg: InboundMessage) -> None:
        self._log("IN", "publish", msg, self.inbound.qsize())
        await self.inbound.put(msg)
        self._log("IN", "after_put", msg, self.inbound.qsize())

    async def consume_inbound(self) -> InboundMessage:
        self._log("IN", "waiting", "waiting...", self.inbound.qsize())
        msg = await self.inbound.get()
        self._log("IN", "consumed", msg, self.inbound.qsize())
        return msg

    async def publish_outbound(self, msg: OutboundMessage) -> None:
        self._log("OUT", "publish", msg, self.outbound.qsize())
        await self.outbound.put(msg)
        self._log("OUT", "after_put", msg, self.outbound.qsize())

    async def consume_outbound(self) -> OutboundMessage:
        self._log("OUT", "waiting", "waiting...", self.outbound.qsize())
        msg = await self.outbound.get()
        self._log("OUT", "consumed", msg, self.outbound.qsize())
        return msg

    @property
    def inbound_size(self) -> int:
        return self.inbound.qsize()

    @property
    def outbound_size(self) -> int:
        return self.outbound.qsize()