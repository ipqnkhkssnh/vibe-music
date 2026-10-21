/**
 * guzheng.js — 古筝。
 *
 * 明亮 Karplus-Strong 拨弦 + 琴体共鸣；用 strum 快速扫和弦可做刮奏。
 * 自然衰减，不吃踏板。
 */

import { clamp, midiToFreq } from '../music.js';
import { panGains, makeNoiseBuffer } from './common.js';
import { pitchAt } from '../articulation.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 0.3, rng, 0.24) };
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.64 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);
  const f0 = midiToFreq(note.midi);
  const { left: panL, right: panR } = panGains(note.pan);
  const slideFromF0 = note.slideFromMidi == null ? null : midiToFreq(note.slideFromMidi);
  const slideTime = slideFromF0 == null ? 0 : Math.max(0, Math.min(note.slide || 0, length / sampleRate));
  const graceF0 = note.graceFromMidi == null ? null : midiToFreq(note.graceFromMidi);
  const graceTime = graceF0 == null ? 0 : 0.06;

  const targetDelay = Math.max(2.2, sampleRate / f0 - 0.22);
  const baseN = Math.max(1, Math.floor(targetDelay));
  const maxDown = Math.max(
    4,
    Math.abs(note.bend || 0),
    note.graceFromMidi == null ? 0 : Math.max(0, note.midi - note.graceFromMidi),
    note.slideFromMidi == null ? 0 : Math.max(0, note.midi - note.slideFromMidi)
  );
  const lowestDelay = Math.max(2.2, sampleRate / (f0 * Math.pow(2, -maxDown / 12)) - 0.22);
  const bufferLength = Math.ceil(lowestDelay) + 4;
  const string = new Float32Array(bufferLength);

  const noise = state.noise;
  const offset = Math.floor(rng() * Math.max(1, noise.length - bufferLength));
  let lp = 0;
  const excitationLp = 0.18 + 0.36 * velocity;
  for (let i = 0; i < bufferLength; i++) {
    const white = noise[offset + i] || 0;
    lp += excitationLp * (white - lp);
    string[i] = lp;
  }
  const pluckOffset = Math.max(1, Math.floor(baseN * 0.16));
  for (let i = bufferLength - 1; i >= pluckOffset; i--) {
    string[i] -= 0.5 * string[i - pluckOffset];
  }

  let peak = 0;
  for (let i = 0; i < bufferLength; i++) peak = Math.max(peak, Math.abs(string[i]));
  if (peak > 0) {
    const scale = 0.8 / peak;
    for (let i = 0; i < bufferLength; i++) string[i] *= scale;
  }

  const t60 = clamp(4.0 * Math.pow(2, -(note.midi - 60) / 24), 1.0, 6.0);
  const feedback = Math.pow(0.001, targetDelay / (t60 * sampleRate));
  const fadeIn = Math.max(1, Math.floor(sampleRate * 0.0015));
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.1));

  let writeIndex = 0;
  let last = 0;
  let body = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
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
    const delaySamples = Math.max(2.2, sampleRate / currentF0 - 0.22);
    const N = Math.max(1, Math.floor(delaySamples));
    const fraction = delaySamples - N;
    let readPos = writeIndex - N - fraction;
    while (readPos < 0) readPos += bufferLength;
    const base = Math.floor(readPos);
    const i0 = base % bufferLength;
    const i1 = (i0 + 1) % bufferLength;
    const frac = readPos - base;
    const out = string[i0] + (string[i1] - string[i0]) * frac;

    const filtered = out * 0.8 + last * 0.2;
    last = out;
    string[writeIndex] = filtered * feedback;
    writeIndex = (writeIndex + 1) % bufferLength;

    body += 0.045 * (out - body);
    const voiced = out * 0.75 + body * 0.35;

    let fade = 1;
    if (i < fadeIn) fade = i / fadeIn;
    if (i > length - fadeOut) fade = Math.min(fade, (length - i) / fadeOut);

    const value = voiced * level * fade;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
  }

  // 拨片/指甲噪声
  const noiseGain = 0.04 * Math.pow(velocity, 1.4) * note.volume * (note.gain == null ? 1 : note.gain);
  const noiseLength = Math.min(length, noise.length);
  let noiseEnv = noiseGain;
  const noiseDecay = Math.pow(0.0005, 1 / Math.max(1, sampleRate * 0.014));
  for (let i = 0; i < noiseLength; i++) {
    const value = noise[i] * noiseEnv;
    left[startSample + i] += value * panL;
    right[startSample + i] += value * panR;
    noiseEnv *= noiseDecay;
  }
}
