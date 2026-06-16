/**
 * Owned concern: expose DB-owned documentation lifecycle facts for planning DB queries.
 * Command/query rails: `ListDocumentationLifecycleFacts`.
 */
function createDocumentationLifecycleReadModelComponent(deps = {}) {
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

  function buildDocumentationLifecycleRows(rows) {
    return rows.map((row) => [
      row.lifecycle_gap_kind ?? row.lifecycleGapKind,
      row.lifecycle_state ?? row.lifecycleState,
      row.canonicality,
      row.duplicate_count ?? row.duplicateCount ?? 0,
      row.canonical_counterpart_count ?? row.canonicalCounterpartCount ?? 0,
      row.proposal_counterpart_count ?? row.proposalCounterpartCount ?? 0,
      row.closeout_counterpart_count ?? row.closeoutCounterpartCount ?? 0,
      row.open_action_count ?? row.openActionCount ?? 0,
      row.document_path ?? row.documentPath,
      row.subject_key ?? row.subjectKey ?? '-',
      row.title,
    ]);
  }

  function documentationLifecycleSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        document_id,
        document_path,
        document_type,
        title,
        status,
        planning_type,
        owner,
        mandatory,
        canonicality,
        lifecycle_state,
        canonical_disposition,
        subject_key,
        subject_document_count,
        duplicate_count,
        is_duplicate,
        canonical_counterpart_count,
        proposal_counterpart_count,
        closeout_counterpart_count,
        intake_counterpart_count,
        action_count,
        open_action_count,
        inbound_knowledge_reference_count,
        inbound_repository_reference_count,
        lifecycle_gap_kind,
        suggested_query,
        source_content_sha256
      from ${activeSchemaName}.documentation_lifecycle_query`;
  }

  async function readDocumentationLifecycleRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'document_type', filters.type);
    appendFilter(predicates, params, 'document_path', filters.path);
    appendFilter(predicates, params, 'status', filters.status);
    appendFilter(predicates, params, 'canonicality', filters.canonicality);
    appendFilter(predicates, params, 'lifecycle_state', filters.state);
    appendFilter(predicates, params, 'lifecycle_gap_kind', filters.kind);
    appendFilter(predicates, params, 'subject_key', filters.subject);
    appendBooleanFilter(predicates, 'is_duplicate', filters.duplicates);
    if (filters.gaps === true) {
      predicates.push("lifecycle_gap_kind <> 'none'");
    } else if (filters.gaps === false) {
      predicates.push("lifecycle_gap_kind = 'none'");
    }

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${documentationLifecycleSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case lifecycle_gap_kind
           when 'canonical_duplicate' then 1
           when 'proposal_missing_canonical' then 2
           when 'implemented_proposal_missing_closeout' then 3
           when 'intake_unclassified' then 4
           when 'none' then 9
           else 8
         end,
         duplicate_count desc,
         canonicality,
         document_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildDocumentationLifecycleRows,
    documentationLifecycleSelect,
    readDocumentationLifecycleRows,
  };
}

module.exports = createDocumentationLifecycleReadModelComponent();
module.exports.createDocumentationLifecycleReadModelComponent =
  createDocumentationLifecycleReadModelComponent;
