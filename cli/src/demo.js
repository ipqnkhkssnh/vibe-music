/**
 * demo.js — 内置示例曲目，直接读取 examples/ 下的文件。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';

const DEMOS = {
  twinkle: { name: 'twinkle', title: '小星星', file: 'twinkle.piano' },
  nocturne: { name: 'nocturne', title: '夜曲练习', file: 'nocturne.piano' },
  chords: { name: 'chords', title: '四拍和弦', file: 'chords.piano' },
  agent: { name: 'agent', title: 'Agent Etude', file: 'agent-etude.piano' },
  voyage: { name: 'voyage', title: '夜航', file: 'night-voyage.piano' },
  sleep: { name: 'sleep', title: '云眠', file: 'cloud-sleep.piano' },
  stardust: { name: 'stardust', title: '星尘摇篮', file: 'musicbox-lullaby.piano' },
  epiano: { name: 'epiano', title: '晚风电钢', file: 'epiano-groove.piano' },
  mist: { name: 'mist', title: '晨雾', file: 'morning-mist.piano' },
  photo: { name: 'photo', title: '旧照片', file: 'old-photo.piano' },
  rain: { name: 'rain', title: '雨巷', file: 'rainy-alley.piano' },
  neon: { name: 'neon', title: '霓虹公路', file: 'neon-highway.piano' },
  distant: { name: 'distant', title: '远山', file: 'distant-mountains.piano' },
  cafe: { name: 'cafe', title: '旧咖啡馆', file: 'old-cafe.piano' },
  dome: { name: 'dome', title: '穹顶', file: 'cathedral.piano' },
  jiangnan: { name: 'jiangnan', title: '江南', file: 'jiangnan.piano' },
  json: { name: 'json', title: 'Agent JSON Demo', file: 'agent-song.json' }
};

export function listDemos() {
  return Object.values(DEMOS).map((demo) => ({ ...demo }));
}

export function loadDemo(name) {
  const key = name || 'twinkle';
  const demo = DEMOS[key];
  if (!demo) {
    const available = Object.keys(DEMOS).join(', ');
    throw new Error(`未知示例 "${key}"，可用：${available}`);
  }
  const path = fileURLToPath(new URL(`../examples/${demo.file}`, import.meta.url));
  return {
    name: demo.name,
    title: demo.title,
    path,
    filename: basename(path),
    text: readFileSync(path, 'utf8')
  };
}
