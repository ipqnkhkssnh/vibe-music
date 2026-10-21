/**
 * synth.js — 把编译后的音符事件渲染成 PCM。
 *
 * 乐器相关的声音在 instruments/ 下；这里只负责：
 *   - 准备每个乐器的噪声/状态
 *   - 按 note.instrument 分发
 *   - 混响、淡入淡出、峰值归一化
 */

import { clamp } from './music.js';
import { Freeverb } from './reverb.js';
import { mulberry32, hashString } from './instruments/common.js';
import { getRenderer } from './instruments/index.js';

/**
 * 渲染编译后的歌曲。
 * @returns {{left: Float32Array, right: Float32Array, sampleRate: number, duration: number, peak: number}}
 */
export function renderSong(compiled, options = {}) {
  const sampleRate = Number(options.sampleRate || 44100);
  if (!Number.isFinite(sampleRate) || sampleRate < 22050 || sampleRate > 96000) {
    throw new Error('sampleRate 必须在 22050–96000 之间');
  }

  const frames = Math.max(1, Math.ceil(compiled.durationSec * sampleRate));
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);

  const instrumentNames = [];
  for (const note of compiled.notes) {
    const name = note.instrument || 'piano';
    if (!instrumentNames.includes(name)) instrumentNames.push(name);
  }
  const seedText = `${compiled.title}|${compiled.tempo}|${compiled.notes.length}|${compiled.transpose}|${instrumentNames.join(',')}`;
  const rng = mulberry32(hashString(seedText));

  const states = new Map();
  for (const name of instrumentNames) {
    states.set(name, getRenderer(name).prepare(sampleRate, rng));
  }

  const total = compiled.notes.length;
  for (let i = 0; i < total; i++) {
    const note = compiled.notes[i];
    const name = note.instrument || 'piano';
    getRenderer(name).renderNote(note, left, right, sampleRate, rng, states.get(name));
    if (typeof options.onProgress === 'function' && (i % 25 === 0 || i === total - 1)) {
      options.onProgress(i + 1, total);
    }
  }

  if (compiled.reverb > 0) {
    const reverb = new Freeverb(sampleRate, {
      room: 0.84,
      damp: 0.22,
      wet: compiled.reverb * 1.5,
      dry: 1
    });
    reverb.process(left, right);
  }

  // 首尾淡入淡出，避免爆音
  const fade = Math.min(Math.floor(sampleRate * 0.012), Math.floor(frames / 2));
  for (let i = 0; i < fade; i++) {
    const gain = i / fade;
    left[i] *= gain;
    right[i] *= gain;
    left[frames - 1 - i] *= gain;
    right[frames - 1 - i] *= gain;
  }

  let peak = 0;
  for (let i = 0; i < frames; i++) {
    const absL = Math.abs(left[i]);
    const absR = Math.abs(right[i]);
    if (absL > peak) peak = absL;
    if (absR > peak) peak = absR;
    if (!Number.isFinite(left[i]) || !Number.isFinite(right[i])) {
      throw new Error('合成结果出现 NaN，请检查歌曲参数');
    }
  }

  const volume = clamp(
    options.volume == null ? (compiled.volume == null ? 1 : compiled.volume) : Number(options.volume),
    0,
    1
  );
  const target = 0.9 * volume;
  const scale = peak > 0 ? target / peak : 0;
  for (let i = 0; i < frames; i++) {
    left[i] *= scale;
    right[i] *= scale;
  }

  return {
    left,
    right,
    sampleRate,
    duration: frames / sampleRate,
    peak: peak * scale,
    rawPeak: peak
  };
}
