# vibe-music

[简体中文](README.md) | English

Repository: [ipqnkhkssnh/vibe-music](https://github.com/ipqnkhkssnh/vibe-music)

An agent skill and zero-dependency CLI for multi-instrument music. Write a text score, pick **2–4** instruments that fit the scene, then validate, render to WAV, and play.

> `.piano` is just the conventional score extension, not "piano only". You can name a score `.vibe`; the format is unchanged.

## Why vibe-music

- **Small, intentional arrangements**: 26 timbres are a palette, not a checklist. A track usually needs 2–4 instruments, at most 5.
- **Every instrument has a role**: lead, harmonic bed, low end, or rhythm/accent. If a track has no role, remove it.
- **Agent-friendly**: text DSL or JSON, a stable `--json` contract, and `check` without rendering.
- **Self-contained**: the CLI lives in `cli/` inside the skill, with zero runtime dependencies.
- **Cross-platform**: `vibe.sh` on macOS/Linux, `vibe.ps1` or `vibe.cmd` on Windows.

## Features

- 26 offline synthesized instruments: piano, electric piano, organ, strings, guitars, bass, drums, orchestral colors, Chinese instruments, and more
- 16 drum hits, including Latin percussion
- Per-note articulation: `bend`, `grace`, `trill`; track-level `vibrato` and `slide`
- `strum` for guitar-family instruments; `drive` for electric guitar
- 16-bit / 44.1 kHz stereo WAV, Freeverb reverb, peak normalization
- Node.js ≥ 18, **zero runtime dependencies**

## Quick start

### Requirements

- Node.js ≥ 18
- A system player for `play`: `afplay` on macOS, usually `ffplay` on Linux, PowerShell `SoundPlayer` on Windows
- `render` still works when no player is available

### Run

```bash
git clone https://github.com/ipqnkhkssnh/vibe-music.git vibe-music
# or via SSH
# git clone git@github.com:ipqnkhkssnh/vibe-music.git vibe-music
cd vibe-music

# Version and instruments
./scripts/vibe.sh version
./scripts/vibe.sh instruments

# Play a built-in demo
./scripts/vibe.sh demo jiangnan

# Check / render / play
./scripts/vibe.sh check song.piano --json
./scripts/vibe.sh render song.piano --out /tmp/song.wav --json
./scripts/vibe.sh play song.piano --out song.wav --json
```

Or call the CLI directly:

```bash
node cli/bin/vibe.js demo dome
node cli/bin/vibe.js check song.piano --json
```

To put the command on your PATH:

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

## Install into DSH

macOS / Linux:

```bash
mkdir -p "$HOME/.agents/skills"
ln -sfn "$PWD" "$HOME/.agents/skills/vibe-music"
# or copy:
# cp -R "$PWD" "$HOME/.agents/skills/vibe-music"
```

Windows PowerShell:

```powershell
$target = Join-Path $HOME ".agents\skills\vibe-music"
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
Copy-Item -Recurse -Force ".\*" $target
```

DSH will then discover `vibe-music` and match prompts such as "write a song", "arrange this", "Chinese style", or "lofi".

## Write a song

```text
title: Jiangnan
tempo: 66
meter: 4/4
reverb: 0.40
volume: 0.70

# Lead: erhu with grace, bend, and trill
track erhu instrument=erhu vibrato=0.65 slide=0.12 volume=0.52
A3:2{grace=B3} C4:2 | D4:4{bend=-2,time=0.4} |
E4:2 G4:2{bend=+2,time=0.2} | A4:4{trill=+2} |

# Texture: guzheng arpeggio
track zheng instrument=guzheng volume=0.46
A2:0.5 E3:0.5 A3:0.5 C4:0.5 E4:0.5 A4:0.5 C4:0.5 A3:0.5 |

# Accent: dizi enters at beat 5
track dizi instrument=dizi vibrato=0.4 slide=0.05 volume=0.42 start=4
E5:4 | A5:4 |
```

### Arrangement rules

- Default to **2–4 instruments**, at most 5. The fifth can only be rhythm/accent.
- Keep one lead, one low end, and one harmonic bed.
- If removing an instrument makes no audible difference, remove it.
- Never give two instruments the same lead line, or stack three instruments in the same register.

| Scene | Suggested palette | Avoid |
| --- | --- | --- |
| Sleep / lullaby | musicbox or piano + pad + low end | drums, distorted guitar, busy lines |
| Lofi / nocturne | epiano + bass + drums (optional musicbox) | two leads, many high-frequency layers |
| Cinematic / ambient | pad + piano/strings + timpani or tubularbells | stacking the whole orchestra |
| Folk / old photo | steelguitar/guitar + upright/bass + violin/accordion + light drums | three guitars, distorted guitar |
| Rock / lofi | eguitar + bass + drums + epiano/pad | three guitars at once |
| Jazz / cafe | harpsichord/epiano + upright + drums + steelguitar | three low-end instruments |
| Chinese style | guzheng + erhu + dizi + pad | all 26 instruments, two erhu leads |

## The 26 instruments

- **Keys**: piano, epiano, organ, pad, harpsichord
- **Plucked**: harp, guitar, steelguitar, eguitar, bass, upright, guzheng
- **Bowed / wind / voice**: strings, cello, violin, erhu, flute, dizi, choir
- **Mallets / percussion**: musicbox, marimba, vibraphone, tubularbells, timpani, drums
- **Reed**: accordion

`drums` has 16 hit aliases: BD/SD/CH/OH/CP/LT/MT/HT/RD/CR/SH/TB/CG/BG/CL/CB.

See [cli/README.md](cli/README.md) for ranges and aliases, or run:

```bash
./scripts/vibe.sh instruments --json
```

## Commands

```bash
# Validate only (fastest)
./scripts/vibe.sh check song.piano --json

# Render WAV
./scripts/vibe.sh render song.piano --out song.wav --json

# Render and play (blocks until playback ends)
./scripts/vibe.sh play song.piano --out song.wav --json

# Built-in demos
./scripts/vibe.sh demo --list
./scripts/vibe.sh demo dome
./scripts/vibe.sh demo cafe

# Pitch table / instruments
./scripts/vibe.sh notes --json
./scripts/vibe.sh instruments --json
```

## Layout

```text
vibe-music/
├── README.md                 # Chinese
├── README.en.md              # English (this file)
├── SKILL.md                  # Agent workflow, palette, scoring rules
├── cli/                      # Self-contained CLI
│   ├── bin/vibe.js           # Entry point (vibe / vibe-music)
│   ├── src/                  # Parser, compiler, synth, reverb, WAV, player
│   ├── examples/             # Built-in demos
│   ├── test/                 # node:test suite
│   ├── README.md             # Full CLI docs
│   └── AGENTS.md             # Agent quick reference
├── references/
│   ├── dsl.md                # Score syntax / JSON / output contract
│   └── composition.md        # Mood recipes / harmony / form / palette
├── templates/                # Runnable 2–5 instrument templates
└── scripts/
    ├── vibe.sh               # macOS / Linux
    ├── vibe.ps1              # Windows PowerShell
    └── vibe.cmd              # Windows CMD
```

## Development

```bash
cd cli
npm test
```

37 tests currently pass, covering parsing, compilation, all 26 instruments, drums, articulation, WAV output, and the CLI contract.

## Docs

- [SKILL.md](SKILL.md): agent workflow and arrangement rules
- [cli/README.md](cli/README.md): full CLI reference
- [references/dsl.md](references/dsl.md): score syntax
- [references/composition.md](references/composition.md): composition and arrangement
- [templates/](templates/): copyable templates
- [Issues](https://github.com/ipqnkhkssnh/vibe-music/issues): questions and suggestions

## Notes

- Instruments are offline **physical-modeling/synthesis**, not samples. Use a sample library when you need recording-level realism.
- This project does not generate MIDI; output is WAV.
- Drums are unpitched; `timpani` is pitched and uses note names.
- `choir` is a stylized formant choir, not real lyrics.

## License

MIT © 2026 [ipqnkhkssnh](https://github.com/ipqnkhkssnh)

See [LICENSE](LICENSE).
