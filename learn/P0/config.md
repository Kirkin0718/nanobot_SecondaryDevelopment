这份配置是 nanobot 的完整实例配置文件 `config.json`，用于控制其运行时行为。我来逐层解读其主要结构和关键配置项：

---

## 顶层结构概览

配置文件包含七个核心顶层模块：

| 模块              | 作用                                           |
| ----------------- | ---------------------------------------------- |
| `agents`        | Agent 核心行为（模型、上下文、记忆、Dream 等） |
| `channels`      | 各类聊天渠道接入（WebSocket、Discord、邮件等） |
| `transcription` | 语音/音频转录设置                              |
| `providers`     | LLM 提供商密钥和端点配置                       |
| `api`           | OpenAI 兼容 API 服务设置                       |
| `gateway`       | 网关服务（健康检查、心跳）                     |
| `tools`         | 工具能力开关（网页、shell、文件、图像生成等）  |
| `modelPresets`  | 预定义的模型组合，供 Agent 选用                |

---

## 1. Agents 模块（Agent 核心行为）

```json
"agents": {
  "defaults": {
    "workspace": "~/.nanobot/workspace",
    "modelPreset": "primary",      // 使用下方 modelPresets 中的 "primary"
    "model": "anthropic/claude-opus-4-5",  // 直接指定（会被 preset 覆盖）
    "provider": "auto",            // 自动推断提供商
    "maxTokens": 8192,
    "contextWindowTokens": 200000,
    "temperature": 0.1,            // 较低温度，输出更确定性
    "maxToolIterations": 200,      // 单次对话最多工具调用轮数
    "maxConcurrentSubagents": 1,   // 并行子 Agent 数量
    "failOnToolError": true,       // 工具失败则中断
    "maxToolResultChars": 16000,   // 工具返回结果截断长度
    "timezone": "UTC",
    "botName": "nanobot",
    "botIcon": "🐈",
    "unifiedSession": false,       // 不同渠道是否共享同一会话
    "dream": {                     // 长期记忆整合任务
      "enabled": true,
      "intervalH": 2,              // 每 2 小时运行一次
      "maxBatchSize": 20,
      "maxIterations": 15
    }
  }
}
```

**关键点**：

- 当前通过 `modelPreset: "primary"` 指向下方定义的 `primary` 预设（实际使用 `deepseek-chat`）。
- Dream 每 2 小时将会话历史整合到长期记忆中，防止上下文溢出。
- `unifiedSession: false` 表示每个渠道/用户独立会话。

---

## 2. Providers 模块（提供商配置）

列出了 40+ 个提供商，但**实际有密钥的只有 `deepseek`，**其他（OpenAI、Anthropic、OpenRouter、Gemini 等）均为 null，暂未启用。

**注意**：`modelPresets.primary` 中指定 `provider: "deepseek"`、`model: "deepseek-chat"`，所以实际生效的是 DeepSeek 提供商。

---

## 3. ModelPresets 模块（模型预设）

```json
"modelPresets": {
  "primary": {
    "label": "Primary",
    "model": "deepseek-chat",
    "provider": "deepseek",
    "maxTokens": 8192,
    "contextWindowTokens": 200000,
    "temperature": 0.1,
    "reasoningEffort": null
  }
}
```

这里定义了名为 `primary` 的预设，被 `agents.defaults.modelPreset` 引用。实际调用的是 DeepSeek 的 `deepseek-chat` 模型。

---

## 4. Channels 模块（渠道接入）

**已启用**的渠道：`websocket`（`enabled: true`）

| 渠道       | 状态    | 备注                                   |
| ---------- | ------- | -------------------------------------- |
| WebSocket  | ✅ 启用 | 监听 `127.0.0.1:8765`，需 token 认证 |
| DingTalk   | ❌ 禁用 |                                        |
| Discord    | ❌ 禁用 |                                        |
| Email      | ❌ 禁用 |                                        |
| Feishu     | ❌ 禁用 |                                        |
| Mattermost | ❌ 禁用 |                                        |
| MoChat     | ❌ 禁用 |                                        |
| MSTeams    | ❌ 禁用 |                                        |
| Signal     | ❌ 禁用 |                                        |
| WeCom      | ❌ 禁用 |                                        |
| WeChat     | ❌ 禁用 |                                        |
| WhatsApp   | ❌ 禁用 |                                        |

