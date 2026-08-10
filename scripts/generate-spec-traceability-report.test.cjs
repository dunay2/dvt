const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { Client } = require('pg');

const { importContent } = require('./planning-db-import.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');
const { readGitTreePaths } = require('./generate-code-status.cjs');

const {
  buildFeatureTraceabilityProjection,
  readFeatureTraceabilityFacts,
  renderCanonicalDocCodeMatrix,
  renderSpecTraceabilitySummary,
  resolveFeatureTraceabilityGitInput,
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
    commands: [
      {
        command_id: 'package:test',
        command_type: 'package_script',
        command_name: 'test',
        command_path: null,
        command_text: 'pnpm -r test',
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
    sourceSymbols: [
      {
        symbolName: 'execute',
        symbolPath: 'packages/@dvt/example/src/execute.ts',
      },
    ],
    testSymbols: [
      {
        symbolName: 'execute test',
        symbolPath: 'packages/@dvt/example/test/execute.test.ts',
      },
    ],
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

test('Cypress symbols remain test evidence instead of implementation source', () => {
  const facts = exactFacts();
  facts.symbols[1] = {
    ...facts.symbols[1],
    symbol_name: 'canvas live proof',
    symbol_path: 'apps/web/cypress/e2e/canvas/canvas-live-proof.cy.ts',
  };
  const projection = buildFeatureTraceabilityProjection(facts, {
    gitSha,
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['apps/web/cypress/e2e/canvas/canvas-live-proof.cy.ts', 'blob'],
    ]),
  });

  assert.deepEqual(projection.features[0].testPaths, [
    'apps/web/cypress/e2e/canvas/canvas-live-proof.cy.ts',
  ]);
  assert.deepEqual(projection.features[0].sourcePaths, ['packages/@dvt/example/src/execute.ts']);
  assert.ok(!projection.features[0].gaps.includes('missing-test:FEATURE-A'));
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

test('feature traceability rejects absolute and traversing repository paths', () => {
  const unsafePaths = [
    '/packages/@dvt/example/src/execute.ts',
    'C:\\dvt\\packages\\@dvt\\example\\src\\execute.ts',
    '../packages/@dvt/example/src/execute.ts',
    'packages/@dvt/example/../example/src/execute.ts',
    '\\\\server\\share\\execute.ts',
  ];

  for (const unsafePath of unsafePaths) {
    const facts = exactFacts();
    facts.symbols[0] = { ...facts.symbols[0], symbol_path: unsafePath };
    assert.throws(
      () =>
        buildFeatureTraceabilityProjection(facts, {
          gitSha,
          gitTreePaths: new Map([
            ['docs/architecture/components/example.md', 'blob'],
            ['packages/@dvt/example/src/execute.ts', 'blob'],
            ['packages/@dvt/example/test/execute.test.ts', 'blob'],
          ]),
        }),
      /Unsafe repository path/u,
      unsafePath
    );
  }
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

test('a canonical document remains authoritative alongside noncanonical peers', () => {
  const facts = exactFacts();
  facts.documents[0] = {
    ...facts.documents[0],
    lifecycle_gap_kind: 'none',
    duplicate_count: 3,
    canonical_counterpart_count: 1,
  };
  const projection = buildFeatureTraceabilityProjection(facts, {
    gitSha,
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  });

  assert.deepEqual(projection.features[0].documentPaths, [
    'docs/architecture/components/example.md',
  ]);
  assert.ok(
    !projection.features[0].gaps.includes(
      'conflicting-canonical-document:docs/architecture/components/example.md'
    )
  );
  assert.ok(!projection.features[0].gaps.includes('missing-canonical-document:FEATURE-A'));
});

test('verification commands must exist in the repository command catalog', () => {
  const facts = exactFacts();
  facts.validations.push({
    feature_id: 'FEATURE-A',
    validation_kind: 'completion',
    validation_ref: 'pnpm definitely:not-registered',
  });
  const projection = buildFeatureTraceabilityProjection(facts, {
    gitSha,
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  });

  assert.deepEqual(projection.features[0].verificationCommands, [
    'pnpm --filter @dvt/example test',
  ]);
  assert.ok(
    projection.features[0].gaps.includes(
      'unregistered-verification-command:FEATURE-A#pnpm definitely:not-registered'
    )
  );

  const emptyCatalogProjection = buildFeatureTraceabilityProjection(
    { ...facts, commands: [] },
    {
      gitSha,
      gitTreePaths: new Map([
        ['docs/architecture/components/example.md', 'blob'],
        ['packages/@dvt/example/src/execute.ts', 'blob'],
        ['packages/@dvt/example/test/execute.test.ts', 'blob'],
      ]),
    }
  );
  assert.deepEqual(emptyCatalogProjection.features[0].verificationCommands, []);
});

test('environment-prefixed verification commands still require catalog authority', () => {
  const facts = exactFacts();
  facts.validations.push(
    {
      feature_id: 'FEATURE-A',
      validation_kind: 'architecture',
      validation_ref: 'GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs',
    },
    {
      feature_id: 'FEATURE-A',
      validation_kind: 'completion',
      validation_ref: 'DVT_MODE=strict node tools/ci/not-registered.mjs',
    }
  );
  facts.commands.push({
    command_id: 'file:tools/ci/arc-check.mjs',
    command_type: 'command_file',
    command_name: 'arc-check.mjs',
    command_path: 'tools/ci/arc-check.mjs',
    command_text: 'node tools/ci/arc-check.mjs',
  });
  const projection = buildFeatureTraceabilityProjection(facts, {
    gitSha,
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  });

  assert.ok(
    projection.features[0].verificationCommands.includes(
      'GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs'
    )
  );
  assert.ok(
    projection.features[0].gaps.includes(
      'unregistered-verification-command:FEATURE-A#DVT_MODE=strict node tools/ci/not-registered.mjs'
    )
  );
});

test('every command in a shell chain requires repository catalog authority', () => {
  const operators = ['&&', '||', '|', ';'];
  const facts = exactFacts();
  for (const operator of operators) {
    facts.validations.push({
      feature_id: 'FEATURE-A',
      validation_kind: 'completion',
      validation_ref: `pnpm --filter @dvt/example test ${operator} pnpm --filter @dvt/example test:integration`,
    });
  }
  const options = {
    gitSha,
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  };
  const projection = buildFeatureTraceabilityProjection(facts, options);

  for (const operator of operators) {
    const command = `pnpm --filter @dvt/example test ${operator} pnpm --filter @dvt/example test:integration`;
    assert.ok(!projection.features[0].verificationCommands.includes(command));
    assert.ok(
      projection.features[0].gaps.includes(`unregistered-verification-command:FEATURE-A#${command}`)
    );
  }

  facts.commands.push({
    command_id: 'package:test:integration',
    command_type: 'package_script',
    command_name: 'test:integration',
    command_path: null,
    command_text: 'pnpm -r test:integration',
  });
  const fullyRegisteredProjection = buildFeatureTraceabilityProjection(facts, options);
  assert.ok(
    fullyRegisteredProjection.features[0].verificationCommands.includes(
      'pnpm --filter @dvt/example test && pnpm --filter @dvt/example test:integration'
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

test('traceability facts reuse every existing Planning DB read model', async () => {
  const calls = [];
  const reader = (name) => async (_client, filters) => {
    calls.push([name, filters]);
    return [name];
  };
  const facts = await readFeatureTraceabilityFacts(
    {},
    {
      readFeatureMechanizationFeatureRows: reader('features'),
      readFeatureMechanizationComponentRows: reader('components'),
      readFeatureMechanizationSymbolRows: reader('symbols'),
      readFeatureMechanizationRailRows: reader('rails'),
      readFeatureMechanizationValidationRows: reader('validations'),
      readDocumentationLifecycleRows: reader('documents'),
      readArchitectureComponentDocumentRows: reader('componentDocuments'),
      readRepositoryCommandRows: reader('commands'),
    }
  );

  assert.deepEqual(facts, {
    features: ['features'],
    components: ['components'],
    symbols: ['symbols'],
    rails: ['rails'],
    validations: ['validations'],
    documents: ['documents'],
    componentDocuments: ['componentDocuments'],
    commands: ['commands'],
  });
  assert.deepEqual(calls, [
    ['features', { limit: 100000 }],
    ['components', { limit: 100000 }],
    ['symbols', { limit: 100000 }],
    ['rails', { limit: 100000 }],
    ['validations', { limit: 100000 }],
    ['documents', { limit: 100000 }],
    ['componentDocuments', undefined],
    ['commands', { limit: 100000 }],
  ]);
});

test('traceability reads paths from the same evaluated Git commit', () => {
  const calls = [];
  const input = resolveFeatureTraceabilityGitInput({
    gitSha,
    readGitTreePaths: (options) => {
      calls.push(options);
      return new Map([['apps/api/src/app.ts', 'blob']]);
    },
  });

  assert.equal(input.gitSha, gitSha);
  assert.equal(input.gitTreePaths.get('apps/api/src/app.ts'), 'blob');
  assert.deepEqual(calls, [{ gitSha }]);
});

test('exact relation changes deterministically change traceability output', () => {
  const facts = exactFacts();
  const options = {
    gitSha,
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  };
  const baseline = renderCanonicalDocCodeMatrix(
    buildFeatureTraceabilityProjection(facts, options),
    '2026-08-10'
  );
  const changedFacts = {
    ...facts,
    validations: [
      ...facts.validations,
      {
        feature_id: 'FEATURE-A',
        validation_kind: 'completion',
        validation_ref: 'pnpm verify:prepush',
      },
    ],
  };
  const changed = renderCanonicalDocCodeMatrix(
    buildFeatureTraceabilityProjection(changedFacts, options),
    '2026-08-10'
  );

  assert.notEqual(changed, baseline);
  assert.match(changed, /pnpm verify:prepush/u);
});

test('an exact symbol identity change on the same Git path changes traceability output', () => {
  const facts = exactFacts();
  const options = {
    gitSha,
    gitTreePaths: new Map([
      ['docs/architecture/components/example.md', 'blob'],
      ['packages/@dvt/example/src/execute.ts', 'blob'],
      ['packages/@dvt/example/test/execute.test.ts', 'blob'],
    ]),
  };
  const baseline = renderCanonicalDocCodeMatrix(
    buildFeatureTraceabilityProjection(facts, options),
    '2026-08-10'
  );
  const changed = renderCanonicalDocCodeMatrix(
    buildFeatureTraceabilityProjection(
      {
        ...facts,
        symbols: [
          ...facts.symbols,
          {
            feature_id: 'FEATURE-A',
            symbol_name: 'executeAlternate',
            symbol_path: 'packages/@dvt/example/src/execute.ts',
            ddd_owner: 'Example',
            cq_rails: ['ExecuteExample'],
          },
        ],
      },
      options
    ),
    '2026-08-10'
  );

  assert.notEqual(changed, baseline);
  assert.match(changed, /executeAlternate/u);
});

test(
  'live Planning DB renders every exact feature deterministically',
  { skip: process.env.DVT_FEATURE_TRACEABILITY_INTEGRATION !== '1' },
  async () => {
    const connectionString =
      process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
    await importContent({ databaseUrl: connectionString, silent: true });
    const client = new Client({ connectionString });
    await client.connect();
    try {
      const facts = await readFeatureTraceabilityFacts(client);
      const exactGitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repoRoot,
        encoding: 'utf8',
      }).trim();
      const projection = buildFeatureTraceabilityProjection(facts, {
        gitSha: exactGitSha,
        gitTreePaths: readGitTreePaths({ gitSha: exactGitSha }),
      });
      const first = renderCanonicalDocCodeMatrix(projection, '2026-08-10');
      const second = renderCanonicalDocCodeMatrix(projection, '2026-08-10');

      assert.equal(projection.features.length, facts.features.length);
      assert.equal(
        new Set(projection.features.map((feature) => feature.featureId)).size,
        projection.features.length
      );
      assert.equal(first, second);
      assert.match(first, /DOC1-4-DB-FIRST-TRACEABILITY/u);
    } finally {
      await client.end();
    }
  }
);
