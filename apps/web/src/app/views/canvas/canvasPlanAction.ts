/**
 * Owned concern: orchestrate Canvas plan-preview persistence before run start
 * without creating authoritative runtime execution identity.
 */
import type { IPlansPort } from '../../ports/plans';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { SessionContextPort } from '../../ports/sessionContext';
import type {
  IWorkspaceFileContentCommandPort,
  IWorkspaceFilesQueryPort,
} from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';

import { buildCanvasDbtExecutionProjection } from './canvasDbtExecutionProjection';
import { buildDbtWorkspaceArtifacts } from './canvasDbtWorkspaceArtifacts';
import { buildDbtProjectFilePreviewProvenance } from './dbtProjectFileExecutionStrategy';
import { readExpectedWorkspaceFileRevision } from './canvasGitProvenance';
import { resolvePreviewProvenance } from './canvasPreviewProvenance';
import { collectPreviewSelection } from './canvasRunSelection';
import { canvasViewCopy, formatTransformationGraphValidationSummary } from './copy';
import { buildPreviewGraphSource } from './previewGraphSource';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

type CanvasPlanActionFailure = {
  ok: false;
  message: string;
};

type CanvasPlanActionSuccess = {
  ok: true;
  draftSignature: string;
  plan: PlanViewModel;
  writtenArtifactPaths: readonly string[];
};

export type CanvasPlanActionResult = CanvasPlanActionFailure | CanvasPlanActionSuccess;

function attachDbtSelectionIntent(
  plan: PlanViewModel,
  selection: {
    readonly selectionMode: 'explicit' | 'workspace';
    readonly requestedRootNodeIds: readonly string[];
    readonly derivedDependencyNodeIds: readonly string[];
    readonly scopedNodeIds: readonly string[];
  }
): PlanViewModel {
  return {
    ...plan,
    preview: {
      ...(plan.preview ?? {}),
      selectionIntent: {
        mode: selection.selectionMode,
        requestedRootNodeIds: [...selection.requestedRootNodeIds],
        derivedDependencyNodeIds: [...selection.derivedDependencyNodeIds],
        authorizedScopeNodeIds: [...selection.scopedNodeIds],
      },
    },
  };
}

function formatPlanActionErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return canvasViewCopy.planUnableToCreateMessage;
  }

  const message = error.message.trim();
  if (!message) {
    return canvasViewCopy.planUnableToCreateMessage;
  }

  if (/^Request to \/plans\/preview failed \(/.test(message)) {
    return canvasViewCopy.planUnableToCreateMessage;
  }

  return message;
}

export async function executeCanvasPlanAction({
  canPlan,
  canonicalEdges,
  canonicalNodes,
  executionStrategy,
  plansService,
  previewProvenanceConfig,
  selectionIntent,
  sessionContext,
  transformationValidation,
  workspaceNodeIds,
  workspaceFilesQuery,
  workspaceFileContentCommand,
}: {
  canPlan: boolean;
  canonicalEdges: readonly CanonicalEdge[];
  canonicalNodes: readonly CanonicalNode[];
  executionStrategy: CanvasExecutionStrategy | null;
  plansService: IPlansPort;
  previewProvenanceConfig: Pick<
    WorkspaceBootstrapConfig,
    'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
  >;
  selectionIntent: CanvasExecutionSelectionIntent;
  sessionContext: SessionContextPort;
  transformationValidation: TransformationGraphValidationResult;
  workspaceNodeIds: readonly string[];
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  workspaceFileContentCommand: IWorkspaceFileContentCommandPort;
}): Promise<CanvasPlanActionResult> {
  if (!canPlan) {
    return { ok: false, message: canvasViewCopy.planPermissionDeniedMessage };
  }

  if (executionStrategy == null || executionStrategy.kind === 'not_executable') {
    return {
      ok: false,
      message: canvasViewCopy.canvasExecutionUnavailableMessage,
    };
  }

  if (
    executionStrategy.kind === 'planner_generic_preview' ||
    executionStrategy.kind === 'dbt_project_file_preview'
  ) {
    try {
      const plannerProjection = buildCanvasDbtExecutionProjection({
        strategy: executionStrategy,
        canonicalNodes,
        canonicalEdges,
        selectionIntent,
        workspaceNodeIds,
      });
      if (!plannerProjection.ok) {
        return { ok: false, message: plannerProjection.message };
      }
      const scopedNodeIds = plannerProjection.scopedNodeIds;

      const writtenArtifacts = [];
      if (executionStrategy.kind === 'planner_generic_preview') {
        const artifactProjection = buildDbtWorkspaceArtifacts({
          nodes: canonicalNodes,
          edges: canonicalEdges,
          scopedNodeIds,
        });
        if (!artifactProjection.ok) {
          return { ok: false, message: artifactProjection.message };
        }

        for (const artifact of artifactProjection.artifacts) {
          await workspaceFileContentCommand.saveFileContent({
            path: artifact.path,
            content: artifact.content,
            expectedRevision: await readExpectedWorkspaceFileRevision(
              workspaceFilesQuery,
              artifact.path
            ),
          });
        }
        writtenArtifacts.push(...artifactProjection.artifacts);
      }

      const previewedPlan = await plansService.previewPlan({
        previewProfile: executionStrategy.previewProfile,
        graphSource: plannerProjection.graphSource,
        selection: plannerProjection.selection,
        context: sessionContext.buildRunContext('preview_context'),
        ...(executionStrategy.kind === 'dbt_project_file_preview'
          ? {
              provenance: buildDbtProjectFilePreviewProvenance(
                executionStrategy,
                plannerProjection.selection.nodeIds
              ),
            }
          : {}),
        persist: true,
      });
      const plan = attachDbtSelectionIntent(previewedPlan, plannerProjection);

      return {
        ok: true,
        draftSignature: plannerProjection.draftSignature,
        plan,
        writtenArtifactPaths: writtenArtifacts.map((artifact) => artifact.path),
      };
    } catch (error) {
      return {
        ok: false,
        message: formatPlanActionErrorMessage(error),
      };
    }
  }

  if (!transformationValidation.valid) {
    return {
      ok: false,
      message: formatTransformationGraphValidationSummary(transformationValidation.summaryCode),
    };
  }

  try {
    const selectedForPlan = transformationValidation.scopedNodeIds;
    const selection = collectPreviewSelection(selectedForPlan, workspaceNodeIds);
    const context = sessionContext.buildRunContext('preview_context');
    const previewProvenance = await resolvePreviewProvenance({
      canonicalNodes,
      canonicalEdges,
      scopedNodeIds: selectedForPlan,
      workspaceFilesQuery,
      workspaceFileContentCommand,
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
      previewProfile: executionStrategy.previewProfile,
      graphSource,
      selection,
      context,
      ...(previewProvenance.provenance ? { provenance: previewProvenance.provenance } : {}),
      persist: true,
    });

    return {
      ok: true,
      draftSignature: transformationValidation.draftSignature,
      plan,
      writtenArtifactPaths: [
        previewProvenance.sqlArtifact.path,
        ...(previewProvenance.provenance?.graphArtifact.path
          ? [previewProvenance.provenance.graphArtifact.path]
          : []),
      ],
    };
  } catch (error) {
    return {
      ok: false,
      message: formatPlanActionErrorMessage(error),
    };
  }
}
