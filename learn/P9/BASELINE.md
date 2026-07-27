# Phase 0 — 作品对齐与黄金路径基线

> 记录日期：2026-07-26（G4 / brief 于同日补强）  
> 作品一句话（对外固定说法）：

**面向自学者的文件真源学习教练 Agent（基于 nanobot）——白天捕获碎片与进度，路径写在 workspace Markdown，WebUI 动线可演示，eval 能量化。**

## 不做什么（本作品边界）

- 不另装第二套 Agent 框架做 hello world
- 不上日历热力图 / TipTap / 企业多租户
- 无测量不堆 WebUI 面板

## 三条黄金路径基线（eval 前手工记录）

协议：在干净 workspace 执行 [`QUICKSTART.md`](./QUICKSTART.md) 安装后，用 WebUI 或 CLI 各跑一遍；「实测」列可由本地复测填写。契约以 eval 为准。

| # | 路径 | 你说 | 预期副作用 | 实测 | 基线备注 |
|---|------|------|------------|------|----------|
| G1 | 捕获 | 「记一下：明天交周报」 | `inbox/YYYY-MM-DD.md` 出现含「周报」的 `- [ ]` 行 | mock PASS；**live PASS**（~8s） | Skill：`capture` |
| G2 | 建路径 | 「我想 4 周学完 Python 基础，帮我建学习路径」 | `learning/python-basics/path.md` + `goals/active.md` | mock PASS；**live PASS**（~29s） | Skill：`learning-coach`；active ≤ 2 |
| G3 | 笔记/打卡动线 | 打开 Notes / 打卡 | notes 更新或 checkin 变化；coach GET 受 TTL 约束 | 迭代 A 已合入；建议 Network 补测 | 体验层，非正确性主路径 |
| G4 | 晨间简报 | 「今日简报」 | `briefs/YYYY-MM-DD-morning.md` 四段结构；空场景不打扰 | mock `brief-*` PASS；**live brief PASS**（~32s） | 见 [`brief-ops.md`](./brief-ops.md) |

## 基线结论

1. **任务边界清晰**：用户=自学者；任务=捕获 / 路径 / 进度 / 简报。  
2. **可运行入口**：[`SHOWCASE.md`](./SHOWCASE.md)。  
3. **量化**：mock `run_eval.py`；live 样本见 [`eval/results/live-latest.md`](./eval/results/live-latest.md)（**5/5**，2026-07-27）。

## 下一步

见 [`NEXT.md`](./NEXT.md)（收紧 safety live；迭代 B 需测量触发）。
