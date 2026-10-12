/** Owned concern: compare DB-owned source references with the validated Git inventory. */
const {
  FeatureMechanizationGitDiffReader,
} = require('../../lib/feature-mechanization-git-diff.cjs');
const { appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createGovernedSourceDriftReadModelComponent(deps = {}) {
  const { schemaName } = deps.schema || require('../../planning-db-schema.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function readGitSourceInventory() {
    const reader = deps.gitReader || new FeatureMechanizationGitDiffReader();
    reader.resolveComparison();
    return reader.readCurrentFiles();
  }

  function buildSourceDriftRows(rows) {
    return rows.map((row) => [
      textValue(row.finding_kind ?? row.findingKind),
      textValue(row.severity),
      textValue(row.source_path ?? row.sourcePath),
      textValue(row.source_table ?? row.sourceTable),
      row.reference_count ?? row.referenceCount ?? 0,
      textValue(row.action_hint ?? row.actionHint),
    ]);
  }

  function sourceDriftSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        'missing_source_file'::text as finding_kind,
        case when source_path like 'buzon/%' then 'error' else 'warning' end as severity,
        source_path,
        source_table,
        reference_count,
        'Repoint the governed source or retire the stale row explicitly.'::text as action_hint,
        jsonb_build_object('sourcePath', source_path, 'sourceTable', source_table,
          'referenceCount', reference_count) as metadata
      from (
        select source_path, '${activeSchemaName}.command_query_rails'::text as source_table,
          count(*)::integer as reference_count
        from ${activeSchemaName}.command_query_rails
        where nullif(btrim(source_path), '') is not null
        group by source_path
        union all
        select source_path, '${activeSchemaName}.feature_mechanization_local_rails'::text as source_table,
          count(*)::integer as reference_count
        from ${activeSchemaName}.feature_mechanization_local_rails
        where nullif(btrim(source_path), '') is not null
        group by source_path
      ) governed_sources
      where not (source_path = any($1::text[]))
        and source_path !~* '^https?://'
        and source_path !~ '^\\.generated-docs/'`;
  }

  async function readSourceDriftRows(client, filters = {}) {
    const params = [readGitSourceInventory()];
    const predicates = [];
    appendFilter(predicates, params, 'source_path', filters.path);
    appendFilter(predicates, params, 'severity', filters.severity);
    params.push(parseLimit(filters.limit, 50));
    const result = await client.query(
      `select * from (${sourceDriftSelect()}) source_drift
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case severity when 'error' then 1 when 'warning' then 2 else 3 end,
         source_path,
         source_table
       limit $${params.length}`,
      params
    );
    return result.rows;
  }

  return { buildSourceDriftRows, readGitSourceInventory, readSourceDriftRows, sourceDriftSelect };
}

module.exports = {
  createGovernedSourceDriftReadModelComponent,
  ...createGovernedSourceDriftReadModelComponent(),
};
