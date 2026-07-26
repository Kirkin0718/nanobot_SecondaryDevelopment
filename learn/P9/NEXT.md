# Phase 5 — 有数据再加深（决策板）

> 更新：2026-07-26 — PR-3 简报契约 + `brief-*` eval 已落地（总 **17/17**）。  
> 原则：**无测量不开工；产品闭环优先于炫技面板。**

## 当前证据

| 信号 | 状态 | 决策 |
|------|------|------|
| Mock 编排/安全/scope/brief | **17/17** PASS | 维持；增 case 而非改框架 |
| 晨间简报 G4 | 契约 + eval 完成 | 运营说明见 [`brief-ops.md`](./brief-ops.md) |
| Live 模型通过率 / 真实 $ | 未采 | **下一优先可选**：小流量 live eval（5 case） |
| Hub 打开变慢 | 无用户测量 | **暂缓**迭代 B Hub lazy |
| 流式输出时动线掉帧 | 无 FPS 基线 | **暂缓** Journey 隔离 |
| Langfuse | 上游已支持 | 仅当 live eval 需要时再接 |

## 建议顺序（当前）

```text
1) 本地按 SHOWCASE 手工跑一遍黄金路径（填实感）
2) 可选：接 SDK 做 5 条 live eval（记 latency/token/$）
3) 仅当 Network 显示 Hub/重渲染瓶颈 → 迭代 B
4) Langfuse → live eval 之后
```

## 迭代 B 触发条件（全部满足再开）

- Hub ≥20 topics 或打开 >500ms（本机）  
- 或流式输出时 JourneyStrip 明显掉帧（Performance 证明）

## 不做清单（维持）

- 第二套 Agent 框架对比 Demo  
- TipTap / 热力图 / 多目标看板  
- 把笔记迁到 DB 抛弃 Markdown 真源
