import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('root Vitest config keeps engine coverage thresholds and package test discovery explicit', () => {
  const config = readFileSync('vitest.config.ts', 'utf8');

  assert.match(config, /globals:\s*true/u);
  assert.match(config, /environment:\s*'node'/u);
  assert.match(config, /provider:\s*'v8'/u);
  assert.match(config, /include:\s*\[\s*'packages\/@dvt\/engine\/src\/\*\*\/\*\.ts'\s*\]/u);

  for (const [threshold, value] of [
    ['statements', '65'],
    ['branches', '55'],
    ['functions', '65'],
    ['lines', '65'],
  ]) {
    assert.match(config, new RegExp(`${threshold}:\\s*${value}`));
  }

  assert.match(config, /include:\s*\[\s*'packages\/\*\*\/\*\.\{test,spec\}\.ts'\s*\]/u);
  assert.match(config, /exclude:\s*\[\s*'node_modules\/\*\*'/u);
  assert.match(config, /'packages\/\*\*\/node_modules\/\*\*'/u);
  assert.match(config, /'dist\/\*\*'/u);
});
