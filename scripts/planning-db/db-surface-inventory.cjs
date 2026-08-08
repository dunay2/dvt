/** Owned concern: expose DB-governed surface inventory rows through Planning DB queries. */
const { schemaName } = require('../planning-db-schema.cjs');
const { appendFilter } = require('./query-filter.cjs');
const { textValue } = require('./query-format.cjs');

const sourceView = `${schemaName}.db_governance_surface_query`;
const allowedDbSurfaceAuthorityModes = new Set([
  'repository-export',
  'database',
  'generated',
  'git-indexed',
  'hybrid-indexed',
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

function buildDbSurfaceRows(rows) {
  return rows.map((row) => [
    textValue(row.surface_name ?? row.surfaceName),
    textValue(row.authority_mode ?? row.authorityMode),
    textValue(row.write_rail_kind ?? row.writeRailKind),
    String(Boolean(row.database_write_eligible ?? row.databaseWriteEligible)),
    String(row.revision ?? 0),
    textValue(row.updated_by ?? row.updatedBy),
    textValue(row.source_ref ?? row.sourceRef),
  ]);
}

async function readDbSurfaceRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'surface_name', filters.surface);
  appendFilter(predicates, params, 'authority_mode', filters.state);
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
       authority_mode,
       source_ref,
       source_content_sha256,
       revision,
       updated_by,
       updated_at,
       database_write_eligible,
       database_write_blocker
     from ${sourceView}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
       case authority_mode
         when 'database' then 1
         when 'hybrid-indexed' then 2
         when 'repository-export' then 3
         when 'generated' then 4
         when 'git-indexed' then 5
         else 6
       end,
       surface_name
     limit $${params.length}`,
    params
  );

  return result.rows;
}

module.exports = {
  allowedDbSurfaceAuthorityModes,
  allowedDbSurfaceWriteRailKinds,
  buildDbSurfaceRows,
  readDbSurfaceRows,
  sourceView,
};
