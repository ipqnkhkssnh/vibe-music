/**
 * harp.js — 拨弦竖琴（Karplus-Strong）。
 *
 * 一条带分数延迟的弦 + 环路低通 + 短促噪声激励。
 * 没有制音器，音符自然衰减；适合琶音、摇篮、夜曲。
 */

import { clamp, midiToFreq } from '../music.js';
import { panGains, makeNoiseBuffer } from './common.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.3, rng, 0.22) };
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

  // 环路里的两抽头低通会带来约 0.22 个采样的相位延迟，这里预先补偿
  const targetDelay = Math.max(2.2, sampleRate / f0 - 0.22);
  const N = Math.max(1, Math.floor(targetDelay));
  const fraction = targetDelay - N;
  const bufferLength = N + 2;
  const string = new Float32Array(bufferLength);

  // 激励：一段高通噪声 -> 低通，再加一点拨弦位置的梳状缺口
  const noise = state.noise;
  const offset = Math.floor(rng() * Math.max(1, noise.length - bufferLength));
  let lp = 0;
  const excitationLp = 0.16 + 0.38 * velocity;
  for (let i = 0; i < bufferLength; i++) {
    const white = noise[offset + i] || 0;
    lp += excitationLp * (white - lp);
    string[i] = lp;
  }
  const pluckOffset = Math.max(1, Math.floor(N * 0.18));
  for (let i = bufferLength - 1; i >= pluckOffset; i--) {
    string[i] -= 0.45 * string[i - pluckOffset];
  }

  let peak = 0;
  for (let i = 0; i < bufferLength; i++) peak = Math.max(peak, Math.abs(string[i]));
  if (peak > 0) {
    const scale = 0.8 / peak;
    for (let i = 0; i < bufferLength; i++) string[i] *= scale;
  }

  const t60 = clamp(7.5 * Math.pow(2, -(note.midi - 60) / 28), 1.4, 10.0);
  const feedback = Math.pow(0.001, targetDelay / (t60 * sampleRate));
  const fadeIn = Math.max(1, Math.floor(sampleRate * 0.0015));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.12));

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

    // 环路低通：高频衰减更快，接近真实弦的阻尼
    const filtered = out * 0.78 + last * 0.22;
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
}
