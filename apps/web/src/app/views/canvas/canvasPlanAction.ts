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
import { resolveCanvasExecutionGraphFailureMessage } from './canvasReadinessPresentation';
import { buildDbtProjectFilePreviewProvenance } from './dbtProjectFileExecutionStrategy';
import { canvasViewCopy, formatCanvasCopyTemplate } from './copy';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { publishGraphDbtWorkspaceArtifacts } from './dbtGraphWorkspaceArtifactPublisher';
import type { CanvasExecutionDraftGraph } from './canvasExecutionActions.types';

export type CanvasPlanExecution =
  | (Extract<CanvasExecutionStrategy, { kind: 'planner_generic_preview' }> &
      Readonly<{
        workspaceFilesQuery: IWorkspaceFilesQueryPort;
        graphDbtWorkspaceArtifactPublicationCommand: IGraphDbtWorkspaceArtifactPublicationCommandPort;
        graphDbtModelCompilationQuery: IGraphDbtModelCompilationQueryPort;
      }>)
  | Exclude<CanvasExecutionStrategy, { kind: 'planner_generic_preview' }>;

export type CanvasPlanActionArgs = Readonly<{
  graphDraftCanvasId: string | null;
  canPlan: boolean;
  canonicalEdges: readonly CanonicalEdge[];
  canonicalNodes: readonly CanonicalNode[];
  execution: CanvasPlanExecution | null;
  plansService: Pick<IPlansPort, 'previewPlan'>;
  selectionIntent: CanvasExecutionSelectionIntent;
  sessionContext: Pick<SessionContextPort, 'buildRunContext' | 'getWorkspaceScopeSnapshot'>;
  workspaceNodeIds: readonly string[];
  flushDraftForExecution?: () => Promise<CanvasExecutionDraftGraph>;
}>;

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
  execution,
  plansService,
  selectionIntent,
  sessionContext,
  workspaceNodeIds,
  flushDraftForExecution,
}: CanvasPlanActionArgs): Promise<CanvasPlanActionResult> {
  const writtenArtifactPaths: string[] = [];
  const fail = (message: string): CanvasPlanActionResult => ({
    ok: false,
    message,
    writtenArtifactPaths: [...writtenArtifactPaths],
  });

  if (!canPlan) {
    return fail(canvasViewCopy.planPermissionDeniedMessage);
  }

  if (execution == null || execution.kind === 'not_executable') {
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
    if (execution.kind === 'dvt_protected_preview') {
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
        return fail(resolveCanvasExecutionGraphFailureMessage(dvtProjection, canvasViewCopy));
      }
      const previewOutcome = await plansService.previewPlan({
        previewProfile: execution.previewProfile,
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
      strategy: execution,
      canonicalNodes,
      canonicalEdges,
      selectionIntent,
      workspaceNodeIds,
      executionScope: sessionContext.getWorkspaceScopeSnapshot(),
    });
    if (!plannerProjection.ok) {
      return fail(resolveCanvasExecutionGraphFailureMessage(plannerProjection, canvasViewCopy));
    }
    if (execution.kind === 'planner_generic_preview') {
      if (graphDraftCanvasId == null) {
        return fail(canvasViewCopy.planGraphAuthorityRefusedMessage);
      }
      if (plannerProjection.kind !== execution.kind) {
        return fail(canvasViewCopy.canvasExecutionUnavailableMessage);
      }
      const artifactProjection = plannerProjection.workspaceArtifacts;

      const publication = await publishGraphDbtWorkspaceArtifacts({
        canvasId: graphDraftCanvasId,
        artifacts: artifactProjection.artifacts,
        workspaceFilesQuery: execution.workspaceFilesQuery,
        publicationCommand: execution.graphDbtWorkspaceArtifactPublicationCommand,
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

      const compilation = await execution.graphDbtModelCompilationQuery.compile({
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
      previewProfile: execution.previewProfile,
      graphSource: plannerProjection.graphSource,
      selection: plannerProjection.selection,
      context: sessionContext.buildRunContext('preview_context'),
      ...(execution.kind === 'dbt_project_file_preview'
        ? {
            provenance: buildDbtProjectFilePreviewProvenance(
              execution,
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
