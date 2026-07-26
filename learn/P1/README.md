# Phase 1：消息总线与入口

**状态**：未开始  
**总览**：`[../learning-roadmap.md](../learning-roadmap.md)` § Phase 1

## 目标

理解 Channel 与 Agent 之间为何用 MessageBus 解耦；弄清 CLI / Gateway 如何启动核心组件。

## 必读

- `nanobot/bus/`
- `nanobot/bus/events.py`
- `nanobot/cli/commands.py`
- `nanobot/gateway/service.py`

## 动手

- [ ] 在 MessageBus 加临时日志，观察 WebUI 一条消息的 inbound/outbound 时序
- [ ] 读 gateway 相关 smoke 测试

## 验收标准

- [ ] 能解释为何 Channel 不直接调用 AgentLoop
- [ ] 能说出 `nanobot gateway` 启动时初始化了哪些组件