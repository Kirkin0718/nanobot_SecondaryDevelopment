# WebUI 动线工作台 — 回顾、启示与二次开发（性能向）

> 时间范围：约 2026-07-24～2026-07-25  
> 范围：P9 教练场景 + WebUI「动线工作台」全局改版及 P0～P2 收口  
> 状态：MVP 已可用；后续以性能与体验债为主，少堆功能

---

## 1. 过往工作摘要

### 1.1 产品形态演进

| 阶段 | 形态 | 结果 |
|------|------|------|
| 初版 | Composer 内嵌 `GoalCoachPanel`（笔记/打卡挤在输入区） | 可用但认知负担高 |
| 方案 2 | **动线工作台**：左栏过往对话 → 顶栏四步动线 → 聊天 → 笔记/打卡独立面 | 与教练「确认目标→对话→沉淀」一致 |
| 增强 | 笔记右侧半屏、范围勾选 AI 生成、`hiddenHistory`、进度集合 Hub | 超出原计划，贴合真实使用 |

四步动线：`确认目标` → `选择对话` → `进行对话` → `笔记/打卡`。

### 1.2 主要交付物（代码侧）

| 区域 | 路径 / 能力 |
|------|-------------|
| 动线 | `webui/src/components/journey/JourneyStrip.tsx` |
| 进度 | `GoalProgressBar`（仅进度 + Hub） |
| 笔记 | `NotesDrawer` + `RichNotesEditor` + `lib/rich-notes.ts` |
| 打卡 | `CheckinDrawer` + `checkin_days` API |
| 集合 | `ProgressHubDrawer` + `GET .../coach/hub` |
| 状态 | `useCoachState` + `CoachProvider`（会话级共享） |
| 后端 | `nanobot/webui/coach.py`（notes / checkin / hub / 白名单 path） |
| Skill | `learn/P9/skills/learning-coach/`（行为与安全护栏） |

### 1.3 分优先级收口（P0～P2）

| 级别 | 主题 | 做了什么 |
|------|------|----------|
| **P0** | 正确性与减负 | 统一 coach 刷新；去掉进度条与动线重复 CTA；有目标时隐藏 Composer 目标条；移动端笔记全屏 +「返回对话」 |
| **P1** | 发现性与动线语义 | 顶栏笔记/打卡/Hub；Hub 打开可编辑笔记（含 path 白名单）；笔记完成态含磁盘内容；选对话/进行对话可聚焦 |
| **P2** | 可维护与硬化 | 教练提示词进 i18n；粘贴 HTML 清洗；TOC 中英；ThreadShell 烟雾测试 |

明确不做（当时）：TipTap、改 `loop.py` 审批、完整月历热力图、把 Settings 塞进四步动线。

---

## 2. 改进过的问题

### 2.1 体验与信息架构

| 问题 | 改进 |
|------|------|
| 笔记/打卡挤在输入框上方 | 独立半屏 / Sheet，输入区只负责对话 |
| 发现不了 Hub / 笔记入口 | 顶栏稳定入口 + 动线步骤点击 |
| 小屏笔记「吃掉」对话无返回 | `fixed` 全屏 + `backToChat` |
| 目标相关 UI 三层叠（动线 / 进度条 / Composer） | 职责拆分：动线管步骤，进度条管进度，Composer 只管运行计时 |
| Hub 打开笔记只能预览 | 进入可编辑 `NotesDrawer`，异路径可白名单写回 |

### 2.2 数据一致性

| 问题 | 改进 |
|------|------|
| 进度条 / 打卡 / 笔记各自 `fetchCoachState` | `CoachProvider` 单源；打卡与回合结束统一 `refresh` |
| 动线「已完成」过弱（仅本机 visited） | 结合磁盘 notes、今日打卡 |
| AI 生成提示污染会话 transcript | `hiddenHistory` / `_hidden_history` 不写可见气泡 |

### 2.3 Agent 行为（与 WebUI 配套）

