import { describe, expect, it } from 'vitest';

import {
  allowBindingPolicy,
  assertDefaultAdmission,
  createAdmissionPolicy,
  makeContext,
  makeExecutionPolicy,
  makePlan,
  makeRunExecutionContext,
} from './runExecutionContextAdmissionPolicy.fixtures.js';

describe('RunExecutionContextAdmissionPolicy acceptance', () => {
  it('accepts aligned plan/context/runExecutionContext', async () => {
    const policy = createAdmissionPolicy({
      bindingPolicy: allowBindingPolicy,
      runExecutionContext: makeRunExecutionContext(),
    });

    await expect(assertDefaultAdmission(policy)).resolves.toBeUndefined();
  });

  it('accepts non-plugin plans without a runExecutionContextRef', async () => {
    const policy = createAdmissionPolicy();

    await expect(
      assertDefaultAdmission(policy, {
        plan: makePlan(['POSTGRES_SQL_TRANSFORM']),
        executionPolicy: makeExecutionPolicy(),
        context: { ...makeContext(), runExecutionContextRef: undefined },
      })
    ).resolves.toBeUndefined();
  });

  it('allows plugin-shaped plans when no matching plugin requirement is configured', async () => {
    const policy = createAdmissionPolicy({
      runExecutionContext: makeRunExecutionContext(),
    });

    await expect(assertDefaultAdmission(policy)).resolves.toBeUndefined();
  });
});
