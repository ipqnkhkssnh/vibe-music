/**
 * names.js — 乐器名称、音域与合成参数的元数据。
 *
 * 这里只放“轻量元数据”，不 import 合成器，避免 parser/compile 被渲染代码拖慢。
 * 真正的渲染函数在 instruments/index.js 里按名称分发。
 */

import { midiToName } from '../music.js';
import { listDrumHits } from '../drums.js';

export const INSTRUMENTS = Object.freeze({
  piano: {
    name: 'piano',
    label: '钢琴',
    english: 'Grand Piano',
    description: '原声钢琴：非谐泛音、1–3 根弦、击弦噪声、制音器与踏板。',
    range: [21, 108],
    damped: true,
    releaseTime: 0.25,
    decayScale: 1.0,
    gain: 1.0,
    pedal: true,
    aliases: ['grand', 'acoustic', 'grandpiano']
  },
  musicbox: {
    name: 'musicbox',
    label: '音乐盒',
    english: 'Music Box',
    description: '清脆的金属/木齿音，无制音器，音符自然衰减；适合助眠、童话、点缀。',
    range: [48, 108],
    damped: false,
    releaseTime: 0,
    decayScale: 0.55,
    gain: 0.9,
    pedal: false,
    aliases: ['celesta', 'bell', 'glockenspiel', 'musicbox']
  },
  epiano: {
    name: 'epiano',
    label: '电钢琴',
    english: 'Electric Piano',
    description: 'FM 电钢：温暖的琴体 + 短促 tine 亮度，带轻微 tremolo。',
    range: [33, 108],
    damped: true,
    releaseTime: 0.35,
    decayScale: 1.15,
    gain: 0.85,
    pedal: true,
    aliases: ['ep', 'rhodes', 'wurli', 'electricpiano', 'electric-piano']
  },
  pad: {
    name: 'pad',
    label: '暖垫',
    english: 'Warm Pad',
    description: '慢起音的失谐弦垫，持续音不自然衰减；适合铺底、氛围、电影感。',
    range: [36, 96],
    damped: true,
    releaseTime: 1.5,
    decayScale: null,
    gain: 0.9,
    pedal: true,
    aliases: ['warmpad', 'stringpad', 'synthpad', 'warm-pad']
  },
  harp: {
    name: 'harp',
    label: '竖琴',
    english: 'Harp',
    description: '拨弦竖琴：Karplus-Strong 弦 + 明亮拨弦起音，音符自然衰减；适合琶音、摇篮、夜曲。',
    range: [24, 96],
    damped: false,
    releaseTime: 0,
    decayScale: 0.85,
    gain: 0.9,
    pedal: false,
    aliases: ['lyre', 'concert-harp']
  },
  marimba: {
    name: 'marimba',
    label: '马林巴',
    english: 'Marimba',
    description: '温暖木质打击：几个非谐模态 + 短促槌击，音符自然衰减；适合轻快、学习、治愈。',
    range: [36, 96],
    damped: false,
    releaseTime: 0,
    decayScale: 0.32,
    gain: 1.0,
    pedal: false,
    aliases: ['mallet', 'wooden-mallet']
  },
  bass: {
    name: 'bass',
    label: '电贝斯',
    english: 'Electric Bass',
    description: '电贝斯：厚实基频 + 低通谐波 + 拨弦噪声；有制音器，适合 lofi、jazz、流行低音。',
    range: [28, 72],
    damped: true,
    releaseTime: 0.18,
    decayScale: 1.3,
    gain: 1.0,
    pedal: false,
    aliases: ['ebass', 'electricbass', 'bassguitar', 'e-bass']
  },
  guitar: {
    name: 'guitar',
    label: '尼龙吉他',
    english: 'Nylon Guitar',
    description: '尼龙弦木吉他：Karplus-Strong 拨弦 + 琴体低通；配合 strum 做扫弦，适合民谣、lofi、bossa。',
    range: [40, 84],
    damped: false,
    releaseTime: 0,
    decayScale: 0.55,
    gain: 0.9,
    pedal: false,
    aliases: ['nylon', 'nylonguitar', 'acousticguitar', 'classicalguitar']
  },
  organ: {
    name: 'organ',
    label: '拉杆风琴',
    english: 'Drawbar Organ',
    description: '拉杆风琴：drawbar 加法泛音 + 键击 + 轻微合唱；持续音，适合氛围、gospel、rock。',
    range: [36, 96],
    damped: true,
    releaseTime: 0.15,
    decayScale: null,
    gain: 0.8,
    pedal: false,
    aliases: ['drawbar', 'hammond', 'drawbarorgan']
  },
  strings: {
    name: 'strings',
    label: '弦乐合奏',
    english: 'String Ensemble',
    description: '弦乐合奏：多组失谐弓弦 + 慢起音 + 揉弦 + 运弓噪声；适合电影感、抒情、铺底。',
    range: [36, 96],
    damped: true,
    releaseTime: 0.9,
    decayScale: null,
    gain: 0.85,
    pedal: false,
    aliases: ['stringensemble', 'string-ensemble', 'ensemble', 'stringsection']
  },
  drums: {
    name: 'drums',
    label: '鼓组',
    english: 'Drum Kit',
    description: '鼓组：底鼓/军鼓/闭开镲/拍手/桶鼓/叮叮镲/吊镲/沙锤/铃鼓；用 BD/SD/CH 等击打别名写谱。',
    range: [36, 70],
    isDrum: true,
    damped: false,
    releaseTime: 0,
    decayScale: null,
    gain: 1.0,
    pedal: false,
    aliases: ['drumkit', 'drum-kit', 'kit', 'percussion']
  },
  flute: {
    name: 'flute',
    label: '长笛',
    english: 'Flute',
    description: '长笛：气声 + 泛音 + 起音 chiff + 揉弦；持续音，适合民谣、电影感、领奏。',
    range: [60, 96],
    damped: true,
    releaseTime: 0.12,
    decayScale: null,
    gain: 0.9,
    pedal: false,
    aliases: ['airflute', 'woodwind']
  },
  vibraphone: {
    name: 'vibraphone',
    label: '颤音琴',
    english: 'Vibraphone',
    description: '颤音琴：金属模态 + 电机 tremolo + 长衰减；可吃踏板，适合爵士、lounge、悬疑。',
    range: [48, 96],
    damped: true,
    releaseTime: 0.35,
    decayScale: 1.2,
    gain: 0.9,
    pedal: true,
    aliases: ['vibes', 'vibro']
  },
  eguitar: {
    name: 'eguitar',
    label: '电吉他',
    english: 'Electric Guitar',
    description: '电吉他：Karplus-Strong 拨弦 + drive 失真 + 箱体低通；配合 strum 做扫弦，适合 rock/lofi。',
    range: [40, 84],
    damped: true,
    releaseTime: 0.2,
    decayScale: 1.4,
    gain: 0.9,
    pedal: false,
    aliases: ['electricguitar', 'elecguitar', 'overdriveguitar']
  },
  cello: {
    name: 'cello',
    label: '大提琴',
    english: 'Solo Cello',
    description: '大提琴：独奏弓弦 + 揉弦 + 运弓噪声 + 琴体共鸣；低中音旋律，适合电影感/民谣。',
    range: [36, 84],
    damped: true,
    releaseTime: 0.6,
    decayScale: null,
    gain: 0.9,
    pedal: false,
    aliases: ['violoncello']
  },
  accordion: {
    name: 'accordion',
    label: '手风琴',
    english: 'Accordion',
    description: '手风琴：双簧片失谐 + 风箱噪声 + 轻微 tremolo；适合民谣、探戈、法式。',
    range: [48, 84],
    damped: true,
    releaseTime: 0.15,
    decayScale: null,
    gain: 0.85,
    pedal: false,
    aliases: ['bandoneon', 'squeezebox']
  },
  timpani: {
    name: 'timpani',
    label: '定音鼓',
    english: 'Timpani',
    description: '定音鼓：膜振动模态 + 槌击 + 长衰减；有音高的 one-shot，适合管弦/电影感。',
    range: [36, 57],
    damped: true,
    releaseTime: 2.2,
    decayScale: null,
    gain: 1.0,
    pedal: false,
    aliases: ['kettledrum']
  },
  harpsichord: {
    name: 'harpsichord',
    label: '羽管键琴',
    english: 'Harpsichord',
    description: '羽管键琴：明亮拨弦 + 短促拨片噪声；巴洛克/室内乐，自然衰减。',
    range: [36, 96],
    damped: false,
    releaseTime: 0,
    decayScale: 0.45,
    gain: 0.9,
    pedal: false,
    aliases: ['cembalo']
  },
  upright: {
    name: 'upright',
    label: '低音提琴',
    english: 'Upright Bass',
    description: '低音提琴：拨弦 + 琴体共鸣 + 指板噪声；爵士/bluegrass，松键快速制音。',
    range: [28, 60],
    damped: true,
    releaseTime: 0.25,
    decayScale: 1.1,
    gain: 1.0,
    pedal: false,
    aliases: ['uprightbass', 'doublebass', 'contrabass']
  },
  steelguitar: {
    name: 'steelguitar',
    label: '钢弦吉他',
    english: 'Steel-string Guitar',
    description: '钢弦吉他：明亮 Karplus-Strong 拨弦 + 琴体低通；民谣/乡村/流行，配合 strum。',
    range: [40, 84],
    damped: false,
    releaseTime: 0,
    decayScale: 0.32,
    gain: 0.9,
    pedal: false,
    aliases: ['steelstring', 'acousticsteel']
  },
  violin: {
    name: 'violin',
    label: '小提琴',
    english: 'Solo Violin',
    description: '小提琴：高音独奏弓弦 + 揉弦 + 运弓噪声 + 琴体共鸣；适合电影感/民谣/古典。',
    range: [55, 96],
    damped: true,
    releaseTime: 0.5,
    decayScale: null,
    gain: 0.9,
    pedal: false,
    aliases: ['fiddle']
  },
  choir: {
    name: 'choir',
    label: '合唱“啊”',
    english: 'Choir',
    description: '风格化合唱：多声部失谐 + 元音 formant 滤波 + 呼吸噪声；适合铺底/电影感。',
    range: [48, 84],
    damped: true,
    releaseTime: 1.2,
    decayScale: null,
    gain: 0.8,
    pedal: false,
    aliases: ['vox', 'voices', 'choirpad']
  },
  tubularbells: {
    name: 'tubularbells',
    label: '管钟',
    english: 'Tubular Bells',
    description: '管钟：非谐金属模态 + 长衰减 + 槌击；适合电影感、悬疑、教堂。',
    range: [60, 96],
    damped: false,
    releaseTime: 0,
    decayScale: 0.9,
    gain: 0.9,
    pedal: false,
    aliases: ['bells', 'chimes', 'tubular']
  },
  guzheng: {
    name: 'guzheng',
    label: '古筝',
    english: 'Guzheng',
    description: '古筝：明亮拨弦 + 琴体共鸣；用 strum 做刮奏，自然衰减，适合中国风/民乐。',
    range: [36, 96],
    damped: false,
    releaseTime: 0,
    decayScale: 0.55,
    gain: 0.9,
    pedal: false,
    aliases: ['zheng']
  },
  erhu: {
    name: 'erhu',
    label: '二胡',
    english: 'Erhu',
    description: '二胡：弓弦 + 揉弦 + 滑音 + 运弓噪声；用 vibrato 和 slide 做出二胡表情。',
    range: [50, 86],
    damped: true,
    releaseTime: 0.5,
    decayScale: null,
    gain: 0.9,
    pedal: false,
    aliases: ['nanhu']
  },
  dizi: {
    name: 'dizi',
    label: '笛子',
    english: 'Dizi',
    description: '笛子：气声 + 笛膜亮音 + 揉弦/滑音；适合中国风旋律，不吃踏板。',
    range: [60, 96],
    damped: true,
    releaseTime: 0.15,
    decayScale: null,
    gain: 0.9,
    pedal: false,
    aliases: ['zhudi', 'chineseflute']
  }
});

