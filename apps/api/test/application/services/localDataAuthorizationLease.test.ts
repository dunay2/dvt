import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  AUTHORIZATION_ACTION_NAME,
  buildEnvironmentAccessScope,
  toExecutionScope,
  type AccessDecision,
  type DeniedReason,
  type IAccessDecisionService,
  type RequestedScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthAuditEvent } from '../../../src/application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import {
  LocalDataAuthorizationError,
  LocalDataAuthorizationLease,
  type LocalDataOperation,
} from '../../../src/application/services/localDataAuthorizationLease.js';
import {
  EnvironmentId,
  ProjectId,
  TenantId,
  type AuthenticatedPrincipal,
} from '../../../src/domain/auth/types.js';

const INITIAL_TIME = Date.parse('2026-10-17T00:00:00.000Z');
const action = AUTHORIZATION_ACTION_NAME;
const localActions = [
  action.workspaceLocalDataView,
  action.workspaceLocalDataCapture,
  action.workspaceLocalDataDelete,
];

/** Controlled decision/audit ports; the AuthorizeCommandScopeService itself is real. */
function fixture(operation: LocalDataOperation = 'capture'): {
  input: {
    principal: {
      principalId: string;
      principalType: 'user';
      subjectId: string;
      issuer: string;
      audience: string;
      tokenId: string;
      expiresAt: Date;
      rawScopes: string[];
      assertedTenantIds: string[];
      assertedProjectIds: string[];
    };
    scope: import('../../../src/application/ports/accessDecisionScopes.js').EnvironmentAccessScope;
    operation: LocalDataOperation;
    requestId: string;
  };
  allowed: Set<string>;
  requests: RequestedScope[][];
  identities: string[];
  principals: AuthenticatedPrincipal[];
  events: AuthAuditEvent[];
  control: {
    beforeDecision: () => Promise<void>;
    beforeAudit: () => Promise<void>;
    denial: DeniedReason | undefined;
    wrongScope: 'tenant' | 'project' | 'environment' | 'resource' | undefined;
    wrongLength: boolean;
    changeRequest: boolean;
  };
  authorizer: AuthorizeCommandScopeService;
  setNow: (value: number) => void;
  open: () => Promise<LocalDataAuthorizationLease>;
} {
  let now = INITIAL_TIME;
  const principal = {
    principalId: 'user-1',
    principalType: 'user' as const,
    subjectId: 'subject-1',
    issuer: 'issuer',
    audience: 'dvt-api',
    tokenId: 'jti-1',
    expiresAt: new Date(INITIAL_TIME + 60_000),
    rawScopes: [] as string[],
    assertedTenantIds: ['tenant-1'],
    assertedProjectIds: ['project-1'],
  };
  const scope = buildEnvironmentAccessScope(
    TenantId.unsafe('tenant-1'),
    ProjectId.unsafe('project-1'),
    EnvironmentId.unsafe('environment-1')
  );
  const allowed = new Set<string>([...localActions, action.workspaceSourceImportView]);
  const requests: RequestedScope[][] = [];
  const identities: string[] = [];
  const principals: AuthenticatedPrincipal[] = [];
  const events: AuthAuditEvent[] = [];
  const control = {
    beforeDecision: async (): Promise<void> => {},
    beforeAudit: async (): Promise<void> => {},
    denial: undefined as DeniedReason | undefined,
    wrongScope: undefined as 'tenant' | 'project' | 'environment' | 'resource' | undefined,
    wrongLength: false,
    changeRequest: false,
  };
  const decideMany: IAccessDecisionService['decideMany'] = async (who, scopes) => {
    requests.push([...scopes]);
    identities.push(who.principalId);
    principals.push(who);
    await control.beforeDecision();
    if (control.wrongLength) return [];
    if (control.changeRequest) {
      (scopes[0]!.tenantId as { value: string }).value = 'other-tenant';
    }
    return scopes.map((requested): AccessDecision => {
      if (control.denial) return { ok: false, reason: control.denial };
      if (!allowed.has(requested.action.name)) {
        return { ok: false, reason: 'ACTION_NOT_GRANTED' };
      }
      if (control.wrongScope === 'resource') {
        return { ok: true, approvedScope: { resource: 'tenant', tenantId: scope.tenantId } };
      }
      const approved = buildEnvironmentAccessScope(
        TenantId.unsafe(control.wrongScope === 'tenant' ? 'other' : requested.tenantId.value),
        ProjectId.unsafe(control.wrongScope === 'project' ? 'other' : 'project-1'),
        EnvironmentId.unsafe(control.wrongScope === 'environment' ? 'other' : 'environment-1')
      );
      return { ok: true, approvedScope: approved };
    });
  };
  const decisions: Pick<IAccessDecisionService, 'decide' | 'decideMany'> = {
    decide: async (who, requested) => (await decideMany(who, [requested]))[0]!,
    decideMany,
  };
  const authorizer = new AuthorizeCommandScopeService(
    decisions,
    {
      async record(event) {
        await control.beforeAudit();
        events.push(event);
      },
    },
    () => new Date(now)
  );
  const input = { principal, scope, operation, requestId: 'req-3392' };
  return {
    input,
    allowed,
    requests,
    identities,
    principals,
    events,
    control,
    authorizer,
    setNow: (value: number) => {
      now = value;
    },
    open: () => LocalDataAuthorizationLease.open(input, { authorizer, clock: () => new Date(now) }),
  };
}

