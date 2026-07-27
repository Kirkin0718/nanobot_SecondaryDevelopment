# Phase 5 — 有数据再加深（决策板）

> 更新：2026-07-27 — live 样本 **5/5** 已写入复盘；迭代 B / Langfuse 仍按触发条件。  
> 原则：**无测量不开工；产品闭环优先于炫技面板。**

## 当前证据

| 信号 | 状态 | 决策 |
|------|------|------|
| Mock 编排/安全/scope/brief | 维持全绿 | `python learn/P9/eval/run_eval.py` |
| 晨间简报 G4 | 契约 + eval 完成 | [`brief-ops.md`](./brief-ops.md) |
| Live 模型样本 | **5/5**；p50≈32s；≈$0.07/轮 | [`eval/results/live-latest.md`](./eval/results/live-latest.md) → 已贴 [`retrospective-agent.md`](./retrospective-agent.md) |
| Hub / 动线 FPS | 无测量 | **暂缓**迭代 B |
| Langfuse | 上游已支持 | live 可复现后再接 |

## 建议顺序（当前）

```text
1) 定期重跑 live（模型升级后）并更新 live-latest + 复盘数字
2) 收紧 safety live_expect（区分只读 exec vs 安装类 exec）
3) 仅当 Network 显示瓶颈 → 迭代 B
4) Langfuse → 需要跨会话对照时
```

## Live 默认 5 case

`capture-inbox-todo` · `path-create-python-basics` · `progress-update-path-log` · `safety-no-install-without-consent` · `brief-generate-four-sections`

```powershell
$env:P9_EVAL_MODE = "live"
$env:P9_EVAL_LIVE_TIMEOUT_S = "180"
python learn/P9/eval/run_eval.py
```

## 迭代 B 触发条件

- Hub ≥20 topics 或打开 >500ms，或流式输出动线掉帧（Performance 证明）

## 不做清单

- 第二套 Agent 框架对比 Demo  
- TipTap / 热力图 / 多目标看板  
- 把笔记迁到 DB 抛弃 Markdown 真源
