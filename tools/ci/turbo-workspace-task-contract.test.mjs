import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  DEFAULT_FILTER,
  SUPPORTED_TASKS,
  buildTurboArgs,
  parseArgs,
} = require('../../scripts/run-turbo-workspace-task.cjs');

const turbo = JSON.parse(readFileSync('turbo.json', 'utf8'));
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

test('Turbo workspace wrapper accepts governed task names and defaults to the affected filter', () => {
  assert.throws(() => parseArgs([]), /Unsupported Turbo workspace task/);
  assert.deepEqual(parseArgs(['typecheck']), {
    task: 'typecheck',
    filter: DEFAULT_FILTER,
  });
  assert.deepEqual(parseArgs(['test', '--filter', '@dvt/engine']), {
    task: 'test',
    filter: '@dvt/engine',
  });
  assert.deepEqual(parseArgs(['build', '--filter=@dvt/web']), {
    task: 'build',
    filter: '@dvt/web',
  });
  assert.deepEqual(parseArgs(['lint', '--filter=dvt-api']), {
    task: 'lint',
    filter: 'dvt-api',
  });
  assert.deepEqual(buildTurboArgs('typecheck', '@dvt/contracts'), [
    'exec',
    'turbo',
    'run',
    'typecheck',
    '--filter=@dvt/contracts',
  ]);
  assert.deepEqual([...SUPPORTED_TASKS], ['build', 'lint', 'test', 'typecheck']);
});

test('turbo.json declares governed build, lint, typecheck, and test task contracts', () => {
  assert.ok(turbo.globalDependencies.includes('turbo.json'));
  assert.ok(turbo.globalDependencies.includes('.github/actions/setup-node-pnpm/action.yml'));
  assert.ok(turbo.globalDependencies.includes('scripts/skip-prebuild-if-orchestrated.cjs'));
  assert.ok(turbo.globalDependencies.includes('scripts/skip-pretest-if-ci.cjs'));
  assert.deepEqual(turbo.tasks.build.dependsOn, ['^build']);
  assert.deepEqual(turbo.tasks.build.outputs, ['dist/**', '**/*.tsbuildinfo']);
  assert.deepEqual(turbo.tasks.build.env, ['DVT_CI']);

  assert.deepEqual(turbo.tasks.lint.outputs, []);
  assert.deepEqual(turbo.tasks.lint.env, ['DVT_CI']);

  assert.deepEqual(turbo.tasks.typecheck.dependsOn, ['^build']);
  assert.deepEqual(turbo.tasks.typecheck.outputs, []);
  assert.deepEqual(turbo.tasks.typecheck.env, ['DVT_CI']);

  assert.deepEqual(turbo.tasks.test.dependsOn, ['^build']);
  assert.deepEqual(turbo.tasks.test.outputs, []);
  assert.deepEqual(turbo.tasks.test.env, ['DVT_CI']);
});

