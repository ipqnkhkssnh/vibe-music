/**
 * index.js — 乐器渲染器注册表。
 *
 * 每个渲染器导出：
 *   prepare(sampleRate, rng) -> state
 *   renderNote(note, left, right, sampleRate, rng, state)
 */

import * as piano from './piano.js';
import * as musicbox from './musicbox.js';
import * as epiano from './epiano.js';
import * as pad from './pad.js';
import * as harp from './harp.js';
import * as marimba from './marimba.js';
import * as bass from './bass.js';
import * as guitar from './guitar.js';
import * as organ from './organ.js';
import * as strings from './strings.js';
import * as drums from './drums.js';
import * as flute from './flute.js';
import * as vibraphone from './vibraphone.js';
import * as eguitar from './eguitar.js';
import * as cello from './cello.js';
import * as accordion from './accordion.js';
import * as timpani from './timpani.js';
import * as harpsichord from './harpsichord.js';
import * as upright from './upright.js';
import * as steelguitar from './steelguitar.js';
import * as violin from './violin.js';
import * as choir from './choir.js';
import * as tubularbells from './tubularbells.js';
import * as guzheng from './guzheng.js';
import * as erhu from './erhu.js';
import * as dizi from './dizi.js';

const RENDERERS = { piano, musicbox, epiano, pad, harp, marimba, bass, guitar, organ, strings, drums, flute, vibraphone, eguitar, cello, accordion, timpani, harpsichord, upright, steelguitar, violin, choir, tubularbells, guzheng, erhu, dizi };

export function getRenderer(name) {
  const renderer = RENDERERS[name];
  if (!renderer) throw new Error(`没有找到乐器渲染器 "${name}"`);
  return renderer;
}

export function hasRenderer(name) {
  return Boolean(RENDERERS[name]);
}
