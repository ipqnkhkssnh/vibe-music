import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { noteToMidi, midiToName, midiToFreq } from '../src/music.js';
import { parseSong, SongError } from '../src/parser.js';
import { compileSong } from '../src/compile.js';
import { renderSong } from '../src/synth.js';
import { encodeWav } from '../src/wav.js';

const CLI = fileURLToPath(new URL('../bin/vibe.js', import.meta.url));
const EXAMPLES = fileURLToPath(new URL('../examples/', import.meta.url));

test('音名与频率', () => {
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('C#4'), 61);
  assert.equal(noteToMidi('Db4'), 61);
  assert.equal(noteToMidi('A0'), 21);
  assert.equal(noteToMidi('C8'), 108);
  assert.equal(midiToName(60), 'C4');
  assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-9);
  assert.throws(() => noteToMidi('H4'));
  assert.throws(() => noteToMidi('C9'));
  assert.throws(() => noteToMidi('C#b4'));
});

test('DSL 解析：轨道、和弦、时值、踏板', () => {
  const song = parseSong(`
    title: Test Song
    tempo: 120
    meter: 3/4
    reverb: 0.1
    volume: 0.7

    track melody volume=0.9 pan=0.2
    C4:1 D4:0.5 [E4 G4]:2 | R:0.5

    track bass volume=0.5
    C3:4

    pedal: 0-4
  `);
  assert.equal(song.title, 'Test Song');
  assert.equal(song.tempo, 120);
  assert.equal(song.meter, '3/4');
  assert.equal(song.volume, 0.7);
  assert.equal(song.tracks.length, 2);
  assert.equal(song.tracks[0].notes.length, 4);
  assert.equal(song.tracks[0].notes[2].midi, 64);
  assert.equal(song.tracks[0].notes[2].beats, 2);
  assert.equal(song.tracks[0].notes[3].midi, 67);
  assert.equal(song.tracks[1].notes.length, 1);
  assert.equal(song.pedals.length, 1);
  assert.equal(song.pedals[0].from, 0);
  assert.equal(song.pedals[0].to, 4);
});

test('DSL 解析：错误带行号', () => {
  assert.throws(
    () => parseSong('track m\nC4:1\nH4:1\n'),
    (err) => err instanceof SongError && err.line === 3 && /H4/.test(err.message)
  );
  assert.throws(
    () => parseSong('track m\nC4:1\npedal: 8-4\n'),
    (err) => err instanceof SongError && err.line === 3
  );
});

test('JSON 解析：显式 at / chords / pedals', () => {
  const song = parseSong(JSON.stringify({
    title: 'JSON',
    tempo: 108,
    tracks: [
      { name: 'm', notes: [{ note: 'C4', at: 1, beats: 2 }, { notes: ['E4', 'G4'], at: 2 }] }
    ],
    pedals: [[0, 4]]
  }));
  assert.equal(song.tempo, 108);
  assert.equal(song.tracks[0].notes.length, 3);
  assert.equal(song.tracks[0].notes[0].at, 1);
  assert.equal(song.pedals[0].to, 4);
});

test('乐器：DSL 轨道、全局默认与别名', () => {
  const song = parseSong(`
    instrument: pad
    track padTrack instrument=pad
    C4:1
    track bell instrument=celesta
    C5:1
    track ep instrument=ep
    C2:1
  `);
  assert.equal(song.instrument, 'pad');
  assert.equal(song.tracks[0].instrument, 'pad');
  assert.equal(song.tracks[1].instrument, 'musicbox');
  assert.equal(song.tracks[2].instrument, 'epiano');

  const compiled = compileSong(song);
  assert.deepEqual(compiled.instruments, ['pad', 'musicbox', 'epiano']);
  assert.equal(compiled.tracks[0].instrument, 'pad');
  assert.equal(compiled.tracks[1].instrument, 'musicbox');
  assert.equal(compiled.tracks[2].instrument, 'epiano');

  assert.throws(
    () => parseSong('track a instrument=kazoo\nC4:1'),
    (err) => err instanceof SongError && /未知乐器/.test(err.message)
  );
});

