/**
 * Owns the minimum durable Run intent for one terminal DVT Transform result.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Version Run separately from the existing Preview workload and bind it to one explicit result target.
 * @consequence Runtime admission receives immutable semantic provenance without reinterpreting Preview v1.
 * @version 2.0.0
 */
import { z } from 'zod';

import { CommonStepTypeConfigSchema } from '../../step-registry/CommonStepTypeConfig.js';

import {
  DvtOperationalPostgresConnectionRefSchema,
  DvtOperationalTargetProjectionRefSchema,
  DvtOperationalWorkloadGraphRefSchema,
  DvtOperationalWorkloadScopeSchema,
  DvtOperationalWorkloadSemanticRefSchema,
  DvtOperationalWorkloadSha256Schema,
  addDvtOperationalWorkloadIdentityIssues,
} from './DvtOperationalWorkload.shared.js';
import {
  DvtOperationalWorkloadContractV1,
  DvtOperationalWorkloadV1Schema,
} from './DvtOperationalWorkload.v1.js';
import { DvtTransformResultTargetV1Schema } from './DvtTransformResultTarget.v1.js';
import type { PlanOwnership } from './ExecutionPlan.v1.js';

const DvtOperationalRunOutputSchema = z
  .object({
    kind: z.literal('transform-result'),
    nodeId: z.string().min(1),
    disposition: z.literal('table'),
    target: DvtTransformResultTargetV1Schema,
    publicationPolicy: z.literal('postgres-stable-table-publication.v1'),
  })
  .strict();

export const DvtOperationalWorkloadV2Schema = CommonStepTypeConfigSchema.pick({
  stepTimeoutMs: true,
  concurrency: true,
})
  .extend({
    schemaVersion: z.literal('dvt-operational-workload.v2'),
    executionIntent: z.literal('run'),
    scope: DvtOperationalWorkloadScopeSchema,
    graph: DvtOperationalWorkloadGraphRefSchema,
    semantics: z.array(DvtOperationalWorkloadSemanticRefSchema).length(1),
    targetProjection: DvtOperationalTargetProjectionRefSchema.extend({
      schemaDigestSha256: DvtOperationalWorkloadSha256Schema,
    }).strict(),
    connectionRef: DvtOperationalPostgresConnectionRefSchema,
    output: DvtOperationalRunOutputSchema,
    publicationBoundaries: z.tuple([]),
  })
  .strict()
  .superRefine((workload, context) => {
    addDvtOperationalWorkloadIdentityIssues(workload, context);
    if (
      workload.output.target.connectionRef.schemaVersion !== workload.connectionRef.schemaVersion ||
      workload.output.target.connectionRef.connectionId !== workload.connectionRef.connectionId ||
      workload.output.target.connectionRef.provider !== workload.connectionRef.provider
    ) {
      context.addIssue({
        code: 'custom',
        path: ['output', 'target', 'connectionRef'],
        message: 'Transform result target must use the workload connection.',
      });
    }
  });

function validatePlanOwnership(
  config: unknown,
  ownership: PlanOwnership | undefined
): string | undefined {
  const parsed = DvtOperationalWorkloadV2Schema.safeParse(config);
  if (!parsed.success) return 'DVT operational Run workload must satisfy its canonical schema';
  if (ownership === undefined) return 'DVT operational Run workload requires plan ownership';
  for (const key of ['tenantId', 'projectId', 'environmentId'] as const) {
    if (parsed.data.scope[key] !== ownership[key]) {
      return `DVT operational Run workload scope.${key} must match plan ownership`;
    }
  }
  return undefined;
}

export const DvtOperationalWorkloadContractV2 = {
  schema: DvtOperationalWorkloadV2Schema,
  validatePlanOwnership,
} as const;

export const DvtOperationalWorkloadContract = {
  schema: z.union([DvtOperationalWorkloadV1Schema, DvtOperationalWorkloadV2Schema]),
  validatePlanOwnership(config: unknown, ownership: PlanOwnership | undefined): string | undefined {
    return DvtOperationalWorkloadV2Schema.safeParse(config).success
      ? DvtOperationalWorkloadContractV2.validatePlanOwnership(config, ownership)
      : DvtOperationalWorkloadContractV1.validatePlanOwnership(config, ownership);
  },
} as const;

export type DvtOperationalWorkloadV2 = z.infer<typeof DvtOperationalWorkloadV2Schema>;
