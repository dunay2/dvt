import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import yaml from 'js-yaml';

function readText(path) {
  return readFileSync(path, 'utf8');
}

test('GitHub collaboration governance keeps ownership, dependency, and PR policy surfaces wired', () => {
  const codeowners = readText('.github/CODEOWNERS');
  const dependabotSource = readText('.github/dependabot.yml');
  const dependabot = yaml.load(dependabotSource);
  const pullRequestTemplate = readText('.github/pull_request_template.md');
  const prBody = readText('.github/PR_BODY.md').trim();
  const prInstructions = readText('.github/PR_INSTRUCTIONS.md');
  const prQualityGate = readText('.github/workflows/pr-quality-gate.yml');

  for (const requiredPattern of [
    '* @dunay2',
    '/packages/@dvt/engine/src/ @dunay2',
    '/packages/@dvt/adapter-temporal/ @dunay2',
    '/packages/@dvt/adapter-postgres/ @dunay2',
    '/.github/workflows/ @dunay2',
    '/.github/CODEOWNERS @dunay2',
  ]) {
    assert.match(codeowners, new RegExp(escapeRegExp(requiredPattern)));
  }

  assert.match(dependabotSource, /package-ecosystem:\s*'github-actions'/u);
  assert.match(dependabotSource, /directory:\s*'\/'/u);

  const npmUpdates = dependabot.updates.find((update) => update['package-ecosystem'] === 'npm');
  const actionUpdates = dependabot.updates.find(
    (update) => update['package-ecosystem'] === 'github-actions'
  );
  assert.deepEqual(npmUpdates['commit-message'], {
    prefix: 'chore',
    include: 'scope',
  });
  assert.deepEqual(actionUpdates['commit-message'], {
    prefix: 'chore(ci)',
  });
  assert.deepEqual(actionUpdates.groups.codeql.patterns, ['github/codeql-action/*']);

  assert.match(pullRequestTemplate, /Declared ARC Level/u);
  assert.match(pullRequestTemplate, /docs\/evidence\/ED-YYYYMMDD-<slug>\.md/u);

  assert.ok(prBody.length >= 50, 'default PR body must satisfy CI body length policy');
  assert.match(prBody, /\.github\/CODEOWNERS/u);
  assert.match(prInstructions, /pnpm pr:validate-title/u);
  assert.match(prInstructions, /gh pr create/u);
  assert.match(prInstructions, /--body-file \.github\/PR_BODY\.md/u);

  assert.match(prQualityGate, /run: pnpm pr:validate-title "\$PR_TITLE"/u);
  assert.match(prQualityGate, /PR_TITLE: \$\{\{ github\.event\.pull_request\.title \}\}/u);
  assert.doesNotMatch(prQualityGate, /amannn\/action-semantic-pull-request/u);
});

test('trusted PR metadata mutation is isolated from candidate-code validation', () => {
  const prQualitySource = readText('.github/workflows/pr-quality-gate.yml');
  const labelerSource = readText('.github/workflows/pr-labeler.yml');
  const prQuality = yaml.load(prQualitySource);
  const labeler = yaml.load(labelerSource);

  assert.deepEqual(labeler.on.pull_request_target.types, [
    'opened',
    'synchronize',
    'reopened',
    'ready_for_review',
  ]);
  assert.deepEqual(labeler.permissions, {
    contents: 'read',
    'pull-requests': 'write',
  });
  assert.deepEqual(Object.keys(labeler.jobs), ['label_pull_request']);

  const labelerSteps = labeler.jobs.label_pull_request.steps;
  assert.equal(labelerSteps.length, 1);
  assert.equal(labelerSteps[0].uses, 'actions/labeler@b8dd2d9be0f68b860e7dae5dae7d772984eacd6d');
  assert.equal(labelerSteps[0].with['configuration-path'], '.github/labeler.yml');
  assert.equal(
    labelerSteps.some((step) => step.run || step.uses?.startsWith('actions/checkout@')),
    false
  );

  assert.equal(prQuality.permissions['pull-requests'], 'read');
  assert.doesNotMatch(prQualitySource, /actions\/labeler@/u);

  const checkout = prQuality.jobs['pr-checks'].steps.find((step) =>
    String(step.uses ?? '').startsWith('actions/checkout@')
  );
  assert.equal(checkout.with['fetch-depth'], 2);
  assert.equal(checkout.with['persist-credentials'], false);

  const stepNames = prQuality.jobs['pr-checks'].steps.map((step) => step.name);
  assert.equal(stepNames.includes('Checkout reviewed-commit evidence history'), false);
  assert.equal(stepNames.includes('Validate DBT round-trip capability truth'), false);
  assert.equal(stepNames.includes('Remove reviewed-commit evidence checkout'), false);
  assert.doesNotMatch(prQualitySource, /DVT_GIT_EVIDENCE_REPO/u);

  assert.doesNotMatch(prQualitySource, /uses: \.\/\.github\/actions\/fetch-scope-base/u);
  assert.match(prQualitySource, /GIT_BASE:\s*\$\{\{ github\.event\.pull_request\.base\.sha \}\}/u);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
