"""Tests for silent goal-await timeout."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from nanobot.agent.tools.goal_await_config import GoalAwaitConfig
from nanobot.bus.events import OutboundMessage
from nanobot.config.schema import ToolsConfig
from nanobot.session.goal_state import (
    GOAL_STATE_KEY,
    goal_awaiting_user,
    set_goal_awaiting_user,
)


def test_goal_await_config_defaults_and_alias():
    cfg = GoalAwaitConfig()
    assert cfg.timeout_minutes == 3.0

    tools = ToolsConfig.model_validate({"goalAwait": {"timeoutMinutes": 5}})
    assert tools.goal_await.timeout_minutes == 5.0


@pytest.mark.asyncio
async def test_goal_await_timeout_ends_wait_and_notifies(monkeypatch):
    from nanobot.agent.loop import AgentLoop

    published: list[OutboundMessage] = []

    loop = object.__new__(AgentLoop)
    loop.tools_config = SimpleNamespace(goal_await=GoalAwaitConfig(timeout_minutes=0.001))
    loop._goal_await_timers = {}
    loop._pending_queues = {}
    loop.bus = SimpleNamespace(publish_outbound=AsyncMock(side_effect=published.append))
    loop.sessions = SimpleNamespace(
        get_or_create=lambda key: SimpleNamespace(
            key=key,
            metadata={GOAL_STATE_KEY: {"status": "active", "objective": "x", "awaiting_user": True}},
        ),
        save=lambda session: None,
    )
    loop._cancel_active_tasks = AsyncMock(return_value=0)

    # Force an immediate timeout path without sleeping a full minute scale.
    async def _immediate_timeout(session_key, *, channel, chat_id, minutes, metadata):
        session = loop.sessions.get_or_create(session_key)
        assert goal_awaiting_user(session.metadata)
        set_goal_awaiting_user(session.metadata, False)
        await loop._cancel_active_tasks(session_key)
        await loop.bus.publish_outbound(
            OutboundMessage(
                channel=channel,
                chat_id=chat_id,
                content=f"已等待 {minutes:g} 分钟无操作，本次等待已结束。需要时直接回复或点选选项继续。",
                metadata=metadata,
            )
        )

    monkeypatch.setattr(loop, "_goal_await_timeout", _immediate_timeout)

    loop._arm_goal_await_timer(
        "websocket:c1",
        channel="websocket",
        chat_id="c1",
        metadata={"webui": True},
    )
    task = loop._goal_await_timers["websocket:c1"]
    await task

    assert len(published) == 1
    assert "本次等待已结束" in published[0].content
    assert published[0].channel == "websocket"
    loop._cancel_active_tasks.assert_awaited_once_with("websocket:c1")


@pytest.mark.asyncio
async def test_goal_await_timer_cancelled_on_user_resume():
    from nanobot.agent.loop import AgentLoop

    loop = object.__new__(AgentLoop)
    loop.tools_config = SimpleNamespace(goal_await=GoalAwaitConfig(timeout_minutes=30))
    loop._goal_await_timers = {}

    async def _never():
        await asyncio.sleep(3600)

    task = asyncio.create_task(_never())
    loop._goal_await_timers["websocket:c1"] = task
    loop._cancel_goal_await_timer("websocket:c1")
    await asyncio.sleep(0)
    assert task.cancelled() or task.done()
    assert "websocket:c1" not in loop._goal_await_timers
