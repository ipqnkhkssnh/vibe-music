---
name: vibe-music
description: 用 Vibe Music CLI 创作、编配、校验、渲染并播放多乐器音乐。内置 piano / musicbox / epiano / pad / harp / marimba / bass / guitar / organ / strings / drums / flute / vibraphone / eguitar / cello / accordion / timpani / harpsichord / upright / steelguitar / violin / choir / tubularbells / guzheng / erhu / dizi 二十六种音色；核心原则是按场景只选 2–4 件合适的乐器，不把大部分乐器都堆进一首曲子。`.piano` 只是歌曲脚本的惯用扩展名，不是“只能写钢琴”。适用于写歌、作曲、编曲、配器、即兴、试听、助眠/放松/背景音乐、lofi、夜曲、练习曲、圆舞曲、拨弦三重奏、民谣、带鼓节奏、rock、爵士、电影感、中国风；内含歌曲 DSL、和声/曲式/情绪模板、乐器角色与场景配器表、鼓组击打、失真吉他、东方滑音/揉弦、v2 弯音/装饰音/颤音、Agent 工作流与错误排查。触发词：vibe music、vibe 编曲、写歌、作曲、编曲、配器、乐器选择、钢琴曲、弹一首、试听、播放、助眠、放松、背景音乐、BGM、piano、musicbox、epiano、pad、harp、竖琴、marimba、马林巴、bass、贝斯、guitar、吉他、organ、风琴、strings、弦乐、drums、鼓、鼓组、flute、长笛、vibraphone、颤音琴、eguitar、电吉他、cello、大提琴、accordion、手风琴、timpani、定音鼓、harpsichord、羽管键琴、upright、低音提琴、steelguitar、钢弦吉他、violin、小提琴、choir、合唱、tubularbells、管钟、guzheng、古筝、erhu、二胡、dizi、笛子、中国风、lofi、rock、jazz、compose、song、lullaby。
whenToUse: 当用户让你原创或改编一首多乐器曲子、按情绪/场景写歌、为一段旋律选择配器，或把 .piano 谱面校验、渲染并播放时。
version: 2.0.0
---

# Vibe Music — 多乐器编曲与试听

这个技能负责“**从一句需求到一首能播放的原创多乐器曲子**”。底层工具是技能自带的 `cli/`，它负责解析谱面、离线合成、写 WAV、调系统播放器；本技能负责**选什么乐器、怎么写得好听、怎么校验、怎么交付**。

## 0. 先定位工具

技能目录记为 `$SKILL_DIR`（本文件所在目录）。**CLI 已经随技能一起提供**，就在 `$SKILL_DIR/cli/`，不需要再安装或定位单独的 CLI。

```bash
# 在仓库根目录 music/：
SKILL_DIR="$(cd skills/vibe-music && pwd)"
VIBE="$SKILL_DIR/scripts/vibe.sh"

# 已经在技能目录：
SKILL_DIR="$PWD"
VIBE="./scripts/vibe.sh"
```

Windows PowerShell：

```powershell
# 在仓库根目录：
$SKILL_DIR = (Resolve-Path "skills/vibe-music").Path
# 或已安装到 DSH：
# $SKILL_DIR = Join-Path $HOME ".agents\skills\vibe-music"
$VIBE = Join-Path $SKILL_DIR "scripts\vibe.ps1"
& $VIBE --which-cli
& $VIBE version
```

Windows CMD：

```bat
skills\vibe-music\scripts\vibe.cmd version
```

验证：

```bash
$VIBE --which-cli
$VIBE version
```

如果技能被复制到 `~/.agent/skills`，`cli/` 会一起复制，通常无需设置环境变量。需要显式覆盖时：

```bash
# macOS / Linux
export VIBE_CLI=/绝对路径/skills/vibe-music/cli
```

```powershell
# Windows PowerShell
$env:VIBE_CLI = "C:\绝对路径\skills\vibe-music\cli"
```

> Agent 的每次 shell 调用可能是独立进程：`$VIBE` 不会自动保留。要么每条命令重新设置，
> 要么直接写 `skills/vibe-music/scripts/vibe.sh`（从仓库根目录）或使用绝对路径。
> Windows 上把 `$VIBE check ...` 写成 `& $VIBE check ...`；CMD 用 `scripts\vibe.cmd`。

