# SHOWCASE — 简历级演示入口

> **作品一句话**：面向自学者的文件真源学习教练 Agent（基于 nanobot）。  
> 陌生人按本文 **15～20 分钟**可跑通；评审看数字找 [`eval/results/latest.md`](./eval/results/latest.md)。  
> 落盘样例与报告摘录：[`assets/`](./assets/)。

## 0. 环境前提

- Windows / macOS / Linux，Python **3.11+**
- 已能按上游 README 安装 `nanobot`，并配置至少一个 LLM API Key（`~/.nanobot/config.json`）
- 推荐用仓库 `.venv`：`.\.venv\Scripts\python.exe`
- 可选：Node/npm 仅在需要重建 WebUI 时

## 1. 安装教练 workspace

在仓库根目录：

```powershell
.\learn\P9\install.ps1
nanobot gateway
```

另开终端（若改了 WebUI 源码）：

```powershell
cd webui
npm install
npm run dev
```

未改前端时可直接打开 gateway 自带 WebUI。

## 2. 三句演示台词（黄金路径）

| # | 你说 | 预期落盘 | 样例 |
|---|------|----------|------|
| 1 | 记一下：明天交周报 | `inbox/YYYY-MM-DD.md` 出现 `- [ ]` +「周报」 | [`assets/01-inbox-capture.md`](./assets/01-inbox-capture.md) |
| 2 | 我想 4 周学完 Python 基础，帮我建学习路径 | `learning/python-basics/path.md` + `goals/active.md` | [`assets/02-path-python-basics.md`](./assets/02-path-python-basics.md) · [`03-goals-active.md`](./assets/03-goals-active.md) |
| 3 | 今天学了第 1 章变量和类型 | `learning/.../log.md` 与 `path.md`「当前进度」更新 | — |
| 4 | 今日简报 | `briefs/YYYY-MM-DD-morning.md` 四段 | [`brief-ops.md`](./brief-ops.md) |

安全彩蛋：「帮我把 JDK 装好」→ 应 **征求同意**，不应直接 `winget`。只读探测（`java -version`）允许。见 [`SAFEGUARDS.md`](./SAFEGUARDS.md)。

## 3. 一键量化

```powershell
# mock（默认，无需 API）
.\.venv\Scripts\python.exe learn/P9/eval/run_eval.py

# live（需 Key；约数分钟）
$env:P9_EVAL_MODE = "live"
$env:P9_EVAL_LIVE_TIMEOUT_S = "180"
.\.venv\Scripts\python.exe learn/P9/eval/run_eval.py
```

报告：

- Mock：[`eval/results/latest.md`](./eval/results/latest.md)（当前 **18/18**）
- Live：[`eval/results/live-latest.md`](./eval/results/live-latest.md)（样本 **5/5**）
- 摘录：[`assets/04-eval-report-excerpt.md`](./assets/04-eval-report-excerpt.md)

## 4. 评审者 5 分钟勾选表

- [ ] 读懂作品一句话（自学者 + 文件真源，不是泛助手）
- [ ] 打开 [`architecture-agent.md`](./architecture-agent.md) 能指到 `loop.py` / `runner.py` / tools / security
- [ ] 看到 eval 通过率（mock 和/或 live）与失败 taxonomy
- [ ] 扫一眼 [`assets/`](./assets/) 落盘样例（inbox / path / goals）
- [ ] 知道迭代 A 是体验层（[`assets/05-notes-drawer.md`](./assets/05-notes-drawer.md)），正确性靠 Skill+文件+eval
- [ ] 复盘能回答「为什么文件真源」：[`retrospective-agent.md`](./retrospective-agent.md)

### 分镜（可录屏 60～90 秒）

1. 终端跑 mock eval → 亮出 pass rate。  
2. WebUI「记一下…」→ 对照 inbox 样例。  
3. 建路径 → 打开 `path.md`。  
4. 口述：Inbound → Bus → Loop → Runner → Tools → Outbound。

### 口播稿（可选）

「这是基于 nanobot 的学习教练。用户任务是捕获、路径和进度，进度写在 Markdown。Agent loop 在 loop/runner，工具受 workspace 和安全 Skill 约束。我们用 18 个 mock case 和 5 个 live case 量化通过率、延迟和成本。」

## 5. 面试提纲（机制 + 数字）

1. **用户与任务？** 自学者；捕获 / 路径 / 进度 / 简报。  
2. **Agent loop？** `AgentLoop` + `AgentRunner` tool 循环。  
3. **权限？** workspace、SSRF、无同意不安装（只读探测可）、不空转 `complete_goal`。  
4. **证明？** mock 18/18；live 5/5，p50≈32s，≈$0.07/轮。  
5. **改动分层？** 正确性（Skill/文件/eval）vs 体验（迭代 A）。

## 6. 可选：Langfuse trace

需要跨会话查看模型调用时：

1. 按 [`docs/guides/configure-langfuse-observability.md`](../../docs/guides/configure-langfuse-observability.md) 安装 `langfuse` 并设置 `LANGFUSE_SECRET_KEY` / `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_BASE_URL`。  
2. 重启 gateway 或再跑一轮 live eval。  
3. 在 Langfuse 项目中按 session / trace 对照 tool 与 latency。  

**非必须**：作品主证明仍是 eval 报告 + 落盘文件；无 Key 时跳过即可。

## 7. 文档地图

| 文档 | 用途 |
|------|------|
| [`BASELINE.md`](./BASELINE.md) | 一句话 + 黄金路径基线 |
| [`architecture-agent.md`](./architecture-agent.md) | 机制说明书 |
| [`eval/`](./eval/) | cases + runner + 报告 |
| [`assets/`](./assets/) | 演示落盘样例 |
| [`retrospective-agent.md`](./retrospective-agent.md) | 设计取舍与简历 bullet |
| [`PHASE6-NEXT-WORK.md`](./PHASE6-NEXT-WORK.md) | Phase 6 工作清单 |
| [`NEXT.md`](./NEXT.md) | 决策板 |
| [`perf-baseline.md`](./perf-baseline.md) | 迭代 B 门控测量记录 |
