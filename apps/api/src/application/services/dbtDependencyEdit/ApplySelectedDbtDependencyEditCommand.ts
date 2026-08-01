import {
  DbtDependencyEditAppliedReceiptSchema,
  type DbtDependencyEditResult,
} from '@dvt/contracts';

import {
  DbtDependencyEditReceiptInvalidError,
  type ApplySelectedDbtDependencyEditInput,
  type IApplySelectedDbtDependencyEditCommand,
  type IDbtDependencyEditPublicationPort,
} from '../../ports/dbtDependencyEdit.js';
import type { IDbtProjectCandidateAnalyzerPort } from '../../ports/dbtProjectCandidateAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../../ports/dbtProjectImport.js';
import {
  WorkspaceFileNotFoundError,
  type IWorkspaceFileRepository,
} from '../../ports/workspaceFiles.js';
import {
  CanvasAuthoringAuthorityMissingError,
  CanvasAuthoringAuthorityMixedError,
} from '../canvasAuthoringAuthorityPolicy.js';
import { projectSelectedDbtModelAnalysis } from '../selectedDbtModelAnalysisProjection.js';
import type { SelectedDbtModelAnalysisResolver } from '../selectedDbtModelAnalysisResolver.js';

import {
  dbtDependencyEditConflict,
  dbtDependencyEditPatchRefused,
  dbtDependencyEditRefused,
  dbtDependencyEditRefusedFinding,
  findStaleDbtDependencyEditAnalysis,
  fingerprintDbtDependencyEditRequest,
  hasOverlappingDbtSemanticRegion,
  identifyDbtDependencyEditReceipt,
  parseDbtDependencyEditRequest,
  parseDbtDependencyEditResult,
  toDbtProjectWorkspacePath,
  validateDbtDependencyEditCandidate,
} from './dbtDependencyEditDecisionModel.js';
import { planDbtSemanticRegionPatch } from './dbtSemanticRegionPatchPlanner.js';

export class ApplySelectedDbtDependencyEditCommand implements IApplySelectedDbtDependencyEditCommand {
  public constructor(
    private readonly deps: Readonly<{
      resolver: Pick<SelectedDbtModelAnalysisResolver, 'resolve'>;
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      candidateAnalyzer: IDbtProjectCandidateAnalyzerPort;
      publication: IDbtDependencyEditPublicationPort;
    }>
  ) {}

