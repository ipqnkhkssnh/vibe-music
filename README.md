# vibe-music

[简体中文](README.md) | [English](README.en.md)

面向 Agent 的多乐器编曲技能与零依赖 CLI。用文本写谱，按场景选 **2–4 件**合适的乐器，校验、渲染 WAV 并播放。

> `.piano` 只是歌曲脚本的惯用扩展名，不是“只能写钢琴”；也可以命名为 `.vibe`，内容格式不变。

## 为什么是 vibe-music

- **少而准**：26 种音色是调色板，不是菜单；一首曲子默认 2–4 件乐器，最多 5 件。
- **每件有角色**：主旋律、和声铺底、低音、节奏点缀；没有角色的轨道应该删掉。
- **Agent 友好**：文本 DSL 或 JSON，`--json` 输出固定契约，`check` 不渲染，适合流水线。
- **自包含**：CLI 就在技能目录的 `cli/` 下，零运行时依赖，不需要额外安装服务。
- **跨平台**：macOS / Linux 用 `vibe.sh`，Windows 用 `vibe.ps1` 或 `vibe.cmd`。

## 特性

- 26 种离线合成音色，覆盖钢琴、电钢、风琴、弦乐、吉他、贝斯、鼓组、管弦、中国风等
- 鼓组 16 种击打别名，含拉丁打击
- 逐音演奏法：`bend`、`grace`、`trill`；轨道级 `vibrato`、`slide`
- 吉他 / 钢弦吉他 / 电吉他 `strum` 扫弦；电吉他 `drive` 失真
- 16-bit / 44.1kHz 立体声 WAV，Freeverb 混响，峰值归一化
- Node.js ≥ 18，**零运行时依赖**

## 快速开始

### 环境

- Node.js ≥ 18
- 播放依赖系统播放器：macOS 用 `afplay`，Linux 常见 `ffplay`，Windows 用 PowerShell `SoundPlayer`
- 即使没有播放器，`render` 仍能生成 WAV

### 运行

```bash
git clone <your-repo-url> vibe-music
cd vibe-music

# 查看版本和乐器
./scripts/vibe.sh version
./scripts/vibe.sh instruments

# 播放内置示例
./scripts/vibe.sh demo jiangnan

# 校验 / 渲染 / 播放
./scripts/vibe.sh check song.piano --json
./scripts/vibe.sh render song.piano --out /tmp/song.wav --json
./scripts/vibe.sh play song.piano --out song.wav --json
```

也可以直接调用 CLI：

```bash
node cli/bin/vibe.js demo dome
node cli/bin/vibe.js check song.piano --json
```

想把命令装到 PATH：

```bash
cd cli
npm link
vibe instruments
```

### Windows

```powershell
# PowerShell
.\scripts\vibe.ps1 version
.\scripts\vibe.ps1 demo jiangnan
.\scripts\vibe.ps1 check song.piano --json
```

```bat
REM CMD
scripts\vibe.cmd version
scripts\vibe.cmd demo jiangnan
```

## 安装到 DSH

macOS / Linux：

```bash
mkdir -p "$HOME/.agents/skills"
ln -sfn "$PWD" "$HOME/.agents/skills/vibe-music"
# 或复制：
# cp -R "$PWD" "$HOME/.agents/skills/vibe-music"
```

Windows PowerShell：

```powershell
$target = Join-Path $HOME ".agents\skills\vibe-music"
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
Copy-Item -Recurse -Force ".\*" $target
```

安装后，DSH 技能目录会识别 `vibe-music`，按“写歌 / 编曲 / 配器 / 中国风 / lofi”等触发词自动匹配。

## 写一首歌

```text
title: 江南
tempo: 66
meter: 4/4
reverb: 0.40
volume: 0.70

# 主旋律：二胡，带装饰音和弯音
track erhu instrument=erhu vibrato=0.65 slide=0.12 volume=0.52
A3:2{grace=B3} C4:2 | D4:4{bend=-2,time=0.4} |
E4:2 G4:2{bend=+2,time=0.2} | A4:4{trill=+2} |

# 和声/织体：古筝分解
track zheng instrument=guzheng volume=0.46
A2:0.5 E3:0.5 A3:0.5 C4:0.5 E4:0.5 A4:0.5 C4:0.5 A3:0.5 |

# 高音点缀：笛子，从第 5 拍进入
track dizi instrument=dizi vibrato=0.4 slide=0.05 volume=0.42 start=4
E5:4 | A5:4 |
```

