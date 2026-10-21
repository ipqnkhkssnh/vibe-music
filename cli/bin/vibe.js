#!/usr/bin/env node
/**
 * vibe — Vibe Music 命令行工具入口。
 */

import { main } from '../src/cli.js';

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code == null ? 0 : code;
  })
  .catch((err) => {
    console.error(err && err.stack ? err.stack : String(err));
    process.exitCode = 1;
  });
