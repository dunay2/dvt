/**
 * Owned concern: bind one terminal DVT Transform workload to exact
 * protected graph, semantic, PostgreSQL projection, and connection identities.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision One V1 contract distinguishes Preview and Run by explicit execution intent.
 * @consequence Run retains its durable target and Preview cannot enter the executor.
 * @version 1.0.0
 */
import { z } from 'zod';

import { CommonStepTypeConfigSchema } from '../../step-registry/CommonStepTypeConfig.js';

import {
  DvtOperationalWorkloadGraphRefSchema,
  DvtOperationalWorkloadScopeSchema,
  DvtOperationalWorkloadSemanticRefSchema,
  addDvtOperationalWorkloadIdentityIssues,
} from './DvtOperationalWorkload.shared.js';
import type { PlanOwnership } from './ExecutionPlan.v1.js';
import {
  DvtPostgresSinkPublicationV1Schema,
  resolveDvtPostgresPublication,
} from './postgres/DvtPostgresPublicationBoundary.v1.js';
import {
  DvtOperationalPostgresConnectionRefSchema,
  DvtOperationalRunTargetProjectionRefSchema,
  DvtOperationalTargetProjectionRefSchema,
  DvtOperationalRunOutputSchema,
  addDvtPostgresWorkloadProfileIssues,
} from './postgres/DvtPostgresWorkloadConstraints.js';

export {
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_SET_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
} from './postgres/DvtPostgresWorkloadConstraints.js';

const EphemeralPreviewOutputIntentSchema = z
  .object({
    kind: z.literal('ephemeral-preview'),
    nodeId: z.string().min(1),
  })
  .strict();

const DvtOperationalWorkloadEnvelopeSchema = CommonStepTypeConfigSchema.pick({
  stepTimeoutMs: true,
  concurrency: true,
})
  .extend({
    schemaVersion: z.literal('dvt-operational-workload.v1'),
    scope: DvtOperationalWorkloadScopeSchema,
    graph: DvtOperationalWorkloadGraphRefSchema,
    semantics: z.array(DvtOperationalWorkloadSemanticRefSchema).length(1),
    connectionRef: DvtOperationalPostgresConnectionRefSchema,
  })
  .strict();

export const DvtOperationalPreviewWorkloadV1Schema = DvtOperationalWorkloadEnvelopeSchema.extend({
  executionIntent: z.literal('preview'),
  targetProjection: DvtOperationalTargetProjectionRefSchema,
  output: EphemeralPreviewOutputIntentSchema,
})
  .strict()
  .superRefine((workload, context) => {
    addDvtOperationalWorkloadIdentityIssues(workload, context);
    addDvtPostgresWorkloadProfileIssues(workload, context);
  });

export const DvtOperationalRunWorkloadV1Schema = DvtOperationalWorkloadEnvelopeSchema.extend({
  executionIntent: z.literal('run'),
  targetProjection: DvtOperationalRunTargetProjectionRefSchema,
  output: DvtOperationalRunOutputSchema,
  publicationBoundaries: z.array(DvtPostgresSinkPublicationV1Schema).max(1),
})
  .strict()
  .superRefine((workload, context) => {
    addDvtOperationalWorkloadIdentityIssues(workload, context);
    addDvtPostgresWorkloadProfileIssues(workload, context);
    const sink = workload.publicationBoundaries[0];
    if ((workload.output.disposition === 'ephemeral') !== (sink !== undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['publicationBoundaries'],
        message:
          'Run requires either a table result or one Sink for an ephemeral result, never both.',
      });
      return;
    }
    if (
      sink !== undefined &&
      (sink.inputNodeId !== workload.output.nodeId ||
        sink.nodeId === workload.output.nodeId ||
        !workload.graph.selectedNodeIds.includes(sink.nodeId))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['publicationBoundaries', 0],
        message:
          'Sink must identify a distinct selected node and the exact semantic Transform input.',
      });
    }
    if (workload.publicationBoundaries.length > 1) return;
    const target = resolveDvtPostgresPublication(workload).target.connectionRef;
    if (
      target.schemaVersion !== workload.connectionRef.schemaVersion ||
      target.connectionId !== workload.connectionRef.connectionId ||
      target.provider !== workload.connectionRef.provider
    ) {
      context.addIssue({
        code: 'custom',
        path:
          sink === undefined
            ? ['output', 'target', 'connectionRef']
            : ['publicationBoundaries', 0, 'target', 'connectionRef'],
        message: 'Publication target must use the workload connection.',
      });
    }
  });

export const DvtOperationalWorkloadV1Schema = z.discriminatedUnion('executionIntent', [
  DvtOperationalPreviewWorkloadV1Schema,
  DvtOperationalRunWorkloadV1Schema,
]);

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
export type DvtOperationalPreviewWorkloadV1 = z.infer<typeof DvtOperationalPreviewWorkloadV1Schema>;
export type DvtOperationalRunWorkloadV1 = z.infer<typeof DvtOperationalRunWorkloadV1Schema>;
