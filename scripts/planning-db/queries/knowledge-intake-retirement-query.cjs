/** Owned concern: expose DB-owned knowledge intake retirement read models for planning DB queries. */
function createKnowledgeIntakeRetirementReadModelComponent(deps = {}) {
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

  function buildKnowledgeIntakeRetirementRows(rows) {
    return rows.map((row) => [
      row.retirement_state ?? row.retirementState,
      row.open_action_count ?? row.openActionCount ?? 0,
      row.inbound_reference_count ?? row.inboundReferenceCount ?? 0,
      row.action_count ?? row.actionCount ?? 0,
      row.canonical_disposition ?? row.canonicalDisposition ?? '-',
      row.document_path ?? row.documentPath,
      row.title,
    ]);
  }

  function buildKnowledgeIntakeReferenceRows(rows) {
    return rows.map((row) => [
      row.document_path ?? row.documentPath,
      row.relation_type ?? row.relationType,
      row.reference_path ?? row.referencePath,
      row.reference_component_id ?? row.referenceComponentId ?? '-',
      row.reference_file_role ?? row.referenceFileRole ?? '-',
      row.reference_title ?? row.referenceTitle,
    ]);
  }

  function knowledgeIntakeRetirementSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        document_id,
        document_path,
        document_type,
        title,
        status,
        planning_type,
        owner,
        canonical_disposition,
        inbound_reference_count,
        action_count,
        open_action_count,
        retirement_state,
        suggested_query,
        source_content_sha256
      from ${activeSchemaName}.knowledge_intake_retirement_query`;
  }

  function knowledgeIntakeReferenceSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        document_path,
        relation_type,
        reference_path,
        reference_component_id,
        reference_file_role,
        reference_title,
        reference_document_type,
        reference_source_content_sha256
      from ${activeSchemaName}.knowledge_intake_repository_reference_query`;
  }

  async function readKnowledgeIntakeRetirementRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'retirement_state', filters.state);
    appendFilter(predicates, params, 'document_type', filters.type);
    appendFilter(predicates, params, 'document_path', filters.path);
    appendFilter(predicates, params, 'status', filters.status);
    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${knowledgeIntakeRetirementSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case retirement_state
           when 'unclassified' then 1
           when 'open-actions' then 2
           when 'referenced' then 3
           when 'canonized' then 4
           else 5
         end,
         open_action_count desc,
         inbound_reference_count desc,
         document_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readKnowledgeIntakeReferenceRows(client, filters = {}) {
    const params = [];
    const predicates = ["document_path like 'buzon/%'"];
    appendFilter(predicates, params, 'document_path', filters.path);
    appendFilter(predicates, params, 'relation_type', filters.relation);
    appendFilter(predicates, params, 'reference_component_id', filters.component);
    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${knowledgeIntakeReferenceSelect()}
       where ${predicates.join(' and ')}
       order by
         document_path,
         relation_type,
         reference_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildKnowledgeIntakeReferenceRows,
    buildKnowledgeIntakeRetirementRows,
    knowledgeIntakeReferenceSelect,
    knowledgeIntakeRetirementSelect,
    readKnowledgeIntakeReferenceRows,
    readKnowledgeIntakeRetirementRows,
  };
}

module.exports = createKnowledgeIntakeRetirementReadModelComponent();
module.exports.createKnowledgeIntakeRetirementReadModelComponent =
  createKnowledgeIntakeRetirementReadModelComponent;
