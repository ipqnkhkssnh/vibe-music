# 作曲配方：从情绪到谱面

这份参考不是乐理教材，而是 Agent 能直接执行的“决策表”。先选配方，再写谱，最后用 CLI 校验和试听。

## 1. 先定 6 个参数

1. **情绪**：助眠/放松、抒情/夜曲、明亮/学习、电影感/叙事。
2. **时长**：16 小节约 40–60 秒；24 小节约 70–90 秒；32 小节约 2 分钟。
3. **拍号**：默认 4/4；圆舞曲用 3/4。
4. **调性**：放松用 C/F/G 大调；夜曲用 A/D 小调；少用大量黑键。
5. **织体**：分解和弦、柱式和弦、琶音、长音铺底。
6. **动态**：`volume` + 轨道 volume + 力度 `@`。

没有特别要求时，默认：**4/4、72 BPM、16 小节、C 大调或 A 小调、volume 0.8、reverb 0.28**。

## 2. 情绪配方

| 情绪 | BPM | 调性/和声 | 织体 | 旋律 | volume / reverb |
| --- | --- | --- | --- | --- | --- |
| 助眠/放松 | 50–64 | 大调 maj7、sus、add9；少用强属和弦 | 每小节 2–4 个分解音；长音铺底 | 每小节 1–2 个长音，2–4 拍，音域 C4–G5 | 0.55–0.7 / 0.35–0.45 |
| 抒情/夜曲 | 66–84 | 小调；Am–F–C–G；Dm–Am–B♭–F | 八分音符分解和弦 | 2–4 拍长音 + 少量经过音；高潮一次 | 0.8–0.9 / 0.28–0.35 |
| 明亮/学习 | 88–112 | C/G/Am/F；C–G–Am–F | 轻快分解或柱式；少踩踏板 | 四分/八分音符，stepwise | 0.8–0.9 / 0.2–0.3 |
| 电影感/叙事 | 70–90 | 小调；持续低音 + 上行模进 | 固定音型/ostinato | 逐步上行，最后回落 | 0.8–0.95 / 0.3–0.4 |

**助眠的硬规则**：

- 不要突然出现高音或强奏；力度建议 ≤ 0.7。
- 不要密集跑动；每小节 2–4 个伴奏音足够。
- 低音不要每拍都砸；整小节一个根音更稳。
- 重复比发展更重要；用 4/8 小节循环 + 轻微变化。
- 结尾要收在主和弦，不要停在悬置和弦上。

## 2.1 乐器分工与常用组合

写谱前先决定“谁负责什么，用几件”，不要把所有东西都塞给钢琴。

### 配器预算：2–4 件，最多 5 件

- **默认 2–4 件**；第 5 件只能是节奏/点缀。
- 每件必须有独立角色：主旋律 / 和声铺底 / 低音 / 节奏点缀。
- 主旋律只留一件；低音只留一件；和声铺底只留一件。
- 如果删掉一件听不出区别，就删掉它。
- 不要把 26 种音色都写进一首曲子；也不要把两件乐器写成同一条旋律。

按场景选一行，不要跨行堆叠：

| 场景 | 2–4 件推荐 | 不要 |
| --- | --- | --- |
| 助眠/摇篮 | musicbox 或 piano + pad + piano/bass 低音 | 鼓、失真吉他、密集跑动 |
| lofi/夜曲 | epiano + bass + drums（可加 musicbox） | 双主旋律、多件高频 |
| 电影感/氛围 | pad + piano/strings + timpani 或 tubularbells | 全套管弦乐堆叠 |
| 民谣/旧照片 | steelguitar/guitar + upright/bass + violin/accordion + 轻鼓 | 三件吉他、过载吉他 |
| rock/lofi | eguitar + bass + drums + epiano/pad | 同时用 3 件吉他 |
| 爵士/咖啡馆 | harpsichord/epiano + upright + drums + steelguitar | 低音三件叠一起 |
| 中国风 | guzheng + erhu + dizi + pad | 26 件全上、双二胡主旋律 |
| 室内/电影 | cello/violin + accordion/piano + pad + timpani | 无低音、无留白 |
| 独奏 | piano / epiano / harp / guzheng 一件 | 为了“丰富”硬加轨道 |

下面每份配方都已经是 3–4 件；不要再往里加“听起来也不错”的乐器。

