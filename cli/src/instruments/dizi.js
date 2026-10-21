/**
 * dizi.js — 笛子。
 *
 * 气声 + 明亮泛音 + 笛膜 buzz + 揉弦/滑音；
 * 用 track 的 vibrato 控制揉弦深度，slide 控制滑音时间。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';
import { pitchAt } from '../articulation.js';

const HARMONICS = [
  { ratio: 1, weight: 1.0 },
  { ratio: 2, weight: 0.42 },
  { ratio: 3, weight: 0.24 },
  { ratio: 4, weight: 0.14 },
  { ratio: 5, weight: 0.08 },
  { ratio: 6, weight: 0.05 }
];

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.4, rng, 0.3) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.3 * Math.pow(velocity, 1.05) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const slideFromF0 = note.slideFromMidi == null ? null : midiToFreq(note.slideFromMidi);
  const slideTime = slideFromF0 == null ? 0 : Math.max(0, Math.min(note.slide || 0, length / sampleRate));
  const graceF0 = note.graceFromMidi == null ? null : midiToFreq(note.graceFromMidi);
  const graceTime = graceF0 == null ? 0 : 0.06;
  const { left: panL, right: panR } = panGains(note.pan);

  const attack = Math.max(1, Math.floor(sampleRate * 0.03));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.15));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.025));

  const partials = HARMONICS
    .map((harmonic) => ({ ...harmonic, freq: f0 * harmonic.ratio }))
    .filter((partial) => partial.freq < sampleRate * 0.45);
  let total = 0;
  for (const partial of partials) total += partial.weight;

  const phases = new Float64Array(partials.length);
  const amps = new Float64Array(partials.length);
  for (let i = 0; i < partials.length; i++) {
    phases[i] = rng();
    amps[i] = (level * partials[i].weight) / (total || 1);
  }

  const vibRate = 5.2 + rng() * 0.8;
  const vibInc = (2 * Math.PI * vibRate) / sampleRate;
  const vibDepth = 0.0018 + (note.vibrato || 0) * 0.004;
  let vibPhase = rng() * Math.PI * 2;

  const noise = state.noise;
  const noiseOffset = Math.floor(rng() * Math.max(1, noise.length - 1));
  const noiseAt = (i) => noise[(noiseOffset + i) % noise.length];
  const breathGain = 0.035 * Math.pow(velocity, 1.2) * note.volume * (note.gain == null ? 1 : note.gain);
  const buzzGain = 0.028 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);

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
    for (let n = 0; n < partials.length; n++) {
      const phase = phases[n];
      const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
      const fraction = phase * TABLE_SIZE - index;
      sample += (SINE[index] + (SINE[index + 1] - SINE[index]) * fraction) * amps[n];
      let next = phase + (currentF0 * partials[n].ratio * vibrato) / sampleRate;
      if (next >= 1) next -= 1;
      phases[n] = next;
    }

    const breath = noiseAt(i) * (breathGain + buzzGain * Math.abs(Math.sin(2 * Math.PI * currentF0 * t)));
    const chiff = t < 0.05 ? noiseAt(i) * Math.exp(-t * 55) * level * 0.25 : 0;
    let fade = 1;
    if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
    const value = (sample + breath) * env * fade + chiff;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;

    vibPhase += vibInc;
    if (vibPhase > Math.PI * 2) vibPhase -= Math.PI * 2;
  }
}
