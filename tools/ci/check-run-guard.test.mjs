import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateCheckRunResult,
  listCheckRunsForRef,
  selectLatestCheckRunByName,
  waitForCheckRun,
} from './check-run-guard.mjs';

test('selectLatestCheckRunByName picks newest run for a check name', () => {
  const selected = selectLatestCheckRunByName(
    [
      {
        name: 'Adapter Postgres Smoke',
        status: 'completed',
        conclusion: 'success',
        completed_at: '2026-03-23T10:00:00Z',
      },
      {
        name: 'Adapter Postgres Smoke',
        status: 'completed',
        conclusion: 'failure',
        completed_at: '2026-03-23T09:00:00Z',
      },
      {
        name: 'Other Check',
        status: 'completed',
        conclusion: 'success',
        completed_at: '2026-03-23T11:00:00Z',
      },
    ],
    'Adapter Postgres Smoke',
  );

  assert.equal(selected?.conclusion, 'success');
});

test('selectLatestCheckRunByName is stable when timestamps are invalid', () => {
  const selected = selectLatestCheckRunByName(
    [
      {
        name: 'Adapter Postgres Smoke',
        status: 'completed',
        conclusion: 'failure',
        completed_at: 'invalid-date',
      },
      {
        name: 'Adapter Postgres Smoke',
        status: 'completed',
        conclusion: 'success',
        completed_at: 'also-invalid',
      },
    ],
    'Adapter Postgres Smoke',
  );

  assert.equal(selected?.conclusion, 'failure');
});

test('evaluateCheckRunResult handles not-found, pending, success and failure', () => {
  assert.deepEqual(evaluateCheckRunResult(undefined), { status: 'not_found' });
  assert.equal(evaluateCheckRunResult({ status: 'queued' }).status, 'pending');
  assert.equal(
    evaluateCheckRunResult({ status: 'completed', conclusion: 'success' }).status,
    'success',
  );
  assert.equal(
    evaluateCheckRunResult({ status: 'completed', conclusion: 'timed_out' }).status,
    'failure',
  );
  assert.equal(
    evaluateCheckRunResult({ status: 'completed', conclusion: 'cancelled' }).status,
    'failure',
  );
  assert.equal(
    evaluateCheckRunResult({ status: 'completed', conclusion: 'neutral' }).status,
    'failure',
  );
  assert.equal(
    evaluateCheckRunResult({ status: 'completed', conclusion: 'skipped' }).status,
    'failure',
  );
});

test('evaluateCheckRunResult supports configurable accepted conclusions', () => {
  const result = evaluateCheckRunResult(
    { status: 'completed', conclusion: 'neutral' },
    { acceptedConclusions: ['success', 'neutral'] },
  );
  assert.equal(result.status, 'success');
});

test('waitForCheckRun returns success when check eventually passes', async () => {
  let call = 0;
  const snapshots = [
    [],
    [{ name: 'Adapter Postgres Smoke', status: 'in_progress', started_at: '2026-03-23T10:00:00Z' }],
    [
      {
        name: 'Adapter Postgres Smoke',
        status: 'completed',
        conclusion: 'success',
        completed_at: '2026-03-23T10:01:00Z',
      },
    ],
  ];

  const result = await waitForCheckRun({
    checkName: 'Adapter Postgres Smoke',
    retries: 3,
    delayMs: 0,
    sleep: async () => {},
    fetchRuns: async () => snapshots[call++] ?? [],
  });

  assert.equal(result.ok, true);
});

test('waitForCheckRun returns failed when latest completed check fails', async () => {
  const result = await waitForCheckRun({
    checkName: 'Adapter Postgres Smoke',
    retries: 1,
    delayMs: 0,
    sleep: async () => {},
    fetchRuns: async () => [
      {
        name: 'Adapter Postgres Smoke',
        status: 'completed',
        conclusion: 'failure',
        completed_at: '2026-03-23T10:01:00Z',
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'failed');
});

test('waitForCheckRun returns timeout when check never completes', async () => {
  const result = await waitForCheckRun({
    checkName: 'Adapter Postgres Smoke',
    retries: 2,
    delayMs: 0,
    sleep: async () => {},
    fetchRuns: async () => [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'timeout');
});

test('listCheckRunsForRef throws on non-OK HTTP responses', async () => {
  await assert.rejects(
    () =>
      listCheckRunsForRef({
        owner: 'dunay2',
        repo: 'dvt',
        ref: 'sha',
        token: 'token',
        fetchImpl: async () => ({
          ok: false,
          status: 403,
          text: async () => 'forbidden',
        }),
      }),
    /GitHub Checks API failed \(403\): forbidden/,
  );
});

test('listCheckRunsForRef returns check_runs array on success', async () => {
  const runs = await listCheckRunsForRef({
    owner: 'dunay2',
    repo: 'dvt',
    ref: 'sha',
    token: 'token',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ check_runs: [{ name: 'Adapter Postgres Smoke' }] }),
    }),
  });

  assert.deepEqual(runs, [{ name: 'Adapter Postgres Smoke' }]);
});

test('listCheckRunsForRef follows pagination links', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (calls.length === 1) {
      return {
        ok: true,
        json: async () => ({ check_runs: [{ name: 'first-page' }] }),
        headers: {
          get: (name) =>
            name.toLowerCase() === 'link'
              ? '<https://api.github.com/next?page=2>; rel="next"'
              : null,
        },
      };
    }
    return {
      ok: true,
      json: async () => ({ check_runs: [{ name: 'second-page' }] }),
      headers: { get: () => null },
    };
  };

  const runs = await listCheckRunsForRef({
    owner: 'dunay2',
    repo: 'dvt',
    ref: 'sha',
    token: 'token',
    fetchImpl,
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(runs, [{ name: 'first-page' }, { name: 'second-page' }]);
});
