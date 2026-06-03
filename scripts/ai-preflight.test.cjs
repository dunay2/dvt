/** Owned concern: prove AI-local preflight automation and editor save-format policy. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildAgentPreflightPlan,
  commandLabel,
  executeAgentPreflightPlan,
  parseArgs,
} = require('./ai-preflight.cjs');

const repoRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function commandLabels(plan) {
  return plan.map(commandLabel);
}

test('workspace settings make Prettier on save a tracked repository contract', () => {
  const settings = readJson('.vscode/settings.json');
  const extensions = readJson('.vscode/extensions.json');

  assert.equal(settings['editor.formatOnSave'], true);
  assert.equal(settings['editor.defaultFormatter'], 'esbenp.prettier-vscode');
  assert.equal(settings['prettier.requireConfig'], true);
  assert.equal(settings['[markdown]']['editor.formatOnSave'], true);
  assert.equal(settings['[yaml]']['editor.formatOnSave'], true);
  assert.ok(extensions.recommendations.includes('esbenp.prettier-vscode'));
  assert.ok(extensions.recommendations.includes('dbaeumer.vscode-eslint'));
});

test('agent preflight fixes changed files before running the governed prepush gate', () => {
  assert.deepEqual(commandLabels(buildAgentPreflightPlan()), [
    'pnpm fix:changed',
    'pnpm verify:prepush',
  ]);
  assert.deepEqual(commandLabels(buildAgentPreflightPlan({ full: true })), [
    'pnpm fix:changed',
    'pnpm verify:prepush -- --full',
  ]);
});

test('agent preflight executes the autofix and validation plan in order', () => {
  const calls = [];

  executeAgentPreflightPlan(buildAgentPreflightPlan(), {
    spawn: (command, args) => {
      calls.push(commandLabel({ command, args }));
      return { status: 0 };
    },
  });

  assert.deepEqual(calls, ['pnpm fix:changed', 'pnpm verify:prepush']);
});

test('agent preflight CLI parses dry-run and full validation flags', () => {
  assert.deepEqual(parseArgs(['--dry-run']), { dryRun: true, full: false });
  assert.deepEqual(parseArgs(['--plan', '--full']), { dryRun: true, full: true });
  assert.throws(() => parseArgs(['--unknown']), /Unknown argument: --unknown/);
});

test('package scripts expose agent preflight as the AI-facing local command', () => {
  const packageJson = readJson('package.json');

  assert.equal(packageJson.scripts['ai:preflight'], 'node scripts/ai-preflight.cjs');
  assert.equal(
    packageJson.scripts['test:ai-preflight'],
    'node --test scripts/ai-preflight.test.cjs'
  );
});
