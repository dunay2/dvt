const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildKnowledgeIntakeReferenceRows,
  buildKnowledgeIntakeRetirementRows,
  parseArgs,
  readKnowledgeIntakeReferenceRows,
  readKnowledgeIntakeRetirementRows,
  runQuery,
} = require('../planning-db-query.cjs');

test('knowledge intake retirement query behavior lives in a focused read-model component', () => {
  const knowledgeIntakeRetirementComponent = require('../planning-db/queries/knowledge-intake-retirement-query.cjs');

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

    const source = fs.readFileSync(path.join(__dirname, '..', sourcePath), 'utf8');
    assert.match(source, new RegExp(`\\b${railName}\\b`));
  }
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
