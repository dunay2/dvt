/**
 * Owned concern: bind one terminal DVT Transform Preview workload to exact
 * protected graph, semantic, PostgreSQL projection, and connection identities.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Bind terminal Transform Preview to the exact protected graph, semantic plan, target SQL projection, and governed connection.
 * @consequence Preview cannot detach generated SQL from its authorized semantic provenance.
 * @version 1.0.0
 */
import { z } from 'zod';

import { CommonStepTypeConfigSchema } from '../../step-registry/CommonStepTypeConfig.js';
import { StepArtifactRefSchema } from '../../step-registry/DbtStepTypeConfig.js';
import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

import { DvtSubstraitProfileRefV1Schema } from './DvtSubstraitProfile.v1.js';
import type { PlanOwnership } from './ExecutionPlan.v1.js';

export const DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY =
  'executor.dvt-postgres-operational-workload' as const;
export const DVT_POSTGRES_PROJECT_REL_PROFILE_ID = 'dvt.vtx2.postgres.project-rel.v1' as const;
export const DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY = 'pgsql-deparser@16.1.1' as const;

const NonBlankStringSchema = z
  .string()
  .refine((value) => value.length > 0 && value === value.trim(), 'Expected a non-blank string.');
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
const ScopeSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict();
const GraphRefSchema = z
  .object({
    draftRevision: NonBlankStringSchema,
    canvasId: NonBlankStringSchema,
    selectedNodeIds: z.array(NonBlankStringSchema).length(2),
    selectedEdgeIds: z.array(NonBlankStringSchema).length(1),
  })
  .strict();
const SemanticRefSchema = z
  .object({
    transformNodeId: NonBlankStringSchema,
    semanticPlanSha256: Sha256Schema,
    profile: DvtSubstraitProfileRefV1Schema,
  })
  .strict();
const CompiledSqlArtifactRefSchema = StepArtifactRefSchema.extend({
  artifactKind: z.literal('compiled-sql'),
}).strict();
const TargetProjectionRefSchema = z
  .object({
    profileId: z.literal(DVT_POSTGRES_PROJECT_REL_PROFILE_ID),
    toolIdentity: z.literal(DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY),
    semanticPlanSha256: Sha256Schema,
    artifact: CompiledSqlArtifactRefSchema,
  })
  .strict();
const PostgresConnectionRefSchema = ConnectionRefSchema.extend({
  provider: z.literal('postgres'),
}).strict();
const EphemeralPreviewOutputIntentSchema = z
  .object({
    kind: z.literal('ephemeral-preview'),
    nodeId: NonBlankStringSchema,
  })
  .strict();

export const DvtOperationalWorkloadV1Schema = CommonStepTypeConfigSchema.pick({
  stepTimeoutMs: true,
  concurrency: true,
})
  .extend({
    schemaVersion: z.literal('dvt-operational-workload.v1'),
    scope: ScopeSchema,
    graph: GraphRefSchema,
    semantics: z.array(SemanticRefSchema).length(1),
    targetProjection: TargetProjectionRefSchema,
    connectionRef: PostgresConnectionRefSchema,
    output: EphemeralPreviewOutputIntentSchema,
  })
  .strict()
  .superRefine((workload, context) => {
    addUniqueIssue(workload.graph.selectedNodeIds, ['graph', 'selectedNodeIds'], context);
    addUniqueIssue(workload.graph.selectedEdgeIds, ['graph', 'selectedEdgeIds'], context);

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
        message: 'Ephemeral output must identify the semantic Transform.',
      });
    }
    if (workload.targetProjection.semanticPlanSha256 !== semantic.semanticPlanSha256) {
      context.addIssue({
        code: 'custom',
        path: ['targetProjection', 'semanticPlanSha256'],
        message: 'Target projection must bind the exact semantic plan.',
      });
    }
  });

function addUniqueIssue(
  values: readonly string[],
  path: Array<string | number>,
  context: z.RefinementCtx
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: 'custom', path, message: 'Expected unique identities.' });
  }
}

function validatePlanOwnership(
  config: unknown,
  ownership: PlanOwnership | undefined
): string | undefined {
  const parsed = DvtOperationalWorkloadV1Schema.safeParse(config);
  if (!parsed.success) return 'DVT operational workload must satisfy its canonical schema';
  if (ownership === undefined) return 'DVT operational workload requires plan ownership';

  for (const key of ['tenantId', 'projectId', 'environmentId'] as const) {
    if (parsed.data.scope[key] !== ownership[key]) {
      return `DVT operational workload scope.${key} must match plan ownership`;
    }
  }
  return undefined;
}

export const DvtOperationalWorkloadContractV1 = {
  schema: DvtOperationalWorkloadV1Schema,
  validatePlanOwnership,
} as const;

export type DvtOperationalWorkloadV1 = z.infer<typeof DvtOperationalWorkloadV1Schema>;