test('乐器：JSON 全局与轨道 instrument', () => {
  const song = parseSong(JSON.stringify({
    instrument: 'pad',
    tempo: 80,
    tracks: [
      { name: 'a', instrument: 'ep', notes: [{ note: 'C3', at: 0, beats: 1 }] },
      { name: 'b', notes: [{ note: 'C5', at: 0, beats: 1 }] }
    ]
  }));
  assert.equal(song.instrument, 'pad');
  assert.equal(song.tracks[0].instrument, 'epiano');
  assert.equal(song.tracks[1].instrument, null);
  const compiled = compileSong(song);
  assert.equal(compiled.notes[0].instrument, 'epiano');
  assert.equal(compiled.notes[1].instrument, 'pad');
});

test('乐器：音域与衰减/释放差异', () => {
  assert.throws(
    () => compileSong(parseSong('track a instrument=musicbox\nC2:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track a instrument=pad\nC8:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );

  const bell = compileSong(parseSong('title: Bell\ntempo: 60\ntrack b instrument=musicbox\nC5:1'));
  assert.equal(bell.notes[0].instrument, 'musicbox');
  assert.equal(bell.notes[0].release, Infinity);
  assert.ok(bell.notes[0].end > bell.notes[0].keyUp + 1);

  const pad = compileSong(parseSong('title: Pad\ntempo: 60\ntrack p instrument=pad\nC4:1'));
  assert.equal(pad.notes[0].instrument, 'pad');
  assert.ok(Math.abs(pad.notes[0].end - (pad.notes[0].keyUp + 1.5)) < 1e-9);

  const openPad = compileSong(parseSong('title: Open Pad\ntempo: 60\ntrack p instrument=pad\nC4:1\npedal: 0-'));
  assert.ok(Number.isFinite(openPad.notes[0].end));
  assert.ok(Math.abs(openPad.notes[0].end - 2.5) < 1e-9);
});

test('乐器：三件乐器一起渲染无 NaN', () => {
  const song = parseSong(`
    title: Trio
    tempo: 100
    reverb: 0.2
    volume: 0.8
    track bell instrument=musicbox volume=0.7
    C5:1 E5:1
    track keys instrument=epiano volume=0.7
    C3:2
    track pad instrument=pad volume=0.4
    [C4 E4 G4]:2
  `);
  const compiled = compileSong(song);
  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.left.length > 1000);
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 101) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }
});

test('乐器：pad 长和弦不会因相位舍入产生 NaN', () => {
  const song = parseSong('title: Long Pad\ntempo: 60\nreverb: 0\ntrack p instrument=pad\n[C4 E4 G4]:4');
  const audio = renderSong(compileSong(song), { sampleRate: 22050 });
  let bad = 0;
  for (let i = 0; i < audio.left.length; i += 37) {
    if (!Number.isFinite(audio.left[i]) || !Number.isFinite(audio.right[i])) bad++;
  }
  assert.equal(bad, 0);
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
});

test('乐器：第二波音色渲染与音域', () => {
  const song = parseSong(`
    title: Second Wave
    tempo: 76
    reverb: 0.2
    volume: 0.8
    track harp instrument=harp volume=0.7
    C3:1 E3:1 G3:2
    track marimba instrument=marimba volume=0.7
    C4:1 E4:1 G4:2
    track bass instrument=ebass volume=0.6
    C2:4
  `);
  const compiled = compileSong(song);
  assert.deepEqual(compiled.instruments, ['harp', 'marimba', 'bass']);
  assert.equal(compiled.notes.find((note) => note.instrument === 'bass').name, 'C2');
  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 53) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }

  assert.throws(
    () => compileSong(parseSong('track b instrument=bass\nC6:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track m instrument=marimba\nC1:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
});

test('乐器：bass 不吃踏板，harp/marimba 自然衰减', () => {
  const bass = compileSong(parseSong('title: Bass\ntempo: 60\ntrack b instrument=bass\nC2:1\npedal: 0-4'));
  assert.equal(bass.notes[0].release, 1);
  assert.ok(Math.abs(bass.notes[0].end - 1.18) < 1e-9);

  const harp = compileSong(parseSong('title: Harp\ntempo: 60\ntrack h instrument=harp\nC4:1'));
  assert.equal(harp.notes[0].release, Infinity);
  assert.ok(harp.notes[0].end > harp.notes[0].keyUp + 1);

  const marimba = compileSong(parseSong('title: Marimba\ntempo: 60\ntrack m instrument=marimba\nC4:1'));
  assert.equal(marimba.notes[0].release, Infinity);
  assert.ok(marimba.notes[0].end > marimba.notes[0].keyUp);
});

test('乐器：harp 基频调音误差小于 1%', () => {
  const audio = renderSong(
    compileSong(parseSong('title: Harp Tune\ntempo: 60\nreverb: 0\ntrack h instrument=harp\nC4:1')),
    { sampleRate: 22050 }
  );
  const mono = new Float32Array(audio.left.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (audio.left[i] + audio.right[i]) / 2;
  const n = Math.min(mono.length, Math.floor(audio.sampleRate * 0.25));
  let best = 0;
  let bestFreq = 0;
  for (let freq = 250; freq <= 275; freq += 0.1) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      const phase = (2 * Math.PI * freq * i) / audio.sampleRate;
      re += mono[i] * w * Math.cos(phase);
      im -= mono[i] * w * Math.sin(phase);
    }
    const power = re * re + im * im;
    if (power > best) {
      best = power;
      bestFreq = freq;
    }
  }
  assert.ok(Math.abs(bestFreq / 261.63 - 1) < 0.01, `harp 基频 ${bestFreq.toFixed(2)} Hz`);
});

