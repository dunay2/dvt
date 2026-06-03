const node = {
  assert: require('node:assert/strict'),
  fs: require('node:fs'),
  os: require('node:os'),
  path: require('node:path'),
  test: require('node:test'),
};

const { PlanningDbExportRunner, exportedArtifactPaths } = require('./planning-db-export.cjs');

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
