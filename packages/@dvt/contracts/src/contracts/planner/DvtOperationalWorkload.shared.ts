/**
 * Owns identities and validation shared by Preview v1 and Run v2 workloads.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Keep protected graph, semantic, projection, and connection identity checks shared across workload versions.
 * @consequence Preview and Run cannot drift in their authorization-bound identities.
 * @version 1.0.0
 */
import { z } from 'zod';

import { StepArtifactRefSchema } from '../../step-registry/DbtStepTypeConfig.js';
import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

import { DvtSubstraitProfileRefV1Schema } from './DvtSubstraitProfile.v1.js';

export const DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY =
  'executor.dvt-postgres-operational-workload' as const;
export const DVT_POSTGRES_PROJECT_REL_PROFILE_ID = 'dvt.vtx2.postgres.project-rel.v1' as const;
export const DVT_POSTGRES_JOIN_PROFILE_ID = 'dvt.vtx2.postgres.join.v1' as const;
export const DVT_POSTGRES_SET_PROFILE_ID = 'dvt.vtx2.postgres.set.v1' as const;
export const DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY = 'pgsql-deparser@16.1.1' as const;

const NonBlankStringSchema = z
  .string()
  .refine((value) => value.length > 0 && value === value.trim(), 'Expected a non-blank string.');

export const DvtOperationalWorkloadSha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
export const DvtOperationalWorkloadScopeSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict();
export const DvtOperationalWorkloadGraphRefSchema = z
  .object({
    draftRevision: NonBlankStringSchema,
    canvasId: NonBlankStringSchema,
    selectedNodeIds: z.array(NonBlankStringSchema).min(2),
    selectedEdgeIds: z.array(NonBlankStringSchema).min(1),
  })
  .strict();
export const DvtOperationalWorkloadSemanticRefSchema = z
  .object({
    transformNodeId: NonBlankStringSchema,
    semanticPlanSha256: DvtOperationalWorkloadSha256Schema,
    profile: DvtSubstraitProfileRefV1Schema,
  })
  .strict();
export const DvtOperationalTargetProjectionRefSchema = z
  .object({
    profileId: z.enum([
      DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
      DVT_POSTGRES_JOIN_PROFILE_ID,
      DVT_POSTGRES_SET_PROFILE_ID,
    ]),
    toolIdentity: z.literal(DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY),
    semanticPlanSha256: DvtOperationalWorkloadSha256Schema,
    artifact: StepArtifactRefSchema.extend({ artifactKind: z.literal('compiled-sql') }).strict(),
  })
  .strict();
export const DvtOperationalPostgresConnectionRefSchema = ConnectionRefSchema.extend({
  provider: z.literal('postgres'),
}).strict();

export function addDvtOperationalWorkloadIdentityIssues(
  workload: {
    readonly graph: z.infer<typeof DvtOperationalWorkloadGraphRefSchema>;
    readonly semantics: readonly z.infer<typeof DvtOperationalWorkloadSemanticRefSchema>[];
    readonly targetProjection: z.infer<typeof DvtOperationalTargetProjectionRefSchema>;
    readonly output: { readonly nodeId: string };
  },
  context: z.RefinementCtx
): void {
  addUniqueIssue(workload.graph.selectedNodeIds, ['graph', 'selectedNodeIds'], context);
  addUniqueIssue(workload.graph.selectedEdgeIds, ['graph', 'selectedEdgeIds'], context);

  const nodeCount = workload.graph.selectedNodeIds.length;
  const edgeCount = workload.graph.selectedEdgeIds.length;
  const cardinalityMatches =
    workload.targetProjection.profileId === DVT_POSTGRES_PROJECT_REL_PROFILE_ID
      ? nodeCount === 2 && edgeCount === 1
      : nodeCount >= 3 && edgeCount === nodeCount - 1;
  if (!cardinalityMatches) {
    context.addIssue({
      code: 'custom',
      path: ['graph'],
      message: 'Selected graph cardinality must match the bounded target projection profile.',
    });
  }

  const semantic = workload.semantics[0];
  if (semantic === undefined) return;
  const selectedNodeIds = new Set(workload.graph.selectedNodeIds);
  if (!selectedNodeIds.has(semantic.transformNodeId)) {
    context.addIssue({
      code: 'custom',
      path: ['semantics', 0, 'transformNodeId'],
      message: 'Semantic Transform must belong to the exact selected graph.',
    });
  }
  if (!selectedNodeIds.has(workload.output.nodeId)) {
    context.addIssue({
      code: 'custom',
      path: ['output', 'nodeId'],
      message: 'Output node must belong to the exact selected graph.',
    });
  }
  if (workload.output.nodeId !== semantic.transformNodeId) {
    context.addIssue({
      code: 'custom',
      path: ['output', 'nodeId'],
      message: 'Output must identify the semantic Transform.',
    });
  }
  if (workload.targetProjection.semanticPlanSha256 !== semantic.semanticPlanSha256) {
    context.addIssue({
      code: 'custom',
      path: ['targetProjection', 'semanticPlanSha256'],
      message: 'Target projection must bind the exact semantic plan.',
    });
  }
}

function addUniqueIssue(
  values: readonly string[],
  path: Array<string | number>,
  context: z.RefinementCtx
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: 'custom', path, message: 'Expected unique identities.' });
  }
}
