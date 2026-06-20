/** Owned concern: expose DB-owned component architecture fitness observations and checks. */
const { appendComponentPairFilter, appendFilter } = require('../query-filter.cjs');
const { parseLimit } = require('../query-limit.cjs');

function createComponentArchitectureFitnessReadModelComponent(deps = {}) {
  const defaultSchemaName = deps.schemaName || 'architecture';

  function textValue(value, fallback = '-') {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : fallback;
  }

  function buildArchitectureDependencyObservationRows(rows) {
    return rows.map((row) => [
      textValue(row.scan_id ?? row.scanId),
      textValue(row.design_id ?? row.designId),
      textValue(row.observation_id ?? row.observationId),
      textValue(row.source_path ?? row.sourcePath),
      textValue(row.target_path ?? row.targetPath),
      textValue(row.import_literal ?? row.importLiteral),
      textValue(row.source_component_id ?? row.sourceComponentId),
      textValue(row.target_component_id ?? row.targetComponentId),
      textValue(row.relation_type ?? row.relationType),
    ]);
  }

  function buildArchitecturePathMappingRows(rows) {
    return rows.map((row) => [
      textValue(row.scan_id ?? row.scanId),
      textValue(row.design_id ?? row.designId),
      textValue(row.path_role ?? row.pathRole),
      textValue(row.path),
      textValue(row.component_id ?? row.componentId),
      textValue(row.mapping_state ?? row.mappingState),
      row.mapping_confidence ?? row.mappingConfidence ?? 0,
      textValue(row.mapping_reason ?? row.mappingReason),
    ]);
  }

  function buildArchitectureDependencyClassificationRows(rows) {
    return rows.map((row) => [
      textValue(row.scan_id ?? row.scanId),
      textValue(row.design_id ?? row.designId),
      textValue(row.observation_id ?? row.observationId),
      textValue(row.source_component_id ?? row.sourceComponentId),
      textValue(row.target_component_id ?? row.targetComponentId),
      textValue(row.relation_type ?? row.relationType),
      textValue(row.dependency_classification ?? row.dependencyClassification),
      textValue(row.fitness_state ?? row.fitnessState),
    ]);
  }

  function buildArchitectureFitnessRows(rows) {
    return rows.map((row) => [
      textValue(row.scan_id ?? row.scanId),
      textValue(row.design_id ?? row.designId),
      textValue(row.fitness_rule_id ?? row.fitnessRuleId),
      textValue(row.subject_kind ?? row.subjectKind),
      textValue(row.subject_id ?? row.subjectId),
      textValue(row.result_state ?? row.resultState),
      textValue(row.severity),
      textValue(row.reason),
    ]);
  }

  function buildArchitectureFitnessGapRows(rows) {
    return rows.map((row) => [
      textValue(row.scan_id ?? row.scanId),
      textValue(row.design_id ?? row.designId),
      textValue(row.gap_kind ?? row.gapKind),
      textValue(row.fitness_state ?? row.fitnessState),
      textValue(row.severity),
      textValue(row.source_prefix ?? row.sourcePrefix),
      textValue(row.target_prefix ?? row.targetPrefix),
      textValue(row.source_component_id ?? row.sourceComponentId),
      textValue(row.target_component_id ?? row.targetComponentId),
      textValue(row.relation_type ?? row.relationType),
      row.observation_count ?? row.observationCount ?? 0,
      row.test_observation_count ?? row.testObservationCount ?? 0,
      textValue(row.sample_source_path ?? row.sampleSourcePath),
      textValue(row.sample_import_literal ?? row.sampleImportLiteral),
      textValue(row.action_hint ?? row.actionHint),
    ]);
  }

  function observationSelect(activeSchemaName = defaultSchemaName) {
    return `
      select *
      from ${activeSchemaName}.component_dependency_observation_query`;
  }

  function pathMappingSelect(activeSchemaName = defaultSchemaName) {
    return `
      select *
      from ${activeSchemaName}.component_path_mapping_query`;
  }

  function dependencyClassificationSelect(activeSchemaName = defaultSchemaName) {
    return `
      select *
      from ${activeSchemaName}.component_dependency_classification_query`;
  }

  function fitnessSelect(activeSchemaName = defaultSchemaName) {
    return `
      select *
      from ${activeSchemaName}.component_fitness_query`;
  }

  function architectureFitnessGapSelect(activeSchemaName = defaultSchemaName) {
    return `
      select *
      from ${activeSchemaName}.component_fitness_gap_summary_query`;
  }

  async function readArchitectureDependencyObservationRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'design_id', filters.design);
    appendFilter(predicates, params, 'scan_id', filters.scan);
    appendFilter(predicates, params, 'source_path', filters.path || filters.sourcePath);
    appendFilter(predicates, params, 'target_path', filters.targetPath);
    appendComponentPairFilter(
      predicates,
      params,
      filters.component,
      'source_component_id',
      'target_component_id'
    );
    appendFilter(predicates, params, 'relation_type', filters.type);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${observationSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by scan_id desc, source_path, target_path, import_literal
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readArchitecturePathMappingRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'design_id', filters.design);
    appendFilter(predicates, params, 'scan_id', filters.scan);
    appendFilter(predicates, params, 'path_role', filters.role);
    appendFilter(predicates, params, 'path', filters.path);
    appendFilter(predicates, params, 'component_id', filters.component);
    appendFilter(predicates, params, 'mapping_state', filters.state);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${pathMappingSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by scan_id desc, path_role, path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readArchitectureDependencyClassificationRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'design_id', filters.design);
    appendFilter(predicates, params, 'scan_id', filters.scan);
    appendFilter(predicates, params, 'dependency_classification', filters.classification);
    appendComponentPairFilter(
      predicates,
      params,
      filters.component,
      'source_component_id',
      'target_component_id'
    );
    appendFilter(predicates, params, 'fitness_state', filters.state);
    appendFilter(predicates, params, 'relation_type', filters.type);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${dependencyClassificationSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case fitness_state when 'fail' then 1 when 'warning' then 2 else 3 end,
         dependency_classification,
         source_path,
         target_path
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readArchitectureFitnessRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'design_id', filters.design);
    appendFilter(predicates, params, 'scan_id', filters.scan);
    appendFilter(predicates, params, 'fitness_rule_id', filters.rule);
    appendFilter(predicates, params, 'subject_kind', filters.subjectKind);
    appendFilter(predicates, params, 'subject_id', filters.subject || filters.component);
    appendFilter(predicates, params, 'result_state', filters.state);
    appendFilter(predicates, params, 'severity', filters.severity);

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${fitnessSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case result_state when 'fail' then 1 when 'warning' then 2 when 'not_evaluated' then 3 else 4 end,
         fitness_rule_id,
         subject_kind,
         subject_id
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  async function readArchitectureFitnessGapRows(client, filters = {}) {
    const params = [];
    const predicates = [];
    appendFilter(predicates, params, 'design_id', filters.design);
    appendFilter(predicates, params, 'scan_id', filters.scan);
    appendFilter(predicates, params, 'gap_kind', filters.kind || filters.classification);
    appendFilter(predicates, params, 'fitness_state', filters.state);
    appendFilter(predicates, params, 'severity', filters.severity);
    appendComponentPairFilter(
      predicates,
      params,
      filters.component,
      'source_component_id',
      'target_component_id'
    );

    const limit = parseLimit(filters.limit, 50);
    params.push(limit);

    const result = await client.query(
      `${architectureFitnessGapSelect()}
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by
         case fitness_state when 'fail' then 1 when 'warning' then 2 else 3 end,
         observation_count desc,
         gap_kind,
         source_prefix,
         target_prefix
       limit $${params.length}`,
      params
    );

    return result.rows;
  }

  return {
    architectureFitnessGapSelect,
    buildArchitectureDependencyClassificationRows,
    buildArchitectureDependencyObservationRows,
    buildArchitectureFitnessGapRows,
    buildArchitectureFitnessRows,
    buildArchitecturePathMappingRows,
    dependencyClassificationSelect,
    fitnessSelect,
    observationSelect,
    pathMappingSelect,
    readArchitectureDependencyClassificationRows,
    readArchitectureDependencyObservationRows,
    readArchitectureFitnessGapRows,
    readArchitectureFitnessRows,
    readArchitecturePathMappingRows,
  };
}

module.exports = createComponentArchitectureFitnessReadModelComponent();
module.exports.createComponentArchitectureFitnessReadModelComponent =
  createComponentArchitectureFitnessReadModelComponent;
