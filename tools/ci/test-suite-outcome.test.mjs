/** @ownedConcern Require scope-complete evidence from the actual Test Suite workflow. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import yaml from 'js-yaml';

const workflow = yaml.load(readFileSync('.github/workflows/test.yml', 'utf8'));
const aggregate = workflow.jobs['test-suite-required'];
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
