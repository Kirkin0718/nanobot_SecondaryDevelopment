# WebUI 性能基线（迭代 B 门控）

> 记录日期：2026-07-27  
> 目的：满足 Phase 6e——**有测量才开迭代 B**；当前无触发则明确不做。

## 测量协议

环境：本机 gateway + WebUI（Chromium DevTools）。

| 项 | 方法 | 触发阈值 |
|----|------|----------|
| Hub 打开 | Network + Performance，topic 数记在旁 | >500ms 或 ≥20 topics |
| 流式动线 FPS | Performance 录一段流式回复 | Journey/Progress 明显掉帧 |
| 主包 | 未点开 Notes/Hub 时的 JS 体积 | 主观「首屏过大」且可归因教练模块 |

## 本次结项（门控未触发）

| 信号 | 结果 | 决策 |
|------|------|------|
| Hub ≥20 topics / >500ms | **未测到达标触发**（当前学习 topic 少；无用户报告 Hub 慢） | **不做** Hub lazy |
| 流式掉帧 | **无 Performance 录制证据** | **不做** Journey 隔离 |
| 主包过大 | **无体积对比基线** | **不做** React.lazy 抽屉 |

结论：**迭代 B 本轮跳过**。若日后按上表测到触发，再按 [`retrospective-webui-coach.md`](./retrospective-webui-coach.md) §4.5 拆独立 PR。

## 如何补测（可选）

1. 造 ≥20 个 `learning/*/path.md` 后打开 Hub，记打开耗时。  
2. 长回复流式输出时录 Performance，看 JourneyStrip 脚本时长。  
3. 将数字填回本表「结果」列并改决策。
