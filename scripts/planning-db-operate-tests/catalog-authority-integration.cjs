/** Owned concern: real PostgreSQL authority resolution parity without changing ranked winners. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { assertFeatureMechanizationReferenceAuthority } = require('../planning-db-operate.cjs');
const { applyCatalogReconciliation } = require('../planning-db/catalog-reconciliation-write.cjs');

module.exports = function registerCatalogAuthorityIntegration(dbUrl) {
  test('exact documentary authorities survive competing representatives and reject invalid local overlays', async () => {
    const client = new Client({ connectionString: dbUrl() });
    await client.connect();
    const insert = async (
      origin,
      id,
      feature,
      name,
      source,
      status = 'implemented',
      referenceOnly = false
    ) => {
      const table =
        origin === 'local' ? 'feature_mechanization_local_rails' : 'command_query_rails';
      const rawRail = {
        name,
        type: 'command',
        referenceOnly,
        ...(referenceOnly ? { authorityRef: 'docs/old.md' } : {}),
      };
      await client.query(
        `insert into planning_query_store.${table}
        (rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name, rail_type,
         ddd_owner, rail_status, source_path, source_content_sha256, raw_rail, raw_manifest, implementation_refs
         ${origin === 'local' ? ', created_by' : ''})
        values ($1,$2,'implemented',$3,lower($3),'command','Catalog',$4,$5,repeat('a',64),$6,$7,
          '["scripts/provider.cjs#provider"]' ${origin === 'local' ? ", 'test'" : ''})`,
        [
          id,
          feature,
          name,
          status,
          source,
          rawRail,
          { commandQueryRails: [rawRail], symbols: [{ name: 'keep' }] },
        ]
      );
    };
    const snapshot = async () =>
      (
        await client.query(`select rail_id, to_jsonb(rail)::text as snapshot,
      planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(to_jsonb(rail))) as hash
      from planning_query_store.command_query_rails rail where rail_id like 'authority-consumer-%' order by rail_id`)
      ).rows;
    const auditCount = async () =>
      (
        await client.query(`select count(*)::int as n
      from planning_query_store.feature_mechanization_local_operations where payload->>'designId'='exact-authority'`)
      ).rows[0].n;
    const winners = async () =>
      (
        await client.query(`select rail_id, rail_source from planning_query_store.command_query_rail_query
      where normalized_rail_name in ('previewplan','startrun') order by normalized_rail_name`)
      ).rows;
    try {
      await client.query(`insert into architecture.design (design_id, work_item_id, title, owner, status, rationale, rail_ref)
        values ('exact-authority','GH-3643','Exact authority','Catalog','review','Separate declaration from representative','RecordFeatureMechanizationRail')`);
      await client.query(`insert into architecture.design_scope (design_id, subject_kind, subject_id, scope_kind)
        select 'exact-authority','relation','planning_query_store.' || name,'may_update'
        from unnest(array['command_query_rails','feature_mechanization_local_operations']) name`);
      const names = ['PreviewPlan', 'StartRun'];
      for (const name of names) {
        await insert('imported', `authority-api-${name}`, 'AUTHORITY-DOC', name, 'docs/api.md');
        await insert('imported', `authority-other-${name}`, 'AUTHORITY-DOC', name, 'docs/other.md');
        await insert(
          'local',
          `authority-winner-${name}`,
          'AUTHORITY-WINNER',
          name,
          'docs/local.md'
        );
        await insert(
          'imported',
          `authority-consumer-${name}`,
          'AUTHORITY-CONSUMER',
          name,
          'docs/consumer.md',
          'referenced',
          true
        );
      }
      const before = await snapshot();
      const reference = (name) => ({
        railId: `authority-consumer-${name}`,
        railType: 'command',
        normalizedRailName: name.toLowerCase(),
        rawRail: { referenceOnly: true, authorityRef: 'docs/api.md' },
      });
      const request = {
        designId: 'exact-authority',
        actor: 'test',
        idempotencyKey: 'exact-authority',
        changes: before.map((row) => ({
          origin: 'imported',
          railId: row.rail_id,
          expectedRowSha256: row.hash,
          reference: { authorityRef: 'docs/api.md' },
        })),
      };
      const originalWinners = await winners();
      assert.deepEqual(
        originalWinners.map((row) => row.rail_id),
        names.map((name) => `authority-winner-${name}`)
      );
      for (const variant of [
        { feature: 'AUTHORITY-DOC', path: 'docs/api.md', status: 'retired' },
        { feature: 'AUTHORITY-DOC', path: 'docs/moved.md', status: 'implemented' },
      ]) {
        await insert(
          'local',
          'authority-overlay',
          variant.feature,
          'PreviewPlan',
          variant.path,
          variant.status
        );
        await assert.rejects(
          assertFeatureMechanizationReferenceAuthority(client, reference('PreviewPlan')),
          /AUTHORITY-NOT-FOUND/
        );
        await assert.rejects(applyCatalogReconciliation(request, { client }), /CATALOG-REFERENCE/);
        assert.deepEqual(await snapshot(), before);
        assert.equal(await auditCount(), 0);
        await client.query(
          "delete from planning_query_store.feature_mechanization_local_rails where rail_id='authority-overlay'"
        );
      }
      await insert(
        'imported',
        'authority-additional-evidence',
        'AUTHORITY-ADDITIONAL',
        'PreviewPlan',
        'docs/api.md'
      );
      for (const name of names)
        await assertFeatureMechanizationReferenceAuthority(client, reference(name));
      assert.equal((await applyCatalogReconciliation(request, { client })).changed, 2);
      assert.equal((await applyCatalogReconciliation(request, { client })).idempotent, true);
      assert.equal(await auditCount(), 2);
      assert.deepEqual(await winners(), originalWinners);
      const after = await snapshot();
      for (let index = 0; index < before.length; index += 1) {
        const oldRow = JSON.parse(before[index].snapshot);
        const newRow = JSON.parse(after[index].snapshot);
        assert.equal(newRow.raw_rail.authorityRef, 'docs/api.md');
        assert.deepEqual(newRow.raw_manifest.symbols, oldRow.raw_manifest.symbols);
        assert.deepEqual(newRow.implementation_refs, oldRow.implementation_refs);
      }
    } finally {
      await client.query(
        "delete from planning_query_store.feature_mechanization_local_rails where feature_id like 'AUTHORITY-%'"
      );
      await client.end();
    }
  });
};
