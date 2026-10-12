/** @ownedConcern Require scope-complete evidence from the actual Test Suite workflow. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import yaml from 'js-yaml';

const workflow = yaml.load(readFileSync('.github/workflows/test.yml', 'utf8'));
const aggregate = workflow.jobs['test-suite-required'];
const webMatrix = [
  { phase: 'vitest', capability: '' },
  { phase: 'browser', capability: 'controlled' },
  { phase: 'browser', capability: 'available' },
  { phase: 'browser', capability: 'unavailable' },
];
const lanes = [
  'package-tests',
  'adapter-temporal',
  'web-frontend-tests',
  'adapter-postgres',
  'coverage',
];
const scopeKeys = [
  'any_tests',
  'adapter_temporal',
  'web',
  'root_build_sensitive',
  'postgres_capability_changed',
  'coverage_relevant',
];

function fixture(eventName = 'pull_request', selected = [], draft = false) {
  const outputs = Object.fromEntries(scopeKeys.map((key) => [key, String(selected.includes(key))]));
  const full = eventName !== 'pull_request';
  const root = selected.includes('root_build_sensitive');
  const enabled = [
    selected.includes('any_tests'),
    root || selected.includes('adapter_temporal'),
    root || selected.includes('web'),
    selected.includes('postgres_capability_changed'),
    selected.includes('coverage_relevant'),
  ];
  const jobs = Object.fromEntries(
    lanes.map((name, i) => [
      name,
      { result: !draft && (full || enabled[i]) ? 'success' : 'skipped' },
    ])
  );
  jobs.detect_test_matrix = {
    result: draft ? 'skipped' : 'success',
    outputs: draft ? {} : outputs,
  };
  return { jobs, context: { eventName, payload: { pull_request: { draft } } } };
}

function assess({ jobs, context }) {
  const failures = [];
  runInNewContext(
    aggregate.steps[0].with.script.replace('${{ toJSON(needs) }}', JSON.stringify(jobs)),
    {
      core: { setFailed: (message) => failures.push(message) },
      context,
    }
  );
  return failures;
}

test('Test Suite keeps one engine evidence owner and a complete stable aggregate', () => {
  assert.equal(aggregate.name, 'Test Suite Required for Merge');
  assert.equal(aggregate.if, 'always()');
  assert.deepEqual([...aggregate.needs].sort(), ['detect_test_matrix', ...lanes].sort());
  assert.equal(workflow.jobs['test-determinism'], undefined);
  assert.equal(workflow.jobs.detect_test_matrix.outputs.determinism_relevant, undefined);
  const commands = workflow.jobs.coverage.steps.map((step) => step.run).filter(Boolean);
  assert.ok(commands.includes('pnpm test:coverage:engine'));
  assert.ok(
    commands.includes('node scripts/run-turbo-workspace-task.cjs build --filter=@dvt/engine^...')
  );
  assert.ok(
    !commands.some((command) => /testNamePattern|test:determinism|test:replay/u.test(command))
  );
});

test('PostgreSQL integration files run once in the full suite with the real database posture', () => {
  const postgresJob = workflow.jobs['adapter-postgres'];
  const commands = postgresJob.steps.map((step) => step.run).filter(Boolean);
  const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
  const adapterPackage = JSON.parse(
    readFileSync('packages/@dvt/adapter-postgres/package.json', 'utf8')
  );
  const vitestConfig = readFileSync('packages/@dvt/adapter-postgres/vitest.config.ts', 'utf8');

  assert.equal(postgresJob.env.DVT_PG_INTEGRATION, '1');
  assert.equal(commands.filter((command) => command === 'pnpm test:adapter-postgres').length, 1);
  assert.ok(
    !commands.some((command) =>
      /PostgresAppRoleRuntime\.integration\.test\.ts|PostgresTenantRlsEnforcement\.integration\.test\.ts/u.test(
        command
      )
    )
  );
  assert.equal(
    rootPackage.scripts['test:adapter-postgres'],
    'pnpm --filter @dvt/adapter-postgres test'
  );
  assert.match(adapterPackage.scripts.test, /vitest run.*--config vitest\.config\.ts/u);
  assert.match(vitestConfig, /include:\s*\['test\/\*\*\/\*\.test\.ts'\]/u);
  for (const file of [
    'PostgresAppRoleRuntime.integration.test.ts',
    'PostgresTenantRlsEnforcement.integration.test.ts',
  ]) {
    assert.ok(existsSync(`packages/@dvt/adapter-postgres/test/${file}`));
  }
});

test('Web keeps four independent bounded obligations with isolated cache producers', () => {
  const web = workflow.jobs['web-frontend-tests'];
  assert.equal(web.name, 'Web Frontend Tests (${{ matrix.capability || matrix.phase }})');
  assert.deepEqual(web.strategy, {
    'fail-fast': false,
    matrix: { include: webMatrix },
  });
  assert.equal(web['timeout-minutes'], 25);
  assert.notEqual(web['continue-on-error'], true);
  const install = web.steps.find((step) => step.uses === './.github/actions/setup-node-pnpm');
  assert.equal(install.with['turbo-cache-variant'], '${{ matrix.capability || matrix.phase }}');
  assert.equal(
    web.env.PROOF_OWNER,
    '${{ github.run_id }}-${{ github.run_attempt }}-${{ matrix.capability || matrix.phase }}'
  );
});

test('Web phases resolve one plan and execute disjoint changed or full obligations', () => {
  const web = workflow.jobs['web-frontend-tests'];
  const plan = web.steps.find((step) => step.id === 'web_plan');
  assert.ok(plan, 'Resolve the existing Web plan before allocating browser infrastructure');
  assert.equal(web.services, undefined, 'Ordinary Web-only changes must not allocate PostgreSQL');
  const primary = web.steps.find((step) => step.run === 'pnpm test:web:ci');
  const changed = web.steps.find(
    (step) =>
      step.run ===
      "pnpm test:web:changed --phase=${{ matrix.phase }} ${{ matrix.capability && format('--browser-capability={0}', matrix.capability) || '' }}"
  );
  const browser = web.steps.find(
    (step) =>
      step.run ===
      'pnpm test:web:changed --full --phase=browser --browser-capability=${{ matrix.capability }}'
  );
  assert.ok(primary && changed && browser);
  const executions = web.steps.filter(
    (step) => step.run?.startsWith('pnpm test:web:') && step !== plan
  );
  assert.equal(executions.length, 3, 'No duplicate or legacy Web execution command');
  for (const [event, root, full] of [
    ['pull_request', false, false],
    ['pull_request', true, true],
    ['push', false, true],
    ['workflow_dispatch', false, true],
  ]) {
    for (const matrix of webMatrix) {
      const { phase, capability } = matrix;
      const context = {
        matrix,
        format: (template, value) => template.replace('{0}', value),
        github: { event_name: event },
        needs: {
          detect_test_matrix: { outputs: { web: 'true', root_build_sensitive: String(root) } },
        },
      };
      const planned = plan.run.replace(/\$\{\{(.*?)\}\}/gsu, (_, expression) =>
        String(runInNewContext(expression, context))
      );
      assert.equal(
        planned.trim().replace(/ +/gu, ' '),
        `pnpm test:web:changed --plan --phase=${phase}${capability ? ` --browser-capability=${capability}` : ''}${full ? ' --full' : ''}`
      );
      const expected = full ? (phase === 'vitest' ? primary : browser) : changed;
      assert.deepEqual(
        executions.filter((step) => runInNewContext(step.if, context)),
        [expected],
        `${event}: root=${root}, phase=${phase}, capability=${capability}`
      );
      assert.notEqual(expected['continue-on-error'], true);
    }
  }
});

test('Web provisions only the selected browser capability infrastructure', () => {
  const web = workflow.jobs['web-frontend-tests'];
  const plan = web.steps.find((step) => step.id === 'web_plan');
  for (const id of [
    'browser_python',
    'browser_provider',
    'browser_dependencies',
    'browser_postgres',
  ]) {
    const step = web.steps.find((entry) => entry.id === id);
    assert.ok(step, id);
    assert.ok(web.steps.indexOf(plan) < web.steps.indexOf(step));
    for (const { phase, capability } of webMatrix) {
      for (const required of ['true', 'false', '', undefined]) {
        const providerRequired = capability === 'available' || capability === 'unavailable';
        assert.equal(
          runInNewContext(step.if, {
            matrix: { phase },
            steps: {
              web_plan: {
                outputs: {
                  browser_required: required,
                  provider_required: providerRequired ? required : 'false',
                },
              },
            },
          }),
          phase === 'browser' &&
            required === 'true' &&
            (id === 'browser_dependencies' || providerRequired),
          `${id}: ${phase}, ${capability}, ${required}`
        );
      }
    }
    assert.notEqual(step['continue-on-error'], true);
  }
  assert.equal(web.env.DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME, 'native');
  assert.equal(web.env.DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME, 'available');
  const install = web.steps.find((step) => step.uses === './.github/actions/setup-node-pnpm');
  assert.equal(install.env.CYPRESS_INSTALL_BINARY, '0');
  const browserDependencies = web.steps.find((step) => step.id === 'browser_dependencies');
  const browserProvider = web.steps.find((step) => step.id === 'browser_provider');
  assert.match(browserProvider.run, /dbt-postgres==\d+\.\d+\.\d+/u);
  assert.match(browserProvider.run, /dbt-core==\d+\.\d+\.\d+/u);
  assert.doesNotMatch(browserDependencies.run, /dbt|pip|python/u);
  assert.match(browserDependencies.run, /cypress install/u);
  assert.match(browserDependencies.run, /cypress verify/u);
  assert.equal(browserDependencies.env?.CYPRESS_INSTALL_BINARY, undefined);
});

test('Web proof allocation and cleanup are bounded to the container created by this run', () => {
  const web = workflow.jobs['web-frontend-tests'];
  const allocate = web.steps.find((step) => step.id === 'browser_postgres');
  const cleanup = web.steps.find((step) => step.name === 'Remove browser proof PostgreSQL');
  assert.ok(allocate && cleanup);
  assert.match(allocate.run, /docker create/u);
  assert.match(allocate.run, /--publish 127\.0\.0\.1::5432/u);
  assert.match(allocate.run, /--label "dvt\.ci\.proof=\$PROOF_OWNER"/u);
  assert.ok(allocate.run.indexOf('container_id=') < allocate.run.indexOf('docker start'));
  assert.match(allocate.run, /DATABASE_URL=postgresql:\/\//u);
  assert.match(allocate.run, /pg_isready -h 127\.0\.0\.1/u);
  assert.equal(
    cleanup.env.PROOF_CONTAINER_ID,
    '${{ steps.browser_postgres.outputs.container_id }}'
  );
  assert.match(cleanup.run, /docker inspect/u);
  assert.match(cleanup.run, /docker rm --force "\$PROOF_CONTAINER_ID"/u);
  assert.doesNotMatch(cleanup.run, /prune|docker ps|\|\s*xargs/u);
  for (const containerId of ['', 'allocated-container']) {
    assert.equal(
      runInNewContext(cleanup.if, {
        always: () => true,
        steps: { browser_postgres: { outputs: { container_id: containerId } } },
      }),
      containerId !== ''
    );
  }
  const artifacts = web.steps.filter((step) => step.uses?.startsWith('actions/upload-artifact@'));
  assert.equal(artifacts.length, 1);
  const artifact = artifacts[0];
  assert.equal(artifact.with.name, 'web-live-proof-screenshots-${{ matrix.capability }}');
  assert.equal(artifact.with.path, '.dvt/evidence/selected-closure/screenshots');
  assert.equal(artifact.with['include-hidden-files'], true);
  for (const [phase, required, outcome, expected] of [
    ['vitest', 'true', 'failure', false],
    ['vitest', 'true', 'cancelled', false],
    ['browser', 'true', 'failure', true],
    ['browser', 'true', 'cancelled', true],
    ['browser', 'true', 'success', false],
    ['browser', 'false', 'failure', false],
    ['browser', '', 'cancelled', false],
    ['browser', undefined, 'failure', false],
  ]) {
    assert.equal(
      runInNewContext(artifact.if, {
        matrix: { phase },
        failure: () => outcome === 'failure',
        cancelled: () => outcome === 'cancelled',
        steps: { web_plan: { outputs: { browser_required: required } } },
      }),
      expected,
      `screenshots: ${phase}, ${required}, ${outcome}`
    );
  }
  assert.doesNotMatch(artifact.with.path, /profiles|result\.json|\*/u);
});

