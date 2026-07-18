import { createHash } from 'node:crypto';

import {
  DbtProjectGraphProjectionSchema,
  DbtProjectImportCommandSchema,
  DbtProjectImportResultSchema,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { ImportDbtProjectUseCase } from '../../src/application/services/importDbtProjectUseCase.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;
const NOW = new Date('2026-07-15T10:00:00.000Z');
const RECEIPT = {
  schemaVersion: 'dbt-project-import-validation-receipt.v1' as const,
  projectRoot: 'analytics',
  contentSetSha256: 'a'.repeat(64),
  analysisSha256: 'b'.repeat(64),
  validationSha256: 'c'.repeat(64),
  policyVersion: 'dbt-project-import-policy.v1' as const,
  validatedAt: NOW.toISOString(),
};
const COMMAND = DbtProjectImportCommandSchema.parse({
  schemaVersion: 'import-dbt-project-command.v1',
  canvasId: 'orders-canvas',
  conflictPolicy: 'require-unbound-canvas',
  idempotencyKey: 'import-orders',
  validationReceipt: RECEIPT,
});
const PROJECTION = DbtProjectGraphProjectionSchema.parse({
  schemaVersion: 'dbt-project-graph-projection.v1',
  authorityBinding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: COMMAND.canvasId,
    authority: { kind: 'dbt-project-files', projectRoot: RECEIPT.projectRoot },
  },
  freshness: 'fresh',
  projectRevision: {
    projectRoot: RECEIPT.projectRoot,
    projectName: 'analytics',
    contentSetSha256: RECEIPT.contentSetSha256,
    analyzedAt: NOW.toISOString(),
    analyzerVersion: 'dvt-dbt-analyzer.v1',
  },
  analysisSha256: RECEIPT.analysisSha256,
  nodes: [],
  edges: [],
  diagnostics: [],
  capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 0 },
});
const RESULT = DbtProjectImportResultSchema.parse({
  schemaVersion: 'dbt-project-import-result.v1',
  success: true,
  idempotencyKey: COMMAND.idempotencyKey,
  authorityBinding: PROJECTION.authorityBinding,
  projectRevision: PROJECTION.projectRevision,
  analysisSha256: PROJECTION.analysisSha256,
  projectedResourceCount: 0,
  importedAt: NOW.toISOString(),
});

