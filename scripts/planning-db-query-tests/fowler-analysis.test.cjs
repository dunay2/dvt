const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFowlerAnalysisCanonicalCoverageRows,
  buildFowlerAnalysisDuplicateRows,
  buildFowlerAnalysisIntentRows,
  buildFowlerAnalysisReferenceRows,
  buildFowlerAnalysisRetirementRows,
  buildFowlerAnalysisRows,
  parseArgs,
  readFowlerAnalysisCanonicalCoverageRows,
  readFowlerAnalysisDuplicateRows,
  readFowlerAnalysisIntentRows,
  readFowlerAnalysisReferenceRows,
  readFowlerAnalysisRetirementRows,
  readFowlerAnalysisRows,
  runQuery,
} = require('../planning-db-query.cjs');

test('Fowler analysis query behavior lives in a focused read-model component', () => {
  const fowlerAnalysisComponent = require('../planning-db/queries/fowler-analysis-query.cjs');

  assert.equal(fowlerAnalysisComponent.buildFowlerAnalysisRows, buildFowlerAnalysisRows);
  assert.equal(
    fowlerAnalysisComponent.buildFowlerAnalysisReferenceRows,
    buildFowlerAnalysisReferenceRows
  );
  assert.equal(
    fowlerAnalysisComponent.buildFowlerAnalysisRetirementRows,
    buildFowlerAnalysisRetirementRows
  );
  assert.equal(
    fowlerAnalysisComponent.buildFowlerAnalysisCanonicalCoverageRows,
    buildFowlerAnalysisCanonicalCoverageRows
  );
  assert.equal(
    fowlerAnalysisComponent.buildFowlerAnalysisIntentRows,
    buildFowlerAnalysisIntentRows
  );
  assert.equal(
    fowlerAnalysisComponent.buildFowlerAnalysisDuplicateRows,
    buildFowlerAnalysisDuplicateRows
  );
  assert.equal(fowlerAnalysisComponent.readFowlerAnalysisRows, readFowlerAnalysisRows);
  assert.equal(
    fowlerAnalysisComponent.readFowlerAnalysisReferenceRows,
    readFowlerAnalysisReferenceRows
  );
  assert.equal(
    fowlerAnalysisComponent.readFowlerAnalysisRetirementRows,
    readFowlerAnalysisRetirementRows
  );
  assert.equal(
    fowlerAnalysisComponent.readFowlerAnalysisCanonicalCoverageRows,
    readFowlerAnalysisCanonicalCoverageRows
  );
  assert.equal(fowlerAnalysisComponent.readFowlerAnalysisIntentRows, readFowlerAnalysisIntentRows);
  assert.equal(
    fowlerAnalysisComponent.readFowlerAnalysisDuplicateRows,
    readFowlerAnalysisDuplicateRows
  );
});

test('buildFowlerAnalysisRows shows DB-owned retirement and improvement facts', () => {
  assert.deepEqual(
    buildFowlerAnalysisRows([
      {
        work_state: 'pending_improvements',
        document_class: 'intake',
        retirement_allowed: false,
        pending_improvement_count: 3,
        open_action_count: 2,
        inbound_reference_count: 1,
        document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
        subject_key: 'example',
        title: 'Fowler Example',
      },
    ]),
    [
      [
        'pending_improvements',
        'intake',
        'false',
        3,
        2,
        1,
        'buzon/20260514-codex-fowler-example-analysis.md',
        'example',
        'Fowler Example',
      ],
    ]
  );
});

test('buildFowlerAnalysisReferenceRows shows DB-owned live reference facts', () => {
  assert.deepEqual(
    buildFowlerAnalysisReferenceRows([
      {
        document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
        reference_state: 'live',
        relation_type: 'repository_path_reference',
        reference_path: 'docs/planning/proposals/mandatory/example.md',
        canonical_target_path: 'docs/architecture/components/example.md',
        resolution_status: 'pending',
        reference_component_id: 'SYS-DOCS-GOVERNANCE',
        reference_file_role: 'proposal',
        sample_text: 'buzon/20260514-codex-fowler-example-analysis.md',
      },
    ]),
    [
      [
        'buzon/20260514-codex-fowler-example-analysis.md',
        'live',
        'repository_path_reference',
        'docs/planning/proposals/mandatory/example.md',
        'docs/architecture/components/example.md',
        'pending',
        'SYS-DOCS-GOVERNANCE',
        'proposal',
        'buzon/20260514-codex-fowler-example-analysis.md',
      ],
    ]
  );
});

