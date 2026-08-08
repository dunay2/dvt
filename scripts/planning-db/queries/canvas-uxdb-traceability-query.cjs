/** Owned concern: expose DB-owned Canvas UX DB-first traceability backlog facts. */
const { appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createCanvasUxdbTraceabilityReadModelComponent(deps = {}) {
  const { schemaName } = deps.schema || require('../../planning-db-schema.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function buildCanvasUxdbTraceabilityRows(rows) {
    return rows.map((row) => [
      textValue(row.criterion_code ?? row.criterionCode),
      textValue(row.criterion_kind ?? row.criterionKind),
      textValue(row.canonical_task_id ?? row.canonicalTaskId),
      textValue(row.task_status ?? row.taskStatus),
      textValue(row.coverage_state ?? row.coverageState),
      textValue(row.duplicate_state ?? row.duplicateState),
      textValue(row.action_hint ?? row.actionHint),
    ]);
  }

  function canvasUxdbTraceabilitySelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        criterion_code,
        criterion_kind,
        criterion_title,
        canonical_task_id,
        task_priority,
        task_status,
        coverage_state,
        duplicate_owner_count,
        duplicate_state,
        source_path,
        action_hint,
        metadata
      from ${activeSchemaName}.canvas_uxdb_traceability_query`;
  }

  async function readCanvasUxdbTraceabilityRows(client, filters = {}) {
    const params = [];
    const predicates = [];

    appendFilter(predicates, params, 'canonical_task_id', filters.taskId);
    appendFilter(predicates, params, 'criterion_kind', filters.kind);
    appendFilter(predicates, params, 'coverage_state', filters.state);
    appendFilter(predicates, params, 'source_path', filters.path);
    appendFilter(predicates, params, 'criterion_code', filters.subject);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${canvasUxdbTraceabilitySelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case coverage_state
           when 'missing-task' then 1
           when 'duplicate-owner' then 2
           when 'not-started' then 3
           when 'in-progress' then 4
           when 'review' then 5
           when 'closed' then 9
           else 8
         end,
         task_priority,
         criterion_code
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildCanvasUxdbTraceabilityRows,
    canvasUxdbTraceabilitySelect,
    readCanvasUxdbTraceabilityRows,
  };
}

module.exports = createCanvasUxdbTraceabilityReadModelComponent();
module.exports.createCanvasUxdbTraceabilityReadModelComponent =
  createCanvasUxdbTraceabilityReadModelComponent;
