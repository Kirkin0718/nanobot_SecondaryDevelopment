# 读 gateway 相关 smoke 测试

## 测试整体结构

```
test_gateway_webui_bootstrap_message_and_thread_hydration
                    │
                    ▼
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   启动 Gateway          模拟 WebUI 客户端
   (子进程)              (WebSocket 连接)
        │                       │
        └───────────┬───────────┘
                    ▼
           验证完整消息流
     (bootstrap → 连接 → 发消息 → 收回复 → 检查会话)
```

---

## 逐段解析

### 1. 辅助函数

#### 端口分配

```python
def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])
```

**作用**：让操作系统分配一个**空闲端口**，避免测试时端口冲突。

---

#### 生成测试配置

```python
def _write_smoke_config(path: Path, *, workspace: Path, ws_port: int, gateway_port: int) -> None:
    config = {
        "agents": {
            "defaults": {
                "workspace": str(workspace),
                "provider": "custom",           # ← 使用 mock provider
                "model": "custom/smoke-model",  # ← 不调用真实 API
                "maxToolIterations": 1,
                "dream": {"enabled": False},    # ← 禁用后台任务
            }
        },
        "providers": {
            "custom": {
                "apiKey": "smoke-no-external-call",
                "apiBase": "http://127.0.0.1:9/v1",  # ← 不存在的地址
            }
        },
        "channels": {
            "websocket": {
                "enabled": True,
                "host": "127.0.0.1",
                "port": ws_port,
                "tokenIssueSecret": _BOOTSTRAP_SECRET,
            }
        },
        "gateway": {
            "host": "127.0.0.1",
            "port": gateway_port,
            "heartbeat": {"enabled": False},   # ← 禁用定时任务
        },
    }
```

**关键点**：

- `provider: "custom"` + `apiBase: "http://127.0.0.1:9/v1"` — **不调用真实 LLM API**，测试环境隔离
- `dream.enabled: false` + `heartbeat.enabled: false` — 禁用后台任务，避免干扰
- `tokenIssueSecret` — 用于 WebUI 的认证引导

---

### 2. 启动 Gateway 子进程

```python
def _start_gateway(config_path: Path, log_path: Path) -> subprocess.Popen[bytes]:
    log_file = log_path.open("wb")
    process = subprocess.Popen(
        [
            sys.executable,          # 当前 Python 解释器
            "-m", "nanobot",         # python -m nanobot
            "gateway",               # gateway 子命令
            "--config", str(config_path),
        ],
        cwd=Path(__file__).resolve().parents[2],  # 项目根目录
        stdout=log_file,
        stderr=subprocess.STDOUT,
    )
    return process
```

**关键点**：

- 启动一个**独立的子进程**运行 Gateway
- 输出重定向到日志文件（方便调试）
- 测试结束后 `_stop_gateway()` 会终止它

---

### 3. Bootstrap（引导认证）

```python
def _get_bootstrap(url: str) -> dict:
    response = httpx.get(
        url,
        headers={"X-Nanobot-Auth": _BOOTSTRAP_SECRET},
        timeout=5.0,
    )
    return response.json()
```

**Bootstrap 返回**：

```json
{
    "model_name": "custom/smoke-model",
    "ws_url": "ws://127.0.0.1:8765/ws",
    "token": "eyJhbGci...",      // WebSocket 认证 token
    "api_token": "eyJhbGci..."   // REST API 认证 token
}
```

---

### 4. 核心测试流程

