/**
 * @file apps/api/test/integration/protectedRuntime.integration.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0015: getRunStatus read-model separation
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Verify the protected API runtime against real JWKS-backed OIDC verification and a live PostgreSQL schema
 * @consequence Regressions in route wiring, auth verification, or schema bootstrap surface in one executable lane
 * @date 2026-03-20
 *
 * Requires a live PostgreSQL instance. Skips cleanly when DVT_PG_URL or
 * DATABASE_URL is absent.
 */
import { expect, it } from 'vitest';

import {
  buildWorkspaceGraphDraft,
  buildWorkspaceGraphDraftSaveRequest,
} from '../fixtures/workspaceGraphDraftFixture.js';

import {
  expectCommandQueryFlowSucceeded,
  expectPlannerBackedRunFlowSucceeded,
  expectWorkspaceGraphDraftFlowSucceeded,
} from './protectedRuntime.integration.assertions.js';
import { createProtectedRuntimeHarness } from './protectedRuntime.integration.harness.js';
import { httpError } from './protectedRuntime.integration.http.js';
import {
  exerciseCommandQueryFlow,
  exerciseEmptyCancelReasonFlow,
  exercisePlannerBackedRunFlow,
  expectAdminRebuildNotFound,
  expectAdminRebuildSuccess,
  expectForbiddenActionDenied,
  expectInvalidPlanSourceRejected,
  expectNativeCancelReasonRejected,
  expectTokenAssertionConflict,
} from './protectedRuntime.integration.runtime.scenarios.js';
import {
  describeIfPg,
  TENANT_ACTIONS_FULL,
  TENANT_ID,
} from './protectedRuntime.integration.shared.js';
import {
  exerciseWorkspaceGraphDraftFlow,
  expectReadOnlyWorkspaceDraftDenied,
} from './protectedRuntime.integration.workspaceDraft.scenarios.js';

