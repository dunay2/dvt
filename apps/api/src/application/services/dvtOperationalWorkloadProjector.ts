/**
 * Owned concern: lower one exact protected Source -> terminal Transform closure
 * into one generic ephemeral PostgreSQL workload.
 */
import {
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DvtOperationalWorkloadContractV1,
  GENERIC_GRAPH_SOURCE_KIND,
  KNOWN_STEP_KINDS,
  type ConnectionRef,
  type DvtOperationalWorkloadV1,
  type GenericGraphSourceV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import {
  resolveDvtTerminalTransformClosure,
  sameConnection,
} from './resolveDvtTerminalTransformClosure.js';

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
      const closure = resolveDvtTerminalTransformClosure(input);
      const semanticDocument = closure.authority.semanticDocument;
      const projection = input.targetProjection;
      if (
        projection.outputNodeId !== closure.transform.id ||
        projection.semanticPlanSha256 !== semanticDocument.semanticPlan.sha256 ||
        !sameConnection(projection.connectionRef, closure.connectedSource.connectionRef)
      ) {
        throw new Error('Target projection is stale or belongs to another output or connection.');
      }

      const workload = DvtOperationalWorkloadContractV1.schema.parse({
        schemaVersion: 'dvt-operational-workload.v1',
        scope: input.scope,
        graph: {
          draftRevision: input.draftRevision,
          canvasId: input.canvasId,
          selectedNodeIds: [closure.source.id, closure.transform.id],
          selectedEdgeIds: [closure.edge.id],
        },
        semantics: [
          {
            transformNodeId: closure.transform.id,
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
        connectionRef: closure.connectedSource.connectionRef,
        output: {
          kind: 'ephemeral-preview',
          nodeId: closure.transform.id,
        },
      });

      return {
        ok: true,
        graphSource: {
          kind: GENERIC_GRAPH_SOURCE_KIND,
          sourceFamily: 'dvt-operational-workloads',
          sourceVersion: '1.0',
          nodes: [
            {
              nodeId: closure.transform.id,
              stepKind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
              dependsOn: [],
              stepTypeConfig: workload,
              metadata: { displayName: closure.transform.name },
            },
          ],
        },
      };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'DVT workload projection failed.',
      };
    }
  }
}
