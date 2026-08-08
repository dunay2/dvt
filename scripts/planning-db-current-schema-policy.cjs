#!/usr/bin/env node
/**
 * @file scripts/planning-db-current-schema-policy.cjs
 * @ownedConcern Prevent Planning DB migration compatibility from returning.
 * @baseline ADR-0063: Planning DB current-schema rebuild
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const exactForbiddenPaths = new Map([
  ['scripts/planning-db-migrate.cjs', 'Planning DB migration runner'],
  ['scripts/planning-db-migrate.test.cjs', 'Planning DB migration runner test'],
]);
const exemptPaths = new Set([
  'scripts/planning-db-current-schema-policy.cjs',
  'scripts/planning-db-current-schema-policy.test.cjs',
  'scripts/planning-db-schema.cjs',
  'scripts/planning-db-schema.test.cjs',
]);

function toPosix(filePath) {
  return String(filePath || '')
    .replaceAll('\\', '/')
    .replace(/^\.\//u, '');
}

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return output.split('\0').map(toPosix).filter(Boolean);
}

function isHistoricalDocumentation(filePath) {
  return (
    filePath.startsWith('docs/archive/') ||
    filePath.startsWith('docs/planning/archive/') ||
    filePath.startsWith('docs/planning/closeouts/') ||
    filePath.startsWith('docs/superpowers/plans/')
  );
}

function isUnrelatedRuntimeMigration(filePath) {
  return (
    filePath.startsWith('infra/db/migrations/') ||
    filePath.startsWith('packages/@dvt/adapter-postgres/') ||
    filePath === 'scripts/db-migrate.cjs'
  );
}

function shouldScanContent(filePath) {
  if (
    exemptPaths.has(filePath) ||
    isHistoricalDocumentation(filePath) ||
    isUnrelatedRuntimeMigration(filePath)
  ) {
    return false;
  }
  return (
    filePath === 'package.json' ||
    filePath.startsWith('.github/') ||
    filePath.startsWith('scripts/') ||
    filePath.startsWith('tools/planning-db/state/') ||
    filePath === 'docs/generated-docs-policy.json' ||
    filePath.startsWith('docs/guides/') ||
    filePath.startsWith('docs/planning/status/') ||
    filePath.startsWith('docs/planning/state/') ||
    filePath.startsWith('docs/architecture/components/ci-governance/')
  );
}

function artifactForContent(filePath, content) {
  if (filePath === 'package.json' && /["']planning:db:migrate["']\s*:/u.test(content)) {
    return 'planning:db:migrate command';
  }
  if (/tools\/planning-db\/migrations(?:\/|\*\*)/u.test(content)) {
    return 'Planning DB migration source reference';
  }
  if (/planning-db-migrate\.cjs|\brunMigrations\b/u.test(content)) {
    return 'Planning DB migration executable semantics';
  }
  return null;
}

function findPlanningDbMigrationArtifacts(options = {}) {
  const filePaths = (options.filePaths || trackedFiles()).map(toPosix);
  const readFile =
    options.readFile || ((filePath) => fs.readFileSync(path.join(repoRoot, filePath), 'utf8'));
  const artifacts = [];

  for (const filePath of filePaths) {
    if (exactForbiddenPaths.has(filePath)) {
      artifacts.push({ path: filePath, reason: exactForbiddenPaths.get(filePath) });
      continue;
    }
    if (filePath.startsWith('tools/planning-db/migrations/')) {
      artifacts.push({ path: filePath, reason: 'Planning DB migration directory' });
      continue;
    }
    if (!shouldScanContent(filePath)) {
      continue;
    }
    const reason = artifactForContent(filePath, String(readFile(filePath) || ''));
    if (reason) {
      artifacts.push({ path: filePath, reason });
    }
  }

  return artifacts.sort((left, right) =>
    `${left.path}\0${left.reason}`.localeCompare(`${right.path}\0${right.reason}`)
  );
}

function assertNoPlanningDbMigrationArtifacts(options = {}) {
  const artifacts = findPlanningDbMigrationArtifacts(options);
  if (artifacts.length > 0) {
    throw new Error(
      `Planning DB current-schema policy failed:\n${artifacts
        .map(({ path: filePath, reason }) => `- ${filePath}: ${reason}`)
        .join('\n')}`
    );
  }
  return artifacts;
}

if (require.main === module) {
  try {
    assertNoPlanningDbMigrationArtifacts();
    console.log('[planning:db:current-schema-policy] OK');
  } catch (error) {
    console.error(`[planning:db:current-schema-policy] ${error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  assertNoPlanningDbMigrationArtifacts,
  findPlanningDbMigrationArtifacts,
};
