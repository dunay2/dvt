/**
 * @file scripts/planning-db-query.cjs
 * @ownedConcern Expose DB-owned architecture and governance read models through one operator query command.
 * @baseline ADR-0061: GitHub MVP task authority and Planning DB architecture boundary
 * @baseline ADR-0063: Planning DB current-schema rebuild
 * @decision Keep MVP task lifecycle in GitHub Issues and expose only architecture and governance DB reads.
 * @decision Rebuild and validate the current Planning DB state before serving refreshed queries.
 * @consequence The CLI cannot create a second task backlog or read a compatibility projection.
 * @version 1.0.0
 */
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { schemaName } = require('./planning-db-schema.cjs');
const { runPlanningImport } = require('./planning-db-import.cjs');
const {
  buildCommandQueryRailRows,
  buildCreationIntentRows,
  normalizeCreationIntentForSearch,
  parseBooleanFilter,
  readCommandQueryRailRows,
  readCreationIntentRows,
} = require('./planning-db/queries/command-query-rail-query.cjs');
const {
  buildFrontendMechanicalTruthRows,
  readFrontendMechanicalTruthRows,
} = require('./planning-db/frontend-mechanical-truth-inventory.cjs');
const { appendComponentPairFilter, appendFilter } = require('./planning-db/query-filter.cjs');
const { parseLimit } = require('./planning-db/query-limit.cjs');
const {
  buildFrontendComponentFileRows,
  buildFrontendComponentRailRows,
  buildFrontendComponentRows,
  readFrontendComponentFileRows,
  readFrontendComponentRailRows,
  readFrontendComponentRows,
} = require('./planning-db/frontend-component-inventory.cjs');
const {
  buildFeatureMechanizationComponentRows,
  buildFeatureMechanizationFeatureRows,
  buildFeatureMechanizationRailRows,
  buildFeatureMechanizationSymbolRows,
  buildFeatureMechanizationValidationRows,
  readFeatureMechanizationComponentRows,
  readFeatureMechanizationFeatureRows,
  readFeatureMechanizationRailRows,
  readFeatureMechanizationSymbolRows,
  readFeatureMechanizationValidationRows,
} = require('./planning-db/queries/feature-mechanization-query.cjs');
const {
  buildKnowledgeIntakeReferenceRows,
  buildKnowledgeIntakeRetirementRows,
  readKnowledgeIntakeReferenceRows,
  readKnowledgeIntakeRetirementRows,
} = require('./planning-db/queries/knowledge-intake-retirement-query.cjs');
const {
  buildFowlerAnalysisCanonicalCoverageRows,
  buildFowlerAnalysisDuplicateRows,
  buildFowlerAnalysisIntentRows,
  buildFowlerAnalysisReferenceRows,
  buildFowlerAnalysisRetirementRows,
  buildFowlerAnalysisRows,
  readFowlerAnalysisCanonicalCoverageRows,
  readFowlerAnalysisDuplicateRows,
  readFowlerAnalysisIntentRows,
  readFowlerAnalysisReferenceRows,
  readFowlerAnalysisRetirementRows,
  readFowlerAnalysisRows,
} = require('./planning-db/queries/fowler-analysis-query.cjs');
const {
  buildDocumentationLifecycleRows,
  readDocumentationLifecycleRows,
} = require('./planning-db/queries/documentation-lifecycle-query.cjs');
const {
  buildDocumentationPanelRows,
  readDocumentationPanelRows,
} = require('./planning-db/queries/documentation-panel-query.cjs');
const {
  buildComponentRoadmapRows,
  readComponentRoadmapRows,
} = require('./planning-db/queries/component-roadmap-query.cjs');
const {
  buildCanvasUxdbSpecificationRows,
  readCanvasUxdbSpecificationRows,
} = require('./planning-db/queries/canvas-uxdb-specification-query.cjs');
const {
  buildCanvasCqRailDriftRows,
  readCanvasCqRailDriftRows,
} = require('./planning-db/queries/canvas-cq-rail-drift-query.cjs');
const {
  buildCanvasComponentRegistryDriftRows,
  readCanvasComponentRegistryDriftRows,
} = require('./planning-db/queries/canvas-component-registry-drift-query.cjs');
const {
  buildGovernanceRefreshRunRows,
  readGovernanceRefreshRunRows,
} = require('./planning-db/queries/governance-refresh-run-query.cjs');
const {
  buildArchitectureDependencyClassificationRows,
  buildArchitectureDependencyObservationRows,
  buildArchitectureFitnessGapRows,
  buildArchitectureFitnessRows,
  buildArchitecturePathMappingRows,
  readArchitectureDependencyClassificationRows,
  readArchitectureDependencyObservationRows,
  readArchitectureFitnessGapRows,
  readArchitectureFitnessRows,
  readArchitecturePathMappingRows,
} = require('./planning-db/queries/component-architecture-fitness-query.cjs');
const {
  buildComponentIntegrityRows,
  readComponentIntegrityRows,
} = require('./planning-db/queries/component-integrity-query.cjs');
const {
  buildRailVocabularyRows,
  readRailVocabularyRows,
} = require('./planning-db/queries/rail-vocabulary-query.cjs');
const {
  buildCodeSymbolDuplicateRows,
  buildCodeSymbolRows,
  buildGovernanceProblemRows,
  buildSourceDriftRows,
  readCodeSymbolDuplicateRows,
  readCodeSymbolRows,
  readGovernanceProblemRows,
  readSourceDriftRows,
} = require('./planning-db/queries/code-symbol-query.cjs');
const { buildDbSurfaceRows, readDbSurfaceRows } = require('./planning-db/db-surface-inventory.cjs');
const {
  buildDbtProjectRoundtripCapabilityStatusRows,
  readDbtProjectRoundtripCapabilityStatusRows,
} = require('./planning-db/queries/dbt-project-roundtrip-capability-status-query.cjs');

const architectureSchemaName = 'architecture';
const componentEngineeringSchemaName = 'component_engineering';

const knownQueries = new Set([
  'summary',
  'hash-drift',
  'files',
  'components',
  'units',
  'coverage',
  'remediation',
  'debt',
  'drift',
  'commands',
  'command-query-rails',
  'rail-vocabulary',
  'rail-duplicates',
  'code-symbols',
  'code-symbol-duplicates',
  'code-symbol-semantic-candidates',
  'source-drift',
  'governance-problem-dashboard',
  'ai-project-context',
  'creation-intent',
  'frontend-surfaces',
  'frontend-components',
  'frontend-component-files',
  'frontend-component-rails',
  'feature-mechanization',
  'feature-mechanization-components',
  'feature-mechanization-symbols',
  'feature-mechanization-rails',
  'feature-mechanization-validations',
  'pr-readiness',
  'docs-disposition',
  'cer',
  'knowledge-documents',
  'knowledge-actions',
  'knowledge-intake',
  'fowler-analysis',
  'fowler-analysis-references',
  'fowler-analysis-retirement',
  'fowler-analysis-coverage',
  'fowler-analysis-intent',
  'fowler-analysis-duplicates',
  'documentation-lifecycle',
  'documentation-panels',
  'component-roadmap',
  'canvas-cq-rail-drift',
  'canvas-component-registry-drift',
  'canvas-uxdb-specification',
  'component-profile',
  'governance-refresh-runs',
  'mandatory-proposal-gaps',
  'db-surfaces',
  'component-tree',
  'component-metadata',
  'component-drift',
  'component-rules',
  'component-rule-evaluations',
  'component-quality',
  'architecture-designs',
  'component-integrity',
  'component-validation',
  'filesystem-coverage',
  'architecture-scopes',
  'architecture-components',
  'architecture-relations',
  'architecture-responsibilities',
  'architecture-io',
  'architecture-flows',
  'architecture-flow-steps',
  'architecture-contracts',
  'architecture-maturity',
  'architecture-drift',
  'architecture-enforcement',
  'architecture-evidence',
  'architecture-dependency-observations',
  'architecture-path-mapping',
  'architecture-dependency-classification',
  'architecture-fitness',
  'architecture-fitness-gaps',
  'dbt-roundtrip-capabilities',
]);
const governanceProjectionQueryNames = new Set([
  'files',
  'components',
  'units',
  'coverage',
  'remediation',
  'debt',
  'drift',
  'command-query-rails',
  'code-symbols',
  'code-symbol-duplicates',
  'code-symbol-semantic-candidates',
  'source-drift',
  'governance-problem-dashboard',
  'ai-project-context',
  'creation-intent',
  'frontend-surfaces',
  'frontend-components',
  'frontend-component-files',
  'frontend-component-rails',
  'feature-mechanization',
  'feature-mechanization-components',
  'feature-mechanization-symbols',
  'feature-mechanization-rails',
  'feature-mechanization-validations',
  'cer',
  'component-tree',
  'component-metadata',
  'component-drift',
  'component-rules',
  'component-rule-evaluations',
  'component-quality',
  'knowledge-documents',
  'knowledge-actions',
  'knowledge-intake',
  'fowler-analysis',
  'fowler-analysis-references',
  'fowler-analysis-retirement',
  'fowler-analysis-coverage',
  'fowler-analysis-intent',
  'fowler-analysis-duplicates',
  'documentation-lifecycle',
  'documentation-panels',
  'mandatory-proposal-gaps',
  'canvas-cq-rail-drift',
  'canvas-component-registry-drift',
]);
const taskIdCommonFilterQueryNames = new Set(['canvas-cq-rail-drift', 'canvas-uxdb-specification']);
const featureIdCommonFilterQueryNames = new Set([
  'feature-mechanization',
  'feature-mechanization-components',
  'feature-mechanization-symbols',
  'feature-mechanization-rails',
  'feature-mechanization-validations',
]);
const railCommonFilterQueryNames = new Set(['command-query-rails', 'dbt-roundtrip-capabilities']);
const pathCommonFilterQueryNames = new Set([
  'files',
  'frontend-component-files',
  'docs-disposition',
  'knowledge-documents',
  'knowledge-actions',
  'knowledge-intake',
  'fowler-analysis',
  'fowler-analysis-references',
  'fowler-analysis-retirement',
  'fowler-analysis-coverage',
  'fowler-analysis-intent',
  'documentation-lifecycle',
  'documentation-panels',
  'component-roadmap',
  'mandatory-proposal-gaps',
  'code-symbols',
  'code-symbol-duplicates',
  'code-symbol-semantic-candidates',
  'source-drift',
  'governance-problem-dashboard',
]);
const componentCommonFilterQueryNames = new Set([
  'components',
  'units',
  'coverage',
  'remediation',
  'debt',
  'drift',
  'frontend-components',
  'frontend-component-rails',
  'documentation-panels',
  'component-tree',
  'component-roadmap',
  'component-profile',
  'component-integrity',
  'component-validation',
  'filesystem-coverage',
  'component-metadata',
  'component-drift',
  'component-rules',
  'component-rule-evaluations',
  'component-quality',
  'canvas-cq-rail-drift',
  'canvas-component-registry-drift',
  'architecture-components',
  'architecture-relations',
  'architecture-responsibilities',
  'architecture-io',
  'architecture-flows',
  'architecture-flow-steps',
  'architecture-contracts',
  'architecture-maturity',
  'architecture-drift',
  'architecture-enforcement',
  'architecture-evidence',
  'architecture-dependency-observations',
  'architecture-path-mapping',
  'architecture-dependency-classification',
  'architecture-fitness',
  'architecture-fitness-gaps',
  'code-symbols',
  'code-symbol-duplicates',
  'code-symbol-semantic-candidates',
  'governance-problem-dashboard',
]);

function isHelpCommand(value) {
  return value === 'help' || value === '--help' || value === '-h';
}

function isHelpFlag(value) {
  return value === '--help' || value === '-h';
}