**先读**（按需）：

- [cli/README.md](cli/README.md) 与 [cli/AGENTS.md](cli/AGENTS.md)：CLI 的完整文档和 Agent 速查。
- [references/dsl.md](references/dsl.md)：谱面语法、命令、JSON 输出契约。
- [references/composition.md](references/composition.md)：情绪配方、和声进行、曲式、旋律/伴奏写法。
- [templates/](templates/)：可运行的 2–5 件乐器骨架。
- `$VIBE instruments`：查看二十六种乐器的音域、别名和特点。

## 1. 工作流（按顺序执行）

### 1.0 配器优先：少而准

**先决定用哪 2–4 件乐器，再写第一个音。** 26 种音色是调色板，不是菜单；一首曲子通常只需要其中很小一部分。

配器预算：

- **2–4 件**是默认；最多 5 件，第 5 件只能是节奏/点缀。
- 每件乐器必须有一个**不同角色**：
  - 主旋律：piano / violin / erhu / flute / dizi / musicbox / cello / guitar 等，只选一件。
  - 和声/铺底：pad / strings / organ / choir / piano / epiano / guitar 等，选一件。
  - 低音：bass / upright / piano / epiano，选一件。
  - 节奏/点缀：drums / timpani / tubularbells / marimba / musicbox，按需一件。
- 如果删掉一件乐器后听不出区别，就删掉它。
- 不要让两件乐器同时承担主旋律，也不要让三件乐器挤在同一频段。
- 不要把 26 种音色都试一遍；也不要把“能用”当成“必须用”。

按场景直接选一行，不要跨行拼成 6–8 件：

| 场景 | 推荐配器（2–4 件） | 不要 |
| --- | --- | --- |
| 助眠/摇篮 | musicbox 或 piano 主旋律 + pad 和弦 + piano/bass 低音 | 鼓、失真吉他、密集跑动 |
| lofi/夜曲 | epiano 和弦 + bass + drums（可加 musicbox 点缀） | 双主旋律、多件高频 |
| 电影感/氛围 | pad + piano/strings 旋律 + timpani 或 tubularbells | 全套管弦乐堆叠 |
| 民谣/旧照片 | steelguitar/guitar + upright/bass + violin/accordion + 轻鼓 | 三件吉他、过载吉他 |
| rock/lofi | eguitar + bass + drums + epiano/pad | 同时用 3 件吉他 |
| 爵士/咖啡馆 | harpsichord/epiano + upright + drums + steelguitar | 低音三件叠一起 |
| 中国风 | guzheng + erhu + dizi + pad | 26 件全上、双二胡主旋律 |
| 室内/电影 | cello/violin + accordion/piano + pad + timpani | 无低音、无留白 |
| 独奏 | piano / epiano / harp / guzheng 一件即可 | 为了“丰富”硬加轨道 |

### 1.1 定 brief，不要问太多

从用户的话里提取：**情绪/用途、时长、调性、速度、场景、是否需要播放**。缺少的用默认值补齐，不要为了确认细节停下来。

默认：

- 16 小节、4/4、72 BPM、C 大调或 A 小调。
- 40–90 秒；助眠可以 2 分钟左右。
- 配器 2–4 件；具体按 1.0 的场景表选。
- 输出到 `songs/<slug>.piano`；草稿可先放 `/tmp`。技能目录里的 `templates/` 只读。

用户只说“写一首轻松/助眠的”时，直接按 **助眠配方**：56–64 BPM、大调 maj7/sus、2–3 件乐器（musicbox/piano + pad + 低音）、每小节 2–4 个伴奏音、长音旋律、`volume` 0.55–0.7、`reverb` 0.35–0.45。

### 1.2 写 8 行蓝图

在写音符前，先确定：

```text
标题：
情绪/用途：
调性：
BPM：
拍号/小节数：
配器：____（2–4 件） / 每件角色：____
曲式：Intro __ + A __ + B __ + A' __ + Coda __
和声：A: ____  B: ____  Coda: ____
织体：旋律音区 ____ / 伴奏型 ____ / 低音 ____ / 踏板 ____
```

配器行必须能回答“这件乐器负责什么”。答不上来的，不要写进蓝图。

### 1.3 选模板或从空白开始