WebSocket 细节：

- `websocketRequiresToken: true` — 连接需要 token
- `tokenIssueSecret: "123456"` — 用于签发 token 的密钥（生产环境应更换）
- `streaming: true` — 流式输出

---

## 5. Gateway 模块（网关服务）

```json
"gateway": {
  "host": "127.0.0.1",
  "port": 18790,              // 健康检查端口
  "restartMode": "auto",
  "heartbeat": {
    "enabled": true,
    "intervalS": 1800,        // 每 30 分钟执行一次心跳任务
    "keepRecentMessages": 8
  }
}
```

- 健康检查端点：`http://127.0.0.1:18790/health`
- 心跳每 30 分钟扫描 `HEARTBEAT.md` 中的主动任务并执行。

---

## 6. API 模块（OpenAI 兼容服务）

```json
"api": {
  "host": "127.0.0.1",
  "port": 8900,              // `nanobot serve` 监听的端口
  "timeout": 120.0,
  "apiKey": ""               // 为空表示不校验调用方密钥
}
```

通过 `nanobot serve` 启动后，可用 `http://127.0.0.1:8900/v1/chat/completions` 提供 OpenAI 兼容接口。

---

## 7. Tools 模块（工具能力）

| 工具组              | 状态    | 关键限制                                        |
| ------------------- | ------- | ----------------------------------------------- |
| `web`             | ✅ 启用 | 搜索用 DuckDuckGo，抓取用 Jina Reader           |
| `exec` (shell)    | ✅ 启用 | 超时 60s，`sandbox: ""`（无沙箱），无路径限制 |
| `file`            | ✅ 启用 | 允许读写工作区文件                              |
| `cliApps`         | ✅ 启用 | 可安装/运行 CLI 工具                            |
| `my`              | ✅ 启用 | 记忆工具（`allowSet: false` 禁止写入）        |
| `imageGeneration` | ❌ 禁用 |                                                 |

**安全相关**：

- `restrictToWorkspace: false` — **允许工具访问工作区外文件**
- `exec.sandbox: ""` — **无沙箱**，shell 命令可全系统执行
- `ssrfWhitelist: []` — 无 SSRF 白名单

> ⚠️ 若用于生产或开放环境，建议收紧以上配置。

---

## 8. Transcription 模块（语音转录）

```json
"transcription": {
  "enabled": true,
  "provider": null,   // 使用 channels 中指定的 transcriptionProvider（groq）
  "maxDurationSec": 120,
  "maxUploadMb": 25
}
```

虽然这里 `provider: null`，但 `channels` 中设置了 `transcriptionProvider: "groq"`，实际使用 Groq 进行语音转文字。

---

## 整体工作流总结

```text
用户消息 → WebSocket 渠道
         → Agent 选择 "primary" 预设
         → 使用 DeepSeek 提供商 (api.deepseek.com)
         → 模型 "deepseek-chat"
         → 必要时调用工具（web/exec/file）
         → 回复流式返回 WebSocket
```

---

## 值得注意的配置组合

| 配置项                                                            | 当前值          | 影响                |
| ----------------------------------------------------------------- | --------------- | ------------------- |
| `provider: "auto"` + preset 指定 `provider: "deepseek"`       | 实际用 DeepSeek | 预设优先级更高      |
| `dream.enabled: true` + `intervalH: 2`                        | 每 2h 整合记忆  | 长期上下文可持续    |
| `exec.sandbox: ""` + `restrictToWorkspace: false`             | 无限制          | 有安全风险          |
| `websocketRequiresToken: true` + `tokenIssueSecret: "123456"` | 需 token        | 建议更换默认 secret |
| `unifiedSession: false`                                         | 独立会话        | 多用户互不干扰      |