export const INSTRUMENT_NAMES = Object.keys(INSTRUMENTS);

const ALIASES = new Map();
for (const def of Object.values(INSTRUMENTS)) {
  for (const alias of def.aliases || []) {
    ALIASES.set(alias.toLowerCase().replace(/[-_\s]+/g, ''), def.name);
  }
}

/** 接受 piano / grand / ep / warm-pad 等写法，返回规范名或 null */
export function normalizeInstrumentName(value) {
  if (value == null) return null;
  const key = String(value).trim().toLowerCase().replace(/[-_\s]+/g, '');
  if (!key) return null;
  if (Object.prototype.hasOwnProperty.call(INSTRUMENTS, key)) return key;
  return ALIASES.get(key) || null;
}

export function getInstrumentDef(value) {
  const name = normalizeInstrumentName(value);
  return name ? INSTRUMENTS[name] : null;
}

export function rangeLabel(def) {
  return `${midiToName(def.range[0])}–${midiToName(def.range[1])}`;
}

export function listInstruments() {
  return INSTRUMENT_NAMES.map((name) => {
    const def = INSTRUMENTS[name];
    return {
      name,
      label: def.label,
      english: def.english,
      description: def.description,
      isDrum: Boolean(def.isDrum),
      range: {
        min: midiToName(def.range[0]),
        max: midiToName(def.range[1]),
        minMidi: def.range[0],
        maxMidi: def.range[1]
      },
      hits: def.isDrum ? listDrumHits() : undefined,
      damped: def.damped,
      releaseTime: def.releaseTime,
      decayScale: def.decayScale,
      pedal: def.pedal !== false,
      aliases: def.aliases || []
    };
  });
}
