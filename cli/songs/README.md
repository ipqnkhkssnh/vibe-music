# songs/ — 用户与 Agent 创作的曲子

这里放**新创作**的 `.piano` / `.json` 谱面，和 `examples/` 的内置示例分开：

- `examples/`：CLI 自带示例，参与文档与测试。
- `songs/`：你或 Agent 写的新曲子，默认不参与测试。

建议命名：`<slug>.piano`（例如 `quiet-rain.piano`），并用 CLI 生成同名 WAV：

```bash
cd ..
node bin/vibe.js check songs/quiet-rain.piano --json
node bin/vibe.js play songs/quiet-rain.piano --out songs/quiet-rain.wav --json
```
