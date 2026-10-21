/**
 * epiano.js — FM 电钢琴（Rhodes / Wurlitzer 风格）。
 *
 * 一个 FM 琴体 + 一个短促的 tine 高音 + 轻微 tremolo；
 * 力度越大，FM index 越高、起音越亮。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.06, rng, 0.5) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.5 * Math.pow(velocity, 1.15) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const t60 = clamp(6.5 * Math.pow(2, -(note.midi - 60) / 30), 2.5, 8.0);
  const attackSamples = Math.max(1, Math.floor(sampleRate * 0.003));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.35));
  const bodyDecay = Math.pow(0.001, 1 / Math.max(1, t60 * sampleRate));

  const carrierInc = f0 / sampleRate;
  const modInc = (f0 * 2.0) / sampleRate;
  let carrierPhase = rng() * 0.1;
  let modPhase = rng() * 0.1;

  // 高音区减少 FM 边带，避免超出 Nyquist 的混叠
  const fmScale = clamp(2400 / f0, 0.25, 1);
  let index = (2.2 + 2.6 * velocity) * fmScale;
  const indexCoef = Math.pow(0.15 / Math.max(0.2, index), 1 / Math.max(1, sampleRate * 0.45));

  // tine 高音：短促、清脆
  const pingFreq = f0 * 6.5;
  const pingInc = pingFreq / sampleRate;
  const pingEnabled = pingFreq < sampleRate * 0.45;
  let pingPhase = rng() * 0.2;
  let pingEnv = 0.08 * Math.pow(velocity, 1.2);
  const pingDecay = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.28));

  // 轻微 tremolo
  const tremoloRate = 4.5 + rng() * 0.8;
  const tremoloInc = (2 * Math.PI * tremoloRate) / sampleRate;
  let tremoloPhase = rng() * Math.PI * 2;

  let env = 0;
  for (let i = 0; i < length; i++) {
    if (i < attackSamples) env = i / attackSamples;
    else env *= bodyDecay;
    if (i >= releaseStart) env *= releaseCoef;

    // 调制器 -> 载波
    const modIndex = (modPhase * TABLE_SIZE) | 0;
    const mod = SINE[modIndex] + (SINE[modIndex + 1] - SINE[modIndex]) * (modPhase * TABLE_SIZE - modIndex);
    let carrierAngle = carrierPhase + index * mod;
    carrierAngle -= Math.floor(carrierAngle);
    const carrierIndex = (carrierAngle * TABLE_SIZE) | 0;
    const carrier = SINE[carrierIndex] + (SINE[carrierIndex + 1] - SINE[carrierIndex]) * (carrierAngle * TABLE_SIZE - carrierIndex);

    const tremolo = 1 + 0.07 * Math.sin(tremoloPhase);
    let sample = carrier * env * tremolo;

    if (pingEnabled && i < sampleRate * 0.8) {
      const pingIndex = (pingPhase * TABLE_SIZE) | 0;
      const ping = SINE[pingIndex] + (SINE[pingIndex + 1] - SINE[pingIndex]) * (pingPhase * TABLE_SIZE - pingIndex);
      sample += ping * pingEnv * tremolo;
      pingEnv *= pingDecay;
      pingPhase += pingInc;
      if (pingPhase >= 1) pingPhase -= 1;
    }

    const value = sample * level;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;

    carrierPhase += carrierInc;
    if (carrierPhase >= 1) carrierPhase -= 1;
    modPhase += modInc;
    if (modPhase >= 1) modPhase -= 1;
    index *= indexCoef;
    tremoloPhase += tremoloInc;
    if (tremoloPhase > Math.PI * 2) tremoloPhase -= Math.PI * 2;
  }

  // 短促 tine 咔哒声
  const noise = state.noise;
  const noiseGain = 0.035 * Math.pow(velocity, 1.5) * note.volume * (note.gain == null ? 1 : note.gain);
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
