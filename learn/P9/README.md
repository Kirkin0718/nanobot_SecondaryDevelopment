# Phase 9：个人办公/学习教练

**状态**：简历级收束主线已完成（2026-07-27）；下一步见 [`PHASE6-NEXT-WORK.md`](./PHASE6-NEXT-WORK.md)  
**作品入口**：[`SHOWCASE.md`](./SHOWCASE.md)  
**总览**：[`../learning-roadmap.md`](../learning-roadmap.md) § Phase 9

## 选题

**楔子 A + B**：碎片整理 + 晨间简报 + 学习路径 + 长期目标指导。

**一句话**：面向自学者的文件真源学习教练 Agent（基于 nanobot）。

| 文档 | 说明 |
|------|------|
| [`SHOWCASE.md`](./SHOWCASE.md) | **作品演示入口（推荐评审先看）** |
| [`PHASE6-NEXT-WORK.md`](./PHASE6-NEXT-WORK.md) | **收束完成后的下一步工作清单（Phase 6）** |
| [`BASELINE.md`](./BASELINE.md) | 作品对齐与黄金路径基线 |
| [`architecture-agent.md`](./architecture-agent.md) | Agent loop / 工具 / 上下文 / 权限 |
| [`eval/README.md`](./eval/README.md) | Eval harness（通过率 / 失败类型 / 延迟 / token） |
| [`retrospective-agent.md`](./retrospective-agent.md) | 机制复盘 + 简历 bullet |
| [`NEXT.md`](./NEXT.md) | 有数据后再加深的决策板 |
| [`brief-ops.md`](./brief-ops.md) | **晨间简报幂等/通知契约（PR-3）** |
| [`QUICKSTART.md`](./QUICKSTART.md) | **10 分钟上手** |
| [`SAFEGUARDS.md`](./SAFEGUARDS.md) | 安全与体验护栏（禁止擅自安装等） |
| [`product-spec.md`](./product-spec.md) | 产品定位、用户故事、验收指标 |
| [`workspace-layout.md`](./workspace-layout.md) | 目录约定与初始化 |
| [`implementation-roadmap.md`](./implementation-roadmap.md) | PR-1～PR-3 里程碑 |
| [`retrospective-webui-coach.md`](./retrospective-webui-coach.md) | **动线工作台回顾、启示与性能向二次开发** |
| [`iteration-a-three-prs.md`](./iteration-a-three-prs.md) | **迭代 A：三个性能 PR 边界与验收（速查）** |
| [`iteration-a/README.md`](./iteration-a/README.md) | **迭代 A 维护手册**（TTL / 序列化防抖 / Scope 上限） |
| [`install.ps1`](./install.ps1) | 一键安装到 workspace（Windows） |
| [`HEARTBEAT.example.md`](./HEARTBEAT.example.md) | 拷贝到 workspace |
| [`prompts/dream-coach.example.md`](./prompts/dream-coach.example.md) | Dream 归档规则（可选） |

## Skills（安装到 `workspace/skills/`）

| Skill | 路径 |
|-------|------|
| capture | [`skills/capture/SKILL.md`](./skills/capture/SKILL.md) |
| learning-coach | [`skills/learning-coach/SKILL.md`](./skills/learning-coach/SKILL.md) |
| morning-brief | [`skills/morning-brief/SKILL.md`](./skills/morning-brief/SKILL.md) |

## 模板（拷贝到 workspace）

| 模板 | 目标 |
|------|------|
| [`templates/goals-active.md`](./templates/goals-active.md) | `goals/active.md` |
| [`templates/learning-path.md`](./templates/learning-path.md) | `learning/{topic}/path.md` |
| [`templates/morning-brief-output.md`](./templates/morning-brief-output.md) | 简报输出格式参考 |
| [`templates/AGENTS.coach-snippet.md`](./templates/AGENTS.coach-snippet.md) | 追加到 `AGENTS.md` |

## 快速开始（10 分钟）

在 nanobot **仓库根目录**执行：

```powershell
.\learn\P9\install.ps1
```

详见 [`QUICKSTART.md`](./QUICKSTART.md)。安装后重启 `nanobot gateway`，在 WebUI 试：

1. 「记一下：明天交周报」
2. 「我想 4 周学完 Python 基础，建学习路径」
3. 「今日简报」（或等 HEARTBEAT ≥7:00）

## 进度记录

| 日期 | 选题 | PR/分支 | 状态 |
|------|------|---------|------|
| 2026-07-27 | 收束计划更新 → Phase 6 下一步 | [`PHASE6-NEXT-WORK.md`](./PHASE6-NEXT-WORK.md) | 主线完成；优先 safety 收紧 + 演示截图 |
| 2026-07-26 | PR-3 晨间简报契约 + brief eval | `brief-ops.md` + `eval/cases/brief-*` | mock **17/17**；live **5/5** |
| 2026-07-26 | 简历级收束：SHOWCASE + architecture + eval + 复盘 | `learn/P9/*` | 完成；见 [`SHOWCASE.md`](./SHOWCASE.md) |
| 2026-07-26 | 迭代 A：Coach TTL / 笔记序列化防抖 / Scope 12k | [#1](https://github.com/Kirkin0718/nanobot_SecondaryDevelopment/pull/1) [#2](https://github.com/Kirkin0718/nanobot_SecondaryDevelopment/pull/2) [#3](https://github.com/Kirkin0718/nanobot_SecondaryDevelopment/pull/3) → `main` | 三阶段完成；维护见 [`iteration-a/`](./iteration-a/) |
| 2026-07-25 | WebUI 动线工作台 + P0～P2 收口 | — | 已落地；回顾见 [`retrospective-webui-coach.md`](./retrospective-webui-coach.md) |
| 2026-07-24 | Coach UI chips + panel | — | 接线完成：buttons 全链路、GoalCoachPanel→抽屉拆分、coach API、Skill |
| | PR-1 捕获+目录 | | 已演示 |
| | PR-2 目标联动 | | 进行中（Skill 已强化） |
| | PR-3 晨间简报 | | 契约+eval 完成（[`brief-ops.md`](./brief-ops.md)）；live 简报仍依赖 gateway/heartbeat |
| | WebUI 选项芯片 + 笔记面板 | | 已演进为动线工作台（需重启 gateway + 重建 webui） |

## 笔记

- **作品评审入口**：[`SHOWCASE.md`](./SHOWCASE.md)；机制复盘：[`retrospective-agent.md`](./retrospective-agent.md)。
- **下一步（Phase 6）**：[`PHASE6-NEXT-WORK.md`](./PHASE6-NEXT-WORK.md)；决策板：[`NEXT.md`](./NEXT.md)。
- WebUI 动线、状态同步、性能向二次开发：见 [`retrospective-webui-coach.md`](./retrospective-webui-coach.md)。
- 迭代 A（性能三切片）调参与排障：见 [`iteration-a/README.md`](./iteration-a/README.md)。
- 实现时优先还「coach 单源 + UI 职责」债，再扩 Hub/日历等功能。