```bash
mkdir -p songs
cp "$SKILL_DIR/templates/lullaby.piano" songs/quiet-song.piano
# 或 nocturne.piano / waltz.piano
# 或 layered-lullaby.piano（musicbox + pad + piano）
# 或 plucked-trio.piano（harp + marimba + bass）
# 或 old-photo.piano（guitar + organ + strings + bass）
# 或 lofi-groove.piano（drums + epiano + guitar + bass）
# 或 neon-highway.piano（drums + eguitar + vibraphone + flute + bass）
# 或 chamber-folk.piano（cello + accordion + timpani + pad）
# 或 cafe-jazz.piano（harpsichord + upright + steelguitar + drums）
# 或 cathedral.piano（violin + choir + tubularbells + pad + timpani）
# 或 jiangnan.piano（guzheng + erhu + dizi + pad）
```

模板是**可运行的骨架**，不是成品。先删掉不需要的轨道，再改标题、速度、和弦、旋律；保留“每小节一行”的结构。

### 1.4 写谱

硬规则：

1. **先配器后写音**：2–4 件乐器；最多 5 件，第 5 件只能是节奏/点缀。
2. 每件乐器一个角色；不要两件同时主旋律，不要三件挤同一频段。
3. 低音只留一件：`bass` / `upright` / `piano` / `epiano`。
4. 和声铺底只留一件：`pad` / `strings` / `organ` / `choir`。
5. 一行一小节，行末写 `|`；自己数每行拍数，`meter` 不会替你检查。
6. 每条 track 内的音符是顺序的；多声部用多条 track。
7. 旋律强拍落在和弦音（1/3/5），弱拍用 2/4/6/7 音作色彩。
8. 助眠/放松：每小节 1–2 个长旋律音，伴奏 2–4 个音；不要密集跑动。
9. 踏板每小节或每个和弦换一次，不能重叠。
10. 音域 A0–C8；旋律建议 C4–G5，低音 C2–B2。
11. 力度有层次：乐句开头 `@0.7–0.9`，经过音 `@0.5–0.65`，助眠整体更低。
12. 不要照搬现成歌曲的旋律；用和弦进行 + 自己的节奏动机。
13. 谱面里**只能写 ASCII 的 `b` / `#`**：`B♭` 要写成 `Bb`，`G♯` 写成 `G#`。
14. 每条 track 可以指定 `instrument=`；不指定就用全局 `instrument:`，默认 `piano`。
15. 注意每种乐器的音域，跨乐器写低音时把低音轨单独设成 `bass` / `upright` / `piano` / `epiano`。
16. `harp` / `marimba` / `musicbox` / `guitar` / `harpsichord` / `steelguitar` / `guzheng` 无制音器，踏板无效；`bass` / `organ` / `strings` / `flute` / `eguitar` / `cello` / `accordion` / `timpani` / `upright` / `violin` / `choir` / `erhu` / `dizi` 有制音器但不吃踏板；`pad` / `piano` / `epiano` / `vibraphone` 吃踏板。
17. 吉他和弦要写 `strum=0.02–0.04`，否则所有弦同时响，像块状和弦而不是扫弦。
18. 鼓组只能写击打别名（BD/SD/CH/OH/CP/LT/MT/HT/RD/CR/SH/TB），音名会报 `DRUM` 错误；`strum`/移调/踏板对鼓组无效。
19. 电吉他用 `drive=0–1`；0 清音、0.5–0.8 轻过载。`drive` 对其它乐器无效。
20. 拉丁打击是鼓组扩展：`CG` 康加、`BG` 邦戈、`CL` 响棒、`CB` 卡巴萨；仍然用 `track drums instrument=drums`。
21. `timpani` 有音高、走音名（C2–A3），不是鼓组别名；`cello` / `accordion` / `upright` / `violin` / `choir` / `tubularbells` / `guzheng` / `erhu` / `dizi` 也都是有音高乐器。
22. `choir` 是风格化 formant 合唱，不是真人歌词；需要真实人声时用采样，不要硬做。
23. 东方包 v1 用 `vibrato` / `slide` 做表情：`erhu` 常用 `vibrato=0.5–0.8 slide=0.08–0.15`，`dizi` 常用 `vibrato=0.3–0.5 slide=0.04–0.08`；古筝刮奏用 `strum=0.03–0.05`。
24. v2 逐音演奏法：`D4:1{bend=+2}`、`D4:1{grace=E4}`、`D4:1{trill=+2}`；可组合成 `{bend=+2,trill=+2}`，不要空格。古筝也可用 `bend`/`grace`/`trill`/`slide`。

