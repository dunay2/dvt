const test = require('node:test');
const assert = require('node:assert/strict');

const { renderLaneMarkdown, renderTasksSection } = require('./generate-planning-lanes.cjs');

test('generated lane pages describe YAML as bootstrap export, not daily task authority', () => {
  const taskSection = renderTasksSection(
    {
      tasks: [
        {
          task_id: 'DB-1',
          priority: 'P1',
          status: 'queued',
          objective: 'Use the planning DB command rail.',
        },
      ],
    },
    'agent-lane-a.yaml'
  );

  assert.match(taskSection, /Bootstrap\/export source: `agent-lane-a.yaml`/);
  assert.match(taskSection, /Use `pnpm planning:db:operate`/);
  assert.doesNotMatch(taskSection, /Edit the YAML/);
});

test('generated lane page points assignment decisions at planning DB queries', () => {
  const markdown = renderLaneMarkdown(
    {
      lane_id: 'A',
      title: 'Lane A',
      status: 'Active',
      owner: 'generated',
      last_reviewed: '2026-05-10',
      goal: 'Keep planning DB authoritative.',
      tasks: [],
    },
    'agent-lane-a.yaml'
  );

  assert.match(markdown, /Generated from the lane bootstrap\/export snapshot/);
  assert.match(markdown, /Use `pnpm planning:db:query next --lane A`/);
});

test('generated lane page derives numeric progress from tasks over stale lane summaries', () => {
  const markdown = renderLaneMarkdown(
    {
      lane_id: 'A',
      title: 'Lane A',
      status: 'Active',
      owner: 'generated',
      last_reviewed: '2026-05-10',
      goal: 'Keep planning DB authoritative.',
      verification_summary: {
        total_tasks: 124,
        total_effort_points: 369,
        completed_weighted_points: 315.89,
        lane_progress_pct: 86,
        verified_on: '2026-05-07',
      },
      tasks: [
        {
          task_id: 'A-1',
          status: 'done',
          effort_points: 3,
          progress_pct: 100,
          objective: 'Closed task.',
        },
        {
          task_id: 'A-2',
          status: 'done',
          effort_points: 2,
          progress_pct: 100,
          objective: 'Closed task.',
        },
      ],
    },
    'agent-lane-a.yaml'
  );

  assert.match(markdown, /- Total tasks: `2`/);
  assert.match(markdown, /- Total effort points: `5`/);
  assert.match(markdown, /- Completed weighted points: `5`/);
  assert.match(markdown, /- Lane progress: `100%`/);
  assert.match(markdown, /- Verified on: `2026-05-07`/);
});
