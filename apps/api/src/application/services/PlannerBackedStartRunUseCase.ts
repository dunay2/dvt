/**
 * Owned concern: compile planner-backed selected-closure start-run inputs into
 * stored plans and hand validated plan refs to the execution delegate.
 */
import type {
  IPlanStoreReader,
  IStoredPlanArtifactReader,
  IStoredPlanArtifactWriter,
} from '@dvt/artifacts';
import {
  START_RUN_RESULT_KIND,
  type IPlanner,
  type PlannerInputEnvelopeV1,
  type PlannerBuildResultV1,
  type PlanRef,
  type StartRunCommand,
  type StartRunResult,
  type StartRunPlanRef,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type {
  IPlanCompileLatencyTelemetry,
  PlanCompileLatencyOutcome,
} from '../ports/StartRunSlaTelemetry.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';

import { ResolveAuthorizedExecutableSubgraphService } from './resolveAuthorizedExecutableSubgraph.js';
import type { ExecutableSubgraphSelectionRejection } from './resolveAuthorizedExecutableSubgraph.js';
import { resolveCanonicalPlannerInputEnvelope } from './resolveCanonicalPlannerInputEnvelope.js';
import type { RunExecutionContextBindingUseCase } from './RunExecutionContextBindingUseCase.js';
import { elapsedSlaSecondsSince } from './slaTiming.js';
import {
  StoredPlanAdmissionCoordinator,
  type StoredPlanAdmissionResult,
} from './StoredPlanAdmissionCoordinator.js';
import type { StoredPlanExecutabilityValidator } from './StoredPlanExecutabilityValidator.js';
import { createScopedPlanRef } from './storedPlanScope.js';

type PlanCompileResult =
  | {
      readonly kind: 'built';
      readonly buildResult: PlannerBuildResultV1;
    }
  | {
      readonly kind: 'rejected';
      readonly result: StartRunUseCaseResult;
    };

export class PlannerBackedStartRunUseCase implements IStartRunUseCase {
  private readonly planAdmission: StoredPlanAdmissionCoordinator;

  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly planStore: IStoredPlanArtifactWriter &
        Pick<IStoredPlanArtifactReader, 'getStoredPlanValidationRecord'> &
        Pick<IPlanStoreReader, 'getPlanRecordByRef'>;
      readonly validator: Pick<StoredPlanExecutabilityValidator, 'materializeAndValidatePlan'>;
      readonly delegate: IStartRunUseCase &
        Pick<RunExecutionContextBindingUseCase, 'executeAdmitted'>;
      readonly compileTelemetry: IPlanCompileLatencyTelemetry;
      readonly executableSubgraphResolver: ResolveAuthorizedExecutableSubgraphService;
    }
  ) {
    this.planAdmission = new StoredPlanAdmissionCoordinator({
      planStore: deps.planStore,
      validator: deps.validator,
    });
  }

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    if (command.planRef != null) {
      const scopedPlanRef = createScopedPlanRef({
        scope: {
          tenantId: context.scope.tenantId.value,
          projectId: context.scope.projectId?.value,
          environmentId: context.scope.environmentId?.value,
        },
        planRef: command.planRef,
      });
      const admission = await this.planAdmission.admitStored(scopedPlanRef, command.targetAdapter);
      if (!admission.accepted) {
        return this.toPlanValidationRejectedResult(admission.validation);
      }

      return this.deps.delegate.executeAdmitted(command, context, admission);
    }

    const compileResult = await this.buildPlan(command, context);
    if (compileResult.kind === 'rejected') {
      return compileResult.result;
    }

    const admission = await this.planAdmission.admit(
      compileResult.buildResult,
      command.targetAdapter
    );

    if (!admission.accepted) {
      return this.toPlanValidationRejectedResult(admission.validation);
    }

    return this.deps.delegate.executeAdmitted(
      toDelegateCommand(command, admission.planRef),
      context,
      admission
    );
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
      this.deps.compileTelemetry.recordPlanCompileLatency(
        elapsedSlaSecondsSince(compileStartMs),
        compileOutcome
      );
    }
  }

  private toPlanValidationRejectedResult(
    validation: Extract<StoredPlanAdmissionResult['validation'], { readonly status: 'ERROR' }>
  ): StartRunUseCaseResult {
    return {
      ok: true,
      value: this.toPlanRejectedValue(validation),
    };
  }

  private toPlanRejectedValue(
    validation: Extract<StoredPlanAdmissionResult['validation'], { readonly status: 'ERROR' }>
  ): StartRunResult {
    return {
      kind: START_RUN_RESULT_KIND.planRejected,
      accepted: false,
      code: validation.code,
      reason: validation.reason,
      ...(validation.cause === undefined ? {} : { cause: validation.cause }),
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
