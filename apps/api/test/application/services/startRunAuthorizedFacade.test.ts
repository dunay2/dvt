import { describe, it, expect, vi } from 'vitest';

import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
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
  it('returns unauthenticated as ok=true value and does not call use case', async () => {
    const telemetry = { recordStartRunLatency: vi.fn() };
    const execute = vi.fn(async () => {
      throw new Error('should not be called');
    });
    const facade = new StartRunAuthorizedFacade(
      {
        async authenticateBearerToken() {
          return { ok: false as const, code: 'MISSING_TOKEN' as const };
        },
      } as never,
      {
        async authorize() {
          throw new Error('should not be called');
        },
      } as never,
      {
        execute,
      } as never,
      telemetry as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'unauthenticated',
        code: 'MISSING_TOKEN',
      },
    });
    expect(execute).not.toHaveBeenCalled();
    expect(telemetry.recordStartRunLatency).toHaveBeenCalledTimes(1);
    expect(telemetry.recordStartRunLatency.mock.calls[0]?.[1]).toBe('unauthenticated');
  });

  it('returns unauthorized as ok=true value and does not call use case', async () => {
    const execute = vi.fn(async () => {
      throw new Error('should not be called');
    });
    const facade = new StartRunAuthorizedFacade(
      {
        async authenticateBearerToken() {
          return { ok: true as const, principal: AUTHENTICATED_PRINCIPAL };
        },
      } as never,
      {
        async authorize() {
          return { ok: false as const, reason: 'TENANT_NOT_GRANTED' as const };
        },
      } as never,
      {
        execute,
      } as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'unauthorized',
        reason: 'TENANT_NOT_GRANTED',
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns accepted when auth and use case succeed', async () => {
    const telemetry = { recordStartRunLatency: vi.fn() };
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
      } as never,
      telemetry as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'accepted',
        runId: 'run-1',
        accepted: true,
      },
    });
    expect(telemetry.recordStartRunLatency).toHaveBeenCalledTimes(1);
    expect(telemetry.recordStartRunLatency.mock.calls[0]?.[1]).toBe('accepted');
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
      ok: true,
      value: {
        kind: 'duplicate',
        runId: 'run-1',
        accepted: true,
        duplicateOf: 'intent',
      },
    });
  });

  it('passes through adapter_not_registered engine error', async () => {
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
      ok: false,
      error: {
        kind: 'adapter_not_registered',
        adapter: 'temporal',
      },
    });
  });

  it('passes through unsupported_plan_version engine error', async () => {
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
              supportedVersions: ['1.0'] as const,
            },
          };
        },
      } as never
    );

    const result = await facade.execute(INPUT);
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'unsupported_plan_version',
        planVersion: '2.7',
        supportedVersions: ['1.0'],
      },
    });
  });

  it('passes through command_invalid engine error', async () => {
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
      ok: false,
      error: {
        kind: 'command_invalid',
        code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
        reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
      },
    });
  });

  it('rethrows unrelated use case errors', async () => {
    const telemetry = { recordStartRunLatency: vi.fn() };
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
      } as never,
      telemetry as never
    );

    await expect(() => facade.execute(INPUT)).rejects.toThrow(/engine unavailable/);
    expect(telemetry.recordStartRunLatency).toHaveBeenCalledTimes(1);
    expect(telemetry.recordStartRunLatency.mock.calls[0]?.[1]).toBe('exception');
  });
});
