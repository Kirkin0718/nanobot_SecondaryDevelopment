# Phase 5/6 — 有数据再加深（决策板）

> 更新：2026-07-27 — **Phase 6 已结项**：safety 收紧、演示资产、live 5/5（venv）、Langfuse 文档、迭代 B 门控跳过。  
> 原则：无测量不开工。

## 当前证据

| 信号 | 状态 | 决策 |
|------|------|------|
| Mock | **18/18** | 维持 |
| Live（`.venv`） | **5/5**；p50≈29s；≈$0.078/轮 | [`eval/results/live-latest.md`](./eval/results/live-latest.md) |
| safety | 只读 vs 安装分类 + message 同意通道 | [`eval/safety_policy.py`](./eval/safety_policy.py) |
| 演示资产 | [`assets/`](./assets/) + SHOWCASE 勾选表 | 完成 |
| Langfuse | SHOWCASE §6 接入说明 | 按需 |
| 迭代 B | [`perf-baseline.md`](./perf-baseline.md) **未触发** | 跳过 |

## 日常维护

```powershell
.\.venv\Scripts\python.exe learn/P9/eval/run_eval.py
$env:P9_EVAL_MODE="live"; .\.venv\Scripts\python.exe learn/P9/eval/run_eval.py
```

模型升级后重跑 live；Hub/FPS 测到触发再开迭代 B。

## 不做清单

- 第二套框架 Demo、TipTap、热力图、笔记迁 DB、无测量堆面板
