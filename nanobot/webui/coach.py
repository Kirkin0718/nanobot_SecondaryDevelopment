"""Coach workspace helpers for WebUI progress, notes, and check-ins."""

from __future__ import annotations

import re
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from nanobot.session.goal_state import goal_state_raw, parse_goal_state, sustained_goal_active

_CHECKBOX_RE = re.compile(r"^\s*-\s*\[([ xX])\]\s+", re.MULTILINE)
_PATH_IN_TEXT_RE = re.compile(
    r"learning[/\\]([a-zA-Z0-9][a-zA-Z0-9_-]*)[/\\]path\.md",
    re.IGNORECASE,
)
_LEARNING_DIR_RE = re.compile(
    r"learning[/\\]([a-zA-Z0-9][a-zA-Z0-9_-]*)",
    re.IGNORECASE,
)


class CoachError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _safe_topic(raw: str) -> str | None:
    topic = raw.strip().strip("/\\")
    if not topic or ".." in topic or "/" in topic or "\\" in topic:
        return None
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]*", topic):
        return None
    return topic


def resolve_coach_topic(
    *,
    session_metadata: dict[str, Any] | None,
    workspace: Path,
) -> str | None:
    """Resolve learning topic slug for this session."""
    meta = session_metadata or {}
    coach = meta.get("coach")
    if isinstance(coach, dict):
        topic = coach.get("topic")
        if isinstance(topic, str):
            safe = _safe_topic(topic)
            if safe:
                return safe

    goal = parse_goal_state(goal_state_raw(meta))
    texts: list[str] = []
    if isinstance(goal, dict):
        for key in ("objective", "ui_summary"):
            val = goal.get(key)
            if isinstance(val, str) and val.strip():
                texts.append(val)

    active_path = workspace / "goals" / "active.md"
    if active_path.is_file():
        try:
            texts.append(active_path.read_text(encoding="utf-8"))
        except OSError:
            pass

    for text in texts:
        m = _PATH_IN_TEXT_RE.search(text)
        if m:
            return _safe_topic(m.group(1))
        m = _LEARNING_DIR_RE.search(text)
        if m:
            return _safe_topic(m.group(1))

    learning_root = workspace / "learning"
    if learning_root.is_dir():
        dirs = sorted(
            (p for p in learning_root.iterdir() if p.is_dir()),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for d in dirs:
            if (d / "path.md").is_file():
                return _safe_topic(d.name)
    return None


def parse_checkin_days(log_text: str, *, days: int = 7, today: date | None = None) -> list[str]:
    """Return ISO dates (newest window) that contain a check-in line."""
    anchor = today or date.today()
    wanted = {(anchor - timedelta(days=i)).isoformat() for i in range(max(1, days))}
    found: set[str] = set()
    for line in log_text.splitlines():
        if "打卡" not in line and "[x]" not in line.lower():
            continue
        for day in wanted:
            if day in line:
                found.add(day)
    return sorted(found)


def parse_path_progress(path_md: str) -> dict[str, Any]:
    done = 0
    total = 0
    for match in _CHECKBOX_RE.finditer(path_md):
        total += 1
        if match.group(1).lower() == "x":
            done += 1
    ratio = (done / total) if total else 0.0
    stage_label = ""
    for pattern in (
        r"^\s*-\s*\*\*Current stage\*\*:\s*(.+)$",
        r"^\s*\*\*Current stage\*\*:\s*(.+)$",
        r"Current stage:\s*(.+)$",
        r"当前阶段[：:]\s*(.+)$",
    ):
        m = re.search(pattern, path_md, re.MULTILINE | re.IGNORECASE)
        if m:
            stage_label = m.group(1).strip().strip("*").strip()
            break
    return {
        "done": done,
        "total": total,
        "ratio": round(ratio, 4),
        "stage_label": stage_label,
    }


def _topic_paths(workspace: Path, topic: str) -> dict[str, Path]:
    root = workspace / "learning" / topic
    return {
        "root": root,
        "path": root / "path.md",
        "notes": root / "notes.md",
        "log": root / "log.md",
    }


def _read_text(path: Path) -> str:
    if not path.is_file():
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise CoachError(500, f"failed to read {path.name}") from exc


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _safe_chat_slug(session_key: str | None) -> str | None:
    if not session_key or ":" not in session_key:
        return None
    chat_id = session_key.split(":", 1)[1].strip()
    if not chat_id:
        return None
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "_", chat_id).strip("_")
    return slug[:80] or None


