/**
 * music.js — 音高、音名、频率与钢琴衰减参数的共享工具。
 * CLI 与合成器共用，避免出现两套音高计算。
 */

export const MIN_MIDI = 21; // A0
export const MAX_MIDI = 108; // C8

const NOTE_PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_RE = /^([A-Ga-g])(#{0,2}|b{0,2})(-?\d+)$/;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 解析音名：C4、C#4、Db4、Cb4、B#3 等。
 * 返回 MIDI note number，并检查 88 键音域。
 */
export function noteToMidi(name) {
  const text = String(name).trim();
  const match = NOTE_RE.exec(text);
  if (!match) {
    throw new Error(`无法识别音名 "${text}"，请使用 C4 / C#4 / Db4 这样的写法`);
  }
  let pc = NOTE_PCS[match[1].toUpperCase()];
  for (const accidental of match[2]) {
    pc += accidental === '#' ? 1 : -1;
  }
  const midi = (Number(match[3]) + 1) * 12 + pc;
  if (midi < MIN_MIDI || midi > MAX_MIDI) {
    throw new Error(`音高 ${text} 超出钢琴范围 A0–C8`);
  }
  return midi;
}

export function midiToName(midi) {
  return NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function isBlackMidi(midi) {
  const pc = ((midi % 12) + 12) % 12;
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}

/** 与 Web 版音源一致的 T60（-60dB 衰减时间，秒） */
export function t60For(midi) {
  return Math.min(18, 17 * Math.pow(2, -(midi - 36) / 19));
}

export function allMidiNotes() {
  const notes = [];
  for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
    notes.push({
      midi,
      name: midiToName(midi),
      freq: midiToFreq(midi),
      black: isBlackMidi(midi)
    });
  }
  return notes;
}
