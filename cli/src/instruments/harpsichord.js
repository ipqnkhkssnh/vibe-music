/**
 * harpsichord.js — 羽管键琴。
 *
 * 明亮 Karplus-Strong 拨弦 + 短促拨片噪声；
 * 自然衰减，不吃延音踏板。
 */

import { clamp, midiToFreq } from '../music.js';
import { panGains, makeNoiseBuffer } from './common.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.25, rng, 0.3) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.48 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);

  const targetDelay = Math.max(2.2, sampleRate / f0 - 0.22);
  const N = Math.max(1, Math.floor(targetDelay));
  const fraction = targetDelay - N;
  const bufferLength = N + 2;
  const string = new Float32Array(bufferLength);

  const noise = state.noise;
  const offset = Math.floor(rng() * Math.max(1, noise.length - bufferLength));
  let lp = 0;
  const excitationLp = 0.22 + 0.4 * velocity;
  for (let i = 0; i < bufferLength; i++) {
    const white = noise[offset + i] || 0;
    lp += excitationLp * (white - lp);
    string[i] = lp;
  }
  const pluckOffset = Math.max(1, Math.floor(N * 0.12));
  for (let i = bufferLength - 1; i >= pluckOffset; i--) {
    string[i] -= 0.55 * string[i - pluckOffset];
  }

  let peak = 0;
  for (let i = 0; i < bufferLength; i++) peak = Math.max(peak, Math.abs(string[i]));
  if (peak > 0) {
    const scale = 0.8 / peak;
    for (let i = 0; i < bufferLength; i++) string[i] *= scale;
  }

  const t60 = clamp(2.8 * Math.pow(2, -(note.midi - 60) / 26), 0.8, 4.5);
  const feedback = Math.pow(0.001, targetDelay / (t60 * sampleRate));
  const fadeIn = Math.max(1, Math.floor(sampleRate * 0.0015));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.08));

  let writeIndex = 0;
  let last = 0;
  for (let i = 0; i < length; i++) {
    let readPos = writeIndex - N - fraction;
    while (readPos < 0) readPos += bufferLength;
    const base = Math.floor(readPos);
    const i0 = base % bufferLength;
    const i1 = (i0 + 1) % bufferLength;
    const frac = readPos - base;
    const out = string[i0] + (string[i1] - string[i0]) * frac;

    const filtered = out * 0.84 + last * 0.16;
    last = out;
    string[writeIndex] = filtered * feedback;
    writeIndex = (writeIndex + 1) % bufferLength;

    let fade = 1;
    if (i < fadeIn) fade = i / fadeIn;
    if (i > length - fadeOut) fade = Math.min(fade, (length - i) / fadeOut);

    const value = out * level * fade;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
  }

  // 拨片/羽毛的短促噪声
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
