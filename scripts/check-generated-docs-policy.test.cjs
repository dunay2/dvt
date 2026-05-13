const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const checkerPath = path.join(repoRoot, 'scripts', 'check-generated-docs-policy.cjs');

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function loadChecker() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-policy-fixture-'));
  const fixturePolicyPath = path.join(fixtureRoot, 'policy.json');
  fs.writeFileSync(
    fixturePolicyPath,
    JSON.stringify({
      version: 1,
      artifactClasses: [
        {
          id: 'fixture',
          artifacts: ['package.json'],
          sourcePaths: ['package.json'],
          generatorCommand: 'pnpm docs:sync',
          tracking: 'tracked',
          manualEditPolicy: 'generator-owned',
        },
      ],
    }),
    'utf8'
  );

  const previousPolicyPath = process.env.GENERATED_DOCS_POLICY_PATH;
  process.env.GENERATED_DOCS_POLICY_PATH = fixturePolicyPath;
  delete require.cache[require.resolve(checkerPath)];
  const checker = require(checkerPath);

  if (previousPolicyPath === undefined) {
    delete process.env.GENERATED_DOCS_POLICY_PATH;
  } else {
    process.env.GENERATED_DOCS_POLICY_PATH = previousPolicyPath;
  }

  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  return checker;
}

function makeOversizedArtifact() {
  const generatedDocsRoot = path.join(repoRoot, '.generated-docs');
  fs.mkdirSync(generatedDocsRoot, { recursive: true });
  const artifactRoot = fs.mkdtempSync(path.join(generatedDocsRoot, 'generated-policy-test-'));
  const artifactPath = path.join(artifactRoot, 'SYS-DOCS-GOVERNANCE.files.yaml');
  fs.writeFileSync(artifactPath, '0123456789', 'utf8');
  return {
    artifactRoot,
    artifactRelPath: toPosix(path.relative(repoRoot, artifactPath)),
  };
}

function basePolicyForArtifact(artifactRelPath, overrides = {}) {
  return {
    version: 1,
    artifactClasses: [
      {
        id: 'local-governance-file-indexes',
        artifacts: [artifactRelPath],
        sourcePaths: [
          'scripts/generate-governance-file-component-index.cjs',
          'docs/planning/status/system-governance-unit-index.units.yaml',
        ],
        generatorCommand: 'pnpm docs:governance:file-component-index',
        tracking: 'untracked',
        manualEditPolicy: 'generator-owned',
        maxBytes: 5,
        ...overrides,
      },
    ],
  };
}

function validate(policy, artifactRelPath) {
  const checker = loadChecker();
  assert.equal(typeof checker.validatePolicy, 'function');
  return checker.validatePolicy(
    policy,
    new Set(['scripts/generate-governance-file-component-index.cjs']),
    new Set([
      artifactRelPath,
      'docs/planning/status/system-governance-unit-index.units.yaml',
      'scripts/generate-governance-file-component-index.cjs',
    ]),
    {
      'docs:governance:file-component-index':
        'node scripts/generate-governance-file-component-index.cjs',
      'governance:db:import': 'node scripts/governance-db-import.cjs',
      'governance:db:check': 'node scripts/governance-db-check.cjs',
    }
  );
}

test('generated docs policy checker exports validation helpers for tests', () => {
  const checker = loadChecker();

  assert.equal(typeof checker.validatePolicy, 'function');
  assert.equal(typeof checker.expandPattern, 'function');
  assert.equal(typeof checker.globToRegExp, 'function');
  assert.equal(typeof checker.validateArtifactSize, 'function');
});

test('DB-backed governance file shards are exempt from maxBytes when projection metadata is valid', () => {
  const { artifactRoot, artifactRelPath } = makeOversizedArtifact();
  try {
    const failures = validate(
      basePolicyForArtifact(artifactRelPath, {
        dbBackedArtifacts: [
          {
            artifacts: [artifactRelPath],
            queryView: 'planning_query_store.governance_file_query',
            importCommand: 'pnpm governance:db:import',
            checkCommand: 'pnpm governance:db:check',
          },
        ],
      }),
      artifactRelPath
    );

    assert.deepEqual(failures, []);
  } finally {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
});

test('oversized governance file shards fail without DB-backed projection metadata', () => {
  const { artifactRoot, artifactRelPath } = makeOversizedArtifact();
  try {
    const failures = validate(basePolicyForArtifact(artifactRelPath), artifactRelPath);

    assert.match(failures.join('\n'), /exceeds maxBytes \(10 > 5\)/);
  } finally {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
});

test('oversized non-DB artifacts still fail maxBytes even when another shard is DB-backed', () => {
  const { artifactRoot, artifactRelPath } = makeOversizedArtifact();
  try {
    const failures = validate(
      basePolicyForArtifact(artifactRelPath, {
        dbBackedArtifacts: [
          {
            artifacts: ['.generated-docs/planning/status/governance-files/*.files.yaml'],
            queryView: 'planning_query_store.governance_file_query',
            importCommand: 'pnpm governance:db:import',
            checkCommand: 'pnpm governance:db:check',
          },
        ],
      }),
      artifactRelPath
    );

    assert.match(failures.join('\n'), /exceeds maxBytes \(10 > 5\)/);
  } finally {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
});

test('DB-backed governance shard exemptions fail closed when commands are unavailable', () => {
  const { artifactRoot, artifactRelPath } = makeOversizedArtifact();
  try {
    const failures = validate(
      basePolicyForArtifact(artifactRelPath, {
        dbBackedArtifacts: [
          {
            artifacts: [artifactRelPath],
            queryView: 'planning_query_store.governance_file_query',
            importCommand: 'pnpm missing:import',
            checkCommand: 'pnpm governance:db:check',
          },
        ],
      }),
      artifactRelPath
    );

    assert.match(failures.join('\n'), /dbBackedArtifacts\[0\]\.importCommand is not available/);
    assert.match(failures.join('\n'), /exceeds maxBytes \(10 > 5\)/);
  } finally {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
});