test('乐器：strum 让和弦音依次起音', () => {
  const song = parseSong('title: Strum\ntempo: 60\ntrack g instrument=guitar strum=0.03\n[C3 E3 G3]:1');
  assert.equal(song.tracks[0].strum, 0.03);
  assert.deepEqual(song.tracks[0].notes.map((note) => note.strumIndex), [0, 1, 2]);

  const compiled = compileSong(song);
  assert.deepEqual(compiled.notes.map((note) => Number(note.start.toFixed(3))), [0, 0.03, 0.06]);
  assert.equal(compiled.tracks[0].strum, 0.03);

  assert.throws(
    () => parseSong('track g instrument=guitar strum=0.3\nC3:1'),
    (err) => err instanceof SongError && /strum/.test(err.message)
  );
});

test('乐器：JSON strum 与第三波音色', () => {
  const song = parseSong(JSON.stringify({
    tempo: 60,
    tracks: [
      {
        name: 'g',
        instrument: 'guitar',
        strum: 0.02,
        notes: [{ notes: ['C3', 'E3'], at: 0, beats: 1 }]
      }
    ]
  }));
  const compiled = compileSong(song);
  assert.equal(compiled.tracks[0].strum, 0.02);
  assert.deepEqual(compiled.notes.map((note) => Number(note.start.toFixed(3))), [0, 0.02]);
});

test('乐器：第三波音色渲染与音域', () => {
  const song = parseSong(`
    title: Third Wave
    tempo: 72
    reverb: 0.25
    volume: 0.8
    track g instrument=guitar strum=0.03 volume=0.62
    [C3 E3 G3 C4]:2
    track o instrument=organ volume=0.40
    [C4 E4 G4]:2
    track s instrument=strings volume=0.50
    G4:2
  `);
  const compiled = compileSong(song);
  assert.deepEqual(compiled.instruments, ['guitar', 'organ', 'strings']);
  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 53) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }

  assert.throws(
    () => compileSong(parseSong('track g instrument=guitar\nC2:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track o instrument=organ\nC1:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
});

test('乐器：organ/strings 不吃踏板，guitar 自然衰减', () => {
  const organ = compileSong(parseSong('title: Organ\ntempo: 60\ntrack o instrument=organ\nC4:1\npedal: 0-4'));
  assert.equal(organ.notes[0].release, 1);
  assert.ok(Math.abs(organ.notes[0].end - 1.15) < 1e-9);

  const strings = compileSong(parseSong('title: Strings\ntempo: 60\ntrack s instrument=strings\nC4:1\npedal: 0-4'));
  assert.equal(strings.notes[0].release, 1);
  assert.ok(Math.abs(strings.notes[0].end - 1.9) < 1e-9);

  const guitar = compileSong(parseSong('title: Guitar\ntempo: 60\ntrack g instrument=guitar\nC4:1'));
  assert.equal(guitar.notes[0].release, Infinity);
  assert.ok(guitar.notes[0].end > guitar.notes[0].keyUp + 1);
});

test('乐器：guitar 基频调音误差小于 1%', () => {
  const audio = renderSong(
    compileSong(parseSong('title: Guitar Tune\ntempo: 60\nreverb: 0\ntrack g instrument=guitar\nC4:1')),
    { sampleRate: 22050 }
  );
  const mono = new Float32Array(audio.left.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (audio.left[i] + audio.right[i]) / 2;
  const n = Math.min(mono.length, Math.floor(audio.sampleRate * 0.25));
  let best = 0;
  let bestFreq = 0;
  for (let freq = 250; freq <= 275; freq += 0.1) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      const phase = (2 * Math.PI * freq * i) / audio.sampleRate;
      re += mono[i] * w * Math.cos(phase);
      im -= mono[i] * w * Math.sin(phase);
    }
    const power = re * re + im * im;
    if (power > best) {
      best = power;
      bestFreq = freq;
    }
  }
  assert.ok(Math.abs(bestFreq / 261.63 - 1) < 0.01, `guitar 基频 ${bestFreq.toFixed(2)} Hz`);
});

