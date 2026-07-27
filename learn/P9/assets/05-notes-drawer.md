# 动线 Notes（体验层说明）

评审打开 WebUI 笔记抽屉时可对照：

1. **Coach TTL**：连开 Notes/Checkin 不刷屏 GET（见 `iteration-a/01-coach-ttl.md`）
2. **序列化防抖**：大笔记输入不卡（`02-notes-serialize-debounce.md`）
3. **Scope 12k**：AI 生成笔记 prompt 有硬顶（`03-notes-scope-cap.md`）

这些是 **体验层**，不是 Agent 正确性主证明——正确性看 eval + 落盘文件。

```text
[ JourneyStrip ] 确认目标 → 选择对话 → 进行对话 → 笔记/打卡
[ Thread messages ... ]
[ NotesDrawer | RichNotesEditor  (half sheet) ]
```

<!-- 若有真实 UI 截图，替换为 notes-drawer.png 并在 SHOWCASE 引用 -->
