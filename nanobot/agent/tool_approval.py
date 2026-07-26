"""Pending tool-approval waits and user decisions."""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from loguru import logger

PublishApprovalFn = Callable[..., Awaitable[None]]
CancelTurnFn = Callable[[], Awaitable[int]]


class ToolApprovalDecision(str, Enum):
    APPROVE = "approve"
    DENY = "deny"
    STOP = "stop"


@dataclass(slots=True)
class ToolApprovalRequest:
    approval_id: str
    session_key: str
    tool_name: str
    summary: str
    future: asyncio.Future[ToolApprovalDecision] = field(repr=False)


@dataclass(slots=True)
class _TurnBridge:
    publish: PublishApprovalFn
    cancel_turn: CancelTurnFn | None = None


_APPROVAL_BUTTONS: list[list[str]] = [
    ["同意修改", "拒绝修改"],
    ["终止进程"],
]

_WRITE_TOOLS = frozenset(
    {
        "write_file",
        "edit_file",
        "apply_patch",
    },
)
_SYSTEM_TOOLS = frozenset(
    {
        "exec",
        "write_stdin",
        "cron",
    },
)


def approval_buttons() -> list[list[str]]:
    return [row[:] for row in _APPROVAL_BUTTONS]


def label_to_decision(label: str) -> ToolApprovalDecision | None:
    normalized = label.strip()
    if normalized == "同意修改":
        return ToolApprovalDecision.APPROVE
    if normalized == "拒绝修改":
        return ToolApprovalDecision.DENY
    if normalized == "终止进程":
        return ToolApprovalDecision.STOP
    return None


def tool_requires_approval(tool_name: str, params: Any) -> bool:
    if tool_name == "apply_patch" and isinstance(params, dict):
        if params.get("dry_run") is True:
            return False
    if tool_name in _WRITE_TOOLS or tool_name in _SYSTEM_TOOLS:
        return True
    if tool_name == "my" and isinstance(params, dict):
        action = params.get("action")
        if action in ("set", "write", "patch"):
            return True
    return False


def summarize_tool_call(tool_name: str, params: Any) -> str:
    if not isinstance(params, dict):
        return tool_name
    if tool_name == "exec":
        cmd = params.get("command") or params.get("cmd") or ""
        return f"exec: {str(cmd)[:400]}"
    if tool_name in ("write_file", "edit_file", "apply_patch"):
        path = params.get("path") or params.get("file") or params.get("target") or ""
        return f"{tool_name}: {str(path)[:200]}"
    try:
        blob = json.dumps(params, ensure_ascii=False, default=str)
    except TypeError:
        blob = str(params)
    if len(blob) > 480:
        blob = blob[:477] + "..."
    return f"{tool_name}: {blob}"


class ToolApprovalRegistry:
    """Process-wide registry of pending approvals and per-turn publishers."""

    def __init__(self) -> None:
        self._pending: dict[str, ToolApprovalRequest] = {}
        self._bridges: dict[str, _TurnBridge] = {}
        self._lock = asyncio.Lock()

    def register_turn_bridge(
        self,
        session_key: str,
        *,
        publish: PublishApprovalFn,
        cancel_turn: CancelTurnFn | None = None,
    ) -> None:
        self._bridges[session_key] = _TurnBridge(publish=publish, cancel_turn=cancel_turn)

    def unregister_turn_bridge(self, session_key: str) -> None:
        self._bridges.pop(session_key, None)

    async def resolve(self, approval_id: str, decision: ToolApprovalDecision) -> bool:
        async with self._lock:
            pending = self._pending.pop(approval_id, None)
        if pending is None or pending.future.done():
            return False
        pending.future.set_result(decision)
        if decision is ToolApprovalDecision.STOP:
            bridge = self._bridges.get(pending.session_key)
            if bridge and bridge.cancel_turn is not None:
                try:
                    await bridge.cancel_turn()
                except Exception:
                    logger.exception("tool approval stop: cancel_turn failed")
        return True

    async def resolve_latest_for_session(self, session_key: str, label: str) -> bool:
        decision = label_to_decision(label)
        if decision is None:
            return False
        async with self._lock:
            match_id = next(
                (aid for aid, req in self._pending.items() if req.session_key == session_key),
                None,
            )
        if match_id is None:
            return False
        return await self.resolve(match_id, decision)

    async def wait_for_approval(
        self,
        *,
        session_key: str,
        tool_name: str,
        summary: str,
        timeout_seconds: int = 0,
    ) -> ToolApprovalDecision:
        bridge = self._bridges.get(session_key)
        if bridge is None:
            return ToolApprovalDecision.APPROVE

        approval_id = str(uuid.uuid4())
        loop = asyncio.get_running_loop()
        future: asyncio.Future[ToolApprovalDecision] = loop.create_future()
        request = ToolApprovalRequest(
            approval_id=approval_id,
            session_key=session_key,
            tool_name=tool_name,
            summary=summary,
            future=future,
        )
        async with self._lock:
            self._pending[approval_id] = request

        prompt = (
            f"即将执行可能修改环境或系统的操作，是否允许？\n\n"
            f"**{tool_name}**\n```\n{summary}\n```"
        )
        try:
            await bridge.publish(
                prompt,
                approval_id=approval_id,
                tool_name=tool_name,
                summary=summary,
                buttons=approval_buttons(),
            )
        except Exception:
            logger.exception("tool approval: publish failed")
            async with self._lock:
                self._pending.pop(approval_id, None)
            return ToolApprovalDecision.DENY

        try:
            if timeout_seconds and timeout_seconds > 0:
                return await asyncio.wait_for(future, timeout=timeout_seconds)
            return await future
        except asyncio.TimeoutError:
            async with self._lock:
                self._pending.pop(approval_id, None)
            if not future.done():
                future.cancel()
            return ToolApprovalDecision.DENY
        finally:
            async with self._lock:
                self._pending.pop(approval_id, None)


REGISTRY = ToolApprovalRegistry()
