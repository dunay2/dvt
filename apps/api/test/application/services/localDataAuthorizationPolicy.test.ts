import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import {
  AUTHORIZATION_ACTION_NAME,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthAuditEvent } from '../../../src/application/ports/auth.js';
import type { PrincipalGrantSnapshot } from '../../../src/application/ports/principalGrantRepository.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import {
  LocalDataAuthorizationError,
  LocalDataAuthorizationLease,
  type LocalDataOperation,
} from '../../../src/application/services/localDataAuthorizationLease.js';
import {
  PROJECT_ONBOARDING_POLICY,
  isCreatorWorkspaceActionGranted,
} from '../../../src/application/services/projectOnboardingPolicy.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import { EmbeddedAccessDecisionService } from '../../../src/infrastructure/auth/embeddedAccessDecisionService.js';

/** Real policy/authorizer composition with a mutable repository fixture, not persisted grants. */
function fixture(operation: LocalDataOperation, actions: readonly string[]) {
  const now = new Date('2026-10-17T00:00:00.000Z');
  const principal = {
    principalId: 'user-1', principalType: 'user' as const, subjectId: 'sub-1',
    issuer: 'issuer', audience: 'dvt', expiresAt: new Date(now.getTime() + 60_000),
    rawScopes: [], assertedTenantIds: ['t1'], assertedProjectIds: ['p1'],
  };
  const state = {
    snapshot: {
      principal, suspended: false,
      tenantAccess: [{
        tenantId: 't1', allowedActions: [], projectAccess: [{
          projectId: 'p1', allowedActions: [], environmentAccess: [{
            environmentId: 'e1', allowedActions: actions,
          }],
        }],
      }],
    } as PrincipalGrantSnapshot | null,
  };
  const events: AuthAuditEvent[] = [];
  const decisions = new EmbeddedAccessDecisionService({
    migrate: async () => {},
    load: async () => state.snapshot,
  });
  const authorizer = new AuthorizeCommandScopeService(decisions, {
    record: async (event) => { events.push(event); },
  }, () => now);
  return {
    state, events,
    open: () => LocalDataAuthorizationLease.open({
      operation, principal, requestId: 'req',
      scope: buildEnvironmentAccessScope(TenantId.unsafe('t1'), ProjectId.unsafe('p1'), EnvironmentId.unsafe('e1')),
    }, { authorizer, clock: () => now }),
  };
}

function denied(error: unknown): boolean {
  return error instanceof LocalDataAuthorizationError && error.code === 'ACCESS_DENIED';
}

const names = AUTHORIZATION_ACTION_NAME;
const cases = [
  ['view', names.workspaceLocalDataView],
  ['capture', names.workspaceLocalDataCapture],
  ['delete', names.workspaceLocalDataDelete],
] as const;

describe('LOCAL actions through existing embedded authorization policy', () => {
  for (const [operation, localAction] of cases) {
    it(`does not implicitly grant ${operation} to new/legacy creator grants`, async () => {
      const grants = PROJECT_ONBOARDING_POLICY.creatorWorkspaceActions;
      assert.equal(isCreatorWorkspaceActionGranted(grants, localAction), false);
      await assert.rejects(fixture(operation, grants).open(), denied);
    });

    it(`admits explicitly granted ${operation} without a wildcard or onboarding migration`, async () => {
      const f = fixture(operation, [localAction, names.workspaceSourceImportView]);
      const lease = await f.open(); assert.equal(lease.signal.aborted, false); lease.close();
    });
  }

  it('capture-only grant does not override the source-view requirement', async () => {
    await assert.rejects(fixture('capture', [names.workspaceLocalDataCapture]).open(), denied);
  });

  it('current repository suspension revokes an existing capture lease', async () => {
    const f = fixture('capture', [names.workspaceLocalDataCapture, names.workspaceSourceImportView]);
    const lease = await f.open(); assert(f.state.snapshot);
    f.state.snapshot = { ...f.state.snapshot, suspended: true };
    await assert.rejects(lease.beforePromotion(), denied);
    assert.equal(lease.signal.aborted, true);
    assert(f.events.some((event) => event.denialReason === 'PRINCIPAL_SUSPENDED'));
  });

  it('a removed grant snapshot cannot be reused from the lease', async () => {
    const f = fixture('view', [names.workspaceLocalDataView]); const lease = await f.open();
    f.state.snapshot = null;
    await assert.rejects(lease.checkpoint(), denied);
  });
});
