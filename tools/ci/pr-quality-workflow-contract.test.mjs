/** Owned concern: require exact PR Quality scheduling, execution and result evidence.
 * Why: unrelated governance must not serialize independent proofs or widen test filters.
 * Corner: missing scope, skipped selected proofs and bad argv remain failures.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import yaml from 'js-yaml';
import { parseCLI } from 'vitest/node';
import { buildCiScopeOutputs } from './ci-scope-outputs.mjs';
import { classifyPackageJsonChange } from './scope-config.mjs';

const PR_QUALITY_GOVERNANCE_COMMANDS = [
  'pnpm docs:gov:filenames:changed',
  'pnpm docs:gov:frontmatter:changed',
  'pnpm docs:governance:unit-coverage',
  'pnpm traceability:adr0',
  'pnpm docs:feature-mechanization',
  'pnpm qa:artifact:check',
  'pnpm arch:deps',
];

function assertWorkflowContains(workflow, snippet) {
  assert.ok(workflow.includes(snippet), `workflow must include: ${snippet}`);
}

function assertWorkflowExcludes(workflow, snippet) {
  assert.ok(!workflow.includes(snippet), `workflow must exclude: ${snippet}`);
}

function countWorkflowCommand(workflow, command) {
  return workflow.split(command).length - 1;
}

function namedWorkflowStep(workflow, name) {
  const marker = `      - name: ${name}`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `workflow must contain step: ${name}`);
  const next = workflow.indexOf('\n      - name:', start + marker.length);
  return workflow.slice(start, next === -1 ? workflow.length : next);
}

test('changed-file CI builds its canonical hash dependency before loading the checker', () => {
  const workflow = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));
  const steps = workflow.jobs['pr-checks'].steps;
  const checkerIndex = steps.findIndex((step) =>
    step.run?.includes('node scripts/check-changed.cjs')
  );
  const setupIndex = steps.findIndex((step) => step.uses === './.github/actions/setup-node-pnpm');
  assert.ok(setupIndex >= 0 && setupIndex < checkerIndex);
  assert.deepEqual(
    steps[checkerIndex].run.trim().split(/\s*&&\s*/u),
    ['pnpm --filter @dvt/crypto build', 'node scripts/check-changed.cjs'],
    'the checker must not run if its workspace dependency build fails'
  );
});

test('combined scope preserves PR-only integration selection and manual opt-ins', () => {
  const workflow = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));
  const outputs = workflow.jobs['detect-pr-scope']?.outputs ?? {};
  const keys = ['temporal_changed', 'temporal_transformation_changed', 'temporal_postgres_changed'];
  for (const event of ['pull_request', 'push', 'workflow_dispatch']) {
    for (const selected of [true, false]) {
      for (const manual of [true, false]) {
        const selectedScope = Object.fromEntries(keys.map((key) => [key, selected]));
        const inputs = Object.fromEntries(
          [
            'run_temporal_integration',
            'run_temporal_transformation_integration',
            'run_temporal_postgres_integration',
          ].map((key) => [key, String(manual)])
        );
        for (const key of keys) {
          const expression = outputs[key].replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/gu, '');
          const actual = runInNewContext(expression, {
            github: { event_name: event, event: { inputs } },
            steps: { scope: { outputs: { pr_quality_scope: JSON.stringify(selectedScope) } } },
            fromJSON: JSON.parse,
            toJSON: JSON.stringify,
          });
          assert.equal(
            actual,
            event === 'pull_request'
              ? String(selected)
              : String(event === 'workflow_dispatch' && manual),
            `${event}:${selected}:${manual}:${key}`
          );
        }
      }
    }
  }
});

const quality = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));
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

test('governance coverage consumes real tooling and root scopes without global governance', () => {
  const alias = classifyPackageJsonChange(
    { scripts: {} },
    {
      scripts: { 'test:ci-tools': 'node tools/ci/ci-tool-test-suite.mjs all' },
    }
  );
  const condition = quality.jobs['pr-checks'].steps
    .find(({ name }) => name === 'Validate governance unit coverage')
    .if.replaceAll('needs.detect-pr-scope', "needs['detect-pr-scope']");
  for (const [files, context, expected] of [
    [['turbo.json'], {}, true],
    [['package.json'], { 'package.json': alias }, true],
    [['tools/ci/setup-native-browser.test.mjs'], {}, false],
  ]) {
    const outputs = buildCiScopeOutputs(files, context);
    assert.equal(JSON.parse(outputs.workflow_scope).governance_global_relevant, false);
    assert.equal(
      runInNewContext(condition, {
        github: { event_name: 'pull_request' },
        needs: { 'detect-pr-scope': { outputs } },
        fromJSON: JSON.parse,
      }),
      expected,
      files[0]
    );
  }
});

