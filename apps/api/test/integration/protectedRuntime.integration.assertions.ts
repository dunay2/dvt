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
  readonly signalResponse: JsonResponse;
  readonly eventsResponse: JsonResponse;
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

export function expectCommandQueryFlowSucceeded(
  flow: CommandQueryFlowResult
): void {
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
        provider: 'mock',
        status: 'PENDING',
      },
    ],
    nextCursor: null,
  });

  expect(flow.getRunResponse.statusCode).toBe(200);
  expect(flow.getRunResponse.json()).toMatchObject({
    runId: flow.actualRunId,
    tenantId: TENANT_ID,
    status: 'PENDING',
    enriched: false,
  });

  expect(flow.signalResponse.statusCode).toBe(202);
  expect(flow.signalResponse.json()).toEqual({
    runId: flow.actualRunId,
    signalType: 'CANCEL',
    accepted: true,
  });

  expect(flow.eventsResponse.statusCode).toBe(200);
  expect(eventTypes(flow.eventsResponse.json())).toEqual([
    'RunQueued',
    'RunCancelRequested',
    'RunCancelled',
  ]);
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
        provider: 'mock',
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
      migrationState: 'native',
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
      migrationState: 'native',
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