test('乐器：鼓组 DSL / JSON 击打与时长', () => {
  const song = parseSong(`
    title: Drums
    tempo: 60
    track d instrument=drums
    BD:1 SD:1 [CH OH]:1
  `);
  assert.deepEqual(song.tracks[0].notes.map((note) => note.drum), ['kick', 'snare', 'closedhat', 'openhat']);

  const compiled = compileSong(song);
  assert.deepEqual(compiled.instruments, ['drums']);
  const kick = compiled.notes.find((note) => note.drum === 'kick');
  assert.equal(kick.name, 'BD');
  assert.equal(kick.release, Infinity);
  assert.ok(Math.abs(kick.end - kick.start - 0.5) < 1e-9);
  const crashless = compiled.notes.find((note) => note.drum === 'openhat');
  assert.ok(Math.abs(crashless.end - crashless.start - 0.45) < 1e-9);

  const aliases = parseSong('title: Aliases\ntempo: 60\ntrack d instrument=drums\nK:1 S:1 HH:1');
  assert.deepEqual(aliases.tracks[0].notes.map((note) => note.drum), ['kick', 'snare', 'closedhat']);

  const json = parseSong(JSON.stringify({
    tracks: [{
      instrument: 'drums',
      notes: [
        { drum: 'kick', at: 0, beats: 1 },
        { note: 'SD', at: 1, beats: 1 },
        { notes: ['CH', 'OH'], at: 2, beats: 1 }
      ]
    }]
  }));
  assert.deepEqual(json.tracks[0].notes.map((note) => note.drum), ['kick', 'snare', 'closedhat', 'openhat']);
});

test('乐器：鼓组错误与 strum 忽略', () => {
  assert.throws(
    () => compileSong(parseSong('track d instrument=drums\nC4:1')),
    (err) => err instanceof SongError && err.code === 'DRUM'
  );
  assert.throws(
    () => compileSong(parseSong('track p instrument=piano\nBD:1')),
    (err) => err instanceof SongError && err.code === 'DRUM'
  );
  assert.throws(
    () => parseSong('track d instrument=drums\n[BD C4]:1'),
    (err) => err instanceof SongError && /鼓击打/.test(err.message)
  );
  assert.throws(
    () => parseSong(JSON.stringify({ tracks: [{ instrument: 'drums', notes: [{ drum: 'kazoo' }] }] })),
    (err) => err instanceof SongError && /未知鼓击打/.test(err.message)
  );

  const strummed = compileSong(parseSong('track d instrument=drums strum=0.03\n[BD SD]:1'));
  assert.deepEqual(strummed.notes.map((note) => note.start), [0, 0]);
});

test('乐器：鼓组十二种击打渲染无 NaN', () => {
  const song = parseSong(`
    title: Full Kit
    tempo: 60
    reverb: 0.1
    volume: 0.8
    track d instrument=drums volume=0.7
    BD:1 SD:1 CH:1 OH:1 CP:1 LT:1 MT:1 HT:1 RD:1 CR:1 SH:1 TB:1
  `);
  const compiled = compileSong(song);
  assert.equal(compiled.notes.length, 12);
  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 41) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }
});

