/**
 * musicbox.js — 音乐盒 / 钢片琴音色。
 *
 * 清亮的非谐分音 + 快速起音 + 自然衰减，没有制音器；
 * 适合助眠、童话、点缀，和 pad 叠加效果很好。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

const RATIOS = [1, 2.01, 3.03, 4.19, 5.45, 7.08, 9.15, 11.4];
const WEIGHTS = [1, 0.38, 0.2, 0.11, 0.065, 0.04, 0.025, 0.015];
const WEIGHT_SUM = WEIGHTS.reduce((sum, value) => sum + value, 0);

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.08, rng, 0.35) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.55 * Math.pow(velocity, 1.12) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const baseT60 = clamp(3.4 * Math.pow(2, -(note.midi - 60) / 22), 0.9, 6.5);
  const attackSamples = Math.max(1, Math.floor(sampleRate * 0.002));
  const brightness = 0.55 + 0.45 * velocity;

  for (let n = 0; n < RATIOS.length; n++) {
    const freq = f0 * RATIOS[n];
    if (freq >= sampleRate * 0.45) break;
    const t60 = Math.max(0.3, baseT60 / (1 + 0.42 * n));
    const amp = (level * WEIGHTS[n] * Math.pow(brightness, n * 0.15)) / WEIGHT_SUM;
    const decay = Math.pow(0.001, 1 / Math.max(1, t60 * sampleRate));
    const increment = freq / sampleRate;
    let phase = rng() * 0.15;
    let env = 0;

    for (let i = 0; i < length; i++) {
      if (i < attackSamples) env = amp * (i / attackSamples);
      else env *= decay;

      const index = (phase * TABLE_SIZE) | 0;
      const fraction = phase * TABLE_SIZE - index;
      const sample = SINE[index] + (SINE[index + 1] - SINE[index]) * fraction;
      const value = sample * env;
      left[startSample + i] += value * panL;
      right[startSample + i] += value * panR;
      phase += increment;
      if (phase >= 1) phase -= 1;
    }
  }

  // 齿/槌的短促金属起音
  const noise = state.noise;
  const noiseGain = 0.05 * Math.pow(velocity, 1.5) * note.volume * (note.gain == null ? 1 : note.gain);
  const noiseLength = Math.min(length, noise.length);
  let noiseEnv = noiseGain;
  const noiseDecay = Math.pow(0.0003, 1 / Math.max(1, sampleRate * 0.03));
  for (let i = 0; i < noiseLength; i++) {
    const value = noise[i] * noiseEnv;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
    noiseEnv *= noiseDecay;
  }
}
