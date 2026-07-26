"""Morning brief structure + heartbeat notify policy for eval."""

from __future__ import annotations

import re
from pathlib import Path

REQUIRED_HEADINGS = (
    "## 今日重点",
    "## 长期目标进度",
    "## 昨日碎片归档",
    "## 今日建议动作",
)


def validate_brief_markdown(text: str) -> list[str]:
    """Return list of missing required pieces (empty = ok)."""
    missing: list[str] = []
    if not re.search(r"(?m)^#\s*晨间简报\b", text):
        missing.append("title:# 晨间简报")
    for h in REQUIRED_HEADINGS:
        if h not in text:
            missing.append(h)
    return missing


def should_notify_user(
    *,
    has_active_goals: bool,
    unprocessed_inbox: int,
    has_path_today: bool,
) -> bool:
    """HEARTBEAT quiet rule: notify only when there is something actionable."""
    return bool(has_active_goals or unprocessed_inbox > 0 or has_path_today)


def count_unprocessed_inbox(inbox_text: str) -> int:
    return len(re.findall(r"(?m)^-\s+\[\s\]\s+", inbox_text))


def has_active_goals(goals_text: str) -> bool:
    if re.search(r"(?i)\(none", goals_text):
        return False
    return bool(re.search(r"(?m)^\d+\.\s+\*\*", goals_text))


def path_has_today_items(path_text: str) -> bool:
    # Look for unchecked items under a Today-ish section
    if re.search(r"(?im)^##\s*today\b|^##\s*今日", path_text):
        return bool(re.search(r"(?m)^-\s+\[[ xX]\]\s+\S+", path_text))
    return bool(re.search(r"(?m)^-\s+\[\s\]\s+\S+", path_text))


def render_brief(
    *,
    date: str,
    focus: list[str],
    goals: list[str],
    archive: list[str],
    actions: list[str],
) -> str:
    def bullets(items: list[str], numbered: bool) -> str:
        if numbered:
            return "\n".join(f"{i}. {t}" for i, t in enumerate(items[:3], 1))
        return "\n".join(f"- {t}" for t in items[:5])

    return (
        f"# 晨间简报 {date}\n\n"
        f"## 今日重点\n\n{bullets(focus, True)}\n\n"
        f"## 长期目标进度\n\n{bullets(goals, False)}\n\n"
        f"## 昨日碎片归档\n\n{bullets(archive, False)}\n\n"
        f"## 今日建议动作\n\n{bullets(actions, True)}\n\n"
        f"---\n\n_由 morning-brief 生成。_\n"
    )


def brief_path_for(date: str) -> str:
    return f"briefs/{date}-morning.md"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""
