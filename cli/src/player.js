/**
 * player.js — 调用系统播放器播放 WAV。
 *
 * macOS 用 afplay；Linux 依次尝试 ffplay / paplay / aplay / mpv；
 * Windows 用 PowerShell 的 SoundPlayer。也可用 --player 或 VIBE_PLAYER 覆盖。
 */

import { spawn, spawnSync } from 'node:child_process';

function commandExists(command) {
  if (!command) return false;
  if (command.includes('/') || command.includes('\\')) {
    return true;
  }
  const probe = process.platform === 'win32'
    ? spawnSync('where', [command], { stdio: 'ignore' })
    : spawnSync('which', [command], { stdio: 'ignore' });
  return probe.status === 0;
}

function descriptorFor(name) {
  switch (name) {
    case 'afplay':
      return { name, cmd: 'afplay', args: (file) => [file] };
    case 'ffplay':
      return { name, cmd: 'ffplay', args: (file) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', file] };
    case 'paplay':
      return { name, cmd: 'paplay', args: (file) => [file] };
    case 'aplay':
      return { name, cmd: 'aplay', args: (file) => ['-q', file] };
    case 'mpv':
      return { name, cmd: 'mpv', args: (file) => ['--no-video', '--really-quiet', file] };
    case 'powershell':
    case 'powershell.exe':
      return {
        name: 'powershell',
        cmd: 'powershell.exe',
        args: (file) => [
          '-NoProfile',
          '-Command',
          `(New-Object Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync()`
        ]
      };
    default:
      return { name, cmd: name, args: (file) => [file] };
  }
}

export function detectPlayer(override) {
  const configured = override || process.env.VIBE_PLAYER || null;
  if (configured) {
    const desc = descriptorFor(configured);
    return commandExists(desc.cmd) ? desc : null;
  }

  let candidates;
  if (process.platform === 'darwin') candidates = ['afplay'];
  else if (process.platform === 'win32') candidates = ['powershell'];
  else candidates = ['ffplay', 'paplay', 'aplay', 'mpv'];

  for (const name of candidates) {
    const desc = descriptorFor(name);
    if (commandExists(desc.cmd)) return desc;
  }
  return null;
}

/**
 * 阻塞播放，直到播放器退出。
 * @returns {Promise<{played: boolean, player: string|null, code?: number, error?: string}>}
 */
export function playAudio(file, options = {}) {
  const requested = options.player || process.env.VIBE_PLAYER || null;
  const descriptor = detectPlayer(options.player);
  if (!descriptor) {
    return Promise.resolve({
      played: false,
      player: null,
      error: requested
        ? `找不到播放器 "${requested}"`
        : '系统里没有找到可用的音频播放器（可用 --player 指定）'
    });
  }

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(descriptor.cmd, descriptor.args(file), { stdio: 'ignore' });
    } catch (err) {
      resolve({ played: false, player: descriptor.name, error: err.message });
      return;
    }
    let finished = false;
    const done = (result) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };
    child.on('error', (err) => {
      done({ played: false, player: descriptor.name, error: err.message });
    });
    child.on('close', (code, signal) => {
      if (code === 0) done({ played: true, player: descriptor.name, code });
      else {
        done({
          played: false,
          player: descriptor.name,
          code: code == null ? undefined : code,
          error: signal ? `播放器被信号 ${signal} 终止` : `播放器退出码 ${code}`
        });
      }
    });
  });
}