三轨骨架（默认就写这么多，不要一上来铺 8 轨）：

```text
title: 曲名
tempo: 72
meter: 4/4
reverb: 0.30
volume: 0.80

track melody instrument=piano volume=0.72 pan=0.1
C5:2 E5:2 | ...

track pad instrument=pad volume=0.38 pan=0.0
[C4 E4 G4]:4 | ...

track bass instrument=bass volume=0.4 pan=-0.2
C2:4 | ...

pedal: 0-4
pedal: 4-8
```

需要第四件时，优先加节奏/点缀（drums / timpani / musicbox / marimba），而不是再加一条旋律。

### 1.4.1 乐器角色表

工具内置二十六种音色，先选角色，再选具体乐器：

| 乐器 | 适合角色 | 音域 | 注意 |
| --- | --- | --- | --- |
| `piano` | 主旋律、和声、低音、独奏 | A0–C8 | 有制音器，踏板有效 |
| `musicbox` | 高频旋律、点缀、助眠/童话 | C3–C8 | 无制音器，踏板无效 |
| `epiano` | 和弦、riff、电钢低音、lofi | A1–C8 | 有制音器，踏板有效 |
| `pad` | 长音铺底、和弦垫、电影感 | C2–C7 | 慢起音 0.38 秒、长释放 1.5 秒 |
| `harp` | 琶音、分解和弦、glissando 感 | C1–C7 | 拨弦、自然衰减；踏板无效 |
| `marimba` | 温暖木质旋律、节奏点缀 | C2–C7 | 短衰减；踏板无效 |
| `bass` | 低音根音、riff | E1–C5 | 不用踏板；松键 0.18 秒止音 |
| `guitar` | 扫弦、分解、民谣 | E2–C6 | 必须配合 `strum` 才有扫弦感 |
| `organ` | 持续和弦、gospel、氛围 | C2–C7 | 持续音，不吃踏板 |
| `strings` | 弦乐旋律、电影感铺底 | C2–C7 | 慢起音、长释放；不吃踏板 |
| `drums` | 节奏骨架、lofi/民谣/摇滚 | 多击打 | 只能写击打别名 |
| `flute` | 气声领奏、民谣/电影感 | C4–C7 | 持续音，不吃踏板 |
| `vibraphone` | 金属马林巴、爵士/lounge | C3–C7 | 吃踏板，可做长和弦 |
| `eguitar` | 清音/过载、rock/lofi | E2–C6 | 用 `drive` + `strum` |
| `cello` | 独奏低中音旋律、电影感 | C2–C6 | 弓弦 + 揉弦，不吃踏板 |
| `accordion` | 民谣/探戈/法式 | C3–C6 | 双簧片 + 风箱噪声 |
| `timpani` | 管弦低音打击、电影感 | C2–A3 | 有音高 one-shot，约 2.2 秒 |
| `harpsichord` | 巴洛克/室内乐 | C2–C7 | 明亮拨弦，自然衰减 |
| `upright` | 爵士/bluegrass 低音 | E1–C4 | 拨弦 + 琴体，不吃踏板 |
| `steelguitar` | 民谣/乡村/流行 | E2–C6 | 明亮拨弦，配 `strum` |
| `violin` | 高音独奏、电影感/民谣 | G3–C7 | 弓弦 + 揉弦；不吃踏板 |
| `choir` | 人声铺底、电影感 | C3–C6 | 风格化 formant 合唱 |
| `tubularbells` | 电影感/悬疑/教堂 | C4–C7 | 非谐金属长衰减 |
| `guzheng` | 中国风、古筝旋律/刮奏 | C2–C7 | 刮奏用 `strum=0.03–0.05` |
| `erhu` | 中国风旋律、滑音 | D3–D6 | 用 `vibrato` + `slide` 做表情 |
| `dizi` | 中国风高音旋律 | C4–C7 | 气声/笛膜 buzz |

常用组合（每行已经是 2–4 件，不要扩成 7 件）：

