import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));

function runPnpm(args) {
  const result =
    process.platform === 'win32'
      ? spawnSync(
          process.env.ComSpec || 'cmd.exe',
          ['/d', '/s', '/c', ['pnpm', ...args].join(' ')],
          {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        )
      : spawnSync('pnpm', args, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `pnpm ${args.join(' ')} failed with status ${result.status}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return result.stdout;
}

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

test('docs manifest generation is deterministic, compact, and excludes timestamp noise', () => {
  const first = runPnpm(['exec', 'tsx', 'tools/docs/generate-docs-manifest.ts', '--stdout']);
  const second = runPnpm(['exec', 'tsx', 'tools/docs/generate-docs-manifest.ts', '--stdout']);

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
  const first = runPnpm([
    'exec',
    'tsx',
    'tools/docs/generate-docs-manifest.ts',
    '--stdout',
    '--full',
  ]);
  const second = runPnpm([
    'exec',
    'tsx',
    'tools/docs/generate-docs-manifest.ts',
    '--stdout',
    '--full',
  ]);

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
  for (const entry of manifest.adrs.filter((adr) => adr.path.includes('docs/archive/'))) {
    assert.equal(entry.archived, true);
  }

  const adrOrder = manifest.adrs.map((entry) => [entry.num ?? Number.MAX_SAFE_INTEGER, entry.path]);
  const sortedAdrOrder = [...adrOrder].sort((left, right) => {
    if (left[0] !== right[0]) return left[0] - right[0];
    return left[1].localeCompare(right[1]);
  });
  assert.deepEqual(adrOrder, sortedAdrOrder);
});

test('docs manifest excludes generated planning landing pages', () => {
  const manifest = JSON.parse(
    runPnpm(['exec', 'tsx', 'tools/docs/generate-docs-manifest.ts', '--stdout', '--full'])
  );
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