| 乐器 | 适合角色 | 音域 | 注意 |
| --- | --- | --- | --- |
| `piano` | 主旋律、低音、传统钢琴织体 | A0–C8 | 有制音器，踏板有效 |
| `musicbox` | 高频旋律、点缀、助眠/童话 | C3–C8 | 无制音器，踏板无效；音符自然衰减 |
| `epiano` | 和弦、riff、电钢低音、lofi | A1–C8 | 有制音器，踏板有效；力度越大越亮 |
| `pad` | 长音铺底、和弦垫、电影感 | C2–C7 | 慢起音（约 0.38 秒）、长释放（约 1.5 秒），没有自然衰减 |
| `harp` | 琶音、分解和弦、glissando 感 | C1–C7 | 拨弦、自然衰减；踏板无效 |
| `marimba` | 温暖木质旋律、节奏点缀 | C2–C7 | 短衰减；踏板无效 |
| `bass` | 低音根音、riff | E1–C5 | 有制音器，但不吃踏板；松键 0.18 秒止音 |
| `guitar` | 扫弦、分解和弦、民谣 | E2–C6 | 拨弦、自然衰减；和弦要配 `strum=0.02–0.04` |
| `organ` | 持续和弦、gospel、氛围 | C2–C7 | 持续音；松键 0.15 秒释放；不吃踏板 |
| `strings` | 弦乐旋律、电影感铺底 | C2–C7 | 慢起音 0.3 秒、揉弦、长释放 0.9 秒；不吃踏板 |
| `drums` | 节奏骨架、lofi/民谣/摇滚 | 多击打 | 用 BD/SD/CH 等击打别名；不吃踏板/strum/移调 |
| `flute` | 气声领奏、民谣/电影感 | C4–C7 | 持续音、揉弦；不吃踏板 |
| `vibraphone` | 金属马林巴、爵士/lounge | C3–C7 | 电机 tremolo；吃踏板 |
| `eguitar` | 清音/过载、rock/lofi | E2–C6 | 用 `drive=0–1` 调失真；配 `strum` |
| `cello` | 独奏低中音旋律、电影感 | C2–C6 | 弓弦/揉弦；不吃踏板 |
| `accordion` | 民谣/探戈/法式 | C3–C6 | 双簧片/风箱；不吃踏板 |
| `timpani` | 管弦低音打击 | C2–A3 | 有音高 one-shot，约 2.2 秒 |
| `harpsichord` | 巴洛克/室内乐 | C2–C7 | 明亮拨弦，自然衰减 |
| `upright` | 爵士/bluegrass 低音 | E1–C4 | 拨弦/琴体；不吃踏板 |
| `steelguitar` | 民谣/乡村/流行 | E2–C6 | 明亮拨弦，配 `strum` |
| `violin` | 高音独奏、电影感/民谣 | G3–C7 | 弓弦/揉弦；不吃踏板 |
| `choir` | 人声铺底、电影感 | C3–C6 | 风格化 formant 合唱 |
| `tubularbells` | 电影感/悬疑/教堂 | C4–C7 | 非谐金属长衰减 |
| `guzheng` | 中国风、古筝旋律/刮奏 | C2–C7 | 明亮拨弦；刮奏用 `strum` |
| `erhu` | 中国风旋律、滑音 | D3–D6 | 用 `vibrato` + `slide` |
| `dizi` | 中国风高音旋律 | C4–C7 | 气声/笛膜；`vibrato`/`slide` 有效 |

### 助眠/摇篮（musicbox + pad + piano）

```text
track bell instrument=musicbox volume=0.72 pan=0.12 velocity=0.55
E5:2 G5:2 | C5:4 | A4:2 C5:2 | D5:4

track pad instrument=pad volume=0.38 pan=-0.05 velocity=0.40
[C4 E4 G4 B4]:4 | [A3 C4 E4 G4]:4 | [F3 A3 C4 E4]:4 | [G3 C4 D4 G4]:4

track bass instrument=piano volume=0.40 pan=-0.20 velocity=0.40
C2:4 | A1:4 | F2:4 | G1:4
```

- 全局 `volume` 0.55–0.65，`reverb` 0.35–0.45。
- musicbox 只写中高音区；pad 写长和弦；低音交给 piano。
- 踏板每小节换，musicbox 不受影响。

### lofi/夜曲（epiano + musicbox）

