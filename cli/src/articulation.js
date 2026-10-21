/**
 * articulation.js — 逐音演奏法：滑音、按音/弯音、装饰音、颤音。
 *
 * 供 erhu / dizi / guzheng 这类有音高乐器共用；返回某一时刻的频率。
 */

function smoothstep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

export function pitchAt(t, params) {
  const {
    f0,
    slideFromF0 = null,
    slideTime = 0,
    graceF0 = null,
    graceTime = 0.06,
    bend = 0,
    bendTime = 0.25,
    trill = 0,
    trillRate = 8
  } = params;

  // 装饰音：先短暂奏响 grace 音高，再落到主音
  if (graceF0 != null && t < graceTime) return graceF0;

  let freq = f0;

  // 滑音：从前一个音滑到当前音
  if (slideFromF0 != null && slideTime > 0 && t < slideTime) {
    const progress = smoothstep(t / slideTime);
    freq = slideFromF0 + (f0 - slideFromF0) * progress;
  }

  // 按音/弯音：起音后按指定半音数弯过去
  if (bend && bendTime > 0) {
    const progress = smoothstep(t / bendTime);
    freq *= Math.pow(2, (bend * progress) / 12);
  }

  // 颤音/trill：在主音和上方音之间快速交替
  if (trill) {
    const mix = 0.5 - 0.5 * Math.cos(2 * Math.PI * trillRate * t);
    freq *= Math.pow(2, (trill * mix) / 12);
  }

  return freq;
}
