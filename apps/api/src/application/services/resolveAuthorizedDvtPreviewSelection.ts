/**
 * Owned concern: resolve one protected DVT Canvas selection to a server-owned
 * operational workload without accepting graph semantics from the browser.
 */
import type {
  DvtProtectedWorkspaceGraphProvenance,
  ExecutionSelection,
  GenericGraphSourceV1,
} from '@dvt/contracts';
import { createDvtOperationalRejection, type DvtOperationalRejectionCause } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import type { DvtOperationalWorkloadProjector } from './dvtOperationalWorkloadProjector.js';
import type { DvtPostgresTargetProjectionPublisher } from './dvtPostgresTargetProjectionPublisher.js';
import type {
  ExecutableSubgraphSelectionRejection,
  ResolveAuthorizedExecutableSubgraphService,
} from './resolveAuthorizedExecutableSubgraph.js';

export type AuthorizedDvtPreviewSelectionResolution =
  | {
      readonly ok: true;
      readonly value: {
        readonly graphSource: GenericGraphSourceV1;
        readonly nodeIds: readonly string[];
        readonly decisionScopeNodeIds: readonly string[];
        readonly requestedRootNodeIds: readonly string[];
      };
    }
  | {
      readonly ok: false;
      readonly rejection: ExecutableSubgraphSelectionRejection;
    };

export class ResolveAuthorizedDvtPreviewSelectionService {
  public constructor(
    private readonly deps: {
      readonly graphDraftResolver: Pick<
        ResolveAuthorizedExecutableSubgraphService,
        'executeWithAuthorizedDraft'
      >;
      readonly targetProjectionPublisher: Pick<DvtPostgresTargetProjectionPublisher, 'publish'>;
      readonly workloadProjector: Pick<DvtOperationalWorkloadProjector, 'project'>;
    }
  ) {}

  public async execute(
    input: {
      readonly selection: ExecutionSelection;
      readonly provenance: DvtProtectedWorkspaceGraphProvenance;
    },
    context: AuthorizedCommandExecutionContext
  ): Promise<AuthorizedDvtPreviewSelectionResolution> {
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (projectId === undefined || environmentId === undefined) {
      return reject('dvt_preview_scope_incomplete');
    }

    const resolved = await this.deps.graphDraftResolver.executeWithAuthorizedDraft(
      { selection: input.selection },
      context
    );
    if (!resolved.ok) return resolved;

    const { authorizedDraft } = resolved.value;
    const activeCanvasId = authorizedDraft.draft.activeCanvasId ?? authorizedDraft.draft.canvas.id;
    if (activeCanvasId !== input.provenance.canvasId) {
      return reject('dvt_preview_canvas_mismatch');
    }

    const scope = {
      tenantId: context.scope.tenantId.value,
      projectId,
      environmentId,
    };

    let targetProjection;
    try {
      targetProjection = await this.deps.targetProjectionPublisher.publish({
        scope,
        draft: authorizedDraft.draft,
        selectedNodeIds: resolved.value.nodeIds,
        selectedEdgeIds: resolved.value.edgeIds,
      });
    } catch {
      return reject('dvt_preview_target_projection_failed');
    }

    const workload = this.deps.workloadProjector.project({
      scope,
      draftRevision: authorizedDraft.revision,
      canvasId: input.provenance.canvasId,
      draft: authorizedDraft.draft,
      selectedNodeIds: resolved.value.nodeIds,
      selectedEdgeIds: resolved.value.edgeIds,
      targetProjection,
    });
    if (!workload.ok) {
      return reject(workload.cause);
    }

    const workloadNodeIds = workload.graphSource.nodes.map((node) => node.nodeId);
    return {
      ok: true,
      value: {
        graphSource: workload.graphSource,
        nodeIds: workloadNodeIds,
        decisionScopeNodeIds: workloadNodeIds,
        requestedRootNodeIds: [...input.selection.nodeIds],
      },
    };
  }
}

function reject(
  cause: DvtOperationalRejectionCause
): Extract<AuthorizedDvtPreviewSelectionResolution, { readonly ok: false }> {
  return {
    ok: false,
    rejection: createDvtOperationalRejection(cause),
  };
}
