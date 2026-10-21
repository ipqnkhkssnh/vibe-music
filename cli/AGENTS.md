# Agent 操作指南

本目录是一个**给 Agent 调用的多乐器音乐 CLI**。你写一段歌曲脚本，选择少量合适的乐器，用 `check` 校验，用 `render` 生成 WAV，或用 `play` 让系统播放。

## 最短路径

> Windows：把 `node bin/vibe.js` 写成 `node bin\vibe.js`；也可以直接用技能根目录的
> `scripts\vibe.ps1`（PowerShell）或 `scripts\vibe.cmd`（CMD）。

```bash
# 在本目录（skills/vibe-music/cli）下执行

# 1. 写歌（文本 DSL）
cat > /tmp/agent-song.piano <<'EOF'
title: Agent Song
tempo: 100
reverb: 0.25

track melody instrument=musicbox volume=0.9 pan=0.1
C4:1 D4:1 E4:1 G4:2 | A4:1 G4:1 E4:2

track pad instrument=pad volume=0.4 pan=0
[C4 E4 G4]:4 | [F3 A3 C4]:4

track low instrument=piano volume=0.5 pan=-0.2
C3:4 | A2:4

pedal: 0-4
pedal: 4-8
EOF

# 2. 校验，stdout 得到 JSON
node bin/vibe.js check /tmp/agent-song.piano --json

# 3. 渲染并播放，保留 WAV
node bin/vibe.js play /tmp/agent-song.piano --out /tmp/agent-song.wav --json
```

## 输出契约

- `--json`：stdout 只有一个 JSON 对象；进度/播放提示在 stderr。
- `play` / `render` 成功：`ok: true`，包含 `title / tempo / duration / notes / instruments / wav / played / player / renderMs`。
- `check` 成功：`ok: true`，包含 `title / tempo / duration / notes / instruments / tracks / warnings`，不渲染。
- 失败：`ok: false`，`error` 包含 `message / code / line / column`；退出码 `1`。
- 没找到播放器或播放失败不等于渲染失败：仍返回 `ok: true`，但 `played: false`、`playError` 有说明；WAV 会保留。
- 临时 WAV：`play` 不写 `--out` 时播放成功后自动删除；想要稳定文件就传 `--out`。

## 歌曲语法速查

```text
title: 曲名
tempo: 96          // 20–300 BPM
meter: 4/4
reverb: 0.26       // 0–1
volume: 1          // 总输出电平 0–1
transpose: 0       // -24–24

track melody instrument=musicbox volume=0.9 pan=0.1 start=0 strum=0 drive=0 vibrato=0 slide=0
C4:1 D4:1 [E4 G4]:2 R:1 | C4:1.

track low instrument=piano
C3:4 | G2:4

pedal: 0-4
pedal: 4-
```

- 1 拍 = 一个四分音符。
- `C4:1`、`C4:0.5`、`C4:1/2`、`C4:3/2`、`C4:1.`（附点）都支持。
- `C4:1@0.9` 设置力度（0–1，或 1–127）。
- 和弦：`[C4 E4 G4]:2`。
- 休止：`R:1` 或 `-:1`。
- 音名：A0–C8；支持 `C#4`、`Db4`、`Cb4`、`B#3`。
- 乐器：`piano` / `musicbox` / `epiano` / `pad` / `harp` / `marimba` / `bass` / `guitar` / `organ` / `strings` / `drums` / `flute` / `vibraphone` / `eguitar` / `cello` / `accordion` / `timpani` / `harpsichord` / `upright` / `steelguitar` / `violin` / `choir` / `tubularbells` / `guzheng` / `erhu` / `dizi`；别名 `celesta`、`ep`、`warm-pad`、`ebass`、`nylon`、`drawbar`、`drumkit`、`vibes`、`violoncello`、`doublebass`。
- 音域：piano A0–C8、musicbox C3–C8、epiano A1–C8、pad C2–C7、harp C1–C7、marimba C2–C7、bass E1–C5、guitar/eguitar/steelguitar E2–C6、organ/strings C2–C7、flute C4–C7、vibraphone/harpsichord C3/C2–C7、cello C2–C6、accordion C3–C6、timpani C2–A3、upright E1–C4、violin G3–C7、choir C3–C6、tubularbells C4–C7、guzheng C2–C7、erhu D3–D6、dizi C4–C7；drums 是多击打，没有音高。
- `harp` / `marimba` / `musicbox` / `guitar` / `harpsichord` / `steelguitar` 无制音器，踏板无效；`bass` / `organ` / `strings` / `flute` / `eguitar` / `cello` / `accordion` / `timpani` / `upright` / `violin` / `choir` 有制音器但不吃踏板；`tubularbells` / `guzheng` 自然衰减；`erhu` / `dizi` 有制音器但不吃踏板；`vibraphone` 吃踏板。
- `strum` 只对和弦生效，单位秒（0–0.25）；吉他扫弦用 0.02–0.04。
- `drive` 只对 `eguitar` 生效，0–1；0 清音，0.5–0.8 轻过载/失真。
- `vibrato` 0–1，对 `erhu` / `dizi` 最明显；`slide` 0–0.5 秒，从前一个音滑到当前音，`erhu` 常用 0.08–0.15。
- 逐音演奏法：`D4:1{bend=+2}` 弯音、`D4:1{grace=E4}` 装饰音、`D4:1{trill=+2}` 颤音；可组合但不要空格，如 `{bend=+2,trill=+2}`。
- 鼓组轨：`track drums instrument=drums`，音符写 `BD:1 SD:1 CH:1`；别名 BD/K 底鼓、SD/S 军鼓、CH/HH 闭镲、OH 开镲、CP 拍手、LT/MT/HT 桶鼓、RD 叮叮镲、CR 吊镲、SH 沙锤、TB 铃鼓、CG 康加、BG 邦戈、CL 响棒、CB 卡巴萨。
- `|` 只是小节线，会被忽略。
- 音符必须在 `track` 之后。
- 踏板区间单位是拍，不能重叠；`x-` 表示踩到结尾。

## 常用命令

```bash
vibe play <song> [--out x.wav] [--json]
vibe render <song> --out x.wav [--json]
vibe check <song> --json
vibe demo --list
vibe instruments --json
```

也可以直接用本目录的入口：

```bash
node bin/vibe.js play <song> [--out x.wav] [--json]
node bin/vibe.js render <song> --out x.wav [--json]
node bin/vibe.js check <song> --json
node bin/vibe.js demo --list
node bin/vibe.js demo twinkle --no-play --out /tmp/twinkle.wav
node bin/vibe.js notes --json
node bin/vibe.js instruments --json
```

`song` 为 `-` 时从 stdin 读取：

```bash
cat song.piano | node bin/vibe.js play - --out /tmp/song.wav --json
```

## 生成歌曲时的注意点

1. 每条轨道的音符是**顺序**的，不是绝对时间；用 `R` 或 `start` 对齐。
2. 多声部用多条 `track`，它们默认都从第 0 拍开始。
3. 保持每个音在 A0–C8；移调后超范围会报错。
4. 踏板只在“松键时仍踩着”时延音；写 `pedal` 区间时注意起点/终点。
5. 一次渲染整首；`play` 会阻塞到播放结束，长曲（>180 秒）会占用更多时间和内存。
6. 不要用 `eval`/执行任意 JS；歌曲是纯文本/JSON 数据。

更多格式和选项见 [README.md](README.md)。
