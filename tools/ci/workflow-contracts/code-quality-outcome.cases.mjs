/** Owned concern: code quality outcome.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import yaml from 'js-yaml';

test('code quality workflow exposes a stable merge-blocking outcome', () => {
  const ciWorkflow = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const aggregator = ciWorkflow.jobs['code-quality-required'];

  assert.deepEqual(ciWorkflow.on.pull_request.types, [
    'opened',
    'synchronize',
    'reopened',
    'ready_for_review',
    'converted_to_draft',
  ]);
  assert.equal(ciWorkflow.concurrency['cancel-in-progress'], true);
  assert.match(ciWorkflow.concurrency.group, /github\.event\.pull_request\.number/u);
  for (const job of [
    'ci-tool-executable-contracts',
    'affected-preflight',
    'no-affected-workspaces',
  ]) {
    assert.match(ciWorkflow.jobs[job].if, /github\.event\.pull_request\.draft/u);
  }

  assert.equal(aggregator.name, 'Code Quality Required for Merge');
  assert.deepEqual(aggregator.needs, [
    'ci-tool-contracts',
    'detect-affected',
    'ci-tool-executable-contracts',
    'affected-preflight',
    'no-affected-workspaces',
    'full-ci',
    'markdown-lint',
  ]);
  assert.equal(aggregator.if, 'always()');

  const script = aggregator.steps[0].with.script;
  function assess({
    eventName,
    draft = false,
    changed = false,
    executable = false,
    markdown = false,
    overrides = {},
  }) {
    const jobs = Object.fromEntries(
      aggregator.needs.map((name) => [name, { result: 'skipped', outputs: {} }])
    );
    jobs['ci-tool-contracts'].result = 'success';
    jobs['detect-affected'] = {
      result: 'success',
      outputs: {
        any_changed: String(changed),
        ci_tool_executable_contracts_relevant: String(executable),
      },
    };
    if (eventName !== 'pull_request' || (!draft && executable)) {
      jobs['ci-tool-executable-contracts'].result = 'success';
    }
    if (eventName === 'pull_request' && !draft) {
      jobs[changed ? 'affected-preflight' : 'no-affected-workspaces'].result = 'success';
    }
    if (eventName !== 'pull_request') jobs['full-ci'].result = 'success';
    if (eventName === 'push' || (eventName === 'workflow_dispatch' && markdown)) {
      jobs['markdown-lint'].result = 'success';
    }
    for (const [name, result] of Object.entries(overrides)) {
      if (result === undefined) delete jobs[name];
      else jobs[name].result = result;
    }

    const failures = [];
    runInNewContext(script.replace('${{ toJSON(needs) }}', JSON.stringify(jobs)), {
      core: { setFailed: (message) => failures.push(message) },
      context: {
        eventName,
        payload: {
          pull_request: { draft },
          inputs: { run_markdown_lint: String(markdown) },
        },
      },
    });
    return failures;
  }

  assert.deepEqual(assess({ eventName: 'pull_request', draft: true, changed: true }), []);
  assert.deepEqual(assess({ eventName: 'pull_request', changed: true, executable: true }), []);
  assert.deepEqual(assess({ eventName: 'pull_request', changed: false }), []);
  assert.deepEqual(assess({ eventName: 'push' }), []);
  assert.deepEqual(assess({ eventName: 'workflow_dispatch' }), []);
  assert.deepEqual(assess({ eventName: 'workflow_dispatch', markdown: true }), []);
  assert.notEqual(
    assess({
      eventName: 'pull_request',
      draft: true,
      changed: true,
      overrides: { 'affected-preflight': 'success' },
    }).length,
    0
  );
  assert.notEqual(
    assess({
      eventName: 'pull_request',
      changed: true,
      executable: true,
      overrides: { 'affected-preflight': 'skipped' },
    }).length,
    0
  );
  assert.notEqual(
    assess({
      eventName: 'pull_request',
      changed: true,
      executable: true,
      overrides: { 'ci-tool-executable-contracts': 'skipped' },
    }).length,
    0
  );
  assert.notEqual(assess({ eventName: 'push', overrides: { 'full-ci': 'skipped' } }).length, 0);
  assert.notEqual(assess({ eventName: 'push', overrides: { 'full-ci': 'failure' } }).length, 0);
  assert.notEqual(
    assess({ eventName: 'push', overrides: { 'detect-affected': 'cancelled' } }).length,
    0
  );
  assert.notEqual(
    assess({
      eventName: 'workflow_dispatch',
      markdown: true,
      overrides: { 'markdown-lint': 'skipped' },
    }).length,
    0
  );
  for (const [scenario, required] of [
    [
      { eventName: 'push' },
      [
        'ci-tool-contracts',
        'detect-affected',
        'ci-tool-executable-contracts',
        'full-ci',
        'markdown-lint',
      ],
    ],
    [
      { eventName: 'workflow_dispatch', markdown: true },
      [
        'ci-tool-contracts',
        'detect-affected',
        'ci-tool-executable-contracts',
        'full-ci',
        'markdown-lint',
      ],
    ],
    [
      { eventName: 'pull_request', changed: true, executable: true },
      [
        'ci-tool-contracts',
        'detect-affected',
        'ci-tool-executable-contracts',
        'affected-preflight',
      ],
    ],
  ]) {
    for (const job of required) {
      for (const result of ['skipped', 'failure', 'cancelled', undefined]) {
        assert.notEqual(
          assess({ ...scenario, overrides: { [job]: result } }).length,
          0,
          `${scenario.eventName}: required ${job} returned ${String(result)}`
        );
      }
    }
  }
  assert.notEqual(assess({ eventName: 'schedule' }).length, 0);
});
