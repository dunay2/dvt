/** Owned concern: security action pins.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertWorkflowContains } from './assertions.mjs';
import { pinnedActionReferences, listYamlFiles } from './action-pins.mjs';

test('security and nightly workflows stay wired to pinned actions and failure notification', () => {
  const dependencyReview = readFileSync('.github/workflows/dependency-review.yml', 'utf8');
  const codeql = readFileSync('.github/workflows/codeql.yml', 'utf8');
  const contracts = readFileSync('.github/workflows/contracts.yml', 'utf8');
  const createLabels = readFileSync('.github/workflows/create-labels.yml', 'utf8');
  const docsDeploy = readFileSync('.github/workflows/docs-deploy.yml', 'utf8');
  const nightly = readFileSync(
    '.github/workflows/adapter-postgres-integration-nightly.yml',
    'utf8'
  );
  const setupNodePnpm = readFileSync('.github/actions/setup-node-pnpm/action.yml', 'utf8');

  assert.equal(
    pinnedActionReferences(dependencyReview, 'actions/dependency-review-action').length,
    1
  );
  assertWorkflowContains(dependencyReview, 'fail-on-severity: high');
  assertWorkflowContains(dependencyReview, "vars.GH_ADVANCED_SECURITY_ENABLED == 'true'");
  assertWorkflowContains(dependencyReview, "github.event.repository.visibility == 'public'");

  const codeqlActionPins = [
    ...codeql.matchAll(/github\/codeql-action\/(init|analyze)@([0-9a-f]{40}) # (v\d+\.\d+\.\d+)/gu),
  ].map((match) => ({ action: match[1], sha: match[2], version: match[3] }));
  assert.deepEqual(codeqlActionPins.map(({ action }) => action).sort(), ['analyze', 'init']);
  assert.equal(new Set(codeqlActionPins.map(({ sha }) => sha)).size, 1);
  assert.equal(new Set(codeqlActionPins.map(({ version }) => version)).size, 1);
  assertWorkflowContains(codeql, 'security-events: write');
  assertWorkflowContains(codeql, 'javascript-typescript');
  assertWorkflowContains(codeql, "vars.GH_ADVANCED_SECURITY_ENABLED == 'true'");
  assertWorkflowContains(codeql, "github.event.repository.visibility == 'public'");
  assertWorkflowContains(codeql, 'name: Detect security analysis scope');
  assertWorkflowContains(codeql, 'node tools/ci/emit-scope.mjs');
  assertWorkflowContains(codeql, 'security_analysis_relevant:');
  assertWorkflowContains(
    codeql,
    "needs.detect-security-scope.outputs.security_analysis_relevant == 'true'"
  );
  assert.doesNotMatch(codeql, /paths-ignore/u);

  assertWorkflowContains(nightly, 'issues: write');
  assertWorkflowContains(nightly, 'name: Notify nightly failure');
  assertWorkflowContains(nightly, 'if: failure()');
  assertWorkflowContains(nightly, 'gh issue create --title "${NIGHTLY_ISSUE_TITLE}"');
  assertWorkflowContains(
    nightly,
    'node scripts/run-turbo-workspace-task.cjs build --filter=@dvt/adapter-postgres...'
  );
  assert.doesNotMatch(
    nightly,
    /pnpm --workspace-concurrency=4 --filter @dvt\/adapter-postgres\.\.\. --if-present run build/u
  );

  assert.equal(pinnedActionReferences(createLabels, 'actions/github-script').length, 1);

  assertWorkflowContains(docsDeploy, 'timeout-minutes: 20');
  assertWorkflowContains(docsDeploy, 'contents: write');
  assert.match(
    docsDeploy,
    /python -m pip install --disable-pip-version-check --require-hashes -r\s+\.github\/requirements\/zensical\.lock/u
  );
  assertWorkflowContains(docsDeploy, "if: ${{ github.event.inputs.run_pages_deploy == 'true' }}");

  assert.doesNotMatch(contracts, /POSTGRES_PASSWORD:\s+dvt_test/);
  assert.doesNotMatch(contracts, /postgresql:\/\/dvt_test:dvt_test@/);
  assert.match(contracts, /POSTGRES_PASSWORD:\s+\$\{\{\s*github\.run_id\s*\}\}/);
  assert.match(
    contracts,
    /DATABASE_URL:\s+postgresql:\/\/dvt_test:\$\{\{\s*github\.run_id\s*\}\}@localhost:5432\/dvt_test/
  );

  assert.doesNotMatch(setupNodePnpm, /Cache node_modules/u);
  assert.doesNotMatch(setupNodePnpm, /nm-cache/u);
  assert.doesNotMatch(setupNodePnpm, /(?:^|\s)tools\/\*\/node_modules(?:\s|$)/u);
  assertWorkflowContains(setupNodePnpm, "default: '--frozen-lockfile --prefer-offline'");
  assertWorkflowContains(setupNodePnpm, 'run: pnpm install ${{ inputs.install-args }}');
});

for (const action of ['setup-node', 'upload-artifact', 'setup-python']) {
  test(`${action} consumers stay on one pinned action version`, () => {
    const githubYamlSources = listYamlFiles('.github')
      .map((filePath) => readFileSync(filePath, 'utf8'))
      .join('\n');
    const pins = pinnedActionReferences(githubYamlSources, `actions/${action}`);

    assert.equal(new Set(pins.map(({ sha }) => sha)).size, 1);
    assert.equal(new Set(pins.map(({ version }) => version)).size, 1);
  });
}
