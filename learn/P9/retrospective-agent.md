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

### 2.1 Mock（编排契约）

`python learn/P9/eval/run_eval.py` 覆盖捕获 / 路径 / 进度 / 安全 / UI / brief。

报告：[`eval/results/latest.md`](./eval/results/latest.md) —— **mock 通过率以本地最近一次为准（收束时曾 13/13，brief 合入后为 17/17）**。

Mock 证明的是 **policy + 文件副作用**，不是模型答题率。

### 2.2 Live（真实模型样本，2026-07-27）

```text
P9_EVAL_MODE=live python learn/P9/eval/run_eval.py
```

报告：[`eval/results/live-latest.md`](./eval/results/live-latest.md)

| 指标 | 值 |
|------|-----|
| Pass rate | **5/5（100%）**（`.venv` 稳定重跑，2026-07-27） |
| Latency | p50≈28.7s，p95≈44.8s，max≈44.8s |
| Tokens | prompt≈476k，completion≈12k |
| Est. cost | ≈ **$0.078** / 本轮 5 case（示意单价） |

Case：`brief-generate-four-sections` · `capture-inbox-todo` · `path-create-python-basics` · `progress-update-path-log` · `safety-no-install-without-consent`

**观察（Phase 6a）**：safety 策略区分 **只读探测**（如 `java -version`）与 **安装类命令**（winget/choco/msiexec/apt/brew/pip install 等）。Live `live_expect` 要求出现征求同意话术（`message`），并用 `forbid_install_in_response` + 禁安装字符串挡住「直接代装」；允许只读 `exec`，不整工具禁掉 `exec`。Mock 增补 `safety-readonly-exec-ok`。模型仍可能多走 `long_task`/写文件——属于行为偏好，未作为硬失败（避免 live 过脆）。

### Eval 修出的真实缺陷

1. Scope 截断未给省略号留 1 字符 → 硬顶偶发越界（mock 抓住）→ 已修 Python 镜像与 `NotesDrawer.tsx`。  
2. Live 初跑缺依赖 / 审批阻塞 / 无超时 → harness 增加 timeout、关闭 approval、收紧/放宽 safety `live_expect`。  

**这就是「能量化」的价值：契约与环境问题被测试咬住。**

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

1. 基于开源 nanobot 实现**学习教练 Agent**：Skill 驱动将捕获/路径/进度/简报落盘到 workspace Markdown，路径文件为进度真源。  
2. 梳理并文档化 **AgentLoop → Runner → ToolRegistry** 与 workspace/SSRF/安装同意等权限边界，产出可对外演示的机制说明书。  
3. 搭建 **mock + live 双模 eval**：mock **18/18**；live **5/5**（`.venv`），p50≈29s，约 **$0.08**/轮。  
4. WebUI 动线二次开发：Coach GET TTL、笔记序列化防抖、AI notes **12k scope 硬顶**；eval 发现并修复截断越界。  
5. 完成理解→规划→实现→评测→复盘→Phase6 加固（`SHOWCASE.md` + `assets/`），避免「只装框架跑 hello world」。

## 6. 明确未完成（诚实）

- Live 随模型漂移需定期重跑；Langfuse 仅文档接入，未强制。  
- 安全 live 仍允许只读 `exec` 与同意前的路径 scaffolding；硬禁的是安装指令与无同意代装话术。  
- 迭代 B 因无 Hub/FPS 触发已跳过（见 [`perf-baseline.md`](./perf-baseline.md)）。

→ 见 [`NEXT.md`](./NEXT.md)。
