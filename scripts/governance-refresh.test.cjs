const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRefreshStages, runGovernanceRefresh } = require('./governance-refresh.cjs');

test('governance refresh runs deterministic generation before database drift checks', () => {
  const stages = buildRefreshStages();

  assert.deepEqual(
    stages.generationStages.map((stage) => stage.script),
    [
      'docs:sync',
      'docs:workboard:generate',
      'docs:status:generate',
      'docs:capability:generate',
      'docs:gov:manifest',
      'docs:governance:document-unit-map',
      'docs:governance:file-component-index',
      'docs:governance:file-fingerprint-baseline',
      'docs:governance:file-fingerprint-impact',
      'docs:governance:coverage-report',
      'docs:governance:remediation-queue',
    ]
  );
  assert.deepEqual(
    stages.databaseStages.map((stage) => stage.script),
    ['planning:db:import', 'planning:db:check', 'planning:db:export:check', 'governance:db:check']
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
    executedScripts.includes('planning:db:import'),
    false,
    'database import must wait for stable generated surfaces'
  );
});
