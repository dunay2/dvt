const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildComponentProfileRows,
  readGovernanceFileRows,
  readComponentProfileRows,
  readComponentEngineeringComponentTreeRows,
} = require('../planning-db-query.cjs');

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

test('readGovernanceFileRows filters current Git files after resolving DB ownership', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      if (sql.includes('architecture.component_source_responsibility')) return { rows: [] };
      captured.sql = sql;
      captured.params = params;
      return {
        rows: [
          {
            id: 'SYS-DOCS-GOVERNANCE',
            parent: null,
            level: 'component',
            status: 'drift',
            owns: ['docs/**'],
            excludes: [],
            responsibilities: [],
          },
        ],
      };
    },
  };

  const rows = await readGovernanceFileRows(
    client,
    {
      component: 'SYS-DOCS-GOVERNANCE',
      governanceState: 'drift',
      path: 'docs/planning/status/example.md',
      limit: 5,
    },
    {
      gitReader: {
        resolveComparison() {},
        readCurrentFiles: () => ['docs/planning/status/example.md', 'docs/second.md', 'unowned.ts'],
      },
    }
  );

  assert.deepEqual(
    rows.map((row) => [row.path, row.component_unit, row.governance_state]),
    [['docs/planning/status/example.md', 'SYS-DOCS-GOVERNANCE', 'drift']]
  );
  assert.match(captured.sql, /governance_component_definition_query/);
  assert.doesNotMatch(captured.sql, /system-governance-file-index\.files\.yaml/);
  assert.doesNotMatch(captured.sql, /file_ownership_projection|governance_files/);
});

test('component tree rejects absent effective authority instead of trusting imported hierarchy', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      return { rows: [] };
    },
  };
  await assert.rejects(
    readComponentEngineeringComponentTreeRows(
      client,
      {},
      {
        gitReader: { resolveComparison() {}, readCurrentFiles: () => [] },
      }
    ),
    /Planning DB returned no unit authority/
  );
  assert.equal(calls.length, 1);
  assert.match(calls[0], /governance_component_definition_query/);
});

test('readComponentProfileRows uses current descendant files and counts before paging', async () => {
  const capturedSql = [];
  const client = {
    async query(sql, params) {
      capturedSql.push(sql);
      if (sql.includes('governance_component_definition_query'))
        return {
          rows: [
            {
              id: 'SYS-RUNTIME-ENGINE-CORE',
              parent: null,
              level: 'component',
              status: 'review',
              owns: [],
              excludes: [],
            },
            {
              id: 'SYS-RUNTIME-ENGINE-APPLICATION',
              parent: 'SYS-RUNTIME-ENGINE-CORE',
              level: 'component',
              status: 'review',
              owns: ['src/**'],
              excludes: [],
            },
          ],
        };
      if (sql.includes('component_tree_query'))
        return {
          rows: [
            {
              component_id: sql.includes('parent_component_id =')
                ? 'SYS-RUNTIME-ENGINE-APPLICATION'
                : params[0],
              direct_file_count: 999,
              descendant_file_count: 999,
            },
          ],
        };
      return { rows: [] };
    },
  };

  const profile = await readComponentProfileRows(
    client,
    {
      component: 'SYS-RUNTIME-ENGINE-CORE',
      limit: 1,
    },
    { gitReader: { resolveComparison() {}, readCurrentFiles: () => ['src/a.ts', 'src/b.ts'] } }
  );

  assert.deepEqual(
    profile.files.map((file) => file.path),
    ['src/a.ts']
  );
  assert.equal(profile.component.direct_file_count, 0);
  assert.equal(profile.component.descendant_file_count, 2);
  assert.equal(profile.children[0].direct_file_count, 2);
  assert.equal(profile.children[0].descendant_file_count, 2);
  assert.match(capturedSql.join('\n'), /governance_component_definition_query/);
  assert.doesNotMatch(capturedSql.join('\n'), /file_ownership_query|file_ownership_projection/);
  assert.match(capturedSql.join('\n'), /from architecture\.component_test/);
  assert.match(capturedSql.join('\n'), /from architecture\.component_observability/);
});

test('readComponentProfileRows exposes ambiguous ownership consistently in files and counts', async () => {
  const client = {
    async query(sql) {
      if (sql.includes('governance_component_definition_query'))
        return {
          rows: ['SYS-A', 'SYS-B'].map((id) => ({
            id,
            parent: null,
            level: 'component',
            status: 'review',
            owns: ['*.ts'],
            excludes: [],
            root_unit: `ROOT-${id.slice(-1)}`,
          })),
        };
      if (sql.includes('component_tree_query') && !sql.includes('parent_component_id =')) {
        return {
          rows: [{ component_id: 'SYS-A', direct_file_count: 99, descendant_file_count: 99 }],
        };
      }
      return { rows: [] };
    },
  };
  const options = { gitReader: { resolveComparison() {}, readCurrentFiles: () => ['model.ts'] } };
  const profile = await readComponentProfileRows(client, { component: 'SYS-A' }, options);
  assert.deepEqual(
    profile.files.map((file) => file.governance_state),
    ['ambiguous']
  );
  assert.equal(profile.component.direct_file_count, 0);
  assert.equal(profile.component.descendant_file_count, 1);
  assert.equal(profile.component.ambiguous_file_count, 1);
  const files = await readGovernanceFileRows(client, { component: 'SYS-A' }, options);
  assert.deepEqual(
    files.map((file) => file.path),
    ['model.ts']
  );
  const crossOwner = await readGovernanceFileRows(
    client,
    { component: 'SYS-A', rootUnit: 'ROOT-B' },
    options
  );
  assert.deepEqual(crossOwner, []);
});

test('readComponentProfileRows retains frontend identity and filters deleted files before paging', async () => {
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
            { component_id: 'web.component.canvas.SourceImportDialog', file_path: 'retired.tsx' },
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

  const profile = await readComponentProfileRows(
    client,
    {
      component: 'web.component.canvas.SourceImportDialog',
      limit: 1,
    },
    {
      gitReader: {
        resolveComparison() {},
        readCurrentFiles: () => ['apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx'],
      },
    }
  );

  assert.equal(profile.component.component_id, 'web.component.canvas.SourceImportDialog');
  assert.equal(profile.component.parent_component_id, 'tools/planning-db/schema.sql');
  assert.equal(
    profile.files[0].path,
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx'
  );
  assert.equal(profile.component.cq_rails, 'OpenCanvasSourceImportDialog');
  assert.equal(profile.files.length, 1);
  assert.equal(profile.component.direct_file_count, 1);
  assert.match(
    capturedSql.join('\n'),
    /from planning_query_store\.frontend_component_summary_query/
  );
  assert.doesNotMatch(capturedSql.join('\n'), /component_tree_query/);
  assert.doesNotMatch(capturedSql.join('\n'), /component_metadata_query/);
});
