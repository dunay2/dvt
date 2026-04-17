import type { PlannerInputEnvelopeV1 } from '@dvt/contracts';

import { resolveCanonicalPlannerInputEnvelope } from '../../application/services/resolveCanonicalPlannerInputEnvelope.js';

import type { ParsedExternalPlanCompileRouteInput } from './externalPlanCompileRouteInputParser.js';

export function toExternalCompilePlannerEnvelope(
  input: ParsedExternalPlanCompileRouteInput,
  requestMeta: {
    requestedBy: string;
    requestId: string;
    requestedAtIso: string;
  }
): PlannerInputEnvelopeV1 {
  return resolveCanonicalPlannerInputEnvelope({
    graphSource: input.graphSource,
    selection: input.selection,
    ...(input.policies === undefined ? {} : { policies: input.policies }),
    ...(input.environment === undefined
      ? {}
      : { environment: normalizeCompileEnvironment(input.environment) }),
    ...(input.observability === undefined
      ? {}
      : { observability: normalizeCompileObservability(input.observability) }),
    requestedBy: requestMeta.requestedBy,
    requestId: requestMeta.requestId,
    requestedAtIso: requestMeta.requestedAtIso,
  });
}

function normalizeCompileEnvironment(
  environment: NonNullable<ParsedExternalPlanCompileRouteInput['environment']>
) {
  return {
    ...(environment.environmentId === undefined ? {} : { environmentId: environment.environmentId }),
    ...(environment.vars === undefined ? {} : { vars: environment.vars }),
  };
}

function normalizeCompileObservability(
  observability: NonNullable<ParsedExternalPlanCompileRouteInput['observability']>
) {
  return {
    ...(observability.tags === undefined ? {} : { tags: observability.tags }),
    ...(observability.extra === undefined ? {} : { extra: observability.extra }),
  };
}
