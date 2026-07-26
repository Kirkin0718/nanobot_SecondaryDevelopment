"""Configuration for interactive tool approval (human-in-the-loop)."""

from __future__ import annotations

from nanobot.config_base import Base


class ToolApprovalConfig(Base):
    """Gate risky tool calls until the user approves via WebUI/TG/Slack chips."""

    enable: bool = True
    """When true, matching tools block until the user chooses approve / deny / stop."""

    timeout_seconds: int = 0
    """0 = wait indefinitely until the user responds."""