function buildPlanningDbQueryHelpText(queryName) {
  const sortedQueries = [...knownQueries].sort();
  const commonOptions = [
    '--filter <value> (task id, path, component, rail, or feature id where supported)',
    '--limit <n>',
    '--component <id>',
    '--state <state>',
    '--kind <kind>',
    '--path <path>',
    '--owner <owner>',
    '--refresh --confirm-expensive-governance-refresh',
    '--no-refresh',
  ];

  if (queryName) {
    const examples = [`  pnpm planning:db:query ${queryName} --limit 20`];
    const querySpecificOptions = [];
    if (queryName === 'component-profile') {
      examples.push(`  pnpm planning:db:query ${queryName} --component SYS-WEB-ROOT --limit 50`);
    } else if (queryName === 'canvas-cq-rail-drift') {
      querySpecificOptions.push('--rail <name>');
      examples.push(
        `  pnpm planning:db:query ${queryName} --state missing_canonical_rail --limit 20`,
        `  pnpm planning:db:query ${queryName} --rail OpenCanvasAddSourceDialog --limit 20`
      );
    } else if (queryName === 'canvas-component-registry-drift') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --state unmapped_canvas_component_file --limit 20`,
        `  pnpm planning:db:query ${queryName} --component web.component.canvas.CanvasViewport --limit 20`
      );
    } else if (queryName === 'dbt-roundtrip-capabilities') {
      querySpecificOptions.push('--phase <number>');
      examples.push(
        `  pnpm planning:db:query ${queryName} --phase 4 --limit 20`,
        `  pnpm planning:db:query ${queryName} --filter PreviewExecutionPlan --limit 20`
      );
    } else if (
      taskIdCommonFilterQueryNames.has(queryName) ||
      railCommonFilterQueryNames.has(queryName) ||
      pathCommonFilterQueryNames.has(queryName) ||
      componentCommonFilterQueryNames.has(queryName)
    ) {
      const filterExample = railCommonFilterQueryNames.has(queryName)
        ? 'RenderSourceImportCatalogView'
        : 'E-PROP-DISP-1';
      examples.push(`  pnpm planning:db:query ${queryName} --filter ${filterExample} --limit 20`);
    } else if (queryName === 'feature-mechanization-components') {
      examples.push(`  pnpm planning:db:query ${queryName} --state implemented --limit 20`);
    } else if (queryName === 'feature-mechanization-symbols') {
      examples.push(`  pnpm planning:db:query ${queryName} --path apps/web/example.tsx --limit 20`);
    } else if (queryName === 'feature-mechanization-rails') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --rail ListFeatureMechanizationRails --limit 20`
      );
    } else if (queryName === 'feature-mechanization-validations') {
      examples.push(`  pnpm planning:db:query ${queryName} --kind completion --limit 20`);
    } else if (queryName === 'documentation-lifecycle') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --gaps true --limit 20`,
        `  pnpm planning:db:query ${queryName} --duplicates true --canonicality canonical --limit 20`
      );
    } else if (queryName === 'fowler-analysis') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --state ready_to_retire --limit 20`,
        `  pnpm planning:db:query ${queryName} --gaps true --limit 20`
      );
    } else if (queryName === 'fowler-analysis-references') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --state live --path buzon/example.md --limit 20`,
        `  pnpm planning:db:query ${queryName} --target docs/architecture/components/example.md --limit 20`
      );
    } else if (queryName === 'fowler-analysis-retirement') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --retirement-allowed true --limit 20`,
        `  pnpm planning:db:query ${queryName} --state blocked_by_references --limit 20`
      );
    } else if (queryName === 'fowler-analysis-coverage') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --state target_missing --limit 20`,
        `  pnpm planning:db:query ${queryName} --target docs/architecture/components/example.md --limit 20`
      );
    } else if (queryName === 'fowler-analysis-intent') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --duplicates true --limit 20`,
        `  pnpm planning:db:query ${queryName} --state duplicate_open_intent --limit 20`
      );
    } else if (queryName === 'fowler-analysis-duplicates') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --state open_duplicate --limit 20`,
        `  pnpm planning:db:query ${queryName} --target docs/architecture/components/example.md --limit 20`
      );
    } else if (queryName === 'documentation-panels') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --surface properties --component SYS-WEB-ROOT --limit 20`,
        `  pnpm planning:db:query ${queryName} --gaps true --subject overview --limit 20`
      );
    } else if (queryName === 'component-roadmap') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --gaps true --limit 20`,
        `  pnpm planning:db:query ${queryName} --component docs/architecture/components/web/index.md --limit 20`
      );
    } else if (queryName === 'canvas-uxdb-specification') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --filter E-CANVAS-UXDB-SPEC-PERSISTENCE-1 --limit 20`,
        `  pnpm planning:db:query ${queryName} --kind context_action --rail ResolveCanvasContextMenu --limit 20`
      );
    } else if (queryName === 'architecture-dependency-observations') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --design design-21-component-architecture-fitness-dbfirst --limit 20`,
        `  pnpm planning:db:query ${queryName} --component SYS-WEB-ROOT --limit 20`
      );
    } else if (queryName === 'architecture-path-mapping') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --state unmapped --limit 20`,
        `  pnpm planning:db:query ${queryName} --path apps/web/src/app/App.tsx --limit 20`
      );
    } else if (queryName === 'architecture-dependency-classification') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --classification undeclared_dependency --limit 20`,
        `  pnpm planning:db:query ${queryName} --state fail --limit 20`
      );
    } else if (queryName === 'architecture-fitness') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --rule DVT-ARCH-003 --state fail --limit 20`,
        `  pnpm planning:db:query ${queryName} --design design-21-component-architecture-fitness-dbfirst --limit 20`
      );
    } else if (queryName === 'architecture-fitness-gaps') {
      examples.push(
        `  pnpm planning:db:query ${queryName} --kind unmapped_source --limit 20`,
        `  pnpm planning:db:query ${queryName} --state fail --component SYS-WEB-ROOT --limit 20`
      );
    }

    return [
      `Planning DB query: ${queryName}`,
      '',
      'Usage:',
      `  pnpm planning:db:query ${queryName} [filters]`,
      `  pnpm planning:db:query ${queryName} --help`,
      '',
      'Common filters:',
      `  ${commonOptions.join(', ')}`,
      ...(querySpecificOptions.length > 0
        ? ['', 'Query-specific filters:', `  ${querySpecificOptions.join(', ')}`]
        : []),
      '',
      'Examples:',
      ...examples,
    ].join('\n');
  }

  return [
    'Planning DB query CLI',
    '',
    'Usage:',
    '  pnpm planning:db:query [query] [filters]',
    '  pnpm planning:db:query --help',
    '  pnpm planning:db:query <query> --help',
    '',
    'Queries:',
    `  ${sortedQueries.join(', ')}`,
    '',
    'Common filters:',
    `  ${commonOptions.join(', ')}`,
    '',
    'Examples:',
    '  pnpm planning:db:query summary',
    '  pnpm planning:db:query component-metadata --component SYS-WEB-ROOT --limit 20',
    '  pnpm planning:db:query component-drift --component SYS-WEB-ROOT --limit 20',
  ].join('\n');
}

function resolveQueryHelpRequest(args) {
  const [queryNameArg, ...rest] = args;
  if (queryNameArg === undefined) {
    return null;
  }

  if (isHelpCommand(queryNameArg)) {
    if (queryNameArg === 'help' && rest[0]) {
      return buildPlanningDbQueryHelpText(resolveQueryName(rest[0]));
    }
    return buildPlanningDbQueryHelpText();
  }

  if (rest.some(isHelpFlag)) {
    return buildPlanningDbQueryHelpText(resolveQueryName(queryNameArg));
  }

  return null;
}

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function resolveQueryName(value) {
  const queryName = value || 'summary';
  if (!knownQueries.has(queryName)) {
    throw new Error(
      `Unknown planning DB query "${queryName}". Expected: ${[...knownQueries].sort().join(', ')}.`
    );
  }

  return queryName;
}

function usesGovernanceProjection(queryName) {
  return governanceProjectionQueryNames.has(queryName);
}

async function ensureFreshGovernanceProjection(queryName, options = {}) {
  if (options.autoImportGovernance !== true || !usesGovernanceProjection(queryName)) {
    return null;
  }

  const runImport = options.runPlanningImport || runPlanningImport;
  const result = await runImport(
    {
      databaseUrl: options.databaseUrl || databaseUrl(),
      ifStale: true,
      silent: true,
    },
    {
      logger: {
        log() {},
      },
    }
  );

  if ((result.importedScopes || []).includes('governance')) {
    const logger = options.logger || console;
    const write = typeof logger.error === 'function' ? logger.error.bind(logger) : console.error;
    write(`[planning:db:query] refreshed stale governance projection before ${queryName}`);
  }

  return result;
}

function parseCerSchemaVersion(value) {
  const schemaVersion = value || 'v1';
  if (schemaVersion !== 'v1' && schemaVersion !== 'v2') {
    throw new Error(`Invalid --schema-version "${value}". Expected v1 or v2.`);
  }

  return schemaVersion;
}

function parseOutputFormat(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'json' || normalized === 'markdown') {
    return normalized;
  }

  throw new Error(`Invalid --format "${value}". Expected json or markdown.`);
}

function applyCommonFilter(filters, queryName, value) {
  if (taskIdCommonFilterQueryNames.has(queryName)) {
    filters.taskId = value;
    return;
  }

  if (featureIdCommonFilterQueryNames.has(queryName)) {
    filters.featureId = value;
    return;
  }

  if (queryName === 'dbt-roundtrip-capabilities') {
    filters.rail = value;
    return;
  }

  if (railCommonFilterQueryNames.has(queryName)) {
    filters.search = value;
    return;
  }

  if (pathCommonFilterQueryNames.has(queryName)) {
    filters.path = value;
    return;
  }

  if (queryName === 'frontend-components') {
    filters.search = value;
    return;
  }

  if (componentCommonFilterQueryNames.has(queryName)) {
    filters.component = value;
    return;
  }

  throw new Error(
    `--filter is not supported for planning DB query "${queryName}". Use a query-specific filter flag.`
  );
}

function normalizeResolutionFilter(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = String(value).toLowerCase();
  if (normalized === 'open') {
    return 'pending';
  }

  if (['all', 'pending', 'resolved'].includes(normalized)) {
    return normalized;
  }

  throw new Error(
    `Invalid --resolution "${value}". Expected one of: pending, resolved, all, open.`
  );
}

function parseArgs(args = process.argv.slice(2)) {
  const helpText = resolveQueryHelpRequest(args);
  if (helpText) {
    return { kind: 'help', helpText };
  }

  const [queryNameArg, ...rest] = args;
  const queryName = resolveQueryName(queryNameArg);
  const filters = {};
  let autoImportGovernance;
  let outputFormat;
  let refreshRequested = false;
  let refreshConfirmed = false;
  let noRefreshRequested = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument "${arg}". Expected --name value flags.`);
    }

    if (arg === '--no-refresh') {
      noRefreshRequested = true;
      autoImportGovernance = false;
      continue;
    }
    if (arg === '--refresh') {
      refreshRequested = true;
      autoImportGovernance = true;
      continue;
    }
    if (arg === '--confirm-expensive-governance-refresh') {
      refreshConfirmed = true;
      continue;
    }
    if (arg === '--references') {
      if (queryName !== 'knowledge-intake') {
        throw new Error(`Unknown planning DB query option "${arg}".`);
      }
      filters.references = true;
      continue;
    }

    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}.`);
    }
    index += 1;

    if (arg === '--status') {
      filters.status = value;
      continue;
    }
    if (arg === '--claimed-by') {
      filters.claimedBy = value;
      continue;
    }
    if (arg === '--filter') {
      applyCommonFilter(filters, queryName, value);
      continue;
    }
    if (arg === '--priority') {
      filters.priority = value;
      continue;
    }
    if (arg === '--component') {
      filters.component = value;
      continue;
    }
    if (arg === '--design') {
      filters.design = value;
      continue;
    }
    if (arg === '--relation') {
      filters.relation = value;
      continue;
    }
    if (arg === '--rail') {
      filters.rail = value;
      continue;
    }
    if (arg === '--run') {
      filters.runId = value;
      continue;
    }
    if (arg === '--surface') {
      filters.surface = value;
      continue;
    }
    if (arg === '--target') {
      filters.target = value;
      continue;
    }
    if (arg === '--flow') {
      filters.flow = value;
      continue;
    }
    if (arg === '--contract') {
      filters.contract = value;
      continue;
    }
    if (arg === '--subject') {
      filters.subject = value;
      continue;
    }
    if (arg === '--canonicality') {
      filters.canonicality = value;
      continue;
    }
    if (arg === '--subject-kind') {
      filters.subjectKind = value;
      continue;
    }
    if (arg === '--owner') {
      filters.owner = value;
      continue;
    }
    if (arg === '--layer') {
      filters.layer = value;
      continue;
    }
    if (arg === '--schema-version') {
      filters.schemaVersion = parseCerSchemaVersion(value);
      continue;
    }
    if (arg === '--unit') {
      filters.component = value;
      continue;
    }
    if (arg === '--parent' || arg === '--parent-unit' || arg === '--children-of') {
      filters.parentUnit = value;
      continue;
    }
    if (arg === '--command-domain') {
      filters.commandDomain = value;
      continue;
    }
    if (arg === '--intent') {
      filters.intent = value;
      continue;
    }
    if (arg === '--type') {
      filters.type = value;
      continue;
    }
    if (arg === '--duplicates') {
      filters.duplicates = parseBooleanFilter(value, '--duplicates');
      continue;
    }
    if (arg === '--gaps') {
      filters.gaps = parseBooleanFilter(value, '--gaps');
      continue;
    }
    if (arg === '--root') {
      filters.rootUnit = value;
      continue;
    }
    if (arg === '--domain') {
      filters.domainUnit = value;
      continue;
    }
    if (arg === '--path') {
      filters.path = value;
      continue;
    }
    if (arg === '--phase') {
      filters.phase = value;
      continue;
    }
    if (arg === '--state') {
      if (
        queryName === 'frontend-surfaces' ||
        queryName === 'frontend-components' ||
        queryName === 'feature-mechanization' ||
        queryName === 'feature-mechanization-components' ||
        queryName === 'feature-mechanization-symbols' ||
        queryName === 'feature-mechanization-rails' ||
        queryName === 'feature-mechanization-validations' ||
        queryName === 'knowledge-intake' ||
        queryName === 'fowler-analysis' ||
        queryName === 'fowler-analysis-references' ||
        queryName === 'fowler-analysis-retirement' ||
        queryName === 'fowler-analysis-coverage' ||
        queryName === 'fowler-analysis-intent' ||
        queryName === 'fowler-analysis-duplicates' ||
        queryName === 'documentation-lifecycle' ||
        queryName === 'documentation-panels' ||
        queryName === 'component-roadmap' ||
        queryName === 'canvas-cq-rail-drift' ||
        queryName === 'canvas-component-registry-drift' ||
        queryName === 'canvas-uxdb-specification' ||
        queryName === 'governance-refresh-runs' ||
        queryName === 'db-surfaces' ||
        queryName === 'component-integrity' ||
        queryName === 'component-validation' ||
        queryName === 'filesystem-coverage' ||
        queryName === 'rail-vocabulary' ||
        queryName === 'rail-duplicates' ||
        queryName === 'architecture-path-mapping' ||
        queryName === 'architecture-dependency-classification' ||
        queryName === 'architecture-fitness' ||
        queryName === 'architecture-fitness-gaps' ||
        queryName === 'dbt-roundtrip-capabilities'
      ) {
        filters.state = value;
      } else {
        filters.governanceState = value;
      }
      continue;
    }
    if (arg === '--resolution') {
      filters.resolution = normalizeResolutionFilter(value);
      continue;
    }
    if (arg === '--retirement-allowed') {
      filters.retirementAllowed = parseBooleanFilter(value, '--retirement-allowed');
      continue;
    }
    if (arg === '--kind') {
      filters.kind = value;
      continue;
    }
    if (arg === '--severity') {
      filters.severity = value;
      continue;
    }
    if (arg === '--prefix') {
      filters.prefix = value;
      continue;
    }
    if (arg === '--task') {
      filters.taskId = value;
      continue;
    }
    if (arg === '--limit') {
      filters.limit = parseLimit(value, 20);
      continue;
    }
    if (arg === '--format') {
      outputFormat = parseOutputFormat(value);
      continue;
    }

    throw new Error(`Unknown planning DB query option "${arg}".`);
  }

  if (refreshRequested && noRefreshRequested) {
    throw new Error('Cannot combine --refresh and --no-refresh.');
  }
  if (refreshConfirmed && !refreshRequested) {
    throw new Error('--confirm-expensive-governance-refresh requires --refresh.');
  }
  if (refreshRequested && !refreshConfirmed) {
    throw new Error('--refresh requires --confirm-expensive-governance-refresh.');
  }
  if (refreshRequested && !usesGovernanceProjection(queryName)) {
    throw new Error('--refresh is only valid for governance projection queries.');
  }
  if (outputFormat !== undefined && queryName !== 'ai-project-context') {
    throw new Error('--format is only valid for ai-project-context.');
  }
  if (
    queryName === 'creation-intent' &&
    normalizeCreationIntentForSearch(filters.intent).length === 0
  ) {
    throw new Error('creation-intent requires --intent "<creation intent>".');
  }

  return {
    queryName,
    ...(outputFormat === undefined ? {} : { outputFormat }),
    ...(autoImportGovernance === undefined ? {} : { autoImportGovernance }),
    filters,
  };
}

