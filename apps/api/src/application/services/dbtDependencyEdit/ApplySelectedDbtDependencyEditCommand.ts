import { createHash } from 'node:crypto';

import {
  DbtDependencyEditAppliedReceiptSchema,
  DbtDependencyEditRequestSchema,
  DbtDependencyEditResultSchema,
  type DbtDependencyEditFinding,
  type DbtDependencyEditResult,
} from '@dvt/contracts';

import {
  DbtDependencyEditReceiptInvalidError,
  type ApplySelectedDbtDependencyEditInput,
  type IApplySelectedDbtDependencyEditCommand,
  type IDbtDependencyEditReceiptStore,
} from '../../ports/dbtDependencyEdit.js';
import type {
  DbtProjectAnalysis,
  DbtProjectSemanticRegion,
} from '../../ports/dbtProjectAnalysis.js';
import type { IDbtProjectCandidateAnalyzerPort } from '../../ports/dbtProjectCandidateAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../../ports/dbtProjectImport.js';
import {
  WorkspaceFileNotFoundError,
  type IWorkspaceFileBatchMutationPort,
  type IWorkspaceFileRepository,
} from '../../ports/workspaceFiles.js';
import {
  CanvasAuthoringAuthorityMissingError,
  CanvasAuthoringAuthorityMixedError,
} from '../canvasAuthoringAuthorityPolicy.js';
import { projectSelectedDbtModelAnalysis } from '../selectedDbtModelAnalysisProjection.js';
import type { SelectedDbtModelAnalysisResolver } from '../selectedDbtModelAnalysisResolver.js';

import {
  planDbtSemanticRegionPatch,
  type DbtSemanticRegionPatchRefusal,
} from './dbtSemanticRegionPatchPlanner.js';

export class ApplySelectedDbtDependencyEditCommand implements IApplySelectedDbtDependencyEditCommand {
  public constructor(
    private readonly deps: Readonly<{
      resolver: Pick<SelectedDbtModelAnalysisResolver, 'resolve'>;
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      candidateAnalyzer: IDbtProjectCandidateAnalyzerPort;
      batchMutation: IWorkspaceFileBatchMutationPort;
      receipts: IDbtDependencyEditReceiptStore;
    }>
  ) {}

  public async apply(input: ApplySelectedDbtDependencyEditInput): Promise<DbtDependencyEditResult> {
    const request = DbtDependencyEditRequestSchema.parse(withoutScope(input));
    const requestHash = hashStable({ scope: input.scope, request });
    const receiptId = sha256(`dbt-dependency-edit:${requestHash}`);
    const existing = await this.deps.receipts.findApplied(input.scope, receiptId);
    if (existing !== null) {
      if (
        existing.requestHash !== requestHash ||
        existing.idempotencyKey !== request.idempotencyKey
      ) {
        throw new DbtDependencyEditReceiptInvalidError(receiptId);
      }
      return parseResult({
        schemaVersion: 'dbt-dependency-edit-result.v1',
        kind: 'applied',
        receipt: { ...existing, deduplicated: true },
      });
    }

    let resolved: Awaited<ReturnType<SelectedDbtModelAnalysisResolver['resolve']>>;
    try {
      resolved = await this.deps.resolver.resolve({
        scope: input.scope,
        canvasId: request.canvasId,
        selectedUniqueId: request.selectedUniqueId,
      });
    } catch (error) {
      if (
        error instanceof DbtProjectFileAuthorityRequiredError ||
        error instanceof CanvasAuthoringAuthorityMissingError ||
        error instanceof CanvasAuthoringAuthorityMixedError
      ) {
        return refused('dbt_dependency_edit_authority_refused', { kind: 'project' });
      }
      throw error;
    }

    const staleFinding = findStaleAnalysis(request, resolved);
    if (staleFinding !== null) return refusedFinding(staleFinding);
    if (
      resolved.selectedAnalysis.status !== 'ready' ||
      resolved.nativeAnalysis.status !== 'valid'
    ) {
      return refused('dbt_dependency_edit_analysis_not_ready', { kind: 'project' });
    }

    const region = resolved.nativeAnalysis.semanticEvidence.regions.find(
      (candidate) =>
        candidate.regionId === request.regionId &&
        candidate.ownerUniqueIds.includes(request.selectedUniqueId)
    );
    if (region === undefined) {
      return refused('dbt_dependency_edit_region_not_found', {
        kind: 'region',
        regionId: request.regionId,
      });
    }
    if (region.classification === 'code_only') {
      return refused(
        'dbt_dependency_edit_region_code_only',
        { kind: 'region', path: region.path, regionId: region.regionId },
        { reasonCode: region.reasonCode }
      );
    }
    if (hasOverlappingRegion(region, resolved.nativeAnalysis.semanticEvidence.regions)) {
      return refused(
        'dbt_dependency_edit_invariant_failed',
        {
          kind: 'region',
          path: region.path,
          regionId: region.regionId,
        },
        { reasonCode: 'overlapping_semantic_regions' }
      );
    }
    if (region.targetUniqueId !== request.expectedTargetUniqueId) {
      return refused(
        'dbt_dependency_edit_target_changed',
        { kind: 'region', path: region.path, regionId: region.regionId },
        { expectedValue: request.expectedTargetUniqueId, actualValue: region.targetUniqueId }
      );
    }

    const nextTarget = resolved.nativeAnalysis.semanticEvidence.identities.find(
      (identity) => identity.uniqueId === request.nextTargetUniqueId
    );
    if (nextTarget === undefined) {
      return refused('dbt_dependency_edit_target_not_found', {
        kind: 'resource',
        uniqueId: request.nextTargetUniqueId,
      });
    }

    const workspacePath = projectPath(
      resolved.nativeAnalysis.projectRevision.projectRoot,
      region.path
    );
    let file: Awaited<ReturnType<IWorkspaceFileRepository['getFileContent']>>;
    try {
      file = await this.deps.workspaceFiles.getFileContent(input.scope, workspacePath);
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) {
        return conflict([{ path: workspacePath, currentContentSha256: null }]);
      }
      throw error;
    }
    const analyzedFile = resolved.nativeAnalysis.semanticEvidence.files.find(
      (entry) => entry.path === region.path
    );
    if (analyzedFile === undefined) {
      return refused(
        'dbt_dependency_edit_invariant_failed',
        {
          kind: 'file',
          path: workspacePath,
        },
        { reasonCode: 'semantic_region_file_missing' }
      );
    }
    if (file.contentSha256 !== analyzedFile.revisionSha256) {
      return conflict([{ path: workspacePath, currentContentSha256: file.contentSha256 }]);
    }

