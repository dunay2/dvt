/** Owned concern: prove governed source existence uses the validated Git candidate. */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createGitRepositoryEnvironment } = require('../lib/git-repository-environment.cjs');
const { FeatureMechanizationGitDiffReader } = require('../lib/feature-mechanization-git-diff.cjs');
const {
  createGovernedSourceDriftReadModelComponent,
} = require('../planning-db/queries/source-drift-query.cjs');
const {
  createCodeSymbolReadModelComponent,
} = require('../planning-db/queries/code-symbol-query.cjs');
const {
  createComponentIntegrityReadModelComponent,
} = require('../planning-db/queries/component-integrity-query.cjs');

function sourceDriftGitFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-source-drift-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = createGitRepositoryEnvironment({
    ...process.env,
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  });
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  const write = (name) => fs.writeFileSync(path.join(root, name), `${name}\n`);
  const commit = (parent) => {
    git('add', '--all');
    const sha = git(
      'commit-tree',
      git('write-tree').trim(),
      ...(parent ? ['-p', parent] : []),
      '-m',
      'Fixture'
    ).trim();
    git('update-ref', 'HEAD', sha);
    return sha;
  };
  git('init', '--quiet', '--initial-branch=main');
  write('retired.md');
  write('retained.md');
  const base = commit();
  const reader = (options = {}) => {
    const instance = new FeatureMechanizationGitDiffReader({
      repoRootPath: root,
      baseRef: base,
      headRef: 'HEAD',
      includeWorktree: true,
      ...options,
    });
    instance.runGit = (args) => git(...args);
    instance.read = () => assert.fail('Existence must not acquire full contents and diff evidence');
    return instance;
  };
  return { root, git, write, commit, base, reader };
}

test('source existence binds the real local candidate including staged and untracked files', async (t) => {
  const repo = sourceDriftGitFixture(t);
  repo.write('new.md');
  repo.write('staged.md');
  repo.git('add', 'staged.md');
  fs.unlinkSync(path.join(repo.root, 'retired.md'));
  const model = createGovernedSourceDriftReadModelComponent({ gitReader: repo.reader() });
  let inventory;
  await model.readSourceDriftRows({
    query: async (_sql, params) => {
      [inventory] = params;
      return { rows: [] };
    },
  });
  assert.deepEqual(inventory, ['new.md', 'retained.md', 'staged.md']);
});

test('exact candidate ignores recreated deletions, untracked files and an advanced checkout', (t) => {
  const repo = sourceDriftGitFixture(t);
  repo.git('rm', '--quiet', 'retired.md');
  repo.write('added.md');
  const candidate = repo.commit(repo.base);
  repo.write('later.md');
  repo.commit(candidate);
  repo.write('retired.md');
  repo.write('local-only.md');
  const model = createGovernedSourceDriftReadModelComponent({
    gitReader: repo.reader({ headRef: candidate, includeWorktree: false }),
  });
  assert.deepEqual(model.readGitSourceInventory(), ['added.md', 'retained.md']);
  const previous = createGovernedSourceDriftReadModelComponent({
    gitReader: repo.reader({ headRef: repo.base, includeWorktree: false }),
  });
  assert.deepEqual(previous.readGitSourceInventory(), ['retained.md', 'retired.md']);
});

test('invalid Git comparison rejects before asking the DB instead of reporting no drift', async (t) => {
  const repo = sourceDriftGitFixture(t);
  for (const option of ['baseRef', 'headRef']) {
    const model = createGovernedSourceDriftReadModelComponent({
      gitReader: repo.reader({ [option]: 'refs/heads/missing' }),
    });
    await assert.rejects(
      model.readSourceDriftRows({ query: () => assert.fail('Invalid Git evidence reached DB') })
    );
    const integrity = createComponentIntegrityReadModelComponent({
      gitReader: repo.reader({ [option]: 'refs/heads/missing' }),
    });
    await assert.rejects(
      integrity.readComponentIntegrityRows({
        query: () => assert.fail('Invalid Git evidence reached integrity DB'),
      })
    );
  }
});