test('buildFowlerAnalysisRetirementRows shows DB-owned retirement decisions', () => {
  assert.deepEqual(
    buildFowlerAnalysisRetirementRows([
      {
        retirement_state: 'blocked_by_references',
        retirement_allowed: false,
        unresolved_reference_count: 2,
        open_improvement_count: 0,
        canonical_target_path: 'docs/architecture/components/example.md',
        disposition_status: 'accepted',
        retirement_decision_status: 'not_approved',
        document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
        title: 'Fowler Example',
      },
    ]),
    [
      [
        'blocked_by_references',
        'false',
        2,
        0,
        'docs/architecture/components/example.md',
        'accepted',
        'not_approved',
        'buzon/20260514-codex-fowler-example-analysis.md',
        'Fowler Example',
      ],
    ]
  );
});

test('buildFowlerAnalysisCanonicalCoverageRows shows target coverage gaps', () => {
  assert.deepEqual(
    buildFowlerAnalysisCanonicalCoverageRows([
      {
        coverage_state: 'target_missing',
        target_path: null,
        target_status: null,
        document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
        subject_key: 'example',
        title: 'Fowler Example',
      },
    ]),
    [
      [
        'target_missing',
        '-',
        '-',
        'buzon/20260514-codex-fowler-example-analysis.md',
        'example',
        'Fowler Example',
      ],
    ]
  );
});

test('buildFowlerAnalysisIntentRows shows DB-owned intended work facts', () => {
  assert.deepEqual(
    buildFowlerAnalysisIntentRows([
      {
        intent_state: 'duplicate_open_intent',
        is_duplicate_intent: true,
        duplicate_document_count: 2,
        duplicate_open_action_count: 3,
        document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
        intent_key: 'normalize-component-catalog',
        action_status: 'open',
        summary: 'Normalize component catalog in Planning DB',
      },
    ]),
    [
      [
        'duplicate_open_intent',
        'true',
        2,
        3,
        'buzon/20260514-codex-fowler-example-analysis.md',
        'normalize-component-catalog',
        'open',
        'Normalize component catalog in Planning DB',
      ],
    ]
  );
});

test('buildFowlerAnalysisDuplicateRows shows repeated work intentions', () => {
  assert.deepEqual(
    buildFowlerAnalysisDuplicateRows([
      {
        duplicate_state: 'open_duplicate',
        duplicate_document_count: 2,
        duplicate_open_action_count: 3,
        canonical_target_path: 'docs/architecture/components/example.md',
        intent_key: 'normalize-component-catalog',
        sample_document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
        sample_summary: 'Normalize component catalog in Planning DB',
      },
    ]),
    [
      [
        'open_duplicate',
        2,
        3,
        'docs/architecture/components/example.md',
        'normalize-component-catalog',
        'buzon/20260514-codex-fowler-example-analysis.md',
        'Normalize component catalog in Planning DB',
      ],
    ]
  );
});

test('readFowlerAnalysisRows queries DB-first Fowler work facts with logical predicates', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readFowlerAnalysisRows(client, {
    state: 'ready_to_retire',
    type: 'fowler_analysis',
    path: 'buzon/example.md',
    subject: 'example',
    gaps: false,
    limit: 13,
  });

  assert.match(captured.sql, /from planning_query_store\.fowler_analysis_work_query/);
  assert.match(captured.sql, /work_state = \$1/);
  assert.match(captured.sql, /document_type = \$2/);
  assert.match(captured.sql, /document_path = \$3/);
  assert.match(captured.sql, /subject_key = \$4/);
  assert.match(captured.sql, /is_pending_improvement is false/);
  assert.match(captured.sql, /limit \$5/);
  assert.deepEqual(captured.params, [
    'ready_to_retire',
    'fowler_analysis',
    'buzon/example.md',
    'example',
    13,
  ]);
});

test('parseArgs parses Fowler analysis DB-first subquery filters', () => {
  assert.deepEqual(
    parseArgs([
      'fowler-analysis-references',
      '--state',
      'live',
      '--path',
      'buzon/example.md',
      '--target',
      'docs/architecture/components/example.md',
      '--limit',
      '7',
    ]),
    {
      queryName: 'fowler-analysis-references',
      filters: {
        state: 'live',
        path: 'buzon/example.md',
        target: 'docs/architecture/components/example.md',
        limit: 7,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'fowler-analysis-retirement',
      '--retirement-allowed',
      'true',
      '--target',
      'docs/architecture/components/example.md',
      '--limit',
      '5',
    ]),
    {
      queryName: 'fowler-analysis-retirement',
      filters: {
        retirementAllowed: true,
        target: 'docs/architecture/components/example.md',
        limit: 5,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'fowler-analysis-coverage',
      '--state',
      'target_missing',
      '--path',
      'buzon/example.md',
      '--limit',
      '3',
    ]),
    {
      queryName: 'fowler-analysis-coverage',
      filters: {
        state: 'target_missing',
        path: 'buzon/example.md',
        limit: 3,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'fowler-analysis-intent',
      '--duplicates',
      'true',
      '--state',
      'duplicate_open_intent',
      '--path',
      'buzon/example.md',
      '--target',
      'docs/architecture/components/example.md',
      '--limit',
      '4',
    ]),
    {
      queryName: 'fowler-analysis-intent',
      filters: {
        duplicates: true,
        state: 'duplicate_open_intent',
        path: 'buzon/example.md',
        target: 'docs/architecture/components/example.md',
        limit: 4,
      },
    }
  );

  assert.deepEqual(
    parseArgs([
      'fowler-analysis-duplicates',
      '--state',
      'open_duplicate',
      '--target',
      'docs/architecture/components/example.md',
      '--limit',
      '6',
    ]),
    {
      queryName: 'fowler-analysis-duplicates',
      filters: {
        state: 'open_duplicate',
        target: 'docs/architecture/components/example.md',
        limit: 6,
      },
    }
  );
});