    const patch = planDbtSemanticRegionPatch({ content: file.content, region, nextTarget });
    if (patch.kind === 'no_change') {
      return parseResult({
        schemaVersion: 'dbt-dependency-edit-result.v1',
        kind: 'no_change',
        canvasId: request.canvasId,
        selectedUniqueId: request.selectedUniqueId,
        regionId: request.regionId,
        targetUniqueId: request.nextTargetUniqueId,
        projectContentSetSha256: resolved.nativeAnalysis.projectRevision.contentSetSha256,
        analysisSha256: resolved.nativeAnalysis.analysisSha256,
        selectedAnalysisSha256: resolved.selectedAnalysis.selectedAnalysisSha256,
      });
    }
    if (patch.kind === 'refused')
      return patchRefused(patch.reason, region, request.nextTargetUniqueId);

    const candidateResult = await this.deps.candidateAnalyzer.analyzeCandidate({
      scope: input.scope,
      projectRoot: resolved.nativeAnalysis.projectRevision.projectRoot,
      expectedContentSetSha256: resolved.nativeAnalysis.projectRevision.contentSetSha256,
      expectedFiles: resolved.nativeAnalysis.semanticEvidence.files,
      candidate: {
        path: region.path,
        expectedContentSha256: analyzedFile.revisionSha256,
        content: patch.content,
      },
    });
    if (candidateResult.kind === 'conflict') {
      return conflict(
        candidateResult.changedPaths.map((path) => ({
          path: projectPath(resolved.nativeAnalysis.projectRevision.projectRoot, path),
          currentContentSha256: null,
        }))
      );
    }
    const candidate = candidateResult.analysis;
    if (candidate.status !== 'valid') {
      return refused('dbt_dependency_edit_validation_failed', { kind: 'project' });
    }
    const candidateSelected = projectSelectedDbtModelAnalysis({
      authorityBinding: resolved.authorityBinding,
      analysis: candidate,
      selectedUniqueId: request.selectedUniqueId,
    });
    const candidateInvariant = validateCandidate({
      previous: resolved.nativeAnalysis,
      candidate,
      candidateSelected,
      region,
      nextTargetUniqueId: request.nextTargetUniqueId,
      candidateContentSha256: patch.contentSha256,
    });
    if (candidateInvariant !== null) return refusedFinding(candidateInvariant);

