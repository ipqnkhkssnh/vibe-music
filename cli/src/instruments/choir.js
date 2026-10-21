/**
 * choir.js — 风格化合唱“啊”。
 *
 * 多声部失谐锯齿 + 三个元音 formant 带通 + 呼吸噪声；
 * 慢起音、长释放，适合铺底/电影感。不是真人歌词。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

const VOICES = [
  { detune: -8, pan: -0.24, weight: 0.7 },
  { detune: -3, pan: -0.08, weight: 0.95 },
  { detune: 3, pan: 0.08, weight: 1.0 },
  { detune: 8, pan: 0.24, weight: 0.7 }
];
const FORMANTS = [
  { freq: 700, q: 7.0, gain: 1.0 },
  { freq: 1200, q: 9.0, gain: 0.7 },
  { freq: 2800, q: 12.0, gain: 0.4 }
];

function bandpassCoefficients(freq, q, sampleRate) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cosw = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * cosw) / a0,
    a2: (1 - alpha) / a0
  };
}

export function prepare(sampleRate, rng) {
  return {
    noise: makeNoiseBuffer(sampleRate, 0.4, rng, 0.12),
    formants: FORMANTS.map((formant) => ({
      ...formant,
      ...bandpassCoefficients(formant.freq, formant.q, sampleRate)
    }))
  };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.4 * Math.pow(velocity, 0.9) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const basePan = clamp(note.pan, -1, 1);

  const attack = Math.max(1, Math.floor(sampleRate * 0.35));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 1.2));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.06));

  const harmonicCount = Math.max(3, Math.min(10, Math.floor((sampleRate * 0.42) / f0)));
  const harmonicNorm = (() => {
    let sum = 0;
    for (let n = 1; n <= harmonicCount; n++) sum += 1 / n;
    return sum;
  })();

  const noise = state.noise;
  const noiseOffset = Math.floor(rng() * Math.max(1, noise.length - 1));
  const noiseAt = (i) => noise[(noiseOffset + i) % noise.length];
  const breathGain = 0.02 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);

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

    const vibRate = 4.4 + rng() * 0.8;
    const vibInc = (2 * Math.PI * vibRate) / sampleRate;
    const vibDepth = 0.0025;
    let vibPhase = rng() * Math.PI * 2;

    const filters = state.formants.map((formant) => ({
      ...formant,
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 0
    }));

    let env = 0;
    for (let i = 0; i < length; i++) {
      if (i < attack) env = i / attack;
      else env = 1;
      if (i >= releaseStart) env *= releaseCoef;

      const vibrato = 1 + vibDepth * Math.sin(vibPhase);
      let saw = 0;
      for (let n = 0; n < harmonicCount; n++) {
        const phase = phases[n];
        const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
        const fraction = phase * TABLE_SIZE - index;
        saw += (SINE[index] + (SINE[index + 1] - SINE[index]) * fraction) * amps[n];
        let next = phase + incs[n] * vibrato;
        if (next >= 1) next -= 1;
        phases[n] = next;
      }

      let voiced = 0;
      for (const filter of filters) {
        const y = filter.b0 * saw + filter.b1 * filter.x1 + filter.b2 * filter.x2 -
          filter.a1 * filter.y1 - filter.a2 * filter.y2;
        filter.x2 = filter.x1;
        filter.x1 = saw;
        filter.y2 = filter.y1;
        filter.y1 = y;
        voiced += y * filter.gain;
      }

      let fade = 1;
      if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
      const value = (voiced + noiseAt(i) * breathGain) * env * fade;
      left[startSample + i] += value * panL;
      right[startSample + i] += value * panR;

      vibPhase += vibInc;
      if (vibPhase > Math.PI * 2) vibPhase -= Math.PI * 2;
    }
  }
}
