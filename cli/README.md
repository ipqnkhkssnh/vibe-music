# Vibe Music CLI

给 Agent 和脚本用的多乐器音乐命令行工具：**写一段歌曲脚本，选择少量合适的乐器，校验、渲染成 WAV，并调用系统播放器播放。**

内置 26 种音色：**piano / musicbox / epiano / pad / harp / marimba / bass / guitar / organ / strings / drums / flute / vibraphone / eguitar / cello / accordion / timpani / harpsichord / upright / steelguitar / violin / choir / tubularbells / guzheng / erhu / dizi**。

- 零运行时依赖（Node.js ≥ 18）
- 文本 DSL 或 JSON 两种写法
- 钢琴音色与 Web 版同源；其余 25 种音色为离线合成音色
- `--json` 输出机器可读结果，适合 Agent 串联
- 渲染离线 WAV，播放用系统播放器（macOS `afplay` / Linux `ffplay` 等）

## 快速开始

```bash
# 进入本目录（skills/vibe-music/cli）后：

# 播放内置示例（默认 twinkle）
node bin/vibe.js demo

# 播放原创短示例
node bin/vibe.js demo agent

# 播放原创钢琴小品《夜航》（约 86 秒）
node bin/vibe.js demo voyage

# 播放助眠小品《云眠》（约 2 分 20 秒）
node bin/vibe.js demo sleep

# 音乐盒 + 暖垫 + 钢琴的摇篮曲
node bin/vibe.js demo stardust

# 电钢琴 + 音乐盒的 lofi 小品
node bin/vibe.js demo epiano

# 竖琴 + 马林巴 + 电贝斯的拨弦三重奏
node bin/vibe.js demo mist

# 尼龙吉他 + 拉杆风琴 + 弦乐 + 贝斯
node bin/vibe.js demo photo

# 鼓组 + 电钢 + 吉他 + 贝斯的 lofi
node bin/vibe.js demo rain

# 鼓组 + 电吉他 + 颤音琴 + 长笛的 rock/lofi
node bin/vibe.js demo neon

# 大提琴 + 手风琴 + 定音鼓的电影感/民谣
node bin/vibe.js demo distant

# 羽管键琴 + 低音提琴 + 钢弦吉他 + 拉丁鼓
node bin/vibe.js demo cafe

# 小提琴 + 合唱 + 管钟 + pad + 定音鼓
node bin/vibe.js demo dome

# 古筝 + 二胡 + 笛子 + pad 的中国风
node bin/vibe.js demo jiangnan

# 查看可用乐器、音域、别名
node bin/vibe.js instruments

# 播放示例文件
node bin/vibe.js play examples/twinkle.piano

# 只渲染，不播放
node bin/vibe.js render examples/nocturne.piano --out build/nocturne.wav

# 校验，不渲染
node bin/vibe.js check examples/twinkle.piano --json
```

Windows PowerShell：

```powershell
cd skills\vibe-music\cli
node bin\vibe.js demo
node bin\vibe.js check examples\twinkle.piano --json
node bin\vibe.js play examples\twinkle.piano --out build\twinkle.wav
```

也可以直接用技能根目录的 wrapper（Windows）：

```powershell
.\skills\vibe-music\scripts\vibe.ps1 demo
.\skills\vibe-music\scripts\vibe.ps1 instruments
```

CMD 用 `skills\vibe-music\scripts\vibe.cmd`。

也可以直接使用可执行文件（macOS / Linux）：

```bash
./bin/vibe.js play examples/chords.piano
```

想全局使用 `vibe` 命令：

```bash
npm link          # 在 skills/vibe-music/cli 下执行
vibe demo
```

或者加一个 alias：

```bash
alias vibe="node /path/to/music/skills/vibe-music/cli/bin/vibe.js"
```

> `.piano` 只是歌曲脚本的惯用扩展名，不是“只能写钢琴”；也可以命名为 `.vibe`，内容格式不变。

## 歌曲脚本（.piano）

```text
title: 小星星
tempo: 96
meter: 4/4
reverb: 0.26
track melody instrument=musicbox volume=0.9 pan=0.14
C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 |
F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2 |

track bass instrument=piano volume=0.55 pan=-0.22
C3:2 G3:2 | F3:2 C3:2 |

pedal: 0-4
```

### 全局指令

