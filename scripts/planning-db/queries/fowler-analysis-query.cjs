/** Owned concern: expose DB-owned Fowler analysis work and retirement facts. */
function createFowlerAnalysisReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function parseLimit(value, defaultLimit) {
    if (value === undefined || value === null || value === '') {
      return defaultLimit;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Invalid --limit "${value}". Expected a positive integer.`);
    }

    return parsed;
  }

  function appendFilter(predicates, params, column, value) {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.push(value);
    predicates.push(`${column} = $${params.length}`);
  }

  function appendBooleanFilter(predicates, column, value) {
    if (value === undefined) {
      return;
    }

    predicates.push(`${column} is ${value === true ? 'true' : 'false'}`);
  }

  function textValue(value, fallback = '-') {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : fallback;
  }

  function buildFowlerAnalysisRows(rows) {
    return rows.map((row) => [
      textValue(row.work_state ?? row.workState),
      textValue(row.document_class ?? row.documentClass),
      String(row.retirement_allowed ?? row.retirementAllowed ?? false),
      row.pending_improvement_count ?? row.pendingImprovementCount ?? 0,
      row.open_action_count ?? row.openActionCount ?? 0,
      row.inbound_reference_count ?? row.inboundReferenceCount ?? 0,
      textValue(row.document_path ?? row.documentPath),
      textValue(row.subject_key ?? row.subjectKey),
      textValue(row.title),
    ]);
  }

  function fowlerAnalysisSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        document_id,
        document_path,
        document_type,
        title,
        status,
        planning_type,
        owner,
        document_class,
        canonicality,
        lifecycle_state,
        canonical_disposition,
        subject_key,
        action_count,
        open_action_count,
        inbound_knowledge_reference_count,
        inbound_repository_reference_count,
        inbound_reference_count,
        pending_improvement_count,
        is_pending_improvement,
        retirement_allowed,
        work_state,
        lifecycle_gap_kind,
        suggested_query,
        source_content_sha256
      from ${activeSchemaName}.fowler_analysis_work_query`;
  }

  async function readFowlerAnalysisRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'work_state', filters.state);
    appendFilter(predicates, params, 'document_type', filters.type);
    appendFilter(predicates, params, 'document_path', filters.path);
    appendFilter(predicates, params, 'document_class', filters.class);
    appendFilter(predicates, params, 'subject_key', filters.subject);
    appendFilter(predicates, params, 'lifecycle_gap_kind', filters.kind);
    appendBooleanFilter(predicates, 'is_pending_improvement', filters.gaps);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${fowlerAnalysisSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case work_state
           when 'pending_improvements' then 1
           when 'lifecycle_gap' then 2
           when 'blocked_by_references' then 3
           when 'needs_canonical_decision' then 4
           when 'ready_to_retire' then 5
           when 'governed' then 9
           else 8
         end,
         pending_improvement_count desc,
         inbound_reference_count desc,
         document_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildFowlerAnalysisRows,
    fowlerAnalysisSelect,
    readFowlerAnalysisRows,
  };
}

module.exports = createFowlerAnalysisReadModelComponent();
module.exports.createFowlerAnalysisReadModelComponent = createFowlerAnalysisReadModelComponent;
