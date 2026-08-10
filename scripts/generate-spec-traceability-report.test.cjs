const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildFeatureTraceabilityProjection,
  renderCanonicalDocCodeMatrix,
  renderSpecTraceabilitySummary,
} = require('./generate-spec-traceability-report.cjs');

const gitSha = '1111111111111111111111111111111111111111';
const repoRoot = path.resolve(__dirname, '..');

function feature(featureId, overrides = {}) {
  return {
    feature_id: featureId,
    mechanization_status: 'implemented',
    implementation_plan: `docs/planning/${featureId}.md`,
    source_paths: [`docs/planning/${featureId}.md`],
    ...overrides,
  };
}

function exactFacts() {
  return {
    features: [feature('FEATURE-B'), feature('FEATURE-A')],
    components: [
      {
        feature_id: 'FEATURE-A',
        component_ref: 'docs/architecture/components/example.md',
      },
    ],
    symbols: [
      {
        feature_id: 'FEATURE-A',
        symbol_name: 'execute',
        symbol_path: 'packages/@dvt/example/src/execute.ts',
        ddd_owner: 'Example',
        cq_rails: ['ExecuteExample'],
      },
      {
        feature_id: 'FEATURE-A',
        symbol_name: 'execute test',
        symbol_path: 'packages/@dvt/example/test/execute.test.ts',
        ddd_owner: 'Example',
        cq_rails: ['ExecuteExample'],
      },
      {
        feature_id: 'FEATURE-B',
        symbol_name: 'missing',
        symbol_path: 'packages/@dvt/example/src/missing.ts',
        ddd_owner: 'Example',
        cq_rails: [],
      },
    ],
    rails: [
      {
        feature_id: 'FEATURE-A',
        rail_type: 'command',
        rail_name: 'ExecuteExample',
        ddd_owner: 'Example',
        rail_status: 'implemented',
      },
    ],
    validations: [
      {
        feature_id: 'FEATURE-A',
        validation_kind: 'completion',
        validation_ref: 'pnpm --filter @dvt/example test',
      },
      {
        feature_id: 'FEATURE-A',
        validation_kind: 'architecture',
        validation_ref: 'Example boundary remains explicit.',
      },
    ],
    documents: [
      {
        document_path: 'docs/architecture/components/example.md',
        canonicality: 'canonical',
        lifecycle_state: 'active',
        lifecycle_gap_kind: 'none',
        duplicate_count: 0,
        canonical_counterpart_count: 1,
      },
    ],
    componentDocuments: [
      {
        component_id: 'SYS-EXAMPLE',
        document_path: 'docs/architecture/components/example.md',
      },
    ],
  };
}

test('feature traceability uses exact DB identities and the evaluated Git tree', () => {
  const projection = buildFeatureTraceabilityProjection(exactFacts(), {
    gitSha,
    repositoryUrl: 'https://example.test/dvt',
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  });

  assert.equal(projection.gitSha, gitSha);
  assert.deepEqual(
    projection.features.map((row) => row.featureId),
    ['FEATURE-A', 'FEATURE-B']
  );
  assert.deepEqual(projection.features[0], {
    featureId: 'FEATURE-A',
    mechanizationStatus: 'implemented',
    componentIds: ['SYS-EXAMPLE'],
    documentPaths: ['docs/architecture/components/example.md'],
    sourcePaths: ['packages/@dvt/example/src/execute.ts'],
    testPaths: ['packages/@dvt/example/test/execute.test.ts'],
    rails: ['command:ExecuteExample (implemented)'],
    validations: [
      'architecture: Example boundary remains explicit.',
      'completion: pnpm --filter @dvt/example test',
    ],
    verificationCommands: ['pnpm --filter @dvt/example test'],
    gaps: [],
  });
  assert.deepEqual(projection.features[1].gaps, [
    'missing-canonical-document:FEATURE-B',
    'missing-component-owner:FEATURE-B',
    'missing-git-path:packages/@dvt/example/src/missing.ts',
    'missing-rail:FEATURE-B',
    'missing-source:FEATURE-B',
    'missing-test:FEATURE-B',
    'missing-validation:FEATURE-B',
    'missing-verification-command:FEATURE-B',
  ]);
});

