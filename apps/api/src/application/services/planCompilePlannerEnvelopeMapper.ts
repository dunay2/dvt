import type { PlannerInputEnvelopeV1 } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import type { CompilePlanCommand } from './CompilePlanUseCase.js';
import { resolveCanonicalPlannerInputEnvelope } from './resolveCanonicalPlannerInputEnvelope.js';

export function toPlanCompilePlannerEnvelope(
  command: CompilePlanCommand,
  context: AuthorizedCommandExecutionContext
): PlannerInputEnvelopeV1 {
  const ownership = resolvePlanOwnership(context);
  return resolveCanonicalPlannerInputEnvelope({
    graphSource: command.graphSource,
    selection: command.selection,
    ...(command.policies === undefined ? {} : { policies: command.policies }),
    ...(command.environment === undefined
      ? {}
      : { environment: toPlannerEnvironment(command.environment) }),
    ...(ownership === undefined ? {} : { ownership }),
    ...(command.observability === undefined
      ? {}
      : { observability: toPlannerObservability(command.observability) }),
    requestedBy: context.principal.principalId,
    requestId: context.requestId,
    requestedAtIso: context.authorizedAt.toISOString(),
  });
}

function toPlannerObservability(
  observability: NonNullable<CompilePlanCommand['observability']>
) {
  return observability as NonNullable<PlannerInputEnvelopeV1['observability']>;
}

function toPlannerEnvironment(environment: NonNullable<CompilePlanCommand['environment']>) {
  return {
    ...(environment.environmentId === undefined
      ? {}
      : { environmentId: environment.environmentId }),
    ...(environment.vars === undefined ? {} : { vars: environment.vars }),
  };
}

function resolvePlanOwnership(
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
