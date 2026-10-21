/**
 * Owned concern: lower one exact protected Source -> terminal Transform closure
 * into one generic PostgreSQL workload with explicit Preview or Run intent.
 * @baseline Workload V1 binds the exact authorized closure and semantic revision.
 * @decision Canonicalize graph ID lists without reordering semantic operands.
 * @consequence Preview and Run retain the same locale-independent graph identity.
 * @version 1.0.0
 */
import {
  DVT_REJECTIONS,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DvtOperationalWorkloadContractV1,
  GENERIC_GRAPH_SOURCE_KIND,
  KNOWN_STEP_KINDS,
  type ConnectionRef,
  type DvtOperationalWorkloadV1,
  type DvtOperationalRejection,
  type GenericGraphSourceV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { compareGraphIds } from './compareGraphIds.js';
import { sameConnection } from './dvtSourceCoverage.js';
import { resolveDvtWorkloadPublication } from './dvtWorkloadPublication.js';
import { resolveDvtTerminalTransformClosure } from './resolveDvtTerminalTransformClosure.js';

export type DvtTerminalTransformProjectionBinding = {
  readonly outputNodeId: string;
  readonly semanticPlanSha256: string;
  readonly schemaDigestSha256?: string;
  readonly connectionRef: ConnectionRef;
  readonly profileId: DvtOperationalWorkloadV1['targetProjection']['profileId'];
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
  | ({ readonly ok: false } & DvtOperationalRejection);

export class DvtOperationalWorkloadProjector {
  public project(
    input: DvtOperationalWorkloadProjectorInput
  ): DvtOperationalWorkloadProjectionResult {
    try {
      const closure = resolveDvtTerminalTransformClosure(input);
      const semanticDocument = closure.authority.semanticDocument;
      const projection = input.targetProjection;
      const target = resolveDvtWorkloadPublication(closure);
      if (!target.ok) return target;
      const publication = target.intent;
      const projectionIsStale =
        projection.outputNodeId !== closure.transform.id ||
        projection.semanticPlanSha256 !== semanticDocument.semanticPlan.sha256 ||
        projection.profileId !== closure.profileId ||
        !sameConnection(projection.connectionRef, closure.connectionRef);
      if (projectionIsStale) {
        return { ok: false, ...DVT_REJECTIONS.projectionStale };
      }

      if (publication !== null && projection.schemaDigestSha256 === undefined) {
        return { ok: false, ...DVT_REJECTIONS.runSchemaDigestRequired };
      }

      const commonWorkload = {
        schemaVersion: 'dvt-operational-workload.v1',
        scope: input.scope,
        graph: {
          draftRevision: input.draftRevision,
          canvasId: input.canvasId,
          selectedNodeIds: [
            ...closure.sources.map(({ node }) => node.id),
            closure.transform.id,
            ...(closure.sink === undefined ? [] : [closure.sink.id]),
          ].sort(compareGraphIds),
          selectedEdgeIds: closure.edges.map((edge) => edge.id).sort(compareGraphIds),
        },
        semantics: [
          {
            transformNodeId: closure.transform.id,
            semanticPlanSha256: semanticDocument.semanticPlan.sha256,
            profile: semanticDocument.profile,
          },
        ],
        targetProjection: {
          profileId: closure.profileId,
          toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
          semanticPlanSha256: semanticDocument.semanticPlan.sha256,
          artifact: projection.artifact,
        },
        connectionRef: closure.connectionRef,
      };
      let workloadInput: unknown;
      if (publication === null) {
        workloadInput = {
          ...commonWorkload,
          executionIntent: 'preview',
          output: { kind: 'ephemeral-preview', nodeId: closure.transform.id },
        };
      } else {
        workloadInput = {
          ...commonWorkload,
          executionIntent: 'run',
          targetProjection: {
            ...commonWorkload.targetProjection,
            schemaDigestSha256: projection.schemaDigestSha256,
          },
          ...publication,
        };
      }
      const workload = DvtOperationalWorkloadContractV1.schema.parse(workloadInput);

      return {
        ok: true,
        graphSource: {
          kind: GENERIC_GRAPH_SOURCE_KIND,
          sourceFamily: 'dvt-operational-workloads',
          sourceVersion: '1.0',
          nodes: [
            {
              nodeId: (closure.sink ?? closure.transform).id,
              stepKind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
              dependsOn: [],
              stepTypeConfig: workload,
              metadata: { displayName: (closure.sink ?? closure.transform).name },
            },
          ],
        },
      };
    } catch {
      return { ok: false, ...DVT_REJECTIONS.previewWorkloadProjectionFailed };
    }
  }
}
