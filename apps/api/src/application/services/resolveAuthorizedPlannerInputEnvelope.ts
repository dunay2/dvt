import type { PlannerInputEnvelopeV1 } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { resolveCanonicalPlannerInputEnvelope } from './resolveCanonicalPlannerInputEnvelope.js';

type OptionalPropertyInput<T> = T | undefined;

type PlannerInputPolicies = NonNullable<PlannerInputEnvelopeV1['policies']>;
type PlannerInputObservability = NonNullable<PlannerInputEnvelopeV1['observability']>;

interface PlannerInputObservabilityInput {
  readonly [key: string]: unknown;
  readonly tags?: OptionalPropertyInput<Record<string, string>>;
  readonly extra?: OptionalPropertyInput<Record<string, unknown>>;
}

export interface AuthorizedPlannerInputSeed {
  readonly graphSource: PlannerInputEnvelopeV1['graphSource'];
  readonly selection: PlannerInputEnvelopeV1['selection'];
  readonly decisionScope?: OptionalPropertyInput<PlannerInputEnvelopeV1['decisionScope']>;
  readonly policies?: OptionalPropertyInput<PlannerInputPolicies>;
  readonly observability?: OptionalPropertyInput<PlannerInputObservabilityInput>;
}

export function resolveAuthorizedPlannerInputEnvelope(
  seed: AuthorizedPlannerInputSeed,
  context: AuthorizedCommandExecutionContext
): PlannerInputEnvelopeV1 {
  const ownership = resolvePlanOwnershipFromAuthorizedScope(context);

  return resolveCanonicalPlannerInputEnvelope({
    graphSource: seed.graphSource,
    selection: seed.selection,
    ...(seed.decisionScope === undefined ? {} : { decisionScope: seed.decisionScope }),
    ...(seed.policies === undefined ? {} : { policies: seed.policies }),
    ...(ownership === undefined ? {} : { ownership }),
    ...(seed.observability === undefined
      ? {}
      : { observability: normalizePlannerInputObservability(seed.observability) }),
    ...resolvePlannerInputRequestMetadata(context),
  });
}

function resolvePlannerInputRequestMetadata(
  context: AuthorizedCommandExecutionContext
): Pick<PlannerInputEnvelopeV1, 'requestedBy' | 'requestId' | 'requestedAtIso'> {
  return {
    requestedBy: context.principal.principalId,
    requestId: context.requestId,
    requestedAtIso: context.authorizedAt.toISOString(),
  };
}

function resolvePlanOwnershipFromAuthorizedScope(
  context: AuthorizedCommandExecutionContext
): PlannerInputEnvelopeV1['ownership'] | undefined {
  const projectId = context.scope.projectId?.value;
  const environmentId = context.scope.environmentId?.value;
  if (projectId === undefined || environmentId === undefined) {
    return undefined;
  }

  return {
    tenantId: context.scope.tenantId.value,
    projectId,
    environmentId,
  };
}

function normalizePlannerInputObservability(
  observability: PlannerInputObservabilityInput
): PlannerInputObservability {
  const normalized: PlannerInputObservability = {};

  for (const [key, value] of Object.entries(observability)) {
    if (key !== 'tags' && key !== 'extra') {
      normalized[key] = value;
    }
  }

  if (observability.tags !== undefined) {
    normalized.tags = observability.tags;
  }

  if (observability.extra !== undefined) {
    normalized.extra = observability.extra;
  }

  return normalized;
}
