/**
 * Owned concern: verify resolved run-execution-context provenance alignment.
 */
import { describe, expect, it } from 'vitest';

import {
  allowBindingPolicy,
  assertDefaultAdmission,
  createAdmissionPolicy,
  makeRunExecutionContext,
} from './runExecutionContextAdmissionPolicy.fixtures.js';

describe('RunExecutionContextAdmissionPolicy provenance alignment', () => {
  it('rejects when runExecutionContextRef is provided without resolver', async () => {
    const policy = createAdmissionPolicy();

    await expect(assertDefaultAdmission(policy)).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
  });

  it.each([
    ['tenantId', makeRunExecutionContext({ tenantId: 'tenant-b' })],
    ['projectId', makeRunExecutionContext({ projectId: 'project-b' })],
    ['environmentId', makeRunExecutionContext({ environmentId: 'staging' })],
    ['planId', makeRunExecutionContext({ planId: 'plan-2' })],
    ['planVersion', makeRunExecutionContext({ planVersion: '2.0' })],
    ['planSha256', makeRunExecutionContext({ planSha256: 'different-sha' })],
  ])('rejects %s mismatch', async (_field, runExecutionContext) => {
    const policy = createAdmissionPolicy({
      bindingPolicy: allowBindingPolicy,
      runExecutionContext,
    });

    await expect(assertDefaultAdmission(policy)).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
  });
});
