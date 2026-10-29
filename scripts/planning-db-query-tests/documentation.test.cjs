const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDocsDispositionRows,
  buildDocumentationPanelRows,
  buildDocumentationLifecycleRows,
  parseArgs,
  readDocumentationPanelRows,
  readDocumentationLifecycleRows,
  readDocsDispositionRows,
  runQuery,
} = require('../planning-db-query.cjs');

test('documentation panel query behavior lives in a focused read-model component', () => {
  const documentationPanelComponent = require('../planning-db/queries/documentation-panel-query.cjs');

  assert.equal(
    documentationPanelComponent.buildDocumentationPanelRows,
    buildDocumentationPanelRows
  );
  assert.equal(documentationPanelComponent.readDocumentationPanelRows, readDocumentationPanelRows);
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
      {
        lifecycle_gap_kind: 'none',
        lifecycle_state: 'superseded',
        canonicality: 'canonical',
        document_path: 'docs/architecture/components/web/route-workbench-frame-component.md',
        title: 'Consolidated component guide',
        canonical_target_path: 'docs/architecture/components/web/style-guide.md',
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
        '-',
      ],
      [
        'none',
        'superseded',
        'canonical',
        0,
        0,
        0,
        0,
        0,
        'docs/architecture/components/web/route-workbench-frame-component.md',
        '-',
        'Consolidated component guide',
        'docs/architecture/components/web/style-guide.md',
      ],
    ]
  );
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
      '-',
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
