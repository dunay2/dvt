import { createHash } from 'node:crypto';

import {
  DbtProjectGraphProjectionSchema,
  type DbtYamlDescriptionAppliedReceipt,
  type DbtYamlDescriptionRevertedReceipt,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  DbtYamlDescriptionReceiptInvalidError,
  DbtYamlDescriptionRevisionConflictError,
  type IDbtYamlDescriptionReceiptStore,
} from '../../../../src/application/ports/dbtYamlDescriptionEdit.js';
import { WorkspaceFileNotFoundError } from '../../../../src/application/ports/workspaceFiles.js';
import type { WorkspaceFileBatchMutation } from '../../../../src/application/ports/workspaceFiles.js';
import { RevertDbtYamlDescriptionEditCommand } from '../../../../src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.js';
import { YamlCstDbtDescriptionMutator } from '../../../../src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.js';

const SCOPE = { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' } as const;
const PATH = 'analytics/models/orders.yml';
const INITIAL_CONTENT = [
  'version: 2',
  'models:',
  '  - name: orders',
  '    description: Old description',
  '',
].join('\n');
const RESOURCE = {
  uniqueId: 'model.analytics.orders',
  resourceType: 'model' as const,
  name: 'orders',
  packageName: 'analytics',
};
const APPLIED_CONTENT = new YamlCstDbtDescriptionMutator().mutate({
  content: INITIAL_CONTENT,
  resource: RESOURCE,
  nextDescription: 'Customer orders',
}).content;

describe('RevertDbtYamlDescriptionEditCommand', () => {
  it('loads the trusted applied receipt, conditionally restores, and binds analysis', async () => {
    const harness = createHarness();

    const reverted = await harness.command.revert({
      scope: SCOPE,
      appliedReceiptId: harness.applied.receiptId,
      idempotencyKey: 'revert-1',
    });

    expect(harness.content()).toBe(INITIAL_CONTENT);
    expect(reverted.appliedReceiptId).toBe(harness.applied.receiptId);
    expect(reverted.analysis.targetContentSha256).toBe(reverted.revertedContentSha256);
    expect(harness.revertedReceipts.get(reverted.receiptId)).toEqual(reverted);
  });

  it('rejects unknown receipts and stale or missing targets as governed conflicts', async () => {
    const unknownHarness = createHarness();
    await expect(
      unknownHarness.command.revert({
        scope: SCOPE,
        appliedReceiptId: '9'.repeat(64),
        idempotencyKey: 'unknown',
      })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionReceiptInvalidError);

    const staleHarness = createHarness();
    staleHarness.replaceContent(APPLIED_CONTENT.replace('Customer orders', 'Later edit'));
    await expect(
      staleHarness.command.revert({
        scope: SCOPE,
        appliedReceiptId: staleHarness.applied.receiptId,
        idempotencyKey: 'stale',
      })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionRevisionConflictError);

    const missingHarness = createHarness({ missingTarget: true });
    await expect(
      missingHarness.command.revert({
        scope: SCOPE,
        appliedReceiptId: missingHarness.applied.receiptId,
        idempotencyKey: 'missing',
      })
    ).rejects.toMatchObject({ currentContentSha256: null });
  });

  it('returns a trusted replay without reading the mutable project again', async () => {
    const harness = createHarness();
    const input = {
      scope: SCOPE,
      appliedReceiptId: harness.applied.receiptId,
      idempotencyKey: 'revert-replay',
    } as const;
    const first = await harness.command.revert(input);
    harness.getFileContent.mockRejectedValue(new Error('File should not be read for replay.'));

    await expect(harness.command.revert(input)).resolves.toEqual({
      ...first,
      deduplicated: true,
    });
    expect(harness.mutations).toHaveLength(1);
  });
});

function createHarness(options: { missingTarget?: boolean } = {}): {
  command: RevertDbtYamlDescriptionEditCommand;
  applied: DbtYamlDescriptionAppliedReceipt;
  getFileContent: ReturnType<typeof vi.fn>;
  mutations: WorkspaceFileBatchMutation[];
  revertedReceipts: Map<string, DbtYamlDescriptionRevertedReceipt>;
  content: () => string;
  replaceContent: (next: string) => void;
} {
  let content = APPLIED_CONTENT;
  const mutations: WorkspaceFileBatchMutation[] = [];
  const revertedReceipts = new Map<string, DbtYamlDescriptionRevertedReceipt>();
  const applied = appliedReceipt();
  const getFileContent = vi.fn(async () => {
    if (options.missingTarget === true) throw new WorkspaceFileNotFoundError(PATH);
    return {
      path: PATH,
      name: 'orders.yml',
      language: 'yaml',
      content,
      contentSha256: sha256(content),
      lastModified: '2026-07-17T10:00:00.000Z',
    };
  });
  const receipts: IDbtYamlDescriptionReceiptStore = {
    findApplied: async (_scope, id) => (id === applied.receiptId ? applied : null),
    saveApplied: async () => undefined,
    findReverted: async (_scope, id) => revertedReceipts.get(id) ?? null,
    saveReverted: async (_scope, receipt) => {
      revertedReceipts.set(receipt.receiptId, receipt);
    },
  };
  const batchMutation = {
    apply: vi.fn(async (_scope, mutation: WorkspaceFileBatchMutation) => {
      const expected = mutation.expectedFiles[0]?.expectedContentSha256 ?? null;
      if (expected !== sha256(content)) {
        return {
          kind: 'conflict' as const,
          conflicts: [{ path: PATH, currentContentSha256: sha256(content) }],
        };
      }
      const write = mutation.writes[0];
      if (!write) throw new Error('Expected one write.');
      content = write.content;
      mutations.push(mutation);
      return {
        kind: 'applied' as const,
        idempotencyKey: mutation.idempotencyKey,
        requestHash: sha256(JSON.stringify(mutation)),
        deduplicated: false,
        writes: [{ path: PATH, contentSha256: sha256(content) }],
        deletes: [],
      };
    }),
  };
  const projectGraph = {
    execute: vi.fn(async () =>
      DbtProjectGraphProjectionSchema.parse({
        schemaVersion: 'dbt-project-graph-projection.v1',
        authorityBinding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: 'canvas-1',
          authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
        },
        freshness: 'fresh',
        projectRevision: {
          projectRoot: 'analytics',
          projectName: 'analytics',
          contentSetSha256: sha256(content),
          analyzedAt: '2026-07-17T10:00:00.000Z',
          analyzerVersion: 'test',
          dbtVersion: '1.10.0',
        },
        analysisSha256: sha256(content),
        adapterType: 'postgres',
        nodes: [],
        edges: [],
        diagnostics: [],
        executionTarget: {
          provider: 'temporal',
          adapter: 'postgres',
          targetName: 'dev',
          credentialRef: 'env:DBT_PROFILES_DIR',
        },
        capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 0 },
      })
    ),
  };
  return {
    command: new RevertDbtYamlDescriptionEditCommand({
      workspaceFiles: { getFileContent },
      batchMutation,
      mutator: new YamlCstDbtDescriptionMutator(),
      projectGraph,
      receipts,
    }),
    applied,
    getFileContent,
    mutations,
    revertedReceipts,
    content: () => content,
    replaceContent: (next: string) => {
      content = next;
    },
  };
}

function appliedReceipt(): DbtYamlDescriptionAppliedReceipt {
  return {
    schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
    receiptId: 'd'.repeat(64),
    canvasId: 'canvas-1',
    resource: RESOURCE,
    path: PATH,
    previousDescription: 'Old description',
    nextDescription: 'Customer orders',
    expectedContentSha256: sha256(INITIAL_CONTENT),
    appliedContentSha256: sha256(APPLIED_CONTENT),
    proposalDigest: 'c'.repeat(64),
    idempotencyKey: 'edit-1',
    requestHash: 'e'.repeat(64),
    deduplicated: false,
    analysis: {
      freshness: 'fresh',
      analysisSha256: 'f'.repeat(64),
      projectContentSetSha256: sha256(APPLIED_CONTENT),
      targetContentSha256: sha256(APPLIED_CONTENT),
    },
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
