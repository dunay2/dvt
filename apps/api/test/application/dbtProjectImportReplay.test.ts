import { createHash } from 'node:crypto';

import {
  DbtProjectGraphProjectionSchema,
  DbtProjectImportCommandSchema,
  DbtProjectImportResultSchema,
  type DbtProjectImportCommand,
} from '@dvt/contracts';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { ImportDbtProjectUseCase } from '../../src/application/services/importDbtProjectUseCase.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;
const NOW = new Date('2026-07-14T10:00:00.000Z');
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

describe('ImportDbtProjectUseCase completed-command replay', () => {
  it('replays an accepted import before validating later project changes', async () => {
    const deps = replayDeps({ requestHash: commandHash(COMMAND), result: RESULT });
    const useCase = new ImportDbtProjectUseCase(deps as never);

    await expect(useCase.execute(SCOPE, COMMAND)).resolves.toEqual(RESULT);
    expect(deps.receiptStore.read).toHaveBeenCalledOnce();
    expect(deps.validator.execute).not.toHaveBeenCalled();
    expect(deps.graphDraftStore.read).not.toHaveBeenCalled();
    expect(deps.authorityStore.bind).not.toHaveBeenCalled();
    expect(deps.projectGraph.execute).not.toHaveBeenCalled();
  });

  it('rejects a reused idempotency key before validating mutable project state', async () => {
    const deps = replayDeps({ requestHash: 'different-command', result: RESULT });
    const useCase = new ImportDbtProjectUseCase(deps as never);

    await expect(useCase.execute(SCOPE, COMMAND)).rejects.toThrow(
      'idempotency key was reused for another command'
    );
    expect(deps.validator.execute).not.toHaveBeenCalled();
  });

  it('releases newly bound authority when the accepted result cannot be persisted', async () => {
    const release = vi.fn().mockResolvedValue({ kind: 'released' });
    const useCase = new ImportDbtProjectUseCase({
      validator: {
        execute: vi.fn().mockResolvedValue({ status: 'accepted', receipt: RECEIPT }),
      },
      authorityStore: {
        bind: vi.fn().mockResolvedValue({
          kind: 'bound',
          deduplicated: false,
          record: {
            key: { ...SCOPE, canvasId: COMMAND.canvasId },
            binding: PROJECTION.authorityBinding,
            revision: 'authority-1',
            updatedAt: NOW.toISOString(),
          },
        }),
        release,
      },
      graphDraftStore: { read: vi.fn().mockResolvedValue(null) },
      receiptStore: {
        read: vi.fn().mockResolvedValue(null),
        record: vi.fn().mockRejectedValue(new Error('receipt write failed')),
      },
      projectGraph: { execute: vi.fn().mockResolvedValue(PROJECTION) },
      now: () => NOW,
    } as never);

    await expect(useCase.execute(SCOPE, COMMAND)).rejects.toThrow('receipt write failed');
    expect(release).toHaveBeenCalledOnce();
  });
});

type ReplayDeps = Readonly<{
  validator: Readonly<{ execute: Mock }>;
  authorityStore: Readonly<{ bind: Mock }>;
  graphDraftStore: Readonly<{ read: Mock }>;
  receiptStore: Readonly<{ read: Mock; record: Mock }>;
  projectGraph: Readonly<{ execute: Mock }>;
  now: () => Date;
}>;

function replayDeps(storedReceipt: { requestHash: string; result: typeof RESULT }): ReplayDeps {
  return {
    validator: { execute: vi.fn() },
    authorityStore: { bind: vi.fn() },
    graphDraftStore: { read: vi.fn() },
    receiptStore: { read: vi.fn().mockResolvedValue(storedReceipt), record: vi.fn() },
    projectGraph: { execute: vi.fn() },
    now: () => NOW,
  };
}

function commandHash(command: DbtProjectImportCommand): string {
  return createHash('sha256').update(JSON.stringify(command), 'utf8').digest('hex');
}
