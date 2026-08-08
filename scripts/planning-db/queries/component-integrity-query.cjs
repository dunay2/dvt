/** Owned concern: expose DB-owned component integrity validation facts. */
const { appendComponentPairFilter, appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createComponentIntegrityReadModelComponent(deps = {}) {
  const { schemaName } = deps.schema || require('../../planning-db-schema.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function buildComponentIntegrityRows(rows) {
    return rows.map((row) => [
      textValue(row.finding_kind ?? row.findingKind),
      textValue(row.severity),
      textValue(row.component_id ?? row.componentId),
      textValue(row.component_name ?? row.componentName),
      textValue(row.finding_state ?? row.findingState),
      textValue(row.path),
      textValue(row.related_component_id ?? row.relatedComponentId),
      textValue(row.relation_id ?? row.relationId),
      row.evidence_count ?? row.evidenceCount ?? 0,
      textValue(row.action_hint ?? row.actionHint),
      textValue(row.source_view ?? row.sourceView),
    ]);
  }

  function componentIntegritySelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        finding_kind,
        severity,
        component_id,
        component_name,
        finding_state,
        path,
        related_component_id,
        relation_id,
        evidence_count,
        action_hint,
        source_view,
        metadata
      from ${activeSchemaName}.component_integrity_query`;
  }

  async function readComponentIntegrityRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'finding_kind', filters.kind);
    appendFilter(predicates, params, 'severity', filters.severity);
    appendFilter(predicates, params, 'finding_state', filters.state);
    appendFilter(predicates, params, 'path', filters.path);
    appendFilter(predicates, params, 'relation_id', filters.relation);
    appendComponentPairFilter(
      predicates,
      params,
      filters.component,
      'component_id',
      'related_component_id'
    );

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${componentIntegritySelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case severity when 'blocker' then 1 when 'error' then 2 when 'warning' then 3 else 4 end,
         finding_kind,
         component_id,
         path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildComponentIntegrityRows,
    componentIntegritySelect,
    readComponentIntegrityRows,
  };
}

module.exports = {
  createComponentIntegrityReadModelComponent,
  ...createComponentIntegrityReadModelComponent(),
};
