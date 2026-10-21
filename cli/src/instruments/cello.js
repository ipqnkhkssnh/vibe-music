/**
 * cello.js — 独奏大提琴。
 *
 * 单声部弓弦 + 揉弦 + 运弓噪声 + 琴体低通；
 * 按住持续，松键 0.6 秒释放，不吃延音踏板。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.3, rng, 0.14) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.3 * Math.pow(velocity, 0.95) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const attack = Math.max(1, Math.floor(sampleRate * 0.18));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.6));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.04));

  const harmonicCount = Math.max(3, Math.min(10, Math.floor((sampleRate * 0.42) / f0)));
  const harmonicNorm = (() => {
    let sum = 0;
    for (let n = 1; n <= harmonicCount; n++) sum += 1 / n;
    return sum;
  })();
  const cutoff = clamp(900 + 2200 * velocity, 700, Math.min(5000, sampleRate * 0.42));
  const lpCoeff = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);

  const phases = new Float64Array(harmonicCount);
  const incs = new Float64Array(harmonicCount);
  const amps = new Float64Array(harmonicCount);
  for (let n = 1; n <= harmonicCount; n++) {
    phases[n - 1] = rng();
    incs[n - 1] = (f0 * n) / sampleRate;
    amps[n - 1] = (level * (1 / n)) / harmonicNorm;
  }

  const vibRate = 4.8 + rng() * 0.6;
  const vibInc = (2 * Math.PI * vibRate) / sampleRate;
  const vibDepth = 0.004;
  let vibPhase = rng() * Math.PI * 2;

  const noise = state.noise;
  const noiseOffset = Math.floor(rng() * Math.max(1, noise.length - 1));
  const noiseAt = (i) => noise[(noiseOffset + i) % noise.length];
  const bowGain = 0.022 * Math.pow(velocity, 1.2) * note.volume * (note.gain == null ? 1 : note.gain);

  let lp = 0;
  let env = 0;
  for (let i = 0; i < length; i++) {
    if (i < attack) env = i / attack;
    else env = 1;
    if (i >= releaseStart) env *= releaseCoef;

    const vibrato = 1 + vibDepth * Math.sin(vibPhase);
    let sample = 0;
    for (let n = 0; n < harmonicCount; n++) {
      const phase = phases[n];
      const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
      const fraction = phase * TABLE_SIZE - index;
      sample += (SINE[index] + (SINE[index + 1] - SINE[index]) * fraction) * amps[n];
      let next = phase + incs[n] * vibrato;
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
