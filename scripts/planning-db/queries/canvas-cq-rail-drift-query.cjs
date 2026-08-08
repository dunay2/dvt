/** Owned concern: expose Canvas UX command/query rail drift against canonical rail catalog. */
const { appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createCanvasCqRailDriftReadModelComponent(deps = {}) {
  const { schemaName } = deps.schema || require('../../planning-db-schema.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function buildCanvasCqRailDriftRows(rows) {
    return rows.map((row) => [
      textValue(row.severity),
      textValue(row.drift_state ?? row.driftState),
      textValue(row.record_id ?? row.recordId),
      textValue(row.record_type ?? row.recordType),
      textValue(row.component_id ?? row.componentId),
      textValue(row.requested_rail_name ?? row.requestedRailName),
      textValue(row.canonical_rail_name ?? row.canonicalRailName),
      textValue(row.rail_type ?? row.railType),
      textValue(row.action_hint ?? row.actionHint),
    ]);
  }

  function canvasCqRailDriftSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        severity,
        drift_state,
        record_id,
        record_type,
        record_title,
        canonical_task_id,
        component_id,
        requested_rail_name,
        canonical_rail_name,
        rail_type,
        canonical_rail_status,
        action_hint,
        source_path,
        metadata
      from ${activeSchemaName}.canvas_cq_rail_drift_query`;
  }

  async function readCanvasCqRailDriftRows(client, filters = {}) {
    const params = [];
    const predicates = [];

    appendFilter(predicates, params, 'drift_state', filters.state);
    appendFilter(predicates, params, 'requested_rail_name', filters.rail);
    appendFilter(predicates, params, 'component_id', filters.component);
    appendFilter(predicates, params, 'canonical_task_id', filters.taskId);
    appendFilter(predicates, params, 'record_type', filters.recordType || filters.kind);
    appendFilter(predicates, params, 'severity', filters.severity);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${canvasCqRailDriftSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case severity when 'blocker' then 1 when 'error' then 2 when 'warning' then 3 else 4 end,
         case drift_state
           when 'missing_canonical_rail' then 1
           when 'duplicate_canonical_rail' then 2
           when 'gap_canonical_rail' then 3
           when 'legacy_alias' then 4
           when 'ready' then 5
           else 6
         end,
         component_id,
         record_id
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildCanvasCqRailDriftRows,
    canvasCqRailDriftSelect,
    readCanvasCqRailDriftRows,
  };
}

module.exports = createCanvasCqRailDriftReadModelComponent();
module.exports.createCanvasCqRailDriftReadModelComponent =
  createCanvasCqRailDriftReadModelComponent;
