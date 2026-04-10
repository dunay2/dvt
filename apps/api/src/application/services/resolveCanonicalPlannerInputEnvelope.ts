import type {
  ExecutionPlan,
  GenericGraphSourceV1,
  PlannerInputEnvelopeV1,
  PlannerPolicyClassSet,
} from '@dvt/contracts';

import type { IPlannerCompatibilityResolver } from '../ports/IPlannerCompatibilityResolver.js';
import type {
  StartRunManifestRef,
  StartRunPlannerEnvironmentInput,
} from '../ports/startRunCommandContract.js';

export interface PlannerCompatibilityEnvelopeInput {
  readonly graphSource?: GenericGraphSourceV1;
  readonly manifestRef?: StartRunManifestRef;
  readonly selection: PlannerInputEnvelopeV1['selection'];
  readonly policies?: PlannerPolicyClassSet;
  readonly environment?: StartRunPlannerEnvironmentInput;
  readonly observability?: ExecutionPlan['observability'];
  readonly requestedBy?: string;
  readonly requestId?: string;
  readonly requestedAtIso?: string;
}

export async function resolveCanonicalPlannerInputEnvelope(
  input: PlannerCompatibilityEnvelopeInput,
  resolver: IPlannerCompatibilityResolver | undefined
): Promise<PlannerInputEnvelopeV1> {
  const graphSource = await resolveGraphSource(input, resolver);

  return {
    graphSource,
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

async function resolveGraphSource(
  input: Pick<PlannerCompatibilityEnvelopeInput, 'graphSource' | 'manifestRef'>,
  resolver: IPlannerCompatibilityResolver | undefined
): Promise<GenericGraphSourceV1> {
  if (input.graphSource !== undefined && input.manifestRef !== undefined) {
    throw new Error('Planner compatibility boundary received both graphSource and manifestRef.');
  }

  if (input.graphSource !== undefined) {
    return input.graphSource;
  }

  if (input.manifestRef === undefined) {
    throw new Error('Planner compatibility boundary requires graphSource or manifestRef.');
  }

  if (resolver === undefined) {
    throw new Error('manifestRef provided but no planner compatibility resolver is configured.');
  }

  return resolver.resolveManifestRef(input.manifestRef);
}
