import { describe, it, expect } from 'vitest';

import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
  START_RUN_PLAN_REJECTION_CODE,
} from '../../../src/application/ports/startRunContract.js';
import { StartRunAuthorizedFacade } from '../../../src/application/services/startRunAuthorizedFacade.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const AUTHENTICATED_PRINCIPAL = {
  principalId: 'user-1',
  principalType: 'user' as const,
  subjectId: 'subject-1',
  issuer: 'https://issuer.example/',
  audience: 'dvt-api',
  expiresAt: new Date('2026-03-14T00:00:00Z'),
  rawScopes: [],
  assertedTenantIds: [],
  assertedProjectIds: [],
};

const AUTHORIZED_CONTEXT = {
  principal: AUTHENTICATED_PRINCIPAL,
  scope: {
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-14T00:00:00Z'),
};

const INPUT = {
  token: 'token',
  requestId: 'req-1',
  command: {
    planRef: {
      uri: 'https://plans.example.com/plan.json',
      sha256: 'deadbeef',
      schemaVersion: '1.0.0',
      planId: 'plan-1',
      planVersion: '2.0',
    },
    runId: 'run-1',
    targetAdapter: 'temporal' as const,
    selection: ['step_a'],
  },
  requestedScope: {
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
    action: { kind: 'command' as const, name: 'run:start' as const },
  },
};

describe('StartRunAuthorizedFacade', () => {
  it('returns accepted when auth and use case succeed', async () => {
    const facade = new StartRunAuthorizedFacade(
      {
        async authenticateBearerToken() {
          return { ok: true as const, principal: AUTHENTICATED_PRINCIPAL };
        },
      } as never,
      {
        async authorize() {
          return { ok: true as const, context: AUTHORIZED_CONTEXT };
        },
      } as never,
      {
        async execute() {
          return {
            ok: true as const,
            value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
          };
        },
      } as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      kind: 'accepted',
      runId: 'run-1',
      accepted: true,
    });
  });

  it('preserves duplicate result from the use case', async () => {
    const facade = new StartRunAuthorizedFacade(
      {
        async authenticateBearerToken() {
          return { ok: true as const, principal: AUTHENTICATED_PRINCIPAL };
        },
      } as never,
      {
        async authorize() {
          return { ok: true as const, context: AUTHORIZED_CONTEXT };
        },
      } as never,
      {
        async execute() {
          return {
            ok: true as const,
            value: {
              kind: 'duplicate' as const,
              runId: 'run-1',
              accepted: true,
              duplicateOf: 'intent' as const,
            },
          };
        },
      } as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      kind: 'duplicate',
      runId: 'run-1',
      accepted: true,
      duplicateOf: 'intent',
    });
  });

  it('maps adapter_not_registered engine error to adapter_not_configured', async () => {
    const facade = new StartRunAuthorizedFacade(
      {
        async authenticateBearerToken() {
          return { ok: true as const, principal: AUTHENTICATED_PRINCIPAL };
        },
      } as never,
      {
        async authorize() {
          return { ok: true as const, context: AUTHORIZED_CONTEXT };
        },
      } as never,
      {
        async execute() {
          return {
            ok: false as const,
            error: { kind: 'adapter_not_registered' as const, adapter: 'temporal' },
          };
        },
      } as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      kind: 'adapter_not_configured',
      adapter: 'temporal',
    });
  });

  it('maps unsupported_plan_version engine error to plan_rejected', async () => {
    const facade = new StartRunAuthorizedFacade(
      {
        async authenticateBearerToken() {
          return { ok: true as const, principal: AUTHENTICATED_PRINCIPAL };
        },
      } as never,
      {
        async authorize() {
          return { ok: true as const, context: AUTHORIZED_CONTEXT };
        },
      } as never,
      {
        async execute() {
          return {
            ok: false as const,
            error: {
              kind: 'unsupported_plan_version' as const,
              planVersion: '2.7',
              supportedVersions: ['2.3'] as const,
            },
          };
        },
      } as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      kind: 'plan_rejected',
      accepted: false,
      code: 'UNSUPPORTED_PLAN_VERSION',
      reason: 'Unsupported plan version: 2.7',
      supportedVersions: ['2.3'],
    });
  });

  it('maps command_invalid engine error to plan_rejected', async () => {
    const facade = new StartRunAuthorizedFacade(
      {
        async authenticateBearerToken() {
          return { ok: true as const, principal: AUTHENTICATED_PRINCIPAL };
        },
      } as never,
      {
        async authorize() {
          return { ok: true as const, context: AUTHORIZED_CONTEXT };
        },
      } as never,
      {
        async execute() {
          return {
            ok: false as const,
            error: {
              kind: 'command_invalid' as const,
              code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
              reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
            },
          };
        },
      } as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      kind: 'plan_rejected',
      accepted: false,
      code: START_RUN_PLAN_REJECTION_CODE.rejected,
      reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
      cause: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
    });
  });

  it('rethrows unrelated use case errors', async () => {
    const facade = new StartRunAuthorizedFacade(
      {
        async authenticateBearerToken() {
          return { ok: true as const, principal: AUTHENTICATED_PRINCIPAL };
        },
      } as never,
      {
        async authorize() {
          return { ok: true as const, context: AUTHORIZED_CONTEXT };
        },
      } as never,
      {
        async execute() {
          throw new Error('engine unavailable');
        },
      } as never
    );

    await expect(() => facade.execute(INPUT)).rejects.toThrow(/engine unavailable/);
  });
});
