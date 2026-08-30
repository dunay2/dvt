const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runPlanningDbQueryCli } = require('./planning-db-query-tests/helpers.cjs');
require('./planning-db-query-tests/feature-mechanization.test.cjs');
require('./planning-db-query-tests/fowler-analysis.test.cjs');
require('./planning-db-query-tests/governance-refresh.test.cjs');
require('./planning-db-query-tests/canvas-component-registry-drift.test.cjs');
require('./planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs');

const {
  buildDocsDispositionRows,
  buildComponentProfileRows,
  buildComponentEngineeringRecordRows,
  buildComponentEngineeringComponentDriftRows,
  buildComponentEngineeringComponentMetadataRows,
  buildComponentRoadmapRows,
  buildCanvasUxdbSpecificationRows,
  buildArchitectureComponentRows,
  buildArchitectureDependencyClassificationRows,
  buildArchitectureDependencyObservationRows,
  buildArchitectureDesignRows,
  buildComponentIntegrityRows,
  buildArchitectureFitnessGapRows,
  buildArchitectureFitnessRows,
  buildArchitectureIoRows,
  buildArchitecturePathMappingRows,
  buildArchitectureRelationRows,
  buildArchitectureTestRows,
  buildArchitectureObservabilityRows,
  buildRailVocabularyRows,
  buildCodeSymbolRows,
  buildCodeSymbolDuplicateRows,
  buildSourceDriftRows,
  buildGovernanceProblemRows,
  readArchitectureFlowRows,
  buildComponentEngineeringComponentTreeRows,
  buildComponentEngineeringQualityRows,
  buildGovernanceComponentRows,
  buildGovernanceCoverageRows,
  buildGovernanceDriftRows,
  buildGovernanceFileRows,
  buildGovernanceUnitRows,
  buildGovernanceRemediationRows,
  buildHashDriftRows,
  buildRiskDebtRows,
  buildAiProjectContext,
  buildPrReadinessRows,
  buildCommandQueryRailRows,
  buildCreationIntentRows,
  buildFrontendComponentFileRows,
  buildFrontendComponentRailRows,
  buildFrontendComponentRows,
  buildFrontendMechanicalTruthRows,
  buildKnowledgeIntakeReferenceRows,
  buildKnowledgeIntakeRetirementRows,
  buildDocumentationPanelRows,
  buildDocumentationLifecycleRows,
  buildDbSurfaceRows,
  buildSummaryRows,
  buildRepositoryCommandRows,
  buildComponentEngineeringRuleCatalogRows,
  buildComponentEngineeringRuleEvaluationRows,
  parseArgs,
  readGovernanceComponentRows,
  readGovernanceCoverageRows,
  readGovernanceDriftRows,
  readGovernanceFileRows,
  readGovernanceUnitRows,
  readGovernanceRemediationRows,
  readRiskDebtRows,
  readPrReadinessRows,
  readAiProjectContext,
  readCommandQueryRailRows,
  readCreationIntentRows,
  readFrontendComponentFileRows,
  readFrontendComponentRailRows,
  readFrontendComponentRows,
  readFrontendMechanicalTruthRows,
  readKnowledgeIntakeReferenceRows,
  readKnowledgeIntakeRetirementRows,
  readDocumentationPanelRows,
  readDocumentationLifecycleRows,
  readDbSurfaceRows,
  readDocsDispositionRows,
  readComponentProfileRows,
  readComponentEngineeringComponentDriftRows,
  readComponentEngineeringComponentMetadataRows,
  readComponentRoadmapRows,
  readCanvasUxdbSpecificationRows,
  readArchitectureComponentRows,
  readArchitectureDependencyClassificationRows,
  readArchitectureDependencyObservationRows,
  readArchitectureDesignRows,
  readComponentIntegrityRows,
  readArchitectureFitnessGapRows,
  readArchitectureFitnessRows,
  readArchitecturePathMappingRows,
  readArchitectureRelationRows,
  readArchitectureTestRows,
  readArchitectureObservabilityRows,
  readRailVocabularyRows,
  readCodeSymbolRows,
  readCodeSymbolDuplicateRows,
  readSourceDriftRows,
  readGovernanceProblemRows,
  readComponentEngineeringComponentTreeRows,
  readComponentEngineeringQualityRows,
  readComponentEngineeringRecordRows,
  readComponentEngineeringRuleCatalogRows,
  readComponentEngineeringRuleEvaluationRows,
  readRepositoryCommandRows,
  readHashDriftSummary,
  readSummary,
  formatQueryError,
  renderAiProjectContextMarkdown,
  resolveQueryName,
  runQuery,
} = require('./planning-db-query.cjs');

