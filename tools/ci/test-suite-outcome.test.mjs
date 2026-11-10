/** @ownedConcern Require scope-complete evidence from the actual Test Suite workflow. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import yaml from 'js-yaml';

const workflow = yaml.load(readFileSync('.github/workflows/test.yml', 'utf8'));
const aggregate = workflow.jobs['test-suite-required'];
const browserMatrix = [
  { phase: 'browser', capability: 'controlled', shard: 1 },
  { phase: 'browser', capability: 'controlled', shard: 2 },
  { phase: 'browser', capability: 'controlled', shard: 3 },
  { phase: 'browser', capability: 'available', shard: 1 },
  { phase: 'browser', capability: 'available', shard: 2 },
  { phase: 'browser', capability: 'available', shard: 3 },
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
const webMatrix = expandWebMatrix(webScenarioContext());

function webScenarioContext(event = 'workflow_dispatch', root = false, draft = false) {
  return {
    github: {
      event_name: event,
      event: { pull_request: { draft } },
      run_id: 'run',
      run_attempt: '1',
    },
    needs: { detect_test_matrix: { outputs: { web: 'true', root_build_sensitive: String(root) } } },
    fromJSON: JSON.parse,
    format: (template, value) => template.replace('{0}', value),
  };
}

function renderWebCommand(value, context) {
  return value
    .replace(/\$\{\{(.*?)\}\}/gsu, (_, expression) => String(runInNewContext(expression, context)))
    .trim()
    .replace(/\s+/gu, ' ');
}

function expandWebMatrix(context) {
  const { include = [], exclude, ...axes } = workflow.jobs['web-frontend-tests'].strategy.matrix;
  assert.equal(exclude, undefined, 'Web evidence must not be removed through matrix excludes');
  const dimensions = Object.entries(axes);
  const rows = dimensions.reduce(
    (combinations, [key, value]) => {
      const values =
        typeof value === 'string' ? runInNewContext(value.slice(3, -2), context) : value;
      assert.ok(Array.isArray(values) && values.length > 0, `Nonempty matrix axis: ${key}`);
      return combinations.flatMap((row) => values.map((entry) => ({ ...row, [key]: entry })));
    },
    [{}]
  );
  if (dimensions.length === 0) return include;
  const added = [];
  for (const entry of include) {
    const matches = rows.filter((row) =>
      dimensions.every(([key]) => !(key in entry) || row[key] === entry[key])
    );
    if (matches.length === 0) added.push(entry);
    else for (const row of matches) Object.assign(row, entry);
  }
  return [...rows, ...added];
}

test('only available native browser shards use the admitted hosted platform and Node', () => {
  const web = workflow.jobs['web-frontend-tests'];
  const setup = web.steps.find((step) => step.uses === './.github/actions/setup-node-pnpm');
  const resolve = (value, matrix) =>
    value.startsWith('${{') ? runInNewContext(value.slice(3, -2), { matrix }) : value;
  for (const matrix of [...webMatrix, { phase: 'vitest', capability: 'available' }]) {
    const available = matrix.phase === 'browser' && matrix.capability === 'available';
    assert.equal(resolve(web['runs-on'], matrix), available ? 'ubuntu-24.04' : 'ubuntu-latest');
    assert.equal(resolve(setup.with['node-version'], matrix), available ? '22.23.3' : '22.x');
  }
});

test('the admitted Chrome prerequisite checks actual discovery and preserves no-browser planning', () => {
  const web = workflow.jobs['web-frontend-tests'];
  const chrome = web.steps.find((step) => step.id === 'browser_chrome');
  assert.ok(chrome, 'Declare the browser prerequisite in the existing workflow adapter');
  assert.ok(
    web.steps.indexOf(chrome) > web.steps.findIndex((step) => step.id === 'browser_dependencies')
  );
  assert.ok(
    web.steps.indexOf(chrome) < web.steps.findIndex((step) => step.id === 'browser_postgres')
  );
  assert.notEqual(chrome['continue-on-error'], true);
  for (const [phase, capability, required, expected] of [
    ['browser', 'available', 'true', true],
    ['browser', 'available', 'false', false],
    ['browser', 'available', undefined, false],
    ['browser', 'controlled', 'true', false],
    ['browser', 'unavailable', 'true', false],
    ['vitest', 'available', 'true', false],
  ]) {
    assert.equal(
      runInNewContext(chrome.if, {
        matrix: { phase, capability },
        steps: { web_plan: { outputs: { browser_required: required } } },
      }),
      expected
    );
  }
  assert.match(chrome.run, /8fbd2ae69cdf7ee98b7513c3396a7b5e06f974f8625fdd590df3091dd0c3e9de/u);
  assert.match(chrome.run, /sha256sum --check --status/u);
  assert.match(chrome.run, /google-chrome-stable --product-version/u);
  assert.match(chrome.run, /cypress info/u);
  const script = /node --input-type=module -e '([\s\S]*?)'/u.exec(chrome.run)?.[1];
  assert.ok(script, 'Execute the workflow discovery check, not a second browser validator');
  const directory = mkdtempSync(join(tmpdir(), 'dvt-native-browser-identity-'));
  try {
    for (const [version, expected] of [
      ['155.0.8059.84', 0],
      ['150.0.7871.114', 1],
      ['155.0.8059.39', 1],
      ['', 1],
    ]) {
      const info = version
        ? `1. Chrome\n - Name: chrome\n - Channel: stable\n - Version: ${version}\n - Executable: google-chrome\n`
        : '';
      writeFileSync(join(directory, 'dvt-native-browser-info.txt'), info);
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        env: { ...process.env, RUNNER_TEMP: directory },
        encoding: 'utf8',
      });
      assert.ifError(result.error);
      assert.equal(result.status, expected, `${version || 'missing'}: ${result.stderr}`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

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

test('hosted CI gives product tests one push owner and retains manual full validation', () => {
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

  const quality = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const full = quality.jobs['full-ci'];
  const baseline = full.steps.find((step) => step.name === 'Run full CI baseline');
  const packageScripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  const staticChecks = ['pnpm arch:deps', 'pnpm type-check', 'pnpm lint:determinism'];
  const delegates = new Set(['ci:code:static', 'ci:code', 'ci:full']);
  function expandBaseline(command, ancestors = []) {
    return command.split(/\s*&&\s*/u).flatMap((part) => {
      const name = /^pnpm ([\w:-]+)$/u.exec(part)?.[1];
      if (!delegates.has(name)) return [part];
      assert.equal(ancestors.includes(name), false, `Baseline delegate cycle: ${name}`);
      assert.equal(typeof packageScripts[name], 'string', `Missing baseline delegate: ${name}`);
      return expandBaseline(packageScripts[name], [...ancestors, name]);
    });
  }
  assert.deepEqual(expandBaseline('pnpm ci:code:static'), staticChecks);
  assert.deepEqual(expandBaseline('pnpm ci:code'), [...staticChecks, 'turbo run test']);
  assert.equal(
    packageScripts['ci:full'],
    'pnpm ci:docs && pnpm ci:code && pnpm test:coverage:engine',
    'local and manual full validation must retain coverage'
  );
  assert.deepEqual(quality.on.push.branches, ['main']);
  assert.ok(Object.hasOwn(quality.on, 'workflow_dispatch'));
  for (const [eventName, expected] of [
    ['push', 'pnpm ci:docs && pnpm ci:code:static'],
    ['workflow_dispatch', 'pnpm ci:full'],
    ['pull_request', null],
  ]) {
    const context = { github: { event_name: eventName } };
    const selected = runInNewContext(`Boolean(${full.if})`, context);
    assert.equal(selected, expected !== null, eventName);
    if (!selected) continue;
    const command = baseline.run.replace(/\$\{\{(.*?)\}\}/gsu, (_, expression) =>
      String(runInNewContext(expression, context))
    );
    assert.equal(command.trim(), expected, eventName);
    assert.deepEqual(
      expandBaseline(command.trim()),
      [
        'pnpm ci:docs',
        ...staticChecks,
        ...(eventName === 'workflow_dispatch'
          ? ['turbo run test', 'pnpm test:coverage:engine']
          : []),
      ],
      `${eventName}: actual delegates retain each obligation exactly once`
    );
  }
  assert.equal(baseline.env.DVT_CI, '1');
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

