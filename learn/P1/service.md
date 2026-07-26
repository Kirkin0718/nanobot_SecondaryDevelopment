
## service.py 完整解读

负责**把 nanobot gateway 安装为系统服务**（开机自启、后台运行）。

---

## 一、文件整体结构

service.py
├── 数据类型定义（GatewayServiceOptions / GatewayServiceResult）
├── GatewayServiceInstaller 类（核心安装器）
│   ├── install()        → 安装服务
│   ├── uninstall()      → 卸载服务
│   ├── _install_systemd()  → Linux 系统服务
│   ├── _install_launchd()  → macOS 系统服务
│   └── _resolve_manager()  → 自动检测操作系统
└── 辅助函数（生成配置、路径处理等）

---

## 二、核心数据结构

### GatewayServiceOptions（安装参数）

```python
@dataclass(frozen=True)
class GatewayServiceOptions:
    start: GatewayStartOptions      # gateway 启动参数（端口、配置路径等）
    name: str = "nanobot-gateway"   # 服务名称
    manager: ServiceManagerKind = "auto"  # systemd / launchd / auto
    enable: bool = True             # 是否开机自启
    start_now: bool = True          # 安装后立即启动
    python_executable: str = sys.executable  # Python 解释器路径
```

### GatewayServiceResult（安装结果）

```python
@dataclass(frozen=True)
class GatewayServiceResult:
    ok: bool          # 是否成功
    message: str      # 结果消息
    manager: str      # 使用的服务管理器（systemd/launchd）
    path: Path | None # 生成的配置文件路径
    commands: tuple   # 执行的命令列表
    content: str | None # 生成的配置内容
```

---

## 三、`GatewayServiceInstaller` 类

### 初始化

```python
def __init__(self, *, platform_name: str | None = None, subprocess_run=subprocess.run, home: Path | None = None):
    self.platform_name = platform_name or _platform_name()  # 检测 OS
    self._subprocess_run = subprocess_run  # 执行命令的函数
    self.home = home or Path.home()  # 用户家目录
```

**`_platform_name()` 检测逻辑**：

```python
def _platform_name() -> str:
    if sys.platform == "darwin":   return "Darwin"   # macOS
    if sys.platform.startswith("linux"): return "Linux"
    if sys.platform.startswith("win"): return "Windows"
    return sys.platform
```

---

### `install()` - 安装服务

```python
def install(self, options: GatewayServiceOptions, *, dry_run: bool = False) -> GatewayServiceResult:
    manager = self._resolve_manager(options.manager)  # 1. 确定用 systemd 还是 launchd
    if manager == "systemd":
        return self._install_systemd(options, dry_run=dry_run)  # 2. Linux
    if manager == "launchd":
        return self._install_launchd(options, dry_run=dry_run)  # 3. macOS
    return GatewayServiceResult(False, f"unsupported_service_manager:{manager}", manager, None)
```

**`_resolve_manager()` 自动检测**：

```python
def _resolve_manager(self, manager: ServiceManagerKind) -> str:
    if manager != "auto": return manager  # 用户指定了就按用户来
    if self.platform_name == "Darwin": return "launchd"   # macOS
    if self.platform_name == "Linux": return "systemd"    # Linux
    return self.platform_name.lower()  # 其他系统
```

---

### `_install_systemd()` - Linux systemd 服务

**systemd 是什么？** Linux 的系统服务管理器，负责开机自启、进程守护。

**生成的文件路径**：`~/.config/systemd/user/nanobot-gateway.service`

**生成的内容**（`_systemd_unit_content()` 函数）：

```ini
[Unit]
Description=Nanobot Gateway (nanobot-gateway)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/user
ExecStart=/usr/bin/python3 -m nanobot gateway --config /home/user/.nanobot/config.json
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1
NoNewPrivileges=yes

[Install]
WantedBy=default.target
```

**执行的操作**：

```python
commands = [
    ("systemctl", "--user", "daemon-reload"),      # 重新加载 systemd 配置
    ("systemctl", "--user", "enable", unit_name),  # 开机自启
    ("systemctl", "--user", "restart", unit_name), # 立即启动
]
```

**关键点**：

