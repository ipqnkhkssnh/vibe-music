/**
 * parser.js — 歌曲脚本解析器
 *
 * 支持两种输入：
 *  1. 面向人和 Agent 的文本 DSL（.piano），按轨道顺序写音符；
 *  2. 结构化 JSON（.json），适合程序生成。
 *
 * 解析器只做“读入 + 校验 + 归一化”，绝不 eval 用户输入。
 */

import { clamp, noteToMidi, MIN_MIDI, MAX_MIDI } from './music.js';
import { INSTRUMENT_NAMES, normalizeInstrumentName } from './instruments/names.js';
import { resolveDrumHit } from './drums.js';

export class SongError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'SongError';
    this.line = options.line == null ? null : options.line;
    this.column = options.column == null ? null : options.column;
    this.code = options.code || 'PARSE';
  }
}

const GLOBAL_KEYS = new Set(['title', 'tempo', 'meter', 'velocity', 'reverb', 'transpose', 'volume', 'instrument']);
const TRACK_OPTION_KEYS = new Set(['volume', 'pan', 'start', 'velocity', 'instrument', 'strum', 'drive', 'vibrato', 'slide']);

function defaults() {
  return {
    title: null,
    tempo: 100,
    meter: '4/4',
    velocity: 0.8,
    volume: 1,
    reverb: 0.26,
    transpose: 0,
    instrument: 'piano',
    tracks: [],
    pedals: [],
    warnings: []
  };
}

function stripComment(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) return '';
  let inChord = false;
  for (let i = 0; i < line.length - 1; i++) {
    if (line[i] === '[') inChord = true;
    else if (line[i] === ']') inChord = false;
    else if (!inChord && line[i] === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

/** 按空白切分，但保留 [] 内的空格；同时把 | 作为可忽略的独立 token。 */
function splitTokens(text) {
  const tokens = [];
  let buffer = '';
  let start = 0;
  let depth = 0;
  let braceDepth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      braceDepth++;
      if (!buffer) start = i;
      buffer += ch;
    } else if (ch === '}') {
      braceDepth--;
      if (braceDepth < 0) throw new SongError('多余的 }', { column: i + 1 });
      buffer += ch;
    } else if (ch === '[' && braceDepth === 0) {
      if (depth === 0) {
        if (buffer.trim()) tokens.push({ text: buffer.trim(), column: start + 1 });
        buffer = '';
        start = i;
      }
      depth++;
      buffer += ch;
    } else if (ch === ']' && braceDepth === 0) {
      depth--;
      if (depth < 0) throw new SongError('多余的 ]', { column: i + 1 });
      buffer += ch;
      if (depth === 0) {
        // 让 duration / velocity 继续附着在同一个 token 上
      }
    } else if ((ch === '|' || ch === ',' || /\s/.test(ch)) && depth === 0 && braceDepth === 0) {
      if (buffer.trim()) tokens.push({ text: buffer.trim(), column: start + 1 });
      buffer = '';
      start = i + 1;
    } else {
      if (!buffer) start = i;
      buffer += ch;
    }
  }
  if (depth !== 0) throw new SongError('缺少 ]');
  if (braceDepth !== 0) throw new SongError('缺少 }');
  if (buffer.trim()) tokens.push({ text: buffer.trim(), column: start + 1 });
  return tokens.filter((token) => token.text !== '|');
}

function parseBeats(text, context) {
  let raw = String(text).trim();
  if (!raw) throw new SongError('缺少时值（拍数）', context);
  let multiplier = 1;
  if (raw.length > 1 && raw.endsWith('.')) {
    multiplier = 1.5;
    raw = raw.slice(0, -1);
  }
  let value;
  if (raw.includes('/')) {
    const parts = raw.split('/');
    if (parts.length !== 2) throw new SongError(`无法识别时值 "${text}"`, context);
    const numerator = Number(parts[0]);
    const denominator = Number(parts[1]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      throw new SongError(`无法识别时值 "${text}"`, context);
    }
    value = numerator / denominator;
  } else {
    value = Number(raw);
  }
  value *= multiplier;
  if (!Number.isFinite(value) || value <= 0) {
    throw new SongError(`时值必须大于 0，收到 "${text}"`, context);
  }
  if (value > 64) {
    throw new SongError(`单个音的时值不能超过 64 拍（收到 ${value}）`, context);
  }
  return value;
}

