import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  classifyStatusChecks,
  evaluateCheckGate,
  extractFailureSnippet,
  normalizeStatusCheck,
  parseActionsJobDetailsUrl,
  pickFirstFailingGitHubActionsCheck,
} from './pr-check-triage.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('classifyStatusChecks groups GitHub Actions checks by status', () => {
  const buckets = classifyStatusChecks([
    {
      __typename: 'CheckRun',
      name: 'Workspace CI (api)',
      status: 'COMPLETED',
      conclusion: 'SUCCESS',
      workflowName: 'CI - Code Quality',
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/1/job/2',
    },
    {
      __typename: 'CheckRun',
      name: 'Run Tests',
      status: 'IN_PROGRESS',
      conclusion: '',
      workflowName: 'Test Suite',
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/3/job/4',
    },
    {
      __typename: 'CheckRun',
      name: 'PR Quality Checks',
      status: 'COMPLETED',
      conclusion: 'FAILURE',
      workflowName: 'PR Quality Gate',
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/5/job/6',
    },
    {
      __typename: 'CheckRun',
      name: 'No affected workspaces (PR)',
      status: 'COMPLETED',
      conclusion: 'SKIPPED',
      workflowName: 'CI - Code Quality',
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/7/job/8',
    },
  ]);

  assert.equal(buckets.successful.length, 1);
  assert.equal(buckets.pending.length, 1);
  assert.equal(buckets.failed.length, 1);
  assert.equal(buckets.skipped.length, 1);
  assert.equal(buckets.external.length, 0);
});

test('classifyStatusChecks treats non-GitHub Actions checks as report-only external entries', () => {
  const buckets = classifyStatusChecks([
    {
      __typename: 'StatusContext',
      context: 'buildkite / smoke',
      state: 'FAILURE',
      targetUrl: 'https://buildkite.example.com/builds/123',
    },
  ]);

  assert.equal(buckets.failed.length, 0);
  assert.equal(buckets.external.length, 1);
  assert.equal(buckets.external[0]?.name, 'buildkite / smoke');
});

test('pickFirstFailingGitHubActionsCheck selects the earliest completed failing actions check deterministically', () => {
  const selected = pickFirstFailingGitHubActionsCheck([
    {
      __typename: 'CheckRun',
      name: 'Workspace CI (api)',
      status: 'COMPLETED',
      conclusion: 'FAILURE',
      workflowName: 'CI - Code Quality',
      completedAt: '2026-04-01T01:27:44Z',
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/10/job/20',
    },
    {
      __typename: 'StatusContext',
      context: 'external flaky provider',
      state: 'FAILURE',
      targetUrl: 'https://external.example.com/build/1',
    },
    {
      __typename: 'CheckRun',
      name: 'PR Quality Checks',
      status: 'COMPLETED',
      conclusion: 'FAILURE',
      workflowName: 'PR Quality Gate',
      completedAt: '2026-04-01T01:25:37Z',
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/30/job/40',
    },
  ]);

  assert.equal(selected?.name, 'PR Quality Checks');
});

test('normalizeStatusCheck supports status contexts and check runs', () => {
  const statusContext = normalizeStatusCheck({
    __typename: 'StatusContext',
    context: 'external',
    state: 'PENDING',
    targetUrl: 'https://example.com/build/1',
  });

  const checkRun = normalizeStatusCheck({
    __typename: 'CheckRun',
    name: 'Run Tests',
    status: 'COMPLETED',
    conclusion: 'SUCCESS',
    workflowName: 'Test Suite',
    detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/1/job/2',
  });

  assert.equal(statusContext.name, 'external');
  assert.equal(statusContext.status, 'PENDING');
  assert.equal(statusContext.isGitHubActions, false);
  assert.equal(checkRun.name, 'Run Tests');
  assert.equal(checkRun.isGitHubActions, true);
});

test('parseActionsJobDetailsUrl extracts run and job ids from GitHub Actions URLs', () => {
  assert.deepEqual(
    parseActionsJobDetailsUrl('https://github.com/dunay2/dvt/actions/runs/123/job/456'),
    {
      runId: '123',
      jobId: '456',
    }
  );
  assert.equal(parseActionsJobDetailsUrl('https://buildkite.example.com/build/1'), null);
});

test('extractFailureSnippet prefers the first error-oriented lines and limits output', () => {
  const snippet = extractFailureSnippet(
    [
      'prep line',
      'another setup line',
      'ERROR: expected guard to fail fast',
      'stack line 1',
      'stack line 2',
      'stack line 3',
    ].join('\n'),
    { maxLines: 3 }
  );

  assert.equal(
    snippet,
    ['ERROR: expected guard to fail fast', 'stack line 1', 'stack line 2'].join('\n')
  );
});

test('evaluateCheckGate fails fast on failed checks without waiting for pending checks', () => {
  const gate = evaluateCheckGate({
    status: 'ok',
    counts: {
      failed: 1,
      pending: 3,
      successful: 8,
      skipped: 1,
      external: 0,
    },
  });

  assert.deepEqual(gate, {
    status: 'failed',
    exitCode: 1,
    message: '1 failed check, 3 pending checks.',
  });
});

test('evaluateCheckGate reports pending checks as an immediate non-ready state', () => {
  const gate = evaluateCheckGate({
    status: 'ok',
    counts: {
      failed: 0,
      pending: 2,
      successful: 9,
      skipped: 1,
      external: 0,
    },
  });

  assert.deepEqual(gate, {
    status: 'pending',
    exitCode: 2,
    message: '2 pending checks.',
  });
});

test('evaluateCheckGate passes only when GitHub Actions checks are settled and green', () => {
  const gate = evaluateCheckGate({
    status: 'ok',
    counts: {
      failed: 0,
      pending: 0,
      successful: 12,
      skipped: 2,
      external: 1,
    },
  });

  assert.deepEqual(gate, {
    status: 'passed',
    exitCode: 0,
    message: 'All GitHub Actions checks are settled and green.',
  });
});

test('package scripts expose the immediate PR check gate', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8')
  );

  assert.equal(packageJson.scripts['pr:checks'], 'node tools/ci/pr-check-triage.mjs gate');
});
