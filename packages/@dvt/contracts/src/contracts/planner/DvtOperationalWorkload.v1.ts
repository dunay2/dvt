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

import {
  DvtOperationalPostgresConnectionRefSchema,
  DvtOperationalTargetProjectionRefSchema,
  DvtOperationalWorkloadGraphRefSchema,
  DvtOperationalWorkloadScopeSchema,
  DvtOperationalWorkloadSemanticRefSchema,
  addDvtOperationalWorkloadIdentityIssues,
} from './DvtOperationalWorkload.shared.js';
import type { PlanOwnership } from './ExecutionPlan.v1.js';

export {
  DVT_POSTGRES_INNER_JOIN_PROFILE_ID,
  DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
} from './DvtOperationalWorkload.shared.js';

const EphemeralPreviewOutputIntentSchema = z
  .object({
    kind: z.literal('ephemeral-preview'),
    nodeId: z.string().min(1),
  })
  .strict();

export const DvtOperationalWorkloadV1Schema = CommonStepTypeConfigSchema.pick({
  stepTimeoutMs: true,
  concurrency: true,
})
  .extend({
    schemaVersion: z.literal('dvt-operational-workload.v1'),
    scope: DvtOperationalWorkloadScopeSchema,
    graph: DvtOperationalWorkloadGraphRefSchema,
    semantics: z.array(DvtOperationalWorkloadSemanticRefSchema).length(1),
    targetProjection: DvtOperationalTargetProjectionRefSchema,
    connectionRef: DvtOperationalPostgresConnectionRefSchema,
    output: EphemeralPreviewOutputIntentSchema,
  })
  .strict()
  .superRefine(addDvtOperationalWorkloadIdentityIssues);

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