test('planning DB query CLI prints root help without opening a DB connection', () => {
  const result = runPlanningDbQueryCli(['--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB query CLI/);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /component-metadata/);
  assert.match(result.stdout, /canvas-uxdb-specification/);
  assert.doesNotMatch(result.stdout, /canvas-uxdb-traceability/);
  assert.match(result.stdout, /feature-mechanization/);
  assert.doesNotMatch(result.stderr, /Unknown planning DB query|Missing value/);
});

test('planning DB query CLI prints per-query help before parsing flag values', () => {
  const result = runPlanningDbQueryCli(['component-metadata', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB query: component-metadata/);
  assert.match(result.stdout, /pnpm planning:db:query component-metadata/);
  assert.match(result.stdout, /--component <id>/);
  assert.doesNotMatch(result.stderr, /Missing value for --help/);
});

test('planning DB query CLI documents command/query rail common filter', () => {
  const result = runPlanningDbQueryCli(['command-query-rails', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /--filter <value> \(task id, path, component, rail, or feature id where supported\)/
  );
  assert.match(
    result.stdout,
    /pnpm planning:db:query command-query-rails --filter RenderSourceImportCatalogView --limit 20/
  );
});

test('planning DB read-model query components live under the queries directory', () => {
  const planningDbDir = path.join(__dirname, 'planning-db');
  const misplacedQueryComponents = fs
    .readdirSync(planningDbDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('-query.cjs'));

  assert.deepEqual(misplacedQueryComponents, []);
});

test('planning DB query limit parsing lives in one canonical helper', () => {
  const queryLimitConsumers = [
    'planning-db-query.cjs',
    'planning-db/queries/canvas-component-registry-drift-query.cjs',
    'planning-db/queries/canvas-cq-rail-drift-query.cjs',
    'planning-db/frontend-component-inventory.cjs',
    'planning-db/frontend-mechanical-truth-inventory.cjs',
    'planning-db/queries/code-symbol-query.cjs',
    'planning-db/queries/canvas-uxdb-specification-query.cjs',
    'planning-db/queries/command-query-rail-query.cjs',
    'planning-db/queries/component-architecture-fitness-query.cjs',
    'planning-db/queries/component-integrity-query.cjs',
    'planning-db/queries/component-roadmap-query.cjs',
    'planning-db/queries/documentation-lifecycle-query.cjs',
    'planning-db/queries/documentation-panel-query.cjs',
    'planning-db/queries/feature-mechanization-query.cjs',
    'planning-db/queries/fowler-analysis-query.cjs',
    'planning-db/queries/governance-refresh-run-query.cjs',
    'planning-db/queries/knowledge-intake-retirement-query.cjs',
    'planning-db/queries/rail-vocabulary-query.cjs',
  ];
  const duplicateParsers = queryLimitConsumers.filter((relativePath) => {
    const content = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
    return /function parseLimit\s*\(/.test(content);
  });

  assert.deepEqual(duplicateParsers, []);

  const { parseLimit } = require('./planning-db/query-limit.cjs');
  assert.equal(parseLimit(undefined, 50), 50);
  assert.equal(parseLimit('', 50), 50);
  assert.equal(parseLimit('7', 50), 7);
  assert.throws(() => parseLimit('0', 50), /Invalid --limit "0"\. Expected a positive integer\./);
});

test('planning DB query filtering helpers live in one canonical helper', () => {
  const queryFilterConsumers = [
    'planning-db-query.cjs',
    'planning-db/queries/canvas-component-registry-drift-query.cjs',
    'planning-db/db-surface-inventory.cjs',
    'planning-db/queries/canvas-cq-rail-drift-query.cjs',
    'planning-db/frontend-component-inventory.cjs',
    'planning-db/frontend-mechanical-truth-inventory.cjs',
    'planning-db/queries/code-symbol-query.cjs',
    'planning-db/queries/canvas-uxdb-specification-query.cjs',
    'planning-db/queries/command-query-rail-query.cjs',
    'planning-db/queries/component-architecture-fitness-query.cjs',
    'planning-db/queries/component-integrity-query.cjs',
    'planning-db/queries/component-roadmap-query.cjs',
    'planning-db/queries/documentation-lifecycle-query.cjs',
    'planning-db/queries/documentation-panel-query.cjs',
    'planning-db/queries/feature-mechanization-query.cjs',
    'planning-db/queries/fowler-analysis-query.cjs',
    'planning-db/queries/governance-refresh-run-query.cjs',
    'planning-db/queries/knowledge-intake-retirement-query.cjs',
    'planning-db/queries/rail-vocabulary-query.cjs',
  ];
  const duplicateFilters = queryFilterConsumers.filter((relativePath) => {
    const content = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
    return /function append(?:Boolean|Component|ComponentEndpoint)?Filter\s*\(/.test(content);
  });

  assert.deepEqual(duplicateFilters, []);

  const {
    appendBooleanFilter,
    appendBooleanParamFilter,
    appendCompactTextSearchFilter,
    appendComponentPairFilter,
    appendFilter,
    normalizeCompactTextSearchValue,
  } = require('./planning-db/query-filter.cjs');
  const predicates = [];
  const params = [];

  appendFilter(predicates, params, 'component_id', undefined);
  appendFilter(predicates, params, 'component_id', '');
  appendFilter(predicates, params, 'component_id', 'SYS-WEB-ROOT');
  appendFilter(predicates, params, 'status', 'review');

  assert.deepEqual(predicates, ['component_id = $1', 'status = $2']);
  assert.deepEqual(params, ['SYS-WEB-ROOT', 'review']);

  const literalBooleanPredicates = [];
  appendBooleanFilter(literalBooleanPredicates, 'is_gap', undefined);
  appendBooleanFilter(literalBooleanPredicates, 'is_gap', true);
  appendBooleanFilter(literalBooleanPredicates, 'is_duplicate', false);

  assert.deepEqual(literalBooleanPredicates, ['is_gap is true', 'is_duplicate is false']);

  const parameterizedBooleanPredicates = [];
  const parameterizedBooleanParams = [];
  appendBooleanParamFilter(
    parameterizedBooleanPredicates,
    parameterizedBooleanParams,
    'is_gap',
    ''
  );
  appendBooleanParamFilter(
    parameterizedBooleanPredicates,
    parameterizedBooleanParams,
    'is_gap',
    true
  );

  assert.deepEqual(parameterizedBooleanPredicates, ['is_gap = $1']);
  assert.deepEqual(parameterizedBooleanParams, [true]);

  const componentPredicates = [];
  const componentParams = [];
  appendComponentPairFilter(
    componentPredicates,
    componentParams,
    'SYS-WEB-ROOT',
    'source_component_id',
    'target_component_id'
  );

  assert.deepEqual(componentPredicates, ['(source_component_id = $1 or target_component_id = $1)']);
  assert.deepEqual(componentParams, ['SYS-WEB-ROOT']);

  const compactSearchPredicates = [];
  const compactSearchParams = [];
  appendCompactTextSearchFilter(
    compactSearchPredicates,
    compactSearchParams,
    ['rail_name', 'ddd_owner'],
    'Source Import',
    {
      normalizedColumns: ['normalized_rail_name'],
      compactColumns: ['ddd_owner'],
    }
  );

  assert.equal(normalizeCompactTextSearchValue('Source Import'), 'sourceimport');
  assert.deepEqual(compactSearchPredicates, [
    "(lower(rail_name) like lower($1) or lower(ddd_owner) like lower($1) or normalized_rail_name like $2 or regexp_replace(lower(coalesce(ddd_owner, '')), '[^a-z0-9]', '', 'g') like $2)",
  ]);
  assert.deepEqual(compactSearchParams, ['%Source Import%', '%sourceimport%']);
});

test('planning DB query text formatting lives in one canonical helper', () => {
  const queryFormatConsumers = [
    'generate-db-surface-inventory.cjs',
    'generate-knowledge-intake-literature.cjs',
    'planning-db-surface-inventory-check.cjs',
    'planning-db/db-surface-inventory.cjs',
    'planning-db/queries/code-symbol-query.cjs',
    'planning-db/queries/component-architecture-fitness-query.cjs',
    'planning-db/queries/component-integrity-query.cjs',
    'planning-db/queries/component-roadmap-query.cjs',
    'planning-db/queries/documentation-panel-query.cjs',
    'planning-db/queries/fowler-analysis-query.cjs',
    'planning-db/queries/governance-refresh-run-query.cjs',
    'planning-db/queries/rail-vocabulary-query.cjs',
  ];
  const duplicateFormatters = queryFormatConsumers.filter((relativePath) => {
    const content = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
    return /function textValue\s*\(/.test(content);
  });

  assert.deepEqual(duplicateFormatters, []);

  const { textValue } = require('./planning-db/query-format.cjs');

  assert.equal(textValue(undefined), '-');
  assert.equal(textValue(null), '-');
  assert.equal(textValue('  component  '), 'component');
  assert.equal(textValue('   ', ''), '');
});

test('command/query rail query behavior lives in a focused read-model component', () => {
  const commandQueryRailQueryComponent = require('./planning-db/queries/command-query-rail-query.cjs');

  assert.equal(commandQueryRailQueryComponent.buildCommandQueryRailRows, buildCommandQueryRailRows);
  assert.equal(commandQueryRailQueryComponent.buildCreationIntentRows, buildCreationIntentRows);
  assert.equal(commandQueryRailQueryComponent.readCommandQueryRailRows, readCommandQueryRailRows);
  assert.equal(commandQueryRailQueryComponent.readCreationIntentRows, readCreationIntentRows);
});

test('frontend mechanical truth query behavior lives in a focused read-model component', () => {
  const frontendMechanicalTruthComponent = require('./planning-db/frontend-mechanical-truth-inventory.cjs');

  assert.equal(
    frontendMechanicalTruthComponent.buildFrontendMechanicalTruthRows,
    buildFrontendMechanicalTruthRows
  );
  assert.equal(
    frontendMechanicalTruthComponent.readFrontendMechanicalTruthRows,
    readFrontendMechanicalTruthRows
  );
});

test('frontend component reflection query behavior lives in a focused read-model component', () => {
  const frontendComponentReflectionComponent = require('./planning-db/frontend-component-inventory.cjs');

  assert.equal(
    frontendComponentReflectionComponent.buildFrontendComponentRows,
    buildFrontendComponentRows
  );
  assert.equal(
    frontendComponentReflectionComponent.buildFrontendComponentFileRows,
    buildFrontendComponentFileRows
  );
  assert.equal(
    frontendComponentReflectionComponent.buildFrontendComponentRailRows,
    buildFrontendComponentRailRows
  );
  assert.equal(
    frontendComponentReflectionComponent.readFrontendComponentRows,
    readFrontendComponentRows
  );
  assert.equal(
    frontendComponentReflectionComponent.readFrontendComponentFileRows,
    readFrontendComponentFileRows
  );
  assert.equal(
    frontendComponentReflectionComponent.readFrontendComponentRailRows,
    readFrontendComponentRailRows
  );
});

test('knowledge intake retirement query behavior lives in a focused read-model component', () => {
  const knowledgeIntakeRetirementComponent = require('./planning-db/queries/knowledge-intake-retirement-query.cjs');

  assert.equal(
    knowledgeIntakeRetirementComponent.buildKnowledgeIntakeRetirementRows,
    buildKnowledgeIntakeRetirementRows
  );
  assert.equal(typeof buildKnowledgeIntakeReferenceRows, 'function');
  assert.equal(
    knowledgeIntakeRetirementComponent.buildKnowledgeIntakeReferenceRows,
    buildKnowledgeIntakeReferenceRows
  );
  assert.equal(
    knowledgeIntakeRetirementComponent.readKnowledgeIntakeRetirementRows,
    readKnowledgeIntakeRetirementRows
  );
  assert.equal(typeof readKnowledgeIntakeReferenceRows, 'function');
  assert.equal(
    knowledgeIntakeRetirementComponent.readKnowledgeIntakeReferenceRows,
    readKnowledgeIntakeReferenceRows
  );
});

test('DB surface inventory query behavior lives in a focused read-model component', () => {
  const dbSurfaceInventoryComponent = require('./planning-db/db-surface-inventory.cjs');

  assert.equal(dbSurfaceInventoryComponent.buildDbSurfaceRows, buildDbSurfaceRows);
  assert.equal(dbSurfaceInventoryComponent.readDbSurfaceRows, readDbSurfaceRows);
});

test('documentation panel query behavior lives in a focused read-model component', () => {
  const documentationPanelComponent = require('./planning-db/queries/documentation-panel-query.cjs');

  assert.equal(
    documentationPanelComponent.buildDocumentationPanelRows,
    buildDocumentationPanelRows
  );
  assert.equal(documentationPanelComponent.readDocumentationPanelRows, readDocumentationPanelRows);
});

test('Canvas UX database specification query behavior lives in a focused read-model component', () => {
  const canvasSpecificationComponent = require('./planning-db/queries/canvas-uxdb-specification-query.cjs');

  assert.equal(
    canvasSpecificationComponent.buildCanvasUxdbSpecificationRows,
    buildCanvasUxdbSpecificationRows
  );
  assert.equal(
    canvasSpecificationComponent.readCanvasUxdbSpecificationRows,
    readCanvasUxdbSpecificationRows
  );
});

test('component architecture fitness query behavior lives in a focused read-model component', () => {
  const architectureFitnessComponent = require('./planning-db/queries/component-architecture-fitness-query.cjs');

  assert.equal(
    architectureFitnessComponent.buildArchitectureDependencyObservationRows,
    buildArchitectureDependencyObservationRows
  );
  assert.equal(
    architectureFitnessComponent.buildArchitecturePathMappingRows,
    buildArchitecturePathMappingRows
  );
  assert.equal(
    architectureFitnessComponent.buildArchitectureDependencyClassificationRows,
    buildArchitectureDependencyClassificationRows
  );
  assert.equal(
    architectureFitnessComponent.buildArchitectureFitnessRows,
    buildArchitectureFitnessRows
  );
  assert.equal(
    architectureFitnessComponent.buildArchitectureFitnessGapRows,
    buildArchitectureFitnessGapRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitectureDependencyObservationRows,
    readArchitectureDependencyObservationRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitecturePathMappingRows,
    readArchitecturePathMappingRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitectureDependencyClassificationRows,
    readArchitectureDependencyClassificationRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitectureFitnessRows,
    readArchitectureFitnessRows
  );
  assert.equal(
    architectureFitnessComponent.readArchitectureFitnessGapRows,
    readArchitectureFitnessGapRows
  );
});

test('component integrity query behavior lives in a focused read-model component', () => {
  const componentIntegrityComponent = require('./planning-db/queries/component-integrity-query.cjs');

  assert.equal(
    componentIntegrityComponent.buildComponentIntegrityRows,
    buildComponentIntegrityRows
  );
  assert.equal(componentIntegrityComponent.readComponentIntegrityRows, readComponentIntegrityRows);
});

test('rail vocabulary query behavior lives in a focused read-model component', () => {
  const railVocabularyComponent = require('./planning-db/queries/rail-vocabulary-query.cjs');

  assert.equal(railVocabularyComponent.buildRailVocabularyRows, buildRailVocabularyRows);
  assert.equal(railVocabularyComponent.readRailVocabularyRows, readRailVocabularyRows);
});

test('code symbol duplicate query behavior lives in a focused read-model component', () => {
  const codeSymbolComponent = require('./planning-db/queries/code-symbol-query.cjs');

  assert.equal(codeSymbolComponent.buildCodeSymbolRows, buildCodeSymbolRows);
  assert.equal(codeSymbolComponent.buildCodeSymbolDuplicateRows, buildCodeSymbolDuplicateRows);
  assert.equal(codeSymbolComponent.buildSourceDriftRows, buildSourceDriftRows);
  assert.equal(codeSymbolComponent.buildGovernanceProblemRows, buildGovernanceProblemRows);
  assert.equal(codeSymbolComponent.readCodeSymbolRows, readCodeSymbolRows);
  assert.equal(codeSymbolComponent.readCodeSymbolDuplicateRows, readCodeSymbolDuplicateRows);
  assert.equal(codeSymbolComponent.readSourceDriftRows, readSourceDriftRows);
  assert.equal(codeSymbolComponent.readGovernanceProblemRows, readGovernanceProblemRows);
});

test('buildComponentProfileRows groups component facts into operator sections', () => {
  const rows = buildComponentProfileRows({
    component: {
      component_id: 'SYS-RUNTIME-ENGINE-CORE',
      name: 'Runtime engine core',
      component_level: 'component',
      parent_component_id: 'SYS-RUNTIME-ROOT',
      governance_state: 'coverage-required',
      ddd_owner: 'Runtime / Engine',
      cq_rails: ['StartRun', 'GetRunStatus'],
    },
    children: [
      {
        component_id: 'SYS-RUNTIME-ENGINE-APPLICATION',
        name: 'Runtime engine application services',
        component_level: 'component',
        governance_state: 'coverage-required',
        direct_file_count: 6,
        descendant_file_count: 6,
      },
    ],
    files: [
      {
        path: 'packages/@dvt/engine/src/index.ts',
        component_unit: 'SYS-RUNTIME-ENGINE-CORE',
        owning_unit: 'SYS-RUNTIME-ENGINE-CORE',
        governance_state: 'coverage-required',
      },
    ],
    architectureComponents: [
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        kind: 'package',
        layer: 'application',
        owner: 'Runtime / Engine',
        repo_path: 'packages/@dvt/engine',
        public_contract: 'Execution engine package boundary.',
        status: 'review',
      },
    ],
    responsibilities: [
      {
        responsibility_id: 'RESP-ENGINE',
        responsibility: 'Own engine lifecycle.',
        reason_to_change: 'Runtime lifecycle changes.',
        ddd_owner: 'Runtime / Engine',
      },
    ],
    io: [
      {
        io_id: 'IO-ENGINE-PORT',
        io_kind: 'port',
        io_name: 'IWorkflowEngine',
        direction: 'inbound',
        contract_id: 'CONTRACT-ENGINE',
        runtime: 'node',
        metadata: { portKind: 'command' },
      },
      {
        io_id: 'IO-ENGINE-ADAPTER',
        io_kind: 'adapter',
        io_name: 'TemporalProviderAdapter',
        direction: 'outbound',
        runtime: 'node',
      },
    ],
    relations: [
      {
        relation_id: 'REL-ENGINE-CONTRACTS-DEPENDENCY',
        source_component_id: 'SYS-RUNTIME-ENGINE-CORE',
        target_component_id: 'SYS-CONTRACTS-ROOT',
        relation_type: 'depends_on',
        status: 'proposed',
      },
    ],
    contracts: [
      {
        contract_id: 'CONTRACT-ENGINE',
        contract_kind: 'public-api',
        contract_ref: 'docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md',
        status: 'review',
      },
    ],
    tests: [
      {
        test_id: 'TEST-ENGINE-LIFECYCLE',
        test_path: 'packages/@dvt/engine/test/lifecycle.test.ts',
        test_kind: 'integration',
        coverage_level: 'behavior',
        required: true,
        validation_command: 'pnpm --filter @dvt/engine test',
      },
    ],
    architectureDesigns: [
      {
        design_id: 'design-22-system-component-ownership-map',
        work_item_id: 'COMPONENT-OWNERSHIP-MAP-20260611',
        design_title: 'System component ownership map',
        scope_kind: 'may_create',
      },
    ],
    fowlerReferences: [
      {
        document_path: 'buzon/fowler.md',
        reference_state: 'linked',
        relation_type: 'analyzes',
        canonical_target_path: 'docs/architecture/components/engine/index.md',
        resolution_status: 'resolved',
      },
    ],
  });

  assert.deepEqual(rows, [
    [
      'component',
      'SYS-RUNTIME-ENGINE-CORE',
      'Runtime engine core',
      'component',
      'SYS-RUNTIME-ROOT',
      'coverage-required',
      'Runtime / Engine',
    ],
    [
      'child',
      'SYS-RUNTIME-ENGINE-APPLICATION',
      'Runtime engine application services',
      'component',
      'coverage-required',
      6,
      6,
    ],
    [
      'file',
      'packages/@dvt/engine/src/index.ts',
      'SYS-RUNTIME-ENGINE-CORE',
      'SYS-RUNTIME-ENGINE-CORE',
      'coverage-required',
    ],
    ['command', 'StartRun', 'SYS-RUNTIME-ENGINE-CORE', 'cq_rails'],
    ['query', 'GetRunStatus', 'SYS-RUNTIME-ENGINE-CORE', 'cq_rails'],
    ['port', 'IO-ENGINE-PORT', 'IWorkflowEngine', 'command', 'inbound', 'CONTRACT-ENGINE', 'node'],
    ['adapter', 'IO-ENGINE-ADAPTER', 'TemporalProviderAdapter', 'adapter', 'outbound', '-', 'node'],
    [
      'architecture',
      'SYS-RUNTIME-ENGINE-CORE',
      'package',
      'application',
      'Runtime / Engine',
      'packages/@dvt/engine',
      'review',
    ],
    [
      'responsibility',
      'RESP-ENGINE',
      'Own engine lifecycle.',
      'Runtime lifecycle changes.',
      'Runtime / Engine',
    ],
    [
      'relation',
      'REL-ENGINE-CONTRACTS-DEPENDENCY',
      'SYS-RUNTIME-ENGINE-CORE',
      'SYS-CONTRACTS-ROOT',
      'depends_on',
      'proposed',
    ],
    [
      'contract',
      'CONTRACT-ENGINE',
      'public-api',
      'docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md',
      'review',
    ],
    [
      'test',
      'TEST-ENGINE-LIFECYCLE',
      'packages/@dvt/engine/test/lifecycle.test.ts',
      'integration',
      'behavior',
      'true',
      'pnpm --filter @dvt/engine test',
    ],
    [
      'architecture-basis',
      'design-22-system-component-ownership-map',
      'COMPONENT-OWNERSHIP-MAP-20260611',
      'System component ownership map',
      'may_create',
    ],
    [
      'fowler',
      'buzon/fowler.md',
      'linked',
      'analyzes',
      'docs/architecture/components/engine/index.md',
      'resolved',
    ],
  ]);
});

test('resolveQueryName defaults to summary and rejects unknown query names', () => {
  assert.equal(resolveQueryName(undefined), 'summary');
  assert.equal(resolveQueryName('summary'), 'summary');
  assert.equal(resolveQueryName('hash-drift'), 'hash-drift');
  assert.equal(resolveQueryName('files'), 'files');
  assert.equal(resolveQueryName('components'), 'components');
  assert.equal(resolveQueryName('units'), 'units');
  assert.equal(resolveQueryName('coverage'), 'coverage');
  assert.equal(resolveQueryName('remediation'), 'remediation');
  assert.equal(resolveQueryName('debt'), 'debt');
  assert.equal(resolveQueryName('drift'), 'drift');
  assert.equal(resolveQueryName('commands'), 'commands');
  assert.equal(resolveQueryName('command-query-rails'), 'command-query-rails');
  assert.equal(resolveQueryName('ai-project-context'), 'ai-project-context');
  assert.equal(resolveQueryName('creation-intent'), 'creation-intent');
  assert.equal(resolveQueryName('frontend-surfaces'), 'frontend-surfaces');
  assert.equal(resolveQueryName('frontend-components'), 'frontend-components');
  assert.equal(resolveQueryName('frontend-component-files'), 'frontend-component-files');
  assert.equal(resolveQueryName('frontend-component-rails'), 'frontend-component-rails');
  assert.equal(resolveQueryName('feature-mechanization'), 'feature-mechanization');
  assert.equal(
    resolveQueryName('feature-mechanization-components'),
    'feature-mechanization-components'
  );
  assert.equal(resolveQueryName('feature-mechanization-symbols'), 'feature-mechanization-symbols');
  assert.equal(resolveQueryName('feature-mechanization-rails'), 'feature-mechanization-rails');
  assert.equal(
    resolveQueryName('feature-mechanization-validations'),
    'feature-mechanization-validations'
  );
  assert.equal(resolveQueryName('pr-readiness'), 'pr-readiness');
  assert.equal(resolveQueryName('docs-disposition'), 'docs-disposition');
  assert.equal(resolveQueryName('cer'), 'cer');
  assert.equal(resolveQueryName('knowledge-documents'), 'knowledge-documents');
  assert.equal(resolveQueryName('knowledge-actions'), 'knowledge-actions');
  assert.equal(resolveQueryName('fowler-analysis'), 'fowler-analysis');
  assert.equal(resolveQueryName('fowler-analysis-references'), 'fowler-analysis-references');
  assert.equal(resolveQueryName('fowler-analysis-retirement'), 'fowler-analysis-retirement');
  assert.equal(resolveQueryName('fowler-analysis-coverage'), 'fowler-analysis-coverage');
  assert.equal(resolveQueryName('fowler-analysis-intent'), 'fowler-analysis-intent');
  assert.equal(resolveQueryName('fowler-analysis-duplicates'), 'fowler-analysis-duplicates');
  assert.equal(resolveQueryName('mandatory-proposal-gaps'), 'mandatory-proposal-gaps');
  assert.equal(resolveQueryName('db-surfaces'), 'db-surfaces');
  assert.equal(resolveQueryName('component-tree'), 'component-tree');
  assert.equal(resolveQueryName('component-metadata'), 'component-metadata');
  assert.equal(resolveQueryName('component-drift'), 'component-drift');
  assert.equal(resolveQueryName('component-rules'), 'component-rules');
  assert.equal(resolveQueryName('component-rule-evaluations'), 'component-rule-evaluations');
  assert.equal(resolveQueryName('component-quality'), 'component-quality');
  assert.equal(resolveQueryName('component-profile'), 'component-profile');
  assert.equal(resolveQueryName('component-integrity'), 'component-integrity');
  assert.equal(resolveQueryName('component-validation'), 'component-validation');
  assert.equal(resolveQueryName('filesystem-coverage'), 'filesystem-coverage');
  assert.equal(resolveQueryName('rail-vocabulary'), 'rail-vocabulary');
  assert.equal(resolveQueryName('rail-duplicates'), 'rail-duplicates');
  assert.equal(resolveQueryName('code-symbols'), 'code-symbols');
  assert.equal(resolveQueryName('code-symbol-duplicates'), 'code-symbol-duplicates');
  assert.equal(
    resolveQueryName('code-symbol-semantic-candidates'),
    'code-symbol-semantic-candidates'
  );
  assert.equal(resolveQueryName('source-drift'), 'source-drift');
  assert.equal(resolveQueryName('governance-problem-dashboard'), 'governance-problem-dashboard');
  assert.equal(resolveQueryName('architecture-designs'), 'architecture-designs');
  assert.equal(resolveQueryName('architecture-components'), 'architecture-components');
  assert.equal(resolveQueryName('architecture-relations'), 'architecture-relations');
  assert.equal(resolveQueryName('architecture-flows'), 'architecture-flows');
  assert.equal(resolveQueryName('architecture-drift'), 'architecture-drift');
  assert.equal(resolveQueryName('architecture-enforcement'), 'architecture-enforcement');
  assert.equal(resolveQueryName('architecture-evidence'), 'architecture-evidence');
  assert.equal(
    resolveQueryName('architecture-dependency-observations'),
    'architecture-dependency-observations'
  );
  assert.equal(resolveQueryName('architecture-path-mapping'), 'architecture-path-mapping');
  assert.equal(
    resolveQueryName('architecture-dependency-classification'),
    'architecture-dependency-classification'
  );
  assert.equal(resolveQueryName('architecture-fitness'), 'architecture-fitness');
  assert.equal(resolveQueryName('architecture-fitness-gaps'), 'architecture-fitness-gaps');
  assert.equal(resolveQueryName('component-roadmap'), 'component-roadmap');
  assert.equal(resolveQueryName('documentation-panels'), 'documentation-panels');
  for (const retiredQuery of [
    'tasks',
    'open',
    'next',
    'dependencies',
    'evidence',
    'status-events',
    'artifacts',
    'feature-work',
    'task-references',
    'task-trace',
    'task-gaps',
    'focus',
    'real-work',
    'canvas-uxdb-traceability',
  ]) {
    assert.throws(
      () => resolveQueryName(retiredQuery),
      new RegExp(`Unknown planning DB query "${retiredQuery}"`)
    );
  }
  assert.throws(() => resolveQueryName('unknown'), /Unknown planning DB query "unknown"/);
});

test('parseArgs parses DB surface inventory query filters', () => {
  const command = parseArgs([
    'db-surfaces',
    '--surface',
    'Architecture design authority',
    '--state',
    'database',
    '--kind',
    'db_command',
    '--limit',
    '5',
  ]);

  assert.equal(command.queryName, 'db-surfaces');
  assert.equal(command.filters.surface, 'Architecture design authority');
  assert.equal(command.filters.state, 'database');
  assert.equal(command.filters.kind, 'db_command');
  assert.equal(command.filters.limit, 5);
});

test('parseArgs parses code symbol and source drift query filters', () => {
  assert.deepEqual(parseArgs(['code-symbols', '--component', 'SYS-WEB-ROOT', '--limit', '5']), {
    queryName: 'code-symbols',
    filters: {
      component: 'SYS-WEB-ROOT',
      limit: 5,
    },
  });

  assert.deepEqual(
    parseArgs([
      'code-symbol-duplicates',
      '--kind',
      'exact_body_duplicate',
      '--severity',
      'warning',
    ]),
    {
      queryName: 'code-symbol-duplicates',
      filters: {
        kind: 'exact_body_duplicate',
        severity: 'warning',
      },
    }
  );

  assert.deepEqual(parseArgs(['source-drift', '--path', 'buzon/TAREA.TXT', '--limit', '3']), {
    queryName: 'source-drift',
    filters: {
      path: 'buzon/TAREA.TXT',
      limit: 3,
    },
  });
});

test('parseArgs keeps architecture fitness state filters on the DB fitness state field', () => {
  const command = parseArgs([
    'architecture-fitness-gaps',
    '--state',
    'fail',
    '--kind',
    'undeclared_dependency',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'architecture-fitness-gaps',
    filters: {
      state: 'fail',
      kind: 'undeclared_dependency',
      limit: 5,
    },
  });
});

test('parseArgs rejects retired local task and lane queries', () => {
  assert.throws(() => parseArgs(['tasks', '--lane', 'C']), /Unknown planning DB query "tasks"/);
  assert.throws(
    () => parseArgs(['focus', '--filter', 'E-PROP-DISP-1']),
    /Unknown planning DB query "focus"/
  );
});

test('parseArgs rejects common --filter for queries without matching predicates', () => {
  for (const queryName of ['pr-readiness']) {
    assert.throws(
      () => parseArgs([queryName, '--filter', 'E-PROP-DISP-1']),
      new RegExp(`--filter is not supported for planning DB query "${queryName}"`)
    );
  }
});

test('parseArgs parses governance query filters for database governance inspection', () => {
  const command = parseArgs([
    'files',
    '--component',
    'SYS-DOCS-GOVERNANCE',
    '--state',
    'drift',
    '--path',
    'docs/planning/status/example.md',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'files',
    filters: {
      component: 'SYS-DOCS-GOVERNANCE',
      governanceState: 'drift',
      path: 'docs/planning/status/example.md',
      limit: 5,
    },
  });
});

test('parseArgs parses governance unit tree filters for database parent navigation', () => {
  const command = parseArgs([
    'units',
    '--unit',
    'SYS-API-ROOT',
    '--parent',
    'SYS-API',
    '--state',
    'coverage-required',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'units',
    filters: {
      component: 'SYS-API-ROOT',
      parentUnit: 'SYS-API',
      governanceState: 'coverage-required',
      limit: 5,
    },
  });
});

test('parseArgs parses repository command query filters for database catalog inspection', () => {
  const command = parseArgs([
    'commands',
    '--command-domain',
    'planning-db',
    '--type',
    'package_script',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'commands',
    filters: {
      commandDomain: 'planning-db',
      type: 'package_script',
      limit: 5,
    },
  });
});

test('parseArgs parses command/query rail catalog filters for database gap and duplicate inspection', () => {
  const command = parseArgs([
    'command-query-rails',
    '--type',
    'query',
    '--status',
    'missing-backend-rail',
    '--owner',
    'WidgetReadModel',
    '--duplicates',
    'true',
    '--gaps',
    'true',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'command-query-rails',
    filters: {
      type: 'query',
      status: 'missing-backend-rail',
      owner: 'WidgetReadModel',
      duplicates: true,
      gaps: true,
      limit: 5,
    },
  });
});

test('parseArgs maps command/query rail common filter to broad rail search', () => {
  const command = parseArgs(['command-query-rails', '--filter', 'Warehouse', '--limit', '5']);

  assert.deepEqual(command, {
    queryName: 'command-query-rails',
    filters: {
      search: 'Warehouse',
      limit: 5,
    },
  });
});

test('parseArgs parses AI project context format and discovery filters', () => {
  const command = parseArgs([
    'ai-project-context',
    '--format',
    'markdown',
    '--domain',
    'SYS-WEB',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'ai-project-context',
    outputFormat: 'markdown',
    filters: {
      domainUnit: 'SYS-WEB',
      limit: 5,
    },
  });

  assert.throws(
    () => parseArgs(['ai-project-context', '--format', 'html']),
    /Invalid --format "html"/
  );
});

test('parseArgs parses frontend mechanical truth filters for database screen inspection', () => {
  const command = parseArgs([
    'frontend-surfaces',
    '--kind',
    'route',
    '--state',
    'preview',
    '--path',
    '/canvas',
    '--owner',
    'Canvas workbench',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'frontend-surfaces',
    filters: {
      kind: 'route',
      state: 'preview',
      path: '/canvas',
      owner: 'Canvas workbench',
      limit: 5,
    },
  });
});

test('parseArgs parses frontend component reflection filters for database component inspection', () => {
  assert.deepEqual(parseArgs(['frontend-components', '--filter', 'SourceImport', '--limit', '5']), {
    queryName: 'frontend-components',
    filters: {
      search: 'SourceImport',
      limit: 5,
    },
  });

  assert.deepEqual(
    parseArgs([
      'frontend-components',
      '--component',
      'web.component.canvas.CanvasToolbar',
      '--kind',
      'route-toolbar',
      '--state',
      'current',
      '--owner',
      'Canvas workbench',
      '--surface',
      'web.canvas.graph',
      '--limit',
      '5',
    ]),
    {
      queryName: 'frontend-components',
      filters: {
        component: 'web.component.canvas.CanvasToolbar',
        kind: 'route-toolbar',
        state: 'current',
        owner: 'Canvas workbench',
        surface: 'web.canvas.graph',
        limit: 5,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'frontend-component-files',
      '--component',
      'web.component.canvas.CanvasToolbar',
      '--kind',
      'component',
      '--path',
      'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
      '--limit',
      '3',
    ]),
    {
      queryName: 'frontend-component-files',
      filters: {
        component: 'web.component.canvas.CanvasToolbar',
        kind: 'component',
        path: 'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
        limit: 3,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'frontend-component-rails',
      '--component',
      'web.component.canvas.CanvasToolbar',
      '--rail',
      'PreviewExecutionPlan',
      '--kind',
      'command',
      '--status',
      'implemented-api',
      '--limit',
      '4',
    ]),
    {
      queryName: 'frontend-component-rails',
      filters: {
        component: 'web.component.canvas.CanvasToolbar',
        rail: 'PreviewExecutionPlan',
        kind: 'command',
        status: 'implemented-api',
        limit: 4,
      },
    }
  );
});

test('parseArgs parses creation intent preflight filters for AI reuse checks', () => {
  const command = parseArgs([
    'creation-intent',
    '--intent',
    'I want to create ListWidgets',
    '--type',
    'query',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'creation-intent',
    filters: {
      intent: 'I want to create ListWidgets',
      type: 'query',
      limit: 5,
    },
  });
});

test('parseArgs parses component integrity and rail vocabulary validation filters', () => {
  assert.deepEqual(
    parseArgs([
      'component-integrity',
      '--component',
      'SYS-WEB-ROOT',
      '--kind',
      'fitness_gap',
      '--state',
      'fail',
      '--severity',
      'error',
      '--limit',
      '5',
    ]),
    {
      queryName: 'component-integrity',
      filters: {
        component: 'SYS-WEB-ROOT',
        kind: 'fitness_gap',
        state: 'fail',
        severity: 'error',
        limit: 5,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'rail-vocabulary',
      '--rail',
      'ApiCreateWidget',
      '--kind',
      'surface_named_rail',
      '--state',
      'active',
      '--limit',
      '5',
    ]),
    {
      queryName: 'rail-vocabulary',
      filters: {
        rail: 'ApiCreateWidget',
        kind: 'surface_named_rail',
        state: 'active',
        limit: 5,
      },
    }
  );

  assert.equal(resolveQueryName('rail-duplicates'), 'rail-duplicates');
  assert.equal(resolveQueryName('filesystem-coverage'), 'filesystem-coverage');
  assert.equal(resolveQueryName('component-validation'), 'component-validation');
});

test('parseArgs requires an intent before querying creation preflight', () => {
  assert.throws(
    () => parseArgs(['creation-intent', '--limit', '5']),
    /creation-intent requires --intent/
  );
});

test('buildCommandQueryRailRows shows rail implementation, gap, and duplicate state', () => {
  assert.deepEqual(
    buildCommandQueryRailRows([
      {
        rail_type: 'query',
        rail_name: 'ListWidgets',
        ddd_owner: 'WidgetReadModel',
        rail_status: 'declared',
        implementation_ref_count: 2,
        is_gap: false,
        is_duplicate: true,
        feature_id: 'EXAMPLE-FEATURE',
        source_path: 'docs/planning/proposals/mandatory/example.md',
      },
    ]),
    [
      [
        'query',
        'ListWidgets',
        'WidgetReadModel',
        'declared',
        'implemented',
        'duplicate',
        'EXAMPLE-FEATURE',
        'docs/planning/proposals/mandatory/example.md',
      ],
    ]
  );
});

test('buildCreationIntentRows turns rail matches into AI pre-create guidance', () => {
  assert.deepEqual(
    buildCreationIntentRows([
      {
        rail_type: 'query',
        rail_name: 'ListWidgets',
        ddd_owner: 'WidgetReadModel',
        rail_status: 'declared',
        implementation_ref_count: 2,
        documentation_ref_count: 1,
        is_gap: false,
        is_duplicate: false,
        intent_match_score: 42,
        feature_id: 'EXAMPLE-FEATURE',
        source_path: 'docs/planning/proposals/mandatory/example.md',
      },
      {
        rail_type: 'command',
        rail_name: 'CreateWidget',
        ddd_owner: 'WidgetAggregate',
        rail_status: 'planned',
        implementation_ref_count: 0,
        documentation_ref_count: 2,
        is_gap: true,
        is_duplicate: true,
        intent_match_score: 18,
        feature_id: 'WIDGET-FEATURE',
        source_path: 'docs/planning/proposals/mandatory/widget.md',
      },
      {
        rail_type: 'query',
        rail_name: 'ResolveLegacyWidgets',
        ddd_owner: 'LegacyWidgetReadModel',
        rail_status: 'retired',
        implementation_ref_count: 1,
        documentation_ref_count: 1,
        is_gap: false,
        is_duplicate: false,
        intent_match_score: 12,
        feature_id: 'LEGACY-WIDGET-FEATURE',
        source_path: 'docs/planning/proposals/mandatory/legacy-widget.md',
      },
    ]),
    [
      [
        'reuse-existing-rail',
        'query',
        'ListWidgets',
        'WidgetReadModel',
        'declared',
        'implemented',
        '-',
        42,
        'EXAMPLE-FEATURE',
        'docs/planning/proposals/mandatory/example.md',
      ],
      [
        'resolve-duplicate-before-creating',
        'command',
        'CreateWidget',
        'WidgetAggregate',
        'planned',
        'gap',
        'duplicate',
        18,
        'WIDGET-FEATURE',
        'docs/planning/proposals/mandatory/widget.md',
      ],
      [
        'retired-rail-do-not-reuse',
        'query',
        'ResolveLegacyWidgets',
        'LegacyWidgetReadModel',
        'retired',
        'implemented',
        '-',
        12,
        'LEGACY-WIDGET-FEATURE',
        'docs/planning/proposals/mandatory/legacy-widget.md',
      ],
    ]
  );
});

test('buildCreationIntentRows explicitly reports when no existing rail matches', () => {
  assert.deepEqual(buildCreationIntentRows([], { intent: 'Create Widget dashboard' }), [
    [
      'register-new-rail-before-creating',
      '-',
      'Create Widget dashboard',
      '-',
      'no-existing-rail',
      'gap',
      '-',
      0,
      '-',
      'docs/architecture/command-query-rail-governance.md',
    ],
  ]);
});

test('buildRailVocabularyRows shows canonical rail vocabulary findings', () => {
  assert.deepEqual(
    buildRailVocabularyRows([
      {
        finding_kind: 'semantic_duplicate',
        severity: 'error',
        rail_type: 'query',
        rail_name: 'ApiListWidgetsQuery',
        canonical_name: 'ListWidgets',
        bounded_context: 'Planning DB',
        ddd_owner: 'WidgetReadModel',
        rail_status: 'implemented',
        vocabulary_state: 'active',
        duplicate_count: 2,
        action_hint: 'Choose one canonical rail name and deprecate aliases.',
        source_path: 'docs/planning/proposals/mandatory/example.md',
      },
    ]),
    [
      [
        'semantic_duplicate',
        'error',
        'query',
        'ApiListWidgetsQuery',
        'ListWidgets',
        'Planning DB',
        'WidgetReadModel',
        'implemented',
        'active',
        2,
        'Choose one canonical rail name and deprecate aliases.',
        'docs/planning/proposals/mandatory/example.md',
      ],
    ]
  );
});

test('buildCodeSymbolRows shows code symbols with component ownership', () => {
  assert.deepEqual(
    buildCodeSymbolRows([
      {
        symbol_id: 'sym-1',
        symbol_name: 'parseLimit',
        symbol_kind: 'function',
        component_id: 'SYS-CI-TOOLS-PLANNING-DB',
        file_path: 'scripts/planning-db-query.cjs',
        start_line: 517,
        end_line: 528,
        body_sha256: 'abc123',
        normalized_body_length: 226,
      },
    ]),
    [
      [
        'sym-1',
        'parseLimit',
        'function',
        'SYS-CI-TOOLS-PLANNING-DB',
        'scripts/planning-db-query.cjs',
        517,
        528,
        'abc123',
        226,
      ],
    ]
  );
});

test('buildCodeSymbolDuplicateRows shows duplicate function findings', () => {
  assert.deepEqual(
    buildCodeSymbolDuplicateRows([
      {
        finding_kind: 'exact_body_duplicate',
        severity: 'warning',
        duplicate_key: 'body:abc123',
        symbol_name: 'parseLimit',
        component_id: 'SYS-CI-TOOLS-PLANNING-DB',
        source_path: 'scripts/planning-db-query.cjs',
        start_line: 517,
        duplicate_count: 14,
        action_hint:
          'Extract one canonical helper or document why local duplication is intentional.',
      },
    ]),
    [
      [
        'exact_body_duplicate',
        'warning',
        'body:abc123',
        'parseLimit',
        'SYS-CI-TOOLS-PLANNING-DB',
        'scripts/planning-db-query.cjs',
        517,
        14,
        'Extract one canonical helper or document why local duplication is intentional.',
      ],
    ]
  );
});

test('buildSourceDriftRows shows governed references to missing tracked files', () => {
  assert.deepEqual(
    buildSourceDriftRows([
      {
        finding_kind: 'missing_source_file',
        severity: 'error',
        source_path: 'buzon/TAREA.TXT',
        source_table: 'planning_query_store.command_query_rails',
        reference_count: 2,
        action_hint: 'Repoint the governed source or retire the stale row explicitly.',
      },
    ]),
    [
      [
        'missing_source_file',
        'error',
        'buzon/TAREA.TXT',
        'planning_query_store.command_query_rails',
        2,
        'Repoint the governed source or retire the stale row explicitly.',
      ],
    ]
  );
});

test('buildComponentIntegrityRows shows component validation findings', () => {
  assert.deepEqual(
    buildComponentIntegrityRows([
      {
        finding_kind: 'fitness_gap',
        severity: 'error',
        component_id: 'SYS-WEB-ROOT',
        component_name: 'Web root',
        finding_state: 'fail',
        path: 'apps/web/src/App.tsx',
        related_component_id: 'SYS-WEB-APP-BOOTSTRAP',
        relation_id: 'REL-AUTO-WEB-ROOT-WEB-APP-BOOTSTRAP',
        evidence_count: 31,
        action_hint: 'Record architecture.component_relation or refactor the dependency.',
        source_view: 'architecture.component_fitness_gap_summary_query',
      },
    ]),
    [
      [
        'fitness_gap',
        'error',
        'SYS-WEB-ROOT',
        'Web root',
        'fail',
        'apps/web/src/App.tsx',
        'SYS-WEB-APP-BOOTSTRAP',
        'REL-AUTO-WEB-ROOT-WEB-APP-BOOTSTRAP',
        31,
        'Record architecture.component_relation or refactor the dependency.',
        'architecture.component_fitness_gap_summary_query',
      ],
    ]
  );
});

test('buildDbSurfaceRows shows DB authority and authority mode for operators', () => {
  assert.deepEqual(
    buildDbSurfaceRows([
      {
        surface_name: 'Architecture design authority',
        authority_mode: 'database',
        write_rail_kind: 'db_command',
        read_query_rail: 'pnpm planning:db:query architecture-designs',
        source_ref: 'tools/planning-db/schema.sql',
        database_write_eligible: true,
        revision: 0,
        updated_by: 'migration',
      },
    ]),
    [
      [
        'Architecture design authority',
        'database',
        'db_command',
        'true',
        '0',
        'migration',
        'tools/planning-db/schema.sql',
      ],
    ]
  );
});

test('buildDocumentationLifecycleRows shows lifecycle facts without prose parsing', () => {
  assert.deepEqual(
    buildDocumentationLifecycleRows([
      {
        lifecycle_gap_kind: 'proposal_missing_canonical',
        lifecycle_state: 'proposed',
        canonicality: 'proposal',
        duplicate_count: 1,
        canonical_counterpart_count: 0,
        proposal_counterpart_count: 2,
        closeout_counterpart_count: 0,
        open_action_count: 3,
        document_path: 'docs/planning/proposals/mandatory/example.md',
        subject_key: 'example',
        title: 'Example Plan',
      },
    ]),
    [
      [
        'proposal_missing_canonical',
        'proposed',
        'proposal',
        1,
        0,
        2,
        0,
        3,
        'docs/planning/proposals/mandatory/example.md',
        'example',
        'Example Plan',
      ],
    ]
  );
});

test('knowledge intake lifecycle query modules expose canonical rails', () => {
  const railSources = [
    [
      ['List', 'Knowledge', 'Intake', 'Retirement'].join(''),
      'planning-db/queries/knowledge-intake-retirement-query.cjs',
    ],
    [
      ['List', 'Documentation', 'Lifecycle', 'Facts'].join(''),
      'planning-db/queries/documentation-lifecycle-query.cjs',
    ],
  ];
  const ownSource = fs.readFileSync(__filename, 'utf8');

  for (const [railName, sourcePath] of railSources) {
    assert.doesNotMatch(
      ownSource,
      new RegExp(`\\b${railName}\\b`),
      'the query test must not be indexed as a rail implementation surface'
    );

    const source = fs.readFileSync(path.join(__dirname, sourcePath), 'utf8');
    assert.match(source, new RegExp(`\\b${railName}\\b`));
  }
});

test('parseArgs parses docs disposition queue filters for database cleanup work', () => {
  const command = parseArgs([
    'docs-disposition',
    '--priority',
    'P1',
    '--kind',
    'unknown_task_like_id',
    '--path',
    'docs/planning/status/example.md',
    '--resolution',
    'all',
    '--limit',
    '5',
  ]);

  assert.deepEqual(command, {
    queryName: 'docs-disposition',
    filters: {
      priority: 'P1',
      kind: 'unknown_task_like_id',
      path: 'docs/planning/status/example.md',
      resolution: 'all',
      limit: 5,
    },
  });
});

test('parseArgs parses planning knowledge filters', () => {
  assert.deepEqual(parseArgs(['knowledge-documents', '--type', 'proposal', '--limit', '5']), {
    queryName: 'knowledge-documents',
    filters: {
      type: 'proposal',
      limit: 5,
    },
  });

  assert.deepEqual(parseArgs(['knowledge-actions', '--status', 'proposed', '--path', 'x.md']), {
    queryName: 'knowledge-actions',
    filters: {
      status: 'proposed',
      path: 'x.md',
    },
  });

  assert.deepEqual(
    parseArgs(['knowledge-intake', '--references', '--path', 'buzon/example.md', '--limit', '7']),
    {
      queryName: 'knowledge-intake',
      filters: {
        references: true,
        path: 'buzon/example.md',
        limit: 7,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'knowledge-intake',
      '--state',
      'unclassified',
      '--type',
      'fowler_analysis',
      '--path',
      'buzon/example.md',
      '--limit',
      '7',
    ]),
    {
      queryName: 'knowledge-intake',
      filters: {
        state: 'unclassified',
        type: 'fowler_analysis',
        path: 'buzon/example.md',
        limit: 7,
      },
    }
  );
});

test('parseArgs parses documentation lifecycle logic filters', () => {
  assert.deepEqual(
    parseArgs([
      'documentation-lifecycle',
      '--gaps',
      'true',
      '--duplicates',
      'false',
      '--canonicality',
      'proposal',
      '--state',
      'proposed',
      '--kind',
      'proposal_missing_canonical',
      '--subject',
      'canvas-modeler',
      '--limit',
      '9',
    ]),
    {
      queryName: 'documentation-lifecycle',
      filters: {
        gaps: true,
        duplicates: false,
        canonicality: 'proposal',
        state: 'proposed',
        kind: 'proposal_missing_canonical',
        subject: 'canvas-modeler',
        limit: 9,
      },
    }
  );
});

test('parseArgs parses documentation panel query filters', () => {
  assert.deepEqual(
    parseArgs([
      'documentation-panels',
      '--component',
      'SYS-WEB-ROOT',
      '--path',
      'docs/architecture/components/web/index.md',
      '--state',
      'ready',
      '--kind',
      'missing_required_section',
      '--type',
      'component',
      '--surface',
      'properties',
      '--subject',
      'overview',
      '--gaps',
      'false',
      '--limit',
      '9',
    ]),
    {
      queryName: 'documentation-panels',
      filters: {
        component: 'SYS-WEB-ROOT',
        path: 'docs/architecture/components/web/index.md',
        state: 'ready',
        kind: 'missing_required_section',
        type: 'component',
        surface: 'properties',
        subject: 'overview',
        gaps: false,
        limit: 9,
      },
    }
  );
});

test('parseArgs parses component roadmap query filters', () => {
  assert.deepEqual(
    parseArgs([
      'component-roadmap',
      '--component',
      'docs/architecture/components/web/index.md',
      '--state',
      'planned',
      '--kind',
      'planned_component_missing_db_component',
      '--path',
      'docs/planning/proposals/mandatory/governance-and-docs/example.md',
      '--gaps',
      'true',
      '--limit',
      '9',
    ]),
    {
      queryName: 'component-roadmap',
      filters: {
        component: 'docs/architecture/components/web/index.md',
        state: 'planned',
        kind: 'planned_component_missing_db_component',
        path: 'docs/planning/proposals/mandatory/governance-and-docs/example.md',
        gaps: true,
        limit: 9,
      },
    }
  );
});

test('parseArgs normalizes open resolution filters to pending', () => {
  assert.deepEqual(parseArgs(['docs-disposition', '--resolution', 'open']), {
    queryName: 'docs-disposition',
    filters: {
      resolution: 'pending',
    },
  });
});

test('parseArgs rejects unknown resolution filters before querying the DB', () => {
  assert.throws(
    () => parseArgs(['docs-disposition', '--resolution', 'stale']),
    /Invalid --resolution "stale"/
  );
});

test('parseArgs parses risk debt query filters for database debt work selection', () => {
  const command = parseArgs([
    'debt',
    '--priority',
    'P1',
    '--status',
    'Open',
    '--component',
    'SYS-PLANNING-DB',
    '--path',
    'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
    '--limit',
    '10',
  ]);

  assert.deepEqual(command, {
    queryName: 'debt',
    filters: {
      priority: 'P1',
      status: 'Open',
      component: 'SYS-PLANNING-DB',
      path: 'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
      limit: 10,
    },
  });
});

test('parseArgs parses component engineering record filters for database governance inspection', () => {
  const command = parseArgs(['cer', '--component', 'SYS-API-HTTP-ENTRYPOINTS', '--limit', '1']);

  assert.deepEqual(command, {
    queryName: 'cer',
    filters: {
      component: 'SYS-API-HTTP-ENTRYPOINTS',
      limit: 1,
    },
  });
});

test('parseArgs parses component engineering record schema version filters', () => {
  const command = parseArgs([
    'cer',
    '--component',
    'SYS-API-HTTP-ENTRYPOINTS',
    '--schema-version',
    'v2',
    '--limit',
    '1',
  ]);

  assert.deepEqual(command, {
    queryName: 'cer',
    filters: {
      component: 'SYS-API-HTTP-ENTRYPOINTS',
      schemaVersion: 'v2',
      limit: 1,
    },
  });
});

test('parseArgs parses component engineering rule filters', () => {
  assert.deepEqual(
    parseArgs(['component-tree', '--children-of', 'SYS-RUNTIME-ENGINE-CORE', '--limit', '20']),
    {
      queryName: 'component-tree',
      filters: {
        parentUnit: 'SYS-RUNTIME-ENGINE-CORE',
        limit: 20,
      },
    }
  );

  assert.deepEqual(parseArgs(['component-tree', '--parent-unit', 'SYS-RUNTIME-ENGINE-CORE']), {
    queryName: 'component-tree',
    filters: {
      parentUnit: 'SYS-RUNTIME-ENGINE-CORE',
    },
  });

  assert.deepEqual(parseArgs(['component-rules', '--kind', 'responsibility', '--limit', '5']), {
    queryName: 'component-rules',
    filters: {
      kind: 'responsibility',
      limit: 5,
    },
  });

  assert.deepEqual(
    parseArgs([
      'component-rule-evaluations',
      '--component',
      'SYS-RUNTIME-ENGINE-CORE',
      '--state',
      'fail',
      '--kind',
      'CEI-ID-002',
      '--limit',
      '5',
    ]),
    {
      queryName: 'component-rule-evaluations',
      filters: {
        component: 'SYS-RUNTIME-ENGINE-CORE',
        governanceState: 'fail',
        kind: 'CEI-ID-002',
        limit: 5,
      },
    }
  );

  assert.deepEqual(parseArgs(['component-quality', '--component', 'SYS-RUNTIME-ENGINE-CORE']), {
    queryName: 'component-quality',
    filters: {
      component: 'SYS-RUNTIME-ENGINE-CORE',
    },
  });

  assert.deepEqual(
    parseArgs([
      'component-metadata',
      '--component',
      'SYS-RUNTIME-ENGINE-CORE',
      '--state',
      'coverage-required',
      '--no-refresh',
    ]),
    {
      queryName: 'component-metadata',
      autoImportGovernance: false,
      filters: {
        component: 'SYS-RUNTIME-ENGINE-CORE',
        governanceState: 'coverage-required',
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'component-metadata',
      '--component',
      'SYS-RUNTIME-ENGINE-CORE',
      '--state',
      'coverage-required',
      '--refresh',
      '--confirm-expensive-governance-refresh',
    ]),
    {
      queryName: 'component-metadata',
      autoImportGovernance: true,
      filters: {
        component: 'SYS-RUNTIME-ENGINE-CORE',
        governanceState: 'coverage-required',
      },
    }
  );
});

test('parseArgs requires explicit confirmation before query-time governance refresh', () => {
  assert.throws(
    () => parseArgs(['component-tree', '--refresh']),
    /--refresh requires --confirm-expensive-governance-refresh/
  );
  assert.throws(
    () => parseArgs(['component-tree', '--confirm-expensive-governance-refresh']),
    /--confirm-expensive-governance-refresh requires --refresh/
  );
  assert.throws(
    () =>
      parseArgs([
        'component-tree',
        '--refresh',
        '--confirm-expensive-governance-refresh',
        '--no-refresh',
      ]),
    /Cannot combine --refresh and --no-refresh/
  );
  assert.throws(
    () => parseArgs(['summary', '--refresh', '--confirm-expensive-governance-refresh']),
    /--refresh is only valid for governance projection queries/
  );
});

test('parseArgs parses architecture authority query filters', () => {
  assert.deepEqual(
    parseArgs([
      'architecture-designs',
      '--design',
      'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
      '--status',
      'review',
      '--owner',
      'Architecture',
      '--limit',
      '5',
    ]),
    {
      queryName: 'architecture-designs',
      filters: {
        design: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
        status: 'review',
        owner: 'Architecture',
        limit: 5,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'architecture-components',
      '--component',
      'SYS-RUNTIME-ENGINE-CORE',
      '--kind',
      'module',
      '--layer',
      'application',
    ]),
    {
      queryName: 'architecture-components',
      filters: {
        component: 'SYS-RUNTIME-ENGINE-CORE',
        kind: 'module',
        layer: 'application',
      },
    }
  );
});

test('parseArgs rejects unsupported component engineering record schema versions', () => {
  assert.throws(
    () => parseArgs(['cer', '--schema-version', 'v3']),
    /Invalid --schema-version "v3". Expected v1 or v2./
  );
});

test('formatQueryError preserves nested connection failures for unavailable DB', () => {
  const ipv6Error = Object.assign(new Error('connect ECONNREFUSED ::1:55432'), {
    code: 'ECONNREFUSED',
  });
  const ipv4Error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:55432'), {
    code: 'ECONNREFUSED',
  });
  const error = new AggregateError([ipv6Error, ipv4Error]);

  const message = formatQueryError(error);

  assert.match(message, /Planning DB is unavailable/);
  assert.match(message, /connect ECONNREFUSED ::1:55432/);
  assert.match(message, /connect ECONNREFUSED 127\.0\.0\.1:55432/);
  assert.match(message, /pnpm planning:db:up/);
  assert.doesNotMatch(message, /then `pnpm planning:db:import`/u);
  assert.match(message, /bootstrap or recovery/iu);
});

test('runQuery does not refresh governance projections by default for database reads', async () => {
  const events = [];
  const client = {
    async query(sql, params) {
      events.push(['query', sql, params]);
      return {
        rows: [
          {
            component_id: 'SYS-RUNTIME-ENGINE-CORE',
            name: 'Runtime engine core',
            component_level: 'component',
            parent_component_id: 'SYS-RUNTIME-ROOT',
            governance_state: 'coverage-required',
            direct_file_count: 0,
            descendant_file_count: 189,
            ddd_owner: 'AS',
            is_leaf_component: false,
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'component-tree',
    filters: { component: 'SYS-RUNTIME-ENGINE-CORE' },
    databaseUrl: 'postgresql://example/db',
    client,
    print: false,
    runPlanningImport: async () => {
      throw new Error('database query must not import governance by default');
    },
  });

  assert.equal(events[0][0], 'query');
  assert.deepEqual(rows[0], [
    'SYS-RUNTIME-ENGINE-CORE',
    'Runtime engine core',
    'component',
    'SYS-RUNTIME-ROOT',
    'coverage-required',
    0,
    189,
    'AS',
    'false',
  ]);
});

test('runQuery refreshes stale governance projections only when explicitly requested', async () => {
  const events = [];
  const client = {
    async query(sql, params) {
      events.push(['query', sql, params]);
      return {
        rows: [
          {
            component_id: 'SYS-RUNTIME-ENGINE-CORE',
            name: 'Runtime engine core',
            component_level: 'component',
            parent_component_id: 'SYS-RUNTIME-ROOT',
            governance_state: 'coverage-required',
            direct_file_count: 0,
            descendant_file_count: 189,
            ddd_owner: 'AS',
            is_leaf_component: false,
          },
        ],
      };
    },
  };
  const importMessages = [];

  const rows = await runQuery({
    queryName: 'component-tree',
    filters: { component: 'SYS-RUNTIME-ENGINE-CORE' },
    autoImportGovernance: true,
    databaseUrl: 'postgresql://example/db',
    client,
    print: false,
    logger: { error: (message) => importMessages.push(message) },
    runPlanningImport: async (options, deps) => {
      events.push(['import', options, Boolean(deps?.logger)]);
      return {
        importedScopes: ['governance'],
        skippedScopes: [],
        governanceFiles: 4487,
        governanceComponents: 57,
        governanceRemediationTasks: 39,
      };
    },
  });

  assert.deepEqual(events[0][0], 'import');
  assert.deepEqual(events[0][1], {
    databaseUrl: 'postgresql://example/db',
    ifStale: true,
    silent: true,
  });
  assert.equal(events[1][0], 'query');
  assert.deepEqual(rows[0], [
    'SYS-RUNTIME-ENGINE-CORE',
    'Runtime engine core',
    'component',
    'SYS-RUNTIME-ROOT',
    'coverage-required',
    0,
    189,
    'AS',
    'false',
  ]);
  assert.deepEqual(importMessages, [
    '[planning:db:query] refreshed stale governance projection before component-tree',
  ]);
});

test('runQuery rejects the retired local task surface before opening the database', async () => {
  await assert.rejects(
    () => runQuery({ queryName: 'tasks', print: false }),
    /Unknown planning DB query "tasks"/
  );
});

test('buildSummaryRows exposes architecture and governance counts without local task state', () => {
  const rows = buildSummaryRows({
    governanceFiles: 4255,
    driftFiles: 41,
    legacyFiles: 0,
    governanceComponents: 32,
    governanceComponentFiles: 4255,
    governanceFingerprints: 4255,
    governanceCoverageRows: 128,
    governanceRemediationTasks: 43,
    governanceRemediationP0: 3,
    repositoryCommands: 220,
    repositoryCommandUnknown: 4,
    repositoryCommandRuntimeFanout: 16,
    commandQueryRails: 80,
    commandQueryRailGaps: 12,
    commandQueryRailDuplicates: 6,
    prReadinessChecks: 1,
    prReadinessBlocking: 1,
    docsDispositionDocuments: 120,
    docsDispositionActions: 8,
    docsResolutionOverlays: 2,
    docsTaskLikeReferences: 30,
    docsTaskLikeReferencesUnknown: 4,
    riskDebtItems: 12,
    riskDebtItemsOpen: 5,
  });

  assert.deepEqual(rows, [
    ['architecture.source_authority', 'database'],
    ['repository.commands', 220],
    ['repository.commands.unknown', 4],
    ['repository.commands.runtime_fanout', 16],
    ['command_query.rails', 80],
    ['command_query.rails.gaps', 12],
    ['command_query.rails.duplicates', 6],
    ['repository.pr_readiness', 1],
    ['repository.pr_readiness.blocking', 1],
    ['docs.disposition_documents', 120],
    ['docs.disposition_actions', 8],
    ['docs.resolution_overlays', 2],
    ['docs.task_like_references', 30],
    ['docs.task_like_references.unknown', 4],
    ['risk.debt_items', 12],
    ['risk.debt_items.open', 5],
    ['governance.files', 4255],
    ['governance.files.drift', 41],
    ['governance.files.legacy', 0],
    ['governance.components', 32],
    ['governance.component_files', 4255],
    ['governance.fingerprints', 4255],
    ['governance.coverage_rows', 128],
    ['governance.remediation_tasks', 43],
    ['governance.remediation_tasks.p0', 3],
  ]);
});

test('buildHashDriftRows exposes hash drift as an explicit heavy query result', () => {
  assert.deepEqual(buildHashDriftRows({ governanceHashDrift: 3 }), [['governance.hash_drift', 3]]);
});

test('buildAiProjectContext aggregates database project state for agent discovery', () => {
  const context = buildAiProjectContext(
    {
      summary: {
        sourceAuthority: 'database',
        repositoryCommands: 220,
        commandQueryRails: 80,
        commandQueryRailGaps: 12,
        commandQueryRailDuplicates: 6,
        riskDebtItemsOpen: 5,
        governanceComponents: 32,
        driftFiles: 41,
        prReadinessBlocking: 1,
      },
      commandQueryRails: [
        {
          rail_type: 'query',
          rail_name: 'QueryWidgets',
          ddd_owner: 'WidgetReadModel',
          rail_status: 'declared',
          is_gap: true,
          is_duplicate: false,
          source_path: 'docs/planning/example.md',
        },
      ],
      components: [
        {
          component_id: 'SYS-WEB',
          name: 'Web application',
          governance_state: 'current',
          file_count: 42,
        },
      ],
      riskDebt: [
        {
          risk_id: 'R-20260602-EXAMPLE',
          status: 'Open',
          priority: 'P1',
          title: 'Example risk',
          source_path: 'docs/risk-register/quality/R-20260602-EXAMPLE.yaml',
        },
      ],
      commands: [
        {
          command_type: 'package_script',
          command_name: 'planning:db:query',
          domain: 'planning-db',
          runtime_fanout: true,
        },
      ],
      prReadiness: [
        {
          readiness_id: 'current',
          blocking: true,
          missing_requirements: ['riskUpdate'],
        },
      ],
    },
    { generatedAt: '2026-06-02T00:00:00.000Z' }
  );

  assert.equal(context.contextKind, 'db-first-ai-project-context');
  assert.equal(context.generatedAt, '2026-06-02T00:00:00.000Z');
  assert.deepEqual(context.counts, {
    repositoryCommands: 220,
    commandQueryRails: 80,
    commandQueryRailGaps: 12,
    commandQueryRailDuplicates: 6,
    openIncidentsAndDebt: 5,
    governanceComponents: 32,
    governanceDriftFiles: 41,
    blockingPrReadinessChecks: 1,
  });
  assert.equal(context.samples.commandQueryRails[0].railName, 'QueryWidgets');
  assert.equal(context.samples.components[0].componentId, 'SYS-WEB');
  assert.equal(context.samples.openIncidentsAndDebt[0].riskId, 'R-20260602-EXAMPLE');
  assert.ok(
    context.recommendedQueries.includes('pnpm planning:db:query command-query-rails --gaps true')
  );
});

test('renderAiProjectContextMarkdown fills a reusable database context template', () => {
  const context = buildAiProjectContext(
    {
      summary: {
        sourceAuthority: 'database',
        tasks: 2,
        commandQueryRailGaps: 1,
        riskDebtItemsOpen: 1,
      },
      commandQueryRails: [
        {
          rail_type: 'query',
          rail_name: 'QueryWidgets',
          ddd_owner: 'WidgetReadModel',
          rail_status: 'declared',
          is_gap: true,
          source_path: 'docs\\planning|example.md',
        },
      ],
      components: [],
      realWork: [],
      riskDebt: [
        {
          risk_id: 'R-20260602-EXAMPLE',
          status: 'Open',
          priority: 'P1',
          title: 'Example risk',
        },
      ],
      commands: [],
      prReadiness: [],
    },
    { generatedAt: '2026-06-02T00:00:00.000Z' }
  );

  const markdown = renderAiProjectContextMarkdown(context);

  assert.match(markdown, /^# DB-first AI project context/);
  assert.match(markdown, /\| commandQueryRailGaps \| 1 \|/);
  assert.match(markdown, /QueryWidgets/);
  assert.ok(
    markdown.includes('docs\\\\planning\\|example.md'),
    'Markdown table cells must escape backslashes before escaping delimiters'
  );
  assert.match(markdown, /R-20260602-EXAMPLE/);
  assert.match(markdown, /pnpm planning:db:query command-query-rails --gaps true/);
});

test('readSummary excludes retired local task state while retaining architecture governance counts', async () => {
  let capturedSql = '';
  const client = {
    async query(sql) {
      capturedSql = sql;
      return {
        rows: [
          {
            governanceFiles: 4255,
            driftFiles: 41,
            legacyFiles: 0,
            governanceComponents: 32,
            governanceComponentFiles: 4255,
            governanceFingerprints: 4255,
            governanceCoverageRows: 128,
            governanceRemediationTasks: 43,
            governanceRemediationP0: 3,
            repositoryCommands: 220,
            repositoryCommandUnknown: 4,
            repositoryCommandRuntimeFanout: 16,
            prReadinessChecks: 1,
            prReadinessBlocking: 1,
            docsDispositionDocuments: 120,
            docsDispositionActions: 8,
            docsResolutionOverlays: 2,
            docsTaskLikeReferences: 30,
            docsTaskLikeReferencesUnknown: 4,
            riskDebtItems: 12,
            riskDebtItemsOpen: 5,
          },
        ],
      };
    },
  };

  const summary = await readSummary(client);

  assert.equal(summary.governanceHashDrift, undefined);
  assert.doesNotMatch(capturedSql, /planning_(?:lanes|tasks|task_|real_work|artifacts)/);
  assert.match(capturedSql, /repository_commands/);
  assert.match(capturedSql, /pr_readiness_checks/);
  assert.match(capturedSql, /doc_disposition_documents/);
  assert.match(capturedSql, /doc_disposition_actions/);
  assert.match(capturedSql, /doc_resolution_overlays/);
  assert.match(capturedSql, /doc_task_like_references/);
  assert.match(capturedSql, /risk_debt_items/);
  assert.doesNotMatch(capturedSql, /governance_file_hash_drift/);
});

test('readAiProjectContext reads existing DB projections without introducing a parallel source', async () => {
  const capturedSql = [];
  const client = {
    async query(sql, params) {
      capturedSql.push({ sql, params });
      if (sql.includes('as "sourceAuthority"')) {
        return {
          rows: [
            {
              sourceAuthority: 'database',
              repositoryCommands: 220,
              commandQueryRails: 80,
              commandQueryRailGaps: 12,
              commandQueryRailDuplicates: 6,
              riskDebtItemsOpen: 5,
              governanceComponents: 32,
              driftFiles: 41,
              prReadinessBlocking: 1,
            },
          ],
        };
      }
      if (sql.includes('command_query_rail_query')) {
        return {
          rows: [
            {
              rail_type: 'query',
              rail_name: 'QueryWidgets',
              ddd_owner: 'WidgetReadModel',
              rail_status: 'declared',
              is_gap: true,
              source_path: 'docs/planning/example.md',
            },
          ],
        };
      }
      if (sql.includes('governance_component_query')) {
        return {
          rows: [
            {
              component_id: 'SYS-WEB',
              name: 'Web application',
              governance_state: 'current',
            },
          ],
        };
      }
      if (sql.includes('risk_debt_query')) {
        return {
          rows: [
            {
              risk_id: 'R-20260602-EXAMPLE',
              status: 'Open',
              priority: 'P1',
              title: 'Example risk',
            },
          ],
        };
      }
      if (sql.includes('repository_command_query')) {
        return {
          rows: [
            {
              command_type: 'package_script',
              command_name: 'planning:db:query',
              domain: 'planning-db',
            },
          ],
        };
      }
      if (sql.includes('pr_readiness_query')) {
        return { rows: [{ readiness_id: 'current', blocking: true }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const context = await readAiProjectContext(client, { domainUnit: 'SYS-WEB', limit: 5 });

  assert.equal(context.samples.commandQueryRails[0].railName, 'QueryWidgets');
  assert.equal(context.samples.components[0].componentId, 'SYS-WEB');
  assert.equal(context.samples.openIncidentsAndDebt[0].riskId, 'R-20260602-EXAMPLE');
  assert.match(
    capturedSql.map((entry) => entry.sql).join('\n'),
    /from planning_query_store\.command_query_rail_query/
  );
  assert.match(
    capturedSql.map((entry) => entry.sql).join('\n'),
    /from planning_query_store\.governance_component_query/
  );
  assert.doesNotMatch(
    capturedSql.map((entry) => entry.sql).join('\n'),
    /planning_(?:lanes|tasks|task_|real_work|artifacts)/
  );
  assert.match(
    capturedSql.map((entry) => entry.sql).join('\n'),
    /from planning_query_store\.risk_debt_query/
  );
  assert.match(
    capturedSql.map((entry) => entry.sql).join('\n'),
    /from planning_query_store\.repository_command_query/
  );
  assert.match(
    capturedSql.map((entry) => entry.sql).join('\n'),
    /from planning_query_store\.pr_readiness_query/
  );
  assert.doesNotMatch(capturedSql.map((entry) => entry.sql).join('\n'), /docs\/planning/);
});

test('readHashDriftSummary queries only the explicit hash drift projection', async () => {
  let capturedSql = '';
  const client = {
    async query(sql) {
      capturedSql = sql;
      return { rows: [{ governanceHashDrift: 0 }] };
    },
  };

  const summary = await readHashDriftSummary(client);

  assert.equal(summary.governanceHashDrift, 0);
  assert.match(capturedSql, /governance_file_hash_drift/);
});

test('readRepositoryCommandRows queries the DB repository command catalog view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readRepositoryCommandRows(client, {
    commandDomain: 'planning-db',
    type: 'package_script',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.repository_command_query/);
  assert.match(captured.sql, /domain = \$1/);
  assert.match(captured.sql, /command_type = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['planning-db', 'package_script', 5]);
});

test('readCommandQueryRailRows queries the DB command/query rail catalog view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCommandQueryRailRows(client, {
    rail: 'RecordFeatureMechanizationRail',
    type: 'query',
    status: 'missing-backend-rail',
    owner: 'WidgetReadModel',
    gaps: true,
    duplicates: true,
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.match(captured.sql, /rail_type = \$1/);
  assert.match(captured.sql, /rail_status = \$2/);
  assert.match(captured.sql, /ddd_owner = \$3/);
  assert.match(captured.sql, /rail_name = \$4/);
  assert.match(captured.sql, /is_duplicate = \$5/);
  assert.match(captured.sql, /is_gap = \$6/);
  assert.match(captured.sql, /limit \$7/);
  assert.deepEqual(captured.params, [
    'query',
    'missing-backend-rail',
    'WidgetReadModel',
    'RecordFeatureMechanizationRail',
    true,
    true,
    5,
  ]);
});

test('readCommandQueryRailRows filters command/query rails by broad search text', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCommandQueryRailRows(client, {
    search: 'Warehouse',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.match(captured.sql, /lower\(rail_name\) like lower\(\$1\)/);
  assert.match(captured.sql, /lower\(ddd_owner\) like lower\(\$1\)/);
  assert.match(captured.sql, /lower\(feature_id\) like lower\(\$1\)/);
  assert.match(captured.sql, /lower\(source_path\) like lower\(\$1\)/);
  assert.match(captured.sql, /normalized_rail_name like \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['%Warehouse%', '%warehouse%', 5]);
});

test('readCommandQueryRailRows normalizes spaced rail filters for camel-case database terms', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCommandQueryRailRows(client, {
    search: 'Source Import',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.match(captured.sql, /lower\(rail_name\) like lower\(\$1\)/);
  assert.match(captured.sql, /normalized_rail_name like \$2/);
  assert.match(
    captured.sql,
    /regexp_replace\(lower\(coalesce\(ddd_owner, ''\)\), '\[\^a-z0-9\]', '', 'g'\) like \$2/
  );
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['%Source Import%', '%sourceimport%', 5]);
});

test('readCreationIntentRows queries existing rails from the database rail catalog', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCreationIntentRows(client, {
    intent: 'I want to create ListWidgets',
    type: 'query',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.match(captured.sql, /intent_match_score/);
  assert.match(captured.sql, /normalized_rail_name/);
  assert.match(captured.sql, /rail_type = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'I want to create ListWidgets',
    'i want to create listwidgets',
    ['listwidgets'],
    'query',
    5,
  ]);
});

test('readCreationIntentRows canonicalizes retired execution preview intent aliases', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCreationIntentRows(client, {
    intent: 'PreviewExecutablePlan',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.command_query_rail_query/);
  assert.deepEqual(captured.params, [
    'PreviewExecutablePlan',
    'previewexecutionplan',
    ['previewexecutionplan'],
    5,
  ]);

  await readCreationIntentRows(client, {
    intent: 'previewexecutableplan',
    limit: 5,
  });

  assert.deepEqual(captured.params, [
    'previewexecutableplan',
    'previewexecutionplan',
    ['previewexecutionplan'],
    5,
  ]);
});

test('buildKnowledgeIntakeRetirementRows exposes database retirement posture', () => {
  assert.deepEqual(
    buildKnowledgeIntakeRetirementRows([
      {
        retirement_state: 'unclassified',
        open_action_count: 2,
        inbound_reference_count: 1,
        action_count: 3,
        canonical_disposition: null,
        document_path: 'buzon/example.md',
        title: 'Example Fowler Analysis',
      },
    ]),
    [['unclassified', 2, 1, 3, '-', 'buzon/example.md', 'Example Fowler Analysis']]
  );
});

test('readKnowledgeIntakeRetirementRows queries the database intake retirement view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readKnowledgeIntakeRetirementRows(client, {
    state: 'open-actions',
    type: 'fowler_analysis',
    path: 'buzon/example.md',
    status: 'Review',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.knowledge_intake_retirement_query/);
  assert.match(captured.sql, /retirement_state = \$1/);
  assert.match(captured.sql, /document_type = \$2/);
  assert.match(captured.sql, /document_path = \$3/);
  assert.match(captured.sql, /status = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'open-actions',
    'fowler_analysis',
    'buzon/example.md',
    'Review',
    5,
  ]);
});

test('buildKnowledgeIntakeReferenceRows exposes database intake backrefs', () => {
  assert.deepEqual(
    buildKnowledgeIntakeReferenceRows([
      {
        document_path: 'buzon/example.md',
        reference_path: 'docs/planning/example.md',
        relation_type: 'markdown_link',
        reference_component_id: 'ci-governance',
        reference_file_role: 'doc',
        reference_title: 'Planning Example',
      },
      {
        documentPath: 'buzon/missing-owner.md',
        referencePath: 'docs/archive/example.md',
        relationType: 'direct_path',
        referenceTitle: 'Archive Example',
      },
    ]),
    [
      [
        'buzon/example.md',
        'markdown_link',
        'docs/planning/example.md',
        'ci-governance',
        'doc',
        'Planning Example',
      ],
      [
        'buzon/missing-owner.md',
        'direct_path',
        'docs/archive/example.md',
        '-',
        '-',
        'Archive Example',
      ],
    ]
  );
});

test('readKnowledgeIntakeReferenceRows queries DB repository backrefs and ownership projections', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readKnowledgeIntakeReferenceRows(client, {
    path: 'buzon/example.md',
    component: 'ci-governance',
    limit: 5,
  });

  assert.match(
    captured.sql,
    /from planning_query_store\.knowledge_intake_repository_reference_query/
  );
  assert.doesNotMatch(captured.sql, /from planning_query_store\.knowledge_document_links/);
  assert.match(captured.sql, /document_path like 'buzon\/%'/);
  assert.match(captured.sql, /document_path = \$1/);
  assert.match(captured.sql, /reference_component_id = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['buzon/example.md', 'ci-governance', 5]);
});

test('readDbSurfaceRows queries the database surface inventory view with real predicates', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readDbSurfaceRows(client, {
    surface: 'Architecture design authority',
    state: 'database',
    kind: 'db_command',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.db_governance_surface_query/);
  assert.match(captured.sql, /surface_name = \$1/);
  assert.match(captured.sql, /authority_mode = \$2/);
  assert.match(captured.sql, /write_rail_kind = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['Architecture design authority', 'database', 'db_command', 5]);
});

test('readDocumentationLifecycleRows queries DB lifecycle facts with logical predicates', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readDocumentationLifecycleRows(client, {
    type: 'proposal',
    canonicality: 'proposal',
    state: 'proposed',
    kind: 'proposal_missing_canonical',
    subject: 'canvas-modeler',
    duplicates: true,
    gaps: true,
    limit: 11,
  });

  assert.match(captured.sql, /from planning_query_store\.documentation_lifecycle_query/);
  assert.match(captured.sql, /document_type = \$1/);
  assert.match(captured.sql, /canonicality = \$2/);
  assert.match(captured.sql, /lifecycle_state = \$3/);
  assert.match(captured.sql, /lifecycle_gap_kind = \$4/);
  assert.match(captured.sql, /subject_key = \$5/);
  assert.match(captured.sql, /is_duplicate is true/);
  assert.match(captured.sql, /lifecycle_gap_kind <> 'none'/);
  assert.match(captured.sql, /limit \$6/);
  assert.deepEqual(captured.params, [
    'proposal',
    'proposal',
    'proposed',
    'proposal_missing_canonical',
    'canvas-modeler',
    11,
  ]);
});

test('runQuery dispatches knowledge-intake through the database retirement query', async () => {
  const client = {
    async query() {
      return {
        rows: [
          {
            retirement_state: 'canonized',
            open_action_count: 0,
            inbound_reference_count: 4,
            action_count: 1,
            canonical_disposition: 'docs/planning/proposals/mandatory/example.md',
            document_path: 'buzon/example.md',
            title: 'Example Fowler Analysis',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'knowledge-intake',
    filters: { state: 'canonized', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'canonized',
      0,
      4,
      1,
      'docs/planning/proposals/mandatory/example.md',
      'buzon/example.md',
      'Example Fowler Analysis',
    ],
  ]);
});

test('runQuery dispatches DB surface inventory through the DB query rail', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /db_governance_surface_query/);
      return {
        rows: [
          {
            surface_name: 'Architecture design authority',
            authority_mode: 'database',
            write_rail_kind: 'db_command',
            source_ref: 'tools/planning-db/schema.sql',
            database_write_eligible: true,
            revision: 0,
            updated_by: 'migration',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'db-surfaces',
    filters: { state: 'database', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'Architecture design authority',
      'database',
      'db_command',
      'true',
      '0',
      'migration',
      'tools/planning-db/schema.sql',
    ],
  ]);
});

test('runQuery dispatches knowledge-intake references through the database link query', async () => {
  const client = {
    async query() {
      return {
        rows: [
          {
            document_path: 'buzon/example.md',
            reference_path: 'docs/planning/example.md',
            relation_type: 'direct_path',
            reference_component_id: 'ci-governance',
            reference_file_role: 'doc',
            reference_title: 'Planning Example',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'knowledge-intake',
    filters: { references: true, limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'buzon/example.md',
      'direct_path',
      'docs/planning/example.md',
      'ci-governance',
      'doc',
      'Planning Example',
    ],
  ]);
});

test('runQuery dispatches documentation-lifecycle through the database lifecycle query', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /documentation_lifecycle_query/);
      return {
        rows: [
          {
            lifecycle_gap_kind: 'canonical_duplicate',
            lifecycle_state: 'active',
            canonicality: 'canonical',
            duplicate_count: 2,
            canonical_counterpart_count: 2,
            proposal_counterpart_count: 1,
            closeout_counterpart_count: 1,
            open_action_count: 0,
            document_path: 'docs/architecture/components/example.md',
            subject_key: 'example',
            title: 'Example Component',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'documentation-lifecycle',
    filters: { duplicates: true, limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'canonical_duplicate',
      'active',
      'canonical',
      2,
      2,
      1,
      1,
      0,
      'docs/architecture/components/example.md',
      'example',
      'Example Component',
    ],
  ]);
});

test('architecture evidence query exposes provenance and proof state', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /evidence_origin/u);
      assert.match(sql, /verification_state/u);
      return {
        rows: [
          {
            evidence_id: 'EVIDENCE-LOCAL-TEST',
            design_id: 'DESIGN-LOCAL-TEST',
            subject_kind: 'test',
            subject_id: 'TEST-DB-FIRST',
            evidence_kind: 'test',
            evidence_origin: 'local_execution',
            result_state: 'pass',
            verification_state: 'verified',
            freshness_state: 'fresh',
            source_ref: 'pnpm test',
            source_path: 'scripts/example.test.cjs',
            source_verification_state: 'verified',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'architecture-evidence',
    filters: { limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'EVIDENCE-LOCAL-TEST',
      'DESIGN-LOCAL-TEST',
      'test',
      'TEST-DB-FIRST',
      'test',
      'local_execution',
      'pass',
      'verified',
      'fresh',
      'verified',
      'scripts/example.test.cjs',
      'pnpm test',
    ],
  ]);
});

test('buildDocumentationPanelRows exposes relational panel fields without prose parsing', () => {
  const rows = buildDocumentationPanelRows([
    {
      panel_id: 'component:SYS-WEB-ROOT:properties',
      panel_surface: 'properties',
      entity_kind: 'component',
      entity_id: 'SYS-WEB-ROOT',
      section_kind: 'overview',
      field_key: 'title',
      field_value: 'Web Root',
      source_path: 'docs/architecture/components/web/index.md',
      component_id: 'SYS-WEB-ROOT',
      panel_state: 'ready',
      gap_kind: 'none',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'component:SYS-WEB-ROOT:properties',
      'properties',
      'component',
      'SYS-WEB-ROOT',
      'overview',
      'title',
      'Web Root',
      'ready',
      'none',
      'SYS-WEB-ROOT',
      'docs/architecture/components/web/index.md',
    ],
  ]);
});

test('readDocumentationPanelRows queries database panel facts with entity and gap filters', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readDocumentationPanelRows(client, {
    component: 'SYS-WEB-ROOT',
    path: 'docs/architecture/components/web/index.md',
    state: 'ready',
    kind: 'missing_required_section',
    type: 'component',
    surface: 'properties',
    subject: 'overview',
    gaps: true,
    limit: 7,
  });

  assert.match(captured.sql, /from planning_query_store\.documentation_panel_query/);
  assert.match(captured.sql, /\(component_id = \$1 or entity_id = \$1\)/);
  assert.match(captured.sql, /source_path = \$2/);
  assert.match(captured.sql, /panel_state = \$3/);
  assert.match(captured.sql, /gap_kind = \$4/);
  assert.match(captured.sql, /entity_kind = \$5/);
  assert.match(captured.sql, /panel_surface = \$6/);
  assert.match(captured.sql, /section_kind = \$7/);
  assert.match(captured.sql, /gap_kind <> 'none'/);
  assert.match(captured.sql, /limit \$8/);
  assert.deepEqual(captured.params, [
    'SYS-WEB-ROOT',
    'docs/architecture/components/web/index.md',
    'ready',
    'missing_required_section',
    'component',
    'properties',
    'overview',
    7,
  ]);
});

test('readDocumentationPanelRows defaults unscoped reads to actionable panel gaps', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readDocumentationPanelRows(client, { limit: 7 });

  assert.match(captured.sql, /where is_gap is true/);
  assert.match(captured.sql, /limit \$1/);
  assert.deepEqual(captured.params, [7]);
});

test('runQuery dispatches documentation-panels through the database panel map', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /documentation_panel_query/);
      return {
        rows: [
          {
            panel_id: 'document:docs/architecture/components/web/index.md:metadata',
            panel_surface: 'metadata',
            entity_kind: 'document',
            entity_id: 'docs/architecture/components/web/index.md',
            section_kind: 'frontmatter',
            field_key: 'status',
            field_value: 'Active',
            source_path: 'docs/architecture/components/web/index.md',
            component_id: 'SYS-WEB-ROOT',
            panel_state: 'ready',
            gap_kind: 'none',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'documentation-panels',
    filters: { type: 'document', state: 'ready', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'document:docs/architecture/components/web/index.md:metadata',
      'metadata',
      'document',
      'docs/architecture/components/web/index.md',
      'frontmatter',
      'status',
      'Active',
      'ready',
      'none',
      'SYS-WEB-ROOT',
      'docs/architecture/components/web/index.md',
    ],
  ]);
});

test('buildComponentRoadmapRows exposes implementation, planning, and gap state', () => {
  const rows = buildComponentRoadmapRows([
    {
      component_id: 'SYS-WEB-ROOT',
      component_name: 'Web Root',
      implementation_state: 'implemented',
      planning_state: 'programmed',
      gap_kind: 'none',
      architecture_status: 'accepted',
      engineering_quality_state: 'pass',
      planned_feature_count: 2,
      implemented_feature_count: 1,
      source_path: 'docs/architecture/components/web/index.md',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'SYS-WEB-ROOT',
      'Web Root',
      'implemented',
      'programmed',
      'none',
      'accepted',
      'pass',
      2,
      1,
      'docs/architecture/components/web/index.md',
    ],
  ]);
});

test('buildArchitectureFitnessRows exposes rule, state, and evidence subject', () => {
  const rows = buildArchitectureFitnessRows([
    {
      scan_id: 'scan-1',
      design_id: 'design-21-component-architecture-fitness-dbfirst',
      fitness_rule_id: 'DVT-ARCH-003',
      subject_kind: 'observation',
      subject_id: 'obs-1',
      result_state: 'fail',
      severity: 'error',
      reason: 'Observed internal dependency is not declared.',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'scan-1',
      'design-21-component-architecture-fitness-dbfirst',
      'DVT-ARCH-003',
      'observation',
      'obs-1',
      'fail',
      'error',
      'Observed internal dependency is not declared.',
    ],
  ]);
});

test('buildArchitectureFitnessGapRows exposes prioritized architecture gap groups', () => {
  const rows = buildArchitectureFitnessGapRows([
    {
      scan_id: 'scan-1',
      design_id: 'design-21-component-architecture-fitness-dbfirst',
      gap_kind: 'unmapped_source',
      fitness_state: 'fail',
      severity: 'error',
      source_prefix: 'apps/api/src',
      target_prefix: '-',
      source_component_id: null,
      target_component_id: null,
      relation_type: 'depends_on',
      observation_count: 42,
      test_observation_count: 3,
      sample_source_path: 'apps/api/src/application/ports/auth.ts',
      sample_import_literal: '@dvt/contracts',
      action_hint: 'Record or refine architecture.component ownership for the source prefix.',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'scan-1',
      'design-21-component-architecture-fitness-dbfirst',
      'unmapped_source',
      'fail',
      'error',
      'apps/api/src',
      '-',
      '-',
      '-',
      'depends_on',
      42,
      3,
      'apps/api/src/application/ports/auth.ts',
      '@dvt/contracts',
      'Record or refine architecture.component ownership for the source prefix.',
    ],
  ]);
});

test('readArchitectureDependencyClassificationRows queries observed-vs-declared DB facts', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureDependencyClassificationRows(client, {
    design: 'design-21-component-architecture-fitness-dbfirst',
    scan: 'scan-1',
    classification: 'undeclared_dependency',
    component: 'SYS-WEB-ROOT',
    limit: 9,
  });

  assert.match(captured.sql, /from architecture\.component_dependency_classification_query/);
  assert.match(captured.sql, /design_id = \$1/);
  assert.match(captured.sql, /scan_id = \$2/);
  assert.match(captured.sql, /dependency_classification = \$3/);
  assert.match(captured.sql, /\(source_component_id = \$4 or target_component_id = \$4\)/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'design-21-component-architecture-fitness-dbfirst',
    'scan-1',
    'undeclared_dependency',
    'SYS-WEB-ROOT',
    9,
  ]);
});

test('readArchitectureFitnessGapRows queries DB-owned prioritized architecture gaps', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureFitnessGapRows(client, {
    design: 'design-21-component-architecture-fitness-dbfirst',
    scan: 'scan-1',
    kind: 'unmapped_source',
    state: 'fail',
    severity: 'error',
    component: 'SYS-WEB-ROOT',
    limit: 8,
  });

  assert.match(captured.sql, /from architecture\.component_fitness_gap_summary_query/);
  assert.match(captured.sql, /design_id = \$1/);
  assert.match(captured.sql, /scan_id = \$2/);
  assert.match(captured.sql, /gap_kind = \$3/);
  assert.match(captured.sql, /fitness_state = \$4/);
  assert.match(captured.sql, /severity = \$5/);
  assert.match(captured.sql, /\(source_component_id = \$6 or target_component_id = \$6\)/);
  assert.match(captured.sql, /limit \$7/);
  assert.deepEqual(captured.params, [
    'design-21-component-architecture-fitness-dbfirst',
    'scan-1',
    'unmapped_source',
    'fail',
    'error',
    'SYS-WEB-ROOT',
    8,
  ]);
});

test('runQuery dispatches architecture-fitness through the database fitness read model', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /component_fitness_query/);
      return {
        rows: [
          {
            scan_id: 'scan-1',
            design_id: 'design-21-component-architecture-fitness-dbfirst',
            fitness_rule_id: 'DVT-ARCH-003',
            subject_kind: 'observation',
            subject_id: 'obs-1',
            result_state: 'fail',
            severity: 'error',
            reason: 'Observed internal dependency is not declared.',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'architecture-fitness',
    filters: { rule: 'DVT-ARCH-003', state: 'fail', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'scan-1',
      'design-21-component-architecture-fitness-dbfirst',
      'DVT-ARCH-003',
      'observation',
      'obs-1',
      'fail',
      'error',
      'Observed internal dependency is not declared.',
    ],
  ]);
});

test('runQuery dispatches architecture-fitness-gaps through the database summary read model', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /component_fitness_gap_summary_query/);
      return {
        rows: [
          {
            scan_id: 'scan-1',
            design_id: 'design-21-component-architecture-fitness-dbfirst',
            gap_kind: 'undeclared_dependency',
            fitness_state: 'fail',
            severity: 'error',
            source_prefix: 'apps/web/src',
            target_prefix: 'packages/@dvt/contracts/src',
            source_component_id: 'SYS-WEB',
            target_component_id: 'SYS-CONTRACTS',
            relation_type: 'depends_on',
            observation_count: 2,
            test_observation_count: 0,
            sample_source_path: 'apps/web/src/app/App.tsx',
            sample_import_literal: '@dvt/contracts',
            action_hint: 'Record architecture.component_relation or refactor the dependency.',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'architecture-fitness-gaps',
    filters: { kind: 'undeclared_dependency', state: 'fail', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'scan-1',
      'design-21-component-architecture-fitness-dbfirst',
      'undeclared_dependency',
      'fail',
      'error',
      'apps/web/src',
      'packages/@dvt/contracts/src',
      'SYS-WEB',
      'SYS-CONTRACTS',
      'depends_on',
      2,
      0,
      'apps/web/src/app/App.tsx',
      '@dvt/contracts',
      'Record architecture.component_relation or refactor the dependency.',
    ],
  ]);
});

test('readComponentRoadmapRows queries the database component roadmap with gap filters', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentRoadmapRows(client, {
    component: 'docs/architecture/components/web/index.md',
    state: 'planned',
    kind: 'planned_component_missing_db_component',
    path: 'docs/planning/proposals/mandatory/governance-and-docs/example.md',
    gaps: true,
    limit: 7,
  });

  assert.match(captured.sql, /from planning_query_store\.component_roadmap_query/);
  assert.match(captured.sql, /\(component_id = \$1 or component_ref = \$1\)/);
  assert.match(captured.sql, /implementation_state = \$2/);
  assert.match(captured.sql, /gap_kind = \$3/);
  assert.match(captured.sql, /source_path = \$4/);
  assert.match(captured.sql, /gap_kind <> 'none'/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'docs/architecture/components/web/index.md',
    'planned',
    'planned_component_missing_db_component',
    'docs/planning/proposals/mandatory/governance-and-docs/example.md',
    7,
  ]);
});

