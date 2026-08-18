import type { ExecutionPlan, PlanRecord, SourceDataSampleResponse } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  RunMaterializationSampleUnavailableError,
  PreviewRunMaterializationRowsUseCase,
} from '../../../src/application/services/previewRunMaterializationRowsUseCase.js';
import { TenantId } from '../../../src/domain/auth/types.js';
import { buildTransformationStoredPlan } from '../../entrypoints/http/planRouteFixtures.js';

const context = {
  principal: {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-1'],
    assertedProjectIds: [],
  },
  scope: { resource: 'tenant', tenantId: TenantId.unsafe('tenant-1') },
  action: { kind: 'query', name: 'run:view' },
  requestId: 'request-1',
  authorizedAt: new Date('2026-08-18T00:00:00Z'),
} as const;

const materialization = {
  executor: 'postgres' as const,
  environmentId: 'env-1',
  sinkTable: 'analytics.orders_daily',
  rowsWritten: 118,
  startedAt: '2026-08-18T00:00:00.000Z',
  completedAt: '2026-08-18T00:00:01.000Z',
  durationMs: 1_000,
};

const runStatus = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  runId: 'run-1',
  planId: 'b'.repeat(64),
  planVersion: '1.0',
  logicalAttemptId: 1,
  provider: 'temporal',
  status: 'COMPLETED',
  controls: {
    cancel: { available: false, reason: 'terminal' },
    recover: { available: true },
  },
  enriched: false,
  snapshotStaleness: 'FRESH',
  executor: 'postgres',
  materialization,
} as const;

function planRecord(plan: ExecutionPlan = buildTransformationStoredPlan()): PlanRecord {
  return {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'b'.repeat(64),
    canonicalPlanJson: JSON.stringify(plan),
    canonicalHash: 'b'.repeat(64),
    planVersion: '1.0',
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    sourceRef: 'dvt-plan://plans/plan-1',
    createdAtIso: '2026-08-18T00:00:00.000Z',
    updatedAtIso: '2026-08-18T00:00:00.000Z',
    state: 'ACTIVE',
  } as PlanRecord;
}

function harness(
  overrides: {
    readonly status?: typeof runStatus;
    readonly storedPlan?: ReturnType<typeof planRecord> | undefined;
  } = {}
): {
  readonly useCase: PreviewRunMaterializationRowsUseCase;
  readonly getRunStatus: ReturnType<typeof vi.fn>;
  readonly getPlanRecord: ReturnType<typeof vi.fn>;
  readonly getConnection: ReturnType<typeof vi.fn>;
  readonly previewRows: ReturnType<typeof vi.fn>;
} {
  const getRunStatus = vi.fn(async () => overrides.status ?? runStatus);
  const getPlanRecord = vi.fn(async () =>
    Object.prototype.hasOwnProperty.call(overrides, 'storedPlan')
      ? overrides.storedPlan
      : planRecord()
  );
  const getConnection = vi.fn(async () => ({
    id: 'warehouse-a',
    name: 'Warehouse A',
    type: 'postgres' as const,
    database: 'analytics_db',
    credentialRef: 'postgres:warehouse-a',
    sourceObjects: [],
  }));
  const execute = vi.fn(async (): Promise<SourceDataSampleResponse> => ({
    contractVersion: 1,
    connectionId: 'warehouse-a',
    objectId: 'relation/analytics_db/analytics/orders_daily',
    columns: [{ name: 'order_id', type: 'integer', nullable: false }],
    rows: [{ values: ['1'] }],
    limit: 20,
    truncated: true,
    sampledAt: '2026-08-18T00:01:00.000Z',
  }));
  const useCase = new PreviewRunMaterializationRowsUseCase({
    getRunStatus: { execute: getRunStatus },
    planStore: { getPlanRecord },
    catalog: {
      listConnections: vi.fn(),
      listSourceObjects: vi.fn(),
      getConnection,
      createConnection: vi.fn(),
      renameConnection: vi.fn(),
    },
    previewRows: { execute },
  } as never);

  return { useCase, getRunStatus, getPlanRecord, getConnection, previewRows: execute };
}

describe('PreviewRunMaterializationRowsUseCase', () => {
  it('resolves the persisted run target and delegates to the existing bounded row query', async () => {
    const getRunStatus = vi.fn(async () => runStatus);
    const getPlanRecord = vi.fn(async () => planRecord());
    const getConnection = vi.fn(async () => ({
      id: 'warehouse-a',
      name: 'Warehouse A',
      type: 'postgres' as const,
      database: 'analytics_db',
      credentialRef: 'postgres:warehouse-a',
      sourceObjects: [],
    }));
    const previewRows = vi.fn(async (): Promise<SourceDataSampleResponse> => ({
      contractVersion: 1,
      connectionId: 'warehouse-a',
      objectId: 'relation/analytics_db/analytics/orders_daily',
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: true,
      sampledAt: '2026-08-18T00:01:00.000Z',
    }));
    const useCase = new PreviewRunMaterializationRowsUseCase({
      getRunStatus: { execute: getRunStatus },
      planStore: { getPlanRecord },
      catalog: {
        listConnections: vi.fn(),
        listSourceObjects: vi.fn(),
        getConnection,
        createConnection: vi.fn(),
        renameConnection: vi.fn(),
      },
      previewRows: { execute: previewRows },
    } as never);

    const result = await useCase.execute({ runId: 'run-1', limit: 20 }, context as never);

    expect(getRunStatus).toHaveBeenCalledWith({ runId: 'run-1', enriched: false }, context);
    expect(getPlanRecord).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      planId: 'b'.repeat(64),
    });
    expect(getConnection).toHaveBeenCalledWith(
      { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'env-1' },
      'warehouse-a'
    );
    expect(previewRows).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'env-1' },
      connectionId: 'warehouse-a',
      objectId: 'relation/analytics_db/analytics/orders_daily',
      limit: 20,
    });
    expect(result.rows).toEqual([{ values: ['1'] }]);
  });

  it('fails closed before reading the plan when the run is not completed', async () => {
    const { useCase, getPlanRecord, previewRows } = harness({
      status: { ...runStatus, status: 'RUNNING', materialization: undefined } as never,
    });

    await expect(
      useCase.execute({ runId: 'run-1', limit: 20 }, context as never)
    ).rejects.toMatchObject({ reason: 'run_not_completed' });
    expect(getPlanRecord).not.toHaveBeenCalled();
    expect(previewRows).not.toHaveBeenCalled();
  });

  it('fails closed when the persisted plan target disagrees with materialization evidence', async () => {
    const { useCase, previewRows } = harness({
      status: {
        ...runStatus,
        materialization: { ...materialization, sinkTable: 'analytics.other_table' },
      } as never,
    });

    await expect(
      useCase.execute({ runId: 'run-1', limit: 20 }, context as never)
    ).rejects.toMatchObject({ reason: 'materialization_target_mismatch' });
    expect(previewRows).not.toHaveBeenCalled();
  });

  it('fails closed when the persisted plan cannot resolve a materialization target', async () => {
    const { useCase, previewRows } = harness({ storedPlan: undefined });

    const result = useCase.execute({ runId: 'run-1', limit: 20 }, context as never);

    await expect(result).rejects.toBeInstanceOf(RunMaterializationSampleUnavailableError);
    await expect(result).rejects.toMatchObject({ reason: 'materialization_target_unavailable' });
    expect(previewRows).not.toHaveBeenCalled();
  });
});
