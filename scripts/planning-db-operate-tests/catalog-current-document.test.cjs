/** Owned concern: exact current-document metadata policy.
 * Why: source hashes must not disguise stale application ports.
 * Corner: identity, evidence and nonmatching row ports remain unchanged.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCatalogReconciliation,
  planCatalogReconciliation,
} = require('../planning-db/catalog-reconciliation.cjs');

function fixture(origin = 'imported') {
  const document = {
    commit: 'a'.repeat(40),
    path: 'docs/current.md',
    references: [{ field: 'componentGuides', index: 0, from: 'docs/old.md', to: 'docs/new.md' }],
  };
  const row = {
    rail_id: 'example',
    feature_id: 'EXAMPLE',
    source_path: document.path,
    source_content_sha256: 'b'.repeat(64),
    raw_manifest: {
      featureId: 'EXAMPLE',
      componentGuides: ['docs/old.md'],
      symbols: [{ name: 'keep', owner: 'different' }],
      redGreenCycles: [{ id: 'keep' }],
    },
    ...(origin === 'local' ? { revision: 3 } : {}),
  };
  const request = {
    designId: 'reviewed',
    actor: 'test',
    idempotencyKey: 'document',
    changes: [
      { origin, railId: row.rail_id, expectedRowSha256: '0'.repeat(64), currentDocument: document },
    ],
  };
  const proof = {
    path: document.path,
    commit: document.commit,
    head: document.commit,
    contentSha256: 'c'.repeat(64),
    manifests: [{ featureId: 'EXAMPLE', componentGuides: ['docs/new.md'] }],
  };
  const proofs = new Map([[`document:${document.commit}:${document.path}`, proof]]);
  const snapshots = [{ origin, row, snapshot_hash: '0'.repeat(64) }];
  return { request, row, proof, proofs, snapshots };
}

test('current documents patch only explicit slots and hash, preserving imported identity and local revisions', () => {
  for (const origin of ['imported', 'local']) {
    const f = fixture(origin);
    const before = structuredClone(f.row);
    const result = planCatalogReconciliation(f.request, f.snapshots, f.proofs)[0];
    assert.deepEqual(result.after, {
      ...before,
      source_content_sha256: f.proof.contentSha256,
      raw_manifest: { ...before.raw_manifest, componentGuides: ['docs/new.md'] },
      ...(origin === 'local' ? { revision: 4 } : {}),
    });
    assert.deepEqual(f.row, before);
    f.request.changes[0].currentDocument.references = [];
    assert.deepEqual(
      planCatalogReconciliation(f.request, f.snapshots, f.proofs)[0].after.raw_manifest,
      before.raw_manifest
    );
  }
});

test('current document requests reject mixed modes, broad selectors and evidence mutation', () => {
  const alterations = [
    ...['source', 'sourceContent', 'reference', 'railRetirement', 'evidenceRetirement'].map(
      (key) => (c) => {
        c[key] = {};
      }
    ),
    (c) => {
      c.currentDocument.extra = true;
    },
    (c) => {
      c.currentDocument.path = 'scripts/test.cjs';
    },
    (c) => {
      c.currentDocument.commit = 'HEAD';
    },
    (c) => {
      delete c.currentDocument.references;
    },
    ...[
      { field: 'symbols', index: 0, from: 'docs/old.md', to: 'docs/new.md' },
      { field: 'componentGuides', from: 'docs/old.md', to: 'docs/new.md' },
      { field: 'componentGuides', index: -1, from: 'docs/old.md', to: 'docs/new.md' },
      { field: 'implementationPlan', index: 0, from: 'docs/old.md', to: 'docs/new.md' },
      { field: 'componentGuides', index: 0, from: 'docs/old.md', to: '../outside.md' },
    ].map((ref) => (c) => {
      c.currentDocument.references = [ref];
    }),
    (c) => {
      c.currentDocument.references.push(c.currentDocument.references[0]);
    },
  ];
  for (const alter of alterations) {
    const { request } = fixture();
    alter(request.changes[0]);
    assert.throws(() => parseCatalogReconciliation(request), /CATALOG/);
  }
});

test('document policy rejects missing proof, stale values and source-feature disagreement', () => {
  for (const alter of [
    (f) => f.proofs.clear(),
    (f) => {
      f.snapshots[0].snapshot_hash = 'd'.repeat(64);
    },
    (f) => {
      f.proof.head = 'd'.repeat(40);
    },
    (f) => {
      f.row.source_path = 'docs/other.md';
    },
    (f) => {
      f.row.raw_manifest.componentGuides[0] = 'docs/other.md';
    },
    (f) => {
      f.proof.manifests[0].componentGuides[0] = 'docs/other.md';
    },
    (f) => {
      f.proof.manifests = [];
    },
    (f) => {
      f.proof.manifests.push(f.proof.manifests[0]);
    },
  ]) {
    const f = fixture();
    alter(f);
    assert.throws(() => planCatalogReconciliation(f.request, f.snapshots, f.proofs), /CATALOG/);
  }
});

test('scalar and governing references preserve their shape and keep the query projection aligned', () => {
  const f = fixture();
  Object.assign(f.row.raw_manifest, {
    implementationPlan: 'docs/old.md',
    governingSources: ['docs/old.md'],
  });
  f.row.governing_sources = ['docs/old.md'];
  Object.assign(f.proof.manifests[0], {
    implementationPlan: 'docs/new.md',
    governingSources: ['docs/new.md'],
  });
  f.request.changes[0].currentDocument.references = [
    { field: 'implementationPlan', from: 'docs/old.md', to: 'docs/new.md' },
    { field: 'governingSources', index: 0, from: 'docs/old.md', to: 'docs/new.md' },
  ];
  const { after } = planCatalogReconciliation(f.request, f.snapshots, f.proofs)[0];
  assert.equal(after.raw_manifest.implementationPlan, 'docs/new.md');
  assert.deepEqual(after.governing_sources, after.raw_manifest.governingSources);
  f.row.governing_sources[0] = 'docs/disagreement.md';
  assert.throws(
    () => planCatalogReconciliation(f.request, f.snapshots, f.proofs),
    /projection disagrees/
  );
});

test('hash-only documentary rows need no feature fence, but reference edits still require it', () => {
  const f = fixture();
  f.proof.manifests = [];
  f.request.changes[0].currentDocument.references = [];
  assert.deepEqual(
    planCatalogReconciliation(f.request, f.snapshots, f.proofs)[0].after.raw_manifest,
    f.row.raw_manifest
  );
});

test('historical targets admit only immutable same-repository documentary blob identities', () => {
  const f = fixture();
  const historical = `https://github.com/dunay2/dvt/blob/${'e'.repeat(40)}/docs/old.md`;
  f.request.changes[0].currentDocument.references[0].to = historical;
  f.proof.manifests[0].componentGuides[0] = historical;
  assert.equal(
    planCatalogReconciliation(f.request, f.snapshots, f.proofs)[0].after.raw_manifest
      .componentGuides[0],
    historical
  );
  for (const to of [
    historical.replace('/dunay2/dvt/', '/other/repo/'),
    historical.replace('e'.repeat(40), 'main'),
    historical.replace('/docs/old.md', '/docs/other.md'),
  ]) {
    f.request.changes[0].currentDocument.references[0].to = to;
    assert.throws(() => parseCatalogReconciliation(f.request), /CATALOG/);
  }
});

function portFixture(ownIndex = 0) {
  const f = fixture();
  const rails = ['BuildPlan', 'ClassifyScope'].map((name) => ({
    name,
    type: 'query',
    applicationPort: `scripts/old.cjs ${name}`,
    status: 'implemented',
  }));
  Object.assign(f.row, {
    rail_type: 'query',
    normalized_rail_name: rails[ownIndex].name.toLowerCase(),
    raw_rail: { ...rails[ownIndex], unrelated: { retain: true } },
    rail_status: 'implemented',
  });
  f.row.raw_manifest.commandQueryRails = rails;
  f.row.raw_manifest.mechanizationStatus = 'closed';
  f.proof.manifests[0] = structuredClone(f.row.raw_manifest);
  f.request.changes[0].currentDocument.references = rails.map((rail, index) => ({
    field: 'applicationPort',
    index,
    from: rail.applicationPort,
    to: `scripts/lib/owner.cjs ${rail.name}`,
  }));
  for (const ref of f.request.changes[0].currentDocument.references)
    f.proof.manifests[0].commandQueryRails[ref.index].applicationPort = ref.to;
  f.proof.applicationPorts = rails.map((rail) => ({
    path: 'scripts/lib/owner.cjs',
    symbol: rail.name,
    commit: f.proof.commit,
    head: f.proof.head,
    blob: 'd'.repeat(40),
    contentSha256: 'e'.repeat(64),
    kind: 'function',
    implemented: true,
  }));
  return f;
}

test('application-port relocation updates exact leaves and only the actual row mirror', () => {
  for (const ownIndex of [0, 1]) {
    const f = portFixture(ownIndex);
    const before = structuredClone(f.row);
    const { after } = planCatalogReconciliation(f.request, f.snapshots, f.proofs)[0];
    const expected = structuredClone(before);
    expected.source_content_sha256 = f.proof.contentSha256;
    expected.raw_manifest.commandQueryRails.forEach((rail) => {
      rail.applicationPort = `scripts/lib/owner.cjs ${rail.name}`;
    });
    expected.raw_rail.applicationPort = `scripts/lib/owner.cjs ${before.raw_rail.name}`;
    assert.deepEqual(after, expected);
    assert.deepEqual(f.row, before);
  }
  const f = portFixture();
  f.row.normalized_rail_name = 'unrelated';
  f.row.raw_rail.applicationPort = 'scripts/retained.cjs Other';
  assert.deepEqual(
    planCatalogReconciliation(f.request, f.snapshots, f.proofs)[0].after.raw_rail,
    f.row.raw_rail
  );
});

test('application-port policy rejects missing or omitted proof and unadmitted identity changes', () => {
  const alterations = [
    (f) => {
      f.proof.applicationPorts = [];
    },
    (f) => {
      f.proof.applicationPorts.push(f.proof.applicationPorts[0]);
    },
    (f) => {
      f.proof.applicationPorts[0].head = 'f'.repeat(40);
    },
    (f) => {
      f.proof.applicationPorts[0].contentSha256 = 'invalid';
    },
    (f) => {
      f.proof.applicationPorts[0].implemented = false;
    },
    (f) => {
      f.proof.applicationPorts[0].kind = 'alias';
    },
    (f) => {
      f.request.changes[0].currentDocument.references.pop();
    },
    (f) => {
      f.request.changes[0].currentDocument.references = [];
    },
    (f) => {
      f.row.raw_rail.applicationPort = 'scripts/wrong.cjs BuildPlan';
    },
    (f) => {
      f.row.raw_manifest.commandQueryRails[0].applicationPort = 'scripts/wrong.cjs BuildPlan';
    },
    (f) => {
      f.proof.manifests[0].commandQueryRails[0].applicationPort = 'scripts/wrong.cjs BuildPlan';
    },
    (f) => {
      f.proof.manifests[0].commandQueryRails[0].name = 'Other';
    },
    (f) => {
      f.proof.manifests[0].commandQueryRails[0].type = 'command';
    },
    (f) => {
      f.proof.manifests[0].commandQueryRails[0].status = 'retired';
    },
    (f) => {
      f.proof.manifests[0].mechanizationStatus = 'open';
    },
    (f) => {
      f.proof.manifests[0].commandQueryRails.pop();
    },
    (f) => {
      f.proof.manifests[0].commandQueryRails[0] = null;
    },
    (f) => {
      f.row.raw_manifest.commandQueryRails[1] = { ...f.row.raw_manifest.commandQueryRails[0] };
      f.proof.manifests[0].commandQueryRails[1] = { ...f.proof.manifests[0].commandQueryRails[0] };
    },
    (f) => {
      f.proof.manifests.push(f.proof.manifests[0]);
    },
    (f) => {
      f.proof.manifests = [];
    },
  ];
  for (const alter of alterations) {
    const f = portFixture();
    alter(f);
    assert.throws(() => planCatalogReconciliation(f.request, f.snapshots, f.proofs), /CATALOG/);
  }
});

test('application-port selectors admit only same-symbol path moves in repository code', () => {
  for (const ref of [
    { to: 'scripts/lib/owner.cjs Different' },
    { to: 'scripts/old.cjs BuildPlan' },
    { to: '../owner.cjs BuildPlan' },
    { to: 'C:/owner.cjs BuildPlan' },
    { to: 'scripts/owner.md BuildPlan' },
    { to: 'scripts/owner.cjs BuildPlan()' },
    { from: 'scripts/old.cjs' },
    { from: ['scripts/old.cjs BuildPlan'] },
    { index: -1 },
    { index: 10 },
  ]) {
    const f = portFixture();
    Object.assign(f.request.changes[0].currentDocument.references[0], ref);
    assert.throws(() => planCatalogReconciliation(f.request, f.snapshots, f.proofs), /CATALOG/);
  }
  const f = portFixture();
  f.request.changes[0].currentDocument.references.push(
    f.request.changes[0].currentDocument.references[0]
  );
  assert.throws(() => parseCatalogReconciliation(f.request), /CATALOG/);
});

test('hash refresh cannot hide a structurally changed embedded port catalog without selectors', () => {
  for (const alter of [
    (manifest) => {
      delete manifest.commandQueryRails;
    },
    (manifest) => {
      manifest.commandQueryRails = {};
    },
    (manifest) => {
      manifest.commandQueryRails = [];
    },
    (manifest) => {
      manifest.commandQueryRails.push({ ...manifest.commandQueryRails[0], name: 'Extra' });
    },
    (manifest) => {
      manifest.commandQueryRails[0].name = 'Different';
    },
  ]) {
    const f = portFixture();
    f.proof.manifests[0] = structuredClone(f.row.raw_manifest);
    f.request.changes[0].currentDocument.references = [];
    alter(f.proof.manifests[0]);
    assert.throws(() => planCatalogReconciliation(f.request, f.snapshots, f.proofs), /CATALOG/);
  }
  const f = portFixture();
  f.request.changes[0].currentDocument.references = [];
  f.proof.manifests.push(f.proof.manifests[0]);
  assert.throws(() => planCatalogReconciliation(f.request, f.snapshots, f.proofs), /CATALOG/);
  f.proof.manifests = [];
  assert.deepEqual(
    planCatalogReconciliation(f.request, f.snapshots, f.proofs)[0].after.raw_manifest,
    f.row.raw_manifest
  );
});

test('application-port SQL preserves server JSONB and projects only the matching row identity', () => {
  const { buildCurrentDocumentSql } = require('../planning-db/catalog-current-document.cjs');
  const f = portFixture();
  const values = [];
  const columns = buildCurrentDocumentSql(f.request.changes[0].currentDocument, {
    beforeSnapshot: '$1::jsonb',
    before: f.row,
    bind: (value) => {
      values.push(value);
      return `$${values.length + 1}`;
    },
  });
  assert.deepEqual(Object.keys(columns).sort(), ['raw_manifest', 'raw_rail']);
  assert.match(columns.raw_manifest, /jsonb_set\(jsonb_set\(\(\$1::jsonb->'raw_manifest'\)/u);
  assert.match(columns.raw_rail, /jsonb_set\(\(\$1::jsonb->'raw_rail'\)/u);
  assert.deepEqual(values.filter(Array.isArray), [
    ['commandQueryRails', '0', 'applicationPort'],
    ['applicationPort'],
    ['commandQueryRails', '1', 'applicationPort'],
  ]);
  f.row.normalized_rail_name = 'unrelated';
  const unrelated = buildCurrentDocumentSql(f.request.changes[0].currentDocument, {
    beforeSnapshot: '$1::jsonb',
    before: f.row,
    bind: () => '$2',
  });
  assert.equal(Object.hasOwn(unrelated, 'raw_rail'), false);
});
