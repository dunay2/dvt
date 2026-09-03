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
  const planningComponent = classifyScriptFilePath(
    'scripts/planning-db/command-query-rail-catalog.cjs'
  );
  const planningQueryComponent = classifyScriptFilePath(
    'scripts/planning-db/queries/documentation-lifecycle-query.cjs'
  );
  const knowledgeIntakeLiteratureScript = classifyScriptFilePath(
    'scripts/generate-knowledge-intake-literature.cjs'
  );
  const dbtRoundtripCapabilityStatusScript = classifyScriptFilePath(
    'scripts/generate-dbt-project-roundtrip-capability-status.cjs'
  );
  const governanceImportScript = classifyScriptFilePath('scripts/governance-db-import.cjs');
  const governanceExportScript = classifyScriptFilePath('scripts/governance-db-export.cjs');

  assert.equal(planningQuery.domain, 'planning-db');
  assert.equal(governanceQuery.domain, 'planning-db');
  assert.equal(planningScript.domain, 'planning-db');
  assert.equal(planningComponent.domain, 'planning-db');
  assert.equal(planningQueryComponent.domain, 'planning-db');
  assert.equal(knowledgeIntakeLiteratureScript.domain, 'planning-db');
  assert.equal(dbtRoundtripCapabilityStatusScript.domain, 'planning-db');
  assert.equal(governanceImportScript.domain, 'planning-db');
  assert.equal(governanceExportScript.domain, 'planning-db');
  assert.equal(planningQuery.runtimeFanout, false);
  assert.equal(governanceQuery.runtimeFanout, false);
  assert.equal(planningScript.runtimeFanout, false);
  assert.equal(planningComponent.runtimeFanout, false);
  assert.equal(planningQueryComponent.runtimeFanout, false);
  assert.equal(knowledgeIntakeLiteratureScript.runtimeFanout, false);
  assert.equal(dbtRoundtripCapabilityStatusScript.runtimeFanout, false);
  assert.equal(governanceImportScript.runtimeFanout, false);
  assert.equal(governanceExportScript.runtimeFanout, false);
});

test('classifies runtime, capability, contract, docs, workflow, and ops commands', () => {
  assert.equal(
    classifyPackageScriptCommand('build', packageJson.scripts.build).domain,
    'runtime-root'
  );
  assert.equal(
    classifyPackageScriptCommand('postgres:local:up', packageJson.scripts['postgres:local:up'])
      .domain,
    'dev-local'
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
    classifyPackageScriptCommand('pr:closeout', packageJson.scripts['pr:closeout']).domain,
    'developer-workflow'
  );
  assert.equal(
    classifyPackageScriptCommand('pr:checks', packageJson.scripts['pr:checks']).domain,
    'developer-workflow'
  );
  assert.equal(
    classifyPackageScriptCommand('pr:checks:json', packageJson.scripts['pr:checks:json']).domain,
    'developer-workflow'
  );
  assert.equal(
    classifyPackageScriptCommand(
      'pr:checks:first-failure',
      packageJson.scripts['pr:checks:first-failure']
    ).domain,
    'developer-workflow'
  );
  assert.equal(
    classifyPackageScriptCommand('ai:preflight', packageJson.scripts['ai:preflight']).domain,
    'developer-workflow'
  );
  assert.equal(
    classifyPackageScriptCommand('test:pr-closeout', packageJson.scripts['test:pr-closeout'])
      .domain,
    'test-tooling'
  );
  assert.equal(
    classifyPackageScriptCommand('test:ci-tools', packageJson.scripts['test:ci-tools']).domain,
    'ci-tooling'
  );
  assert.equal(
    classifyPackageScriptCommand(
      'test:ci-tools:static',
      packageJson.scripts['test:ci-tools:static']
    ).domain,
    'ci-tooling'
  );
  assert.equal(
    classifyPackageScriptCommand(
      'test:ci-tools:executable',
      packageJson.scripts['test:ci-tools:executable']
    ).domain,
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
  assert.equal(classifyScriptFilePath('scripts/run-local-postgres.cjs').domain, 'dev-local');
  assert.equal(classifyScriptFilePath('scripts/generate-contract-index.cjs').domain, 'contracts');
  assert.equal(classifyScriptFilePath('scripts/policy-validation-files.cjs').domain, 'contracts');
  assert.equal(classifyScriptFilePath('scripts/policy-validation-text.cjs').domain, 'contracts');
  assert.equal(
    classifyScriptFilePath('scripts/generate-governance-document-unit-map.cjs').domain,
    'docs-governance'
  );
  assert.equal(
    classifyScriptFilePath('scripts/check-ai-efficiency-adoption.cjs').domain,
    'docs-governance'
  );
  assert.equal(
    classifyScriptFilePath('scripts/documentation-publication.cjs').domain,
    'docs-governance'
  );
  assert.equal(
    classifyScriptFilePath('scripts/lib/feature-mechanization-manifest.cjs').domain,
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
  assert.equal(
    classifyScriptFilePath('scripts/local-validation-plan.cjs').domain,
    'developer-workflow'
  );
  assert.equal(classifyScriptFilePath('scripts/ai-preflight.cjs').domain, 'developer-workflow');
  assert.equal(classifyScriptFilePath('scripts/pr-closeout.cjs').domain, 'developer-workflow');
  assert.equal(classifyScriptFilePath('scripts/pr-closeout.test.cjs').domain, 'test-tooling');
  assert.equal(
    classifyScriptFilePath('scripts/planning-db-query-tests/helpers.cjs').domain,
    'planning-db'
  );
  assert.equal(
    classifyScriptFilePath('scripts/run-canvas-source-import-live-proof.cjs').domain,
    'dev-local'
  );
  assert.equal(
    classifyScriptFilePath('scripts/run-het1-public-vertical-live-proof.cjs').domain,
    'dev-local'
  );
  assert.equal(
    classifyScriptFilePath('scripts/run-het2-public-vertical-live-proof.cjs').domain,
    'dev-local'
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
