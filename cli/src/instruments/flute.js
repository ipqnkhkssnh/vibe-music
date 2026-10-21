/**
 * flute.js — 长笛。
 *
 * 正弦基频 + 少量泛音 + 连续呼吸噪声 + 起音 chiff + 揉弦；
 * 按住持续，松键快速释放，不吃延音踏板。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

const HARMONICS = [
  { ratio: 1, weight: 1.0 },
  { ratio: 2, weight: 0.28 },
  { ratio: 3, weight: 0.12 },
  { ratio: 4, weight: 0.05 }
];

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.4, rng, 0.24) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.3 * Math.pow(velocity, 1.05) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const attack = Math.max(1, Math.floor(sampleRate * 0.05));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.12));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.02));

  const vibratoRate = 4.8 + rng() * 0.7;
  const vibratoInc = (2 * Math.PI * vibratoRate) / sampleRate;
  let vibratoPhase = rng() * Math.PI * 2;
  const vibratoDepth = 0.0025;

  const partials = HARMONICS
    .map((harmonic) => ({ ...harmonic, freq: f0 * harmonic.ratio }))
    .filter((partial) => partial.freq < sampleRate * 0.45);

  const phases = new Float64Array(partials.length);
  const incs = new Float64Array(partials.length);
  const amps = new Float64Array(partials.length);
  let total = 0;
  for (const partial of partials) total += partial.weight;
  partials.forEach((partial, index) => {
    phases[index] = rng();
    incs[index] = partial.freq / sampleRate;
    amps[index] = (level * partial.weight) / (total || 1);
  });

  const noise = state.noise;
  const noiseOffset = Math.floor(rng() * Math.max(1, noise.length - 1));
  const noiseAt = (i) => noise[(noiseOffset + i) % noise.length];
  const breathGain = 0.045 * Math.pow(velocity, 1.2) * note.volume * (note.gain == null ? 1 : note.gain);

  let env = 0;
  for (let i = 0; i < length; i++) {
    if (i < attack) env = i / attack;
    else env = 1;
    if (i >= releaseStart) env *= releaseCoef;

    const vibrato = 1 + vibratoDepth * Math.sin(vibratoPhase);
    let sample = 0;
    for (let n = 0; n < partials.length; n++) {
      const phase = phases[n];
      const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
      const fraction = phase * TABLE_SIZE - index;
      sample += (SINE[index] + (SINE[index + 1] - SINE[index]) * fraction) * amps[n];
      let next = phase + incs[n] * vibrato;
      if (next >= 1) next -= 1;
      phases[n] = next;
    }

    const t = i / sampleRate;
    const breath = noiseAt(i) * breathGain * Math.min(1, t / 0.02) * env;
    const chiff = t < 0.06 ? noiseAt(i) * Math.exp(-t * 45) * level * 0.35 : 0;
    let fade = 1;
    if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
    const value = (sample * env + breath) * fade + chiff * (1 - Math.min(1, i / (sampleRate * 0.06)));
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;

    vibratoPhase += vibratoInc;
    if (vibratoPhase > Math.PI * 2) vibratoPhase -= Math.PI * 2;
  }
}