```python
@pytest.mark.asyncio
async def test_gateway_webui_bootstrap_message_and_thread_hydration(tmp_path: Path):
    # 1. 准备环境
    ws_port = _free_port()
    gateway_port = _free_port()
    workspace = tmp_path / "workspace"
    config_path = tmp_path / "config.json"
    _write_smoke_config(...)

    # 2. 启动 Gateway 子进程
    process = _start_gateway(config_path, log_path)
    base_url = f"http://127.0.0.1:{ws_port}"

    try:
        # 3. Bootstrap 获取连接信息
        bootstrap = _wait_for_bootstrap(base_url, process, log_path)
        assert bootstrap["model_name"] == "custom/smoke-model"

        # 4. WebSocket 连接
        ws_url = f'{bootstrap["ws_url"]}?token={bootstrap["token"]}&client_id=smoke'
        async with websockets.connect(ws_url) as ws:
            # 5. 等待 ready 事件
            ready = await _recv_until(ws, "ready")
            assert ready["client_id"] == "smoke"

            # 6. 创建新聊天
            await ws.send(json.dumps({"type": "new_chat"}))
            attached = await _recv_until(ws, "attached")
            chat_id = attached["chat_id"]
            await _recv_until(ws, "session_updated")

            # 7. 发送消息（使用 /model 命令，不调用外部 API）
            await ws.send(json.dumps({
                "type": "message",
                "chat_id": chat_id,
                "content": "/model",  # ← 特殊命令，返回当前模型名
                "webui": True,
                "turn_id": "smoke-turn",
            }))
        
            # 8. 验证回复
            answer = await _recv_until(ws, "message")
            assert "Current model: `custom/smoke-model`" in answer["text"]
            await _recv_until(ws, "turn_end")

        # 9. 验证会话已保存
        api_token = _wait_for_bootstrap(base_url, process, log_path)["api_token"]
        sessions = _get_json(f"{base_url}/api/sessions", token=api_token)
        key = f"websocket:{chat_id}"
        assert key in {row["key"] for row in sessions["sessions"]}

        # 10. 验证消息历史
        encoded_key = quote(key, safe="")
        thread = _get_json(
            f"{base_url}/api/sessions/{encoded_key}/webui-thread",
            token=api_token,
        )
        contents = [str(msg.get("content") or "") for msg in thread["messages"]]
        assert "/model" in contents
        assert any("Current model: `custom/smoke-model`" in text for text in contents)
    finally:
        _stop_gateway(process)
```

---

## WebUI → Gateway 的完整 WebSocket 协议

从这个测试里可以看清 WebUI 和 Gateway 的通信协议：

### 客户端 → Gateway（WebSocket）

| 消息类型     | 格式                                                                          | 说明       |
| ------------ | ----------------------------------------------------------------------------- | ---------- |
| `new_chat` | `{"type": "new_chat"}`                                                      | 创建新对话 |
| `message`  | `{"type": "message", "chat_id": "...", "content": "...", "turn_id": "..."}` | 发送消息   |

### Gateway → 客户端（WebSocket）

| 事件类型            | 说明                              |
| ------------------- | --------------------------------- |
| `ready`           | 连接就绪，返回 `client_id`      |
| `attached`        | 会话已创建/附加，返回 `chat_id` |
| `session_updated` | 会话状态已更新                    |
| `message`         | 收到 Agent 回复（流式/完整）      |
| `turn_end`        | 本轮对话结束                      |

---

## 这个测试验证了什么

| 验证点                       | 代码位置                                                   |
| ---------------------------- | ---------------------------------------------------------- |
| Gateway 能正常启动           | `_start_gateway()` + `_wait_for_bootstrap()`           |
| Bootstrap 端点返回正确模型名 | `assert bootstrap["model_name"] == "custom/smoke-model"` |
| WebSocket 能正常连接         | `websockets.connect(ws_url)`                             |
| 能创建新会话                 | `{"type": "new_chat"}` → `attached` 事件              |
| 能发送消息并收到回复         | `{"type": "message"}` → `message` 事件                |
| 回复内容正确                 | `assert "Current model: ..." in answer["text"]`          |
| 会话被持久化                 | REST API `/api/sessions` 返回包含该会话                  |
| 消息历史正确                 | `/api/sessions/{key}/webui-thread` 包含历史              |

---

## 测试中的数据流

```
测试代码 (WebSocket 客户端)
        │
        │ 1. new_chat
        ▼
    Gateway (WebUI Channel)
        │
        │ 2. create session
        ▼
    MessageBus (inbound)
        │
        │ 3. consumed
        ▼
    AgentLoop
        │
        │ 4. 处理 /model 命令
        │    (不调用真实 Provider)
        │
        │ 5. publish_outbound
        ▼
    MessageBus (outbound)
        │
        │ 6. consumed
        ▼
    Gateway (WebUI Channel)
        │
        │ 7. WebSocket 推送
        ▼
    测试代码收到 "message" 事件
```

---

## 为什么这个测试是"冒烟测试"

1. **快速**：不调用真实 API，使用 mock provider
2. **隔离**：使用临时目录和随机端口
3. **端到端**：覆盖从 WebSocket 到 AgentLoop 的完整路径
4. **自包含**：启动独立进程，模拟真实用户行为

---

## 1. Bootstrap 端点 `/webui/bootstrap` 的作用是什么？

**答案**：Bootstrap 端点是 WebUI **首次加载时获取连接凭证和配置信息**的入口。

**具体返回内容**：

```json
{
    "model_name": "custom/smoke-model",   // 当前使用的模型名（显示在 WebUI 界面上）
    "ws_url": "ws://127.0.0.1:8765/ws",   // WebSocket 连接地址
    "token": "eyJhbGci...",               // WebSocket 认证用的 JWT token
    "api_token": "eyJhbGci..."            // REST API 调用用的 token
}
```

