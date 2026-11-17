/**
 * Owned concern: build protected runtime route dependencies from the runtime module without registering HTTP routes.
 * @decision Assemble existing module capabilities without HTTP registration or domain decisions.
 * @consequence Preview receives the same injected dbt compilation and authority collaborators.
 */
import { IdempotencyKeyBuilder } from '@dvt/engine/runtime';
import type { IObservability } from '@dvt/observability';

import { CancelRunUseCase } from '../../application/services/cancelRunUseCase.js';
import { CompileCanvasModelSqlQuery } from '../../application/services/compileCanvasModelSqlQuery.js';
import { CompilePlanUseCase } from '../../application/services/CompilePlanUseCase.js';
import { DvtOperationalWorkloadProjector } from '../../application/services/dvtOperationalWorkloadProjector.js';
import { DvtPostgresTargetProjectionPublisher } from '../../application/services/dvtPostgresTargetProjectionPublisher.js';
import { GetCostAttributionSummaryUseCase } from '../../application/services/getCostAttributionSummaryUseCase.js';
import { GetRunEventsUseCase } from '../../application/services/getRunEventsUseCase.js';
import { GetRunStatusUseCase } from '../../application/services/getRunStatusUseCase.js';
import { ImportPlanUseCase } from '../../application/services/ImportPlanUseCase.js';
import { ListRunsUseCase } from '../../application/services/listRunsUseCase.js';
import { ListWarehouseConnectionSourceObjectsUseCase } from '../../application/services/listWarehouseConnectionSourceObjectsUseCase.js';
import { PrepareCanvasSqlDraftProjection } from '../../application/services/prepareCanvasSqlDraftProjection.js';
import { PreviewCanvasTransformRowsUseCase } from '../../application/services/previewCanvasTransformRowsUseCase.js';
import { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';
import { PreviewWarehouseSourceObjectRowsUseCase } from '../../application/services/previewWarehouseSourceObjectRowsUseCase.js';
import { ProjectCanvasModelSqlContextQuery } from '../../application/services/projectCanvasModelSqlContextQuery.js';
import { ProjectCanvasSqlPresentation } from '../../application/services/projectCanvasSqlPresentation.js';
import { ProjectCanvasTransformSqlQuery } from '../../application/services/projectCanvasTransformSqlQuery.js';
import { RecoverRunUseCase } from '../../application/services/recoverRunUseCase.js';
import { ResolveAuthorizedDvtPreviewSelectionService } from '../../application/services/resolveAuthorizedDvtPreviewSelection.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../application/services/resolveAuthorizedExecutableSubgraph.js';
import { ResolveAuthorizedPreviewSelectionService } from '../../application/services/resolveAuthorizedPreviewSelection.js';
import { ResolveCanvasModelSqlInputs } from '../../application/services/resolveCanvasModelSqlInputs.js';
import { ResolveCanvasModelSqlPhysicalInput } from '../../application/services/resolveCanvasModelSqlPhysicalInput.js';
import { ResolveCanvasTransformProjection } from '../../application/services/resolveCanvasTransformProjection.js';
import { RunStartDispatchResolver } from '../../application/services/runStartDispatchResolver.js';
import { SignalRunUseCase } from '../../application/services/signalRunUseCase.js';
import { StoredPlanRunExecutionContextRequirementResolver } from '../../application/services/StoredPlanRunExecutionContextRequirementResolver.js';
import { ValidatePostgresTransformSqlUseCase } from '../../application/services/validatePostgresTransformSqlUseCase.js';
import { WarehouseConnectionSourceObjectReader } from '../../application/services/WarehouseConnectionSourceObjectReader.js';
import { PostgresCanvasTransformDataSampleProbe } from '../../infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.js';
import { RunEventCancellationReceiptStore } from '../../infrastructure/runControl/RunEventCancellationReceiptStore.js';
import { ObservabilityRunStatusStalenessTelemetry } from '../../infrastructure/telemetry/ObservabilityRunStatusStalenessTelemetry.js';
import { ObservabilityWorkspaceGraphDraftTelemetry } from '../../infrastructure/telemetry/ObservabilityWorkspaceGraphDraftTelemetry.js';
import { SafeRunSnapshotStalenessReader } from '../../infrastructure/telemetry/SafeRunSnapshotStalenessReader.js';
import { PostgresSqlPresentationEvidenceReader } from '../../infrastructure/warehouseSourceImport/PostgresSqlPresentationEvidenceReader.js';
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
  const previewGraphDraftResolver = new ResolveAuthorizedExecutableSubgraphService({
    planner: protectedModule.planner,
    workspaceGraphDraftStore: protectedModule.workspaceGraphDraftStore,
  });
  const canvasTransformProjection = new ResolveCanvasTransformProjection({
    graphDraftResolver: previewGraphDraftResolver,
    modelProducers: protectedModule.dbtProjectImport.modelProducerResolver,
  });
  const projectCanvasTransformSqlQuery = new ProjectCanvasTransformSqlQuery({
    projection: canvasTransformProjection,
    presentation: new ProjectCanvasSqlPresentation({
      authorizer: protectedModule.authorizer,
      catalog: protectedModule.warehouseConnectionCatalog,
      reader: new PostgresSqlPresentationEvidenceReader({
        credentialResolver: protectedModule.postgresCredentialResolver,
      }),
      validator: validatePostgresTransformSqlUseCase,
    }),
  });
  const modelSqlContext = new ProjectCanvasModelSqlContextQuery({
    store: protectedModule.workspaceGraphDraftStore,
    authorityPolicy: protectedModule.canvasAuthoringAuthorityPolicy,
    inputs: new ResolveCanvasModelSqlInputs({
      projection: canvasTransformProjection,
      modelProducers: protectedModule.dbtProjectImport.modelProducerResolver,
      physical: new ResolveCanvasModelSqlPhysicalInput({
        authorizer: protectedModule.authorizer,
        catalog: new ListWarehouseConnectionSourceObjectsUseCase(
          new WarehouseConnectionSourceObjectReader(
            protectedModule.warehouseConnectionCatalog,
            warehouseConnectionProbe
          )
        ),
      }),
    }),
  });
  const modelSqlCompilation = new CompileCanvasModelSqlQuery(modelSqlContext);
  const previewCanvasTransformRowsUseCase = new PreviewCanvasTransformRowsUseCase({
    projection: canvasTransformProjection,
    sqlDraftProjection: new PrepareCanvasSqlDraftProjection(modelSqlCompilation),
    connectionCatalog: protectedModule.warehouseConnectionCatalog,
    probe: new PostgresCanvasTransformDataSampleProbe({
      credentialResolver: protectedModule.postgresCredentialResolver,
      now: () => new Date(),
    }),
  });
  const cas = protectedModule.contentAddressedArtifactRuntime;
  const dvtPreviewSelectionResolver =
    cas === undefined
      ? undefined
      : new ResolveAuthorizedDvtPreviewSelectionService({
          modelProducers: protectedModule.dbtProjectImport.modelProducerResolver,
          graphDraftResolver: previewGraphDraftResolver,
          targetProjectionPublisher: new DvtPostgresTargetProjectionPublisher({
            artifactStore: cas.artifactStore,
            locateArtifact: cas.locateArtifact,
          }),
          workloadProjector: new DvtOperationalWorkloadProjector(),
        });
  const previewSelectionResolver = new ResolveAuthorizedPreviewSelectionService({
    graphDraftResolver: previewGraphDraftResolver,
    ...(dvtPreviewSelectionResolver === undefined ? {} : { dvtPreviewSelectionResolver }),
    projectGraph: protectedModule.dbtProjectImport.projectGraphUseCase,
    dbtCompilation: protectedModule.dbtProjectImport.previewCompilation,
  });
  const previewPlanUseCase = new PreviewPlanUseCase({
    planner: protectedModule.planner,
    planStore: protectedModule.planStore,
    planValidator: protectedModule.planValidator,
    previewSelectionResolver,
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
    previewCanvasTransformRowsUseCase,
    projectCanvasTransformSqlQuery,
    modelSqlContext,
    modelSqlCompilation,
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
