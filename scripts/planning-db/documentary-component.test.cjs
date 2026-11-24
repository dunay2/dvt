/** Owned concern: documentary nature cannot conceal executable implementation or missing evidence. */
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  evaluateDocumentaryComponent,
  isDocumentaryRailDeclaration,
} = require('./documentary-component.cjs');

const prose = 'docs/guide.md';
const risk = 'docs/risk-register/quality/R-20261124-DOCUMENTARY.yaml';
const riskText =
  'id: R-20261124-DOCUMENTARY\ntitle: Current evidence\nstatus: Open\ndate: 2026-11-24\nowners: [Architecture]\nseverity: Low\nprobability: Low\nsummary: Passive risk narrative\nmitigation: Keep real validation\n';
function fixture(overrides = {}) {
  return {
    component: {
      component_id: 'DOC',
      kind: 'documentary-collection',
      runtime: 'none',
      status: 'review',
    },
    unit: { id: 'DOC', cq_rails: 'none - passive documentation collection' },
    files: [{ path: prose, component_unit: 'DOC' }],
    bindings: [],
    implementationRefs: [],
    documentaryLinks: [{ component_id: 'SEMANTIC', document_path: prose }],
    readBytes: () => Buffer.from('# Current guide\n\n```js\nexport const example = 1;\n```\n'),
    ...overrides,
  };
}
const codes = (input) => evaluateDocumentaryComponent(input).map((finding) => finding.code);

test('closed historical receipt format stays passive while unknown and executable JSONL rejects', () => {
  const record = {
    timestampUtc: '2026-04-01T15:37:24.1230850Z',
    baseBranch: 'main',
    branch: 'refactor/actual-change',
    targetBranchesAnalyzed: 1,
    supersededCandidates: 0,
    verifyPrepush: 'passed',
    durationSeconds: 29.7,
  };
  const check = (value) =>
    codes(
      fixture({
        files: [{ path: 'history.jsonl', component_unit: 'DOC' }],
        documentaryLinks: [{ component_id: 'SEMANTIC', document_path: 'history.jsonl' }],
        readBytes: () => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)),
      })
    );
  assert.deepEqual(check(record), []);
  assert.deepEqual(check({ ...record, verifyPrepush: 'failed' }), []);
  for (const invalid of [
    { ...record, script: 'run code' },
    { ...record, durationSeconds: -1 },
    { ...record, durationSeconds: '29.7' },
    { ...record, targetBranchesAnalyzed: 1.5 },
    { ...record, supersededCandidates: -1 },
    { ...record, verifyPrepush: 'success' },
    { ...record, timestampUtc: '2026-02-30T12:00:00Z' },
    { ...record, timestampUtc: 'tomorrow' },
    { ...record, branch: 'x\nrun code' },
    { ...record, baseBranch: '../main' },
    { ...record, branch: null },
    [],
    {},
    '{invalid',
  ])
    assert.ok(check(invalid).includes('invalid_documentary_content'));
});

test('documentary declaration requires bounded native scope and every current passive manifest alias', () => {
  const rail = {
    allowed_implementation_surfaces: ['docs/planning/**'],
    implementation_refs: [{ path: 'docs/planning/plan.md', sourceKind: 'manifest_symbol' }],
  };
  const bytes = () => Buffer.from('# Declared future vocabulary, documentary work only\n');
  assert.equal(isDocumentaryRailDeclaration(rail, bytes), true);
  for (const changed of [
    { ...rail, allowed_implementation_surfaces: [] },
    { ...rail, allowed_implementation_surfaces: ['docs/**', 'apps/**'] },
    { ...rail, allowed_implementation_surfaces: ['docs/../apps/**'] },
    {
      ...rail,
      implementation_refs: [{ path: 'docs/planning/plan.md', sourceKind: 'source_code' }],
    },
    { ...rail, implementation_refs: ['docs/planning/plan.md'] },
    {
      ...rail,
      implementation_refs: [
        ...rail.implementation_refs,
        { path: 'docs/planning/code.ts', sourceKind: 'manifest_symbol' },
      ],
    },
    {
      ...rail,
      implementation_refs: [
        ...rail.implementation_refs,
        { path: 'docs/planning/config.json', sourceKind: 'manifest_symbol' },
      ],
    },
    { ...rail, implementation_refs: [{ path: 'docs/other.md', sourceKind: 'manifest_symbol' }] },
  ])
    assert.equal(isDocumentaryRailDeclaration(changed, bytes), false);
  assert.equal(
    isDocumentaryRailDeclaration(rail, () => null),
    false
  );
  assert.equal(
    isDocumentaryRailDeclaration(rail, () => Buffer.from([255, 0])),
    false
  );
});

