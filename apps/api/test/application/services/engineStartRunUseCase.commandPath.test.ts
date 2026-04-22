import type { StartRunCommand } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

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
      targetAdapter: 'mock',
      selection: ['step_a'],
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
          provider: 'mock' as const,
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
      targetAdapter: 'mock',
    });
  });

  it('drops non-canonical planRef fields before crossing the engine boundary', async () => {
    let capturedPlanRef: unknown;
    const fakeEngine = {
      async startRun(planRef: unknown) {
        capturedPlanRef = planRef;
        return {
          provider: 'mock' as const,
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
          provider: 'mock' as const,
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
      targetAdapter: 'mock',
      runExecutionContextRef: {
        uri: 'dvt-runctx://tenant-1/run-test-1/context.json',
        sha256: 'ctxsha',
        schemaVersion: 'v1.0',
        planId: PLAN_REF.planId,
        planVersion: PLAN_REF.planVersion,
      },
    });
  });
});
