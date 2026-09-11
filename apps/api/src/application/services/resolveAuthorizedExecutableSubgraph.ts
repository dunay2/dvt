/**
 * Owned concern: resolve planner-owned executable-subgraph truth from the
 * protected workspace draft under an already-authorized command scope.
 */
import type {
  ExecutableSubgraph,
  ExecutionSelection,
  GenericGraphSourceV1,
  IPlanner,
  PlanAdmissionFindingCollection,
  PreviewSelectionFinding,
  WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import {
  WorkspaceGraphAuthoringDraftSchema,
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../ports/workspaceGraphDraft.js';

import { findExecutableGraphSourceTopologyMismatch } from './validateExecutableGraphSourceTopology.js';

export interface ExecutableSubgraphSelectionRejection {
  readonly code: 'REJECTED';
  readonly reason: string;
  readonly cause: string;
  /** Populated by the preview-selection finding producer in TASK-F6.2B. */
  readonly findings?: PlanAdmissionFindingCollection<PreviewSelectionFinding> | undefined;
}

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

export type AuthorizedExecutableSubgraphResolution =
  | {
      readonly ok: true;
      readonly value: ExecutableSubgraph & {
        readonly decisionScopeNodeIds: readonly string[];
        readonly authorizedDraft: {
          readonly revision: string;
          readonly draft: WorkspaceGraphAuthoringDraft;
        };
      };
    }
  | {
      readonly ok: false;
      readonly rejection: ExecutableSubgraphSelectionRejection;
    };

type ResolveExecutableSubgraphInput = {
  readonly selection: ExecutionSelection;
  readonly graphSource?: GenericGraphSourceV1;
};

export class ResolveAuthorizedExecutableSubgraphService {
  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly workspaceGraphDraftStore: IWorkspaceGraphDraftStore;
    }
  ) {}

  public async execute(
    input: ResolveExecutableSubgraphInput,
    context: AuthorizedCommandExecutionContext
  ): Promise<ExecutableSubgraphResolution> {
    const result = await this.executeWithAuthorizedDraft(input, context);
    if (!result.ok) return result;

    const { authorizedDraft: _authorizedDraft, ...value } = result.value;
    return { ok: true, value };
  }

  public async executeWithAuthorizedDraft(
    input: ResolveExecutableSubgraphInput,
    context: AuthorizedCommandExecutionContext
  ): Promise<AuthorizedExecutableSubgraphResolution> {
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (projectId === undefined || environmentId === undefined) {
      return reject(
        'authorized_scope_incomplete',
        'Authorized scope is missing projectId or environmentId.'
      );
    }

    const stored = await this.deps.workspaceGraphDraftStore.read({
      tenantId: context.scope.tenantId.value,
      projectId,
      environmentId,
    });
    if (stored === null) {
      return reject(
        'workspace_graph_draft_not_found',
        'Protected workspace graph draft was not found for the authorized scope.'
      );
    }
    if (stored.schemaVersion !== WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION) {
      return reject(
        'workspace_graph_draft_unsupported_schema_version',
        `Protected workspace graph draft schema version ${stored.schemaVersion} is not supported.`
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
        'workspace_graph_draft_corrupt_payload',
        'Protected workspace graph draft payload failed semantic validation.'
      );
    }

    if (!executableSubgraph.executable) {
      const firstDiagnostic = executableSubgraph.diagnostics[0];
      return reject(
        firstDiagnostic?.code ?? 'unsupported_selection_mode',
        firstDiagnostic?.message ?? 'Execution selection is not executable for the protected draft.'
      );
    }

    if (input.graphSource !== undefined) {
      const mismatch = findExecutableGraphSourceTopologyMismatch(
        input.graphSource,
        executableSubgraph,
        draft
      );
      if (mismatch !== null) {
        return reject(mismatch.cause, mismatch.reason);
      }
    }

    return {
      ok: true,
      value: {
        ...executableSubgraph,
        decisionScopeNodeIds: draft.nodes
          .map((node) => node.id)
          .sort((left, right) => left.localeCompare(right)),
        authorizedDraft: {
          revision: stored.revision,
          draft,
        },
      },
    };
  }
}

function projectExecutionDependencyDraft(
  draft: WorkspaceGraphAuthoringDraft
): WorkspaceGraphAuthoringDraft {
  return {
    ...draft,
    edges: draft.edges.filter(isWorkspaceGraphAuthoringEdgeEffectivelyExecutable),
    ...(draft.canvases == null
      ? {}
      : {
          canvases: draft.canvases.map((canvasWorkspace) => ({
            ...canvasWorkspace,
            edges: canvasWorkspace.edges.filter(isWorkspaceGraphAuthoringEdgeEffectivelyExecutable),
          })),
        }),
  };
}

function reject(
  cause: string,
  reason: string
): Extract<AuthorizedExecutableSubgraphResolution, { readonly ok: false }> {
  return {
    ok: false,
    rejection: {
      code: 'REJECTED',
      cause,
      reason,
    },
  };
}
