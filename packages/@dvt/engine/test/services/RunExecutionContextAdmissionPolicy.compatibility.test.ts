/**
 * Owned concern: verify plugin compatibility fingerprint admission semantics.
 */
import { describe, expect, it } from 'vitest';

import {
  allowBindingPolicy,
  assertDefaultAdmission,
  createAdmissionPolicy,
  makeExecutionPolicy,
  makeRunExecutionContext,
} from './runExecutionContextAdmissionPolicy.fixtures.js';

describe('RunExecutionContextAdmissionPolicy compatibility fingerprint', () => {
  it('rejects pluginCompatibilityFingerprint mismatch against executionPolicy', async () => {
    const policy = createAdmissionPolicy({
      bindingPolicy: allowBindingPolicy,
      runExecutionContext: makeRunExecutionContext({
        pluginCompatibilityFingerprint:
          '2222222222222222222222222222222222222222222222222222222222222222',
      }),
    });

    await expect(assertDefaultAdmission(policy)).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
  });

  it('rejects compatibility-checked plan when resolved context omits fingerprint', async () => {
    const policy = createAdmissionPolicy({
      bindingPolicy: allowBindingPolicy,
      runExecutionContext: makeRunExecutionContext({
        pluginCompatibilityFingerprint: undefined,
      }),
    });

    await expect(assertDefaultAdmission(policy)).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
  });

  it('ignores context fingerprints when executionPolicy has no compatibility fingerprint', async () => {
    const policy = createAdmissionPolicy({
      bindingPolicy: allowBindingPolicy,
      runExecutionContext: makeRunExecutionContext({
        pluginCompatibilityFingerprint:
          '2222222222222222222222222222222222222222222222222222222222222222',
      }),
    });

    await expect(
      assertDefaultAdmission(policy, {
        executionPolicy: makeExecutionPolicy({ pluginCompatibilityFingerprint: undefined }),
      })
    ).resolves.toBeUndefined();
  });
});
