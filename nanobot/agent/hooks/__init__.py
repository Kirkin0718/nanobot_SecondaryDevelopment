"""Concrete agent hook implementations."""

from nanobot.agent.hooks.file_edit_activity import (
    FileEditActivityHook,
    create_file_edit_activity_hook,
)
from nanobot.agent.hooks.tool_approval import create_tool_approval_hook

DEFAULT_TURN_HOOK_FACTORIES = [
    create_file_edit_activity_hook,
    create_tool_approval_hook,
]

__all__ = [
    "FileEditActivityHook",
    "create_file_edit_activity_hook",
    "create_tool_approval_hook",
    "DEFAULT_TURN_HOOK_FACTORIES",
]
