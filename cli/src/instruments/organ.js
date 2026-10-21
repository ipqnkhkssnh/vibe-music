/**
 * organ.js — 拉杆风琴（Drawbar Organ）。
 *
 * 加法 drawbar 泛音 + 两组微失谐 bank + 键击 + 轻微合唱/颤音；
 * 按住持续，松键快速释放，不吃延音踏板。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

const DRAWBARS = [
  { ratio: 1, weight: 0.9 },
  { ratio: 2, weight: 1.0 },
  { ratio: 3, weight: 0.55 },
  { ratio: 4, weight: 0.4 },
  { ratio: 5, weight: 0.25 },
  { ratio: 6, weight: 0.18 },
  { ratio: 8, weight: 0.1 }
];
const WEIGHT_SUM = DRAWBARS.reduce((sum, bar) => sum + bar.weight, 0);
const BANKS = [
  { detune: 0, gain: 1.0 },
  { detune: 0.0015, gain: 0.38 }
];

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.04, rng, 0.42) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.42 * Math.pow(velocity, 1.0) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const attack = Math.max(1, Math.floor(sampleRate * 0.006));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.15));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.03));

  const vibRate = 5.1 + rng() * 0.6;
  const vibInc = (2 * Math.PI * vibRate) / sampleRate;
  let vibPhase = rng() * Math.PI * 2;

  const bankData = BANKS.map((bank) => {
    const phases = new Float64Array(DRAWBARS.length);
    const incs = new Float64Array(DRAWBARS.length);
    const amps = new Float64Array(DRAWBARS.length);
    for (let n = 0; n < DRAWBARS.length; n++) {
      const bar = DRAWBARS[n];
      phases[n] = rng();
      const freq = f0 * (1 + bank.detune) * bar.ratio;
      incs[n] = freq / sampleRate;
      amps[n] = freq >= sampleRate * 0.45 ? 0 : (level * bank.gain * bar.weight) / WEIGHT_SUM;
    }
    return { phases, incs, amps };
  });

  let env = 0;
  for (let i = 0; i < length; i++) {
    if (i < attack) env = i / attack;
    else env = 1;
    if (i >= releaseStart) env *= releaseCoef;

    const vibrato = 1 + 0.003 * Math.sin(vibPhase);
    const tremolo = 0.96 + 0.04 * Math.sin(vibPhase + 1.1);
    let sample = 0;
    for (const bank of bankData) {
      let bankSample = 0;
      for (let n = 0; n < DRAWBARS.length; n++) {
        const phase = bank.phases[n];
        const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
        const fraction = phase * TABLE_SIZE - index;
        bankSample += (SINE[index] + (SINE[index + 1] - SINE[index]) * fraction) * bank.amps[n];
        let next = phase + bank.incs[n] * vibrato;
        if (next >= 1) next -= 1;
        bank.phases[n] = next;
      }
      sample += bankSample;
    }

    let fade = 1;
    if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
    const value = sample * env * tremolo * fade;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;

    vibPhase += vibInc;
    if (vibPhase > Math.PI * 2) vibPhase -= Math.PI * 2;
  }

  // 键击：非常短的高频咔哒
  const noise = state.noise;
  const noiseGain = 0.035 * Math.pow(velocity, 1.4) * note.volume * (note.gain == null ? 1 : note.gain);
  const noiseLength = Math.min(length, noise.length);
  let noiseEnv = noiseGain;
  const noiseDecay = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.012));
  for (let i = 0; i < noiseLength; i++) {
    const value = noise[i] * noiseEnv;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
    noiseEnv *= noiseDecay;
  }
}
