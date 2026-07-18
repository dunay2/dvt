import { createHash } from 'node:crypto';

import type { DbtYamlDescriptionAppliedReceipt } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { DbtYamlDescriptionReceiptInvalidError } from '../../../src/application/ports/dbtYamlDescriptionEdit.js';
import type {
  IWorkspaceMetadataFileRepository,
  WorkspaceFileContent,
  WorkspaceStorageScope,
} from '../../../src/application/ports/workspaceFiles.js';
import { WorkspaceMetadataDbtYamlDescriptionReceiptStore } from '../../../src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.js';

const SCOPE: WorkspaceStorageScope = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'dev',
};

describe('WorkspaceMetadataDbtYamlDescriptionReceiptStore', () => {
  it('stores and reads an immutable applied receipt below server-owned metadata', async () => {
    const metadataFiles = inMemoryMetadataFiles();
    const store = new WorkspaceMetadataDbtYamlDescriptionReceiptStore({ metadataFiles });
    const receipt = appliedReceipt();

    await store.saveApplied(SCOPE, receipt);

    await expect(store.findApplied(SCOPE, receipt.receiptId)).resolves.toEqual(receipt);
    expect(metadataFiles.paths()).toEqual([
      `.dvt/dbt-yaml-description-receipts/applied/${receipt.receiptId}.json`,
    ]);
  });

  it('rejects a receipt-id collision instead of replacing trusted evidence', async () => {
    const metadataFiles = inMemoryMetadataFiles();
    const store = new WorkspaceMetadataDbtYamlDescriptionReceiptStore({ metadataFiles });
    const receipt = appliedReceipt();
    await store.saveApplied(SCOPE, receipt);

    await expect(
      store.saveApplied(SCOPE, { ...receipt, nextDescription: 'Forged value' })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionReceiptInvalidError);
  });
});

function inMemoryMetadataFiles(): IWorkspaceMetadataFileRepository & { paths(): string[] } {
  const files = new Map<string, string>();
  return {
    paths: () => [...files.keys()].sort(),
    getFileContent: async (_scope, path): Promise<WorkspaceFileContent> => {
      const content = files.get(path);
      if (content === undefined) {
        const { WorkspaceFileNotFoundError } =
          await import('../../../src/application/ports/workspaceFiles.js');
        throw new WorkspaceFileNotFoundError(path);
      }
      return {
        path,
        name: path.split('/').at(-1) ?? path,
        language: 'json',
        content,
        contentSha256: sha256(content),
        lastModified: '2026-07-17T10:00:00.000Z',
      };
    },
    saveFileContent: async (_scope, input) => {
      const current = files.get(input.path);
      if (input.expectedRevision.kind === 'absent' && current !== undefined) {
        return { kind: 'conflict', currentContentSha256: sha256(current) };
      }
      files.set(input.path, input.content);
      return {
        kind: 'saved',
        disposition: current === undefined ? 'created' : 'updated',
        path: input.path,
        contentSha256: sha256(input.content),
        lastModified: '2026-07-17T10:00:00.000Z',
      };
    },
  };
}

function appliedReceipt(): DbtYamlDescriptionAppliedReceipt {
  return {
    schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
    receiptId: 'd'.repeat(64),
    canvasId: 'canvas-1',
    resource: {
      uniqueId: 'model.analytics.orders',
      resourceType: 'model',
      name: 'orders',
      packageName: 'analytics',
    },
    path: 'analytics/models/schema.yml',
    previousDescription: 'Old description',
    nextDescription: 'Customer orders',
    expectedContentSha256: 'a'.repeat(64),
    appliedContentSha256: 'b'.repeat(64),
    proposalDigest: 'c'.repeat(64),
    idempotencyKey: 'edit-1',
    requestHash: 'e'.repeat(64),
    deduplicated: false,
    analysis: {
      freshness: 'fresh',
      analysisSha256: 'f'.repeat(64),
      projectContentSetSha256: '1'.repeat(64),
      targetContentSha256: 'b'.repeat(64),
    },
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
