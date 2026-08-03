'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { parseArgs } = require('./run-supported-runtime-proof.cjs');

test('supported runtime proof defaults to the governed three-baseline profile', () => {
  assert.deepEqual(parseArgs([]), { iterations: 3, outputPath: undefined });
});

test('supported runtime proof accepts explicit bounded iteration and output controls', () => {
  assert.deepEqual(parseArgs(['--iterations', '1', '--output', 'proof.json']), {
    iterations: 1,
    outputPath: 'proof.json',
  });
  assert.throws(() => parseArgs(['--iterations', '0']), /positive integer/);
});
