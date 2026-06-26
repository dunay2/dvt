/** Owned concern: expose Canvas component registry drift from DB-owned file/component inventories. */
const { appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createCanvasComponentRegistryDriftReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function normalizeRegisteredComponentIds(row) {
    const ids = row.registered_component_ids ?? row.registeredComponentIds ?? [];
    if (Array.isArray(ids)) {
      return JSON.stringify(ids);
    }
    return textValue(ids, '[]');
  }

  function buildCanvasComponentRegistryDriftRows(rows) {
    return rows.map((row) => [
      textValue(row.severity),
      textValue(row.drift_state ?? row.driftState),
      textValue(row.file_path ?? row.filePath),
      textValue(row.expected_component_id ?? row.expectedComponentId),
      normalizeRegisteredComponentIds(row),
      textValue(row.surface_role ?? row.surfaceRole),
      textValue(row.action_hint ?? row.actionHint),
    ]);
  }

  function canvasComponentRegistryDriftSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        severity,
        drift_state,
        file_path,
        expected_component_id,
        registered_component_ids,
        surface_role,
        action_hint,
        source_path,
        metadata
      from ${activeSchemaName}.canvas_component_registry_drift_query`;
  }

  async function readCanvasComponentRegistryDriftRows(client, filters = {}) {
    const params = [];
    const predicates = [];

    appendFilter(predicates, params, 'drift_state', filters.state);
    appendFilter(predicates, params, 'file_path', filters.path);
    appendFilter(predicates, params, 'expected_component_id', filters.component);
    appendFilter(predicates, params, 'surface_role', filters.surfaceRole || filters.kind);
    appendFilter(predicates, params, 'severity', filters.severity);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${canvasComponentRegistryDriftSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case severity when 'blocker' then 1 when 'error' then 2 when 'warning' then 3 else 4 end,
         case drift_state
           when 'unmapped_canvas_component_file' then 1
           when 'unexpected_canvas_component_owner' then 2
           when 'duplicate_canvas_component_file_owner' then 3
           when 'legacy_canvas_palette_surface' then 4
           else 5
         end,
         file_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildCanvasComponentRegistryDriftRows,
    canvasComponentRegistryDriftSelect,
    readCanvasComponentRegistryDriftRows,
  };
}

module.exports = createCanvasComponentRegistryDriftReadModelComponent();
module.exports.createCanvasComponentRegistryDriftReadModelComponent =
  createCanvasComponentRegistryDriftReadModelComponent;
