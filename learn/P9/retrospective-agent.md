# Agent 机制复盘（简历级）

> 时间：2026-07-26  
> 范围：nanobot 骨架 + P9 学习教练垂直场景 + 迭代 A 体验优化 + eval 收束  
> 对照标准：可演示 / 可解释 / 能量化

## 1. 为什么这样设计

### 1.1 Skill + 文件真源，而不是纯 DB / 纯 prompt 记忆

| 选项 | 优点 | 缺点 | 决策 |
|------|------|------|------|
| 只靠聊天记忆 | 实现快 | 不可审计、跨会话易漂 | 否 |
| 独立业务 DB | 查询快 | 与 Skill/可移植性割裂，Demo 重 | 否（索引侧车留迭代 C） |
| **Markdown workspace + Skill** | 用户可见、可 git、Skill/WebUI 共用 | Hub 扫盘可能变慢 | **采用** |

**机制收益**：进度以 `path.md` 为准；评测可对文件系统做断言（见 eval `files_contain`）。

### 1.2 coach API 保持薄封装

`nanobot/webui/coach.py` 读写 notes/checkin/hub，不另起领域服务。  
**替代方案**：完整 BFF + ORM —— 会让「文件真源」变成谎言，Skill 与 UI 双写。  
**取舍**：正确性优先于 Hub 极致性能；Hub 变慢再用懒加载 / `_index.json`。

### 1.3 安全写在 Skill + AGENTS，而不只靠模型自觉

无同意禁止安装、禁止空转 `complete_goal`，写进 `learning-coach` 与 [`SAFEGUARDS.md`](./SAFEGUARDS.md)。  
Eval 用 `policy_check` / `tools_forbidden` 把规则变成 **可失败的断言**，而不是故事。

### 1.4 迭代 A（TTL / 序列化防抖 / scope）定位为体验层

| 改动 | 主要指标 | 不证明什么 |
|------|----------|------------|
| Coach TTL + in-flight | 同会话 coach GET 次数 | Agent 是否写对 path |
| htmlToMarkdown 900ms debounce | 大笔记输入卡顿 | 落盘格式正确性（靠 blur flush） |
| Scope 12k | prompt 体积硬顶 | 生成笔记语义质量 |

详见 [`iteration-a/`](./iteration-a/)；面试时勿把 FPS 优化说成「Agent 智商提升」。

## 2. Eval 引入后看到什么

Mock harness（`python learn/P9/eval/run_eval.py`）覆盖：

- 捕获 / 建路径 / 进度同步  
- 安全：无同意安装、等待中不 `complete_goal`、active≤2  
- UI 契约：scope 硬顶、`hiddenHistory`  

合入时报告摘要（见 [`eval/results/latest.md`](./eval/results/latest.md)）：

- **Pass rate：13/13（100%）**（mock）  
- 失败类型：无  
- 延迟：p50/p95 毫秒级（本地脚本，非 LLM）  
- Token：mock 估算；live 模式留给有 Key 时采样  

**解释**：mock 证明的是 **编排契约与文件副作用**，不是模型答题率。简历上应写清「policy + filesystem eval」；若补充 live，再报真实通过率与 $/请求。

### Eval 修出的真实缺陷

Python scope 镜像在截断时未为省略号预留 1 字符，导致「声称 12k 硬顶」偶发越界 → 已修 `scope_budget.py`，并同步前端 `NotesDrawer.tsx`。  
**这就是「能量化」的价值：契约被测试咬住。**

## 3. 替代方案（面试加分）

| 话题 | 我们 | 若换方案 |
|------|------|----------|
| 框架 | 深耕 nanobot loop | 另起 LangGraph Demo —— 易变成 hello world，难复用本仓库权限/渠道 |
| 观测 | transcript trace + eval 报告 | 仅 Langfuse —— 无任务断言 |
| 笔记编辑 | contentEditable + 防抖 | TipTap —— 成本高，非当前瓶颈 |

## 4. 哪些机制「真的」带来提升

| 机制 | 证据类型 | 结论 |
|------|----------|------|
| 文件真源 + Skill | eval 文件断言全绿；演示可打开 md | 支撑可解释与可评测 |
| 安全政策门 | safety cases PASS | 把护栏从文案变成失败类型 |
| Scope 硬顶 | ui/recovery cases + 越界 bug 被抓住 | 对 prompt 体积有硬保证 |
| Coach TTL 等 | 设计 + 手册；建议用 Network 补测 | 体验向；应用 Chrome 记基线 |

## 5. 简历 bullet 草稿（机制 + 数字）

1. 基于开源 nanobot 实现**学习教练 Agent**：Skill 驱动将捕获/路径/进度落盘到 workspace Markdown，路径文件为进度真源。  
2. 梳理并文档化 **AgentLoop → Runner → ToolRegistry** 与 workspace/SSRF/安装同意等权限边界，产出可对外演示的机制说明书。  
3. 搭建 **13 case mock eval**（捕获/路径/安全/UI 契约），一键输出通过率、失败类型、延迟与 token 成本估算；合入时 **13/13**。  
4. WebUI 动线工作台二次开发：Coach GET TTL、笔记序列化防抖、AI notes **12k scope 硬顶**；并用 eval 发现并修复截断越界。  
5. 完成从理解→规划→实现→评测→复盘的作品收束（`SHOWCASE.md`），避免「只装框架跑 hello world」。

## 6. 明确未完成（诚实）

- Live LLM eval（真实模型通过率）尚未默认开启。  
- 晨间简报产品闭环仍弱（PR-3）。  
- 性能迭代 B 需 Network/Performance 基线后再做。

→ 见 [`NEXT.md`](./NEXT.md)。
