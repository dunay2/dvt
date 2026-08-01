import { createHash } from 'node:crypto';

import {
  DbtDependencyEditRequestSchema,
  type DbtSelectedModelAnalysis,
  type DbtDependencyEditAppliedReceipt,
} from '@dvt/contracts';
import { vi } from 'vitest';

import type {
  ApplySelectedDbtDependencyEditInput,
  IDbtDependencyEditReceiptStore,
} from '../../../../src/application/ports/dbtDependencyEdit.js';
import type { DbtProjectAnalysis } from '../../../../src/application/ports/dbtProjectAnalysis.js';
import type { IDbtProjectCandidateAnalyzerPort } from '../../../../src/application/ports/dbtProjectCandidateAnalysis.js';
import type { IWorkspaceFileBatchMutationPort } from '../../../../src/application/ports/workspaceFiles.js';
import { ApplySelectedDbtDependencyEditCommand } from '../../../../src/application/services/dbtDependencyEdit/ApplySelectedDbtDependencyEditCommand.js';
import { projectSelectedDbtModelAnalysis } from '../../../../src/application/services/selectedDbtModelAnalysisProjection.js';
import type { SelectedDbtModelAnalysisResolver } from '../../../../src/application/services/selectedDbtModelAnalysisResolver.js';

export const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

export const AUTHORITY = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'canvas-orders',
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
} as const;

const PREVIOUS_SQL = "-- keep\nselect * from {{ source('raw', 'orders') }}\n";
const CANDIDATE_SQL = "-- keep\nselect * from {{ source('raw', 'customers') }}\n";
const REGION_START = Buffer.byteLength('-- keep\nselect * from ', 'utf8');
const PREVIOUS_REGION = "{{ source('raw', 'orders') }}";
const CANDIDATE_REGION = "{{ source('raw', 'customers') }}";

type CandidateAnalyzerMock = ReturnType<
  typeof vi.fn<IDbtProjectCandidateAnalyzerPort['analyzeCandidate']>
>;
type SelectedResolverMock = ReturnType<typeof vi.fn<SelectedDbtModelAnalysisResolver['resolve']>>;
type BatchMutationMock = ReturnType<typeof vi.fn<IWorkspaceFileBatchMutationPort['apply']>>;

export type DbtDependencyEditHarness = Readonly<{
  command: ApplySelectedDbtDependencyEditCommand;
  current: DbtProjectAnalysis;
  candidate: DbtProjectAnalysis;
  selected: DbtSelectedModelAnalysis;
  candidateSelected: DbtSelectedModelAnalysis;
  analyzeCandidate: CandidateAnalyzerMock;
  resolve: SelectedResolverMock;
  apply: BatchMutationMock;
}>;

export function createHarness(): DbtDependencyEditHarness {
  const current = analysis('orders', PREVIOUS_SQL, '1');
  const candidate = analysis('customers', CANDIDATE_SQL, '2');
  const selected = projectSelectedDbtModelAnalysis({
    authorityBinding: AUTHORITY,
    analysis: current,
    selectedUniqueId: 'model.analytics.orders',
  });
  const candidateSelected = projectSelectedDbtModelAnalysis({
    authorityBinding: AUTHORITY,
    analysis: candidate,
    selectedUniqueId: 'model.analytics.orders',
  });
  const receipts = new Map<string, DbtDependencyEditAppliedReceipt>();
  const receiptStore: IDbtDependencyEditReceiptStore = {
    findApplied: vi.fn(async (_scope, receiptId) => receipts.get(receiptId) ?? null),
    saveApplied: vi.fn(async (_scope, receipt) => {
      receipts.set(receipt.receiptId, receipt);
    }),
  };
  const apply = vi.fn<IWorkspaceFileBatchMutationPort['apply']>(async (_scope, mutation) => ({
    kind: 'applied',
    idempotencyKey: mutation.idempotencyKey,
    requestHash: sha(JSON.stringify(mutation)),
    deduplicated: false,
    writes: mutation.writes.map((write) => ({
      path: write.path,
      contentSha256: sha(write.content),
    })),
    deletes: [],
  }));
  const analyzeCandidate = vi.fn<IDbtProjectCandidateAnalyzerPort['analyzeCandidate']>(
    async () => ({
      kind: 'analyzed',
      analysis: candidate,
    })
  );
  const resolve = vi.fn<SelectedDbtModelAnalysisResolver['resolve']>(async () => ({
    authorityBinding: AUTHORITY,
    nativeAnalysis: current,
    selectedAnalysis: selected,
  }));
  const command = new ApplySelectedDbtDependencyEditCommand({
    resolver: { resolve },
    workspaceFiles: {
      getFileContent: vi.fn(async () => ({
        path: 'analytics/models/orders.sql',
        name: 'orders.sql',
        language: 'sql',
        content: PREVIOUS_SQL,
        contentSha256: sha(PREVIOUS_SQL),
        lastModified: '2026-08-01T10:00:00.000Z',
      })),
    },
    candidateAnalyzer: { analyzeCandidate },
    batchMutation: { apply },
    receipts: receiptStore,
  });

  return {
    command,
    current,
    candidate,
    selected,
    candidateSelected,
    analyzeCandidate,
    resolve,
    apply,
  };
}

