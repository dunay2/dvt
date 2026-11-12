/** Owned concern: pr quality outcome.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import yaml from 'js-yaml';
import { parseCLI } from 'vitest/node';
import { buildCiScopeOutputs } from '../ci-scope-outputs.mjs';

function assess({
  event = 'pull_request',
  mask = 7,
  draft = false,
  typecheck = false,
  override = {},
  outputs = {},
  payload = {},
} = {}) {
  const canonical = buildCiScopeOutputs([], {}, { full: true });
  const raw = JSON.parse(canonical.pr_quality_scope);
  const inputs = { run_typecheck_gate: String(typecheck) };
  integrations.forEach(([, key, input], index) => {
    raw[key] = Boolean(mask & (1 << index));
    inputs[input] = String(raw[key]);
  });
  canonical.pr_quality_scope = JSON.stringify(raw);
  const values = Object.fromEntries(
    Object.entries(quality.jobs['detect-pr-scope']?.outputs ?? {}).map(([key, expression]) => [
      key,
      runInNewContext(expression.slice(3, -2), {
        github: { event_name: event, event: { inputs } },
        steps: { scope: { outputs: canonical } },
        fromJSON: JSON.parse,
        toJSON: JSON.stringify,
      }),
    ])
  );
  const needs = {
    'detect-pr-scope': {
      result: draft ? 'skipped' : 'success',
      outputs: { ...values, ...outputs },
    },
    'pr-checks': { result: draft ? 'skipped' : 'success' },
  };
  integrations.forEach(([job], index) => {
    needs[job] = {
      result: !draft && event !== 'push' && mask & (1 << index) ? 'success' : 'skipped',
    };
  });
  for (const [job, result] of Object.entries(override)) needs[job] = { ...needs[job], result };
  const failures = [];
  const script = quality.jobs['all-checks-passed'].steps[0].with.script.replace(
    '${{ toJSON(needs) }}',
    JSON.stringify(needs)
  );
  runInNewContext(script, {
    context: { eventName: event, payload: { pull_request: { draft }, inputs, ...payload } },
    core: { setFailed: (message) => failures.push(message), info() {} },
  });
  return failures;
}

const integrations = [
  ['temporal-integration', 'temporal_changed', 'run_temporal_integration'],
  [
    'temporal-transformation-integration',
    'temporal_transformation_changed',
    'run_temporal_transformation_integration',
  ],
  [
    'temporal-postgres-integration',
    'temporal_postgres_changed',
    'run_temporal_postgres_integration',
  ],
];

const quality = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));

test('PR Quality accepts only complete selected evidence for each event and opt-in', () => {
  for (const event of ['pull_request', 'workflow_dispatch'])
    for (const typecheck of [false, true])
      for (let mask = 0; mask < 8; mask++) assert.deepEqual(assess({ event, mask, typecheck }), []);
  assert.deepEqual(assess({ event: 'push' }), []);
  assert.deepEqual(assess({ draft: true }), []);
  for (const job of ['detect-pr-scope', 'pr-checks', ...integrations.map(([id]) => id)])
    for (const result of ['skipped', 'failure', 'cancelled', 'neutral', undefined])
      assert.ok(assess({ override: { [job]: result } }).length, `${job}:${result}`);
  for (const [job] of integrations)
    assert.ok(assess({ mask: 0, override: { [job]: 'success' } }).length, job);
  for (const outputs of [
    { workflow_scope: '' },
    { workflow_scope: '{}' },
    { pr_quality_scope: '{}' },
    { pr_quality_scope: 'null' },
    { pr_quality_scope: '{"temporal_changed":"true"}' },
    { temporal_changed: '' },
    { temporal_changed: true },
    { temporal_changed: 'false' },
  ])
    assert.ok(assess({ outputs }).length, JSON.stringify(outputs));
  assert.ok(assess({ payload: { pull_request: {} } }).length);
  assert.ok(
    assess({
      event: 'workflow_dispatch',
      payload: { inputs: { run_temporal_integration: 'TRUE' } },
    }).length
  );
  assert.ok(assess({ override: { unexpected: 'success' } }).length);
  const skipped = Object.fromEntries(
    ['detect-pr-scope', 'pr-checks', ...integrations.map(([id]) => id)].map((id) => [id, 'skipped'])
  );
  assert.ok(assess({ override: skipped }).length);
  assert.ok(assess({ event: 'schedule' }).length);
});

test('scope is the only integration prerequisite and its exact filters reach Vitest', () => {
  assert.ok(quality.jobs['detect-pr-scope']);
  assert.ok(
    quality.jobs['detect-pr-scope'].steps.every(
      ({ run, uses }) => !run?.includes('pnpm') && !uses?.includes('setup-node-pnpm')
    )
  );
  for (const name of ['pr-checks', ...integrations.map(([id]) => id)])
    assert.deepEqual(quality.jobs[name].needs, ['detect-pr-scope'], name);
  assert.equal(quality.jobs['all-checks-passed'].if, 'always()');
  assert.deepEqual(
    [...quality.jobs['all-checks-passed'].needs].sort(),
    ['detect-pr-scope', 'pr-checks', ...integrations.map(([id]) => id)].sort()
  );
  const steps = quality.jobs['temporal-postgres-integration'].steps;
  const build = steps.findIndex(
    ({ run }) => run === 'node scripts/build-workspace-runtime-deps.cjs dvt-temporal-worker'
  );
  const proof = steps.findIndex(
    ({ name }) => name === 'Prove adapter-postgres app-role runtime and direct RLS'
  );
  assert.ok(build >= 0 && build < proof);
  assert.equal(
    steps.filter(({ run }) => run?.includes('build-workspace-runtime-deps.cjs')).length,
    1
  );
  const command = steps[proof].run.trim().split(/\s+/u);
  assert.deepEqual(command.slice(0, 4), ['pnpm', '--filter', '@dvt/adapter-postgres', 'exec']);
  assert.deepEqual(parseCLI(command.slice(4)).filter, [
    'test/PostgresAppRoleRuntime.integration.test.ts',
    'test/PostgresTenantRlsEnforcement.integration.test.ts',
  ]);
  assert.deepEqual(parseCLI(['vitest', 'run', '--', ...command.slice(-2)]).filter, []);
  assert.equal(parseCLI(command.slice(4)).options.passWithNoTests, undefined);
  assert.equal(quality.jobs['temporal-postgres-integration'].env.DVT_PG_INTEGRATION, '1');
  assert.equal(quality.jobs['temporal-postgres-integration'].env.DVT_HET1_SERVICE_INTEGRATION, '1');
});
