import assert from 'node:assert/strict';
import test from 'node:test';

import { AdapterNotRegisteredError } from '@dvt/engine';

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

await test('StartRunAuthorizedFacade returns accepted when auth and use case succeed', async () => {
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
        return { runId: 'run-1', accepted: true };
      },
    } as never
  );

  const result = await facade.execute(INPUT);
  assert.deepEqual(result, {
    kind: 'accepted',
    result: { runId: 'run-1', accepted: true },
  });
});

await test('StartRunAuthorizedFacade maps AdapterNotRegisteredError to adapter_not_configured', async () => {
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
        throw new AdapterNotRegisteredError('temporal');
      },
    } as never
  );

  const result = await facade.execute(INPUT);
  assert.deepEqual(result, {
    kind: 'adapter_not_configured',
    adapter: 'temporal',
  });
});

await test('StartRunAuthorizedFacade rethrows unrelated use case errors', async () => {
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

  await assert.rejects(() => facade.execute(INPUT), /engine unavailable/);
});