export function request(
  harness: ReturnType<typeof createHarness>
): ApplySelectedDbtDependencyEditInput {
  return {
    ...DbtDependencyEditRequestSchema.parse({
      schemaVersion: 'dbt-dependency-edit-request.v1' as const,
      canvasId: AUTHORITY.canvasId,
      selectedUniqueId: 'model.analytics.orders',
      expectedProjectContentSetSha256: harness.current.projectRevision.contentSetSha256,
      expectedAnalysisSha256: harness.current.analysisSha256,
      expectedSelectedAnalysisSha256: harness.selected.selectedAnalysisSha256,
      regionId: harness.selected.regions[0]?.regionId ?? 'missing',
      expectedTargetUniqueId: 'source.analytics.raw.orders',
      nextTargetUniqueId: 'source.analytics.raw.customers',
      idempotencyKey: 'edit-orders-source-1',
    }),
    scope: SCOPE,
  };
}

export function analysis(
  table: 'orders' | 'customers',
  sql: string,
  revision: string
): DbtProjectAnalysis {
  const targetUniqueId = `source.analytics.raw.${table}`;
  const source = table === 'orders' ? PREVIOUS_REGION : CANDIDATE_REGION;
  return {
    status: 'valid',
    adapterType: 'postgres',
    projectRevision: {
      projectRoot: 'analytics',
      projectName: 'analytics',
      contentSetSha256: sha(`content-set-${revision}`),
      analyzedAt: '2026-08-01T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v1',
      dbtVersion: '1.10.0',
    },
    analysisSha256: sha(`analysis-${revision}`),
    resources: [],
    dependencies: [
      {
        sourceUniqueId: targetUniqueId,
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
      },
    ],
    diagnostics: [],
    semanticEvidence: {
      files: [
        {
          path: 'dbt_project.yml',
          revisionSha256: sha('config'),
          byteLength: 6,
          kind: 'project_config',
        },
        {
          path: 'models/orders.sql',
          revisionSha256: sha(sql),
          byteLength: Buffer.byteLength(sql),
          kind: 'model',
        },
        {
          path: 'models/sources.yml',
          revisionSha256: sha('sources'),
          byteLength: 7,
          kind: 'source',
        },
      ],
      identities: [
        {
          uniqueId: 'model.analytics.orders',
          resourceType: 'model',
          name: 'orders',
          packageName: 'analytics',
          originalFilePath: 'models/orders.sql',
          dependencyUniqueIds: [targetUniqueId],
          macroUniqueIds: [],
        },
        ...['orders', 'customers'].map((name) => ({
          uniqueId: `source.analytics.raw.${name}`,
          resourceType: 'source' as const,
          name,
          sourceName: 'raw',
          packageName: 'analytics',
          originalFilePath: 'models/sources.yml',
          dependencyUniqueIds: [],
          macroUniqueIds: [],
        })),
      ],
      regions: [
        {
          regionId: `region-source-${table}`,
          ownerUniqueIds: ['model.analytics.orders'],
          path: 'models/orders.sql',
          kind: 'source',
          range: { startByte: REGION_START, endByte: REGION_START + Buffer.byteLength(source) },
          sourceSha256: sha(source),
          classification: 'supported',
          targetUniqueId,
        },
      ],
      diagnostics: [],
    },
  };
}

export function sha(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
