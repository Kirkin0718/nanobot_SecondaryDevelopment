"""Tests for interactive tool approval gating."""

from __future__ import annotations

import asyncio

import pytest

from nanobot.agent.tool_approval import (
    REGISTRY,
    ToolApprovalDecision,
    label_to_decision,
    tool_requires_approval,
)


def test_tool_requires_approval_write_and_exec() -> None:
    assert tool_requires_approval("write_file", {"path": "a.txt"})
    assert tool_requires_approval("exec", {"command": "winget install x"})
    assert not tool_requires_approval("read_file", {"path": "a.txt"})
    assert not tool_requires_approval("apply_patch", {"dry_run": True})


def test_label_to_decision_zh() -> None:
    assert label_to_decision("同意修改") is ToolApprovalDecision.APPROVE
    assert label_to_decision("拒绝修改") is ToolApprovalDecision.DENY
    assert label_to_decision("终止进程") is ToolApprovalDecision.STOP


@pytest.mark.asyncio
async def test_wait_until_user_resolves() -> None:
    session_key = "websocket:test-chat"

    async def publish(
        _content: str,
        *,
        approval_id: str,
        tool_name: str,
        summary: str,
        buttons: list[list[str]],
    ) -> None:
        await REGISTRY.resolve(approval_id, ToolApprovalDecision.APPROVE)

    REGISTRY.register_turn_bridge(session_key, publish=publish)
    try:
        decision = await REGISTRY.wait_for_approval(
            session_key=session_key,
            tool_name="write_file",
            summary="write_file: notes.md",
        )
    finally:
        REGISTRY.unregister_turn_bridge(session_key)
    assert decision is ToolApprovalDecision.APPROVE


@pytest.mark.asyncio
async def test_no_bridge_auto_approves() -> None:
    decision = await REGISTRY.wait_for_approval(
        session_key="websocket:missing",
        tool_name="exec",
        summary="exec: rm -rf /",
    )
    assert decision is ToolApprovalDecision.APPROVE