function buildSummaryRows(summary) {
  return [
    ['architecture.source_authority', summary.sourceAuthority || 'database'],
    ['repository.commands', summary.repositoryCommands],
    ['repository.commands.unknown', summary.repositoryCommandUnknown],
    ['repository.commands.runtime_fanout', summary.repositoryCommandRuntimeFanout],
    ['command_query.rails', summary.commandQueryRails],
    ['command_query.rails.gaps', summary.commandQueryRailGaps],
    ['command_query.rails.duplicates', summary.commandQueryRailDuplicates],
    ['repository.pr_readiness', summary.prReadinessChecks],
    ['repository.pr_readiness.blocking', summary.prReadinessBlocking],
    ['docs.disposition_documents', summary.docsDispositionDocuments],
    ['docs.disposition_actions', summary.docsDispositionActions],
    ['docs.resolution_overlays', summary.docsResolutionOverlays],
    ['docs.task_like_references', summary.docsTaskLikeReferences],
    ['docs.task_like_references.unknown', summary.docsTaskLikeReferencesUnknown],
    ['risk.debt_items', summary.riskDebtItems],
    ['risk.debt_items.open', summary.riskDebtItemsOpen],
    ['governance.files', summary.governanceFiles],
    ['governance.files.drift', summary.driftFiles],
    ['governance.files.legacy', summary.legacyFiles],
    ['governance.components', summary.governanceComponents],
    ['governance.component_files', summary.governanceComponentFiles],
    ['governance.fingerprints', summary.governanceFingerprints],
    ['governance.coverage_rows', summary.governanceCoverageRows],
    ['governance.remediation_tasks', summary.governanceRemediationTasks],
    ['governance.remediation_tasks.p0', summary.governanceRemediationP0],
  ];
}

function buildHashDriftRows(summary) {
  return [['governance.hash_drift', summary.governanceHashDrift]];
}

const aiProjectContextRecommendedQueries = Object.freeze([
  'pnpm planning:db:query summary',
  'pnpm planning:db:query command-query-rails --gaps true',
  'pnpm planning:db:query command-query-rails --duplicates true',
  'pnpm planning:db:query components',
  'pnpm planning:db:query debt --status Open',
  'pnpm planning:db:query commands --command-domain planning-db',
  'pnpm planning:db:query pr-readiness',
]);

function numericCount(value) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAiCommandQueryRail(row) {
  const isGap = Boolean(row.is_gap ?? row.isGap);
  const isDuplicate = Boolean(row.is_duplicate ?? row.isDuplicate);
  return {
    railType: row.rail_type ?? row.railType ?? '-',
    railName: row.rail_name ?? row.railName ?? '-',
    dddOwner: row.ddd_owner ?? row.dddOwner ?? '-',
    status: row.rail_status ?? row.railStatus ?? '-',
    state: isGap
      ? 'gap'
      : isDuplicate
        ? 'duplicate'
        : numericCount(row.implementation_ref_count ?? row.implementationRefCount) > 0
          ? 'implemented'
          : 'declared',
    isGap,
    isDuplicate,
    implementationRefCount: numericCount(
      row.implementation_ref_count ?? row.implementationRefCount
    ),
    sourcePath: row.source_path ?? row.sourcePath ?? '-',
  };
}

function normalizeAiComponent(row) {
  return {
    componentId: row.component_id ?? row.componentId ?? '-',
    name: compactText(row.name),
    status: row.status ?? '-',
    governanceState: row.governance_state ?? row.governanceState ?? '-',
    domainUnit: row.domain_unit ?? row.domainUnit ?? '-',
    fileCount: numericCount(row.file_count ?? row.fileCount),
  };
}

function normalizeAiRiskDebt(row) {
  return {
    priority: row.priority ?? '-',
    status: row.status ?? '-',
    riskId: row.risk_id ?? row.riskId ?? '-',
    componentUnit: row.component_unit ?? row.componentUnit ?? '-',
    sourcePath: row.source_path ?? row.sourcePath ?? '-',
    title: compactText(row.title),
  };
}

function normalizeAiRepositoryCommand(row) {
  return {
    commandType: row.command_type ?? row.commandType ?? '-',
    commandName: row.command_name ?? row.commandName ?? row.command_path ?? row.commandPath ?? '-',
    domain: row.domain ?? '-',
    sensitivity: row.sensitivity ?? '-',
    runtimeFanout: Boolean(row.runtime_fanout ?? row.runtimeFanout),
  };
}

function normalizeAiPrReadiness(row) {
  return {
    readinessId: row.readiness_id ?? row.readinessId ?? '-',
    state: row.blocking ? 'blocking' : 'ready',
    missingRequirements: row.missing_requirements ?? row.missingRequirements ?? [],
    evidenceDocStatus: row.evidence_doc_status ?? row.evidenceDocStatus ?? '-',
    riskUpdateStatus: row.risk_update_status ?? row.riskUpdateStatus ?? '-',
  };
}

function buildAiProjectContext(snapshot = {}, options = {}) {
  const summary = snapshot.summary || {};
  return {
    contextKind: 'db-first-ai-project-context',
    sourceAuthority: summary.sourceAuthority || 'database',
    generatedAt: options.generatedAt || new Date().toISOString(),
    counts: {
      repositoryCommands: numericCount(summary.repositoryCommands),
      commandQueryRails: numericCount(summary.commandQueryRails),
      commandQueryRailGaps: numericCount(summary.commandQueryRailGaps),
      commandQueryRailDuplicates: numericCount(summary.commandQueryRailDuplicates),
      openIncidentsAndDebt: numericCount(summary.riskDebtItemsOpen),
      governanceComponents: numericCount(summary.governanceComponents),
      governanceDriftFiles: numericCount(summary.driftFiles),
      blockingPrReadinessChecks: numericCount(summary.prReadinessBlocking),
    },
    samples: {
      commandQueryRails: (snapshot.commandQueryRails || []).map(normalizeAiCommandQueryRail),
      components: (snapshot.components || []).map(normalizeAiComponent),
      openIncidentsAndDebt: (snapshot.riskDebt || []).map(normalizeAiRiskDebt),
      repositoryCommands: (snapshot.commands || []).map(normalizeAiRepositoryCommand),
      prReadiness: (snapshot.prReadiness || []).map(normalizeAiPrReadiness),
    },
    recommendedQueries: [...aiProjectContextRecommendedQueries],
  };
}

function markdownCell(value) {
  return compactText(Array.isArray(value) ? value.join(', ') : value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|');
}

function markdownTable(headers, rows) {
  const lines = [
    `| ${headers.map(markdownCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) {
    lines.push(`| ${row.map(markdownCell).join(' | ')} |`);
  }
  return lines.join('\n');
}

function markdownSection(title, headers, rows) {
  if (!rows.length) {
    return [`## ${title}`, '', 'No rows returned by this DB sample.'].join('\n');
  }

  return [`## ${title}`, '', markdownTable(headers, rows)].join('\n');
}

function renderAiProjectContextMarkdown(context) {
  const countRows = Object.entries(context.counts || {});
  const railRows = (context.samples.commandQueryRails || []).map((row) => [
    row.railType,
    row.railName,
    row.dddOwner,
    row.status,
    row.state,
    row.sourcePath,
  ]);
  const componentRows = (context.samples.components || []).map((row) => [
    row.componentId,
    row.name,
    row.status,
    row.governanceState,
    row.fileCount,
  ]);
  const debtRows = (context.samples.openIncidentsAndDebt || []).map((row) => [
    row.priority,
    row.riskId,
    row.status,
    row.componentUnit,
    row.title,
    row.sourcePath,
  ]);
  const commandRows = (context.samples.repositoryCommands || []).map((row) => [
    row.commandType,
    row.commandName,
    row.domain,
    row.runtimeFanout ? 'runtime-fanout' : '-',
  ]);
  const readinessRows = (context.samples.prReadiness || []).map((row) => [
    row.readinessId,
    row.state,
    row.missingRequirements,
    row.evidenceDocStatus,
    row.riskUpdateStatus,
  ]);

  return [
    '# DB-first AI project context',
    '',
    `Generated: ${context.generatedAt}`,
    `Source authority: ${context.sourceAuthority}`,
    '',
    '## Project state',
    '',
    'Use this DB-first context before creating new commands, queries, components, docs, or implementation work.',
    '',
    markdownSection('Counts', ['Metric', 'Value'], countRows),
    '',
    markdownSection(
      'Open incidents and debt',
      ['Priority', 'Id', 'Status', 'Component', 'Title', 'Source'],
      debtRows
    ),
    '',
    markdownSection(
      'Existing command/query rails',
      ['Type', 'Name', 'Owner', 'Status', 'State', 'Source'],
      railRows
    ),
    '',
    markdownSection(
      'Existing components',
      ['Component', 'Name', 'Status', 'State', 'Files'],
      componentRows
    ),
    '',
    markdownSection('Repository commands', ['Type', 'Name', 'Domain', 'Runtime'], commandRows),
    '',
    markdownSection(
      'PR readiness',
      ['Readiness', 'State', 'Missing requirements', 'Evidence', 'Risk'],
      readinessRows
    ),
    '',
    '## Recommended follow-up queries',
    '',
    ...(context.recommendedQueries || []).map((query) => `- \`${query}\``),
    '',
  ].join('\n');
}

function buildRepositoryCommandRows(rows) {
  return rows.map((row) => [
    row.command_type ?? row.commandType,
    row.command_name ?? row.commandName ?? row.command_path ?? row.commandPath,
    row.domain,
    row.sensitivity,
    flagLabel(row.runtime_fanout ?? row.runtimeFanout, 'runtime-fanout'),
    row.referenced_file_count ?? row.referencedFileCount ?? 0,
  ]);
}

function joinJsonArray(value) {
  const values = Array.isArray(value) ? value : [];
  return values.length > 0 ? values.join(',') : '-';
}

function buildPrReadinessRows(rows) {
  return rows.map((row) => [
    row.readiness_id ?? row.readinessId,
    row.effective_arc_level ?? row.effectiveArcLevel,
    row.blocking ? 'blocking' : 'ready',
    row.trigger_count ?? row.triggerCount ?? 0,
    joinJsonArray(row.missing_requirements ?? row.missingRequirements),
    `evidence:${row.evidence_doc_status ?? row.evidenceDocStatus ?? '-'}`,
    `risk:${row.risk_update_status ?? row.riskUpdateStatus ?? '-'}`,
    joinJsonArray(row.required_checks ?? row.requiredChecks),
  ]);
}

function buildDocsDispositionRows(rows) {
  return rows.map((row) => [
    row.priority,
    row.action_kind ?? row.actionKind,
    row.document_path ?? row.documentPath,
    row.reference_text ?? row.referenceText ?? '-',
    row.resolution_status ?? row.resolutionStatus ?? 'pending',
    compactText(row.reason),
  ]);
}

function compactText(value) {
  return String(value ?? '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactJson(value) {
  if (value === undefined || value === null) {
    return '-';
  }

  if (typeof value === 'string') {
    return compactText(value);
  }

  return JSON.stringify(value);
}

function flagLabel(value, label) {
  return value ? label : '-';
}

function buildGovernanceFileRows(rows) {
  return rows.map((row) => [
    row.path,
    row.component_unit ?? row.componentUnit,
    row.owning_unit ?? row.owningUnit,
    row.governance_state ?? row.governanceState,
    flagLabel(row.is_drift ?? row.isDrift, 'drift'),
    flagLabel(row.is_legacy ?? row.isLegacy, 'legacy'),
  ]);
}

function buildGovernanceComponentRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    row.file_count ?? row.fileCount,
    row.governance_state ?? row.governanceState,
    flagLabel(row.is_drift ?? row.isDrift, 'drift'),
    flagLabel(row.is_legacy ?? row.isLegacy, 'legacy'),
    row.ddd_owner ?? row.dddOwner ?? '-',
  ]);
}

function buildGovernanceUnitRows(rows) {
  return rows.map((row) => [
    row.unit_id ?? row.unitId,
    compactText(row.name),
    row.level,
    row.parent_id ?? row.parentId ?? '-',
    row.governance_state ?? row.governanceState,
    row.direct_file_count ?? row.directFileCount ?? 0,
    row.descendant_file_count ?? row.descendantFileCount ?? 0,
    row.ddd_owner ?? row.dddOwner ?? '-',
  ]);
}

function buildComponentEngineeringComponentTreeRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    compactText(row.name),
    row.component_level ?? row.componentLevel ?? '-',
    row.parent_component_id ?? row.parentComponentId ?? '-',
    row.governance_state ?? row.governanceState ?? '-',
    row.direct_file_count ?? row.directFileCount ?? 0,
    row.descendant_file_count ?? row.descendantFileCount ?? 0,
    row.ddd_owner ?? row.dddOwner ?? '-',
    String(row.is_leaf_component ?? row.isLeafComponent ?? false),
  ]);
}

function buildComponentEngineeringComponentDriftRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId ?? '-',
    row.drift_code ?? row.driftCode ?? '-',
    compactJson(row.metadata),
  ]);
}

function buildComponentEngineeringComponentMetadataRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    compactText(row.name),
    row.metadata_state ?? row.metadataState ?? '-',
    row.quality_state ?? row.qualityState ?? '-',
    row.direct_file_count ?? row.directFileCount ?? 0,
    row.descendant_file_count ?? row.descendantFileCount ?? 0,
    joinJsonArray(row.drift_codes ?? row.driftCodes),
    compactText(row.owned_concern ?? row.ownedConcern),
  ]);
}

function buildComponentEngineeringRuleCatalogRows(rows) {
  return rows.map((row) => [
    row.rule_id ?? row.ruleId,
    row.category,
    row.severity,
    row.subject_level ?? row.subjectLevel,
    row.drift_code ?? row.driftCode ?? '-',
  ]);
}

function buildComponentEngineeringRuleEvaluationRows(rows) {
  return rows.map((row) => [
    row.rule_id ?? row.ruleId,
    row.subject_id ?? row.subjectId,
    row.evaluation_state ?? row.evaluationState,
    row.severity,
    row.drift_code ?? row.driftCode ?? '-',
  ]);
}

function buildComponentEngineeringQualityRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    compactText(row.name),
    row.component_level ?? row.componentLevel ?? '-',
    row.quality_state ?? row.qualityState ?? '-',
    row.direct_file_count ?? row.directFileCount ?? 0,
    row.descendant_file_count ?? row.descendantFileCount ?? 0,
    row.children_count ?? row.childrenCount ?? 0,
    row.test_file_count ?? row.testFileCount ?? 0,
    row.failing_rule_count ?? row.failingRuleCount ?? 0,
    joinJsonArray(row.drift_codes ?? row.driftCodes),
  ]);
}

