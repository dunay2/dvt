import type {
  DbtProjectGraphProjection,
  DbtProjectImportResult,
  DbtProjectImportValidationReport,
} from '@dvt/contracts';
import { DbtProjectGraphProjectionSchema } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { IDbtProjectAnalyzerPort } from '../../src/application/ports/dbtProjectAnalysis.js';
import type {
  IDbtProjectImportInspectorPort,
  IDbtProjectImportProcessStore,
} from '../../src/application/ports/dbtProjectImport.js';
import { ImportDbtProjectUseCase } from '../../src/application/services/importDbtProjectUseCase.js';
import { ValidateDbtProjectImportUseCase } from '../../src/application/services/validateDbtProjectImportUseCase.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;
const NOW = new Date('2026-07-14T10:00:00.000Z');

function safeInspector(): IDbtProjectImportInspectorPort {
  return {
    inspect: vi.fn().mockResolvedValue({
      projectRoot: 'analytics',
      projectName: 'analytics',
      inventory: {
        fileCount: 2,
        totalBytes: 30,
        includedFileCount: 2,
        excludedFileCount: 0,
        files: [
          {
            path: 'analytics/dbt_project.yml',
            classification: 'project-config',
            byteSize: 10,
            decision: 'included',
          },
          {
            path: 'analytics/models/orders.sql',
            classification: 'resource-sql',
            byteSize: 20,
            decision: 'included',
          },
        ],
      },
      diagnostics: [],
    }),
  };
}

function validAnalyzer(): IDbtProjectAnalyzerPort {
  return {
    analyze: vi.fn().mockResolvedValue({
      status: 'valid',
      projectRevision: {
        projectRoot: 'analytics',
        contentSetSha256: 'a'.repeat(64),
        analyzedAt: NOW.toISOString(),
        analyzerVersion: 'dvt-dbt-analyzer.v1',
        dbtVersion: '1.10.0',
      },
      analysisSha256: 'b'.repeat(64),
      adapterType: 'postgres',
      resources: [],
      dependencies: [],
      diagnostics: [],
    }),
  };
}

async function acceptedReport(): Promise<
  Extract<DbtProjectImportValidationReport, { status: 'accepted' }>
> {
  const useCase = new ValidateDbtProjectImportUseCase({
    inspector: safeInspector(),
    analyzer: validAnalyzer(),
    now: () => NOW,
  });
  const report = await useCase.execute(SCOPE, {
    schemaVersion: 'validate-dbt-project-import-request.v1',
    projectRoot: 'analytics',
  });
  if (report.status !== 'accepted') throw new Error('Expected accepted fixture.');
  return report;
}

