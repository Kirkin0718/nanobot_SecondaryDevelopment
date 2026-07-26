# Phase 2：Agent 核心循环 ⭐

**状态**：未开始
**总览**：[`../learning-roadmap.md`](../learning-roadmap.md) § Phase 2

## 目标

吃透 `AgentLoop` 与 `AgentRunner`；理解一轮对话从上下文构建到 tool 循环的完整路径。

## 必读

1. `nanobot/agent/loop.py`
2. `nanobot/agent/runner.py`
3. `nanobot/agent/context.py`
4. `nanobot/agent/hook.py`
5. `nanobot/utils/prompt_templates.py` + `nanobot/templates/`

## 动手

- [ ] 跟读 `tests/agent/test_runner_core.py`
- [ ] 改 `templates/identity.md` 一句话，观察行为变化
- [ ] `pytest tests/agent/test_runner_core.py -v`

## 验收标准

- [ ] 能手绘 Runner 的 LLM ↔ Tool 循环
- [ ] 能判断问题该查 loop.py 还是 runner.py
