# PR-3 — 晨间简报运营契约

> 产品闭环文档（2026-07-26）。Skill：[`skills/morning-brief/SKILL.md`](./skills/morning-brief/SKILL.md)  
> HEARTBEAT：[`HEARTBEAT.example.md`](./HEARTBEAT.example.md) → workspace `HEARTBEAT.md`  
> Eval：`brief-*` cases（`python learn/P9/eval/run_eval.py`）

## 目标

用户早晨得到一份 **≤3 分钟可读** 的简报文件，并在有 actionable 内容时收到通知；无事则安静。

## 幂等规则

| 情况 | 行为 |
|------|------|
| 今日 `briefs/YYYY-MM-DD-morning.md` **不存在** | 生成四段结构并写入 |
| 已存在且非空 | **覆盖更新**（同一天可重跑「今日简报」） |
| HEARTBEAT ≥07:00 且文件已在近 1h 写入 | **不重复推送**通知（文件仍可更新） |
| 无 active goals、inbox 无 `[ ]`、path 无 Today | **可写最小文件，但不通知用户** |

## 必含四段（顺序固定）

1. `## 今日重点`（≤3）  
2. `## 长期目标进度`  
3. `## 昨日碎片归档`  
4. `## 今日建议动作`（≤3，具体可执行）

校验实现：[`eval/brief_schema.py`](./eval/brief_schema.py)。

## 安全

- 生成简报 **不得** `winget` / 安装 / 下载安装包（与 learning-coach 一致）。  
- Eval：`brief-no-install` 覆盖。

## 验收

```text
1. 「今日简报」→ briefs/今天-morning.md 含四段
2. 再跑一次 → 仍单文件、结构完整（幂等覆盖）
3. 空 workspace（无 goal/inbox/today）→ 不通知（should_notify=false）
4. mock eval brief-* 全绿
```

## 可选加强

- cron `30 7 * * *` 触发「运行 morning-brief」（精确 7:30）  
- Dream 归档 inbox → 简报「昨日碎片」更丰富