test('Web keeps every bounded obligation with disjoint controlled and available producers', () => {
  const web = workflow.jobs['web-frontend-tests'];
  assert.equal(web.strategy['fail-fast'], false);
  assert.equal(web['timeout-minutes'], 25);
  assert.notEqual(web['continue-on-error'], true);
  const install = web.steps.find((step) => step.uses === './.github/actions/setup-node-pnpm');
  for (const [event, root, draft, groups] of [
    ['pull_request', false, false, ['changed']],
    ['pull_request', true, false, ['unit-architecture', 'presentation-1', 'presentation-2']],
    ['push', false, false, ['unit-architecture', 'presentation-1', 'presentation-2']],
    ['workflow_dispatch', false, false, ['unit-architecture', 'presentation-1', 'presentation-2']],
    ['pull_request', true, true, []],
  ]) {
    const context = webScenarioContext(event, root, draft);
    assert.equal(runInNewContext(`Boolean(${web.if})`, context), !draft);
    if (draft) continue;
    const rows = expandWebMatrix(context);
    assert.deepEqual(
      rows.filter((row) => row.phase === 'browser'),
      browserMatrix
    );
    assert.deepEqual(
      rows
        .filter((row) => row.phase === 'vitest')
        .map((row) => row.vitest_group)
        .sort(),
      [...groups].sort()
    );
    assert.equal(rows.length, browserMatrix.length + groups.length);
    for (const identity of [web.name, install.with['turbo-cache-variant'], web.env.PROOF_OWNER]) {
      const values = rows.map((matrix) => renderWebCommand(identity, { ...context, matrix }));
      assert.equal(
        new Set(values).size,
        rows.length,
        `${event}: each producer needs a distinct identity`
      );
      assert.ok(values.every((value) => value && !value.includes('undefined')));
    }
  }
});