test('readFowlerAnalysisReferenceRows queries DB-owned live references with filters', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readFowlerAnalysisReferenceRows(client, {
    state: 'live',
    path: 'buzon/example.md',
    target: 'docs/architecture/components/example.md',
    limit: 9,
  });

  assert.match(captured.sql, /from planning_query_store\.fowler_analysis_reference_query/);
  assert.match(captured.sql, /reference_state = \$1/);
  assert.match(captured.sql, /document_path = \$2/);
  assert.match(captured.sql, /canonical_target_path = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'live',
    'buzon/example.md',
    'docs/architecture/components/example.md',
    9,
  ]);
});

test('readFowlerAnalysisRetirementRows queries DB-owned retirement policy facts', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readFowlerAnalysisRetirementRows(client, {
    state: 'ready_to_retire',
    path: 'buzon/example.md',
    target: 'docs/architecture/components/example.md',
    retirementAllowed: false,
    limit: 9,
  });

  assert.match(captured.sql, /from planning_query_store\.fowler_analysis_retirement_query/);
  assert.match(captured.sql, /retirement_state = \$1/);
  assert.match(captured.sql, /document_path = \$2/);
  assert.match(captured.sql, /canonical_target_path = \$3/);
  assert.match(captured.sql, /retirement_allowed is false/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'ready_to_retire',
    'buzon/example.md',
    'docs/architecture/components/example.md',
    9,
  ]);
});

test('readFowlerAnalysisCanonicalCoverageRows queries DB-owned canonical coverage', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readFowlerAnalysisCanonicalCoverageRows(client, {
    state: 'target_missing',
    path: 'buzon/example.md',
    target: 'docs/architecture/components/example.md',
    limit: 9,
  });

  assert.match(captured.sql, /from planning_query_store\.fowler_analysis_canonical_coverage_query/);
  assert.match(captured.sql, /coverage_state = \$1/);
  assert.match(captured.sql, /document_path = \$2/);
  assert.match(captured.sql, /target_path = \$3/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'target_missing',
    'buzon/example.md',
    'docs/architecture/components/example.md',
    9,
  ]);
});

test('readFowlerAnalysisIntentRows queries DB-owned intended work with duplicate filters', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readFowlerAnalysisIntentRows(client, {
    state: 'duplicate_open_intent',
    path: 'buzon/example.md',
    target: 'docs/architecture/components/example.md',
    duplicates: true,
    limit: 9,
  });

  assert.match(captured.sql, /from planning_query_store\.fowler_analysis_intended_work_query/);
  assert.match(captured.sql, /intent_state = \$1/);
  assert.match(captured.sql, /document_path = \$2/);
  assert.match(captured.sql, /canonical_target_path = \$3/);
  assert.match(captured.sql, /is_duplicate_intent is true/);
  assert.match(captured.sql, /limit \$4/);
  assert.deepEqual(captured.params, [
    'duplicate_open_intent',
    'buzon/example.md',
    'docs/architecture/components/example.md',
    9,
  ]);
});

test('readFowlerAnalysisDuplicateRows queries repeated intentions with logical predicates', async () => {
  const captured = { sql: '', params: null };
  const client = {
    async query(sql, params) {
      captured.sql = sql;
      captured.params = params;
      return { rows: [] };
    },
  };

  await readFowlerAnalysisDuplicateRows(client, {
    state: 'open_duplicate',
    target: 'docs/architecture/components/example.md',
    limit: 7,
  });

  assert.match(captured.sql, /from planning_query_store\.fowler_analysis_duplicate_intent_query/);
  assert.match(captured.sql, /duplicate_state = \$1/);
  assert.match(captured.sql, /canonical_target_path = \$2/);
  assert.match(captured.sql, /limit \$3/);
  assert.deepEqual(captured.params, [
    'open_duplicate',
    'docs/architecture/components/example.md',
    7,
  ]);
});

