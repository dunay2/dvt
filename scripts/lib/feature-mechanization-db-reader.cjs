/** Owned concern: read effective feature authority without importing or mutating Planning DB. */
const { defaultPgUrl } = require('../planning-db-run.cjs');

function assertFeatureMechanizationAuthorityFresh(rows, currentSourceHashes) {
  if (rows.length === 0) {
    throw new Error('Feature mechanization authority is empty; explicit bootstrap is required.');
  }

  for (const [sourcePath, contentHash] of currentSourceHashes) {
    const sourceRows = rows.filter((row) => row.source_path.replace(/\\/g, '/') === sourcePath);
    if (
      sourceRows.length === 0 ||
      sourceRows.some((row) => row.source_content_sha256 !== contentHash)
    ) {
      throw new Error(
        `Feature mechanization authority is stale for ${sourcePath}; update its declarations through RecordFeatureMechanizationRail before validation. No import was performed.`
      );
    }
  }
}

async function readFeatureMechanizationManifestRowsFromDb(options = {}) {
  const Client = options.deps?.Client || require('pg').Client;
  const connectionString =
    options.databaseUrl ||
    process.env.DVT_PLANNING_DB_URL ||
    process.env.PLANNING_DATABASE_URL ||
    process.env.DATABASE_URL ||
    defaultPgUrl;
  const client = options.client || new Client({ connectionString });
  const ownsClient = !options.client;

  try {
    if (ownsClient) {
      await client.connect();
    }

    const result = await client.query(`
      with db_feature_manifest_rows as (
        select
          rail_id,
          source_path,
          source_content_sha256,
          raw_manifest,
          rail_source,
          imported_at,
          1 as projection_priority
        from planning_query_store.command_query_rail_manifest_query
        where raw_manifest ? 'featureId'
          and rail_id not like 'current#rail-decision#%'
        union all
        select
          rail_id,
          source_path,
          source_content_sha256,
          raw_manifest,
          'local'::text as rail_source,
          updated_at as imported_at,
          0 as projection_priority
        from planning_query_store.feature_mechanization_local_rails
        where raw_manifest ? 'featureId'
          and rail_id not like 'current#rail-decision#%'
      ),
      ranked_manifest_rows as (
        select
          source_path,
          source_content_sha256,
          raw_manifest,
          rail_source,
          imported_at,
          rail_id,
          row_number() over (
            partition by rail_id
            order by projection_priority, imported_at desc
          ) as projection_rank
        from db_feature_manifest_rows
      )
      select
        source_path,
        source_content_sha256,
        raw_manifest
      from ranked_manifest_rows
      where projection_rank = 1
      order by source_path, raw_manifest->>'featureId', rail_source, imported_at, rail_id
    `);
    assertFeatureMechanizationAuthorityFresh(result.rows, options.currentSourceHashes || new Map());
    return result.rows;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

module.exports = { readFeatureMechanizationManifestRowsFromDb };
