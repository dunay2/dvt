const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCatalogReconciliation,
  planCatalogReconciliation,
} = require('../planning-db/catalog-reconciliation.cjs');
const {
  validateImplementationReferenceRelocation,
  projectImplementationReferenceRelocation,
  buildImplementationReferenceRelocationSql,
} = require('../planning-db/catalog-implementation-reference-relocation.cjs');

const from = { path: 'scripts/planning-db-operate.cjs', symbol: 'buildPlanningDbOperateHelpText' };
const to = { path: 'scripts/planning-db/operate/cli.cjs', symbol: from.symbol };
const relocation = {
  sourceCommit: 'a'.repeat(40),
  targetCommit: 'b'.repeat(40),
  selectors: [
    { field: 'implementation_refs', index: 0, from, to },
    { field: 'symbol_refs', index: 0, from, to },
    { field: 'raw_manifest.symbols', index: 0, from, to },
  ],
};
const row = {
  rail_id: 'imported#HELP',
  source_path: 'docs/original-authority.md',
  source_content_sha256: 'c'.repeat(64),
  rail_status: 'implemented',
  implementation_refs: [`${from.path}#${from.symbol}`],
  symbol_refs: [{ path: from.path, name: from.symbol, owner: 'ForeignOwner', cq: ['OtherRail'] }],
  raw_manifest: {
    symbols: [{ path: from.path, name: from.symbol, owner: 'DifferentOwner', tests: ['keep'] }],
    unknown: { nested: ['preserve', { flag: true }] },
    redGreenCycles: [{ id: 'existing-cycle', patchSurfaces: ['keep-path'] }],
  },
};
const request = {
  designId: 'GH-3749-IMPLEMENTATION-REFERENCE-RELOCATION',
  actor: 'test',
  idempotencyKey: 'exact-implementation-relocation',
  changes: [
    {
      origin: 'imported',
      railId: row.rail_id,
      expectedRowSha256: 'd'.repeat(64),
      implementationReferences: relocation,
    },
  ],
};

test('existing catalog parser accepts exclusive imported implementation-reference selectors', () => {
  assert.deepEqual(parseCatalogReconciliation(request).catalogReconciliation, request);
});

test('existing catalog planner changes only selected paths and retains foreign symbol authority', () => {
  const before = structuredClone(row);
  const proof = {
    sourceCommit: relocation.sourceCommit,
    targetCommit: relocation.targetCommit,
    head: relocation.targetCommit,
  };
  const [planned] = planCatalogReconciliation(
    request,
    [{ origin: 'imported', row: before, snapshot_hash: request.changes[0].expectedRowSha256 }],
    new Map([[`implementation:${row.rail_id}`, proof]])
  );
  assert.deepEqual(before, row);
  assert.deepEqual(planned.after, {
    ...row,
    implementation_refs: [`${to.path}#${to.symbol}`],
    symbol_refs: [{ ...row.symbol_refs[0], path: to.path }],
    raw_manifest: {
      ...row.raw_manifest,
      symbols: [{ ...row.raw_manifest.symbols[0], path: to.path }],
    },
  });
  assert.deepEqual(planned.proof, proof);
});

test('implementation-reference presence is exclusive even when any competing patch is null', () => {
  for (const key of [
    'source',
    'reference',
    'evidenceRetirement',
    'sourceContent',
    'railRetirement',
    'currentDocument',
  ]) {
    assert.throws(
      () =>
        parseCatalogReconciliation({
          ...request,
          changes: [{ ...request.changes[0], [key]: null }],
        }),
      /CATALOG-IMPLEMENTATION/
    );
  }
  for (const value of [null, undefined, false, {}, [], 'selectors']) {
    assert.throws(
      () =>
        parseCatalogReconciliation({
          ...request,
          changes: [{ ...request.changes[0], implementationReferences: value }],
        }),
      /CATALOG/
    );
  }
  assert.throws(
    () =>
      parseCatalogReconciliation({
        ...request,
        changes: [{ ...request.changes[0], origin: 'local' }],
      }),
    /exclusive imported/
  );
});

