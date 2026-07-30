const node = {
  assert: require('node:assert/strict'),
  fs: require('node:fs'),
  os: require('node:os'),
  path: require('node:path'),
  test: require('node:test'),
  yaml: require('js-yaml'),
};

const { PlanningDbExportRunner, exportedArtifactPaths } = require('./planning-db-export.cjs');

function createLaneExportFixture(repoRoot, taskOverrides = {}) {
  const runner = new PlanningDbExportRunner({
    fs: node.fs,
    os: node.os,
    path: node.path,
    repoRoot,
    schemaName: 'planning_query_store',
    yaml: node.yaml,
  });
  const client = {
    async query(sql) {
      if (sql.includes('from planning_query_store.planning_lanes')) {
        return {
          rows: [
            {
              laneId: 'A',
              rawLane: {
                lane_id: 'A',
                title: 'Lane A',
                tasks: [{ task_id: 'A-1' }],
              },
            },
          ],
        };
      }

      if (sql.includes('from planning_query_store.planning_effective_tasks')) {
        return {
          rows: [
            {
              laneId: 'A',
              taskId: 'A-1',
              rawTask: {
                task_id: 'A-1',
                status: 'queued',
                objective: 'Prove durable export.',
              },
              status: 'in_progress',
              progressPct: 25,
              evidenceRefs: [],
              statusReason: 'DB state changed.',
              ...taskOverrides,
            },
          ],
        };
      }

      return { rows: [] };
    },
  };

  runner.runWorkboardGenerator = () => {};
  runner.recordPlanningArtifacts = async () => {};

  return { client, runner };
}

node.test('planning DB export reconstructs lane documents from normalized DB task rows', () => {
  const runner = new PlanningDbExportRunner();
  const lanes = runner.buildLaneDocuments({
    lanes: [
      {
        laneId: 'A',
        rawLane: {
          lane_id: 'A',
          title: 'Lane A',
          tasks: [{ task_id: 'A-2' }, { task_id: 'A-1' }, { task_id: 'STALE-SOURCE-TASK' }],
          verification_summary: { lane_progress_pct: 50 },
        },
      },
    ],
    tasks: [
      {
        laneId: 'A',
        taskId: 'A-2',
        rawTask: { task_id: 'A-2', status: 'queued', objective: 'Second task.' },
      },
      {
        laneId: 'A',
        taskId: 'A-1',
        rawTask: { task_id: 'A-1', status: 'done', objective: 'First task.' },
      },
    ],
  });

  node.assert.deepEqual(
    lanes.map((lane) => lane.tasks.map((task) => task.task_id)),
    [['A-2', 'A-1']]
  );
  node.assert.equal(lanes[0].verification_summary.lane_progress_pct, 50);
});

node.test(
  'planning DB export overlays effective task fields without exporting local claims',
  () => {
    const runner = new PlanningDbExportRunner();
    const lanes = runner.buildLaneDocuments({
      lanes: [
        {
          laneId: 'C',
          rawLane: {
            lane_id: 'C',
            title: 'Lane C',
            tasks: [{ task_id: 'AR-C10' }],
          },
        },
      ],
      tasks: [
        {
          laneId: 'C',
          taskId: 'AR-C10',
          rawTask: {
            task_id: 'AR-C10',
            status: 'queued',
            progress_pct: 0,
            evidence_refs: [],
            status_reason: 'Imported state.',
          },
          status: 'review',
          progressPct: 80,
          evidenceRefs: ['docs/evidence/ED-20260508-planning-db-effective-tasks.md'],
          statusReason: 'DB overlay is ready for review.',
          claimedBy: 'codex',
        },
      ],
    });

    const [task] = lanes[0].tasks;
    node.assert.equal(task.status, 'review');
    node.assert.equal(task.progress_pct, 80);
    node.assert.deepEqual(task.evidence_refs, [
      'docs/evidence/ED-20260508-planning-db-effective-tasks.md',
    ]);
    node.assert.equal(task.status_reason, 'DB overlay is ready for review.');
    node.assert.equal(task.claimed_by, undefined);
  }
);

