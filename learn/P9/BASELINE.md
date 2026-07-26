# Phase 0 — 作品对齐与黄金路径基线

> 记录日期：2026-07-26  
> 作品一句话（对外固定说法）：

**面向自学者的文件真源学习教练 Agent（基于 nanobot）——白天捕获碎片与进度，路径写在 workspace Markdown，WebUI 动线可演示，eval 能量化。**

## 不做什么（本作品边界）

- 不另装第二套 Agent 框架做 hello world
- 不上日历热力图 / TipTap / 企业多租户
- 无测量不堆 WebUI 面板

## 三条黄金路径基线（eval 前手工记录）

协议：在干净 workspace 执行 [`QUICKSTART.md`](./QUICKSTART.md) 安装后，用 WebUI 或 CLI 各跑一遍；填写「实测」列。下列「预期」为契约；「基线备注」供 Phase 2 eval 对照。

| # | 路径 | 你说 | 预期副作用 | 实测（填） | 基线备注 |
|---|------|------|------------|------------|----------|
| G1 | 捕获 | 「记一下：明天交周报」 | `inbox/YYYY-MM-DD.md` 出现含「周报」的 `- [ ]` 行 | 待本地复测 | Skill：`capture`；工具：`read_file`/`edit_file` 或 `write_file` |
| G2 | 建路径 | 「我想 4 周学完 Python 基础，帮我建学习路径」 | `learning/python-basics/path.md`（或等价 slug）+ `goals/active.md` 有摘要；可伴 `long_task` | 待本地复测 | Skill：`learning-coach`；active long-goal ≤ 2 |
| G3 | 笔记/打卡动线 | 打开 Notes 抽屉编辑并保存；或打卡一次 | `learning/{topic}/notes.md` 更新和/或 checkin 天数变化；coach GET 在 TTL 内不刷屏 | 待本地复测 | 体验层：迭代 A（TTL / 序列化防抖）；非 Agent 正确性主路径 |

### 简报路径（可选第四条，产品未完全闭环时不计入 Phase 0 硬基线）

| # | 路径 | 你说 | 预期 | 状态 |
|---|------|------|------|------|
| G4 | 晨间简报 | 「今日简报」 | `briefs/YYYY-MM-DD-morning.md` 四段结构 | 产品 PR-3 进行中；见 Phase 5 |

## 基线结论（收束用）

1. **任务边界清晰**：用户=自学者；任务=捕获 / 路径 / 进度文件，不是泛聊。  
2. **可运行入口已有**：`install.ps1` + QUICKSTART；作品级入口见 [`SHOWCASE.md`](./SHOWCASE.md)。  
3. **量化缺口在 eval**：手工基线不能代替通过率与失败类型——由 [`eval/`](./eval/) 补齐。

## 下一步

- 机制说明 → [`architecture-agent.md`](./architecture-agent.md)  
- 跑 mock eval → `python learn/P9/eval/run_eval.py`  
- 演示与面试 → [`SHOWCASE.md`](./SHOWCASE.md)
