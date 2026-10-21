/**
 * cli.js — 命令行入口 / 参数解析 / 输出契约。
 *
 * stdout 只放“结果”：人类摘要或 --json 的单个 JSON 对象；
 * 进度、播放提示等辅助信息走 stderr。
 */

import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { parseSong, SongError } from './parser.js';
import { compileSong } from './compile.js';
import { renderSong } from './synth.js';
import { encodeWav, formatBytes } from './wav.js';
import { playAudio } from './player.js';
import { loadDemo, listDemos } from './demo.js';
import { allMidiNotes } from './music.js';
import { listInstruments, getInstrumentDef } from './instruments/names.js';

const COMMANDS = new Set(['play', 'render', 'check', 'demo', 'notes', 'instruments', 'help', 'version']);
const VERSION = readVersion();

class CliError extends Error {
  constructor(message, code = 'USAGE') {
    super(message);
    this.name = 'CliError';
    this.code = code;
  }
}

function readVersion() {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url);
    return JSON.parse(readFileSync(pkgUrl, 'utf8')).version || '1.0.0';
  } catch (err) {
    return '1.0.0';
  }
}

function helpText() {
  return `Vibe Music CLI — 让 Agent 用脚本编曲并播放

用法:
  vibe play <song> [options]      渲染并播放（默认命令）
  vibe render <song> [options]    只渲染 WAV，不播放
  vibe check <song> [--json]      只校验曲谱，不渲染
  vibe demo [name] [options]      播放内置示例（twinkle/nocturne/chords/agent/voyage/sleep/stardust/epiano/mist/photo/rain/neon/distant/cafe/dome/jiangnan/json）
  vibe demo --list                列出示例
  vibe notes [--json]             列出 A0–C8 音高表
  vibe instruments [--json]       列出可用乐器、音域与别名
  vibe help | vibe version

song:
  .piano 文本谱或 .json 结构化谱；"-" 表示从 stdin 读取。

文本谱示例:
  title: 小星星
  tempo: 96
  track melody
  C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2
  track bass instrument=piano
  C3:2 G3:2 | F3:2 C3:2
  pedal: 0-4

音符:
  C4:1        1 拍；C4:1.5、C4:3/2、C4:1. 都支持
  C4:1@0.9    力度 0–1（也接受 1–127）
  [C4 E4 G4]:2  和弦
  R:1         休止
  track 名 instrument=piano volume=0.8 pan=0 velocity=0.8 start=0
  乐器：piano / musicbox / epiano / pad / harp / marimba / bass / guitar / organ / strings / drums / flute / vibraphone / eguitar / cello / accordion / timpani / harpsichord / upright / steelguitar / violin / choir / tubularbells / guzheng / erhu / dizi（vibe instruments 查看详情）
  配器：通常 2–4 件，最多 5 件；先定角色，不要把所有音色都堆进去。

选项:
  -o, --out <file>       输出 WAV 路径；"-" 表示写 stdout
      --no-play          只渲染不播放
      --json             输出单个 JSON 对象（适合 Agent）
      --keep             播放后保留临时 WAV
      --tempo <bpm>      覆盖速度
      --transpose <n>    移调半音（-24–24）
      --volume <0-1>     覆盖曲谱总音量
      --reverb <0-1>     混响量
      --sample-rate <hz> 22050–96000（默认 44100）
      --player <cmd>     指定播放器（如 afplay）
      --quiet            减少人类可读输出
  -h, --help
  -v, --version

示例:
  vibe play examples/twinkle.piano
  vibe play examples/nocturne.piano --out build/nocturne.wav --json
  vibe check examples/agent-song.json --json
  cat song.piano | vibe play - --no-play -o build/song.wav
`;
}

