const assert = require('node:assert/strict');
const test = require('node:test');

const {
  GitHubCliIssueGateway,
  PlanningDbEffectiveTaskReader,
  parseCliArguments,
  runGitHubPlanningProjection,
} = require('./planning-github-status-projection.cjs');

test('CLI parser keeps query and command modes explicit', () => {
  assert.deepEqual(parseCliArguments(['check']), {
    mode: 'check',
    repository: 'dunay2/dvt',
  });
  assert.deepEqual(parseCliArguments(['reconcile', '--repository', 'owner/repo']), {
    mode: 'reconcile',
    repository: 'owner/repo',
  });
  assert.throws(() => parseCliArguments(['apply']), /Expected check or reconcile/);
});

test('Planning DB reader maps effective task rows without changing task authority', async () => {
  const queries = [];
  const reader = new PlanningDbEffectiveTaskReader({
    async query(sql) {
      queries.push(sql);
      return {
        rows: [
          {
            lane_id: 'E',
            task_id: 'E-DONE',
            status: 'done',
            evidence_refs: ['https://github.com/dunay2/dvt/issues/2098'],
          },
        ],
      };
    },
  });

  assert.deepEqual(await reader.readEffectiveTasks(), [
    {
      laneId: 'E',
      taskId: 'E-DONE',
      status: 'done',
      evidenceRefs: ['https://github.com/dunay2/dvt/issues/2098'],
    },
  ]);
  assert.match(queries[0], /planning_query_store\.planning_effective_tasks/);
});

test('GitHub gateway scopes reads and writes to the configured repository', async () => {
  const calls = [];
  const gateway = new GitHubCliIssueGateway({
    repository: 'owner/repo',
    runGh(args) {
      calls.push(args);
      if (args[0] === 'issue' && args[1] === 'list') {
        return JSON.stringify([
          {
            number: 7,
            state: 'OPEN',
            title: 'Task',
            url: 'https://github.com/owner/repo/issues/7',
            labels: [{ name: 'task' }],
          },
        ]);
      }
      return '';
    },
  });

  assert.deepEqual(await gateway.listIssues(), [
    {
      number: 7,
      state: 'OPEN',
      title: 'Task',
      url: 'https://github.com/owner/repo/issues/7',
      labels: ['task'],
    },
  ]);
  await gateway.closeIssue(7, 'closed from Planning DB');
  await gateway.reopenIssue(8, 'reopened from Planning DB');

  assert.deepEqual(calls, [
    [
      'issue',
      'list',
      '--repo',
      'owner/repo',
      '--state',
      'all',
      '--limit',
      '1000',
      '--json',
      'number,state,title,url,labels',
    ],
    [
      'issue',
      'close',
      '7',
      '--repo',
      'owner/repo',
      '--reason',
      'completed',
      '--comment',
      'closed from Planning DB',
    ],
    ['issue', 'reopen', '8', '--repo', 'owner/repo', '--comment', 'reopened from Planning DB'],
  ]);
});

test('check mode returns the read model without mutating GitHub', async () => {
  const output = [];
  const result = await runGitHubPlanningProjection({
    mode: 'check',
    repository: 'dunay2/dvt',
    taskReader: {
      async readEffectiveTasks() {
        return [];
      },
    },
    issueGateway: {
      async listIssues() {
        return [];
      },
      async closeIssue() {
        throw new Error('must not close');
      },
      async reopenIssue() {
        throw new Error('must not reopen');
      },
    },
    writeOutput(value) {
      output.push(value);
    },
  });

  assert.equal(result.summary.actionableCount, 0);
  assert.equal(JSON.parse(output[0]).repository, 'dunay2/dvt');
});

test('runner rejects unknown modes before reading or mutating either authority', async () => {
  let authorityAccessed = false;

  await assert.rejects(
    () =>
      runGitHubPlanningProjection({
        mode: 'apply',
        repository: 'dunay2/dvt',
        taskReader: {
          async readEffectiveTasks() {
            authorityAccessed = true;
            return [];
          },
        },
        issueGateway: {
          async listIssues() {
            authorityAccessed = true;
            return [];
          },
          async closeIssue() {
            authorityAccessed = true;
          },
          async reopenIssue() {
            authorityAccessed = true;
          },
        },
      }),
    /Expected check or reconcile/
  );

  assert.equal(authorityAccessed, false);
});
