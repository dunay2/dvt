const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  buildDocsDispositionRows,
  buildComponentEngineeringRecordRows,
  buildFeatureWorkRows,
  buildFocusRows,
  buildRealWorkRows,
  buildComponentEngineeringComponentDriftRows,
  buildComponentEngineeringComponentMetadataRows,
  buildArchitectureComponentRows,
  buildArchitectureDesignRows,
  buildArchitectureRelationRows,
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
  buildTaskGapRows,
  buildPrReadinessRows,
  buildCommandQueryRailRows,
  buildCreationIntentRows,
  buildFrontendComponentFileRows,
  buildFrontendComponentRailRows,
  buildFrontendComponentRows,
  buildFrontendMechanicalTruthRows,
  buildKnowledgeIntakeReferenceRows,
  buildKnowledgeIntakeRetirementRows,
  buildDbSurfaceRows,
  buildSummaryRows,
  buildTaskRows,
  buildTaskTraceRows,
  buildTaskReferenceRows,
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
  readPlanningArtifactRows,
  readPlanningDependencyRows,
  readPlanningEvidenceRows,
  readPlanningStatusEventRows,
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
  readDbSurfaceRows,
  readDocsDispositionRows,
  readFeatureWorkRows,
  readComponentEngineeringComponentDriftRows,
  readComponentEngineeringComponentMetadataRows,
  readArchitectureComponentRows,
  readArchitectureDesignRows,
  readArchitectureRelationRows,
  readComponentEngineeringComponentTreeRows,
  readComponentEngineeringQualityRows,
  readComponentEngineeringRecordRows,
  readComponentEngineeringRuleCatalogRows,
  readComponentEngineeringRuleEvaluationRows,
  readFocusRows,
  readRealWorkRows,
  readTaskGapRows,
  readRepositoryCommandRows,
  readTaskTraceRows,
  readTaskReferenceRows,
  readNextTaskRows,
  readHashDriftSummary,
  readOpenTaskRows,
  readSummary,
  readTaskRows,
  formatQueryError,
  renderAiProjectContextMarkdown,
  resolveQueryName,
  runQuery,
} = require('./planning-db-query.cjs');