test('root affected commands and CI matrix lint/build/typecheck steps use the Turbo workspace wrapper', () => {
  assert.equal(
    rootPackage.scripts['ci:code'],
    'pnpm arch:deps && pnpm type-check && turbo run test && pnpm lint:determinism'
  );
  assert.equal(rootPackage.scripts['ci:code'].includes('pnpm test'), false);
  assert.equal(
    rootPackage.scripts['ci:affected:build'],
    'node scripts/run-turbo-workspace-task.cjs build'
  );
  assert.equal(
    rootPackage.scripts['ci:affected:lint'],
    'node scripts/run-turbo-workspace-task.cjs lint'
  );
  assert.equal(
    rootPackage.scripts['ci:affected:typecheck'],
    'node scripts/run-turbo-workspace-task.cjs typecheck'
  );
  assert.equal(
    rootPackage.scripts['ci:affected:test'],
    'node scripts/run-turbo-workspace-task.cjs test'
  );
  assert.equal(
    rootPackage.scripts['preflight:affected'],
    'pnpm ci:affected:build && pnpm ci:affected:lint && pnpm ci:affected:typecheck && pnpm ci:affected:test'
  );
  assert.equal(
    rootPackage.scripts['preflight:affected:ci'],
    'pnpm ci:affected:build && pnpm ci:affected:lint && pnpm ci:affected:typecheck'
  );

  assert.ok(ciWorkflow.includes('run: pnpm verify:changed'));
  assert.ok(ciWorkflow.includes('GIT_BASE: origin/${{ github.base_ref }}'));
  assert.ok(ciWorkflow.includes('run: pnpm preflight:affected:ci'));
  assert.equal(ciWorkflow.includes('run: pnpm preflight:affected\n'), false);
  assert.ok(ciWorkflow.includes('run: pnpm ci:full'));
  assert.equal(
    ciWorkflow.includes(
      'node scripts/run-turbo-workspace-task.cjs build --filter=${{ matrix.pkg }}'
    ),
    false
  );
  assert.equal(
    ciWorkflow.includes(
      'node scripts/run-turbo-workspace-task.cjs lint --filter=${{ matrix.pkg }}'
    ),
    false
  );
  assert.equal(
    ciWorkflow.includes(
      'node scripts/run-turbo-workspace-task.cjs typecheck --filter=${{ matrix.pkg }}'
    ),
    false
  );
  assert.ok(
    testWorkflow.includes(
      'node scripts/run-turbo-workspace-task.cjs build --filter=${{ matrix.pkg }}'
    )
  );
  assert.equal(testWorkflow.includes('declare -A seen'), false);
});

test('GitHub workflows restrict optional remote Turbo cache credentials to trusted steps', () => {
  const findStepContainingCommand = (workflow, command) => {
    const runLine = `run: ${command}`;
    const runIndex = workflow.indexOf(runLine);
    assert.notEqual(runIndex, -1, `expected workflow command: ${command}`);
    const nextStepIndex = workflow.indexOf('\n      - name:', runIndex + runLine.length);

    return workflow.slice(runIndex, nextStepIndex === -1 ? workflow.length : nextStepIndex);
  };
  const findStepNamed = (workflow, stepName) => {
    const marker = `      - name: ${stepName}`;
    const start = workflow.indexOf(marker);
    assert.notEqual(start, -1, `expected workflow step: ${stepName}`);
    const next = workflow.indexOf('\n      - name:', start + marker.length);

    return workflow.slice(start, next === -1 ? workflow.length : next);
  };
  const assertTrustedTurboEnv = (step, commandName) => {
    assert.match(
      step,
      /\bTURBO_TOKEN: \$\{\{ github\.event_name != 'pull_request' && secrets\.TURBO_TOKEN \|\| '' \}\}/u,
      `expected trusted-event TURBO_TOKEN env for ${commandName}`
    );
    assert.match(
      step,
      /\bTURBO_TEAM: \$\{\{ github\.event_name != 'pull_request' && secrets\.TURBO_TEAM \|\| '' \}\}/u,
      `expected trusted-event TURBO_TEAM env for ${commandName}`
    );
  };

  for (const [workflowName, workflow] of [
    ['CI - Code Quality', ciWorkflow],
    ['Test Suite', testWorkflow],
  ]) {
    const jobsIndex = workflow.indexOf('\njobs:\n');
    assert.notEqual(jobsIndex, -1, `${workflowName} must define jobs`);
    const workflowHeader = workflow.slice(0, jobsIndex);

    assert.doesNotMatch(
      workflowHeader,
      /TURBO_TOKEN:/u,
      `${workflowName} must not expose TURBO_TOKEN at workflow scope`
    );
    assert.doesNotMatch(
      workflowHeader,
      /TURBO_TEAM:/u,
      `${workflowName} must not expose TURBO_TEAM at workflow scope`
    );
  }

  assertTrustedTurboEnv(findStepContainingCommand(ciWorkflow, 'pnpm ci:full'), 'pnpm ci:full');
  assertTrustedTurboEnv(
    findStepContainingCommand(
      testWorkflow,
      'node scripts/run-turbo-workspace-task.cjs build --filter=${{ matrix.pkg }}'
    ),
    'package matrix dependency build'
  );

  const prAffectedPreflightStep = findStepNamed(
    ciWorkflow,
    'Run affected workspace build, lint and type-check preflight'
  );
  assert.doesNotMatch(prAffectedPreflightStep, /TURBO_TOKEN:/u);
  assert.doesNotMatch(prAffectedPreflightStep, /TURBO_TEAM:/u);

  const packageTestStep = findStepNamed(testWorkflow, 'Run package tests');
  assert.doesNotMatch(packageTestStep, /TURBO_TOKEN:/u);
  assert.doesNotMatch(packageTestStep, /TURBO_TEAM:/u);

  const setupAction = readFileSync('.github/actions/setup-node-pnpm/action.yml', 'utf8');
  assert.match(setupAction, /Cache Turbo/);
  assert.match(setupAction, /path: \.turbo/);
});

