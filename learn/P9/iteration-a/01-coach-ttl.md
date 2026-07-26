# A1 — Coach 请求 TTL + in-flight 去重

| 项 | 值 |
|----|-----|
| PR | [#1](https://github.com/Kirkin0718/nanobot_SecondaryDevelopment/pull/1) |
| 分支 | `perf/coach-ttl` |
| 标题 | `perf(webui): dedupe coach GET with TTL and turn-end debounce` |
| 核心文件 | `webui/src/hooks/useCoachState.ts` |

## 1. 要解决什么

动线工作台里进度条、Notes、Checkin、Hub、回合结束都会触发 `GET .../coach`。无 TTL 时，用户连开几个抽屉会打出一串重复请求，放大网关与磁盘读。

## 2. 行为契约（维护时以此为准）

| 场景 | 行为 |
|------|------|
| 软 `refresh()` | 若已有 `coach` 且距上次成功拉取 `< COACH_TTL_MS`（默认 10s），**直接返回缓存**，不发网络 |
| 并发 `refresh()` | 共用同一个 `inFlightRef` Promise；后到的调用 await 同一请求 |
| `refresh({ force: true })` | 绕过 TTL，仍可与 in-flight 合并（若已有进行中请求则复用） |
| `refreshSoon()` | 重置 300ms 定时器，到期后 **`force: true`** 刷新（回合结束防抖） |
| `sessionKey` 变化 / mount | effect 内清空 TTL 时钟与 in-flight，**强制**拉一次 |
| 会话切换迟到响应 | 若返回时 `sessionKey` 已变，丢弃 payload，不 `setCoach` |

## 3. 调用图

```text
ThreadShell
  └─ useCoachState(sessionKey) ──► CoachProvider
        │
        ├─ mount / sessionKey change ── refresh({ force: true })
        ├─ 回合结束 handleTurnEnd ──── refreshSoon()
        │
CheckinDrawer
        ├─ open ───────────────────── refresh()          # 走 TTL
        └─ 打卡成功 ───────────────── refresh({ force: true })

其它消费者（Progress / Notes / Hub）
        └─ 通常只读 coach；需要最新时 refresh() 或 force
```

### 文件职责

| 文件 | 改什么 |
|------|--------|
| `useCoachState.ts` | TTL、in-flight、`refreshSoon`、导出常量 |
| `ThreadShell.tsx` | 回合结束改调 `refreshSoon`（勿改回同步连打 `refresh`） |
| `CheckinDrawer.tsx` | 打卡后必须 `force: true`；打开抽屉用软刷新即可 |
| `coach-workspace.test.tsx` | `useCoachState`：TTL 内二次 soft refresh 不增 fetch；force 会增 |

## 4. 调参

| 常量 | 默认 | 调大 | 调小 |
|------|------|------|------|
| `COACH_TTL_MS` | `10_000` | 更少请求，状态更「旧」 | 更实时，请求更多 |
| `COACH_TURN_END_DEBOUNCE_MS` | `300` | 合并更多连发回合结束 | 更快看见进度/打卡态 |

**何时必须 `force: true`**

- 本地已写盘且 UI 必须立刻反映（打卡成功、笔记保存成功若依赖 coach 摘要等）
- 已知服务端刚变、不能信 TTL 窗口内缓存

**何时不要 force**

- 抽屉 `open`、进度条关注、用户只是扫一眼——交给 TTL

## 5. 测试与验收

自动化（在 `webui/`）：

```powershell
npm test -- src/tests/coach-workspace.test.tsx
```

关注用例名：`dedupes soft refresh within TTL and refetches when forced`。

手动：

1. Network 过滤 coach；进入会话（1 次 mount 请求）。
2. 10s 内连开 Notes / Checkin：不应每个抽屉都新增 GET。
3. 打卡一次：应出现 force 请求，进度/天数更新。
4. 快速切换会话：不应把旧会话 payload 写到新会话。

## 6. 常见故障

| 现象 | 排查 |
|------|------|
| 打卡后进度不变 | Checkin 是否仍 `refresh()` 无 `force`；或 TTL 误吃了陈旧缓存 |
| 回合结束后疯狂 GET | 是否绕过 `refreshSoon` 直接循环 `refresh({force})` |
| 切会话串数据 | `sessionKeyRef` 守卫是否被删；迟到响应分支 |
| 测试 flake | fake timers 与真实 `Date.now` TTL；mount 的 force 计入 call 次数 |

## 7. 回滚

只回滚本切片：还原上述 4 个文件到合入前，不影响 A2/A3。  
不要只删 TTL 而留下 `refreshSoon` 空实现——二者同属 A1 契约。
