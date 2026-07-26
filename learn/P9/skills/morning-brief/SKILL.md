---
name: morning-brief
description: Generate daily morning brief from inbox, goals, learning paths, and memory — write briefs/YYYY-MM-DD-morning.md.
---

# Morning Brief（晨间简报）

Use when:

- **HEARTBEAT.md** lists a morning brief task
- User asks: 「今日简报」「morning brief」「今天干什么」「总结一下今天要做的」
- Cron message explicitly requests morning brief

## Output

Write **`briefs/YYYY-MM-DD-morning.md`** (workspace local date).

**Idempotency**: If the file already exists for today, **overwrite/update** it (same path, single file). Do not create `briefs/...-morning-2.md`. HEARTBEAT must not re-notify within ~1 hour when the file is already fresh — see [`brief-ops.md`](../../brief-ops.md).

**Keep total length readable in ≤ 3 minutes** (~300–500 Chinese characters or equivalent).

## Required sections (in order)

```markdown
# 晨间简报 YYYY-MM-DD

## 今日重点
1. …
2. …
(max 3 bullets)

## 长期目标进度
- **[办公/学习] {title}**: stage X/N — one line status

## 昨日碎片归档
- … (from inbox [x] items or memory; if none: 「无待归档」)

## 今日建议动作
1. …
2. …
(max 3 concrete steps; pull from path.md «Today»)
```

## Inputs to read (in order)

1. `goals/active.md`
2. `learning/*/path.md` — especially **Today** and **Current stage**
3. `inbox/` — yesterday and today files; count unprocessed `- [ ]`
4. `memory/MEMORY.md` — only if needed for context (do not dump entire file)
5. Optional: grep recent `memory/history.jsonl` for yesterday's date if inbox empty

## HEARTBEAT / cron behavior

When run from heartbeat with nothing actionable:

- Still write brief if there are active goals or unprocessed inbox items.
- If **no active goals, empty inbox, no path Today items**: skip sending notification (heartbeat should stay quiet) — optionally write a minimal brief file only.

When delivering to user:

- Output the brief content as the user-visible message (markdown).
- Do not expose internal file paths unless user prefers.

## Stalled goal hint

If a path's `log.md` or session has **no update in 3+ days** (infer from log dates or ask user last time):

- Add under 长期目标进度: 「⚠ 已 N 天未更新，建议今日继续：{next step from path}」

## Anti-patterns

- Do not call LLM-heavy tools (web_search) unless a path explicitly requires fresh external info.
- Do not exceed 3 items in 今日重点 / 今日建议动作.
- Do not duplicate full inbox — summarize.
- Do not install software or run `winget` / MSI as part of generating a brief.
- Keep 今日建议动作 **concrete and understandable** (what + why in one line); avoid jargon-only steps.

## Related

- **capture** — feeds inbox
- **learning-coach** — maintains path.md and goals/active.md
- Dream — overnight consolidation into memory/log