test('Web planning reads the exact PR, push or manual comparison without an empty-ref fallback', () => {
  const web = workflow.jobs['web-frontend-tests'];
  const expression = web.env.GIT_BASE.replace(/^\$\{\{|\}\}$/gu, '');
  for (const [event, expected] of [
    ['pull_request', 'origin/release'],
    ['push', 'before-sha'],
    ['workflow_dispatch', 'head-sha'],
  ]) {
    assert.equal(
      runInNewContext(expression, {
        github: {
          event_name: event,
          base_ref: 'release',
          event: { before: 'before-sha' },
          sha: 'head-sha',
        },
        format: (pattern, value) => pattern.replace('{0}', value),
      }),
      expected
    );
  }
  assert.equal(web.env.GIT_HEAD, '${{ github.sha }}');
  const fetch = web.steps.find((step) => step.name === 'Fetch exact push comparison base');
  assert.ok(fetch);
  assert.match(fetch.run, /git fetch --no-tags --depth=1 origin "\$GIT_BASE"/u);
  assert.ok(web.steps.indexOf(fetch) < web.steps.findIndex((step) => step.id === 'web_plan'));
});

test('ready PRs accept every scope combination only with its selected evidence', () => {
  for (let mask = 0; mask < 2 ** scopeKeys.length; mask += 1) {
    const selected = scopeKeys.filter((_, index) => mask & (1 << index));
    const input = fixture('pull_request', selected);
    assert.deepEqual(assess(input), [], selected.join(','));
    for (const lane of lanes) {
      const scheduled = runInNewContext(`Boolean(${workflow.jobs[lane].if})`, {
        github: { event_name: 'pull_request', event: input.context.payload },
        needs: input.jobs,
      });
      assert.equal(scheduled, input.jobs[lane].result === 'success', `${lane}: ${selected}`);
    }
  }
});

