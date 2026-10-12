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
  DvtTransformResultTargetV1Schema,
  GENERIC_GRAPH_SOURCE_KIND,
  KNOWN_STEP_KINDS,
  type ConnectionRef,
  type DvtOperationalWorkloadV1,
  type DvtOperationalRejection,
  type DvtTransformResultTargetV1,
  type GenericGraphSourceV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { compareGraphIds } from './compareGraphIds.js';
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
  | ({ readonly ok: false } & DvtOperationalRejection);

export class DvtOperationalWorkloadProjector {
  public project(
    input: DvtOperationalWorkloadProjectorInput
  ): DvtOperationalWorkloadProjectionResult {
    try {
      const closure = resolveDvtTerminalTransformClosure(input);
      const semanticDocument = closure.authority.semanticDocument;
      const projection = input.targetProjection;
      const target = resolveRunTarget(closure.transform);
      if (!target.ok) return target;
      const runTarget = target.target;
      const projectionIsStale =
        projection.outputNodeId !== closure.transform.id ||
        projection.semanticPlanSha256 !== semanticDocument.semanticPlan.sha256 ||
        projection.profileId !== closure.profileId ||
        !sameConnection(projection.connectionRef, closure.connectionRef);
      if (projectionIsStale) {
        return { ok: false, ...DVT_REJECTIONS.projectionStale };
      }

      if (runTarget !== null && projection.schemaDigestSha256 === undefined) {
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
      if (runTarget === null) {
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
          output: {
            kind: 'transform-result',
            nodeId: closure.transform.id,
            disposition: 'table',
            target: runTarget,
            publicationPolicy: 'postgres-stable-table-publication.v1',
          },
          publicationBoundaries: [],
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
              nodeId: closure.transform.id,
              stepKind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
              dependsOn: [],
              stepTypeConfig: workload,
              metadata: { displayName: closure.transform.name },
            },
          ],
        },
      };
    } catch {
      return { ok: false, ...DVT_REJECTIONS.previewWorkloadProjectionFailed };
    }
  }
}

function resolveRunTarget(
  transform: WorkspaceGraphAuthoringDraft['nodes'][number]
):
  | { readonly ok: true; readonly target: DvtTransformResultTargetV1 | null }
  | Extract<DvtOperationalWorkloadProjectionResult, { ok: false }> {
  const config = transform.metadata?.['config'];
  if (config === undefined) return { ok: true, target: null };
  if (!isRecord(config)) {
    return { ok: false, ...DVT_REJECTIONS.runConfigInvalid };
  }

  const hasDisposition = Object.hasOwn(config, 'materialized');
  const hasTarget = Object.hasOwn(config, 'resultTarget');
  if (!hasDisposition && !hasTarget) return { ok: true, target: null };
  if (config['materialized'] !== 'table') {
    return { ok: false, ...DVT_REJECTIONS.runDispositionUnsupported };
  }
  const target = DvtTransformResultTargetV1Schema.safeParse(config['resultTarget']);
  return target.success
    ? { ok: true, target: target.data }
    : { ok: false, ...DVT_REJECTIONS.runTargetInvalid };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
