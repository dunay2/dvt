const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  extractFeatureMechanizationManifests,
} = require('./lib/feature-mechanization-manifest.cjs');

const featureId = 'E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC';
const proposalRelativePath =
  'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md';
const proposalPath = path.join(__dirname, '..', ...proposalRelativePath.split('/'));
const authorityCorrectionPath = path.join(
  __dirname,
  '..',
  'tools',
  'planning-db',
  'migrations',
  '729_dbt_roundtrip_manifest_authority_correction.sql'
);

test('DBT round-trip capability mechanization is proposal-owned and symbol-complete', () => {
  const manifests = extractFeatureMechanizationManifests(
    fs.readFileSync(proposalPath, 'utf8'),
    proposalRelativePath
  );
  const entry = manifests.find((candidate) => candidate.manifest?.featureId === featureId);

  assert.ok(entry, 'the mandatory proposal must declare the Phase 4 feature');
  assert.equal(entry.sourcePath, proposalRelativePath);
  assert.equal(entry.manifest.mechanizationStatus, 'implemented');
  assert.equal(entry.manifest.noHumanDecisionsRemaining, true);
  assert.deepEqual(entry.manifest.symbols.map((symbol) => symbol.name).sort(), [
    'childProcess',
    'createDbtProjectRoundtripCapabilityStatusReadModel',
    'databaseUrl',
    'defaultOutputPath',
    'fs',
    'governedCapabilityKeys',
    'main',
    'markdownCell',
    'markdownTable',
    'normalizeDbtRoundtripCapabilityRow',
    'parseArgs',
    'path',
    'railCommonFilterQueryNames',
    'readDbtProjectRoundtripCapabilityStatusRows',
    'relativeOutputPath',
    'renderDbtRoundtripCapabilityStatus',
    'repoRoot',
    'reviewedPrLabel',
    'runDbtRoundtripCapabilityStatusGenerator',
    'runGit',
    'sortRows',
    'sourceView',
    'toBoolean',
    'toNumber',
    'validateDbtRoundtripCapabilityRows',
    'verifyGitCommitAncestry',
  ]);
  assert.deepEqual(entry.manifest.commandQueryRails, [
    {
      name: 'ProjectDbtRoundtripCapabilityStatus',
      type: 'query',
      dddOwner: 'DbtProjectRoundtripCapabilityStatus',
    },
  ]);
  assert.ok(
    entry.manifest.governingSources.includes(
      'docs/architecture/fowler-opportunity-planning-governance.md'
    )
  );
});

test('append-only correction retires the migration-owned feature manifest copy', () => {
  const sql = fs.readFileSync(authorityCorrectionPath, 'utf8');

  assert.match(sql, /delete from planning_query_store\.feature_mechanization_local_rails/i);
  assert.match(sql, new RegExp(featureId));
  assert.match(sql, /must be proposal-owned/);
  assert.doesNotMatch(sql, /insert into planning_query_store\.feature_mechanization_local_rails/i);
});
