/** Owned concern: expose code-symbol duplicate and governed-source drift findings. */
const { parseLimit } = require('../query-limit.cjs');

function createCodeSymbolReadModelComponent(deps = {}) {
  const { schemaName } = deps.migration || require('../../planning-db-migrate.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;

  function appendFilter(predicates, params, column, value) {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.push(value);
    predicates.push(`${column} = $${params.length}`);
  }

  function textValue(value, fallback = '-') {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : fallback;
  }

  function buildCodeSymbolRows(rows) {
    return rows.map((row) => [
      textValue(row.symbol_id ?? row.symbolId),
      textValue(row.symbol_name ?? row.symbolName),
      textValue(row.symbol_kind ?? row.symbolKind),
      textValue(row.component_id ?? row.componentId),
      textValue(row.file_path ?? row.filePath),
      row.start_line ?? row.startLine ?? 0,
      row.end_line ?? row.endLine ?? 0,
      textValue(row.body_sha256 ?? row.bodySha256),
      row.normalized_body_length ?? row.normalizedBodyLength ?? 0,
    ]);
  }

  function buildCodeSymbolDuplicateRows(rows) {
    return rows.map((row) => [
      textValue(row.finding_kind ?? row.findingKind),
      textValue(row.severity),
      textValue(row.duplicate_key ?? row.duplicateKey),
      textValue(row.symbol_name ?? row.symbolName),
      textValue(row.component_id ?? row.componentId),
      textValue(row.source_path ?? row.sourcePath),
      row.start_line ?? row.startLine ?? 0,
      row.duplicate_count ?? row.duplicateCount ?? 0,
      textValue(row.action_hint ?? row.actionHint),
    ]);
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

  function buildGovernanceProblemRows(rows) {
    return rows.map((row) => [
      textValue(row.problem_surface ?? row.problemSurface),
      textValue(row.finding_kind ?? row.findingKind),
      textValue(row.severity),
      textValue(row.subject_id ?? row.subjectId),
      textValue(row.component_id ?? row.componentId),
      textValue(row.path),
      row.evidence_count ?? row.evidenceCount ?? 0,
      textValue(row.action_hint ?? row.actionHint),
    ]);
  }

  function codeSymbolSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        symbol_id,
        symbol_name,
        symbol_kind,
        component_id,
        owning_unit,
        root_unit,
        domain_unit,
        file_path,
        source_path,
        start_line,
        end_line,
        body_sha256,
        normalized_body_length,
        source_content_sha256,
        metadata
      from ${activeSchemaName}.code_symbol_inventory_query`;
  }

  function codeSymbolProblemSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        finding_kind,
        severity,
        duplicate_key,
        symbol_id,
        symbol_name,
        symbol_kind,
        component_id,
        source_path,
        start_line,
        duplicate_count,
        action_hint,
        metadata
      from ${activeSchemaName}.code_symbol_problem_query`;
  }

  function sourceDriftSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        finding_kind,
        severity,
        source_path,
        source_table,
        reference_count,
        action_hint,
        metadata
      from ${activeSchemaName}.governed_source_drift_query`;
  }

  function governanceProblemSelect(activeSchemaName = defaultSchemaName) {
    return `
      select
        problem_surface,
        finding_kind,
        severity,
        subject_id,
        component_id,
        path,
        evidence_count,
        action_hint,
        metadata
      from ${activeSchemaName}.governance_problem_dashboard_query`;
  }

  async function readCodeSymbolRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'component_id', filters.component);
    appendFilter(predicates, params, 'file_path', filters.path);
    appendFilter(predicates, params, 'symbol_kind', filters.kind);
    appendFilter(predicates, params, 'symbol_name', filters.symbol);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${codeSymbolSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by component_id nulls last, file_path, start_line, symbol_name
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readCodeSymbolDuplicateRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'finding_kind', filters.kind);
    appendFilter(predicates, params, 'severity', filters.severity);
    appendFilter(predicates, params, 'component_id', filters.component);
    appendFilter(predicates, params, 'source_path', filters.path);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${codeSymbolProblemSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case severity when 'error' then 1 when 'warning' then 2 else 3 end,
         finding_kind,
         duplicate_key,
         source_path,
         start_line
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readSourceDriftRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'source_path', filters.path);
    appendFilter(predicates, params, 'severity', filters.severity);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${sourceDriftSelect()}
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

  async function readGovernanceProblemRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'finding_kind', filters.kind);
    appendFilter(predicates, params, 'severity', filters.severity);
    appendFilter(predicates, params, 'component_id', filters.component);
    appendFilter(predicates, params, 'path', filters.path);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${governanceProblemSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case severity when 'blocker' then 1 when 'error' then 2 when 'warning' then 3 else 4 end,
         problem_surface,
         finding_kind,
         subject_id
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    buildCodeSymbolDuplicateRows,
    buildCodeSymbolRows,
    buildGovernanceProblemRows,
    buildSourceDriftRows,
    codeSymbolProblemSelect,
    codeSymbolSelect,
    governanceProblemSelect,
    readCodeSymbolDuplicateRows,
    readCodeSymbolRows,
    readGovernanceProblemRows,
    readSourceDriftRows,
    sourceDriftSelect,
  };
}

module.exports = {
  createCodeSymbolReadModelComponent,
  ...createCodeSymbolReadModelComponent(),
};