function normalizeListValue(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .replace(/[{}]/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function railProfileKind(railName) {
  return /^(get|list|query|read|resolve|observe|check|browse|validate)/i.test(railName)
    ? 'query'
    : 'command';
}

function buildComponentProfileRows(profile) {
  const componentId =
    profile.component?.component_id ??
    profile.component?.componentId ??
    profile.filters?.component ??
    '-';
  const rows = [];

  if (profile.component) {
    rows.push([
      'component',
      componentId,
      compactText(profile.component.name),
      profile.component.component_level ?? profile.component.componentLevel ?? '-',
      profile.component.parent_component_id ?? profile.component.parentComponentId ?? '-',
      profile.component.governance_state ?? profile.component.governanceState ?? '-',
      profile.component.ddd_owner ?? profile.component.dddOwner ?? '-',
    ]);
  }

  for (const child of profile.children || []) {
    rows.push([
      'child',
      child.component_id ?? child.componentId,
      compactText(child.name),
      child.component_level ?? child.componentLevel ?? '-',
      child.governance_state ?? child.governanceState ?? '-',
      child.direct_file_count ?? child.directFileCount ?? 0,
      child.descendant_file_count ?? child.descendantFileCount ?? 0,
    ]);
  }

  for (const file of profile.files || []) {
    rows.push([
      'file',
      file.path,
      file.component_unit ?? file.componentUnit ?? '-',
      file.owning_unit ?? file.owningUnit ?? '-',
      file.governance_state ?? file.governanceState ?? '-',
    ]);
  }

  for (const railName of normalizeListValue(
    profile.component?.cq_rails ?? profile.component?.cqRails
  )) {
    rows.push([railProfileKind(railName), railName, componentId, 'cq_rails']);
  }

  for (const io of profile.io || []) {
    const section = io.io_kind === 'adapter' ? 'adapter' : io.io_kind === 'port' ? 'port' : 'io';
    const metadata = io.metadata && typeof io.metadata === 'object' ? io.metadata : {};
    rows.push([
      section,
      io.io_id ?? io.ioId,
      compactText(io.io_name ?? io.ioName),
      metadata.portKind ?? io.io_kind ?? io.ioKind ?? '-',
      io.direction ?? '-',
      io.contract_id ?? io.contractId ?? '-',
      io.runtime ?? '-',
    ]);
  }

  for (const architectureComponent of profile.architectureComponents || []) {
    rows.push([
      'architecture',
      architectureComponent.component_id ?? architectureComponent.componentId,
      architectureComponent.kind,
      architectureComponent.layer,
      architectureComponent.owner,
      architectureComponent.repo_path ?? architectureComponent.repoPath ?? '-',
      architectureComponent.status,
    ]);
  }

  for (const responsibility of profile.responsibilities || []) {
    rows.push([
      'responsibility',
      responsibility.responsibility_id ?? responsibility.responsibilityId,
      compactText(responsibility.responsibility),
      compactText(responsibility.reason_to_change ?? responsibility.reasonToChange),
      responsibility.ddd_owner ?? responsibility.dddOwner ?? '-',
    ]);
  }

  for (const relation of profile.relations || []) {
    rows.push([
      'relation',
      relation.relation_id ?? relation.relationId,
      relation.source_component_id ?? relation.sourceComponentId,
      relation.target_component_id ?? relation.targetComponentId,
      relation.relation_type ?? relation.relationType,
      relation.status,
    ]);
  }

  for (const contract of profile.contracts || []) {
    rows.push([
      'contract',
      contract.contract_id ?? contract.contractId,
      contract.contract_kind ?? contract.contractKind,
      contract.contract_ref ?? contract.contractRef,
      contract.status,
    ]);
  }

  for (const testEvidence of profile.tests || []) {
    rows.push([
      'test',
      testEvidence.test_id ?? testEvidence.testId,
      testEvidence.test_path ?? testEvidence.testPath,
      testEvidence.test_kind ?? testEvidence.testKind,
      testEvidence.coverage_level ?? testEvidence.coverageLevel,
      String(testEvidence.required ?? true),
      testEvidence.validation_command ?? testEvidence.validationCommand ?? '-',
    ]);
  }

  for (const observability of profile.observability || []) {
    rows.push([
      'observability',
      observability.observability_id ?? observability.observabilityId,
      observability.signal_name ?? observability.signalName,
      observability.signal_kind ?? observability.signalKind,
      String(observability.required ?? true),
      observability.status ?? '-',
    ]);
  }

  for (const design of profile.architectureDesigns || []) {
    rows.push([
      'architecture-basis',
      design.design_id ?? design.designId,
      design.work_item_id ?? design.workItemId,
      compactText(design.design_title ?? design.designTitle ?? design.title),
      design.scope_kind ?? design.scopeKind ?? '-',
    ]);
  }

  for (const fowlerReference of profile.fowlerReferences || []) {
    rows.push([
      'fowler',
      fowlerReference.document_path ?? fowlerReference.documentPath,
      fowlerReference.reference_state ?? fowlerReference.referenceState ?? '-',
      fowlerReference.relation_type ?? fowlerReference.relationType ?? '-',
      fowlerReference.canonical_target_path ?? fowlerReference.canonicalTargetPath ?? '-',
      fowlerReference.resolution_status ?? fowlerReference.resolutionStatus ?? '-',
    ]);
  }

  return rows;
}

function buildArchitectureDesignRows(rows) {
  return rows.map((row) => [
    row.design_id ?? row.designId,
    row.work_item_id ?? row.workItemId ?? '-',
    row.status ?? '-',
    row.owner ?? '-',
    row.rail_ref ?? row.railRef ?? '-',
    row.fowler_signal ?? row.fowlerSignal ?? '-',
  ]);
}

function buildArchitectureDesignScopeRows(rows) {
  return rows.map((row) => [
    row.design_id ?? row.designId,
    row.subject_kind ?? row.subjectKind,
    row.subject_id ?? row.subjectId,
    row.scope_kind ?? row.scopeKind,
    String(row.required ?? true),
    row.design_status ?? row.designStatus ?? '-',
  ]);
}

function buildArchitectureComponentRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    compactText(row.name),
    row.kind ?? '-',
    row.layer ?? '-',
    row.owner ?? '-',
    row.status ?? '-',
    row.maturity_score ?? row.maturityScore ?? '-',
  ]);
}

function buildArchitectureRelationRows(rows) {
  return rows.map((row) => [
    row.relation_id ?? row.relationId,
    row.source_component_id ?? row.sourceComponentId,
    row.target_component_id ?? row.targetComponentId,
    row.relation_type ?? row.relationType,
    row.direction ?? '-',
    row.sync_async ?? row.syncAsync ?? '-',
    row.status ?? '-',
  ]);
}

function buildArchitectureResponsibilityRows(rows) {
  return rows.map((row) => [
    row.responsibility_id ?? row.responsibilityId,
    row.component_id ?? row.componentId,
    compactText(row.responsibility),
    compactText(row.reason_to_change ?? row.reasonToChange),
    row.ddd_owner ?? row.dddOwner ?? '-',
    row.status ?? '-',
  ]);
}

function buildArchitectureIoRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    row.io_id ?? row.ioId,
    row.io_kind ?? row.ioKind,
    row.metadata?.portKind ?? row.io_kind ?? row.ioKind,
    row.io_name ?? row.ioName,
    row.direction ?? '-',
    row.contract_id ?? row.contractId ?? '-',
    row.runtime ?? '-',
  ]);
}

function buildArchitectureFlowRows(rows) {
  return rows.map((row) => [
    row.flow_id ?? row.flowId,
    compactText(row.name),
    row.entry_component_id ?? row.entryComponentId,
    row.exit_component_id ?? row.exitComponentId,
    row.flow_kind ?? row.flowKind,
    row.status ?? '-',
    row.step_count ?? row.stepCount ?? 0,
  ]);
}

function buildArchitectureFlowStepRows(rows) {
  return rows.map((row) => [
    row.flow_id ?? row.flowId,
    row.step_order ?? row.stepOrder,
    row.component_id ?? row.componentId,
    row.relation_id ?? row.relationId ?? '-',
    row.input_contract_id ?? row.inputContractId ?? '-',
    row.output_contract_id ?? row.outputContractId ?? '-',
    row.transformation_id ?? row.transformationId ?? '-',
  ]);
}

function buildArchitectureContractRows(rows) {
  return rows.map((row) => [
    row.contract_id ?? row.contractId,
    row.contract_kind ?? row.contractKind,
    row.component_id ?? row.componentId,
    row.contract_ref ?? row.contractRef,
    row.compatibility ?? '-',
    row.status ?? '-',
    row.validation_command ?? row.validationCommand ?? '-',
  ]);
}

function buildArchitectureTestRows(rows) {
  return rows.map((row) => [
    row.test_id ?? row.testId,
    row.component_id ?? row.componentId,
    row.test_path ?? row.testPath,
    row.test_kind ?? row.testKind,
    row.coverage_level ?? row.coverageLevel,
    String(row.required ?? true),
    row.validation_command ?? row.validationCommand ?? '-',
  ]);
}

function buildArchitectureObservabilityRows(rows) {
  return rows.map((row) => [
    row.observability_id ?? row.observabilityId,
    row.component_id ?? row.componentId,
    row.signal_name ?? row.signalName,
    row.signal_kind ?? row.signalKind,
    String(row.required ?? true),
    row.status ?? '-',
  ]);
}

function buildArchitectureMaturityRows(rows) {
  return rows.map((row) => [
    row.component_id ?? row.componentId,
    compactText(row.name),
    row.maturity_score ?? row.maturityScore ?? 0,
    joinJsonArray(row.missing_reasons ?? row.missingReasons),
    compactJson(row.metrics),
  ]);
}

function buildArchitectureDriftRows(rows) {
  return rows.map((row) => [
    row.subject_kind ?? row.subjectKind,
    row.subject_id ?? row.subjectId,
    row.drift_code ?? row.driftCode,
    row.severity ?? '-',
    compactJson(row.metadata),
  ]);
}

function buildArchitectureEnforcementRows(rows) {
  return rows.map((row) => [
    row.enforcement_kind ?? row.enforcementKind,
    row.design_id ?? row.designId ?? '-',
    row.subject_kind ?? row.subjectKind,
    row.subject_id ?? row.subjectId,
    row.state_or_violation ?? row.stateOrViolation,
    row.severity ?? '-',
  ]);
}

function buildArchitectureEvidenceRows(rows) {
  return rows.map((row) => [
    row.evidence_id ?? row.evidenceId,
    row.design_id ?? row.designId ?? '-',
    row.subject_kind ?? row.subjectKind,
    row.subject_id ?? row.subjectId,
    row.evidence_kind ?? row.evidenceKind,
    row.evidence_origin ?? row.evidenceOrigin,
    row.result_state ?? row.resultState,
    row.verification_state ?? row.verificationState ?? '-',
    row.freshness_state ?? row.freshnessState ?? '-',
    row.source_verification_state ?? row.sourceVerificationState ?? '-',
    row.source_path ?? row.sourcePath ?? '-',
    row.source_ref ?? row.sourceRef ?? '-',
  ]);
}

function buildGovernanceCoverageRows(rows) {
  return rows.map((row) => [
    row.coverage_kind ?? row.coverageKind,
    row.name,
    row.count_value ?? row.countValue ?? '-',
    row.file_count ?? row.fileCount ?? '-',
    row.component_id ?? row.componentId ?? '-',
  ]);
}

function buildGovernanceRemediationRows(rows) {
  return rows.map((row) => [
    row.priority,
    row.task_id ?? row.taskId,
    row.component_unit ?? row.componentUnit,
    row.file_count ?? row.fileCount,
    compactText(row.reason),
  ]);
}

function buildRiskDebtRows(rows) {
  return rows.map((row) => [
    row.priority,
    row.status,
    row.risk_id ?? row.riskId,
    row.component_unit ?? row.componentUnit,
    row.source_path ?? row.sourcePath,
    compactText(row.title),
  ]);
}

function buildGovernanceDriftRows(rows) {
  return rows.map((row) => [
    row.path,
    row.component_unit ?? row.componentUnit,
    row.owning_unit ?? row.owningUnit,
    (row.drift_fields ?? row.driftFields ?? []).join(','),
  ]);
}

function buildKnowledgeDocumentRows(rows) {
  return rows.map((row) => [
    row.document_type ?? row.documentType,
    row.mandatory ? 'mandatory' : '-',
    row.status ?? '-',
    row.document_path ?? row.documentPath,
    compactText(row.title),
  ]);
}

function buildKnowledgeActionRows(rows) {
  return rows.map((row) => [
    row.status,
    row.required ? 'required' : '-',
    row.document_path ?? row.documentPath,
    compactText(row.summary),
    JSON.stringify(row.links ?? []),
  ]);
}

function buildMandatoryProposalGapRows(rows) {
  return rows.map((row) => [
    row.gap_kind ?? row.gapKind,
    row.required_action_count ?? row.requiredActionCount ?? 0,
    row.linked_task_count ?? row.linkedTaskCount ?? 0,
    row.document_path ?? row.documentPath,
    compactText(row.title),
  ]);
}

function buildComponentEngineeringRecordRows(rows) {
  return rows.map((row) => row.record ?? row.componentEngineeringRecord);
}

function appendResolutionFilter(predicates, params, value) {
  const resolution = normalizeResolutionFilter(value) || 'pending';
  if (resolution === 'all') {
    return;
  }

  params.push('pending');
  if (resolution === 'resolved') {
    predicates.push(`resolution_status <> $${params.length}`);
    return;
  }

  params[params.length - 1] = resolution;
  predicates.push(`resolution_status = $${params.length}`);
}

function repositoryCommandSelect() {
  return `
    select
      command_id,
      command_type,
      command_name,
      command_path,
      command_text,
      domain,
      sensitivity,
      runtime_fanout,
      changed_file_validation_relevant,
      referenced_file_count,
      source_path,
      source_content_sha256,
      imported_at
    from ${schemaName}.repository_command_query`;
}

function prReadinessSelect() {
  return `
    select
      readiness_id,
      base_ref,
      head_ref,
      effective_arc_level,
      is_arc,
      blocking,
      trigger_count,
      missing_requirements,
      evidence_doc_status,
      risk_update_status,
      required_checks,
      recommended_guides,
      changed_file_count,
      evidence_doc_count,
      risk_update_count,
      source_path,
      source_content_sha256,
      imported_at
    from ${schemaName}.pr_readiness_query`;
}

function docsDispositionActionSelect() {
  return `
    select
      action_id,
      priority,
      action_kind,
      document_path,
      document_status,
      planning_type,
      is_active,
      reference_text,
      reason,
      blocking,
      evidence,
      source_content_sha256,
      raw_action,
      imported_at,
      resolution_status,
      resolved_by,
      resolved_at,
      resolution_reason
    from ${schemaName}.doc_disposition_action_query`;
}

function governanceFileSelect() {
  return `
    select
      file_path as path,
      leaf_component_id as component_unit,
      owning_unit,
      root_unit,
      domain_unit,
      governance_state,
      is_drift,
      is_legacy,
      ddd_owner,
      cq_rails
    from ${componentEngineeringSchemaName}.file_ownership_query`;
}

function governanceComponentSelect() {
  return `
    select
      component_id,
      name,
      level,
      root_unit,
      domain_unit,
      status,
      governance_state,
      is_drift,
      is_legacy,
      children_required,
      file_count,
      ddd_owner,
      cq_rails
    from ${schemaName}.governance_component_query`;
}

