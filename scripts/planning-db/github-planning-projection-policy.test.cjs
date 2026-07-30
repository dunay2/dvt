const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ListGitHubPlanningProjectionDrift,
  ReconcileGitHubPlanningProjection,
  buildGitHubPlanningProjection,
  parseGitHubIssueReference,
} = require('./github-planning-projection-policy.cjs');

const repository = 'dunay2/dvt';

function task(taskId, status, issueNumber) {
  return {
    laneId: taskId.slice(0, 1),
    taskId,
    status,
    evidenceRefs: issueNumber ? [`https://github.com/${repository}/issues/${issueNumber}`] : [],
  };
}

function issue(number, state, labels = ['task']) {
  return {
    number,
    state,
    title: `Issue ${number}`,
    url: `https://github.com/${repository}/issues/${number}`,
    labels,
  };
}

test('issue references are exact to the configured repository and exclude pull requests', () => {
  assert.equal(
    parseGitHubIssueReference('https://github.com/dunay2/dvt/issues/2098', repository),
    2098
  );
  assert.equal(
    parseGitHubIssueReference('https://github.com/dunay2/dvt/pull/2098', repository),
    null
  );
  assert.equal(
    parseGitHubIssueReference('https://github.com/another/dvt/issues/2098', repository),
    null
  );
});

test('projection derives close, reopen, and synchronized states from Planning DB authority', () => {
  const projection = buildGitHubPlanningProjection({
    repository,
    tasks: [
      task('E-DONE', 'done', 1),
      task('A-ACTIVE', 'in_progress', 2),
      task('D-QUEUED', 'queued', 3),
      task('E-ALREADY-DONE', 'done', 4),
    ],
    issues: [issue(1, 'OPEN'), issue(2, 'CLOSED'), issue(3, 'OPEN'), issue(4, 'CLOSED')],
  });

  assert.deepEqual(
    projection.records.map(({ issueNumber, classification, action }) => ({
      issueNumber,
      classification,
      action,
    })),
    [
      { issueNumber: 1, classification: 'close_required', action: 'close' },
      { issueNumber: 2, classification: 'reopen_required', action: 'reopen' },
      { issueNumber: 3, classification: 'synchronized', action: null },
      { issueNumber: 4, classification: 'synchronized', action: null },
    ]
  );
  assert.equal(projection.summary.actionableCount, 2);
});

test('unmapped planning issues are reported while operational incidents are ignored', () => {
  const projection = buildGitHubPlanningProjection({
    repository,
    tasks: [],
    issues: [issue(10, 'OPEN', ['story']), issue(11, 'OPEN', ['ci/cd', 'database'])],
  });

  assert.deepEqual(projection.records, [
    {
      action: null,
      classification: 'unmapped',
      issueNumber: 10,
      issueState: 'OPEN',
      issueUrl: `https://github.com/${repository}/issues/10`,
      taskRefs: [],
      title: 'Issue 10',
    },
  ]);
  assert.equal(projection.summary.unmappedCount, 1);
  assert.equal(projection.summary.ignoredIssueCount, 1);
});

test('multiple effective tasks linked to one issue are ambiguous and never actionable', () => {
  const projection = buildGitHubPlanningProjection({
    repository,
    tasks: [task('A-FIRST', 'done', 20), task('D-SECOND', 'done', 20)],
    issues: [issue(20, 'OPEN')],
  });

  assert.equal(projection.records[0].classification, 'ambiguous');
  assert.equal(projection.records[0].action, null);
  assert.equal(projection.summary.ambiguousCount, 1);
});

test('unknown task or issue states fail closed instead of producing mutations', () => {
  assert.throws(
    () =>
      buildGitHubPlanningProjection({
        repository,
        tasks: [task('A-UNKNOWN', 'archived', 21)],
        issues: [issue(21, 'OPEN')],
      }),
    /Unsupported Planning DB task status "archived"/
  );
  assert.throws(
    () =>
      buildGitHubPlanningProjection({
        repository,
        tasks: [task('A-ACTIVE', 'queued', 22)],
        issues: [issue(22, 'UNKNOWN')],
      }),
    /Unsupported GitHub issue state "UNKNOWN"/
  );
});

test('query rail reads both authorities before building the projection', async () => {
  const calls = [];
  const query = new ListGitHubPlanningProjectionDrift({
    repository,
    taskReader: {
      async readEffectiveTasks() {
        calls.push('tasks');
        return [task('E-DONE', 'done', 30)];
      },
    },
    issueGateway: {
      async listIssues() {
        calls.push('issues');
        return [issue(30, 'OPEN')];
      },
    },
  });

  const projection = await query.execute();

  assert.deepEqual(calls, ['tasks', 'issues']);
  assert.equal(projection.records[0].action, 'close');
});

test('command rail applies only policy-authorized mutations in deterministic order', async () => {
  const mutations = [];
  const command = new ReconcileGitHubPlanningProjection({
    projectionQuery: {
      async execute() {
        return buildGitHubPlanningProjection({
          repository,
          tasks: [task('E-DONE', 'done', 40), task('A-ACTIVE', 'review', 41)],
          issues: [issue(41, 'CLOSED'), issue(40, 'OPEN'), issue(42, 'OPEN', ['task'])],
        });
      },
    },
    issueGateway: {
      async closeIssue(issueNumber, comment) {
        mutations.push(['close', issueNumber, comment]);
      },
      async reopenIssue(issueNumber, comment) {
        mutations.push(['reopen', issueNumber, comment]);
      },
    },
  });

  const receipt = await command.execute();

  assert.deepEqual(
    mutations.map(([action, issueNumber]) => [action, issueNumber]),
    [
      ['close', 40],
      ['reopen', 41],
    ]
  );
  assert.equal(receipt.appliedCount, 2);
  assert.equal(receipt.unmappedCount, 1);
});

test('command rail fails before mutation when explicit links are ambiguous', async () => {
  const mutations = [];
  const command = new ReconcileGitHubPlanningProjection({
    projectionQuery: {
      async execute() {
        return buildGitHubPlanningProjection({
          repository,
          tasks: [task('A-FIRST', 'done', 50), task('D-SECOND', 'done', 50)],
          issues: [issue(50, 'OPEN')],
        });
      },
    },
    issueGateway: {
      async closeIssue(issueNumber) {
        mutations.push(issueNumber);
      },
      async reopenIssue(issueNumber) {
        mutations.push(issueNumber);
      },
    },
  });

  await assert.rejects(() => command.execute(), /GITHUB_PLANNING_PROJECTION_AMBIGUOUS/);
  assert.deepEqual(mutations, []);
});
