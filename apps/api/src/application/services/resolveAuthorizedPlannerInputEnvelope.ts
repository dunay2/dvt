import type { PlannerInputEnvelopeV1 } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import type { PlanRoutePlannerInputPolicy } from './planRoutePolicyCatalog.js';
import {
  resolveCanonicalPlannerInputEnvelope,
} from './resolveCanonicalPlannerInputEnvelope.js';

type OptionalPropertyInput<T> = T | undefined;

type PlannerInputPolicies = NonNullable<PlannerInputEnvelopeV1['policies']>;
type PlannerInputEnvironment = NonNullable<PlannerInputEnvelopeV1['environment']>;
type PlannerInputOwnership = NonNullable<PlannerInputEnvelopeV1['ownership']>;
type PlannerInputObservability = NonNullable<PlannerInputEnvelopeV1['observability']>;

interface PlannerInputObservabilityInput {
  readonly [key: string]: unknown;
  readonly tags?: OptionalPropertyInput<Record<string, string>>;
  readonly extra?: OptionalPropertyInput<Record<string, unknown>>;
}

interface PlannerInputEnvironmentInput {
  readonly environmentId?: OptionalPropertyInput<string>;
  readonly vars?: OptionalPropertyInput<Record<string, unknown>>;
}

export interface AuthorizedPlannerInputSeed {
  readonly graphSource: PlannerInputEnvelopeV1['graphSource'];
  readonly selection: PlannerInputEnvelopeV1['selection'];
  readonly policies?: OptionalPropertyInput<PlannerInputPolicies>;
  readonly environment?: OptionalPropertyInput<PlannerInputEnvironmentInput>;
  readonly ownership?: OptionalPropertyInput<PlannerInputOwnership>;
  readonly observability?: OptionalPropertyInput<PlannerInputObservabilityInput>;
}

export function resolveAuthorizedPlannerInputEnvelope(
  seed: AuthorizedPlannerInputSeed,
  context: AuthorizedCommandExecutionContext,
  policy: PlanRoutePlannerInputPolicy
): PlannerInputEnvelopeV1 {
  const ownership = resolvePlannerInputOwnership(seed, context, policy);

  return resolveCanonicalPlannerInputEnvelope({
    graphSource: seed.graphSource,
    selection: seed.selection,
    ...(seed.policies === undefined ? {} : { policies: seed.policies }),
    ...(seed.environment === undefined
      ? {}
      : { environment: normalizePlannerInputEnvironment(seed.environment) }),
    ...(ownership === undefined ? {} : { ownership }),
    ...(seed.observability === undefined
      ? {}
      : { observability: normalizePlannerInputObservability(seed.observability) }),
    ...resolvePlannerInputRequestMetadata(context, policy),
  });
}

function resolvePlannerInputOwnership(
  seed: AuthorizedPlannerInputSeed,
  context: AuthorizedCommandExecutionContext,
  policy: PlanRoutePlannerInputPolicy
): PlannerInputOwnership | undefined {
  switch (policy.ownershipSource) {
    case 'authorized-scope':
      return resolvePlanOwnershipFromAuthorizedScope(context);
    case 'seed':
      return seed.ownership;
    case 'none':
      return undefined;
  }
}

function resolvePlannerInputRequestMetadata(
  context: AuthorizedCommandExecutionContext,
  policy: PlanRoutePlannerInputPolicy
): Pick<PlannerInputEnvelopeV1, 'requestedBy' | 'requestId' | 'requestedAtIso'> | Record<string, never> {
  switch (policy.requestMetadataSource) {
    case 'authorized-context':
      return {
        requestedBy: context.principal.principalId,
        requestId: context.requestId,
        requestedAtIso: context.authorizedAt.toISOString(),
      };
    case 'none':
      return {};
  }
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

function normalizePlannerInputEnvironment(
  environment: PlannerInputEnvironmentInput
): PlannerInputEnvironment {
  return {
    ...(environment.environmentId === undefined
      ? {}
      : { environmentId: environment.environmentId }),
    ...(environment.vars === undefined ? {} : { vars: environment.vars }),
  };
}