function governanceUnitSelect() {
  return `
    select
      unit_id,
      name,
      level,
      parent_id,
      root_unit,
      domain_unit,
      status,
      governance_state,
      is_drift,
      is_legacy,
      children_required,
      direct_file_count,
      descendant_component_count,
      descendant_file_count,
      ddd_owner,
      cq_rails,
      is_materialized_component
    from ${schemaName}.governance_unit_query`;
}

function componentEngineeringComponentTreeSelect() {
  return `
    select
      component_id,
      name,
      component_level,
      parent_component_id,
      root_unit,
      domain_unit,
      status,
      governance_state,
      children_required,
      direct_file_count,
      descendant_component_count,
      descendant_file_count,
      ddd_owner,
      cq_rails,
      is_materialized_component,
      has_children,
      is_leaf_component
    from ${componentEngineeringSchemaName}.component_tree_query`;
}

function componentEngineeringComponentDriftSelect() {
  return `
    select
      component_id,
      drift_code,
      metadata
    from ${componentEngineeringSchemaName}.component_drift_query`;
}

function componentEngineeringComponentMetadataSelect() {
  return `
    select
      component_id,
      name,
      component_level,
      parent_component_id,
      root_unit,
      domain_unit,
      status,
      governance_state,
      ddd_owner,
      owned_concern,
      responsibilities,
      non_goals,
      reasons_to_change,
      public_api,
      invariants,
      transitions,
      consumers,
      direct_file_count,
      descendant_component_count,
      descendant_file_count,
      children_count,
      test_file_count,
      quality_state,
      drift_codes,
      metadata_state,
      source_paths,
      source_content_sha256_values
    from ${componentEngineeringSchemaName}.component_metadata_query`;
}

function componentEngineeringRuleCatalogSelect() {
  return `
    select
      rule_id,
      name,
      category,
      severity,
      subject_level,
      subject_scope,
      predicate_owner,
      evaluation_view,
      drift_code,
      governing_doc,
      remediation,
      validation_command
    from ${componentEngineeringSchemaName}.rule_catalog_query`;
}

function componentEngineeringRuleEvaluationSelect() {
  return `
    select
      rule_id,
      rule_name,
      category,
      severity,
      subject_id,
      subject_level,
      subject_name,
      evaluation_state,
      drift_code,
      evidence,
      remediation,
      metadata
    from ${componentEngineeringSchemaName}.rule_evaluation_query`;
}

function componentEngineeringQualitySelect() {
  return `
    select
      component_id,
      name,
      component_level,
      parent_component_id,
      governance_state,
      quality_state,
      direct_file_count,
      descendant_file_count,
      children_count,
      test_file_count,
      rule_count,
      failing_rule_count,
      error_count,
      warning_count,
      drift_codes
    from ${componentEngineeringSchemaName}.component_quality_query`;
}

function architectureDesignSelect() {
  return `
    select
      design_id,
      work_item_id,
      title,
      owner,
      status,
      rationale,
      fowler_signal,
      rail_ref,
      approved_at,
      supersedes_id,
      created_at,
      updated_at
    from ${architectureSchemaName}.design_query`;
}

function architectureDesignScopeSelect() {
  return `
    select
      design_id,
      work_item_id,
      design_title,
      design_status,
      subject_kind,
      subject_id,
      scope_kind,
      required,
      created_at
    from ${architectureSchemaName}.design_scope_query`;
}

function architectureComponentSelect() {
  return `
    select
      component_id,
      name,
      kind,
      layer,
      owner,
      repo_path,
      public_contract,
      runtime,
      criticality,
      status,
      maturity_score,
      parent_component_id,
      created_at,
      updated_at
    from ${architectureSchemaName}.component_query`;
}

function architectureRelationSelect() {
  return `
    select
      relation_id,
      source_component_id,
      source_component_name,
      target_component_id,
      target_component_name,
      relation_type,
      direction,
      sync_async,
      contract_id,
      contract_ref,
      failure_mode,
      authorization_scope,
      source_refs,
      status,
      created_at,
      updated_at
    from ${architectureSchemaName}.component_relation_query`;
}

function architectureResponsibilitySelect() {
  return `
    select
      responsibility_id,
      component_id,
      component_name,
      responsibility,
      reason_to_change,
      ddd_owner,
      status,
      created_at
    from ${architectureSchemaName}.component_responsibility_query`;
}

function architectureIoSelect() {
  return `
    select
      component_id,
      io_id,
      io_kind,
      io_name,
      direction,
      contract_id,
      runtime,
      metadata
    from ${architectureSchemaName}.component_io_query`;
}

function architectureFlowSelect() {
  return `
    select
      flow_id,
      name,
      entry_component_id,
      entry_component_name,
      exit_component_id,
      exit_component_name,
      flow_kind,
      status,
      criticality,
      step_count,
      created_at,
      updated_at
    from ${architectureSchemaName}.component_flow_query flow`;
}

function architectureFlowStepSelect() {
  return `
    select
      flow_id,
      step_order,
      component_id,
      component_name,
      relation_id,
      relation_type,
      input_contract_id,
      input_contract_ref,
      output_contract_id,
      output_contract_ref,
      transformation_id,
      transformation_kind,
      created_at
    from ${architectureSchemaName}.component_flow_step_query`;
}

function architectureContractSelect() {
  return `
    select
      contract_id,
      contract_kind,
      component_id,
      component_name,
      contract_ref,
      compatibility,
      status,
      validation_command,
      created_at,
      updated_at
    from ${architectureSchemaName}.component_contract_query`;
}

function architectureTestSelect() {
  return `
    select
      test_id,
      component_id,
      test_path,
      test_kind,
      coverage_level,
      required,
      validation_command,
      created_at
    from ${architectureSchemaName}.component_test`;
}

function architectureObservabilitySelect() {
  return `
    select
      observability_id,
      component_id,
      signal_name,
      signal_kind,
      required,
      status,
      created_at
    from ${architectureSchemaName}.component_observability`;
}

function architectureMaturitySelect() {
  return `
    select
      component_id,
      name,
      maturity_score,
      metrics,
      missing_reasons
    from ${architectureSchemaName}.component_maturity_query`;
}

function architectureDriftSelect() {
  return `
    select
      subject_kind,
      subject_id,
      drift_code,
      severity,
      metadata
    from ${architectureSchemaName}.component_drift_query`;
}

function architectureEnforcementSelect() {
  return `
    select
      'authorization'::text as enforcement_kind,
      design_id,
      subject_kind,
      subject_id,
      authorization_state as state_or_violation,
      'info'::text as severity
    from ${architectureSchemaName}.implementation_authorization_query
    union all
    select
      'violation'::text as enforcement_kind,
      design_id,
      subject_kind,
      subject_id,
      violation_kind as state_or_violation,
      severity
    from ${architectureSchemaName}.implementation_violation_query`;
}

function architectureEvidenceSelect() {
  return `
    select
      evidence_id,
      design_id,
      subject_kind,
      subject_id,
      evidence_kind,
      evidence_origin,
      source_ref,
      source_path,
      result_state,
      recorded_at,
      source_content_sha256,
      freshness_state,
      verification_state,
      source_verification_state
    from ${architectureSchemaName}.evidence_query`;
}

function governanceCoverageSelect() {
  return `
    select
      coverage_id,
      coverage_kind,
      name,
      count_value,
      file_count,
      component_id
    from ${schemaName}.governance_coverage_query`;
}

