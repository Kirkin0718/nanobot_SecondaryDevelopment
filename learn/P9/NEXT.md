# Phase 5 — 有数据再加深（决策板）

> 依据：Phase 0～4 交付物 + mock eval（13/13）+ 迭代 A 已合入。  
> 原则：**无测量不开工；产品闭环优先于炫技面板。**

## 当前证据

| 信号 | 状态 | 决策 |
|------|------|------|
| Mock 编排/安全/scope 契约 | 13/13 PASS | 维持；增 case 而非改框架 |
| Live 模型通过率 / 真实 $ | 未采 | **下一步可选项 A**：小流量 live eval（5 case） |
| Hub 打开变慢 | 无用户测量 | **暂缓**迭代 B Hub lazy |
| 流式输出时动线掉帧 | 无 FPS 基线 | **暂缓** Journey 隔离，先 Chrome Performance 录一条 |
| 晨间简报 G4 | 产品未硬闭环 | **优先产品项**：PR-3 brief + eval tag `brief` |
| Langfuse | 上游已支持 | 仅当 live eval 需要跨会话对照时再接 |

## 建议顺序（默认）

```text
1) 手工补测 BASELINE 三条黄金路径（填「实测」列）
2) 产品：morning-brief 幂等落盘 + 1～2 个 brief eval case
3) 可选：P9_EVAL_MODE 接 SDK 跑 5 条 live（记 latency/token）
4) 仅当 Network 显示 Hub/重渲染瓶颈 → 迭代 B
5) Langfuse → 活 eval 之后
```

## 迭代 B 触发条件（全部满足再开）

- Hub ≥20 topics 或打开 >500ms（本机）  
- 或流式输出时 JourneyStrip 明显掉帧（Performance 证明）

切片仍拆独立 PR：Hub lazy / React.lazy 抽屉 / 渲染隔离 —— 仿 [`iteration-a/`](./iteration-a/)。

## 不做清单（维持）

- 第二套 Agent 框架对比 Demo  
- TipTap / 热力图 / 多目标看板  
- 把笔记迁到 DB 抛弃 Markdown 真源