function parseVelocity(text, context) {
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) {
    throw new SongError(`力度必须是 0–1 或 1–127，收到 "${text}"`, context);
  }
  if (value > 1) {
    if (value > 127) throw new SongError(`力度不能大于 127（收到 ${text}）`, context);
    return clamp(value / 127, 0.02, 1);
  }
  return clamp(value, 0.02, 1);
}

function parseNoteName(name, context) {
  try {
    return noteToMidi(name);
  } catch (err) {
    throw new SongError(err.message, context);
  }
}

function parseNoteModifiers(text, context) {
  const mods = {};
  for (const part of text.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) throw new SongError(`演奏法 "${trimmed}" 缺少 =`, context);
    const key = trimmed.slice(0, eq).trim().toLowerCase();
    const value = trimmed.slice(eq + 1).trim();
    if (!value) throw new SongError(`演奏法 "${key}" 缺少值`, context);
    if (key === 'bend') {
      const number = Number(value);
      if (!Number.isInteger(number) || number < -12 || number > 12) {
        throw new SongError('bend 必须是 -12–12 的整数半音', context);
      }
      mods.bend = number;
    } else if (key === 'time') {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0 || number > 2) {
        throw new SongError('bend time 必须在 0–2 秒之间', context);
      }
      mods.bendTime = number;
    } else if (key === 'grace') {
      mods.graceFromMidi = parseNoteName(value, context);
    } else if (key === 'trill') {
      const number = Number(value);
      if (!Number.isInteger(number) || number < 1 || number > 12) {
        throw new SongError('trill 必须是 1–12 的整数半音', context);
      }
      mods.trill = number;
    } else {
      throw new SongError(`未知演奏法 "${key}"（支持 bend / time / grace / trill）`, context);
    }
  }
  if (mods.bendTime != null && mods.bend == null) {
    throw new SongError('time 需要和 bend 一起使用', context);
  }
  return mods;
}

function parseNoteToken(token, track, context) {
  let body = token.text;
  let velocity = null;
  let modifiers = {};

  // 先取 {bend=+2,grace=D5,trill=+2} 这类逐音演奏法，再解析力度/时值
  const open = body.indexOf('{');
  if (open !== -1) {
    if (!body.endsWith('}')) throw new SongError('演奏法缺少 }', context);
    modifiers = parseNoteModifiers(body.slice(open + 1, -1), context);
    body = body.slice(0, open).trim();
  } else if (body.includes('}')) {
    throw new SongError('演奏法缺少 {', context);
  }

  const atIndex = body.indexOf('@');
  if (atIndex !== -1) {
    const velocityText = body.slice(atIndex + 1).trim();
    body = body.slice(0, atIndex);
    if (!velocityText) throw new SongError('@ 后面缺少力度值', context);
    velocity = parseVelocity(velocityText, context);
  }

  let beats = 1;
  let head = body;
  const colon = body.lastIndexOf(':');
  if (colon !== -1) {
    const beatsText = body.slice(colon + 1).trim();
    head = body.slice(0, colon).trim();
    if (!beatsText) throw new SongError('冒号后面缺少时值', context);
    beats = parseBeats(beatsText, context);
  }

  if (!head) throw new SongError('缺少音符', context);

  // 休止符
  if (head === '-' || /^r(?:est)?$/i.test(head)) {
    track.cursor += beats;
    return;
  }

  let items;
  if (head.startsWith('[')) {
    if (!head.endsWith(']')) throw new SongError('和弦缺少 ]', context);
    const inner = head.slice(1, -1).trim();
    if (!inner) throw new SongError('和弦不能为空', context);
    const names = inner.split(/[\s,]+/).filter(Boolean);
    if (!names.length) throw new SongError('和弦不能为空', context);
    const drumHits = names.map((name) => resolveDrumHit(name));
    if (drumHits.every(Boolean)) {
      items = drumHits.map((hit) => ({ midi: hit.midi, drum: hit.name }));
    } else if (drumHits.some(Boolean)) {
      throw new SongError('鼓击打不能和音名写在同一个和弦里', context);
    } else {
      items = names.map((name) => ({ midi: parseNoteName(name, context), drum: null }));
    }
  } else if (head.includes('[') || head.includes(']')) {
    throw new SongError(`无法识别的和弦写法 "${head}"`, context);
  } else {
    const drumHit = resolveDrumHit(head);
    items = drumHit
      ? [{ midi: drumHit.midi, drum: drumHit.name }]
      : [{ midi: parseNoteName(head, context), drum: null }];
  }

  const bend = modifiers.bend || 0;
  const bendTime = bend ? (modifiers.bendTime == null ? 0.25 : modifiers.bendTime) : 0;
  const graceFromMidi = modifiers.graceFromMidi == null ? null : modifiers.graceFromMidi;
  const trill = modifiers.trill || 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.drum == null && (item.midi < MIN_MIDI || item.midi > MAX_MIDI)) {
      throw new SongError('音高超出可用范围 A0–C8', context);
    }
    track.notes.push({
      midi: item.midi,
      drum: item.drum,
      at: track.cursor,
      beats,
      velocity,
      strumIndex: i,
      bend,
      bendTime,
      graceFromMidi,
      trill,
      line: context.line,
      column: context.column
    });
  }
  track.cursor += beats;
}