| 指令 | 含义 | 默认 |
| --- | --- | --- |
| `title: ...` | 曲名 | 文件名 |
| `tempo: 96` | 每分钟拍数，20–300 | 100 |
| `meter: 4/4` | 拍号（仅显示/校验，不强制小节长度） | 4/4 |
| `velocity: 0.8` | 全局力度 0–1 | 0.8 |
| `volume: 1` | 总输出电平 0–1（安静曲目可设 0.5–0.7） | 1 |
| `instrument: piano` | 全局默认乐器 | piano |
| `reverb: 0.26` | 混响 0–1 | 0.26 |
| `transpose: 0` | 整曲移调 -24–24 半音 | 0 |

### 轨道

```text
track <名字> instrument=piano volume=0.85 pan=0 velocity=0.8 start=0 strum=0.03 drive=0 vibrato=0 slide=0
```

- `instrument`：`piano` / `musicbox` / `epiano` / `pad` / `harp` / `marimba` / `bass` / `guitar` / `organ` / `strings`（也接受 `celesta`、`ep`、`warm-pad`、`ebass` 等别名）
- `volume`：0–1
- `pan`：-1（左）到 1（右）
- `velocity`：该轨默认力度，0–1
- `start`：从第几拍开始，默认 0
- `strum`：和弦音的依次起音间隔，单位秒，0–0.25；吉他扫弦常用 0.02–0.04
- `drive`：失真量 0–1，只对 `eguitar` 生效；0 清音，0.5–0.8 轻过载
- `vibrato`：揉弦深度 0–1，对 erhu/dizi 最明显
- `slide`：从前一个音滑到当前音的时间，单位秒，0–0.5；erhu 常用 0.08–0.15

每条轨道的音符按顺序排列，轨道之间自动叠加；用 `R` 休止符制造时间空隙，或用 `start` 让整条轨道延后。

### 乐器

```text
track melody instrument=musicbox volume=0.72
track pad instrument=pad volume=0.38
track low instrument=piano volume=0.40
```

| 名称 | 音域 | 特点 | 别名示例 |
| --- | --- | --- | --- |
| `piano` | A0–C8 | 原声钢琴，击弦/制音器/踏板 | `grand`、`acoustic` |
| `musicbox` | C3–C8 | 清脆音乐盒/钢片琴，无制音器，自然衰减 | `celesta`、`bell` |
| `epiano` | A1–C8 | FM 电钢琴，温暖 + tine 亮度 + 轻微 tremolo | `ep`、`rhodes`、`wurli` |
| `pad` | C2–C7 | 慢起音暖垫/弦垫，持续音，长释放 | `warmpad`、`warm-pad` |
| `harp` | C1–C7 | 拨弦竖琴，Karplus-Strong，自然衰减 | `lyre`、`concert-harp` |
| `marimba` | C2–C7 | 温暖木质马林巴，槌击 + 非谐模态，自然衰减 | `mallet` |
| `bass` | E1–C5 | 电贝斯，厚实基频 + 低通谐波 + 拨弦噪声 | `ebass`、`electricbass` |
| `guitar` | E2–C6 | 尼龙弦木吉他，Karplus-Strong + 琴体低通；配合 `strum` 扫弦 | `nylon`、`classicalguitar` |
| `organ` | C2–C7 | 拉杆风琴，drawbar 泛音 + 键击 + 轻微合唱 | `drawbar`、`hammond` |
| `strings` | C2–C7 | 弦乐合奏，四组失谐弓弦 + 慢起音 + 揉弦 | `ensemble`、`stringsection` |
| `drums` | 多击打 | 鼓组：底鼓/军鼓/闭开镲/拍手/桶鼓/镲/沙锤/铃鼓 | `drumkit`、`kit` |
| `flute` | C4–C7 | 长笛：气声 + 泛音 + 起音 chiff + 揉弦 | `airflute`、`woodwind` |
| `vibraphone` | C3–C7 | 颤音琴：金属模态 + 电机 tremolo + 踏板延音 | `vibes`、`vibro` |
| `eguitar` | E2–C6 | 电吉他：拨弦 + drive 失真 + 箱体低通 | `electricguitar`、`overdriveguitar` |
| `cello` | C2–C6 | 独奏大提琴：弓弦 + 揉弦 + 运弓噪声 | `violoncello` |
| `accordion` | C3–C6 | 手风琴：双簧片失谐 + 风箱噪声 | `bandoneon`、`squeezebox` |
| `timpani` | C2–A3 | 定音鼓：膜振动 + 槌击，有音高的 one-shot | `kettledrum` |
| `harpsichord` | C2–C7 | 羽管键琴：明亮拨弦 + 拨片噪声 | `cembalo` |
| `upright` | E1–C4 | 低音提琴：拨弦 + 琴体 + 指板噪声 | `uprightbass`、`doublebass` |
| `steelguitar` | E2–C6 | 钢弦吉他：明亮拨弦 + 琴体；配 `strum` | `steelstring` |
| `violin` | G3–C7 | 小提琴：高音独奏弓弦 + 揉弦 + 运弓噪声 | `fiddle` |
| `choir` | C3–C6 | 风格化合唱“啊”：多声部 + formant + 呼吸噪声 | `vox`、`voices` |
| `tubularbells` | C4–C7 | 管钟：非谐金属模态 + 长衰减 | `bells`、`chimes` |
| `guzheng` | C2–C7 | 古筝：明亮拨弦 + 琴体；用 `strum` 做刮奏 | `zheng` |
| `erhu` | D3–D6 | 二胡：弓弦 + 揉弦 + 滑音 | `nanhu` |
| `dizi` | C4–C7 | 笛子：气声 + 笛膜亮音 + 揉弦/滑音 | `zhudi`、`chineseflute` |