test('乐器：drive 参数与第四波音色', () => {
  const song = parseSong(`
    title: Fourth Wave
    tempo: 80
    reverb: 0.2
    volume: 0.8
    track f instrument=flute volume=0.5
    C5:2
    track v instrument=vibraphone volume=0.45
    C4:2
    track e instrument=eguitar drive=0.6 strum=0.03 volume=0.55
    [E2 B2 E3 G3]:2
  `);
  assert.deepEqual(song.tracks.map((track) => track.drive), [0, 0, 0.6]);
  const compiled = compileSong(song);
  assert.deepEqual(compiled.instruments, ['flute', 'vibraphone', 'eguitar']);
  assert.equal(compiled.tracks[2].drive, 0.6);
  assert.ok(compiled.notes.filter((note) => note.instrument === 'eguitar').every((note) => note.drive === 0.6));

  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 53) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }

  const json = parseSong(JSON.stringify({
    tracks: [{ instrument: 'eguitar', drive: 0.4, notes: [{ note: 'E2', at: 0, beats: 1 }] }]
  }));
  assert.equal(compileSong(json).notes[0].drive, 0.4);

  assert.throws(
    () => parseSong('track e instrument=eguitar drive=1.5\nE2:1'),
    (err) => err instanceof SongError && /drive/.test(err.message)
  );
});

