/**
 * Owned concern: orchestrate Canvas plan-preview persistence before run start
 * without creating authoritative runtime execution identity.
 */
import type { IPlansPort, PlanPreviewOutcome } from '../../ports/plans';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { IWorkspaceFilesQueryPort } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasDbtExecutionProjection } from './canvasDbtExecutionProjection';
import { buildDbtWorkspaceArtifacts } from './canvasDbtWorkspaceArtifacts';
import { buildDbtProjectFilePreviewProvenance } from './dbtProjectFileExecutionStrategy';
import { canvasViewCopy, formatCanvasCopyTemplate } from './copy';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { publishGraphDbtWorkspaceArtifacts } from './dbtGraphWorkspaceArtifactPublisher';

export type CanvasPlanActionResult =
  | { ok: false; kind?: 'failure'; message: string }
  | {
      ok: true;
      draftSignature: string;
      previewOutcome: PlanPreviewOutcome;
      writtenArtifactPaths: readonly string[];
    };

function attachDbtSelectionIntentToOutcome(
  outcome: PlanPreviewOutcome,
  selection: {
    readonly selectionMode: 'explicit' | 'workspace';
    readonly requestedRootNodeIds: readonly string[];
    readonly derivedDependencyNodeIds: readonly string[];
    readonly scopedNodeIds: readonly string[];
  }
): PlanPreviewOutcome {
  if (outcome.kind === 'selection-rejected') {
    return outcome;
  }

  return {
    ...outcome,
    plan: {
      ...outcome.plan,
      preview: {
        ...(outcome.plan.preview ?? {}),
        selectionIntent: {
          mode: selection.selectionMode,
          requestedRootNodeIds: [...selection.requestedRootNodeIds],
          derivedDependencyNodeIds: [...selection.derivedDependencyNodeIds],
          authorizedScopeNodeIds: [...selection.scopedNodeIds],
        },
      },
    },
  };
}

function formatPlanActionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : '';
  return message && !/^Request to \/plans\/preview failed \(/.test(message)
    ? message
    : canvasViewCopy.planUnableToCreateMessage;
}

export async function executeCanvasPlanAction({
  graphDraftCanvasId,
  canPlan,
  canonicalEdges,
  canonicalNodes,
  executionStrategy,
  plansService,
  selectionIntent,
  sessionContext,
  workspaceNodeIds,
  workspaceFilesQuery,
  graphDbtWorkspaceArtifactPublicationCommand,
  graphDbtModelCompilationQuery,
}: {
  graphDraftCanvasId: string | null;
  canPlan: boolean;
  canonicalEdges: readonly CanonicalEdge[];
  canonicalNodes: readonly CanonicalNode[];
  executionStrategy: CanvasExecutionStrategy | null;
  plansService: IPlansPort;
  selectionIntent: CanvasExecutionSelectionIntent;
  sessionContext: SessionContextPort;
  workspaceNodeIds: readonly string[];
  workspaceFilesQuery: IWorkspaceFilesQueryPort;
  graphDbtWorkspaceArtifactPublicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
  graphDbtModelCompilationQuery: IGraphDbtModelCompilationQueryPort;
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

  try {
    const plannerProjection = buildCanvasDbtExecutionProjection({
      strategy: executionStrategy,
      canonicalNodes,
      canonicalEdges,
      selectionIntent,
      workspaceNodeIds,
      executionScope: sessionContext.getWorkspaceScopeSnapshot(),
    });
    if (!plannerProjection.ok) {
      return { ok: false, message: plannerProjection.message };
    }
    const scopedNodeIds = plannerProjection.scopedNodeIds;

    const writtenArtifactPaths: string[] = [];
    if (executionStrategy.kind === 'planner_generic_preview') {
      if (graphDraftCanvasId == null) {
        return {
          ok: false,
          message: canvasViewCopy.planGraphAuthorityRefusedMessage,
        };
      }
      const artifactProjection = buildDbtWorkspaceArtifacts({
        nodes: canonicalNodes,
        edges: canonicalEdges,
        scopedNodeIds,
      });
      if (!artifactProjection.ok) {
        return { ok: false, message: artifactProjection.message };
      }

      const publication = await publishGraphDbtWorkspaceArtifacts({
        canvasId: graphDraftCanvasId,
        artifacts: artifactProjection.artifacts,
        workspaceFilesQuery,
        publicationCommand: graphDbtWorkspaceArtifactPublicationCommand,
      });
      if (!publication.ok) {
        if (publication.kind === 'authority_refused') {
          return {
            ok: false,
            message: canvasViewCopy.planGraphAuthorityRefusedMessage,
          };
        }
        return {
          ok: false,
          message: formatCanvasCopyTemplate(
            canvasViewCopy.planGraphModelSqlDivergenceMessageTemplate,
            { path: publication.conflictPath }
          ),
        };
      }
      writtenArtifactPaths.push(...publication.writtenArtifactPaths);

      const compilation = await graphDbtModelCompilationQuery.compile({
        canvasId: graphDraftCanvasId,
        selectors: [...artifactProjection.modelSelectors],
      });
      if (compilation.kind !== 'compiled') {
        return {
          ok: false,
          message:
            compilation.kind === 'authority_refused'
              ? canvasViewCopy.planGraphAuthorityRefusedMessage
              : canvasViewCopy.planGraphDbtCompilationFailedMessage,
        };
      }
    }

    const previewOutcome = await plansService.previewPlan({
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
    return {
      ok: true,
      draftSignature: plannerProjection.draftSignature,
      previewOutcome: attachDbtSelectionIntentToOutcome(previewOutcome, plannerProjection),
      writtenArtifactPaths,
    };
  } catch (error) {
    return {
      ok: false,
      message: formatPlanActionErrorMessage(error),
    };
  }
}
