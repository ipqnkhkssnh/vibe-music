/**
 * pad.js — 慢起音暖垫 / 弦垫。
 *
 * 三组微失谐的锯齿谐波 + 低通 + 慢起音 + 长释放；
 * 音符没有自然衰减，按住会持续，松键后慢慢淡出。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains } from './common.js';

const VOICES = [
  { detune: -6.5, pan: -0.22, weight: 0.8 },
  { detune: 0, pan: 0, weight: 1.0 },
  { detune: 6.5, pan: 0.22, weight: 0.8 }
];

export function prepare() {
  return {};
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.16 * Math.pow(velocity, 0.9) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const basePan = clamp(note.pan, -1, 1);

  const attackSamples = Math.max(1, Math.floor(sampleRate * 0.38));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 1.5));

  const harmonicCount = Math.max(2, Math.min(10, Math.floor((sampleRate * 0.42) / f0)));
  const harmonicNorm = (() => {
    let sum = 0;
    for (let n = 1; n <= harmonicCount; n++) sum += 1 / n;
    return sum;
  })();

  const cutoff = clamp(900 + 3200 * velocity, 700, Math.min(6000, sampleRate * 0.42));
  const lpCoeff = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);

  for (const voice of VOICES) {
    const detune = Math.pow(2, voice.detune / 1200);
    const { left: panL, right: panR } = panGains(clamp(basePan + voice.pan, -1, 1));
    const phases = new Float64Array(harmonicCount);
    const incs = new Float64Array(harmonicCount);
    const amps = new Float64Array(harmonicCount);
    for (let n = 1; n <= harmonicCount; n++) {
      phases[n - 1] = rng();
      incs[n - 1] = (f0 * detune * n) / sampleRate;
      const harmonicAmp = n === 1 ? 1.25 : 1 / n;
      amps[n - 1] = (level * voice.weight * harmonicAmp) / harmonicNorm;
    }

    const lfoRate = 0.07 + rng() * 0.08;
    const lfoInc = (2 * Math.PI * lfoRate) / sampleRate;
    let lfoPhase = rng() * Math.PI * 2;
    let lp = 0;
    let env = 0;

    for (let i = 0; i < length; i++) {
      if (i < attackSamples) env = i / attackSamples;
      else env = 1;
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
      const lfo = 0.92 + 0.08 * Math.sin(lfoPhase);
      const value = lp * env * lfo;
      left[startSample + i] += value * panL;
      right[startSample + i] += value * panR;

      lfoPhase += lfoInc;
      if (lfoPhase > Math.PI * 2) lfoPhase -= Math.PI * 2;
    }
  }
}
