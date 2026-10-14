/** Owned concern: imported references respect retained local authorities atomically. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { insertCommandQueryRailSnapshot } = require('../planning-db-import.cjs');

module.exports = function registerCatalogAuthorityImportIntegration(dbUrl) {
  test('catalog import validates retained authority overlays before commit', async () => {
    const client = new Client({ connectionString: dbUrl() });
    await client.connect();
    const authority = {
      railId: 'import-authority',
      featureId: 'IMPORT-AUTHORITY',
      mechanizationStatus: 'implemented',
      railName: 'ImportAuthorityProof',
      normalizedRailName: 'importauthorityproof',
      railType: 'command',
      dddOwner: 'Catalog',
      railStatus: 'implemented',
      symbolRefs: [],
      implementationRefs: ['scripts/provider.cjs#provider'],
      documentationRefs: [],
      governingSources: [],
      allowedImplementationSurfaces: [],
      architectureGuards: [],
      completionGate: [],
      sourcePath: 'docs/import-authority.md',
      sourceContentSha256: 'a'.repeat(64),
      rawRail: {},
      rawManifest: {},
    };
    const reference = {
      ...authority,
      railId: 'import-reference',
      featureId: 'IMPORT-REFERENCE',
      sourcePath: 'docs/import-consumer.md',
      implementationRefs: [],
      rawRail: { referenceOnly: true, authorityRef: authority.sourcePath },
    };
    const rows = async () =>
      (
        await client.query(
          'select to_jsonb(rail) as row from planning_query_store.command_query_rails rail order by rail_id'
        )
      ).rows;
    try {
      for (const variant of ['fresh', 'active', 'retired', 'moved']) {
        await client.query('begin');
        await insertCommandQueryRailSnapshot(client, { rails: [authority] });
        if (variant !== 'fresh') {
          await client.query(
            `insert into planning_query_store.feature_mechanization_local_rails
            (rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name,
             rail_type, ddd_owner, rail_status, source_path, source_content_sha256,
             raw_rail, raw_manifest, implementation_refs, created_by)
            select 'import-local', feature_id, mechanization_status, rail_name, normalized_rail_name,
              rail_type, ddd_owner, $1, $2, source_content_sha256,
              raw_rail, raw_manifest, implementation_refs, 'test'
            from planning_query_store.command_query_rails where rail_id = $3`,
            [
              variant === 'retired' ? 'retired' : 'implemented',
              variant === 'moved' ? 'docs/moved.md' : authority.sourcePath,
              authority.railId,
            ]
          );
        }
        const before = await rows();
        await client.query('savepoint import_catalog');
        const write = () =>
          insertCommandQueryRailSnapshot(client, { rails: [authority, reference] });
        if (variant === 'retired' || variant === 'moved') {
          await assert.rejects(write, /AUTHORITY-NOT-FOUND/, variant);
          await client.query('rollback to savepoint import_catalog');
          assert.deepEqual(await rows(), before, `${variant} restores previous catalog`);
        } else {
          await write();
          assert.equal((await rows()).length, 2, variant);
        }
        await client.query('rollback');
      }
    } finally {
      await client.query('rollback');
      await client.end();
    }
  });
};
