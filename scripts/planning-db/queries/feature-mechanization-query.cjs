/** Owned concern: expose DB-first feature-mechanization read models for planning DB queries. */
const { appendFilter } = require('../query-filter.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createFeatureMechanizationReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function jsonArray(valueExpression) {
    return `case when jsonb_typeof(${valueExpression}) = 'array' then ${valueExpression} else '[]'::jsonb end`;
  }

  function featureMechanizationRailSourceSelect(activeSchemaName = defaultSchemaName) {
    return `
    select distinct on (rail.rail_id)
      rail.rail_id,
      rail.feature_id,
      rail.mechanization_status,
      rail.rail_name,
      rail.normalized_rail_name,
      rail.rail_type,
      rail.ddd_owner,
      rail.rail_status,
      rail.symbol_refs,
      rail.implementation_refs,
      rail.documentation_refs,
      jsonb_array_length(rail.implementation_refs) as implementation_ref_count,
      jsonb_array_length(rail.documentation_refs) as documentation_ref_count,
      rail.governing_sources,
      rail.allowed_implementation_surfaces,
      rail.architecture_guards,
      rail.completion_gate,
      rail.source_path,
      rail.source_content_sha256,
      rail.raw_rail,
      rail.raw_manifest,
      rail.rail_source,
      rail.imported_at
    from ${activeSchemaName}.command_query_rail_manifest_query rail
    where rail.raw_manifest is not null
      and rail.raw_manifest ? 'featureId'
    order by rail.rail_id, rail.imported_at desc`;
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
    from (
      ${featureMechanizationRailSourceSelect(activeSchemaName)}
    ) rail`;
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
      JSON.stringify(row.source_paths ?? row.sourcePaths ?? []),
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
    appendFilter(predicates, params, 'manifest.feature_id', filters.featureId);
    appendFilter(predicates, params, 'manifest.mechanization_status', filters.state);
    appendFilter(predicates, params, 'manifest.source_path', filters.path);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `with manifests as (
       ${featureMechanizationRailSourceSelect()}
     ),
     filtered_rails as (
       select manifest.*
       from manifests manifest
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     ),
     feature_summary as (
       select
         filtered_rails.feature_id,
         case
           when count(distinct filtered_rails.mechanization_status) = 1
             then min(filtered_rails.mechanization_status)
           else 'mixed:' || string_agg(
             distinct filtered_rails.mechanization_status,
             ',' order by filtered_rails.mechanization_status
           )
         end as mechanization_status,
         coalesce(
           string_agg(
             distinct nullif(filtered_rails.raw_manifest->>'implementationPlan', ''),
             ' | ' order by nullif(filtered_rails.raw_manifest->>'implementationPlan', '')
           ),
           '-'
         ) as implementation_plan,
         count(distinct filtered_rails.rail_id)::int as rail_count,
         jsonb_agg(
           distinct filtered_rails.source_path order by filtered_rails.source_path
         ) as source_paths
       from filtered_rails
       group by filtered_rails.feature_id
     ),
     component_counts as (
       select
         filtered_rails.feature_id,
         count(distinct component_ref.value)::int as component_count
       from filtered_rails
       cross join lateral jsonb_array_elements_text(${jsonArray(
         "filtered_rails.raw_manifest->'componentGuides'"
       )}) as component_ref(value)
       group by filtered_rails.feature_id
     ),
     symbol_rows as (
       select
         filtered_rails.feature_id,
         concat_ws(
           '#',
           symbol_ref.value->>'path',
           symbol_ref.value->>'name'
         ) as symbol_key
       from filtered_rails
       cross join lateral jsonb_array_elements(${jsonArray(
         "filtered_rails.raw_manifest->'symbols'"
       )}) as symbol_ref(value)
     ),
     symbol_counts as (
       select
         symbol_rows.feature_id,
         count(distinct symbol_key)::int as symbol_count
       from symbol_rows
       group by symbol_rows.feature_id
     ),
     validation_rows as (
       select
         filtered_rails.feature_id,
         validation_ref.value as validation_ref
       from filtered_rails
       cross join lateral jsonb_array_elements_text(${jsonArray(
         "filtered_rails.raw_manifest->'architectureGuards'"
       )}) as validation_ref(value)
       union all
       select
         filtered_rails.feature_id,
         validation_ref.value as validation_ref
       from filtered_rails
       cross join lateral jsonb_array_elements_text(${jsonArray(
         "filtered_rails.raw_manifest->'cypressFlows'"
       )}) as validation_ref(value)
       union all
       select
         filtered_rails.feature_id,
         validation_ref.value as validation_ref
       from filtered_rails
       cross join lateral jsonb_array_elements_text(${jsonArray(
         "filtered_rails.raw_manifest->'completionGate'"
       )}) as validation_ref(value)
       union all
       select
         filtered_rails.feature_id,
         validation_ref.value->>'redTest' as validation_ref
       from filtered_rails
       cross join lateral jsonb_array_elements(${jsonArray(
         "filtered_rails.raw_manifest->'redGreenCycles'"
       )}) as validation_ref(value)
       union all
       select
         filtered_rails.feature_id,
         validation_ref.value->>'greenTest' as validation_ref
       from filtered_rails
       cross join lateral jsonb_array_elements(${jsonArray(
         "filtered_rails.raw_manifest->'redGreenCycles'"
       )}) as validation_ref(value)
     ),
     validation_counts as (
       select
         validation_rows.feature_id,
         count(distinct validation_ref)::int as validation_count
       from validation_rows
       where validation_ref is not null and validation_ref <> ''
       group by validation_rows.feature_id
     )
     select
       feature_summary.feature_id,
       feature_summary.mechanization_status,
       feature_summary.implementation_plan,
       coalesce(component_counts.component_count, 0)::int as component_count,
       feature_summary.rail_count,
       coalesce(symbol_counts.symbol_count, 0)::int as symbol_count,
       coalesce(validation_counts.validation_count, 0)::int as validation_count,
       feature_summary.source_paths
     from feature_summary
     left join component_counts using (feature_id)
     left join symbol_counts using (feature_id)
     left join validation_counts using (feature_id)
     order by feature_summary.mechanization_status, feature_summary.feature_id
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFeatureMechanizationComponentRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'manifest.feature_id', filters.featureId);
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
    const manifestPredicates = [];
    const symbolPredicates = [];
    appendFilter(manifestPredicates, params, 'manifest.feature_id', filters.featureId);
    appendFilter(manifestPredicates, params, 'manifest.mechanization_status', filters.state);
    if (filters.path) {
      params.push(filters.path);
      const symbolPathParam = `$${params.length}`;
      manifestPredicates.push(
        `manifest.raw_manifest @> jsonb_build_object('symbols', jsonb_build_array(jsonb_build_object('path', ${symbolPathParam}::text)))`
      );
      symbolPredicates.push(`symbol_ref.value->>'path' = ${symbolPathParam}`);
    }

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `with manifests as (
       ${featureMechanizationManifestSelect()}
     ),
     filtered_manifests as (
       select *
       from manifests manifest
       ${manifestPredicates.length > 0 ? `where ${manifestPredicates.join(' and ')}` : ''}
     ),
     symbol_rows as (
       select
         manifest.feature_id,
         symbol_ref.value->>'name' as symbol_name,
         symbol_ref.value->>'path' as symbol_path,
         symbol_ref.value->>'dddOwner' as ddd_owner,
         ${jsonArray("symbol_ref.value->'cqRails'")} as cq_rails,
         manifest.source_path
       from filtered_manifests manifest
       cross join lateral jsonb_array_elements(${jsonArray(
         "manifest.raw_manifest->'symbols'"
       )}) as symbol_ref(value)
       ${symbolPredicates.length > 0 ? `where ${symbolPredicates.join(' and ')}` : ''}
     ),
     deduplicated_symbol_rows as (
       select distinct on (symbol_rows.feature_id, symbol_path, symbol_name)
         symbol_rows.feature_id,
         symbol_rows.symbol_name,
         symbol_rows.symbol_path,
         symbol_rows.ddd_owner,
         symbol_rows.cq_rails,
         symbol_rows.source_path
       from symbol_rows
       order by symbol_rows.feature_id, symbol_path, symbol_name, source_path
     )
     select
       symbol_rows.feature_id,
       symbol_rows.symbol_name,
       symbol_rows.symbol_path,
       symbol_rows.ddd_owner,
       symbol_rows.cq_rails,
       symbol_rows.source_path
     from deduplicated_symbol_rows symbol_rows
     order by symbol_rows.feature_id, symbol_path, symbol_name, source_path
     limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFeatureMechanizationRailRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'rail.feature_id', filters.featureId);
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
     from (
       ${featureMechanizationRailSourceSelect()}
     ) rail
     where true
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
    appendFilter(predicates, params, 'validation_rows.feature_id', filters.featureId);
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