describe('ValidateDbtProjectImportUseCase', () => {
  it('returns a deterministic accepted receipt only after safe inspection and fresh analysis', async () => {
    const report = await acceptedReport();

    expect(report).toMatchObject({
      status: 'accepted',
      projectName: 'analytics',
      adapterType: 'postgres',
      receipt: {
        projectRoot: 'analytics',
        contentSetSha256: 'a'.repeat(64),
        analysisSha256: 'b'.repeat(64),
        policyVersion: 'dbt-project-import-policy.v1',
        validatedAt: NOW.toISOString(),
      },
    });
    expect(report.receipt.validationSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not invoke dbt for a project rejected by filesystem policy', async () => {
    const analyzer = validAnalyzer();
    const useCase = new ValidateDbtProjectImportUseCase({
      inspector: {
        inspect: vi.fn().mockResolvedValue({
          projectRoot: 'analytics',
          inventory: {
            fileCount: 1,
            totalBytes: 5,
            includedFileCount: 0,
            excludedFileCount: 1,
            files: [
              {
                path: 'analytics/profiles.yml',
                classification: 'secret-material',
                byteSize: 5,
                decision: 'rejected',
                reason: 'Secret material is not accepted.',
              },
            ],
          },
          diagnostics: [
            {
              code: 'dbt_project_secret_material',
              severity: 'error',
              message: 'Secret material is not accepted.',
              path: 'analytics/profiles.yml',
            },
          ],
        }),
      },
      analyzer,
      now: () => NOW,
    });

    const report = await useCase.execute(SCOPE, {
      schemaVersion: 'validate-dbt-project-import-request.v1',
      projectRoot: 'analytics',
    });

    expect(report.status).toBe('rejected');
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it('rejects an analyzer result for a different project root', async () => {
    const baseline = await validAnalyzer().analyze({ scope: SCOPE, projectRoot: 'analytics' });
    const analyzer: IDbtProjectAnalyzerPort = {
      analyze: vi.fn().mockResolvedValue({
        ...baseline,
        projectRevision: {
          ...baseline.projectRevision,
          projectRoot: 'another-project',
        },
      }),
    };
    const useCase = new ValidateDbtProjectImportUseCase({
      inspector: safeInspector(),
      analyzer,
      now: () => NOW,
    });

    const report = await useCase.execute(SCOPE, {
      schemaVersion: 'validate-dbt-project-import-request.v1',
      projectRoot: 'analytics',
    });

    expect(report).toMatchObject({
      status: 'rejected',
      diagnostics: [{ code: 'dbt_project_analysis_failed' }],
    });
  });
});

describe('ImportDbtProjectUseCase', () => {
  it('acquires an unoccupied Canvas process and returns its completed projection', async () => {
    const report = await acceptedReport();
    const processStore = emptyProcessStore();
    const projection = freshProjection();
    const useCase = new ImportDbtProjectUseCase({
      validator: { execute: vi.fn().mockResolvedValue(report) },
      processStore,
      projectGraph: { execute: vi.fn().mockResolvedValue(projection) },
      now: () => NOW,
      createLeaseToken: () => 'lease-a',
      operationLeaseMs: 60_000,
    });

    const result = await useCase.execute(SCOPE, {
      schemaVersion: 'import-dbt-project-command.v1',
      canvasId: 'orders-canvas',
      conflictPolicy: 'require-unbound-canvas',
      idempotencyKey: 'import-orders',
      validationReceipt: report.receipt,
    });

    expect(processStore.begin).toHaveBeenCalledOnce();
    expect(processStore.complete).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      success: true,
      idempotencyKey: 'import-orders',
      authorityBinding: projection.authorityBinding,
      projectedResourceCount: 1,
    });
  });

  it('rejects a stale validation receipt before binding authority', async () => {
    const report = await acceptedReport();
    const processStore = emptyProcessStore();
    const useCase = new ImportDbtProjectUseCase({
      validator: {
        execute: vi.fn().mockResolvedValue({
          ...report,
          receipt: { ...report.receipt, contentSetSha256: 'c'.repeat(64) },
        }),
      },
      processStore,
      projectGraph: { execute: vi.fn() },
      now: () => NOW,
      createLeaseToken: () => 'lease-a',
      operationLeaseMs: 60_000,
    });

    await expect(
      useCase.execute(SCOPE, {
        schemaVersion: 'import-dbt-project-command.v1',
        canvasId: 'orders-canvas',
        conflictPolicy: 'require-unbound-canvas',
        idempotencyKey: 'import-orders',
        validationReceipt: report.receipt,
      })
    ).rejects.toThrow('validation receipt is stale');
    expect(processStore.begin).not.toHaveBeenCalled();
  });

  it('compensates when files change between validation and first projection', async () => {
    const report = await acceptedReport();
    const processStore = emptyProcessStore();
    const baselineProjection = freshProjection();
    const changedProjection = DbtProjectGraphProjectionSchema.parse({
      ...baselineProjection,
      projectRevision: {
        ...baselineProjection.projectRevision,
        contentSetSha256: 'c'.repeat(64),
      },
    });
    const useCase = new ImportDbtProjectUseCase({
      validator: { execute: vi.fn().mockResolvedValue(report) },
      processStore,
      projectGraph: { execute: vi.fn().mockResolvedValue(changedProjection) },
      now: () => NOW,
      createLeaseToken: () => 'lease-a',
      operationLeaseMs: 60_000,
    });

    await expect(
      useCase.execute(SCOPE, {
        schemaVersion: 'import-dbt-project-command.v1',
        canvasId: 'orders-canvas',
        conflictPolicy: 'require-unbound-canvas',
        idempotencyKey: 'import-orders',
        validationReceipt: report.receipt,
      })
    ).rejects.toThrow('fresh projection');
    expect(processStore.fail).toHaveBeenCalledOnce();
  });

  it.each([
    ['conflict', 'already has an authority binding'],
    ['canvas_occupied', 'already has graph-draft authority'],
    ['idempotency_mismatch', 'idempotency key was reused'],
  ] as const)('fails closed on authority %s before projecting', async (kind, message) => {
    const report = await acceptedReport();
    const projectGraph = { execute: vi.fn() };
    const processStore = emptyProcessStore();
    processStore.begin.mockResolvedValue(
      kind === 'conflict'
        ? {
            kind,
            current: {
              key: { ...SCOPE, canvasId: 'orders-canvas' },
              binding: freshProjection().authorityBinding,
              revision: 'authority-existing',
              updatedAt: NOW.toISOString(),
            },
          }
        : { kind }
    );
    const useCase = new ImportDbtProjectUseCase({
      validator: { execute: vi.fn().mockResolvedValue(report) },
      processStore,
      projectGraph,
      now: () => NOW,
      createLeaseToken: () => 'lease-a',
      operationLeaseMs: 60_000,
    });

    await expect(
      useCase.execute(SCOPE, {
        schemaVersion: 'import-dbt-project-command.v1',
        canvasId: 'orders-canvas',
        conflictPolicy: 'require-unbound-canvas',
        idempotencyKey: 'import-orders',
        validationReceipt: report.receipt,
      })
    ).rejects.toThrow(message);
    expect(projectGraph.execute).not.toHaveBeenCalled();
  });
});

function emptyProcessStore(): IDbtProjectImportProcessStore & {
  begin: ReturnType<typeof vi.fn>;
  complete: ReturnType<typeof vi.fn>;
  fail: ReturnType<typeof vi.fn>;
} {
  return {
    migrate: vi.fn(),
    close: vi.fn(),
    readCompleted: vi.fn().mockResolvedValue(null),
    begin: vi.fn(async (input: Parameters<IDbtProjectImportProcessStore['begin']>[0]) => ({
      kind: 'acquired' as const,
      leaseToken: input.leaseToken,
      recovered: false,
      record: {
        key: input.key,
        binding: input.binding,
        revision: input.revision,
        updatedAt: input.nowIso,
      },
    })),
    complete: vi.fn(async (input: { requestHash: string; result: DbtProjectImportResult }) => ({
      kind: 'completed' as const,
      receipt: { requestHash: input.requestHash, result: input.result },
      deduplicated: false,
    })),
    fail: vi.fn().mockResolvedValue({ kind: 'failed' as const }),
  };
}

function freshProjection(): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'orders-canvas',
      authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
    },
    freshness: 'fresh',
    projectRevision: {
      projectRoot: 'analytics',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: NOW.toISOString(),
      analyzerVersion: 'dvt-dbt-analyzer.v1',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'b'.repeat(64),
    nodes: [
      {
        uniqueId: 'model.analytics.orders',
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['file-backed'] },
      },
    ],
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 1 },
  });
}
