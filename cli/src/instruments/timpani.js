/**
 * timpani.js — 定音鼓。
 *
 * 有音高的膜振动 one-shot：几个非谐模态 + 槌击 + 长衰减；
 * 不吃踏板，音符结束后自然收尾。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

const MODES = [
  { ratio: 1, weight: 1.0, decay: 1.0 },
  { ratio: 1.5, weight: 0.32, decay: 0.7 },
  { ratio: 2.0, weight: 0.16, decay: 0.5 },
  { ratio: 2.7, weight: 0.08, decay: 0.35 }
];
const WEIGHT_SUM = MODES.reduce((sum, mode) => sum + mode.weight, 0);

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.12, rng, 0.28) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.55 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const baseT60 = clamp(2.4 * Math.pow(2, -(note.midi - 48) / 24), 1.2, 3.5);
  const attack = Math.max(1, Math.floor(sampleRate * 0.002));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.08));

  for (const mode of MODES) {
    const freq = f0 * mode.ratio;
    if (freq >= sampleRate * 0.45) break;
    const t60 = Math.max(0.4, baseT60 * mode.decay);
    const decay = Math.pow(0.001, 1 / Math.max(1, t60 * sampleRate));
    const amp = (level * mode.weight) / WEIGHT_SUM;
    const inc = freq / sampleRate;
    let phase = rng() * 0.15;
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
  const noiseGain = 0.06 * Math.pow(velocity, 1.4) * note.volume * (note.gain == null ? 1 : note.gain);
  const noiseLength = Math.min(length, noise.length);
  let noiseEnv = noiseGain;
  const noiseDecay = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.025));
  for (let i = 0; i < noiseLength; i++) {
    const value = noise[i] * noiseEnv;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
    noiseEnv *= noiseDecay;
  }
}
