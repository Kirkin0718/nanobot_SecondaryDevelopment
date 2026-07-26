# Install Phase 9 coach pack into nanobot workspace (Windows)
# Usage: from repo root:  .\learn\P9\install.ps1
#        or:  .\learn\P9\install.ps1 -Workspace "D:\my-workspace"

param(
    [string]$Workspace = "$env:USERPROFILE\.nanobot\workspace"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$P9 = $PSScriptRoot

if (-not (Test-Path $Workspace)) {
    New-Item -ItemType Directory -Force -Path $Workspace | Out-Null
    Write-Host "Created workspace: $Workspace"
}

$dirs = @("inbox", "goals", "learning", "briefs", "prompts")
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Workspace $d) | Out-Null
}

$skillDirs = @("capture", "learning-coach", "morning-brief")
foreach ($s in $skillDirs) {
    $dest = Join-Path $Workspace "skills\$s"
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item (Join-Path $P9 "skills\$s\SKILL.md") $dest -Force
}

Copy-Item (Join-Path $P9 "HEARTBEAT.example.md") (Join-Path $Workspace "HEARTBEAT.md") -Force

$goalsActive = Join-Path $Workspace "goals\active.md"
if (-not (Test-Path $goalsActive)) {
    Copy-Item (Join-Path $P9 "templates\goals-active.md") $goalsActive -Force
}

$agentsMd = Join-Path $Workspace "AGENTS.md"
$snippet = Join-Path $P9 "templates\AGENTS.coach-snippet.md"
$marker = "## Personal office/learning coach"
if (Test-Path $agentsMd) {
    $content = Get-Content $agentsMd -Raw -ErrorAction SilentlyContinue
    if ($content -and $content.Contains($marker)) {
        Write-Host "AGENTS.md already contains coach snippet — skipped."
    } else {
        "`n" | Out-File -FilePath $agentsMd -Append -Encoding utf8
        $snippetText = Get-Content $snippet -Raw -Encoding utf8
        [System.IO.File]::AppendAllText($agentsMd, "`r`n`r`n" + $snippetText, [System.Text.UTF8Encoding]::new($false))
        Write-Host "Appended coach snippet to AGENTS.md"
    }
} else {
    $snippetText = Get-Content $snippet -Raw -Encoding utf8
    [System.IO.File]::WriteAllText($agentsMd, $snippetText, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Created AGENTS.md from coach snippet"
}

$today = Get-Date -Format "yyyy-MM-dd"
$inboxToday = Join-Path $Workspace "inbox\$today.md"
if (-not (Test-Path $inboxToday)) {
    $inboxBody = @"
# Inbox $today

> 未整理碎片。Capture Skill 只 append；Dream 或 agent 归档后可在条目前加 [x]。

"@
    [System.IO.File]::WriteAllText($inboxToday, $inboxBody, [System.Text.UTF8Encoding]::new($false))
}

Write-Host ""
Write-Host "Phase 9 coach pack installed to: $Workspace"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Restart: nanobot gateway"
Write-Host "  2. Try:     记一下：明天交周报"
Write-Host "  3. Try:     我想 4 周学完 Python 基础，建学习路径"
Write-Host "  4. Try:     今日简报"
Write-Host ""
Write-Host "Docs: learn/P9/QUICKSTART.md"
