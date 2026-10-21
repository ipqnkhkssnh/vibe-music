/**
 * erhu.js — 二胡。
 *
 * 单声部弓弦 + 揉弦 + 滑音 + 运弓噪声；
 * 用 track 的 vibrato 控制揉弦深度，slide 控制从前一个音滑过来的时间。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';
import { pitchAt } from '../articulation.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.3, rng, 0.14) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.44 * Math.pow(velocity, 0.95) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const slideFromF0 = note.slideFromMidi == null ? null : midiToFreq(note.slideFromMidi);
  const slideTime = slideFromF0 == null ? 0 : Math.max(0, Math.min(note.slide || 0, length / sampleRate));
  const graceF0 = note.graceFromMidi == null ? null : midiToFreq(note.graceFromMidi);
  const graceTime = graceF0 == null ? 0 : 0.06;
  const { left: panL, right: panR } = panGains(note.pan);

  const attack = Math.max(1, Math.floor(sampleRate * 0.15));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.5));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.04));

  const harmonicCount = Math.max(3, Math.min(10, Math.floor((sampleRate * 0.42) / f0)));
  const harmonicNorm = (() => {
    let sum = 0;
    for (let n = 1; n <= harmonicCount; n++) sum += 1 / n;
    return sum;
  })();
  const cutoff = clamp(1200 + 2600 * velocity, 900, Math.min(6500, sampleRate * 0.42));
  const lpCoeff = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);

  const phases = new Float64Array(harmonicCount);
  const amps = new Float64Array(harmonicCount);
  for (let n = 1; n <= harmonicCount; n++) {
    phases[n - 1] = rng();
    amps[n - 1] = (level * (1 / n)) / harmonicNorm;
  }

  const vibRate = 5.2 + rng() * 0.7;
  const vibInc = (2 * Math.PI * vibRate) / sampleRate;
  const vibDepth = 0.0025 + (note.vibrato || 0) * 0.006;
  let vibPhase = rng() * Math.PI * 2;

  const noise = state.noise;
  const noiseOffset = Math.floor(rng() * Math.max(1, noise.length - 1));
  const noiseAt = (i) => noise[(noiseOffset + i) % noise.length];
  const bowGain = 0.02 * Math.pow(velocity, 1.2) * note.volume * (note.gain == null ? 1 : note.gain);

  let lp = 0;
  let env = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    if (i < attack) env = i / attack;
    else env = 1;
    if (i >= releaseStart) env *= releaseCoef;

    const currentF0 = pitchAt(t, {
      f0,
      slideFromF0,
      slideTime,
      graceF0,
      graceTime,
      bend: note.bend,
      bendTime: note.bendTime,
      trill: note.trill,
      trillRate: 8
    });

    const vibrato = 1 + vibDepth * Math.sin(vibPhase);
    let sample = 0;
    for (let n = 0; n < harmonicCount; n++) {
      const phase = phases[n];
      const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
      const fraction = phase * TABLE_SIZE - index;
      sample += (SINE[index] + (SINE[index + 1] - SINE[index]) * fraction) * amps[n];
      let next = phase + (currentF0 * (n + 1) * vibrato) / sampleRate;
      if (next >= 1) next -= 1;
      phases[n] = next;
    }

    lp += lpCoeff * (sample - lp);
    const bow = noiseAt(i) * bowGain;
    let fade = 1;
    if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
    const value = (lp + bow) * env * fade;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;

    vibPhase += vibInc;
    if (vibPhase > Math.PI * 2) vibPhase -= Math.PI * 2;
  }
}