```text
track keys instrument=epiano volume=0.62 pan=0.05 velocity=0.58
C3:0.5 E3:0.5 G3:0.5 B3:0.5 G3:0.5 E3:0.5 C3:0.5 E3:0.5 |

track bass instrument=bass volume=0.55 pan=-0.20 velocity=0.50
C2:4 |

track bell instrument=musicbox volume=0.45 pan=0.20 velocity=0.42 start=32
E5:2 G5:2 | A5:2 G5:2 | E5:2 C5:2 | D5:4
```

- 全局 `volume` 0.75–0.85，`reverb` 0.25–0.35。
- EP 的分解和弦用八分音符；力度 0.5–0.65。
- musicbox 只做高频点缀，不要和 EP 抢中频。

### 拨弦三重奏（harp + marimba + bass）

```text
track harp instrument=harp volume=0.62 pan=0.15 velocity=0.52
C3:0.5 G3:0.5 E4:0.5 B4:1.5 E4:0.5 G3:0.5 |
A2:0.5 E3:0.5 C4:0.5 G4:1.5 C4:0.5 E3:0.5 |

track marimba instrument=marimba volume=0.68 pan=-0.08 velocity=0.55
C5:2@0.65 E5:2 | D5:2 C5:2 |

track bass instrument=bass volume=0.55 pan=0.0 velocity=0.55
C2:4 | A1:4 |
```

- 全局 `volume` 0.7–0.8，`reverb` 0.3–0.4。
- harp 用 6 个音一组的滚动琶音，不要每拍都塞满；琶音太密会糊。
- marimba 写中高音区旋律，避免和 harp 的根音抢低频。
- bass 只写根音或五音，保持 E1–C3；它不吃踏板，松键即止音。

### 旧照片（guitar + organ + strings + bass）

```text
track guitar instrument=guitar strum=0.03 volume=0.62 pan=0.12 velocity=0.55
[C3 G3 C4 E4]:2 [C3 G3 C4 E4]:2 |

track organ instrument=organ volume=0.32 pan=-0.15 velocity=0.40
[C4 E4 G4 B4]:4 |

track strings instrument=strings volume=0.65 pan=0.05 velocity=0.55
E5:2@0.65 G5:2 |

track bass instrument=bass volume=0.50 pan=0.0 velocity=0.50
C2:4 |
```

- 全局 `volume` 0.75–0.85，`reverb` 0.25–0.35。
- guitar 每小节 1–2 次扫弦，`strum` 0.02–0.04；不要写太密的扫弦。
- organ 只写长和弦，音量 0.3 左右，不要盖过 strings 旋律。
- strings 写中高音区旋律，长音为主；它自带慢起音和揉弦。
- bass 只写根音/五音，保持 E1–C3。

### lofi 鼓组（drums + epiano + guitar + bass）

```text
track drums instrument=drums volume=0.55 pan=0.0 velocity=0.60
BD:1 CH:1 [SD CP]:1 CH:1 |
BD:1 CH:0.5 CH:0.5 SD:1 CH:0.5 OH:0.5 |

track keys instrument=epiano volume=0.40 pan=-0.05 velocity=0.50
[A2 C3 E3 G3]:2 [A2 C3 E3 G3]:2 |

track guitar instrument=guitar strum=0.03 volume=0.55 pan=0.12 velocity=0.52
[A2 E3 C4 G4]:2 [A2 E3 C4 G4]:2 |

track bass instrument=bass volume=0.50 pan=0.0 velocity=0.52
A1:4 |
```

- 全局 `volume` 0.75–0.85，`reverb` 0.2–0.3。
- 鼓组每小节 4–6 个击打就够；底鼓在 1、3 拍，军鼓在 2、4 拍，闭镲铺八分。
- 用 `[SD CP]` 叠拍手，用 `OH` 做反拍呼吸，用 `[LT MT HT]` 做过门。
- 鼓组不需要踏板；`strum` 和移调对它无效。

### 霓虹公路（drums + eguitar + vibraphone + flute + bass）

```text
track drums instrument=drums volume=0.45 pan=0.0 velocity=0.60
[BD CR]:1 CH:1 [SD CP]:1 CH:1 |

track guitar instrument=eguitar drive=0.55 strum=0.02 volume=0.50 pan=0.15 velocity=0.58
[A2 E3 A3]:2 [A2 E3 A3]:2 |

track vibes instrument=vibraphone volume=0.45 pan=-0.10 velocity=0.45
[A3 C4 E4 G4]:4 |

track flute instrument=flute volume=0.65 pan=0.08 velocity=0.55
A4:2 C5:2 |

track bass instrument=bass volume=0.50 pan=0.0 velocity=0.52
A1:4 |

pedal: 0-4
```

