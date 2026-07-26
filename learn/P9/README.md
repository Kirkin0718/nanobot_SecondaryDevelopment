# Phase 9：个人办公/学习教练

**状态**：落地包已就绪（2026-07-23）  
**总览**：[`../learning-roadmap.md`](../learning-roadmap.md) § Phase 9

## 选题

**楔子 A + B**：碎片整理 + 晨间简报 + 学习路径 + 长期目标指导。

| 文档 | 说明 |
|------|------|
| [`QUICKSTART.md`](./QUICKSTART.md) | **10 分钟上手**（推荐先看） |
| [`SAFEGUARDS.md`](./SAFEGUARDS.md) | 安全与体验护栏（禁止擅自安装等） |
| [`product-spec.md`](./product-spec.md) | 产品定位、用户故事、验收指标 |
| [`workspace-layout.md`](./workspace-layout.md) | 目录约定与初始化 |
| [`implementation-roadmap.md`](./implementation-roadmap.md) | PR-1～PR-3 里程碑 |
| [`retrospective-webui-coach.md`](./retrospective-webui-coach.md) | **动线工作台回顾、启示与性能向二次开发** |
| [`iteration-a-three-prs.md`](./iteration-a-three-prs.md) | **迭代 A：三个性能 PR 边界与验收** |
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
| 2026-07-25 | WebUI 动线工作台 + P0～P2 收口 | — | 已落地；回顾见 [`retrospective-webui-coach.md`](./retrospective-webui-coach.md) |
| 2026-07-24 | Coach UI chips + panel | — | 接线完成：buttons 全链路、GoalCoachPanel→抽屉拆分、coach API、Skill |
| | PR-1 捕获+目录 | | 已演示 |
| | PR-2 目标联动 | | 进行中（Skill 已强化） |
| | PR-3 晨间简报 | | 待开始 |
| | WebUI 选项芯片 + 笔记面板 | | 已演进为动线工作台（需重启 gateway + 重建 webui） |

## 笔记

- WebUI 动线、状态同步、性能向二次开发：见 [`retrospective-webui-coach.md`](./retrospective-webui-coach.md)。
- 实现时优先还「coach 单源 + UI 职责」债，再扩 Hub/日历等功能。
