/**
 * Owned concern: lower one exact protected Source -> terminal Transform closure
 * into one generic ephemeral PostgreSQL workload.
 */
import {
  ConnectedSourceRefSchema,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DvtOperationalWorkloadContractV1,
  DvtTransformAuthoringAuthorityV1Schema,
  GENERIC_GRAPH_SOURCE_KIND,
  KNOWN_STEP_KINDS,
  WorkspaceGraphAuthoringDraftSchema,
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  type ConnectionRef,
  type DvtOperationalWorkloadV1,
  type GenericGraphSourceV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

export type DvtTerminalTransformProjectionBinding = {
  readonly outputNodeId: string;
  readonly semanticPlanSha256: string;
  readonly connectionRef: ConnectionRef;
  readonly artifact: DvtOperationalWorkloadV1['targetProjection']['artifact'];
};

export type DvtOperationalWorkloadProjectorInput = {
  readonly scope: DvtOperationalWorkloadV1['scope'];
  readonly draftRevision: string;
  readonly canvasId: string;
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly selectedNodeIds: readonly string[];
  readonly selectedEdgeIds: readonly string[];
  readonly targetProjection: DvtTerminalTransformProjectionBinding;
};

export type DvtOperationalWorkloadProjectionResult =
  | { readonly ok: true; readonly graphSource: GenericGraphSourceV1 }
  | { readonly ok: false; readonly reason: string };

export class DvtOperationalWorkloadProjector {
  public project(
    input: DvtOperationalWorkloadProjectorInput
  ): DvtOperationalWorkloadProjectionResult {
    try {
      return { ok: true, graphSource: projectTerminalTransform(input) };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'DVT workload projection failed.',
      };
    }
  }
}

function projectTerminalTransform(
  input: DvtOperationalWorkloadProjectorInput
): GenericGraphSourceV1 {
  const draft = WorkspaceGraphAuthoringDraftSchema.parse(input.draft);
  requireUniqueExactCount(input.selectedNodeIds, 2, 'selected node');
  requireUniqueExactCount(input.selectedEdgeIds, 1, 'selected edge');

  const selectedNodes = selectExact(draft.nodes, input.selectedNodeIds, 'node');
  const selectedEdges = selectExact(draft.edges, input.selectedEdgeIds, 'edge');
  const source = selectedNodes.find((node) => node.kind === 'dvt:source' && node.role === 'input');
  const transform = selectedNodes.find(
    (node) => node.pluginId === 'dvt' && node.kind === 'transform' && node.role === 'transform'
  );
  if (
    source === undefined ||
    transform === undefined ||
    source.id === transform.id ||
    selectedNodes.some((node) => node.id !== source.id && node.id !== transform.id)
  ) {
    throw new Error('Selection must contain exactly one DVT Source and one DVT Transform.');
  }

  const edge = selectedEdges[0]!;
  if (
    edge.sourceId !== source.id ||
    edge.targetId !== transform.id ||
    !isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
  ) {
    throw new Error('Selection must contain one effective Source to Transform dependency.');
  }

  const connectedSource = ConnectedSourceRefSchema.parse(source.metadata?.connectedSourceRef);
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    transform.metadata?.transformAuthoring
  );
  const semanticDocument = authority.semanticDocument;
  const semanticSources = semanticDocument.sidecar.relations.flatMap(({ sourceRef }) =>
    sourceRef === undefined ? [] : [sourceRef]
  );
  if (semanticSources.length !== 1 || !sameConnectedSource(semanticSources[0]!, connectedSource)) {
    throw new Error('Transform semantic source must match the selected connected Source.');
  }

  const projection = input.targetProjection;
  if (
    projection.outputNodeId !== transform.id ||
    projection.semanticPlanSha256 !== semanticDocument.semanticPlan.sha256 ||
    !sameConnection(projection.connectionRef, connectedSource.connectionRef)
  ) {
    throw new Error('Target projection is stale or belongs to another output or connection.');
  }

  const workload = DvtOperationalWorkloadContractV1.schema.parse({
    schemaVersion: 'dvt-operational-workload.v1',
    scope: input.scope,
    graph: {
      draftRevision: input.draftRevision,
      canvasId: input.canvasId,
      selectedNodeIds: [source.id, transform.id],
      selectedEdgeIds: [edge.id],
    },
    semantics: [
      {
        transformNodeId: transform.id,
        semanticPlanSha256: semanticDocument.semanticPlan.sha256,
        profile: semanticDocument.profile,
      },
    ],
    targetProjection: {
      profileId: DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
      toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
      semanticPlanSha256: semanticDocument.semanticPlan.sha256,
      artifact: projection.artifact,
    },
    connectionRef: connectedSource.connectionRef,
    output: {
      kind: 'ephemeral-preview',
      nodeId: transform.id,
    },
  });

  return {
    kind: GENERIC_GRAPH_SOURCE_KIND,
    sourceFamily: 'dvt-operational-workloads',
    sourceVersion: '1.0',
    nodes: [
      {
        nodeId: transform.id,
        stepKind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
        dependsOn: [],
        stepTypeConfig: workload,
        metadata: { displayName: transform.name },
      },
    ],
  };
}

function selectExact<T extends { readonly id: string }>(
  items: readonly T[],
  ids: readonly string[],
  kind: string
): readonly T[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => {
    const item = itemById.get(id);
    if (item === undefined) throw new Error(`Selection references an unknown ${kind}.`);
    return item;
  });
}

function requireUniqueExactCount(ids: readonly string[], count: number, label: string): void {
  if (ids.length !== count || new Set(ids).size !== count) {
    throw new Error(`Expected exactly ${count} unique ${label} identities.`);
  }
}

function sameConnection(left: ConnectionRef, right: ConnectionRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.connectionId === right.connectionId &&
    left.provider === right.provider
  );
}

function sameConnectedSource(
  left: {
    readonly schemaVersion: string;
    readonly connectionRef: ConnectionRef;
    readonly sourceObjectId: string;
  },
  right: {
    readonly schemaVersion: string;
    readonly connectionRef: ConnectionRef;
    readonly sourceObjectId: string;
  }
): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.sourceObjectId === right.sourceObjectId &&
    sameConnection(left.connectionRef, right.connectionRef)
  );
}