- `--user` 表示**用户级服务**（不需要 sudo）
- `Restart=always` 表示进程挂了会自动重启
- `RestartSec=10` 表示崩溃后等待 10 秒再重启

---

### `_install_launchd()` - macOS LaunchAgents

**launchd 是什么？** macOS 的系统服务管理器，相当于 macOS 版的 systemd。

**生成的文件路径**：`~/Library/LaunchAgents/ai.nanobot.gateway.plist`

**生成的内容**（plist 格式，macOS 的 XML 配置）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.nanobot.gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>-m</string>
        <string>nanobot</string>
        <string>gateway</string>
        <string>--config</string>
        <string>/home/user/.nanobot/config.json</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/home/user</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>/home/user/.nanobot/logs/nanobot-gateway.launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/home/user/.nanobot/logs/nanobot-gateway.launchd.err.log</string>
</dict>
</plist>
```

**关键字段解读**：

| 字段                  | 含义                     |
| --------------------- | ------------------------ |
| `Label`             | 服务的唯一标识符         |
| `ProgramArguments`  | 要执行的命令（数组形式） |
| `RunAtLoad`         | 用户登录时自动启动       |
| `KeepAlive`         | 进程退出后自动重启       |
| `StandardOutPath`   | 标准输出日志位置         |
| `StandardErrorPath` | 错误日志位置             |

**执行的操作**：

```python
commands = [
    ("launchctl", "bootstrap", domain, str(path)),  # 加载服务
    ("launchctl", "enable", f"{domain}/{label}"),   # 启用服务
    ("launchctl", "kickstart", "-k", f"{domain}/{label}"),  # 启动服务
]
```

**`domain` 是什么？** `gui/{用户UID}`，表示这个服务属于当前用户的图形界面会话。

---

### `uninstall()` - 卸载服务

```python
def uninstall(self, *, name: str = "nanobot-gateway", manager: ServiceManagerKind = "auto", dry_run: bool = False):
```

**systemd 卸载**：

```python
commands = (
    ("systemctl", "--user", "disable", "--now", unit_name),  # 停止并禁用
    ("systemctl", "--user", "daemon-reload"),                # 重新加载
)
path.unlink(missing_ok=True)  # 删除配置文件
```

**launchd 卸载**：

```python
commands = (
    ("launchctl", "bootout", domain, str(path)),  # 卸载服务
    ("launchctl", "disable", f"{domain}/{label}"), # 禁用
)
path.unlink(missing_ok=True)  # 删除配置文件
```

---

## 四、辅助函数

| 函数                     | 作用                                               |
| ------------------------ | -------------------------------------------------- |
| `_systemd_unit_name()` | `nanobot-gateway` → `nanobot-gateway.service` |
| `_launchd_label()`     | `nanobot-gateway` → `ai.nanobot.gateway`      |
| `_safe_service_name()` | 把服务名转成安全的文件名字符                       |
| `_launchd_domain()`    | 返回 `gui/{UID}`                                 |
| `_systemd_quote()`     | 给 systemd 配置里的路径加引号                      |

---

## 五、这个东西在整个架构中的位置

```
用户执行 nanobot gateway install --service
                    │
                    ▼
              service.py
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   Linux (systemd)        macOS (launchd)
        │                       │
        ▼                       ▼
生成 .service 文件     生成 .plist 文件
        │                       │
        ▼                       ▼
  开机自启 + 守护       开机自启 + 守护
```

**简单说**：这是给 `nanobot gateway` 配了个"保姆"——系统进程挂了自动重启，电脑重启自动启动。

---

## 六、总结：service.py 的作用

| 问题                               | 答案                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| **这个文件做什么？**         | 把 nanobot gateway 安装为系统服务                          |
| **支持哪些系统？**           | Linux（systemd）、macOS（launchd）                         |
| **为什么需要这个？**         | 让 gateway 开机自启、崩溃自动恢复                          |
| **跟 MessageBus 有关系吗？** | 没有直接关系——它是**外部部署工具**，不是运行时组件 |
| **跟 AgentLoop 有关系吗？**  | 没有——它只管理 gateway 进程的生命周期                    |

**一句话总结**：`service.py` 是**运维工具**，不是业务逻辑——它负责让 `nanobot gateway` 像 nginx/MySQL 一样成为一个**系统守护进程**。
