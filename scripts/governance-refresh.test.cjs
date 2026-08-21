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
  runGovernanceRefreshCommand,
} = require('./governance-refresh.cjs');

test('governance refresh keeps DB-backed publication generation out of routine refresh', () => {
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
    ]
  );
  assert.deepEqual(stages.generationStages.find((stage) => stage.id === 'code-status-local').args, [
    '--code-state-only',
  ]);
  assert.equal(
    stages.generationStages.some((stage) => stage.script === 'governance:db:import'),
    false,
    'generation passes must not run heavy governance DB imports before generated surfaces stabilize'
  );
  assert.equal(
    stages.generationStages.some((stage) => stage.id === 'coverage-report'),
    false
  );
  assert.equal(
    stages.generationStages.some((stage) => stage.id === 'remediation-queue'),
    false
  );
  assert.deepEqual(
    stages.databaseStages.map((stage) => stage.script),
    [
      'planning:db:inventory:check',
      'docs:db-surface-inventory:generate',
      'governance:db:import',
      'docs:dbt-roundtrip-capabilities:generate',
      'docs:knowledge-intake:generate',
      'governance:db:check',
      'docs:governance:coverage-report',
      'docs:governance:remediation-queue',
    ]
  );
  assert.equal(
    stages.databaseStages.some((stage) => /export/u.test(stage.script)),
    false,
    'routine governance refresh must not export or check exported DB projections'
  );
  assert.deepEqual(
    stages.databaseStages.find((stage) => stage.id === 'governance-db-import-final').args,
    ['--if-stale']
  );
  assert.equal(
    stages.databaseStages.some((stage) => stage.id === 'repository-map-final'),
    false,
    'Repository Map must be generated only by explicit documentation publication'
  );
  assert.equal(
    stages.databaseStages.findIndex((stage) => stage.id === 'dbt-roundtrip-capability-status') >
      stages.databaseStages.findIndex((stage) => stage.id === 'governance-db-import-final'),
    true,
    'DBT capability truth must render from the final imported governance catalog'
  );
  assert.equal(
    stages.databaseStages.findIndex((stage) => stage.id === 'knowledge-intake-literature') >
      stages.databaseStages.findIndex((stage) => stage.id === 'governance-db-import-final'),
    true,
    'knowledge intake literature must render after the governance DB import is fresh'
  );
  assert.deepEqual(
    stages.databaseStages.find((stage) => stage.id === 'coverage-report-final').env,
    { DVT_GOVERNANCE_REPORT_SOURCE: 'db' }
  );
  assert.deepEqual(
    stages.databaseStages.find((stage) => stage.id === 'remediation-queue-final').env,
    { DVT_GOVERNANCE_REPORT_SOURCE: 'db' }
  );
});

test('governance refresh repeats generation until the worktree fingerprint stabilizes', () => {
  const executedScripts = [];
  const fingerprints = ['before', 'after-first-pass', 'after-first-pass'];
  let lastFingerprint = fingerprints[0];

  const result = runGovernanceRefresh({
    logger: { log() {} },
    readFingerprint: () => {
      lastFingerprint = fingerprints.shift() ?? lastFingerprint;
      return lastFingerprint;
    },
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

test('governance refresh writes an accepted DB run before executing generation stages', async () => {
  const events = [];
  const refreshResult = {
    stabilized: true,
    generationPasses: 1,
    generationStagesRun: ['docs:sync'],
    databaseStagesRun: ['governance:db:check'],
  };

  await runGovernanceRefreshCommand(
    { maxPasses: 1, actor: 'codex', runId: 'refresh-run-1' },
    {
      runRefresh: () => {
        events.push('run-refresh');
        return refreshResult;
      },
      recordAcceptedRun: async (accepted) => {
        events.push(`accepted:${accepted.runId}:${accepted.runState}`);
      },
      recordCompletedRun: async (completed) => {
        events.push(`completed:${completed.runId}:${completed.runState}`);
      },
      recordFailedRun: async () => {
        events.push('failed');
      },
      now: () => new Date('2026-06-11T12:00:00.000Z'),
    }
  );

  assert.deepEqual(events, [
    'accepted:refresh-run-1:accepted',
    'run-refresh',
    'completed:refresh-run-1:passed',
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
    executedScripts.includes('governance:db:check'),
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
  assert.equal(typeof packageJson.scripts['docs:knowledge-intake:generate'], 'string');
  assert.equal(typeof packageJson.scripts['docs:knowledge-intake:check'], 'string');
  assert.equal(typeof packageJson.scripts['docs:dbt-roundtrip-capabilities:generate'], 'string');
  assert.equal(typeof packageJson.scripts['docs:dbt-roundtrip-capabilities:check'], 'string');
  assert.doesNotMatch(
    packageJson.scripts['ci:docs'],
    /docs:dbt-roundtrip-capabilities:check/,
    'the lightweight docs baseline must not require a Planning DB connection'
  );
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
