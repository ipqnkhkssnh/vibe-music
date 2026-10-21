/**
 * piano.js — 原声钢琴渲染器（从旧 synth.js 抽出的同款音色）。
 */

import { clamp, midiToFreq, t60For } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

function partialAmps(midi, velocity) {
  const keyPos = clamp((midi - 21) / 87, 0, 1);
  const f0 = midiToFreq(midi);
  const T60 = t60For(midi);
  const B = 0.00016 * Math.pow(2, (midi - 36) / 16);
  const strike = 1 / (7.2 + keyPos * 1.8);
  const count = Math.round(22 - 10 * keyPos);
  const partials = [];
  let total = 0;

  for (let n = 1; n <= count; n++) {
    const fn = n * f0 * Math.sqrt(1 + B * n * n);
    if (fn > 14500) break;
    let amp = Math.pow(n, -(1.72 - 0.22 * keyPos));
    amp *= 0.58 + 0.42 * Math.abs(Math.sin(Math.PI * n * strike));
    if (amp < 0.00005) continue;
    amp *= Math.exp(-Math.pow(fn / 11500, 2));
    amp *= Math.pow(0.56 + 0.44 * velocity, 0.3 + 0.8 * (n / count));
    partials.push({ n, fn, amp });
    total += amp;
  }

  for (const partial of partials) partial.amp /= total || 1;
  return { keyPos, T60, partials };
}

function stringPlan(midi, keyPos) {
  const strings = midi < 33 ? 1 : midi < 45 ? 2 : 3;
  const spread = midi < 40 ? 0.35 : 0.8 + 2.0 * keyPos;
  if (strings === 1) return [{ detune: 0, weight: 1.06, decay: 1 }];
  if (strings === 2) {
    return [
      { detune: -spread, weight: 0.6, decay: 1 },
      { detune: spread, weight: 0.46, decay: 0.92 }
    ];
  }
  return [
    { detune: -spread, weight: 0.37, decay: 1 },
    { detune: 0, weight: 0.34, decay: 0.96 },
    { detune: spread, weight: 0.35, decay: 0.92 }
  ];
}

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 2.0, rng, 0.12) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.62 * Math.pow(velocity, 1.22) * note.volume * (note.gain == null ? 1 : note.gain);
  const { keyPos, T60, partials } = partialAmps(note.midi, velocity);
  const plan = stringPlan(note.midi, keyPos);
  const { left: panL, right: panR } = panGains(note.pan);

  const attackSamples = Math.max(1, Math.floor(sampleRate * 0.0032));
  const promptSamples = Math.max(attackSamples + 1, Math.floor(sampleRate * 0.1));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.00012, 1 / Math.max(1, sampleRate * 0.16));

  for (const partial of partials) {
    // 同一泛音的各根弦共享起始相位；不同泛音的相位与 Web 版一样，
    // 由 0–0.35ms 的随机起振时刻换算成相位，低频近似同相、高频被打散。
    const phaseOffset = (rng() * partial.fn * 0.00035) % 1;
    for (const str of plan) {
      const freq = partial.fn * Math.pow(2, str.detune / 1200);
      if (freq >= sampleRate * 0.45) continue;
      const increment = freq / sampleRate;
      const amp = level * partial.amp * str.weight;
      const t60 = Math.max(0.3, T60 / (1 + 0.135 * (partial.n - 1) + 0.3 * Math.pow(partial.fn / 2200, 0.8))) * str.decay;
      const promptCoef = Math.pow(0.55, 1 / (promptSamples - attackSamples));
      const tailSamples = Math.max(1, (t60 - 0.1) * sampleRate);
      const tailCoef = Math.pow(0.001 / 0.55, 1 / tailSamples);

      let phase = phaseOffset;
      let env = 0;
      const releaseSamples = Math.ceil(sampleRate * 0.17);
      const stop = Math.min(length, releaseStart === Infinity ? length : releaseStart + releaseSamples);
      let i = 0;

      if (releaseStart < promptSamples) {
        // 很短促的音：释放发生在 attack/prompt 阶段，用通用循环保证包络连续
        for (; i < stop; i++) {
          if (i < attackSamples) {
            env = amp * (i / attackSamples);
          } else if (i === attackSamples) {
            env = amp;
          } else if (i < promptSamples) {
            env *= promptCoef;
          } else {
            env *= tailCoef;
          }
          if (i >= releaseStart) env *= releaseCoef;

          const index = (phase * TABLE_SIZE) | 0;
          const fraction = phase * TABLE_SIZE - index;
          const sample = SINE[index] + (SINE[index + 1] - SINE[index]) * fraction;
          const value = sample * env;
          left[startSample + i] += value * panL;
          right[startSample + i] += value * panR;
          phase += increment;
          if (phase >= 1) phase -= 1;
        }
      } else {
        // 常规音：按 attack / prompt / tail / release 四段展开，去掉每采样分支
        const attackEnd = Math.min(attackSamples, stop);
        for (; i < attackEnd; i++) {
          env = amp * (i / attackSamples);
          const index = (phase * TABLE_SIZE) | 0;
          const fraction = phase * TABLE_SIZE - index;
          const sample = SINE[index] + (SINE[index + 1] - SINE[index]) * fraction;
          const value = sample * env;
          left[startSample + i] += value * panL;
          right[startSample + i] += value * panR;
          phase += increment;
          if (phase >= 1) phase -= 1;
        }

        if (i < stop) {
          env = amp;
          const promptEnd = Math.min(promptSamples, stop);
          for (; i < promptEnd; i++) {
            env *= promptCoef;
            const index = (phase * TABLE_SIZE) | 0;
            const fraction = phase * TABLE_SIZE - index;
            const sample = SINE[index] + (SINE[index + 1] - SINE[index]) * fraction;
            const value = sample * env;
            left[startSample + i] += value * panL;
            right[startSample + i] += value * panR;
            phase += increment;
            if (phase >= 1) phase -= 1;
          }

          if (i < stop) {
            const tailEnd = Math.min(releaseStart === Infinity ? stop : releaseStart, stop);
            for (; i < tailEnd; i++) {
              env *= tailCoef;
              const index = (phase * TABLE_SIZE) | 0;
              const fraction = phase * TABLE_SIZE - index;
              const sample = SINE[index] + (SINE[index + 1] - SINE[index]) * fraction;
              const value = sample * env;
              left[startSample + i] += value * panL;
              right[startSample + i] += value * panR;
              phase += increment;
              if (phase >= 1) phase -= 1;
            }

            if (i < stop) {
              for (; i < stop; i++) {
                env *= releaseCoef;
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
          }
        }
      }
    }
  }

  // 击弦噪声：短、亮，给每个音一个真实的“起音”
  const noise = state.noise;
  const noiseGain = 0.045 * Math.pow(velocity, 1.55) * note.volume * (note.gain == null ? 1 : note.gain);
  const maxNoise = Math.max(1, Math.ceil(sampleRate * 0.09));
  const noiseOffset = Math.floor(rng() * Math.max(1, noise.length - maxNoise));
  const noiseLength = Math.min(maxNoise, length, noise.length - noiseOffset);
  let noiseEnv = noiseGain;
  const noiseDecay = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.05));
  const noiseAttack = Math.max(1, Math.floor(sampleRate * 0.001));
  for (let i = 0; i < noiseLength; i++) {
    const attack = i < noiseAttack ? i / noiseAttack : 1;
    const value = noise[noiseOffset + i] * noiseEnv * attack;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
    noiseEnv *= noiseDecay;
  }
}
