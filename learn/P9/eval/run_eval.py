#!/usr/bin/env python3
"""P9 coach eval runner (mock-first).

Usage (repo root):
  python learn/P9/eval/run_eval.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import time
import traceback
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EVAL_ROOT = Path(__file__).resolve().parent
CASES_DIR = EVAL_ROOT / "cases"
RESULTS_DIR = EVAL_ROOT / "results"

# Allow `python learn/P9/eval/run_eval.py` without PYTHONPATH hacks.
sys.path.insert(0, str(EVAL_ROOT))
from scope_budget import (  # noqa: E402
    NOTES_SCOPE_CHAR_LIMIT,
    build_scoped_chat_block,
    select_ids_within_budget,
)


def _long_messages(n: int = 40, body_len: int = 400) -> list[dict[str, str]]:
    body = "x" * body_len
    return [{"id": f"m{i}", "role": "user" if i % 2 == 0 else "assistant", "content": body} for i in range(n)]


@dataclass
class TurnLog:
    case_id: str
    tools: list[str] = field(default_factory=list)
    ok: bool = False
    failure_type: str | None = None
    latency_ms: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    detail: str = ""


class Workspace:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.tools: list[str] = []
        self.refused = False
        self.policy_blocked: list[str] = []
        self.last_send: dict[str, Any] | None = None
        self.visible_transcript: list[str] = []
        self.scope_result: dict[str, Any] | None = None
        self.selected_ids: set[str] | None = None

    def abspath(self, rel: str) -> Path:
        p = (self.root / rel).resolve()
        if not str(p).startswith(str(self.root.resolve())):
            raise ValueError(f"path escapes workspace: {rel}")
        return p

    def write(self, rel: str, content: str) -> None:
        path = self.abspath(rel)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def append(self, rel: str, content: str) -> None:
        path = self.abspath(rel)
        path.parent.mkdir(parents=True, exist_ok=True)
        prev = path.read_text(encoding="utf-8") if path.exists() else ""
        path.write_text(prev + content, encoding="utf-8")

    def read(self, rel: str) -> str:
        return self.abspath(rel).read_text(encoding="utf-8")


def materialize_setup(ws: Workspace, setup: dict[str, str]) -> None:
    for rel, content in (setup or {}).items():
        ws.write(rel, content)


def run_script(ws: Workspace, script: list[dict[str, Any]]) -> None:
    for step in script:
        op = step["op"]
        if op == "ensure_dir":
            ws.abspath(step["path"]).mkdir(parents=True, exist_ok=True)
        elif op == "write_file":
            ws.write(step["path"], step["content"])
        elif op == "append_file":
            ws.append(step["path"], step["content"])
        elif op == "record_tool":
            ws.tools.append(step["name"])
        elif op == "refuse":
            ws.refused = True
        elif op == "count_active_goals":
            text = ws.read(step["path"])
            # Count markdown numbered goals like "1. **slug**"
            count = len(re.findall(r"(?m)^\d+\.\s+\*\*", text))
            if count > int(step["max"]):
                raise AssertionError(f"active goals {count} > max {step['max']}")
        elif op == "policy_check":
            action = step["action"]
            consented = bool(step.get("user_consented"))
            awaiting = bool(step.get("awaiting_user"))
            if action == "exec_install" and not consented:
                ws.policy_blocked.append(action)
            elif action == "complete_goal" and (not consented or awaiting):
                ws.policy_blocked.append(action)
            else:
                # Would allow — but safety cases should not reach here with bad flags.
                pass
        elif op == "scope_select":
            msgs = _long_messages() if step.get("messages") == "auto_long" else step["messages"]
            limit = int(step.get("limit", NOTES_SCOPE_CHAR_LIMIT))
            max_count = int(step.get("max_count", 24))
            ws.selected_ids = select_ids_within_budget(msgs, limit=limit, max_count=max_count)
            built = build_scoped_chat_block(msgs, ws.selected_ids, limit=limit)
            ws.scope_result = built
        elif op == "scope_build":
            msgs = _long_messages() if step.get("messages") == "auto_long" else step["messages"]
            limit = int(step.get("limit", NOTES_SCOPE_CHAR_LIMIT))
            if step.get("select_all"):
                selected = {m["id"] for m in msgs}
            else:
                selected = select_ids_within_budget(msgs, limit=limit)
            ws.scope_result = build_scoped_chat_block(msgs, selected, limit=limit)
        elif op == "ui_send":
            hidden = bool(step.get("hidden_history"))
            content = step.get("content", "")
            ws.last_send = {"content": content, "hidden_history": hidden}
            if not hidden:
                ws.visible_transcript.append(content)
        else:
            raise ValueError(f"unknown op: {op}")


def check_expect(ws: Workspace, expect: dict[str, Any]) -> None:
    for item in expect.get("files_contain") or []:
        text = ws.read(item["path"])
        if item["text"] not in text:
            raise AssertionError(f"{item['path']} missing {item['text']!r}")

    for rel in expect.get("files_not_exist") or []:
        if ws.abspath(rel).exists():
            raise AssertionError(f"file should not exist: {rel}")

    for name in expect.get("tools_used") or []:
        if name not in ws.tools:
            raise AssertionError(f"missing tool in trail: {name}")

    for name in expect.get("tools_forbidden") or []:
        if name in ws.tools:
            raise AssertionError(f"forbidden tool used: {name}")

    if expect.get("refused") is True and not ws.refused:
        raise AssertionError("expected refuse")

    for action in expect.get("policy_blocked") or []:
        if action not in ws.policy_blocked:
            raise AssertionError(f"expected policy block: {action}")

    if "scope_selected_max_chars" in expect:
        if not ws.scope_result:
            raise AssertionError("no scope_result")
        if len(ws.scope_result["text"]) > int(expect["scope_selected_max_chars"]):
            raise AssertionError("selected scope text exceeds budget")

    if expect.get("scope_truncated_ok") is True:
        if not ws.scope_result:
            raise AssertionError("no scope_result")
        # With auto_long messages, selection or build should stay under limit;
        # truncated flag may be false if selection already fits.
        if len(ws.scope_result["text"]) > NOTES_SCOPE_CHAR_LIMIT:
            raise AssertionError("scope text over hard cap")

    if "scope_text_max_chars" in expect:
        if not ws.scope_result:
            raise AssertionError("no scope_result")
        if len(ws.scope_result["text"]) > int(expect["scope_text_max_chars"]):
            raise AssertionError("scoped text exceeds max")

    if "scope_truncated" in expect:
        if not ws.scope_result:
            raise AssertionError("no scope_result")
        if bool(ws.scope_result["truncated"]) != bool(expect["scope_truncated"]):
            raise AssertionError(
                f"truncated={ws.scope_result['truncated']} expected {expect['scope_truncated']}"
            )

    if "last_send_hidden_history" in expect:
        if not ws.last_send:
            raise AssertionError("no ui send")
        if bool(ws.last_send.get("hidden_history")) != bool(expect["last_send_hidden_history"]):
            raise AssertionError("hiddenHistory mismatch")

    for needle in expect.get("visible_transcript_excludes") or []:
        if any(needle in line for line in ws.visible_transcript):
            raise AssertionError(f"visible transcript contains {needle!r}")


def run_case(case: dict[str, Any]) -> TurnLog:
    started = time.perf_counter()
    log = TurnLog(case_id=case["id"])
    # Mock token estimate: prompt chars / 4
    log.prompt_tokens = max(1, len(case.get("prompt") or "") // 4)
    log.completion_tokens = 32
    try:
        with tempfile.TemporaryDirectory(prefix=f"p9eval-{case['id']}-") as tmp:
            ws = Workspace(Path(tmp))
            materialize_setup(ws, case.get("setup") or {})
            run_script(ws, case.get("script") or [])
            log.tools = list(ws.tools)
            check_expect(ws, case.get("expect") or {})
            log.ok = True
    except Exception as exc:  # noqa: BLE001 — collect into report
        log.ok = False
        log.failure_type = case.get("failure_type_on_fail") or "assert_error"
        # Refine taxonomy for missing tools
        msg = str(exc)
        if "missing tool" in msg:
            log.failure_type = "missing_tool"
        log.detail = f"{exc}\n{traceback.format_exc()}"
    log.latency_ms = int((time.perf_counter() - started) * 1000)
    return log


def percentile(values: list[int], p: float) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, int(round((p / 100) * (len(ordered) - 1)))))
    return ordered[idx]


def write_reports(logs: list[TurnLog], mode: str) -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    passed = sum(1 for x in logs if x.ok)
    total = len(logs)
    pass_rate = (passed / total) if total else 0.0
    failures = Counter(x.failure_type for x in logs if not x.ok and x.failure_type)
    latencies = [x.latency_ms for x in logs]
    prompt_tokens = sum(x.prompt_tokens for x in logs)
    completion_tokens = sum(x.completion_tokens for x in logs)
    # Rough cost estimate assuming $0.15 / 1M input, $0.60 / 1M output (illustrative)
    cost_usd = (prompt_tokens * 0.15 + completion_tokens * 0.60) / 1_000_000

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "total": total,
        "passed": passed,
        "pass_rate": round(pass_rate, 4),
        "failure_types": dict(failures),
        "latency_ms": {
            "p50": percentile(latencies, 50),
            "p95": percentile(latencies, 95),
            "max": max(latencies) if latencies else 0,
        },
        "tokens": {
            "prompt": prompt_tokens,
            "completion": completion_tokens,
            "est_cost_usd": round(cost_usd, 6),
        },
        "cases": [
            {
                "id": x.case_id,
                "ok": x.ok,
                "failure_type": x.failure_type,
                "latency_ms": x.latency_ms,
                "tools": x.tools,
                "prompt_tokens": x.prompt_tokens,
                "completion_tokens": x.completion_tokens,
                "detail": x.detail[:2000] if x.detail else "",
            }
            for x in logs
        ],
    }
    (RESULTS_DIR / "latest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    lines = [
        "# P9 Eval Report",
        "",
        f"- Generated: `{payload['generated_at']}`",
        f"- Mode: **{mode}**",
        f"- Pass rate: **{passed}/{total}** ({pass_rate:.1%})",
        f"- Latency ms: p50={payload['latency_ms']['p50']}, p95={payload['latency_ms']['p95']}, max={payload['latency_ms']['max']}",
        f"- Tokens: prompt={prompt_tokens}, completion={completion_tokens}, est_cost_usd≈{cost_usd:.6f}",
        "",
        "## Failure types",
        "",
    ]
    if failures:
        for name, count in failures.most_common():
            lines.append(f"- `{name}`: {count}")
    else:
        lines.append("- (none)")
    lines.extend(["", "## Cases", ""])
    for x in logs:
        status = "PASS" if x.ok else f"FAIL ({x.failure_type})"
        lines.append(f"- `{x.case_id}`: {status} — {x.latency_ms}ms — tools={x.tools}")
    lines.append("")
    (RESULTS_DIR / "latest.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    mode = (os.environ.get("P9_EVAL_MODE") or "mock").lower()
    if mode == "live":
        print(
            "P9_EVAL_MODE=live is reserved; running mock harness "
            "(live LLM wiring can be added once API keys are available).",
            file=sys.stderr,
        )
        mode = "mock"

    cases: list[dict[str, Any]] = []
    for path in sorted(CASES_DIR.glob("*.json")):
        cases.append(json.loads(path.read_text(encoding="utf-8")))
    if not cases:
        print("No cases found", file=sys.stderr)
        return 2

    logs = [run_case(c) for c in cases]
    write_reports(logs, mode=mode)
    passed = sum(1 for x in logs if x.ok)
    print(f"P9 eval: {passed}/{len(logs)} passed → {RESULTS_DIR / 'latest.md'}")
    return 0 if passed == len(logs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
