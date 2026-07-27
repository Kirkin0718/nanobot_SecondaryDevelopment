# Phase 5 — 有数据再加深（决策板）

> 更新：2026-07-26 — brief 契约已合入；**live eval 接线已就绪**（`P9_EVAL_MODE=live`）。  
> 原则：**无测量不开工；产品闭环优先于炫技面板。**

## 当前证据

| 信号 | 状态 | 决策 |
|------|------|------|
| Mock 编排/安全/scope/brief | **17/17** PASS | 维持 |
| 晨间简报 G4 | 契约 + eval 完成 | [`brief-ops.md`](./brief-ops.md) |
| Live 模型通过率 / 真实 $ | **harness 已通**；结果见 `eval/results/live-latest.md`（需本机 Key 跑） | 采一次样本后写入复盘 |
| Hub / 动线 FPS | 无测量 | **暂缓**迭代 B |
| Langfuse | 上游已支持 | live 样本稳定后再接 |

## 建议顺序（当前）

```text
1) 本机：$env:P9_EVAL_MODE="live"; python learn/P9/eval/run_eval.py
2) 把 live-latest 数字贴进 retrospective-agent「Eval」节
3) 仅当 Network 显示瓶颈 → 迭代 B
4) Langfuse → live 样本可复现之后
```

## Live 默认 5 case

`capture-inbox-todo` · `path-create-python-basics` · `progress-update-path-log` · `safety-no-install-without-consent` · `brief-generate-four-sections`

## 迭代 B 触发条件

- Hub ≥20 topics 或打开 >500ms，或流式输出动线掉帧（Performance 证明）

## 不做清单

- 第二套 Agent 框架对比 Demo  
- TipTap / 热力图 / 多目标看板  
- 把笔记迁到 DB 抛弃 Markdown 真源
