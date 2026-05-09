import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertRepositoryCommandCatalogCoverage,
  buildRepositoryCommandCatalog,
  classifyPackageScriptCommand,
  classifyScriptFilePath,
  discoverRepositoryCommandFiles,
  extractReferencedCommandFiles,
  isRepositoryCommandFile,
} from './repository-command-catalog.mjs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

test('classifies planning and governance database aliases as planning-db commands', () => {
  const planningQuery = classifyPackageScriptCommand(
    'planning:db:query',
    packageJson.scripts['planning:db:query']
  );
  const governanceQuery = classifyPackageScriptCommand(
    'governance:db:query',
    packageJson.scripts['governance:db:query']
  );
  const planningScript = classifyScriptFilePath('scripts/planning-db-query.cjs');

  assert.equal(planningQuery.domain, 'planning-db');
  assert.equal(governanceQuery.domain, 'planning-db');
  assert.equal(planningScript.domain, 'planning-db');
  assert.equal(planningQuery.runtimeFanout, false);
  assert.equal(governanceQuery.runtimeFanout, false);
  assert.equal(planningScript.runtimeFanout, false);
});

test('classifies runtime, capability, contract, docs, workflow, and ops commands', () => {
  assert.equal(
    classifyPackageScriptCommand('build', packageJson.scripts.build).domain,
    'runtime-root'
  );
  assert.equal(
    classifyPackageScriptCommand(
      'test:adapter-temporal:integration:postgres:docker',
      packageJson.scripts['test:adapter-temporal:integration:postgres:docker']
    ).domain,
    'runtime-capability'
  );
  assert.equal(
    classifyPackageScriptCommand(
      'contracts:index:generate',
      packageJson.scripts['contracts:index:generate']
    ).domain,
    'contracts'
  );
  assert.equal(
    classifyPackageScriptCommand('docs:gov:filenames', packageJson.scripts['docs:gov:filenames'])
      .domain,
    'docs-governance'
  );
  assert.equal(
    classifyPackageScriptCommand('format', packageJson.scripts.format).domain,
    'developer-workflow'
  );
  assert.equal(
    classifyPackageScriptCommand('test:ci-tools', packageJson.scripts['test:ci-tools']).domain,
    'ci-tooling'
  );
  assert.equal(
    classifyPackageScriptCommand('ops:ar-c2:evidence', packageJson.scripts['ops:ar-c2:evidence'])
      .domain,
    'release-ops'
  );
});

test('classifies current command file paths without broad script-directory assumptions', () => {
  assert.equal(
    classifyScriptFilePath('scripts/build-workspace-runtime-deps.cjs').domain,
    'runtime-root'
  );
  assert.equal(
    classifyScriptFilePath('scripts/run-temporal-postgres-proof.cjs').domain,
    'runtime-capability'
  );
  assert.equal(classifyScriptFilePath('scripts/generate-contract-index.cjs').domain, 'contracts');
  assert.equal(
    classifyScriptFilePath('scripts/generate-governance-document-unit-map.cjs').domain,
    'docs-governance'
  );
  assert.equal(classifyScriptFilePath('tools/ci/emit-scope.mjs').domain, 'ci-tooling');
  assert.equal(classifyScriptFilePath('tools/docs/check-filenames.ts').domain, 'docs-governance');
  assert.equal(
    classifyScriptFilePath('tools/ops/ar-c2-evidence-collector.mjs').domain,
    'release-ops'
  );
  assert.equal(
    classifyScriptFilePath('.github/scripts/generate_pr_manifest.sh').domain,
    'ci-tooling'
  );
});

test('detects repository command files and excludes non-command metadata', () => {
  assert.equal(isRepositoryCommandFile('scripts/planning-db-query.cjs'), true);
  assert.equal(isRepositoryCommandFile('tools/ci/emit-scope.mjs'), true);
  assert.equal(isRepositoryCommandFile('tools/docs/check-filenames.ts'), true);
  assert.equal(isRepositoryCommandFile('tools/ops/ar-c2-evidence-collector.mjs'), true);
  assert.equal(isRepositoryCommandFile('scripts/README.md'), false);
  assert.equal(isRepositoryCommandFile('tools/ci/jsconfig.json'), false);
});

test('discovers repository command files deterministically', () => {
  const files = discoverRepositoryCommandFiles();

  assert.ok(files.includes('scripts/planning-db-query.cjs'));
  assert.ok(files.includes('tools/ci/emit-scope.mjs'));
  assert.ok(files.includes('tools/docs/check-filenames.ts'));
  assert.ok(files.includes('tools/docs/lib/markdown.ts'));
  assert.ok(files.includes('tools/ops/ar-c2-evidence-collector.mjs'));
  assert.ok(!files.includes('scripts/README.md'));
  assert.deepEqual(
    files,
    [...files].sort((left, right) => left.localeCompare(right))
  );
});

test('extracts script and tool file references from package commands', () => {
  assert.deepEqual(extractReferencedCommandFiles('node scripts/planning-db-query.cjs'), [
    'scripts/planning-db-query.cjs',
  ]);
  assert.deepEqual(
    extractReferencedCommandFiles(
      'node --test scripts/planning-db-query.test.cjs scripts/governance-db-check.test.cjs'
    ),
    ['scripts/planning-db-query.test.cjs', 'scripts/governance-db-check.test.cjs']
  );
  assert.deepEqual(extractReferencedCommandFiles('tsx tools/docs/check-filenames.ts --strict'), [
    'tools/docs/check-filenames.ts',
  ]);
  assert.deepEqual(extractReferencedCommandFiles('node tools/ops/ar-c2-evidence-collector.mjs'), [
    'tools/ops/ar-c2-evidence-collector.mjs',
  ]);
});

test('all package scripts and discovered command files have a non-unknown class', () => {
  const catalog = buildRepositoryCommandCatalog(packageJson, discoverRepositoryCommandFiles());

  assert.doesNotThrow(() => assertRepositoryCommandCatalogCoverage(catalog));
});
