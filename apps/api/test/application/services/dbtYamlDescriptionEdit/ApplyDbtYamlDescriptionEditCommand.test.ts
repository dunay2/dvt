import { createHash } from 'node:crypto';

import {
  DbtProjectGraphProjectionSchema,
  type DbtYamlDescriptionAppliedReceipt,
  type DbtYamlDescriptionEditProposal,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  DbtYamlDescriptionProposalMismatchError,
  DbtYamlDescriptionRevisionConflictError,
  type IDbtYamlDescriptionReceiptStore,
} from '../../../../src/application/ports/dbtYamlDescriptionEdit.js';
import type { WorkspaceFileBatchMutation } from '../../../../src/application/ports/workspaceFiles.js';
import { ApplyDbtYamlDescriptionEditCommand } from '../../../../src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.js';
import { ProposeDbtYamlDescriptionEditQuery } from '../../../../src/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.js';
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

describe('ApplyDbtYamlDescriptionEditCommand', () => {
  it('writes once, binds analysis to the retained revision, and stores trusted evidence', async () => {
    const harness = createHarness();
    const proposal = await harness.propose();

    const receipt = await harness.command.apply({
      scope: SCOPE,
      proposal,
      idempotencyKey: 'x'.repeat(256),
    });

    expect(harness.mutations).toHaveLength(1);
    expect(harness.mutations[0]?.idempotencyKey.length).toBeLessThanOrEqual(256);
    expect(receipt.appliedContentSha256).toBe(sha256(harness.content()));
    expect(receipt.analysis.targetContentSha256).toBe(receipt.appliedContentSha256);
    expect(harness.appliedReceipts.get(receipt.receiptId)).toEqual(receipt);
  });

  it('returns a trusted idempotent replay before resolving mutable project state again', async () => {
    const harness = createHarness();
    const proposal = await harness.propose();
    const input = { scope: SCOPE, proposal, idempotencyKey: 'edit-1' } as const;
    const first = await harness.command.apply(input);
    harness.resolve.mockRejectedValue(new Error('Projection should not be consulted for replay.'));

    const replay = await harness.command.apply(input);

    expect(replay).toEqual({ ...first, deduplicated: true });
    expect(harness.mutations).toHaveLength(1);
  });

  it('rejects stale or tampered proposals without writing', async () => {
    const staleHarness = createHarness();
    const staleProposal = await staleHarness.propose();
    staleHarness.replaceContent(INITIAL_CONTENT.replace('Old description', 'Concurrent edit'));
    await expect(
      staleHarness.command.apply({ scope: SCOPE, proposal: staleProposal, idempotencyKey: 'stale' })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionRevisionConflictError);
    expect(staleHarness.mutations).toHaveLength(0);

    const tamperedHarness = createHarness();
    const proposal = await tamperedHarness.propose();
    await expect(
      tamperedHarness.command.apply({
        scope: SCOPE,
        proposal: { ...proposal, nextDescription: 'Forged' },
        idempotencyKey: 'tampered',
      })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionProposalMismatchError);
    expect(tamperedHarness.mutations).toHaveLength(0);
  });

  it('does not issue a receipt when the target changes during reanalysis', async () => {
    const harness = createHarness({ changeDuringAnalysis: true });
    const proposal = await harness.propose();

    await expect(
      harness.command.apply({ scope: SCOPE, proposal, idempotencyKey: 'analysis-race' })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionRevisionConflictError);
    expect(harness.appliedReceipts.size).toBe(0);
  });
});

function createHarness(options: { changeDuringAnalysis?: boolean } = {}): {
  command: ApplyDbtYamlDescriptionEditCommand;
  resolve: ReturnType<typeof vi.fn>;
  mutations: WorkspaceFileBatchMutation[];
  appliedReceipts: Map<string, DbtYamlDescriptionAppliedReceipt>;
  content: () => string;
  replaceContent: (next: string) => void;
  propose: () => Promise<DbtYamlDescriptionEditProposal>;
} {
  let content = INITIAL_CONTENT;
  const mutations: WorkspaceFileBatchMutation[] = [];
  const appliedReceipts = new Map<string, DbtYamlDescriptionAppliedReceipt>();
  const context = {
    resource: {
      uniqueId: 'model.analytics.orders',
      resourceType: 'model' as const,
      name: 'orders',
      packageName: 'analytics',
    },
    path: PATH,
  };
  const resolve = vi.fn().mockResolvedValue(context);
  const workspaceFiles = {
    getFileContent: vi.fn(async () => ({
      path: PATH,
      name: 'orders.yml',
      language: 'yaml',
      content,
      contentSha256: sha256(content),
      lastModified: '2026-07-17T10:00:00.000Z',
    })),
  };
  const receipts: IDbtYamlDescriptionReceiptStore = {
    findApplied: async (_scope, id) => appliedReceipts.get(id) ?? null,
    saveApplied: async (_scope, receipt) => {
      appliedReceipts.set(receipt.receiptId, receipt);
    },
    findReverted: async () => null,
    saveReverted: async () => undefined,
  };
  const projectGraph = {
    execute: vi.fn(async () => {
      const analyzedContent = content;
      if (options.changeDuringAnalysis === true) content = `${content}# concurrent\n`;
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
          projectName: 'analytics',
          contentSetSha256: sha256(analyzedContent),
          analyzedAt: '2026-07-17T10:00:00.000Z',
          analyzerVersion: 'test',
          dbtVersion: '1.10.0',
        },
        analysisSha256: sha256(analyzedContent),
        adapterType: 'postgres',
        nodes: [],
        edges: [],
        diagnostics: [],
        executionTarget: {
          provider: 'temporal',
          adapter: 'postgres',
          targetName: 'dev',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-dev',
            provider: 'postgres',
          },
          resolutionSource: 'environment-default',
          credentialRef: 'env:DBT_PROFILES_DIR',
        },
        capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 0 },
      });
    }),
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
  const mutator = new YamlCstDbtDescriptionMutator();
  const query = new ProposeDbtYamlDescriptionEditQuery({
    resolver: { resolve },
    workspaceFiles,
    mutator,
  });
  return {
    command: new ApplyDbtYamlDescriptionEditCommand({
      resolver: { resolve },
      workspaceFiles,
      batchMutation,
      mutator,
      projectGraph,
      receipts,
    }),
    resolve,
    mutations,
    appliedReceipts,
    content: () => content,
    replaceContent: (next: string) => {
      content = next;
    },
    propose: () =>
      query.propose({
        scope: SCOPE,
        canvasId: 'canvas-1',
        resourceUniqueId: context.resource.uniqueId,
        nextDescription: 'Customer orders',
      }),
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