describeIfPg('protected runtime integration', () => {
  const runtime = createProtectedRuntimeHarness();
  const forbiddenActionCases = [
    {
      name: 'rejects /runs/:runId/cancel when principal lacks run:cancel permission',
      tenantActions: ['run:start', 'run:list', 'run:view', 'run:logs:view', 'run:signal'],
      request: {
        method: 'POST' as const,
        url: '/runs/non-authorized-cancel/cancel',
        payload: { tenantId: TENANT_ID },
      },
    },
    {
      name: 'rejects /runs/:runId/signal for PAUSE when principal lacks run:signal permission',
      tenantActions: ['run:start', 'run:list', 'run:view', 'run:logs:view', 'run:cancel'],
      request: {
        method: 'POST' as const,
        url: '/runs/non-authorized-signal/signal',
        payload: {
          tenantId: TENANT_ID,
          signalType: 'PAUSE',
        },
      },
    },
    {
      name: 'rejects /runs/:runId/signal for CANCEL when principal lacks run:cancel permission',
      tenantActions: ['run:start', 'run:list', 'run:view', 'run:logs:view', 'run:signal'],
      request: {
        method: 'POST' as const,
        url: '/runs/non-authorized-cancel-signal/signal',
        payload: {
          tenantId: TENANT_ID,
          signalType: 'CANCEL',
          reason: 'permission-check',
        },
      },
    },
    {
      name: 'rejects /runs/:runId/recover when principal lacks run:retry permission',
      tenantActions: ['run:start', 'run:list', 'run:view', 'run:logs:view', 'run:signal', 'run:cancel'],
      request: {
        method: 'POST' as const,
        url: '/runs/non-authorized-recover/recover',
        payload: {
          tenantId: TENANT_ID,
          recoveryRunId: 'recover-target-1',
          planRef: {
            uri: 'https://plans.example/recover-plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'recover-plan',
            planVersion: '1.0.0',
          },
        },
      },
    },
  ] as const;

  it('boots the protected routes and executes command plus query flow against real auth and PostgreSQL', async () => {
    const runId = 'api-integration-run-1';
    const flow = await exerciseCommandQueryFlow(runtime, {
      runId,
      selection: ['model.orders.persisted'],
      graphNodeId: 'model.orders.persisted',
    });

    expectCommandQueryFlowSucceeded(flow, runId);
  });

  it('persists workspace graph drafts with read-your-writes, idempotent retry, and CAS conflict behavior', async () => {
    const saveRequest = buildWorkspaceGraphDraftSaveRequest({
      idempotencyKey: 'draft-save-it-1',
      draft: buildWorkspaceGraphDraft(),
    });
    const draftFlow = await exerciseWorkspaceGraphDraftFlow(runtime, saveRequest);

    expectWorkspaceGraphDraftFlowSucceeded(draftFlow, saveRequest);
  });

  it('returns read_only denial when caller can read drafts but lacks write grant', async () => {
    const response = await expectReadOnlyWorkspaceDraftDenied(runtime);

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      kind: 'denied',
      capability: {
        mode: 'read_only',
        canRead: true,
        canWrite: false,
        reason: 'write_denied',
      },
      auditRef: {
        action: 'draft_write',
        outcome: 'read_only',
      },
    });
  });

  it('persists and validates a planner-backed run before execution starts', async () => {
    const runId = 'api-integration-run-graph-1';
    const flow = await exercisePlannerBackedRunFlow(runtime, {
      runId,
      graphNodeId: 'model.orders',
    });

    expectPlannerBackedRunFlowSucceeded(flow, runId);
  });

  it('returns 400 invalid_plan_source when manifestRef is sent to the hard-cut runtime', async () => {
    const response = await expectInvalidPlanSourceRejected(runtime);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(httpError('bad_request', 'invalid_plan_source'));
  });

  it('rejects a token whose asserted tenant conflicts with the requested tenant scope', async () => {
    const response = await expectTokenAssertionConflict(runtime);

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual(httpError('forbidden', 'token_assertion_conflict'));
  });

  it.each(forbiddenActionCases)('$name', async ({ tenantActions, request }) => {
    await expectForbiddenActionDenied(runtime, { tenantActions: [...tenantActions], request });
  });

  it('rejects /runs/:runId/cancel when a non-empty reason is provided on the native cancel path', async () => {
    const response = await expectNativeCancelReasonRejected(runtime);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      httpError('bad_request', 'cancel_reason_not_supported', {
        target: 'reason',
      })
    );
  });

  it('ignores empty /runs/:runId/cancel reason noise on the native cancel path', async () => {
    const runId = 'api-integration-native-cancel-empty-reason';
    const flow = await exerciseEmptyCancelReasonFlow(runtime, {
      runId,
      graphNodeId: 'model.orders.cancel.empty_reason',
    });

    expect(flow.startResponse.statusCode).toBe(202);
    expect(flow.cancelResponse.statusCode).toBe(202);
    expect(flow.cancelResponse.json()).toEqual({
      runId,
      signalType: 'CANCEL',
      accepted: true,
    });
  });

  it('rebuilds snapshot through admin route with valid token and explicit admin action grant', async () => {
    const runId = 'api-integration-admin-rebuild-success-1';
    const flow = await expectAdminRebuildSuccess(runtime, {
      runId,
      graphNodeId: 'model.orders.admin',
    });

    expect(flow.startResponse.statusCode).toBe(202);
    expect(flow.rebuildResponse.statusCode).toBe(200);
    expect(flow.rebuildResponse.json()).toMatchObject({
      runId,
      status: 'PENDING',
    });
  });

  it('returns forbidden on admin rebuild route when principal lacks explicit admin action grant', async () => {
    const runtimeApp = runtime.requireApp();
    await runtime.setPrincipalGrant(TENANT_ACTIONS_FULL);

    const token = await runtime.issuePrincipalToken();

    const response = await runtimeApp.inject({
      method: 'POST',
      url: '/admin/runs/api-integration-admin-forbidden/rebuild-snapshot',
      headers: { authorization: `Bearer ${token}` },
      payload: { tenantId: TENANT_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual(httpError('forbidden', 'action_not_granted'));
  });

  it('returns not_found on admin rebuild route for unknown run with valid admin grant', async () => {
    const response = await expectAdminRebuildNotFound(runtime);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual(
      httpError('not_found', 'run_not_found', {
        details: { runId: 'api-integration-admin-missing-run' },
      })
    );
  });
});

