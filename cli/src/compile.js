/**
 * compile.js — 把“谱面”编译成可直接合成的音符事件。
 *
 * 这里处理：
 *  - 拍 -> 秒（tempo）
 *  - 移调
 *  - 延音踏板对每个音的制音时刻
 *  - 音域校验、时长上限
 */

import { clamp, midiToName, t60For, MIN_MIDI, MAX_MIDI } from './music.js';
import { SongError } from './parser.js';
import { getInstrumentDef } from './instruments/names.js';
import { getDrumHit } from './drums.js';

const MAX_AUDIO_SECONDS = 300;

function buildPedalTimeline(pedals, secondsPerBeat) {
  return pedals
    .map((pedal) => ({
      start: pedal.from * secondsPerBeat,
      end: pedal.to == null ? Infinity : pedal.to * secondsPerBeat,
      line: pedal.line
    }))
    .sort((a, b) => a.start - b.start);
}

function pedalDownAt(segments, time) {
  for (const segment of segments) {
    if (time >= segment.start && time < segment.end) return true;
    if (segment.start > time) break;
  }
  return false;
}

function nextPedalUpAfter(segments, time) {
  for (const segment of segments) {
    if (time >= segment.start && time < segment.end) return segment.end;
    if (segment.start > time) break;
  }
  return Infinity;
}