test('runQuery dispatches component-roadmap through the database component map', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /component_roadmap_query/);
      return {
        rows: [
          {
            component_id: 'docs/architecture/components/web/index.md',
            component_name: 'docs/architecture/components/web/index.md',
            implementation_state: 'planned',
            planning_state: 'open',
            gap_kind: 'planned_component_missing_db_component',
            architecture_status: 'missing',
            engineering_quality_state: 'missing',
            planned_feature_count: 1,
            implemented_feature_count: 0,
            source_path: 'docs/planning/proposals/mandatory/governance-and-docs/example.md',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'component-roadmap',
    filters: { state: 'planned', gaps: true, limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'docs/architecture/components/web/index.md',
      'docs/architecture/components/web/index.md',
      'planned',
      'open',
      'planned_component_missing_db_component',
      'missing',
      'missing',
      1,
      0,
      'docs/planning/proposals/mandatory/governance-and-docs/example.md',
    ],
  ]);
});

test('runQuery dispatches creation-intent through the AI pre-create rail query', async () => {
  const client = {
    async query() {
      return {
        rows: [
          {
            rail_type: 'query',
            rail_name: 'ListWidgets',
            ddd_owner: 'WidgetReadModel',
            rail_status: 'declared',
            implementation_ref_count: 1,
            documentation_ref_count: 2,
            is_gap: false,
            is_duplicate: false,
            intent_match_score: 75,
            feature_id: 'EXAMPLE-FEATURE',
            source_path: 'docs/planning/proposals/mandatory/example.md',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'creation-intent',
    filters: { intent: 'I want to create ListWidgets', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'reuse-existing-rail',
      'query',
      'ListWidgets',
      'WidgetReadModel',
      'declared',
      'implemented',
      '-',
      75,
      'EXAMPLE-FEATURE',
      'docs/planning/proposals/mandatory/example.md',
    ],
  ]);
});

test('runQuery dispatches frontend-surfaces through the screen truth query', async () => {
  const client = {
    async query() {
      return {
        rows: [
          {
            surface_kind: 'route',
            route_path: '/runs',
            surface_id: 'web.runs.list',
            screen_state: 'operational-product',
            frontend_owner: 'Runs workbench',
            registered_plugin_count: 1,
            consumed_endpoint_count: 1,
            zustand_store_count: 2,
            tanstack_query_count: 1,
            capability_gap_count: 2,
            source_path: 'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'frontend-surfaces',
    filters: { state: 'operational-product', path: '/runs', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'route',
      '/runs',
      'web.runs.list',
      'operational-product',
      'Runs workbench',
      1,
      1,
      2,
      1,
      2,
      'docs/architecture/components/web/frontend-mechanical-truth-inventory.md',
    ],
  ]);
});

test('runQuery dispatches frontend component reflection through focused queries', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('frontend_component_file_query')) {
        return {
          rows: [
            {
              component_id: 'web.component.canvas.CanvasToolbar',
              file_path: 'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
              file_role: 'component',
              exported_symbol: 'CanvasToolbar',
            },
          ],
        };
      }
      if (sql.includes('frontend_component_rail_query')) {
        return {
          rows: [
            {
              component_id: 'web.component.canvas.CanvasToolbar',
              rail_name: 'PreviewExecutionPlan',
              rail_kind: 'command',
              rail_status: 'implemented-api',
            },
          ],
        };
      }
      return {
        rows: [
          {
            component_id: 'web.component.canvas.CanvasToolbar',
            component_name: 'CanvasToolbar',
            component_kind: 'route-toolbar',
            component_status: 'current',
            reuse_decision: 'extract',
            surface_count: 1,
            file_count: 3,
            rail_count: 2,
            evidence_count: 2,
            evidence_ref_count: 3,
            source_path: 'docs/architecture/components/web/frontend-component-inventory.md',
          },
        ],
      };
    },
  };

  const componentRows = await runQuery({
    queryName: 'frontend-components',
    filters: { component: 'web.component.canvas.CanvasToolbar', limit: 5 },
    client,
    print: false,
  });
  const fileRows = await runQuery({
    queryName: 'frontend-component-files',
    filters: { component: 'web.component.canvas.CanvasToolbar', limit: 5 },
    client,
    print: false,
  });
  const railRows = await runQuery({
    queryName: 'frontend-component-rails',
    filters: { component: 'web.component.canvas.CanvasToolbar', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(componentRows, [
    [
      'web.component.canvas.CanvasToolbar',
      'CanvasToolbar',
      'route-toolbar',
      'current',
      'extract',
      1,
      3,
      2,
      3,
      'docs/architecture/components/web/frontend-component-inventory.md',
    ],
  ]);
  assert.deepEqual(fileRows, [
    [
      'web.component.canvas.CanvasToolbar',
      'apps/web/src/app/views/canvas/CanvasToolbar.tsx',
      'component',
      'CanvasToolbar',
    ],
  ]);
  assert.deepEqual(railRows, [
    ['web.component.canvas.CanvasToolbar', 'PreviewExecutionPlan', 'command', 'implemented-api'],
  ]);
  assert.equal(calls.length, 3);
});

test('buildRepositoryCommandRows formats DB-owned repository command catalog rows', () => {
  const rows = buildRepositoryCommandRows([
    {
      command_type: 'package_script',
      command_name: 'planning:db:query',
      command_path: null,
      domain: 'planning-db',
      sensitivity: 'planning-query-store',
      runtime_fanout: true,
      referenced_file_count: 1,
    },
    {
      command_type: 'command_file',
      command_name: null,
      command_path: 'scripts/planning-db-query.cjs',
      domain: 'planning-db',
      sensitivity: 'planning-query-store',
      runtime_fanout: false,
      referenced_file_count: 0,
    },
  ]);

  assert.deepEqual(rows, [
    [
      'package_script',
      'planning:db:query',
      'planning-db',
      'planning-query-store',
      'runtime-fanout',
      1,
    ],
    [
      'command_file',
      'scripts/planning-db-query.cjs',
      'planning-db',
      'planning-query-store',
      '-',
      0,
    ],
  ]);
});

test('readPrReadinessRows queries the DB-owned PR readiness view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readPrReadinessRows(client, { limit: 5 });

  assert.match(captured.sql, /from planning_query_store\.pr_readiness_query/);
  assert.match(captured.sql, /order by blocking desc, readiness_id/);
  assert.match(captured.sql, /limit \$1/);
  assert.deepEqual(captured.params, [5]);
});

test('buildPrReadinessRows formats DB-owned ARC blockers for CLI output', () => {
  const rows = buildPrReadinessRows([
    {
      readiness_id: 'current',
      effective_arc_level: 'ARC-2',
      blocking: true,
      trigger_count: 1,
      missing_requirements: ['evidenceDoc', 'riskUpdate'],
      evidence_doc_status: 'missing',
      risk_update_status: 'missing',
      required_checks: ['lint', 'test', 'docs-validation'],
    },
  ]);

  assert.deepEqual(rows, [
    [
      'current',
      'ARC-2',
      'blocking',
      1,
      'evidenceDoc,riskUpdate',
      'evidence:missing',
      'risk:missing',
      'lint,test,docs-validation',
    ],
  ]);
});

test('readDocsDispositionRows queries the DB-owned docs disposition action view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readDocsDispositionRows(client, {
    priority: 'P1',
    kind: 'unknown_task_like_id',
    path: 'docs/planning/status/example.md',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.doc_disposition_action_query/);
  assert.match(captured.sql, /priority = \$1/);
  assert.match(captured.sql, /action_kind = \$2/);
  assert.match(captured.sql, /document_path = \$3/);
  assert.match(captured.sql, /resolution_status = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'P1',
    'unknown_task_like_id',
    'docs/planning/status/example.md',
    'pending',
    5,
  ]);
});

test('readDocsDispositionRows can include resolved overlays explicitly', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readDocsDispositionRows(client, {
    resolution: 'resolved',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.doc_disposition_action_query/);
  assert.match(captured.sql, /resolution_status <> \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['pending', 5]);
});

test('docs disposition row builders format cleanup queues for operator output', () => {
  assert.deepEqual(
    buildDocsDispositionRows([
      {
        priority: 'P1',
        action_kind: 'unknown_task_like_id',
        document_path: 'docs/planning/status/example.md',
        reference_text: 'WEB-123',
        resolution_status: 'pending',
        reason: 'Task-like reference is not registered in planning lanes.',
      },
    ]),
    [
      [
        'P1',
        'unknown_task_like_id',
        'docs/planning/status/example.md',
        'WEB-123',
        'pending',
        'Task-like reference is not registered in planning lanes.',
      ],
    ]
  );
});

test('buildGovernanceFileRows formats DB-owned governance file rows', () => {
  const rows = buildGovernanceFileRows([
    {
      path: 'docs/planning/status/system-governance-file-index.files.yaml',
      component_unit: 'SYS-DOCS-GOVERNANCE',
      owning_unit: 'SYS-DOCS-GOVERNANCE',
      governance_state: 'drift',
      is_drift: true,
      is_legacy: false,
    },
  ]);

  assert.deepEqual(rows, [
    [
      'docs/planning/status/system-governance-file-index.files.yaml',
      'SYS-DOCS-GOVERNANCE',
      'SYS-DOCS-GOVERNANCE',
      'drift',
      'drift',
      '-',
    ],
  ]);
});

test('readGovernanceFileRows queries effective DB file ownership', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceFileRows(client, {
    component: 'SYS-DOCS-GOVERNANCE',
    governanceState: 'drift',
    path: 'docs/planning/status/example.md',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.file_ownership_query/);
  assert.doesNotMatch(captured.sql, /system-governance-file-index\.files\.yaml/);
  assert.match(captured.sql, /leaf_component_id = \$1/);
  assert.match(captured.sql, /governance_state = \$2/);
  assert.match(captured.sql, /file_path = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'SYS-DOCS-GOVERNANCE',
    'drift',
    'docs/planning/status/example.md',
    5,
  ]);
});

