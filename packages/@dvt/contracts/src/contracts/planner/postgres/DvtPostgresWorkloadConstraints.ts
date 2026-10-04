/**
 * Owned concern: constrain the admitted PostgreSQL workload projection and publication.
 * @baseline ADR-0064 and ADR-0066: Bounded PostgreSQL projection and stable-table publication.
 * @decision Keep dialect profiles, cardinality and durable output rules in this provider module.
 * @consequence Shared workload identity facts remain independent of database providers.
 * @version 1.0.0
 */
import { z } from 'zod';

import { StepArtifactRefSchema } from '../../../step-registry/StepArtifactRef.js';
import { ConnectionRefSchema } from '../../source-import/ConnectedSourceRef.v1.js';
import {
  DvtOperationalWorkloadSha256Schema,
  DvtOperationalWorkloadGraphRefSchema,
} from '../DvtOperationalWorkload.shared.js';
import { DvtTransformResultTargetV1Schema } from '../DvtTransformResultTarget.v1.js';

export const DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY =
  'executor.dvt-postgres-operational-workload' as const;
export const DVT_POSTGRES_PROJECT_REL_PROFILE_ID = 'dvt.vtx2.postgres.project-rel.v1' as const;
export const DVT_POSTGRES_JOIN_PROFILE_ID = 'dvt.vtx2.postgres.join.v1' as const;
export const DVT_POSTGRES_SET_PROFILE_ID = 'dvt.vtx2.postgres.set.v1' as const;
export const DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY = 'pgsql-deparser@16.1.1' as const;
const DVT_POSTGRES_HISTORICAL_INNER_JOIN_PROFILE_ID = 'dvt.vtx2.postgres.inner-join.v1' as const;

const DvtOperationalTargetProjectionRefObjectSchema = z
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

function normalizeHistoricalInnerJoinProjection(value: unknown): unknown {
  if (
    typeof value !== 'object' ||
    value == null ||
    Array.isArray(value) ||
    !('profileId' in value) ||
    value.profileId !== DVT_POSTGRES_HISTORICAL_INNER_JOIN_PROFILE_ID
  ) {
    return value;
  }
  return { ...value, profileId: DVT_POSTGRES_JOIN_PROFILE_ID };
}

export const DvtOperationalTargetProjectionRefSchema = z.preprocess(
  normalizeHistoricalInnerJoinProjection,
  DvtOperationalTargetProjectionRefObjectSchema
);

export const DvtOperationalRunTargetProjectionRefSchema = z.preprocess(
  normalizeHistoricalInnerJoinProjection,
  DvtOperationalTargetProjectionRefObjectSchema.extend({
    schemaDigestSha256: DvtOperationalWorkloadSha256Schema,
  }).strict()
);
export const DvtOperationalPostgresConnectionRefSchema = ConnectionRefSchema.extend({
  provider: z.literal('postgres'),
}).strict();

export const DvtOperationalRunOutputSchema = z
  .object({
    kind: z.literal('transform-result'),
    nodeId: z.string().min(1),
    disposition: z.literal('table'),
    target: DvtTransformResultTargetV1Schema,
    publicationPolicy: z.literal('postgres-stable-table-publication.v1'),
  })
  .strict();

export function addDvtPostgresWorkloadProfileIssues(
  workload: {
    readonly graph: z.infer<typeof DvtOperationalWorkloadGraphRefSchema>;
    readonly targetProjection: { readonly profileId: string };
  },
  context: z.RefinementCtx
): void {
  const nodeCount = workload.graph.selectedNodeIds.length;
  const edgeCount = workload.graph.selectedEdgeIds.length;
  // JOIN operands may be distinct occurrences of one physical source.
  const minimumNodes = workload.targetProjection.profileId === DVT_POSTGRES_JOIN_PROFILE_ID ? 2 : 3;
  const cardinalityMatches =
    workload.targetProjection.profileId === DVT_POSTGRES_PROJECT_REL_PROFILE_ID
      ? nodeCount === 2 && edgeCount === 1
      : nodeCount >= minimumNodes && edgeCount === nodeCount - 1;
  if (!cardinalityMatches) {
    context.addIssue({
      code: 'custom',
      path: ['graph'],
      message: 'Selected graph cardinality must match the bounded target projection profile.',
    });
  }
}
