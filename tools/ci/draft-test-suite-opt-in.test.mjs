/** @ownedConcern Test the actual draft opt-in producer and aggregate, without running workloads. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync('.github/workflows/test.yml', 'utf8');
const keys = ['any_tests', 'adapter_temporal', 'web', 'root_build_sensitive',
  'postgres_capability_changed', 'coverage_relevant'];
const lanes = ['detect_test_matrix', 'package-tests', 'adapter-temporal',
  'web-frontend-tests', 'adapter-postgres', 'coverage'];

// Read only the owned scalar/block boundaries, not an alternative YAML parser.
// Existing workflow-pattern-parity tests continue to parse the whole YAML document.
function block(name) {
  const match = source.match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:|(?![\\s\\S]))`, 'mu'));
  assert.ok(match, `Missing workflow job ${name}`);
  return match[1];
}
function condition(name) {
  const match = block(name).match(/^    if: (.*)(?:\n((?:      .*(?:\n|$))*))?/mu);
  assert.ok(match, `Missing job condition ${name}`);
  if (match[1] === '>-') return match[2].trim().replace(/\s+/gu, ' ');
  return match[1].replace(/^"|"$/gu, '');
}
function evaluate(expression, context) {
  return runInNewContext(expression.replaceAll('labels.*.name', 'labelNames'), context);
}
function fixture({ eventName = 'pull_request', draft = true,
  labels = [{ name: 'ci:validate-draft' }], headRepo = 'dunay2/dvt',
  enabled = true, full = true } = {}) {
  const outputs = Object.fromEntries(keys.map((key) => [key, String(full)]));
  const jobs = Object.fromEntries(lanes.map((key) => [key, {
    result: enabled ? 'success' : 'skipped',
  }]));
  jobs.detect_test_matrix.outputs = enabled ? outputs : {};
  const pr = { draft, labels, head: { repo: { full_name: headRepo } } };
  return {
    jobs,
    context: { eventName, payload: { pull_request: pr, repository: { full_name: 'dunay2/dvt' } } },
    expressionContext: {
      github: { event_name: eventName, repository: 'dunay2/dvt', event: {
        pull_request: { ...pr, labelNames: labels.map((label) => label.name) },
      } },
      needs: { detect_test_matrix: { outputs } },
      contains: (values, target) => values.some((value) =>
        typeof value === 'string' && value.toLowerCase() === target.toLowerCase()),
    },
  };
}
function assess({ jobs, context }) {
  const match = block('test-suite-required').match(/          script: \|\n([\s\S]+)/u);
  assert.ok(match);
  const script = match[1].replace(/^            /gmu, '')
    .replace('${{ toJSON(needs) }}', JSON.stringify(jobs));
  const failures = [];
  runInNewContext(script, { context, core: { setFailed: (value) => failures.push(value) } });
  return failures;
}

test('explicit same-repository draft runs every selected producer and accepts success', () => {
  const value = fixture();
  for (const lane of lanes) assert.equal(evaluate(condition(lane), value.expressionContext), true, lane);
  assert.deepEqual(assess(value), []);
});
for (const lane of lanes) {
  for (const result of ['skipped', 'failure', 'cancelled', 'neutral', undefined]) {
    test(`requested draft rejects ${lane}=${result}`, () => {
      const value = fixture();
      value.jobs[lane].result = result;
      assert.ok(assess(value).length > 0);
    });
  }
}
for (const key of keys) {
  for (const invalid of [undefined, '', 'false', 'TRUE']) {
    test(`requested full draft rejects scope ${key}=${invalid}`, () => {
      const value = fixture();
      value.jobs.detect_test_matrix.outputs[key] = invalid;
      assert.ok(assess(value).length > 0);
    });
  }
}
for (const labels of [[], [{ name: 'ci:validate-draft-extra' }], [{ name: ' ci:validate-draft' }]]) {
  test(`draft remains skipped without exact opt-in: ${JSON.stringify(labels)}`, () => {
    const value = fixture({ labels, enabled: false });
    assert.equal(evaluate(condition('detect_test_matrix'), value.expressionContext), false);
    assert.deepEqual(assess(value), []);
  });
}
test('fork draft cannot opt into this internal validation', () => {
  const value = fixture({ headRepo: 'other/fork', enabled: false });
  assert.equal(evaluate(condition('detect_test_matrix'), value.expressionContext), false);
  assert.deepEqual(assess(value), []);
});
test('label casing agrees between GitHub expression and aggregate', () => {
  const value = fixture({ labels: [{ name: 'CI:VALIDATE-DRAFT' }] });
  assert.equal(evaluate(condition('detect_test_matrix'), value.expressionContext), true);
  assert.deepEqual(assess(value), []);
});
for (const eventName of ['push', 'workflow_dispatch']) {
  test(`${eventName} still requires all existing jobs`, () => {
    const value = fixture({ eventName, labels: [], draft: false });
    for (const lane of lanes) assert.equal(evaluate(condition(lane), value.expressionContext), true);
    assert.deepEqual(assess(value), []);
    value.jobs['package-tests'].result = 'skipped';
    assert.ok(assess(value).length > 0);
  });
}
test('ready PR keeps its changed-scope behavior, not full because of a retained label', () => {
  const value = fixture({ draft: false, enabled: false, full: false });
  value.jobs.detect_test_matrix = { result: 'success', outputs: value.expressionContext.needs.detect_test_matrix.outputs };
  assert.equal(evaluate(condition('detect_test_matrix'), value.expressionContext), true);
  assert.deepEqual(assess(value), []);
});
test('missing draft posture and unknown jobs fail closed', () => {
  const value = fixture();
  delete value.context.payload.pull_request.draft;
  assert.ok(assess(value).length > 0);
  const unknown = fixture();
  unknown.jobs.accidental = { result: 'success' };
  assert.ok(assess(unknown).length > 0);
});
test('label add and removal trigger reevaluation while preserving read-only PR execution', () => {
  const events = source.match(/    types:\s*\[([^\]]+)\]/u)?.[1].split(',').map((v) => v.trim());
  for (const name of ['opened', 'synchronize', 'reopened', 'ready_for_review',
    'converted_to_draft', 'labeled', 'unlabeled']) assert.ok(events?.includes(name), name);
  assert.match(source, /permissions:\n  contents: read\n/u);
  assert.doesNotMatch(source, /pull_request_target|continue-on-error: true/u);
});
test('opt-in requests full scope through the existing emitter and never rewrites event identity', () => {
  const command = block('detect_test_matrix').match(/        run: >-\n          node tools\/ci\/emit-scope\.mjs([\s\S]*?)(?=\n        env:)/u);
  assert.ok(command);
  const expression = command[1].match(/\$\{\{([\s\S]*?)\}\}/u)?.[1];
  assert.ok(expression, 'Explicit --full request is missing');
  for (const [options, expected] of [[{}, '--full'], [{ labels: [] }, ''],
    [{ headRepo: 'other/fork' }, ''], [{ draft: false }, ''], [{ eventName: 'push' }, '']]) {
    assert.equal(evaluate(expression, fixture(options).expressionContext), expected);
  }
  assert.doesNotMatch(block('detect_test_matrix'), /GITHUB_EVENT_NAME:/u);
});

const { parseScopeArguments } = await import('./scope-arguments.mjs');
test('scope CLI preserves changed mode by default and accepts an explicit full request', () => {
  assert.deepEqual(parseScopeArguments([]), { full: false });
  assert.deepEqual(parseScopeArguments(['--full']), { full: true });
  const emitter = readFileSync('tools/ci/emit-scope.mjs', 'utf8');
  assert.match(emitter, /parseScopeArguments\(process\.argv\.slice\(2\)\)/u);
  assert.match(emitter, /requestedFull \|\| !isPullRequestEvent\(eventName\)/u);
  assert.match(emitter, /buildCiScopeOutputs\(changedFiles, scopeContext, \{ full \}\)/u);
});
for (const args of [['--full', '--full'], ['--full=true'], ['--full=false'],
  ['--skip'], ['--base', 'main'], ['--FULL'], [' --full'], null, '--full', {}]) {
  test(`scope CLI rejects ${JSON.stringify(args)} without permissive argument fallback`, () => {
    assert.throws(() => parseScopeArguments(args), { name: 'TypeError', message: 'SCOPE_ARGUMENTS_NOT_SUPPORTED' });
  });
}
