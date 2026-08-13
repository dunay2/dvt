/**
 * @file apps/api/test/integration/protectedRuntime.integration.assertions.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0015: getRunStatus read-model separation
 * @decision Keep protected-runtime integration assertions separate from scenario execution
 * @date 2026-04-18
 */
import { expect } from 'vitest';

import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../../src/application/ports/workspaceGraphDraft.js';

import { eventTypes } from './protectedRuntime.integration.http.js';
import { ENVIRONMENT_ID, PROJECT_ID, TENANT_ID } from './protectedRuntime.integration.shared.js';

type JsonResponse = { statusCode: number; json(): unknown };

export type CommandQueryFlowResult = {
  readonly startResponse: JsonResponse;
  readonly actualRunId: string;
  readonly listResponse: JsonResponse;
  readonly getRunResponse: JsonResponse;
  readonly pauseResponse: JsonResponse;
  readonly resumeResponse: JsonResponse;
  readonly cancelResponse: JsonResponse;
  readonly eventsResponse: JsonResponse;
  readonly recoverResponse: JsonResponse;
  readonly repeatedRecoverResponse: JsonResponse;
};

export type PlannerBackedRunFlowResult = {
  readonly startResponse: JsonResponse;
  readonly actualRunId: string;
  readonly storedPlan:
    | {
        plan_id: string;
        plan_uri: string;
        validation_state: string;
      }
    | undefined;
  readonly listResponse: JsonResponse;
};

export type WorkspaceGraphDraftFlowResult = {
  readonly firstSave: JsonResponse;
  readonly retrySave: JsonResponse;
  readonly readResponse: JsonResponse;
  readonly staleSave: JsonResponse;
  readonly firstRevision: string;
};

export function expectCommandQueryFlowSucceeded(flow: CommandQueryFlowResult): void {
  expect(flow.actualRunId).toEqual(expect.any(String));
  expect(flow.startResponse.statusCode).toBe(202);
  expect(flow.startResponse.json()).toEqual({ runId: flow.actualRunId, accepted: true });

  expect(flow.listResponse.statusCode).toBe(200);
  expect(flow.listResponse.json()).toMatchObject({
    items: [
      {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        runId: flow.actualRunId,
        planId: expect.any(String),
        planVersion: expect.any(String),
        provider: 'temporal',
        status: 'RUNNING',
      },
    ],
  });

  expect(flow.getRunResponse.statusCode).toBe(200);
  expect(flow.getRunResponse.json()).toMatchObject({
    runId: flow.actualRunId,
    tenantId: TENANT_ID,
    status: 'RUNNING',
    enriched: false,
  });

  expect(flow.pauseResponse.statusCode).toBe(202);
  expect(flow.pauseResponse.json()).toEqual({
    runId: flow.actualRunId,
    signalType: 'PAUSE',
    accepted: true,
  });
  expect(flow.resumeResponse.statusCode).toBe(202);
  expect(flow.resumeResponse.json()).toEqual({
    runId: flow.actualRunId,
    signalType: 'RESUME',
    accepted: true,
  });

  expect(flow.cancelResponse.statusCode).toBe(202);
  expect(flow.cancelResponse.json()).toEqual({
    contractVersion: 'v1',
    runId: flow.actualRunId,
    signalType: 'CANCEL',
    accepted: true,
    disposition: 'requested',
  });

  expect(flow.eventsResponse.statusCode).toBe(200);
  expect(eventTypes(flow.eventsResponse.json())).toEqual([
    'RunQueued',
    'RunStarted',
    'RunPaused',
    'RunResumed',
    'RunCancelSubmitted',
  ]);

  expect(flow.recoverResponse.statusCode).toBe(202);
  expect(flow.recoverResponse.json()).toEqual({
    contractVersion: 'v1',
    sourceRunId: flow.actualRunId,
    recoveryRunId: expect.stringMatching(/^run_recovery_[a-f0-9]{40}$/),
    accepted: true,
  });
  expect(flow.repeatedRecoverResponse.statusCode).toBe(202);
  expect(flow.repeatedRecoverResponse.json()).toEqual(flow.recoverResponse.json());
}

export function expectPlannerBackedRunFlowSucceeded(flow: PlannerBackedRunFlowResult): void {
  expect(flow.actualRunId).toEqual(expect.any(String));
  expect(flow.startResponse.statusCode).toBe(202);
  expect(flow.startResponse.json()).toEqual({ runId: flow.actualRunId, accepted: true });

  expect(flow.storedPlan).toMatchObject({
    validation_state: 'VALID',
  });
  expect(flow.storedPlan?.plan_uri).toMatch(/^dvt-plan:\/\/postgres\//);

  expect(flow.listResponse.statusCode).toBe(200);
  expect(flow.listResponse.json()).toMatchObject({
    items: expect.arrayContaining([
      expect.objectContaining({
        runId: flow.actualRunId,
        planId: flow.storedPlan?.plan_id,
        provider: 'temporal',
        status: 'PENDING',
      }),
    ]),
  });
}

export function expectWorkspaceGraphDraftFlowSucceeded(
  flow: WorkspaceGraphDraftFlowResult,
  saveRequest: { readonly draft: unknown }
): void {
  expect(flow.firstSave.statusCode).toBe(200);
  expect(flow.firstSave.json()).toMatchObject({
    kind: 'saved',
    capability: {
      mode: 'writable',
      canRead: true,
      canWrite: true,
    },
    formatMeta: {
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      storedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    },
    revision: expect.any(String),
  });

  expect(flow.retrySave.statusCode).toBe(200);
  expect(flow.retrySave.json()).toMatchObject({
    kind: 'saved',
    revision: flow.firstRevision,
  });

  expect(flow.readResponse.statusCode).toBe(200);
  expect(flow.readResponse.json()).toMatchObject({
    kind: 'ok',
    capability: {
      mode: 'writable',
      canRead: true,
      canWrite: true,
    },
    formatMeta: {
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      storedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    },
    record: {
      scope: {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
      },
      revision: flow.firstRevision,
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      draft: saveRequest.draft,
    },
  });

  expect(flow.staleSave.statusCode).toBe(409);
  expect(flow.staleSave.json()).toMatchObject({
    kind: 'conflict',
    currentRevision: flow.firstRevision,
    capability: {
      mode: 'writable',
      canRead: true,
      canWrite: true,
    },
  });
}
