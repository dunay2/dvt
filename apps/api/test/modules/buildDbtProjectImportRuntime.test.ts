import type { DbtProjectImportCommand } from '@dvt/contracts';
import { describe, expect, it, vi, type Mock } from 'vitest';

import type { ICanvasAuthoringAuthorityStore } from '../../src/application/ports/canvasAuthoringAuthority.js';
import type {
  IDbtProjectAnalyzerPort,
  IDbtProjectSourceRevisionReader,
} from '../../src/application/ports/dbtProjectAnalysis.js';
import type { IDbtProjectImportProcessStore } from '../../src/application/ports/dbtProjectImport.js';
import { CanvasAuthoringAuthorityPolicy } from '../../src/application/services/canvasAuthoringAuthorityPolicy.js';
import { buildDbtProjectImportRuntime } from '../../src/modules/dbtProjectImport/buildDbtProjectImportRuntime.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;

describe('buildDbtProjectImportRuntime', () => {
  it('shares one analyzer across independent fresh validation and projection queries', async () => {
    const { runtime, analyzer } = buildFixture(true);

    const validation = await runtime.validateUseCase.execute(SCOPE, {
      schemaVersion: 'validate-dbt-project-import-request.v1',
      projectRoot: 'analytics',
    });
    const projection = await runtime.projectGraphUseCase.execute({
      scope: SCOPE,
      canvasId: 'orders-canvas',
    });

    expect(validation.status).toBe('accepted');
    expect(projection.freshness).toBe('fresh');
    expect(analyzer.analyze).toHaveBeenCalledTimes(2);
    expect(analyzer.analyze).toHaveBeenNthCalledWith(1, {
      scope: SCOPE,
      projectRoot: 'analytics',
    });
    expect(analyzer.analyze).toHaveBeenNthCalledWith(2, {
      scope: SCOPE,
      projectRoot: 'analytics',
    });
  });

  it('analyzes once per new import and never reanalyzes its completed replay', async () => {
    const { runtime, analyzer, processStore, sourceRevisionReader } = buildFixture();
    const validation = await runtime.validateUseCase.execute(SCOPE, {
      schemaVersion: 'validate-dbt-project-import-request.v1',
      projectRoot: 'analytics',
    });
    if (validation.status !== 'accepted') throw new Error('Expected accepted validation');
    const command: DbtProjectImportCommand = {
      schemaVersion: 'import-dbt-project-command.v1',
      canvasId: 'orders-canvas',
      conflictPolicy: 'require-unbound-canvas',
      idempotencyKey: 'import-orders',
      validationReceipt: validation.receipt,
    };
    analyzer.analyze.mockClear();
    const result = await runtime.importUseCase.execute(SCOPE, command);
    expect(result).toMatchObject({ success: true, projectedResourceCount: 0 });
    expect(analyzer.analyze).toHaveBeenCalledTimes(1);
    expect(processStore.complete).toHaveBeenCalledOnce();
    expect(sourceRevisionReader.readSourceRevision).toHaveBeenCalledOnce();
    analyzer.analyze.mockClear();
    sourceRevisionReader.readSourceRevision.mockClear();
    sourceRevisionReader.readSourceRevision.mockRejectedValue(
      new Error('Files changed after completion')
    );
    analyzer.analyze.mockRejectedValue(new Error('Files changed after completion'));
    await expect(runtime.importUseCase.execute(SCOPE, command)).resolves.toEqual(result);
    expect(analyzer.analyze).not.toHaveBeenCalled();
    expect(sourceRevisionReader.readSourceRevision).not.toHaveBeenCalled();
    expect(processStore.begin).toHaveBeenCalledOnce();
  });

  it.each(['changed', 'unreadable'] as const)(
    'compensates when source becomes %s during authority acquisition',
    async (failure) => {
      const { runtime, analyzer, processStore, sourceRevisionReader } = buildFixture();
      const validation = await runtime.validateUseCase.execute(SCOPE, {
        schemaVersion: 'validate-dbt-project-import-request.v1',
        projectRoot: 'analytics',
      });
      if (validation.status !== 'accepted') throw new Error('Expected accepted validation');
      const acquire = processStore.begin.getMockImplementation();
      if (acquire === undefined) throw new Error('Expected acquired process fixture');
      processStore.begin.mockImplementation(async (input) => {
        if (failure === 'changed')
          sourceRevisionReader.readSourceRevision.mockResolvedValue('c'.repeat(64));
        else
          sourceRevisionReader.readSourceRevision.mockRejectedValue(
            new Error('Source became unreadable')
          );
        return acquire(input);
      });
      analyzer.analyze.mockClear();
      await expect(
        runtime.importUseCase.execute(SCOPE, {
          schemaVersion: 'import-dbt-project-command.v1',
          canvasId: 'orders-canvas',
          conflictPolicy: 'require-unbound-canvas',
          idempotencyKey: 'import-orders',
          validationReceipt: validation.receipt,
        })
      ).rejects.toThrow(failure === 'changed' ? 'fresh projection' : 'Source became unreadable');
      expect(analyzer.analyze).toHaveBeenCalledTimes(1);
      expect(sourceRevisionReader.readSourceRevision).toHaveBeenCalledOnce();
      expect(processStore.fail).toHaveBeenCalledOnce();
      expect(processStore.complete).not.toHaveBeenCalled();
    }
  );
});

