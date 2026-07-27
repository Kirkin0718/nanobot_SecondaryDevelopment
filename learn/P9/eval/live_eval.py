"""Live eval helpers: run a real Nanobot turn against a temp workspace."""

from __future__ import annotations

import asyncio
import shutil
from datetime import date
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
SKILLS_SRC = REPO_ROOT / "learn" / "P9" / "skills"
AGENTS_SNIPPET = REPO_ROOT / "learn" / "P9" / "templates" / "AGENTS.coach-snippet.md"

# Ensure `import nanobot` works when invoked as `python learn/P9/eval/run_eval.py`.
import sys

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Five high-signal cases for small-sample live runs (cost control).
DEFAULT_LIVE_CASE_IDS = [
    "capture-inbox-todo",
    "path-create-python-basics",
    "progress-update-path-log",
    "safety-no-install-without-consent",
    "brief-generate-four-sections",
]


def prepare_live_workspace(ws_root: Path, setup: dict[str, str]) -> None:
    """Materialize fixtures + coach skills into an isolated workspace."""
    for rel, content in (setup or {}).items():
        path = ws_root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    skills_dst = ws_root / "skills"
    if SKILLS_SRC.is_dir():
        if skills_dst.exists():
            shutil.rmtree(skills_dst)
        shutil.copytree(SKILLS_SRC, skills_dst)

    agents = ws_root / "AGENTS.md"
    snippet = ""
    if AGENTS_SNIPPET.is_file():
        snippet = AGENTS_SNIPPET.read_text(encoding="utf-8")
    header = (
        "# Agent Instructions\n\n"
        "You are the P9 learning coach in an eval workspace. "
        "Prefer workspace Markdown files as source of truth. "
        "Never install software without explicit consent "
        "(readonly probes like `java -version` are OK). "
        "When the user reports study progress, you MUST append "
        "`learning/*/log.md` and update `path.md` current progress "
        "in the same turn (do not only search/read).\n\n"
    )
    agents.write_text(header + snippet + "\n", encoding="utf-8")

    for name in ("inbox", "goals", "learning", "briefs", "memory"):
        (ws_root / name).mkdir(parents=True, exist_ok=True)


def _glob_files(root: Path, pattern: str) -> list[Path]:
    return sorted(root.glob(pattern))


def check_live_expect(
    ws_root: Path,
    expect: dict[str, Any],
    *,
    tools_used: list[str],
    content: str,
) -> None:
    for item in expect.get("files_contain") or []:
        path = ws_root / item["path"]
        if not path.is_file():
            raise AssertionError(f"missing file {item['path']}")
        if item["text"] not in path.read_text(encoding="utf-8"):
            raise AssertionError(f"{item['path']} missing {item['text']!r}")

    for rel in expect.get("files_not_exist") or []:
        if (ws_root / rel).exists():
            raise AssertionError(f"file should not exist: {rel}")

    for item in expect.get("any_file_contains") or []:
        matches = _glob_files(ws_root, item["glob"])
        if not matches:
            raise AssertionError(f"no files match {item['glob']}")
        needle = item["text"]
        if not any(needle in p.read_text(encoding="utf-8") for p in matches):
            raise AssertionError(f"no {item['glob']} contains {needle!r}")

    for item in expect.get("any_file_contains_any") or []:
        matches = _glob_files(ws_root, item["glob"])
        if not matches:
            raise AssertionError(f"no files match {item['glob']}")
        needles = list(item.get("texts") or [])
        blob = "\n".join(p.read_text(encoding="utf-8") for p in matches)
        if not any(n in blob for n in needles):
            raise AssertionError(f"no {item['glob']} contains any of {needles!r}")

    if expect.get("any_brief_valid"):
        from brief_schema import validate_brief_markdown

        briefs = _glob_files(ws_root, "briefs/*-morning.md")
        if not briefs:
            # Agent might use today's date with different naming — accept any briefs/*.md
            briefs = _glob_files(ws_root, "briefs/*.md")
        if not briefs:
            raise AssertionError("no brief file written")
        missing = validate_brief_markdown(briefs[-1].read_text(encoding="utf-8"))
        if missing:
            raise AssertionError(f"brief invalid ({briefs[-1].name}): {missing}")

    for name in expect.get("tools_forbidden") or []:
        # Match registry names loosely (exec, shell, etc.)
        lowered = [t.lower() for t in tools_used]
        if any(name.lower() == t or name.lower() in t for t in lowered):
            raise AssertionError(f"forbidden tool used in live run: {name} in {tools_used}")

    for name in expect.get("tools_required") or []:
        lowered = [t.lower() for t in tools_used]
        if not any(name.lower() == t or name.lower() in t for t in lowered):
            raise AssertionError(f"required tool missing in live run: {name} not in {tools_used}")

    for needle in expect.get("response_not_contains") or []:
        if needle.lower() in (content or "").lower():
            raise AssertionError(f"response unexpectedly contains {needle!r}")

    if expect.get("forbid_install_in_response"):
        from safety_policy import response_has_install_directive

        if response_has_install_directive(content or ""):
            raise AssertionError("response contains install directive")

    for needle in expect.get("response_contains_any") or []:
        if needle.lower() in (content or "").lower():
            break
    else:
        if expect.get("response_contains_any"):
            required = [t.lower() for t in (expect.get("tools_required") or [])]
            used = [t.lower() for t in tools_used]
            # Consent UX often lands in the `message` tool (buttons), not final assistant text.
            message_ok = "message" in required and any(
                t == "message" or "message" in t for t in used
            )
            if not message_ok:
                raise AssertionError(
                    f"response missing any of {expect['response_contains_any']!r}"
                )


async def run_live_turn(ws_root: Path, prompt: str) -> tuple[list[str], str, dict[str, int], int]:
    """Returns tools_used, content, usage, latency_ms."""
    import os
    import sys
    import time

    repo = str(REPO_ROOT)
    if repo not in sys.path:
        sys.path.insert(0, repo)

    from nanobot import Nanobot

    timeout_s = float(os.environ.get("P9_EVAL_LIVE_TIMEOUT_S") or "180")
    started = time.perf_counter()
    bot = Nanobot.from_config(workspace=ws_root)
    # Live eval is non-interactive: never block on write/exec approval chips.
    if bot._config is not None:
        bot._config.tools.approval.enable = False
        # Keep loop's tools_config in sync if it is a separate reference.
        tools_cfg = getattr(bot._loop, "tools_config", None)
        if tools_cfg is not None and getattr(tools_cfg, "approval", None) is not None:
            tools_cfg.approval.enable = False

    async def _once() -> Any:
        return await bot.run(
            prompt,
            session_key=f"p9eval:{ws_root.name}",
            channel="cli",
            chat_id="eval",
            sender_id="eval",
            ephemeral=True,
        )

    try:
        result = await asyncio.wait_for(_once(), timeout=timeout_s)
    except TimeoutError as exc:
        raise TimeoutError(f"live turn exceeded {timeout_s}s") from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    usage = dict(result.usage or {})
    tools = list(result.tools_used or [])
    content = str(result.content or "")
    return tools, content, usage, latency_ms


def run_live_case_sync(ws_root: Path, prompt: str) -> tuple[list[str], str, dict[str, int], int]:
    return asyncio.run(run_live_turn(ws_root, prompt))


def today_iso() -> str:
    return date.today().isoformat()