test('runQuery dispatches fowler-analysis through the DB-first work queue', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /fowler_analysis_work_query/);
      return {
        rows: [
          {
            work_state: 'ready_to_retire',
            document_class: 'intake',
            retirement_allowed: true,
            pending_improvement_count: 0,
            open_action_count: 0,
            inbound_reference_count: 0,
            document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
            subject_key: 'example',
            title: 'Fowler Example',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'fowler-analysis',
    filters: { state: 'ready_to_retire', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'ready_to_retire',
      'intake',
      'true',
      0,
      0,
      0,
      'buzon/20260514-codex-fowler-example-analysis.md',
      'example',
      'Fowler Example',
    ],
  ]);
});

test('runQuery dispatches Fowler analysis references through the DB-first reference query', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /fowler_analysis_reference_query/);
      return {
        rows: [
          {
            document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
            reference_state: 'live',
            relation_type: 'repository_path_reference',
            reference_path: 'docs/planning/proposals/mandatory/example.md',
            canonical_target_path: 'docs/architecture/components/example.md',
            resolution_status: 'pending',
            reference_component_id: 'SYS-DOCS-GOVERNANCE',
            reference_file_role: 'proposal',
            sample_text: 'buzon/20260514-codex-fowler-example-analysis.md',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'fowler-analysis-references',
    filters: { state: 'live', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'buzon/20260514-codex-fowler-example-analysis.md',
      'live',
      'repository_path_reference',
      'docs/planning/proposals/mandatory/example.md',
      'docs/architecture/components/example.md',
      'pending',
      'SYS-DOCS-GOVERNANCE',
      'proposal',
      'buzon/20260514-codex-fowler-example-analysis.md',
    ],
  ]);
});

test('runQuery dispatches Fowler analysis retirement through the DB-first policy query', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /fowler_analysis_retirement_query/);
      return {
        rows: [
          {
            retirement_state: 'ready_to_retire',
            retirement_allowed: true,
            unresolved_reference_count: 0,
            open_improvement_count: 0,
            canonical_target_path: 'docs/architecture/components/example.md',
            disposition_status: 'accepted',
            retirement_decision_status: 'approved',
            document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
            title: 'Fowler Example',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'fowler-analysis-retirement',
    filters: { retirementAllowed: true, limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'ready_to_retire',
      'true',
      0,
      0,
      'docs/architecture/components/example.md',
      'accepted',
      'approved',
      'buzon/20260514-codex-fowler-example-analysis.md',
      'Fowler Example',
    ],
  ]);
});

test('runQuery dispatches Fowler analysis coverage through the DB-first coverage query', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /fowler_analysis_canonical_coverage_query/);
      return {
        rows: [
          {
            coverage_state: 'covered',
            target_path: 'docs/architecture/components/example.md',
            target_status: 'accepted',
            document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
            subject_key: 'example',
            title: 'Fowler Example',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'fowler-analysis-coverage',
    filters: { state: 'covered', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'covered',
      'docs/architecture/components/example.md',
      'accepted',
      'buzon/20260514-codex-fowler-example-analysis.md',
      'example',
      'Fowler Example',
    ],
  ]);
});

test('runQuery dispatches Fowler analysis intent through the DB-first work queue rail', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /fowler_analysis_intended_work_query/);
      return {
        rows: [
          {
            intent_state: 'duplicate_open_intent',
            is_duplicate_intent: true,
            duplicate_document_count: 2,
            duplicate_open_action_count: 3,
            document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
            intent_key: 'normalize-component-catalog',
            action_status: 'open',
            summary: 'Normalize component catalog in Planning DB',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'fowler-analysis-intent',
    filters: { duplicates: true, limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'duplicate_open_intent',
      'true',
      2,
      3,
      'buzon/20260514-codex-fowler-example-analysis.md',
      'normalize-component-catalog',
      'open',
      'Normalize component catalog in Planning DB',
    ],
  ]);
});

test('runQuery dispatches Fowler analysis duplicate intent through the DB-first work queue rail', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /fowler_analysis_duplicate_intent_query/);
      return {
        rows: [
          {
            duplicate_state: 'open_duplicate',
            duplicate_document_count: 2,
            duplicate_open_action_count: 3,
            canonical_target_path: 'docs/architecture/components/example.md',
            intent_key: 'normalize-component-catalog',
            sample_document_path: 'buzon/20260514-codex-fowler-example-analysis.md',
            sample_summary: 'Normalize component catalog in Planning DB',
          },
        ],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'fowler-analysis-duplicates',
    filters: { state: 'open_duplicate', limit: 5 },
    client,
    print: false,
  });

  assert.deepEqual(rows, [
    [
      'open_duplicate',
      2,
      3,
      'docs/architecture/components/example.md',
      'normalize-component-catalog',
      'buzon/20260514-codex-fowler-example-analysis.md',
      'Normalize component catalog in Planning DB',
    ],
  ]);
});
