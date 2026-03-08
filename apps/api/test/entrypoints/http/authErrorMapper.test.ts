import assert from 'node:assert/strict';
import test from 'node:test';

import { mapStartRunFacadeResult } from '../../../src/entrypoints/http/authErrorMapper.js';

await test('mapStartRunFacadeResult: unauthenticated → 401', () => {
  const result = mapStartRunFacadeResult({ kind: 'unauthenticated', code: 'MISSING_TOKEN' });
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: 'UNAUTHORIZED', code: 'MISSING_TOKEN' });
});

await test('mapStartRunFacadeResult: unauthorized → 403', () => {
  const result = mapStartRunFacadeResult({ kind: 'unauthorized', reason: 'TENANT_NOT_GRANTED' });
  assert.equal(result.status, 403);
  assert.deepEqual(result.body, { error: 'FORBIDDEN', code: 'TENANT_NOT_GRANTED' });
});

await test('mapStartRunFacadeResult: accepted → 202 with runId', () => {
  const result = mapStartRunFacadeResult({
    kind: 'accepted',
    result: { runId: 'r-abc', accepted: true },
  });
  assert.equal(result.status, 202);
  assert.deepEqual(result.body, { runId: 'r-abc', accepted: true });
});