- 全局 `volume` 0.8 左右，`reverb` 0.2–0.3。
- eguitar 用 `drive=0.5–0.7` 的轻过载，`strum=0.02` 扫 power chord。
- vibraphone 用踏板把和弦连起来；flute 写长音领奏，不要和吉他抢中频。
- 鼓组每小节 4–6 个击打；底鼓 1、3 拍，军鼓 2、4 拍，闭镲铺八分。

### 室内民谣（cello + accordion + timpani + pad）

```text
track cello instrument=cello volume=0.52 pan=0.05 velocity=0.55
A3:2 C4:2 | F3:4 | E3:2 G3:2 | D3:4 |

track accordion instrument=accordion volume=0.30 pan=-0.10 velocity=0.42
[A3 C4 E4]:4 | [F3 A3 C4]:4 |

track pad instrument=pad volume=0.24 pan=0.0 velocity=0.35
[A3 C4 E4]:4 | [F3 A3 C4]:4 |

track timpani instrument=timpani volume=0.38 pan=0.0 velocity=0.55
A2:4 R:12 | A2:4 |
```

- 全局 `volume` 0.7–0.75，`reverb` 0.35。
- cello 写低中音旋律，accordion 长和弦，pad 只做薄底，timpani 在句首点一下。
- timpani 用音名（C2–A3），不是鼓组别名。

### 咖啡馆爵士（harpsichord + upright + steelguitar + drums）

```text
track harp instrument=harpsichord volume=0.45 pan=-0.12 velocity=0.55
C3:0.5 E3:0.5 G3:0.5 B3:0.5 G3:0.5 E3:0.5 C3:0.5 E3:0.5 |

track bass instrument=upright volume=0.52 pan=0.0 velocity=0.52
C2:1 E2:1 G2:1 A2:1 |

track guitar instrument=steelguitar strum=0.025 volume=0.42 pan=0.15 velocity=0.48
[C3 G3 C4 E4]:2 [C3 G3 C4 E4]:2 |

track drums instrument=drums volume=0.38 pan=0.0 velocity=0.50
[RD CG]:1 RD:0.5 RD:0.5 [RD BG]:1 RD:0.5 RD:0.5 |
```

- 全局 `volume` 0.75–0.8，`reverb` 0.2–0.25。
- harpsichord 八分分解，upright 四分 walking，steelguitar 半拍扫弦。
- 鼓组用 `RD` + `CG/BG/CL/CB` 做拉丁/咖啡馆律动。

### 电影感穹顶（violin + choir + pad + tubularbells + timpani）

```text
track violin instrument=violin volume=0.50 pan=0.08 velocity=0.55
E5:2 A5:2 | F5:4 |

track choir instrument=choir volume=0.50 pan=-0.05 velocity=0.45
[A3 C4 E4]:4 | [F3 A3 C4]:4 |

track pad instrument=pad volume=0.22 pan=0.0 velocity=0.32
[A3 C4 E4]:4 | [F3 A3 C4]:4 |

track bells instrument=tubularbells volume=0.35 pan=0.2 velocity=0.55
A4:1 R:15 |

track timpani instrument=timpani volume=0.35 pan=0.0 velocity=0.55
A2:4 R:12 |
```

- 全局 `volume` 0.65–0.72，`reverb` 0.35–0.45。
- violin 写高音长旋律；choir 长和弦铺底；pad 只做薄底。
- tubularbells 在句首点一下，让它自己衰减；timpani 在更强的小节点。
- choir 是风格化 formant 合唱，不是真人歌词。

### 中国风江南（guzheng + erhu + dizi + pad）

