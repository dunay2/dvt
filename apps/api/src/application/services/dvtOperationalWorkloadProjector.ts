/**
 * Owned concern: lower one exact protected Source -> terminal Transform closure
 * into one generic ephemeral PostgreSQL workload.
 */
import {
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DvtOperationalWorkloadContractV1,
  DvtOperationalWorkloadContractV2,
  DvtTransformResultTargetV1Schema,
  GENERIC_GRAPH_SOURCE_KIND,
  KNOWN_STEP_KINDS,
  type ConnectionRef,
  type DvtOperationalWorkloadV1,
  type DvtTransformResultTargetV1,
  type GenericGraphSourceV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { sameConnection } from './dvtSourceCoverage.js';
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
  | { readonly ok: false; readonly reason: string };

export class DvtOperationalWorkloadProjector {
  public project(
    input: DvtOperationalWorkloadProjectorInput
  ): DvtOperationalWorkloadProjectionResult {
    try {
      const closure = resolveDvtTerminalTransformClosure(input);
      const semanticDocument = closure.authority.semanticDocument;
      const projection = input.targetProjection;
      const runTarget = resolveRunTarget(closure.transform);
      if (
        projection.outputNodeId !== closure.transform.id ||
        projection.semanticPlanSha256 !== semanticDocument.semanticPlan.sha256 ||
        projection.profileId !== closure.profileId ||
        !sameConnection(projection.connectionRef, closure.connectionRef)
      ) {
        throw new Error('Target projection is stale or belongs to another output or connection.');
      }

      if (runTarget !== null && projection.schemaDigestSha256 === undefined) {
        throw new Error('Configured Run requires a canonical PostgreSQL output schema digest.');
      }

      const commonWorkload = {
        scope: input.scope,
        graph: {
          draftRevision: input.draftRevision,
          canvasId: input.canvasId,
          selectedNodeIds: [
            ...closure.sources.map(({ node }) => node.id),
            closure.transform.id,
          ].sort(),
          selectedEdgeIds: closure.edges.map((edge) => edge.id).sort(),
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
      const workload =
        runTarget === null
          ? DvtOperationalWorkloadContractV1.schema.parse({
              ...commonWorkload,
              schemaVersion: 'dvt-operational-workload.v1',
              output: { kind: 'ephemeral-preview', nodeId: closure.transform.id },
            })
          : DvtOperationalWorkloadContractV2.schema.parse({
              ...commonWorkload,
              schemaVersion: 'dvt-operational-workload.v2',
              executionIntent: 'run',
              targetProjection: {
                ...commonWorkload.targetProjection,
                schemaDigestSha256: projection.schemaDigestSha256,
              },
              output: {
                kind: 'transform-result',
                nodeId: closure.transform.id,
                disposition: 'table',
                target: runTarget,
                publicationPolicy: 'postgres-stable-table-publication.v1',
              },
              publicationBoundaries: [],
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

function resolveRunTarget(
  transform: WorkspaceGraphAuthoringDraft['nodes'][number]
): DvtTransformResultTargetV1 | null {
  const config = transform.metadata?.['config'];
  if (config === undefined) return null;
  if (!isRecord(config)) {
    throw new Error('Transform config must be an object.');
  }

  const hasDisposition = Object.hasOwn(config, 'materialized');
  const hasTarget = Object.hasOwn(config, 'resultTarget');
  if (!hasDisposition && !hasTarget) return null;
  if (config['materialized'] !== 'table') {
    throw new Error('Configured Run supports only table result disposition.');
  }
  const target = DvtTransformResultTargetV1Schema.safeParse(config['resultTarget']);
  if (!target.success)
    throw new Error('Configured Run requires one valid PostgreSQL result target.');
  return target.data;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
