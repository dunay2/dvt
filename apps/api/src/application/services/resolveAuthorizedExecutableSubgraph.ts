/**
 * Owned concern: resolve planner-owned executable-subgraph truth from the
 * protected workspace draft under an already-authorized command scope.
 */
import type {
  ExecutableSubgraph,
  ExecutionSelection,
  GenericGraphSourceV1,
  IPlanner,
  PlanAdmissionEvidence,
  PlanAdmissionFindingSubject,
  WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../ports/workspaceGraphDraft.js';

import {
  buildPreviewSelectionRejection,
  type ExecutableSubgraphSelectionRejection,
} from './previewSelectionFinding.js';

export type { ExecutableSubgraphSelectionRejection } from './previewSelectionFinding.js';

type ExecutableSubgraphResolution =
  | {
      readonly ok: true;
      readonly value: ExecutableSubgraph & {
        readonly decisionScopeNodeIds: readonly string[];
      };
    }
  | {
      readonly ok: false;
      readonly rejection: ExecutableSubgraphSelectionRejection;
    };

export class ResolveAuthorizedExecutableSubgraphService {
  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly workspaceGraphDraftStore: IWorkspaceGraphDraftStore;
    }
  ) {}

  public async execute(
    input: {
      readonly selection: ExecutionSelection;
      readonly graphSource?: GenericGraphSourceV1;
    },
    context: AuthorizedCommandExecutionContext
  ): Promise<ExecutableSubgraphResolution> {
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (projectId === undefined || environmentId === undefined) {
      return reject(
        context.requestId,
        'authorized_scope_incomplete',
        'Authorized scope is missing projectId or environmentId.',
        input.selection.nodeIds
      );
    }

    const stored = await this.deps.workspaceGraphDraftStore.read({
      tenantId: context.scope.tenantId.value,
      projectId,
      environmentId,
    });
    if (stored === null) {
      return reject(
        context.requestId,
        'workspace_graph_draft_not_found',
        'Protected workspace graph draft was not found for the authorized scope.',
        input.selection.nodeIds
      );
    }
    if (stored.schemaVersion !== WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION) {
      return reject(
        context.requestId,
        'workspace_graph_draft_unsupported_schema_version',
        `Protected workspace graph draft schema version ${stored.schemaVersion} is not supported.`,
        input.selection.nodeIds,
        [
          {
            evidenceCode: 'workspace_graph_draft_schema_version',
            observedValue: stored.schemaVersion,
            expectedValue: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          },
        ]
      );
    }

    let executableSubgraph: ExecutableSubgraph;
    let draft: WorkspaceGraphAuthoringDraft;
    try {
      draft = projectExecutionDependencyDraft(
        WorkspaceGraphAuthoringDraftSchema.parse(stored.draftPayload)
      );
      executableSubgraph = this.deps.planner.deriveExecutableSubgraph({
        draft,
        selection: input.selection,
      });
    } catch {
      return reject(
        context.requestId,
        'workspace_graph_draft_corrupt_payload',
        'Protected workspace graph draft payload failed semantic validation.',
        input.selection.nodeIds
      );
    }

    if (!executableSubgraph.executable) {
      const firstDiagnostic = executableSubgraph.diagnostics[0];
      return reject(
        context.requestId,
        firstDiagnostic?.code ?? 'unsupported_selection_mode',
        firstDiagnostic?.message ??
          'Execution selection is not executable for the protected draft.',
        input.selection.nodeIds,
        [
          {
            evidenceCode: 'planner_selection_executable',
            observedValue: false,
            expectedValue: true,
          },
        ]
      );
    }

    if (input.graphSource !== undefined) {
      const sourceNodeIds = input.graphSource.nodes
        .map((node) => node.nodeId)
        .slice()
        .sort((left, right) => left.localeCompare(right));
      const selectedNodeIds = [...executableSubgraph.nodeIds].sort((left, right) =>
        left.localeCompare(right)
      );
      if (
        sourceNodeIds.length !== selectedNodeIds.length ||
        sourceNodeIds.some((nodeId, index) => nodeId !== selectedNodeIds[index])
      ) {
        return reject(
          context.requestId,
          'graph_source_selection_mismatch',
          'graphSource nodes must match the planner-derived executable subgraph for the selection.',
          input.selection.nodeIds,
          [
            {
              evidenceCode: 'graph_source_node_count',
              observedValue: sourceNodeIds.length,
              expectedValue: selectedNodeIds.length,
              unit: 'nodes',
            },
          ]
        );
      }
    }

    return {
      ok: true,
      value: {
        ...executableSubgraph,
        decisionScopeNodeIds: draft.nodes
          .map((node) => node.id)
          .sort((left, right) => left.localeCompare(right)),
      },
    };
  }
}

function isExecutionDependencyEdge(edge: WorkspaceGraphAuthoringDraft['edges'][number]): boolean {
  return edge.metadata?.['executionDependency'] !== false;
}

function projectExecutionDependencyDraft(
  draft: WorkspaceGraphAuthoringDraft
): WorkspaceGraphAuthoringDraft {
  return {
    ...draft,
    edges: draft.edges.filter(isExecutionDependencyEdge),
    ...(draft.canvases == null
      ? {}
      : {
          canvases: draft.canvases.map((canvasWorkspace) => ({
            ...canvasWorkspace,
            edges: canvasWorkspace.edges.filter(isExecutionDependencyEdge),
          })),
        }),
  };
}

function reject(
  requestId: string,
  cause: string,
  reason: string,
  selectedNodeIds: readonly string[],
  evidence: readonly PlanAdmissionEvidence[] = []
): ExecutableSubgraphResolution {
  const subjects: readonly PlanAdmissionFindingSubject[] = selectedNodeIds.map((id) => ({
    kind: 'node',
    id,
  }));
  return {
    ok: false,
    rejection: buildPreviewSelectionRejection({
      requestId,
      cause,
      reason,
      subjects,
      evidence,
    }),
  };
}
