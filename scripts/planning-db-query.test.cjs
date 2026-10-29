const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runPlanningDbQueryCli } = require('./planning-db-query-tests/helpers.cjs');
const {
  parseArgs,
  formatQueryError,
  resolveQueryName,
  runQuery,
} = require('./planning-db-query.cjs');

require('./planning-db-query-tests/feature-mechanization.test.cjs');
require('./planning-db-query-tests/fowler-analysis.test.cjs');
require('./planning-db-query-tests/governance-refresh.test.cjs');
require('./planning-db-query-tests/canvas-component-registry-drift.test.cjs');
require('./planning-db-query-tests/dbt-roundtrip-capabilities.test.cjs');
require('./planning-db-query-tests/source-drift.test.cjs');
require('./planning-db-query-tests/current-component-files.test.cjs');
require('./planning-db-query-tests/catalogs.test.cjs');
require('./planning-db-query-tests/documentation.test.cjs');
require('./planning-db-query-tests/knowledge-intake.test.cjs');
require('./planning-db-query-tests/frontend.test.cjs');
require('./planning-db-query-tests/architecture-authority.test.cjs');
require('./planning-db-query-tests/architecture-fitness.test.cjs');
require('./planning-db-query-tests/component-engineering.test.cjs');
require('./planning-db-query-tests/governance.test.cjs');
require('./planning-db-query-tests/operator-context.test.cjs');
require('./planning-db-query-tests/component-profiles.test.cjs');

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
        rows: sql.includes('governance_unit_query')
          ? [
              {
                id: 'SYS-RUNTIME-ROOT',
                level: 'module',
                status: 'canonical',
                owns: [],
                excludes: [],
                responsibilities: [],
              },
              {
                id: 'SYS-RUNTIME-ENGINE-CORE',
                name: 'Runtime engine core',
                level: 'component',
                status: 'coverage-required',
                owns: ['model.ts'],
                excludes: [],
                responsibilities: [],
                parent: 'SYS-RUNTIME-ROOT',
                governance_state: 'coverage-required',
                direct_file_count: 0,
                descendant_file_count: 189,
                ddd_owner: 'AS',
                is_leaf_component: false,
              },
            ]
          : [],
      };
    },
  };

  const rows = await runQuery({
    queryName: 'component-tree',
    filters: { component: 'SYS-RUNTIME-ENGINE-CORE' },
    databaseUrl: 'postgresql://example/db',
    client,
    print: false,
    gitReader: { resolveComparison() {}, readCurrentFiles: () => ['model.ts'] },
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
    1,
    1,
    'AS',
    'true',
  ]);
});

test('runQuery refreshes stale governance projections only when explicitly requested', async () => {
  const events = [];
  const client = {
    async query(sql, params) {
      events.push(['query', sql, params]);
      return {
        rows: sql.includes('governance_unit_query')
          ? [
              {
                id: 'SYS-RUNTIME-ROOT',
                level: 'module',
                status: 'canonical',
                owns: [],
                excludes: [],
                responsibilities: [],
              },
              {
                id: 'SYS-RUNTIME-ENGINE-CORE',
                name: 'Runtime engine core',
                level: 'component',
                status: 'coverage-required',
                owns: ['model.ts'],
                excludes: [],
                responsibilities: [],
                parent: 'SYS-RUNTIME-ROOT',
                governance_state: 'coverage-required',
                direct_file_count: 0,
                descendant_file_count: 189,
                ddd_owner: 'AS',
                is_leaf_component: false,
              },
            ]
          : [],
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
    gitReader: { resolveComparison() {}, readCurrentFiles: () => ['model.ts'] },
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
    1,
    1,
    'AS',
    'true',
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