test('real passive prose with a current native semantic link qualifies without claiming implementation', () => {
  assert.deepEqual(codes(fixture()), []);
  assert.deepEqual(
    codes(fixture({ component: { kind: 'module' }, files: [{ path: 'source.ts' }] })),
    []
  );
});

for (const extension of [
  'ts',
  'tsx',
  'js',
  'mjs',
  'cjs',
  'py',
  'ps1',
  'sh',
  'sql',
  'css',
  'html',
  'mdx',
  'svg',
  'json',
  'yaml',
  'toml',
  'xml',
  'unknown',
]) {
  test('documentary nature rejects executable, configuration or unknown form .' + extension, () => {
    assert.ok(
      codes(
        fixture({ files: [{ path: 'docs/source.' + extension, component_unit: 'DOC' }] })
      ).includes('non_documentary_artifact')
    );
  });
}

test('known raster assets need actual format bytes, not a passive-looking suffix', () => {
  for (const [name, bytes] of [
    ['asset.png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])],
    ['asset.jpg', Buffer.from([255, 216, 255, 0])],
    ['asset.ico', Buffer.from([0, 0, 1, 0, 1, 0, 0])],
  ]) {
    const path = 'docs/' + name;
    const input = fixture({
      files: [{ path, component_unit: 'DOC' }],
      documentaryLinks: [{ component_id: 'SEMANTIC', document_path: path }],
      readBytes: () => bytes,
    });
    assert.deepEqual(codes(input), []);
    assert.ok(
      codes({ ...input, readBytes: () => Buffer.from('export const disguised = true') }).includes(
        'invalid_documentary_content'
      )
    );
  }
});

test('bounded risk records are documentary while malformed, executable and unknown fields reject', () => {
  const input = fixture({
    files: [{ path: risk, component_unit: 'DOC' }],
    documentaryLinks: [{ component_id: 'SEMANTIC', document_path: risk }],
    readBytes: () => Buffer.from(riskText),
  });
  assert.deepEqual(codes(input), []);
  for (const text of [
    riskText + 'run: echo unsafe\n',
    riskText + 'unknown: value\n',
    riskText.replace('summary:', 'summary: !!js/function '),
    riskText.replace('id: R-', 'id: OTHER-'),
    riskText.replace('owners: [Architecture]', 'owners: []'),
    'not: [valid',
  ]) {
    assert.ok(
      codes({ ...input, readBytes: () => Buffer.from(text) }).includes(
        'invalid_documentary_content'
      )
    );
  }
});

test('all source binding roles and actual implementation references reject even on passive-looking paths', () => {
  for (const role of ['implements', 'delegates', 'verifies']) {
    assert.ok(
      codes(fixture({ bindings: [{ component_id: 'DOC', source_path: prose, role }] })).includes(
        'documentary_source_binding'
      )
    );
  }
  assert.ok(
    codes(fixture({ implementationRefs: [{ path: prose, name: 'Run' }] })).includes(
      'documentary_rail_implementation'
    )
  );
  assert.ok(
    codes(
      fixture({ implementationRefs: [{ componentId: 'DOC', path: 'another/source.ts' }] })
    ).includes('documentary_rail_implementation')
  );
});

test('documentary declaration cannot claim runtime, an implementation rail or implemented lifecycle', () => {
  assert.ok(
    codes(fixture({ component: { ...fixture().component, runtime: 'node' } })).includes(
      'documentary_runtime'
    )
  );
  assert.ok(
    codes(fixture({ component: { ...fixture().component, status: 'implemented' } })).includes(
      'documentary_implementation_status'
    )
  );
  assert.ok(
    codes(fixture({ unit: { id: 'DOC', cq_rails: 'StartRun' } })).includes(
      'documentary_command_query_authority'
    )
  );
});

test('missing, deleted, self or nonlocal document links cannot establish native semantic linkage', () => {
  for (const documentaryLinks of [
    [],
    [{ component_id: 'DOC', document_path: prose }],
    [{ component_id: 'SEMANTIC', document_path: 'docs/deleted.md' }],
    [{ component_id: 'SEMANTIC', document_path: 'https://example.com/guide.md' }],
  ]) {
    assert.ok(codes(fixture({ documentaryLinks })).includes('missing_documentary_semantic_link'));
  }
});

test('missing, foreign or unavailable current artifact evidence fails closed', () => {
  assert.ok(codes(fixture({ files: [] })).includes('empty_documentary_collection'));
  assert.ok(
    codes(fixture({ files: [{ path: prose, component_unit: 'AMBIGUOUS' }] })).includes(
      'invalid_documentary_ownership'
    )
  );
  assert.throws(
    () =>
      codes(
        fixture({
          readBytes() {
            throw new Error('Git unavailable');
          },
        })
      ),
    /Git unavailable/
  );
  assert.ok(
    codes(fixture({ readBytes: () => Buffer.from([0xff]) })).includes('invalid_documentary_content')
  );
});
