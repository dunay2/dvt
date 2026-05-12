const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const generatorPath = path.join(repoRoot, 'scripts', 'generate-code-status.cjs');
const policyPath = path.join(repoRoot, 'docs', 'generated-docs-policy.json');

test('code status generator renders the generated inventory outside tracked docs', () => {
  const source = fs.readFileSync(generatorPath, 'utf8');

  assert.match(source, /'\.generated-docs'/);
  assert.match(source, /'planning'[\s\S]*'status'[\s\S]*'generated-code-state\.md'/);
  assert.doesNotMatch(
    source,
    /const outputPath = path\.join\(repoRoot, 'docs', 'planning', 'status', 'generated-code-state\.md'\)/
  );
});

test('generated docs policy treats generated code state as an untracked local artifact', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const codeStatePolicy = policy.artifactClasses.find((entry) =>
    entry.sourcePaths.includes('scripts/generate-code-status.cjs')
  );

  assert.ok(codeStatePolicy);
  assert.deepEqual(codeStatePolicy.artifacts, [
    '.generated-docs/planning/status/generated-code-state.md',
  ]);
  assert.equal(codeStatePolicy.tracking, 'untracked');
});
