import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { computeWorkflowModeScopeOutputs } from './scope-config.mjs';

const require = createRequire(import.meta.url);
const { collectContracts, run } = require('../../scripts/generate-contract-index.cjs');
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const corpusRoot = path.join(repoRoot, 'docs/architecture/components/engine/contracts');
const startMarker = '<!-- contract-index:start -->';
const endMarker = '<!-- contract-index:end -->';

function createIndexCorpus(t, { copy = true } = {}) {
  const parent = realpathSync(tmpdir());
  const root = mkdtempSync(path.join(parent, 'dvt-contract-index-'));
  t.after(() => {
    assert.equal(path.dirname(realpathSync(root)), parent);
    assert.ok(path.basename(root).startsWith('dvt-contract-index-'));
    rmSync(root, { recursive: true, force: true });
  });
  if (copy) cpSync(corpusRoot, root, { recursive: true });
  return root;
}

function prepareGeneratedRegion(root) {
  const file = path.join(root, 'README.md');
  const source = readFileSync(file, 'utf8');
  if (!source.includes(startMarker)) {
    writeFileSync(
      file,
      source +
        '\n## Generated contract inventory\n\n' +
        startMarker +
        '\n\nstale fixture inventory\n\n' +
        endMarker +
        '\n'
    );
  }
  return file;
}

test('the existing index collector reads the nonempty real current corpus', () => {
  const rows = collectContracts();
  assert.ok(rows.length > 0);
  assert.ok(rows.some((row) => row.relPath === 'engine/RunEvents.v1.md'));
  assert.ok(rows.some((row) => row.relPath === 'engine/IWorkflowEngine.v1.md'));
  assert.ok(rows.some((row) => row.relPath === 'state-store/IRunStateStore.v1.md'));
  assert.ok(rows.every((row) => !path.isAbsolute(row.relPath) && !row.relPath.startsWith('../')));
});

test('the existing index writer preserves the curated registry and is idempotent', async (t) => {
  const corpus = createIndexCorpus(t);
  const readme = prepareGeneratedRegion(corpus);
  const original = readFileSync(readme, 'utf8');
  const prefix = original.slice(0, original.indexOf(startMarker)).replaceAll('\r\n', '\n').trim();
  const suffix = original.slice(original.indexOf(endMarker)).replaceAll('\r\n', '\n').trim();
  await run({ contractsRoot: corpus });
  const generated = readFileSync(readme, 'utf8');
  assert.ok(generated.replaceAll('\r\n', '\n').startsWith(prefix));
  assert.ok(generated.replaceAll('\r\n', '\n').trimEnd().endsWith(suffix));
  assert.ok(generated.includes('./engine/RunEvents.v1.md'));
  assert.ok(generated.includes('./engine/IWorkflowEngine.v1.md'));
  assert.ok(generated.includes('one live `v1` line only'));
  assert.ok(!generated.includes('stale fixture inventory'));
  await run({ contractsRoot: corpus });
  assert.equal(readFileSync(readme, 'utf8'), generated);
});

test('the index collector rejects missing and empty source evidence', (t) => {
  const corpus = createIndexCorpus(t, { copy: false });
  assert.throws(() => collectContracts(path.join(corpus, 'absent')), /ENOENT|missing.*corpus/iu);
  writeFileSync(path.join(corpus, 'README.md'), '# Registry\n');
  assert.throws(() => collectContracts(corpus), /empty|no contract/iu);
});

test('the index writer rejects a missing target README', async (t) => {
  const corpus = createIndexCorpus(t);
  rmSync(path.join(corpus, 'README.md'));
  await assert.rejects(run({ contractsRoot: corpus }), /ENOENT|README/iu);
});

test('the index writer rejects absent and reversed region markers', async (t) => {
  const corpus = createIndexCorpus(t);
  const readme = path.join(corpus, 'README.md');
  writeFileSync(readme, '# Registry without generated region\n');
  await assert.rejects(run({ contractsRoot: corpus }), /markers/iu);
  writeFileSync(readme, '# Registry\n' + endMarker + '\n' + startMarker + '\n');
  await assert.rejects(run({ contractsRoot: corpus }), /markers/iu);
});

test('current contract sources select the existing contract workflow obligations', () => {
  const inputs = [
    'docs/architecture/components/engine/contracts/engine/RunEvents.v1.md',
    'docs/architecture/components/engine/contracts/engine/RunEvents.v1.idempotency_vectors.json',
    'scripts/policy-validation-files.cjs',
    'scripts/policy-validation-text.cjs',
    'scripts/validate-glossary-usage.cjs',
    'packages/@dvt/cli/validate-contracts.cjs',
  ];
  for (const input of inputs) {
    const scope = computeWorkflowModeScopeOutputs('contracts', [input]);
    assert.equal(scope.contracts_relevant, true, input);
  }
});