node.test('planning DB export preserves versioned lane and task field order', () => {
  const repoRoot = node.fs.mkdtempSync(node.path.join(node.os.tmpdir(), 'planning-db-repo-'));
  const sourcePath = 'docs/planning/state/agent-lane-a.yaml';
  const absoluteSourcePath = node.path.join(repoRoot, sourcePath);
  const runner = new PlanningDbExportRunner({
    fs: node.fs,
    os: node.os,
    path: node.path,
    repoRoot,
    schemaName: 'planning_query_store',
    yaml: node.yaml,
  });

  try {
    node.fs.mkdirSync(node.path.dirname(absoluteSourcePath), { recursive: true });
    node.fs.writeFileSync(
      absoluteSourcePath,
      [
        'lane_id: A',
        'title: Lane A',
        'tasks:',
        '  - task_id: A-1',
        '    priority: P1',
        '    status: queued',
        '    objective: Preserve source order.',
        '',
      ].join('\n'),
      'utf8'
    );

    const [lane] = runner.buildLaneDocuments({
      lanes: [
        {
          laneId: 'A',
          sourcePath,
          rawLane: {
            tasks: [{ task_id: 'A-1' }],
            title: 'Lane A',
            lane_id: 'A',
          },
        },
      ],
      tasks: [
        {
          laneId: 'A',
          taskId: 'A-1',
          rawTask: {
            objective: 'Preserve source order.',
            status: 'queued',
            priority: 'P1',
            task_id: 'A-1',
          },
          status: 'in_progress',
        },
      ],
    });
    const rendered = node.yaml.dump(lane);

    node.assert.ok(rendered.indexOf('lane_id:') < rendered.indexOf('title:'));
    node.assert.ok(rendered.indexOf('task_id:') < rendered.indexOf('priority:'));
    node.assert.ok(rendered.indexOf('priority:') < rendered.indexOf('status:'));
    node.assert.match(rendered, /status: in_progress/u);
  } finally {
    node.fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

node.test('planning DB export reads effective task rows from the query store', async () => {
  const runner = new PlanningDbExportRunner();
  const capturedSql = [];
  const client = {
    async query(sql) {
      capturedSql.push(sql);
      return { rows: [] };
    },
  };

  await runner.readPlanningRows(client);

  node.assert.match(capturedSql.join('\n'), /from planning_query_store\.planning_effective_tasks/);
});

node.test(
  'planning DB export materializes effective lane state under the output root',
  async () => {
    const outputRoot = node.fs.mkdtempSync(node.path.join(node.os.tmpdir(), 'planning-db-export-'));
    const { client, runner } = createLaneExportFixture('F:/repo', {
      evidenceRefs: ['https://github.com/dunay2/dvt/issues/2104'],
      statusReason: 'Canonical export proof is active.',
      claimedBy: 'codex',
    });

    try {
      await runner.exportPlanningDerivedSurfaces({
        client,
        databaseUrl: 'postgres://example/planning',
        outputRoot,
      });

      const lanePath = node.path.join(outputRoot, 'docs', 'planning', 'state', 'agent-lane-a.yaml');
      const lane = node.yaml.load(node.fs.readFileSync(lanePath, 'utf8'));

      node.assert.equal(lane.tasks[0].status, 'in_progress');
      node.assert.equal(lane.tasks[0].progress_pct, 25);
      node.assert.deepEqual(lane.tasks[0].evidence_refs, [
        'https://github.com/dunay2/dvt/issues/2104',
      ]);
      node.assert.equal(lane.tasks[0].claimed_by, undefined);
    } finally {
      node.fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  }
);

node.test('planning DB export check rejects drift in canonical lane state', async () => {
  const repoRoot = node.fs.mkdtempSync(node.path.join(node.os.tmpdir(), 'planning-db-repo-'));
  const { client, runner } = createLaneExportFixture(repoRoot);

  try {
    for (const artifactPath of exportedArtifactPaths) {
      const artifact = node.path.join(repoRoot, artifactPath);
      node.fs.mkdirSync(node.path.dirname(artifact), { recursive: true });
      node.fs.writeFileSync(artifact, 'stable generated view\n', 'utf8');
    }

    const lanePath = node.path.join(repoRoot, 'docs', 'planning', 'state', 'agent-lane-a.yaml');
    node.fs.mkdirSync(node.path.dirname(lanePath), { recursive: true });
    node.fs.writeFileSync(
      lanePath,
      node.yaml.dump({
        lane_id: 'A',
        title: 'Lane A',
        tasks: [
          {
            task_id: 'A-1',
            status: 'queued',
            objective: 'Prove durable export.',
          },
        ],
      }),
      'utf8'
    );

    await node.assert.rejects(
      runner.exportPlanningDerivedSurfaces({
        check: true,
        client,
        databaseUrl: 'postgres://example/planning',
      }),
      /agent-lane-a\.yaml/
    );
  } finally {
    node.fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

node.test('planning DB export renders generated views from the canonical DB source', () => {
  const calls = [];
  const runner = new PlanningDbExportRunner({
    path: node.path,
    repoRoot: 'F:/repo',
    childProcess: {
      spawnSync(command, args, options) {
        calls.push({ command, args, cwd: options.cwd });
        return { status: 0, stdout: '', stderr: '' };
      },
    },
  });

  runner.runWorkboardGenerator({
    outputRoot: 'F:/repo/.generated-docs/planning-db-export',
    databaseUrl: 'postgres://example/planning',
  });

  node.assert.deepEqual(calls[0].args.slice(1), [
    '--source',
    'db',
    '--database-url',
    'postgres://example/planning',
    '--output-root',
    'F:/repo/.generated-docs/planning-db-export',
  ]);
});

node.test('planning DB export rejects task rows that reference a missing lane', () => {
  const runner = new PlanningDbExportRunner();

  node.assert.throws(
    () =>
      runner.buildLaneDocuments({
        lanes: [],
        tasks: [{ laneId: 'Z', taskId: 'Z-1', rawTask: { task_id: 'Z-1' } }],
      }),
    /references missing lane Z/
  );
});

node.test('planning DB export compares only the canonical generated planning views', () => {
  const runner = new PlanningDbExportRunner();
  const root = node.fs.mkdtempSync(node.path.join(node.os.tmpdir(), 'planning-db-export-'));
  const expectedRoot = node.path.join(root, 'expected');
  const actualRoot = node.path.join(root, 'actual');

  try {
    for (const artifactPath of exportedArtifactPaths) {
      const expectedPath = node.path.join(expectedRoot, artifactPath);
      const actualPath = node.path.join(actualRoot, artifactPath);
      node.fs.mkdirSync(node.path.dirname(expectedPath), { recursive: true });
      node.fs.mkdirSync(node.path.dirname(actualPath), { recursive: true });
      node.fs.writeFileSync(expectedPath, `${artifactPath}\n`, 'utf8');
      node.fs.writeFileSync(actualPath, `${artifactPath}\n`, 'utf8');
    }

    const okReport = runner.compareGeneratedArtifacts({
      expectedRoot,
      actualRoot,
    });
    node.assert.equal(okReport.ok, true);

    node.fs.writeFileSync(
      node.path.join(actualRoot, exportedArtifactPaths[0]),
      'changed\n',
      'utf8'
    );

    const driftReport = runner.compareGeneratedArtifacts({
      expectedRoot,
      actualRoot,
    });
    node.assert.equal(driftReport.ok, false);
    node.assert.deepEqual(driftReport.changed, [exportedArtifactPaths[0]]);
  } finally {
    node.fs.rmSync(root, { recursive: true, force: true });
  }
});

node.test('planning DB export compares lane YAML semantically instead of by formatting', () => {
  const runner = new PlanningDbExportRunner();
  const root = node.fs.mkdtempSync(node.path.join(node.os.tmpdir(), 'planning-db-export-'));
  const expectedRoot = node.path.join(root, 'expected');
  const actualRoot = node.path.join(root, 'actual');
  const lanePath = 'docs/planning/state/agent-lane-a.yaml';

  try {
    const expectedPath = node.path.join(expectedRoot, lanePath);
    const actualPath = node.path.join(actualRoot, lanePath);
    node.fs.mkdirSync(node.path.dirname(expectedPath), { recursive: true });
    node.fs.mkdirSync(node.path.dirname(actualPath), { recursive: true });
    node.fs.writeFileSync(
      expectedPath,
      [
        'lane_id: A',
        'title: Lane A',
        'tasks:',
        '  - task_id: A-1',
        '    status: queued',
        '    objective: >-',
        '      Preserve semantic state.',
        '',
      ].join('\n'),
      'utf8'
    );
    node.fs.writeFileSync(
      actualPath,
      [
        'tasks:',
        '  - objective: Preserve semantic state.',
        '    status: queued',
        '    task_id: A-1',
        'title: Lane A',
        'lane_id: A',
        '',
      ].join('\n'),
      'utf8'
    );

    const report = runner.compareGeneratedArtifacts({
      expectedRoot,
      actualRoot,
      artifactPaths: [lanePath],
    });

    node.assert.deepEqual(report, {
      ok: true,
      missing: [],
      changed: [],
    });
  } finally {
    node.fs.rmSync(root, { recursive: true, force: true });
  }
});
