const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildOpenTaskRoute,
  buildWorkboard,
  parseArgs,
  resolveLaneSource,
} = require('./generate-workboard.cjs');

function writeLaneFixture(root, status = 'queued') {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'agent-lane-a.yaml'),
    [
      'lane_id: A',
      'title: Lane A',
      'tasks:',
      '  - task_id: YAML-1',
      `    status: ${status}`,
      '    objective: YAML task.',
      '    target: Continue from YAML.',
      '',
    ].join('\n'),
    'utf8'
  );
}

test('parseArgs defaults workboard generation to the planning DB source', () => {
  const parsed = parseArgs([]);

  assert.equal(parsed.source, 'db');
  assert.match(parsed.sourceStateDir, /docs[\\/]planning[\\/]state$/);
});

test('parseArgs accepts explicit workboard source and database URL', () => {
  const parsed = parseArgs([
    '--source',
    'db',
    '--database-url',
    'postgres://example/planning',
    '--output-root',
    '.generated-docs',
  ]);

  assert.equal(parsed.source, 'db');
  assert.equal(parsed.databaseUrl, 'postgres://example/planning');
  assert.match(parsed.outputRoot, /\.generated-docs$/);
});

test('resolveLaneSource reads effective task state from the planning DB when it is fresh', async () => {
  const sourceStateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workboard-source-db-'));
  writeLaneFixture(sourceStateDir);

  const calls = [];
  class FakeClient {
    constructor(config) {
      this.config = config;
    }

    async connect() {
      calls.push(['connect', this.config.connectionString]);
    }

    async query(sql) {
      calls.push(['queryNextTasks', /planning_next_tasks/.test(sql)]);
      return { rows: [{ laneId: 'A', taskId: 'NEXT-1' }] };
    }

    async end() {
      calls.push(['end']);
    }
  }

  class FakePlanningDbExportRunner {
    constructor(deps) {
      calls.push(['schemaName', deps.schemaName]);
    }

    async readPlanningRows() {
      calls.push(['readPlanningRows']);
      return {
        lanes: [{ laneId: 'A', rawLane: { lane_id: 'A', title: 'Lane A', tasks: [] } }],
        tasks: [
          {
            laneId: 'A',
            taskId: 'DB-1',
            rawTask: { task_id: 'DB-1', status: 'queued', objective: 'Imported task.' },
            status: 'review',
            progressPct: 80,
          },
          {
            laneId: 'A',
            taskId: 'NEXT-1',
            rawTask: { task_id: 'NEXT-1', status: 'queued', objective: 'Next DB task.' },
            status: 'queued',
            progressPct: 0,
          },
        ],
      };
    }

    buildLaneDocuments() {
      calls.push(['buildLaneDocuments']);
      return [
        {
          lane_id: 'A',
          title: 'Lane A',
          tasks: [
            {
              task_id: 'DB-1',
              status: 'review',
              progress_pct: 80,
              objective: 'DB effective task.',
            },
            {
              task_id: 'NEXT-1',
              status: 'queued',
              progress_pct: 0,
              objective: 'Next DB task.',
              target: 'Continue from DB next view.',
            },
          ],
        },
      ];
    }
  }

  const resolved = await resolveLaneSource(
    {
      source: 'db',
      sourceStateDir,
      databaseUrl: 'postgres://example/planning',
    },
    {
      Client: FakeClient,
      PlanningDbExportRunner: FakePlanningDbExportRunner,
      checkPlanningDatabase: async () => ({ ok: true }),
      formatDriftReport: () => '[planning:db:check] OK',
    }
  );

  assert.equal(resolved.kind, 'db');
  assert.equal(resolved.description, 'planning DB effective task and next-task views');
  assert.equal(resolved.lanes[0].tasks[0].task_id, 'DB-1');
  assert.equal(resolved.lanes[0].tasks[0].status, 'review');
  assert.deepEqual(
    resolved.actionableTasks.map((task) => task.task_id),
    ['NEXT-1']
  );
  assert.deepEqual(calls, [
    ['connect', 'postgres://example/planning'],
    ['schemaName', 'planning_query_store'],
    ['readPlanningRows'],
    ['buildLaneDocuments'],
    ['queryNextTasks', true],
    ['end'],
  ]);
});

