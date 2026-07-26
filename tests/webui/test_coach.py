"""Tests for WebUI coach progress / notes / check-in helpers."""

from __future__ import annotations

from pathlib import Path

import pytest

from nanobot.webui.coach import (
    CoachError,
    append_coach_checkin,
    build_coach_hub_payload,
    build_coach_payload,
    parse_checkin_days,
    parse_path_progress,
    resolve_coach_topic,
    save_coach_notes,
)


def test_parse_path_progress_counts_checkboxes() -> None:
    md = """# Path
- **Current stage**: 1 / 4 — Basics
- [x] done one
- [ ] todo two
- [X] done three
"""
    progress = parse_path_progress(md)
    assert progress["done"] == 2
    assert progress["total"] == 3
    assert progress["ratio"] == pytest.approx(2 / 3, rel=1e-3)
    assert "1 / 4" in progress["stage_label"]


def test_parse_checkin_days_window() -> None:
    from datetime import date

    log = """# Log
## 2026-07-22
- [x] 2026-07-22 打卡
## 2026-07-24
- [x] 2026-07-24 打卡 — JDK
"""
    days = parse_checkin_days(log, days=7, today=date(2026, 7, 24))
    assert days == ["2026-07-22", "2026-07-24"]


def test_resolve_topic_from_goal_objective(tmp_path: Path) -> None:
    topic = resolve_coach_topic(
        session_metadata={
            "goal_state": {
                "status": "active",
                "objective": "Learn Java; path at learning/java-basics/path.md",
                "ui_summary": "Java",
            }
        },
        workspace=tmp_path,
    )
    assert topic == "java-basics"


def test_resolve_topic_from_coach_metadata(tmp_path: Path) -> None:
    topic = resolve_coach_topic(
        session_metadata={"coach": {"topic": "python-da"}},
        workspace=tmp_path,
    )
    assert topic == "python-da"


def test_build_payload_and_notes_checkin(tmp_path: Path) -> None:
    learning = tmp_path / "learning" / "java-basics"
    learning.mkdir(parents=True)
    (learning / "path.md").write_text(
        "# Path\n- **Current stage**: 1 / 4 — Syntax\n- [x] a\n- [ ] b\n",
        encoding="utf-8",
    )
    meta = {
        "goal_state": {
            "status": "active",
            "objective": "learning/java-basics/path.md",
            "ui_summary": "Java basics",
        },
        "coach": {"topic": "java-basics"},
    }
    payload = build_coach_payload(workspace=tmp_path, session_metadata=meta)
    assert payload["active"] is True
    assert payload["topic"] == "java-basics"
    assert payload["progress"]["done"] == 1
    assert payload["progress"]["total"] == 2
    assert payload["notes"] == ""

    saved = save_coach_notes(workspace=tmp_path, session_metadata=meta, text="# Notes\nhello")
    assert saved["ok"] is True
    assert (learning / "notes.md").read_text(encoding="utf-8") == "# Notes\nhello"

    checkin = append_coach_checkin(
        workspace=tmp_path,
        session_metadata=meta,
        text="装好了 JDK",
    )
    assert checkin["ok"] is True
    log_text = (learning / "log.md").read_text(encoding="utf-8")
    assert "打卡" in log_text
    assert "装好了 JDK" in log_text

    payload2 = build_coach_payload(workspace=tmp_path, session_metadata=meta)
    assert payload2["checked_in_today"] is True
    assert "hello" in payload2["notes"]
    assert payload2["today"] in payload2["checkin_days"]


def test_save_notes_requires_topic(tmp_path: Path) -> None:
    with pytest.raises(CoachError) as exc:
        save_coach_notes(workspace=tmp_path, session_metadata={}, text="x")
    assert exc.value.status == 404


def test_save_notes_fallback_without_topic(tmp_path: Path) -> None:
    meta = {
        "goal_state": {
            "status": "active",
            "objective": "generic goal without path",
            "ui_summary": "Goal",
        }
    }
    saved = save_coach_notes(
        workspace=tmp_path,
        session_metadata=meta,
        text="fallback notes",
        session_key="websocket:chat-abc",
    )
    assert saved["ok"] is True
    assert saved["path"] == "goals/notes-chat-abc.md"
    assert (tmp_path / "goals" / "notes-chat-abc.md").read_text(encoding="utf-8") == "fallback notes"

    payload = build_coach_payload(
        workspace=tmp_path,
        session_metadata=meta,
        session_key="websocket:chat-abc",
    )
    assert payload["topic"] is None
    assert payload["paths"]["notes"] == "goals/notes-chat-abc.md"
    assert payload["notes"] == "fallback notes"


def test_save_notes_explicit_path_allowlist(tmp_path: Path) -> None:
    from nanobot.webui.coach import resolve_notes_write_target

    topic_dir = tmp_path / "learning" / "other-topic"
    topic_dir.mkdir(parents=True)
    (topic_dir / "notes.md").write_text("old", encoding="utf-8")
    saved = save_coach_notes(
        workspace=tmp_path,
        session_metadata={},
        text="# hub notes",
        session_key="websocket:chat-1",
        path="learning/other-topic/notes.md",
    )
    assert saved["path"] == "learning/other-topic/notes.md"
    assert (topic_dir / "notes.md").read_text(encoding="utf-8") == "# hub notes"

    with pytest.raises(CoachError) as exc:
        resolve_notes_write_target(
            workspace=tmp_path,
            session_metadata={},
            path="../secrets.txt",
        )
    assert exc.value.status == 400


def test_build_coach_hub_lists_topics_and_orphan_notes(tmp_path: Path) -> None:
    learning = tmp_path / "learning" / "java-basics"
    learning.mkdir(parents=True)
    (learning / "path.md").write_text(
        "# Path\n- **Current stage**: 2 / 4 — Loops\n- [x] a\n- [ ] b\n",
        encoding="utf-8",
    )
    (learning / "notes.md").write_text("# Notes\nremember loops\n", encoding="utf-8")
    goals = tmp_path / "goals"
    goals.mkdir(parents=True)
    (goals / "active.md").write_text("- Java basics\n", encoding="utf-8")
    (goals / "notes-orphan.md").write_text("session only notes\n", encoding="utf-8")

    hub = build_coach_hub_payload(workspace=tmp_path)
    assert hub["topic_count"] == 1
    assert hub["notes_count"] == 2
    assert hub["topics"][0]["topic"] == "java-basics"
    assert hub["topics"][0]["progress"]["done"] == 1
    assert "remember loops" in hub["topics"][0]["notes_preview"]
    assert hub["orphan_notes"][0]["path"] == "goals/notes-orphan.md"
    assert "Java basics" in hub["active_goals_summary"]

