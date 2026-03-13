import assert from 'node:assert/strict';
import test from 'node:test';

import { EngineStartRunUseCase } from '../../../src/application/services/engineStartRunUseCase.js';
import type { AuthorizedCommandExecutionContext, StartRunCommand } from '../../../src/application/ports/auth.js';
import { TenantId, ProjectId, EnvironmentId } from '../../../src/domain/auth/types.js';

const PLAN_REF = {
  uri: 'https://plans.example.com/my-plan.json',
  sha256: 'deadbeef',
  schemaVersion: '1.0.0',
  planId: 'plan-123',
  planVersion: '3.0',
};

function mkContext(tenantId = 'tenant-1'): AuthorizedCommandExecutionContext {
  return {
    principal: {
      principalId: 'user-1',
      principalType: 'user',
      subjectId: 'sub-1',
      issuer: 'https://issuer.example/',
      audience: 'dvt-api',
      expiresAt: new Date(Date.now() + 3600000),
      rawScopes: [],
      assertedTenantIds: [],
      assertedProjectIds: [],
    },
    scope: {
      tenantId: TenantId.unsafe(tenantId),
      projectId: ProjectId.unsafe('proj-1'),
      environmentId: EnvironmentId.unsafe('env-1'),
    },
    action: { kind: 'command', name: 'run:start' },
    requestId: 'req-test-1',
    authorizedAt: new Date(),
  };
}

function mkCommand(): StartRunCommand {
  return {
    planRef: PLAN_REF,
    runId: 'run-test-1',
    targetAdapter: 'mock',
    selection: ['step_a', 'step_b'],
  };
}

await test('EngineStartRunUseCase calls engine.startRun with plan ref and run context', async () => {
  let capturedPlanRef: unknown;
  let capturedRunContext: unknown;

  const fakeEngine = {
    async startRun(planRef: unknown, runContext: unknown) {
      capturedPlanRef = planRef;
      capturedRunContext = runContext;
      return { provider: 'mock' as const, tenantId: 'tenant-1', workflowId: 'wf-1', runId: 'run-test-1' };
    },
  };

  const useCase = new EngineStartRunUseCase(fakeEngine as never);
  const result = await useCase.execute(mkCommand(), mkContext());

  assert.deepEqual(result, { runId: 'run-test-1', accepted: true });
  assert.deepEqual(capturedPlanRef, PLAN_REF);
  assert.deepEqual(capturedRunContext, {
    tenantId: 'tenant-1',
    projectId: 'proj-1',
    environmentId: 'env-1',
    runId: 'run-test-1',
    targetAdapter: 'mock',
    logicalAttemptId: 1,
  });
});

await test('EngineStartRunUseCase propagates engine errors', async () => {
  const fakeEngine = {
    async startRun() {
      throw new Error('engine unavailable');
    },
  };

  const useCase = new EngineStartRunUseCase(fakeEngine as never);
  await assert.rejects(() => useCase.execute(mkCommand(), mkContext()), /engine unavailable/);
});
