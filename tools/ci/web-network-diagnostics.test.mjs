/** Owned concern: sanitized network artifact admission, independent of screenshot proof. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import yaml from 'js-yaml';

const workflow = yaml.load(
  readFileSync(new URL('../../.github/workflows/test.yml', import.meta.url), 'utf8')
);
const web = workflow.jobs['web-frontend-tests'];
const reportPath = '.dvt/evidence/chromium-network/*.json';

test('each available browser group enables its own network diagnostics', () => {
  const expression = web.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS.replace(/^\$\{\{|\}\}$/gu, '');
  for (const [phase, capability, shard, expected] of [
    ['browser', 'available', 1, '1'],
    ['browser', 'available', 2, '1'],
    ['browser', 'available', 3, '1'],
    ['browser', 'controlled', undefined, ''],
    ['browser', 'unavailable', undefined, ''],
    ['browser', undefined, undefined, ''],
    ['vitest', 'available', 1, ''],
    ['vitest', undefined, undefined, ''],
  ]) {
    assert.equal(runInNewContext(expression, { matrix: { phase, capability, shard } }), expected);
  }
});

test('network evidence publishes only an existing sanitized report, including failed journeys', () => {
  const artifact = web.steps.find(
    (step) => step.name === 'Upload sanitized Chromium network diagnostics'
  );
  assert.ok(artifact);
  assert.equal(artifact.with.path, reportPath);
  assert.equal(artifact.with['include-hidden-files'], true);
  assert.equal(artifact.with['if-no-files-found'], 'error');
  for (const [capability, shard, enabled, present, expected] of [
    ['available', 1, '1', true, true],
    ['available', 2, '1', true, true],
    ['available', 3, '1', true, true],
    ['available', 1, '1', false, false],
    ['available', 2, '1', false, false],
    ['available', 1, '', true, false],
    ['controlled', undefined, '', true, false],
    ['unavailable', 1, '', true, false],
    [undefined, undefined, '', true, false],
  ]) {
    assert.equal(
      runInNewContext(artifact.if, {
        matrix: { capability, shard },
        env: { DVT_CYPRESS_NETWORK_DIAGNOSTICS: enabled },
        always: () => true,
        hashFiles: (pattern) => {
          assert.equal(pattern, reportPath);
          return present ? 'digest' : '';
        },
      }),
      expected
    );
  }
  const paths = web.steps
    .filter((step) => step.uses?.startsWith('actions/upload-artifact@'))
    .map((step) => step.with.path)
    .sort();
  assert.deepEqual(paths, [reportPath, '.dvt/evidence/selected-closure/screenshots'].sort());
});