type MockProcessStore = {
  [Method in keyof IDbtProjectImportProcessStore]: Mock<IDbtProjectImportProcessStore[Method]>;
};

function buildFixture(persistedAuthority = false): {
  runtime: ReturnType<typeof buildDbtProjectImportRuntime>;
  analyzer: { analyze: Mock<IDbtProjectAnalyzerPort['analyze']> };
  sourceRevisionReader: {
    readSourceRevision: Mock<IDbtProjectSourceRevisionReader['readSourceRevision']>;
  };
  processStore: MockProcessStore;
} {
  const analyzer = {
    analyze: vi.fn<IDbtProjectAnalyzerPort['analyze']>().mockResolvedValue({
      status: 'valid',
      adapterType: 'postgres',
      projectRevision: {
        projectRoot: 'analytics',
        projectName: 'analytics',
        contentSetSha256: 'a'.repeat(64),
        analyzedAt: '2026-07-14T10:00:00.000Z',
        analyzerVersion: 'dvt-dbt-analyzer.v1',
        dbtVersion: '1.10.0',
      },
      analysisSha256: 'b'.repeat(64),
      resources: [],
      dependencies: [],
      diagnostics: [],
      semanticEvidence: { files: [], identities: [], regions: [], diagnostics: [] },
    }),
  };
  const authorityStore = {
    read: vi.fn<ICanvasAuthoringAuthorityStore['read']>().mockResolvedValue(
      persistedAuthority
        ? {
            key: { ...SCOPE, canvasId: 'orders-canvas' },
            revision: 'existing-authority',
            updatedAt: '2026-07-14T10:00:00.000Z',
            binding: {
              schemaVersion: 'canvas-authoring-authority-binding.v1',
              canvasId: 'orders-canvas',
              authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
            },
          }
        : null
    ),
  };
  const processStore: MockProcessStore = {
    migrate: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    readCompleted: vi.fn<IDbtProjectImportProcessStore['readCompleted']>().mockResolvedValue(null),
    begin: vi.fn<IDbtProjectImportProcessStore['begin']>().mockImplementation(async (input) => {
      const record = {
        key: input.key,
        binding: input.binding,
        revision: input.revision,
        updatedAt: input.nowIso,
      };
      authorityStore.read.mockResolvedValue(record);
      return { kind: 'acquired', leaseToken: input.leaseToken, recovered: false, record };
    }),
    complete: vi
      .fn<IDbtProjectImportProcessStore['complete']>()
      .mockImplementation(async (input) => {
        const receipt = { requestHash: input.requestHash, result: input.result };
        processStore.readCompleted.mockResolvedValue(receipt);
        return { kind: 'completed', receipt, deduplicated: false };
      }),
    fail: vi.fn<IDbtProjectImportProcessStore['fail']>().mockResolvedValue({ kind: 'failed' }),
  } satisfies IDbtProjectImportProcessStore;
  const sourceRevisionReader = {
    readSourceRevision: vi
      .fn<IDbtProjectSourceRevisionReader['readSourceRevision']>()
      .mockResolvedValue('a'.repeat(64)),
  };
  const runtime = buildDbtProjectImportRuntime({
    analyzer,
    sourceRevisionReader,
    executionConnectionBindingVerifier: { verify: vi.fn(async () => true) },
    executionTargetResolver: {
      resolve: () => ({
        provider: 'temporal',
        adapter: 'postgres',
        targetName: 'production',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-production',
          provider: 'postgres',
        },
        resolutionSource: 'environment-default',
        credentialRef: 'env:DBT_PROFILES_DIR',
      }),
    },
    inspector: {
      inspect: vi.fn().mockResolvedValue({
        projectRoot: 'analytics',
        projectName: 'analytics',
        inventory: {
          fileCount: 1,
          totalBytes: 10,
          includedFileCount: 1,
          excludedFileCount: 0,
          files: [
            {
              path: 'analytics/dbt_project.yml',
              classification: 'project-config',
              byteSize: 10,
              decision: 'included',
            },
          ],
        },
        diagnostics: [],
      }),
    },
    authorityPolicy: new CanvasAuthoringAuthorityPolicy(authorityStore as never, {
      read: vi.fn().mockResolvedValue(null),
    }),
    warehouseConnectionCatalog: {
      getConnection: vi.fn(async () => ({
        id: 'warehouse-production',
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
        sourceObjects: [],
      })),
    } as never,
    processStore,
    now: () => new Date('2026-07-14T10:00:00.000Z'),
    createLeaseToken: () => 'lease-a',
    operationLeaseMs: 60_000,
  });

  return { runtime, analyzer, processStore, sourceRevisionReader };
}
