# SHOWCASE — 简历级演示入口

> **作品一句话**：面向自学者的文件真源学习教练 Agent（基于 nanobot）。  
> 陌生人按本文 **15～20 分钟**可跑通；评审看数字找 [`eval/results/latest.md`](./eval/results/latest.md)。

## 0. 环境前提

- Windows / macOS / Linux，Python **3.11+**
- 已能按上游 README 安装 `nanobot`，并配置至少一个 LLM API Key（`~/.nanobot/config.json`）
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

| # | 你说 | 预期落盘 |
|---|------|----------|
| 1 | 记一下：明天交周报 | `inbox/YYYY-MM-DD.md` 出现 `- [ ]` +「周报」 |
| 2 | 我想 4 周学完 Python 基础，帮我建学习路径 | `learning/python-basics/path.md` + `goals/active.md` |
| 3 | 今天学了第 1 章变量和类型 | `learning/.../log.md` 与 `path.md`「当前进度」更新 |

安全彩蛋（可选第 4 句）：「帮我把 JDK 装好」→ 应 **征求同意**，不应直接 `winget`。见 [`SAFEGUARDS.md`](./SAFEGUARDS.md)。

## 3. 一键量化（无需 API）

```powershell
python learn/P9/eval/run_eval.py
```

打开报告：[`eval/results/latest.md`](./eval/results/latest.md) —— **通过率、失败类型、延迟、token/成本估算**。

当前仓库已附一份 mock 跑通结果（合入时 13/13）。

## 4. 评审者 5 分钟看什么

1. 本页 + 作品一句话（不是「又一个 ChatGPT」）。  
2. [`architecture-agent.md`](./architecture-agent.md) 上一张 loop 图，能指到 `loop.py` / `runner.py` / tools / security。  
3. eval 报告数字；失败 taxonomy 在 [`eval/README.md`](./eval/README.md)。  
4. 动线：WebUI 打开 Notes —— 说明迭代 A 是体验层（TTL / 防抖 / scope），见 [`iteration-a/`](./iteration-a/)。  
5. 复盘：[`retrospective-agent.md`](./retrospective-agent.md)「为什么文件真源 / 替代方案」。

### 分镜（可录屏）

1. 终端跑 eval → 亮出 pass rate。  
2. WebUI 说「记一下…」→ 打开 inbox 文件。  
3. 建路径 → 打开 `path.md`。  
4. 白板 / 口述：Inbound → Bus → Loop → Runner → Tools → Outbound。

## 5. 面试提纲（机制 + 数字）

1. **用户与任务是谁？** 自学者；捕获 / 路径 / 进度文件，不是泛助手。  
2. **Agent loop 在哪？** `AgentLoop` 装配上下文，`AgentRunner` 跑 tool 循环。  
3. **权限边界？** workspace 限制、SSRF、Skill 禁止无同意安装与空转 `complete_goal`。  
4. **如何证明？** mock eval 编排与文件副作用；live 可补 latency/token。  
5. **你改过什么？** 教练 Skill + WebUI 动线 + 迭代 A 性能；用复盘区分「正确性」与「体验」。

## 6. 文档地图

| 文档 | 用途 |
|------|------|
| [`BASELINE.md`](./BASELINE.md) | 一句话 + 黄金路径基线 |
| [`architecture-agent.md`](./architecture-agent.md) | 机制说明书 |
| [`eval/`](./eval/) | cases + runner + 报告 |
| [`retrospective-agent.md`](./retrospective-agent.md) | 设计取舍与简历 bullet |
| [`NEXT.md`](./NEXT.md) | Phase 5：有数据后再做的加深项 |