describe('ImportDbtProjectUseCase process recovery', () => {
  it('replays a completed process before consulting mutable project state', async () => {
    const deps = createDeps();
    deps.processStore.readCompleted.mockResolvedValue({
      requestHash: commandHash(),
      result: RESULT,
    });

    await expect(
      new ImportDbtProjectUseCase(deps as never).execute(SCOPE, COMMAND)
    ).resolves.toEqual(RESULT);

    expect(deps.validator.execute).not.toHaveBeenCalled();
    expect(deps.processStore.begin).not.toHaveBeenCalled();
    expect(deps.projectGraph.execute).not.toHaveBeenCalled();
  });

  it('completes a newly acquired process under its lease token', async () => {
    const deps = createDeps();

    await expect(
      new ImportDbtProjectUseCase(deps as never).execute(SCOPE, COMMAND)
    ).resolves.toEqual(RESULT);

    expect(deps.processStore.begin).toHaveBeenCalledWith(
      expect.objectContaining({ leaseToken: 'lease-a', requestHash: commandHash() })
    );
    expect(deps.processStore.complete).toHaveBeenCalledWith(
      expect.objectContaining({ leaseToken: 'lease-a', result: RESULT })
    );
    expect(deps.processStore.fail).not.toHaveBeenCalled();
  });

  it('compensates an acquired recovery lease when projection fails', async () => {
    const deps = createDeps();
    deps.processStore.begin.mockResolvedValue({
      kind: 'acquired',
      leaseToken: 'lease-a',
      recovered: true,
      record: authorityRecord(),
    });
    deps.projectGraph.execute.mockRejectedValue(new Error('projection failed'));

    await expect(
      new ImportDbtProjectUseCase(deps as never).execute(SCOPE, COMMAND)
    ).rejects.toThrow('projection failed');

    expect(deps.processStore.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        leaseToken: 'lease-a',
        expectedRevision: authorityRecord().revision,
        requestHash: commandHash(),
      })
    );
  });

  it('fails closed when another live owner already holds the process lease', async () => {
    const deps = createDeps();
    deps.processStore.begin.mockResolvedValue({
      kind: 'in_progress',
      leaseExpiresAt: '2026-07-15T10:01:00.000Z',
    });

    await expect(
      new ImportDbtProjectUseCase(deps as never).execute(SCOPE, COMMAND)
    ).rejects.toThrow('already in progress');
    expect(deps.projectGraph.execute).not.toHaveBeenCalled();
  });

  it('does not compensate after the lease has been recovered by another owner', async () => {
    const deps = createDeps();
    deps.projectGraph.execute.mockRejectedValue(new Error('projection failed'));
    deps.processStore.fail.mockResolvedValue({ kind: 'lease_lost' });

    await expect(
      new ImportDbtProjectUseCase(deps as never).execute(SCOPE, COMMAND)
    ).rejects.toThrow('lease ownership was lost');
  });

  it('preserves the import failure when compensation persistence is unavailable', async () => {
    const deps = createDeps();
    deps.projectGraph.execute.mockRejectedValue(new Error('projection failed'));
    deps.processStore.fail.mockRejectedValue(new Error('process store unavailable'));

    const failure = await new ImportDbtProjectUseCase(deps as never)
      .execute(SCOPE, COMMAND)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AggregateError);
    expect(failure).toMatchObject({
      message: 'dbt project import failed and process compensation could not be persisted.',
      errors: [
        expect.objectContaining({ message: 'projection failed' }),
        expect.objectContaining({ message: 'process store unavailable' }),
      ],
    });
  });
});

function createDeps(): {
  validator: { execute: ReturnType<typeof vi.fn> };
  processStore: {
    readCompleted: ReturnType<typeof vi.fn>;
    begin: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
    fail: ReturnType<typeof vi.fn>;
  };
  projectGraph: { execute: ReturnType<typeof vi.fn> };
  now: () => Date;
  createLeaseToken: () => string;
  operationLeaseMs: number;
} {
  const record = authorityRecord();
  return {
    validator: {
      execute: vi.fn().mockResolvedValue({ status: 'accepted', receipt: RECEIPT }),
    },
    processStore: {
      readCompleted: vi.fn().mockResolvedValue(null),
      begin: vi.fn().mockResolvedValue({
        kind: 'acquired',
        leaseToken: 'lease-a',
        recovered: false,
        record,
      }),
      complete: vi.fn().mockImplementation(async (input: { result: typeof RESULT }) => ({
        kind: 'completed',
        receipt: { requestHash: commandHash(), result: input.result },
        deduplicated: false,
      })),
      fail: vi.fn().mockResolvedValue({ kind: 'failed' }),
    },
    projectGraph: { execute: vi.fn().mockResolvedValue(PROJECTION) },
    now: () => NOW,
    createLeaseToken: () => 'lease-a',
    operationLeaseMs: 60_000,
  };
}

function authorityRecord(): {
  key: typeof SCOPE & { canvasId: string };
  binding: typeof PROJECTION.authorityBinding;
  revision: string;
  updatedAt: string;
} {
  return {
    key: { ...SCOPE, canvasId: COMMAND.canvasId },
    binding: PROJECTION.authorityBinding,
    revision: `authority-${RECEIPT.validationSha256}`,
    updatedAt: NOW.toISOString(),
  };
}

function commandHash(): string {
  return createHash('sha256').update(JSON.stringify(COMMAND), 'utf8').digest('hex');
}