test('Web phases resolve one plan and execute disjoint changed or full obligations', () => {
  const web = workflow.jobs['web-frontend-tests'];
  const plan = web.steps.find((step) => step.id === 'web_plan');
  assert.ok(plan, 'Resolve the existing Web plan before allocating browser infrastructure');
  assert.equal(web.services, undefined, 'Ordinary Web-only changes must not allocate PostgreSQL');
  const executions = web.steps.filter(
    (step) =>
      step.run &&
      /^pnpm (?:test:web:|--filter @dvt\/web (?:run )?test:)/u.test(step.run.trim()) &&
      step !== plan
  );
  const scripts = JSON.parse(readFileSync('apps/web/package.json', 'utf8')).scripts;
  const dependencies = 'pnpm run test:deps';
  const primary = scripts['test:ci']
    .split(/\s*&&\s*/u)
    .filter((command) => command !== dependencies);
  for (const [event, root, full] of [
    ['pull_request', false, false],
    ['pull_request', true, true],
    ['push', false, true],
    ['workflow_dispatch', false, true],
  ]) {
    const scenario = webScenarioContext(event, root);
    const primaryExecutions = [];
    for (const matrix of expandWebMatrix(scenario)) {
      const { phase, capability, shard } = matrix;
      const context = { ...scenario, matrix };
      const planned = renderWebCommand(plan.run, context);
      assert.equal(
        planned,
        `pnpm test:web:changed --plan --phase=${phase}${capability ? ` --browser-capability=${capability}` : ''}${shard ? ` --browser-shard=${shard}/3` : ''}${full ? ' --full' : ''}`
      );
      const selected = executions.filter((step) => !step.if || runInNewContext(step.if, context));
      assert.equal(
        selected.length,
        1,
        `${event}: root=${root}, phase=${phase}, capability=${capability}`
      );
      const [expected] = selected;
      assert.notEqual(expected['continue-on-error'], true);
      const executed = renderWebCommand(expected.run, context);
      if (full && phase === 'vitest') {
        const commands = executed
          .replace(/pnpm --filter @dvt\/web (?:run )?/gu, 'pnpm run ')
          .split(/\s*&&\s*/u);
        assert.equal(
          commands.shift(),
          dependencies,
          'Each runner prepares its own dependencies first'
        );
        assert.ok(commands.length > 0);
        primaryExecutions.push(...commands);
      } else {
        assert.deepEqual(
          executed.split(/\s+/u).sort(),
          planned
            .split(/\s+/u)
            .filter((arg) => arg !== '--plan')
            .sort()
        );
      }
    }
    // Native shards replace one complete presentation command; losing or repeating
    // either half must fail this contract before the expensive hosted run starts.
    const partitionedPrimary = primary.flatMap((command) =>
      command === 'pnpm run test:presentation:run'
        ? [`${command} --shard=1/2`, `${command} --shard=2/2`]
        : [command]
    );
    assert.deepEqual(primaryExecutions.sort(), full ? partitionedPrimary.sort() : []);
    assert.equal(
      new Set(primaryExecutions).size,
      primaryExecutions.length,
      'No primary suite or native partition runs twice'
    );
  }
});

