/**
 * common.js — 乐器渲染器共用的正弦表、随机数、噪声与声像工具。
 */

export const TABLE_BITS = 14;
export const TABLE_SIZE = 1 << TABLE_BITS;

export const SINE = new Float32Array(TABLE_SIZE + 1);
for (let i = 0; i <= TABLE_SIZE; i++) {
  SINE[i] = Math.sin((2 * Math.PI * i) / TABLE_SIZE);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 常数功率声像 */
export function panGains(pan) {
  const p = Math.max(-1, Math.min(1, pan));
  return {
    left: Math.cos(((p + 1) * Math.PI) / 4),
    right: Math.sin(((p + 1) * Math.PI) / 4)
  };
}

/** 生成一段高通白噪声，作为击弦/拨弦/槌击的激励 */
export function makeNoiseBuffer(sampleRate, seconds, rng, highpass = 0.12) {
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const buffer = new Float32Array(length);
  let low = 0;
  for (let i = 0; i < length; i++) {
    const white = rng() * 2 - 1;
    low += highpass * (white - low);
    buffer[i] = (white - low) * 0.6;
  }
  return buffer;
}

/** 指数衰减到 target 的每采样系数；samples 是总样本数 */
export function decayTo(target, samples) {
  return Math.pow(target, 1 / Math.max(1, samples));
}