test('readGovernanceComponentRows queries the DB governance component view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceComponentRows(client, {
    component: 'SYS-DOCS-GOVERNANCE',
    governanceState: 'stable',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_component_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /governance_state = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['SYS-DOCS-GOVERNANCE', 'stable', 5]);
});

test('readGovernanceUnitRows queries the DB governance unit tree view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceUnitRows(client, {
    component: 'SYS-API-ROOT',
    parentUnit: 'SYS-API',
    governanceState: 'coverage-required',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_unit_query/);
  assert.match(captured.sql, /unit_id = \$1/);
  assert.match(captured.sql, /parent_id = \$2/);
  assert.match(captured.sql, /governance_state = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-API-ROOT', 'SYS-API', 'coverage-required', 5]);
});

test('readComponentEngineeringComponentTreeRows queries the DB component tree view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringComponentTreeRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    parentUnit: 'SYS-RUNTIME-ROOT',
    governanceState: 'coverage-required',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.component_tree_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /parent_component_id = \$2/);
  assert.match(captured.sql, /governance_state = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'SYS-RUNTIME-ENGINE-CORE',
    'SYS-RUNTIME-ROOT',
    'coverage-required',
    5,
  ]);
});

test('readComponentEngineeringComponentMetadataRows queries the stable component metadata schema view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringComponentMetadataRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    governanceState: 'coverage-required',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.component_metadata_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /governance_state = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 'coverage-required', 5]);
});

