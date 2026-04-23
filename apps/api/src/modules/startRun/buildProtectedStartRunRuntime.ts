/**
 * Owned concern: assemble the protected start-run runtime subcomponent for
 * `apps/api` from already-bound abstract dependencies.
 */
import type {
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  IStepTypeRegistry,
} from '@dvt/contracts';
import type { EngineRunRef, IProviderAdapter, IWorkflowEngine } from '@dvt/engine';
import type { IObservability } from '@dvt/observability';
import { PlannerFacade } from '@dvt/planner';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { DuplicateRunProbe } from '../../application/ports/DuplicateRunProbe.js';
import type { IAdmissionGuard } from '../../application/ports/IAdmissionGuard.js';
import type { AdmissionMode } from '../../application/ports/IAdmissionMode.js';
import type { IStartRunExecutionCapacityPort } from '../../application/ports/IStartRunExecutionCapacityPort.js';
import type { IStoredPlanValidationReader } from '../../application/ports/storedPlan.js';
import type { IWorkspaceGraphDraftStore } from '../../application/ports/workspaceGraphDraft.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { BackpressureAwareStartRunUseCase } from '../../application/services/BackpressureAwareStartRunUseCase.js';
import { DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT } from '../../application/services/defaultStartRunExecutionCapacityPort.js';
import { EngineStartRunUseCase } from '../../application/services/engineStartRunUseCase.js';
import { PlannerBackedStartRunUseCase } from '../../application/services/PlannerBackedStartRunUseCase.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../application/services/resolveAuthorizedExecutableSubgraph.js';
import { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';
import { StoredPlanExecutabilityValidator } from '../../application/services/StoredPlanExecutabilityValidator.js';
import { ObservabilityAdmissionTelemetry } from '../../infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.js';
import { ObservabilityStartRunSlaTelemetry } from '../../infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.js';
import { buildPlanCompilePlanner } from '../planCompileBoundary.js';

export type BuildProtectedStartRunRuntimeDeps = {
  readonly authenticator: IAuthenticator;
  readonly commandAuthorizer: AuthorizeCommandScopeService;
  readonly duplicateProbe: DuplicateRunProbe;
  readonly admissionGuard: IAdmissionGuard;
  readonly executionCapacity?: IStartRunExecutionCapacityPort;
  readonly observability: IObservability;
  readonly backpressureMode: AdmissionMode;
  readonly retryAfterSeconds: number;
  readonly engine: IWorkflowEngine;
  readonly adapters: ReadonlyMap<EngineRunRef['provider'], IProviderAdapter>;
  readonly planStore: IPlanValidationLifecycleStore & IStoredPlanValidationReader;
  readonly stepTypeRegistry: IStepTypeRegistry;
  readonly workspaceGraphDraftStore: IWorkspaceGraphDraftStore;
};

export type ProtectedStartRunRuntime = {
  readonly facade: StartRunAuthorizedFacade;
  readonly planner: IPlanner;
  readonly planCompilePlanner: IPlanner;
  readonly planValidator: IPlanExecutabilityValidator;
};

export function buildProtectedStartRunRuntime(
  deps: BuildProtectedStartRunRuntimeDeps
): ProtectedStartRunRuntime {
  const executionCapacity =
    deps.executionCapacity ?? DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT;
  const startRunSlaTelemetry = new ObservabilityStartRunSlaTelemetry({
    observability: deps.observability,
  });
  const planner = new PlannerFacade();
  const planCompilePlanner = buildPlanCompilePlanner();
  const planValidator = new StoredPlanExecutabilityValidator({
    fetcher: deps.planStore,
    adapters: deps.adapters,
    stepTypeRegistry: deps.stepTypeRegistry,
  });
  const executableSubgraphResolver = new ResolveAuthorizedExecutableSubgraphService({
    planner,
    workspaceGraphDraftStore: deps.workspaceGraphDraftStore,
  });
  const plannerBackedUseCase = new PlannerBackedStartRunUseCase({
    planner,
    planStore: deps.planStore,
    validator: planValidator,
    compileTelemetry: startRunSlaTelemetry,
    executableSubgraphResolver,
    delegate: new EngineStartRunUseCase(deps.engine),
  });
  const admissionUseCase = new BackpressureAwareStartRunUseCase({
    duplicateProbe: deps.duplicateProbe,
    admissionGuard: deps.admissionGuard,
    executionCapacity,
    telemetry: new ObservabilityAdmissionTelemetry({
      observability: deps.observability,
    }),
    mode: deps.backpressureMode,
    retryAfterSeconds: deps.retryAfterSeconds,
    delegate: plannerBackedUseCase,
  });
  const facade = new StartRunAuthorizedFacade(
    deps.authenticator,
    deps.commandAuthorizer,
    admissionUseCase,
    startRunSlaTelemetry
  );

  return {
    facade,
    planner,
    planCompilePlanner,
    planValidator,
  };
}
