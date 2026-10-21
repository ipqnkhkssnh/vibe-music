/**
 * drums.js — 鼓组击打定义与解析（无音频依赖）。
 *
 * 一个 `drums` 乐器包含多种击打：底鼓、军鼓、闭/开镲、拍手、
 * 桶鼓、叮叮镲、吊镲、沙锤、铃鼓、康加/邦戈/响棒/卡巴萨。
 * DSL 用短别名（BD/SD/CH...），JSON 可以用 "drum": "kick" 或 "note": "BD"。
 */

const HITS = [
  { name: 'kick', alias: 'BD', label: '底鼓', midi: 36, duration: 0.5, pan: 0, gain: 1.0, aliases: ['K'] },
  { name: 'snare', alias: 'SD', label: '军鼓', midi: 38, duration: 0.38, pan: 0.03, gain: 0.9, aliases: ['S'] },
  { name: 'closedhat', alias: 'CH', label: '闭镲', midi: 42, duration: 0.12, pan: 0.18, gain: 0.6, aliases: ['HH'] },
  { name: 'openhat', alias: 'OH', label: '开镲', midi: 46, duration: 0.45, pan: 0.2, gain: 0.55, aliases: [] },
  { name: 'clap', alias: 'CP', label: '拍手', midi: 39, duration: 0.32, pan: -0.06, gain: 0.7, aliases: [] },
  { name: 'lowtom', alias: 'LT', label: '低音桶鼓', midi: 45, duration: 0.42, pan: -0.22, gain: 0.8, aliases: [] },
  { name: 'midtom', alias: 'MT', label: '中音桶鼓', midi: 47, duration: 0.38, pan: 0, gain: 0.8, aliases: [] },
  { name: 'hightom', alias: 'HT', label: '高音桶鼓', midi: 50, duration: 0.34, pan: 0.22, gain: 0.8, aliases: [] },
  { name: 'ride', alias: 'RD', label: '叮叮镲', midi: 51, duration: 1.0, pan: -0.15, gain: 0.5, aliases: [] },
  { name: 'crash', alias: 'CR', label: '吊镲', midi: 49, duration: 1.4, pan: 0.12, gain: 0.55, aliases: [] },
  { name: 'shaker', alias: 'SH', label: '沙锤', midi: 70, duration: 0.18, pan: 0.28, gain: 0.45, aliases: [] },
  { name: 'tambourine', alias: 'TB', label: '铃鼓', midi: 54, duration: 0.3, pan: -0.25, gain: 0.5, aliases: [] },
  { name: 'conga', alias: 'CG', label: '康加鼓', midi: 62, duration: 0.35, pan: -0.18, gain: 0.65, aliases: ['CONGA'] },
  { name: 'bongo', alias: 'BG', label: '邦戈鼓', midi: 60, duration: 0.25, pan: 0.2, gain: 0.55, aliases: ['BONGO'] },
  { name: 'claves', alias: 'CL', label: '响棒', midi: 75, duration: 0.2, pan: 0.25, gain: 0.5, aliases: ['CLAVE'] },
  { name: 'cabasa', alias: 'CB', label: '卡巴萨', midi: 69, duration: 0.18, pan: -0.22, gain: 0.4, aliases: ['CABASA'] }
];

const BY_NAME = new Map();
const BY_KEY = new Map();

function normalize(value) {
  return String(value).trim().toUpperCase().replace(/[-_\s]+/g, '');
}

for (const hit of HITS) {
  BY_NAME.set(hit.name, hit);
  BY_KEY.set(normalize(hit.name), hit);
  BY_KEY.set(normalize(hit.alias), hit);
  for (const alias of hit.aliases) BY_KEY.set(normalize(alias), hit);
}

export const DRUM_HITS = HITS;

export function resolveDrumHit(value) {
  if (value == null) return null;
  const key = normalize(value);
  if (!key) return null;
  return BY_KEY.get(key) || null;
}

export function getDrumHit(name) {
  if (name == null) return null;
  return BY_NAME.get(String(name).toLowerCase()) || resolveDrumHit(name);
}

export function listDrumHits() {
  return HITS.map((hit) => ({
    name: hit.name,
    alias: hit.alias,
    label: hit.label,
    midi: hit.midi,
    duration: hit.duration,
    aliases: [hit.alias, ...hit.aliases]
  }));
}

export const DRUM_ALIASES = HITS.map((hit) => hit.alias);