function parseTrackHeader(rest, lineNumber, index) {
  const tokens = rest.trim() ? rest.trim().split(/\s+/) : [];
  let name = null;
  const options = {};
  for (const token of tokens) {
    if (token.includes('=')) {
      const eq = token.indexOf('=');
      const key = token.slice(0, eq).toLowerCase();
      const value = token.slice(eq + 1);
      if (!TRACK_OPTION_KEYS.has(key)) {
        throw new SongError(`未知的轨道属性 "${key}"`, { line: lineNumber });
      }
      if (!value) throw new SongError(`轨道属性 "${key}" 缺少值`, { line: lineNumber });
      options[key] = value;
    } else if (name == null) {
      name = token;
    } else {
      throw new SongError(`无法识别的轨道参数 "${token}"`, { line: lineNumber });
    }
  }

  const track = {
    name: name || `Track ${index + 1}`,
    volume: options.volume == null ? 0.85 : Number(options.volume),
    pan: options.pan == null ? 0 : Number(options.pan),
    start: options.start == null ? 0 : Number(options.start),
    velocity: options.velocity == null ? null : Number(options.velocity),
    instrument: null,
    strum: options.strum == null ? 0 : Number(options.strum),
    drive: options.drive == null ? 0 : Number(options.drive),
    vibrato: options.vibrato == null ? 0 : Number(options.vibrato),
    slide: options.slide == null ? 0 : Number(options.slide),
    notes: [],
    cursor: 0,
    line: lineNumber
  };

  if (options.instrument != null) {
    const canonical = normalizeInstrumentName(options.instrument);
    if (!canonical) {
      throw new SongError(
        `未知乐器 "${options.instrument}"，可用：${INSTRUMENT_NAMES.join(' / ')}`,
        { line: lineNumber }
      );
    }
    track.instrument = canonical;
  }

  if (!Number.isFinite(track.volume) || track.volume < 0 || track.volume > 1) {
    throw new SongError('轨道 volume 必须在 0–1 之间', { line: lineNumber });
  }
  if (!Number.isFinite(track.pan) || track.pan < -1 || track.pan > 1) {
    throw new SongError('轨道 pan 必须在 -1–1 之间', { line: lineNumber });
  }
  if (!Number.isFinite(track.start) || track.start < 0) {
    throw new SongError('轨道 start 必须是非负拍数', { line: lineNumber });
  }
  if (track.velocity != null && (!Number.isFinite(track.velocity) || track.velocity <= 0 || track.velocity > 1)) {
    throw new SongError('轨道 velocity 必须在 0–1 之间', { line: lineNumber });
  }
  if (!Number.isFinite(track.strum) || track.strum < 0 || track.strum > 0.25) {
    throw new SongError('轨道 strum 必须在 0–0.25 秒之间', { line: lineNumber });
  }
  if (!Number.isFinite(track.drive) || track.drive < 0 || track.drive > 1) {
    throw new SongError('轨道 drive 必须在 0–1 之间', { line: lineNumber });
  }
  if (!Number.isFinite(track.vibrato) || track.vibrato < 0 || track.vibrato > 1) {
    throw new SongError('轨道 vibrato 必须在 0–1 之间', { line: lineNumber });
  }
  if (!Number.isFinite(track.slide) || track.slide < 0 || track.slide > 0.5) {
    throw new SongError('轨道 slide 必须在 0–0.5 秒之间', { line: lineNumber });
  }

  return track;
}

