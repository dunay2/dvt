import {
  asNonBlankString,
  parseExecutionSelection,
  parsePlanRef,
  type RunExecutionContextRef,
  type StartRunCommand,
  type StartRunPlanRef,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/authContract.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

export const PLAN_REF = parsePlanRef({
  uri: 'https://plans.example.com/my-plan.json',
  sha256: 'deadbeef',
  schemaVersion: '1.0.0',
  planId: 'plan-123',
  planVersion: '3.0',
  sizeBytes: 512,
  expiresAt: '2026-04-13T10:00:00.000Z',
});

export function buildAuthorizedContext(
  tenantId = 'tenant-1'
): AuthorizedCommandExecutionContext {
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

export function buildStartRunCommand(): StartRunCommand {
  return {
    planRef: PLAN_REF,
    runId: 'run-test-1',
    targetAdapter: 'mock',
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['step_a', 'step_b'],
    }),
  };
}

export function buildNoisyPlanRef(): StartRunPlanRef & {
  pluginCompatibilityFingerprint: string;
  requiresCapabilities: string[];
} {
  const noisyPlanRef: StartRunPlanRef & {
    pluginCompatibilityFingerprint: string;
    requiresCapabilities: string[];
  } = {
    uri: PLAN_REF.uri,
    sha256: PLAN_REF.sha256,
    schemaVersion: PLAN_REF.schemaVersion,
    planId: PLAN_REF.planId,
    planVersion: PLAN_REF.planVersion,
    pluginCompatibilityFingerprint:
      '1111111111111111111111111111111111111111111111111111111111111111',
    requiresCapabilities: ['basic-execution'],
  };

  if (PLAN_REF.sizeBytes !== undefined) {
    noisyPlanRef.sizeBytes = PLAN_REF.sizeBytes;
  }
  if (PLAN_REF.expiresAt !== undefined) {
    noisyPlanRef.expiresAt = PLAN_REF.expiresAt;
  }

  return noisyPlanRef;
}

export function buildRunExecutionContextRef(): RunExecutionContextRef {
  return {
    uri: asNonBlankString('dvt-runctx://tenant-1/run-test-1/context.json'),
    sha256: asNonBlankString('ctxsha'),
    schemaVersion: asNonBlankString('v1.0'),
    planId: asNonBlankString(PLAN_REF.planId),
    planVersion: asNonBlankString(PLAN_REF.planVersion),
  };
}