**为什么需要 Bootstrap？**

1. **认证解耦**：浏览器首次加载时不知道 WebSocket 的 token，通过 Bootstrap 用 `X-Nanobot-Auth` 头（即 `tokenIssueSecret`）换取正式 token
2. **动态发现**：WebUI 不用硬编码 WebSocket 地址，从 Bootstrap 响应里获取
3. **配置同步**：把模型名等信息传给前端渲染

**类比**：就像网站登录时的 `/auth/login` 接口——先拿凭证换 token，后面所有请求都用 token 认证。

---

## 2. 测试里为什么用 `/model` 命令而不是随便发一句话？

**答案**：因为 `/model` 是一个 **内部命令**，**不需要调用外部 LLM API**。

**对比**：

| 消息类型                   | `/model` 命令              | 普通对话消息                  |
| -------------------------- | ---------------------------- | ----------------------------- |
| **处理方式**         | AgentLoop 直接返回当前模型名 | 调用 Provider → 调用 LLM API |
| **是否调用外部 API** | ❌ 不调用                    | ✅ 调用                       |
| **是否需要 API Key** | ❌ 不需要                    | ✅ 需要                       |
| **响应速度**         | 毫秒级                       | 秒级                          |
| **测试可靠性**       | 高（不依赖网络）             | 低（依赖 API 可用性）         |

**为什么这么设计测试？**

- 测试环境配置了 `provider: "custom"` 和 `apiBase: "http://127.0.0.1:9/v1"`（不存在的地址），如果发普通消息，Agent 会尝试调用外部 API → **超时失败**
- `/model` 命令绕过了 Provider 层，直接返回配置中的模型名，保证测试 **快速、稳定、不依赖外部服务**

**源码参考**：`/model` 命令在 AgentLoop 中被特殊处理，类似于 `/help`、`/status` 等斜杠命令，不走 LLM 推理流程。

---

## 3. `_free_port()` 为什么要让操作系统分配端口，而不是写死 8765？

**答案**：避免 **端口冲突** 导致测试失败。

**写死端口的问题**：

```python
WS_PORT = 8765  # 写死
GATEWAY_PORT = 18790  # 写死
```

| 场景                                 | 结果                                 |
| ------------------------------------ | ------------------------------------ |
| 开发者本地正在跑 `nanobot gateway` | 端口被占用 → 测试失败               |
| 多个测试并行运行                     | 第一个测试占用端口 → 第二个测试失败 |
| CI/CD 环境有多个 runner              | 端口冲突 → 随机失败                 |

**`_free_port()` 的做法**：

```python
def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))  # bind 到端口 0 → 操作系统分配空闲端口
        return sock.getsockname()[1]  # 返回实际分配的端口号
```

**好处**：

- 每次测试运行都使用 **不同的端口**
- 测试结束后端口被释放
- **并行测试安全**

**这是测试最佳实践**——测试环境应该完全隔离，不依赖任何外部状态（包括端口是否被占用）。

---

## 4. 这个测试验证了 MessageBus 的存在吗？

**答案**：**间接验证**，但没有直接检查 MessageBus 对象。

**验证了 MessageBus 存在的方式**：

| 验证点                            | 说明                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| WebSocket 能收到 `message` 事件 | 说明 Agent 的回复通过 `publish_outbound` 进入了 outbound 队列，并被 Channel 消费             |
| 能收到 `turn_end` 事件          | 说明 AgentLoop 完成了整个处理流程，消息经过了 MessageBus 的 inbound/outbound 流转              |
| 会话被保存到磁盘                  | 说明 AgentLoop 调用了 `session_manager.save()`，而这是通过 MessageBus 触发的完整流程的一部分 |

**MessageBus 是这个测试的"隐形主角"**：

- 它没有被直接 `assert` 验证
- 但如果 MessageBus 不工作，整个测试会在以下环节失败：
  - `_recv_until(ws, "message")` 超时（Agent 的回复没到达 WebUI）
  - `_recv_until(ws, "turn_end")` 超时（状态更新没到达）

**类比**：测试一辆车的刹车系统，不需要直接检查刹车片材质——只要车能刹停，就说明刹车系统在工作。同样，测试能完整跑通，就说明 MessageBus 在工作。

---

## 总结：这个测试验证了什么

这个测试模拟了一个完整的 WebUI 用户会话，验证了从 **Bootstrap → WebSocket 连接 → 发消息 → 收回复 → 会话持久化** 的端到端路径，**间接验证了整个 MessageBus + AgentLoop 系统的正常工作**。
