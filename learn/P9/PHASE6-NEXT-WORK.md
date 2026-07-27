# 简历级收束 — Phase 6 工作清单

> 更新：2026-07-27 — **Phase 6 已结项**。  
> 维护入口：[`NEXT.md`](./NEXT.md) · 评审入口：[`SHOWCASE.md`](./SHOWCASE.md)

## Phase 6 完成表

| 项 | 状态 | 证据 |
|----|------|------|
| 6a safety 收紧 | 完成 | [`eval/safety_policy.py`](./eval/safety_policy.py) · `safety-readonly-exec-ok` · live_expect |
| 6b 演示资产 | 完成 | [`assets/`](./assets/) · SHOWCASE 5 分钟勾选表 |
| 6c live 重跑 | 完成 | `.venv` → [`eval/results/live-latest.md`](./eval/results/live-latest.md) **5/5** |
| 6d Langfuse | 完成（文档） | SHOWCASE §6 |
| 6e 迭代 B | 门控跳过 | [`perf-baseline.md`](./perf-baseline.md) |

## 量化锚点

| 模式 | 通过率 | 备注 |
|------|--------|------|
| Mock | **18/18** | 含 brief + readonly safety |
| Live | **5/5** | p50≈28.7s；≈$0.078/轮 |

## Phase 0～5 锚点（勿重复开工）

SHOWCASE · architecture-agent · retrospective-agent · brief-ops · iteration-a

## 不做

- 新框架对比 Demo、TipTap、热力图、笔记迁 DB、无测量堆面板