function parsePedal(rest, lineNumber) {
  const body = String(rest).trim();
  const match = /^(\d+(?:\.\d+)?)\s*(?:-|\.\.|\s)\s*(\d+(?:\.\d+)?)?$/.exec(body);
  if (!match) {
    throw new SongError('踏板格式应为 "0-8" 或 "8-"，单位是拍', { line: lineNumber });
  }
  const from = Number(match[1]);
  const to = match[2] == null ? null : Number(match[2]);
  if (!Number.isFinite(from) || from < 0) {
    throw new SongError('踏板起点必须是非负拍数', { line: lineNumber });
  }
  if (to != null && (!Number.isFinite(to) || to <= from)) {
    throw new SongError('踏板终点必须大于起点，或写成 "8-" 表示一直踩到结尾', { line: lineNumber });
  }
  return { from, to, line: lineNumber };
}

function validatePedals(pedals) {
  const sorted = pedals.slice().sort((a, b) => a.from - b.from || (a.to ?? Infinity) - (b.to ?? Infinity));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const current = sorted[i];
    if (prev.to == null) {
      throw new SongError('前一个踏板没有抬起（"x-" 只能用于最后一个踏板）', { line: prev.line });
    }
    if (current.from < prev.to) {
      throw new SongError(`踏板区间重叠：${prev.from}-${prev.to} 与 ${current.from}-${current.to ?? ''}`, {
        line: current.line
      });
    }
  }
  return sorted;
}

function finalize(song) {
  song.tracks = song.tracks.filter((track) => track.notes.length > 0 || track.cursor > 0);
  const allNotes = song.tracks.reduce((sum, track) => sum + track.notes.length, 0);
  if (!allNotes) {
    throw new SongError('歌曲里没有任何音符');
  }
  for (const track of song.tracks) {
    if (!track.notes.length) song.warnings.push(`轨道 "${track.name}" 没有音符`);
    delete track.cursor;
    delete track.line;
  }
  song.pedals = validatePedals(song.pedals);
  const lastNoteBeat = Math.max(
    ...song.tracks.flatMap((track) => track.notes.map((note) => track.start + note.at + note.beats))
  );
  const lastPedalBeat = song.pedals.reduce((max, pedal) => Math.max(max, pedal.to == null ? pedal.from : pedal.to), 0);
  song.beats = Math.max(lastNoteBeat, lastPedalBeat);
  if (song.pedals.some((pedal) => pedal.to == null)) {
    song.warnings.push('最后一个踏板一直踩到结尾，尾音会自然衰减');
  }
  return song;
}

