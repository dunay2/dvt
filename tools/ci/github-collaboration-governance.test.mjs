import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readText(path) {
  return readFileSync(path, 'utf8');
}

test('GitHub collaboration governance keeps ownership, dependency, and PR policy surfaces wired', () => {
  const codeowners = readText('.github/CODEOWNERS');
  const dependabot = readText('.github/dependabot.yml');
  const pullRequestTemplate = readText('.github/pull_request_template.md');
  const prBody = readText('.github/PR_BODY.md').trim();
  const prInstructions = readText('.github/PR_INSTRUCTIONS.md');

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

  assert.match(dependabot, /package-ecosystem:\s*'github-actions'/u);
  assert.match(dependabot, /directory:\s*'\/'/u);

  assert.match(pullRequestTemplate, /Declared ARC Level/u);
  assert.match(pullRequestTemplate, /docs\/evidence\/ED-YYYYMMDD-<slug>\.md/u);

  assert.ok(prBody.length >= 50, 'default PR body must satisfy CI body length policy');
  assert.match(prBody, /\.github\/CODEOWNERS/u);
  assert.match(prInstructions, /pnpm pr:validate-title/u);
  assert.match(prInstructions, /gh pr create/u);
  assert.match(prInstructions, /--body-file \.github\/PR_BODY\.md/u);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