test('readComponentEngineeringComponentDriftRows queries the DB component drift view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringComponentDriftRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.component_drift_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 5]);
});

test('readComponentEngineeringRuleCatalogRows queries DB-backed component rules', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringRuleCatalogRows(client, {
    kind: 'responsibility',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.rule_catalog_query/);
  assert.match(captured.sql, /category = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['responsibility', 5]);
});

test('readComponentEngineeringRuleEvaluationRows queries DB-backed rule evaluations', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringRuleEvaluationRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    governanceState: 'fail',
    kind: 'CEI-ID-002',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.rule_evaluation_query/);
  assert.match(captured.sql, /subject_id = \$1/);
  assert.match(captured.sql, /evaluation_state = \$2/);
  assert.match(captured.sql, /rule_id = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 'fail', 'CEI-ID-002', 5]);
});

test('readComponentEngineeringQualityRows queries DB-backed component quality rollups', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringQualityRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    limit: 5,
  });

  assert.match(captured.sql, /from component_engineering\.component_quality_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 5]);
});

test('readArchitectureDesignRows queries the DB architecture design authority view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureDesignRows(client, {
    design: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
    status: 'review',
    owner: 'Architecture',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.design_query/);
  assert.match(captured.sql, /design_id = \$1/);
  assert.match(captured.sql, /status = \$2/);
  assert.match(captured.sql, /owner = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
    'review',
    'Architecture',
    5,
  ]);
});

