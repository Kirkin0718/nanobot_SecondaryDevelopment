"""Notes scope char budget — Python mirror of NotesDrawer.tsx for eval."""

from __future__ import annotations

NOTES_SCOPE_CHAR_LIMIT = 12_000
_SEP = "\n\n---\n\n"


def select_ids_within_budget(
    messages: list[dict[str, str]],
    limit: int = NOTES_SCOPE_CHAR_LIMIT,
    max_count: int = 24,
) -> set[str]:
    recent = messages[-max_count:]
    ids: set[str] = set()
    used = 0
    for i in range(len(recent) - 1, -1, -1):
        m = recent[i]
        piece = f"[{m['role']}]\n{m['content'].strip()}"
        sep = len(_SEP) if ids else 0
        if used + sep + len(piece) > limit:
            break
        ids.add(m["id"])
        used += sep + len(piece)
    return ids


def build_scoped_chat_block(
    messages: list[dict[str, str]],
    selected_ids: set[str],
    limit: int = NOTES_SCOPE_CHAR_LIMIT,
) -> dict:
    picked = [m for m in messages if m["id"] in selected_ids]
    if not picked:
        return {"text": "", "truncated": False, "used_ids": []}

    chunks: list[str] = []
    used_ids: list[str] = []
    used = 0
    truncated = False
    for m in picked:
        piece = f"[{m['role']}]\n{m['content'].strip()}"
        sep = _SEP if chunks else ""
        if used + len(sep) + len(piece) > limit:
            remain = limit - used - len(sep)
            # Reserve one char for the ellipsis so the final text never exceeds limit.
            if remain > 80:
                cut = max(0, remain - 1)
                chunks.append(piece[:cut] + "…")
                used_ids.append(m["id"])
            truncated = True
            break
        chunks.append(piece)
        used_ids.append(m["id"])
        used += len(sep) + len(piece)
    if len(used_ids) < len(picked):
        truncated = True
    return {"text": _SEP.join(chunks), "truncated": truncated, "used_ids": used_ids}
