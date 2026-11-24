/** Owned concern: native documentary taxonomy never admits executable responsibility claims. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { parseArgs } = require('../planning-db-operate.cjs');
const args = [
  'architecture-component',
  'record',
  '--design',
  'DOC-TEST',
  '--component',
  'SYS-DOC-TEST',
  '--name',
  'Document collection',
  '--kind',
  'documentary-collection',
  '--layer',
  'infra',
  '--owner',
  'Architecture',
  '--repo-path',
  'docs',
  '--public-contract',
  'Passive documentary ownership and semantic links',
  '--runtime',
  'none',
  '--status',
  'review',
  '--responsibility',
  'RESP-DOC-TEST|Maintain documentary admission|Documentary admission changes|Architecture',
  '--source-ref',
  'https://github.com/dunay2/dvt/issues/3951',
  '--source-content-sha256',
  'a'.repeat(64),
  '--actor',
  'test',
];

test('native taxonomy records documentary nature without declaring a service', () => {
  const command = parseArgs(args);
  assert.equal(command.componentKind, 'documentary-collection');
  assert.equal(command.runtime, 'none');
  assert.equal(command.status, 'review');
});

for (const [flag, value] of [
  ['--runtime', 'node'],
  ['--status', 'implemented'],
]) {
  test('native documentary command rejects ' + flag + '=' + value, () => {
    const changed = [...args];
    changed[changed.indexOf(flag) + 1] = value;
    assert.throws(() => parseArgs(changed), /DOCUMENTARY/);
  });
}

test('native documentary command rejects all declared source associations and executable promotion', () => {
  const binding = [
    {
      componentId: 'SYS-DOC-TEST',
      responsibilityId: 'RESP-DOC-TEST',
      path: 'docs/example.ts',
      symbol: 'example',
      role: 'verifies',
      testPaths: ['test/example.test.cjs'],
    },
  ];
  assert.throws(
    () =>
      parseArgs([
        ...args,
        '--source-bindings',
        JSON.stringify(binding),
        '--expected-bindings-hash',
        'b'.repeat(64),
      ]),
    /DOCUMENTARY/
  );
  assert.throws(
    () =>
      parseArgs([
        ...args,
        '--expected-responsibility-status',
        'approved',
        '--responsibility-status',
        'implemented',
      ]),
    /DOCUMENTARY/
  );
});