test('PR quality does not materialize human documentation indexes', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  assertWorkflowExcludes(prQualityGate, 'pnpm docs:sync:check');
});

test('PR quality gate keeps merge-blocking non-projection governance commands wired', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assertWorkflowContains(prQualityGate, 'pnpm docs:gov:locations -- --changed-only');
  assert.doesNotMatch(
    prQualityGate,
    /if:\s*github\.event_name == 'pull_request'[^\n]*steps\.scope\.outputs\.docs_changed[^\n]*\n\s*run: pnpm docs:gov:locations\n/u
  );

  for (const command of PR_QUALITY_GOVERNANCE_COMMANDS) {
    assertWorkflowContains(prQualityGate, command);
  }
});

test('PR quality gate consumes prepush-equivalent scope outputs for expensive gates', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assertWorkflowContains(
    prQualityGate,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).governance_global_relevant'
  );
  assertWorkflowContains(
    prQualityGate,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).traceability_adr0_relevant'
  );
  assertWorkflowContains(
    prQualityGate,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).feature_mechanization_relevant'
  );
  assertWorkflowContains(
    prQualityGate,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).code_validation_relevant'
  );
});

test('PR quality gate prepares planning DB for its remaining DB-backed consumers', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const preparePlanningDbAction = readFileSync(
    '.github/actions/prepare-planning-db/action.yml',
    'utf8'
  );
  const prepareDbStep = namedWorkflowStep(
    prQualityGate,
    'Prepare planning DB for DB-backed validation'
  );
  const prepareDbIndex = prQualityGate.indexOf('Prepare planning DB for DB-backed validation');
  const prepareDbActionIndex = prQualityGate.indexOf('uses: ./.github/actions/prepare-planning-db');
  const inventoryGateIndex = prQualityGate.indexOf('pnpm planning:db:inventory:check');

  assert.notEqual(prepareDbIndex, -1);
  assert.notEqual(prepareDbActionIndex, -1);
  assert.notEqual(inventoryGateIndex, -1);
  assert.ok(prepareDbIndex < prepareDbActionIndex);
  assert.ok(prepareDbActionIndex < inventoryGateIndex);
  assertWorkflowContains(prQualityGate, "github.event_name == 'push'");
  assertWorkflowExcludes(prepareDbStep, 'feature_mechanization_relevant');
  assertWorkflowContains(
    prepareDbStep,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).planning_db_inventory_relevant == true'
  );
  assertWorkflowContains(
    prepareDbStep,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).docs_structure_changed == true'
  );
  assertWorkflowContains(
    prepareDbStep,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).governance_global_relevant == true'
  );
  assertWorkflowExcludes(prQualityGate, 'pnpm docs:dbt-roundtrip-capabilities:check');
  assertWorkflowExcludes(prQualityGate, 'DVT_GIT_EVIDENCE_REPO');
  assert.doesNotMatch(prQualityGate, /import-governance:/u);
  assertWorkflowContains(preparePlanningDbAction, 'pnpm planning:db:import');
  const cryptoBuildIndex = preparePlanningDbAction.indexOf('pnpm --filter @dvt/crypto build');
  const schemaLoadIndex = preparePlanningDbAction.indexOf('node scripts/planning-db-schema.cjs');
  const planningImportIndex = preparePlanningDbAction.indexOf('pnpm planning:db:import');
  assert.notEqual(cryptoBuildIndex, -1);
  assert.notEqual(schemaLoadIndex, -1);
  assert.ok(cryptoBuildIndex < schemaLoadIndex, 'build crypto before its first schema consumer');
  assert.ok(cryptoBuildIndex < planningImportIndex);
  assert.doesNotMatch(preparePlanningDbAction, /planning:db:migrate/u);
  assert.equal(
    countWorkflowCommand(
      prepareDbStep,
      'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).governance_global_relevant == true'
    ),
    1,
    'governance scope must activate the single current-schema preparation action'
  );
  assertWorkflowContains(prQualityGate, 'GIT_BASE:');
  assertWorkflowContains(prQualityGate, 'github.event.pull_request.base.sha');
  assertWorkflowContains(prQualityGate, 'GIT_HEAD: ${{ github.sha }}');
});