- 不写 `instrument` 时使用全局 `instrument:`，默认 `piano`。
- 每种乐器有独立音域；超出会报 `RANGE` 错误。
- `musicbox` / `harp` / `marimba` 没有制音器，踏板对它们无效；音符按自然衰减。
- `pad` 没有自然衰减，按住持续，松键后约 1.5 秒淡出；踏板仍然有效。
- `bass` 有制音器，但不吃延音踏板；松键后约 0.18 秒止音，保持低音干净。
- `guitar` 是拨弦、自然衰减；用 `strum` 让和弦音相差 20–40ms 拨响，才有扫弦感。
- `organ` / `strings` 持续音，松键后分别约 0.15 / 0.9 秒释放；不吃延音踏板。
- `drums` 是 one-shot 鼓组（16 种击打），用击打别名写谱；不吃踏板/`strum`/移调，也没有音高概念。
- `flute` 持续音，松键 0.12 秒释放；`eguitar` 松键 0.2 秒止音，可用 `drive` 调失真。
- `vibraphone` 有制音器，吃延音踏板；踩踏板时和弦可以连起来。
- `cello` / `accordion` / `timpani` / `harpsichord` / `upright` / `steelguitar` 都不吃延音踏板；timpani 是 2.2 秒自然收尾的 one-shot。
- `violin` 松键 0.5 秒释放；`choir` 1.2 秒释放；`tubularbells` 自然长衰减。三者都不吃踏板。
- `guzheng` 自然衰减；`erhu` 松键 0.5 秒释放；`dizi` 松键 0.15 秒释放。三者都不吃踏板。
- `erhu` / `dizi` 的 `vibrato`、`slide` 是东方包 v1 的核心；古筝刮奏用 `strum=0.03–0.05`。
- 同一首曲子里可以每条轨道用不同乐器；`vibe instruments` 可查看完整列表。

### 鼓组

```text
track drums instrument=drums volume=0.55
BD:1 CH:1 [SD CP]:1 CH:1 |
BD:1 CH:0.5 CH:0.5 SD:1 CH:0.5 OH:0.5 |
```

| 别名 | 击打 | 别名 | 击打 |
| --- | --- | --- | --- |
| `BD` / `K` | 底鼓 | `SD` / `S` | 军鼓 |
| `CH` / `HH` | 闭镲 | `OH` | 开镲 |
| `CP` | 拍手 | `LT` | 低音桶鼓 |
| `MT` | 中音桶鼓 | `HT` | 高音桶鼓 |
| `RD` | 叮叮镲 | `CR` | 吊镲 |
| `SH` | 沙锤 | `TB` | 铃鼓 |
| `CG` | 康加鼓 | `BG` | 邦戈鼓 |
| `CL` | 响棒 | `CB` | 卡巴萨 |

