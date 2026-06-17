/** Owned concern: expose DB-first feature-mechanization read models for planning DB queries. */
const { parseLimit } = require('../query-limit.cjs');

function createFeatureMechanizationReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function appendFilter(predicates, params, column, value) {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.push(value);
    predicates.push(`${column} = $${params.length}`);
  }

  function jsonArray(valueExpression) {
    return `case when jsonb_typeof(${valueExpression}) = 'array' then ${valueExpression} else '[]'::jsonb end`;
  }

  function jsonArrayLength(valueExpression) {
    return `jsonb_array_length(${jsonArray(valueExpression)})`;
  }

  function featureMechanizationManifestSelect(activeSchemaName = defaultSchemaName) {
    return `
    select distinct
      rail.feature_id,
      rail.mechanization_status,
      coalesce(rail.raw_manifest->>'implementationPlan', '-') as implementation_plan,
      rail.source_path,
      rail.source_content_sha256,
      rail.raw_manifest
    from ${activeSchemaName}.command_query_rail_manifest_query rail
    where rail.raw_manifest is not null
      and rail.raw_manifest ? 'featureId'`;
  }

  function buildFeatureMechanizationFeatureRows(rows) {
    return rows.map((row) => [
      row.feature_id ?? row.featureId,
      row.mechanization_status ?? row.mechanizationStatus,
      row.implementation_plan ?? row.implementationPlan ?? '-',
      row.component_count ?? row.componentCount ?? 0,
      row.rail_count ?? row.railCount ?? 0,
      row.symbol_count ?? row.symbolCount ?? 0,
      row.validation_count ?? row.validationCount ?? 0,
      row.source_path ?? row.sourcePath,
    ]);
  }

  function buildFeatureMechanizationComponentRows(rows) {
    return rows.map((row) => [
      row.feature_id ?? row.featureId,
      row.mechanization_status ?? row.mechanizationStatus,
      row.component_ref ?? row.componentRef,
      row.source_path ?? row.sourcePath,
    ]);
  }

  function buildFeatureMechanizationSymbolRows(rows) {
    return rows.map((row) => [
      row.feature_id ?? row.featureId,
      row.symbol_name ?? row.symbolName,
      row.symbol_path ?? row.symbolPath,
      row.ddd_owner ?? row.dddOwner ?? '-',
      JSON.stringify(row.cq_rails ?? row.cqRails ?? []),
      row.source_path ?? row.sourcePath,
    ]);
  }

  function buildFeatureMechanizationRailRows(rows) {
    return rows.map((row) => [
      row.feature_id ?? row.featureId,
      row.rail_type ?? row.railType,
      row.rail_name ?? row.railName,
      row.ddd_owner ?? row.dddOwner,
      row.rail_status ?? row.railStatus,
      row.rail_source ?? row.railSource ?? '-',
      row.source_path ?? row.sourcePath,
    ]);
  }

  function buildFeatureMechanizationValidationRows(rows) {
    return rows.map((row) => [
      row.feature_id ?? row.featureId,
      row.validation_kind ?? row.validationKind,
      row.validation_ref ?? row.validationRef,
      row.source_path ?? row.sourcePath,
    ]);
  }

  async function readFeatureMechanizationFeatureRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'manifest.mechanization_status', filters.state);
    appendFilter(predicates, params, 'manifest.source_path', filters.path);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `with manifests as (
       ${featureMechanizationManifestSelect()}
     ),
     manifest_counts as (
       select
         manifest.feature_id,
         manifest.mechanization_status,
         manifest.implementation_plan,
         manifest.source_path,
         sum(${jsonArrayLength("manifest.raw_manifest->'componentGuides'")})::int as component_count,
         sum(${jsonArrayLength("manifest.raw_manifest->'symbols'")})::int as symbol_count,
         sum(
           ${jsonArrayLength("manifest.raw_manifest->'architectureGuards'")}
           + ${jsonArrayLength("manifest.raw_manifest->'cypressFlows'")}
           + ${jsonArrayLength("manifest.raw_manifest->'completionGate'")}
           + ${jsonArrayLength("manifest.raw_manifest->'redGreenCycles'")}
         )::int as validation_count
       from manifests manifest
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       group by
         manifest.feature_id,
         manifest.mechanization_status,
         manifest.implementation_plan,
         manifest.source_path
     ),
     rail_counts as (
       select
         rail.feature_id,
         rail.mechanization_status,
         rail.source_path,
         count(*)::int as rail_count
       from ${defaultSchemaName}.command_query_rail_manifest_query rail
       group by rail.feature_id, rail.mechanization_status, rail.source_path
     )
     select
       manifest_counts.feature_id,
       manifest_counts.mechanization_status,
       manifest_counts.implementation_plan,
       manifest_counts.component_count,
       coalesce(rail_counts.rail_count, 0)::int as rail_count,
       manifest_counts.symbol_count,
       manifest_counts.validation_count,
       manifest_counts.source_path
     from manifest_counts
     left join rail_counts
       on rail_counts.feature_id = manifest_counts.feature_id
      and rail_counts.mechanization_status = manifest_counts.mechanization_status
      and rail_counts.source_path = manifest_counts.source_path
     order by
       manifest_counts.mechanization_status,
       manifest_counts.feature_id,
       manifest_counts.source_path
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFeatureMechanizationComponentRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'manifest.mechanization_status', filters.state);
    appendFilter(predicates, params, 'manifest.source_path', filters.path);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `with manifests as (
       ${featureMechanizationManifestSelect()}
     )
     select
       manifest.feature_id,
       manifest.mechanization_status,
       component_ref.value as component_ref,
       manifest.source_path
     from manifests manifest
     cross join lateral jsonb_array_elements_text(${jsonArray(
       "manifest.raw_manifest->'componentGuides'"
     )}) as component_ref(value)
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by manifest.feature_id, component_ref.value, manifest.source_path
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFeatureMechanizationSymbolRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'manifest.mechanization_status', filters.state);
    appendFilter(predicates, params, "symbol_ref.value->>'path'", filters.path);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `with manifests as (
       ${featureMechanizationManifestSelect()}
     )
     select
       manifest.feature_id,
       symbol_ref.value->>'name' as symbol_name,
       symbol_ref.value->>'path' as symbol_path,
       symbol_ref.value->>'dddOwner' as ddd_owner,
       ${jsonArray("symbol_ref.value->'cqRails'")} as cq_rails,
       manifest.source_path
     from manifests manifest
     cross join lateral jsonb_array_elements(${jsonArray(
       "manifest.raw_manifest->'symbols'"
     )}) as symbol_ref(value)
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by manifest.feature_id, symbol_path, symbol_name, manifest.source_path
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFeatureMechanizationRailRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'rail.mechanization_status', filters.state);
    appendFilter(predicates, params, 'rail.rail_type', filters.type);
    appendFilter(predicates, params, 'rail.rail_name', filters.rail);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `select
       rail.feature_id,
       rail.rail_type,
       rail.rail_name,
       rail.ddd_owner,
       rail.rail_status,
       rail.rail_source,
       rail.source_path
     from ${defaultSchemaName}.command_query_rail_manifest_query rail
     where rail.raw_manifest is not null
       and rail.raw_manifest ? 'featureId'
       ${predicates.length > 0 ? `and ${predicates.join(' and ')}` : ''}
     order by rail.feature_id, rail.rail_type, rail.rail_name, rail.source_path
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFeatureMechanizationValidationRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'validation_rows.mechanization_status', filters.state);
    appendFilter(predicates, params, 'validation_rows.validation_kind', filters.kind);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `with manifests as (
       ${featureMechanizationManifestSelect()}
     ),
     validation_rows as (
       select
         manifest.feature_id,
         manifest.mechanization_status,
         'architecture'::text as validation_kind,
         validation_ref.value as validation_ref,
         manifest.source_path
       from manifests manifest
       cross join lateral jsonb_array_elements_text(${jsonArray(
         "manifest.raw_manifest->'architectureGuards'"
       )}) as validation_ref(value)
       union all
       select
         manifest.feature_id,
         manifest.mechanization_status,
         'cypress'::text as validation_kind,
         validation_ref.value as validation_ref,
         manifest.source_path
       from manifests manifest
       cross join lateral jsonb_array_elements_text(${jsonArray(
         "manifest.raw_manifest->'cypressFlows'"
       )}) as validation_ref(value)
       union all
       select
         manifest.feature_id,
         manifest.mechanization_status,
         'completion'::text as validation_kind,
         validation_ref.value as validation_ref,
         manifest.source_path
       from manifests manifest
       cross join lateral jsonb_array_elements_text(${jsonArray(
         "manifest.raw_manifest->'completionGate'"
       )}) as validation_ref(value)
       union all
       select
         manifest.feature_id,
         manifest.mechanization_status,
         'red'::text as validation_kind,
         validation_ref.value->>'redTest' as validation_ref,
         manifest.source_path
       from manifests manifest
       cross join lateral jsonb_array_elements(${jsonArray(
         "manifest.raw_manifest->'redGreenCycles'"
       )}) as validation_ref(value)
       union all
       select
         manifest.feature_id,
         manifest.mechanization_status,
         'green'::text as validation_kind,
         validation_ref.value->>'greenTest' as validation_ref,
         manifest.source_path
       from manifests manifest
       cross join lateral jsonb_array_elements(${jsonArray(
         "manifest.raw_manifest->'redGreenCycles'"
       )}) as validation_ref(value)
     )
     select
       validation_rows.feature_id,
       validation_rows.validation_kind,
       validation_rows.validation_ref,
       validation_rows.source_path
     from validation_rows
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
       validation_rows.feature_id,
       validation_rows.validation_kind,
       validation_rows.validation_ref,
       validation_rows.source_path
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildFeatureMechanizationComponentRows,
    buildFeatureMechanizationFeatureRows,
    buildFeatureMechanizationRailRows,
    buildFeatureMechanizationSymbolRows,
    buildFeatureMechanizationValidationRows,
    featureMechanizationManifestSelect,
    readFeatureMechanizationComponentRows,
    readFeatureMechanizationFeatureRows,
    readFeatureMechanizationRailRows,
    readFeatureMechanizationSymbolRows,
    readFeatureMechanizationValidationRows,
  };
}

module.exports = createFeatureMechanizationReadModelComponent();
module.exports.createFeatureMechanizationReadModelComponent =
  createFeatureMechanizationReadModelComponent;
