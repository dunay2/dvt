import type {
  ExecutionPlan,
  GenericGraphSourceV1,
  PlannerInputEnvelopeV1,
  PlannerPolicyClassSet,
} from '@dvt/contracts';

export interface CanonicalPlannerInputEnvelopeInput {
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: PlannerInputEnvelopeV1['selection'];
  readonly decisionScope?: PlannerInputEnvelopeV1['decisionScope'] | undefined;
  readonly policies?: PlannerPolicyClassSet | undefined;
  readonly ownership?: PlannerInputEnvelopeV1['ownership'] | undefined;
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
    ...(input.decisionScope === undefined ? {} : { decisionScope: input.decisionScope }),
    ...(input.policies === undefined ? {} : { policies: input.policies }),
    ...(input.ownership === undefined ? {} : { ownership: input.ownership }),
    ...(input.observability === undefined ? {} : { observability: input.observability }),
    ...(input.requestedBy === undefined ? {} : { requestedBy: input.requestedBy }),
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.requestedAtIso === undefined ? {} : { requestedAtIso: input.requestedAtIso }),
  };
}