test('implementation-reference request rejects open keys, partial commits and arbitrary paths or symbols', () => {
  for (const invalid of [
    { ...relocation, extra: true },
    { ...relocation, sourceCommit: 'HEAD' },
    { ...relocation, targetCommit: 'B'.repeat(40) },
    { ...relocation, sourceCommit: { value: relocation.sourceCommit } },
    { ...relocation, selectors: [] },
    ...[
      { ...relocation.selectors[0], extra: true },
      { ...relocation.selectors[0], field: 'raw_manifest.commandQueryRails' },
      { ...relocation.selectors[0], index: -1 },
      { ...relocation.selectors[0], index: 0.5 },
      { ...relocation.selectors[0], index: Number.MAX_SAFE_INTEGER + 1 },
      { ...relocation.selectors[0], from: { ...from, extra: true } },
      { ...relocation.selectors[0], to: { ...to, symbol: 'renamed' } },
      { ...relocation.selectors[0], to: from },
      ...[
        '../outside.cjs',
        '/absolute.cjs',
        'scripts//file.cjs',
        'scripts/./file.cjs',
        'scripts\\file.cjs',
        'https://host/file.cjs',
        'scripts/file#alias.cjs',
        'scripts/file\n.cjs',
      ].map((path) => ({ ...relocation.selectors[0], to: { ...to, path } })),
      ...['', 'name#alias', 'factory..method', 'function()'].map((symbol) => ({
        ...relocation.selectors[0],
        from: { ...from, symbol },
        to: { ...to, symbol },
      })),
    ].map((selector) => ({ ...relocation, selectors: [selector] })),
  ])
    assert.throws(
      () => validateImplementationReferenceRelocation(invalid),
      /CATALOG-IMPLEMENTATION/
    );
  assert.throws(
    () =>
      validateImplementationReferenceRelocation({
        ...relocation,
        selectors: [relocation.selectors[0], relocation.selectors[0]],
      }),
    /Duplicate/
  );
  assert.throws(
    () =>
      validateImplementationReferenceRelocation({
        ...relocation,
        selectors: [
          relocation.selectors[0],
          { ...relocation.selectors[1], to: { ...to, path: 'scripts/other.cjs' } },
        ],
      }),
    /Conflicting/
  );
});

test('projection rejects stale values, unsupported shapes, absent positions and incomplete mirrors', () => {
  const proof = {
    sourceCommit: relocation.sourceCommit,
    targetCommit: relocation.targetCommit,
    head: relocation.targetCommit,
  };
  for (const invalid of [
    { ...row, implementation_refs: [] },
    { ...row, implementation_refs: null },
    { ...row, implementation_refs: [`prefix-${from.path}#${from.symbol}`] },
    { ...row, symbol_refs: [{ path: from.path, name: 'different' }] },
    { ...row, symbol_refs: [null] },
    { ...row, raw_manifest: { ...row.raw_manifest, symbols: [`${from.path}#${from.symbol}`] } },
  ])
    assert.throws(
      () => projectImplementationReferenceRelocation(invalid, relocation, proof),
      /CATALOG-IMPLEMENTATION/
    );
  for (const field of ['implementation_refs', 'symbol_refs', 'raw_manifest.symbols']) {
    assert.throws(
      () =>
        projectImplementationReferenceRelocation(
          row,
          {
            ...relocation,
            selectors: relocation.selectors.filter((selector) => selector.field !== field),
          },
          proof
        ),
      /mirror/
    );
  }
  for (const invalid of [
    null,
    { ...proof, sourceCommit: 'e'.repeat(40) },
    { ...proof, targetCommit: 'e'.repeat(40) },
    { ...proof, head: 'e'.repeat(40) },
  ]) {
    assert.throws(
      () => projectImplementationReferenceRelocation(row, relocation, invalid),
      /PROOF/
    );
  }
});

