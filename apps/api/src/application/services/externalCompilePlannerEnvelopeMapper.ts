import type { PlannerInputEnvelopeV1 } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import type { CompileExternalPlanCommand } from './CompileExternalPlanUseCase.js';
import { resolveCanonicalPlannerInputEnvelope } from './resolveCanonicalPlannerInputEnvelope.js';

export function toExternalCompilePlannerEnvelope(
  command: CompileExternalPlanCommand,
  context: AuthorizedCommandExecutionContext
): PlannerInputEnvelopeV1 {
  const ownership = resolvePlanOwnership(context);
  return resolveCanonicalPlannerInputEnvelope({
    graphSource: normalizeCompileGraphSource(command.graphSource),
    selection: normalizeCompileSelection(command.selection),
    ...(command.policies === undefined ? {} : { policies: command.policies }),
    ...(command.environment === undefined
      ? {}
      : { environment: normalizeCompileEnvironment(command.environment) }),
    ...(ownership === undefined ? {} : { ownership }),
    ...(command.observability === undefined
      ? {}
      : { observability: normalizeCompileObservability(command.observability) }),
    requestedBy: context.principal.principalId,
    requestId: context.requestId,
    requestedAtIso: context.authorizedAt.toISOString(),
  });
}

function normalizeCompileSelection(selection: CompileExternalPlanCommand['selection']) {
  return {
    selectedNodeIds: [...selection.selectedNodeIds],
    ...(selection.includeUpstream === undefined
      ? {}
      : { includeUpstream: selection.includeUpstream }),
    ...(selection.includeDownstream === undefined
      ? {}
      : { includeDownstream: selection.includeDownstream }),
  };
}

function normalizeCompileGraphSource(graphSource: CompileExternalPlanCommand['graphSource']) {
  return {
    kind: graphSource.kind,
    sourceFamily: graphSource.sourceFamily,
    sourceVersion: graphSource.sourceVersion,
    nodes: graphSource.nodes.map((node) => {
      const metadata =
        node.metadata === undefined
          ? undefined
          : {
              ...(node.metadata.displayName === undefined
                ? {}
                : { displayName: node.metadata.displayName }),
              ...(node.metadata.sourceRef === undefined
                ? {}
                : { sourceRef: node.metadata.sourceRef }),
              ...(node.metadata.tags === undefined ? {} : { tags: node.metadata.tags }),
            };

      return {
        nodeId: node.nodeId,
        stepKind: node.stepKind,
        dependsOn: [...node.dependsOn],
        ...(node.stepTypeConfig === undefined ? {} : { stepTypeConfig: node.stepTypeConfig }),
        ...(metadata === undefined || Object.keys(metadata).length === 0 ? {} : { metadata }),
      };
    }),
  };
}

function normalizeCompileEnvironment(
  environment: NonNullable<CompileExternalPlanCommand['environment']>
) {
  return {
    ...(environment.environmentId === undefined
      ? {}
      : { environmentId: environment.environmentId }),
    ...(environment.vars === undefined ? {} : { vars: environment.vars }),
  };
}

function normalizeCompileObservability(
  observability: NonNullable<CompileExternalPlanCommand['observability']>
) {
  return observability as NonNullable<PlannerInputEnvelopeV1['observability']>;
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
