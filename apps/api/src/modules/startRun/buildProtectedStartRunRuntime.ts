/**
 * Owned concern: assemble the protected start-run runtime subcomponent for
 * `apps/api` from already-bound abstract dependencies.
 */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import type {
  DbtProjectBundleArtifactStore,
  IPlanStoreReader,
  IRunExecutionContextReferenceStore,
  IStoredPlanArtifactStore,
} from '@dvt/artifacts';
import type { IPlanner, IStepTypeRegistry } from '@dvt/contracts';
import type { EngineRunRef, IProviderAdapter, IWorkflowEngine } from '@dvt/engine';
import type { IObservability } from '@dvt/observability';
import { PlannerFacade } from '@dvt/planner';

import type {
  IDbtExecutionConnectionBindingVerifier,
  IDbtExecutionTargetResolver,
} from '../../application/ports/dbtExecutionTarget.js';
import type { DuplicateRunProbe } from '../../application/ports/DuplicateRunProbe.js';
import type { IAdmissionGuard } from '../../application/ports/IAdmissionGuard.js';
import type { AdmissionMode } from '../../application/ports/IAdmissionMode.js';
import type { IStartRunExecutionCapacityPort } from '../../application/ports/IStartRunExecutionCapacityPort.js';
import type { IStartRunLatencyTelemetry } from '../../application/ports/StartRunSlaTelemetry.js';
import type { IStartRunUseCase } from '../../application/ports/startRunUseCasePort.js';
import type { IWarehouseConnectionCatalog } from '../../application/ports/warehouseSourceImport.js';
import type { IWorkspaceGraphDraftStore } from '../../application/ports/workspaceGraphDraft.js';
import { BackpressureAwareStartRunUseCase } from '../../application/services/BackpressureAwareStartRunUseCase.js';
import { DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT } from '../../application/services/defaultStartRunExecutionCapacityPort.js';
import { EngineStartRunUseCase } from '../../application/services/engineStartRunUseCase.js';
import { PlannerBackedStartRunUseCase } from '../../application/services/PlannerBackedStartRunUseCase.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../application/services/resolveAuthorizedExecutableSubgraph.js';
import { RunExecutionContextBindingUseCase } from '../../application/services/RunExecutionContextBindingUseCase.js';
import type { StoredExecutablePlanResolver } from '../../application/services/StoredExecutablePlanResolver.js';
import { StoredPlanExecutabilityValidator } from '../../application/services/StoredPlanExecutabilityValidator.js';
import { ObservabilityAdmissionTelemetry } from '../../infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.js';
import { ArtifactBackedRunExecutionContextWriter } from '../../infrastructure/dbt/ArtifactBackedRunExecutionContextWriter.js';
import { DbtProjectBundleBuilder } from '../../infrastructure/dbt/DbtProjectBundleBuilder.js';
import { DEFAULT_DBT_PROJECT_SOURCE_LIMITS } from '../../infrastructure/dbt/dbtProjectSourceSnapshot.js';
import { ObservabilityStartRunSlaTelemetry } from '../../infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.js';
import { buildPlanCompilePlanner } from '../planCompileBoundary.js';

export type BuildProtectedStartRunRuntimeDeps = {
  readonly duplicateProbe: DuplicateRunProbe;
  readonly admissionGuard: IAdmissionGuard;
  readonly executionCapacity?: IStartRunExecutionCapacityPort;
  readonly observability: IObservability;
  readonly backpressureMode: AdmissionMode;
  readonly retryAfterSeconds: number;
  readonly engine: IWorkflowEngine;
  readonly adapters: ReadonlyMap<EngineRunRef['provider'], IProviderAdapter>;
  readonly planStore: IStoredPlanArtifactStore & Pick<IPlanStoreReader, 'getPlanRecordByRef'>;
  readonly planMaterializer: StoredExecutablePlanResolver;
  readonly stepTypeRegistry: IStepTypeRegistry;
  readonly workspaceGraphDraftStore: IWorkspaceGraphDraftStore;
  readonly workspaceRoot: string;
  readonly dbtBundleStore: DbtProjectBundleArtifactStore | undefined;
  readonly runExecutionContextStore: DbtProjectBundleArtifactStore;
  readonly runExecutionContextReferenceStore?: IRunExecutionContextReferenceStore;
  readonly dbtExecutionTargetResolver: IDbtExecutionTargetResolver;
  readonly dbtExecutionConnectionBindingVerifier: IDbtExecutionConnectionBindingVerifier;
  readonly warehouseConnectionCatalog: IWarehouseConnectionCatalog;
  readonly postgresCredentialResolver: IPostgresCredentialBindingResolver;
};

export type ProtectedStartRunRuntime = {
  readonly startRunUseCase: IStartRunUseCase;
  readonly startRunTelemetry: IStartRunLatencyTelemetry;
  readonly planner: IPlanner;
  readonly planCompilePlanner: IPlanner;
  readonly planValidator: StoredPlanExecutabilityValidator;
};

export function buildProtectedStartRunRuntime(
  deps: BuildProtectedStartRunRuntimeDeps
): ProtectedStartRunRuntime {
  const executionCapacity = deps.executionCapacity ?? DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT;
  const startRunSlaTelemetry = new ObservabilityStartRunSlaTelemetry({
    observability: deps.observability,
  });
  const planner = new PlannerFacade();
  const planCompilePlanner = buildPlanCompilePlanner();
  const planValidator = new StoredPlanExecutabilityValidator({
    materializer: deps.planMaterializer,
    adapters: deps.adapters,
    stepTypeRegistry: deps.stepTypeRegistry,
  });
  const executableSubgraphResolver = new ResolveAuthorizedExecutableSubgraphService({
    planner,
    workspaceGraphDraftStore: deps.workspaceGraphDraftStore,
  });
  const engineStartRunUseCase = new EngineStartRunUseCase(deps.engine);
  const runExecutionContextBindingUseCase = new RunExecutionContextBindingUseCase({
    delegate: engineStartRunUseCase,
    bundleBuilder: new DbtProjectBundleBuilder({
      workspaceFilesRoot: deps.workspaceRoot,
      bundleStore: deps.dbtBundleStore,
      limits: DEFAULT_DBT_PROJECT_SOURCE_LIMITS,
    }),
    contextWriter: new ArtifactBackedRunExecutionContextWriter(
      deps.runExecutionContextStore,
      undefined,
      deps.runExecutionContextReferenceStore
    ),
    executionTargetResolver: deps.dbtExecutionTargetResolver,
    executionConnectionBindingVerifier: deps.dbtExecutionConnectionBindingVerifier,
    stepTypeRegistry: deps.stepTypeRegistry,
    warehouseConnectionCatalog: deps.warehouseConnectionCatalog,
  });
  const plannerBackedUseCase = new PlannerBackedStartRunUseCase({
    planner: planCompilePlanner,
    planStore: deps.planStore,
    validator: planValidator,
    compileTelemetry: startRunSlaTelemetry,
    executableSubgraphResolver,
    delegate: runExecutionContextBindingUseCase,
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
  return {
    startRunUseCase: admissionUseCase,
    startRunTelemetry: startRunSlaTelemetry,
    planner,
    planCompilePlanner,
    planValidator,
  };
}