    const batchResult = await this.deps.batchMutation.apply(input.scope, {
      expectedFiles: resolved.nativeAnalysis.semanticEvidence.files
        .map((entry) => ({
          path: projectPath(resolved.nativeAnalysis.projectRevision.projectRoot, entry.path),
          expectedContentSha256: entry.revisionSha256,
        }))
        .sort((left, right) => left.path.localeCompare(right.path)),
      writes: [{ path: workspacePath, content: patch.content }],
      deletes: [],
      idempotencyKey: `dbt-dependency-edit:${receiptId}`,
    });
    if (batchResult.kind === 'conflict') return conflict(batchResult.conflicts);
    const write = batchResult.writes.find((entry) => entry.path === workspacePath);
    if (write?.contentSha256 !== patch.contentSha256) {
      return refused(
        'dbt_dependency_edit_invariant_failed',
        { kind: 'file', path: workspacePath },
        {
          reasonCode: 'atomic_write_receipt_mismatch',
        }
      );
    }

    const receipt = DbtDependencyEditAppliedReceiptSchema.parse({
      schemaVersion: 'dbt-dependency-edit-applied-receipt.v1',
      receiptId,
      canvasId: request.canvasId,
      selectedUniqueId: request.selectedUniqueId,
      regionId: request.regionId,
      path: workspacePath,
      previousTargetUniqueId: request.expectedTargetUniqueId,
      nextTargetUniqueId: request.nextTargetUniqueId,
      expectedContentSha256: analyzedFile.revisionSha256,
      appliedContentSha256: patch.contentSha256,
      previousProjectContentSetSha256: resolved.nativeAnalysis.projectRevision.contentSetSha256,
      projectContentSetSha256: candidate.projectRevision.contentSetSha256,
      previousAnalysisSha256: resolved.nativeAnalysis.analysisSha256,
      analysisSha256: candidate.analysisSha256,
      previousSelectedAnalysisSha256: resolved.selectedAnalysis.selectedAnalysisSha256,
      selectedAnalysisSha256: candidateSelected.selectedAnalysisSha256,
      idempotencyKey: request.idempotencyKey,
      requestHash,
      deduplicated: batchResult.deduplicated,
    });
    await this.deps.receipts.saveApplied(input.scope, receipt);
    return parseResult({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'applied',
      receipt,
    });
  }
}

function withoutScope(input: ApplySelectedDbtDependencyEditInput) {
  const { scope: _scope, ...request } = input;
  return request;
}

function findStaleAnalysis(
  request: ReturnType<typeof DbtDependencyEditRequestSchema.parse>,
  resolved: Awaited<ReturnType<SelectedDbtModelAnalysisResolver['resolve']>>
): DbtDependencyEditFinding | null {
  const checks = [
    [
      request.expectedProjectContentSetSha256,
      resolved.nativeAnalysis.projectRevision.contentSetSha256,
      'content_set',
    ],
    [request.expectedAnalysisSha256, resolved.nativeAnalysis.analysisSha256, 'native_analysis'],
    [
      request.expectedSelectedAnalysisSha256,
      resolved.selectedAnalysis.selectedAnalysisSha256,
      'selected_analysis',
    ],
  ] as const;
  const stale = checks.find(([expected, actual]) => expected !== actual);
  return stale === undefined
    ? null
    : {
        code: 'dbt_dependency_edit_analysis_stale',
        subject: { kind: 'project' },
        evidence: { reasonCode: stale[2], expectedValue: stale[0], actualValue: stale[1] },
      };
}

