# 谱面语法与 CLI 参考

本文件是技能自带 `cli/` 的浓缩参考；完整版见 [../cli/README.md](../cli/README.md)，Agent 专用输出契约见 [../cli/AGENTS.md](../cli/AGENTS.md)。

## 1. 最小可用谱

```text
title: 小练习
tempo: 96
meter: 4/4
reverb: 0.26
volume: 0.8

track melody volume=0.9 pan=0.1
C4:1 E4:1 G4:1 C5:2 | A4:1 G4:1 E4:2

track bass volume=0.5 pan=-0.2
C3:4 | F2:4

pedal: 0-4
pedal: 4-8
```

- 文件扩展名用 `.piano`（JSON 也可用 `.json`）。
- 每条 `track` 内的音符是**顺序**的：一个音/和弦/休止消费它的时值，然后光标前进。
- 多条 track 默认都从第 0 拍开始；用 `start=` 让某条轨整体延后。
- `|` 只是小节线，解析时忽略，不校验小节长度。

## 2. 全局指令

写在 `track` 之前或之后都可以，作用于整首。

| 指令 | 取值 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title:` | 字符串 | 文件名 | 曲名 |
| `tempo:` | 20–300 | 100 | BPM |
| `meter:` | `4/4`、`3/4`、`6/8` | `4/4` | 仅记录；不强制小节长度 |
| `velocity:` | 0–1 | 0.8 | 全局默认力度 |
| `volume:` | 0–1 | 1 | 总输出电平；安静曲目用 0.5–0.7 |
| `instrument:` | `piano` / `musicbox` / `epiano` / `pad` / `harp` / `marimba` / `bass` / `guitar` / `organ` / `strings` / `drums` / `flute` / `vibraphone` / `eguitar` / `cello` / `accordion` / `timpani` / `harpsichord` / `upright` / `steelguitar` / `violin` / `choir` / `tubularbells` / `guzheng` / `erhu` / `dizi` | piano | 全局默认乐器 |
| `reverb:` | 0–1 | 0.26 | 混响量 |
| `transpose:` | -24–24 整数 | 0 | 整曲移调 |

`--tempo`、`--transpose`、`--reverb`、`--volume` 命令行参数会覆盖同名全局值。

## 3. 轨道

```text
track <名字> instrument=piano volume=0.85 pan=0 start=0 velocity=0.8 strum=0 drive=0 vibrato=0 slide=0
```

| 属性 | 取值 | 默认 | 说明 |
| --- | --- | --- | --- |
| 名字 | 无空格字符串 | `Track N` | 仅用于报告 |
| `instrument` | 乐器名/别名 | 全局 instrument | 该轨音色 |
| `volume` | 0–1 | 0.85 | 轨道音量 |
| `pan` | -1–1 | 0 | 声像；左负右正 |
| `start` | ≥0 拍 | 0 | 整条轨的起始拍 |
| `velocity` | 0–1 | 全局 | 该轨默认力度；音符 `@` 可覆盖 |
| `strum` | 0–0.25 秒 | 0 | 和弦音依次起音的间隔；吉他扫弦用 0.02–0.04 |
| `drive` | 0–1 | 0 | 失真量，只对 `eguitar` 生效 |
| `vibrato` | 0–1 | 0 | 揉弦深度，对 `erhu` / `dizi` 最明显 |
| `slide` | 0–0.5 秒 | 0 | 从前一个音滑到当前音的时间 |

## 3.1 乐器

```text
track melody instrument=musicbox
track pad instrument=pad
track low instrument=piano
```

| 名称 | 音域 | 特点 | 别名示例 |
| --- | --- | --- | --- |
| `piano` | A0–C8 | 原声钢琴，有制音器，踏板有效 | `grand`、`acoustic` |
| `musicbox` | C3–C8 | 音乐盒/钢片琴，无制音器，自然衰减 | `celesta`、`bell` |
| `epiano` | A1–C8 | FM 电钢琴，有制音器，力度越大越亮 | `ep`、`rhodes`、`wurli` |
| `pad` | C2–C7 | 慢起音暖垫，持续音，长释放 | `warmpad`、`warm-pad` |
| `harp` | C1–C7 | 拨弦竖琴，无制音器，自然衰减 | `lyre`、`concert-harp` |
| `marimba` | C2–C7 | 木质马林巴，无制音器，短衰减 | `mallet` |
| `bass` | E1–C5 | 电贝斯，有制音器但不吃踏板 | `ebass`、`electricbass` |
| `guitar` | E2–C6 | 尼龙吉他，拨弦自然衰减；配合 `strum` | `nylon`、`classicalguitar` |
| `organ` | C2–C7 | 拉杆风琴，持续音，不吃踏板 | `drawbar`、`hammond` |
| `strings` | C2–C7 | 弦乐合奏，慢起音、揉弦，不吃踏板 | `ensemble`、`stringsection` |
| `drums` | 多击打 | 鼓组，用 BD/SD/CH 等击打别名 | `drumkit`、`kit` |
| `flute` | C4–C7 | 长笛，气声、揉弦，不吃踏板 | `airflute`、`woodwind` |
| `vibraphone` | C3–C7 | 颤音琴，电机 tremolo，吃踏板 | `vibes`、`vibro` |
| `eguitar` | E2–C6 | 电吉他，`drive` 失真，配 `strum` | `electricguitar`、`overdriveguitar` |
| `cello` | C2–C6 | 独奏大提琴，弓弦 + 揉弦 | `violoncello` |
| `accordion` | C3–C6 | 手风琴，双簧片 + 风箱 | `bandoneon` |
| `timpani` | C2–A3 | 定音鼓，有音高的 one-shot | `kettledrum` |
| `harpsichord` | C2–C7 | 羽管键琴，明亮拨弦 | `cembalo` |
| `upright` | E1–C4 | 低音提琴，拨弦 + 琴体 | `doublebass` |
| `steelguitar` | E2–C6 | 钢弦吉他，配 `strum` | `steelstring` |
| `violin` | G3–C7 | 小提琴，弓弦 + 揉弦 | `fiddle` |
| `choir` | C3–C6 | 风格化 formant 合唱 | `vox`、`voices` |
| `tubularbells` | C4–C7 | 管钟，非谐金属长衰减 | `bells`、`chimes` |
| `guzheng` | C2–C7 | 古筝，明亮拨弦，`strum` 做刮奏 | `zheng` |
| `erhu` | D3–D6 | 二胡，弓弦 + `vibrato` / `slide` | `nanhu` |
| `dizi` | C4–C7 | 笛子，气声/笛膜 + `vibrato` / `slide` | `zhudi` |

- 不写 `instrument` 时使用全局 `instrument:`，默认 `piano`。
- 每种乐器有独立音域；超出会报 `RANGE` 错误。
- `musicbox` / `harp` / `marimba` / `guitar` / `harpsichord` / `steelguitar` 无制音器，踏板无效；音符按自然衰减。
- `bass` / `organ` / `strings` 有制音器，但不吃延音踏板；分别约 0.18 / 0.15 / 0.9 秒释放。
- `pad` 没有自然衰减，按住持续、松键后约 1.5 秒淡出。
- `strum` 只影响和弦：和弦内第 i 个音延后 i × strum 秒起音；单音不受影响。
- `drums` 是 one-shot 鼓组，只接受击打别名；`strum`、移调、踏板对它无效。
- `eguitar` 的 `drive` 0–1 控制失真；`flute` / `eguitar` 不吃踏板，`vibraphone` 吃踏板。
- `cello` / `accordion` / `timpani` / `harpsichord` / `upright` / `steelguitar` / `violin` / `choir` / `erhu` / `dizi` 都不吃踏板；`timpani` / `violin` / `choir` / `tubularbells` / `guzheng` / `erhu` / `dizi` 用音名写，有音高；`tubularbells` / `guzheng` 自然长衰减。
- 同一首曲子可以每条轨用不同乐器；`vibe instruments` 查看完整列表。

## 3.2 鼓组

```text
track drums instrument=drums
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