export function compileSong(song, options = {}) {
  const tempo = options.tempo == null ? song.tempo : Number(options.tempo);
  if (!Number.isFinite(tempo) || tempo < 20 || tempo > 300) {
    throw new SongError('tempo 必须在 20–300 之间', { code: 'COMPILE' });
  }
  const transpose = options.transpose == null ? song.transpose : Number(options.transpose);
  if (!Number.isInteger(transpose) || transpose < -24 || transpose > 24) {
    throw new SongError('transpose 必须是 -24–24 的整数', { code: 'COMPILE' });
  }
  const reverb = options.reverb == null ? song.reverb : Number(options.reverb);
  if (!Number.isFinite(reverb) || reverb < 0 || reverb > 1) {
    throw new SongError('reverb 必须在 0–1 之间', { code: 'COMPILE' });
  }
  const volume = options.volume == null ? (song.volume == null ? 1 : song.volume) : Number(options.volume);
  if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
    throw new SongError('volume 必须在 0–1 之间', { code: 'COMPILE' });
  }

  const secondsPerBeat = 60 / tempo;
  const pedalSegments = buildPedalTimeline(song.pedals, secondsPerBeat);
  const notes = [];
  const warnings = song.warnings.slice();
  const defaultInstrument = song.instrument || 'piano';

  for (const track of song.tracks) {
    const instrumentName = track.instrument || defaultInstrument;
    const instrument = getInstrumentDef(instrumentName);
    if (!instrument) {
      throw new SongError(`未知乐器 "${instrumentName}"`, { code: 'INSTRUMENT' });
    }
    const canonicalInstrument = instrument.name;
    const strum = track.strum || 0;
    const drive = track.drive || 0;
    const vibrato = track.vibrato || 0;
    const slide = track.slide || 0;
    let previousMidi = null;
    let previousStart = -1;

    for (const note of track.notes) {
      if (instrument.isDrum) {
        const hit = getDrumHit(note.drum);
        if (!hit) {
          throw new SongError(
            `鼓轨需要击打名（BD/SD/CH/OH/CP/LT/MT/HT/RD/CR/SH/TB），` +
              `收到 ${note.drum ? `"${note.drum}"` : '音名'}`,
            { line: note.line, column: note.column, code: 'DRUM' }
          );
        }
        const start = (track.start + note.at) * secondsPerBeat;
        const keyUp = start + note.beats * secondsPerBeat;
        const velocity = note.velocity == null ? (track.velocity == null ? song.velocity : track.velocity) : note.velocity;
        const pan = clamp(track.pan + hit.pan, -1, 1);
        notes.push({
          midi: hit.midi,
          name: hit.alias,
          drum: hit.name,
          drumLabel: hit.label,
          instrument: canonicalInstrument,
          instrumentLabel: instrument.label,
          drive,
          gain: instrument.gain * hit.gain,
          releaseTime: 0,
          start,
          keyUp,
          release: Infinity,
          end: start + hit.duration,
          velocity,
          pan,
          volume: track.volume,
          track: track.name,
          line: note.line,
          column: note.column
        });
        continue;
      }

      if (note.drum) {
        throw new SongError(
          `鼓击打 "${note.drum}" 不能用于乐器 ${instrument.label}`,
          { line: note.line, column: note.column, code: 'DRUM' }
        );
      }

      const midi = note.midi + transpose;
      if (midi < MIN_MIDI || midi > MAX_MIDI) {
        throw new SongError(
          `移调后音符 ${midiToName(note.midi)} 变成 ${midiToName(midi)}，超出可用音域 A0–C8`,
          { line: note.line, column: note.column, code: 'RANGE' }
        );
      }
      if (midi < instrument.range[0] || midi > instrument.range[1]) {
        throw new SongError(
          `乐器 ${instrument.label}（${instrument.english}）的音域是 ` +
            `${midiToName(instrument.range[0])}–${midiToName(instrument.range[1])}，` +
            `${midiToName(midi)} 超出范围`,
          { line: note.line, column: note.column, code: 'RANGE' }
        );
      }

      const strumOffset = (note.strumIndex || 0) * strum;
      const start = (track.start + note.at) * secondsPerBeat + strumOffset;
      const keyUp = start + note.beats * secondsPerBeat;
      const slideActive = slide > 0 && previousMidi != null && start > previousStart;
      const slideFromMidi = slideActive ? previousMidi : null;
      const slideTime = slideActive ? slide : 0;
      const damped = instrument.damped !== false;
      const sustained = damped && instrument.pedal !== false && pedalDownAt(pedalSegments, keyUp);
      const release = damped ? (sustained ? nextPedalUpAfter(pedalSegments, keyUp) : keyUp) : Infinity;
      const naturalEnd = instrument.decayScale == null
        ? null
        : start + t60For(midi) * instrument.decayScale * 1.05 + 0.15;

      let end = null;
      if (release === Infinity) {
        if (naturalEnd != null) end = naturalEnd;
      } else {
        end = release + instrument.releaseTime;
        if (naturalEnd != null) end = Math.min(end, naturalEnd);
      }

      const velocity = note.velocity == null ? (track.velocity == null ? song.velocity : track.velocity) : note.velocity;
      const keyPan = clamp((midi - 64) / 46, -0.52, 0.52) * 0.55;
      const pan = clamp(track.pan + keyPan, -1, 1);

      notes.push({
        midi,
        name: midiToName(midi),
        instrument: canonicalInstrument,
        instrumentLabel: instrument.label,
        drive,
        vibrato,
        slide: slideTime,
        slideFromMidi,
        bend: note.bend || 0,
        bendTime: note.bendTime || 0,
        graceFromMidi: note.graceFromMidi == null ? null : note.graceFromMidi + transpose,
        trill: note.trill || 0,
        gain: instrument.gain,
        releaseTime: instrument.releaseTime,
        start,
        keyUp,
        release,
        end,
        velocity,
        pan,
        volume: track.volume,
        track: track.name,
        line: note.line,
        column: note.column
      });

      if (start > previousStart) {
        previousMidi = midi;
        previousStart = start;
      }
    }
  }

  // 没有自然衰减的乐器（pad）如果踏板一直踩着，音符的结束时间要等整首曲子的末尾。
  const scoreEnd = notes.reduce((max, note) => Math.max(max, note.keyUp, note.end == null ? 0 : note.end), 0);
  for (const note of notes) {
    if (note.end == null) {
      note.release = Math.max(scoreEnd, note.keyUp);
      note.end = note.release + note.releaseTime;
    }
  }

  notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
  if (!notes.length) throw new SongError('歌曲里没有任何音符', { code: 'COMPILE' });

  const lastEnd = notes.reduce((max, note) => Math.max(max, note.end), 0);
  const reverbTail = reverb > 0 ? 1.9 + reverb * 0.8 : 0.15;
  const durationSec = lastEnd + reverbTail;
  if (durationSec > MAX_AUDIO_SECONDS) {
    throw new SongError(
      `歌曲时长 ${durationSec.toFixed(1)} 秒，超过命令行渲染上限 ${MAX_AUDIO_SECONDS} 秒`,
      { code: 'TOO_LONG' }
    );
  }
  if (durationSec > 180) warnings.push(`曲目较长（${(durationSec / 60).toFixed(1)} 分钟），渲染会占用较多内存`);

  const lastBeat = song.tracks.reduce((max, track) => {
    return track.notes.reduce((m, note) => Math.max(m, track.start + note.at + note.beats), max);
  }, 0);

  const instruments = [];
  for (const track of song.tracks) {
    const name = track.instrument || defaultInstrument;
    if (!instruments.includes(name)) instruments.push(name);
  }
  if (instruments.length > 5) {
    warnings.push(`使用了 ${instruments.length} 种乐器，配器过多；建议 2–5 件，每件有明确角色，删掉没有独立作用的轨道`);
  }

  return {
    title: song.title || 'Untitled',
    tempo,
    meter: song.meter,
    reverb,
    volume,
    transpose,
    instrument: defaultInstrument,
    instruments,
    notes,
    durationSec,
    beats: lastBeat,
    tracks: song.tracks.map((track) => ({
      name: track.name,
      instrument: track.instrument || defaultInstrument,
      strum: track.strum || 0,
      drive: track.drive || 0,
      vibrato: track.vibrato || 0,
      slide: track.slide || 0,
      volume: track.volume,
      pan: track.pan,
      start: track.start,
      notes: track.notes.length
    })),
    warnings
  };
}