- 鼓轨只接受击打别名；写音名会报 `DRUM` 错误。
- 每个击打是 one-shot，有独立时长和声像；不需要松键/制音。
- `strum`、移调、踏板对鼓组无效。
- JSON 可以写 `{ "drum": "kick" }`，也可以写 `{ "note": "BD" }` 或 `{ "notes": ["CH", "OH"] }`。

### 音符

| 写法 | 含义 |
| --- | --- |
| `C4:1` | C4，1 拍 |
| `C4:0.5` / `C4:1/2` | 半拍 |
| `C4:1.5` / `C4:3/2` | 一拍半 |
| `C4:1.` | 附点：1 拍 × 1.5 |
| `C4` | 省略时值 = 1 拍 |
| `C4:1@0.9` | 力度 0.9（也接受 1–127，会映射到 0–1） |
| `[C4 E4 G4]:2` | 和弦，2 拍 |
| `[C4,E4,G4]:2` | 和弦的另一种写法 |
| `R:1` / `-:1` | 休止 1 拍 |
| `\|` | 小节线，仅作可读性，会被忽略 |

音名支持：`C4`、`C#4`、`Db4`、`Cb4`、`B#3`，范围 **A0–C8**。超出范围会在解析阶段报错。

### 演奏法（v2）

在音符后面用 `{...}` 加逐音演奏法，不能有空格：

```text
track erhu instrument=erhu vibrato=0.6 slide=0.12
A3:2{grace=B3} C4:2 |
D4:4{bend=-2,time=0.4} |
E4:2 G4:2{bend=+2,time=0.2} |
A4:4{trill=+2} |
```

| 写法 | 含义 |
| --- | --- |
| `{bend=+2}` | 起音后向上弯 2 个半音，默认 0.25 秒 |
| `{bend=-2,time=0.4}` | 向下弯 2 个半音，用 0.4 秒 |
| `{grace=D5}` | 先短暂奏响 D5 装饰音，再落到主音 |
| `{trill=+2}` | 在主音和上方 2 半音之间快速颤音 |

- `bend` / `trill` 对 `erhu`、`dizi`、`guzheng` 有效。
- `grace` 对三者都有效；古筝用 `strum` 做刮奏，二胡/笛子可用 `slide` 做音间滑音。
- 组合写：`E4:2{bend=+2,trill=+2}`（逗号分隔，不要空格）。

### 延音踏板

```text
pedal: 0-8      // 第 0 拍踩下，第 8 拍抬起
pedal: 8-        // 第 8 拍踩下，一直踩到结尾
```

- 单位是拍。
- 区间不能重叠。
- 只有“松键时踏板还踩着”的音才会被延音；踏板抬起时统一制音。
- 开放的 `x-` 只能出现在最后一个踏板。

### 注释

```text
// 双斜杠注释
# 行首井号也是注释（行中的 # 是升降号）
```

## JSON 歌曲

CLI 也接受 `.json`，适合 Agent 程序化生成：

```json
{
  "title": "Agent Demo",
  "tempo": 108,
  "meter": "4/4",
  "reverb": 0.24,
  "instrument": "piano",
  "tracks": [
    {
      "name": "melody",
      "instrument": "musicbox",
      "volume": 0.9,
      "pan": 0.1,
      "start": 0,
      "velocity": 0.8,
      "notes": [
        { "note": "C4", "at": 0, "beats": 1 },
        { "notes": ["E4", "G4"], "at": 2, "beats": 2, "velocity": 0.75 }
      ]
    }
  ],
  "pedals": [[0, 8], [8, 16]]
}
```

- `at`、`beats`、`pedals` 都用拍；轨道可写 `"strum": 0.03`（秒）和 `"drive": 0.6`（0–1）。
- 鼓组音符可写 `"drum": "kick"`，或 `"note": "BD"` / `"notes": ["CH","OH"]`。
- `note` 也可以换成 `notes` 数组或 `midi`（21–108）。
- 完整示例见 [examples/agent-song.json](examples/agent-song.json)。

## 命令

```text
vibe play <song> [options]      渲染并播放（默认命令）
vibe render <song> [options]    只渲染 WAV
vibe check <song> [options]     只校验曲谱
vibe demo [name] [options]      播放内置示例
vibe demo --list                列出示例
vibe notes [--json]             打印 A0–C8 音高表
vibe instruments [--json]       列出乐器、音域、别名
vibe help                       帮助
vibe version                    版本
```

