/**
 * Owned concern: build protected runtime route dependencies from the runtime
 * module without registering HTTP routes.
 */
import { IdempotencyKeyBuilder } from '@dvt/engine/runtime';
import type { IObservability } from '@dvt/observability';

import { CancelRunUseCase } from '../../application/services/cancelRunUseCase.js';
import { CompilePlanUseCase } from '../../application/services/CompilePlanUseCase.js';
import { GetCostAttributionSummaryUseCase } from '../../application/services/getCostAttributionSummaryUseCase.js';
import { GetRunEventsUseCase } from '../../application/services/getRunEventsUseCase.js';
import { GetRunStatusUseCase } from '../../application/services/getRunStatusUseCase.js';
import { ImportPlanUseCase } from '../../application/services/ImportPlanUseCase.js';
import { ListRunsUseCase } from '../../application/services/listRunsUseCase.js';
import { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';
import { PreviewRunMaterializationRowsUseCase } from '../../application/services/previewRunMaterializationRowsUseCase.js';
import { PreviewWarehouseSourceObjectRowsUseCase } from '../../application/services/previewWarehouseSourceObjectRowsUseCase.js';
import { RecoverRunUseCase } from '../../application/services/recoverRunUseCase.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../application/services/resolveAuthorizedExecutableSubgraph.js';
import { ResolveAuthorizedPreviewSelectionService } from '../../application/services/resolveAuthorizedPreviewSelection.js';
import { RunStartDispatchResolver } from '../../application/services/runStartDispatchResolver.js';
import { SignalRunUseCase } from '../../application/services/signalRunUseCase.js';
import { StoredPlanRunExecutionContextRequirementResolver } from '../../application/services/StoredPlanRunExecutionContextRequirementResolver.js';
import { ValidatePostgresTransformSqlUseCase } from '../../application/services/validatePostgresTransformSqlUseCase.js';
import { RunEventCancellationReceiptStore } from '../../infrastructure/runControl/RunEventCancellationReceiptStore.js';
import { ObservabilityRunStatusStalenessTelemetry } from '../../infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.js';
import { ObservabilityWorkspaceGraphDraftTelemetry } from '../../infrastructure/telemetry/ObservabilityWorkspaceGraphDraftTelemetry.js';
import { SafeRunSnapshotStalenessReader } from '../../infrastructure/telemetry/SafeRunSnapshotStalenessReader.js';
import { WorkspacePostgresTransformSqlValidator } from '../../infrastructure/warehouseSourceImport/WorkspacePostgresTransformSqlValidator.js';
import { WorkspaceWarehouseConnectionProbe } from '../../infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';

export type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

export type BuildProtectedRuntimeRouteDependenciesOptions = {
  readonly observability: IObservability;
  readonly protectedModule: ProtectedRuntimeModule;
};

export type ProtectedRuntimeRouteDependencies = ReturnType<
  typeof buildProtectedRuntimeRouteDependencies
>;

export function buildProtectedRuntimeRouteDependencies(
  options: BuildProtectedRuntimeRouteDependenciesOptions
) {
  const { observability, protectedModule } = options;
  const runtimeAuth = {
    authenticator: protectedModule.authenticator,
    authorizer: protectedModule.authorizer,
  };
  const executionContextRequirementResolver = new StoredPlanRunExecutionContextRequirementResolver(
    protectedModule.planStore,
    protectedModule.runExecutionContextBindingPolicy
  );
  const idempotency = new IdempotencyKeyBuilder();
  const startDispatchResolver = new RunStartDispatchResolver(
    protectedModule.startRunIntentStore,
    idempotency
  );
  const cancellationReceipts = new RunEventCancellationReceiptStore({
    stateStoreRead: protectedModule.stateStore.read,
    stateStoreWrite: protectedModule.stateStore.write,
    clock: protectedModule.systemClock,
    idempotency,
  });
  const getRunStatusUseCase = new GetRunStatusUseCase(
    protectedModule.engine,
    protectedModule.runEnrichmentService,
    protectedModule.stateStore.read,
    new SafeRunSnapshotStalenessReader(protectedModule.stateStore.snapshotStaleness, observability),
    new ObservabilityRunStatusStalenessTelemetry({ observability }),
    protectedModule.planStore,
    protectedModule.runExecutionContextReferenceReader,
    executionContextRequirementResolver,
    protectedModule.planIntegrityValidator,
    protectedModule.startRunTargetAdapterRegistry,
    startDispatchResolver,
    cancellationReceipts,
    protectedModule.planValidator
  );
  const warehouseConnectionProbe = new WorkspaceWarehouseConnectionProbe({
    credentialResolver: protectedModule.postgresCredentialResolver,
    now: () => new Date(),
  });
  const previewWarehouseSourceObjectRowsUseCase = new PreviewWarehouseSourceObjectRowsUseCase(
    protectedModule.warehouseConnectionCatalog,
    warehouseConnectionProbe
  );
  const validatePostgresTransformSqlUseCase = new ValidatePostgresTransformSqlUseCase({
    catalog: protectedModule.warehouseConnectionCatalog,
    semanticValidator: new WorkspacePostgresTransformSqlValidator({
      credentialResolver: protectedModule.postgresCredentialResolver,
    }),
  });
  const previewPlanUseCase = new PreviewPlanUseCase({
    planner: protectedModule.planner,
    planStore: protectedModule.planStore,
    planValidator: protectedModule.planValidator,
    previewSelectionResolver: new ResolveAuthorizedPreviewSelectionService({
      graphDraftResolver: new ResolveAuthorizedExecutableSubgraphService({
        planner: protectedModule.planner,
        workspaceGraphDraftStore: protectedModule.workspaceGraphDraftStore,
      }),
      projectGraph: protectedModule.dbtProjectImport.projectGraphUseCase,
    }),
  });

  return {
    cancelRunUseCase: new CancelRunUseCase(
      protectedModule.engine,
      protectedModule.stateStore.read,
      cancellationReceipts,
      startDispatchResolver
    ),
    compilePlanUseCase: new CompilePlanUseCase({ planner: protectedModule.planCompilePlanner }),
    getCostAttributionSummaryUseCase: new GetCostAttributionSummaryUseCase(
      protectedModule.stateStore.read
    ),
    getRunEventsUseCase: new GetRunEventsUseCase(protectedModule.stateStore.read),
    getRunStatusUseCase,
    importPlanUseCase: new ImportPlanUseCase({
      planResolver: protectedModule.executablePlanResolver,
    }),
    listRunsUseCase: new ListRunsUseCase(protectedModule.stateStore.read, protectedModule.engine),
    previewRunMaterializationRowsUseCase: new PreviewRunMaterializationRowsUseCase({
      getRunStatus: getRunStatusUseCase,
      planStore: protectedModule.planStore,
      catalog: protectedModule.warehouseConnectionCatalog,
      previewRows: previewWarehouseSourceObjectRowsUseCase,
    }),
    previewWarehouseSourceObjectRowsUseCase,
    previewPlanUseCase,
    validatePostgresTransformSqlUseCase,
    observability,
    recoverRunUseCase: new RecoverRunUseCase({
      engine: protectedModule.engine,
      stateStore: protectedModule.stateStore.read,
      planStore: protectedModule.planStore,
      executionContextReader: protectedModule.runExecutionContextReferenceReader,
      executionContextInheritanceWriter: protectedModule.runExecutionContextInheritanceWriter,
      executionContextRequirementResolver,
      startRunIntentStore: protectedModule.startRunIntentStore,
      runMaintenanceService: protectedModule.runMaintenanceService,
      idempotency,
    }),
    runtimeAuth,
    signalRunUseCase: new SignalRunUseCase(protectedModule.engine, protectedModule.stateStore.read),
    warehouseConnectionProbe,
    workspaceGraphDraftTelemetry: new ObservabilityWorkspaceGraphDraftTelemetry({ observability }),
  };
}