function runPlanningDbQueryCli(args) {
  return spawnSync(process.execPath, [path.join(__dirname, 'planning-db-query.cjs'), ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
}

test('planning DB query CLI prints root help without opening a DB connection', () => {
  const result = runPlanningDbQueryCli(['--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB query CLI/);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /component-metadata/);
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

test('command/query rail query behavior lives in a focused read-model component', () => {
  const commandQueryRailQueryComponent = require('./planning-db/command-query-rail-query.cjs');

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
  const knowledgeIntakeRetirementComponent = require('./planning-db/knowledge-intake-retirement-query.cjs');

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

test('resolveQueryName defaults to summary and rejects unknown query names', () => {
  assert.equal(resolveQueryName(undefined), 'summary');
  assert.equal(resolveQueryName('summary'), 'summary');
  assert.equal(resolveQueryName('hash-drift'), 'hash-drift');
  assert.equal(resolveQueryName('tasks'), 'tasks');
  assert.equal(resolveQueryName('open'), 'open');
  assert.equal(resolveQueryName('next'), 'next');
  assert.equal(resolveQueryName('dependencies'), 'dependencies');
  assert.equal(resolveQueryName('evidence'), 'evidence');
  assert.equal(resolveQueryName('status-events'), 'status-events');
  assert.equal(resolveQueryName('artifacts'), 'artifacts');
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
  assert.equal(resolveQueryName('pr-readiness'), 'pr-readiness');
  assert.equal(resolveQueryName('docs-disposition'), 'docs-disposition');
  assert.equal(resolveQueryName('feature-work'), 'feature-work');
  assert.equal(resolveQueryName('task-references'), 'task-references');
  assert.equal(resolveQueryName('task-trace'), 'task-trace');
  assert.equal(resolveQueryName('task-gaps'), 'task-gaps');
  assert.equal(resolveQueryName('focus'), 'focus');
  assert.equal(resolveQueryName('real-work'), 'real-work');
  assert.equal(resolveQueryName('cer'), 'cer');
  assert.equal(resolveQueryName('knowledge-documents'), 'knowledge-documents');
  assert.equal(resolveQueryName('knowledge-actions'), 'knowledge-actions');
  assert.equal(resolveQueryName('mandatory-proposal-gaps'), 'mandatory-proposal-gaps');
  assert.equal(resolveQueryName('db-surfaces'), 'db-surfaces');
  assert.equal(resolveQueryName('component-tree'), 'component-tree');
  assert.equal(resolveQueryName('component-metadata'), 'component-metadata');
  assert.equal(resolveQueryName('component-drift'), 'component-drift');
  assert.equal(resolveQueryName('component-rules'), 'component-rules');
  assert.equal(resolveQueryName('component-rule-evaluations'), 'component-rule-evaluations');
  assert.equal(resolveQueryName('component-quality'), 'component-quality');
  assert.equal(resolveQueryName('architecture-designs'), 'architecture-designs');
  assert.equal(resolveQueryName('architecture-components'), 'architecture-components');
  assert.equal(resolveQueryName('architecture-relations'), 'architecture-relations');
  assert.equal(resolveQueryName('architecture-flows'), 'architecture-flows');
  assert.equal(resolveQueryName('architecture-drift'), 'architecture-drift');
  assert.equal(resolveQueryName('architecture-enforcement'), 'architecture-enforcement');
  assert.equal(resolveQueryName('architecture-evidence'), 'architecture-evidence');
  assert.throws(() => resolveQueryName('unknown'), /Unknown planning DB query "unknown"/);
});

test('parseArgs parses DB surface inventory query filters', () => {
  const command = parseArgs([
    'db-surfaces',
    '--surface',
    'Architecture design authority',
    '--state',
    'DB-first',
    '--kind',
    'db_command',
    '--limit',
    '5',
  ]);

  assert.equal(command.queryName, 'db-surfaces');
  assert.equal(command.filters.surface, 'Architecture design authority');
  assert.equal(command.filters.state, 'DB-first');
  assert.equal(command.filters.kind, 'db_command');
  assert.equal(command.filters.limit, 5);
});

test('parseArgs parses task query filters for daily DB-first planning work', () => {
  const command = parseArgs([
    'tasks',
    '--lane',
    'C',
    '--status',
    'review',
    '--claimed-by',
    'codex',
    '--limit',
    '10',
  ]);

  assert.deepEqual(command, {
    queryName: 'tasks',
    filters: {
      laneId: 'C',
      status: 'review',
      claimedBy: 'codex',
      limit: 10,
    },
  });
});

test('parseArgs accepts common --filter for task id planning queries', () => {
  assert.deepEqual(parseArgs(['tasks', '--filter', 'E-PROP-DISP-1', '--limit', '10']), {
    queryName: 'tasks',
    filters: {
      taskId: 'E-PROP-DISP-1',
      limit: 10,
    },
  });
});

test('parseArgs rejects common --filter for queries without matching predicates', () => {
  for (const queryName of ['feature-work', 'task-references', 'pr-readiness']) {
    assert.throws(
      () => parseArgs([queryName, '--filter', 'E-PROP-DISP-1']),
      new RegExp(`--filter is not supported for planning DB query "${queryName}"`)
    );
  }
});

test('parseArgs parses governance query filters for DB-first governance inspection', () => {
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

test('parseArgs parses governance unit tree filters for DB-first parent navigation', () => {
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

test('parseArgs parses repository command query filters for DB-first catalog inspection', () => {
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

test('parseArgs parses command/query rail catalog filters for DB-first gap and duplicate inspection', () => {
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

test('parseArgs parses frontend mechanical truth filters for DB-first screen inspection', () => {
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

test('parseArgs parses frontend component reflection filters for DB-first component inspection', () => {
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
      'PreviewExecutablePlan',
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
        rail: 'PreviewExecutablePlan',
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

test('buildDbSurfaceRows shows DB authority and migration state for operators', () => {
  assert.deepEqual(
    buildDbSurfaceRows([
      {
        surface_name: 'Architecture design authority',
        migration_state: 'DB-first',
        write_rail_kind: 'db_command',
        read_query_rail: 'pnpm planning:db:query architecture-designs',
        source_ref: 'tools/planning-db/migrations/059_db_surface_inventory.sql',
        db_first_eligible: true,
        revision: 0,
        updated_by: 'migration',
      },
    ]),
    [
      [
        'Architecture design authority',
        'DB-first',
        'db_command',
        'true',
        '0',
        'migration',
        'tools/planning-db/migrations/059_db_surface_inventory.sql',
      ],
    ]
  );
});

test('parseArgs parses docs disposition queue filters for DB-first cleanup work', () => {
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

test('parseArgs normalizes open resolution filters to pending', () => {
  assert.deepEqual(parseArgs(['docs-disposition', '--resolution', 'open']), {
    queryName: 'docs-disposition',
    filters: {
      resolution: 'pending',
    },
  });

  assert.deepEqual(parseArgs(['task-gaps', '--resolution', 'open']), {
    queryName: 'task-gaps',
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

test('parseArgs parses task provenance query filters for DB-first task triage', () => {
  assert.deepEqual(parseArgs(['task-trace', 'F-28-C', '--limit', '20']), {
    queryName: 'task-trace',
    filters: {
      taskId: 'F-28-C',
      limit: 20,
    },
  });

  assert.deepEqual(parseArgs(['task-trace', '--filter', 'F-28-C', '--limit', '20']), {
    queryName: 'task-trace',
    filters: {
      taskId: 'F-28-C',
      limit: 20,
    },
  });

  assert.deepEqual(parseArgs(['task-gaps', '--kind', 'active_review_without_task_link']), {
    queryName: 'task-gaps',
    filters: {
      kind: 'active_review_without_task_link',
    },
  });

  assert.deepEqual(parseArgs(['task-gaps', '--resolution', 'resolved', '--limit', '10']), {
    queryName: 'task-gaps',
    filters: {
      resolution: 'resolved',
      limit: 10,
    },
  });
});

test('parseArgs parses work intake focus filters for DB-first work selection', () => {
  const command = parseArgs([
    'focus',
    '--kind',
    'task_gap',
    '--lane',
    'C',
    '--priority',
    'P1',
    '--task',
    'F-28-C',
    '--path',
    'docs/planning/reviews/example.md',
    '--limit',
    '10',
  ]);

  assert.deepEqual(command, {
    queryName: 'focus',
    filters: {
      kind: 'task_gap',
      laneId: 'C',
      priority: 'P1',
      taskId: 'F-28-C',
      path: 'docs/planning/reviews/example.md',
      limit: 10,
    },
  });
});

test('parseArgs parses real work filters for DB-first backlog triage', () => {
  const command = parseArgs([
    'real-work',
    '--kind',
    'knowledge_action',
    '--lane',
    'D',
    '--priority',
    'P1',
    '--status',
    'unlinked_required_action',
    '--task',
    'D-KNOWLEDGE-ACTION-LINKAGE-1',
    '--path',
    'docs/planning/proposals/example.md',
    '--limit',
    '10',
  ]);

  assert.deepEqual(command, {
    queryName: 'real-work',
    filters: {
      kind: 'knowledge_action',
      laneId: 'D',
      priority: 'P1',
      status: 'unlinked_required_action',
      taskId: 'D-KNOWLEDGE-ACTION-LINKAGE-1',
      path: 'docs/planning/proposals/example.md',
      limit: 10,
    },
  });
});

test('parseArgs parses risk debt query filters for DB-first debt work selection', () => {
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

test('parseArgs parses component engineering record filters for DB-first governance inspection', () => {
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
    () => parseArgs(['tasks', '--refresh', '--confirm-expensive-governance-refresh']),
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
});

test('runQuery does not refresh governance projections by default for DB-first reads', async () => {
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
      throw new Error('DB-first query must not import governance by default');
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
    includePlanning: false,
    includeGovernance: true,
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

test('runQuery does not refresh governance projections for planning-only reads', async () => {
  const client = {
    async query() {
      return {
        rows: [
          {
            lane_id: 'A',
            task_id: 'A-1',
            priority: 'P1',
            status: 'todo',
            progress_pct: 0,
            claimed_by: null,
            dependency: '',
            objective: 'Planning task',
            target: 'planning',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'tasks',
    client,
    print: false,
    runPlanningImport: async () => {
      throw new Error('planning-only query must not import governance');
    },
  });

  assert.equal(rows[0][1], 'A-1');
});

test('buildSummaryRows exposes planning and governance content counts without expensive hash drift', () => {
  const rows = buildSummaryRows({
    lanes: 5,
    tasks: 250,
    reviewTasks: 9,
    governanceFiles: 4255,
    driftFiles: 41,
    legacyFiles: 0,
    governanceComponents: 32,
    governanceComponentFiles: 4255,
    governanceFingerprints: 4255,
    governanceCoverageRows: 128,
    governanceRemediationTasks: 43,
    governanceRemediationP0: 3,
    planningLocalTaskOverlays: 2,
    planningLocalOperations: 5,
    planningTaskDependencies: 40,
    planningTaskEvidenceRefs: 30,
    planningTaskStatusEvents: 250,
    planningArtifacts: 2,
    planningRealWorkItems: 11,
    planningRealWorkOpenItems: 27,
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
    ['planning.source_authority', 'database'],
    ['planning.lanes', 5],
    ['planning.tasks', 250],
    ['planning.tasks.review', 9],
    ['planning.task_dependencies', 40],
    ['planning.task_evidence_refs', 30],
    ['planning.task_status_events', 250],
    ['planning.artifacts', 2],
    ['planning.real_work_items', 11],
    ['planning.real_work_open_items', 27],
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
    ['planning.local_task_overlays', 2],
    ['planning.local_operations', 5],
  ]);
});

test('buildHashDriftRows exposes hash drift as an explicit heavy query result', () => {
  assert.deepEqual(buildHashDriftRows({ governanceHashDrift: 3 }), [['governance.hash_drift', 3]]);
});

test('buildAiProjectContext aggregates DB-first project state for agent discovery', () => {
  const context = buildAiProjectContext(
    {
      summary: {
        sourceAuthority: 'database',
        tasks: 250,
        reviewTasks: 9,
        repositoryCommands: 220,
        planningRealWorkItems: 11,
        planningRealWorkOpenItems: 27,
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
      realWork: [
        {
          priority: 'P1',
          work_kind: 'task',
          work_status: 'open',
          work_id: 'E-100',
          title: 'Finish DB-first route',
          suggested_query: 'pnpm planning:db:query task-trace E-100',
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
    planningTasks: 250,
    reviewTasks: 9,
    repositoryCommands: 220,
    realWorkItems: 11,
    realWorkOpenItems: 27,
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

test('renderAiProjectContextMarkdown fills a reusable DB-first context template', () => {
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
          source_path: 'docs/planning/example.md',
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
  assert.match(markdown, /R-20260602-EXAMPLE/);
  assert.match(markdown, /pnpm planning:db:query command-query-rails --gaps true/);
});

test('readSummary counts review tasks from the effective task view without hash drift', async () => {
  let capturedSql = '';
  const client = {
    async query(sql) {
      capturedSql = sql;
      return {
        rows: [
          {
            lanes: 5,
            tasks: 250,
            reviewTasks: 9,
            governanceFiles: 4255,
            driftFiles: 41,
            legacyFiles: 0,
            governanceComponents: 32,
            governanceComponentFiles: 4255,
            governanceFingerprints: 4255,
            governanceCoverageRows: 128,
            governanceRemediationTasks: 43,
            governanceRemediationP0: 3,
            planningLocalTaskOverlays: 2,
            planningLocalOperations: 5,
            planningTaskDependencies: 40,
            planningTaskEvidenceRefs: 30,
            planningTaskStatusEvents: 250,
            planningArtifacts: 2,
            planningRealWorkItems: 11,
            planningRealWorkOpenItems: 27,
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
  assert.match(capturedSql, /planning_effective_tasks where status = 'review'/);
  assert.match(capturedSql, /planning_task_dependencies/);
  assert.match(capturedSql, /planning_task_evidence_refs/);
  assert.match(capturedSql, /planning_task_status_events/);
  assert.match(capturedSql, /planning_artifacts/);
  assert.match(capturedSql, /planning_real_work_query/);
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
              tasks: 250,
              reviewTasks: 9,
              repositoryCommands: 220,
              planningRealWorkItems: 11,
              planningRealWorkOpenItems: 27,
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
      if (sql.includes('planning_real_work_query')) {
        return { rows: [] };
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
  assert.match(
    capturedSql.map((entry) => entry.sql).join('\n'),
    /from planning_query_store\.planning_real_work_query/
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

test('buildTaskRows formats effective task rows with claim and progress context', () => {
  const rows = buildTaskRows([
    {
      lane_id: 'C',
      task_id: 'AR-C10',
      priority: 'P0',
      status: 'review',
      progress_pct: '80.00',
      claimed_by: 'codex',
      objective: 'Move existing task operations to DB overlays.',
    },
  ]);

  assert.deepEqual(rows, [
    [
      'C',
      'AR-C10',
      'P0',
      'review',
      '80%',
      'codex',
      'Move existing task operations to DB overlays.',
    ],
  ]);
});

test('readTaskRows queries the effective task view with stable filters', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readTaskRows(client, {
    laneId: 'C',
    status: 'review',
    claimedBy: 'codex',
    taskId: 'AR-C10',
    limit: 10,
  });

  assert.match(captured.sql, /from planning_query_store\.planning_effective_tasks/);
  assert.match(captured.sql, /lane_id = \$1/);
  assert.match(captured.sql, /status = \$2/);
  assert.match(captured.sql, /claimed_by = \$3/);
  assert.match(captured.sql, /task_id = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, ['C', 'review', 'codex', 'AR-C10', 10]);
});

test('readOpenTaskRows queries the DB open-task view without duplicating status logic', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readOpenTaskRows(client, {
    laneId: 'C',
    priority: 'P1',
    limit: 10,
  });

  assert.match(captured.sql, /from planning_query_store\.planning_open_tasks/);
  assert.doesNotMatch(captured.sql, /status not in/i);
  assert.match(captured.sql, /lane_id = \$1/);
  assert.match(captured.sql, /priority = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['C', 'P1', 10]);
});

test('readNextTaskRows labels DB next-task rows and claim-recovery rows', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return {
        rows: [
          {
            lane_id: 'C',
            task_id: 'READY-C',
            priority: 'P1',
            status: 'queued',
            progress_pct: 0,
            claimed_by: null,
            dependency: 'DONE-A',
            objective: 'Ready task.',
            target: 'Start now.',
            route_source: 'next',
          },
          {
            lane_id: 'E',
            task_id: 'RECOVER-E',
            priority: 'P1',
            status: 'in_progress',
            progress_pct: 15,
            claimed_by: null,
            dependency: 'DONE-B',
            objective: 'Recover stale claim.',
            target: 'Continue now.',
            route_source: 'claim_recovery',
          },
        ],
      };
    },
  };

  const rows = await readNextTaskRows(client, { laneId: 'C', limit: 5 });

  assert.match(captured.sql, /from planning_query_store\.planning_next_tasks/);
  assert.match(captured.sql, /from planning_query_store\.planning_claim_recovery_tasks/);
  assert.doesNotMatch(captured.sql, /from planning_query_store\.planning_effective_tasks/);
  assert.doesNotMatch(captured.sql, /regexp_split_to_table/);
  assert.match(captured.sql, /lane_id = \$1/);
  assert.match(captured.sql, /limit \$2/);
  assert.deepEqual(captured.params, ['C', 5]);
  assert.deepEqual(
    rows.map((row) => `${row[0]}:${row[1]}/${row[2]}`),
    ['next:C/READY-C', 'claim_recovery:E/RECOVER-E']
  );
});

test('planning relation queries read normalized DB views', async () => {
  const captured = [];
  const client = {
    async query(sql, params) {
      captured.push({ sql, params });
      return { rows: [] };
    },
  };

  await readPlanningDependencyRows(client, { laneId: 'E', limit: 3 });
  await readPlanningEvidenceRows(client, { laneId: 'A', limit: 4 });
  await readPlanningStatusEventRows(client, { laneId: 'C', limit: 5 });
  await readPlanningArtifactRows(client, { kind: 'workboard', limit: 6 });

  assert.match(captured[0].sql, /from planning_query_store\.planning_task_dependencies/);
  assert.match(captured[1].sql, /from planning_query_store\.planning_task_evidence_refs/);
  assert.match(captured[2].sql, /from planning_query_store\.planning_task_status_events/);
  assert.match(captured[3].sql, /from planning_query_store\.planning_artifacts/);
  assert.deepEqual(captured[0].params, ['E', 3]);
  assert.deepEqual(captured[1].params, ['A', 4]);
  assert.deepEqual(captured[2].params, ['C', 5]);
  assert.deepEqual(captured[3].params, ['workboard', 6]);
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
  assert.match(captured.sql, /is_duplicate = \$4/);
  assert.match(captured.sql, /is_gap = \$5/);
  assert.match(captured.sql, /limit \$6/);
  assert.deepEqual(captured.params, [
    'query',
    'missing-backend-rail',
    'WidgetReadModel',
    true,
    true,
    5,
  ]);
});

test('readCreationIntentRows queries existing rails from the DB-first rail catalog', async () => {
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

test('buildKnowledgeIntakeRetirementRows exposes DB-first retirement posture', () => {
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

test('readKnowledgeIntakeRetirementRows queries the DB-first intake retirement view', async () => {
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

test('buildKnowledgeIntakeReferenceRows exposes DB-first intake backrefs', () => {
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

test('readKnowledgeIntakeReferenceRows queries DB document links and ownership projections', async () => {
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

  assert.match(captured.sql, /from planning_query_store\.knowledge_document_links/);
  assert.match(captured.sql, /join planning_query_store\.knowledge_documents from_document/);
  assert.match(captured.sql, /join planning_query_store\.knowledge_documents to_document/);
  assert.match(captured.sql, /component_engineering_file_ownership_query/);
  assert.match(captured.sql, /to_document\.document_path like 'buzon\/%'/);
  assert.match(captured.sql, /to_document\.document_path = \$1/);
  assert.match(captured.sql, /ownership\.leaf_component_id = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['buzon/example.md', 'ci-governance', 5]);
});

test('readDbSurfaceRows queries the DB-first surface inventory view with real predicates', async () => {
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
    state: 'DB-first',
    kind: 'db_command',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.db_governance_surface_query/);
  assert.match(captured.sql, /surface_name = \$1/);
  assert.match(captured.sql, /migration_state = \$2/);
  assert.match(captured.sql, /write_rail_kind = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, ['Architecture design authority', 'DB-first', 'db_command', 5]);
});

test('runQuery dispatches knowledge-intake through the DB-first retirement query', async () => {
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
            migration_state: 'DB-first',
            write_rail_kind: 'db_command',
            source_ref: 'tools/planning-db/migrations/059_db_surface_inventory.sql',
            db_first_eligible: true,
            revision: 0,
            updated_by: 'migration',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'db-surfaces',
    filters: { state: 'DB-first', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'Architecture design authority',
      'DB-first',
      'db_command',
      'true',
      '0',
      'migration',
      'tools/planning-db/migrations/059_db_surface_inventory.sql',
    ],
  ]);
});

test('runQuery dispatches knowledge-intake references through the DB-first link query', async () => {
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
              rail_name: 'PreviewExecutablePlan',
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
      2,
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
    ['web.component.canvas.CanvasToolbar', 'PreviewExecutablePlan', 'command', 'implemented-api'],
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

test('readTaskReferenceRows queries the DB-owned task-like reference view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readTaskReferenceRows(client, {
    kind: 'unknown_task_like_id',
    path: 'docs/planning/status/example.md',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.doc_task_reference_query/);
  assert.match(captured.sql, /classification = \$1/);
  assert.match(captured.sql, /document_path = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['unknown_task_like_id', 'docs/planning/status/example.md', 5]);
});

test('readFeatureWorkRows queries governed feature mechanization work from DB references', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readFeatureWorkRows(client, {
    status: 'Accepted',
    prefix: 'TF',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.doc_task_reference_query reference/);
  assert.match(captured.sql, /join planning_query_store\.doc_disposition_document_query document/);
  assert.match(captured.sql, /reference\.classification = 'registered_feature_mechanization'/);
  assert.match(captured.sql, /reference\.reference_prefix = \$1/);
  assert.match(captured.sql, /document\.status = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['TF', 'Accepted', 5]);
});

test('readTaskTraceRows queries the DB-owned task provenance trace view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readTaskTraceRows(client, { taskId: 'F-28-C', kind: 'proposal', limit: 10 });

  assert.match(captured.sql, /from planning_query_store\.planning_task_trace_query/);
  assert.match(captured.sql, /task_id = \$1/);
  assert.match(captured.sql, /trace_kind = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, ['F-28-C', 'proposal', 10]);
});

test('readTaskGapRows queries the DB-owned task provenance gap view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readTaskGapRows(client, {
    kind: 'active_review_without_task_link',
    laneId: 'C',
    priority: 'P1',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.planning_task_gap_query/);
  assert.match(captured.sql, /gap_kind = \$1/);
  assert.match(captured.sql, /lane_id = \$2/);
  assert.match(captured.sql, /severity = \$3/);
  assert.match(captured.sql, /resolution_status = \$4/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, ['active_review_without_task_link', 'C', 'P1', 'pending', 5]);
});

test('readFocusRows queries the DB-owned planning work intake view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readFocusRows(client, {
    kind: 'task_gap',
    laneId: 'C',
    priority: 'P1',
    taskId: 'F-28-C',
    path: 'docs/planning/reviews/example.md',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.planning_work_intake_query/);
  assert.match(captured.sql, /intake_kind = \$1/);
  assert.match(captured.sql, /lane_id = \$2/);
  assert.match(captured.sql, /priority = \$3/);
  assert.match(captured.sql, /task_id = \$4/);
  assert.match(captured.sql, /document_path = \$5/);
  assert.match(captured.sql, /order by\s+rank_score,\s+intake_kind,\s+item_id/s);
  assert.match(captured.sql, /limit \$6/);
  assert.deepEqual(captured.params, [
    'task_gap',
    'C',
    'P1',
    'F-28-C',
    'docs/planning/reviews/example.md',
    5,
  ]);
});

test('readRealWorkRows queries the DB-owned aggregated real work view', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readRealWorkRows(client, {
    kind: 'knowledge_action',
    laneId: 'D',
    priority: 'P1',
    status: 'unlinked_required_action',
    taskId: 'D-KNOWLEDGE-ACTION-LINKAGE-1',
    path: 'docs/planning/proposals/example.md',
    limit: 5,
  });

  assert.match(captured.sql, /from planning_query_store\.planning_real_work_query/);
  assert.match(captured.sql, /work_kind = \$1/);
  assert.match(captured.sql, /lane_id = \$2/);
  assert.match(captured.sql, /priority = \$3/);
  assert.match(captured.sql, /work_status = \$4/);
  assert.match(captured.sql, /task_id = \$5/);
  assert.match(captured.sql, /source_path = \$6/);
  assert.match(captured.sql, /order by\s+rank_score,\s+priority,\s+work_kind,\s+work_id/s);
  assert.match(captured.sql, /limit \$7/);
  assert.deepEqual(captured.params, [
    'knowledge_action',
    'D',
    'P1',
    'unlinked_required_action',
    'D-KNOWLEDGE-ACTION-LINKAGE-1',
    'docs/planning/proposals/example.md',
    5,
  ]);
});

test('real work row builders collapse work sources into operator output', () => {
  assert.deepEqual(
    buildRealWorkRows([
      {
        priority: 'P1',
        work_kind: 'knowledge_action',
        work_status: 'unlinked_required_action',
        work_id: 'knowledge_action:docs/example.md',
        lane_id: null,
        task_id: null,
        source_path: 'docs/example.md',
        open_item_count: 7,
        linked_task_count: 0,
        missing_dependency_count: 0,
        title: '7 unresolved knowledge_action items: Extract task lineage',
        suggested_query:
          "pnpm planning:db:query knowledge-actions --path 'docs/example.md' --limit 30",
      },
    ]),
    [
      [
        'P1',
        'knowledge_action',
        'unlinked_required_action',
        'knowledge_action:docs/example.md',
        '-',
        'docs/example.md',
        7,
        0,
        0,
        '7 unresolved knowledge_action items: Extract task lineage',
        "pnpm planning:db:query knowledge-actions --path 'docs/example.md' --limit 30",
      ],
    ]
  );
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

  assert.deepEqual(
    buildTaskReferenceRows([
      {
        classification: 'unknown_task_like_id',
        reference_text: 'WEB-123',
        reference_prefix: 'WEB',
        document_path: 'docs/planning/status/example.md',
        occurrence_count: 2,
      },
    ]),
    [['unknown_task_like_id', 'WEB-123', 'WEB', 'docs/planning/status/example.md', 2]]
  );

  assert.deepEqual(
    buildFeatureWorkRows([
      {
        feature_id: 'TF-E2-A-IMPLEMENTATION',
        document_status: 'Accepted',
        planning_type: 'proposal',
        document_path:
          'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-a-authoring-draft-hard-cut-implementation-plan-20260503.md',
        occurrence_count: 1,
      },
    ]),
    [
      [
        'TF-E2-A-IMPLEMENTATION',
        'Accepted',
        'proposal',
        'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-a-authoring-draft-hard-cut-implementation-plan-20260503.md',
        1,
      ],
    ]
  );
});

test('task provenance row builders format task trace and gap queues for operator output', () => {
  assert.deepEqual(
    buildTaskTraceRows([
      {
        lane_id: 'E',
        task_id: 'F-28-C',
        trace_kind: 'proposal',
        trace_ref: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
        trace_status: 'Review',
        trace_detail: 'Stage 3 proposal',
      },
    ]),
    [
      [
        'E',
        'F-28-C',
        'proposal',
        'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
        'Review',
        'Stage 3 proposal',
      ],
    ]
  );

  assert.deepEqual(
    buildTaskGapRows([
      {
        gap_kind: 'done_or_review_without_evidence',
        severity: 'P1',
        task_id: 'AR-A12',
        document_path: null,
        resolution_status: 'resolved',
        reason: 'Task is in review or done without evidence refs.',
      },
    ]),
    [
      [
        'P1',
        'done_or_review_without_evidence',
        'AR-A12',
        '-',
        'resolved',
        'Task is in review or done without evidence refs.',
      ],
    ]
  );
});

test('buildFocusRows formats ranked work intake rows for operator output', () => {
  assert.deepEqual(
    buildFocusRows([
      {
        rank_score: 10,
        priority: 'P1',
        intake_kind: 'task_gap',
        item_id: 'task_gap:F-28-C',
        lane_id: 'C',
        task_id: 'F-28-C',
        document_path: null,
        title: 'done_or_review_without_evidence',
        reason: 'Task is in review or done without evidence refs.',
        suggested_query: 'pnpm planning:db:query task-trace --task F-28-C --limit 30',
      },
    ]),
    [
      [
        10,
        'P1',
        'task_gap',
        'task_gap:F-28-C',
        'C/F-28-C',
        '-',
        'done_or_review_without_evidence',
        'Task is in review or done without evidence refs.',
        'pnpm planning:db:query task-trace --task F-28-C --limit 30',
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
        work_item_id: 'DB-FIRST',
        status: 'review',
        owner: 'Architecture',
        rail_ref: 'CreateArchitectureDesign',
        fowler_signal: 'Hidden authority',
      },
    ]),
    [
      [
        'ENGINE-ARCHITECTURE-AUTHORITY-PILOT',
        'DB-FIRST',
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