test('source query compares every DB reference against bound Git paths before filters and limit', async (t) => {
  const repo = sourceDriftGitFixture(t);
  const model = createGovernedSourceDriftReadModelComponent({ gitReader: repo.reader() });
  const rows = [
    {
      finding_kind: 'missing_source_file',
      severity: 'error',
      source_path: 'buzon/missing.md',
      source_table: 'planning_query_store.command_query_rails',
      reference_count: 3,
      action_hint: 'Repoint the governed source or retire the stale row explicitly.',
    },
  ];
  let captured;
  assert.equal(
    await model.readSourceDriftRows(
      {
        query: async (sql, params) => {
          captured = { sql, params };
          return { rows };
        },
      },
      { path: 'buzon/missing.md', severity: 'error', limit: 1 }
    ),
    rows
  );
  assert.deepEqual(captured.params, [
    ['retained.md', 'retired.md'],
    'buzon/missing.md',
    'error',
    1,
  ]);
  assert.match(captured.sql, /from planning_query_store\.command_query_rails/);
  assert.match(captured.sql, /from planning_query_store\.feature_mechanization_local_rails/);
  assert.match(captured.sql, /source_path = any\(\$1::text\[\]\)/);
  assert.match(captured.sql, /source_path !~\* '\^https\?:\/\/'/);
  assert.match(captured.sql, /source_path !~ '\^\\\.generated-docs\/'/);
  assert.match(captured.sql, /when source_path like 'buzon\/%' then 'error' else 'warning'/);
  assert.match(captured.sql, /count\(\*\)::integer as reference_count/);
  assert.match(captured.sql, /source_path = \$2/);
  assert.match(captured.sql, /severity = \$3/);
  assert.match(captured.sql, /limit \$4\s*$/);
  assert.doesNotMatch(captured.sql, /governance_files|governed_source_drift_query/);
  assert.equal((captured.sql.match(/\blimit\b/g) || []).length, 1);
  assert.deepEqual(model.buildSourceDriftRows(rows), [
    [
      'missing_source_file',
      'error',
      'buzon/missing.md',
      'planning_query_store.command_query_rails',
      3,
      rows[0].action_hint,
    ],
  ]);
});

test('dashboard replaces only imported source drift and filters the composed current result', async (t) => {
  const repo = sourceDriftGitFixture(t);
  const deps = { gitReader: repo.reader() };
  const source = createGovernedSourceDriftReadModelComponent(deps);
  const dashboard = createCodeSymbolReadModelComponent(deps);
  let captured;
  const rows = [{ problem_surface: 'source-drift', source_path: 'missing.md' }];
  assert.equal(
    await dashboard.readGovernanceProblemRows(
      {
        query: async (sql, params) => {
          captured = { sql, params };
          return { rows };
        },
      },
      {
        kind: 'missing_source_file',
        severity: 'warning',
        component: 'component',
        path: 'missing.md',
        limit: 1,
      }
    ),
    rows
  );
  assert.deepEqual(captured.params, [
    ['retained.md', 'retired.md'],
    'missing_source_file',
    'warning',
    'component',
    'missing.md',
    1,
  ]);
  assert.match(
    captured.sql,
    /from planning_query_store\.governance_problem_dashboard_query\s+where problem_surface <> 'source-drift'/
  );
  assert.ok(captured.sql.includes(source.sourceDriftSelect()));
  assert.match(captured.sql, /union all/);
  assert.match(captured.sql, /finding_kind = \$2/);
  assert.match(captured.sql, /path = \$5/);
  assert.match(captured.sql, /limit \$6\s*$/);
  assert.equal((captured.sql.match(/\blimit\b/g) || []).length, 1);
});

test('source and dashboard queries propagate unavailable DB authority without success fallback', async (t) => {
  const repo = sourceDriftGitFixture(t);
  const deps = { gitReader: repo.reader() };
  const failure = new Error('DB unavailable');
  const client = {
    query: async () => {
      throw failure;
    },
  };
  await assert.rejects(
    createGovernedSourceDriftReadModelComponent(deps).readSourceDriftRows(client),
    (error) => error === failure
  );
  await assert.rejects(
    createCodeSymbolReadModelComponent(deps).readGovernanceProblemRows(client),
    (error) => error === failure
  );
});

const {
  buildCodeSymbolRows,
  buildCodeSymbolDuplicateRows,
  buildSourceDriftRows,
  buildGovernanceProblemRows,
  parseArgs,
  readCodeSymbolRows,
  readCodeSymbolDuplicateRows,
  readSourceDriftRows,
  readGovernanceProblemRows,
} = require('../planning-db-query.cjs');

test('code symbol duplicate query behavior lives in a focused read-model component', () => {
  const codeSymbolComponent = require('../planning-db/queries/code-symbol-query.cjs');
  const sourceDriftComponent = require('../planning-db/queries/source-drift-query.cjs');

  assert.equal(codeSymbolComponent.buildCodeSymbolRows, buildCodeSymbolRows);
  assert.equal(codeSymbolComponent.buildCodeSymbolDuplicateRows, buildCodeSymbolDuplicateRows);
  assert.equal(sourceDriftComponent.buildSourceDriftRows, buildSourceDriftRows);
  assert.equal(codeSymbolComponent.buildGovernanceProblemRows, buildGovernanceProblemRows);
  assert.equal(codeSymbolComponent.readCodeSymbolRows, readCodeSymbolRows);
  assert.equal(codeSymbolComponent.readCodeSymbolDuplicateRows, readCodeSymbolDuplicateRows);
  assert.equal(sourceDriftComponent.readSourceDriftRows, readSourceDriftRows);
  assert.equal(codeSymbolComponent.readSourceDriftRows, undefined);
  assert.equal(codeSymbolComponent.readGovernanceProblemRows, readGovernanceProblemRows);
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