def fallback_notes_rel(session_key: str | None) -> str | None:
    """When no learning topic is bound, store notes under goals/notes-{chat}.md."""
    slug = _safe_chat_slug(session_key)
    if not slug:
        return None
    return f"goals/notes-{slug}.md"


def resolve_notes_target(
    *,
    workspace: Path,
    session_metadata: dict[str, Any] | None,
    session_key: str | None = None,
) -> tuple[str | None, Path, str]:
    """Return ``(topic_or_none, absolute_path, relative_path)`` for notes storage."""
    topic = resolve_coach_topic(session_metadata=session_metadata, workspace=workspace)
    if topic:
        rel = f"learning/{topic}/notes.md"
        return topic, workspace / rel, rel
    rel = fallback_notes_rel(session_key)
    if not rel:
        raise CoachError(404, "no learning topic bound to this session")
    return None, workspace / rel, rel


_NOTES_PATH_ALLOW = re.compile(
    r"^(?:learning/[A-Za-z0-9._-]+/notes\.md|goals/notes-[A-Za-z0-9._-]+\.md)$"
)


def resolve_notes_write_target(
    *,
    workspace: Path,
    session_metadata: dict[str, Any] | None,
    session_key: str | None = None,
    path: str | None = None,
) -> tuple[str | None, Path, str]:
    """Resolve notes path; optional ``path`` must be an allow-listed notes file."""
    if path is None or path == "":
        return resolve_notes_target(
            workspace=workspace,
            session_metadata=session_metadata,
            session_key=session_key,
        )
    if not isinstance(path, str):
        raise CoachError(400, "path must be a string")
    rel = path.replace("\\", "/").lstrip("/")
    if ".." in rel.split("/") or not _NOTES_PATH_ALLOW.match(rel):
        raise CoachError(400, "invalid notes path")
    return None, workspace / rel, rel


def save_coach_notes(
    *,
    workspace: Path,
    session_metadata: dict[str, Any] | None,
    text: str,
    session_key: str | None = None,
    path: str | None = None,
) -> dict[str, Any]:
    if not isinstance(text, str):
        raise CoachError(400, "text must be a string")
    if len(text.encode("utf-8")) > 200_000:
        raise CoachError(400, "notes too large")
    _topic, abs_path, rel = resolve_notes_write_target(
        workspace=workspace,
        session_metadata=session_metadata,
        session_key=session_key,
        path=path,
    )
    _write_text(abs_path, text)
    return {"ok": True, "path": rel, "bytes": len(text.encode("utf-8"))}


def build_coach_payload(
    *,
    workspace: Path,
    session_metadata: dict[str, Any] | None,
    session_key: str | None = None,
) -> dict[str, Any]:
    active = sustained_goal_active(session_metadata)
    topic = resolve_coach_topic(session_metadata=session_metadata, workspace=workspace)
    goal = parse_goal_state(goal_state_raw(session_metadata))
    ui_summary = ""
    objective = ""
    if isinstance(goal, dict):
        if isinstance(goal.get("ui_summary"), str):
            ui_summary = goal["ui_summary"]
        if isinstance(goal.get("objective"), str):
            objective = goal["objective"]

    progress = {"done": 0, "total": 0, "ratio": 0.0, "stage_label": ""}
    notes = ""
    log_tail = ""
    paths: dict[str, str] = {}
    checked_in_today = False
    checkin_days: list[str] = []
    today_date = date.today()
    today = today_date.isoformat()

    if topic:
        p = _topic_paths(workspace, topic)
        paths = {
            "topic": topic,
            "path": f"learning/{topic}/path.md",
            "notes": f"learning/{topic}/notes.md",
            "log": f"learning/{topic}/log.md",
        }
        path_text = _read_text(p["path"])
        if path_text:
            progress = parse_path_progress(path_text)
        notes = _read_text(p["notes"])
        log_text = _read_text(p["log"])
        if log_text:
            lines = [ln for ln in log_text.splitlines() if ln.strip()]
            log_tail = "\n".join(lines[-12:])
            checked_in_today = any(today in ln and "打卡" in ln for ln in lines)
            checkin_days = parse_checkin_days(log_text, days=7, today=today_date)
    else:
        rel = fallback_notes_rel(session_key)
        if rel:
            paths = {"notes": rel}
            notes = _read_text(workspace / rel)

    return {
        "active": active,
        "ui_summary": ui_summary,
        "objective": objective,
        "topic": topic,
        "paths": paths,
        "progress": progress,
        "notes": notes,
        "log_tail": log_tail,
        "checked_in_today": checked_in_today,
        "checkin_days": checkin_days,
        "today": today,
    }


