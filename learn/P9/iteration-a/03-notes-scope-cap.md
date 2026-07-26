# A3 — AI 笔记 Scope 字符上限

| 项 | 值 |
|----|-----|
| PR | [#3](https://github.com/Kirkin0718/nanobot_SecondaryDevelopment/pull/3) |
| 分支 | `perf/notes-scope-cap` |
| 标题 | `perf(webui): cap AI notes scope to 12k chars` |
| 核心文件 | `webui/src/components/coach/NotesDrawer.tsx` + i18n `scopeTruncated*` |

## 1. 要解决什么

「生成 / 补充笔记」会把勾选的聊天消息拼进 prompt。默认近 24 条在长会话下轻松涨到数万字符，拉高 token、拖慢发送、易触达模型上下文上限。本切片用 **字符预算硬顶**（默认 12_000）约束 scope 体积。

## 2. 行为契约

| 能力 | 行为 |
|------|------|
| `NOTES_SCOPE_CHAR_LIMIT` | `12_000`（scoped **正文**字符，含 `[role]` 与分隔符会计入 `buildScopedChatBlock`） |
| 默认勾选 | `selectIdsWithinBudget`：从**最近**消息往回选，直到预算用尽（默认最多看近 24 条） |
| 「全选」按钮 | 在**全部** `chatChoices` 上按同一预算从近到远选（仍受 12k 限制，不是无限全选） |
| 生成 / 补充 prompt | `buildScopedChatBlock`：按勾选顺序拼接；超预算截断单条并标记 `truncated`；附加 i18n `scopeTruncatedNote` |
| 范围面板 | `truncated` 时展示 `scopeTruncated`（used / selected / limit） |

辅助函数（均在 `NotesDrawer.tsx`，可考虑日后抽到 `lib/` 但保持单测点清晰）：

- `selectIdsWithinBudget(messages, limit, maxCount)`
- `buildScopedChatBlock(messages, selectedIds, limit)`

## 3. 与隐藏历史的关系

生成请求仍走 `onSend(..., { hiddenHistory: true })`，不把教练提示写进可见气泡。  
Scope 截断只影响 **发给模型的字符串长度**，不删用户勾选 UI 状态；面板用 `usedIds.length` vs `selectedIds.size` 解释「勾了但没全写进 prompt」。

## 4. i18n 键

路径：`webui/src/i18n/locales/*/common.json` → `thread.coach.drawer`：

| 键 | 用途 |
|----|------|
| `scopeTruncated` | 面板提示：实际写入条数 / 勾选条数 / 上限 |
| `scopeTruncatedNote` | 追加进 prompt 的说明（告知模型已截断） |

改文案时 **所有 locale** 同步；缺键会显示原始 key。

## 5. 调参

| 常量 / 参数 | 默认 | 说明 |
|-------------|------|------|
| `NOTES_SCOPE_CHAR_LIMIT` | `12_000` | 与 retrospective 建议的 8～12K 一致；调前用真实长会话看 prompt 体积 |
| `selectIdsWithinBudget` 的 `maxCount` | 默认勾选 `24`；全选按钮传入 `chatChoices.length` | 只限制「从多远历史开始考虑」，真正硬顶仍是字符数 |

**不要**把硬顶只做在 UI 提示而不截断 `buildScopedChatBlock`——否则用户仍会发出超长 prompt。

## 6. 测试与验收

手动：

1. 构造长会话（远超 12k 的可见消息）。
2. 打开笔记 → 选范围：默认勾选应偏「最近」且面板在超预算时出现截断条（`data-testid="notes-scope-truncated"`）。
3. 生成笔记：抓实际发出的 hidden 提示，正文 scope 段应有硬顶，并含截断说明。
4. 点「全选」：勾选数可增多，但写入 prompt 的仍受 12k 约束。

可选后续：为 `selectIdsWithinBudget` / `buildScopedChatBlock` 加纯函数单测（输入消息列表 + limit → ids / truncated）。

## 7. 常见故障

| 现象 | 排查 |
|------|------|
| 仍发出超长 prompt | 是否另有拼接路径绕过 `buildScopedPrompt`；limit 是否被调用方覆盖 |
| 面板显示截断但 prompt 无说明 | `truncNote` 是否未拼进返回字符串 |
| 「全选」等于无限 | 全选是否误写成 `new Set(allIds)` 而非 `selectIdsWithinBudget` |
| 中英文提示缺字 | 某 locale 漏加 `scopeTruncated*` |

## 8. 回滚

还原 `NotesDrawer.tsx` 与各 `common.json` 的 `scopeTruncated*` 键。  
回滚后长会话恢复「近 N 条可无字符顶」的旧风险——仅在有意接受时回滚。
