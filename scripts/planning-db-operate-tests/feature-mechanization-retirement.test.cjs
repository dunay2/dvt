const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCatalogReconciliation,
  planCatalogReconciliation,
  catalogRowHash,
} = require('../planning-db/catalog-reconciliation.cjs');

function featureMechanizationRetirementFixture() {
  const surface = 'apps/web/cypress/e2e/retired.cy.ts';
  const historicalRef = `https://github.com/dunay2/dvt/blob/${'a'.repeat(40)}/${surface}`;
  const evidenceRetirement = {
    surface,
    historicalRef,
    cycles: ['retired-proof'],
    gates: ['pnpm test retired.cy.ts'],
    flows: ['replacement.cy.ts'],
    completionGates: [],
  };
  const row = {
    rail_id: 'imported#fixture',
    feature_id: 'fixture',
    rail_type: 'query',
    normalized_rail_name: 'listrows',
    rail_status: 'implemented',
    source_path: 'docs/feature.md',
    source_content_sha256: 'b'.repeat(64),
    imported_at: '2026-01-01T00:00:00.123456+00:00',
    raw_rail: { name: 'ListRows', type: 'query' },
    raw_manifest: {
      symbols: [
        { path: surface, name: 'oldProof' },
        {
          path: 'retained.ts',
          name: 'first',
          dddOwner: 'first-owner',
          cypressCoverage: surface,
          custom: { precise: '9007199254740993' },
        },
        {
          path: 'retained.ts',
          name: 'second',
          dddOwner: 'other-owner',
          cypressCoverage: 'unrelated.cy.ts',
        },
      ],
      allowedImplementationSurfaces: [surface, 'retained.ts', 'retained.ts'],
      forbiddenImplementationSurfaces: ['apps/api/**'],
      redGreenCycles: [
        { id: 'retired-proof', patchSurfaces: [surface] },
        { id: 'keep', patchSurfaces: ['retained.ts'] },
      ],
      cypressFlows: [surface, 'keep.cy.ts', 'keep.cy.ts'],
      completionGate: ['pnpm test retired.cy.ts', 'pnpm verify:prepush'],
    },
    symbol_refs: [
      { path: surface, name: 'oldProof' },
      { path: 'retained.ts', name: 'first' },
    ],
    implementation_refs: [`${surface}#oldProof`, 'retained.ts#first'],
    allowed_implementation_surfaces: [surface, 'retained.ts'],
    completion_gate: ['pnpm test retired.cy.ts', 'pnpm verify:prepush'],
    documentation_refs: ['docs/feature.md'],
    governing_sources: ['AGENTS.md'],
    architecture_guards: ['node --test retained.test.cjs'],
  };
  const request = {
    designId: 'GH-3538',
    actor: 'test',
    idempotencyKey: 'retirement',
    changes: [
      {
        origin: 'imported',
        railId: row.rail_id,
        expectedRowSha256: catalogRowHash(row),
        evidenceRetirement,
      },
    ],
  };
  const snapshot = {
    origin: 'imported',
    row,
    snapshot_hash: catalogRowHash(row),
    snapshot_text: JSON.stringify(row),
  };
  return { row, snapshot, request, evidenceRetirement };
}

test('catalog accepts exclusive typed evidence retirement without introducing a writer', () => {
  const fixture = featureMechanizationRetirementFixture();
  assert.deepEqual(
    parseCatalogReconciliation(fixture.request).catalogReconciliation,
    fixture.request
  );
  const invalid = structuredClone(fixture.request);
  invalid.changes[0].reference = { authorityRef: 'docs/authority.md' };
  assert.throws(() => parseCatalogReconciliation(invalid), /EVIDENCE-RETIREMENT/);
});

test('retirement removes only selected evidence and preserves retained ownership, duplicate ordering and provenance', () => {
  const { row, snapshot, request, evidenceRetirement } = featureMechanizationRetirementFixture();
  row.raw_manifest.redGreenCycles.push(
    null,
    { note: 'Unselected metadata' },
    { id: null },
    { id: 123 },
    { id: '123' }
  );
  row.raw_manifest.completionGate.push(null, 123, '123');
  row.completion_gate.push(null, 123, '123');
  evidenceRetirement.cycles.push('123');
  evidenceRetirement.gates.push('123');
  const before = structuredClone(row);
  const [planned] = planCatalogReconciliation(request, [snapshot], new Map());
  assert.deepEqual(row, before);
  assert.deepEqual(planned.after.raw_manifest.symbols, [
    {
      ...before.raw_manifest.symbols[1],
      cypressCoverage: `Historical coverage: ${evidenceRetirement.historicalRef}`,
    },
    before.raw_manifest.symbols[2],
  ]);
  assert.deepEqual(planned.after.raw_manifest.allowedImplementationSurfaces, [
    'retained.ts',
    'retained.ts',
  ]);
  assert.deepEqual(planned.after.raw_manifest.cypressFlows, [
    'keep.cy.ts',
    'keep.cy.ts',
    'replacement.cy.ts',
  ]);
  assert.deepEqual(planned.after.implementation_refs, ['retained.ts#first']);
  assert.deepEqual(planned.after.completion_gate, ['pnpm verify:prepush', null, 123]);
  assert.deepEqual(
    planned.after.raw_manifest.redGreenCycles,
    before.raw_manifest.redGreenCycles.slice(1, -1)
  );
  assert.deepEqual(planned.after.raw_manifest.completionGate, ['pnpm verify:prepush', null, 123]);
  assert.deepEqual(planned.after.raw_rail, before.raw_rail);
  assert.equal(Object.hasOwn(planned.after.raw_manifest, 'commandQueryRails'), false);
  assert.equal(Object.hasOwn(planned.after, 'revision'), false);
});