function parseJsonSong(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new SongError(`JSON 解析失败：${err.message}`, { code: 'JSON' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SongError('JSON 歌曲必须是一个对象', { code: 'JSON' });
  }

  const song = defaults();
  if (data.title != null) song.title = String(data.title);
  if (data.tempo != null) song.tempo = Number(data.tempo);
  if (data.meter != null) song.meter = String(data.meter);
  if (data.velocity != null) song.velocity = Number(data.velocity);
  if (data.reverb != null) song.reverb = Number(data.reverb);
  if (data.transpose != null) song.transpose = Number(data.transpose);
  if (data.volume != null) song.volume = Number(data.volume);
  if (data.instrument != null) {
    const canonical = normalizeInstrumentName(data.instrument);
    if (!canonical) {
      throw new SongError(`未知乐器 "${data.instrument}"，可用：${INSTRUMENT_NAMES.join(' / ')}`, { code: 'JSON' });
    }
    song.instrument = canonical;
  }

  if (!Number.isFinite(song.tempo) || song.tempo < 20 || song.tempo > 300) {
    throw new SongError('tempo 必须在 20–300 之间', { code: 'JSON' });
  }
  if (!/^\d+\/\d+$/.test(song.meter)) {
    throw new SongError('meter 格式应为 4/4、3/4、6/8 等', { code: 'JSON' });
  }
  if (!Number.isFinite(song.velocity) || song.velocity <= 0 || song.velocity > 1) {
    throw new SongError('velocity 必须在 0–1 之间', { code: 'JSON' });
  }
  if (!Number.isFinite(song.reverb) || song.reverb < 0 || song.reverb > 1) {
    throw new SongError('reverb 必须在 0–1 之间', { code: 'JSON' });
  }
  if (!Number.isFinite(song.volume) || song.volume < 0 || song.volume > 1) {
    throw new SongError('volume 必须在 0–1 之间', { code: 'JSON' });
  }
  if (!Number.isInteger(song.transpose) || song.transpose < -24 || song.transpose > 24) {
    throw new SongError('transpose 必须是 -24–24 的整数', { code: 'JSON' });
  }

  if (!Array.isArray(data.tracks) || !data.tracks.length) {
    throw new SongError('JSON 歌曲需要非空的 tracks 数组', { code: 'JSON' });
  }

  data.tracks.forEach((rawTrack, index) => {
    if (!rawTrack || typeof rawTrack !== 'object') {
      throw new SongError(`tracks[${index}] 必须是对象`, { code: 'JSON' });
    }
    const track = {
      name: rawTrack.name == null ? `Track ${index + 1}` : String(rawTrack.name),
      volume: rawTrack.volume == null ? 0.85 : Number(rawTrack.volume),
      pan: rawTrack.pan == null ? 0 : Number(rawTrack.pan),
      start: rawTrack.start == null ? 0 : Number(rawTrack.start),
      velocity: rawTrack.velocity == null ? null : Number(rawTrack.velocity),
      instrument: null,
      strum: rawTrack.strum == null ? 0 : Number(rawTrack.strum),
      drive: rawTrack.drive == null ? 0 : Number(rawTrack.drive),
      vibrato: rawTrack.vibrato == null ? 0 : Number(rawTrack.vibrato),
      slide: rawTrack.slide == null ? 0 : Number(rawTrack.slide),
      notes: []
    };
    if (rawTrack.instrument != null) {
      const canonical = normalizeInstrumentName(rawTrack.instrument);
      if (!canonical) {
        throw new SongError(
          `tracks[${index}].instrument：未知乐器 "${rawTrack.instrument}"，可用：${INSTRUMENT_NAMES.join(' / ')}`,
          { code: 'JSON' }
        );
      }
      track.instrument = canonical;
    }
    if (!Number.isFinite(track.volume) || track.volume < 0 || track.volume > 1) {
      throw new SongError(`tracks[${index}].volume 必须在 0–1 之间`, { code: 'JSON' });
    }
    if (!Number.isFinite(track.pan) || track.pan < -1 || track.pan > 1) {
      throw new SongError(`tracks[${index}].pan 必须在 -1–1 之间`, { code: 'JSON' });
    }
    if (!Number.isFinite(track.start) || track.start < 0) {
      throw new SongError(`tracks[${index}].start 必须是非负拍数`, { code: 'JSON' });
    }
    if (track.velocity != null && (!Number.isFinite(track.velocity) || track.velocity <= 0 || track.velocity > 1)) {
      throw new SongError(`tracks[${index}].velocity 必须在 0–1 之间`, { code: 'JSON' });
    }
    if (!Number.isFinite(track.strum) || track.strum < 0 || track.strum > 0.25) {
      throw new SongError(`tracks[${index}].strum 必须在 0–0.25 秒之间`, { code: 'JSON' });
    }
    if (!Number.isFinite(track.drive) || track.drive < 0 || track.drive > 1) {
      throw new SongError(`tracks[${index}].drive 必须在 0–1 之间`, { code: 'JSON' });
    }
    if (!Number.isFinite(track.vibrato) || track.vibrato < 0 || track.vibrato > 1) {
      throw new SongError(`tracks[${index}].vibrato 必须在 0–1 之间`, { code: 'JSON' });
    }
    if (!Number.isFinite(track.slide) || track.slide < 0 || track.slide > 0.5) {
      throw new SongError(`tracks[${index}].slide 必须在 0–0.5 秒之间`, { code: 'JSON' });
    }
    if (!Array.isArray(rawTrack.notes) || !rawTrack.notes.length) {
      throw new SongError(`tracks[${index}].notes 需要非空数组`, { code: 'JSON' });
    }

    rawTrack.notes.forEach((event, eventIndex) => {
      if (!event || typeof event !== 'object') {
        throw new SongError(`tracks[${index}].notes[${eventIndex}] 必须是对象`, { code: 'JSON' });
      }
      const at = event.at == null ? 0 : Number(event.at);
      const beats = event.beats == null ? 1 : Number(event.beats);
      const velocity = event.velocity == null ? null : Number(event.velocity);
      if (!Number.isFinite(at) || at < 0) {
        throw new SongError(`tracks[${index}].notes[${eventIndex}].at 必须是非负拍数`, { code: 'JSON' });
      }
      if (!Number.isFinite(beats) || beats <= 0 || beats > 64) {
        throw new SongError(`tracks[${index}].notes[${eventIndex}].beats 必须在 0–64 之间`, { code: 'JSON' });
      }
      if (velocity != null && (!Number.isFinite(velocity) || velocity <= 0 || velocity > 1)) {
        throw new SongError(`tracks[${index}].notes[${eventIndex}].velocity 必须在 0–1 之间`, { code: 'JSON' });
      }

      const bend = event.bend == null ? 0 : Number(event.bend);
      if (!Number.isInteger(bend) || bend < -12 || bend > 12) {
        throw new SongError(`tracks[${index}].notes[${eventIndex}].bend 必须是 -12–12 的整数`, { code: 'JSON' });
      }
      const bendTime = event.bendTime == null ? (bend ? 0.25 : 0) : Number(event.bendTime);
      if (!Number.isFinite(bendTime) || bendTime < 0 || bendTime > 2) {
        throw new SongError(`tracks[${index}].notes[${eventIndex}].bendTime 必须在 0–2 秒之间`, { code: 'JSON' });
      }
      const trill = event.trill == null ? 0 : Number(event.trill);
      if (!Number.isInteger(trill) || trill < 0 || trill > 12) {
        throw new SongError(`tracks[${index}].notes[${eventIndex}].trill 必须是 0–12 的整数`, { code: 'JSON' });
      }
      let graceFromMidi = null;
      if (event.grace != null) {
        try {
          graceFromMidi = noteToMidi(event.grace);
        } catch (err) {
          throw new SongError(`tracks[${index}].notes[${eventIndex}].grace：${err.message}`, { code: 'JSON' });
        }
      }

      let items = null;
      if (event.drum != null) {
        const hit = resolveDrumHit(event.drum);
        if (!hit) {
          throw new SongError(
            `tracks[${index}].notes[${eventIndex}].drum：未知鼓击打 "${event.drum}"`,
            { code: 'JSON' }
          );
        }
        items = [{ midi: hit.midi, drum: hit.name }];
      } else if (Array.isArray(event.notes)) {
        items = event.notes.map((value, noteIndex) => {
          const hit = resolveDrumHit(value);
          if (hit) return { midi: hit.midi, drum: hit.name };
          try {
            return { midi: noteToMidi(value), drum: null };
          } catch (err) {
            throw new SongError(`tracks[${index}].notes[${eventIndex}].notes[${noteIndex}]：${err.message}`, { code: 'JSON' });
          }
        });
      } else if (event.note != null) {
        const hit = resolveDrumHit(event.note);
        if (hit) {
          items = [{ midi: hit.midi, drum: hit.name }];
        } else {
          try {
            items = [{ midi: noteToMidi(event.note), drum: null }];
          } catch (err) {
            throw new SongError(`tracks[${index}].notes[${eventIndex}].note：${err.message}`, { code: 'JSON' });
          }
        }
      } else if (event.midi != null) {
        const midi = Number(event.midi);
        if (!Number.isInteger(midi) || midi < MIN_MIDI || midi > MAX_MIDI) {
          throw new SongError(`tracks[${index}].notes[${eventIndex}].midi 必须在 21–108 之间`, { code: 'JSON' });
        }
        items = [{ midi, drum: null }];
      }
      if (!items || !items.length) {
        throw new SongError(`tracks[${index}].notes[${eventIndex}] 缺少 drum / note / notes / midi`, { code: 'JSON' });
      }
      for (let i = 0; i < items.length; i++) {
        track.notes.push({
          midi: items[i].midi,
          drum: items[i].drum,
          at,
          beats,
          velocity,
          strumIndex: i,
          bend,
          bendTime,
          graceFromMidi,
          trill,
          line: null,
          column: null
        });
      }
    });
    song.tracks.push(track);
  });

  if (data.pedals != null) {
    if (!Array.isArray(data.pedals)) throw new SongError('pedals 必须是数组', { code: 'JSON' });
    data.pedals.forEach((pedal, index) => {
      let from;
      let to;
      if (Array.isArray(pedal)) {
        from = Number(pedal[0]);
        to = pedal[1] == null ? null : Number(pedal[1]);
      } else if (pedal && typeof pedal === 'object') {
        from = Number(pedal.from);
        to = pedal.to == null ? null : Number(pedal.to);
      } else {
        throw new SongError(`pedals[${index}] 格式错误`, { code: 'JSON' });
      }
      if (!Number.isFinite(from) || from < 0) {
        throw new SongError(`pedals[${index}].from 必须是非负拍数`, { code: 'JSON' });
      }
      if (to != null && (!Number.isFinite(to) || to <= from)) {
        throw new SongError(`pedals[${index}].to 必须大于 from`, { code: 'JSON' });
      }
      song.pedals.push({ from, to, line: null });
    });
  }

  return finalize(song);
}

/**
 * 解析歌曲文本（自动识别 JSON / DSL）。
 * @param {string} text
 * @param {{sourceName?: string}} options
 */
export function parseSong(text, options = {}) {
  const source = String(text).replace(/^\uFEFF/, '');
  if (!source.trim()) throw new SongError('歌曲文件是空的');

  if (source.trimStart().startsWith('{')) {
    const song = parseJsonSong(source);
    if (!song.title) song.title = options.sourceName || null;
    return song;
  }

  const song = defaults();
  let currentTrack = null;
  const lines = source.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNumber = lineIndex + 1;
    const cleaned = stripComment(lines[lineIndex]);
    const trimmed = cleaned.trim();
    if (!trimmed) continue;

    const trackMatch = /^track\b(.*)$/i.exec(trimmed);
    if (trackMatch) {
      currentTrack = parseTrackHeader(trackMatch[1], lineNumber, song.tracks.length);
      song.tracks.push(currentTrack);
      continue;
    }

    const pedalMatch = /^pedal\b\s*[:=]?\s*(.*)$/i.exec(trimmed);
    if (pedalMatch) {
      song.pedals.push(parsePedal(pedalMatch[1], lineNumber));
      continue;
    }

    const globalMatch = /^([A-Za-z][A-Za-z0-9_-]*)\s*[:=]\s*(.*)$/.exec(trimmed);
    if (globalMatch && GLOBAL_KEYS.has(globalMatch[1].toLowerCase())) {
      const key = globalMatch[1].toLowerCase();
      const value = globalMatch[2].trim();
      if (key === 'title') {
        song.title = value || null;
      } else if (key === 'meter') {
        if (!/^\d+\/\d+$/.test(value)) {
          throw new SongError('meter 格式应为 4/4、3/4、6/8 等', { line: lineNumber });
        }
        song.meter = value;
      } else if (key === 'instrument') {
        const canonical = normalizeInstrumentName(value);
        if (!canonical) {
          throw new SongError(
            `未知乐器 "${value}"，可用：${INSTRUMENT_NAMES.join(' / ')}`,
            { line: lineNumber }
          );
        }
        song.instrument = canonical;
      } else {
        const number = Number(value);
        if (!Number.isFinite(number)) {
          throw new SongError(`${key} 需要一个数字`, { line: lineNumber });
        }
        if (key === 'tempo') {
          if (number < 20 || number > 300) throw new SongError('tempo 必须在 20–300 之间', { line: lineNumber });
          song.tempo = number;
        } else if (key === 'transpose') {
          if (!Number.isInteger(number) || number < -24 || number > 24) {
            throw new SongError('transpose 必须是 -24–24 的整数', { line: lineNumber });
          }
          song.transpose = number;
        } else if (key === 'velocity') {
          if (number <= 0 || number > 1) throw new SongError('velocity 必须在 0–1 之间', { line: lineNumber });
          song.velocity = number;
        } else if (key === 'reverb') {
          if (number < 0 || number > 1) throw new SongError('reverb 必须在 0–1 之间', { line: lineNumber });
          song.reverb = number;
        } else if (key === 'volume') {
          if (number < 0 || number > 1) throw new SongError('volume 必须在 0–1 之间', { line: lineNumber });
          song.volume = number;
        }
      }
      continue;
    }

    if (!currentTrack) {
      throw new SongError('音符必须写在 track 声明之后', { line: lineNumber });
    }

    let tokens;
    try {
      tokens = splitTokens(cleaned);
    } catch (err) {
      if (err instanceof SongError) {
        err.line = lineNumber;
        throw err;
      }
      throw err;
    }
    for (const token of tokens) {
      parseNoteToken(token, currentTrack, { line: lineNumber, column: token.column });
    }
  }

  if (!song.title) song.title = options.sourceName || null;
  return finalize(song);
}
