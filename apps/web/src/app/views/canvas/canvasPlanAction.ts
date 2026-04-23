/**
 * Owned concern: orchestrate Canvas plan-preview persistence before run start
 * without creating authoritative runtime execution identity.
 */
import type { IPlansPort } from '../../ports/plans';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';

import { resolvePreviewProvenance } from './canvasPreviewProvenance';
import { canvasViewCopy, formatTransformationGraphValidationSummary } from './copy';
import { buildPreviewGraphSource } from './previewGraphSource';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';

type CanvasPlanActionFailure = {
  ok: false;
  message: string;
};

type CanvasPlanActionSuccess = {
  ok: true;
  draftSignature: string;
  plan: PlanViewModel;
};

export type CanvasPlanActionResult = CanvasPlanActionFailure | CanvasPlanActionSuccess;

export async function executeCanvasPlanAction({
  canPlan,
  canonicalEdges,
  canonicalNodes,
  plansService,
  previewProvenanceConfig,
  selectedNodeIds,
  sessionContext,
  transformationValidation,
  workspaceNodeIds,
  workspaceService,
}: {
  canPlan: boolean;
  canonicalEdges: readonly CanonicalEdge[];
  canonicalNodes: readonly CanonicalNode[];
  plansService: IPlansPort;
  previewProvenanceConfig: Pick<
    WorkspaceBootstrapConfig,
    'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
  >;
  selectedNodeIds: readonly string[];
  sessionContext: SessionContextPort;
  transformationValidation: TransformationGraphValidationResult;
  workspaceNodeIds: readonly string[];
  workspaceService: IWorkspacePort;
}): Promise<CanvasPlanActionResult> {
  if (!canPlan) {
    return { ok: false, message: canvasViewCopy.planPermissionDeniedMessage };
  }

  if (!transformationValidation.valid) {
    return {
      ok: false,
      message: formatTransformationGraphValidationSummary(transformationValidation.summaryCode),
    };
  }

  try {
    const selectedForPlan = selectedNodeIds.length > 0 ? selectedNodeIds : workspaceNodeIds;
    const context = sessionContext.buildRunContext('preview_context');
    const previewProvenance = await resolvePreviewProvenance({
      canonicalNodes,
      canonicalEdges,
      scopedNodeIds: selectedForPlan,
      workspaceService,
      workspaceScope: sessionContext.getWorkspaceScopeSnapshot(),
      previewProvenanceConfig,
      required: true,
    });
    if (!previewProvenance.ok) {
      return { ok: false, message: previewProvenance.message };
    }
    if (previewProvenance.sqlArtifact === undefined || previewProvenance.sqlText === undefined) {
      return {
        ok: false,
        message: canvasViewCopy.planSqlArtifactRequiredMessage,
      };
    }

    const graphSource = buildPreviewGraphSource({
      nodes: canonicalNodes,
      scopedNodeIds: selectedForPlan,
      sqlArtifact: previewProvenance.sqlArtifact,
      sqlText: previewProvenance.sqlText,
    });
    const plan = await plansService.previewPlan({
      previewProfile: 'transformation-sql-first-v1',
      graphSource,
      selectedNodeIds: selectedForPlan,
      context,
      ...(previewProvenance.provenance ? { provenance: previewProvenance.provenance } : {}),
      persist: true,
    });

    return {
      ok: true,
      draftSignature: transformationValidation.draftSignature,
      plan,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : canvasViewCopy.planUnableToCreateMessage,
    };
  }
}