test('readCanvasUxdbSpecificationRows queries DB-owned TAREA specification records', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCanvasUxdbSpecificationRows(client, {
    taskId: 'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
    recordType: 'context_action',
    component: 'web.component.canvas.CanvasContextMenu',
    rail: 'ResolveCanvasContextMenu',
    state: 'accepted',
    limit: 5,
  });

  assert.match(
    captured.sql,
    /from planning_query_store\.canvas_uxdb_canonical_specification_query/
  );
  assert.match(captured.sql, /canonical_task_id = \$1/);
  assert.match(captured.sql, /record_type = \$2/);
  assert.match(captured.sql, /component_id = \$3/);
  assert.match(captured.sql, /rail_name = \$4/);
  assert.match(captured.sql, /spec_state = \$5/);
  assert.match(captured.sql, /limit \$6/);
  assert.deepEqual(captured.params, [
    'E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1',
    'context_action',
    'web.component.canvas.CanvasContextMenu',
    'ResolveCanvasContextMenu',
    'accepted',
    5,
  ]);
});

test('buildCanvasUxdbSpecificationRows formats component, rail and legacy posture', () => {
  assert.deepEqual(
    buildCanvasUxdbSpecificationRows([
      {
        record_id: 'node-menu.open-workbench',
        record_type: 'context_action',
        record_title: 'Open node workbench',
        canonical_task_id: 'E-CANVAS-NODE-WORKBENCH-1',
        component_id: 'web.component.canvas.NodeWorkbench',
        rail_name: 'OpenCanvasNodeWorkbench',
        spec_state: 'accepted',
        legacy_posture: 'replaces-direct-properties-inputs-tests-actions',
      },
    ]),
    [
      [
        'node-menu.open-workbench',
        'context_action',
        'Open node workbench',
        'E-CANVAS-NODE-WORKBENCH-1',
        'web.component.canvas.NodeWorkbench',
        'OpenCanvasNodeWorkbench',
        'accepted',
        'replaces-direct-properties-inputs-tests-actions',
      ],
    ]
  );
});

