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
import { ProposeWorksheetCanvasModel } from '../../application/services/proposeWorksheetCanvasModel.js';
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

function buildRunControlDependencies(protectedModule: ProtectedRuntimeModule) {
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
  return {
    executionContextRequirementResolver,
    idempotency,
    startDispatchResolver,
    cancellationReceipts,
  };
}

type RunControlDependencies = ReturnType<typeof buildRunControlDependencies>;

function buildRunQueries(
  options: BuildProtectedRuntimeRouteDependenciesOptions,
  shared: RunControlDependencies
) {
  const { observability, protectedModule } = options;
  const { executionContextRequirementResolver, startDispatchResolver, cancellationReceipts } =
    shared;
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
  return {
    getRunStatusUseCase,
    getRunEventsUseCase: new GetRunEventsUseCase(protectedModule.stateStore.read),
    listRunsUseCase: new ListRunsUseCase(protectedModule.stateStore.read, protectedModule.engine),
  };
}

function buildRunCommands(protectedModule: ProtectedRuntimeModule, shared: RunControlDependencies) {
  const {
    executionContextRequirementResolver,
    idempotency,
    startDispatchResolver,
    cancellationReceipts,
  } = shared;
  return {
    cancelRunUseCase: new CancelRunUseCase(
      protectedModule.engine,
      protectedModule.stateStore.read,
      cancellationReceipts,
      startDispatchResolver
    ),
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
    signalRunUseCase: new SignalRunUseCase(protectedModule.engine, protectedModule.stateStore.read),
  };
}

function buildWarehouseQueries(protectedModule: ProtectedRuntimeModule) {
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
  return {
    warehouseConnectionProbe,
    previewWarehouseSourceObjectRowsUseCase,
    validatePostgresTransformSqlUseCase,
  };
}

type WarehouseQueries = ReturnType<typeof buildWarehouseQueries>;

function buildCanvasModelQueries(
  protectedModule: ProtectedRuntimeModule,
  warehouse: WarehouseQueries,
  canvasTransformProjection: ResolveCanvasTransformProjection
) {
  const { warehouseConnectionProbe } = warehouse;
  const modelSqlCatalog = new ListWarehouseConnectionSourceObjectsUseCase(
    new WarehouseConnectionSourceObjectReader(
      protectedModule.warehouseConnectionCatalog,
      warehouseConnectionProbe
    )
  );
  const modelSqlInputs = new ResolveCanvasModelSqlInputs({
    projection: canvasTransformProjection,
    modelProducers: protectedModule.dbtProjectImport.modelProducerResolver,
    physical: new ResolveCanvasModelSqlPhysicalInput({
      authorizer: protectedModule.authorizer,
      catalog: modelSqlCatalog,
    }),
  });
  const modelSqlContext = new ProjectCanvasModelSqlContextQuery({
    authorizer: protectedModule.authorizer,
    connectionCatalog: protectedModule.warehouseConnectionCatalog,
    store: protectedModule.workspaceGraphDraftStore,
    authorityPolicy: protectedModule.canvasAuthoringAuthorityPolicy,
    inputs: modelSqlInputs,
  });
  const worksheetCanvasModelQuery = new ProposeWorksheetCanvasModel({
    store: protectedModule.workspaceGraphDraftStore,
    authorizer: protectedModule.authorizer,
    authorityPolicy: protectedModule.canvasAuthoringAuthorityPolicy,
    connectionCatalog: protectedModule.warehouseConnectionCatalog,
    catalog: modelSqlCatalog,
    projection: canvasTransformProjection,
    modelProducers: protectedModule.dbtProjectImport.modelProducerResolver,
    inputs: modelSqlInputs,
  });
  const modelSqlCompilation = new CompileCanvasModelSqlQuery(modelSqlContext);
  return { modelSqlContext, modelSqlCompilation, worksheetCanvasModelQuery };
}

function buildCanvasQueries(protectedModule: ProtectedRuntimeModule, warehouse: WarehouseQueries) {
  const { validatePostgresTransformSqlUseCase } = warehouse;
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
  const model = buildCanvasModelQueries(protectedModule, warehouse, canvasTransformProjection);
  const { modelSqlCompilation } = model;
  const previewCanvasTransformRowsUseCase = new PreviewCanvasTransformRowsUseCase({
    projection: canvasTransformProjection,
    sqlDraftProjection: new PrepareCanvasSqlDraftProjection(modelSqlCompilation),
    connectionCatalog: protectedModule.warehouseConnectionCatalog,
    probe: new PostgresCanvasTransformDataSampleProbe({
      credentialResolver: protectedModule.postgresCredentialResolver,
      now: () => new Date(),
    }),
  });
  return {
    previewGraphDraftResolver,
    queries: { ...model, previewCanvasTransformRowsUseCase, projectCanvasTransformSqlQuery },
  };
}

function buildPreviewQuery(
  protectedModule: ProtectedRuntimeModule,
  previewGraphDraftResolver: ResolveAuthorizedExecutableSubgraphService
) {
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
  return previewPlanUseCase;
}

export function buildProtectedRuntimeRouteDependencies(
  options: BuildProtectedRuntimeRouteDependenciesOptions
) {
  const { observability, protectedModule } = options;
  const sharedRun = buildRunControlDependencies(protectedModule);
  const warehouse = buildWarehouseQueries(protectedModule);
  const canvas = buildCanvasQueries(protectedModule, warehouse);
  return {
    ...buildRunQueries(options, sharedRun),
    ...buildRunCommands(protectedModule, sharedRun),
    ...warehouse,
    ...canvas.queries,
    compilePlanUseCase: new CompilePlanUseCase({ planner: protectedModule.planCompilePlanner }),
    getCostAttributionSummaryUseCase: new GetCostAttributionSummaryUseCase(
      protectedModule.stateStore.read
    ),
    importPlanUseCase: new ImportPlanUseCase({
      planResolver: protectedModule.executablePlanResolver,
    }),
    previewPlanUseCase: buildPreviewQuery(protectedModule, canvas.previewGraphDraftResolver),
    observability,
    runtimeAuth: {
      authenticator: protectedModule.authenticator,
      authorizer: protectedModule.authorizer,
    },
    workspaceGraphDraftTelemetry: new ObservabilityWorkspaceGraphDraftTelemetry({ observability }),
  };
}
