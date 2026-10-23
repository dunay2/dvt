/** Owned concern: prove atomic replacement of component-owned source associations. */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  bindingSetHash,
  validateComponentBindings,
  replaceComponentBindings,
} = require('./component-source-responsibility-store.cjs');
const binding = {
  responsibilityId: 'RESP-MODEL',
  componentId: 'SYS-MODEL',
  path: 'model.ts',
  symbol: 'model',
  role: 'implements',
  testPaths: ['model.test.ts'],
};
const authority = [
  { responsibility_id: 'RESP-MODEL', component_id: 'SYS-MODEL', status: 'approved' },
];

test('binding set hashes are independent of order and include every semantic field', () => {
  const second = { ...binding, symbol: 'second' };
  assert.equal(bindingSetHash([binding, second]), bindingSetHash([second, binding]));
  assert.notEqual(bindingSetHash([binding]), bindingSetHash([{ ...binding, role: 'delegates' }]));
});

test('component binding policy rejects unknown, duplicate, noncanonical and wrong-owner associations', () => {
  assert.deepEqual(validateComponentBindings('SYS-MODEL', [binding], authority), [binding]);
  for (const [values, rows] of [
    [[binding, binding], authority],
    [[binding], []],
    [[{ ...binding, componentId: 'SYS-OTHER' }], authority],
    [[binding], [{ ...authority[0], component_id: 'SYS-OTHER' }]],
    [[binding], [{ ...authority[0], status: 'proposed' }]],
  ])
    assert.throws(() => validateComponentBindings('SYS-MODEL', values, rows));
  assert.doesNotThrow(() =>
    validateComponentBindings(
      'SYS-MODEL',
      [{ ...binding, role: 'delegates' }],
      [{ ...authority[0], component_id: 'SYS-OTHER' }]
    )
  );
});

test('replacement rejects a stale set before any deletion', async () => {
  const calls = [];
  const client = {
    query: async (sql) => {
      calls.push(sql);
      return {
        rows: sql.includes('component_source_responsibility') ? [{ ...binding }] : authority,
      };
    },
  };
  await assert.rejects(
    replaceComponentBindings(client, {
      componentId: 'SYS-MODEL',
      sourceBindings: [],
      expectedBindingsHash: bindingSetHash([]),
    }),
    /stale/i
  );
  assert.ok(calls.every((sql) => !/delete|insert/iu.test(sql)));
});
