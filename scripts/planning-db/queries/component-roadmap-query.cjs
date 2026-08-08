/** Owned concern: expose DB-owned component roadmap facts for planning DB queries. */
const { appendBooleanFilter, appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createComponentRoadmapReadModelComponent(deps = {}) {
  const { schemaName } = deps.schema || require('../../planning-db-schema.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function buildComponentRoadmapRows(rows) {
    return rows.map((row) => [
      textValue(row.component_id ?? row.componentId),
      textValue(row.component_name ?? row.componentName),
      textValue(row.implementation_state ?? row.implementationState),
      textValue(row.planning_state ?? row.planningState),
      textValue(row.gap_kind ?? row.gapKind),
      textValue(row.architecture_status ?? row.architectureStatus),
      textValue(row.engineering_quality_state ?? row.engineeringQualityState),
      row.planned_feature_count ?? row.plannedFeatureCount ?? 0,
      row.implemented_feature_count ?? row.implementedFeatureCount ?? 0,
      textValue(row.source_path ?? row.sourcePath),
    ]);
  }

  function componentRoadmapSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        component_key,
        component_id,
        component_ref,
        component_name,
        implementation_state,
        planning_state,
        gap_kind,
        is_gap,
        architecture_status,
        engineering_quality_state,
        planned_feature_count,
        implemented_feature_count,
        source_path,
        source_content_sha256
      from ${activeSchemaName}.component_roadmap_query`;
  }

  async function readComponentRoadmapRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    if (filters.component !== undefined && filters.component !== null && filters.component !== '') {
      params.push(filters.component);
      predicates.push(`(component_id = $${params.length} or component_ref = $${params.length})`);
    }
    appendFilter(predicates, params, 'implementation_state', filters.state);
    appendFilter(predicates, params, 'gap_kind', filters.kind);
    appendFilter(predicates, params, 'source_path', filters.path);
    appendBooleanFilter(predicates, 'is_gap', filters.gaps);
    if (filters.gaps === true) {
      predicates.push("gap_kind <> 'none'");
    } else if (filters.gaps === false) {
      predicates.push("gap_kind = 'none'");
    }

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${componentRoadmapSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case gap_kind
           when 'planned_component_missing_db_component' then 1
           when 'architecture_component_missing_engineering_component' then 2
           when 'component_missing_architecture_authority' then 3
           when 'none' then 9
           else 8
         end,
         planned_feature_count desc,
         component_id
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildComponentRoadmapRows,
    componentRoadmapSelect,
    readComponentRoadmapRows,
  };
}

module.exports = createComponentRoadmapReadModelComponent();
module.exports.createComponentRoadmapReadModelComponent = createComponentRoadmapReadModelComponent;
