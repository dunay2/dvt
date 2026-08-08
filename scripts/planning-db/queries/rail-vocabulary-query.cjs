/** Owned concern: expose canonical command/query rail vocabulary findings. */
const { appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createRailVocabularyReadModelComponent(deps = {}) {
  const { schemaName } = deps.schema || require('../../planning-db-schema.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function appendDuplicateFilter(predicates, value) {
    if (value !== true) {
      return;
    }

    predicates.push(`finding_kind in ('exact_duplicate', 'semantic_duplicate')`);
  }

  function buildRailVocabularyRows(rows) {
    return rows.map((row) => [
      textValue(row.finding_kind ?? row.findingKind),
      textValue(row.severity),
      textValue(row.rail_type ?? row.railType),
      textValue(row.rail_name ?? row.railName),
      textValue(row.canonical_name ?? row.canonicalName),
      textValue(row.bounded_context ?? row.boundedContext),
      textValue(row.ddd_owner ?? row.dddOwner),
      textValue(row.rail_status ?? row.railStatus),
      textValue(row.vocabulary_state ?? row.vocabularyState),
      row.duplicate_count ?? row.duplicateCount ?? 0,
      textValue(row.action_hint ?? row.actionHint),
      textValue(row.source_path ?? row.sourcePath),
    ]);
  }

  function railVocabularySelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        finding_kind,
        severity,
        rail_type,
        rail_name,
        canonical_name,
        semantic_key,
        bounded_context,
        ddd_owner,
        rail_status,
        vocabulary_state,
        duplicate_count,
        action_hint,
        source_path,
        metadata
      from ${activeSchemaName}.command_query_rail_vocabulary_query`;
  }

  async function readRailVocabularyRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'finding_kind', filters.kind);
    appendFilter(predicates, params, 'severity', filters.severity);
    appendFilter(predicates, params, 'rail_type', filters.type);
    appendFilter(predicates, params, 'rail_name', filters.rail);
    appendFilter(predicates, params, 'ddd_owner', filters.owner);
    appendFilter(predicates, params, 'vocabulary_state', filters.state);
    appendDuplicateFilter(predicates, filters.duplicates);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${railVocabularySelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case severity when 'blocker' then 1 when 'error' then 2 when 'warning' then 3 else 4 end,
         finding_kind,
         rail_type,
         semantic_key,
         rail_name
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildRailVocabularyRows,
    railVocabularySelect,
    readRailVocabularyRows,
  };
}

module.exports = {
  createRailVocabularyReadModelComponent,
  ...createRailVocabularyReadModelComponent(),
};