test('duplicate occurrences and string/object forms retain positions, unknown metadata and sibling symbols', () => {
  const before = structuredClone(row);
  before.implementation_refs.push({
    path: from.path,
    name: from.symbol,
    dddOwner: 'SeparateOwner',
    unknown: { tags: ['x', 'y'] },
  });
  before.symbol_refs.push(`${from.path}#${from.symbol}`);
  before.raw_manifest.symbols.push({
    path: 'scripts/other.cjs',
    name: 'untouched',
    owner: 'Sibling',
  });
  const original = structuredClone(before);
  const selected = {
    ...relocation,
    selectors: [
      ...relocation.selectors,
      { field: 'implementation_refs', index: 1, from, to },
      { field: 'symbol_refs', index: 1, from, to },
    ],
  };
  const proof = {
    sourceCommit: selected.sourceCommit,
    targetCommit: selected.targetCommit,
    head: selected.targetCommit,
  };
  assert.throws(
    () => projectImplementationReferenceRelocation(before, relocation, proof),
    /mirror/
  );
  const patch = projectImplementationReferenceRelocation(before, selected, proof);
  assert.deepEqual(before, original);
  assert.deepEqual(patch.implementation_refs, [
    `${to.path}#${to.symbol}`,
    { ...before.implementation_refs[1], path: to.path },
  ]);
  assert.deepEqual(patch.symbol_refs, [
    { ...before.symbol_refs[0], path: to.path },
    `${to.path}#${to.symbol}`,
  ]);
  assert.deepEqual(patch.raw_manifest, {
    ...before.raw_manifest,
    symbols: [{ ...before.raw_manifest.symbols[0], path: to.path }, before.raw_manifest.symbols[1]],
  });
  assert.deepEqual(Object.keys(patch).sort(), [
    'implementation_refs',
    'raw_manifest',
    'symbol_refs',
  ]);
});

test('SQL builder binds only selected leaf data and composes against the native before-snapshot', () => {
  const parameters = [];
  const columns = buildImplementationReferenceRelocationSql(relocation, {
    beforeSnapshot: '$2::jsonb',
    bind: (value) => {
      parameters.push(value);
      return `$${parameters.length + 2}`;
    },
  });
  assert.deepEqual(Object.keys(columns).sort(), [
    'implementation_refs',
    'raw_manifest',
    'symbol_refs',
  ]);
  for (const expression of Object.values(columns)) {
    assert.ok(expression.includes('$2::jsonb'));
    assert.ok(expression.includes('jsonb_set('));
    assert.ok(!expression.includes(to.path));
  }
  assert.ok(parameters.includes(JSON.stringify(`${to.path}#${to.symbol}`)));
  assert.ok(parameters.includes(JSON.stringify(to.path)));
  assert.ok(parameters.some((value) => Array.isArray(value) && value.join('/') === 'symbols/0'));
  assert.ok(
    parameters.every(
      (value) =>
        Array.isArray(value) ||
        [JSON.stringify(to.path), JSON.stringify(`${to.path}#${to.symbol}`)].includes(value)
    )
  );
  assert.throws(
    () =>
      buildImplementationReferenceRelocationSql(
        {
          ...relocation,
          selectors: [{ ...relocation.selectors[0], field: 'raw_manifest; drop table authority' }],
        },
        {
          beforeSnapshot: '$2::jsonb',
          bind: () => {
            assert.fail('Invalid request must not reach SQL binding');
          },
        }
      ),
    /CATALOG-IMPLEMENTATION/
  );
});

test('relocation planning retains native full-row CAS and requires a stored proof', () => {
  const snapshots = [
    { origin: 'imported', row, snapshot_hash: request.changes[0].expectedRowSha256 },
  ];
  assert.throws(() => planCatalogReconciliation(request, snapshots, new Map()), /PROOF/);
  assert.throws(
    () =>
      planCatalogReconciliation(
        request,
        [{ ...snapshots[0], snapshot_hash: 'e'.repeat(64) }],
        new Map()
      ),
    /STALE/
  );
  assert.throws(
    () =>
      planCatalogReconciliation(
        request,
        [{ ...snapshots[0], snapshot_hash: undefined }],
        new Map()
      ),
    /SNAPSHOT/
  );
});
