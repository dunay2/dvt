/**
 * Owned concern: compile planner-backed selected-closure start-run inputs into
 * stored plans and hand validated plan refs to the execution delegate.
 */
import {
  START_RUN_RESULT_KIND,
  type IPlanExecutabilityValidator,
  type IPlanValidationLifecycleStore,
  type IPlanner,
  type PlannerInputEnvelopeV1,
  type PlanRef,
  type StartRunCommand,
  type StartRunPlanRef,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type {
  IPlanCompileLatencyTelemetry,
  PlanCompileLatencyOutcome,
} from '../ports/StartRunSlaTelemetry.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';

import { resolveCanonicalPlannerInputEnvelope } from './resolveCanonicalPlannerInputEnvelope.js';
import { ResolveAuthorizedExecutableSubgraphService } from './resolveAuthorizedExecutableSubgraph.js';

type PlanValidationResult = Awaited<ReturnType<IPlanExecutabilityValidator['validatePlan']>>;
export class PlannerBackedStartRunUseCase implements IStartRunUseCase {
  private static readonly NOOP_TELEMETRY: IPlanCompileLatencyTelemetry = {
    recordPlanCompileLatency() {},
  };

  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly planStore: IPlanValidationLifecycleStore;
      readonly validator: IPlanExecutabilityValidator;
      readonly delegate: IStartRunUseCase;
      readonly compileTelemetry?: IPlanCompileLatencyTelemetry;
      readonly executableSubgraphResolver: ResolveAuthorizedExecutableSubgraphService;
    }
  ) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    if (command.planRef != null) {
      return this.deps.delegate.execute(command, context);
    }

    let buildResult: Awaited<ReturnType<IPlanner['buildPlan']>>;
    const compileStartMs = Date.now();
    let compileOutcome: PlanCompileLatencyOutcome = 'error';
    try {
      const executableSubgraph = await this.deps.executableSubgraphResolver.execute(
        command.graphSource === undefined
          ? {
              selection: command.selection,
            }
          : {
              selection: command.selection,
              graphSource: command.graphSource,
            },
        context
      );
      if (!executableSubgraph.ok) {
        return {
          ok: true,
          value: {
            kind: START_RUN_RESULT_KIND.planRejected,
            accepted: false,
            ...executableSubgraph.rejection,
          },
        };
      }

      const plannerInput = toPlannerInput(command, context, executableSubgraph.value.nodeIds);
      buildResult = await this.deps.planner.buildPlan(plannerInput);
      compileOutcome = 'built';
    } finally {
      (
        this.deps.compileTelemetry ?? PlannerBackedStartRunUseCase.NOOP_TELEMETRY
      ).recordPlanCompileLatency(Date.now() - compileStartMs, compileOutcome);
    }
    const planRef = await this.deps.planStore.storePlan(buildResult);
    const validation = await this.deps.validator.validatePlan(planRef, command.targetAdapter);

    if (isValidationError(validation)) {
      await this.deps.planStore.markInvalid(planRef, validation);
      return {
        ok: true,
        value: {
          kind: START_RUN_RESULT_KIND.planRejected,
          accepted: false,
          code: validation.code,
          reason: validation.reason,
          ...(validation.cause === undefined ? {} : { cause: validation.cause }),
        },
      };
    }

    await this.deps.planStore.markValid(planRef);
    return this.deps.delegate.execute(
      {
        runId: command.runId,
        targetAdapter: command.targetAdapter,
        selection: command.selection,
        planRef: toRoutePlanRef(planRef),
        ...(command.runExecutionContextRef === undefined
          ? {}
          : { runExecutionContextRef: command.runExecutionContextRef }),
      },
      context
    );
  }
}

function toRoutePlanRef(planRef: PlanRef): StartRunPlanRef {
  return {
    uri: planRef.uri,
    sha256: planRef.sha256,
    schemaVersion: planRef.schemaVersion,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    ...(planRef.sizeBytes === undefined ? {} : { sizeBytes: planRef.sizeBytes }),
    ...(planRef.expiresAt === undefined ? {} : { expiresAt: planRef.expiresAt }),
  };
}

function toPlannerInput(
  command: StartRunCommand,
  context: AuthorizedCommandExecutionContext,
  selectedNodeIds: readonly string[]
): PlannerInputEnvelopeV1 {
  if (command.graphSource === undefined) {
    throw new Error('Planner-backed startRun requires graphSource.');
  }

  const ownership = resolvePlanOwnership(context);
  return resolveCanonicalPlannerInputEnvelope(
    {
      graphSource: toPlannerGraphSource(command.graphSource),
      ...(command.policies === undefined ? {} : { policies: command.policies }),
      ...(command.environment === undefined ? {} : { environment: command.environment }),
      ...(ownership === undefined ? {} : { ownership }),
      ...(command.observability === undefined ? {} : { observability: command.observability }),
      selection: { selectedNodeIds: [...selectedNodeIds] },
      requestedBy: context.principal.principalId,
      requestId: context.requestId,
      requestedAtIso: context.authorizedAt.toISOString(),
    }
  );
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

function toPlannerGraphSource(
  graphSource: NonNullable<StartRunCommand['graphSource']>
): NonNullable<PlannerInputEnvelopeV1['graphSource']> {
  const source = graphSource;
  return {
    kind: source.kind,
    sourceFamily: source.sourceFamily,
    sourceVersion: source.sourceVersion,
    nodes: source.nodes.map((node) => ({
      nodeId: node.nodeId,
      stepKind: node.stepKind,
      dependsOn: [...node.dependsOn],
      ...(node.stepTypeConfig === undefined ? {} : { stepTypeConfig: node.stepTypeConfig }),
      ...(node.metadata === undefined
        ? {}
        : {
            metadata: {
              ...(node.metadata.displayName === undefined
                ? {}
                : { displayName: node.metadata.displayName }),
              ...(node.metadata.sourceRef === undefined
                ? {}
                : { sourceRef: node.metadata.sourceRef }),
              ...(node.metadata.tags === undefined ? {} : { tags: node.metadata.tags }),
            },
          }),
    })),
  };
}

function isValidationError(
  validation: PlanValidationResult
): validation is Extract<PlanValidationResult, { readonly status: 'ERROR' }> {
  return validation.status === 'ERROR';
}