test('readCanvasCqRailDriftRows compares Canvas UX rails with canonical rail catalog', async () => {
  const {
    buildCanvasCqRailDriftRows,
    readCanvasCqRailDriftRows,
  } = require('./planning-db/queries/canvas-cq-rail-drift-query.cjs');
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return {
        rows: [
          {
            record_id: 'canvas-menu.add-source',
            record_type: 'context_action',
            component_id: 'web.component.canvas.CanvasContextMenu',
            requested_rail_name: 'OpenCanvasAddSourceDialog',
            canonical_rail_name: 'OpenCanvasSourceImportDialog',
            rail_type: 'command',
            drift_state: 'legacy_alias',
            severity: 'warning',
            action_hint:
              'Use canonical rail OpenCanvasSourceImportDialog instead of alias OpenCanvasAddSourceDialog.',
          },
        ],
      };
    },
  };

  const rows = await readCanvasCqRailDriftRows(client, {
    state: 'legacy_alias',
    rail: 'OpenCanvasAddSourceDialog',
    component: 'web.component.canvas.CanvasContextMenu',
    taskId: 'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.canvas_cq_rail_drift_query/);
  assert.match(captured.sql, /drift_state = \$1/);
  assert.match(captured.sql, /requested_rail_name = \$2/);
  assert.match(captured.sql, /component_id = \$3/);
  assert.match(captured.sql, /canonical_task_id = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'legacy_alias',
    'OpenCanvasAddSourceDialog',
    'web.component.canvas.CanvasContextMenu',
    'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1',
    5,
  ]);
  assert.deepEqual(buildCanvasCqRailDriftRows(rows), [
    [
      'warning',
      'legacy_alias',
      'canvas-menu.add-source',
      'context_action',
      'web.component.canvas.CanvasContextMenu',
      'OpenCanvasAddSourceDialog',
      'OpenCanvasSourceImportDialog',
      'command',
      'Use canonical rail OpenCanvasSourceImportDialog instead of alias OpenCanvasAddSourceDialog.',
    ],
  ]);
});

test('planning DB query CLI exposes Canvas CQ rail drift help', () => {
  const result = runPlanningDbQueryCli(['canvas-cq-rail-drift', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB query: canvas-cq-rail-drift/);
  assert.match(result.stdout, /--component <id>/);
  assert.match(result.stdout, /--rail <name>/);
  assert.doesNotMatch(result.stderr, /Unknown planning DB query/);
});

test('readArchitectureComponentRows queries the DB architecture component view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureComponentRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    kind: 'module',
    layer: 'application',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /kind = \$2/);
  assert.match(captured.sql, /layer = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-CORE', 'module', 'application', 5]);
});

test('readComponentProfileRows reads files through the component descendant tree', async () => {
  const capturedSql = [];
  const client = {
    async query(sql) {
      capturedSql.push(sql);
      return { rows: [] };
    },
  };

  await readComponentProfileRows(client, {
    component: 'SYS-RUNTIME-ENGINE-CORE',
    limit: 5,
  });

  assert.match(
    capturedSql.join('\n'),
    /with recursive component_scope\(component_id, scope_depth, visited\) as/i
  );
  assert.match(capturedSql.join('\n'), /parent_component_id = component_scope\.component_id/);
  assert.match(
    capturedSql.join('\n'),
    /from planning_query_store\.component_engineering_file_ownership_projection ownership/i
  );
  assert.match(
    capturedSql.join('\n'),
    /ownership\.leaf_component_id in \(select component_id from component_scope\)/
  );
  assert.doesNotMatch(capturedSql.join('\n'), /scoped_local_components as/i);
  assert.doesNotMatch(capturedSql.join('\n'), /governance_component_local_metadata_query/i);
  assert.doesNotMatch(capturedSql.join('\n'), /governance_component_local_ownership_patterns/i);
  assert.doesNotMatch(capturedSql.join('\n'), /from component_engineering\.file_ownership_query/);
  assert.match(capturedSql.join('\n'), /from architecture\.component_test/);
  assert.match(capturedSql.join('\n'), /from architecture\.component_observability/);
});

