# Dream 教练模式 — 归档规则补充

> 用法：在 workspace 执行 `/dream-prompt init` 生成 `prompts/dream.md` 后，**合并**下列规则（勿整文件覆盖默认 MECE 规则，除非你知道后果）。

---

## 追加到 prompts/dream.md 的段落

```markdown
## Coach workspace — inbox & learning

This workspace uses a personal office/learning coach layout.

### inbox/

- Files under `inbox/` are **unprocessed fragments**. When consolidating:
  - Work/project facts → `memory/MEMORY.md` (strategic context, not operational commands)
  - Learning progress snippets → relevant `learning/{topic}/log.md` if topic is identifiable
  - User preferences → `USER.md`
- After migrating a fragment, mark the inbox line `[x]` or remove processed bullets
- Do not duplicate the same fact in MEMORY and log

### learning/

- `learning/*/path.md` is **maintained by the agent during turns** — Dream should not rewrite stage plans unless clearly outdated
- Safe to append dated progress summaries to `log.md` from conversation history

### goals/active.md

- Human-readable summary only; sync high-level status if conversation clearly changed milestone
- Do not store secrets or API keys

### briefs/

- Do not edit morning brief files during Dream

### Classification hints

- Tags `[work]`, `[learn]`, `[todo]`, `[ref]` in inbox lines indicate routing priority
```

---

## 验证

1. 在 inbox 写 2 条带 `[learn]` 的碎片
2. 手动或等待 Dream：`learning/*/log.md` 或 MEMORY 有对应内容，inbox 条目标 `[x]`
3. `/dream-log` 查看 Dream 是否误删 path.md 阶段计划（若有，收紧 prompts 措辞）
