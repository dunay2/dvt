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
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import { buildDbtWorkspaceArtifacts } from './canvasDbtWorkspaceArtifacts';
import { buildDbtProjectFilePreviewProvenance } from './dbtProjectFileExecutionStrategy';
import { canvasViewCopy, formatCanvasCopyTemplate } from './copy';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { publishGraphDbtWorkspaceArtifacts } from './dbtGraphWorkspaceArtifactPublisher';
import type { CanvasExecutionDraftGraph } from './canvasExecutionActions.types';

export type CanvasPlanActionResult = Readonly<{
  writtenArtifactPaths: readonly string[];
}> &
  (
    | { ok: false; kind?: 'failure'; message: string }
    | {
        ok: true;
        draftSignature: string;
        previewOutcome: PlanPreviewOutcome;
      }
  );

function attachSelectionIntentToOutcome(
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
  flushDraftForExecution,
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
  flushDraftForExecution?: () => Promise<CanvasExecutionDraftGraph>;
}): Promise<CanvasPlanActionResult> {
  const writtenArtifactPaths: string[] = [];
  const fail = (message: string): CanvasPlanActionResult => ({
    ok: false,
    message,
    writtenArtifactPaths: [...writtenArtifactPaths],
  });

  if (!canPlan) {
    return fail(canvasViewCopy.planPermissionDeniedMessage);
  }

  if (executionStrategy == null || executionStrategy.kind === 'not_executable') {
    return fail(canvasViewCopy.canvasExecutionUnavailableMessage);
  }

  try {
    const flushedDraft = await flushDraftForExecution?.();
    if (flushedDraft?.ok === false) return fail(flushedDraft.message);
    if (flushedDraft?.ok === true) {
      canonicalNodes = flushedDraft.canonicalNodes;
      canonicalEdges = flushedDraft.canonicalEdges;
      workspaceNodeIds = flushedDraft.workspaceNodeIds;
    }
    if (executionStrategy.kind === 'dvt_protected_preview') {
      if (graphDraftCanvasId == null) {
        return fail(canvasViewCopy.planGraphAuthorityRefusedMessage);
      }
      const dvtProjection = buildProtectedDvtPreviewProjection({
        canvasId: graphDraftCanvasId,
        canonicalNodes,
        canonicalEdges,
        selectionIntent,
        workspaceNodeIds,
      });
      if (!dvtProjection.ok) {
        return fail(dvtProjection.message);
      }
      const previewOutcome = await plansService.previewPlan({
        previewProfile: executionStrategy.previewProfile,
        selection: dvtProjection.selection,
        context: sessionContext.buildRunContext('preview_context'),
        provenance: {
          kind: 'dvt-protected-workspace-graph',
          canvasId: graphDraftCanvasId,
        },
        persist: true,
      });
      return {
        ok: true,
        draftSignature: dvtProjection.draftSignature,
        previewOutcome: attachSelectionIntentToOutcome(previewOutcome, dvtProjection),
        writtenArtifactPaths: [],
      };
    }

    const plannerProjection = buildCanvasDbtExecutionProjection({
      strategy: executionStrategy,
      canonicalNodes,
      canonicalEdges,
      selectionIntent,
      workspaceNodeIds,
      executionScope: sessionContext.getWorkspaceScopeSnapshot(),
    });
    if (!plannerProjection.ok) {
      return fail(plannerProjection.message);
    }
    const scopedNodeIds = plannerProjection.scopedNodeIds;

    if (executionStrategy.kind === 'planner_generic_preview') {
      if (graphDraftCanvasId == null) {
        return fail(canvasViewCopy.planGraphAuthorityRefusedMessage);
      }
      const artifactProjection = buildDbtWorkspaceArtifacts({
        nodes: canonicalNodes,
        edges: canonicalEdges,
        scopedNodeIds,
      });
      if (!artifactProjection.ok) {
        return fail(artifactProjection.message);
      }

      const publication = await publishGraphDbtWorkspaceArtifacts({
        canvasId: graphDraftCanvasId,
        artifacts: artifactProjection.artifacts,
        workspaceFilesQuery,
        publicationCommand: graphDbtWorkspaceArtifactPublicationCommand,
      });
      if (!publication.ok) {
        if (publication.kind === 'authority_refused') {
          return fail(canvasViewCopy.planGraphAuthorityRefusedMessage);
        }
        return fail(
          formatCanvasCopyTemplate(canvasViewCopy.planGraphModelSqlDivergenceMessageTemplate, {
            path: publication.conflictPath,
          })
        );
      }
      writtenArtifactPaths.push(...publication.writtenArtifactPaths);

      const compilation = await graphDbtModelCompilationQuery.compile({
        canvasId: graphDraftCanvasId,
        selectors: [...artifactProjection.modelSelectors],
      });
      if (compilation.kind !== 'compiled') {
        return fail(
          compilation.kind === 'authority_refused'
            ? canvasViewCopy.planGraphAuthorityRefusedMessage
            : canvasViewCopy.planGraphDbtCompilationFailedMessage
        );
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
      previewOutcome: attachSelectionIntentToOutcome(previewOutcome, plannerProjection),
      writtenArtifactPaths: [...writtenArtifactPaths],
    };
  } catch (error) {
    return fail(formatPlanActionErrorMessage(error));
  }
}
