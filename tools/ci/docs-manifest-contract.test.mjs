import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, test } from 'node:test';
import { createDocsRepository, runDocsCommand } from './test/docsCliFixture.mjs';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));

function generateManifest(full) {
  const args = full ? ['--stdout', '--full'] : ['--stdout'];
  const result = runDocsCommand('tools/docs/generate-docs-manifest.ts', args);
  assert.equal(result.status, 0, result.output);
  return result.stdout;
}

let compactOutputs;
let fullOutputs;
before(() => {
  compactOutputs = [generateManifest(false), generateManifest(false)];
  fullOutputs = [generateManifest(true), generateManifest(true)];
});

function isSortedByPath(entries) {
  const paths = entries.map((entry) => entry.path);
  return (
    JSON.stringify(paths) ===
    JSON.stringify([...paths].sort((left, right) => left.localeCompare(right)))
  );
}

function isSha256Hex(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

test('manifest audit preserves false and zero evidence metadata as text', (t) => {
  const fixture = createDocsRepository(t);
  fixture.write(
    'docs/evidence/ED-20991231-types.md',
    [
      '---',
      'title: 0',
      'status: [Accepted, Reviewed]',
      'breaking: false',
      '---',
      '# Typed evidence',
      '',
    ].join('\n')
  );
  const result = fixture.run('tools/docs/generate-docs-manifest.ts', ['--stdout', '--full'], []);
  assert.equal(result.status, 0, result.output);
  const [evidence] = JSON.parse(result.stdout).evidenceDocs;
  assert.equal(evidence.title, '0');
  assert.equal(evidence.status, 'Accepted, Reviewed');
  assert.equal(evidence.breaking, 'false');
  assert.equal(evidence.date, null);
});

test('docs manifest generation is deterministic, compact, and excludes timestamp noise', () => {
  const [first, second] = compactOutputs;

  assert.equal(first, second);

  const manifest = JSON.parse(first);

  assert.equal('generatedAt' in manifest, false);
  assert.equal('adrs' in manifest, false);
  assert.equal('evidenceDocs' in manifest, false);
  assert.equal('normativeDocs' in manifest, false);
  assert.equal('statusDocs' in manifest, false);
  assert.equal(
    manifest.summary.total,
    manifest.catalogs.reduce((sum, entry) => sum + entry.count, 0)
  );
  assert.deepEqual(
    manifest.catalogs.map((entry) => entry.name),
    ['adrs', 'evidenceDocs', 'normativeDocs', 'statusDocs']
  );
  for (const entry of manifest.catalogs) {
    assert.equal(isSha256Hex(entry.contentSha256), true);
  }
});

test('docs manifest full audit output stays deterministic and sorted', () => {
  const [first, second] = fullOutputs;

  assert.equal(first, second);

  const manifest = JSON.parse(first);

  assert.equal('generatedAt' in manifest, false);
  assert.equal(manifest.summary.adrs, manifest.adrs.length);
  assert.equal(manifest.summary.evidenceDocs, manifest.evidenceDocs.length);
  assert.equal(manifest.summary.normativeDocs, manifest.normativeDocs.length);
  assert.equal(manifest.summary.statusDocs, manifest.statusDocs.length);
  assert.equal(
    manifest.summary.total,
    manifest.adrs.length +
      manifest.evidenceDocs.length +
      manifest.normativeDocs.length +
      manifest.statusDocs.length
  );
  assert.equal(isSortedByPath(manifest.evidenceDocs), true);
  assert.equal(isSortedByPath(manifest.normativeDocs), true);
  assert.equal(isSortedByPath(manifest.statusDocs), true);

  const adrOrder = manifest.adrs.map((entry) => [entry.num ?? Number.MAX_SAFE_INTEGER, entry.path]);
  const sortedAdrOrder = [...adrOrder].sort((left, right) => {
    if (left[0] !== right[0]) return left[0] - right[0];
    return left[1].localeCompare(right[1]);
  });
  assert.deepEqual(adrOrder, sortedAdrOrder);
});

test('docs manifest excludes generated planning landing pages', () => {
  const manifest = JSON.parse(fullOutputs[0]);
  const manifestPaths = new Set(
    [
      ...manifest.adrs,
      ...manifest.evidenceDocs,
      ...manifest.normativeDocs,
      ...manifest.statusDocs,
    ].map((entry) => entry.path)
  );

  for (const generatedLandingPage of [
    'docs/planning/index.md',
    'docs/planning/proposals/index.md',
    'docs/planning/reviews/index.md',
    'docs/planning/status/index.md',
  ]) {
    assert.equal(manifestPaths.has(generatedLandingPage), false);
  }
});

test('docs manifest command wiring keeps local and strict docs paths explicit', () => {
  assert.equal(
    rootPackage.scripts['docs:gov:manifest'],
    'tsx tools/docs/generate-docs-manifest.ts'
  );
  assert.equal(
    rootPackage.scripts['docs:gov:manifest:check'],
    'pnpm docs:gov:manifest && git diff --exit-code -- docs/.manifest.json'
  );
  assert.match(rootPackage.scripts['docs:gov'], /\bpnpm docs:gov:manifest\b/);
  assert.match(rootPackage.scripts['ci:docs'], /\bpnpm docs:gov:manifest:check\b/);
});
