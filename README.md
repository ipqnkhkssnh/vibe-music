# vibe-music

Agent 技能：用 Vibe Music CLI 创作、编配、校验、渲染并播放多乐器音乐。

核心原则：按场景只选 **2–4 件**合适的乐器，不把大部分音色都堆进一首曲子。

## 快速开始

```bash
# macOS / Linux
./scripts/vibe.sh version
./scripts/vibe.sh instruments
./scripts/vibe.sh demo jiangnan
```

```powershell
# Windows PowerShell
.\scripts\vibe.ps1 version
.\scripts\vibe.ps1 instruments
.\scripts\vibe.ps1 demo jiangnan
```

Windows CMD 用 `scripts\vibe.cmd`。

## 内容

- `SKILL.md`：Agent 工作流、配器表、写谱规则
- `cli/`：自包含的零依赖 Node.js CLI（26 种音色）
- `references/`：DSL 与作曲/配器参考
- `templates/`：可运行的 2–5 件乐器模板
- `scripts/`：macOS / Linux、Windows PowerShell、Windows CMD wrapper

## 安装到 DSH

```bash
ln -sfn "$PWD" "$HOME/.agent/skills/vibe-music"
# 或复制
cp -R "$PWD" "$HOME/.agent/skills/vibe-music"
```

Windows PowerShell：

```powershell
$target = Join-Path $HOME ".agents\skills\vibe-music"
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
Copy-Item -Recurse -Force ".\*" $target
```
