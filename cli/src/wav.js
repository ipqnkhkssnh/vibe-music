/**
 * wav.js — 把 Float32 立体声 PCM 编码成 16-bit WAV。
 */

import { writeFileSync } from 'node:fs';

export function encodeWav(left, right, sampleRate) {
  const frames = Math.min(left.length, right.length);
  const dataSize = frames * 4; // 2 channels * 16-bit
  const buffer = Buffer.allocUnsafe(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // PCM fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(2, 22); // stereo
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 4, 28); // byte rate
  buffer.writeUInt16LE(4, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buffer.writeInt16LE(Math.round(l * 32767), offset);
    buffer.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }
  return buffer;
}

export function writeWavFile(filePath, left, right, sampleRate) {
  const buffer = encodeWav(left, right, sampleRate);
  writeFileSync(filePath, buffer);
  return buffer.length;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
