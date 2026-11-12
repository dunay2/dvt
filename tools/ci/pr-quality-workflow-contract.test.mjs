import './workflow-contracts/pr-quality-outcome.cases.mjs';
import './workflow-contracts/pr-quality-governance.cases.mjs';

/** Owned concern: pr quality workflow contract.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import yaml from 'js-yaml';
import { buildCiScopeOutputs } from './ci-scope-outputs.mjs';
import { classifyPackageJsonChange } from './scope-config.mjs';

const quality = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));

test('hosted CI-tool ownership uses the same immutable PR identity as its producer', () => {
  const code = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const pr = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));
  const producerScope = code.jobs['detect-affected'].steps.find(
    (step) => step.run === 'node tools/ci/emit-scope.mjs'
  );
  const prScope = pr.jobs['detect-pr-scope'].steps.find(
    (step) => step.run === 'node tools/ci/emit-scope.mjs'
  );
  assert.deepEqual(producerScope.env, prScope.env);
  assert.equal(producerScope.env.GIT_BASE, '${{ github.event.pull_request.base.sha }}');
  assert.equal(
    code.jobs['detect-affected'].steps.some(
      (step) => step.uses === './.github/actions/fetch-scope-base'
    ),
    false,
    'the canonical scope emitter owns exact base acquisition without a second branch fetch'
  );
  const committed = pr.jobs['pr-checks'].steps.find((step) =>
    step.run?.startsWith('pnpm verify:changed --committed-tests')
  );
  assert.equal(committed.run, 'pnpm verify:changed --committed-tests --hosted-ci-tools=v1');
  assert.deepEqual(committed.env, prScope.env);
});

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

test('full governance has merge-base history while PRs and independent proofs stay shallow', () => {
  // Manual bootstrap previously failed because its branch-only checkout omitted origin/main.
  const { jobs } = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));
  for (const [id, job] of Object.entries(jobs)) {
    const checkout = job.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
    if (!checkout) continue;
    const depth = String(checkout.with['fetch-depth']).replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/gu, '');
    for (const event of ['pull_request', 'push', 'workflow_dispatch']) {
      const expected =
        id === 'pr-checks' ? (event === 'pull_request' ? 2 : 0) : id === 'detect-pr-scope' ? 2 : 1;
      assert.equal(
        Number(runInNewContext(depth, { github: { event_name: event } })),
        expected,
        `${id} checkout for ${event}`
      );
    }
  }
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
