/** Owned concern: expose DB-governed surface inventory rows through Planning DB queries. */
const { schemaName } = require('../planning-db-migrate.cjs');

const sourceView = `${schemaName}.db_governance_surface_query`;
const allowedDbSurfaceMigrationStates = new Set([
  'Bootstrap/export',
  'DB-first',
  'Generated-only',
  'Git-first indexed',
  'Hybrid indexed',
]);
const allowedDbSurfaceWriteRailKinds = new Set([
  'db_command',
  'import',
  'git_edit',
  'generated',
  'none',
  'bootstrap_export',
]);

function parseLimit(value, fallback = 20) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --limit "${value}". Expected a positive integer.`);
  }
  return parsed;
}

function appendFilter(predicates, params, column, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  params.push(value);
  predicates.push(`${column} = $${params.length}`);
}

function textValue(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

function buildDbSurfaceRows(rows) {
  return rows.map((row) => [
    textValue(row.surface_name ?? row.surfaceName),
    textValue(row.migration_state ?? row.migrationState),
    textValue(row.write_rail_kind ?? row.writeRailKind),
    String(Boolean(row.db_first_eligible ?? row.dbFirstEligible)),
    String(row.revision ?? 0),
    textValue(row.updated_by ?? row.updatedBy),
    textValue(row.source_ref ?? row.sourceRef),
  ]);
}

async function readDbSurfaceRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'surface_name', filters.surface);
  appendFilter(predicates, params, 'migration_state', filters.state);
  appendFilter(predicates, params, 'write_rail_kind', filters.kind);
  appendFilter(predicates, params, 'source_ref', filters.path);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `select
       surface_name,
       canonical_source,
       write_rail,
       write_rail_kind,
       read_query_rail,
       projection,
       validation,
       migration_state,
       source_ref,
       source_content_sha256,
       revision,
       updated_by,
       updated_at,
       db_first_eligible,
       db_first_blocker
     from ${sourceView}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
       case migration_state
         when 'DB-first' then 1
         when 'Hybrid indexed' then 2
         when 'Bootstrap/export' then 3
         when 'Generated-only' then 4
         when 'Git-first indexed' then 5
         else 6
       end,
       surface_name
     limit $${params.length}`,
    params
  );

  return result.rows;
}

module.exports = {
  allowedDbSurfaceMigrationStates,
  allowedDbSurfaceWriteRailKinds,
  buildDbSurfaceRows,
  readDbSurfaceRows,
  sourceView,
};
