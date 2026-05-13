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
