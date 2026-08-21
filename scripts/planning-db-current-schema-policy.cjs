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
  'docs/adr/ADR-0063-planning-db-current-schema-rebuild.md',
  'docs/planning/proposals/mandatory/governance-and-docs/planning-db-current-schema-hard-cut-plan-20260808.md',
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
    filePath.startsWith('docs/evidence/') ||
    filePath.startsWith('docs/planning/reviews/') ||
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
    filePath.startsWith('docs/')
  );
}

function artifactForContent(filePath, content) {
  if (filePath === 'package.json' && /["']planning:db:migrate["']\s*:/u.test(content)) {
    return 'planning:db:migrate command';
  }
  if (/tools\/planning-db\/migrations(?:\/|\*\*|\b)/u.test(content)) {
    return 'Planning DB migration source reference';
  }
  if (/planning-db-migrate\.cjs|\brunMigrations\b/u.test(content)) {
    return 'Planning DB migration executable semantics';
  }
  if (/\bplanning:db:migrate\b|\btest:planning:db:migrations\b/u.test(content)) {
    return 'Planning DB migration command semantics';
  }
  if (
    /planning[- _]db[^\n]{0,120}(?:migration[_ -](?:checksum|ordinal)|applied[_ -]migrations?(?:[_ -]identity)?|migration[_ -]state)/iu.test(
      content
    )
  ) {
    return 'Planning DB migration-state semantics';
  }
  return null;
}

function assertCurrentStateValue(value, location = 'currentState') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertCurrentStateValue(child, `${location}[${index}]`));
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'migrationState' || key === 'migration_state') {
        throw new Error(`Planning DB ${location} contains forbidden field ${key}.`);
      }
      assertCurrentStateValue(child, `${location}.${key}`);
    }
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  if (
    /tools\/planning-db\/migrations|scripts\/planning-db-migrate|pnpm planning:db:migrate|test:planning:db:migrations|schema_migrations|migration_state|PreserveLocalFeatureMechanizationRails|mergeCanonicalFeatureMechanizationRails|planning[- _]db[- _]migrations?|(?:Apply|Validate)PlanningDbMigrations|PreparePlanningDbForCiGate/iu.test(
      value
    )
  ) {
    throw new Error(`Planning DB ${location} contains forbidden history semantics.`);
  }
  return value;
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
    if (
      filePath.startsWith('tools/planning-db/') &&
      filePath.endsWith('.sql') &&
      filePath !== 'tools/planning-db/schema.sql'
    ) {
      artifacts.push({ path: filePath, reason: 'Parallel Planning DB SQL owner' });
      continue;
    }
    if (!shouldScanContent(filePath)) {
      continue;
    }
    if (!options.readFile && !fs.existsSync(path.join(repoRoot, filePath))) {
      continue;
    }
    const content = String(readFile(filePath) || '');
    const reason = artifactForContent(filePath, content);
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
  assertCurrentStateValue,
  assertNoPlanningDbMigrationArtifacts,
  findPlanningDbMigrationArtifacts,
};