function validateCandidate(
  input: Readonly<{
    previous: DbtProjectAnalysis;
    candidate: DbtProjectAnalysis;
    candidateSelected: ReturnType<typeof projectSelectedDbtModelAnalysis>;
    region: Extract<DbtProjectSemanticRegion, { classification: 'supported' }>;
    nextTargetUniqueId: string;
    candidateContentSha256: string;
  }>
): DbtDependencyEditFinding | null {
  if (input.candidateSelected.status !== 'ready') {
    return finding(
      'dbt_dependency_edit_semantic_mismatch',
      { kind: 'project' },
      'selected_analysis_not_ready'
    );
  }
  const candidateRegion = input.candidate.semanticEvidence.regions.filter(
    (region) =>
      region.path === input.region.path &&
      region.kind === input.region.kind &&
      region.range.startByte === input.region.range.startByte &&
      region.ownerUniqueIds.includes(input.candidateSelected.selectedUniqueId)
  );
  if (
    candidateRegion.length !== 1 ||
    candidateRegion[0]?.classification !== 'supported' ||
    candidateRegion[0].targetUniqueId !== input.nextTargetUniqueId
  ) {
    return finding(
      'dbt_dependency_edit_semantic_mismatch',
      {
        kind: 'region',
        path: input.region.path,
        regionId: input.region.regionId,
      },
      'candidate_target_not_resolved'
    );
  }

  const previousByPath = new Map(
    input.previous.semanticEvidence.files.map((file) => [file.path, file])
  );
  const candidateByPath = new Map(
    input.candidate.semanticEvidence.files.map((file) => [file.path, file])
  );
  if (previousByPath.size !== candidateByPath.size) {
    return finding(
      'dbt_dependency_edit_invariant_failed',
      { kind: 'project' },
      'candidate_file_set_changed'
    );
  }
  for (const [path, previous] of previousByPath) {
    const candidate = candidateByPath.get(path);
    const expectedSha =
      path === input.region.path ? input.candidateContentSha256 : previous.revisionSha256;
    if (candidate?.revisionSha256 !== expectedSha) {
      return finding(
        'dbt_dependency_edit_invariant_failed',
        { kind: 'file', path },
        'candidate_file_revision_mismatch'
      );
    }
  }
  if (
    input.previous.projectRevision.contentSetSha256 ===
    input.candidate.projectRevision.contentSetSha256
  ) {
    return finding(
      'dbt_dependency_edit_invariant_failed',
      { kind: 'project' },
      'candidate_content_set_unchanged'
    );
  }
  return null;
}

function hasOverlappingRegion(
  target: DbtProjectSemanticRegion,
  regions: readonly DbtProjectSemanticRegion[]
): boolean {
  return regions.some(
    (region) =>
      region.regionId !== target.regionId &&
      region.path === target.path &&
      region.range.startByte < target.range.endByte &&
      target.range.startByte < region.range.endByte
  );
}

function patchRefused(
  reason: DbtSemanticRegionPatchRefusal,
  region: DbtProjectSemanticRegion,
  nextTargetUniqueId: string
): DbtDependencyEditResult {
  const code = {
    region_code_only: 'dbt_dependency_edit_region_code_only',
    source_revision_mismatch: 'dbt_dependency_edit_analysis_stale',
    target_incompatible: 'dbt_dependency_edit_target_incompatible',
    literal_unrepresentable: 'dbt_dependency_edit_literal_unrepresentable',
  } as const;
  return refused(
    code[reason],
    { kind: 'region', path: region.path, regionId: region.regionId },
    {
      reasonCode: reason,
      ...(reason === 'target_incompatible' ? { actualValue: nextTargetUniqueId } : {}),
    }
  );
}

function projectPath(projectRoot: string, filePath: string): string {
  if (filePath === '.') return projectRoot;
  return projectRoot === '.' ? filePath : `${projectRoot}/${filePath}`;
}

function finding(
  code: DbtDependencyEditFinding['code'],
  subject: DbtDependencyEditFinding['subject'],
  reasonCode: string
): DbtDependencyEditFinding {
  return { code, subject, evidence: { reasonCode } };
}

function refused(
  code: DbtDependencyEditFinding['code'],
  subject: DbtDependencyEditFinding['subject'],
  evidence?: DbtDependencyEditFinding['evidence']
): DbtDependencyEditResult {
  return refusedFinding({ code, subject, ...(evidence === undefined ? {} : { evidence }) });
}

function refusedFinding(findingValue: DbtDependencyEditFinding): DbtDependencyEditResult {
  return parseResult({
    schemaVersion: 'dbt-dependency-edit-result.v1',
    kind: 'refused',
    finding: findingValue,
  });
}

function conflict(
  conflicts: readonly Readonly<{ path: string; currentContentSha256: string | null }>[]
): DbtDependencyEditResult {
  return parseResult({
    schemaVersion: 'dbt-dependency-edit-result.v1',
    kind: 'conflict',
    conflicts: [...conflicts].sort((left, right) => left.path.localeCompare(right.path)),
  });
}

function parseResult(value: unknown): DbtDependencyEditResult {
  return DbtDependencyEditResultSchema.parse(value);
}

function hashStable(value: unknown): string {
  return sha256(JSON.stringify(sortJsonValue(value)));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJsonValue(nested)])
    );
  }
  return value;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
