import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import verifyPrepush from '../../scripts/verify-prepush.cjs';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));

function runNode(args, env = {}) {
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

test('generated-doc policy command is wired into docs governance gates', () => {
  assert.equal(
    rootPackage.scripts['docs:gov:generated-policy'],
    'node scripts/check-generated-docs-policy.cjs'
  );
  assert.match(rootPackage.scripts['docs:gov'], /\bpnpm docs:gov:generated-policy\b/);
  assert.match(rootPackage.scripts['ci:docs'], /\bpnpm docs:gov:generated-policy\b/);
  assert.equal(rootPackage.scripts['verify:prepush'], 'node scripts/verify-prepush.cjs');
  assert.ok(
    verifyPrepush
      .buildPrepushPlan(['docs/generated-docs-policy.json'], { full: true })
      .some((step) => step.id === 'docs-gov-generated-policy')
  );
});

test('generated-doc policy declares single-writer ownership for required artifact classes', () => {
  const policy = JSON.parse(readFileSync('docs/generated-docs-policy.json', 'utf8'));
  const requiredIds = [
    'tracked-docs-sync-indexes',
    'planning-local-indexes',
    'local-docs-status-code-state',
    'local-docs-status-knowledge-intake-literature',
    'local-docs-status-db-surface-inventory',
    'tracked-docs-status-capability-coverage',
    'local-docs-feature-traceability',
    'tracked-docs-manifest',
    'tracked-ar-c2-operational-evidence',
  ];
  const ids = new Set(policy.artifactClasses.map((entry) => entry.id));

  for (const id of requiredIds) {
    assert.ok(ids.has(id), `Missing generated-doc policy class: ${id}`);
  }

  for (const entry of policy.artifactClasses) {
    assert.ok(entry.id, 'policy entry must have id');
    assert.ok(Array.isArray(entry.artifacts) && entry.artifacts.length > 0, entry.id);
    assert.ok(Array.isArray(entry.sourcePaths) && entry.sourcePaths.length > 0, entry.id);
    assert.ok(entry.generatorCommand, entry.id);
    assert.match(entry.tracking, /^(tracked|untracked)$/);
    assert.match(entry.manualEditPolicy, /^(generator-owned|source-owned)$/);
  }

  const featureTraceability = policy.artifactClasses.find(
    (entry) => entry.id === 'local-docs-feature-traceability'
  );
  assert.deepEqual(featureTraceability.artifacts, [
    '.generated-docs/planning/status/canonical-doc-code-matrix.md',
    '.generated-docs/planning/status/generated-spec-traceability.md',
  ]);
  assert.equal(featureTraceability.tracking, 'untracked');
  assert.equal(featureTraceability.manualEditPolicy, 'generator-owned');
  assert.equal(featureTraceability.publication?.enabled, true);
});

test('generated-doc policy checker accepts the repository policy', () => {
  const result = runNode(['scripts/check-generated-docs-policy.cjs']);
  const output = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /\[generated-docs-policy\] OK/);
});

test('generated-doc policy checker fails closed on missing source ownership', () => {
  const policyPath = '.tmp/generated-docs-policy.invalid.json';

  try {
    mkdirSync(dirname(policyPath), { recursive: true });
    writeFileSync(
      policyPath,
      JSON.stringify(
        {
          version: 1,
          artifactClasses: [
            {
              id: 'invalid-generated-doc-class',
              artifacts: ['docs/.manifest.json'],
              sourcePaths: ['docs/missing-generated-source.md'],
              generatorCommand: 'pnpm missing:generated-docs',
              tracking: 'tracked',
              manualEditPolicy: 'generator-owned',
            },
          ],
        },
        null,
        2
      ),
      'utf8'
    );

    const result = runNode(['scripts/check-generated-docs-policy.cjs'], {
      GENERATED_DOCS_POLICY_PATH: policyPath,
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0, output);
    assert.match(output, /source path does not exist/);
    assert.match(output, /generator command is not available/);
  } finally {
    rmSync(policyPath, { force: true });
    rmSync('.tmp', { recursive: true, force: true });
  }
});