test('retirement rejects broad or foreign history, ambiguous selectors and unhandled or empty live obligations', () => {
  for (const mutate of [
    (fixture) => {
      fixture.evidenceRetirement.surface = 'apps/**';
    },
    (fixture) => {
      fixture.evidenceRetirement.historicalRef = fixture.evidenceRetirement.historicalRef.replace(
        'dunay2/dvt',
        'other/repo'
      );
    },
    (fixture) => {
      fixture.evidenceRetirement.unknown = true;
    },
    (fixture) => {
      fixture.evidenceRetirement.cycles = ['absent'];
    },
    (fixture) => {
      fixture.row.raw_manifest.redGreenCycles.push(fixture.row.raw_manifest.redGreenCycles[0]);
    },
    (fixture) => {
      fixture.row.raw_manifest.extra = `node ${fixture.evidenceRetirement.surface}`;
    },
    (fixture) => {
      fixture.row.raw_manifest.symbols = [fixture.row.raw_manifest.symbols[0]];
    },
    (fixture) => {
      fixture.row.raw_manifest.cypressFlows = [fixture.evidenceRetirement.surface];
      fixture.evidenceRetirement.flows = [];
    },
    (fixture) => {
      fixture.evidenceRetirement.gates.push('pnpm verify:prepush');
    },
    (fixture) => {
      delete fixture.row.raw_manifest.cypressFlows;
      fixture.evidenceRetirement.flows = [];
    },
    (fixture) => {
      delete fixture.row.raw_manifest.completionGate;
    },
  ]) {
    const fixture = featureMechanizationRetirementFixture();
    mutate(fixture);
    assert.throws(
      () => planCatalogReconciliation(fixture.request, [fixture.snapshot], new Map()),
      /EVIDENCE-RETIREMENT/
    );
  }
});

test('native retirement SQL binds only selectors, keeps ordinal arrays and never serializes stored metadata', () => {
  const {
    buildFeatureMechanizationEvidenceRetirementSql,
  } = require('../planning-db/feature-mechanization-evidence-retirement.cjs');
  const { evidenceRetirement } = featureMechanizationRetirementFixture();
  const values = [];
  const columns = buildFeatureMechanizationEvidenceRetirementSql(evidenceRetirement, {
    bind: (value) => {
      values.push(value);
      return `$${values.length}`;
    },
    beforeSnapshot: '$99::jsonb',
  });
  assert.deepEqual(Object.keys(columns), [
    'raw_manifest',
    'symbol_refs',
    'implementation_refs',
    'allowed_implementation_surfaces',
    'completion_gate',
  ]);
  assert.match(columns.raw_manifest, /item\.value end/u);
  assert.match(columns.raw_manifest, /order by item\.ordinality/u);
  assert.match(columns.raw_manifest, /where not exists/u);
  assert.match(columns.raw_manifest, /is not true/u);
  assert.match(columns.completion_gate, /is not true/u);
  assert.match(columns.raw_manifest, /jsonb_typeof\(item\.value->'id'\) = 'string'/u);
  assert.match(columns.completion_gate, /jsonb_typeof\(item\.value\) = 'string'/u);
  assert.equal(
    values.some((value) => JSON.stringify(value).includes('first-owner')),
    false
  );
  assert.ok(Object.values(columns).every((expression) => expression.includes('$99::jsonb')));
});

test('evidence history accepts a current regular file but rejects an unrelated commit or missing blob', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { execFileSync } = require('node:child_process');
  const { createGitRepositoryEnvironment } = require('../lib/git-repository-environment.cjs');
  const {
    verifyEvidenceRetirementHistory,
  } = require('../planning-db/catalog-reconciliation-write.cjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-evidence-history-'));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: directory,
      env: createGitRepositoryEnvironment(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  try {
    git('init');
    git('config', 'user.name', 'Evidence fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    fs.writeFileSync(path.join(directory, 'proof.cy.ts'), 'real historical proof\n');
    git('add', 'proof.cy.ts');
    const tree = git('write-tree');
    const commit = git('commit-tree', tree, '-m', 'Proof fixture');
    git('update-ref', 'HEAD', commit);
    const { evidenceRetirement } = featureMechanizationRetirementFixture();
    evidenceRetirement.surface = 'proof.cy.ts';
    evidenceRetirement.historicalRef = `https://github.com/dunay2/dvt/blob/${commit}/proof.cy.ts`;
    const options = { repoRoot: directory };
    assert.equal(verifyEvidenceRetirementHistory(evidenceRetirement, options).commit, commit);
    const unrelated = git('commit-tree', tree, '-m', 'Unrelated fixture');
    assert.throws(
      () =>
        verifyEvidenceRetirementHistory(
          {
            ...evidenceRetirement,
            historicalRef: evidenceRetirement.historicalRef.replace(commit, unrelated),
          },
          options
        ),
      /ANCESTOR/
    );
    assert.throws(
      () =>
        verifyEvidenceRetirementHistory(
          {
            ...evidenceRetirement,
            surface: 'absent.ts',
            historicalRef: `https://github.com/dunay2/dvt/blob/${commit}/absent.ts`,
          },
          options
        ),
      /BLOB/
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
