import { parseExecutionSelection, type StartRunCommand } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
} from '../../../src/application/ports/startRunEngineError.js';
import { EngineStartRunUseCase } from '../../../src/application/services/engineStartRunUseCase.js';

import {
  buildAuthorizedContext,
  buildNoisyPlanRef,
  buildRunExecutionContextRef,
  buildStartRunCommand,
  PLAN_REF,
} from './engineStartRunUseCase.test.support.js';

describe('EngineStartRunUseCase command path', () => {
  it('returns command_invalid result when planRef is missing', async () => {
    const useCase = new EngineStartRunUseCase({} as never);
    const commandWithoutPlanRef: StartRunCommand = {
      runId: 'run-test-1',
      targetAdapter: 'temporal',
      selection: parseExecutionSelection({ mode: 'explicit', nodeIds: ['step_a'] }),
    };

    const result = await useCase.execute(commandWithoutPlanRef, buildAuthorizedContext());
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'command_invalid',
        code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
        reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
      },
    });
  });

  it('calls engine.startRun with canonical plan ref and run context', async () => {
    let capturedPlanRef: unknown;
    let capturedRunContext: unknown;

    const fakeEngine = {
      async startRun(planRef: unknown, runContext: unknown) {
        capturedPlanRef = planRef;
        capturedRunContext = runContext;
        return {
          provider: 'temporal' as const,
          tenantId: 'tenant-1',
          workflowId: 'wf-1',
          runId: 'run-test-1',
        };
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    const result = await useCase.execute(buildStartRunCommand(), buildAuthorizedContext());

    expect(result).toEqual({
      ok: true,
      value: { kind: 'accepted', runId: 'run-test-1', accepted: true },
    });
    expect(capturedPlanRef).toEqual(PLAN_REF);
    expect(capturedRunContext).toEqual({
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      runId: 'run-test-1',
      targetAdapter: 'temporal',
    });
  });

  it.each(['projectId', 'environmentId'] as const)(
    'rejects an authorized context without %s before dispatching to the engine',
    async (field) => {
      const startRun = vi.fn();
      const context = buildAuthorizedContext();
      const useCase = new EngineStartRunUseCase({ startRun } as never);

      await expect(
        useCase.execute(buildStartRunCommand(), {
          ...context,
          scope: { ...context.scope, [field]: undefined },
        } as never)
      ).rejects.toThrow(`START_RUN_SCOPE_MISSING: ${field}`);
      expect(startRun).not.toHaveBeenCalled();
    }
  );

  it('drops non-canonical planRef fields before crossing the engine boundary', async () => {
    let capturedPlanRef: unknown;
    const fakeEngine = {
      async startRun(planRef: unknown) {
        capturedPlanRef = planRef;
        return {
          provider: 'temporal' as const,
          tenantId: 'tenant-1',
          workflowId: 'wf-1',
          runId: 'run-test-1',
        };
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    await useCase.execute(
      {
        ...buildStartRunCommand(),
        planRef: buildNoisyPlanRef(),
      },
      buildAuthorizedContext()
    );

    expect(capturedPlanRef).toEqual(PLAN_REF);
  });

  it('passes runExecutionContextRef through to engine RunContext', async () => {
    let capturedRunContext: unknown;

    const fakeEngine = {
      async startRun(_planRef: unknown, runContext: unknown) {
        capturedRunContext = runContext;
        return {
          provider: 'temporal' as const,
          tenantId: 'tenant-1',
          workflowId: 'wf-1',
          runId: 'run-test-1',
        };
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    await useCase.execute(
      {
        ...buildStartRunCommand(),
        runExecutionContextRef: buildRunExecutionContextRef(),
      },
      buildAuthorizedContext()
    );

    expect(capturedRunContext).toEqual({
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      runId: 'run-test-1',
      targetAdapter: 'temporal',
      runExecutionContextRef: {
        uri: 'dvt-runctx://tenant-1/run-test-1/context.json',
        sha256: 'c'.repeat(64),
        schemaVersion: 'v1.0',
        planId: PLAN_REF.planId,
        planVersion: PLAN_REF.planVersion,
      },
    });
  });
});