```text
track erhu instrument=erhu vibrato=0.65 slide=0.12 volume=0.52 pan=0.05 velocity=0.55
A3:2{grace=B3} C4:2 | D4:4{bend=-2,time=0.4} | E4:2 G4:2{bend=+2,time=0.2} | A4:4{trill=+2} |

track zheng instrument=guzheng volume=0.46 pan=-0.12 velocity=0.52
A2:0.5 E3:0.5 A3:0.5 C4:0.5 E4:0.5 A4:0.5 C4:0.5 A3:0.5 |
F2:0.5 C3:0.5 F3:0.5 A3:0.5 C4:0.5 F4:0.5 A3:0.5 C4:0.5 |

track dizi instrument=dizi vibrato=0.4 slide=0.05 volume=0.42 pan=0.15 velocity=0.48 start=16
E5:4{trill=+2} | A5:4{bend=+2,time=0.3} | G5:2 E5:2{grace=F5} | D5:4{bend=-2,time=0.3} |

track gliss instrument=guzheng strum=0.04 volume=0.30 pan=-0.05 velocity=0.45
[A2 E3 A3 C4 E4 A4]:1 R:15 |


track pad instrument=pad volume=0.20 pan=0.0 velocity=0.30
[A2 E3 A3 C4]:4 | [F2 C3 F3 A3]:4 |
```

- 全局 `volume` 0.68–0.72，`reverb` 0.35–0.45。
- erhu 用 `vibrato=0.5–0.8`、`slide=0.08–0.15`；dizi 用 `vibrato=0.3–0.5`、`slide=0.04–0.08`。
- guzheng 分解用八分音符；刮奏用 `strum=0.03–0.05` 的快速和弦。
- v2 可加逐音 `bend` / `grace` / `trill`：二胡长音加 `{trill=+2}`，句首加 `{grace=B3}`，笛子用 `{bend=+2}`。
- pad 只做薄底，不要把二胡/笛子埋掉。

### 电影感/氛围（pad + piano + musicbox）

- pad 两小节一个长和弦，piano 写单音旋律，musicbox 偶尔点一个高音。
- 低音不要和 pad 的最低音打架；pad 只写 C3–C5 的和弦音。
- 结尾让 pad 停在主和弦，piano/musicbox 先收，pad 最后淡出。

### 独奏

- 只用 piano / epiano / harp 一条轨，不要为了“用上乐器”而堆轨道。
- 如果一首曲子有 3 条以上轨，每条轨必须有明确角色；否则删掉。

## 3. 常用和声进行

直接按下面的绝对和弦写，括号内是可用旋律音。

> 下面的 `♭` / `♯` 是乐理记法；真正写进 `.piano` 时用 ASCII：`B♭` → `Bb`，`G♯` → `G#`。

### 放松/助眠（大调色彩）

```text
Cmaj7 – Am7 – Fmaj7 – Gsus4
（C E G B / A C E G / F A C E / G C D）
```

```text
Fmaj7 – C/E – Dm7 – B♭maj7
（F A C E / C E G / D F A C / B♭ D F A）
```

```text
C – G/B – Am7 – Fmaj7
（C E G / B D G / A C E G / F A C E）
```

### 夜曲/抒情（小调）

```text
Am – F – C – G
（A C E / F A C / C E G / G B D）
```

```text
Am – F – C – E
（A C E / F A C / C E G / E G# B）
```

```text
Dm7 – Am7 – B♭maj7 – Fmaj7
（D F A C / A C E G / B♭ D F A / F A C E）
```

### 明亮/学习

```text
C – G – Am – F
C – G – F – C
G – D – Em – C
```

### 终止式

- 大调收尾：`F – G – C` 或 `Dm7 – G – Cmaj7`。
- 小调收尾：`F – E – Am` 或 `Dm7 – E – Am`。
- 助眠可以用 `Fmaj7 – Gsus4 – Cmaj7`，最后停在 Cmaj7 的长音。

## 4. 曲式

### 16 小节（最常用）

```text
4 小节引子（可省） + 8 小节 A + 4 小节 A' / 尾声
```

### 24 小节

```text
4 引子 + 8 A + 8 B + 4 尾声
```

### 32 小节（约 2 分钟）

```text
4 引子 + 8 A + 8 B + 8 A' + 4 尾声
```

- **A**：主题，旋律清楚，和声简单。
- **B**：对比；换和弦（如关系小调/下属方向），音区略高或节奏略密。
- **A'**：主题回来，做一点变奏（加高八度、改尾音、换伴奏型）。
- **尾声**：2–4 小节，放慢/稀疏，落在主和弦。

## 5. 旋律写法

1. **强拍落在和弦音**：1、3、5 音优先；2、4、6、7 音作经过/色彩。
2. **动机要短**：2–4 个音一组，然后重复/模进/改尾音。
3. **以级进为主**：相邻音居多，偶尔跳进；不要连续大跳。
4. **留白**：每 2–4 拍一个长音，或每小节留 1 拍休止；助眠尤其要空。
5. **一个高潮**：全曲最高音只出现 1–2 次，放在 B 段或 A' 开头。
6. **尾音**：落在主和弦的 1/3/5 音；小调结尾常用主音或三音。
7. **不要照搬现成歌曲**：用上面的和声进行 + 自己写的节奏动机。