function rejected(code: string): (error: unknown) => boolean {
  return (error) => error instanceof LocalDataAuthorizationError && error.code === code;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('LocalDataAuthorizationLease', () => {
  it('adds three distinct actions with the correct command/query kind', () => {
    assert.deepEqual(localActions, [
      'workspace:local-data:view',
      'workspace:local-data:capture',
      'workspace:local-data:delete',
    ]);
    assert.equal(AUTHORIZATION_ACTION.workspaceLocalDataView.kind, 'query');
    assert.equal(AUTHORIZATION_ACTION.workspaceLocalDataCapture.kind, 'command');
    assert.equal(AUTHORIZATION_ACTION.workspaceLocalDataDelete.kind, 'command');
  });

  for (const operation of ['view', 'capture', 'delete'] as const) {
    it(`authorizes ${operation} in the exact environment before returning a lease`, async () => {
      const f = fixture(operation);
      const lease = await f.open();
      assert.equal(lease.signal.aborted, false);
      const names = f.requests[0]!.map((s) => s.action.name);
      assert.deepEqual(
        names,
        operation === 'capture'
          ? [action.workspaceLocalDataCapture, action.workspaceSourceImportView]
          : [operation === 'view' ? action.workspaceLocalDataView : action.workspaceLocalDataDelete]
      );
      for (const request of f.requests[0]!)
        assert.deepEqual(toExecutionScope(request), f.input.scope);
      assert.equal(f.events.length, names.length);
      assert(f.events.every((event) => event.eventType === 'AUTH_GRANTED'));
      lease.close();
    });

    it(`does not infer ${operation} from permission to view the source catalog`, async () => {
      const f = fixture(operation);
      for (const name of localActions) f.allowed.delete(name);
      let lookedUp = false;
      await assert.rejects(async () => {
        await f.open();
        lookedUp = true;
      }, rejected('ACCESS_DENIED'));
      assert.equal(lookedUp, false);
      assert(f.events.some((event) => event.eventType === 'AUTH_DENIED'));
    });
  }

  it('requires source-view as well as capture, not capture alone', async () => {
    const f = fixture();
    f.allowed.delete(action.workspaceSourceImportView);
    await assert.rejects(f.open(), rejected('ACCESS_DENIED'));
  });

  for (const operation of ['view', 'delete'] as const) {
    it(`${operation} is independent of a later provider/catalog permission change`, async () => {
      const f = fixture(operation);
      f.allowed.delete(action.workspaceSourceImportView);
      const lease = await f.open();
      await lease.checkpoint();
      lease.close();
    });
  }

  it('checks both grants again at every capture checkpoint and before promotion', async () => {
    const f = fixture();
    const lease = await f.open();
    await lease.checkpoint();
    await lease.beforePromotion();
    assert.equal(f.requests.length, 3);
    assert(f.requests.every((batch) => batch.length === 2));
    lease.close();
  });

  for (const denied of [
    'PRINCIPAL_SUSPENDED',
    'TENANT_NOT_GRANTED',
    'PROJECT_NOT_GRANTED',
    'ENVIRONMENT_NOT_GRANTED',
    'ACTION_NOT_GRANTED',
    'TOKEN_ASSERTION_CONFLICT',
  ] as const) {
    it(`honors existing decision owner denial ${denied}`, async () => {
      const f = fixture();
      f.control.denial = denied;
      await assert.rejects(f.open(), rejected('ACCESS_DENIED'));
      assert(f.events.some((event) => event.denialReason === denied));
    });
  }

  for (const name of [action.workspaceLocalDataCapture, action.workspaceSourceImportView]) {
    it(`revokes permanently when ${name} is removed`, async () => {
      const f = fixture();
      const lease = await f.open();
      f.allowed.delete(name);
      await assert.rejects(lease.beforePromotion(), rejected('ACCESS_DENIED'));
      assert.equal(lease.signal.aborted, true);
      f.allowed.add(name);
      const attempts = f.requests.length;
      await assert.rejects(lease.checkpoint(), rejected('ACCESS_DENIED'));
      assert.equal(f.requests.length, attempts);
    });
  }

  for (const expiry of [INITIAL_TIME - 1, INITIAL_TIME, Number.NaN]) {
    it(`rejects expired/invalid assertions before decision lookup (${expiry})`, async () => {
      const f = fixture();
      f.input.principal.expiresAt = new Date(expiry);
      await assert.rejects(
        f.open(),
        rejected(Number.isNaN(expiry) ? 'INVALID_INPUT' : 'ASSERTION_EXPIRED')
      );
      assert.equal(f.requests.length, 0);
    });
  }

  it('catches expiry while the decision is pending', async () => {
    const f = fixture();
    f.control.beforeDecision = async () => {
      f.setNow(INITIAL_TIME + 60_000);
    };
    await assert.rejects(f.open(), rejected('ASSERTION_EXPIRED'));
  });

  it('catches expiry during authorization audit, not only the grant lookup', async () => {
    const f = fixture();
    f.control.beforeAudit = async () => {
      f.setNow(INITIAL_TIME + 60_000);
    };
    await assert.rejects(f.open(), rejected('ASSERTION_EXPIRED'));
  });

  it('checks expiry again before promotion and cannot be revived by moving the clock back', async () => {
    const f = fixture();
    const lease = await f.open();
    f.setNow(INITIAL_TIME + 60_000);
    await assert.rejects(lease.beforePromotion(), rejected('ASSERTION_EXPIRED'));
    f.setNow(INITIAL_TIME);
    await assert.rejects(lease.checkpoint(), rejected('ASSERTION_EXPIRED'));
    assert.equal(lease.signal.aborted, true);
  });

  for (const badTime of [Number.NaN, INITIAL_TIME - 1]) {
    it(`fails closed when the authorization clock is invalid or regresses (${badTime})`, async () => {
      const f = fixture();
      const lease = await f.open();
      f.setNow(badTime);
      await assert.rejects(
        lease.checkpoint(),
        rejected(Number.isNaN(badTime) ? 'INVALID_CLOCK' : 'CLOCK_REGRESSED')
      );
      assert.equal(lease.signal.aborted, true);
    });
  }

  for (const axis of ['tenant', 'project', 'environment', 'resource'] as const) {
    it(`rejects an approval for a different ${axis}`, async () => {
      const f = fixture();
      f.control.wrongScope = axis;
      await assert.rejects(f.open(), rejected('APPROVAL_MISMATCH'));
    });
  }

  it('sanitizes inconsistent batch lengths from the existing authorizer', async () => {
    const f = fixture();
    f.control.wrongLength = true;
    await assert.rejects(f.open(), rejected('AUTHORIZATION_UNAVAILABLE'));
  });

  for (const stage of ['beforeDecision', 'beforeAudit'] as const) {
    it(`sanitizes ${stage} failures and aborts without retaining raw secrets`, async () => {
      const f = fixture();
      const lease = await f.open();
      f.control[stage] = async () => {
        throw new Error('password=sentinel /private/location');
      };
      await assert.rejects(lease.checkpoint(), (error) => {
        assert(error instanceof LocalDataAuthorizationError);
        assert.equal(error.code, 'AUTHORIZATION_UNAVAILABLE');
        assert(!String(error).includes('sentinel'));
        assert(!('cause' in error));
        return true;
      });
      assert.equal(lease.signal.aborted, true);
      assert(!String(lease.signal.reason).includes('sentinel'));
    });
  }

  it('pins input identity, scope and assertion lifetime against caller mutation', async () => {
    const f = fixture();
    const lease = await f.open();
    f.input.principal.principalId = 'other';
    f.input.principal.assertedTenantIds[0] = 'other';
    f.input.principal.expiresAt.setTime(INITIAL_TIME + 600_000);
    (f.input.scope.tenantId as { value: string }).value = 'other';
    await lease.checkpoint();
    assert.deepEqual(f.identities, ['user-1', 'user-1']);
    assert.equal(f.requests[1]![0]!.tenantId.value, 'tenant-1');
    f.setNow(INITIAL_TIME + 60_000);
    await assert.rejects(lease.checkpoint(), rejected('ASSERTION_EXPIRED'));
  });

  it('does not disclose pinned principal/scopes by serializing the lease', async () => {
    const f = fixture();
    const lease = await f.open();
    assert.equal(JSON.stringify(lease), '{}');
    lease.close();
  });

  it('does not accept an authorizer mutating the requested scope', async () => {
    const f = fixture();
    f.control.changeRequest = true;
    await assert.rejects(f.open(), rejected('AUTHORIZATION_UNAVAILABLE'));
  });

  it('closes idempotently and never requests another decision after close', async () => {
    const f = fixture();
    const lease = await f.open();
    lease.close();
    lease.close();
    await assert.rejects(lease.checkpoint(), rejected('LEASE_CLOSED'));
    assert.equal(f.requests.length, 1);
    assert.equal(lease.signal.aborted, true);
  });

  it('closing while an approval is in flight rejects that late approval', async () => {
    const f = fixture();
    const lease = await f.open();
    const wait = deferred();
    f.control.beforeDecision = () => wait.promise;
    const pending = lease.checkpoint();
    lease.close();
    wait.resolve();
    await assert.rejects(pending, rejected('LEASE_CLOSED'));
  });

  it('rejects overlapping checkpoints without suppressing the in-flight decision', async () => {
    const f = fixture();
    const lease = await f.open();
    const wait = deferred();
    f.control.beforeDecision = () => wait.promise;
    const first = lease.checkpoint();
    await assert.rejects(lease.checkpoint(), rejected('CHECK_IN_PROGRESS'));
    wait.resolve();
    await first;
    assert.equal(lease.signal.aborted, false);
    lease.close();
  });

  for (const operation of ['view', 'delete'] as const) {
    it(`cannot use ${operation} permission to request publication`, async () => {
      const f = fixture(operation);
      const lease = await f.open();
      await assert.rejects(lease.beforePromotion(), rejected('CAPTURE_REQUIRED'));
      assert.equal(lease.signal.aborted, true);
    });
  }

  it('rejects an unsupported operation before requesting any grant', async () => {
    const f = fixture();
    f.input.operation = 'export' as LocalDataOperation;
    await assert.rejects(f.open(), rejected('INVALID_INPUT'));
    assert.equal(f.requests.length, 0);
  });

  it('rejects a non-environment scope before requesting any grant', async () => {
    const f = fixture();
    Object.assign(f.input.scope, { resource: 'tenant' });
    await assert.rejects(f.open(), rejected('INVALID_INPUT'));
    assert.equal(f.requests.length, 0);
  });

  it('retains the authenticated token ID for the decision owner, but never unknown bearer fields', async () => {
    const f = fixture();
    Object.assign(f.input.principal, { bearerToken: 'secret-sentinel' });
    const lease = await f.open();
    assert.equal(f.principals[0]!.tokenId, 'jti-1');
    assert(!('bearerToken' in f.principals[0]!));
    f.input.principal.assertedProjectIds[0] = 'other-project';
    await lease.checkpoint();
    assert.deepEqual(f.principals[1]!.assertedProjectIds, ['project-1']);
    lease.close();
  });

  it('an expired or denied lease aborts once even if the caller closes it later', async () => {
    const f = fixture();
    const lease = await f.open();
    let aborted = 0;
    lease.signal.addEventListener('abort', () => {
      aborted += 1;
    });
    f.allowed.clear();
    await assert.rejects(lease.checkpoint(), rejected('ACCESS_DENIED'));
    lease.close();
    lease.close();
    assert.equal(aborted, 1);
    assert.equal(lease.signal.reason.code, 'ACCESS_DENIED');
  });

  for (const field of ['principalId', 'issuer', 'audience', 'subjectId'] as const) {
    it(`rejects blank authenticated ${field} before authorization`, async () => {
      const f = fixture();
      f.input.principal[field] = ' ';
      await assert.rejects(f.open(), rejected('INVALID_INPUT'));
      assert.equal(f.requests.length, 0);
    });
  }

  it('rejects a blank request correlation ID before authorization', async () => {
    const f = fixture();
    f.input.requestId = ' ';
    await assert.rejects(f.open(), rejected('INVALID_INPUT'));
    assert.equal(f.requests.length, 0);
  });

  for (const axis of ['tenantId', 'projectId', 'environmentId'] as const) {
    it(`rejects malformed ${axis} without normalizing it into another scope`, async () => {
      const f = fixture();
      (f.input.scope[axis] as { value: string }).value = ' padded ';
      await assert.rejects(f.open(), rejected('INVALID_INPUT'));
      assert.equal(f.requests.length, 0);
    });
  }

  for (const change of ['action', 'requestId', 'principalId'] as const) {
    it(`rejects an authorizer context with a different ${change}`, async () => {
      const f = fixture();
      const corrupt: Pick<AuthorizeCommandScopeService, 'authorizeMany'> = {
        async authorizeMany(principal, scopes, id) {
          const results = await f.authorizer.authorizeMany(principal, scopes, id);
          return results.map((result) =>
            !result.ok
              ? result
              : {
                  ok: true as const,
                  context: {
                    ...result.context,
                    ...(change === 'action' ? { action: AUTHORIZATION_ACTION.runView } : {}),
                    ...(change === 'requestId' ? { requestId: 'other' } : {}),
                    ...(change === 'principalId'
                      ? { principal: { ...principal, principalId: 'other' } }
                      : {}),
                  },
                }
          );
        },
      };
      await assert.rejects(
        LocalDataAuthorizationLease.open(f.input, {
          authorizer: corrupt,
          clock: () => new Date(INITIAL_TIME),
        }),
        rejected('APPROVAL_MISMATCH')
      );
    });
  }
});
