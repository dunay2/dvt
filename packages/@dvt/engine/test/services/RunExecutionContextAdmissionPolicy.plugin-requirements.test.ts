import { describe, expect, it } from 'vitest';

import {
  EXAMPLE_PLUGIN_STEP_KINDS,
  allowBindingPolicy,
  assertDefaultAdmission,
  createAdmissionPolicy,
  createExampleBindingPolicy,
  createSqlBindingPolicy,
  makeContext,
  makePlan,
  makeRunExecutionContext,
} from './runExecutionContextAdmissionPolicy.fixtures.js';

describe('RunExecutionContextAdmissionPolicy plugin requirements', () => {
  it.each(EXAMPLE_PLUGIN_STEP_KINDS)(
    'rejects %s plans when runExecutionContextRef is missing',
    async (stepKind) => {
      const policy = createAdmissionPolicy({
        bindingPolicy: allowBindingPolicy,
      });

      await expect(
        assertDefaultAdmission(policy, {
          plan: makePlan([stepKind]),
          context: { ...makeContext(), runExecutionContextRef: undefined },
        })
      ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
    }
  );

  it('rejects future SQL plugin plans through the same plugin requirement seam', async () => {
    const policy = createAdmissionPolicy({
      bindingPolicy: createSqlBindingPolicy(),
    });

    await expect(
      assertDefaultAdmission(policy, {
        plan: makePlan(['SQL_TRANSFORM']),
        context: { ...makeContext(), runExecutionContextRef: undefined },
      })
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_CONTEXT_REJECTED' });
  });

  it('rejects plugin-bearing plans when the resolved context omits the required context', async () => {
    const policy = createAdmissionPolicy({
      bindingPolicy: allowBindingPolicy,
      runExecutionContext: makeRunExecutionContext({
        pluginContexts: {},
      }),
    });

    await expect(assertDefaultAdmission(policy)).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
  });

  it('rejects plugin-bearing plans when artifact tenantId mismatches the run context', async () => {
    const policy = createAdmissionPolicy({
      bindingPolicy: allowBindingPolicy,
      runExecutionContext: makeRunExecutionContext({
        pluginContexts: {
          example: {
            artifactRef: {
              uri: `s3://bundle-bucket/tenants/tenant-b/${'b'.repeat(64)}`,
              kind: 'example-plugin-artifact',
              sha256: 'b'.repeat(64),
              tenantId: 'tenant-b',
            },
          },
        },
      }),
    });

    await expect(assertDefaultAdmission(policy)).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
  });

  it('rejects plugin-bearing plans when the binding policy rejects the artifact locator', async () => {
    const policy = createAdmissionPolicy({
      bindingPolicy: createExampleBindingPolicy(() => {
        throw new TypeError('plugin artifact bucket mismatch: expected=canonical actual=foreign');
      }),
      runExecutionContext: makeRunExecutionContext(),
    });

    await expect(assertDefaultAdmission(policy)).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
      messageParams: {
        reason: 'plugin artifact bucket mismatch: expected=canonical actual=foreign',
      },
    });
  });
});