| 问题 | 改进 |
|------|------|
| 等待用户时刷「用户没有新输入…」 | `awaiting_user` + 可见回复后暂停；默认可超时结束等待 |
| 模型配置过期（如 deepseek-chat） | 切到可用模型（如 deepseek-v4-flash） |
| workspace `AGENTS.md` 编码损坏 | UTF-8 重写 + 读取侧 GBK→UTF-8 自愈意识 |

### 2.4 工程债

| 问题 | 改进 |
|------|------|
| 硬编码中文「【教练·…】」 | `thread.coach.prompts.*` 中英文案 |
| contentEditable 粘贴脏 HTML | `sanitizePastedHtml` / `onPaste` |
| 缺集成回归 | `coach-workspace` + ThreadShell 烟雾 + Python `test_coach` |

---

## 3. 得到的启示

### 3.1 产品

1. **动线是向导，不是仪表盘**  
   第一步视口只回答「我现在该干什么」；进度、Hub、设置不要抢戏。
2. **一个主表面原则**  
   笔记应有一个可编辑主入口；预览只能当次要路径，否则用户会困惑「为什么这里不能改」。
3. **协议字符串 ≠ UI 文案**  
   给模型的结构化提示应进 i18n/Skill；界面按钮文案与落盘 Markdown 方言分开维护。
4. **先钉产品决策再加功能**  
   「笔记是会话工作台还是主题知识库」「打卡是否推动 path.md」不定，Hub/多 topic 会反复改。

### 3.2 架构

1. **会话级共享状态优于组件内各自拉数**  
   coach 类数据适合 Provider；否则打卡与进度条必然不同步。
2. **后端保持薄、文件仍是真相**  
   `coach.py` 读写 workspace Markdown，不另起业务库，利于 Skill 与 WebUI 共用同一套约定。
3. **增量 API 优于大重构**  
   `checkin_days`、`path` 白名单、hub 列表都是无破坏扩展。
4. **contentEditable 够 MVP，不够「永久方案」**  
   粘贴/嵌套列表/撤销仍脆弱；下一阶段再评估是否上轻量编辑器。

### 3.3 协作与节奏

1. **计划落地后立刻还「状态同步 + UI 职责」债**，再扩功能，ROI 最高。  
2. **测试要跟协议走**：hiddenHistory、coach mock 顺序、i18n 键对齐，都是回归高发区。  
3. **Skill 安全护栏（禁止擅自安装等）必须与 WebUI 选项芯片、等待态一起设计**，否则一边「停等用户」、一边 agent 空转。

---

## 4. 二次开发：性能向路线

下文按「先测再改、改完能证明」的原则。目标不是盲目缓存，而是降低 **首屏成本、重复网络、大笔记序列化、无用重渲染**。

### 4.1 当前热点（推测，需用测量验证）

| 热点 | 现象 | 风险 |
|------|------|------|
| 多处触发 `GET /coach` | 打开会话、打开抽屉、回合结束、Provider mount | 网关与磁盘读放大 |
| 笔记半屏 + Markdown 预览 | 大 `notes.md` 时 `markdownToHtml` / 预览组件 | 主线程卡顿 |
| `RichNotesEditor` 每次 `onInput` → HTML↔MD | 按键级序列化 | 输入延迟 |
| Hub 一次扫 `learning/*` | topic 多时列表变慢 | Hub 打开变慢 |
| ThreadShell 大树 | 动线 + 进度 + 视口 + 抽屉同树 | 无关状态变更导致重渲染 |
| 历史消息进笔记 scope | 默认勾选近 24 条拼进 prompt | token 与发送体积 |

### 4.2 性能目标（建议验收数字）

| 指标 | 建议目标（桌面冷启动、本机 gateway） |
|------|--------------------------------------|
| 打开已有会话到动线可见 | ≤ 300ms（不含 LLM） |
| 连续打开 Notes / Checkin / Hub | 额外 coach 请求 ≤ 1 次/会话/30s（可合并） |
| 笔记 50KB Markdown 输入一帧 | 输入→画面 ≤ 50ms（可防抖序列化） |
| Hub 打开（≤20 topics） | ≤ 500ms |
| AI 生成笔记 prompt | 默认 scope 字符上限（如 8～12K）可配置 |

用 Chrome Performance + Network、以及 gateway 访问日志验证；没有基线不要做「感觉优化」。