test('乐器：第四波制音、踏板与音域', () => {
  const flute = compileSong(parseSong('title: Flute\ntempo: 60\ntrack f instrument=flute\nC5:1\npedal: 0-4'));
  assert.equal(flute.notes[0].release, 1);
  assert.ok(Math.abs(flute.notes[0].end - 1.12) < 1e-9);

  const eguitar = compileSong(parseSong('title: EG\ntempo: 60\ntrack e instrument=eguitar\nE2:1\npedal: 0-4'));
  assert.equal(eguitar.notes[0].release, 1);
  assert.ok(Math.abs(eguitar.notes[0].end - 1.2) < 1e-9);

  const vibesPedal = compileSong(parseSong('title: Vibes\ntempo: 60\ntrack v instrument=vibraphone\nC4:1\npedal: 0-4'));
  assert.equal(vibesPedal.notes[0].release, 4);
  assert.ok(Math.abs(vibesPedal.notes[0].end - 4.35) < 1e-9);

  const vibesDry = compileSong(parseSong('title: Vibes Dry\ntempo: 60\ntrack v instrument=vibraphone\nC4:1'));
  assert.equal(vibesDry.notes[0].release, 1);
  assert.ok(Math.abs(vibesDry.notes[0].end - 1.35) < 1e-9);

  assert.throws(
    () => compileSong(parseSong('track f instrument=flute\nC3:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track v instrument=vibraphone\nC2:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
});

test('乐器：第六波音色、拉丁打击与渲染', () => {
  const song = parseSong(`
    title: Sixth Wave
    tempo: 80
    reverb: 0.2
    volume: 0.8
    track c instrument=cello volume=0.5
    C3:2
    track a instrument=accordion volume=0.4
    [C4 E4 G4]:2
    track t instrument=timpani volume=0.5
    C2:1
    track h instrument=harpsichord volume=0.4
    C4:1
    track u instrument=upright volume=0.5
    C2:1
    track s instrument=steelguitar strum=0.02 volume=0.4
    [E2 B2 E3]:1
    track d instrument=drums volume=0.5
    CG:1 BG:1 CL:1 CB:1
  `);
  const compiled = compileSong(song);
  assert.deepEqual(compiled.instruments, ['cello', 'accordion', 'timpani', 'harpsichord', 'upright', 'steelguitar', 'drums']);
  assert.deepEqual(
    compiled.notes.filter((note) => note.instrument === 'drums').map((note) => note.drum),
    ['conga', 'bongo', 'claves', 'cabasa']
  );
  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 53) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }
});

test('乐器：第六波制音、自然衰减与音域', () => {
  const cello = compileSong(parseSong('title: Cello\ntempo: 60\ntrack c instrument=cello\nC3:1\npedal: 0-4'));
  assert.equal(cello.notes[0].release, 1);
  assert.ok(Math.abs(cello.notes[0].end - 1.6) < 1e-9);

  const accordion = compileSong(parseSong('title: Acc\ntempo: 60\ntrack a instrument=accordion\nC4:1'));
  assert.equal(accordion.notes[0].release, 1);
  assert.ok(Math.abs(accordion.notes[0].end - 1.15) < 1e-9);

  const timpani = compileSong(parseSong('title: Timp\ntempo: 60\ntrack t instrument=timpani\nC2:1'));
  assert.equal(timpani.notes[0].release, 1);
  assert.ok(Math.abs(timpani.notes[0].end - 3.2) < 1e-9);

  const harpsichord = compileSong(parseSong('title: Hps\ntempo: 60\ntrack h instrument=harpsichord\nC4:1'));
  assert.equal(harpsichord.notes[0].release, Infinity);
  assert.ok(harpsichord.notes[0].end > harpsichord.notes[0].keyUp);

  const upright = compileSong(parseSong('title: Up\ntempo: 60\ntrack u instrument=upright\nC2:1\npedal: 0-4'));
  assert.equal(upright.notes[0].release, 1);
  assert.ok(Math.abs(upright.notes[0].end - 1.25) < 1e-9);

  const steel = compileSong(parseSong('title: Steel\ntempo: 60\ntrack s instrument=steelguitar\nC4:1'));
  assert.equal(steel.notes[0].release, Infinity);
  assert.ok(steel.notes[0].end > steel.notes[0].keyUp);

  assert.throws(
    () => compileSong(parseSong('track c instrument=cello\nC1:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track a instrument=accordion\nC2:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track t instrument=timpani\nC1:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track u instrument=upright\nC1:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
});

test('乐器：第七波音色与合唱渲染', () => {
  const song = parseSong(`
    title: Seventh Wave
    tempo: 60
    reverb: 0.2
    volume: 0.75
    track v instrument=violin volume=0.45
    G4:2 B4:2
    track c instrument=choir volume=0.35
    [C4 E4 G4]:4
    track t instrument=tubularbells volume=0.4
    C5:1 R:3
  `);
  const compiled = compileSong(song);
  assert.deepEqual(compiled.instruments, ['violin', 'choir', 'tubularbells']);
  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 53) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }
});

test('乐器：第七波制音、自然衰减与音域', () => {
  const violin = compileSong(parseSong('title: Vln\ntempo: 60\ntrack v instrument=violin\nG4:1\npedal: 0-4'));
  assert.equal(violin.notes[0].release, 1);
  assert.ok(Math.abs(violin.notes[0].end - 1.5) < 1e-9);

  const choir = compileSong(parseSong('title: Choir\ntempo: 60\ntrack c instrument=choir\nC4:1\npedal: 0-4'));
  assert.equal(choir.notes[0].release, 1);
  assert.ok(Math.abs(choir.notes[0].end - 2.2) < 1e-9);

  const bells = compileSong(parseSong('title: Bells\ntempo: 60\ntrack b instrument=tubularbells\nC5:1'));
  assert.equal(bells.notes[0].release, Infinity);
  assert.ok(bells.notes[0].end > bells.notes[0].keyUp + 1);

  assert.throws(
    () => compileSong(parseSong('track v instrument=violin\nF3:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track c instrument=choir\nC2:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track b instrument=tubularbells\nC3:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
});

test('乐器：vibrato / slide 与东方三件', () => {
  const song = parseSong(`
    title: Eastern
    tempo: 72
    reverb: 0.2
    volume: 0.72
    track e instrument=erhu vibrato=0.6 slide=0.1 volume=0.5
    D4:1 E4:1 G4:2
    track d instrument=dizi vibrato=0.4 slide=0.05 volume=0.4
    A4:2 C5:2
    track g instrument=guzheng strum=0.04 volume=0.45
    [A2 E3 A3 C4 E4 A4]:2
  `);
  assert.equal(song.tracks[0].vibrato, 0.6);
  assert.equal(song.tracks[0].slide, 0.1);
  const compiled = compileSong(song);
  assert.deepEqual(compiled.instruments, ['erhu', 'dizi', 'guzheng']);
  const erhu = compiled.notes.filter((note) => note.instrument === 'erhu');
  assert.equal(erhu[0].slideFromMidi, null);
  assert.equal(erhu[1].slideFromMidi, 62);
  assert.ok(Math.abs(erhu[1].slide - 0.1) < 1e-9);
  assert.ok(erhu.every((note) => note.vibrato === 0.6));

  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 53) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }

  const json = parseSong(JSON.stringify({
    tracks: [{
      instrument: 'erhu',
      vibrato: 0.5,
      slide: 0.08,
      notes: [{ note: 'D4', at: 0, beats: 1 }, { note: 'E4', at: 1, beats: 1 }]
    }]
  }));
  const compiledJson = compileSong(json);
  assert.equal(compiledJson.tracks[0].vibrato, 0.5);
  assert.equal(compiledJson.notes[1].slideFromMidi, 62);

  assert.throws(
    () => parseSong('track e instrument=erhu vibrato=1.2\nD4:1'),
    (err) => err instanceof SongError && /vibrato/.test(err.message)
  );
  assert.throws(
    () => parseSong('track e instrument=erhu slide=0.6\nD4:1'),
    (err) => err instanceof SongError && /slide/.test(err.message)
  );
});

test('乐器：东方三件制音、自然衰减与音域', () => {
  const guzheng = compileSong(parseSong('title: Zheng\ntempo: 60\ntrack g instrument=guzheng\nA3:1'));
  assert.equal(guzheng.notes[0].release, Infinity);
  assert.ok(guzheng.notes[0].end > guzheng.notes[0].keyUp);

  const erhu = compileSong(parseSong('title: Erhu\ntempo: 60\ntrack e instrument=erhu\nD4:1\npedal: 0-4'));
  assert.equal(erhu.notes[0].release, 1);
  assert.ok(Math.abs(erhu.notes[0].end - 1.5) < 1e-9);

  const dizi = compileSong(parseSong('title: Dizi\ntempo: 60\ntrack d instrument=dizi\nC5:1\npedal: 0-4'));
  assert.equal(dizi.notes[0].release, 1);
  assert.ok(Math.abs(dizi.notes[0].end - 1.15) < 1e-9);

  assert.throws(
    () => compileSong(parseSong('track g instrument=guzheng\nC1:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track e instrument=erhu\nC3:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
  assert.throws(
    () => compileSong(parseSong('track d instrument=dizi\nC3:1')),
    (err) => err instanceof SongError && err.code === 'RANGE'
  );
});

test('乐器：v2 bend / grace / trill 记谱与渲染', () => {
  const song = parseSong(`
    title: Eastern V2
    tempo: 60
    reverb: 0.1
    volume: 0.7
    track e instrument=erhu
    D4:1{grace=E4} E4:1{bend=+2,time=0.2} G4:1{trill=+2}
    track g instrument=guzheng
    A3:1{bend=+2}
  `);
  const compiled = compileSong(song);
  const erhu = compiled.notes.filter((note) => note.instrument === 'erhu');
  assert.equal(erhu[0].graceFromMidi, 64);
  assert.equal(erhu[1].bend, 2);
  assert.ok(Math.abs(erhu[1].bendTime - 0.2) < 1e-9);
  assert.equal(erhu[2].trill, 2);

  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  for (let i = 0; i < audio.left.length; i += 53) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Number.isFinite(audio.right[i]));
  }

  const json = parseSong(JSON.stringify({
    tracks: [{
      instrument: 'erhu',
      notes: [{
        note: 'D4',
        at: 0,
        beats: 1,
        bend: 2,
        bendTime: 0.2,
        grace: 'E4',
        trill: 2
      }]
    }]
  }));
  const note = compileSong(json).notes[0];
  assert.equal(note.bend, 2);
  assert.equal(note.graceFromMidi, 64);
  assert.equal(note.trill, 2);

  assert.throws(
    () => parseSong('track e instrument=erhu\nD4:1{bend=20}'),
    (err) => err instanceof SongError && /bend/.test(err.message)
  );
  assert.throws(
    () => parseSong('track e instrument=erhu\nD4:1{trill=0}'),
    (err) => err instanceof SongError && /trill/.test(err.message)
  );
  assert.throws(
    () => parseSong('track e instrument=erhu\nD4:1{time=0.2}'),
    (err) => err instanceof SongError && /time/.test(err.message)
  );
  assert.throws(
    () => parseSong('track e instrument=erhu\nD4:1{nope=1}'),
    (err) => err instanceof SongError && /未知演奏法/.test(err.message)
  );
});

test('编译：配器超过 5 件给出警告', () => {
  const song = parseSong(`
    title: Too Many
    tempo: 60
    track a instrument=piano
    C4:1
    track b instrument=musicbox
    C5:1
    track c instrument=harp
    C4:1
    track d instrument=strings
    G3:1
    track e instrument=flute
    A4:1
    track f instrument=bass
    C2:1
  `);
  const compiled = compileSong(song);
  assert.ok(compiled.warnings.some((warning) => warning.includes('配器过多')));
});

test('编译：踏板决定制音时刻', () => {
  const base = parseSong('title: P\ntempo: 60\ntrack m\nC4:1\n');
  const dry = compileSong(base);
  assert.equal(dry.notes[0].release, 1);
  assert.ok(Math.abs(dry.notes[0].end - 1.25) < 1e-9);

  const sustained = parseSong('title: P\ntempo: 60\ntrack m\nC4:1\npedal: 0-2\n');
  const wet = compileSong(sustained);
  assert.equal(wet.notes[0].release, 2);
  assert.ok(Math.abs(wet.notes[0].end - 2.25) < 1e-9);
});

test('合成：无 NaN、峰值受控、可编码 WAV', () => {
  const song = parseSong('title: Synth\ntempo: 120\nreverb: 0.2\ntrack m\nC4:0.5 E4:0.5 G4:1\n');
  const compiled = compileSong(song);
  const audio = renderSong(compiled, { sampleRate: 22050 });
  assert.equal(audio.left.length, audio.right.length);
  assert.ok(audio.left.length > 1000);
  assert.ok(audio.peak > 0 && audio.peak <= 0.9001);
  const quiet = renderSong(compiled, { sampleRate: 22050, volume: 0.5 });
  assert.ok(Math.abs(quiet.peak - 0.45) < 0.001);
  for (let i = 0; i < audio.left.length; i += 97) {
    assert.ok(Number.isFinite(audio.left[i]));
    assert.ok(Math.abs(audio.left[i]) <= 1);
  }
  const wav = encodeWav(audio.left, audio.right, audio.sampleRate);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readUInt32LE(24), 22050);
  assert.equal(wav.length, 44 + audio.left.length * 4);
});

test('wrapper：Windows 脚本存在并指向 vibe.js', () => {
  const scripts = fileURLToPath(new URL('../../scripts/', import.meta.url));
  for (const name of ['vibe.ps1', 'vibe.cmd']) {
    assert.ok(existsSync(join(scripts, name)), `${name} should exist`);
  }
  assert.match(readFileSync(join(scripts, 'vibe.ps1'), 'utf8'), /vibe\.js/);
  assert.match(readFileSync(join(scripts, 'vibe.cmd'), 'utf8'), /vibe\.ps1/);
});

test('CLI：instruments 列出二十六种乐器' , () => {
  const result = execFileSync(process.execPath, [CLI, 'instruments', '--json'], { encoding: 'utf8' });
  const data = JSON.parse(result);
  assert.equal(data.ok, true);
  assert.deepEqual(data.instruments.map((item) => item.name), ['piano', 'musicbox', 'epiano', 'pad', 'harp', 'marimba', 'bass', 'guitar', 'organ', 'strings', 'drums', 'flute', 'vibraphone', 'eguitar', 'cello', 'accordion', 'timpani', 'harpsichord', 'upright', 'steelguitar', 'violin', 'choir', 'tubularbells', 'guzheng', 'erhu', 'dizi']);
  assert.ok(data.instruments[1].range.min);
  assert.equal(data.instruments.find((item) => item.name === 'drums').hits.length, 16);
});

test('CLI：check 示例输出 JSON', () => {
  const result = execFileSync(process.execPath, [CLI, 'check', join(EXAMPLES, 'twinkle.piano'), '--json'], {
    encoding: 'utf8'
  });
  const data = JSON.parse(result);
  assert.equal(data.ok, true);
  assert.equal(data.notes, 66);
  assert.equal(data.tracks.length, 2);
  assert.equal(data.command, 'check');
});

test('CLI：错误返回 JSON 且退出码为 1', () => {
  const result = spawnSync(process.execPath, [CLI, 'check', '-', '--json'], {
    input: 'track m\nC4:1\nH4:1\n',
    encoding: 'utf8'
  });
  assert.equal(result.status, 1);
  const data = JSON.parse(result.stdout);
  assert.equal(data.ok, false);
  assert.equal(data.error.line, 3);
});

test('CLI：render 生成 WAV', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vibe-test-'));
  const out = join(dir, 'song.wav');
  try {
    const result = execFileSync(process.execPath, [CLI, 'render', join(EXAMPLES, 'chords.piano'), '--out', out, '--json'], {
      encoding: 'utf8'
    });
    const data = JSON.parse(result);
    assert.equal(data.ok, true);
    assert.equal(data.wav, out);
    assert.ok(statSync(out).size > 1000);
    const header = readFileSync(out).subarray(0, 12);
    assert.equal(header.toString('ascii', 0, 4), 'RIFF');
    assert.equal(header.toString('ascii', 8, 12), 'WAVE');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