- 鼓轨只接受击打别名；写入音名（如 `C4`）会报 `DRUM` 错误。
- 每个击打是 one-shot，有独立时长和声像；不需要松键/制音。
- JSON 可以写 `{ "drum": "kick" }`、`{ "note": "BD" }` 或 `{ "notes": ["CH","OH"] }`。
- 鼓组不支持移调、踏板、`strum`。

## 4. 音符

| 写法 | 含义 |
| --- | --- |
| `C4` | C4，1 拍 |
| `C4:2` | C4，2 拍 |
| `C4:0.5` | 半拍 |
| `C4:1/2` | 半拍 |
| `C4:1.5` / `C4:3/2` | 一拍半 |
| `C4:1.` | 附点：1 × 1.5 = 1.5 拍 |
| `C4:1@0.9` | 力度 0.9（0–1，或 1–127） |
| `C4:1{bend=+2}` | 起音后向上弯 2 半音 |
| `C4:1{grace=D4}` | D4 装饰音后落到 C4 |
| `C4:1{trill=+2}` | 与上方 2 半音快速交替 |
| `[C4 E4 G4]:2` | 三音和弦，2 拍 |
| `[C4,E4,G4]:2` | 和弦的逗号写法 |
| `R:1` / `-:1` | 休止 1 拍 |

- 音名：`A0`–`C8`；支持 `C#4`、`Db4`、`Cb4`、`B#3`、`C##4`、`Dbb4`。
- **只能写 ASCII 的 `b` / `#`**：乐理里的 `B♭` 在谱面写成 `Bb`，`G♯` 写成 `G#`。
- 超出 A0–C8 会解析失败；移调后超范围也会报错。
- 和弦里的音共享同一个时值和力度。
- 想写“延音”不需要连线，直接把时值写长即可；踏板另外控制制音。

## 5. 踏板

