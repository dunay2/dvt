const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const packageJson = require('../package.json');
const {
  buildRefreshStages,
  readGeneratedGovernanceArtifactHashes,
  runGovernanceRefresh,
} = require('./governance-refresh.cjs');

test('governance refresh uses local governance reports before DB validation', () => {
  const stages = buildRefreshStages();

  assert.deepEqual(
    stages.generationStages.map((stage) => stage.script),
    [
      'docs:sync',
      'docs:status:generate',
      'docs:capability:generate',
      'docs:gov:manifest',
      'docs:governance:document-unit-map',
      'docs:governance:file-component-index',
      'docs:governance:file-fingerprint-baseline',
      'docs:governance:file-fingerprint-impact',
      'planning:db:import',
      'docs:workboard:generate',
      'governance:db:import',
      'docs:governance:coverage-report',
      'docs:governance:remediation-queue',
      'governance:db:import',
    ]
  );
  assert.deepEqual(
    stages.generationStages.find((stage) => stage.id === 'planning-db-import').args,
    ['--', '--if-stale', '--planning-only']
  );
  assert.deepEqual(
    stages.generationStages.find((stage) => stage.id === 'governance-db-import').args,
    ['--', '--if-stale']
  );
  assert.equal(
    stages.generationStages.find((stage) => stage.id === 'coverage-report').args,
    undefined
  );
  assert.equal(
    stages.generationStages.find((stage) => stage.id === 'remediation-queue').args,
    undefined
  );
  assert.deepEqual(
    stages.generationStages.find((stage) => stage.id === 'governance-db-import-after-reports').args,
    undefined
  );
  assert.deepEqual(
    stages.databaseStages.map((stage) => stage.script),
    [
      'planning:db:import',
      'planning:db:check',
      'planning:db:inventory:check',
      'planning:db:export:check',
      'docs:governance:coverage-report',
      'docs:governance:remediation-queue',
      'governance:db:import',
      'governance:db:check',
      'governance:db:export:check',
    ]
  );
  assert.deepEqual(
    stages.databaseStages.find((stage) => stage.id === 'planning-db-import-final').args,
    ['--', '--if-stale', '--planning-only']
  );
  assert.equal(
    stages.databaseStages.find((stage) => stage.id === 'governance-db-import-final').args,
    undefined
  );
});

test('governance refresh repeats generation until the worktree fingerprint stabilizes', () => {
  const executedScripts = [];
  const fingerprints = ['before', 'after-first-pass', 'after-first-pass'];

  const result = runGovernanceRefresh({
    logger: { log() {} },
    readFingerprint: () => fingerprints.shift(),
    runScript: (script) => {
      executedScripts.push(script);
    },
  });

  const stages = buildRefreshStages();
  assert.equal(result.generationPasses, 2);
  assert.deepEqual(executedScripts, [
    ...stages.generationStages.map((stage) => stage.script),
    ...stages.generationStages.map((stage) => stage.script),
    ...stages.databaseStages.map((stage) => stage.script),
  ]);
});

test('governance refresh fingerprints ignored generated governance artifacts', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'governance-refresh-fingerprint-'));

  try {
    const artifactDir = path.join(tempRoot, '.generated-docs', 'planning', 'status');
    const artifactPath = path.join(artifactDir, 'system-governance-coverage-report.coverage.yaml');
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(artifactPath, 'version: 1\n', 'utf8');

    const firstHash = readGeneratedGovernanceArtifactHashes(tempRoot);
    fs.writeFileSync(artifactPath, 'version: 2\n', 'utf8');
    const secondHash = readGeneratedGovernanceArtifactHashes(tempRoot);

    assert.match(
      firstHash,
      /\.generated-docs\/planning\/status\/system-governance-coverage-report\.coverage\.yaml/
    );
    assert.notEqual(secondHash, firstHash);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('governance refresh fails closed when generated output does not stabilize', () => {
  const executedScripts = [];

  assert.throws(
    () =>
      runGovernanceRefresh({
        logger: { log() {} },
        maxPasses: 2,
        readFingerprint: (() => {
          let sequence = 0;
          return () => `fingerprint-${sequence++}`;
        })(),
        runScript: (script) => {
          executedScripts.push(script);
        },
      }),
    /did not stabilize after 2 generation pass/
  );

  assert.equal(
    executedScripts.includes('planning:db:check'),
    false,
    'database drift checks must wait for stable generated surfaces'
  );
});

test('planning DB test suite does not pre-generate governance artifacts', () => {
  assert.doesNotMatch(
    packageJson.scripts['test:planning:db'],
    /governance:artifacts:generate/,
    'planning DB tests must prove DB import works without generated files as input'
  );
});

test('package scripts expose governance refresh instead of the obsolete artifact alias', () => {
  assert.equal(typeof packageJson.scripts['governance:refresh'], 'string');
  assert.equal(typeof packageJson.scripts['governance:db:import'], 'string');
  assert.equal(typeof packageJson.scripts['governance:db:export'], 'string');
  assert.equal(typeof packageJson.scripts['governance:db:export:check'], 'string');
  assert.equal(Object.hasOwn(packageJson.scripts, 'governance:artifacts:generate'), false);
});

test('one-off architecture migration scripts are not kept in active scripts', () => {
  for (const fileName of [
    'rehome-architecture-docs.cjs',
    'rewrite-active-architecture-paths.cjs',
  ]) {
    assert.equal(fs.existsSync(path.join(__dirname, fileName)), false, fileName);
  }
});
