"""Hook that blocks risky tools until the user approves."""

from __future__ import annotations

from typing import Any

from nanobot.agent.hook import AgentHook, AgentHookContext, AgentTurnHookContext
from nanobot.agent.tool_approval import (
    REGISTRY,
    ToolApprovalDecision,
    summarize_tool_call,
    tool_requires_approval,
)
from nanobot.agent.tools.approval_config import ToolApprovalConfig
from nanobot.providers.base import ToolCallRequest


class ToolApprovalHook(AgentHook):
    def __init__(
        self,
        *,
        config: ToolApprovalConfig,
        session_key: str | None,
    ) -> None:
        super().__init__()
        self._config = config
        self._session_key = session_key or ""

    async def before_execute_tool(
        self,
        context: AgentHookContext,
        tool_call: ToolCallRequest,
        tool: Any,
        params: Any,
    ) -> None:
        if not self._config.enable or not self._session_key:
            return
        if not tool_requires_approval(tool_call.name, params):
            return

        summary = summarize_tool_call(tool_call.name, params)
        decision = await REGISTRY.wait_for_approval(
            session_key=self._session_key,
            tool_name=tool_call.name,
            summary=summary,
            timeout_seconds=self._config.timeout_seconds,
        )
        if decision is ToolApprovalDecision.APPROVE:
            return
        if decision is ToolApprovalDecision.STOP:
            context.stop_reason = "cancelled"
            context.pending_tool_block = _block(
                "用户选择终止进程；已取消本次工具执行并停止当前回合。",
                stop_turn=True,
            )
            return
        context.pending_tool_block = _block(
            "用户拒绝修改；已跳过该工具，未对文件或系统做任何更改。",
            stop_turn=False,
        )


def _block(message: str, *, stop_turn: bool) -> Any:
    from nanobot.agent.hook import ToolBlock

    return ToolBlock(message=message, stop_turn=stop_turn)


def create_tool_approval_hook(context: AgentTurnHookContext) -> AgentHook | None:
    cfg = context.metadata.get("_tool_approval_config")
    if not isinstance(cfg, ToolApprovalConfig) or not cfg.enable:
        return None
    session_key = context.session_key or context.metadata.get("session_key")
    if not isinstance(session_key, str) or not session_key:
        return None
    return ToolApprovalHook(config=cfg, session_key=session_key)
