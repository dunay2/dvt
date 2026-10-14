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
