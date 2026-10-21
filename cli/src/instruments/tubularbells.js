/**
 * tubularbells.js — 管钟。
 *
 * 非谐金属模态 + 长衰减 + 槌击；自然衰减，不吃踏板。
 * 适合电影感、悬疑、教堂。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

const MODES = [
  { ratio: 1, weight: 1.0, decay: 1.0 },
  { ratio: 2.76, weight: 0.45, decay: 0.7 },
  { ratio: 5.4, weight: 0.25, decay: 0.5 },
  { ratio: 8.9, weight: 0.12, decay: 0.35 },
  { ratio: 13.3, weight: 0.06, decay: 0.25 }
];
const WEIGHT_SUM = MODES.reduce((sum, mode) => sum + mode.weight, 0);

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.08, rng, 0.35) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.42 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const baseT60 = clamp(6.5 * Math.pow(2, -(note.midi - 60) / 24), 2.0, 9.0);
  const attack = Math.max(1, Math.floor(sampleRate * 0.002));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.12));

  for (const mode of MODES) {
    const freq = f0 * mode.ratio;
    if (freq >= sampleRate * 0.45) break;
    const t60 = Math.max(0.5, baseT60 * mode.decay);
    const decay = Math.pow(0.001, 1 / Math.max(1, t60 * sampleRate));
    const amp = (level * mode.weight) / WEIGHT_SUM;
    const inc = freq / sampleRate;
    let phase = rng() * 0.2;
    let env = 0;

    for (let i = 0; i < length; i++) {
      if (i < attack) env = amp * (i / attack);
      else env *= decay;

      const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
      const fraction = phase * TABLE_SIZE - index;
      const sample = SINE[index] + (SINE[index + 1] - SINE[index]) * fraction;
      let fade = 1;
      if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
      const value = sample * env * fade;
      left[startSample + i] += value * panL;
      right[startSample + i] += value * panR;

      phase += inc;
      if (phase >= 1) phase -= 1;
    }
  }

  // 槌击噪声
  const noise = state.noise;
  const noiseGain = 0.05 * Math.pow(velocity, 1.4) * note.volume * (note.gain == null ? 1 : note.gain);
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