- **独奏**：piano / epiano / harp / guzheng 一件即可。
- **助眠/摇篮**：musicbox 旋律 + pad 和弦 + piano 低音，`volume` 0.55–0.65，`reverb` 0.35–0.45。
- **lofi/夜曲**：epiano 分解和弦 + bass 低音 + musicbox 高音点缀，`volume` 0.75–0.85，`reverb` 0.25–0.35。
- **电影感/氛围**：pad 长和弦 + piano/strings 单音旋律 + timpani/tubularbells 点缀，踏板按和弦换。
- **拨弦三重奏**：harp 滚动琶音 + marimba 旋律 + bass 根音，`volume` 0.7–0.8，`reverb` 0.3–0.4。
- **民谣/旧照片**：guitar 扫弦 + organ 长和弦 + strings 旋律 + bass 根音，`volume` 0.75–0.85，`reverb` 0.25–0.35。
- **lofi 鼓组**：drums + epiano 和弦 + guitar 扫弦 + bass 根音，`volume` 0.75–0.85，`reverb` 0.2–0.3。
- **rock/lofi 霓虹**：drums + eguitar（`drive=0.55`）+ flute 或 vibraphone + bass，`volume` 0.8，`reverb` 0.25。
- **室内民谣远山**：cello 旋律 + accordion 长和弦 + pad + timpani 句首，`volume` 0.7–0.75，`reverb` 0.35。
- **咖啡馆爵士**：harpsichord 分解 + upright walking + steelguitar 扫弦 + drums，`volume` 0.75–0.8，`reverb` 0.2–0.25。
- **电影感穹顶**：violin 旋律 + choir 长和弦 + pad + tubularbells + timpani，`volume` 0.65–0.72，`reverb` 0.35–0.45。
- **中国风江南**：guzheng 分解 + erhu 旋律 + dizi 高音 + pad，`volume` 0.68–0.72，`reverb` 0.35–0.45。

低音只留一件；不要让 `musicbox`、`harp`、`pad` 承担低于它们音域的低音。

**配器反例**：

- 把 26 种音色都写进一首曲子。
- 同时用 piano + epiano + harpsichord + steelguitar 做四层和弦。
- 两件乐器吹同一条主旋律，只是音色不同。
- 每件乐器都写满，没有留白。
- 为了“用上”某个音色而加一条没有角色的轨道。

### 1.5 校验（必须先做）

```bash
$VIBE check songs/quiet-song.piano --json
```

解析 stdout 的 JSON：

- `ok: false`：按 `error.line` / `error.column` 修，不要继续。
- `ok: true`：看 `instruments`、`notes`、`beats`、`duration`、`volume`、`warnings`。
- **配器检查**：`instruments` 超过 5 件，或两件乐器角色重复，先删轨道再渲染。
- 时长异常长/短、`warnings` 非空，先调整再渲染。

### 1.6 渲染预览

```bash
$VIBE render songs/quiet-song.piano \
  --out /tmp/quiet-song.wav --json
```

- 先 `render` 不阻塞，适合快速迭代。
- 检查 `peak`（助眠建议 0.45–0.65；普通 0.8–0.9）、`bytes`、`renderMs`。
- 想更轻：曲谱里加 `volume: 0.6`，或命令加 `--volume 0.55`。

### 1.7 播放给用户

用户明确要“试试/播放”时：

```bash
$VIBE play songs/quiet-song.piano \
  --out songs/quiet-song.wav --json
```

注意事项：

- `play` **会阻塞到播放结束**。给工具调用留出 `duration + 30s` 的超时；2–3 分钟的曲子需要 180–200 秒超时。
- 如果超时不够：改用 `render`，把 WAV 路径和 `afplay <wav>` 命令交给用户。
- 没有播放器时仍会渲染成功，返回 `played: false` + `playError`；这时不要声称“已经播放”，如实说明并给 WAV 路径。
- 不要在用户没要求时反复播放；先 `render` 确认。

### 1.8 自检与迭代

播放前按 [references/composition.md](references/composition.md) 的自检清单过一遍。重点：

- **配器是否 2–4 件、每件都有独立角色？多了就先删。**
- 每小节拍数是否正确。
- 旋律是否以和弦音为主、是否有留白。
- B 段是否有对比，最后是否回到主和弦。
- 踏板是否在换和弦处换。
- 助眠是否过响/过密/高音突兀。

