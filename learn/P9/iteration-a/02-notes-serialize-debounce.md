# A2 — 笔记序列化移出按键路径

| 项 | 值 |
|----|-----|
| PR | [#2](https://github.com/Kirkin0718/nanobot_SecondaryDevelopment/pull/2) |
| 分支 | `perf/notes-serialize-debounce` |
| 标题 | `perf(webui): debounce rich-notes htmlToMarkdown on input` |
| 核心文件 | `webui/src/components/coach/RichNotesEditor.tsx` |

## 1. 要解决什么

`contentEditable` 每次 `onInput` 若立刻 `htmlToMarkdown` + `onChange`，大笔记（数十 KB）会在按键路径上做重 CPU 工作，造成输入卡顿。父层即便已有「存盘 debounce」，**序列化本身**仍可能每键执行。

## 2. 行为契约

| 事件 | 行为 |
|------|------|
| `onInput` | `scheduleEmit()`：重置 **900ms** 定时器，到期再 `htmlToMarkdown` → `onChange` |
| `onBlur` | `flushEmit()`：取消定时器并**立即**序列化 |
| 工具条（加粗/标题/列表/高亮等） | `run()` → 操作后 `flushEmit()` |
| 粘贴 `onPaste` | 清洗插入后 `flushEmit()` |
| 插入 TOC | 直接改 markdown + `onChange`（不走 HTML 定时器路径） |
| 卸载 | clear 未触发的 emit 定时器 |

编辑器内部仍以 **HTML DOM** 为工作副本；`value`（markdown）从父组件下行时，仅在与 `lastMd` 不同时写回 `innerHTML`，避免光标跳动。

## 3. 数据流

```text
按键 → DOM(HTML) 更新
         │
         ├─(900ms 静默)─► htmlToMarkdown ─► onChange(md) ─► 父组件 / 存盘链路
         │
失焦/工具条/粘贴 ─► flush 立刻同上

父组件 value(md) 变化且 ≠ lastMd ─► markdownToHtml ─► 写回 DOM
```

## 4. 调参

| 位置 | 默认 | 说明 |
|------|------|------|
| `scheduleEmit` 内 `900` | 900ms | 与「手感」相关：再大则父状态更滞后；再小则接近每键序列化 |

建议：

- 若父层另有存盘 debounce（例如 1～2s），**保持序列化 ≤ 存盘间隔**，避免存盘读到过旧 md。
- 不要在 `onInput` 里同步调用 `htmlToMarkdown`「顺便修 bug」——那会抵消本切片。

## 5. 测试与验收

本切片以手感与落盘正确性为主；`coach-workspace` 中已有 `htmlToMarkdown` round-trip 单测，不替代本行为。

手动：

1. 准备约 50KB 的 `notes.md`，打开笔记抽屉连续输入。
2. Performance：输入过程主线程长任务应明显少于「每键序列化」。
3. 输入后立即失焦 / 点加粗：内容应立刻进入父状态并可保存。
4. 仅输入后 1s 内关闭页且未 blur：可能丢最后一次未 flush 的按键——这是 debounce 取舍；若产品要求「关抽屉必落盘」，在关抽屉路径显式 `flush`（见下节）。

## 6. 扩展时注意

| 需求 | 正确做法 |
|------|----------|
| 关抽屉保证落盘 | 在 `NotesDrawer` `onOpenChange(false)` 前对编辑器暴露 `flush()`（imperative handle）或强制 blur |
| 预览面板 | 用父层已 debounce 的 markdown；勿在预览里每键再转一遍 |
| 换编辑器（TipTap 等） | 可删除本 debounce；但存盘仍建议合并写入 |

## 7. 常见故障

| 现象 | 排查 |
|------|------|
| 保存的内容缺最后几字 | 关抽屉未 flush；或存盘定时器早于 900ms emit |
| 输入时光标乱跳 | `value` effect 是否在 `lastMd` 未变时仍重写 `innerHTML` |
| 工具条点了没进 markdown | `run` / 粘贴是否误改成 `scheduleEmit` |

## 8. 回滚

仅还原 `RichNotesEditor.tsx`：`onInput={emit}`（或等价立即序列化）。不影响 A1/A3。