test('Web builds dependencies for Vitest and nonempty browser partitions only', () => {
  const web = workflow.jobs['web-frontend-tests'];
  const plan = web.steps.find((step) => step.id === 'web_plan');
  const build = web.steps.find((step) => step.name === 'Build web dependency graph');
  assert.ok(build && typeof build.if === 'string', 'Gate the existing dependency build');
  assert.ok(web.steps.indexOf(plan) < web.steps.indexOf(build));
  assert.ok(
    web.steps.indexOf(build) <
      web.steps.findIndex((step) => step.name === 'Run governed Web changed evidence (PR)')
  );
  assert.equal(build.run, 'node scripts/run-turbo-workspace-task.cjs build --filter=@dvt/web^...');
  assert.notEqual(build['continue-on-error'], true);
  for (const matrix of webMatrix) {
    for (const required of ['true', 'false', '', undefined, true]) {
      assert.equal(
        runInNewContext(build.if, {
          matrix,
          steps: { web_plan: { outputs: { browser_required: required } } },
        }),
        matrix.phase === 'vitest' || required === 'true',
        `${JSON.stringify(matrix)}: ${String(required)}`
      );
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
  const artifacts = web.steps.filter(
    (step) =>
      step.uses?.startsWith('actions/upload-artifact@') &&
      step.with.path === '.dvt/evidence/selected-closure/screenshots'
  );
  assert.equal(artifacts.length, 1);
  const artifact = artifacts[0];
  assert.equal(
    artifact.with.name,
    'web-live-proof-screenshots-${{ matrix.capability }}-${{ matrix.shard || 0 }}'
  );
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
    const input = fixture(event);
    assert.deepEqual(assess(input), []);
    for (const lane of lanes) {
      assert.equal(
        runInNewContext(`Boolean(${workflow.jobs[lane].if})`, {
          github: { event_name: event, event: input.context.payload },
          needs: input.jobs,
        }),
        true,
        `${event}: ${lane}`
      );
    }
  }
});

test('selected missing, skipped, failed and cancelled results always reject', () => {
  for (const event of ['pull_request', 'push', 'workflow_dispatch']) {
    for (const lane of ['detect_test_matrix', ...lanes]) {
      for (const result of ['skipped', 'failure', 'cancelled', undefined]) {
        const input = fixture(event, scopeKeys);
        if (result === undefined) delete input.jobs[lane];
        else input.jobs[lane].result = result;
        assert.notEqual(assess(input).length, 0, `${event}: ${lane}: ${result}`);
      }
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