function knowledgeDocumentSelect() {
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
      source_content_sha256
    from ${schemaName}.knowledge_document_query`;
}

function knowledgeActionSelect() {
  return `
    select
      action_id,
      document_path,
      document_type,
      mandatory,
      summary,
      status,
      required,
      line_number,
      links
    from ${schemaName}.knowledge_action_query`;
}

function mandatoryProposalGapSelect() {
  return `
    select
      proposal_id,
      document_path,
      title,
      status,
      required_action_count,
      linked_task_count,
      gap_kind
    from ${schemaName}.knowledge_mandatory_proposal_binding_gap`;
}

function governanceRemediationSelect() {
  return `
    select
      task_id,
      task_type,
      priority,
      component_unit,
      root_unit,
      domain_unit,
      ddd_owner,
      cq_rails,
      blocking,
      reason,
      file_count,
      document_count
    from ${schemaName}.governance_remediation_query`;
}

function riskDebtSelect() {
  return `
    select
      risk_id,
      source_path,
      title,
      status,
      owners,
      severity,
      probability,
      priority,
      component_unit,
      root_unit,
      domain_unit,
      ddd_owner,
      cq_rails,
      is_open,
      source_content_sha256
    from ${schemaName}.risk_debt_query`;
}

function governanceDriftSelect() {
  return `
    select
      path,
      component_unit,
      owning_unit,
      root_unit,
      domain_unit,
      drift_fields
    from ${schemaName}.governance_drift_query`;
}

async function readSummary(client) {
  const result = await client.query(`
    select
      'database'::text as "sourceAuthority",
      (select count(*)::int from ${schemaName}.repository_commands) as "repositoryCommands",
      (select count(*)::int from ${schemaName}.repository_commands where domain = 'unknown') as "repositoryCommandUnknown",
      (select count(*)::int from ${schemaName}.repository_commands where runtime_fanout = true) as "repositoryCommandRuntimeFanout",
      (select count(*)::int from ${schemaName}.command_query_rails) as "commandQueryRails",
      (select count(*)::int from ${schemaName}.command_query_rail_query where is_gap = true) as "commandQueryRailGaps",
      (select count(*)::int from ${schemaName}.command_query_rail_query where is_duplicate = true) as "commandQueryRailDuplicates",
      (select count(*)::int from ${schemaName}.pr_readiness_checks) as "prReadinessChecks",
      (select count(*)::int from ${schemaName}.pr_readiness_checks where blocking = true) as "prReadinessBlocking",
      (select count(*)::int from ${schemaName}.doc_disposition_documents) as "docsDispositionDocuments",
      (select count(*)::int from ${schemaName}.doc_disposition_actions) as "docsDispositionActions",
      (select count(*)::int from ${schemaName}.doc_resolution_overlays) as "docsResolutionOverlays",
      (select count(*)::int from ${schemaName}.doc_task_like_references) as "docsTaskLikeReferences",
      (select count(*)::int from ${schemaName}.doc_task_like_references where classification = 'unknown_task_like_id') as "docsTaskLikeReferencesUnknown",
      (select count(*)::int from ${schemaName}.risk_debt_items) as "riskDebtItems",
      (select count(*)::int from ${schemaName}.risk_debt_query where is_open = true) as "riskDebtItemsOpen",
      (select count(*)::int from ${schemaName}.governance_files) as "governanceFiles",
      (select count(*)::int from ${schemaName}.governance_files where is_drift = true) as "driftFiles",
      (select count(*)::int from ${schemaName}.governance_files where is_legacy = true) as "legacyFiles",
      (select count(*)::int from ${schemaName}.governance_components) as "governanceComponents",
      (select count(*)::int from ${schemaName}.governance_component_files) as "governanceComponentFiles",
      (select count(*)::int from ${schemaName}.governance_fingerprints) as "governanceFingerprints",
      (select count(*)::int from ${schemaName}.governance_coverage) as "governanceCoverageRows",
      (select count(*)::int from ${schemaName}.governance_remediation) as "governanceRemediationTasks",
      (select count(*)::int from ${schemaName}.governance_remediation where priority = 'P0') as "governanceRemediationP0"
  `);

  return result.rows[0];
}

async function readAiProjectContext(client, filters = {}) {
  const limit = parseLimit(filters.limit, 10);
  const limitedFilters = { ...filters, limit };

  const summary = await readSummary(client);
  const commandQueryRails = await readCommandQueryRailRows(client, limitedFilters);
  const components = await readGovernanceComponentRows(client, limitedFilters);
  const riskDebt = await readRiskDebtRows(client, {
    ...limitedFilters,
    status: filters.debtStatus || 'Open',
  });
  const commands = await readRepositoryCommandRows(client, {
    commandDomain: filters.commandDomain,
    type: filters.commandType,
    limit,
  });
  const prReadiness = await readPrReadinessRows(client, { limit });

  return buildAiProjectContext({
    summary,
    commandQueryRails,
    components,
    riskDebt,
    commands,
    prReadiness,
  });
}

async function readRepositoryCommandRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'domain', filters.commandDomain);
  appendFilter(predicates, params, 'command_type', filters.type);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${repositoryCommandSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by runtime_fanout desc, domain, command_type, coalesce(command_name, command_path)
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readPrReadinessRows(client, filters = {}) {
  const params = [];
  const limit = parseLimit(filters.limit, 20);
  params.push(limit);

  const result = await client.query(
    `${prReadinessSelect()}
     order by blocking desc, readiness_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readDocsDispositionRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'priority', filters.priority);
  appendFilter(predicates, params, 'action_kind', filters.kind);
  appendFilter(predicates, params, 'document_path', filters.path);
  appendFilter(predicates, params, 'document_status', filters.status);
  appendResolutionFilter(predicates, params, filters.resolution);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${docsDispositionActionSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case
        when priority ~* '^P?[0-9]+$' then regexp_replace(priority, '^P', '', 'i')::int
        else 9
      end,
      action_kind,
      document_path,
      reference_text
     limit $${params.length}`,
    params
  );

  return result.rows;
}

function appendGovernanceFileFilters(predicates, params, filters = {}) {
  appendFilter(predicates, params, 'leaf_component_id', filters.component);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'governance_state', filters.governanceState);
  appendFilter(predicates, params, 'file_path', filters.path);
}

function appendGovernanceDriftFilters(predicates, params, filters = {}) {
  appendFilter(predicates, params, 'component_unit', filters.component);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'path', filters.path);
}

function appendGovernanceComponentFilters(predicates, params, filters = {}) {
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'governance_state', filters.governanceState);
}

function appendGovernanceUnitFilters(predicates, params, filters = {}) {
  appendFilter(predicates, params, 'unit_id', filters.component);
  appendFilter(predicates, params, 'parent_id', filters.parentUnit);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'governance_state', filters.governanceState);
}

async function readGovernanceFileRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendGovernanceFileFilters(predicates, params, filters);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceFileSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by is_drift desc, component_unit, path
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readComponentProfileFileRows(client, filters = {}) {
  const component = String(filters.component || '').trim();
  if (!component) {
    return [];
  }

  const limit = parseLimit(filters.limit, 50);
  const result = await client.query(
    `with recursive component_scope(component_id, scope_depth, visited) as (
       select $1::text, 0::integer, array[$1::text]::text[]
       union all
       select
        tree.component_id,
        component_scope.scope_depth + 1,
        component_scope.visited || tree.component_id
       from ${componentEngineeringSchemaName}.component_tree_query tree
       join component_scope on tree.parent_component_id = component_scope.component_id
       where not tree.component_id = any(component_scope.visited)
     )
     select
       ownership.file_path as path,
       ownership.leaf_component_id as component_unit,
       ownership.owning_unit,
       ownership.root_unit,
       ownership.domain_unit,
       ownership.governance_state,
       ownership.is_drift,
       ownership.is_legacy,
       ownership.ddd_owner,
       ownership.cq_rails
     from ${schemaName}.component_engineering_file_ownership_projection ownership
     where ownership.leaf_component_id in (select component_id from component_scope)
        or ownership.owning_unit in (select component_id from component_scope)
     order by is_drift desc, component_unit, path
     limit $2`,
    [component, limit]
  );

  return result.rows;
}

async function readFrontendComponentProfileRows(client, filters = {}) {
  const component = String(filters.component || '').trim();
  if (!component) {
    return null;
  }

  const limit = parseLimit(filters.limit, 50);
  const componentRows = await readFrontendComponentRows(client, {
    component,
    limit: 1,
  });
  const frontendComponent = componentRows[0];
  if (!frontendComponent) {
    return null;
  }

  const [files, rails, architectureDesigns] = await Promise.all([
    readFrontendComponentFileRows(client, { component, limit }),
    readFrontendComponentRailRows(client, { component, limit }),
    readArchitectureDesignScopeRows(client, {
      component,
      subjectKind: 'component',
      limit,
    }),
  ]);
  const railNames = rails
    .map((rail) => rail.rail_name ?? rail.railName)
    .filter(Boolean)
    .join(';');

  return {
    filters: { component },
    component: {
      component_id: frontendComponent.component_id ?? frontendComponent.componentId,
      name: frontendComponent.component_name ?? frontendComponent.componentName,
      component_level: frontendComponent.component_kind ?? frontendComponent.componentKind,
      parent_component_id:
        frontendComponent.source_path ??
        frontendComponent.sourcePath ??
        'frontend-component-inventory',
      governance_state: frontendComponent.component_status ?? frontendComponent.componentStatus,
      ddd_owner:
        frontendComponent.frontend_owner ??
        frontendComponent.frontendOwner ??
        frontendComponent.package_name ??
        frontendComponent.packageName ??
        '-',
      cq_rails: railNames,
    },
    children: [],
    files: files.map((file) => ({
      path: file.file_path ?? file.filePath,
      component_unit: file.component_id ?? file.componentId,
      owning_unit: file.component_id ?? file.componentId,
      governance_state:
        file.component_status ??
        file.componentStatus ??
        frontendComponent.component_status ??
        frontendComponent.componentStatus,
    })),
    architectureComponents: [],
    responsibilities: [],
    io: [],
    relations: [],
    contracts: [],
    tests: [],
    observability: [],
    architectureDesigns,
    fowlerReferences: [],
  };
}

async function readGovernanceComponentRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendGovernanceComponentFilters(predicates, params, filters);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceComponentSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by file_count desc, component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readGovernanceUnitRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendGovernanceUnitFilters(predicates, params, filters);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceUnitSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by parent_id nulls first, level, unit_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readComponentEngineeringComponentTreeRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'parent_component_id', filters.parentUnit);
  appendFilter(predicates, params, 'governance_state', filters.governanceState);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${componentEngineeringComponentTreeSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readComponentEngineeringComponentDriftRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'drift_code', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${componentEngineeringComponentDriftSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id, drift_code
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readComponentEngineeringComponentMetadataRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'governance_state', filters.governanceState);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${componentEngineeringComponentMetadataSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case metadata_state
        when 'incomplete' then 0
        when 'declared' then 1
        else 2
      end,
      descendant_file_count desc,
      component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readComponentProfileRows(client, filters = {}) {
  const component = String(filters.component || filters.filter || '').trim();
  if (!component) {
    throw new Error('component-profile requires --component <id>.');
  }

  const limit = parseLimit(filters.limit, 50);
  const scopedFilters = { ...filters, component, limit };
  const frontendProfile = await readFrontendComponentProfileRows(client, scopedFilters);
  if (frontendProfile) {
    return frontendProfile;
  }

  const componentRows = await readComponentEngineeringComponentTreeRows(client, {
    ...scopedFilters,
    limit: 1,
  });

  return {
    filters: { component },
    component: componentRows[0] || null,
    children: await readComponentEngineeringComponentTreeRows(client, {
      parentUnit: component,
      limit,
    }),
    files: await readComponentProfileFileRows(client, scopedFilters),
    architectureComponents: await readArchitectureComponentRows(client, scopedFilters),
    responsibilities: await readArchitectureResponsibilityRows(client, scopedFilters),
    io: await readArchitectureIoRows(client, scopedFilters),
    relations: await readArchitectureRelationRows(client, scopedFilters),
    contracts: await readArchitectureContractRows(client, scopedFilters),
    tests: await readArchitectureTestRows(client, scopedFilters),
    observability: await readArchitectureObservabilityRows(client, scopedFilters),
    architectureDesigns: await readArchitectureDesignScopeRows(client, {
      component,
      subjectKind: 'component',
      limit,
    }),
    fowlerReferences: await readFowlerAnalysisReferenceRows(client, {
      component,
      limit,
    }),
  };
}

async function readComponentEngineeringRuleCatalogRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'category', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${componentEngineeringRuleCatalogSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by rule_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readComponentEngineeringRuleEvaluationRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'subject_id', filters.component);
  appendFilter(predicates, params, 'evaluation_state', filters.governanceState);
  appendFilter(predicates, params, 'rule_id', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${componentEngineeringRuleEvaluationSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case evaluation_state
        when 'fail' then 0
        when 'warn' then 1
        else 2
      end,
      subject_id,
      rule_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readComponentEngineeringQualityRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'governance_state', filters.governanceState);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${componentEngineeringQualitySelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case quality_state
        when 'fail' then 0
        when 'warn' then 1
        else 2
      end,
      descendant_file_count desc,
      component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureDesignRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'design_id', filters.design);
  appendFilter(predicates, params, 'work_item_id', filters.taskId);
  appendFilter(predicates, params, 'status', filters.status);
  appendFilter(predicates, params, 'owner', filters.owner);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureDesignSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by updated_at desc, design_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureDesignScopeRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'design_id', filters.design);
  appendFilter(predicates, params, 'subject_kind', filters.subjectKind);
  appendFilter(predicates, params, 'subject_id', filters.subject || filters.component);
  appendFilter(predicates, params, 'scope_kind', filters.kind);
  appendFilter(predicates, params, 'design_status', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureDesignScopeSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by design_id, subject_kind, subject_id, scope_kind
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureComponentRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'kind', filters.kind);
  appendFilter(predicates, params, 'layer', filters.layer);
  appendFilter(predicates, params, 'owner', filters.owner);
  appendFilter(predicates, params, 'status', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureComponentSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by layer, kind, component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureRelationRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'relation_id', filters.relation);
  appendComponentPairFilter(
    predicates,
    params,
    filters.component,
    'source_component_id',
    'target_component_id'
  );
  appendFilter(predicates, params, 'relation_type', filters.kind);
  appendFilter(predicates, params, 'status', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureRelationSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by source_component_id, target_component_id, relation_type
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureResponsibilityRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'ddd_owner', filters.owner);
  appendFilter(predicates, params, 'status', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureResponsibilitySelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id, responsibility_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureIoRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'io_kind', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureIoSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id, io_kind, io_name
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureFlowRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'flow_id', filters.flow);
  appendFilter(predicates, params, 'flow_kind', filters.kind);
  appendFilter(predicates, params, 'status', filters.status);
  if (filters.component !== undefined && filters.component !== null && filters.component !== '') {
    params.push(filters.component);
    predicates.push(
      `(flow.entry_component_id = $${params.length} or flow.exit_component_id = $${params.length} or exists (
        select 1
        from ${architectureSchemaName}.component_flow_step_query step
        where step.flow_id = flow.flow_id
          and step.component_id = $${params.length}
      ))`
    );
  }

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureFlowSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by flow_kind, flow_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureFlowStepRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'flow_id', filters.flow);
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'relation_id', filters.relation);

  const limit = parseLimit(filters.limit, 100);
  params.push(limit);

  const result = await client.query(
    `${architectureFlowStepSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by flow_id, step_order
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureContractRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'contract_id', filters.contract);
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'contract_kind', filters.kind);
  appendFilter(predicates, params, 'status', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureContractSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id, contract_kind, contract_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureTestRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'test_id', filters.test);
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'test_kind', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureTestSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id, test_kind, test_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureObservabilityRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'observability_id', filters.observability);
  appendFilter(predicates, params, 'component_id', filters.component);
  appendFilter(predicates, params, 'signal_kind', filters.kind);
  appendFilter(predicates, params, 'status', filters.state);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureObservabilitySelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id, signal_kind, observability_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureMaturityRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureMaturitySelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by maturity_score, component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureDriftRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'subject_kind', filters.subjectKind);
  appendFilter(predicates, params, 'subject_id', filters.subject || filters.component);
  appendFilter(predicates, params, 'drift_code', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureDriftSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by severity desc, subject_kind, subject_id, drift_code
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureEnforcementRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'design_id', filters.design);
  appendFilter(predicates, params, 'subject_kind', filters.subjectKind);
  appendFilter(predicates, params, 'subject_id', filters.subject || filters.component);
  appendFilter(predicates, params, 'enforcement_kind', filters.kind);
  appendFilter(predicates, params, 'state_or_violation', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `select *
     from (${architectureEnforcementSelect()}) architecture_enforcement
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by enforcement_kind desc, severity desc, design_id, subject_kind, subject_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readArchitectureEvidenceRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'subject_kind', filters.subjectKind);
  appendFilter(predicates, params, 'subject_id', filters.subject || filters.component);
  appendFilter(predicates, params, 'evidence_kind', filters.kind);
  appendFilter(predicates, params, 'result_state', filters.status);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${architectureEvidenceSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by recorded_at desc, subject_kind, subject_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readGovernanceCoverageRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'coverage_kind', filters.kind);
  appendFilter(predicates, params, 'component_id', filters.component);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceCoverageSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by coverage_kind, name
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readGovernanceRemediationRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'priority', filters.priority);
  appendFilter(predicates, params, 'component_unit', filters.component);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'task_type', filters.kind);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceRemediationSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case
        when priority ~* '^P?[0-9]+$' then regexp_replace(priority, '^P', '', 'i')::int
        else 9
      end,
      task_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readRiskDebtRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'priority', filters.priority);
  appendFilter(predicates, params, 'status', filters.status);
  appendFilter(predicates, params, 'component_unit', filters.component);
  appendFilter(predicates, params, 'root_unit', filters.rootUnit);
  appendFilter(predicates, params, 'domain_unit', filters.domainUnit);
  appendFilter(predicates, params, 'source_path', filters.path);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${riskDebtSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by
      case
        when priority ~* '^P?[0-9]+$' then regexp_replace(priority, '^P', '', 'i')::int
        else 9
      end,
      risk_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readGovernanceDriftRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendGovernanceDriftFilters(predicates, params, filters);

  const limit = parseLimit(filters.limit, 50);
  params.push(limit);

  const result = await client.query(
    `${governanceDriftSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_unit, path
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readKnowledgeDocumentRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'document_type', filters.type);
  appendFilter(predicates, params, 'document_path', filters.path);
  appendFilter(predicates, params, 'status', filters.status);
  const limit = parseLimit(filters.limit, 50);
  params.push(limit);
  const result = await client.query(
    `${knowledgeDocumentSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by mandatory desc, document_type, document_path
     limit $${params.length}`,
    params
  );
  return result.rows;
}

async function readKnowledgeActionRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'document_path', filters.path);
  appendFilter(predicates, params, 'status', filters.status);
  appendFilter(predicates, params, 'document_type', filters.type);
  const limit = parseLimit(filters.limit, 50);
  params.push(limit);
  const result = await client.query(
    `${knowledgeActionSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by required desc, status, document_path, line_number
     limit $${params.length}`,
    params
  );
  return result.rows;
}

async function readMandatoryProposalGapRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'document_path', filters.path);
  appendFilter(predicates, params, 'gap_kind', filters.kind);
  const limit = parseLimit(filters.limit, 50);
  params.push(limit);
  const result = await client.query(
    `${mandatoryProposalGapSelect()}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by gap_kind, document_path
     limit $${params.length}`,
    params
  );
  return result.rows;
}

async function readComponentEngineeringRecordRows(client, filters = {}) {
  const params = [];
  const predicates = [];
  appendFilter(predicates, params, 'component_id', filters.component);

  const limit = parseLimit(filters.limit, 20);
  params.push(limit);
  const viewName =
    parseCerSchemaVersion(filters.schemaVersion) === 'v2'
      ? 'governance_component_engineering_record_v2_query'
      : 'governance_component_engineering_record_query';

  const result = await client.query(
    `select component_id, record
     from ${schemaName}.${viewName}
     ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
     order by component_id
     limit $${params.length}`,
    params
  );

  return result.rows;
}

async function readHashDriftSummary(client) {
  const result = await client.query(`
    select
      (select count(*)::int from ${schemaName}.governance_file_hash_drift) as "governanceHashDrift"
  `);

  return result.rows[0];
}

function printRows(rows) {
  for (const [label, value] of rows) {
    console.log(`${label}: ${value}`);
  }
}

function printSummary(summary) {
  printRows(buildSummaryRows(summary));
}

function printHashDriftSummary(summary) {
  printRows(buildHashDriftRows(summary));
}

function printTaskRows(rows) {
  for (const row of rows) {
    console.log(row.join('\t'));
  }
}

function printJsonRows(rows) {
  for (const row of rows) {
    console.log(JSON.stringify(row, null, 2));
  }
}