### 4.3 二次开发优先级（性能）

#### P0 — 低风险、高收益

1. **Coach 请求合并与 TTL**  
   - Provider 内：`refresh` 做 in-flight 去重 + 短 TTL（如 5～15s）  
   - 抽屉 `open` 时若缓存新鲜则跳过  
   - 回合结束 refresh 可 debounce（如 300ms）
2. **笔记序列化防抖**  
   - 编辑器用 HTML 工作副本；`htmlToMarkdown` 仅在 blur / 900ms debounce 存盘（已有存盘 debounce，可把序列化也移出每键）  
   - 预览模式用 `startTransition` 或延迟切换
3. **Scope 体积上限**  
   - 勾选消息总长截断；超出提示「已截断」  
   - 避免默认全选超长历史

#### P1 — 结构优化

4. **Hub 懒加载与分页**  
   - 列表先返回 topic + progress，notes_preview 按需  
   - 或限制 preview 字节（已有预览长度时可再降）
5. **组件拆分与 memo**  
   - `JourneyStrip` / `GoalProgressBar` / 抽屉与消息列表隔离，避免消息流式更新带动线重渲染  
   - 遵循仓库 React Compiler 习惯：不为 memo 而 memo，只在测量后加
6. **按需加载教练模块**  
   - `NotesDrawer` / `RichNotesEditor` / Hub 用 `React.lazy`，无会话或未点开时不进主包关键路径

#### P2 — 中长期

7. **笔记索引侧车（可选）**  
   - 若 Hub 变慢：workspace 旁维护 `learning/_index.json`（topic、mtime、进度摘要），由 coach 写入时更新；Skill 仍以 md 为准  
8. **WebSocket 推送 coach 变更**  
   - path/notes/log 变更时推 `coach_updated`，前端少轮询  
9. **编辑器策略**  
   - 若笔记经常 >100KB：评估轻量编辑器或「源码模式默认 + 预览只读」双模，减少 contentEditable 成本  
10. **服务端读缓存**  
    - 同进程内对 `path.md`/`notes.md` 做 mtime 缓存；多 worker 时注意失效

### 4.4 不建议的「伪性能」

- 为所有列表加复杂虚拟列表（会话量通常不够大）  
- 未测量就上全局 Redux/大型状态库  
- 把笔记改成数据库而抛弃 Markdown 真相源（破坏 Skill/可移植性）  
- 在动线区堆图表、热力图、多目标看板（首屏与性能双杀）

### 4.5 建议的下一迭代切片（可演示）

**迭代 A（约 0.5～1 天）**  
Coach TTL + in-flight 去重 + 笔记序列化移出按键路径 + scope 截断。  
验收：Network 面板同会话打开三次抽屉，coach GET 次数明显下降；大笔记输入不卡。

**迭代 B（约 1～2 天）**  
Hub 懒预览 + 教练抽屉 lazy + Journey/Progress 与消息列表渲染隔离。  
验收：Hub 打开时间、主包/路由体积、流式输出时动线 FPS。

**迭代 C（按需）**  
`coach_updated` 推送或 `_index.json`；仅当 topic 数或笔记体积成为真实瓶颈时做。

---

## 5. 与 P9 其它文档的关系

| 文档 | 关系 |
|------|------|
| [`product-spec.md`](./product-spec.md) | 产品目标与验收；本文补「WebUI 落地后的债与性能」 |
| [`implementation-roadmap.md`](./implementation-roadmap.md) | PR-1～3 仍以 Skill/workspace 为主；WebUI 动线是并行增强轨 |
| [`SAFEGUARDS.md`](./SAFEGUARDS.md) | 安全护栏不变；性能优化不得削弱同意安装/等待用户语义 |
| [`workspace-layout.md`](./workspace-layout.md) | 文件约定仍是真相源；索引侧车只能是加速层 |

---

## 6. 一句话结论

动线工作台把 P9 教练从「聊天插件」收成了**可感知的工作流**；后续价值不在继续堆面板，而在：**更少的重复拉取、更轻的笔记编辑路径、更懒的 Hub**，并用指标证明每一次二次开发。
