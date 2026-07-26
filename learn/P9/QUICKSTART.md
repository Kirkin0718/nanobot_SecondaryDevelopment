# Phase 9 快速上手 — 个人办公/学习教练

> 10 分钟跑通 **捕获 → 路径 → 简报** 闭环。

---

## 1. 安装（Windows）

在 nanobot **仓库根目录** PowerShell 执行：

```powershell
.\learn\P9\install.ps1
```

自定义 workspace：

```powershell
.\learn\P9\install.ps1 -Workspace "D:\my-nanobot-workspace"
```

安装脚本会：

- 创建 `inbox/`、`goals/`、`learning/`、`briefs/`
- 安装 3 个 Skill 到 `workspace/skills/`
- 拷贝 `HEARTBEAT.md`、`goals/active.md`
- 追加教练约定到 `AGENTS.md`

---

## 2. 确认 config

`~/.nanobot/config.json` 建议开启：

```json
{
  "agents": {
    "defaults": {
      "dream": { "enabled": true, "intervalH": 2 },
      "timezone": "Asia/Shanghai"
    }
  },
  "gateway": {
    "heartbeat": { "enabled": true }
  }
}
```

重启 gateway：

```powershell
nanobot gateway
```

---

## 3. 三条验收对话

在 WebUI 或 CLI 交互模式依次试：

| # | 你说 | 预期 |
|---|------|------|
| 1 | **记一下：明天交周报** | `inbox/今天.md` 多一条 `- [ ]` |
| 2 | **我想 4 周学完 Python 基础，帮我建学习路径** | `learning/python-basics/path.md` + `long_task` + `goals/active.md` 更新 |
| 3 | **今日简报** | `briefs/今天-morning.md` 生成，含四段结构 |

---

## 4. 日常使用节奏

| 时段 | 你做什么 | nanobot 做什么 |
|------|----------|----------------|
| **白天** | 「记一下…」「今天学了第 3 章」 | capture / learning-coach 写文件 |
| **夜间** | 无 | Dream 归档 inbox → MEMORY / log |
| **早晨** | 打开 WebUI 或等推送 | HEARTBEAT 跑 morning-brief（≥7:00 且今日 brief 不存在） |

可选：精确 **7:30** 简报用 cron（见 [`implementation-roadmap.md`](./implementation-roadmap.md) PR-3）。

---

## 5. 可选：强化 Dream 归档

```text
/dream-prompt init
```

然后合并 [`prompts/dream-coach.example.md`](./prompts/dream-coach.example.md) 中的规则到 `workspace/prompts/dream.md`。

---

## 6. 目录速查

| 路径 | 作用 |
|------|------|
| `inbox/YYYY-MM-DD.md` | 碎片收件箱 |
| `goals/active.md` | 最多 2 个长期目标摘要 |
| `learning/{topic}/path.md` | 学习/项目路径（真源） |
| `learning/{topic}/log.md` | 每日进度 |
| `briefs/YYYY-MM-DD-morning.md` | 晨间简报 |

---

## 7. 常见问题

**Q：简报没自动来？**  
检查 `HEARTBEAT.md` 是否在 workspace、heartbeat 是否 enabled；或手动说「今日简报」。

**Q：Skill 没生效？**  
确认 `workspace/skills/*/SKILL.md` 存在；重启 gateway；新会话再试。

**Q：第三个 long-goal 建不了？**  
设计如此：最多 2 个 active，先 `complete_goal` 一个。

**Q：和 ChatGPT 有啥区别？**  
路径和进度在 **workspace 文件**里；**早晨主动简报**；**长期目标**跨天续上。

---

## 8. 下一步开发

按 [`implementation-roadmap.md`](./implementation-roadmap.md) 做 PR-1～PR-3；完成后在 [`README.md`](./README.md) 记录进度。