test('readComponentProfileRows uses frontend inventory for frontend components', async () => {
  const capturedSql = [];
  const client = {
    async query(sql) {
      capturedSql.push(sql);
      if (sql.includes('frontend_component_summary_query')) {
        return {
          rows: [
            {
              component_id: 'web.component.canvas.SourceImportDialog',
              component_name: 'SourceImportDialog',
              component_kind: 'modal',
              component_status: 'current',
              frontend_owner: 'Canvas / Source import',
              cq_rails: 'OpenCanvasSourceImportDialog;ImportWarehouseSources',
              source_path: 'tools/planning-db/schema.sql',
            },
          ],
        };
      }
      if (sql.includes('frontend_component_file_query')) {
        return {
          rows: [
            {
              component_id: 'web.component.canvas.SourceImportDialog',
              file_path: 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
              file_role: 'component',
              exported_symbol: 'CanvasSourceImportDialogHost',
            },
          ],
        };
      }
      if (sql.includes('frontend_component_rail_query')) {
        return {
          rows: [
            {
              component_id: 'web.component.canvas.SourceImportDialog',
              rail_name: 'OpenCanvasSourceImportDialog',
              rail_kind: 'local-command',
              rail_status: 'implemented-local',
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  const profile = await readComponentProfileRows(client, {
    component: 'web.component.canvas.SourceImportDialog',
    limit: 5,
  });

  assert.equal(profile.component.component_id, 'web.component.canvas.SourceImportDialog');
  assert.equal(profile.component.parent_component_id, 'tools/planning-db/schema.sql');
  assert.equal(
    profile.files[0].path,
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx'
  );
  assert.equal(profile.component.cq_rails, 'OpenCanvasSourceImportDialog');
  assert.match(
    capturedSql.join('\n'),
    /from planning_query_store\.frontend_component_summary_query/
  );
  assert.doesNotMatch(capturedSql.join('\n'), /component_tree_query/);
  assert.doesNotMatch(capturedSql.join('\n'), /component_metadata_query/);
});

test('readArchitectureRelationRows queries the DB architecture relation graph view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureRelationRows(client, {
    component: 'SYS-RUNTIME-ENGINE-APPLICATION',
    kind: 'calls',
    status: 'declared',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_relation_query/);
  assert.match(captured.sql, /\(source_component_id = \$1 or target_component_id = \$1\)/);
  assert.match(captured.sql, /relation_type = \$2/);
  assert.match(captured.sql, /status = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-APPLICATION', 'calls', 'declared', 5]);
});

test('readArchitectureTestRows queries DB-owned component test evidence', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureTestRows(client, {
    component: 'SYS-RUNTIME-ENGINE-APPLICATION',
    kind: 'integration',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_test/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /test_kind = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['SYS-RUNTIME-ENGINE-APPLICATION', 'integration', 5]);
});

test('buildArchitectureTestRows formats component test evidence', () => {
  assert.deepEqual(
    buildArchitectureTestRows([
      {
        test_id: 'TEST-ENGINE-LIFECYCLE',
        component_id: 'SYS-RUNTIME-ENGINE-APPLICATION',
        test_path: 'packages/@dvt/engine/test/lifecycle.test.ts',
        test_kind: 'integration',
        coverage_level: 'behavior',
        required: true,
        validation_command: 'pnpm --filter @dvt/engine test',
      },
    ]),
    [
      [
        'TEST-ENGINE-LIFECYCLE',
        'SYS-RUNTIME-ENGINE-APPLICATION',
        'packages/@dvt/engine/test/lifecycle.test.ts',
        'integration',
        'behavior',
        'true',
        'pnpm --filter @dvt/engine test',
      ],
    ]
  );
});

test('readArchitectureObservabilityRows queries DB-owned component observability evidence', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureObservabilityRows(client, {
    component: 'SYS-API-OPS-ROUTES',
    kind: 'log',
    state: 'implemented',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_observability/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /signal_kind = \$2/);
  assert.match(captured.sql, /status = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['SYS-API-OPS-ROUTES', 'log', 'implemented', 5]);
});

test('readCodeSymbolRows queries DB-owned code symbol inventory', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCodeSymbolRows(client, {
    component: 'SYS-CI-TOOLS-PLANNING-DB',
    path: 'scripts/planning-db-query.cjs',
    kind: 'function',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.code_symbol_inventory_query/);
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /file_path = \$2/);
  assert.match(captured.sql, /symbol_kind = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'SYS-CI-TOOLS-PLANNING-DB',
    'scripts/planning-db-query.cjs',
    'function',
    5,
  ]);
});

test('readCodeSymbolDuplicateRows queries DB-owned duplicate symbol findings', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readCodeSymbolDuplicateRows(client, {
    kind: 'exact_body_duplicate',
    severity: 'warning',
    component: 'SYS-CI-TOOLS-PLANNING-DB',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.code_symbol_problem_query/);
  assert.match(captured.sql, /finding_kind = \$1/);
  assert.match(captured.sql, /severity = \$2/);
  assert.match(captured.sql, /component_id = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'exact_body_duplicate',
    'warning',
    'SYS-CI-TOOLS-PLANNING-DB',
    5,
  ]);
});

test('readSourceDriftRows queries DB-owned governed source drift findings', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readSourceDriftRows(client, {
    path: 'buzon/TAREA.TXT',
    severity: 'error',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governed_source_drift_query/);
  assert.match(captured.sql, /source_path = \$1/);
  assert.match(captured.sql, /severity = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['buzon/TAREA.TXT', 'error', 5]);
});

test('buildArchitectureObservabilityRows formats component observability evidence', () => {
  assert.deepEqual(
    buildArchitectureObservabilityRows([
      {
        observability_id: 'OBS-API-OPS-ROUTES-READINESS-DB-PROBE-FAILED',
        component_id: 'SYS-API-OPS-ROUTES',
        signal_name: 'api.health.readiness.database_probe_failed',
        signal_kind: 'log',
        required: true,
        status: 'implemented',
      },
    ]),
    [
      [
        'OBS-API-OPS-ROUTES-READINESS-DB-PROBE-FAILED',
        'SYS-API-OPS-ROUTES',
        'api.health.readiness.database_probe_failed',
        'log',
        'true',
        'implemented',
      ],
    ]
  );
});

test('readArchitectureFlowRows filters component participation through entry, exit, and flow steps', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readArchitectureFlowRows(client, {
    component: 'SYS-RUNTIME-ENGINE-STATE-STORE',
    kind: 'command',
    status: 'declared',
    limit: 5,
  });

  assert.match(captured.sql, /from architecture\.component_flow_query flow/);
  assert.match(captured.sql, /flow\.entry_component_id = \$3/);
  assert.match(captured.sql, /flow\.exit_component_id = \$3/);
  assert.match(captured.sql, /from architecture\.component_flow_step_query step/);
  assert.match(captured.sql, /step\.flow_id = flow\.flow_id/);
  assert.match(captured.sql, /step\.component_id = \$3/);
  assert.deepEqual(captured.params, ['command', 'declared', 'SYS-RUNTIME-ENGINE-STATE-STORE', 5]);
});

test('buildArchitecture rows expose Fowler-relevant authority columns', () => {
  assert.deepEqual(
    buildArchitectureDesignRows([
      {
        design_id: 'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
        work_item_id: 'DATABASE-AUTHORITY',
        status: 'review',
        owner: 'Architecture',
        rail_ref: 'CreateArchitectureDesign',
        fowler_signal: 'Hidden authority',
      },
    ]),
    [
      [
        'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
        'DATABASE-AUTHORITY',
        'review',
        'Architecture',
        'CreateArchitectureDesign',
        'Hidden authority',
      ],
    ]
  );

  assert.deepEqual(
    buildArchitectureComponentRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        name: 'Runtime engine core',
        kind: 'module',
        layer: 'application',
        owner: 'Architecture',
        status: 'declared',
        maturity_score: 75,
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'Runtime engine core',
        'module',
        'application',
        'Architecture',
        'declared',
        75,
      ],
    ]
  );

  assert.deepEqual(
    buildArchitectureIoRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        io_id: 'PORT-ENGINE-START-RUN',
        io_kind: 'port',
        metadata: { portKind: 'command' },
        io_name: 'StartRun',
        direction: 'inbound',
        contract_id: 'CONTRACT-ENGINE-START-RUN',
        runtime: 'node',
      },
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        io_id: 'ADAPTER-ENGINE-TEMPORAL',
        io_kind: 'adapter',
        io_name: 'TemporalProviderAdapter',
        direction: 'outbound',
        runtime: 'node',
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'PORT-ENGINE-START-RUN',
        'port',
        'command',
        'StartRun',
        'inbound',
        'CONTRACT-ENGINE-START-RUN',
        'node',
      ],
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'ADAPTER-ENGINE-TEMPORAL',
        'adapter',
        'adapter',
        'TemporalProviderAdapter',
        'outbound',
        '-',
        'node',
      ],
    ]
  );

  assert.deepEqual(
    buildArchitectureRelationRows([
      {
        relation_id: 'REL-1',
        source_component_id: 'A',
        target_component_id: 'B',
        relation_type: 'calls',
        direction: 'outbound',
        sync_async: 'sync',
        status: 'declared',
      },
    ]),
    [['REL-1', 'A', 'B', 'calls', 'outbound', 'sync', 'declared']]
  );
});

test('readGovernanceCoverageRows queries the DB governance coverage view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceCoverageRows(client, {
    kind: 'component',
    component: 'SYS-DOCS-GOVERNANCE',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_coverage_query/);
  assert.match(captured.sql, /coverage_kind = \$1/);
  assert.match(captured.sql, /component_id = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['component', 'SYS-DOCS-GOVERNANCE', 5]);
});

test('readGovernanceRemediationRows queries the DB governance remediation view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceRemediationRows(client, {
    priority: 'P0',
    component: 'SYS-DOCS-GOVERNANCE',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_remediation_query/);
  assert.match(captured.sql, /priority = \$1/);
  assert.match(captured.sql, /component_unit = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['P0', 'SYS-DOCS-GOVERNANCE', 5]);
});

test('readRiskDebtRows queries DB-owned risk debt with task-like filters', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readRiskDebtRows(client, {
    priority: 'P1',
    status: 'Open',
    component: 'SYS-PLANNING-DB',
    path: 'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.risk_debt_query/);
  assert.match(captured.sql, /priority = \$1/);
  assert.match(captured.sql, /status = \$2/);
  assert.match(captured.sql, /component_unit = \$3/);
  assert.match(captured.sql, /source_path = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'P1',
    'Open',
    'SYS-PLANNING-DB',
    'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
    5,
  ]);
});

test('buildRiskDebtRows formats risk debt as actionable task rows', () => {
  assert.deepEqual(
    buildRiskDebtRows([
      {
        priority: 'P1',
        status: 'Open',
        risk_id: 'R-20260514-EXAMPLE-DEBT',
        component_unit: 'SYS-PLANNING-DB',
        source_path: 'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
        title: 'Example planning debt remains visible',
      },
    ]),
    [
      [
        'P1',
        'Open',
        'R-20260514-EXAMPLE-DEBT',
        'SYS-PLANNING-DB',
        'docs/risk-register/quality/R-20260514-EXAMPLE-DEBT.yaml',
        'Example planning debt remains visible',
      ],
    ]
  );
});

test('readGovernanceDriftRows queries the DB governance drift view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readGovernanceDriftRows(client, {
    component: 'SYS-DOCS-GOVERNANCE',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.governance_drift_query/);
  assert.doesNotMatch(captured.sql, /from planning_query_store\.governance_file_hash_drift/);
  assert.match(captured.sql, /component_unit = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-DOCS-GOVERNANCE', 5]);
});

test('readComponentEngineeringRecordRows queries the DB CER view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringRecordRows(client, {
    component: 'SYS-API-HTTP-ENTRYPOINTS',
    limit: 1,
  });

  assert.match(
    captured.sql,
    /from planning_query_store\.governance_component_engineering_record_query/
  );
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-API-HTTP-ENTRYPOINTS', 1]);
});

test('readComponentEngineeringRecordRows queries the DB CER v2 view when requested', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readComponentEngineeringRecordRows(client, {
    component: 'SYS-API-HTTP-ENTRYPOINTS',
    schemaVersion: 'v2',
    limit: 1,
  });

  assert.match(
    captured.sql,
    /from planning_query_store\.governance_component_engineering_record_v2_query/
  );
  assert.match(captured.sql, /component_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['SYS-API-HTTP-ENTRYPOINTS', 1]);
});

test('governance row builders format DB rows for CLI output', () => {
  assert.deepEqual(
    buildGovernanceUnitRows([
      {
        unit_id: 'SYS-API-ROOT',
        name: 'API root module',
        level: 'module',
        parent_id: 'SYS-API',
        governance_state: 'coverage-required',
        direct_file_count: 0,
        descendant_file_count: 243,
        ddd_owner: null,
        is_materialized_component: false,
      },
    ]),
    [['SYS-API-ROOT', 'API root module', 'module', 'SYS-API', 'coverage-required', 0, 243, '-']]
  );
  assert.deepEqual(
    buildGovernanceComponentRows([
      {
        component_id: 'SYS-DOCS-GOVERNANCE',
        file_count: 42,
        governance_state: 'stable',
        is_drift: false,
        is_legacy: false,
        ddd_owner: 'DocsGovernance',
      },
    ]),
    [['SYS-DOCS-GOVERNANCE', 42, 'stable', '-', '-', 'DocsGovernance']]
  );
  assert.deepEqual(
    buildComponentEngineeringComponentTreeRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        name: 'Runtime engine core',
        component_level: 'component',
        parent_component_id: 'SYS-RUNTIME-ROOT',
        governance_state: 'coverage-required',
        direct_file_count: 12,
        descendant_file_count: 189,
        ddd_owner: 'AS',
        is_leaf_component: false,
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'Runtime engine core',
        'component',
        'SYS-RUNTIME-ROOT',
        'coverage-required',
        12,
        189,
        'AS',
        'false',
      ],
    ]
  );
  assert.deepEqual(
    buildComponentEngineeringComponentDriftRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        drift_code: 'children_required_without_children',
        metadata: { componentId: 'SYS-RUNTIME-ENGINE-CORE' },
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'children_required_without_children',
        '{"componentId":"SYS-RUNTIME-ENGINE-CORE"}',
      ],
    ]
  );
  assert.deepEqual(
    buildComponentEngineeringComponentMetadataRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        name: 'Runtime engine core',
        owned_concern: 'Owns deterministic runtime orchestration.',
        metadata_state: 'declared',
        quality_state: 'warn',
        direct_file_count: 0,
        descendant_file_count: 189,
        drift_codes: ['missing_public_api'],
      },
    ]),
    [
      [
        'SYS-RUNTIME-ENGINE-CORE',
        'Runtime engine core',
        'declared',
        'warn',
        0,
        189,
        'missing_public_api',
        'Owns deterministic runtime orchestration.',
      ],
    ]
  );
  assert.deepEqual(
    buildComponentEngineeringRuleCatalogRows([
      {
        rule_id: 'CEI-RESP-001',
        category: 'responsibility',
        severity: 'error',
        subject_level: 'component',
        drift_code: 'missing_owned_concern',
      },
    ]),
    [['CEI-RESP-001', 'responsibility', 'error', 'component', 'missing_owned_concern']]
  );
  assert.deepEqual(
    buildComponentEngineeringRuleEvaluationRows([
      {
        rule_id: 'CEI-ID-006',
        subject_id: 'SYS-RUNTIME-ENGINE-CORE',
        evaluation_state: 'pass',
        severity: 'error',
        drift_code: null,
      },
    ]),
    [['CEI-ID-006', 'SYS-RUNTIME-ENGINE-CORE', 'pass', 'error', '-']]
  );
  assert.deepEqual(
    buildComponentEngineeringQualityRows([
      {
        component_id: 'SYS-RUNTIME-ENGINE-CORE',
        name: 'Runtime engine core',
        component_level: 'component',
        quality_state: 'pass',
        direct_file_count: 0,
        descendant_file_count: 189,
        children_count: 16,
        test_file_count: 0,
        failing_rule_count: 0,
        drift_codes: [],
      },
    ]),
    [['SYS-RUNTIME-ENGINE-CORE', 'Runtime engine core', 'component', 'pass', 0, 189, 16, 0, 0, '-']]
  );
  assert.deepEqual(
    buildGovernanceCoverageRows([
      {
        coverage_kind: 'component',
        name: 'SYS-DOCS-GOVERNANCE',
        count_value: 42,
        file_count: 42,
        component_id: 'SYS-DOCS-GOVERNANCE',
      },
    ]),
    [['component', 'SYS-DOCS-GOVERNANCE', 42, 42, 'SYS-DOCS-GOVERNANCE']]
  );
  assert.deepEqual(
    buildGovernanceRemediationRows([
      {
        priority: 'P0',
        task_id: 'GOV-1',
        component_unit: 'SYS-DOCS-GOVERNANCE',
        file_count: 4,
        reason: 'Component is too broad.',
      },
    ]),
    [['P0', 'GOV-1', 'SYS-DOCS-GOVERNANCE', 4, 'Component is too broad.']]
  );
  assert.deepEqual(
    buildGovernanceDriftRows([
      {
        path: 'docs/example.md',
        component_unit: 'SYS-DOCS-GOVERNANCE',
        owning_unit: 'SYS-DOCS-GOVERNANCE',
        drift_fields: ['governance_hash', 'state_fingerprint'],
      },
    ]),
    [
      [
        'docs/example.md',
        'SYS-DOCS-GOVERNANCE',
        'SYS-DOCS-GOVERNANCE',
        'governance_hash,state_fingerprint',
      ],
    ]
  );
  assert.deepEqual(
    buildComponentEngineeringRecordRows([
      {
        component_id: 'SYS-API-HTTP-ENTRYPOINTS',
        record: {
          identity: {
            componentId: 'SYS-API-HTTP-ENTRYPOINTS',
            name: 'API HTTP entrypoints',
          },
          publicContract: {
            commandQueryRails: 'API HTTP command/query route rails',
          },
        },
      },
    ]),
    [
      {
        identity: {
          componentId: 'SYS-API-HTTP-ENTRYPOINTS',
          name: 'API HTTP entrypoints',
        },
        publicContract: {
          commandQueryRails: 'API HTTP command/query route rails',
        },
      },
    ]
  );
});
