/**
 * upright.js — 低音提琴（Upright Bass）。
 *
 * 低音拨弦 + 琴体共鸣 + 指板噪声；松键快速制音，适合爵士/bluegrass。
 */

import { clamp, midiToFreq } from '../music.js';
import { panGains, makeNoiseBuffer } from './common.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.3, rng, 0.16) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.58 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);
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
  const excitationLp = 0.08 + 0.22 * velocity;
  for (let i = 0; i < bufferLength; i++) {
    const white = noise[offset + i] || 0;
    lp += excitationLp * (white - lp);
    string[i] = lp;
  }
  const pluckOffset = Math.max(1, Math.floor(N * 0.25));
  for (let i = bufferLength - 1; i >= pluckOffset; i--) {
    string[i] -= 0.4 * string[i - pluckOffset];
  }

  let peak = 0;
  for (let i = 0; i < bufferLength; i++) peak = Math.max(peak, Math.abs(string[i]));
  if (peak > 0) {
    const scale = 0.75 / peak;
    for (let i = 0; i < bufferLength; i++) string[i] *= scale;
  }

  const t60 = clamp(4.2 * Math.pow(2, -(note.midi - 40) / 24), 1.8, 6.0);
  const feedback = Math.pow(0.001, targetDelay / (t60 * sampleRate));
  const releaseStart = Number.isFinite(note.release)
    ? Math.max(0, Math.floor((note.release - note.start) * sampleRate))
    : Infinity;
  const releaseCoef = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.25));
  const fadeIn = Math.max(1, Math.floor(sampleRate * 0.003));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.06));

  let writeIndex = 0;
  let last = 0;
  let body = 0;
  let env = 1;
  for (let i = 0; i < length; i++) {
    let readPos = writeIndex - N - fraction;
    while (readPos < 0) readPos += bufferLength;
    const base = Math.floor(readPos);
    const i0 = base % bufferLength;
    const i1 = (i0 + 1) % bufferLength;
    const frac = readPos - base;
    const out = string[i0] + (string[i1] - string[i0]) * frac;

    const filtered = out * 0.78 + last * 0.22;
    last = out;
    string[writeIndex] = filtered * feedback;
    writeIndex = (writeIndex + 1) % bufferLength;

    if (i >= releaseStart) env *= releaseCoef;

    // 琴体低通，给低音一点木头/羊肠弦的厚度
    body += 0.035 * (out - body);
    const voiced = out * 0.65 + body * 0.45;

    let fade = 1;
    if (i < fadeIn) fade = i / fadeIn;
    if (i > length - fadeOut) fade = Math.min(fade, (length - i) / fadeOut);

    const value = voiced * env * level * fade;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
  }

  // 手指/指板噪声
  const fingerGain = 0.035 * Math.pow(velocity, 1.4) * note.volume * (note.gain == null ? 1 : note.gain);
  const noiseLength = Math.min(length, noise.length);
  let noiseEnv = fingerGain;
  const noiseDecay = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.02));
  for (let i = 0; i < noiseLength; i++) {
    const value = noise[i] * noiseEnv;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
    noiseEnv *= noiseDecay;
  }
}
