import {
  DbtDependencyEditAppliedReceiptSchema,
  type DbtDependencyEditAppliedReceipt,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceFileNotFoundError } from '../../../src/application/ports/workspaceFiles.js';
import { WorkspaceMetadataDbtDependencyEditReceiptStore } from '../../../src/infrastructure/dbtDependencyEdit/WorkspaceMetadataDbtDependencyEditReceiptStore.js';

const SCOPE = { tenantId: 't', projectId: 'p', environmentId: 'e' } as const;

describe('WorkspaceMetadataDbtDependencyEditReceiptStore', () => {
  it('stores an immutable receipt and reads the same validated value', async () => {
    const receipt = appliedReceipt();
    const saved = new Map<string, string>();
    const store = new WorkspaceMetadataDbtDependencyEditReceiptStore({
      metadataFiles: {
        getFileContent: vi.fn(async (_scope, path) => {
          const content = saved.get(path);
          if (content === undefined) throw new WorkspaceFileNotFoundError(path);
          return {
            path,
            name: 'receipt.json',
            language: 'json',
            content,
            contentSha256: 'f'.repeat(64),
            lastModified: '2026-08-01T00:00:00.000Z',
          };
        }),
        saveFileContent: vi.fn(async (_scope, input) => {
          saved.set(input.path, input.content);
          return {
            kind: 'saved' as const,
            disposition: 'created' as const,
            path: input.path,
            contentSha256: 'f'.repeat(64),
            lastModified: '2026-08-01T00:00:00.000Z',
          };
        }),
      },
    });

    await store.saveApplied(SCOPE, receipt);

    await expect(store.findApplied(SCOPE, receipt.receiptId)).resolves.toEqual(receipt);
    expect([...saved.keys()]).toEqual([
      `.dvt/dbt-dependency-edit-receipts/applied/${receipt.receiptId}.json`,
    ]);
  });
});

function appliedReceipt(): DbtDependencyEditAppliedReceipt {
  return DbtDependencyEditAppliedReceiptSchema.parse({
    schemaVersion: 'dbt-dependency-edit-applied-receipt.v1',
    receiptId: '1'.repeat(64),
    canvasId: 'canvas-orders',
    selectedUniqueId: 'model.analytics.orders',
    regionId: 'region-source',
    path: 'analytics/models/orders.sql',
    previousTargetUniqueId: 'source.analytics.raw.orders',
    nextTargetUniqueId: 'source.analytics.raw.customers',
    expectedContentSha256: '2'.repeat(64),
    appliedContentSha256: '3'.repeat(64),
    previousProjectContentSetSha256: '4'.repeat(64),
    projectContentSetSha256: '5'.repeat(64),
    previousAnalysisSha256: '6'.repeat(64),
    analysisSha256: '7'.repeat(64),
    previousSelectedAnalysisSha256: '8'.repeat(64),
    selectedAnalysisSha256: '9'.repeat(64),
    idempotencyKey: 'edit-1',
    requestHash: 'a'.repeat(64),
    deduplicated: false,
  });
}