`song` 可以是文件路径，也可以是 `-`（从 stdin 读取）：

```bash
cat song.piano | node bin/vibe.js play - --out build/song.wav --json
```

## 选项

| 选项 | 说明 |
| --- | --- |
| `-o, --out <file>` | 输出 WAV 路径；`-` 表示写 stdout |
| `--no-play` | 只渲染，不调用播放器 |
| `--json` | stdout 只输出一个 JSON 对象 |
| `--keep` | 播放后保留临时 WAV |
| `--tempo <bpm>` | 覆盖曲谱速度 |
| `--transpose <n>` | 整体移调 -24–24 半音 |
| `--volume <0-1>` | 覆盖曲谱总音量（归一化目标） |
| `--reverb <0-1>` | 覆盖混响量 |
| `--sample-rate <hz>` | 22050–96000，默认 44100 |
| `--player <cmd>` | 指定播放器，如 `afplay`、`ffplay` |
| `--quiet` | 减少人类可读输出 |
| `-h, --help` / `-v, --version` | 帮助 / 版本 |

### 输出文件规则

- `render` 不写 `--out`：在**当前目录**生成 `<曲名>.wav`。
- `play` 不写 `--out`：在系统临时目录生成 WAV，**播放成功后自动删除**；播放失败会保留。
- `play --keep`：保留临时 WAV，退出前打印路径。
- `play --out <file>`：保存到指定路径，不删除。
- `render --out -`：WAV 二进制写到 stdout，日志写 stderr（不能和 `--json` 同时用）。
- `play --out -` 同样只写 WAV，不播放（stdout 只能放一种内容）。

## 给 Agent 的契约

推荐流程：

```bash
# 1. 写歌
cat > /tmp/song.piano <<'EOF'
title: Agent Song
tempo: 100
track melody
C4:1 D4:1 E4:1 G4:1
track bass
C3:4
pedal: 0-4
EOF

# 2. 校验（快速，不渲染）
node bin/vibe.js check /tmp/song.piano --json

# 3. 渲染 + 播放，并保留 WAV
node bin/vibe.js play /tmp/song.piano --out /tmp/song.wav --json
```

约定：

- **stdout** 在 `--json` 时只放一个 JSON 对象，不掺日志；进度、播放提示走 **stderr**。
- 退出码 `0` 表示解析/渲染/播放流程已执行；`1` 表示解析、校验或 IO 错误。
- 播放器不存在或播放失败时，命令仍返回 `ok: true`，但 `played: false` 且 `playError` 有原因；WAV 会被保留。
- JSON 错误格式：

```json
{
  "ok": false,
  "error": {
    "message": "无法识别音名 \"H4\"",
    "code": "PARSE",
    "line": 3,
    "column": 6
  }
}
```

成功结果包含：

```json
{
  "ok": true,
  "command": "play",
  "title": "Agent Song",
  "tempo": 100,
  "duration": 6.2,
  "notes": 5,
  "instruments": ["musicbox", "piano"],
  "wav": "/tmp/song.wav",
  "wavKept": true,
  "played": true,
  "player": "afplay",
  "renderMs": 180
}
```

更紧凑的 Agent 操作说明见 [AGENTS.md](AGENTS.md)。

## 播放器

自动检测顺序：

- macOS：`afplay`
- Linux：`ffplay` → `paplay` → `aplay` → `mpv`
- Windows：PowerShell `Media.SoundPlayer`

也可通过 `--player afplay` 或环境变量指定：

```bash
VIBE_PLAYER=ffplay node bin/vibe.js play song.piano
```

没有找到播放器时，CLI 仍会渲染 WAV 并返回成功（`played: false`），不会静默丢掉音频。

## 音源

每种乐器有自己的渲染器，共用一个混音/混响/归一化管线：

