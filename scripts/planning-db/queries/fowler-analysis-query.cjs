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

  function buildFowlerAnalysisReferenceRows(rows) {
    return rows.map((row) => [
      textValue(row.document_path ?? row.documentPath),
      textValue(row.reference_state ?? row.referenceState),
      textValue(row.relation_type ?? row.relationType),
      textValue(row.reference_path ?? row.referencePath),
      textValue(row.canonical_target_path ?? row.canonicalTargetPath),
      textValue(row.resolution_status ?? row.resolutionStatus),
      textValue(row.reference_component_id ?? row.referenceComponentId),
      textValue(row.reference_file_role ?? row.referenceFileRole),
      textValue(row.sample_text ?? row.sampleText),
    ]);
  }

  function buildFowlerAnalysisRetirementRows(rows) {
    return rows.map((row) => [
      textValue(row.retirement_state ?? row.retirementState),
      String(row.retirement_allowed ?? row.retirementAllowed ?? false),
      row.unresolved_reference_count ?? row.unresolvedReferenceCount ?? 0,
      row.open_improvement_count ?? row.openImprovementCount ?? 0,
      textValue(row.canonical_target_path ?? row.canonicalTargetPath),
      textValue(row.disposition_status ?? row.dispositionStatus),
      textValue(row.retirement_decision_status ?? row.retirementDecisionStatus),
      textValue(row.document_path ?? row.documentPath),
      textValue(row.title),
    ]);
  }

  function buildFowlerAnalysisCanonicalCoverageRows(rows) {
    return rows.map((row) => [
      textValue(row.coverage_state ?? row.coverageState),
      textValue(row.target_path ?? row.targetPath),
      textValue(row.target_status ?? row.targetStatus),
      textValue(row.document_path ?? row.documentPath),
      textValue(row.subject_key ?? row.subjectKey),
      textValue(row.title),
    ]);
  }

  function buildFowlerAnalysisIntentRows(rows) {
    return rows.map((row) => [
      textValue(row.intent_state ?? row.intentState),
      String(row.is_duplicate_intent ?? row.isDuplicateIntent ?? false),
      row.duplicate_document_count ?? row.duplicateDocumentCount ?? 0,
      row.duplicate_open_action_count ?? row.duplicateOpenActionCount ?? 0,
      textValue(row.document_path ?? row.documentPath),
      textValue(row.intent_key ?? row.intentKey),
      textValue(row.action_status ?? row.actionStatus),
      textValue(row.summary),
    ]);
  }

  function buildFowlerAnalysisDuplicateRows(rows) {
    return rows.map((row) => [
      textValue(row.duplicate_state ?? row.duplicateState),
      row.duplicate_document_count ?? row.duplicateDocumentCount ?? 0,
      row.duplicate_open_action_count ?? row.duplicateOpenActionCount ?? 0,
      textValue(row.canonical_target_path ?? row.canonicalTargetPath),
      textValue(row.intent_key ?? row.intentKey),
      textValue(row.sample_document_path ?? row.sampleDocumentPath),
      textValue(row.sample_summary ?? row.sampleSummary),
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

  function fowlerAnalysisReferenceSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        document_path,
        reference_state,
        relation_type,
        reference_path,
        canonical_target_path,
        resolution_status,
        reference_component_id,
        reference_file_role,
        sample_text,
        source_content_sha256
      from ${activeSchemaName}.fowler_analysis_reference_query`;
  }

  function fowlerAnalysisRetirementSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        retirement_state,
        retirement_allowed,
        unresolved_reference_count,
        open_improvement_count,
        canonical_target_path,
        disposition_status,
        retirement_decision_status,
        document_path,
        title,
        source_content_sha256
      from ${activeSchemaName}.fowler_analysis_retirement_query`;
  }

  function fowlerAnalysisCanonicalCoverageSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        coverage_state,
        target_path,
        target_status,
        document_path,
        subject_key,
        title,
        source_content_sha256
      from ${activeSchemaName}.fowler_analysis_canonical_coverage_query`;
  }

  function fowlerAnalysisIntentSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        intent_state,
        is_duplicate_intent,
        duplicate_document_count,
        duplicate_open_action_count,
        document_path,
        canonical_target_path,
        subject_key,
        intent_key,
        action_status,
        summary,
        source_content_sha256
      from ${activeSchemaName}.fowler_analysis_intended_work_query`;
  }

  function fowlerAnalysisDuplicateSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        duplicate_state,
        duplicate_document_count,
        duplicate_open_action_count,
        canonical_target_path,
        intent_key,
        sample_document_path,
        sample_summary,
        source_content_sha256
      from ${activeSchemaName}.fowler_analysis_duplicate_intent_query`;
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

  async function readFowlerAnalysisReferenceRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'reference_state', filters.state);
    appendFilter(predicates, params, 'document_path', filters.path);
    appendFilter(predicates, params, 'canonical_target_path', filters.target);
    appendFilter(predicates, params, 'relation_type', filters.relation);
    appendFilter(predicates, params, 'reference_component_id', filters.component);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${fowlerAnalysisReferenceSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case reference_state
           when 'live' then 1
           when 'resolved' then 2
           else 3
         end,
         document_path,
         relation_type,
         reference_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFowlerAnalysisRetirementRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'retirement_state', filters.state);
    appendFilter(predicates, params, 'document_path', filters.path);
    appendFilter(predicates, params, 'canonical_target_path', filters.target);
    appendBooleanFilter(predicates, 'retirement_allowed', filters.retirementAllowed);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${fowlerAnalysisRetirementSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case retirement_state
           when 'pending_improvements' then 1
           when 'blocked_by_references' then 2
           when 'needs_canonical_decision' then 3
           when 'needs_disposition_decision' then 4
           when 'needs_retirement_approval' then 5
           when 'ready_to_retire' then 6
           else 9
         end,
         unresolved_reference_count desc,
         open_improvement_count desc,
         document_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFowlerAnalysisCanonicalCoverageRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'coverage_state', filters.state);
    appendFilter(predicates, params, 'document_path', filters.path);
    appendFilter(predicates, params, 'target_path', filters.target);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${fowlerAnalysisCanonicalCoverageSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case coverage_state
           when 'target_missing' then 1
           when 'target_missing_from_import' then 2
           when 'covered' then 3
           else 9
         end,
         document_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFowlerAnalysisIntentRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'intent_state', filters.state);
    appendFilter(predicates, params, 'document_path', filters.path);
    appendFilter(predicates, params, 'canonical_target_path', filters.target);
    appendFilter(predicates, params, 'subject_key', filters.subject);
    appendFilter(predicates, params, 'intent_key', filters.intent);
    appendBooleanFilter(predicates, 'is_duplicate_intent', filters.duplicates);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${fowlerAnalysisIntentSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case intent_state
           when 'duplicate_open_intent' then 1
           when 'open_intent' then 2
           when 'duplicate_resolved_intent' then 3
           when 'unclassified_intent' then 4
           else 9
         end,
         duplicate_open_action_count desc,
         duplicate_document_count desc,
         document_path,
         intent_key
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readFowlerAnalysisDuplicateRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'duplicate_state', filters.state);
    appendFilter(predicates, params, 'canonical_target_path', filters.target);
    appendFilter(predicates, params, 'intent_key', filters.intent);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${fowlerAnalysisDuplicateSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case duplicate_state
           when 'open_duplicate' then 1
           when 'resolved_duplicate' then 2
           else 9
         end,
         duplicate_open_action_count desc,
         duplicate_document_count desc,
         intent_key
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildFowlerAnalysisCanonicalCoverageRows,
    buildFowlerAnalysisDuplicateRows,
    buildFowlerAnalysisIntentRows,
    buildFowlerAnalysisReferenceRows,
    buildFowlerAnalysisRetirementRows,
    buildFowlerAnalysisRows,
    fowlerAnalysisCanonicalCoverageSelect,
    fowlerAnalysisDuplicateSelect,
    fowlerAnalysisIntentSelect,
    fowlerAnalysisReferenceSelect,
    fowlerAnalysisRetirementSelect,
    fowlerAnalysisSelect,
    readFowlerAnalysisCanonicalCoverageRows,
    readFowlerAnalysisDuplicateRows,
    readFowlerAnalysisIntentRows,
    readFowlerAnalysisReferenceRows,
    readFowlerAnalysisRetirementRows,
    readFowlerAnalysisRows,
  };
}

module.exports = createFowlerAnalysisReadModelComponent();
module.exports.createFowlerAnalysisReadModelComponent = createFowlerAnalysisReadModelComponent;
