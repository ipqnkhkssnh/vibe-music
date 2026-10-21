/**
 * bass.js — 电贝斯。
 *
 * 厚实基频 + 低通谐波 + 短促拨弦噪声；有制音器，松键后快速止音。
 * 适合 lofi、jazz、流行低音，不建议和钢琴低音同时抢同一频段。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.05, rng, 0.2) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.52 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const harmonicCount = Math.max(2, Math.min(8, Math.floor(2200 / f0)));
  const harmonicNorm = (() => {
    let sum = 0;
    for (let n = 1; n <= harmonicCount; n++) sum += n === 1 ? 1.15 : 1 / n;
    return sum;
  })();

  const phases = new Float64Array(harmonicCount);
  const incs = new Float64Array(harmonicCount);
  const amps = new Float64Array(harmonicCount);
  for (let n = 1; n <= harmonicCount; n++) {
    phases[n - 1] = rng();
    incs[n - 1] = (f0 * n) / sampleRate;
    const harmonicAmp = n === 1 ? 1.15 : 1 / n;
    amps[n - 1] = (level * harmonicAmp) / harmonicNorm;
  }

  const t60 = clamp(7.0 * Math.pow(2, -(note.midi - 48) / 24), 2.5, 9.0);
  const decay = Math.pow(0.001, 1 / Math.max(1, t60 * sampleRate));
  const attack = Math.max(1, Math.floor(sampleRate * 0.004));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.18));

  const cutoff = clamp(350 + 1800 * velocity, 300, Math.min(3000, sampleRate * 0.42));
  const lpCoeff = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.04));

  let lp = 0;
  let env = 0;
  for (let i = 0; i < length; i++) {
    if (i < attack) env = i / attack;
    else env *= decay;
    if (i >= releaseStart) env *= releaseCoef;

    let sample = 0;
    for (let n = 0; n < harmonicCount; n++) {
      const phase = phases[n];
      const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
      const fraction = phase * TABLE_SIZE - index;
      sample += (SINE[index] + (SINE[index + 1] - SINE[index]) * fraction) * amps[n];
      let next = phase + incs[n];
      if (next >= 1) next -= 1;
      phases[n] = next;
    }

    lp += lpCoeff * (sample - lp);
    let fade = 1;
    if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
    const value = lp * env * fade;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
  }

  // 拨弦噪声
  const noise = state.noise;
  const noiseGain = 0.04 * Math.pow(velocity, 1.5) * note.volume * (note.gain == null ? 1 : note.gain);
  const noiseLength = Math.min(length, noise.length);
  let noiseEnv = noiseGain;
  const noiseDecay = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.02));
  for (let i = 0; i < noiseLength; i++) {
    const value = noise[i] * noiseEnv;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
    noiseEnv *= noiseDecay;
  }
}
