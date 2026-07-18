import { createHash } from 'node:crypto';

import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  DbtYamlDescriptionProposalMismatchError,
  DbtYamlDescriptionRevisionConflictError,
  type IDbtYamlDescriptionMutator,
} from '../../../../src/application/ports/dbtYamlDescriptionEdit.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchMutation,
  WorkspaceStorageScope,
} from '../../../../src/application/ports/workspaceFiles.js';
import { DbtYamlDescriptionEditTransaction } from '../../../../src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.js';
import { YamlCstDbtDescriptionMutator } from '../../../../src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.js';

const scope: WorkspaceStorageScope = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'dev',
};
const path = 'analytics/models/orders.yml';
const initialContent = [
  'version: 2',
  'models:',
  '  - name: orders',
  '    description: Old description',
  '    tags: [mart] # preserve',
  '',
].join('\n');

describe('DbtYamlDescriptionEditTransaction', () => {
  it('proposes one exact edit with a stable digest and a focused diff', async () => {
    const harness = createHarness(initialContent);

    const proposal = await harness.transaction.propose({
      scope,
      canvasId: 'canvas-1',
      resourceUniqueId: 'model.analytics.orders',
      nextDescription: 'Customer orders',
    });

    expect(proposal).toMatchObject({
      schemaVersion: 'dbt-yaml-description-edit-proposal.v1',
      canvasId: 'canvas-1',
      path,
      previousDescription: 'Old description',
      nextDescription: 'Customer orders',
      expectedContentSha256: sha256(initialContent),
    });
    expect(proposal.proposalDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(proposal.unifiedDiff).toContain('-    description: Old description');
    expect(proposal.unifiedDiff).toContain('+    description: Customer orders');
    expect(proposal.unifiedDiff).not.toContain('version: 2');
  });

  it('applies through the idempotent batch port and analyzes the written project', async () => {
    const harness = createHarness(initialContent);
    const proposal = await harness.transaction.propose({
      scope,
      canvasId: 'canvas-1',
      resourceUniqueId: 'model.analytics.orders',
      nextDescription: 'Customer orders',
    });

    const receipt = await harness.transaction.apply({
      scope,
      proposal,
      idempotencyKey: 'description-edit-1',
    });

    expect(harness.appliedMutations).toHaveLength(1);
    expect(harness.content()).toContain('description: Customer orders');
    expect(harness.content()).toContain('tags: [mart] # preserve');
    expect(receipt).toMatchObject({
      schemaVersion: 'dbt-yaml-description-edit-applied-receipt.v1',
      previousDescription: 'Old description',
      nextDescription: 'Customer orders',
      idempotencyKey: 'description-edit-1',
      deduplicated: false,
      analysis: { freshness: 'fresh' },
    });
    expect(receipt.appliedContentSha256).toBe(sha256(harness.content()));
    expect(receipt.analysis.projectContentSetSha256).toBe(sha256(harness.content()));
  });

  it('rejects a stale proposal without writing', async () => {
    const harness = createHarness(initialContent);
    const proposal = await harness.transaction.propose({
      scope,
      canvasId: 'canvas-1',
      resourceUniqueId: 'model.analytics.orders',
      nextDescription: 'Customer orders',
    });
    harness.replaceContent(initialContent.replace('Old description', 'Concurrent edit'));

    await expect(
      harness.transaction.apply({ scope, proposal, idempotencyKey: 'description-edit-2' })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionRevisionConflictError);
    expect(harness.appliedMutations).toHaveLength(0);
  });

  it('rejects a proposal whose digest was modified', async () => {
    const harness = createHarness(initialContent);
    const proposal = await harness.transaction.propose({
      scope,
      canvasId: 'canvas-1',
      resourceUniqueId: 'model.analytics.orders',
      nextDescription: 'Customer orders',
    });

    await expect(
      harness.transaction.apply({
        scope,
        proposal: { ...proposal, nextDescription: 'Tampered description' },
        idempotencyKey: 'description-edit-3',
      })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionProposalMismatchError);
    expect(harness.appliedMutations).toHaveLength(0);
  });

  it('conditionally reverts the applied revision and refuses to overwrite a later edit', async () => {
    const harness = createHarness(initialContent);
    const proposal = await harness.transaction.propose({
      scope,
      canvasId: 'canvas-1',
      resourceUniqueId: 'model.analytics.orders',
      nextDescription: 'Customer orders',
    });
    const applied = await harness.transaction.apply({
      scope,
      proposal,
      idempotencyKey: 'description-edit-4',
    });

    const reverted = await harness.transaction.revert({
      scope,
      appliedReceipt: applied,
      idempotencyKey: 'description-revert-4',
    });

    expect(harness.content()).toBe(initialContent);
    expect(reverted).toMatchObject({
      schemaVersion: 'dbt-yaml-description-edit-reverted-receipt.v1',
      appliedReceiptId: applied.receiptId,
      restoredDescription: 'Old description',
    });

    const secondHarness = createHarness(initialContent);
    const secondProposal = await secondHarness.transaction.propose({
      scope,
      canvasId: 'canvas-1',
      resourceUniqueId: 'model.analytics.orders',
      nextDescription: 'Customer orders',
    });
    const secondApplied = await secondHarness.transaction.apply({
      scope,
      proposal: secondProposal,
      idempotencyKey: 'description-edit-5',
    });
    secondHarness.replaceContent(secondHarness.content().replace('Customer orders', 'Later edit'));

    await expect(
      secondHarness.transaction.revert({
        scope,
        appliedReceipt: secondApplied,
        idempotencyKey: 'description-revert-5',
      })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionRevisionConflictError);
  });
});

function createHarness(startingContent: string): Readonly<{
  transaction: DbtYamlDescriptionEditTransaction;
  appliedMutations: WorkspaceFileBatchMutation[];
  content: () => string;
  replaceContent: (content: string) => void;
}> {
  let currentContent = startingContent;
  const appliedMutations: WorkspaceFileBatchMutation[] = [];
  const workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'> = {
    getFileContent: async (_scope, requestPath) => {
      if (requestPath !== path) throw new Error(`Unexpected path: ${requestPath}`);
      return {
        path,
        name: 'orders.yml',
        language: 'yaml',
        content: currentContent,
        contentSha256: sha256(currentContent),
        lastModified: '2026-07-17T10:00:00.000Z',
      };
    },
  };
  const batchMutation: IWorkspaceFileBatchMutationPort = {
    apply: async (_scope, mutation) => {
      const expected = mutation.expectedFiles[0]?.expectedContentSha256 ?? null;
      const currentSha = sha256(currentContent);
      if (expected !== currentSha) {
        return { kind: 'conflict', conflicts: [{ path, currentContentSha256: currentSha }] };
      }
      const write = mutation.writes[0];
      if (!write) throw new Error('Expected one write.');
      currentContent = write.content;
      appliedMutations.push(mutation);
      return {
        kind: 'applied',
        idempotencyKey: mutation.idempotencyKey,
        requestHash: sha256(JSON.stringify(mutation)),
        deduplicated: false,
        writes: [{ path, contentSha256: sha256(currentContent) }],
        deletes: [],
      };
    },
  };
  const mutator: IDbtYamlDescriptionMutator = new YamlCstDbtDescriptionMutator();
  const projectGraph = {
    execute: async (): Promise<DbtProjectGraphProjection> => projection(sha256(currentContent)),
  };

  return {
    transaction: new DbtYamlDescriptionEditTransaction({
      workspaceFiles,
      batchMutation,
      mutator,
      projectGraph,
    }),
    appliedMutations,
    content: () => currentContent,
    replaceContent: (content) => {
      currentContent = content;
    },
  };
}

function projection(contentSetSha256: string): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas-1',
      authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
    },
    freshness: 'fresh',
    projectRevision: {
      projectRoot: 'analytics',
      contentSetSha256,
      analyzedAt: '2026-07-17T10:00:00.000Z',
      analyzerVersion: 'test',
      dbtVersion: '1.9.0',
    },
    analysisSha256: contentSetSha256,
    adapterType: 'postgres',
    nodes: [
      {
        uniqueId: 'model.analytics.orders',
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
        originalFilePath: 'models/orders.sql',
        descriptionFilePath: 'models/orders.yml',
        columns: [],
        tags: ['mart'],
        visualEditability: { status: 'code_only', reasons: ['yaml_description_edit'] },
      },
    ],
    edges: [],
    diagnostics: [],
    executionTarget: {
      provider: 'postgres-local',
      adapter: 'postgres',
      targetName: 'dev',
      credentialRef: 'env:DBT_TEST_CREDENTIAL',
    },
    capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 1 },
  });
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
