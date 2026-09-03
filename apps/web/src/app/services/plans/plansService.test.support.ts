import { parseExecutionSelection } from '@dvt/contracts';
import { expect, vi } from 'vitest';

import type { IPlansPort, PlanPreviewInput, PreviewedPlanViewModel } from '../../ports/plans';
import { makePlanRef, makeRunContext } from '../../testing/contractTestUtils';
import { ApiError, type ApiClient } from '../api/createApiClient';

export const GENERIC_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dbt',
  sourceVersion: 'manifest-v10',
  nodes: [{ nodeId: 'model.analytics.customers', stepKind: 'DBT_MODEL', dependsOn: [] }],
} as const;

export function buildPlan(
  options: {
    readonly includeNodeIds?: boolean;
    readonly retryAttempts?: number;
  } = {}
): Readonly<Record<string, unknown>> {
  const retryPolicy =
    options.retryAttempts === undefined
      ? {}
      : {
          retryPolicy: {
            maxAttempts: options.retryAttempts,
            initialInterval: '2s',
            maximumInterval: '30s',
            backoffCoefficient: 2,
          },
        };
  return {
    metadata: {
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-04-03T00:00:00.000Z',
      ownership: { tenantId: 't1', projectId: 'p1', environmentId: 'canonical-env' },
    },
    steps: [
      {
        stepId: 'model.analytics.customers',
        kind: 'DBT_MODEL',
        dependsOn: [],
        ...retryPolicy,
        stepTypeConfig: {
          name: 'customers',
          ...(options.includeNodeIds === false ? {} : { nodeIds: ['model.analytics.customers'] }),
        },
      },
    ],
    observability: { tags: { adapter: 'temporal' } },
  } as const;
}

export function buildValidPlanRef() {
  return makePlanRef({
    uri: 'dvt://plans/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    sha256: 'b'.repeat(64),
    schemaVersion: '1.0',
    planId: 'b'.repeat(64),
    planVersion: 'v1',
  });
}

export function buildPreviewPayload(plan = buildPlan()): Record<string, unknown> {
  return {
    previewProfile: 'planner-generic-v1',
    plan,
    planRef: buildValidPlanRef(),
    persisted: {
      planRecordId: 'plan-record-1',
      canonicalPlanSha256: 'c'.repeat(64),
    },
    validation: { valid: true, warnings: [] },
  };
}

export function buildApiClientStub(postJson: ApiClient['postJson']): ApiClient {
  return {
    baseUrl: 'http://localhost:3000',
    requestRaw: vi.fn(),
    getJson: vi.fn(),
    postJson,
  };
}

export function buildPreviewInput(): PlanPreviewInput {
  return {
    previewProfile: 'planner-generic-v1',
    graphSource: GENERIC_GRAPH_SOURCE,
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['model.analytics.customers'],
    }),
    persist: true,
    context: makeRunContext('run-1'),
  };
}

export async function previewAccepted(service: IPlansPort): Promise<PreviewedPlanViewModel> {
  const outcome = await service.previewPlan(buildPreviewInput());
  expect(outcome.kind).toBe('accepted');
  if (outcome.kind !== 'accepted') throw new Error(`Expected accepted, got ${outcome.kind}`);
  return outcome.plan;
}

export function createPlanRejectedApiError(details: Record<string, unknown>): ApiError {
  return new ApiError({
    message: 'HTTP 422',
    endpoint: '/plans/preview',
    statusCode: 422,
    category: 'client',
    responseBody: {
      error: { type: 'unprocessable', reason: 'plan_rejected', details },
    },
  });
}
