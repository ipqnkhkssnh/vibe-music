/**
 * reverb.js — 轻量 Freeverb 立体声混响。
 *
 * 命令行版不加载 IR 文件，用 8 个梳状滤波器 + 4 个全通滤波器制造房间感；
 * 计算量是 O(n)，适合离线渲染整首歌。
 */

class CombFilter {
  constructor(size, feedback, damp) {
    this.buffer = new Float32Array(Math.max(1, size));
    this.index = 0;
    this.feedback = feedback;
    this.damp = damp;
    this.filterStore = 0;
  }

  process(input) {
    const output = this.buffer[this.index];
    this.filterStore = output * (1 - this.damp) + this.filterStore * this.damp;
    this.buffer[this.index] = input + this.filterStore * this.feedback;
    this.index = (this.index + 1) % this.buffer.length;
    return output;
  }
}

class AllpassFilter {
  constructor(size, feedback) {
    this.buffer = new Float32Array(Math.max(1, size));
    this.index = 0;
    this.feedback = feedback;
  }

  process(input) {
    const buffered = this.buffer[this.index];
    const output = -input + buffered;
    this.buffer[this.index] = input + buffered * this.feedback;
    this.index = (this.index + 1) % this.buffer.length;
    return output;
  }
}

const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS_TUNING = [556, 441, 341, 225];
const STEREO_SPREAD = 23;

export class Freeverb {
  constructor(sampleRate, options = {}) {
    const scale = sampleRate / 44100;
    const room = options.room == null ? 0.84 : options.room;
    const damp = options.damp == null ? 0.22 : options.damp;
    this.wet = options.wet == null ? 0.3 : options.wet;
    this.dry = options.dry == null ? 1 : options.dry;
    this.inputGain = options.inputGain == null ? 0.05 : options.inputGain;

    this.combL = COMB_TUNING.map((size) => new CombFilter(Math.round(size * scale), room, damp));
    this.combR = COMB_TUNING.map((size) => new CombFilter(Math.round((size + STEREO_SPREAD) * scale), room, damp));
    this.allpassL = ALLPASS_TUNING.map((size) => new AllpassFilter(Math.round(size * scale), 0.5));
    this.allpassR = ALLPASS_TUNING.map((size) => new AllpassFilter(Math.round((size + STEREO_SPREAD) * scale), 0.5));
  }

  /** 原地处理左右声道 */
  process(left, right) {
    const length = Math.min(left.length, right.length);
    for (let i = 0; i < length; i++) {
      const dryL = left[i];
      const dryR = right[i];
      const input = (dryL + dryR) * this.inputGain;

      let wetL = 0;
      let wetR = 0;
      for (let c = 0; c < this.combL.length; c++) {
        wetL += this.combL[c].process(input);
        wetR += this.combR[c].process(input);
      }
      for (let a = 0; a < this.allpassL.length; a++) {
        wetL = this.allpassL[a].process(wetL);
        wetR = this.allpassR[a].process(wetR);
      }

      left[i] = dryL * this.dry + wetL * this.wet;
      right[i] = dryR * this.dry + wetR * this.wet;
    }
    return { left, right };
  }
}
