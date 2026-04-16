import type {
  ExecutionPlan,
  GenericGraphSourceV1,
  PlannerInputEnvelopeV1,
  PlannerPolicyClassSet,
} from '@dvt/contracts';

import type { StartRunPlannerEnvironmentInput } from '../ports/startRunCommandContract.js';

export interface CanonicalPlannerInputEnvelopeInput {
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: PlannerInputEnvelopeV1['selection'];
  readonly policies?: PlannerPolicyClassSet | undefined;
  readonly environment?: StartRunPlannerEnvironmentInput | undefined;
  readonly observability?: ExecutionPlan['observability'] | undefined;
  readonly requestedBy?: string | undefined;
  readonly requestId?: string | undefined;
  readonly requestedAtIso?: string | undefined;
}

export function resolveCanonicalPlannerInputEnvelope(
  input: CanonicalPlannerInputEnvelopeInput
): PlannerInputEnvelopeV1 {
  return {
    graphSource: input.graphSource,
    selection: input.selection,
    ...(input.policies === undefined ? {} : { policies: input.policies }),
    ...(input.environment === undefined
      ? {}
      : {
          environment: {
            ...(input.environment.environmentId === undefined
              ? {}
              : { environmentId: input.environment.environmentId }),
            ...(input.environment.vars === undefined ? {} : { vars: input.environment.vars }),
          },
        }),
    ...(input.observability === undefined ? {} : { observability: input.observability }),
    ...(input.requestedBy === undefined ? {} : { requestedBy: input.requestedBy }),
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.requestedAtIso === undefined ? {} : { requestedAtIso: input.requestedAtIso }),
  };
}
