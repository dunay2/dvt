const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPlanningExpectedState,
  comparePlanningDatabaseState,
  formatDriftReport,
} = require('./planning-db-check.cjs');

test('planning DB drift check detects stale source hashes', () => {
  const expected = buildPlanningExpectedState({
    sources: [
      {
        sourcePath: 'docs/planning/state/agent-lane-a.yaml',
        sourceType: 'planning_lane',
        contentSha256: 'a'.repeat(64),
        sourceBytes: 100,
      },
    ],
    lanes: [],
    tasks: [],
  });
  const actual = {
    ...expected,
    sources: [
      {
        sourcePath: 'docs/planning/state/agent-lane-a.yaml',
        sourceType: 'planning_lane',
        contentSha256: 'b'.repeat(64),
        sourceBytes: 100,
      },
    ],
  };

  const report = comparePlanningDatabaseState(expected, actual);

  assert.equal(report.ok, false);
  assert.match(formatDriftReport('planning:db:check', report), /stale rows: 1/);
  assert.match(formatDriftReport('planning:db:check', report), /agent-lane-a\.yaml/);
});

test('planning DB drift check detects missing task identities', () => {
  const expected = buildPlanningExpectedState({
    sources: [],
    lanes: [],
    tasks: [
      {
        laneId: 'C',
        taskId: 'AR-C10',
        priority: 'P1',
        status: 'review',
        objective: 'Close architecture documentation route.',
        sourcePath: 'docs/planning/state/agent-lane-c.yaml',
        sourceContentSha256: 'c'.repeat(64),
      },
    ],
  });
  const actual = { ...expected, tasks: [] };

  const report = comparePlanningDatabaseState(expected, actual);

  assert.equal(report.ok, false);
  assert.deepEqual(report.sections.tasks.missing, ['C::AR-C10']);
});
