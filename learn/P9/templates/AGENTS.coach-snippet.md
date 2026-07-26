## Personal office/learning coach

This workspace runs the **coach** workflow (capture → Dream → morning brief → long goals).

### Directories

| Path | Purpose |
|------|---------|
| `inbox/` | Unprocessed fragments — use **capture** skill |
| `goals/active.md` | At most **2** active long-goals (human summary) |
| `learning/{topic}/` | `path.md` = source of truth; `log.md` = daily progress |
| `briefs/` | Morning brief output |

### User phrases

| User says | Agent does |
|-----------|------------|
| 记一下 / 存碎片 | **capture** → append `inbox/YYYY-MM-DD.md` |
| 建学习路径 / 长期目标 | **learning-coach** → `long_task` + `path.md` + 人话阶段说明 |
| 今天学了… / 完成了… | **learning-coach** → update `log.md` + `path.md` |
| 今日简报 | **morning-brief** → `briefs/YYYY-MM-DD-morning.md` |
| 同意安装… | Only then may run install commands |

### Clarity (must)

When coaching, always explain in plain language:

1. **你现在在哪**（阶段）
2. **今天只要完成 1～3 件事**
3. **怎样算过关**
4. **先别做哪些**

Do **not** dump the full multi-week syllabus in every reply; point to `path.md` for the map.

### Safety (must)

- **No software install / MSI / winget / system changes** unless the user explicitly consents in this turn (or clicks a consent chip).
- Read-only checks (`java -version`, etc.) are OK; if missing → give manual steps, ask before installing.
- **Consent questions must use the `message` tool with `buttons`** (e.g. `[["同意安装 JDK", "我自己装", "只要手动步骤"]]`) so WebUI shows clickable chips — do not only ask in plain text.
- **Never `complete_goal`** just because the user has not started or did not reply to a continuation prompt.
- On sustained-goal auto-continuation: brief status or one question, then **wait** — no install loops.
- Honor `【教练·生成笔记】` / `【教练·补充笔记】` by writing `learning/{topic}/notes.md` only.

### Limits

- **Max 2 active long-goals** — complete one before adding a third.
- Do not edit `SOUL.md`, `USER.md`, `memory/MEMORY.md` directly (Dream-managed).

### Skills

- `capture`
- `learning-coach`
- `morning-brief`

### Heartbeat

See `HEARTBEAT.md` for morning brief and stall nudges.

---

_Append this block to your workspace `AGENTS.md`._
