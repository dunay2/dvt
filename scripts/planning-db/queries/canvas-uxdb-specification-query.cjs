/** Owned concern: expose DB-owned Canvas UX specification records from TAREA.TXT. */
const { appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createCanvasUxdbSpecificationReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function buildCanvasUxdbSpecificationRows(rows) {
    return rows.map((row) => [
      textValue(row.record_id ?? row.recordId),
      textValue(row.record_type ?? row.recordType),
      textValue(row.record_title ?? row.recordTitle),
      textValue(row.canonical_task_id ?? row.canonicalTaskId),
      textValue(row.component_id ?? row.componentId),
      textValue(row.rail_name ?? row.railName),
      textValue(row.spec_state ?? row.specState),
      textValue(row.legacy_posture ?? row.legacyPosture),
    ]);
  }

  function canvasUxdbSpecificationSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        record_id,
        record_type,
        record_title,
        canonical_task_id,
        component_id,
        rail_name,
        spec_state,
        legacy_posture,
        source_path,
        metadata
      from ${activeSchemaName}.canvas_uxdb_specification_query`;
  }

  async function readCanvasUxdbSpecificationRows(client, filters = {}) {
    const params = [];
    const predicates = [];

    appendFilter(predicates, params, 'canonical_task_id', filters.taskId);
    appendFilter(predicates, params, 'record_type', filters.recordType || filters.kind);
    appendFilter(predicates, params, 'component_id', filters.component);
    appendFilter(predicates, params, 'rail_name', filters.rail);
    appendFilter(predicates, params, 'spec_state', filters.state);
    appendFilter(predicates, params, 'source_path', filters.path);
    appendFilter(predicates, params, 'record_id', filters.subject);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${canvasUxdbSpecificationSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case record_type
           when 'ux_decision' then 1
           when 'ui_component' then 2
           when 'context_action' then 3
           when 'workbench_section' then 4
           when 'command_query_rail' then 5
           when 'anti_pattern' then 6
           when 'reference' then 7
           when 'acceptance_criterion' then 8
           when 'test_requirement' then 9
           when 'evidence' then 10
           when 'export_provenance' then 11
           else 99
         end,
         record_id
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildCanvasUxdbSpecificationRows,
    canvasUxdbSpecificationSelect,
    readCanvasUxdbSpecificationRows,
  };
}

module.exports = createCanvasUxdbSpecificationReadModelComponent();
module.exports.createCanvasUxdbSpecificationReadModelComponent =
  createCanvasUxdbSpecificationReadModelComponent;
