/** Owned concern: expose code-symbol diagnostics and compose the governance problem dashboard. */
const { appendFilter } = require('../query-filter.cjs');
const { textValue } = require('../query-format.cjs');
const { parseLimit } = require('../query-limit.cjs');
const { createGovernedSourceDriftReadModelComponent } = require('./source-drift-query.cjs');

function createCodeSymbolReadModelComponent(deps = {}) {
  const { schemaName } = deps.schema || require('../../planning-db-schema.cjs');
  const defaultSchemaName = deps.schemaName || schemaName;
  const { readGitSourceInventory, sourceDriftSelect } =
    createGovernedSourceDriftReadModelComponent(deps);

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
      from ${activeSchemaName}.governance_problem_dashboard_query
      where problem_surface <> 'source-drift'
      union all
      select
        'source-drift'::text as problem_surface,
        finding_kind,
        severity,
        source_path as subject_id,
        null::text as component_id,
        source_path as path,
        reference_count as evidence_count,
        action_hint,
        metadata
      from (${sourceDriftSelect(activeSchemaName)}) source_drift`;
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

  async function readGovernanceProblemRows(client, filters = {}) {
    const params = [readGitSourceInventory()];
    const predicates = [];
    appendFilter(predicates, params, 'finding_kind', filters.kind);
    appendFilter(predicates, params, 'severity', filters.severity);
    appendFilter(predicates, params, 'component_id', filters.component);
    appendFilter(predicates, params, 'path', filters.path);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `select * from (${governanceProblemSelect()}) governance_problems
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
    codeSymbolProblemSelect,
    codeSymbolSelect,
    governanceProblemSelect,
    readCodeSymbolDuplicateRows,
    readCodeSymbolRows,
    readGovernanceProblemRows,
  };
}

module.exports = {
  createCodeSymbolReadModelComponent,
  ...createCodeSymbolReadModelComponent(),
};