test('feature traceability rejects duplicate subjects and unknown relation subjects', () => {
  assert.throws(
    () =>
      buildFeatureTraceabilityProjection(
        { ...exactFacts(), features: [feature('FEATURE-A'), feature('FEATURE-A')] },
        { gitSha, gitTreePaths: new Map() }
      ),
    /Duplicate Planning DB feature identity FEATURE-A/u
  );
  assert.throws(
    () =>
      buildFeatureTraceabilityProjection(
        {
          ...exactFacts(),
          symbols: [{ feature_id: 'UNKNOWN', symbol_name: 'x', symbol_path: 'apps/api/src/x.ts' }],
        },
        { gitSha, gitTreePaths: new Map() }
      ),
    /Unknown Planning DB symbol feature UNKNOWN/u
  );
});

test('conflicting canonical document authority remains an explicit exact gap', () => {
  const facts = exactFacts();
  facts.documents[0] = {
    ...facts.documents[0],
    lifecycle_gap_kind: 'canonical_duplicate',
    duplicate_count: 2,
    canonical_counterpart_count: 2,
  };
  const projection = buildFeatureTraceabilityProjection(facts, {
    gitSha,
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  });

  assert.deepEqual(projection.features[0].documentPaths, []);
  assert.ok(
    projection.features[0].gaps.includes(
      'conflicting-canonical-document:docs/architecture/components/example.md'
    )
  );
});

test('both stable traceability routes render deterministically from one projection', () => {
  const projection = buildFeatureTraceabilityProjection(exactFacts(), {
    gitSha,
    repositoryUrl: 'https://example.test/dvt',
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  });
  const matrix = renderCanonicalDocCodeMatrix(projection, '2026-08-10');
  const summary = renderSpecTraceabilitySummary(projection, '2026-08-10');

  assert.match(matrix, /# Canonical Doc Code Matrix/u);
  assert.match(matrix, /FEATURE-A/u);
  assert.match(matrix, /pnpm --filter @dvt\/example test/u);
  assert.match(matrix, /This page is auto-generated on demand/u);
  assert.match(summary, /# Generated Spec Traceability/u);
  assert.match(summary, /Features projected.*2/u);
  assert.match(summary, /missing-git-path:packages\/@dvt\/example\/src\/missing\.ts/u);
  assert.equal(renderCanonicalDocCodeMatrix(projection, '2026-08-10'), matrix);
  assert.equal(renderSpecTraceabilitySummary(projection, '2026-08-10'), summary);
});

test('traceability policy publishes both stable routes only on explicit demand', () => {
  const policy = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'docs', 'generated-docs-policy.json'), 'utf8')
  );
  const artifactClass = policy.artifactClasses.find(
    (entry) => entry.id === 'local-docs-feature-traceability'
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.ok(artifactClass);
  assert.deepEqual(artifactClass.artifacts, [
    '.generated-docs/planning/status/canonical-doc-code-matrix.md',
    '.generated-docs/planning/status/generated-spec-traceability.md',
  ]);
  assert.equal(artifactClass.tracking, 'untracked');
  assert.equal(artifactClass.manualEditPolicy, 'generator-owned');
  assert.equal(artifactClass.publication.enabled, true);
  assert.equal(
    artifactClass.generatorCommand,
    'node scripts/generate-spec-traceability-report.cjs'
  );
  assert.match(pkg.scripts['docs:publish'], /documentation-publication\.cjs --assemble/u);
  assert.doesNotMatch(pkg.scripts['docs:serve'], /generate-spec-traceability-report/u);
  assert.doesNotMatch(pkg.scripts['docs:build'], /generate-spec-traceability-report/u);
  assert.equal(
    fs.existsSync(
      path.join(repoRoot, 'docs', 'planning', 'status', 'canonical-doc-code-matrix.md')
    ),
    false
  );
  assert.equal(
    fs.existsSync(
      path.join(repoRoot, 'docs', 'planning', 'status', 'generated-spec-traceability.md')
    ),
    false
  );
});
