#!/usr/bin/env bash
# vibe.sh — 从技能目录调用内置的 Vibe Music CLI，无需硬编码绝对路径。
#
# 用法：
#   ./scripts/vibe.sh check song.piano --json
#   ./scripts/vibe.sh render song.piano --out /tmp/song.wav --json
#   ./scripts/vibe.sh play song.piano --out /tmp/song.wav --json
#
# 查找顺序：
#   1. $VIBE_CLI/bin/vibe.js
#   2. 本技能目录 cli/（技能自带 CLI）
#   3. 当前目录、当前目录的 skills/vibe-music/cli，逐级向上查找
#
# 如果技能被复制到 ~/.agent/skills，CLI 会随技能一起复制，通常无需设置。

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

find_cli() {
  local candidates=()
  if [[ -n "${VIBE_CLI:-}" ]]; then
    candidates+=("$VIBE_CLI")
  fi
  candidates+=(
    "$SKILL_DIR/cli"
    "$PWD"
    "$PWD/skills/vibe-music/cli"
    "$PWD/../skills/vibe-music/cli"
    "$PWD/../../skills/vibe-music/cli"
  )

  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    candidates+=("$dir/skills/vibe-music/cli")
    dir="$(dirname "$dir")"
  done

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate/bin/vibe.js" && -f "$candidate/package.json" ]]; then
      (cd "$candidate" && pwd)
      return 0
    fi
  done
  return 1
}

CLI="$(find_cli)" || {
  echo "找不到 Vibe Music CLI。" >&2
  echo "请设置 VIBE_CLI=/绝对路径/skills/vibe-music/cli，或在 music/ 仓库内运行。" >&2
  exit 2
}

if ! command -v node >/dev/null 2>&1; then
  echo "需要 Node.js（>= 18）才能运行 Vibe Music CLI。" >&2
  exit 2
fi

if [[ "${1:-}" == "--which-cli" ]]; then
  echo "$CLI"
  exit 0
fi

exec node "$CLI/bin/vibe.js" "$@"