def append_coach_checkin(
    *,
    workspace: Path,
    session_metadata: dict[str, Any] | None,
    text: str | None = None,
) -> dict[str, Any]:
    topic = resolve_coach_topic(session_metadata=session_metadata, workspace=workspace)
    if not topic:
        raise CoachError(404, "no learning topic bound to this session")
    note = (text or "").strip()
    if len(note.encode("utf-8")) > 8_000:
        raise CoachError(400, "check-in note too large")
    today = date.today().isoformat()
    p = _topic_paths(workspace, topic)
    existing = _read_text(p["log"])
    entry = f"- [x] {today} 打卡"
    if note:
        entry = f"{entry} — {note}"
    lines = existing.splitlines() if existing else []
    # Replace same-day check-in line if present; else append.
    out: list[str] = []
    replaced = False
    for line in lines:
        if today in line and "打卡" in line:
            out.append(entry)
            replaced = True
        else:
            out.append(line)
    if not replaced:
        if out and out[-1].strip():
            out.append("")
        # Ensure a dated section header exists for readability.
        header = f"## {today}"
        if header not in out:
            if out and out[-1].strip():
                out.append("")
            out.append(header)
        out.append(entry)
    body = "\n".join(out).rstrip() + "\n"
    if not existing.strip():
        body = f"# Log — {topic}\n\n## {today}\n{entry}\n"
    _write_text(p["log"], body)
    return {
        "ok": True,
        "path": f"learning/{topic}/log.md",
        "today": today,
        "entry": entry,
        "replaced": replaced,
    }


def _notes_preview(text: str, *, limit: int = 240) -> str:
    compact = " ".join(line.strip() for line in text.splitlines() if line.strip())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 1].rstrip() + "…"


def build_coach_hub_payload(*, workspace: Path) -> dict[str, Any]:
    """Workspace-wide progress + notes collection for the coach hub UI."""
    topics: list[dict[str, Any]] = []
    learning_root = workspace / "learning"
    if learning_root.is_dir():
        dirs = sorted(
            (p for p in learning_root.iterdir() if p.is_dir()),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for d in dirs:
            topic = _safe_topic(d.name)
            if not topic:
                continue
            paths = _topic_paths(workspace, topic)
            path_text = _read_text(paths["path"])
            notes_text = _read_text(paths["notes"])
            log_text = _read_text(paths["log"])
            if not path_text and not notes_text and not log_text:
                continue
            progress = (
                parse_path_progress(path_text)
                if path_text
                else {"done": 0, "total": 0, "ratio": 0.0, "stage_label": ""}
            )
            mtime = max(
                (p.stat().st_mtime for p in paths.values() if p.is_file()),
                default=d.stat().st_mtime,
            )
            topics.append(
                {
                    "topic": topic,
                    "paths": {
                        "path": f"learning/{topic}/path.md",
                        "notes": f"learning/{topic}/notes.md",
                        "log": f"learning/{topic}/log.md",
                    },
                    "progress": progress,
                    "notes_preview": _notes_preview(notes_text) if notes_text else "",
                    "notes_bytes": len(notes_text.encode("utf-8")) if notes_text else 0,
                    "has_notes": bool(notes_text.strip()),
                    "has_path": bool(path_text.strip()),
                    "updated_at": int(mtime),
                }
            )

    orphan_notes: list[dict[str, Any]] = []
    goals_dir = workspace / "goals"
    if goals_dir.is_dir():
        for path in sorted(
            goals_dir.glob("notes-*.md"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        ):
            text = _read_text(path)
            if not text.strip():
                continue
            rel = f"goals/{path.name}"
            orphan_notes.append(
                {
                    "path": rel,
                    "notes_preview": _notes_preview(text),
                    "notes_bytes": len(text.encode("utf-8")),
                    "updated_at": int(path.stat().st_mtime),
                }
            )

    active_summary = ""
    active_path = workspace / "goals" / "active.md"
    if active_path.is_file():
        active_summary = _notes_preview(_read_text(active_path), limit=400)

    return {
        "topics": topics,
        "orphan_notes": orphan_notes,
        "active_goals_summary": active_summary,
        "topic_count": len(topics),
        "notes_count": sum(1 for t in topics if t["has_notes"]) + len(orphan_notes),
    }
