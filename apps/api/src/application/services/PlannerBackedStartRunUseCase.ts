import type {
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  GenericGraphSourceV1,
  PlannerInputEnvelopeV1,
  PlanRef,
} from '@dvt/contracts';

import {
  formatManifestArtifactResolutionReason,
  isManifestArtifactResolutionError,
  mapManifestArtifactResolutionCause,
} from '../errors/ManifestArtifactResolutionError.js';
import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { StartRunCommand, StartRunPlanRef } from '../ports/startRunCommandContract.js';
import {
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RESULT_KIND,
} from '../ports/startRunResultContract.js';
import type {
  IPlanCompileLatencyTelemetry,
  PlanCompileLatencyOutcome,
} from '../ports/StartRunSlaTelemetry.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCaseContract.js';

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
      buildResult = await this.deps.planner.buildPlan(toPlannerInput(command, context));
      compileOutcome = 'built';
    } catch (error) {
      const rejection = mapManifestResolutionFailure(error);
      if (rejection !== null) {
        compileOutcome = 'manifest_resolution_error';
        return rejection;
      }
      throw error;
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
        ...(command.graphSource === undefined ? {} : { graphSource: command.graphSource }),
        ...(command.manifestRef === undefined ? {} : { manifestRef: command.manifestRef }),
        ...(command.policies === undefined ? {} : { policies: command.policies }),
        ...(command.environment === undefined ? {} : { environment: command.environment }),
        ...(command.observability === undefined ? {} : { observability: command.observability }),
      },
      context
    );
  }
}

function toRoutePlanRef(
  planRef: Pick<PlanRef, 'uri' | 'sha256' | 'schemaVersion' | 'planId' | 'planVersion'> & {
    sizeBytes?: number | undefined;
    expiresAt?: PlanRef['expiresAt'] | undefined;
  }
): StartRunPlanRef {
  return {
    uri: planRef.uri,
    sha256: planRef.sha256,
    schemaVersion: planRef.schemaVersion,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
  };
}

function toPlannerInput(
  command: StartRunCommand,
  context: AuthorizedCommandExecutionContext
): PlannerInputEnvelopeV1 {
  return {
    ...(command.graphSource === undefined
      ? {}
      : { graphSource: toPlannerGraphSource(command.graphSource) }),
    ...(command.manifestRef === undefined ? {} : { manifestRef: command.manifestRef }),
    ...(command.policies === undefined ? {} : { policies: command.policies }),
    ...(command.environment === undefined ? {} : { environment: command.environment }),
    ...(command.observability === undefined ? {} : { observability: command.observability }),
    selection: { selectedNodeIds: command.selection },
    requestedBy: context.principal.principalId,
    requestId: context.requestId,
    requestedAtIso: context.authorizedAt.toISOString(),
  };
}

function toPlannerGraphSource(graphSource: StartRunCommand['graphSource']): GenericGraphSourceV1 {
  const source = graphSource!;
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

function mapManifestResolutionFailure(error: unknown): StartRunUseCaseResult | null {
  if (!isManifestArtifactResolutionError(error)) {
    return null;
  }

  return {
    ok: true,
    value: {
      kind: START_RUN_RESULT_KIND.planRejected,
      accepted: false,
      code: START_RUN_PLAN_REJECTION_CODE.rejected,
      reason: formatManifestArtifactResolutionReason(error.kind, error.detail),
      cause: mapManifestArtifactResolutionCause(error.kind),
    },
  };
}