function parseArgs(argv) {
  const options = {
    json: false,
    noPlay: false,
    keep: false,
    quiet: false,
    list: false,
    help: false,
    version: false,
    out: null,
    tempo: null,
    transpose: null,
    volume: null,
    reverb: null,
    sampleRate: null,
    player: null
  };
  const positionals = [];
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (arg === '-' || !arg.startsWith('-')) {
      positionals.push(arg);
      i++;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      options.help = true;
      i++;
      continue;
    }
    if (arg === '-v' || arg === '--version') {
      options.version = true;
      i++;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      i++;
      continue;
    }
    if (arg === '--no-play') {
      options.noPlay = true;
      i++;
      continue;
    }
    if (arg === '--keep') {
      options.keep = true;
      i++;
      continue;
    }
    if (arg === '--quiet') {
      options.quiet = true;
      i++;
      continue;
    }
    if (arg === '--list') {
      options.list = true;
      i++;
      continue;
    }

    let key = arg;
    let inlineValue = null;
    const equals = arg.indexOf('=');
    if (equals !== -1) {
      key = arg.slice(0, equals);
      inlineValue = arg.slice(equals + 1);
    }
    const valueOptions = new Set([
      '-o', '--out', '--tempo', '--transpose', '--volume', '--reverb', '--sample-rate', '--player'
    ]);
    if (valueOptions.has(key)) {
      let value = inlineValue;
      if (value == null) {
        i++;
        if (i >= argv.length) throw new CliError(`选项 ${key} 缺少值`);
        value = argv[i];
      }
      if (key === '-o' || key === '--out') options.out = value;
      else if (key === '--tempo') options.tempo = Number(value);
      else if (key === '--transpose') options.transpose = Number(value);
      else if (key === '--volume') options.volume = Number(value);
      else if (key === '--reverb') options.reverb = Number(value);
      else if (key === '--sample-rate') options.sampleRate = Number(value);
      else if (key === '--player') options.player = value;
      i++;
      continue;
    }
    throw new CliError(`未知选项 "${arg}"`);
  }
  return { options, positionals };
}

function validateOptions(options) {
  if (options.tempo != null && (!Number.isFinite(options.tempo) || options.tempo < 20 || options.tempo > 300)) {
    throw new CliError('--tempo 必须在 20–300 之间');
  }
  if (options.transpose != null && (!Number.isInteger(options.transpose) || options.transpose < -24 || options.transpose > 24)) {
    throw new CliError('--transpose 必须是 -24–24 的整数');
  }
  if (options.volume != null && (!Number.isFinite(options.volume) || options.volume < 0 || options.volume > 1)) {
    throw new CliError('--volume 必须在 0–1 之间');
  }
  if (options.reverb != null && (!Number.isFinite(options.reverb) || options.reverb < 0 || options.reverb > 1)) {
    throw new CliError('--reverb 必须在 0–1 之间');
  }
  if (options.sampleRate != null && (!Number.isFinite(options.sampleRate) || options.sampleRate < 22050 || options.sampleRate > 96000)) {
    throw new CliError('--sample-rate 必须在 22050–96000 之间');
  }
}

function slugify(title) {
  const base = String(title || 'song')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'song';
}

function readSongInput(songPath) {
  if (songPath === '-') {
    return { text: readFileSync(0, 'utf8'), sourceName: 'stdin', path: null };
  }
  const absolute = resolve(songPath);
  if (!existsSync(absolute)) throw new CliError(`找不到歌曲文件：${songPath}`, 'IO');
  let text;
  try {
    text = readFileSync(absolute, 'utf8');
  } catch (err) {
    throw new CliError(`读取歌曲失败：${err.message}`, 'IO');
  }
  const extension = extname(absolute);
  const sourceName = basename(absolute, extension) || 'song';
  return { text, sourceName, path: absolute };
}

function resolveOutputPath(outOption, title, fallbackDirectory, unique) {
  if (outOption === '-') return { stdout: true, path: null };
  let target = outOption;
  if (!target) {
    const suffix = unique ? `-${process.pid}-${Date.now().toString(36)}` : '';
    target = join(fallbackDirectory, `${slugify(title)}${suffix}.wav`);
  } else {
    target = resolve(target);
    let isDirectory = false;
    try {
      isDirectory = existsSync(target) && statSync(target).isDirectory();
    } catch (err) {
      isDirectory = false;
    }
    if (isDirectory || target.endsWith('/') || target.endsWith('\\')) {
      target = join(target, `${slugify(title)}.wav`);
    } else if (extname(target).toLowerCase() !== '.wav') {
      target += '.wav';
    }
  }
  mkdirSync(dirname(target), { recursive: true });
  return { stdout: false, path: target };
}