  public async apply(input: ApplySelectedDbtDependencyEditInput): Promise<DbtDependencyEditResult> {
    const request = parseDbtDependencyEditRequest(input);
    const requestHash = fingerprintDbtDependencyEditRequest(input, request);
    const receiptId = identifyDbtDependencyEditReceipt(input, request);
    const existing = await this.deps.publication.findApplied(input.scope, receiptId);
    if (existing !== null) {
      if (
        existing.requestHash !== requestHash ||
        existing.idempotencyKey !== request.idempotencyKey
      ) {
        throw new DbtDependencyEditReceiptInvalidError(receiptId);
      }
      return parseDbtDependencyEditResult({
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
        return dbtDependencyEditRefused('dbt_dependency_edit_authority_refused', {
          kind: 'project',
        });
      }
      throw error;
    }

    const staleFinding = findStaleDbtDependencyEditAnalysis(request, resolved);
    if (staleFinding !== null) return dbtDependencyEditRefusedFinding(staleFinding);
    if (
      resolved.selectedAnalysis.status !== 'ready' ||
      resolved.nativeAnalysis.status !== 'valid'
    ) {
      return dbtDependencyEditRefused('dbt_dependency_edit_analysis_not_ready', {
        kind: 'project',
      });
    }

    const region = resolved.nativeAnalysis.semanticEvidence.regions.find(
      (candidate) =>
        candidate.regionId === request.regionId &&
        candidate.ownerUniqueIds.includes(request.selectedUniqueId)
    );
    if (region === undefined) {
      return dbtDependencyEditRefused('dbt_dependency_edit_region_not_found', {
        kind: 'region',
        regionId: request.regionId,
      });
    }
    if (region.classification === 'code_only') {
      return dbtDependencyEditRefused(
        'dbt_dependency_edit_region_code_only',
        { kind: 'region', path: region.path, regionId: region.regionId },
        { reasonCode: region.reasonCode }
      );
    }
    if (hasOverlappingDbtSemanticRegion(region, resolved.nativeAnalysis.semanticEvidence.regions)) {
      return dbtDependencyEditRefused(
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
      return dbtDependencyEditRefused(
        'dbt_dependency_edit_target_changed',
        { kind: 'region', path: region.path, regionId: region.regionId },
        { expectedValue: request.expectedTargetUniqueId, actualValue: region.targetUniqueId }
      );
    }

    const nextTarget = resolved.nativeAnalysis.semanticEvidence.identities.find(
      (identity) => identity.uniqueId === request.nextTargetUniqueId
    );
    if (nextTarget === undefined) {
      return dbtDependencyEditRefused('dbt_dependency_edit_target_not_found', {
        kind: 'resource',
        uniqueId: request.nextTargetUniqueId,
      });
    }

    const workspacePath = toDbtProjectWorkspacePath(
      resolved.nativeAnalysis.projectRevision.projectRoot,
      region.path
    );
    let file: Awaited<ReturnType<IWorkspaceFileRepository['getFileContent']>>;
    try {
      file = await this.deps.workspaceFiles.getFileContent(input.scope, workspacePath);
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) {
        return dbtDependencyEditConflict([{ path: workspacePath, currentContentSha256: null }]);
      }
      throw error;
    }
    const analyzedFile = resolved.nativeAnalysis.semanticEvidence.files.find(
      (entry) => entry.path === region.path
    );
    if (analyzedFile === undefined) {
      return dbtDependencyEditRefused(
        'dbt_dependency_edit_invariant_failed',
        {
          kind: 'file',
          path: workspacePath,
        },
        { reasonCode: 'semantic_region_file_missing' }
      );
    }
    if (file.contentSha256 !== analyzedFile.revisionSha256) {
      return dbtDependencyEditConflict([
        { path: workspacePath, currentContentSha256: file.contentSha256 },
      ]);
    }

    const patch = planDbtSemanticRegionPatch({ content: file.content, region, nextTarget });
    if (patch.kind === 'no_change') {
      return parseDbtDependencyEditResult({
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
      return dbtDependencyEditPatchRefused(patch.reason, region, request.nextTargetUniqueId);

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
      return dbtDependencyEditConflict(
        candidateResult.changedPaths.map((path) => ({
          path: toDbtProjectWorkspacePath(
            resolved.nativeAnalysis.projectRevision.projectRoot,
            path
          ),
          currentContentSha256: null,
        }))
      );
    }
    const candidate = candidateResult.analysis;
    if (candidate.status !== 'valid') {
      return dbtDependencyEditRefused('dbt_dependency_edit_validation_failed', {
        kind: 'project',
      });
    }
    const candidateSelected = projectSelectedDbtModelAnalysis({
      authorityBinding: resolved.authorityBinding,
      analysis: candidate,
      selectedUniqueId: request.selectedUniqueId,
    });
    const candidateInvariant = validateDbtDependencyEditCandidate({
      previous: resolved.nativeAnalysis,
      candidate,
      candidateSelected,
      region,
      nextTargetUniqueId: request.nextTargetUniqueId,
      candidateContentSha256: patch.contentSha256,
    });
    if (candidateInvariant !== null) return dbtDependencyEditRefusedFinding(candidateInvariant);

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
      deduplicated: false,
    });
    const publication = await this.deps.publication.publish(input.scope, {
      projectRoot: resolved.nativeAnalysis.projectRevision.projectRoot,
      expectedProjectContentSetSha256: resolved.nativeAnalysis.projectRevision.contentSetSha256,
      expectedFiles: resolved.nativeAnalysis.semanticEvidence.files,
      write: {
        path: workspacePath,
        expectedContentSha256: analyzedFile.revisionSha256,
        content: patch.content,
      },
      receipt,
    });
    if (publication.kind === 'conflict') {
      return dbtDependencyEditConflict(publication.conflicts);
    }
    return parseDbtDependencyEditResult({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'applied',
      receipt: publication.receipt,
    });
  }
}
