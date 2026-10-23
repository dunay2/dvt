/** Owned concern: combine DB semantic integrity with current Git path evidence. */
const { appendComponentPairFilter, appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');
const {
  createCurrentComponentFilesReadModelComponent,
} = require('./current-component-files-query.cjs');

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
      from ${activeSchemaName}.component_integrity_query
      where finding_kind <> 'component_path_without_files'
      union all
      select
        'component_path_without_files'::text as finding_kind,
        'warning'::text as severity,
        component.component_id,
        component.name as component_name,
        'warning'::text as finding_state,
        component.repo_path as path,
        null::text as related_component_id,
        null::text as relation_id,
        0::integer as evidence_count,
        'Remap the component path, retire the phantom component, or justify the virtual boundary explicitly.'::text as action_hint,
        'architecture.component_query'::text as source_view,
        jsonb_build_object('repoPath', component.repo_path, 'status', component.status) as metadata
      from architecture.component_query component
      where component.status not in ('deprecated', 'drift')
        and nullif(btrim(component.repo_path), '') is not null
        and component.repo_path <> '.'
        and not exists (
          select 1 from unnest($1::text[]) as current_file(path)
          where current_file.path = component.repo_path
            or left(current_file.path, length(component.repo_path) + 1) = component.repo_path || '/'
        )`;
  }

  async function readComponentIntegrityRows(client, filters = {}) {
    const params = [createCurrentComponentFilesReadModelComponent(deps).readGitSourceInventory()];
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
      `select * from (${componentIntegritySelect()}) current_integrity
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
