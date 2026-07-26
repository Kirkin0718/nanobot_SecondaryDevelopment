---
name: capture
description: Zero-friction fragment capture to workspace inbox — notes, links, todos, learning snippets.
---

# Capture（碎片捕获）

Use when the user wants to **save something quickly** without organizing it: notes, links, todos, meeting snippets, learning points.

Trigger phrases (non-exhaustive): 「记一下」「存碎片」「先记下」「capture」「加到 inbox」.

## Rules

1. **Do not ask for category** unless the message is ambiguous. Default: append to today's inbox file.
2. **Target file**: `inbox/YYYY-MM-DD.md` (workspace-local date; use `agents.defaults.timezone` if available).
3. **Format each entry** as a single bullet with optional time prefix:
   ```markdown
   - [ ] HH:MM 用户原文或精简摘要
   ```
4. **Create the file** if missing (use template header from `# Inbox YYYY-MM-DD`).
5. **Use `read_file` + `edit_file` or `write_file`** — prefer append via edit at end of file.
6. **Confirm briefly** to the user: saved to which file, one line; do not dump the whole inbox.
7. **Do not** move content to MEMORY.md yourself — Dream or explicit archive flows handle consolidation.

## Optional tagging (only if obvious)

Append a short tag in the line when clear from context:

- `[work]` office / project
- `[learn]` study / exam
- `[todo]` actionable item
- `[ref]` link or reference

Example: `- [ ] 14:20 [learn] 子网划分：主机位和网络位要分清`

## Anti-patterns

- Do not start a long conversation after capture unless the user asks.
- Do not create one file per message unless user requests separate files.
- Do not edit SOUL.md, USER.md, or memory/MEMORY.md for inbox capture.

## Related skills

- **learning-coach** — when capture is clearly progress on an active learning path, also offer to update `learning/{topic}/log.md`.
- **morning-brief** — reads inbox for unprocessed `[ ]` items.
