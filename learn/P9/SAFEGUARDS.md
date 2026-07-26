# 安全与体验护栏（来自 2026-07-23 实测）

## 问题回顾

1. **阶段讲解不足**：用户只看到周报式清单，不理解「现在在哪 / 今天过关标准」。
2. **擅自安装**：登记目标后，sustained-goal 续跑触发 `winget` / 下载 MSI，未经用户同意 → 安全与体验双重失败。
3. **误关目标**：无人回复时 agent 调用 `complete_goal`「避免空转」。

## 已写入规则的位置

| 规则 | 文件 |
|------|------|
| 安装必须征得同意；禁止空转关目标；人话阶段模板 | `skills/learning-coach/SKILL.md` |
| 同上（workspace 级） | `templates/AGENTS.coach-snippet.md` |
| path 增加「给学习者」 | `templates/learning-path.md` |
| 简报不触发安装 | `skills/morning-brief/SKILL.md` |

## 用户侧推荐话术

- 只要指导：`开始第 1 天，先不要安装，只告诉我怎么做`
- 同意代装：`同意安装 JDK 17（Temurin）`
- 拒绝代装：`不要自动安装，给我官网链接即可`

## 同步到本机 workspace

```powershell
Copy-Item D:\agent\nanobot\learn\P9\skills\learning-coach\SKILL.md "$env:USERPROFILE\.nanobot\workspace\skills\learning-coach\" -Force
Copy-Item D:\agent\nanobot\learn\P9\skills\morning-brief\SKILL.md "$env:USERPROFILE\.nanobot\workspace\skills\morning-brief\" -Force
```

然后把 `templates/AGENTS.coach-snippet.md` 里 **Safety / Clarity** 两段手工合并进 `AGENTS.md`（或重跑安装后去重）。

重启 gateway 后再测。
