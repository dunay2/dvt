/** Owned concern: prove the Planning DB MCP adapter admits only the required read-only query argv. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ALLOWED_PLANNING_DB_QUERIES,
  buildPlanningDbQueryInvocation,
} from './planningDbQueryAdapter.mjs';

test('exposes only the seven governance queries required by the current source-first work', () => {
  assert.deepEqual(ALLOWED_PLANNING_DB_QUERIES, [
    'architecture-designs',
    'component-profile',
    'architecture-responsibilities',
    'frontend-component-rails',
    'component-integrity',
    'canvas-cq-rail-drift',
    'canvas-component-registry-drift',
  ]);
});

test('builds a forced no-refresh argv without a shell command string', () => {
  const invocation = buildPlanningDbQueryInvocation({ query: 'architecture-designs', limit: 100 });
  assert.equal(invocation.executable, process.execPath);
  assert.deepEqual(invocation.args.slice(-3), ['--limit', '100', '--no-refresh']);
  assert.equal(invocation.args.includes('--no-refresh'), true);
  assert.equal(invocation.args.some((value) => value.includes('planning:db:import')), false);
});

test('requires an explicit bounded component id only for component-profile', () => {
  assert.throws(
    () => buildPlanningDbQueryInvocation({ query: 'component-profile' }),
    /requires a valid component id/u
  );
  const invocation = buildPlanningDbQueryInvocation({
    query: 'component-profile',
    component: 'SYS-WEB-ROOT',
  });
  assert.deepEqual(invocation.args.slice(-2), ['--component', 'SYS-WEB-ROOT']);
  assert.throws(
    () =>
      buildPlanningDbQueryInvocation({
        query: 'component-integrity',
        component: 'SYS-WEB-ROOT',
      }),
    /component is not supported/u
  );
});

test('rejects unknown queries and unbounded limits before execution', () => {
  assert.throws(() => buildPlanningDbQueryInvocation({ query: 'summary' }), /Unsupported/u);
  assert.throws(
    () => buildPlanningDbQueryInvocation({ query: 'architecture-designs', limit: 201 }),
    /between 1 and 200/u
  );
});
