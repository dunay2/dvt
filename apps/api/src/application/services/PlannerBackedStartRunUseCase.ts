/**
 * Owned concern: compile planner-backed selected-closure start-run inputs into
 * stored plans and hand validated plan refs to the execution delegate.
 */
import type { IStoredPlanArtifactWriter } from '@dvt/artifacts';
import {
  START_RUN_RESULT_KIND,
  type IPlanner,
  type PlannerInputEnvelopeV1,
  type PlannerBuildResultV1,
  type PlanRef,
  type ScopedPlanRef,
  type StartRunCommand,
  type StartRunPlanRef,
} from '@dvt/contracts';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type {
  IPlanCompileLatencyTelemetry,
  PlanCompileLatencyOutcome,
} from '../ports/StartRunSlaTelemetry.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';

import { ResolveAuthorizedExecutableSubgraphService } from './resolveAuthorizedExecutableSubgraph.js';
import type { ExecutableSubgraphSelectionRejection } from './resolveAuthorizedExecutableSubgraph.js';
import { resolveCanonicalPlannerInputEnvelope } from './resolveCanonicalPlannerInputEnvelope.js';

type PlanValidationResult = Awaited<ReturnType<IPlanExecutabilityValidator['validatePlan']>>;

interface StoredPlannerArtifact {
  readonly planRef: PlanRef;
  readonly scopedPlanRef: ScopedPlanRef;
}

type PlanCompileResult =
  | {
      readonly kind: 'built';
      readonly buildResult: PlannerBuildResultV1;
    }
  | {
      readonly kind: 'rejected';
      readonly result: StartRunUseCaseResult;
    };

type StoredPlannerArtifactResult =
  | {
      readonly kind: 'stored';
      readonly storedPlan: StoredPlannerArtifact;
    }
  | {
      readonly kind: 'rejected';
      readonly result: StartRunUseCaseResult;
    };

export class PlannerBackedStartRunUseCase implements IStartRunUseCase {
  private static readonly NOOP_TELEMETRY: IPlanCompileLatencyTelemetry = {
    recordPlanCompileLatency() {},
  };

  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly planStore: IStoredPlanArtifactWriter;
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

    const compileResult = await this.compileAndStorePlan(command, context);
    if (compileResult.kind === 'rejected') {
      return compileResult.result;
    }

    const { storedPlan } = compileResult;
    const validation = await this.deps.validator.validatePlan({
      ...storedPlan.scopedPlanRef,
      adapterId: command.targetAdapter,
    });

    if (isValidationError(validation)) {
      return this.rejectStoredPlan(storedPlan.scopedPlanRef, validation);
    }

    await this.deps.planStore.markStoredPlanArtifactValid(storedPlan.scopedPlanRef);
    return this.deps.delegate.execute(toDelegateCommand(command, storedPlan.planRef), context);
  }

  private async compileAndStorePlan(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StoredPlannerArtifactResult> {
    const planCompile = await this.buildPlan(command, context);
    if (planCompile.kind === 'rejected') {
      return planCompile;
    }

    const { buildResult } = planCompile;
    const planRef = await this.deps.planStore.storePlanArtifact({ buildResult });
    return {
      kind: 'stored',
      storedPlan: {
        planRef,
        scopedPlanRef: toScopedPlanRef(buildResult, planRef),
      },
    };
  }

  private async buildPlan(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<PlanCompileResult> {
    const compileStartMs = Date.now();
    let compileOutcome: PlanCompileLatencyOutcome = 'error';
    try {
      const executableSubgraph = await this.deps.executableSubgraphResolver.execute(
        toExecutableSubgraphRequest(command),
        context
      );
      if (!executableSubgraph.ok) {
        return toPlanRejectedResult(executableSubgraph.rejection);
      }

      const plannerInput = toPlannerInput(command, context, executableSubgraph.value.nodeIds);
      const buildResult = await this.deps.planner.buildPlan(plannerInput);
      compileOutcome = 'built';
      return {
        kind: 'built',
        buildResult,
      };
    } finally {
      (
        this.deps.compileTelemetry ?? PlannerBackedStartRunUseCase.NOOP_TELEMETRY
      ).recordPlanCompileLatency(Date.now() - compileStartMs, compileOutcome);
    }
  }

  private async rejectStoredPlan(
    scopedPlanRef: ScopedPlanRef,
    validation: Extract<PlanValidationResult, { readonly status: 'ERROR' }>
  ): Promise<StartRunUseCaseResult> {
    await this.deps.planStore.markStoredPlanArtifactInvalid({
      ...scopedPlanRef,
      report: validation,
    });
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
}

function toPlanRejectedResult(rejection: ExecutableSubgraphSelectionRejection): PlanCompileResult {
  return {
    kind: 'rejected',
    result: {
      ok: true,
      value: {
        kind: START_RUN_RESULT_KIND.planRejected,
        accepted: false,
        ...rejection,
      },
    },
  };
}

function toExecutableSubgraphRequest(
  command: StartRunCommand
): Parameters<ResolveAuthorizedExecutableSubgraphService['execute']>[0] {
  return command.graphSource === undefined
    ? {
        selection: command.selection,
      }
    : {
        selection: command.selection,
        graphSource: command.graphSource,
      };
}

function toDelegateCommand(command: StartRunCommand, planRef: PlanRef): StartRunCommand {
  return {
    runId: command.runId,
    targetAdapter: command.targetAdapter,
    selection: command.selection,
    planRef: toRoutePlanRef(planRef),
    ...(command.runExecutionContextRef === undefined
      ? {}
      : { runExecutionContextRef: command.runExecutionContextRef }),
  };
}

function toScopedPlanRef(buildResult: PlannerBuildResultV1, planRef: PlanRef): ScopedPlanRef {
  const ownership = buildResult.plan.metadata.ownership;
  if (ownership === undefined) {
    throw new Error('PLAN_STORE_SCOPE_MISSING');
  }
  return {
    tenantId: ownership.tenantId,
    projectId: ownership.projectId,
    environmentId: ownership.environmentId,
    planRef,
  };
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
  return resolveCanonicalPlannerInputEnvelope({
    graphSource: toPlannerGraphSource(command.graphSource),
    ...(command.policies === undefined ? {} : { policies: command.policies }),
    ...(command.environment === undefined ? {} : { environment: command.environment }),
    ...(ownership === undefined ? {} : { ownership }),
    ...(command.observability === undefined ? {} : { observability: command.observability }),
    selection: { selectedNodeIds: [...selectedNodeIds] },
    requestedBy: context.principal.principalId,
    requestId: context.requestId,
    requestedAtIso: context.authorizedAt.toISOString(),
  });
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
