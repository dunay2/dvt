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

test('only the first available group enables native network diagnostics', () => {
  const expression = web.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS.replace(/^\$\{\{|\}\}$/gu, '');
  for (const [capability, shard, expected] of [
    ['available', 1, '1'],
    ['available', 2, ''],
    ['unavailable', undefined, ''],
    [undefined, undefined, ''],
  ]) {
    assert.equal(runInNewContext(expression, { matrix: { capability, shard } }), expected);
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
  for (const [capability, shard, present, expected] of [
    ['available', 1, true, true],
    ['available', 1, false, false],
    ['available', 2, true, false],
    ['unavailable', 1, true, false],
    [undefined, undefined, true, false],
  ]) {
    assert.equal(
      runInNewContext(artifact.if, {
        matrix: { capability, shard },
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