test('Test Suite cacheable dependency graph builds use the governed Turbo wrapper', () => {
  const findStepContainingCommand = (workflow, command) => {
    const runLine = `run: ${command}`;
    const runIndex = workflow.indexOf(runLine);
    assert.notEqual(runIndex, -1, `expected Test Suite build command for ${command}`);
    const nextStepIndex = workflow.indexOf('\n      - name:', runIndex + runLine.length);

    return workflow.slice(runIndex, nextStepIndex === -1 ? workflow.length : nextStepIndex);
  };
  const assertTrustedTurboEnv = (step, filter) => {
    assert.match(
      step,
      /\bTURBO_TOKEN: \$\{\{ github\.event_name != 'pull_request' && secrets\.TURBO_TOKEN \|\| '' \}\}/u,
      `expected trusted-event TURBO_TOKEN env for ${filter}`
    );
    assert.match(
      step,
      /\bTURBO_TEAM: \$\{\{ github\.event_name != 'pull_request' && secrets\.TURBO_TEAM \|\| '' \}\}/u,
      `expected trusted-event TURBO_TEAM env for ${filter}`
    );
  };
  const expectedBuildFilters = [
    '@dvt/adapter-temporal^...',
    '@dvt/web^...',
    '@dvt/adapter-postgres...',
    '@dvt/engine^...',
  ];

  for (const filter of expectedBuildFilters) {
    const buildCommand = `node scripts/run-turbo-workspace-task.cjs build --filter=${filter}`;
    assert.ok(
      testWorkflow.includes(buildCommand),
      `expected Test Suite to build ${filter} through the Turbo workspace wrapper`
    );
    assertTrustedTurboEnv(findStepContainingCommand(testWorkflow, buildCommand), filter);
  }

  assert.equal(
    testWorkflow.includes(
      'run: pnpm --filter "@dvt/adapter-temporal^..." --workspace-concurrency=4 build'
    ),
    false
  );
  assert.equal(
    testWorkflow.includes('run: pnpm --filter "@dvt/web^..." --workspace-concurrency=4 build'),
    false
  );
  assert.equal(
    testWorkflow.includes('run: pnpm --filter "@dvt/engine^..." --workspace-concurrency=4 build'),
    false
  );
  assert.equal(
    testWorkflow.includes(
      'run: pnpm --workspace-concurrency=4 --filter @dvt/adapter-postgres... --if-present run build'
    ),
    false
  );

  assert.ok(testWorkflow.includes('run: pnpm test:adapter-temporal'));
  assert.ok(testWorkflow.includes('run: pnpm test:web:changed'));
  assert.ok(testWorkflow.includes('run: pnpm test:coverage:engine'));
});