如果用户反馈“太吵/太快/太单调”：

- 太吵：降 `volume`、降轨道 volume、降力度、减少同时发声；先删掉一件没有角色的乐器。
- 太快：降 BPM、加长音符、减少每小节伴奏音。
- 太单调：B 段换和弦/音区，A' 改尾音或加高八度，增加一点节奏变化；不要靠加乐器解决。
- 太糊：缩短踏板区间、减少低音、减少同时按下的和弦音。
- 低音太轰：bass 降到 E1–C3，或减少 bass 与 piano 低音的重叠。

### 1.9 交付

最终谱面放在 `songs/<slug>.piano`；WAV 放在同目录或用户指定路径。回复用户时包含：

- 曲名、调性、BPM、长度、曲式、**使用的 2–4 件乐器及各自角色**。
- 和声进行/织体的一句话说明。
- 文件链接（相对路径）和重听命令。
- 如果已播放：`played: true`、播放器、时长；如果没播放：明确说明并给 WAV 路径。

不要贴整份谱面；给开头 2–4 小节和文件链接即可。

## 2. 常用命令

```bash
# 校验
$VIBE check song.piano --json

# 渲染（不播放）
$VIBE render song.piano --out /tmp/song.wav --json

# 渲染并播放（阻塞）
$VIBE play song.piano --out /tmp/song.wav --json

# 内置示例
$VIBE demo --list
$VIBE demo sleep
$VIBE demo jiangnan

# 查看音高表 / 乐器
$VIBE notes --json
$VIBE instruments --json

# 从 stdin 读
cat song.piano | $VIBE play - --out /tmp/song.wav --json
```

## 3. 输出契约

- `--json` 时 stdout 只有一个 JSON 对象；进度/播放提示在 stderr。
- 成功：`ok: true`，含 `title / tempo / duration / notes / instruments / wav / played / player / renderMs`（`check` 不含后四项）。
- 失败：`ok: false`，`error` 含 `message / code / line / column`；退出码 1。
- 播放失败不等于渲染失败：`ok: true`，`played: false`，`playError` 说明原因。
- 临时 WAV：`play` 不写 `--out` 时播放成功后自动删除；要稳定文件必须传 `--out`。

## 4. 常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `音符必须写在 track 之后` | 先写了音符 | 先声明 `track` |
| `无法识别音名` | 拼写/超范围 | 用 `C#4`、`Db4`；检查 A0–C8 |
| `踏板区间重叠` | 两个 pedal 交叉 | 改成首尾相接 |
| `歌曲时长超过 300 秒` | 太长 | 缩减小节/降速/拆曲 |
| `play` 很久没返回 | 在等播放结束 | 正常；或改用 `render` |
| `played: false` | 没有播放器/播放失败 | 给 WAV 路径，别谎称已播放 |
| 声音太糊 | 踏板太长/低音太多/轨道太多 | 每小节换踏板、减低音、先删无角色轨道 |
| 声音太满 | 配器过多 | 回到 2–4 件，删掉重复角色 |
| `乐器 ... 的音域是 ...` | 该乐器音域更窄 | 换轨道或改用 piano/epiano |
| musicbox 没有踏板效果 | 它没有制音器 | 正常；要踏板延音就换 piano/epiano |
| pad 听起来没声音/太慢 | 攻击 0.38 秒、音量低 | 加长音符、提高 track volume |
| 声音太亮/太吵 | 力度/volume/高音 | 降力度、降 volume、移低八度 |

## 5. 绝不要做的事

- 不要把“能用的乐器”都堆进一首曲子；一首 2–4 件，最多 5 件。
- 不要两件乐器同时主旋律，或三件乐器挤同一频段。
- 不要为了用某个音色而加一条没有角色的轨道。
- 不要 `eval` 或执行用户提供的任意 JS；谱面只是文本/JSON 数据。
- 不要抄现成歌曲的主旋律；用和声进行 + 原创动机。
- 不要在 `ok: false` 时继续渲染/播放。
- 不要把 `--json` 的 stdout 和 WAV 二进制混在一起（`--out -` 不能配 `--json`）。
- 不要声称“已经播放”而 `played` 为 false。