## 6. 伴奏与低音

### 分解和弦

- 助眠：每小节 4 个音（四分音符），如 `C3 G3 E4 B4`。
- 夜曲：每小节 8 个音（八分音符），如 `A3 C4 E4 A4 E4 C4 A3 C4`。
- 学习/明亮：每小节 8 个音或柱式和弦，节奏可以更主动。

### 低音

- 每小节一个根音（全音符）最稳；需要推动时用“根音 + 五音”两个音。
- 低音区建议 C2–B2；不要连续低于 F1，容易糊。
- 低音音量 0.3–0.5，不要盖过旋律。

### 圆舞曲（3/4）

```text
低音（第 1 拍） + 和弦（第 2–3 拍）
C3:1 [E4 G4]:2
```

## 7. 踏板

- 默认每小节换一次：`pedal: 0-4`、`4-8`……
- 和声变化时必须在变化点换踏板；否则两个和弦会混在一起。
- 助眠可以让踏板稍微“糊”一点，但每小节仍要换。
- 不要在快速音阶/密集和弦上一直踩；会变成音墙。
- 结尾最后一个踏板可以留到全曲结束，再抬。

## 8. 力度、音量、混响

- `velocity`（全局/轨道）控制演奏力度；`@` 控制单个音。
- `volume`（全局）控制最终输出峰值：助眠 0.55–0.7，普通 0.8–0.9。
- 轨道 `volume` 控制配比：旋律 0.8–0.95，伴奏 0.4–0.65，低音 0.3–0.5。
- `reverb`：助眠 0.35–0.45，夜曲 0.28–0.35，明亮 0.2–0.3。
- 重音只放在乐句开头；不要每个音都 1.0。

## 9. 写谱前的 8 行蓝图

先写下来，再动笔：

```text
标题：
情绪/用途：
调性：
BPM：
拍号/小节数：
曲式：Intro __ + A __ + B __ + A' __ + Coda __
和声：A: ____  B: ____  Coda: ____
织体：旋律音区 ____ / 伴奏型 ____ / 低音 ____ / 踏板 ____
```

## 10. 自检清单

- [ ] 每条 track 的每小节拍数加起来等于拍号。
- [ ] 旋律强拍以和弦音为主，最高音只出现 1–2 次。
- [ ] B 段和 A 段有对比（和弦、音区、密度至少变一个）。
- [ ] 踏板在每小节/和声变化处换。
- [ ] 所有音在 A0–C8；移调后也检查。
- [ ] `volume` / `reverb` 符合情绪；助眠不要过响。
- [ ] 结尾落在主和弦，最后一个音有足够时值。
- [ ] 先 `check`，再 `render`，最后才 `play`。

## 11. 两个完整配方

### 11.1 助眠《云眠》式

```text
BPM 56，4/4，32 小节，C 大调，volume 0.62，reverb 0.38
A: Cmaj7 – Am7 – Fmaj7 – Gsus4
B: Dm7 – Am7 – B♭maj7 – Fmaj7
Coda: Fmaj7 – Gsus4 – Cmaj7 – Cmaj7
伴奏：每小节 4 个分解音（C3 G3 E4 B4）
低音：每小节一个根音
旋律：每小节 1–2 个长音，音域 E4–G5，力度 0.6
踏板：每小节换
```

### 11.2 夜曲《夜航》式

```text
BPM 80，4/4，28 小节，A 小调，volume 1.0，reverb 0.30
A: Am – F – C – G
B: Dm – Am – F – E（E 大调用 G# 抬升）
Coda: F – G – Am – Am
伴奏：八分音符分解和弦
低音：全音符根音
旋律：2–4 拍长音，B 段推到 A5/G#5，只出现一次
踏板：每小节换
```

## 12. 交付话术

向用户报告时，至少包含：

- 曲名、调性、BPM、长度、曲式。
- 使用的和声进行/织体。
- 试听结果（`played` / WAV 路径）。
- 文件路径与重听命令。
- 如果用户没听到，给出 `render` + `afplay` 的手动命令。

不要把整份谱面贴进回复；给文件链接和开头几小节即可。
