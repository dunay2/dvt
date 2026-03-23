import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateCheckRunResult,
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
