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
    'createDbtProjectRoundtripCapabilityStatusReadModel',
    'defaultOutputPath',
    'governedCapabilityKeys',
    'normalizeDbtRoundtripCapabilityRow',
    'parseArgs',
    'readDbtProjectRoundtripCapabilityStatusRows',
    'renderDbtRoundtripCapabilityStatus',
    'runDbtRoundtripCapabilityStatusGenerator',
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