function humanDuration(seconds) {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds - minutes * 60;
    return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
  }
  return `${seconds.toFixed(1)} 秒`;
}

function printJson(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

function printHumanSummary(compiled, output, renderMs) {
  process.stdout.write(`♪ ${compiled.title}\n`);
  process.stdout.write(
    `  ${compiled.tempo} BPM · ${compiled.beats} 拍 · ${compiled.notes.length} 个音 · ${humanDuration(compiled.durationSec)}\n`
  );
  const instrumentLabels = (compiled.instruments || []).map((name) => {
    const def = getInstrumentDef(name);
    return def ? def.label : name;
  });
  if (instrumentLabels.length) {
    process.stdout.write(`  乐器  ${instrumentLabels.join(' · ')}\n`);
  }
  if (output.stdout) {
    process.stdout.write('  WAV 已写入 stdout\n');
  } else {
    process.stdout.write(`  ${output.temporary ? '临时 WAV' : 'WAV'}  ${output.path}  (${formatBytes(output.bytes)})\n`);
  }
  process.stdout.write(`  渲染耗时 ${(renderMs / 1000).toFixed(2)} 秒\n`);
}

function printWarnings(warnings) {
  for (const warning of warnings || []) {
    process.stderr.write(`提示：${warning}\n`);
  }
}

async function runSongCommand(command, songPath, options) {
  if (!songPath) throw new CliError(`缺少歌曲文件。用法：vibe ${command} <song>`);
  if (options.json && options.out === '-') {
    throw new CliError('--json 不能与 --out - 同时使用（stdout 只能放一种内容）');
  }

  const input = readSongInput(songPath);
  const song = parseSong(input.text, { sourceName: input.sourceName });
  const compiled = compileSong(song, {
    tempo: options.tempo,
    transpose: options.transpose,
    reverb: options.reverb
  });

  if (command === 'check') {
    if (options.json) {
      printJson({
        ok: true,
        command: 'check',
        title: compiled.title,
        tempo: compiled.tempo,
        meter: compiled.meter,
        beats: compiled.beats,
        duration: Number(compiled.durationSec.toFixed(3)),
        notes: compiled.notes.length,
        volume: compiled.volume,
        instruments: compiled.instruments,
        tracks: compiled.tracks,
        warnings: compiled.warnings
      });
    } else if (!options.quiet) {
      process.stdout.write(`✓ ${compiled.title}\n`);
      process.stdout.write(
        `  ${compiled.tempo} BPM · ${compiled.beats} 拍 · ${compiled.notes.length} 个音 · ${humanDuration(compiled.durationSec)}\n`
      );
      if (compiled.instruments && compiled.instruments.length) {
        const labels = compiled.instruments.map((name) => {
          const def = getInstrumentDef(name);
          return def ? def.label : name;
        });
        process.stdout.write(`  乐器  ${labels.join(' · ')}\n`);
      }
      printWarnings(compiled.warnings);
    }
    return 0;
  }

  const isPlay = command === 'play';
  const wantsPlay = isPlay && !options.noPlay && options.out !== '-';
  const showProgress = !options.json && !options.quiet && process.stderr.isTTY;
  let lastPercent = -1;
  const renderStart = Date.now();
  const audio = renderSong(compiled, {
    sampleRate: options.sampleRate || 44100,
    volume: options.volume,
    onProgress: (done, total) => {
      if (!showProgress) return;
      const percent = Math.floor((done / total) * 100);
      if (percent >= lastPercent + 10 || done === total) {
        lastPercent = percent;
        process.stderr.write(`\r渲染 ${percent}%`);
      }
    }
  });
  if (showProgress) process.stderr.write('\r\x1b[K');
  const renderMs = Date.now() - renderStart;

  const defaultDir = isPlay && wantsPlay ? tmpdir() : process.cwd();
  const output = resolveOutputPath(options.out, compiled.title, defaultDir, wantsPlay && !options.out);
  const wavBuffer = encodeWav(audio.left, audio.right, audio.sampleRate);

  if (output.stdout) {
    if (showProgress || (!options.quiet && !options.json)) {
      process.stderr.write(`♪ ${compiled.title} · ${humanDuration(compiled.durationSec)} · ${formatBytes(wavBuffer.length)}\n`);
    }
    await new Promise((resolveWrite) => {
      process.stdout.write(wavBuffer, resolveWrite);
    });
    return 0;
  }

  try {
    writeFileSync(output.path, wavBuffer);
  } catch (err) {
    throw new CliError(`写入 WAV 失败：${err.message}`, 'IO');
  }
  output.bytes = wavBuffer.length;

  let playback = { played: false, player: null };
  const tempPath = !options.out && isPlay && wantsPlay && !options.keep ? output.path : null;
  output.temporary = Boolean(tempPath);

  if (!options.json && !options.quiet) {
    printHumanSummary(compiled, output, renderMs);
    printWarnings(compiled.warnings);
  }

  if (wantsPlay) {
    if (!options.json && !options.quiet) {
      process.stderr.write(`播放中…\n`);
    }
    playback = await playAudio(output.path, { player: options.player });
    if (!playback.played && !options.json && !options.quiet) {
      process.stderr.write(`⚠ 播放失败：${playback.error}\n`);
    }
  }

  const shouldDeleteTemp = tempPath && !options.keep && playback.played;
  if (shouldDeleteTemp) {
    try {
      unlinkSync(tempPath);
    } catch (err) {
      // 忽略清理失败
    }
  }

  const keptPath = shouldDeleteTemp ? null : output.path;
  if (options.json) {
    printJson({
      ok: true,
      command: isPlay ? 'play' : 'render',
      title: compiled.title,
      tempo: compiled.tempo,
      meter: compiled.meter,
      beats: compiled.beats,
      duration: Number(compiled.durationSec.toFixed(3)),
      notes: compiled.notes.length,
      instruments: compiled.instruments,
      tracks: compiled.tracks,
      sampleRate: audio.sampleRate,
      peak: Number(audio.peak.toFixed(3)),
      volume: compiled.volume,
      wav: keptPath,
      wavKept: Boolean(keptPath),
      bytes: wavBuffer.length,
      played: playback.played,
      player: playback.player,
      playError: playback.error || null,
      warnings: compiled.warnings,
      renderMs
    });
  } else if (!options.quiet) {
    if (playback.played) {
      process.stdout.write(`  播放完成（${playback.player}）\n`);
      if (output.temporary) process.stdout.write('  临时 WAV 已清理（--keep 可保留）\n');
    } else if (wantsPlay) {
      process.stdout.write(`  未播放：${playback.error}\n`);
      if (!keptPath) process.stdout.write('  WAV 已作为临时文件清理；可用 --keep 或 --out 保留。\n');
      else if (tempPath) process.stdout.write(`  WAV 已保留：${output.path}\n`);
    } else {
      process.stdout.write(`  仅渲染，未播放${command === 'render' ? '（render 命令）' : '（--no-play）'}\n`);
    }
  }

  return 0;
}

function printNotes(options) {
  const notes = allMidiNotes();
  if (options.json) {
    printJson({ ok: true, command: 'notes', range: { min: 'A0', max: 'C8' }, notes });
    return 0;
  }
  process.stdout.write('88 键音高表（A0–C8）\n');
  for (const note of notes) {
    process.stdout.write(`${note.name.padEnd(4)} MIDI ${String(note.midi).padStart(3)}  ${note.freq.toFixed(2).padStart(7)} Hz\n`);
  }
  return 0;
}

function printInstruments(options) {
  const instruments = listInstruments();
  if (options.json) {
    printJson({ ok: true, command: 'instruments', instruments });
    return 0;
  }
  process.stdout.write('可用乐器\n');
  for (const instrument of instruments) {
    const range = instrument.isDrum ? '多击打' : `${instrument.range.min}–${instrument.range.max}`;
    process.stdout.write(
      `  ${instrument.name.padEnd(10)} ${instrument.label.padEnd(5)} ${range.padEnd(9)} ${instrument.description}\n`
    );
    if (instrument.isDrum && instrument.hits) {
      process.stdout.write(
        `  ${''.padEnd(10)} 击打：${instrument.hits.map((hit) => `${hit.alias}=${hit.label}`).join(' / ')}\n`
      );
    }
    if (instrument.aliases.length) {
      process.stdout.write(`  ${''.padEnd(10)} 别名：${instrument.aliases.join(' / ')}\n`);
    }
  }
  process.stdout.write('用法：track 名 instrument=musicbox\n');
  return 0;
}

function printDemos(options) {
  const demos = listDemos();
  if (options.json) {
    printJson({ ok: true, command: 'demo', demos });
    return 0;
  }
  process.stdout.write('内置示例：\n');
  for (const demo of demos) {
    process.stdout.write(`  ${demo.name.padEnd(9)} ${demo.title}\n`);
  }
  return 0;
}

async function runDemo(options, name) {
  if (options.list) return printDemos(options);
  if (options.json && options.out === '-') {
    throw new CliError('--json 不能与 --out - 同时使用（stdout 只能放一种内容）');
  }
  let demo;
  try {
    demo = loadDemo(name);
  } catch (err) {
    throw new CliError(err.message, 'DEMO');
  }
  const song = parseSong(demo.text, { sourceName: demo.title });
  const compiled = compileSong(song, {
    tempo: options.tempo,
    transpose: options.transpose,
    reverb: options.reverb
  });

  const isPlay = !options.noPlay && options.out !== '-';
  const showProgress = !options.json && !options.quiet && process.stderr.isTTY;
  let lastPercent = -1;
  const renderStart = Date.now();
  const audio = renderSong(compiled, {
    sampleRate: options.sampleRate || 44100,
    volume: options.volume,
    onProgress: (done, total) => {
      if (!showProgress) return;
      const percent = Math.floor((done / total) * 100);
      if (percent >= lastPercent + 10 || done === total) {
        lastPercent = percent;
        process.stderr.write(`\r渲染 ${percent}%`);
      }
    }
  });
  if (showProgress) process.stderr.write('\r\x1b[K');
  const renderMs = Date.now() - renderStart;

  const defaultDir = isPlay ? tmpdir() : process.cwd();
  const output = resolveOutputPath(options.out, compiled.title, defaultDir, isPlay && !options.out);
  const wavBuffer = encodeWav(audio.left, audio.right, audio.sampleRate);

  if (output.stdout) {
    if (!options.json && !options.quiet) {
      process.stderr.write(`♪ ${compiled.title} · ${humanDuration(compiled.durationSec)} · ${formatBytes(wavBuffer.length)}\n`);
    }
    await new Promise((resolveWrite) => process.stdout.write(wavBuffer, resolveWrite));
    return 0;
  }

  writeFileSync(output.path, wavBuffer);
  output.bytes = wavBuffer.length;

  let playback = { played: false, player: null };
  const tempPath = !options.out && isPlay && !options.keep ? output.path : null;
  output.temporary = Boolean(tempPath);

  if (!options.json && !options.quiet) {
    printHumanSummary(compiled, output, renderMs);
    printWarnings(compiled.warnings);
  }
  if (isPlay) {
    if (!options.json && !options.quiet) process.stderr.write('播放中…\n');
    playback = await playAudio(output.path, { player: options.player });
    if (!playback.played && !options.json && !options.quiet) {
      process.stderr.write(`⚠ 播放失败：${playback.error}\n`);
    }
  }
  const shouldDeleteTemp = tempPath && !options.keep && playback.played;
  if (shouldDeleteTemp) {
    try { unlinkSync(tempPath); } catch (err) { /* ignore */ }
  }

  const keptPath = shouldDeleteTemp ? null : output.path;
  if (options.json) {
    printJson({
      ok: true,
      command: 'demo',
      demo: demo.name,
      title: compiled.title,
      tempo: compiled.tempo,
      beats: compiled.beats,
      duration: Number(compiled.durationSec.toFixed(3)),
      notes: compiled.notes.length,
      instruments: compiled.instruments,
      sampleRate: audio.sampleRate,
      peak: Number(audio.peak.toFixed(3)),
      volume: compiled.volume,
      wav: keptPath,
      wavKept: Boolean(keptPath),
      bytes: wavBuffer.length,
      played: playback.played,
      player: playback.player,
      playError: playback.error || null,
      warnings: compiled.warnings,
      renderMs
    });
  } else if (!options.quiet) {
    if (playback.played) {
      process.stdout.write(`  播放完成（${playback.player}）\n`);
      if (output.temporary) process.stdout.write('  临时 WAV 已清理（--keep 可保留）\n');
    } else if (!isPlay) {
      process.stdout.write('  仅渲染，未播放（--no-play）\n');
    } else {
      process.stdout.write(`  未播放：${playback.error}\n`);
      if (tempPath) process.stdout.write(`  WAV 已保留：${output.path}\n`);
    }
  }
  return 0;
}

function errorPayload(err) {
  if (err instanceof SongError) {
    return {
      ok: false,
      error: {
        message: err.message,
        code: err.code,
        line: err.line,
        column: err.column
      }
    };
  }
  if (err instanceof CliError) {
    return { ok: false, error: { message: err.message, code: err.code, line: null, column: null } };
  }
  return {
    ok: false,
    error: { message: err && err.message ? err.message : String(err), code: 'RUNTIME', line: null, column: null }
  };
}

function printError(err, options) {
  const payload = errorPayload(err);
  if (options.json) {
    printJson(payload);
    return;
  }
  const info = payload.error;
  let prefix = '错误';
  if (info.line != null) prefix += `（第 ${info.line} 行${info.column != null ? `，第 ${info.column} 列` : ''}）`;
  process.stderr.write(`${prefix}：${info.message}\n`);
  if (info.code === 'USAGE') process.stderr.write('使用 vibe help 查看用法。\n');
}

export async function main(argv) {
  let options = { json: false, quiet: false };
  if (!argv.length) {
    process.stdout.write(helpText());
    return 0;
  }
  try {
    const parsed = parseArgs(argv);
    options = parsed.options;

    if (options.help) {
      process.stdout.write(helpText());
      return 0;
    }
    if (options.version) {
      process.stdout.write(`vibe ${VERSION}\n`);
      return 0;
    }
    if (options.list && !parsed.positionals.length) {
      return printDemos(options);
    }

    const positionals = parsed.positionals;
    let command = 'play';
    if (positionals.length && COMMANDS.has(positionals[0])) {
      command = positionals.shift();
    }
    validateOptions(options);

    if (command === 'help') {
      process.stdout.write(helpText());
      return 0;
    }
    if (command === 'version') {
      process.stdout.write(`vibe ${VERSION}\n`);
      return 0;
    }
    if (command === 'notes') {
      if (positionals.length) throw new CliError('notes 不接受歌曲参数');
      return printNotes(options);
    }
    if (command === 'instruments') {
      if (positionals.length) throw new CliError('instruments 不接受歌曲参数');
      return printInstruments(options);
    }
    if (command === 'demo') {
      if (positionals.length > 1) throw new CliError('demo 只接受一个示例名');
      return await runDemo(options, positionals[0]);
    }
    if (command === 'play' || command === 'render' || command === 'check') {
      if (positionals.length > 1) {
        throw new CliError(`多余参数 "${positionals.slice(1).join(' ')}"；每个命令只接受一个歌曲文件`);
      }
      return await runSongCommand(command, positionals[0], options);
    }
    throw new CliError(`未知命令 "${command}"`);
  } catch (err) {
    const wantsJson = options.json || argv.includes('--json');
    printError(err, { ...options, json: wantsJson });
    return 1;
  }
}

export { helpText, VERSION };
