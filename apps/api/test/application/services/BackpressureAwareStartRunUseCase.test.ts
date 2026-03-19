import { describe, expect, it, vi } from 'vitest';

import { BackpressureAwareStartRunUseCase } from '../../../src/application/services/BackpressureAwareStartRunUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const COMMAND = {
  planRef: {
    uri: 'https://plans.example.com/plan.json',
    sha256: 'deadbeef',
    schemaVersion: '1.0.0',
    planId: 'plan-1',
    planVersion: '2.0',
  },
  runId: 'run-1',
  targetAdapter: 'mock' as const,
  selection: ['step_a'],
};

const CONTEXT = {
  principal: {
    principalId: 'user-1',
    principalType: 'user' as const,
    subjectId: 'subject-1',
    issuer: 'https://issuer.example/',
    audience: 'dvt-api',
    expiresAt: new Date('2026-03-14T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: [],
    assertedProjectIds: [],
  },
  scope: {
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-14T00:00:00Z'),
};

describe('BackpressureAwareStartRunUseCase', () => {
  it('runs duplicate probe before admission and delegate', async () => {
    const calls: string[] = [];
    const useCase = new BackpressureAwareStartRunUseCase({
      duplicateProbe: {
        async findExisting() {
          calls.push('duplicate');
          return { kind: 'not_found' as const };
        },
      },
      admissionGuard: {
        async assertAdmissible() {
          calls.push('admission');
        },
      },
      telemetry: {
        async recordDecision() {
          calls.push('telemetry');
        },
      },
      mode: 'enforce',
      retryAfterSeconds: 30,
      delegate: {
        async execute() {
          calls.push('delegate');
          return { kind: 'accepted' as const, runId: 'run-1', accepted: true };
        },
      },
    });

    const result = await useCase.execute(COMMAND, CONTEXT);
    expect(result).toEqual({ kind: 'accepted', runId: 'run-1', accepted: true });
    expect(calls).toEqual(['duplicate', 'admission', 'delegate', 'telemetry']);
  });

  it('returns duplicate before admission and delegate', async () => {
    const admissionGuard = { assertAdmissible: vi.fn() };
    const delegate = { execute: vi.fn() };
    const telemetry = { recordDecision: vi.fn().mockResolvedValue(undefined) };
    const useCase = new BackpressureAwareStartRunUseCase({
      duplicateProbe: {
        async findExisting() {
          return { kind: 'found_intent' as const, runId: 'run-1' };
        },
      },
      admissionGuard,
      telemetry,
      mode: 'enforce',
      retryAfterSeconds: 30,
      delegate: delegate as never,
    });

    const result = await useCase.execute(COMMAND, CONTEXT);
    expect(result).toEqual({
      kind: 'duplicate',
      runId: 'run-1',
      accepted: true,
      duplicateOf: 'intent',
    });
    expect(admissionGuard.assertAdmissible).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
    expect(telemetry.recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'duplicate',
        duplicateOf: 'intent',
      })
    );
  });

  it('returns tenant backpressure in enforce mode and does not call delegate', async () => {
    const delegate = { execute: vi.fn() };
    const useCase = new BackpressureAwareStartRunUseCase({
      duplicateProbe: {
        async findExisting() {
          return { kind: 'not_found' as const };
        },
      },
      admissionGuard: {
        async assertAdmissible() {
          throw Object.assign(new Error('tenant pressure'), { code: 'TENANT_BACKPRESSURE' });
        },
      },
      telemetry: {
        async recordDecision() {
          return undefined;
        },
      },
      mode: 'enforce',
      retryAfterSeconds: 30,
      delegate: delegate as never,
    });

    const result = await useCase.execute(COMMAND, CONTEXT);
    expect(result).toEqual({
      kind: 'tenant_backpressure',
      accepted: false,
      code: 'TENANT_BACKPRESSURE',
      retryAfterSeconds: 30,
    });
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('returns system backpressure in enforce mode on snapshot failure', async () => {
    const delegate = { execute: vi.fn() };
    const useCase = new BackpressureAwareStartRunUseCase({
      duplicateProbe: {
        async findExisting() {
          return { kind: 'not_found' as const };
        },
      },
      admissionGuard: {
        async assertAdmissible() {
          throw Object.assign(new Error('snapshot unavailable'), {
            code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
          });
        },
      },
      telemetry: {
        async recordDecision() {
          return undefined;
        },
      },
      mode: 'enforce',
      retryAfterSeconds: 45,
      delegate: delegate as never,
    });

    const result = await useCase.execute(COMMAND, CONTEXT);
    expect(result).toEqual({
      kind: 'system_backpressure',
      accepted: false,
      code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
      retryAfterSeconds: 45,
    });
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('observe mode records hypothetical reject and still delegates', async () => {
    const delegate = {
      execute: vi.fn().mockResolvedValue({
        kind: 'accepted' as const,
        runId: 'run-1',
        accepted: true,
      }),
    };
    const telemetry = { recordDecision: vi.fn().mockResolvedValue(undefined) };
    const useCase = new BackpressureAwareStartRunUseCase({
      duplicateProbe: {
        async findExisting() {
          return { kind: 'not_found' as const };
        },
      },
      admissionGuard: {
        async assertAdmissible() {
          throw Object.assign(new Error('system pressure'), { code: 'SYSTEM_BACKPRESSURE' });
        },
      },
      telemetry,
      mode: 'observe',
      retryAfterSeconds: 30,
      delegate: delegate as never,
    });

    const result = await useCase.execute(COMMAND, CONTEXT);
    expect(result).toEqual({ kind: 'accepted', runId: 'run-1', accepted: true });
    expect(delegate.execute).toHaveBeenCalledOnce();
    expect(telemetry.recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'would_reject_system',
        code: 'SYSTEM_BACKPRESSURE',
      })
    );
  });
});