async function runQuery(options = {}) {
  const queryName = resolveQueryName(options.queryName);

  await ensureFreshGovernanceProjection(queryName, options);

  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    if (queryName === 'summary') {
      const summary = await readSummary(client);
      if (options.print !== false) {
        printSummary(summary);
      }
      return summary;
    }

    if (queryName === 'hash-drift') {
      const summary = await readHashDriftSummary(client);
      if (options.print !== false) {
        printHashDriftSummary(summary);
      }
      return summary;
    }

    if (queryName === 'commands') {
      const rows = await readRepositoryCommandRows(client, options.filters || {});
      const commandRows = buildRepositoryCommandRows(rows);
      if (options.print !== false) {
        printTaskRows(commandRows);
      }
      return commandRows;
    }

    if (queryName === 'command-query-rails') {
      const rows = await readCommandQueryRailRows(client, options.filters || {});
      const railRows = buildCommandQueryRailRows(rows);
      if (options.print !== false) {
        printTaskRows(railRows);
      }
      return railRows;
    }

    if (queryName === 'dbt-roundtrip-capabilities') {
      const rows = await readDbtProjectRoundtripCapabilityStatusRows(client, options.filters || {});
      const capabilityRows = buildDbtProjectRoundtripCapabilityStatusRows(rows);
      if (options.print !== false) {
        printTaskRows(capabilityRows);
      }
      return capabilityRows;
    }

    if (queryName === 'rail-vocabulary' || queryName === 'rail-duplicates') {
      const filters =
        queryName === 'rail-duplicates'
          ? { ...(options.filters || {}), duplicates: true }
          : options.filters || {};
      const rows = await readRailVocabularyRows(client, filters);
      const railRows = buildRailVocabularyRows(rows);
      if (options.print !== false) {
        printTaskRows(railRows);
      }
      return railRows;
    }

    if (queryName === 'code-symbols') {
      const rows = await readCodeSymbolRows(client, options.filters || {});
      const symbolRows = buildCodeSymbolRows(rows);
      if (options.print !== false) {
        printTaskRows(symbolRows);
      }
      return symbolRows;
    }

    if (queryName === 'code-symbol-duplicates') {
      const rows = await readCodeSymbolDuplicateRows(client, options.filters || {});
      const duplicateRows = buildCodeSymbolDuplicateRows(rows);
      if (options.print !== false) {
        printTaskRows(duplicateRows);
      }
      return duplicateRows;
    }

    if (queryName === 'code-symbol-semantic-candidates') {
      const rows = await readCodeSymbolDuplicateRows(client, {
        ...(options.filters || {}),
        kind: 'semantic_duplicate_candidate',
      });
      const candidateRows = buildCodeSymbolDuplicateRows(rows);
      if (options.print !== false) {
        printTaskRows(candidateRows);
      }
      return candidateRows;
    }

    if (queryName === 'source-drift') {
      const rows = await readSourceDriftRows(client, options.filters || {});
      const driftRows = buildSourceDriftRows(rows);
      if (options.print !== false) {
        printTaskRows(driftRows);
      }
      return driftRows;
    }

    if (queryName === 'governance-problem-dashboard') {
      const rows = await readGovernanceProblemRows(client, options.filters || {});
      const problemRows = buildGovernanceProblemRows(rows);
      if (options.print !== false) {
        printTaskRows(problemRows);
      }
      return problemRows;
    }

    if (queryName === 'ai-project-context') {
      const context = await readAiProjectContext(client, options.filters || {});
      if (options.print !== false) {
        if ((options.outputFormat || 'json') === 'markdown') {
          console.log(renderAiProjectContextMarkdown(context));
        } else {
          console.log(JSON.stringify(context, null, 2));
        }
      }
      return context;
    }

    if (queryName === 'creation-intent') {
      const rows = await readCreationIntentRows(client, options.filters || {});
      const intentRows = buildCreationIntentRows(rows, options.filters || {});
      if (options.print !== false) {
        printTaskRows(intentRows);
      }
      return intentRows;
    }

    if (queryName === 'frontend-surfaces') {
      const rows = await readFrontendMechanicalTruthRows(client, options.filters || {});
      const surfaceRows = buildFrontendMechanicalTruthRows(rows);
      if (options.print !== false) {
        printTaskRows(surfaceRows);
      }
      return surfaceRows;
    }

    if (queryName === 'frontend-components') {
      const rows = await readFrontendComponentRows(client, options.filters || {});
      const componentRows = buildFrontendComponentRows(rows);
      if (options.print !== false) {
        printTaskRows(componentRows);
      }
      return componentRows;
    }

    if (queryName === 'frontend-component-files') {
      const rows = await readFrontendComponentFileRows(client, options.filters || {});
      const fileRows = buildFrontendComponentFileRows(rows);
      if (options.print !== false) {
        printTaskRows(fileRows);
      }
      return fileRows;
    }

    if (queryName === 'frontend-component-rails') {
      const rows = await readFrontendComponentRailRows(client, options.filters || {});
      const railRows = buildFrontendComponentRailRows(rows);
      if (options.print !== false) {
        printTaskRows(railRows);
      }
      return railRows;
    }

    if (queryName === 'feature-mechanization') {
      const rows = await readFeatureMechanizationFeatureRows(client, options.filters || {});
      const featureRows = buildFeatureMechanizationFeatureRows(rows);
      if (options.print !== false) {
        printTaskRows(featureRows);
      }
      return featureRows;
    }

    if (queryName === 'feature-mechanization-components') {
      const rows = await readFeatureMechanizationComponentRows(client, options.filters || {});
      const componentRows = buildFeatureMechanizationComponentRows(rows);
      if (options.print !== false) {
        printTaskRows(componentRows);
      }
      return componentRows;
    }

    if (queryName === 'feature-mechanization-symbols') {
      const rows = await readFeatureMechanizationSymbolRows(client, options.filters || {});
      const symbolRows = buildFeatureMechanizationSymbolRows(rows);
      if (options.print !== false) {
        printTaskRows(symbolRows);
      }
      return symbolRows;
    }

    if (queryName === 'feature-mechanization-rails') {
      const rows = await readFeatureMechanizationRailRows(client, options.filters || {});
      const railRows = buildFeatureMechanizationRailRows(rows);
      if (options.print !== false) {
        printTaskRows(railRows);
      }
      return railRows;
    }

    if (queryName === 'feature-mechanization-validations') {
      const rows = await readFeatureMechanizationValidationRows(client, options.filters || {});
      const validationRows = buildFeatureMechanizationValidationRows(rows);
      if (options.print !== false) {
        printTaskRows(validationRows);
      }
      return validationRows;
    }

    if (queryName === 'db-surfaces') {
      const rows = await readDbSurfaceRows(client, options.filters || {});
      const surfaceRows = buildDbSurfaceRows(rows);
      if (options.print !== false) {
        printTaskRows(surfaceRows);
      }
      return surfaceRows;
    }

    if (queryName === 'pr-readiness') {
      const rows = await readPrReadinessRows(client, options.filters || {});
      const readinessRows = buildPrReadinessRows(rows);
      if (options.print !== false) {
        printTaskRows(readinessRows);
      }
      return readinessRows;
    }

    if (queryName === 'docs-disposition') {
      const rows = await readDocsDispositionRows(client, options.filters || {});
      const dispositionRows = buildDocsDispositionRows(rows);
      if (options.print !== false) {
        printTaskRows(dispositionRows);
      }
      return dispositionRows;
    }

    if (queryName === 'knowledge-documents') {
      const rows = await readKnowledgeDocumentRows(client, options.filters || {});
      const documentRows = buildKnowledgeDocumentRows(rows);
      if (options.print !== false) {
        printTaskRows(documentRows);
      }
      return documentRows;
    }

    if (queryName === 'knowledge-actions') {
      const rows = await readKnowledgeActionRows(client, options.filters || {});
      const actionRows = buildKnowledgeActionRows(rows);
      if (options.print !== false) {
        printTaskRows(actionRows);
      }
      return actionRows;
    }

    if (queryName === 'knowledge-intake') {
      if ((options.filters || {}).references === true) {
        const rows = await readKnowledgeIntakeReferenceRows(client, options.filters || {});
        const referenceRows = buildKnowledgeIntakeReferenceRows(rows);
        if (options.print !== false) {
          printTaskRows(referenceRows);
        }
        return referenceRows;
      }

      const rows = await readKnowledgeIntakeRetirementRows(client, options.filters || {});
      const intakeRows = buildKnowledgeIntakeRetirementRows(rows);
      if (options.print !== false) {
        printTaskRows(intakeRows);
      }
      return intakeRows;
    }

    if (queryName === 'documentation-lifecycle') {
      const rows = await readDocumentationLifecycleRows(client, options.filters || {});
      const lifecycleRows = buildDocumentationLifecycleRows(rows);
      if (options.print !== false) {
        printTaskRows(lifecycleRows);
      }
      return lifecycleRows;
    }

    if (queryName === 'fowler-analysis') {
      const rows = await readFowlerAnalysisRows(client, options.filters || {});
      const fowlerRows = buildFowlerAnalysisRows(rows);
      if (options.print !== false) {
        printTaskRows(fowlerRows);
      }
      return fowlerRows;
    }

    if (queryName === 'fowler-analysis-references') {
      const rows = await readFowlerAnalysisReferenceRows(client, options.filters || {});
      const referenceRows = buildFowlerAnalysisReferenceRows(rows);
      if (options.print !== false) {
        printTaskRows(referenceRows);
      }
      return referenceRows;
    }

    if (queryName === 'fowler-analysis-retirement') {
      const rows = await readFowlerAnalysisRetirementRows(client, options.filters || {});
      const retirementRows = buildFowlerAnalysisRetirementRows(rows);
      if (options.print !== false) {
        printTaskRows(retirementRows);
      }
      return retirementRows;
    }

    if (queryName === 'fowler-analysis-coverage') {
      const rows = await readFowlerAnalysisCanonicalCoverageRows(client, options.filters || {});
      const coverageRows = buildFowlerAnalysisCanonicalCoverageRows(rows);
      if (options.print !== false) {
        printTaskRows(coverageRows);
      }
      return coverageRows;
    }

    if (queryName === 'fowler-analysis-intent') {
      const rows = await readFowlerAnalysisIntentRows(client, options.filters || {});
      const intentRows = buildFowlerAnalysisIntentRows(rows);
      if (options.print !== false) {
        printTaskRows(intentRows);
      }
      return intentRows;
    }

    if (queryName === 'fowler-analysis-duplicates') {
      const rows = await readFowlerAnalysisDuplicateRows(client, options.filters || {});
      const duplicateRows = buildFowlerAnalysisDuplicateRows(rows);
      if (options.print !== false) {
        printTaskRows(duplicateRows);
      }
      return duplicateRows;
    }

    if (queryName === 'documentation-panels') {
      const rows = await readDocumentationPanelRows(client, options.filters || {});
      const panelRows = buildDocumentationPanelRows(rows);
      if (options.print !== false) {
        printTaskRows(panelRows);
      }
      return panelRows;
    }

    if (queryName === 'component-roadmap') {
      const rows = await readComponentRoadmapRows(client, options.filters || {});
      const roadmapRows = buildComponentRoadmapRows(rows);
      if (options.print !== false) {
        printTaskRows(roadmapRows);
      }
      return roadmapRows;
    }

    if (queryName === 'canvas-cq-rail-drift') {
      const rows = await readCanvasCqRailDriftRows(client, options.filters || {});
      const driftRows = buildCanvasCqRailDriftRows(rows);
      if (options.print !== false) {
        printTaskRows(driftRows);
      }
      return driftRows;
    }

    if (queryName === 'canvas-component-registry-drift') {
      const rows = await readCanvasComponentRegistryDriftRows(client, options.filters || {});
      const driftRows = buildCanvasComponentRegistryDriftRows(rows);
      if (options.print !== false) {
        printTaskRows(driftRows);
      }
      return driftRows;
    }

    if (queryName === 'canvas-uxdb-specification') {
      const rows = await readCanvasUxdbSpecificationRows(client, options.filters || {});
      const specificationRows = buildCanvasUxdbSpecificationRows(rows);
      if (options.print !== false) {
        printTaskRows(specificationRows);
      }
      return specificationRows;
    }

    if (queryName === 'governance-refresh-runs') {
      const rows = await readGovernanceRefreshRunRows(client, options.filters || {});
      const refreshRows = buildGovernanceRefreshRunRows(rows);
      if (options.print !== false) {
        printTaskRows(refreshRows);
      }
      return refreshRows;
    }

    if (queryName === 'mandatory-proposal-gaps') {
      const rows = await readMandatoryProposalGapRows(client, options.filters || {});
      const gapRows = buildMandatoryProposalGapRows(rows);
      if (options.print !== false) {
        printTaskRows(gapRows);
      }
      return gapRows;
    }

    if (queryName === 'files') {
      const rows = await readGovernanceFileRows(client, options.filters || {});
      const fileRows = buildGovernanceFileRows(rows);
      if (options.print !== false) {
        printTaskRows(fileRows);
      }
      return fileRows;
    }

    if (queryName === 'components') {
      const rows = await readGovernanceComponentRows(client, options.filters || {});
      const componentRows = buildGovernanceComponentRows(rows);
      if (options.print !== false) {
        printTaskRows(componentRows);
      }
      return componentRows;
    }

    if (queryName === 'units') {
      const rows = await readGovernanceUnitRows(client, options.filters || {});
      const unitRows = buildGovernanceUnitRows(rows);
      if (options.print !== false) {
        printTaskRows(unitRows);
      }
      return unitRows;
    }

    if (queryName === 'component-tree') {
      const rows = await readComponentEngineeringComponentTreeRows(client, options.filters || {});
      const componentRows = buildComponentEngineeringComponentTreeRows(rows);
      if (options.print !== false) {
        printTaskRows(componentRows);
      }
      return componentRows;
    }

    if (queryName === 'component-metadata') {
      const rows = await readComponentEngineeringComponentMetadataRows(
        client,
        options.filters || {}
      );
      const metadataRows = buildComponentEngineeringComponentMetadataRows(rows);
      if (options.print !== false) {
        printTaskRows(metadataRows);
      }
      return metadataRows;
    }

    if (queryName === 'component-drift') {
      const rows = await readComponentEngineeringComponentDriftRows(client, options.filters || {});
      const driftRows = buildComponentEngineeringComponentDriftRows(rows);
      if (options.print !== false) {
        printTaskRows(driftRows);
      }
      return driftRows;
    }

    if (queryName === 'component-rules') {
      const rows = await readComponentEngineeringRuleCatalogRows(client, options.filters || {});
      const ruleRows = buildComponentEngineeringRuleCatalogRows(rows);
      if (options.print !== false) {
        printTaskRows(ruleRows);
      }
      return ruleRows;
    }

    if (queryName === 'component-rule-evaluations') {
      const rows = await readComponentEngineeringRuleEvaluationRows(client, options.filters || {});
      const evaluationRows = buildComponentEngineeringRuleEvaluationRows(rows);
      if (options.print !== false) {
        printTaskRows(evaluationRows);
      }
      return evaluationRows;
    }

    if (queryName === 'component-quality') {
      const rows = await readComponentEngineeringQualityRows(client, options.filters || {});
      const qualityRows = buildComponentEngineeringQualityRows(rows);
      if (options.print !== false) {
        printTaskRows(qualityRows);
      }
      return qualityRows;
    }

    if (queryName === 'component-profile') {
      const profile = await readComponentProfileRows(client, options.filters || {});
      const profileRows = buildComponentProfileRows(profile);
      if (options.print !== false) {
        printTaskRows(profileRows);
      }
      return profileRows;
    }

    if (
      queryName === 'component-integrity' ||
      queryName === 'component-validation' ||
      queryName === 'filesystem-coverage'
    ) {
      const filters =
        queryName === 'filesystem-coverage'
          ? { ...(options.filters || {}), kind: 'filesystem_coverage' }
          : options.filters || {};
      const rows = await readComponentIntegrityRows(client, filters);
      const integrityRows = buildComponentIntegrityRows(rows);
      if (options.print !== false) {
        printTaskRows(integrityRows);
      }
      return integrityRows;
    }

    if (queryName === 'architecture-designs') {
      const rows = await readArchitectureDesignRows(client, options.filters || {});
      const designRows = buildArchitectureDesignRows(rows);
      if (options.print !== false) {
        printTaskRows(designRows);
      }
      return designRows;
    }

    if (queryName === 'architecture-scopes') {
      const rows = await readArchitectureDesignScopeRows(client, options.filters || {});
      const scopeRows = buildArchitectureDesignScopeRows(rows);
      if (options.print !== false) {
        printTaskRows(scopeRows);
      }
      return scopeRows;
    }

    if (queryName === 'architecture-components') {
      const rows = await readArchitectureComponentRows(client, options.filters || {});
      const componentRows = buildArchitectureComponentRows(rows);
      if (options.print !== false) {
        printTaskRows(componentRows);
      }
      return componentRows;
    }

    if (queryName === 'architecture-relations') {
      const rows = await readArchitectureRelationRows(client, options.filters || {});
      const relationRows = buildArchitectureRelationRows(rows);
      if (options.print !== false) {
        printTaskRows(relationRows);
      }
      return relationRows;
    }

    if (queryName === 'architecture-responsibilities') {
      const rows = await readArchitectureResponsibilityRows(client, options.filters || {});
      const responsibilityRows = buildArchitectureResponsibilityRows(rows);
      if (options.print !== false) {
        printTaskRows(responsibilityRows);
      }
      return responsibilityRows;
    }

    if (queryName === 'architecture-io') {
      const rows = await readArchitectureIoRows(client, options.filters || {});
      const ioRows = buildArchitectureIoRows(rows);
      if (options.print !== false) {
        printTaskRows(ioRows);
      }
      return ioRows;
    }

    if (queryName === 'architecture-flows') {
      const rows = await readArchitectureFlowRows(client, options.filters || {});
      const flowRows = buildArchitectureFlowRows(rows);
      if (options.print !== false) {
        printTaskRows(flowRows);
      }
      return flowRows;
    }

    if (queryName === 'architecture-flow-steps') {
      const rows = await readArchitectureFlowStepRows(client, options.filters || {});
      const stepRows = buildArchitectureFlowStepRows(rows);
      if (options.print !== false) {
        printTaskRows(stepRows);
      }
      return stepRows;
    }

    if (queryName === 'architecture-contracts') {
      const rows = await readArchitectureContractRows(client, options.filters || {});
      const contractRows = buildArchitectureContractRows(rows);
      if (options.print !== false) {
        printTaskRows(contractRows);
      }
      return contractRows;
    }

    if (queryName === 'architecture-maturity') {
      const rows = await readArchitectureMaturityRows(client, options.filters || {});
      const maturityRows = buildArchitectureMaturityRows(rows);
      if (options.print !== false) {
        printTaskRows(maturityRows);
      }
      return maturityRows;
    }

    if (queryName === 'architecture-drift') {
      const rows = await readArchitectureDriftRows(client, options.filters || {});
      const driftRows = buildArchitectureDriftRows(rows);
      if (options.print !== false) {
        printTaskRows(driftRows);
      }
      return driftRows;
    }

    if (queryName === 'architecture-enforcement') {
      const rows = await readArchitectureEnforcementRows(client, options.filters || {});
      const enforcementRows = buildArchitectureEnforcementRows(rows);
      if (options.print !== false) {
        printTaskRows(enforcementRows);
      }
      return enforcementRows;
    }

    if (queryName === 'architecture-evidence') {
      const rows = await readArchitectureEvidenceRows(client, options.filters || {});
      const evidenceRows = buildArchitectureEvidenceRows(rows);
      if (options.print !== false) {
        printTaskRows(evidenceRows);
      }
      return evidenceRows;
    }

    if (queryName === 'architecture-dependency-observations') {
      const rows = await readArchitectureDependencyObservationRows(client, options.filters || {});
      const observationRows = buildArchitectureDependencyObservationRows(rows);
      if (options.print !== false) {
        printTaskRows(observationRows);
      }
      return observationRows;
    }

    if (queryName === 'architecture-path-mapping') {
      const rows = await readArchitecturePathMappingRows(client, options.filters || {});
      const mappingRows = buildArchitecturePathMappingRows(rows);
      if (options.print !== false) {
        printTaskRows(mappingRows);
      }
      return mappingRows;
    }

    if (queryName === 'architecture-dependency-classification') {
      const rows = await readArchitectureDependencyClassificationRows(
        client,
        options.filters || {}
      );
      const classificationRows = buildArchitectureDependencyClassificationRows(rows);
      if (options.print !== false) {
        printTaskRows(classificationRows);
      }
      return classificationRows;
    }

    if (queryName === 'architecture-fitness') {
      const rows = await readArchitectureFitnessRows(client, options.filters || {});
      const fitnessRows = buildArchitectureFitnessRows(rows);
      if (options.print !== false) {
        printTaskRows(fitnessRows);
      }
      return fitnessRows;
    }

    if (queryName === 'architecture-fitness-gaps') {
      const rows = await readArchitectureFitnessGapRows(client, options.filters || {});
      const gapRows = buildArchitectureFitnessGapRows(rows);
      if (options.print !== false) {
        printTaskRows(gapRows);
      }
      return gapRows;
    }

    if (queryName === 'coverage') {
      const rows = await readGovernanceCoverageRows(client, options.filters || {});
      const coverageRows = buildGovernanceCoverageRows(rows);
      if (options.print !== false) {
        printTaskRows(coverageRows);
      }
      return coverageRows;
    }

    if (queryName === 'remediation') {
      const rows = await readGovernanceRemediationRows(client, options.filters || {});
      const remediationRows = buildGovernanceRemediationRows(rows);
      if (options.print !== false) {
        printTaskRows(remediationRows);
      }
      return remediationRows;
    }

    if (queryName === 'debt') {
      const rows = await readRiskDebtRows(client, options.filters || {});
      const debtRows = buildRiskDebtRows(rows);
      if (options.print !== false) {
        printTaskRows(debtRows);
      }
      return debtRows;
    }

    if (queryName === 'drift') {
      const rows = await readGovernanceDriftRows(client, options.filters || {});
      const driftRows = buildGovernanceDriftRows(rows);
      if (options.print !== false) {
        printTaskRows(driftRows);
      }
      return driftRows;
    }

    if (queryName === 'cer') {
      const rows = await readComponentEngineeringRecordRows(client, options.filters || {});
      const cerRows = buildComponentEngineeringRecordRows(rows);
      if (options.print !== false) {
        printJsonRows(cerRows);
      }
      return cerRows;
    }

    throw new Error(`Unhandled planning DB query "${queryName}".`);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function queryErrorDetails(error) {
  const details = [];
  const nestedErrors = Array.isArray(error && error.errors) ? error.errors : [];
  for (const nestedError of nestedErrors) {
    const nestedMessage =
      nestedError && (nestedError.message || nestedError.code || nestedError.name);
    if (nestedMessage) {
      details.push(String(nestedMessage));
    }
  }

  const cause = error && error.cause;
  const causeMessage = cause && (cause.message || cause.code || cause.name);
  if (causeMessage) {
    details.push(String(causeMessage));
  }

  const directMessage = error && (error.message || error.code || error.name);
  if (directMessage) {
    details.push(String(directMessage));
  }

  return [...new Set(details)];
}

function formatQueryError(error) {
  const details = queryErrorDetails(error);
  const hasConnectionRefusal =
    (error && error.code === 'ECONNREFUSED') ||
    details.some((detail) => /ECONNREFUSED|connection refused/i.test(detail));

  if (hasConnectionRefusal) {
    return [
      'Planning DB is unavailable.',
      'Run `pnpm planning:db:up` to connect the existing authority.',
      'Use `pnpm planning:db:import` only for an explicit bootstrap or recovery.',
      `Details: ${details.join('; ')}`,
    ].join(' ');
  }

  return details[0] || String(error);
}

async function main() {
  const command = parseArgs();
  if (command.kind === 'help') {
    console.log(command.helpText);
    return;
  }

  await runQuery(command);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:query] ${formatQueryError(error)}`);
    process.exit(1);
  });
}

module.exports = {
  buildAiProjectContext,
  buildComponentEngineeringComponentDriftRows,
  buildComponentEngineeringComponentTreeRows,
  buildComponentEngineeringQualityRows,
  buildComponentProfileRows,
  buildComponentEngineeringRecordRows,
  buildComponentEngineeringRuleCatalogRows,
  buildComponentEngineeringRuleEvaluationRows,
  buildDocsDispositionRows,
  buildGovernanceComponentRows,
  buildGovernanceCoverageRows,
  buildGovernanceDriftRows,
  buildGovernanceFileRows,
  buildGovernanceUnitRows,
  buildGovernanceRemediationRows,
  buildGovernanceRefreshRunRows,
  buildRiskDebtRows,
  buildArchitectureComponentRows,
  buildArchitectureContractRows,
  buildArchitectureDependencyClassificationRows,
  buildArchitectureDependencyObservationRows,
  buildArchitectureDesignRows,
  buildArchitectureDesignScopeRows,
  buildArchitectureDriftRows,
  buildArchitectureEnforcementRows,
  buildArchitectureEvidenceRows,
  buildArchitectureFitnessRows,
  buildArchitectureFlowRows,
  buildArchitectureFlowStepRows,
  buildArchitectureIoRows,
  buildArchitectureMaturityRows,
  buildArchitectureObservabilityRows,
  buildArchitecturePathMappingRows,
  buildArchitectureRelationRows,
  buildArchitectureResponsibilityRows,
  buildArchitectureTestRows,
  buildCodeSymbolDuplicateRows,
  buildCodeSymbolRows,
  buildComponentIntegrityRows,
  buildGovernanceProblemRows,
  buildRailVocabularyRows,
  buildSourceDriftRows,
  buildHashDriftRows,
  buildPlanningDbQueryHelpText,
  buildComponentEngineeringComponentMetadataRows,
  buildKnowledgeActionRows,
  buildKnowledgeDocumentRows,
  buildDocumentationLifecycleRows,
  buildDocumentationPanelRows,
  buildComponentRoadmapRows,
  buildCanvasCqRailDriftRows,
  buildCanvasComponentRegistryDriftRows,
  buildCanvasUxdbSpecificationRows,
  buildMandatoryProposalGapRows,
  buildPrReadinessRows,
  buildCommandQueryRailRows,
  buildCreationIntentRows,
  buildFeatureMechanizationComponentRows,
  buildFeatureMechanizationFeatureRows,
  buildFeatureMechanizationRailRows,
  buildFeatureMechanizationSymbolRows,
  buildFeatureMechanizationValidationRows,
  buildFrontendComponentFileRows,
  buildFrontendComponentRailRows,
  buildFrontendComponentRows,
  buildFrontendMechanicalTruthRows,
  buildDbSurfaceRows,
  buildDbtProjectRoundtripCapabilityStatusRows,
  buildKnowledgeIntakeReferenceRows,
  buildKnowledgeIntakeRetirementRows,
  buildFowlerAnalysisCanonicalCoverageRows,
  buildFowlerAnalysisDuplicateRows,
  buildFowlerAnalysisIntentRows,
  buildFowlerAnalysisReferenceRows,
  buildFowlerAnalysisRetirementRows,
  buildFowlerAnalysisRows,
  buildArchitectureFitnessGapRows,
  buildRepositoryCommandRows,
  buildSummaryRows,
  databaseUrl,
  formatQueryError,
  parseArgs,
  parseCerSchemaVersion,
  resolveQueryHelpRequest,
  renderAiProjectContextMarkdown,
  printHashDriftSummary,
  readAiProjectContext,
  readDocsDispositionRows,
  readComponentEngineeringComponentDriftRows,
  readComponentEngineeringComponentMetadataRows,
  readComponentEngineeringComponentTreeRows,
  readComponentEngineeringQualityRows,
  readComponentProfileRows,
  readArchitectureComponentRows,
  readArchitectureContractRows,
  readArchitectureDependencyClassificationRows,
  readArchitectureDependencyObservationRows,
  readArchitectureDesignRows,
  readArchitectureDesignScopeRows,
  readArchitectureDriftRows,
  readArchitectureEnforcementRows,
  readArchitectureEvidenceRows,
  readArchitectureFitnessGapRows,
  readArchitectureFitnessRows,
  readArchitectureFlowRows,
  readArchitectureFlowStepRows,
  readArchitectureIoRows,
  readArchitectureMaturityRows,
  readArchitectureObservabilityRows,
  readArchitecturePathMappingRows,
  readArchitectureRelationRows,
  readArchitectureResponsibilityRows,
  readArchitectureTestRows,
  readCodeSymbolDuplicateRows,
  readCodeSymbolRows,
  readComponentIntegrityRows,
  readGovernanceProblemRows,
  readRailVocabularyRows,
  readSourceDriftRows,
  readGovernanceComponentRows,
  readGovernanceCoverageRows,
  readGovernanceDriftRows,
  readGovernanceFileRows,
  readGovernanceUnitRows,
  readGovernanceRemediationRows,
  readGovernanceRefreshRunRows,
  readRiskDebtRows,
  readKnowledgeActionRows,
  readKnowledgeDocumentRows,
  readFowlerAnalysisCanonicalCoverageRows,
  readFowlerAnalysisDuplicateRows,
  readFowlerAnalysisIntentRows,
  readFowlerAnalysisReferenceRows,
  readFowlerAnalysisRetirementRows,
  readFowlerAnalysisRows,
  readDocumentationLifecycleRows,
  readDocumentationPanelRows,
  readComponentRoadmapRows,
  readCanvasCqRailDriftRows,
  readCanvasComponentRegistryDriftRows,
  readCanvasUxdbSpecificationRows,
  readKnowledgeIntakeReferenceRows,
  readKnowledgeIntakeRetirementRows,
  readMandatoryProposalGapRows,
  readPrReadinessRows,
  readCommandQueryRailRows,
  readCreationIntentRows,
  readFeatureMechanizationComponentRows,
  readFeatureMechanizationFeatureRows,
  readFeatureMechanizationRailRows,
  readFeatureMechanizationSymbolRows,
  readFeatureMechanizationValidationRows,
  readFrontendComponentFileRows,
  readFrontendComponentRailRows,
  readFrontendComponentRows,
  readFrontendMechanicalTruthRows,
  readDbSurfaceRows,
  readDbtProjectRoundtripCapabilityStatusRows,
  readRepositoryCommandRows,
  readComponentEngineeringRuleCatalogRows,
  readComponentEngineeringRuleEvaluationRows,
  printSummary,
  printJsonRows,
  printTaskRows,
  readComponentEngineeringRecordRows,
  readHashDriftSummary,
  readSummary,
  resolveQueryName,
  runQuery,
  usesGovernanceProjection,
};