```text
pedal: 0-4
pedal: 4-8
pedal: 8-
```

- 单位是拍；区间不能重叠。
- `x-` 表示从第 x 拍一直踩到结尾，只能作为最后一个踏板。
- 只有“松键时踏板还踩着”的音才会被延音；抬踏板时统一制音。
- 和声变化处换踏板，避免不同和弦混在一起。

## 6. 注释

```text
// 双斜杠注释
# 行首井号也是注释
```

行中的 `#` 是升降号，不是注释。

## 7. JSON 谱面

```json
{
  "title": "JSON 小曲",
  "tempo": 88,
  "meter": "4/4",
  "velocity": 0.8,
  "volume": 0.75,
  "reverb": 0.3,
  "transpose": 0,
  "instrument": "piano",
  "tracks": [
    {
      "name": "melody",
      "instrument": "musicbox",
      "strum": 0,
      "volume": 0.9,
      "pan": 0.1,
      "start": 0,
      "notes": [
        { "note": "C4", "at": 0, "beats": 1 },
        { "notes": ["E4", "G4"], "at": 2, "beats": 2, "velocity": 0.7 }
      ]
    }
  ],
  "pedals": [[0, 8], [8, 16]]
}
```

- `at`、`beats`、`pedals` 都用拍；轨道可写 `"drive": 0.6`（0–1，仅 `eguitar`）、`"vibrato": 0.6`、`"slide": 0.1`（秒）；音符可写 `"bend": 2`、`"grace": "E4"`、`"trill": 2`。
- 鼓组音符可写 `"drum": "kick"`，或 `"note": "BD"` / `"notes": ["CH","OH"]`。
- `note`、`notes`、`midi`（21–108）三选一。
- JSON 适合程序生成；手写谱用 DSL 更紧凑。

## 8. 命令

```bash
# 在技能目录，用 wrapper
./scripts/vibe.sh check song.piano --json
./scripts/vibe.sh instruments --json
./scripts/vibe.sh render song.piano --out song.wav --json
./scripts/vibe.sh play song.piano --out song.wav --json
```

Windows：

```powershell
.\scripts\vibe.ps1 check song.piano --json
.\scripts\vibe.ps1 play song.piano --out song.wav --json
```

CMD 用 `.\scripts\vibe.cmd`。

- `check`：只解析/编译，不渲染，最快。
- `render`：输出 WAV，不播放。
- `play`：渲染 + 调系统播放器；会阻塞到播放结束。
- `-` 作为文件名表示从 stdin 读取。
- 常用选项：`--out`、`--no-play`、`--json`、`--keep`、`--tempo`、`--transpose`、`--volume`、`--reverb`、`--sample-rate`、`--player`。

## 9. JSON 输出

成功：

```json
{
  "ok": true,
  "command": "render",
  "title": "小曲",
  "tempo": 96,
  "beats": 8,
  "duration": 7.2,
  "notes": 12,
  "volume": 0.8,
  "wav": "/tmp/song.wav",
  "bytes": 1200000,
  "played": false,
  "warnings": []
}
```

失败：

```json
{
  "ok": false,
  "error": {
    "message": "无法识别音名 \"H4\"",
    "code": "PARSE",
    "line": 4,
    "column": 6
  }
}
```

- 解析/编译错误退出码为 `1`。
- 播放器缺失或播放失败时仍 `ok: true`，但 `played: false`、`playError` 有原因；WAV 会保留。

## 10. 常见错误

| 报错 | 原因 | 修法 |
| --- | --- | --- |
| 音符必须写在 track 之后 | 第一条 `track` 前写了音符 | 先声明轨道 |
| 无法识别音名 | 拼写错误/超出范围 | 用 `C#4`、`Db4` 等；检查 A0–C8 |
| 时值必须大于 0 | `C4:0` 或负值 | 改成正数 |
| 踏板区间重叠 | 两个 `pedal` 区间交叉 | 改成首尾相接或留空隙 |
| 前一个踏板没有抬起 | `x-` 后面还有踏板 | 把 `x-` 放到最后 |
| 移调后音符超出范围 | 移调太多 | 减少 `--transpose` |
| `乐器 ... 的音域是 ...` | 该乐器音域更窄 | 换轨道乐器，或改用 piano/epiano |
| `未知乐器` | 乐器名/别名拼错 | 用 `vibe instruments` 查看 |
| 歌曲时长超过 300 秒 | 太长 | 缩短/减速度，或拆成多首 |
| 没有找到播放器 | 系统没有 afplay/ffplay 等 | 用 `render` 保存 WAV；或 `--player` 指定 |

## 11. 提示

- `meter` 不会自动检查每小节拍数；**写的时候自己数**，一行一小节最清楚。
- `play` 会等整首播放完；长曲先用 `render` 确认，再把 WAV 交给用户。
- 音量是相对/归一化的：曲谱 `volume` 控制最终峰值，不是系统音量。
- 同一首谱面每次渲染结果一致（随机相位使用固定种子）。
