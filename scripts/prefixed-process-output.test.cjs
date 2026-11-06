const assert = require('node:assert/strict');
const { once } = require('node:events');
const { PassThrough } = require('node:stream');
const test = require('node:test');
const { pipePrefixedOutput } = require('./prefixed-process-output.cjs');

test('prefixes complete, empty and trailing lines across chunks and returns the owned reader', async (context) => {
  const lines = [];
  context.mock.method(console, 'log', (line) => lines.push(line));
  const stream = new PassThrough();
  const reader = pipePrefixedOutput(stream, '[worker]');
  const closed = once(reader, 'close');
  stream.write('first\nsec');
  stream.write('ond\r\n\nlast');
  stream.end();
  await closed;
  assert.deepEqual(lines, ['[worker] first', '[worker] second', '[worker] ', '[worker] last']);
  assert.equal(reader.closed, true);
});