### 配器原则

- 默认 **2–4 件**，最多 5 件；第 5 件只能是节奏/点缀。
- 主旋律、低音、和声铺底各只留一件。
- 如果删掉一件听不出区别，就删掉它。
- 不要两件乐器同时主旋律，或三件乐器挤在同一频段。

| 场景 | 推荐配器 | 不要 |
| --- | --- | --- |
| 助眠/摇篮 | musicbox 或 piano + pad + 低音 | 鼓、失真吉他、密集跑动 |
| lofi/夜曲 | epiano + bass + drums（可加 musicbox） | 双主旋律、多件高频 |
| 电影感/氛围 | pad + piano/strings + timpani 或 tubularbells | 全套管弦乐堆叠 |
| 民谣/旧照片 | steelguitar/guitar + upright/bass + violin/accordion + 轻鼓 | 三件吉他、过载吉他 |
| rock/lofi | eguitar + bass + drums + epiano/pad | 同时用 3 件吉他 |
| 爵士/咖啡馆 | harpsichord/epiano + upright + drums + steelguitar | 低音三件叠一起 |
| 中国风 | guzheng + erhu + dizi + pad | 26 件全上、双二胡主旋律 |

## 26 种音色

- **键盘**：piano、epiano、organ、pad、harpsichord
- **拨弦**：harp、guitar、steelguitar、eguitar、bass、upright、guzheng
- **弓弦/管乐/人声**：strings、cello、violin、erhu、flute、dizi、choir
- **键盘打击/管弦打击**：musicbox、marimba、vibraphone、tubularbells、timpani、drums
- **簧片**：accordion

`drums` 是 16 种击打别名：BD/SD/CH/OH/CP/LT/MT/HT/RD/CR/SH/TB/CG/BG/CL/CB。

完整音域、别名和音色说明见 [cli/README.md](cli/README.md)，或运行：

```bash
./scripts/vibe.sh instruments --json
```

## 常用命令

```bash
# 校验（最快，不渲染）
./scripts/vibe.sh check song.piano --json

# 渲染 WAV
./scripts/vibe.sh render song.piano --out song.wav --json

# 渲染并播放（阻塞到播放结束）
./scripts/vibe.sh play song.piano --out song.wav --json

# 内置示例
./scripts/vibe.sh demo --list
./scripts/vibe.sh demo dome
./scripts/vibe.sh demo cafe

# 音高表 / 乐器表
./scripts/vibe.sh notes --json
./scripts/vibe.sh instruments --json
```

## 目录结构

```text
vibe-music/
├── README.md                 # 中文说明（本文件）
├── README.en.md              # English
├── SKILL.md                  # Agent 工作流、配器表、写谱规则
├── cli/                      # 自包含 CLI
│   ├── bin/vibe.js           # CLI 入口（vibe / vibe-music）
│   ├── src/                  # 解析、编译、合成、混响、WAV、播放器
│   ├── examples/             # 内置示例曲
│   ├── test/                 # node:test 测试
│   ├── README.md             # CLI 完整文档
│   └── AGENTS.md             # CLI Agent 速查
├── references/
│   ├── dsl.md                # 谱面语法 / JSON / 输出契约
│   └── composition.md        # 情绪配方 / 和声 / 曲式 / 配器
├── templates/                # 可运行的 2–5 件乐器模板
└── scripts/
    ├── vibe.sh               # macOS / Linux
    ├── vibe.ps1              # Windows PowerShell
    └── vibe.cmd              # Windows CMD
```

## 开发与测试

```bash
cd cli
npm test
```

当前 37 项测试通过，覆盖解析、编译、26 种乐器、鼓组、演奏法、WAV 输出和 CLI 契约。

## 文档

- [SKILL.md](SKILL.md)：Agent 工作流与配器原则
- [cli/README.md](cli/README.md)：CLI 完整文档
- [references/dsl.md](references/dsl.md)：谱面语法
- [references/composition.md](references/composition.md)：作曲与配器参考
- [templates/](templates/)：可复制模板

## 说明

- 音色是离线**物理建模/合成**，不是采样；追求录音级真实度时请使用采样音源。
- 不生成 MIDI，输出是 WAV。
- 鼓组没有音高；`timpani` 有音高，走音名。
- `choir` 是风格化 formant 合唱，不是真人歌词。