test('resolveLaneSource uses lane YAML only when explicitly requested', async () => {
  const sourceStateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workboard-source-yaml-'));
  writeLaneFixture(sourceStateDir, 'in_progress');

  const resolved = await resolveLaneSource(
    { source: 'yaml', sourceStateDir, databaseUrl: 'postgres://example/planning' },
    {
      Client: class {},
      PlanningDbExportRunner: class {},
      checkPlanningDatabase: async () => ({ ok: true }),
      formatDriftReport: () => '[planning:db:check] OK',
    }
  );

  assert.equal(resolved.kind, 'yaml');
  assert.equal(resolved.description, 'verified agent-lane YAML files');
  assert.equal(resolved.lanes[0].tasks[0].task_id, 'YAML-1');
  assert.equal(resolved.lanes[0].tasks[0].status, 'in_progress');
});

test('resolveLaneSource does not silently fall back when the canonical DB is unavailable', async () => {
  class UnreachableClient {
    async connect() {
      const error = new Error('connect ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      throw error;
    }
  }

  await assert.rejects(
    () =>
      resolveLaneSource(
        { source: 'db', sourceStateDir: 'unused', databaseUrl: 'postgres://example/planning' },
        {
          Client: UnreachableClient,
          PlanningDbExportRunner: class {},
          checkPlanningDatabase: async () => ({ ok: true }),
          formatDriftReport: () => '[planning:db:check] OK',
        }
      ),
    /connect ECONNREFUSED/
  );
});

test('resolveLaneSource fails closed when the reachable planning DB is stale', async () => {
  class ReachableClient {
    async connect() {}

    async end() {}
  }

  await assert.rejects(
    () =>
      resolveLaneSource(
        { source: 'db', sourceStateDir: 'unused', databaseUrl: 'postgres://example/planning' },
        {
          Client: ReachableClient,
          PlanningDbExportRunner: class {},
          checkPlanningDatabase: async () => ({ ok: false, sections: {} }),
          formatDriftReport: () => '[planning:db:check] Drift detected',
        }
      ),
    /Planning DB is reachable but stale/
  );
});

test('workboard output names the active source of generated task state', () => {
  const lanes = [{ lane_id: 'A', title: 'Lane A', tasks: [] }];
  const tasks = [
    {
      lane_id: 'A',
      lane_title: 'Lane A',
      domain: 'Execution Runtime',
      task_id: 'DB-1',
      status: 'review',
      objective: 'DB effective task.',
      target: 'Inspect generated view.',
    },
  ];

  const workboard = buildWorkboard(tasks, lanes, '2026-05-08', 'planning DB effective task view');
  const route = buildOpenTaskRoute(
    tasks,
    lanes,
    new Set(),
    '2026-05-08',
    'planning DB effective task view'
  );

  assert.match(workboard, /Generated from planning DB effective task view on 2026-05-08\./);
  assert.match(route, /Verified task registry source: planning DB effective task view\./);
});

test('open task route can render DB-owned next-task candidates without recomputing dependencies', () => {
  const lanes = [{ lane_id: 'A', title: 'Lane A', tasks: [] }];
  const tasks = [
    {
      lane_id: 'A',
      lane_title: 'Lane A',
      domain: 'Execution Runtime',
      task_id: 'NEXT-DB',
      priority: 'P1',
      status: 'queued',
      dependency: 'MISSING-IN-LOCAL-DONE-SET',
      objective: 'Use the DB-owned next-task view.',
      target: 'Render from planning_next_tasks.',
    },
  ];

  const route = buildOpenTaskRoute(
    tasks,
    lanes,
    new Set(),
    '2026-05-08',
    'planning DB effective task and next-task views',
    tasks
  );

  assert.match(
    route,
    /Verified task registry source: planning DB effective task and next-task views\./
  );
  assert.match(route, /\| `P1` \| `NEXT-DB` \|/);
});