- **piano**：非谐泛音、1–3 根失谐弦、击弦点梳状滤波、双段衰减、击弦噪声。
- **musicbox**：非谐分音 + 短促金属起音 + 自然衰减，无制音器。
- **epiano**：FM 琴体 + 快速衰减的 tine 高音 + 轻微 tremolo，力度越大越亮。
- **pad**：三组微失谐锯齿谐波 + 低通 + 慢起音（约 0.38 秒）+ 长释放（约 1.5 秒）。
- **harp**：Karplus-Strong 分数延迟弦 + 环路低通 + 拨弦噪声，自然衰减。
- **marimba**：4 个非谐模态 + 槌击噪声，木质、短衰减。
- **bass**：厚实基频 + 低通谐波 + 拨弦噪声，松键快速制音。
- **guitar**：Karplus-Strong 拨弦 + 琴体低通；`strum` 在编译阶段把和弦音依次偏移。
- **organ**：drawbar 加法泛音 + 两组微失谐 bank + 键击 + 轻微颤音。
- **strings**：四组失谐弓弦 + 慢起音（约 0.3 秒）+ 揉弦 + 运弓噪声 + 低通。
- **drums**：底鼓（音高下坠正弦）、军鼓（噪声 + 鼓腔）、闭开镲、拍手、桶鼓、镲片、沙锤、铃鼓，全部 one-shot 合成。
- **flute**：正弦基频 + 少量泛音 + 连续呼吸噪声 + 起音 chiff + 揉弦。
- **vibraphone**：金属模态 + 5Hz 电机 tremolo + 长衰减，踏板可延音。
- **eguitar**：Karplus-Strong 拨弦 + `tanh` 失真 + 箱体低通，`drive` 控制过载。
- **cello**：单声部弓弦 + 揉弦 + 运弓噪声 + 琴体低通。
- **accordion**：双簧片失谐 + 少量泛音 + 风箱噪声 + tremolo。
- **timpani**：膜振动模态 + 槌击 + 长衰减，有音高的 one-shot。
- **harpsichord**：明亮 Karplus-Strong + 拨片噪声，短自然衰减。
- **upright**：低音 Karplus-Strong + 琴体低通 + 指板噪声。
- **steelguitar**：明亮 Karplus-Strong + 木吉他琴体，配 `strum`。
- **violin**：单声部高音弓弦 + 揉弦 + 运弓噪声 + 琴体低通。
- **choir**：4 组失谐锯齿 + 三个元音 formant 带通 + 呼吸噪声；风格化，不是真人歌词。
- **tubularbells**：非谐金属模态 + 槌击 + 长衰减。
- **guzheng**：明亮 Karplus-Strong + 琴体；`strum` 快速扫和弦做刮奏。
- **erhu**：单声部弓弦 + 揉弦 + 滑音 + 运弓噪声。
- **dizi**：气声 + 明亮泛音 + 笛膜 buzz + 揉弦/滑音。
- 踏板对每个音的制音时刻在编译阶段按乐器规则计算。
- Freeverb 立体声混响，峰值归一化到 0.9，16-bit / 44.1kHz 立体声 WAV。

为了保证 Agent 结果可复现，随机相位基于歌曲内容做确定性种子；同一首歌每次渲染结果一致。

## 测试

```bash
# 在本目录（skills/vibe-music/cli）执行
npm test
```

覆盖音名/频率、DSL/JSON 解析、错误行号、26 种乐器/音域/衰减差异、鼓组 16 种击打、`drive` / `vibrato` / `slide` / `bend` / `grace` / `trill` 参数、配器超过 5 件警告、pad 长音无 NaN、harp/guitar 调音、strum 偏移、踏板编译、合成无 NaN、WAV 头、CLI 的 `instruments` / `check` / 错误 JSON / `render`、wrapper 脚本存在性。

## 限制

- 单个文件最长渲染 300 秒。
- 不支持中途变速、反复记号、渐强渐弱、装饰音、MIDI 导出。
- 会先把整首歌渲染完再播放（便于校验与保留 WAV）；`play` 会阻塞到播放结束，不想阻塞就用 `render`。
- 长曲可用 `--sample-rate 32000` 加速。
- 音色是离线合成 + Freeverb，不是采样乐器；除钢琴外的音色都是风格化合成，不是真实录音。
- 乐器音域不同：musicbox C3–C8、epiano A1–C8、pad C2–C7、harp C1–C7、marimba C2–C7、bass E1–C5、guitar/eguitar/steelguitar E2–C6、organ/strings C2–C7、flute/dizi C4–C7、vibraphone/harpsichord C3/C2–C7、cello C2–C6、accordion C3–C6、timpani C2–A3、upright E1–C4、violin G3–C7、choir C3–C6、tubularbells/guzheng C4/C2–C7、erhu D3–D6；drums 没有音高，用击打别名。
- Node.js ≥ 18；播放依赖系统播放器。
