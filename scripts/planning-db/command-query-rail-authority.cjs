/** Owned concern: resolve explicit documentary authorities, not ranked implementation representatives. */
const { isCommandQueryRailGap, normalizeRailName } = require('./command-query-rail-shared.cjs');
const { schemaName } = require('../planning-db-schema.cjs');

function isRailReferenceAuthority(reference, candidate) {
  return (
    candidate.sourcePath === reference.rawRail.authorityRef &&
    candidate.railType === reference.railType &&
    candidate.normalizedRailName === reference.normalizedRailName &&
    candidate.railId !== reference.railId &&
    candidate.rawRail?.referenceOnly !== true &&
    !['retired', 'deprecated'].includes(normalizeRailName(candidate.railStatus)) &&
    candidate.isGap !== true &&
    Number.isInteger(candidate.implementationRefCount) &&
    candidate.implementationRefCount > 0 &&
    !isCommandQueryRailGap(candidate.railStatus, candidate.implementationRefCount)
  );
}

function resolveRailReferenceAuthority(reference, candidates) {
  if (!candidates.some((candidate) => isRailReferenceAuthority(reference, candidate))) return null;
  return {
    sourcePath: reference.rawRail.authorityRef,
    railType: reference.railType,
    normalizedRailName: reference.normalizedRailName,
  };
}

async function readRailReferenceAuthority(client, reference) {
  const result = await client.query(
    `with declarations as (
      select imported.rail_id, imported.rail_type, imported.normalized_rail_name,
        imported.source_path, imported.rail_status, imported.raw_rail, imported.implementation_refs
      from ${schemaName}.command_query_rails imported
      where not exists (
        select 1 from ${schemaName}.feature_mechanization_local_rails local
        where local.feature_id = imported.feature_id and local.rail_type = imported.rail_type
          and local.normalized_rail_name = imported.normalized_rail_name
      )
      union all
      select rail_id, rail_type, normalized_rail_name, source_path, rail_status, raw_rail, implementation_refs
      from ${schemaName}.feature_mechanization_local_rails
    ) select rail_id as "railId", rail_type as "railType", normalized_rail_name as "normalizedRailName",
      source_path as "sourcePath", rail_status as "railStatus", raw_rail as "rawRail",
      jsonb_array_length(implementation_refs) as "implementationRefCount"
    from declarations where source_path = $1 and rail_type = $2 and normalized_rail_name = $3`,
    [reference.rawRail.authorityRef, reference.railType, reference.normalizedRailName]
  );
  return resolveRailReferenceAuthority(reference, result.rows);
}

module.exports = {
  isRailReferenceAuthority,
  resolveRailReferenceAuthority,
  readRailReferenceAuthority,
};
