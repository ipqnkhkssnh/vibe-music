/**
 * drums.js — 鼓组渲染器。
 *
 * 一个乐器包含多种 one-shot 击打：底鼓/军鼓/闭开镲/拍手/
 * 桶鼓/叮叮镲/吊镲/沙锤/铃鼓。每个击打有自己的时长与声像。
 */

import { clamp, midiToFreq } from '../music.js';
import { SINE, TABLE_SIZE, panGains, makeNoiseBuffer } from './common.js';
import { getDrumHit } from '../drums.js';

export function prepare(sampleRate, rng) {
  return { noise: makeNoiseBuffer(sampleRate, 1.2, rng, 0.3) };
}

function sine(phase) {
  const index = Math.min(TABLE_SIZE - 1, (phase * TABLE_SIZE) | 0);
  const fraction = phase * TABLE_SIZE - index;
  return SINE[index] + (SINE[index + 1] - SINE[index]) * fraction;
}

export function renderNote(note, left, right, sampleRate, rng, state) {
  const hit = getDrumHit(note.drum);
  if (!hit) return;

  const startSample = Math.max(0, Math.floor(note.start * sampleRate));
  const endSample = Math.min(left.length, Math.ceil(note.end * sampleRate));
  const length = endSample - startSample;
  if (length <= 0) return;

  const velocity = clamp(note.velocity, 0.02, 1);
  const level = 0.55 * Math.pow(velocity, 1.1) * note.volume * (note.gain == null ? 1 : note.gain);
  const { left: panL, right: panR } = panGains(note.pan);
  const noise = state.noise;
  const noiseOffset = Math.floor(rng() * Math.max(1, noise.length - 1));
  const noiseAt = (i) => noise[(noiseOffset + i) % noise.length];
  const fadeOut = Math.max(1, Math.floor(sampleRate * 0.006));

  const write = (i, sample) => {
    let fade = 1;
    if (i > length - fadeOut) fade = Math.max(0, (length - i) / fadeOut);
    left[startSample + i] += sample * fade * panL;
    right[startSample + i] += sample * fade * panR;
  };

  if (hit.name === 'kick') {
    let phase = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = 45 + 95 * Math.exp(-t * 22);
      phase += freq / sampleRate;
      if (phase >= 1) phase -= 1;
      const env = Math.exp(-t * 7.5);
      const click = i < sampleRate * 0.006 ? noiseAt(i) * (1 - i / (sampleRate * 0.006)) * 0.18 : 0;
      write(i, (sine(phase) * env + click) * level);
    }
    return;
  }

  if (hit.name === 'snare') {
    let phase = 0;
    const inc = 180 / sampleRate;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      phase += inc;
      if (phase >= 1) phase -= 1;
      const body = sine(phase) * Math.exp(-t * 14) * 0.42;
      const rattle = noiseAt(i) * Math.exp(-t * 18) * 0.85;
      write(i, (body + rattle) * level);
    }
    return;
  }

  if (hit.name === 'closedhat' || hit.name === 'openhat') {
    const decay = hit.name === 'closedhat' ? 55 : 7;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      write(i, noiseAt(i) * Math.exp(-t * decay) * level * 0.85);
    }
    return;
  }

  if (hit.name === 'clap') {
    const offsets = [0, 0.012, 0.025];
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let env = Math.exp(-t * 12) * 0.25;
      for (const offset of offsets) {
        if (t >= offset) env += Math.exp(-(t - offset) * 85) * 0.35;
      }
      write(i, noiseAt(i) * Math.min(1.2, env) * level);
    }
    return;
  }

  if (hit.name === 'lowtom' || hit.name === 'midtom' || hit.name === 'hightom') {
    const base = midiToFreq(hit.midi) * 1.1;
    let phase = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = base * (1 + 0.55 * Math.exp(-t * 18));
      phase += freq / sampleRate;
      if (phase >= 1) phase -= 1;
      write(i, sine(phase) * Math.exp(-t * 10) * level);
    }
    return;
  }

  if (hit.name === 'conga' || hit.name === 'bongo') {
    const base = midiToFreq(hit.midi) * (hit.name === 'conga' ? 1.25 : 1.6);
    let phase = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = base * (1 + 0.4 * Math.exp(-t * 20));
      phase += freq / sampleRate;
      if (phase >= 1) phase -= 1;
      const click = i < sampleRate * 0.004 ? noiseAt(i) * 0.12 * (1 - i / (sampleRate * 0.004)) : 0;
      write(i, (sine(phase) * Math.exp(-t * 12) + click) * level);
    }
    return;
  }

  if (hit.name === 'claves') {
    let phase = 0;
    const inc = 2500 / sampleRate;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      phase += inc;
      if (phase >= 1) phase -= 1;
      const click = noiseAt(i) * 0.35 * Math.exp(-t * 90);
      write(i, (sine(phase) * Math.exp(-t * 45) + click) * level);
    }
    return;
  }

  if (hit.name === 'cabasa') {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.003);
      write(i, noiseAt(i) * attack * Math.exp(-t * 26) * level * 0.7);
    }
    return;
  }

  if (hit.name === 'ride' || hit.name === 'crash' || hit.name === 'tambourine') {
    const isCrash = hit.name === 'crash';
    const isTamb = hit.name === 'tambourine';
    const rate = isTamb ? 10 : isCrash ? 3.5 : 4.5;
    const metalGain = isTamb ? 0.35 : isCrash ? 0.45 : 0.3;
    const freqs = isTamb ? [4200, 6100, 7800] : [3200, 4700, 6100, 8300];
    const phases = freqs.map(() => rng());
    const incs = freqs.map((freq) => freq / sampleRate);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let metal = 0;
      for (let n = 0; n < freqs.length; n++) {
        metal += sine(phases[n]) / freqs.length;
        phases[n] += incs[n];
        if (phases[n] >= 1) phases[n] -= 1;
      }
      const env = Math.exp(-t * rate);
      write(i, (noiseAt(i) * 0.8 + metal * metalGain) * env * level);
    }
    return;
  }

  if (hit.name === 'shaker') {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.004);
      write(i, noiseAt(i) * attack * Math.exp(-t * 30) * level * 0.8);
    }
    return;
  }

  // 兜底：短噪声
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    write(i, noiseAt(i) * Math.exp(-t * 20) * level * 0.7);
  }
}
