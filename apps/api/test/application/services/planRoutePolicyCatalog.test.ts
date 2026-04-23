import { describe, expect, it } from 'vitest';

import { PLAN_ROUTE_POLICY_CATALOG } from '../../../src/application/services/planRoutePolicyCatalog.js';
import { resolveAuthorizedPlannerInputEnvelope } from '../../../src/application/services/resolveAuthorizedPlannerInputEnvelope.js';
import {
  EnvironmentId,
  ProjectId,
  TenantId,
} from '../../../src/domain/auth/types.js';

const AUTHORIZED_CONTEXT = {
  principal: {
    principalId: 'principal-1',
    principalType: 'user' as const,
    subjectId: 'subject-1',
    issuer: 'https://issuer.example/',
    audience: 'dvt-api',
    expiresAt: new Date('2026-04-20T01:00:00.000Z'),
    rawScopes: [],
    assertedTenantIds: [],
    assertedProjectIds: [],
  },
  scope: {
    resource: 'environment',
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'req-plan-route-policy',
  authorizedAt: new Date('2026-04-20T00:00:00.000Z'),
};

const PLANNER_INPUT_SEED = {
  graphSource: {
    kind: 'generic-graph-v1' as const,
    sourceFamily: 'spark-job-graph',
    sourceVersion: 'spark-application-v1',
    nodes: [
      {
        nodeId: 'spark-job-1',
        stepKind: 'SPARK_JOB',
        dependsOn: [],
        stepTypeConfig: {
          application: 'orders-daily',
          entrypoint: 'jobs/orders.py',
          runtime: 'python',
        },
      },
    ],
  },
  selection: {
    selectedNodeIds: ['spark-job-1'],
  },
  ownership: {
    tenantId: 'tenant-X',
    projectId: 'project-X',
    environmentId: 'env-X',
  },
  observability: {
    tags: { surface: 'plan-route' },
    extra: { traceParent: '00-abcdef' },
    correlationKey: 'policy-matrix-1',
  },
} as const;

describe('PLAN_ROUTE_POLICY_CATALOG', () => {
  it.each([
    [
      'PREVIEW',
      PLAN_ROUTE_POLICY_CATALOG.PREVIEW,
      {
        authorization: { kind: 'command', name: 'run:start' },
        plannerInput: {
          ownershipSource: 'authorized-scope',
          requestMetadataSource: 'authorized-context',
        },
        importedPlanOwnershipSource: 'none',
      },
    ],
    [
      'IMPORT',
      PLAN_ROUTE_POLICY_CATALOG.IMPORT,
      {
        authorization: { kind: 'command', name: 'run:start' },
        plannerInput: null,
        importedPlanOwnershipSource: 'command',
      },
    ],
    [
      'COMPILE',
      PLAN_ROUTE_POLICY_CATALOG.COMPILE,
      {
        authorization: { kind: 'command', name: 'run:start' },
        plannerInput: {
          ownershipSource: 'authorized-scope',
          requestMetadataSource: 'authorized-context',
        },
        importedPlanOwnershipSource: 'none',
      },
    ],
  ])('declares %s route policy explicitly', (_routeKey, actualPolicy, expectedPolicy) => {
    expect(actualPolicy).toEqual(expectedPolicy);
  });

  it.each([
    ['PREVIEW', PLAN_ROUTE_POLICY_CATALOG.PREVIEW.plannerInput],
    ['COMPILE', PLAN_ROUTE_POLICY_CATALOG.COMPILE.plannerInput],
  ] as const)(
    'builds canonical planner input for %s from the authorized scope',
    (_routeKey, policy) => {
      const plannerInput = resolveAuthorizedPlannerInputEnvelope(
        PLANNER_INPUT_SEED,
        AUTHORIZED_CONTEXT as never,
        policy
      );

      expect(plannerInput).toEqual(
        expect.objectContaining({
          ownership: {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
          },
          requestedBy: 'principal-1',
          requestId: 'req-plan-route-policy',
          requestedAtIso: '2026-04-20T00:00:00.000Z',
          observability: PLANNER_INPUT_SEED.observability,
        })
      );
    }
  );
});
