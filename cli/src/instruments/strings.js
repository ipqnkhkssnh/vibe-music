/**
 * strings.js — 弦乐合奏。
 *
 * 四组微失谐弓弦 + 慢起音 + 揉弦 + 运弓噪声；
 * 按住持续，松键后长释放，不吃延音踏板。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

const VOICES = [
  { detune: -7, pan: -0.24, weight: 0.7 },
  { detune: -2.5, pan: -0.08, weight: 0.95 },
  { detune: 2.5, pan: 0.08, weight: 1.0 },
  { detune: 7, pan: 0.24, weight: 0.7 }
];

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.25, rng, 0.15) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.18 * Math.pow(velocity, 0.9) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const basePan = clamp(note.pan, -1, 1);

  const attack = Math.max(1, Math.floor(sampleRate * 0.3));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.9));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.05));

  const harmonicCount = Math.max(3, Math.min(10, Math.floor((sampleRate * 0.42) / f0)));
  const harmonicNorm = (() => {
    let sum = 0;
    for (let n = 1; n <= harmonicCount; n++) sum += 1 / n;
    return sum;
  })();
  const cutoff = clamp(800 + 2800 * velocity, 700, Math.min(6000, sampleRate * 0.42));
  const lpCoeff = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  const { left: noisePanL, right: noisePanR } = panGains(basePan);

  for (const voice of VOICES) {
    const detune = Math.pow(2, voice.detune / 1200);
    const { left: panL, right: panR } = panGains(clamp(basePan + voice.pan, -1, 1));
    const phases = new Float64Array(harmonicCount);
    const incs = new Float64Array(harmonicCount);
    const amps = new Float64Array(harmonicCount);
    for (let n = 1; n <= harmonicCount; n++) {
      phases[n - 1] = rng();
      incs[n - 1] = (f0 * detune * n) / sampleRate;
      amps[n - 1] = (level * voice.weight * (1 / n)) / harmonicNorm;
    }

    const vibRate = 4.5 + rng() * 0.9;
    const vibInc = (2 * Math.PI * vibRate) / sampleRate;
    const vibDepth = 0.0025 + rng() * 0.0015;
    let vibPhase = rng() * Math.PI * 2;

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
      let fade = 1;
      if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
      const value = lp * env * fade;
      left[startSample + i] += value * panL;
      right[startSample + i] += value * panR;

      vibPhase += vibInc;
      if (vibPhase > Math.PI * 2) vibPhase -= Math.PI * 2;
    }
  }

  // 运弓起始的轻微噪声
  const noise = state.noise;
  const noiseGain = 0.018 * Math.pow(velocity, 1.2) * note.volume * (note.gain == null ? 1 : note.gain);
  const noiseLength = Math.min(length, Math.floor(sampleRate * 0.18));
  let noiseEnv = noiseGain;
  const noiseDecay = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.12));
  for (let i = 0; i < noiseLength; i++) {
    const value = noise[i] * noiseEnv;
    left[startSample + i] += value * noisePanL;
    right[startSample + i] += value * noisePanR;
    noiseEnv *= noiseDecay;
  }
}
