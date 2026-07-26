"""Configuration for silent wait-after-choice on sustained goals."""

from __future__ import annotations

from pydantic import AliasChoices, Field

from nanobot.config_base import Base


class GoalAwaitConfig(Base):
    """When the agent offers choices and waits for the user to reply or click."""

    timeout_minutes: float = Field(
        default=3.0,
        ge=0,
        validation_alias=AliasChoices(
            "timeoutMinutes",
            "timeout_minutes",
            "timeout",
        ),
        serialization_alias="timeoutMinutes",
    )
    """Minutes to wait silently after offering choices. ``0`` disables auto-end."""
