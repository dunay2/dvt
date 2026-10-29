const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRiskDebtRows,
  buildAiProjectContext,
  buildPrReadinessRows,
  buildSummaryRows,
  parseArgs,
  readRiskDebtRows,
  readPrReadinessRows,
  readAiProjectContext,
  readSummary,
  renderAiProjectContextMarkdown,
} = require('../planning-db-query.cjs');

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
