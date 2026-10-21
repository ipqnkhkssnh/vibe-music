/**
 * accordion.js — 手风琴。
 *
 * 两组微失谐簧片 + 少量泛音 + 风箱噪声 + 轻微 tremolo；
 * 适合民谣、探戈、法式咖啡馆。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

const HARMONICS = [1, 2, 3, 4, 5, 6];
const BANKS = [
  { detune: -0.004, gain: 1.0 },
  { detune: 0.004, gain: 0.85 }
];

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.25, rng, 0.16) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.3 * Math.pow(velocity, 1.0) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const attack = Math.max(1, Math.floor(sampleRate * 0.04));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.15));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.03));

  const harmonicNorm = HARMONICS.reduce((sum, n) => sum + 1 / n, 0);
  const bankData = BANKS.map((bank) => {
    const phases = new Float64Array(HARMONICS.length);
    const incs = new Float64Array(HARMONICS.length);
    const amps = new Float64Array(HARMONICS.length);
    for (let i = 0; i < HARMONICS.length; i++) {
      const n = HARMONICS[i];
      const freq = f0 * (1 + bank.detune) * n;
      phases[i] = rng();
      incs[i] = freq / sampleRate;
      amps[i] = freq >= sampleRate * 0.45 ? 0 : (level * bank.gain * (1 / n)) / harmonicNorm;
    }
    return { phases, incs, amps };
  });

  const tremoloRate = 5.0 + rng() * 0.7;
  const tremoloInc = (2 * Math.PI * tremoloRate) / sampleRate;
  let tremoloPhase = rng() * Math.PI * 2;

  const noise = state.noise;
  const noiseOffset = Math.floor(rng() * Math.max(1, noise.length - 1));
  const noiseAt = (i) => noise[(noiseOffset + i) % noise.length];
  const bellowsGain = 0.02 * Math.pow(velocity, 1.2) * note.volume * (note.gain == null ? 1 : note.gain);

  let env = 0;
  for (let i = 0; i < length; i++) {
    if (i < attack) env = i / attack;
    else env = 1;
    if (i >= releaseStart) env *= releaseCoef;

    const tremolo = 0.94 + 0.06 * Math.sin(tremoloPhase + tremoloInc * i);
    let sample = 0;
    for (const bank of bankData) {
      for (let n = 0; n < HARMONICS.length; n++) {
        const phase = bank.phases[n];
        const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
        const fraction = phase * TABLE_SIZE - index;
        sample += (SINE[index] + (SINE[index + 1] - SINE[index]) * fraction) * bank.amps[n];
        let next = phase + bank.incs[n];
        if (next >= 1) next -= 1;
        bank.phases[n] = next;
      }
    }

    const bellows = noiseAt(i) * bellowsGain;
    let fade = 1;
    if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
    const value = (sample + bellows) * env * tremolo * fade;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
  }
}
