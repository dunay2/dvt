import { execFileSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { sha256HexUtf8 } from '../src/index.js';

const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const distributionPath = new URL('../dist/index.js', import.meta.url);

describe('supported runtime parity', () => {
  it('executes through the portable ESM graph', () => {
    expect(sha256HexUtf8('abc')).toBe(expected);
  });

  it('exposes the same ESM artifact to Node import and require', () => {
    const esm = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `console.log((await import(${JSON.stringify(distributionPath.href)})).sha256HexUtf8('abc'))`,
      ],
      { encoding: 'utf8' }
    ).trim();
    const cjs = execFileSync(
      process.execPath,
      [
        '--eval',
        `console.log(require(${JSON.stringify(fileURLToPath(distributionPath))}).sha256HexUtf8('abc'))`,
      ],
      { encoding: 'utf8' }
    ).trim();

    expect(esm).toBe(expected);
    expect(cjs).toBe(expected);
  });
});