test('drafts skip all work and ready_for_review requires the new current scope', () => {
  const draft = fixture('pull_request', scopeKeys, true);
  draft.context.payload.action = 'converted_to_draft';
  assert.deepEqual(assess(draft), []);
  assert.equal(
    runInNewContext(`Boolean(${workflow.jobs['web-frontend-tests'].if})`, {
      github: { event_name: 'pull_request', event: draft.context.payload },
      needs: draft.jobs,
    }),
    false,
    'Drafts cannot schedule either Web phase'
  );
  const ready = fixture('pull_request', scopeKeys);
  ready.context.payload.action = 'ready_for_review';
  assert.deepEqual(assess(ready), []);
  ready.jobs.coverage.result = 'skipped';
  assert.notEqual(assess(ready).length, 0);
  draft.jobs.coverage.result = 'success';
  assert.notEqual(assess(draft).length, 0);
});

test('push and manual require all lanes even when PR scope would be empty', () => {
  for (const event of ['push', 'workflow_dispatch']) {
    assert.deepEqual(assess(fixture(event)), []);
    for (const lane of lanes) {
      const input = fixture(event);
      input.jobs[lane].result = 'skipped';
      assert.notEqual(assess(input).length, 0, `${event}: ${lane}`);
    }
  }
});

test('selected missing, skipped, failed and cancelled results always reject', () => {
  for (const lane of ['detect_test_matrix', ...lanes]) {
    for (const result of ['skipped', 'failure', 'cancelled', undefined]) {
      const input = fixture('pull_request', scopeKeys);
      if (result === undefined) delete input.jobs[lane];
      else input.jobs[lane].result = result;
      assert.notEqual(assess(input).length, 0, `${lane}: ${result}`);
    }
  }
});

test('missing or malformed scope and unsupported events cannot produce green', () => {
  for (const key of scopeKeys) {
    for (const value of [undefined, '', 'unexpected', true]) {
      const input = fixture();
      input.jobs.detect_test_matrix.outputs[key] = value;
      assert.notEqual(assess(input).length, 0, `${key}: ${value}`);
    }
  }
  assert.notEqual(assess(fixture('schedule')).length, 0);
  const missingDraft = fixture();
  delete missingDraft.context.payload.pull_request;
  assert.notEqual(assess(missingDraft).length, 0);
});

test('out-of-scope unexpected results are rejected, not silently ignored', () => {
  for (const lane of lanes) {
    const input = fixture();
    input.jobs[lane].result = 'success';
    assert.notEqual(assess(input).length, 0, lane);
  }
  const unclassified = fixture();
  unclassified.jobs['new-unclassified-lane'] = { result: 'success' };
  assert.notEqual(assess(unclassified).length, 0);
});
