var e=e=>{switch(e){case`index`:return`direction: down

PostgresAdapterSource: {
  label: "Postgres Adapter source inventory — generated from Git"
}
TemporalAdapterSource: {
  label: "Temporal Adapter source inventory — generated from Git"
}
ApiModel: {
  label: "apps/api"
}
ApiSource: {
  label: "API source inventory — generated from Git"
}
ArtifactsSource: {
  label: "@dvt/artifacts source inventory — generated from Git"
}
CliSource: {
  label: "CLI source inventory — generated from Git"
}
ClassificationCoverage: {
  label: "Architecture source classification coverage"
}
ContractsSource: {
  label: "Contracts source inventory — generated from Git"
}
CryptoSource: {
  label: "Crypto source inventory — generated from Git"
}
DeliverySource: {
  label: "Delivery source inventory — generated from Git"
}
DslSource: {
  label: "DSL source inventory — generated from Git"
}
EngineSource: {
  label: "Engine source inventory — generated from Git"
}
LineageWorkerModel: {
  label: "apps/lineage-worker"
}
LineageWorkerSource: {
  label: "Lineage Worker source inventory — generated from Git"
}
ObservabilityOtelSource: {
  label: "Observability OTel source inventory — generated from Git"
}
ObservabilitySource: {
  label: "Observability source inventory — generated from Git"
}
OutboxWorkerModel: {
  label: "apps/outbox-worker"
}
OutboxWorkerSource: {
  label: "Outbox Worker source inventory — generated from Git"
}
PlanInterpreterSource: {
  label: "Plan Interpreter source inventory — generated from Git"
}
PlanVerifierSource: {
  label: "Plan Verifier source inventory — generated from Git"
}
PlannerSource: {
  label: "Planner source inventory — generated from Git"
}
ProjectorWorkerModel: {
  label: "apps/projector-worker"
}
ProjectorWorkerSource: {
  label: "Projector Worker source inventory — generated from Git"
}
RunDomainSource: {
  label: "Run Domain source inventory — generated from Git"
}
StateStoreSource: {
  label: "State Store source inventory — generated from Git"
}
TemporalDbtPluginSource: {
  label: "Temporal dbt Plugin source inventory — generated from Git"
}
TemporalHttpJsonPluginSource: {
  label: "Temporal HTTP JSON Plugin source inventory — generated from Git"
}
TemporalObjectFilePostgresPluginSource: {
  label: "Temporal Object File Postgres Plugin source inventory — generated from Git"
}
TemporalWorkerModel: {
  label: "apps/temporal-worker"
}
CliModel: {
  label: "@dvt/cli"
}
TemporalWorkerSource: {
  label: "Temporal Worker source inventory — generated from Git"
}
TraceabilitySource: {
  label: "Traceability Service source inventory — generated from Git"
}
WebModel: {
  label: "apps/web"
}
ObservabilityOtelModel: {
  label: "@dvt/observability-otel"
}
PlanVerifierModel: {
  label: "@dvt/plan-verifier"
}
PostgresAdapterModel: {
  label: "@dvt/adapter-postgres"
}
TemporalHttpJsonPluginModel: {
  label: "@dvt/temporal-http-json-plugin"
}
TemporalObjectFilePostgresPluginModel: {
  label: "@dvt/temporal-object-file-postgres-plugin"
}
PlannerModel: {
  label: "@dvt/planner"
}
StateStoreModel: {
  label: "@dvt/state-store"
}
TraceabilityModel: {
  label: "@dvt/traceability-service"
}
TemporalAdapterModel: {
  label: "@dvt/adapter-temporal"
}
DslModel: {
  label: "@dvt/dsl"
}
PlanInterpreterModel: {
  label: "@dvt/plan-interpreter"
}
TemporalDbtPluginModel: {
  label: "@dvt/temporal-dbt-plugin"
}
EngineModel: {
  label: "@dvt/engine"
}
ArtifactsModel: {
  label: "@dvt/artifacts"
}
DeliveryModel: {
  label: "@dvt/delivery"
}
ObservabilityModel: {
  label: "@dvt/observability"
}
RunDomainModel: {
  label: "@dvt/run-domain"
}
ContractsModel: {
  label: "@dvt/contracts"
}
CryptoModel: {
  label: "@dvt/crypto"
}
WebSource: {
  label: "Web source inventory — generated from Git"
}

PostgresAdapterModel -> ArtifactsModel: "[...]"
PostgresAdapterModel -> ContractsModel: "[...]"
PostgresAdapterModel -> CryptoModel: "[...]"
PostgresAdapterModel -> DeliveryModel: "[...]"
PostgresAdapterModel -> EngineModel: "[...]"
PostgresAdapterModel -> PlannerModel: "workspace dependency: @dvt/planner"
PostgresAdapterModel -> RunDomainModel: "[...]"
PostgresAdapterModel -> StateStoreModel: "[...]"
PostgresAdapterModel -> TraceabilityModel: "[...]"
ApiModel -> PostgresAdapterModel: "[...]"
LineageWorkerModel -> PostgresAdapterModel: "[...]"
OutboxWorkerModel -> PostgresAdapterModel: "[...]"
ProjectorWorkerModel -> PostgresAdapterModel: "[...]"
TemporalWorkerModel -> PostgresAdapterModel: "[...]"
TemporalAdapterModel -> ArtifactsModel: "[...]"
TemporalAdapterModel -> ContractsModel: "[...]"
TemporalAdapterModel -> CryptoModel: "[...]"
TemporalAdapterModel -> DeliveryModel: "[...]"
TemporalAdapterModel -> DslModel: "[...]"
TemporalAdapterModel -> EngineModel: "[...]"
TemporalAdapterModel -> ObservabilityModel: "[...]"
TemporalAdapterModel -> PlanInterpreterModel: "[...]"
TemporalAdapterModel -> TemporalDbtPluginModel: "observed imports: 4 test"
ApiModel -> TemporalAdapterModel: "[...]"
TemporalDbtPluginModel -> TemporalAdapterModel: "[...]"
TemporalHttpJsonPluginModel -> TemporalAdapterModel: "[...]"
TemporalObjectFilePostgresPluginModel -> TemporalAdapterModel: "[...]"
TemporalWorkerModel -> TemporalAdapterModel: "[...]"
ApiModel -> ArtifactsModel: "[...]"
ApiModel -> ContractsModel: "[...]"
ApiModel -> CryptoModel: "[...]"
ApiModel -> DeliveryModel: "[...]"
ApiModel -> EngineModel: "[...]"
ApiModel -> ObservabilityModel: "[...]"
ApiModel -> ObservabilityOtelModel: "[...]"
ApiModel -> PlanVerifierModel: "[...]"
ApiModel -> PlannerModel: "[...]"
ApiModel -> RunDomainModel: "[...]"
ApiModel -> TemporalDbtPluginModel: "[...]"
ArtifactsModel -> ContractsModel: "[...]"
EngineModel -> ArtifactsModel: "[...]"
PlannerModel -> ArtifactsModel: "[...]"
TemporalDbtPluginModel -> ArtifactsModel: "[...]"
TemporalHttpJsonPluginModel -> ArtifactsModel: "[...]"
TemporalWorkerModel -> ArtifactsModel: "[...]"
TraceabilityModel -> ArtifactsModel: "[...]"
CliModel -> ContractsModel: "workspace dependency: @dvt/contracts"
CliModel -> CryptoModel: "[...]"
CliModel -> EngineModel: "workspace dependency: @dvt/engine"
ContractsModel -> CryptoModel: "[...]"
DeliveryModel -> ContractsModel: "[...]"
DslModel -> ContractsModel: "workspace dependency: @dvt/contracts"
EngineModel -> ContractsModel: "[...]"
LineageWorkerModel -> ContractsModel: "observed imports: 2 type-only, 2 test, MANIFEST DRIFT: none"
OutboxWorkerModel -> ContractsModel: "[...]"
PlanVerifierModel -> ContractsModel: "[...]"
PlannerModel -> ContractsModel: "[...]"
RunDomainModel -> ContractsModel: "[...]"
StateStoreModel -> ContractsModel: "[...]"
TemporalDbtPluginModel -> ContractsModel: "[...]"
TemporalHttpJsonPluginModel -> ContractsModel: "[...]"
TemporalObjectFilePostgresPluginModel -> ContractsModel: "[...]"
TemporalWorkerModel -> ContractsModel: "[...]"
TraceabilityModel -> ContractsModel: "[...]"
WebModel -> ContractsModel: "[...]"
EngineModel -> CryptoModel: "[...]"
PlanVerifierModel -> CryptoModel: "[...]"
PlannerModel -> CryptoModel: "[...]"
StateStoreModel -> CryptoModel: "[...]"
TemporalWorkerModel -> CryptoModel: "observed imports: 3 test"
WebModel -> CryptoModel: "[...]"
EngineModel -> DeliveryModel: "[...]"
OutboxWorkerModel -> DeliveryModel: "[...]"
ProjectorWorkerModel -> DeliveryModel: "[...]"
TraceabilityModel -> DeliveryModel: "[...]"
EngineModel -> ObservabilityModel: "[...]"
EngineModel -> RunDomainModel: "[...]"
StateStoreModel -> EngineModel: "[...]"
TemporalDbtPluginModel -> EngineModel: "[...]"
TemporalWorkerModel -> EngineModel: "[...]"
LineageWorkerModel -> TraceabilityModel: "[...]"
ObservabilityOtelModel -> ObservabilityModel: "[...]"
OutboxWorkerModel -> StateStoreModel: "[...]"
TemporalWorkerModel -> TemporalDbtPluginModel: "[...]"
TemporalWorkerModel -> TemporalHttpJsonPluginModel: "[...]"
TemporalWorkerModel -> TemporalObjectFilePostgresPluginModel: "[...]"
`;case`postgresAdapterBoundary`:return`direction: right

PostgresAdapterModelSourceEvidence: {
  label: "Source evidence"
}
PostgresAdapterModelPublicBoundary: {
  label: "Postgres adapter public boundary"
}
PostgresAdapterModelBackpressure: {
  label: "Backpressure snapshot reader"
}
PostgresAdapterModelObjectFile: {
  label: "Object-file to Postgres capability"
}
PostgresAdapterModelRunStateCommandBridge: {
  label: "RunStateCommandPort bridge"
}
PostgresAdapterModelPlanStore: {
  label: "Postgres plan store"
  shape: cylinder
}
PostgresAdapterModelOutboxDelivery: {
  label: "Outbox + lineage persistence"
  shape: cylinder
}
PostgresAdapterModelArchiveLifecycle: {
  label: "Run archive persistence"
  shape: cylinder
}
PostgresAdapterModelStateStore: {
  label: "Run state persistence"
  shape: cylinder
}
PostgresAdapterModelSchemaAndRuntime: {
  label: "Schema + runtime composition"
}
PostgresAdapterModelCredentialsAndPool: {
  label: "Credentials + pool policy"
}

PostgresAdapterModelPublicBoundary -> PostgresAdapterModelStateStore: "exports state persistence"
PostgresAdapterModelPublicBoundary -> PostgresAdapterModelRunStateCommandBridge: "exports command bridge"
PostgresAdapterModelRunStateCommandBridge -> PostgresAdapterModelStateStore: "translates command writes"
PostgresAdapterModelPublicBoundary -> PostgresAdapterModelPlanStore: "exports plan storage"
PostgresAdapterModelPublicBoundary -> PostgresAdapterModelOutboxDelivery: "exports delivery stores"
PostgresAdapterModelPublicBoundary -> PostgresAdapterModelArchiveLifecycle: "exports archive stores"
PostgresAdapterModelStateStore -> PostgresAdapterModelSchemaAndRuntime: "schema + runtime config"
PostgresAdapterModelPlanStore -> PostgresAdapterModelSchemaAndRuntime: "schema + transactions"
PostgresAdapterModelOutboxDelivery -> PostgresAdapterModelSchemaAndRuntime: "Postgres persistence"
PostgresAdapterModelArchiveLifecycle -> PostgresAdapterModelSchemaAndRuntime: "Postgres persistence"
PostgresAdapterModelStateStore -> PostgresAdapterModelCredentialsAndPool: "observed pool boundary"
PostgresAdapterModelObjectFile -> PostgresAdapterModelCredentialsAndPool: "connection/credential boundary"
`;case`postgresAdapterSourceInventory`:return`direction: down

PostgresAdapterSource: {
  label: "Postgres Adapter source inventory — generated from Git"

  Dir_migrations_56a9264f: {
    label: "migrations/ — 11 files"
  }
  Dir_src_f27fede2: {
    label: "src/ — 60 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 49 files"
  }
  File_DESIGN_md_8db51892: {
    label: "DESIGN.md"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_eslint_json_df42856a: {
    label: "tsconfig.eslint.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`adapter-postgresFiles_publicBoundary`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_types_ts_cdcae080: {
  label: "types.ts"
}
`;case`adapter-postgresFiles_stateStore`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunEventStorage_ts_eb05c541: {
  label: "PostgresRunEventStorage.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunEventStore_ts_8d91cfe9: {
  label: "PostgresRunEventStore.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunMetadataRepository_ts_c676ce0c: {
  label: "PostgresRunMetadataRepository.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunSnapshotStore_ts_91e4a82a: {
  label: "PostgresRunSnapshotStore.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunStateCoordinator_ts_6ecc5937: {
  label: "PostgresRunStateCoordinator.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresStateStoreAdapter_ts_bd8d5cd9: {
  label: "PostgresStateStoreAdapter.ts"
}
`;case`adapter-postgresFiles_runStateCommandBridge`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_runStateCommandPortBridge_ts_57c52f86: {
  label: "runStateCommandPortBridge.ts"
}
`;case`adapter-postgresFiles_planStore`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPlanStore_admission-repository_ts_8b1af55c: {
  label: "PostgresPlanStore.admission-repository.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_rc_PostgresPlanStore_executability-repository_ts_4d2d641c: {
  label: "PostgresPlanStore.executability-repository.ts"
}
PostgresAdapterSourceDir_src_f27fede2File__PostgresPlanStore_executable-blob-repository_ts_4aed45e6: {
  label: "PostgresPlanStore.executable-blob-repository.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPlanStore_mappers_ts_94650230: {
  label: "PostgresPlanStore.mappers.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPlanStore_plan-record-repository_ts_d8f3b47e: {
  label: "PostgresPlanStore.plan-record-repository.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPlanStore_schema-manager_ts_f938ffe8: {
  label: "PostgresPlanStore.schema-manager.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPlanStore_sql_ts_bf4dc479: {
  label: "PostgresPlanStore.sql.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPlanStore_ts_a53147a9: {
  label: "PostgresPlanStore.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPlanStore_tx_ts_e4575f48: {
  label: "PostgresPlanStore.tx.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPlanStoreComposer_ts_b9a06b2e: {
  label: "PostgresPlanStoreComposer.ts"
}
`;case`adapter-postgresFiles_outboxDelivery`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_PostgresLineageOutboxStore_ts_26603fd9: {
  label: "PostgresLineageOutboxStore.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresOutboxStore_ts_586cff1c: {
  label: "PostgresOutboxStore.ts"
}
`;case`adapter-postgresFiles_archiveLifecycle`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_PostgresArchiveLeaseStore_ts_84942c21: {
  label: "PostgresArchiveLeaseStore.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresDeliveryBufferPurgeStore_ts_9d3d6ade: {
  label: "PostgresDeliveryBufferPurgeStore.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunArchiveStore_ts_8d527d34: {
  label: "PostgresRunArchiveStore.ts"
}
`;case`adapter-postgresFiles_backpressure`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_PostgresBackpressureSnapshotReader_ts_3ed6f23d: {
  label: "PostgresBackpressureSnapshotReader.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresBackpressureSnapshotReaderSql_ts_cc41b881: {
  label: "PostgresBackpressureSnapshotReaderSql.ts"
}
`;case`adapter-postgresFiles_objectFile`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_PostgresObjectFileLoader_ts_4e439445: {
  label: "PostgresObjectFileLoader.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresObjectFileLoadingCapability_ts_2cb09f82: {
  label: "PostgresObjectFileLoadingCapability.ts"
}
`;case`adapter-postgresFiles_schemaAndRuntime`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_migratePostgresRuntimeStores_ts_291884fb: {
  label: "migratePostgresRuntimeStores.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresSchemaManager_ts_fdbed115: {
  label: "PostgresSchemaManager.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresStateStoreRuntimeConfig_ts_69491487: {
  label: "PostgresStateStoreRuntimeConfig.ts"
}
`;case`adapter-postgresFiles_credentialsAndPool`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_PostgresAdapterConnectionString_ts_1aa936b5: {
  label: "PostgresAdapterConnectionString.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresCredentialBindingResolver_ts_05be0484: {
  label: "PostgresCredentialBindingResolver.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresPoolErrorPolicy_ts_69e3b097: {
  label: "PostgresPoolErrorPolicy.ts"
}
`;case`temporalAdapterBoundary`:return`direction: right

TemporalAdapterModelSourceEvidence: {
  label: "Source evidence"
}
TemporalAdapterModelPublicBoundary: {
  label: "Temporal adapter public boundary"
}
TemporalAdapterModelProviderAdapter: {
  label: "Temporal provider adapter"
}
TemporalAdapterModelWorkerHost: {
  label: "Temporal worker host"
}
TemporalAdapterModelTemporalClient: {
  label: "Temporal client boundary"
}
TemporalAdapterModelPolicyMapping: {
  label: "Temporal policy mapping"
}
TemporalAdapterModelWorkflowRuntime: {
  label: "RunPlan workflow runtime"
}
TemporalAdapterModelObservability: {
  label: "Temporal observability + error policy"
}
TemporalAdapterModelActivities: {
  label: "Temporal activities + dispatch"
}
TemporalAdapterModelStateWriteProtection: {
  label: "Run-state command circuit breaker"
}
TemporalAdapterModelStepPlugins: {
  label: "Temporal step plugin boundary"
}

TemporalAdapterModelPublicBoundary -> TemporalAdapterModelProviderAdapter: "exports adapter"
TemporalAdapterModelProviderAdapter -> TemporalAdapterModelTemporalClient: "provider API calls"
TemporalAdapterModelPublicBoundary -> TemporalAdapterModelWorkerHost: "exports worker host"
TemporalAdapterModelWorkerHost -> TemporalAdapterModelWorkflowRuntime: "hosts workflow code"
TemporalAdapterModelWorkerHost -> TemporalAdapterModelActivities: "registers activities"
TemporalAdapterModelWorkflowRuntime -> TemporalAdapterModelActivities: "schedules activities"
TemporalAdapterModelActivities -> TemporalAdapterModelStepPlugins: "dispatches step capability"
TemporalAdapterModelProviderAdapter -> TemporalAdapterModelPolicyMapping: "Temporal-specific translation"
TemporalAdapterModelWorkflowRuntime -> TemporalAdapterModelStateWriteProtection: "guards state writes"
TemporalAdapterModelProviderAdapter -> TemporalAdapterModelObservability: "telemetry + error policy"
TemporalAdapterModelWorkerHost -> TemporalAdapterModelObservability: "worker/runtime telemetry"
`;case`temporalAdapterSourceInventory`:return`direction: down

TemporalAdapterSource: {
  label: "Temporal Adapter source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 44 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 45 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_eslint_json_df42856a: {
    label: "tsconfig.eslint.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_tsconfig_test_json_d1f96fd1: {
    label: "tsconfig.test.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`adapter-temporalFiles_publicBoundary`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`adapter-temporalFiles_providerAdapter`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2File_src_ObservedTemporalAdapter_ts_cbf66427: {
  label: "ObservedTemporalAdapter.ts"
}
TemporalAdapterSourceDir_src_f27fede2File_src_TemporalAdapter_ts_cd3d08b1: {
  label: "TemporalAdapter.ts"
}
`;case`adapter-temporalFiles_temporalClient`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2File_src_TemporalClient_ts_50ffa75d: {
  label: "TemporalClient.ts"
}
`;case`adapter-temporalFiles_workerHost`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2File_src_config_ts_0808bc71: {
  label: "config.ts"
}
TemporalAdapterSourceDir_src_f27fede2File_src_TemporalWorkerHost_ts_baba20bf: {
  label: "TemporalWorkerHost.ts"
}
TemporalAdapterSourceDir_src_f27fede2File_src_versioning_ts_11419bfa: {
  label: "versioning.ts"
}
`;case`adapter-temporalFiles_workflowRuntime`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_executionSegmentResolver_ts_2360f16e: {
  label: "executionSegmentResolver.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_activities_ts_7c558f2f: {
  label: "runPlanWorkflow.activities.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_cancellation_ts_99aebd96: {
  label: "runPlanWorkflow.cancellation.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_layerHelpers_ts_5644644d: {
  label: "runPlanWorkflow.layerHelpers.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_layerResults_ts_ef7509a8: {
  label: "runPlanWorkflow.layerResults.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_layers_ts_b0dc1edc: {
  label: "runPlanWorkflow.layers.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_lifecycle_ts_85fd0658: {
  label: "runPlanWorkflow.lifecycle.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_signals_ts_1c1789d8: {
  label: "runPlanWorkflow.signals.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_state_ts_42e1bfb3: {
  label: "runPlanWorkflow.state.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_stepExecution_ts_6dff9077: {
  label: "runPlanWorkflow.stepExecution.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_RunPlanWorkflow_ts_42bee0ed: {
  label: "RunPlanWorkflow.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_runPlanWorkflow_types_ts_9f49e52f: {
  label: "runPlanWorkflow.types.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_workflowArtifactHelpers_ts_e024961b: {
  label: "workflowArtifactHelpers.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_orkflows_workflowControlSignalRetentionPolicy_ts_c8f33c3b: {
  label: "workflowControlSignalRetentionPolicy.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_workflowCursorHelpers_ts_77b65951: {
  label: "workflowCursorHelpers.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_workflowErrorHelpers_ts_2a9687e1: {
  label: "workflowErrorHelpers.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_workflowFailureReasonPolicy_ts_64af0c14: {
  label: "workflowFailureReasonPolicy.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_workflowGatewayHelpers_ts_b42f874f: {
  label: "workflowGatewayHelpers.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_workflowInputParsingHelpers_ts_9d6c4309: {
  label: "workflowInputParsingHelpers.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236File_src_workflows_workflowRuntimePayloadHelpers_ts_202d2ce0: {
  label: "workflowRuntimePayloadHelpers.ts"
}
`;case`adapter-temporalFiles_activities`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5cFile_src_activities_activityFactory_ts_5c37456f: {
  label: "activityFactory.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5cFile_src_activities_activityFailures_ts_0b47fa48: {
  label: "activityFailures.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5cFile_src_activities_activityTypes_ts_e6f23064: {
  label: "activityTypes.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5cFile_src_activities_gatewayStepActivity_ts_fe8fa2d5: {
  label: "gatewayStepActivity.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5cFile_src_activities_stepActivities_ts_0421a0df: {
  label: "stepActivities.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5cFile_src_activities_stepActivityDispatcher_ts_41ae72d5: {
  label: "stepActivityDispatcher.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5cFile_src_activities_stepActivityValidation_ts_f1ced87f: {
  label: "stepActivityValidation.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5cFile_src_activities_temporalPlanArtifactReader_ts_d8fbec02: {
  label: "temporalPlanArtifactReader.ts"
}
`;case`adapter-temporalFiles_stepPlugins`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2Dir_src_plugins_e2271fccFile_src_plugins_TemporalStepPluginProfile_ts_3f1b8cc2: {
  label: "TemporalStepPluginProfile.ts"
}
TemporalAdapterSourceDir_src_f27fede2Dir_src_plugins_e2271fccFile_src_plugins_TemporalStepPluginRunner_ts_f768febc: {
  label: "TemporalStepPluginRunner.ts"
}
`;case`adapter-temporalFiles_policyMapping`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2File_src_TemporalPolicyMapper_ts_07cc6405: {
  label: "TemporalPolicyMapper.ts"
}
TemporalAdapterSourceDir_src_f27fede2File_src_WorkflowMapper_ts_d2031a69: {
  label: "WorkflowMapper.ts"
}
`;case`adapter-temporalFiles_stateWriteProtection`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2File_src_RunStateCommandPortCircuitBreaker_ts_a76803df: {
  label: "RunStateCommandPortCircuitBreaker.ts"
}
`;case`adapter-temporalFiles_observability`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2File_src_temporalErrorPolicy_ts_9b40e84d: {
  label: "temporalErrorPolicy.ts"
}
TemporalAdapterSourceDir_src_f27fede2File_src_temporalObservability_ts_df62a1eb: {
  label: "temporalObservability.ts"
}
TemporalAdapterSourceDir_src_f27fede2File_src_temporalPlanRefCapacitySlaPolicy_ts_df244d08: {
  label: "temporalPlanRefCapacitySlaPolicy.ts"
}
`;case`apiBoundary`:return`direction: right

ApiModelSourceEvidence: {
  label: "Source evidence"
}
ApiModelHost: {
  label: "API process host"
}
ApiModelAppComposition: {
  label: "Fastify application composition"
}
ApiModelApplication: {
  label: "Application services + ports"
}
ApiModelDomain: {
  label: "API-owned domain behavior"
}
ApiModelInfrastructure: {
  label: "Infrastructure adapters"
}
ApiModelRuntime: {
  label: "API runtime services"
}
ApiModelEntrypoints: {
  label: "HTTP entrypoints"
}
ApiModelModules: {
  label: "Runtime module composition"
}
ApiModelPlugins: {
  label: "API host plugins"
}
ApiModelRoutes: {
  label: "Operational routes"
}
ApiModelDb: {
  label: "API database support"
}

ApiModelHost -> ApiModelAppComposition: "buildApp + process lifecycle"
ApiModelAppComposition -> ApiModelEntrypoints: "register protected HTTP entrypoints"
ApiModelAppComposition -> ApiModelModules: "build protected runtime module"
ApiModelAppComposition -> ApiModelPlugins: "env/logging/observability plugins"
ApiModelAppComposition -> ApiModelRoutes: "register operational routes"
ApiModelHost -> ApiModelRuntime: "reconciler/watchdog runtime"
`;case`apiSourceInventory`:return`direction: down

ApiSource: {
  label: "API source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 352 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 235 files"
  }
  File__env_example_d4dae00d: {
    label: ".env.example"
  }
  File__gitignore_a5cc2925: {
    label: ".gitignore"
  }
  File_Dockerfile_6651ddff: {
    label: "Dockerfile"
  }
  File_nixpacks_toml_01f74ca5: {
    label: "nixpacks.toml"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_Procfile_bc3c68e8: {
    label: "Procfile"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
  File_vitest_integration_config_ts_e22e2c3a: {
    label: "vitest.integration.config.ts"
  }
}
`;case`apiFiles_host`:return`direction: down

ApiSourceDir_src_f27fede2File_src_server_ts_bcc09dcb: {
  label: "server.ts"
}
`;case`apiFiles_appComposition`:return`direction: down

ApiSourceDir_src_f27fede2File_src_app_ts_21638117: {
  label: "app.ts"
}
`;case`apiFiles_application`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_errors_b20e2c46File_src_application_errors_runControlErrors_ts_8d88032f: {
  label: "runControlErrors.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_accessDecision_ts_dd52ea87: {
  label: "accessDecision.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_accessDecisionActions_ts_8f8b5e30: {
  label: "accessDecisionActions.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_accessDecisionScopes_ts_f63a641c: {
  label: "accessDecisionScopes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_AdmissionTelemetry_ts_041c93a2: {
  label: "AdmissionTelemetry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_auth_ts_ae71e2c2: {
  label: "auth.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_authContract_ts_628e8f22: {
  label: "authContract.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_rc_application_ports_canvasAuthoringAuthority_ts_0eaae60a: {
  label: "canvasAuthoringAuthority.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_dbtDependencyEdit_ts_5b2fd688: {
  label: "dbtDependencyEdit.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_dbtExecutionTarget_ts_0229bb2d: {
  label: "dbtExecutionTarget.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_dbtProjectAnalysis_ts_c9db650a: {
  label: "dbtProjectAnalysis.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_dbtProjectBundle_ts_df8e4192: {
  label: "dbtProjectBundle.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_application_ports_dbtProjectCandidateAnalysis_ts_8dcc2d6c: {
  label: "dbtProjectCandidateAnalysis.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_dbtProjectImport_ts_93577643: {
  label: "dbtProjectImport.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_dbtYamlDescriptionEdit_ts_1d67df6c: {
  label: "dbtYamlDescriptionEdit.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_DuplicateRunProbe_ts_390e82f1: {
  label: "DuplicateRunProbe.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_on_ports_graphDbtWorkspaceArtifactPublication_ts_6cbedc21: {
  label: "graphDbtWorkspaceArtifactPublication.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_IAdmissionGuard_ts_9e5e99e5: {
  label: "IAdmissionGuard.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_IAdmissionMode_ts_0f033573: {
  label: "IAdmissionMode.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_lication_ports_IBackpressureCapacityTelemetry_ts_c926289c: {
  label: "IBackpressureCapacityTelemetry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_lication_ports_IStartRunExecutionCapacityPort_ts_b0639641: {
  label: "IStartRunExecutionCapacityPort.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_lication_ports_IStartRunTargetAdapterRegistry_ts_35317eb3: {
  label: "IStartRunTargetAdapterRegistry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_lication_ports_postgresTransformSqlValidation_ts_cb3203f1: {
  label: "postgresTransformSqlValidation.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_rc_application_ports_principalGrantRepository_ts_4caff6b5: {
  label: "principalGrantRepository.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_projectOnboarding_ts_2b3eba22: {
  label: "projectOnboarding.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_application_ports_runCancellationReceiptStore_ts_3a7e3c24: {
  label: "runCancellationReceiptStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_on_ports_runExecutionContextInheritanceWriter_ts_91e23f5c: {
  label: "runExecutionContextInheritanceWriter.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_tion_ports_runExecutionContextReferenceReader_ts_e9fb299e: {
  label: "runExecutionContextReferenceReader.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File__ports_runExecutionContextRequirementResolver_ts_678681b7: {
  label: "runExecutionContextRequirementResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_c_application_ports_runExecutionContextWriter_ts_61072afb: {
  label: "runExecutionContextWriter.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_runtime_ts_1bc2cb18: {
  label: "runtime.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_startRunEngineError_ts_d0fa078c: {
  label: "startRunEngineError.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_StartRunSlaTelemetry_ts_66298acb: {
  label: "StartRunSlaTelemetry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_startRunUseCasePort_ts_325e953b: {
  label: "startRunUseCasePort.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_warehouseSourceImport_ts_d0a1cd6d: {
  label: "warehouseSourceImport.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_workspaceContext_ts_315e6ad9: {
  label: "workspaceContext.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_workspaceDiffChanges_ts_c4ee90d1: {
  label: "workspaceDiffChanges.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_workspaceFileHistory_ts_801ee765: {
  label: "workspaceFileHistory.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_workspaceFiles_ts_6048903c: {
  label: "workspaceFiles.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_workspaceGraphDraft_ts_af47bcb2: {
  label: "workspaceGraphDraft.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855File_src_application_ports_workspacePluginCatalog_ts_51f45599: {
  label: "workspacePluginCatalog.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ication_services_analyzeSelectedDbtModelQuery_ts_766ace9a: {
  label: "analyzeSelectedDbtModelQuery.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ication_services_authorizeCommandScopeService_ts_d1157d74: {
  label: "authorizeCommandScopeService.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_authorizeWorkspaceGraphDraftCapabilityService_ts_4a11f8ff: {
  label: "authorizeWorkspaceGraphDraftCapabilityService.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ion_services_BackpressureAwareStartRunUseCase_ts_98f61e6f: {
  label: "BackpressureAwareStartRunUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_cancelRunUseCase_ts_c364de92: {
  label: "cancelRunUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ation_services_canvasAuthoringAuthorityPolicy_ts_bf2b562a: {
  label: "canvasAuthoringAuthorityPolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_plication_services_compileGraphDbtModelsQuery_ts_28ac59c2: {
  label: "compileGraphDbtModelsQuery.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_CompilePlanUseCase_ts_15bebf59: {
  label: "CompilePlanUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_createProjectUseCase_ts_c4e47728: {
  label: "createProjectUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ion_services_createWarehouseConnectionUseCase_ts_3ab7027e: {
  label: "createWarehouseConnectionUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtDependencyEdit_1ec59f3dFile_ncyEdit_ApplySelectedDbtDependencyEditCommand_ts_727c5bcd: {
  label: "ApplySelectedDbtDependencyEditCommand.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtDependencyEdit_1ec59f3dFile_DependencyEdit_dbtDependencyEditDecisionModel_ts_0a9a8149: {
  label: "dbtDependencyEditDecisionModel.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtDependencyEdit_1ec59f3dFile_tDependencyEdit_dbtSemanticRegionPatchPlanner_ts_4cc6ead2: {
  label: "dbtSemanticRegionPatchPlanner.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_cation_services_dbtExecutionConnectionBinding_ts_b38e2f7c: {
  label: "dbtExecutionConnectionBinding.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile__application_services_dbtPlanExecutionBinding_ts_497e7caa: {
  label: "dbtPlanExecutionBinding.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile__dbtProjectFilesWarehouseSourceImportStrategy_ts_226baedf: {
  label: "dbtProjectFilesWarehouseSourceImportStrategy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtYamlDescriptionEdit_e9da71e9File_iptionEdit_ApplyDbtYamlDescriptionEditCommand_ts_551a5ed1: {
  label: "ApplyDbtYamlDescriptionEditCommand.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtYamlDescriptionEdit_e9da71e9File_scriptionEdit_dbtYamlDescriptionEditIntegrity_ts_64947ea8: {
  label: "dbtYamlDescriptionEditIntegrity.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtYamlDescriptionEdit_e9da71e9File_iptionEdit_DbtYamlDescriptionResourceResolver_ts_75d43e8c: {
  label: "DbtYamlDescriptionResourceResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtYamlDescriptionEdit_e9da71e9File_iptionEdit_ProposeDbtYamlDescriptionEditQuery_ts_01f8fbbb: {
  label: "ProposeDbtYamlDescriptionEditQuery.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtYamlDescriptionEdit_e9da71e9File_ptionEdit_RevertDbtYamlDescriptionEditCommand_ts_8d73322d: {
  label: "RevertDbtYamlDescriptionEditCommand.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_services_defaultStartRunExecutionCapacityPort_ts_36a72792: {
  label: "defaultStartRunExecutionCapacityPort.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_rc_application_services_engineStartRunUseCase_ts_e7d8ce7f: {
  label: "engineStartRunUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ion_services_getCostAttributionSummaryUseCase_ts_5ca6a9ec: {
  label: "getCostAttributionSummaryUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_getRunEventsUseCase_ts_0f2774df: {
  label: "getRunEventsUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_getRunStatusUseCase_ts_212bfa14: {
  label: "getRunStatusUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ation_services_getWorkspaceFileContentUseCase_ts_25ad3f22: {
  label: "getWorkspaceFileContentUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_cation_services_getWorkspaceGraphDraftUseCase_ts_2dc240dd: {
  label: "getWorkspaceGraphDraftUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_on_services_graphDbtWorkspaceArtifactPublication_766e9c67File_tion_PublishGraphDbtWorkspaceArtifactsCommand_ts_60451403: {
  label: "PublishGraphDbtWorkspaceArtifactsCommand.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_vices_graphDraftWarehouseSourceImportStrategy_ts_c76d6d88: {
  label: "graphDraftWarehouseSourceImportStrategy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile__application_services_importDbtProjectUseCase_ts_920dbed4: {
  label: "importDbtProjectUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_ImportPlanUseCase_ts_26b98bcd: {
  label: "ImportPlanUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_cation_services_importWarehouseSourcesUseCase_ts_fe272557: {
  label: "importWarehouseSourcesUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_listProjectsUseCase_ts_58744e45: {
  label: "listProjectsUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_listRunsUseCase_ts_290c07ad: {
  label: "listRunsUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_s_listWarehouseConnectionSourceObjectsUseCase_ts_a8f7e362: {
  label: "listWarehouseConnectionSourceObjectsUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_tion_services_listWarehouseConnectionsUseCase_ts_84f6fa9b: {
  label: "listWarehouseConnectionsUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_tion_services_listWorkspaceDiffChangesUseCase_ts_b6e92311: {
  label: "listWorkspaceDiffChangesUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_tion_services_listWorkspaceFileHistoryUseCase_ts_45d3c85e: {
  label: "listWorkspaceFileHistoryUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_pplication_services_listWorkspaceFilesUseCase_ts_14c002c4: {
  label: "listWorkspaceFilesUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_lication_services_listWorkspacePluginsUseCase_ts_f947038c: {
  label: "listWorkspacePluginsUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ication_services_PlannerBackedStartRunUseCase_ts_505e19c3: {
  label: "PlannerBackedStartRunUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_plication_services_postgresTransformSqlPolicy_ts_458c3215: {
  label: "postgresTransformSqlPolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_PreviewPlanUseCase_ts_7637ed89: {
  label: "PreviewPlanUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_vices_previewWarehouseSourceObjectRowsUseCase_ts_9fc02e6c: {
  label: "previewWarehouseSourceObjectRowsUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_tion_services_projectDbtGraphFromFilesUseCase_ts_df14a25e: {
  label: "projectDbtGraphFromFilesUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile__application_services_projectOnboardingPolicy_ts_7862bab2: {
  label: "projectOnboardingPolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ion_services_protectedRuntimeTenantAuthorizer_ts_2ca84b04: {
  label: "protectedRuntimeTenantAuthorizer.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_recoverRunUseCase_ts_12ed7c68: {
  label: "recoverRunUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ion_services_renameWarehouseConnectionUseCase_ts_f2f5b74e: {
  label: "renameWarehouseConnectionUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile__services_resolveAuthorizedExecutableSubgraph_ts_26d230ef: {
  label: "resolveAuthorizedExecutableSubgraph.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ervices_resolveAuthorizedPlannerInputEnvelope_ts_8b1c183d: {
  label: "resolveAuthorizedPlannerInputEnvelope.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_on_services_resolveAuthorizedPreviewSelection_ts_89fa8bf9: {
  label: "resolveAuthorizedPreviewSelection.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_services_resolveCanonicalPlannerInputEnvelope_ts_33b7abcb: {
  label: "resolveCanonicalPlannerInputEnvelope.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_runControlPolicy_ts_74c2ed3d: {
  label: "runControlPolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_on_services_RunExecutionContextBindingUseCase_ts_d48a09c4: {
  label: "RunExecutionContextBindingUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_plication_services_runExecutionContextFactory_ts_c7d91ba5: {
  label: "runExecutionContextFactory.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_pplication_services_runMetadataToEngineRunRef_ts_0651ba95: {
  label: "runMetadataToEngineRunRef.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_runOperationalTruth_ts_baec43cb: {
  label: "runOperationalTruth.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_runReadEvidenceModel_ts_52c72f0e: {
  label: "runReadEvidenceModel.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile__application_services_runRecoveryContextTrust_ts_92a0646a: {
  label: "runRecoveryContextTrust.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_lication_services_runRecoveryPlanAvailability_ts_ce7c158d: {
  label: "runRecoveryPlanAvailability.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_application_services_runStartDispatchResolver_ts_69d7d8ea: {
  label: "runStartDispatchResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_tion_services_saveWorkspaceFileContentUseCase_ts_1c51b06a: {
  label: "saveWorkspaceFileContentUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ation_services_saveWorkspaceGraphDraftUseCase_ts_f3e08a05: {
  label: "saveWorkspaceGraphDraftUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_n_services_selectedDbtModelAnalysisProjection_ts_9c757fc9: {
  label: "selectedDbtModelAnalysisProjection.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ion_services_selectedDbtModelAnalysisResolver_ts_0d374137: {
  label: "selectedDbtModelAnalysisResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_signalRunUseCase_ts_eccc2093: {
  label: "signalRunUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_slaTiming_ts_2acbbcda: {
  label: "slaTiming.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_plication_services_startRunAdmissionDecisions_ts_46be9f6a: {
  label: "startRunAdmissionDecisions.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_startRunEngineBridge_ts_435aae8b: {
  label: "startRunEngineBridge.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_cation_services_startRunTargetAdapterRegistry_ts_0cd61b1a: {
  label: "startRunTargetAdapterRegistry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_storedExecutablePlan_ts_358fc995: {
  label: "storedExecutablePlan.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ication_services_StoredExecutablePlanResolver_ts_6d74b3b6: {
  label: "StoredExecutablePlanResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ation_services_StoredPlanAdmissionCoordinator_ts_929a95d7: {
  label: "StoredPlanAdmissionCoordinator.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ion_services_StoredPlanExecutabilityValidator_ts_1fc2cfa0: {
  label: "StoredPlanExecutabilityValidator.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_redPlanRunExecutionContextRequirementResolver_ts_860ff8d5: {
  label: "StoredPlanRunExecutionContextRequirementResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_storedPlanScope_ts_64499474: {
  label: "storedPlanScope.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ation_services_testWarehouseConnectionUseCase_ts_eee77170: {
  label: "testWarehouseConnectionUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_tion_services_validateDbtProjectImportUseCase_ts_36c7fd36: {
  label: "validateDbtProjectImportUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile__services_validatePostgresTransformSqlUseCase_ts_79c4630a: {
  label: "validatePostgresTransformSqlUseCase.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_ervices_WarehouseConnectionSourceObjectReader_ts_7b823e9b: {
  label: "WarehouseConnectionSourceObjectReader.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_pplication_services_warehouseSourceImportPlan_ts_429f64aa: {
  label: "warehouseSourceImportPlan.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_plication_services_warehouseSourceRemovalPlan_ts_b29fdf39: {
  label: "warehouseSourceRemovalPlan.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_src_application_services_warehouseSourceYaml_ts_66aace5a: {
  label: "warehouseSourceYaml.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_lication_services_warehouseSourceYamlBindings_ts_26c71a42: {
  label: "warehouseSourceYamlBindings.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_cation_services_warehouseSourceYamlDescriptor_ts_9a27a458: {
  label: "warehouseSourceYamlDescriptor.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_lication_services_warehouseSourceYamlDocument_ts_f3ee6d89: {
  label: "warehouseSourceYamlDocument.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_lication_services_warehouseSourceYamlIdentity_ts_bad4d177: {
  label: "warehouseSourceYamlIdentity.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_application_services_warehouseSourceYamlMerge_ts_5ad69e46: {
  label: "warehouseSourceYamlMerge.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_cation_services_warehouseSourceYamlSerializer_ts_11b13ed0: {
  label: "warehouseSourceYamlSerializer.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_application_services_warehouseSourceYamlTypes_ts_bbbea417: {
  label: "warehouseSourceYamlTypes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile_rc_application_services_WorkflowEngineFactory_ts_03f081a9: {
  label: "WorkflowEngineFactory.ts"
}
ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaFile__services_workspaceGraphDraftCapabilityPolicy_ts_64996b40: {
  label: "workspaceGraphDraftCapabilityPolicy.ts"
}
`;case`apiFiles_domain`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_auth_69640779File_src_domain_auth_types_ts_4d1b3e7c: {
  label: "types.ts"
}
`;case`apiFiles_entrypoints`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_adminRoutes_ts_b77b5643: {
  label: "adminRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_authHeaders_ts_bcec4e29: {
  label: "authHeaders.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_entrypoints_http_authorizeAdminExecutionScope_ts_62b8f4af: {
  label: "authorizeAdminExecutionScope.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_authorizeExecutionScope_ts_3c06d2e5: {
  label: "authorizeExecutionScope.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_cancelRunRoute_ts_e798e8af: {
  label: "cancelRunRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_cancelRunRouteParser_ts_da1a2721: {
  label: "cancelRunRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_compilePlanRoute_ts_3629dc4e: {
  label: "compilePlanRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_trypoints_http_compilePlanRouteResponseMapper_ts_75ea3e23: {
  label: "compilePlanRouteResponseMapper.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile__entrypoints_http_costAttributionSummaryRoute_ts_d8ea6352: {
  label: "costAttributionSummaryRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_p_costAttributionSummaryRouteParser_constants_ts_f76b6306: {
  label: "costAttributionSummaryRouteParser.constants.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_points_http_costAttributionSummaryRouteParser_ts_5d1da02f: {
  label: "costAttributionSummaryRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile__entrypoints_http_dbtDependencyEditRouteGroup_ts_781516af: {
  label: "dbtDependencyEditRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_dbtDependencyEditRoutes_ts_ea46bbd6: {
  label: "dbtDependencyEditRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_ypoints_http_dbtProjectFileRouteAuthorization_ts_893cd321: {
  label: "dbtProjectFileRouteAuthorization.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_rc_entrypoints_http_dbtProjectGraphRouteGroup_ts_127f2f95: {
  label: "dbtProjectGraphRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_dbtProjectGraphRoutes_ts_75dc6f09: {
  label: "dbtProjectGraphRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_c_entrypoints_http_dbtProjectImportRouteGroup_ts_a4fa13e5: {
  label: "dbtProjectImportRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_dbtProjectImportRoutes_ts_a80c6c15: {
  label: "dbtProjectImportRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_oints_http_dbtSelectedModelAnalysisRouteGroup_ts_b360230c: {
  label: "dbtSelectedModelAnalysisRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_trypoints_http_dbtSelectedModelAnalysisRoutes_ts_73b2d965: {
  label: "dbtSelectedModelAnalysisRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_ypoints_http_dbtYamlDescriptionEditRouteGroup_ts_a7a0780d: {
  label: "dbtYamlDescriptionEditRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_entrypoints_http_dbtYamlDescriptionEditRoutes_ts_2f9f3ffa: {
  label: "dbtYamlDescriptionEditRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_executePlanRouteFacade_ts_4007a595: {
  label: "executePlanRouteFacade.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_extractBearerToken_ts_815e284a: {
  label: "extractBearerToken.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_getRunEventsRoute_ts_ca52c8ad: {
  label: "getRunEventsRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_points_http_getRunEventsRouteParser_constants_ts_79c91a4d: {
  label: "getRunEventsRouteParser.constants.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_getRunEventsRouteParser_ts_6136dd5c: {
  label: "getRunEventsRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_getRunRoute_ts_b23aa56f: {
  label: "getRunRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile__entrypoints_http_getRunRouteParser_constants_ts_5dcd761a: {
  label: "getRunRouteParser.constants.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_getRunRouteParser_ts_9b3af7c1: {
  label: "getRunRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_oints_http_graphDbtModelCompilationRouteGroup_ts_879cebef: {
  label: "graphDbtModelCompilationRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_trypoints_http_graphDbtModelCompilationRoutes_ts_e5b2c5ca: {
  label: "graphDbtModelCompilationRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_raphDbtWorkspaceArtifactPublicationRouteGroup_ts_b3b5ff77: {
  label: "graphDbtWorkspaceArtifactPublicationRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_tp_graphDbtWorkspaceArtifactPublicationRoutes_ts_5c60a435: {
  label: "graphDbtWorkspaceArtifactPublicationRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_httpBearerAuthentication_ts_da474102: {
  label: "httpBearerAuthentication.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_rc_entrypoints_http_httpDomainErrorClassifier_ts_2e2e0025: {
  label: "httpDomainErrorClassifier.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_httpErrorContract_ts_053db753: {
  label: "httpErrorContract.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_httpErrorDetails_ts_578429a1: {
  label: "httpErrorDetails.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_httpErrorMapper_ts_0e765c16: {
  label: "httpErrorMapper.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_httpErrorReasonCatalog_ts_694f9d77: {
  label: "httpErrorReasonCatalog.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_httpErrorTranslation_ts_4466337a: {
  label: "httpErrorTranslation.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_importPlanRoute_ts_2da925cd: {
  label: "importPlanRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_importPlanRouteParser_ts_bc3b1514: {
  label: "importPlanRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_ntrypoints_http_importPlanRouteResponseMapper_ts_520bafa1: {
  label: "importPlanRouteResponseMapper.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_listRunsRoute_ts_6132a68e: {
  label: "listRunsRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_ntrypoints_http_listRunsRouteParser_constants_ts_a00233df: {
  label: "listRunsRouteParser.constants.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_listRunsRouteParser_ts_ed9c88c8: {
  label: "listRunsRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile__entrypoints_http_planCompileRouteInputParser_ts_4b43b204: {
  label: "planCompileRouteInputParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_planRouteBodyParser_ts_5b548f44: {
  label: "planRouteBodyParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_trypoints_http_planRoutePlannerEnvelopeParser_ts_3ca0bd1f: {
  label: "planRoutePlannerEnvelopeParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_planRoutePlanRefParser_ts_3481b58e: {
  label: "planRoutePlanRefParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_rc_entrypoints_http_planRoutePlanSourcePolicy_ts_d95c7a90: {
  label: "planRoutePlanSourcePolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_planRouteRequestResolver_ts_c31956e9: {
  label: "planRouteRequestResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_ts_http_planRouteRunExecutionContextRefParser_ts_49b38d60: {
  label: "planRouteRunExecutionContextRefParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_planRouteScope_ts_ca7da9c8: {
  label: "planRouteScope.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_planRouteScopeParser_ts_294409b0: {
  label: "planRouteScopeParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_planRouteSelectionParser_ts_456f110c: {
  label: "planRouteSelectionParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_entrypoints_http_planRouteTargetAdapterParser_ts_b92ae219: {
  label: "planRouteTargetAdapterParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_previewPlanRoute_ts_31ea1835: {
  label: "previewPlanRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_previewPlanRouteParser_ts_369b01c6: {
  label: "previewPlanRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_trypoints_http_previewPlanRouteResponseMapper_ts_798e1db7: {
  label: "previewPlanRouteResponseMapper.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_projectOnboardingRoutes_ts_1b8ffd62: {
  label: "projectOnboardingRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_rypoints_http_protectedRuntimeAdminRouteGroup_ts_9d004377: {
  label: "protectedRuntimeAdminRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_c_entrypoints_http_protectedRuntimePlanRoutes_ts_0f127bfb: {
  label: "protectedRuntimePlanRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_points_http_protectedRuntimeRouteDependencies_ts_99919e5d: {
  label: "protectedRuntimeRouteDependencies.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_rc_entrypoints_http_protectedRuntimeRunRoutes_ts_3c14f06c: {
  label: "protectedRuntimeRunRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_ntrypoints_http_protectedRuntimeSessionRoutes_ts_fc4c47ab: {
  label: "protectedRuntimeSessionRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_recoverRunIdentity_ts_2f60b313: {
  label: "recoverRunIdentity.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_recoverRunRoute_ts_f2a307b4: {
  label: "recoverRunRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_recoverRunRouteParser_ts_0f6c6e66: {
  label: "recoverRunRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_trypoints_http_registerProtectedRuntimeRoutes_ts_138c2c00: {
  label: "registerProtectedRuntimeRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_routeParseIssue_ts_d37b9522: {
  label: "routeParseIssue.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_routeParserPrimitives_ts_f900026f: {
  label: "routeParserPrimitives.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_runCommandFieldParsers_ts_97552412: {
  label: "runCommandFieldParsers.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_rc_entrypoints_http_runCommandRoute_constants_ts_b295d542: {
  label: "runCommandRoute.constants.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_runCommandRouteExecutor_ts_73dfd228: {
  label: "runCommandRouteExecutor.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_runtimeRoutes_constants_ts_e0a8ced9: {
  label: "runtimeRoutes.constants.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_sessionRoute_ts_44a0f743: {
  label: "sessionRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_signalRunRoute_ts_7c1a177e: {
  label: "signalRunRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_signalRunRouteParser_ts_27888cce: {
  label: "signalRunRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_startRunIdentity_ts_8358e0d8: {
  label: "startRunIdentity.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_startRunRoute_ts_c124a61d: {
  label: "startRunRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile__entrypoints_http_startRunRouteCommandBuilder_ts_86fcb8c1: {
  label: "startRunRouteCommandBuilder.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_startRunRouteParser_ts_fe533fbd: {
  label: "startRunRouteParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_ypoints_http_startRunRouteTargetAdapterParser_ts_4fed2538: {
  label: "startRunRouteTargetAdapterParser.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_rypoints_http_warehouseSourceImportRouteGroup_ts_c0e2929d: {
  label: "warehouseSourceImportRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile__entrypoints_http_warehouseSourceImportRoutes_ts_6dbef753: {
  label: "warehouseSourceImportRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_workspaceContextRoute_ts_bb5400d2: {
  label: "workspaceContextRoute.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_trypoints_http_workspaceDiffChangesRouteGroup_ts_ef1ada20: {
  label: "workspaceDiffChangesRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_c_entrypoints_http_workspaceDiffChangesRoutes_ts_a53dcf6e: {
  label: "workspaceDiffChangesRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_c_entrypoints_http_workspaceFileHistoryRoutes_ts_39c1a014: {
  label: "workspaceFileHistoryRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_workspaceFilesRouteGroup_ts_4a271401: {
  label: "workspaceFilesRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_src_entrypoints_http_workspaceFilesRoutes_ts_2f00a4ed: {
  label: "workspaceFilesRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_rc_entrypoints_http_workspaceGraphDraftRoutes_ts_cff301cb: {
  label: "workspaceGraphDraftRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_ypoints_http_workspacePluginCatalogRouteGroup_ts_7d923c3d: {
  label: "workspacePluginCatalogRouteGroup.ts"
}
ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6dFile_entrypoints_http_workspacePluginCatalogRoutes_ts_23ccde3c: {
  label: "workspacePluginCatalogRoutes.ts"
}
`;case`apiFiles_infrastructure`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_admissionTelemetry_43f2f3caFile__admissionTelemetry_admissionTelemetryMetrics_ts_cc2933d3: {
  label: "admissionTelemetryMetrics.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_admissionTelemetry_43f2f3caFile_sionTelemetry_ObservabilityAdmissionTelemetry_ts_3bfc0d91: {
  label: "ObservabilityAdmissionTelemetry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_admissionTelemetry_43f2f3caFile_ry_ObservabilityBackpressureCapacityTelemetry_ts_888e2c38: {
  label: "ObservabilityBackpressureCapacityTelemetry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_admissionTelemetry_43f2f3caFile_rc_infrastructure_admissionTelemetry_safeWarn_ts_5238df16: {
  label: "safeWarn.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_audit_b2b533d6File_infrastructure_audit_PostgresAuthAuditAdapter_ts_f0e62f4b: {
  label: "PostgresAuthAuditAdapter.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_audit_b2b533d6File_rc_infrastructure_audit_structuredAuditLogger_ts_2aaa7ea8: {
  label: "structuredAuditLogger.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_auth_f40f80b0File_astructure_auth_embeddedAccessDecisionService_ts_48ded3d9: {
  label: "embeddedAccessDecisionService.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_auth_f40f80b0File_ructure_auth_embeddedPrincipalGrantRepository_ts_cbe8386e: {
  label: "embeddedPrincipalGrantRepository.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_auth_f40f80b0File_ture_auth_embeddedProjectOnboardingRepository_ts_03f7e5d7: {
  label: "embeddedProjectOnboardingRepository.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_auth_f40f80b0File_astructure_auth_embeddedWorkspaceContextQuery_ts_afa77a09: {
  label: "embeddedWorkspaceContextQuery.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_auth_f40f80b0File_src_infrastructure_auth_jwksJwtVerifier_ts_d612e0d6: {
  label: "jwksJwtVerifier.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_auth_f40f80b0File_src_infrastructure_auth_oidcAuthenticator_ts_e0bc7191: {
  label: "oidcAuthenticator.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_backpressure_d0eb1454File_tructure_backpressure_CachedBackpressureStore_ts_834d02db: {
  label: "CachedBackpressureStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_backpressure_d0eb1454File_backpressure_CircuitBreakingBackpressureStore_ts_84a560f6: {
  label: "CircuitBreakingBackpressureStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_backpressure_d0eb1454File_re_backpressure_FileBackpressureFallbackStore_ts_c67a0054: {
  label: "FileBackpressureFallbackStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_backpressure_d0eb1454File_backpressure_MetricsEmittingBackpressureStore_ts_56f54445: {
  label: "MetricsEmittingBackpressureStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_backpressure_d0eb1454File_tructure_backpressure_RawSqlBackpressureStore_ts_faae9bd8: {
  label: "RawSqlBackpressureStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_backpressure_d0eb1454File_src_infrastructure_backpressure_types_ts_2cc90a47: {
  label: "types.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_canvasAuthoringAuthority_d8d8da7fFile_thority_PostgresCanvasAuthoringAuthorityStore_ts_89e12041: {
  label: "PostgresCanvasAuthoringAuthorityStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_actBackedRunExecutionContextInheritanceWriter_ts_9ee3807c: {
  label: "ArtifactBackedRunExecutionContextInheritanceWriter.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_ifactBackedRunExecutionContextReferenceReader_ts_23b12909: {
  label: "ArtifactBackedRunExecutionContextReferenceReader.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_e_dbt_ArtifactBackedRunExecutionContextWriter_ts_bf923bef: {
  label: "ArtifactBackedRunExecutionContextWriter.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_nfiguredDbtExecutionConnectionBindingVerifier_ts_ab7b141e: {
  label: "ConfiguredDbtExecutionConnectionBindingVerifier.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_ture_dbt_ConfiguredDbtExecutionTargetResolver_ts_559b89f1: {
  label: "ConfiguredDbtExecutionTargetResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_src_infrastructure_dbt_dbtAnalysisIdentity_ts_c815386d: {
  label: "dbtAnalysisIdentity.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_src_infrastructure_dbt_dbtAnalyzerProcess_ts_a871f480: {
  label: "dbtAnalyzerProcess.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_src_infrastructure_dbt_DbtCliProjectAnalyzer_ts_28368830: {
  label: "DbtCliProjectAnalyzer.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_astructure_dbt_DbtCliProjectCandidateAnalyzer_ts_19b4966f: {
  label: "DbtCliProjectCandidateAnalyzer.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_src_infrastructure_dbt_dbtManifestProjection_ts_da3fb267: {
  label: "dbtManifestProjection.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_rc_infrastructure_dbt_DbtProjectBundleBuilder_ts_9268d7f9: {
  label: "DbtProjectBundleBuilder.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File__infrastructure_dbt_dbtProjectContentRevision_ts_cf83c05e: {
  label: "dbtProjectContentRevision.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_src_infrastructure_dbt_dbtProjectPathPolicy_ts_ea2564a8: {
  label: "dbtProjectPathPolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_infrastructure_dbt_dbtProjectSemanticEvidence_ts_1eda43fe: {
  label: "dbtProjectSemanticEvidence.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_c_infrastructure_dbt_dbtProjectSourceSnapshot_ts_6d9b092d: {
  label: "dbtProjectSourceSnapshot.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_src_infrastructure_dbt_dbtProjectTarArchive_ts_a049ef23: {
  label: "dbtProjectTarArchive.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_nfrastructure_dbt_dbtProjectWorkspaceBoundary_ts_554d23b8: {
  label: "dbtProjectWorkspaceBoundary.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_nfrastructure_dbt_dbtSemanticRegionProjection_ts_abde8023: {
  label: "dbtSemanticRegionProjection.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File__dbt_FileRunExecutionContextInheritanceWriter_ts_901bef61: {
  label: "FileRunExecutionContextInheritanceWriter.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_re_dbt_FileRunExecutionContextReferenceReader_ts_d2dcccb3: {
  label: "FileRunExecutionContextReferenceReader.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_nfrastructure_dbt_immutableFileArtifactWriter_ts_71a678fe: {
  label: "immutableFileArtifactWriter.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_astructure_dbt_LocalDbtProjectImportInspector_ts_1d1fe476: {
  label: "LocalDbtProjectImportInspector.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_ture_dbt_PostgresDbtProjectImportProcessStore_ts_673db655: {
  label: "PostgresDbtProjectImportProcessStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_structure_dbt_runExecutionContextArtifactPath_ts_fe27a3e5: {
  label: "runExecutionContextArtifactPath.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0File_c_infrastructure_dbt_runExecutionContextTrust_ts_4f82ef3a: {
  label: "runExecutionContextTrust.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbtDependencyEdit_cfd51b9bFile_Edit_LocalDbtDependencyEditPublicationGateway_ts_13fcb850: {
  label: "LocalDbtDependencyEditPublicationGateway.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbtYamlDescriptionEdit_b58d0b60File_rkspaceMetadataDbtYamlDescriptionReceiptStore_ts_18f2d8a9: {
  label: "WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbtYamlDescriptionEdit_b58d0b60File_lDescriptionEdit_YamlCstDbtDescriptionMutator_ts_f1dec6df: {
  label: "YamlCstDbtDescriptionMutator.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_executionCapacity_f8227bb2File_ity_TemporalWorkerReadyzExecutionCapacityPort_ts_a70e82c9: {
  label: "TemporalWorkerReadyzExecutionCapacityPort.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_runControl_89abf458File_e_runControl_RunEventCancellationReceiptStore_ts_a04fcaf6: {
  label: "RunEventCancellationReceiptStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_startRun_8abe9bc1File_Run_ArtifactBackedRunExecutionContextResolver_ts_22418d20: {
  label: "ArtifactBackedRunExecutionContextResolver.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_startRun_8abe9bc1File_astructure_startRun_PostgresDuplicateRunProbe_ts_9487671f: {
  label: "PostgresDuplicateRunProbe.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_startRun_8abe9bc1File_ure_startRun_RunExecutionContextBindingPolicy_ts_afc88df0: {
  label: "RunExecutionContextBindingPolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_telemetry_d57d97d8File_etry_ObservabilityRunStatusStalenessTelemetry_ts_817a3049: {
  label: "ObservabilityRunStatusStalenessTelemetry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_telemetry_d57d97d8File_e_telemetry_ObservabilityStartRunSlaTelemetry_ts_9fbb2901: {
  label: "ObservabilityStartRunSlaTelemetry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_telemetry_d57d97d8File_try_ObservabilityWorkspaceGraphDraftTelemetry_ts_e34deb05: {
  label: "ObservabilityWorkspaceGraphDraftTelemetry.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_telemetry_d57d97d8File_ture_telemetry_SafeRunSnapshotStalenessReader_ts_7744285a: {
  label: "SafeRunSnapshotStalenessReader.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_telemetry_d57d97d8File_c_infrastructure_telemetry_startRunSlaMetrics_ts_ac87bd59: {
  label: "startRunSlaMetrics.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_warehouseSourceImport_69d1bf05File_urceImport_postgresSourceObjectMetricEvidence_ts_aa7e7e2d: {
  label: "postgresSourceObjectMetricEvidence.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_warehouseSourceImport_69d1bf05File_Import_WorkspacePostgresTransformSqlValidator_ts_13184018: {
  label: "WorkspacePostgresTransformSqlValidator.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_warehouseSourceImport_69d1bf05File_rceImport_WorkspaceWarehouseConnectionCatalog_ts_4526f367: {
  label: "WorkspaceWarehouseConnectionCatalog.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_warehouseSourceImport_69d1bf05File_ourceImport_WorkspaceWarehouseConnectionProbe_ts_2b08e3ff: {
  label: "WorkspaceWarehouseConnectionProbe.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceDiffChanges_f3467e97File_ffChanges_LocalWorkspaceDiffChangesRepository_ts_c376d6af: {
  label: "LocalWorkspaceDiffChangesRepository.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430cFile_eFiles_LocalWorkspaceFileBatchMutationGateway_ts_ce870be8: {
  label: "LocalWorkspaceFileBatchMutationGateway.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430cFile_aceFiles_localWorkspaceFileBatchMutationModel_ts_1849ed9e: {
  label: "localWorkspaceFileBatchMutationModel.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430cFile_paceFiles_LocalWorkspaceFileHistoryRepository_ts_4215caa8: {
  label: "LocalWorkspaceFileHistoryRepository.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430cFile_ceFiles_LocalWorkspaceFileMutationCoordinator_ts_882fb922: {
  label: "LocalWorkspaceFileMutationCoordinator.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430cFile_e_workspaceFiles_LocalWorkspaceFileRepository_ts_ce5b5d0e: {
  label: "LocalWorkspaceFileRepository.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430cFile_aceFiles_LocalWorkspaceMetadataFileRepository_ts_c058341a: {
  label: "LocalWorkspaceMetadataFileRepository.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430cFile_ture_workspaceFiles_resolveWorkspaceFilesRoot_ts_7902821e: {
  label: "resolveWorkspaceFilesRoot.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430cFile_ture_workspaceFiles_workspaceScopeStoragePath_ts_de136933: {
  label: "workspaceScopeStoragePath.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceGraphDraft_be302653File_ceGraphDraft_PostgresWorkspaceGraphDraftStore_ts_a18dd196: {
  label: "PostgresWorkspaceGraphDraftStore.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceGraphDraft_be302653File_raft_StructuredWorkspaceGraphDraftAuditLogger_ts_16c23b6a: {
  label: "StructuredWorkspaceGraphDraftAuditLogger.ts"
}
ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspacePlugins_2763ba5bFile_gins_EmbeddedWorkspacePluginCatalogRepository_ts_c354e723: {
  label: "EmbeddedWorkspacePluginCatalogRepository.ts"
}
`;case`apiFiles_modules`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3File_src_modules_buildProtectedRuntimeModule_ts_6fe831ca: {
  label: "buildProtectedRuntimeModule.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3File_src_modules_buildProviderAdapters_ts_39c17ae9: {
  label: "buildProviderAdapters.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_canvasAuthoringAuthority_4ec47a2cFile_uthority_buildCanvasAuthoringAuthorityRuntime_ts_5af10ee1: {
  label: "buildCanvasAuthoringAuthorityRuntime.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_dbtProjectImport_5385b85aFile_dbtProjectImport_buildDbtProjectImportRuntime_ts_d7ebd820: {
  label: "buildDbtProjectImportRuntime.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3File_src_modules_planCompileBoundary_ts_b5a3396e: {
  label: "planCompileBoundary.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3File_src_modules_planCompileCatalog_ts_4e969c5d: {
  label: "planCompileCatalog.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_protectedRuntime_db687cdcFile_otectedRuntime_buildProtectedAdmissionRuntime_ts_6585cfad: {
  label: "buildProtectedAdmissionRuntime.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_protectedRuntime_db687cdcFile_edRuntime_buildProtectedExecutionCapacityPort_ts_7c6b7529: {
  label: "buildProtectedExecutionCapacityPort.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_protectedRuntime_db687cdcFile_otectedRuntime_buildProtectedExecutionRuntime_ts_e56afd9d: {
  label: "buildProtectedExecutionRuntime.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_protectedRuntime_db687cdcFile_protectedRuntime_buildProtectedRuntimeStorage_ts_f0483df9: {
  label: "buildProtectedRuntimeStorage.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_protectedRuntime_db687cdcFile_rotectedRuntime_buildProtectedSecurityRuntime_ts_eb1a490f: {
  label: "buildProtectedSecurityRuntime.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_protectedRuntime_db687cdcFile_src_modules_protectedRuntime_shared_ts_c67a79d1: {
  label: "shared.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_providerAdapters_62ea127cFile_Adapters_createTemporalProviderAdapterFactory_ts_2b90c52c: {
  label: "createTemporalProviderAdapterFactory.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_providerAdapters_62ea127cFile_dules_providerAdapters_providerAdapterFactory_ts_592274be: {
  label: "providerAdapterFactory.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3File_src_modules_registerOperationalHooks_ts_9e6c42be: {
  label: "registerOperationalHooks.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_startRun_63ef3ee2File_odules_startRun_buildProtectedStartRunRuntime_ts_e9bce587: {
  label: "buildProtectedStartRunRuntime.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3File_src_modules_stateStoreRoles_ts_a6a4ed22: {
  label: "stateStoreRoles.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3File_src_modules_types_ts_9913e0be: {
  label: "types.ts"
}
ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_workspaceGraphDraft_eee1c7a3File_aceGraphDraft_buildWorkspaceGraphDraftRuntime_ts_3477c6e4: {
  label: "buildWorkspaceGraphDraftRuntime.ts"
}
`;case`apiFiles_plugins`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_plugins_e2271fccFile_src_plugins_env_ts_a41c27b5: {
  label: "env.ts"
}
ApiSourceDir_src_f27fede2Dir_src_plugins_e2271fccFile_src_plugins_logger_ts_310910ba: {
  label: "logger.ts"
}
ApiSourceDir_src_f27fede2Dir_src_plugins_e2271fccFile_src_plugins_observability_ts_a9fe291d: {
  label: "observability.ts"
}
`;case`apiFiles_routes`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_capabilities_ts_a10e5b88: {
  label: "capabilities.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_dbReady_ts_a553dddf: {
  label: "dbReady.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_health_ts_c3b008cf: {
  label: "health.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_healthContract_ts_5df3767b: {
  label: "healthContract.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_healthContractMapper_ts_d54766ef: {
  label: "healthContractMapper.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_healthPresenter_ts_ba83f18a: {
  label: "healthPresenter.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_healthReadinessPolicy_ts_350808af: {
  label: "healthReadinessPolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_healthReadinessPorts_ts_28afbc68: {
  label: "healthReadinessPorts.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_httpStatus_ts_df7db6bb: {
  label: "httpStatus.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_registerOperationalRoutes_ts_0f148e5a: {
  label: "registerOperationalRoutes.ts"
}
ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0aFile_src_routes_version_ts_8882e0f2: {
  label: "version.ts"
}
`;case`apiFiles_runtime`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_intentReconcilerRuntime_ts_2c415f4f: {
  label: "intentReconcilerRuntime.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_rc_runtime_intentReconcilerRuntimeComposition_ts_eb0255f7: {
  label: "intentReconcilerRuntimeComposition.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerHealth_ts_b85d68e2: {
  label: "reconcilerHealth.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerHealthMonitoring_ts_b6c50e03: {
  label: "reconcilerHealthMonitoring.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerHealthPolicy_ts_67ea5546: {
  label: "reconcilerHealthPolicy.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerHealthStateMachine_ts_7d6cbd43: {
  label: "reconcilerHealthStateMachine.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerHealthWatchdog_ts_02106670: {
  label: "reconcilerHealthWatchdog.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerRuntimeBootstrap_ts_6e91902f: {
  label: "reconcilerRuntimeBootstrap.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerRuntimeHealthHooks_ts_483d0818: {
  label: "reconcilerRuntimeHealthHooks.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerRuntimeLifecycle_ts_4af77837: {
  label: "reconcilerRuntimeLifecycle.ts"
}
ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_reconcilerRuntimeTelemetry_ts_09a88f8d: {
  label: "reconcilerRuntimeTelemetry.ts"
}
`;case`apiFiles_db`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_db_a9f703b6File_src_db_pool_ts_1b4a99d5: {
  label: "pool.ts"
}
`;case`artifactsBoundary`:return`direction: right

ArtifactsModelSourceEvidence: {
  label: "Source evidence"
}
ArtifactsModelPublicBoundary: {
  label: "Artifacts public boundary"
}
ArtifactsModelContentAddressed: {
  label: "Content-addressed artifact storage"
  shape: cylinder
}
ArtifactsModelPlanStorage: {
  label: "Plan artifact storage ports"
}
ArtifactsModelExecutionContext: {
  label: "Run execution context artifacts"
}
ArtifactsModelDbtBundle: {
  label: "dbt project bundle artifacts"
}
ArtifactsModelCompiledCode: {
  label: "Compiled-code storage + enrichment"
}
ArtifactsModelArtifactReadIntegrity: {
  label: "Artifact reading + integrity"
}

ArtifactsModelPublicBoundary -> ArtifactsModelContentAddressed: "exports CAS port + S3 implementation"
ArtifactsModelPublicBoundary -> ArtifactsModelPlanStorage: "exports plan storage ports"
ArtifactsModelPublicBoundary -> ArtifactsModelExecutionContext: "exports runtime context readers/stores"
ArtifactsModelPublicBoundary -> ArtifactsModelDbtBundle: "exports dbt bundle reader"
ArtifactsModelPublicBoundary -> ArtifactsModelArtifactReadIntegrity: "exports runtime read helpers"
ArtifactsModelExecutionContext -> ArtifactsModelArtifactReadIntegrity: "reads + verifies referenced artifacts"
ArtifactsModelDbtBundle -> ArtifactsModelArtifactReadIntegrity: "reads + validates project bundle artifacts"
ArtifactsModelPublicBoundary -> ArtifactsModelCompiledCode: "exports compiled-code surface"
`;case`artifactsFiles_publicBoundary`:return`direction: down

ArtifactsSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`artifactsFiles_contentAddressed`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_contentAddressed_d00e5123File_ntentAddressed_IContentAddressedArtifactStore_ts_303a6651: {
  label: "IContentAddressedArtifactStore.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_contentAddressed_d00e5123File_tentAddressed_S3ContentAddressedArtifactStore_ts_2d9f8e9c: {
  label: "S3ContentAddressedArtifactStore.ts"
}
`;case`artifactsFiles_planStorage`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IPlanStoreReader_ts_6cb66e37: {
  label: "IPlanStoreReader.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IPlanStoreWriter_ts_d74f251c: {
  label: "IPlanStoreWriter.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IStoredPlanArtifactStore_ts_2706acea: {
  label: "IStoredPlanArtifactStore.ts"
}
`;case`artifactsFiles_executionContext`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IRunExecutionContextReader_ts_5e773e10: {
  label: "IRunExecutionContextReader.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IRunExecutionContextReferenceStore_ts_8330e260: {
  label: "IRunExecutionContextReferenceStore.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_ntime_ArtifactBackedRunExecutionContextReader_ts_fa403d8a: {
  label: "ArtifactBackedRunExecutionContextReader.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_ntime_resolveRunExecutionContextArtifactStore_ts_e717eb22: {
  label: "resolveRunExecutionContextArtifactStore.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_c_runtime_S3RunExecutionContextReferenceStore_ts_83fcefea: {
  label: "S3RunExecutionContextReferenceStore.ts"
}
`;case`artifactsFiles_dbtBundle`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IDbtProjectBundleReader_ts_fbaa4a7e: {
  label: "IDbtProjectBundleReader.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File__runtime_ArtifactBackedDbtProjectBundleReader_ts_4ac7a7b2: {
  label: "ArtifactBackedDbtProjectBundleReader.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_assertDbtProjectBundleBinding_ts_c4c61a3d: {
  label: "assertDbtProjectBundleBinding.ts"
}
`;case`artifactsFiles_artifactReadIntegrity`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_ArtifactReadError_ts_9ad1a6de: {
  label: "ArtifactReadError.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_readArtifactBytes_ts_502618ef: {
  label: "readArtifactBytes.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_validateArtifactIntegrity_ts_ec4c4fd1: {
  label: "validateArtifactIntegrity.ts"
}
`;case`artifactsFiles_compiledCode`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957Dir_src_compiledCode_adapters_1eddf0a2File_edCode_adapters_FileSystemCompiledCodeStorage_ts_7cf12581: {
  label: "FileSystemCompiledCodeStorage.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957Dir_src_compiledCode_adapters_1eddf0a2File_iledCode_adapters_InMemoryCompiledCodeStorage_ts_cb73138e: {
  label: "InMemoryCompiledCodeStorage.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957Dir_src_compiledCode_adapters_1eddf0a2File_ompiledCode_adapters_MinioCompiledCodeStorage_ts_e7bfeaa9: {
  label: "MinioCompiledCodeStorage.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957Dir_src_compiledCode_adapters_1eddf0a2File_compiledCode_adapters_NoopCompiledCodeStorage_ts_4e9e8e48: {
  label: "NoopCompiledCodeStorage.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957Dir_src_compiledCode_adapters_1eddf0a2File_c_compiledCode_adapters_S3CompiledCodeStorage_ts_0dcc5392: {
  label: "S3CompiledCodeStorage.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957File_src_compiledCode_attachCompiledCodeRefs_ts_ad89a9f1: {
  label: "attachCompiledCodeRefs.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957File_src_compiledCode_sha256_ts_e87caec7: {
  label: "sha256.ts"
}
ArtifactsSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_ICompiledCodeStorage_ts_c3084ffd: {
  label: "ICompiledCodeStorage.ts"
}
`;case`cliBoundary`:return`direction: right

CliModelSourceEvidence: {
  label: "Source evidence"
}
CliModelMetadataSurface: {
  label: "CLI validation metadata"
}
CliModelContractValidation: {
  label: "Contract validation script"
}
CliModelGoldenPaths: {
  label: "Golden-path runner"
}

CliModelMetadataSurface -> CliModelContractValidation: "declares validation command"
CliModelMetadataSurface -> CliModelGoldenPaths: "declares golden-path command"
`;case`cliSourceInventory`:return`direction: down

CliSource: {
  label: "CLI source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 1 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 1 files"
  }
  File_compare-hashes_cjs_1b5f2875: {
    label: "compare-hashes.cjs"
  }
  File_db-migrate_cjs_1ee1966c: {
    label: "db-migrate.cjs"
  }
  File_enable-workflow_sh_8e2d703e: {
    label: "enable-workflow.sh"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_run-golden-paths_cjs_ed42d141: {
    label: "run-golden-paths.cjs"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_validate-contracts_cjs_3da4b466: {
    label: "validate-contracts.cjs"
  }
}
`;case`cliFiles_metadata`:return`direction: down

CliSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`cliFiles_contractValidation`:return`direction: down

CliSourceFile_validate-contracts_cjs_3da4b466: {
  label: "validate-contracts.cjs"
}
`;case`cliFiles_goldenPaths`:return`direction: down

CliSourceFile_run-golden-paths_cjs_ed42d141: {
  label: "run-golden-paths.cjs"
}
`;case`componentClassificationCoverage`:return`direction: right

ClassificationCoverageCoverage_contracts: {
  label: "Contracts — 94.5%"
}
ClassificationCoverageCoverage_crypto: {
  label: "Crypto — 100%"
}
ClassificationCoverageCoverage_dsl: {
  label: "DSL — 100%"
}
ClassificationCoverageCoverage_cli: {
  label: "CLI — 100%"
}
ClassificationCoverageCoverage_planner: {
  label: "Planner — 89.3%"
}
ClassificationCoverageCoverage_plan-verifier: {
  label: "Plan Verifier — 100%"
}
ClassificationCoverageCoverage_plan-interpreter: {
  label: "Plan Interpreter — 100%"
}
ClassificationCoverageCoverage_engine: {
  label: "Engine — 22.8%"
}
ClassificationCoverageCoverage_run-domain: {
  label: "Run Domain — 100%"
}
ClassificationCoverageCoverage_artifacts: {
  label: "@dvt/artifacts — 100%"
}
ClassificationCoverageCoverage_state-store: {
  label: "State Store — 100%"
}
ClassificationCoverageCoverage_delivery: {
  label: "Delivery — 100%"
}
ClassificationCoverageCoverage_observability: {
  label: "Observability — 100%"
}
ClassificationCoverageCoverage_observability-otel: {
  label: "Observability OTel — 100%"
}
ClassificationCoverageCoverage_traceability-service: {
  label: "Traceability Service — 100%"
}
ClassificationCoverageCoverage_adapter-temporal: {
  label: "Temporal Adapter — 97.7%"
}
ClassificationCoverageCoverage_adapter-postgres: {
  label: "Postgres Adapter — 56.7%"
}
ClassificationCoverageCoverage_temporal-dbt-plugin: {
  label: "Temporal dbt Plugin — 100%"
}
ClassificationCoverageCoverage_temporal-http-json-plugin: {
  label: "Temporal HTTP JSON Plugin — 100%"
}
ClassificationCoverageCoverage_temporal-object-file-postgres-plugin: {
  label: "Temporal Object File Postgres Plugin — 100%"
}
ClassificationCoverageCoverage_api: {
  label: "API — 100%"
}
ClassificationCoverageCoverage_temporal-worker: {
  label: "Temporal Worker — 100%"
}
ClassificationCoverageCoverage_outbox-worker: {
  label: "Outbox Worker — 100%"
}
ClassificationCoverageCoverage_projector-worker: {
  label: "Projector Worker — 100%"
}
ClassificationCoverageCoverage_lineage-worker: {
  label: "Lineage Worker — 100%"
}
ClassificationCoverageCoverage_web: {
  label: "Web — 94.8%"
}
`;case`unmappedProduction_contracts`:return`direction: down

ContractsSourceDir_src_f27fede2File_src_validation_ts_8ace9416: {
  label: "validation.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_validation_134957c1File_src_validation_core_ts_f4800562: {
  label: "core.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_validation_134957c1File_src_validation_events_ts_bf258135: {
  label: "events.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_validation_134957c1File_src_validation_planner_ts_9e9379ce: {
  label: "planner.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_validation_134957c1File_src_validation_runtime_ts_3e1c00c2: {
  label: "runtime.ts"
}
ContractsSourceDir_src_f27fede2File_src_workflows_ts_97455e14: {
  label: "workflows.ts"
}
`;case`unmappedProduction_planner`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_errors_ts_24f92960: {
  label: "errors.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_manifest_ts_b684950d: {
  label: "manifest.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_types_ts_4eb94e03: {
  label: "types.ts"
}
`;case`unmappedProduction_engine`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_adapters_68aa84b0File_src_adapters_CircuitBreakingProviderAdapter_ts_b78f8b4f: {
  label: "CircuitBreakingProviderAdapter.ts"
}
EngineSourceDir_src_f27fede2Dir_src_adapters_68aa84b0Dir_src_adapters_inMemory_445778a0File_src_adapters_inMemory_InMemoryProviderAdapter_ts_c81e7079: {
  label: "InMemoryProviderAdapter.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_RecoverRunApplicationService_ts_db4fc95e: {
  label: "RecoverRunApplicationService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_providerSelection_ts_51666f4e: {
  label: "providerSelection.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_IRunEnrichmentService_v1_ts_b4deac74: {
  label: "IRunEnrichmentService.v1.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_PlanAdmissionPolicy_ts_df487504: {
  label: "PlanAdmissionPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_PlanSchemaVersionPolicy_ts_05d008ec: {
  label: "PlanSchemaVersionPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_ExecutionPlan_v1_ts_443e23bd: {
  label: "ExecutionPlan.v1.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_ExecutionSemantics_v1_ts_e95395db: {
  label: "ExecutionSemantics.v1.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_IProvider_v1_ts_1e849a42: {
  label: "IProvider.v1.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_IRunEnrichmentService_v1_ts_20da19e6: {
  label: "IRunEnrichmentService.v1.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_RunEvents_v1_ts_ad473abd: {
  label: "RunEvents.v1.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_index_ts_9ef8347a: {
  label: "index.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_errors_ts_7ba50060: {
  label: "errors.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_errors_16f18706File_src_contracts_errors_adapterErrors_ts_d74418c6: {
  label: "adapterErrors.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_errors_16f18706File_src_contracts_errors_baseError_ts_4fa5f1fb: {
  label: "baseError.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_errors_16f18706File_src_contracts_errors_errorCodes_ts_7368bf0f: {
  label: "errorCodes.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_errors_16f18706File_src_contracts_errors_errorMessages_ts_c34688f8: {
  label: "errorMessages.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_errors_16f18706File_src_contracts_errors_planErrors_ts_675f5539: {
  label: "planErrors.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_errors_16f18706File_src_contracts_errors_runErrors_ts_d90ab0bf: {
  label: "runErrors.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_executionPlan_ts_269451bf: {
  label: "executionPlan.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_index_ts_97a6fd24: {
  label: "index.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_intentErrors_ts_1e9c5145: {
  label: "intentErrors.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_planUriPolicyViolation_ts_335587bf: {
  label: "planUriPolicyViolation.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_runEvents_ts_23bdee5e: {
  label: "runEvents.ts"
}
EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_types_ts_72675abd: {
  label: "types.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_SnapshotProjector_ts_a7d85114: {
  label: "SnapshotProjector.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_WorkflowEngineCoreService_ts_7e398291: {
  label: "WorkflowEngineCoreService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_buildWorkflowEngineFacade_ts_f52716f9: {
  label: "buildWorkflowEngineFacade.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_idempotency_ts_47be40eb: {
  label: "idempotency.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_index_ts_55626df4: {
  label: "index.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeDir_src_core_lifecycle_4e42014fFile_src_core_lifecycle_StartRunTraceContext_ts_1bc48a58: {
  label: "StartRunTraceContext.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeDir_src_core_lifecycle_4e42014fFile_src_core_lifecycle_coreDomainConstants_ts_397689dd: {
  label: "coreDomainConstants.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeDir_src_core_lifecycle_4e42014fFile_src_core_lifecycle_coreRuntime_ts_3fb6d715: {
  label: "coreRuntime.ts"
}
EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_types_ts_179d8ca6: {
  label: "types.ts"
}
EngineSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_IRunCommandService_ts_ebcd98e2: {
  label: "IRunCommandService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_IRunControlService_ts_47d9cb15: {
  label: "IRunControlService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_IRunHealthService_ts_bf00132b: {
  label: "IRunHealthService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_IRunRecoveryService_ts_919d40ec: {
  label: "IRunRecoveryService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_IRunSignalService_ts_07eb4ed8: {
  label: "IRunSignalService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_IRunStatusQueryService_ts_b14f83c9: {
  label: "IRunStatusQueryService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_startRunIntentPolicy_ts_f73a6fe7: {
  label: "startRunIntentPolicy.ts"
}
EngineSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
EngineSourceDir_src_f27fede2Dir_src_metrics_5c1b9425File_src_metrics_IMetricsCollector_ts_deb3566b: {
  label: "IMetricsCollector.ts"
}
EngineSourceDir_src_f27fede2Dir_src_outbox_799a2396File_src_outbox_IOutboxRateLimiter_ts_53b76a03: {
  label: "IOutboxRateLimiter.ts"
}
EngineSourceDir_src_f27fede2Dir_src_outbox_799a2396File_src_outbox_TokenBucketRateLimiter_ts_62d3ca33: {
  label: "TokenBucketRateLimiter.ts"
}
EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IAuthorizer_ts_a2dd49c6: {
  label: "IAuthorizer.ts"
}
EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IProjector_ts_74f0dbab: {
  label: "IProjector.ts"
}
EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IRunAccessPolicy_ts_17d5d150: {
  label: "IRunAccessPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IRunExecutionContextBindingPolicy_ts_b693ce6e: {
  label: "IRunExecutionContextBindingPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IRunExecutionContextResolver_ts_85934ea4: {
  label: "IRunExecutionContextResolver.ts"
}
EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IRunMaintenanceService_ts_78cf91d7: {
  label: "IRunMaintenanceService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IRunSnapshotStalenessQuery_ts_7931d2e2: {
  label: "IRunSnapshotStalenessQuery.ts"
}
EngineSourceDir_src_f27fede2File_src_runtime_ts_ccd8a8fa: {
  label: "runtime.ts"
}
EngineSourceDir_src_f27fede2Dir_src_security_5dba450fFile_src_security_AuthorizationError_ts_b5702789: {
  label: "AuthorizationError.ts"
}
EngineSourceDir_src_f27fede2Dir_src_security_5dba450fFile_src_security_RunAccessPolicy_ts_98a04f62: {
  label: "RunAccessPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_security_5dba450fFile_src_security_authorizer_ts_105fb5a1: {
  label: "authorizer.ts"
}
EngineSourceDir_src_f27fede2Dir_src_security_5dba450fFile_src_security_hostRiskClassifier_ts_004a46c8: {
  label: "hostRiskClassifier.ts"
}
EngineSourceDir_src_f27fede2Dir_src_security_5dba450fFile_src_security_planIntegrity_ts_301f10ad: {
  label: "planIntegrity.ts"
}
EngineSourceDir_src_f27fede2Dir_src_security_5dba450fFile_src_security_planRefPolicy_ts_6134c46b: {
  label: "planRefPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_security_5dba450fFile_src_security_planRefPolicyRules_ts_238e2a28: {
  label: "planRefPolicyRules.ts"
}
EngineSourceDir_src_f27fede2Dir_src_security_5dba450fFile_src_security_planUri_ts_2424d62e: {
  label: "planUri.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679File_src_services_RunEnrichmentService_ts_2bf6c72b: {
  label: "RunEnrichmentService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679File_src_services_RunHealthService_ts_71f72df7: {
  label: "RunHealthService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679File_src_services_RunMaintenanceService_ts_4d4b2c8b: {
  label: "RunMaintenanceService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679File_src_services_RunStatusQueryService_ts_9f47ed48: {
  label: "RunStatusQueryService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runControl_ab6e7414File_src_services_runControl_RunCommandService_ts_9ce60001: {
  label: "RunCommandService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runControl_ab6e7414File_src_services_runControl_RunSignalService_ts_4c961101: {
  label: "RunSignalService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902File_ntenance_DispatchedIntentReconciliationPolicy_ts_b8ae0d06: {
  label: "DispatchedIntentReconciliationPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902File_Maintenance_PendingIntentReconciliationPolicy_ts_b7f898c3: {
  label: "PendingIntentReconciliationPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902File_rvices_runMaintenance_RunMaintenanceContracts_ts_24fc243a: {
  label: "RunMaintenanceContracts.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902File__runMaintenance_RunMaintenanceDomainConstants_ts_1a3aa192: {
  label: "RunMaintenanceDomainConstants.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902File_ces_runMaintenance_RunMaintenanceEventFactory_ts_b002a368: {
  label: "RunMaintenanceEventFactory.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902File_Maintenance_RunMaintenanceObservabilityFacade_ts_4805e1c2: {
  label: "RunMaintenanceObservabilityFacade.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902File_intenance_RunMaintenanceOrphanedIntentService_ts_f1b52520: {
  label: "RunMaintenanceOrphanedIntentService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902File__runMaintenance_RunMaintenanceStuckRunService_ts_ab1e0fe8: {
  label: "RunMaintenanceStuckRunService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_signal_1e641b45File_src_services_signal_SignalTransitionGuard_ts_30a6ed95: {
  label: "SignalTransitionGuard.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_InMemoryOutboxState_ts_04e5ddb9: {
  label: "InMemoryOutboxState.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_InMemoryRunStateAdminSupport_ts_820e3139: {
  label: "InMemoryRunStateAdminSupport.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_InMemoryRunStateCore_ts_a6160ade: {
  label: "InMemoryRunStateCore.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_InMemoryRunStateReadSupport_ts_75997ca5: {
  label: "InMemoryRunStateReadSupport.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_InMemoryRunStateSnapshotSupport_ts_db5faefd: {
  label: "InMemoryRunStateSnapshotSupport.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_InMemoryRunStateStore_ts_e63637fb: {
  label: "InMemoryRunStateStore.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_InMemoryStartRunIntentStore_ts_2245c39f: {
  label: "InMemoryStartRunIntentStore.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_InMemoryTxStore_ts_7a026282: {
  label: "InMemoryTxStore.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_outboxSharding_ts_fa7e7ded: {
  label: "outboxSharding.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_retryLineagePolicy_ts_c25cd93f: {
  label: "retryLineagePolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_runEventWritePolicy_ts_737a1d53: {
  label: "runEventWritePolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4bFile_src_state_snapshotStaleness_ts_dc89091e: {
  label: "snapshotStaleness.ts"
}
EngineSourceDir_src_f27fede2File_src_testing_ts_25c1ccde: {
  label: "testing.ts"
}
EngineSourceDir_src_f27fede2Dir_src_types_7f0be21aFile_src_types_index_ts_cd7a0a5e: {
  label: "index.ts"
}
EngineSourceDir_src_f27fede2Dir_src_types_7f0be21aFile_src_types_types_ts_ca15b85b: {
  label: "types.ts"
}
EngineSourceDir_src_f27fede2Dir_src_utils_e236f4b4File_src_utils_clock_ts_ced0945e: {
  label: "clock.ts"
}
EngineSourceDir_src_f27fede2Dir_src_utils_e236f4b4File_src_utils_errorUtils_ts_45233443: {
  label: "errorUtils.ts"
}
EngineSourceDir_src_f27fede2Dir_src_workers_10de5b13File_src_workers_IntentReconcilerWorker_ts_a96c73fc: {
  label: "IntentReconcilerWorker.ts"
}
`;case`unmappedProduction_adapter-temporal`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2File_src_engine-types_ts_e3103f80: {
  label: "engine-types.ts"
}
`;case`unmappedProduction_adapter-postgres`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2File_src_PostgresAdapterClientSession_ts_102fe4ea: {
  label: "PostgresAdapterClientSession.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresAdapterClientSessionConstants_ts_1ba3ea3e: {
  label: "PostgresAdapterClientSessionConstants.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresAdapterClientSessionSql_ts_27d40a34: {
  label: "PostgresAdapterClientSessionSql.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresAdapterConstants_ts_5838cc4d: {
  label: "PostgresAdapterConstants.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresLineageOutboxStoreSql_ts_7dd11ee9: {
  label: "PostgresLineageOutboxStoreSql.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresMaintenanceAccess_ts_7d2db232: {
  label: "PostgresMaintenanceAccess.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunEventStoreSql_ts_3040cfda: {
  label: "PostgresRunEventStoreSql.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunStateCoordinatorConstants_ts_7c7584ad: {
  label: "PostgresRunStateCoordinatorConstants.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresRunStateStoreAdapter_ts_e59624b9: {
  label: "PostgresRunStateStoreAdapter.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresSchemaManagerSql_ts_494faa83: {
  label: "PostgresSchemaManagerSql.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresServiceAccessCapability_ts_a41c3465: {
  label: "PostgresServiceAccessCapability.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresSnapshotQueueAdapter_ts_e344ca57: {
  label: "PostgresSnapshotQueueAdapter.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresSnapshotStalenessQuery_ts_0b46ad42: {
  label: "PostgresSnapshotStalenessQuery.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresSnapshotStalenessQuerySql_ts_1124f977: {
  label: "PostgresSnapshotStalenessQuerySql.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresSnapshotWorkQueue_ts_b03dc097: {
  label: "PostgresSnapshotWorkQueue.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresStartRunIntentStore_ts_a1356a74: {
  label: "PostgresStartRunIntentStore.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresStateStoreAdminAdapter_ts_d2cf00e6: {
  label: "PostgresStateStoreAdminAdapter.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresStateStoreRuntime_ts_d51ed051: {
  label: "PostgresStateStoreRuntime.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresStateStoreRuntimeComposer_ts_68e7f00a: {
  label: "PostgresStateStoreRuntimeComposer.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_PostgresTenantIsolationPolicy_ts_5adb1022: {
  label: "PostgresTenantIsolationPolicy.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_RunEventWriteRepository_ts_a3e160df: {
  label: "RunEventWriteRepository.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_StartRunIntentSchemaManager_ts_d008daf8: {
  label: "StartRunIntentSchemaManager.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_lineageOutboxStorePolicy_ts_41c28a57: {
  label: "lineageOutboxStorePolicy.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_runEventEnvelopePolicy_ts_1beadc8a: {
  label: "runEventEnvelopePolicy.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_runEventStoreErrors_ts_063c3a35: {
  label: "runEventStoreErrors.ts"
}
PostgresAdapterSourceDir_src_f27fede2File_src_sqlUtils_ts_4ece9507: {
  label: "sqlUtils.ts"
}
`;case`unmappedProduction_web`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_AppRouteErrorBoundary_tsx_eb006a71: {
  label: "AppRouteErrorBoundary.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_Root_bootstrapRoute_test_support_tsx_4a0df006: {
  label: "Root.bootstrapRoute.test.support.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_Root_shellChrome_test_support_ts_5061d169: {
  label: "Root.shellChrome.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_Root_test_support_tsx_10280d55: {
  label: "Root.test.support.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_appRoute_test_support_ts_9fc93336: {
  label: "appRoute.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_appRouteErrorBoundaryCopy_ts_9e369e12: {
  label: "appRouteErrorBoundaryCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_capabilities_ts_a540cdba: {
  label: "capabilities.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_cost_ts_406c5280: {
  label: "cost.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_dbtProjectGraph_ts_53349d7b: {
  label: "dbtProjectGraph.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_dbtProjectImport_ts_89c0e6c3: {
  label: "dbtProjectImport.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_dbtYamlDescriptionEdit_ts_376e3e2f: {
  label: "dbtYamlDescriptionEdit.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_frontendOperability_ts_722d0b41: {
  label: "frontendOperability.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_graphDbtModelCompilation_ts_0c0c8654: {
  label: "graphDbtModelCompilation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_pp_ports_graphDbtWorkspaceArtifactPublication_ts_a489ab38: {
  label: "graphDbtWorkspaceArtifactPublication.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_index_ts_5f7c34f0: {
  label: "index.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_plans_ts_03778059: {
  label: "plans.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_runs_ts_0377ef3e: {
  label: "runs.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_sessionContext_ts_285b3029: {
  label: "sessionContext.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_shellFeedback_ts_4cdfdf2c: {
  label: "shellFeedback.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_workspace_ts_c42ae6c8: {
  label: "workspace.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_workspaceGraphDraftAuthoring_ts_e1818046: {
  label: "workspaceGraphDraftAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3File_src_app_ports_workspaceScopeSelection_ts_32d6bc25: {
  label: "workspaceScopeSelection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_rootOperabilityModel_ts_4111fad9: {
  label: "rootOperabilityModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_routerFlushSync_ts_005ef548: {
  label: "routerFlushSync.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_routes_e22c046bFile_p_routes_internalAlphaRouteGate_test_fixtures_ts_c899b067: {
  label: "internalAlphaRouteGate.test.fixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_testing_b80bc5efFile_src_app_testing_contractTestUtils_ts_81f76ba9: {
  label: "contractTestUtils.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_types_a2447295File_src_app_types_canonical_ts_cca3b270: {
  label: "canonical.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_types_a2447295File_src_app_types_canonicalGuards_ts_e7680bbb: {
  label: "canonicalGuards.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_types_a2447295File_src_app_types_canvasExecutionSelection_ts_b891869a: {
  label: "canvasExecutionSelection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_types_a2447295File_rc_app_types_canvasExecutionSelectionRecovery_ts_9223b7e4: {
  label: "canvasExecutionSelectionRecovery.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_types_a2447295File_src_app_types_dbt_ts_de47d45c: {
  label: "dbt.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_types_a2447295File_src_app_types_engine_ts_a9ae9124: {
  label: "engine.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_types_a2447295File_src_app_types_plans_ts_a5b82baa: {
  label: "plans.ts"
}
WebSourceDir_src_f27fede2Dir_src_styles_1238c57dFile_src_styles_fonts_css_1c559736: {
  label: "fonts.css"
}
WebSourceDir_src_f27fede2Dir_src_styles_1238c57dFile_src_styles_index_css_7a1236ac: {
  label: "index.css"
}
WebSourceDir_src_f27fede2Dir_src_styles_1238c57dFile_src_styles_tailwind_css_525cdc3b: {
  label: "tailwind.css"
}
WebSourceDir_src_f27fede2Dir_src_styles_1238c57dFile_src_styles_theme_css_02dfd9ec: {
  label: "theme.css"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_appServicesTestDoubles_ts_b87b7813: {
  label: "appServicesTestDoubles.ts"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474Dir_src_testing_fixtures_fe43ee25File_src_testing_fixtures_mockDbtData_ts_18750e2d: {
  label: "mockDbtData.ts"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_plansPortDoubles_ts_e2c8b6d8: {
  label: "plansPortDoubles.ts"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_reactQueryHarness_tsx_d1fa0e9f: {
  label: "reactQueryHarness.tsx"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_runsPortDoubles_ts_09c928a4: {
  label: "runsPortDoubles.ts"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_sourceImportTestFixtures_ts_b61cdac2: {
  label: "sourceImportTestFixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_vitestSuites_architecture_support_ts_2d1b41d0: {
  label: "vitestSuites.architecture.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_sting_workspaceGraphDraftAuthoringPortDoubles_ts_d3bbd51b: {
  label: "workspaceGraphDraftAuthoringPortDoubles.ts"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_ting_workspaceGraphDraftAuthoringStoreDoubles_ts_417a500b: {
  label: "workspaceGraphDraftAuthoringStoreDoubles.ts"
}
WebSourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_workspacePortDoubles_ts_946fd677: {
  label: "workspacePortDoubles.ts"
}
`;case`workspaceDependencyLandscape`:return`direction: right

CliModel: {
  label: "@dvt/cli"
}
ApiModel: {
  label: "apps/api"
}
TemporalWorkerModel: {
  label: "apps/temporal-worker"
}
OutboxWorkerModel: {
  label: "apps/outbox-worker"
}
ProjectorWorkerModel: {
  label: "apps/projector-worker"
}
LineageWorkerModel: {
  label: "apps/lineage-worker"
}
WebModel: {
  label: "apps/web"
}
PlanVerifierModel: {
  label: "@dvt/plan-verifier"
}
ObservabilityOtelModel: {
  label: "@dvt/observability-otel"
}
TemporalHttpJsonPluginModel: {
  label: "@dvt/temporal-http-json-plugin"
}
TemporalObjectFilePostgresPluginModel: {
  label: "@dvt/temporal-object-file-postgres-plugin"
}
PostgresAdapterModel: {
  label: "@dvt/adapter-postgres"
}
TemporalAdapterModel: {
  label: "@dvt/adapter-temporal"
}
PlannerModel: {
  label: "@dvt/planner"
}
StateStoreModel: {
  label: "@dvt/state-store"
}
TraceabilityModel: {
  label: "@dvt/traceability-service"
}
DslModel: {
  label: "@dvt/dsl"
}
PlanInterpreterModel: {
  label: "@dvt/plan-interpreter"
}
TemporalDbtPluginModel: {
  label: "@dvt/temporal-dbt-plugin"
}
EngineModel: {
  label: "@dvt/engine"
}
RunDomainModel: {
  label: "@dvt/run-domain"
}
ArtifactsModel: {
  label: "@dvt/artifacts"
}
DeliveryModel: {
  label: "@dvt/delivery"
}
ObservabilityModel: {
  label: "@dvt/observability"
}
ContractsModel: {
  label: "@dvt/contracts"
}
CryptoModel: {
  label: "@dvt/crypto"
}

ContractsModel -> CryptoModel: "[...]"
DslModel -> ContractsModel: "workspace dependency: @dvt/contracts"
CliModel -> ContractsModel: "workspace dependency: @dvt/contracts"
CliModel -> CryptoModel: "[...]"
PlannerModel -> ContractsModel: "[...]"
PlannerModel -> CryptoModel: "[...]"
PlanVerifierModel -> ContractsModel: "[...]"
PlanVerifierModel -> CryptoModel: "[...]"
CliModel -> EngineModel: "workspace dependency: @dvt/engine"
EngineModel -> ContractsModel: "[...]"
EngineModel -> CryptoModel: "[...]"
EngineModel -> RunDomainModel: "[...]"
RunDomainModel -> ContractsModel: "[...]"
PlannerModel -> ArtifactsModel: "[...]"
EngineModel -> ArtifactsModel: "[...]"
ArtifactsModel -> ContractsModel: "[...]"
StateStoreModel -> ContractsModel: "[...]"
StateStoreModel -> CryptoModel: "[...]"
StateStoreModel -> EngineModel: "[...]"
EngineModel -> DeliveryModel: "[...]"
DeliveryModel -> ContractsModel: "[...]"
EngineModel -> ObservabilityModel: "[...]"
ObservabilityOtelModel -> ObservabilityModel: "[...]"
TraceabilityModel -> ContractsModel: "[...]"
TraceabilityModel -> ArtifactsModel: "[...]"
TraceabilityModel -> DeliveryModel: "[...]"
TemporalAdapterModel -> ContractsModel: "[...]"
TemporalAdapterModel -> CryptoModel: "[...]"
TemporalAdapterModel -> DslModel: "[...]"
TemporalAdapterModel -> PlanInterpreterModel: "[...]"
TemporalAdapterModel -> EngineModel: "[...]"
TemporalAdapterModel -> ArtifactsModel: "[...]"
TemporalAdapterModel -> DeliveryModel: "[...]"
TemporalAdapterModel -> ObservabilityModel: "[...]"
PostgresAdapterModel -> ContractsModel: "[...]"
PostgresAdapterModel -> CryptoModel: "[...]"
PostgresAdapterModel -> PlannerModel: "workspace dependency: @dvt/planner"
PostgresAdapterModel -> EngineModel: "[...]"
PostgresAdapterModel -> RunDomainModel: "[...]"
PostgresAdapterModel -> ArtifactsModel: "[...]"
PostgresAdapterModel -> StateStoreModel: "[...]"
PostgresAdapterModel -> DeliveryModel: "[...]"
PostgresAdapterModel -> TraceabilityModel: "[...]"
TemporalAdapterModel -> TemporalDbtPluginModel: "observed imports: 4 test"
TemporalDbtPluginModel -> ContractsModel: "[...]"
TemporalDbtPluginModel -> EngineModel: "[...]"
TemporalDbtPluginModel -> ArtifactsModel: "[...]"
TemporalDbtPluginModel -> TemporalAdapterModel: "[...]"
TemporalHttpJsonPluginModel -> ContractsModel: "[...]"
TemporalHttpJsonPluginModel -> ArtifactsModel: "[...]"
TemporalHttpJsonPluginModel -> TemporalAdapterModel: "[...]"
TemporalObjectFilePostgresPluginModel -> ContractsModel: "[...]"
TemporalObjectFilePostgresPluginModel -> TemporalAdapterModel: "[...]"
ApiModel -> ContractsModel: "[...]"
ApiModel -> CryptoModel: "[...]"
ApiModel -> PlannerModel: "[...]"
ApiModel -> PlanVerifierModel: "[...]"
ApiModel -> EngineModel: "[...]"
ApiModel -> RunDomainModel: "[...]"
ApiModel -> ArtifactsModel: "[...]"
ApiModel -> DeliveryModel: "[...]"
ApiModel -> ObservabilityModel: "[...]"
ApiModel -> ObservabilityOtelModel: "[...]"
ApiModel -> TemporalAdapterModel: "[...]"
ApiModel -> PostgresAdapterModel: "[...]"
ApiModel -> TemporalDbtPluginModel: "[...]"
TemporalWorkerModel -> ContractsModel: "[...]"
TemporalWorkerModel -> CryptoModel: "observed imports: 3 test"
TemporalWorkerModel -> EngineModel: "[...]"
TemporalWorkerModel -> ArtifactsModel: "[...]"
TemporalWorkerModel -> TemporalAdapterModel: "[...]"
TemporalWorkerModel -> PostgresAdapterModel: "[...]"
TemporalWorkerModel -> TemporalDbtPluginModel: "[...]"
TemporalWorkerModel -> TemporalHttpJsonPluginModel: "[...]"
TemporalWorkerModel -> TemporalObjectFilePostgresPluginModel: "[...]"
OutboxWorkerModel -> ContractsModel: "[...]"
OutboxWorkerModel -> StateStoreModel: "[...]"
OutboxWorkerModel -> DeliveryModel: "[...]"
OutboxWorkerModel -> PostgresAdapterModel: "[...]"
ProjectorWorkerModel -> DeliveryModel: "[...]"
ProjectorWorkerModel -> PostgresAdapterModel: "[...]"
LineageWorkerModel -> ContractsModel: "observed imports: 2 type-only, 2 test, MANIFEST DRIFT: none"
LineageWorkerModel -> TraceabilityModel: "[...]"
LineageWorkerModel -> PostgresAdapterModel: "[...]"
WebModel -> ContractsModel: "[...]"
WebModel -> CryptoModel: "[...]"
`;case`observedImportLandscape`:return`direction: right

CliModel: {
  label: "@dvt/cli"
}
ApiModel: {
  label: "apps/api"
}
TemporalWorkerModel: {
  label: "apps/temporal-worker"
}
OutboxWorkerModel: {
  label: "apps/outbox-worker"
}
ProjectorWorkerModel: {
  label: "apps/projector-worker"
}
LineageWorkerModel: {
  label: "apps/lineage-worker"
}
WebModel: {
  label: "apps/web"
}
PlanVerifierModel: {
  label: "@dvt/plan-verifier"
}
ObservabilityOtelModel: {
  label: "@dvt/observability-otel"
}
TemporalHttpJsonPluginModel: {
  label: "@dvt/temporal-http-json-plugin"
}
TemporalObjectFilePostgresPluginModel: {
  label: "@dvt/temporal-object-file-postgres-plugin"
}
PostgresAdapterModel: {
  label: "@dvt/adapter-postgres"
}
TemporalAdapterModel: {
  label: "@dvt/adapter-temporal"
}
PlannerModel: {
  label: "@dvt/planner"
}
StateStoreModel: {
  label: "@dvt/state-store"
}
TraceabilityModel: {
  label: "@dvt/traceability-service"
}
DslModel: {
  label: "@dvt/dsl"
}
PlanInterpreterModel: {
  label: "@dvt/plan-interpreter"
}
TemporalDbtPluginModel: {
  label: "@dvt/temporal-dbt-plugin"
}
EngineModel: {
  label: "@dvt/engine"
}
RunDomainModel: {
  label: "@dvt/run-domain"
}
ArtifactsModel: {
  label: "@dvt/artifacts"
}
DeliveryModel: {
  label: "@dvt/delivery"
}
ObservabilityModel: {
  label: "@dvt/observability"
}
ContractsModel: {
  label: "@dvt/contracts"
}
CryptoModel: {
  label: "@dvt/crypto"
}

ContractsModel -> CryptoModel: "[...]"
DslModel -> ContractsModel: "workspace dependency: @dvt/contracts"
CliModel -> ContractsModel: "workspace dependency: @dvt/contracts"
CliModel -> CryptoModel: "[...]"
PlannerModel -> ContractsModel: "[...]"
PlannerModel -> CryptoModel: "[...]"
PlanVerifierModel -> ContractsModel: "[...]"
PlanVerifierModel -> CryptoModel: "[...]"
CliModel -> EngineModel: "workspace dependency: @dvt/engine"
EngineModel -> ContractsModel: "[...]"
EngineModel -> CryptoModel: "[...]"
EngineModel -> RunDomainModel: "[...]"
RunDomainModel -> ContractsModel: "[...]"
PlannerModel -> ArtifactsModel: "[...]"
EngineModel -> ArtifactsModel: "[...]"
ArtifactsModel -> ContractsModel: "[...]"
StateStoreModel -> ContractsModel: "[...]"
StateStoreModel -> CryptoModel: "[...]"
StateStoreModel -> EngineModel: "[...]"
EngineModel -> DeliveryModel: "[...]"
DeliveryModel -> ContractsModel: "[...]"
EngineModel -> ObservabilityModel: "[...]"
ObservabilityOtelModel -> ObservabilityModel: "[...]"
TraceabilityModel -> ContractsModel: "[...]"
TraceabilityModel -> ArtifactsModel: "[...]"
TraceabilityModel -> DeliveryModel: "[...]"
TemporalAdapterModel -> ContractsModel: "[...]"
TemporalAdapterModel -> CryptoModel: "[...]"
TemporalAdapterModel -> DslModel: "[...]"
TemporalAdapterModel -> PlanInterpreterModel: "[...]"
TemporalAdapterModel -> EngineModel: "[...]"
TemporalAdapterModel -> ArtifactsModel: "[...]"
TemporalAdapterModel -> DeliveryModel: "[...]"
TemporalAdapterModel -> ObservabilityModel: "[...]"
PostgresAdapterModel -> ContractsModel: "[...]"
PostgresAdapterModel -> CryptoModel: "[...]"
PostgresAdapterModel -> PlannerModel: "workspace dependency: @dvt/planner"
PostgresAdapterModel -> EngineModel: "[...]"
PostgresAdapterModel -> RunDomainModel: "[...]"
PostgresAdapterModel -> ArtifactsModel: "[...]"
PostgresAdapterModel -> StateStoreModel: "[...]"
PostgresAdapterModel -> DeliveryModel: "[...]"
PostgresAdapterModel -> TraceabilityModel: "[...]"
TemporalAdapterModel -> TemporalDbtPluginModel: "observed imports: 4 test"
TemporalDbtPluginModel -> ContractsModel: "[...]"
TemporalDbtPluginModel -> EngineModel: "[...]"
TemporalDbtPluginModel -> ArtifactsModel: "[...]"
TemporalDbtPluginModel -> TemporalAdapterModel: "[...]"
TemporalHttpJsonPluginModel -> ContractsModel: "[...]"
TemporalHttpJsonPluginModel -> ArtifactsModel: "[...]"
TemporalHttpJsonPluginModel -> TemporalAdapterModel: "[...]"
TemporalObjectFilePostgresPluginModel -> ContractsModel: "[...]"
TemporalObjectFilePostgresPluginModel -> TemporalAdapterModel: "[...]"
ApiModel -> ContractsModel: "[...]"
ApiModel -> CryptoModel: "[...]"
ApiModel -> PlannerModel: "[...]"
ApiModel -> PlanVerifierModel: "[...]"
ApiModel -> EngineModel: "[...]"
ApiModel -> RunDomainModel: "[...]"
ApiModel -> ArtifactsModel: "[...]"
ApiModel -> DeliveryModel: "[...]"
ApiModel -> ObservabilityModel: "[...]"
ApiModel -> ObservabilityOtelModel: "[...]"
ApiModel -> TemporalAdapterModel: "[...]"
ApiModel -> PostgresAdapterModel: "[...]"
ApiModel -> TemporalDbtPluginModel: "[...]"
TemporalWorkerModel -> ContractsModel: "[...]"
TemporalWorkerModel -> CryptoModel: "observed imports: 3 test"
TemporalWorkerModel -> EngineModel: "[...]"
TemporalWorkerModel -> ArtifactsModel: "[...]"
TemporalWorkerModel -> TemporalAdapterModel: "[...]"
TemporalWorkerModel -> PostgresAdapterModel: "[...]"
TemporalWorkerModel -> TemporalDbtPluginModel: "[...]"
TemporalWorkerModel -> TemporalHttpJsonPluginModel: "[...]"
TemporalWorkerModel -> TemporalObjectFilePostgresPluginModel: "[...]"
OutboxWorkerModel -> ContractsModel: "[...]"
OutboxWorkerModel -> StateStoreModel: "[...]"
OutboxWorkerModel -> DeliveryModel: "[...]"
OutboxWorkerModel -> PostgresAdapterModel: "[...]"
ProjectorWorkerModel -> DeliveryModel: "[...]"
ProjectorWorkerModel -> PostgresAdapterModel: "[...]"
LineageWorkerModel -> ContractsModel: "observed imports: 2 type-only, 2 test, MANIFEST DRIFT: none"
LineageWorkerModel -> TraceabilityModel: "[...]"
LineageWorkerModel -> PostgresAdapterModel: "[...]"
WebModel -> ContractsModel: "[...]"
WebModel -> CryptoModel: "[...]"
`;case`contractsBoundary`:return`direction: right

ContractsModelSourceEvidence: {
  label: "Source evidence"
}
ContractsModelPublicBoundary: {
  label: "Contracts public boundary"
}
ContractsModelContractFamilies: {
  label: "Versioned contract families"
}
ContractsModelSubstrait: {
  label: "Substrait public boundary"
}
ContractsModelEngineCompat: {
  label: "Engine compatibility surface"
}
ContractsModelSchemaPacks: {
  label: "Schema packs"
}
ContractsModelStepRegistry: {
  label: "Step registry contracts"
}
ContractsModelTypes: {
  label: "Shared contract types"
}
ContractsModelUtils: {
  label: "Contract utilities"
}
ContractsModelErrors: {
  label: "Error contracts"
}

ContractsModelPublicBoundary -> ContractsModelContractFamilies: "exports contract families"
ContractsModelPublicBoundary -> ContractsModelSchemaPacks: "exports schemas"
ContractsModelPublicBoundary -> ContractsModelStepRegistry: "exports step registry"
ContractsModelPublicBoundary -> ContractsModelTypes: "exports shared types"
`;case`contractsSourceInventory`:return`direction: down

ContractsSource: {
  label: "Contracts source inventory — generated from Git"

  Dir_compat_d3c71389: {
    label: "compat/ — 1 files"
  }
  Dir_src_f27fede2: {
    label: "src/ — 110 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 68 files"
  }
  File_index_d_ts_f845ab41: {
    label: "index.d.ts"
  }
  File_index_js_a77b15c0: {
    label: "index.js"
  }
  File_index_ts_a123abce: {
    label: "index.ts"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`contractsFiles_publicBoundary`:return`direction: down

ContractsSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
ContractsSourceDir_src_f27fede2File_src_schemas_ts_d1567daf: {
  label: "schemas.ts"
}
`;case`contractsFiles_contractFamilies`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_dbt-project_8150add5File_rc_contracts_dbt-project_DbtDependencyEdit_v1_ts_7eee003a: {
  label: "DbtDependencyEdit.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_dbt-project_8150add5File_src_contracts_dbt-project_DbtProjectImport_v1_ts_6fc4ed86: {
  label: "DbtProjectImport.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_dbt-project_8150add5File_racts_dbt-project_DbtSelectedModelAnalysis_v1_ts_79ea202f: {
  label: "DbtSelectedModelAnalysis.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_dbt-project_8150add5File_ntracts_dbt-project_DbtYamlDescriptionEdit_v1_ts_b37517e4: {
  label: "DbtYamlDescriptionEdit.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_dbt-project_8150add5File_racts_dbt-project_GraphDbtModelCompilation_v1_ts_487e91dd: {
  label: "GraphDbtModelCompilation.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_dbt-project_8150add5File_oject_GraphDbtWorkspaceArtifactPublication_v1_ts_85bce14b: {
  label: "GraphDbtWorkspaceArtifactPublication.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_dbt-project_8150add5File_src_contracts_dbt-project_index_ts_618c6178: {
  label: "index.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_ExecutionSemantics_v1_ts_e95395db: {
  label: "ExecutionSemantics.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_IOutboxStorage_v1_ts_2045dbdc: {
  label: "IOutboxStorage.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_IWorkflowEngine_v1_ts_8df9d113: {
  label: "IWorkflowEngine.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_RunControlBoundary_v1_ts_3d1ff6a4: {
  label: "RunControlBoundary.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_RunEvents_v1_ts_ad473abd: {
  label: "RunEvents.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_RunExecutionContext_v1_ts_9066db84: {
  label: "RunExecutionContext.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_RunExecutionPolicy_v1_ts_4528af4b: {
  label: "RunExecutionPolicy.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_RunStateVocabulary_v1_ts_52118c95: {
  label: "RunStateVocabulary.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_SignalSemantics_v1_ts_b9cf4c3d: {
  label: "SignalSemantics.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8File_src_contracts_engine_StartRunBoundary_v1_ts_be812364: {
  label: "StartRunBoundary.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_ts_planner_CanvasAuthoringAuthorityBinding_v1_ts_34f8515e: {
  label: "CanvasAuthoringAuthorityBinding.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_acts_planner_CustomPolicyNamespaceRegistry_v1_ts_1b9eeaac: {
  label: "CustomPolicyNamespaceRegistry.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_ontracts_planner_DbtProjectGraphProjection_v1_ts_e13a21bf: {
  label: "DbtProjectGraphProjection.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_DbtStepSelector_v1_ts_7d7002b8: {
  label: "DbtStepSelector.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_ts_planner_DvtSubstraitCapabilityAdmission_v1_ts_77a6510d: {
  label: "DvtSubstraitCapabilityAdmission.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_acts_planner_DvtSubstraitCapabilityCatalog_v1_ts_a4b494d5: {
  label: "DvtSubstraitCapabilityCatalog.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_lanner_DvtSubstraitCapabilityCatalogSchema_v1_ts_d0469281: {
  label: "DvtSubstraitCapabilityCatalogSchema.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_cts_planner_DvtSubstraitCapabilityIdentity_v1_ts_5d49c2b9: {
  label: "DvtSubstraitCapabilityIdentity.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile__planner_DvtSubstraitFieldBindingHierarchy_v1_ts_0e916c01: {
  label: "DvtSubstraitFieldBindingHierarchy.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_c_contracts_planner_DvtSubstraitPlanBinary_v1_ts_85f88bb4: {
  label: "DvtSubstraitPlanBinary.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_contracts_planner_DvtSubstraitProductNeeds_v1_ts_551e060e: {
  label: "DvtSubstraitProductNeeds.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_DvtSubstraitProfile_v1_ts_141370ae: {
  label: "DvtSubstraitProfile.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_racts_planner_DvtSubstraitSemanticDocument_v1_ts_df8aad59: {
  label: "DvtSubstraitSemanticDocument.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_cts_planner_DvtSubstraitStandardCandidates_v1_ts_f8a454cc: {
  label: "DvtSubstraitStandardCandidates.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile__planner_DvtSubstraitSupportedCapabilities_v1_ts_e641c9c4: {
  label: "DvtSubstraitSupportedCapabilities.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_cts_planner_DvtTransformAuthoringAuthority_v1_ts_e6b01faa: {
  label: "DvtTransformAuthoringAuthority.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_ExecutableSubgraph_v1_ts_4a5eab48: {
  label: "ExecutableSubgraph.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_racts_planner_ExecutionBindingVerification_v1_ts_8aafc9c0: {
  label: "ExecutionBindingVerification.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_ExecutionPlan_v1_ts_7e720377: {
  label: "ExecutionPlan.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_ExecutionSelection_v1_ts_779491c4: {
  label: "ExecutionSelection.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_cts_planner_HttpJsonArtifactStepTypeConfig_v1_ts_7b5d5e33: {
  label: "HttpJsonArtifactStepTypeConfig.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_IExecutionPlanner_v1_ts_3af4dc5c: {
  label: "IExecutionPlanner.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_index_ts_543fffd2: {
  label: "index.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_tracts_planner_ObjectFilePostgresDbtBridge_v1_ts_9b76ffb0: {
  label: "ObjectFilePostgresDbtBridge.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_planner_ObjectFileToPostgresStepTypeConfig_v1_ts_2b1d841b: {
  label: "ObjectFileToPostgresStepTypeConfig.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_PlanAdmission_v1_ts_d5162a34: {
  label: "PlanAdmission.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_PlanAdmissionFinding_v1_ts_7ca16d19: {
  label: "PlanAdmissionFinding.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_ntracts_planner_PlanAdmissionLink_v1_schema_json_d55801c7: {
  label: "PlanAdmissionLink.v1.schema.json"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_PlanAdmissionLink_v1_ts_65569f6a: {
  label: "PlanAdmissionLink.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_ntracts_planner_PlanCompileStepTypeConfigs_v1_ts_d76b4781: {
  label: "PlanCompileStepTypeConfigs.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_s_planner_PlanExecutabilityRecord_v1_schema_json_a003b340: {
  label: "PlanExecutabilityRecord.v1.schema.json"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile__contracts_planner_PlanExecutabilityRecord_v1_ts_53df81b4: {
  label: "PlanExecutabilityRecord.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_tracts_planner_PlanExecutabilityValidation_v1_ts_6af3aa76: {
  label: "PlanExecutabilityValidation.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_rc_contracts_planner_PlanExecutionDecision_v1_ts_da796ee8: {
  label: "PlanExecutionDecision.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_racts_planner_PlannerInputEnvelopeV1_schema_json_3947f386: {
  label: "PlannerInputEnvelopeV1.schema.json"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_cts_planner_PlannerPolicyClassSet_v2_schema_json_9da70e33: {
  label: "PlannerPolicyClassSet.v2.schema.json"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile__contracts_planner_PlannerPolicyVocabulary_v2_ts_242d4391: {
  label: "PlannerPolicyVocabulary.v2.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_rc_contracts_planner_PlanPreviewProvenance_v1_ts_c1c853fe: {
  label: "PlanPreviewProvenance.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_PlanRecord_v1_schema_json_8b2f0343: {
  label: "PlanRecord.v1.schema.json"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_PlanRecord_v1_ts_cbbbbdff: {
  label: "PlanRecord.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_PlanVersion_v1_ts_b7c6f93c: {
  label: "PlanVersion.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_PolicyMappingTable_v1_ts_d1564d66: {
  label: "PolicyMappingTable.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_StepKindRegistry_v1_ts_e03b305f: {
  label: "StepKindRegistry.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_racts_planner_StoredPlanArtifactValidation_v1_ts_89ac1d09: {
  label: "StoredPlanArtifactValidation.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_ontracts_planner_TransformationFlowPreview_v1_ts_394c2035: {
  label: "TransformationFlowPreview.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_cts_planner_WorkspaceGraphAuthoringCommand_v1_ts_22caaf49: {
  label: "WorkspaceGraphAuthoringCommand.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_racts_planner_WorkspaceGraphAuthoringDraft_v1_ts_170e2af9: {
  label: "WorkspaceGraphAuthoringDraft.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_anner_WorkspaceGraphAuthoringEdgeExecution_v1_ts_dc5487e4: {
  label: "WorkspaceGraphAuthoringEdgeExecution.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0eFile_src_contracts_planner_WorkspaceGraphDraft_v1_ts_74df0b67: {
  label: "WorkspaceGraphDraft.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_source-import_46584ffcFile_contracts_source-import_ConnectedSourceRef_v1_ts_c4110f1a: {
  label: "ConnectedSourceRef.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_source-import_46584ffcFile_src_contracts_source-import_index_ts_fe785a39: {
  label: "index.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_source-import_46584ffcFile_c_contracts_source-import_SourceDataSample_v1_ts_666dd7f4: {
  label: "SourceDataSample.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_source-import_46584ffcFile_racts_source-import_SourceImportOperations_v1_ts_3344542d: {
  label: "SourceImportOperations.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_source-import_46584ffcFile_racts_source-import_SourceImportOperations_v2_ts_0bada1af: {
  label: "SourceImportOperations.v2.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_source-import_46584ffcFile_ontracts_source-import_SourceObjectCatalog_v1_ts_3fb2de92: {
  label: "SourceObjectCatalog.v1.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_workspace_cd294792File_src_contracts_workspace_ProjectWorkspace_v1_ts_87e1dfcf: {
  label: "ProjectWorkspace.v1.ts"
}
`;case`contractsFiles_substrait`:return`direction: down

ContractsSourceDir_src_f27fede2File_src_substrait_ts_67b47d83: {
  label: "substrait.ts"
}
`;case`contractsFiles_engineCompat`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_engine_c4c7e6bbFile_src_engine_IRunSnapshotStalenessQuery_v1_ts_534f2be1: {
  label: "IRunSnapshotStalenessQuery.v1.ts"
}
`;case`contractsFiles_schemaPacks`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_common_ts_398db230: {
  label: "common.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_execution-plan_ts_86c5c12e: {
  label: "execution-plan.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_execution-selection_ts_441e5d3c: {
  label: "execution-selection.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_plan-admission-finding_ts_83c19f4b: {
  label: "plan-admission-finding.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_plan-compile_ts_48b03ee9: {
  label: "plan-compile.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_plan-preview-profile_ts_adf6dc05: {
  label: "plan-preview-profile.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_plan-preview-request_ts_42316dfc: {
  label: "plan-preview-request.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_plan-preview-response_ts_52f0195c: {
  label: "plan-preview-response.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_plan-preview_ts_ae17edda: {
  label: "plan-preview.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_plan-records_ts_c09f7919: {
  label: "plan-records.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_planner-build_ts_a7f2eed1: {
  label: "planner-build.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_planner-context_ts_e70b75a3: {
  label: "planner-context.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_planner-graph_ts_5ac72402: {
  label: "planner-graph.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_planner_ts_7357552d: {
  label: "planner.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_run-events_ts_cb8f97f0: {
  label: "run-events.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_shared_ts_1568c8c4: {
  label: "shared.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_start-run_ts_af379300: {
  label: "start-run.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740File_src_schema-packs_workspace-graph-draft_ts_d3954988: {
  label: "workspace-graph-draft.ts"
}
`;case`contractsFiles_stepRegistry`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_step-registry_6500f8b1File_src_step-registry_BuiltInStepTypeEntries_ts_28e3d299: {
  label: "BuiltInStepTypeEntries.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_step-registry_6500f8b1File_src_step-registry_CommonStepTypeConfig_ts_326a5712: {
  label: "CommonStepTypeConfig.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_step-registry_6500f8b1File_src_step-registry_DbtStepTypeConfig_ts_0c2fa828: {
  label: "DbtStepTypeConfig.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_step-registry_6500f8b1File_src_step-registry_StepTypeRegistry_ts_ec1a7015: {
  label: "StepTypeRegistry.ts"
}
`;case`contractsFiles_types`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_types_7f0be21aFile_src_types_artifacts_ts_f9049a84: {
  label: "artifacts.ts"
}
ContractsSourceDir_src_f27fede2Dir_src_types_7f0be21aFile_src_types_contracts_ts_4fe4f768: {
  label: "contracts.ts"
}
`;case`contractsFiles_utils`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_utils_e236f4b4File_src_utils_contractPrimitives_ts_173e2c86: {
  label: "contractPrimitives.ts"
}
`;case`contractsFiles_errors`:return`direction: down

ContractsSourceDir_src_f27fede2File_src_errorContract_ts_43bd4282: {
  label: "errorContract.ts"
}
ContractsSourceDir_src_f27fede2File_src_errors_ts_69d4c465: {
  label: "errors.ts"
}
`;case`cryptoBoundary`:return`direction: right

CryptoModelSourceEvidence: {
  label: "Source evidence"
}
CryptoModelPublicBoundary: {
  label: "Crypto public boundary"
}
CryptoModelJcs: {
  label: "JCS canonicalization"
}
CryptoModelSha256: {
  label: "SHA-256"
}
CryptoModelMd5: {
  label: "MD5 compatibility"
}
CryptoModelUuid: {
  label: "UUID generation"
}
CryptoModelRandom: {
  label: "Secure randomness"
}
CryptoModelEncoding: {
  label: "Encoding primitives"
}

CryptoModelPublicBoundary -> CryptoModelJcs: "exports canonicalization"
CryptoModelPublicBoundary -> CryptoModelSha256: "exports SHA-256"
CryptoModelPublicBoundary -> CryptoModelMd5: "exports compatibility MD5"
CryptoModelPublicBoundary -> CryptoModelUuid: "exports UUID"
CryptoModelPublicBoundary -> CryptoModelRandom: "exports secure random"
CryptoModelPublicBoundary -> CryptoModelEncoding: "exports encoding"
`;case`cryptoSourceInventory`:return`direction: down

CryptoSource: {
  label: "Crypto source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 7 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 3 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
}
`;case`cryptoFiles_publicBoundary`:return`direction: down

CryptoSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`cryptoFiles_jcs`:return`direction: down

CryptoSourceDir_src_f27fede2File_src_jcs_ts_51e82c0e: {
  label: "jcs.ts"
}
`;case`cryptoFiles_sha256`:return`direction: down

CryptoSourceDir_src_f27fede2File_src_sha256_ts_570d2ed8: {
  label: "sha256.ts"
}
`;case`cryptoFiles_md5`:return`direction: down

CryptoSourceDir_src_f27fede2File_src_md5_ts_e765deaf: {
  label: "md5.ts"
}
`;case`cryptoFiles_uuid`:return`direction: down

CryptoSourceDir_src_f27fede2File_src_uuid_ts_a4b9fa9f: {
  label: "uuid.ts"
}
`;case`cryptoFiles_random`:return`direction: down

CryptoSourceDir_src_f27fede2File_src_random_ts_802921c7: {
  label: "random.ts"
}
`;case`cryptoFiles_encoding`:return`direction: down

CryptoSourceDir_src_f27fede2File_src_encoding_ts_0126a9c2: {
  label: "encoding.ts"
}
`;case`deliveryBoundary`:return`direction: right

DeliveryModelSourceEvidence: {
  label: "Source evidence"
}
DeliveryModelPublicBoundary: {
  label: "Delivery public boundary"
}
DeliveryModelOutboxWorker: {
  label: "Outbox delivery worker"
}
DeliveryModelProjectorRuntime: {
  label: "Projector worker runtime"
}
DeliveryModelBackpressure: {
  label: "Start-run backpressure admission"
}
DeliveryModelOutboxRuntime: {
  label: "Outbox worker runtime"
}
DeliveryModelSharding: {
  label: "Outbox shard assignment"
}
DeliveryModelTestingAdapters: {
  label: "In-memory delivery test adapters"
}

DeliveryModelPublicBoundary -> DeliveryModelOutboxWorker: "exports outbox worker"
DeliveryModelOutboxWorker -> DeliveryModelOutboxRuntime: "runtime loop + hooks"
DeliveryModelPublicBoundary -> DeliveryModelProjectorRuntime: "exports projector runtime"
DeliveryModelPublicBoundary -> DeliveryModelSharding: "exports shard assignment"
DeliveryModelOutboxRuntime -> DeliveryModelSharding: "owns shard-scoped work"
DeliveryModelPublicBoundary -> DeliveryModelBackpressure: "exports admission guard"
`;case`deliverySourceInventory`:return`direction: down

DeliverySource: {
  label: "Delivery source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 15 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 11 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`deliveryFiles_publicBoundary`:return`direction: down

DeliverySourceDir_src_f27fede2File_src_contracts_ts_9032c8ad: {
  label: "contracts.ts"
}
DeliverySourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`deliveryFiles_outboxWorker`:return`direction: down

DeliverySourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_OutboxWorker_ts_90de9fc5: {
  label: "OutboxWorker.ts"
}
`;case`deliveryFiles_outboxRuntime`:return`direction: down

DeliverySourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_OutboxWorkerRuntime_ts_e38468b6: {
  label: "OutboxWorkerRuntime.ts"
}
DeliverySourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_c_application_outboxWorkerRuntimeErrorSupport_ts_bb2ea0ec: {
  label: "outboxWorkerRuntimeErrorSupport.ts"
}
DeliverySourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_OutboxWorkerRuntimeHookRunner_ts_6c30e806: {
  label: "OutboxWorkerRuntimeHookRunner.ts"
}
DeliverySourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_application_OutboxWorkerRuntimeLoopController_ts_27b30312: {
  label: "OutboxWorkerRuntimeLoopController.ts"
}
`;case`deliveryFiles_projectorRuntime`:return`direction: down

DeliverySourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_ProjectorWorkerRuntime_ts_a63befa3: {
  label: "ProjectorWorkerRuntime.ts"
}
`;case`deliveryFiles_sharding`:return`direction: down

DeliverySourceDir_src_f27fede2File_src_outboxShardAssignment_ts_0d148bae: {
  label: "outboxShardAssignment.ts"
}
`;case`deliveryFiles_backpressure`:return`direction: down

DeliverySourceDir_src_f27fede2Dir_src_backpressure_1b00f00bFile_src_backpressure_StartRunAdmissionGuard_ts_d6599097: {
  label: "StartRunAdmissionGuard.ts"
}
`;case`deliveryFiles_testingAdapters`:return`direction: down

DeliverySourceDir_src_f27fede2File_src_testing_ts_25c1ccde: {
  label: "testing.ts"
}
DeliverySourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_InMemoryEventBus_ts_20520955: {
  label: "InMemoryEventBus.ts"
}
DeliverySourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_InMemoryOutboxStorage_ts_573b28d8: {
  label: "InMemoryOutboxStorage.ts"
}
DeliverySourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_InMemoryOutboxStorageCore_ts_b4ab0db0: {
  label: "InMemoryOutboxStorageCore.ts"
}
DeliverySourceDir_src_f27fede2Dir_src_testing_c8606474File_src_testing_outboxSharding_ts_173afb69: {
  label: "outboxSharding.ts"
}
`;case`dslBoundary`:return`direction: right

DslModelSourceEvidence: {
  label: "Source evidence"
}
DslModelPublicBoundary: {
  label: "DSL public boundary"
}
DslModelParser: {
  label: "DSL v1 parser"
}
DslModelEvaluator: {
  label: "DSL v1 evaluator"
}
DslModelAst: {
  label: "DSL v1 AST"
}

DslModelPublicBoundary -> DslModelAst: "exports AST"
DslModelPublicBoundary -> DslModelParser: "exports parser"
DslModelParser -> DslModelAst: "produces AST"
DslModelPublicBoundary -> DslModelEvaluator: "exports evaluator"
DslModelEvaluator -> DslModelAst: "evaluates AST"
`;case`dslSourceInventory`:return`direction: down

DslSource: {
  label: "DSL source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 4 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 1 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`dslFiles_publicBoundary`:return`direction: down

DslSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`dslFiles_ast`:return`direction: down

DslSourceDir_src_f27fede2Dir_src_v1_d0c3db8fFile_src_v1_ast_ts_008d2652: {
  label: "ast.ts"
}
`;case`dslFiles_parser`:return`direction: down

DslSourceDir_src_f27fede2Dir_src_v1_d0c3db8fFile_src_v1_parser_ts_9d102362: {
  label: "parser.ts"
}
`;case`dslFiles_evaluator`:return`direction: down

DslSourceDir_src_f27fede2Dir_src_v1_d0c3db8fFile_src_v1_evaluator_ts_ca5cff7f: {
  label: "evaluator.ts"
}
`;case`engineBoundary`:return`direction: right

EngineModelSourceEvidence: {
  label: "Source evidence"
}
EngineModelWorkflowPort: {
  label: "IWorkflowEngine"
}
EngineModelWorkflowFacade: {
  label: "WorkflowEngine facade"
}
EngineModelUseCases: {
  label: "Workflow engine use cases"
}
EngineModelStartPipeline: {
  label: "StartRun application pipeline"
}
EngineModelProviderPort: {
  label: "IProviderAdapter"
}
EngineModelStatePort: {
  label: "IRunStateStore"
}
EngineModelPlanIntegrityPort: {
  label: "IPlanIntegrityValidator"
}

EngineModelWorkflowPort -> EngineModelWorkflowFacade: "implemented by facade"
EngineModelWorkflowFacade -> EngineModelUseCases: "commands + queries"
EngineModelUseCases -> EngineModelStartPipeline: "start lifecycle"
EngineModelUseCases -> EngineModelProviderPort: "[...]"
EngineModelStartPipeline -> EngineModelProviderPort: "dispatches provider execution"
EngineModelUseCases -> EngineModelStatePort: "canonical status source"
EngineModelStartPipeline -> EngineModelStatePort: "persists pre-dispatch intent/state"
EngineModelStartPipeline -> EngineModelPlanIntegrityPort: "validates plan integrity"
`;case`engineStartRun`:return`direction: right

EngineModelStartPipelineCoordinator: {
  label: "StartRun coordinator"
}
EngineModelStartPipelineAdmission: {
  label: "Admission + integrity"
}
EngineModelStartPipelineIntent: {
  label: "Pre-dispatch intent"
}
EngineModelStartPipelineExecution: {
  label: "Execution dispatch"
}
EngineModelStartPipelineFailure: {
  label: "Failure policy"
}
`;case`engineUseCases`:return`direction: right

EngineModelUseCasesStartRun: {
  label: "Start run"
}
EngineModelUseCasesRecoverRun: {
  label: "Recover run"
}
EngineModelUseCasesCancelRun: {
  label: "Cancel run"
}
EngineModelUseCasesStatus: {
  label: "Canonical status"
}
EngineModelUseCasesSignal: {
  label: "Signal run"
}
`;case`engineSourceInventory`:return`direction: down

EngineSource: {
  label: "Engine source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 123 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 73 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_eslint_json_df42856a: {
    label: "tsconfig.eslint.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_tsconfig_test_eslint_json_ac4b18dc: {
    label: "tsconfig.test.eslint.json"
  }
  File_tsconfig_test_json_d1f96fd1: {
    label: "tsconfig.test.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`engineFiles_workflowPort`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IWorkflowEngine_ts_ba14cd48: {
  label: "IWorkflowEngine.ts"
}
`;case`engineFiles_workflowFacade`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_WorkflowEngine_ts_f3c1e650: {
  label: "WorkflowEngine.ts"
}
`;case`engineFiles_useCases`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_-engine-use-cases_buildWorkflowEngineUseCases_ts_aff992f2: {
  label: "buildWorkflowEngineUseCases.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_c_application_workflow-engine-use-cases_index_ts_fd8907df: {
  label: "index.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_c_application_workflow-engine-use-cases_types_ts_ef60927d: {
  label: "types.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_low-engine-use-cases_WorkflowCancelRunUseCase_ts_502ec1f3: {
  label: "WorkflowCancelRunUseCase.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_ow-engine-use-cases_WorkflowRecoverRunUseCase_ts_f56d7ca4: {
  label: "WorkflowRecoverRunUseCase.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_low-engine-use-cases_WorkflowRunStatusUseCase_ts_47efbeef: {
  label: "WorkflowRunStatusUseCase.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_low-engine-use-cases_WorkflowSignalRunUseCase_ts_21f10271: {
  label: "WorkflowSignalRunUseCase.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_flow-engine-use-cases_WorkflowStartRunUseCase_ts_ceee917b: {
  label: "WorkflowStartRunUseCase.ts"
}
`;case`engineFiles_startRun`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_flow-engine-use-cases_WorkflowStartRunUseCase_ts_ceee917b: {
  label: "WorkflowStartRunUseCase.ts"
}
`;case`engineFiles_recoverRun`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_ow-engine-use-cases_WorkflowRecoverRunUseCase_ts_f56d7ca4: {
  label: "WorkflowRecoverRunUseCase.ts"
}
`;case`engineFiles_cancelRun`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_low-engine-use-cases_WorkflowCancelRunUseCase_ts_502ec1f3: {
  label: "WorkflowCancelRunUseCase.ts"
}
`;case`engineFiles_status`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_low-engine-use-cases_WorkflowRunStatusUseCase_ts_47efbeef: {
  label: "WorkflowRunStatusUseCase.ts"
}
`;case`engineFiles_signal`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2File_low-engine-use-cases_WorkflowSignalRunUseCase_ts_21f10271: {
  label: "WorkflowSignalRunUseCase.ts"
}
`;case`engineFiles_startPipeline`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_IStartRunApplicationService_ts_3de6d6d1: {
  label: "IStartRunApplicationService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_StartRunAdmissionGuard_ts_440dbb44: {
  label: "StartRunAdmissionGuard.ts"
}
EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_StartRunApplicationService_ts_ab879046: {
  label: "StartRunApplicationService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_s_startRun_RunExecutionContextAdmissionPolicy_ts_2f1b092a: {
  label: "RunExecutionContextAdmissionPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_ices_startRun_runExecutionContextRequirements_ts_836b5ca6: {
  label: "runExecutionContextRequirements.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_rc_services_startRun_StartRunAdmissionService_ts_78f1c1b5: {
  label: "StartRunAdmissionService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunDomainConstants_ts_516466fc: {
  label: "StartRunDomainConstants.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunEventFactory_ts_971f9241: {
  label: "StartRunEventFactory.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_rc_services_startRun_StartRunExecutionService_ts_f6b4e54d: {
  label: "StartRunExecutionService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunFailurePolicy_ts_c84a8cc3: {
  label: "StartRunFailurePolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunIntentService_ts_1f5c13ab: {
  label: "StartRunIntentService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunTelemetryPolicy_ts_2f0bb435: {
  label: "StartRunTelemetryPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunTypes_ts_fd04542d: {
  label: "StartRunTypes.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_rc_services_startRun_StartRunValidationPolicy_ts_504d326b: {
  label: "StartRunValidationPolicy.ts"
}
`;case`engineFiles_coordinator`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_StartRunApplicationService_ts_ab879046: {
  label: "StartRunApplicationService.ts"
}
`;case`engineFiles_admission`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_StartRunAdmissionGuard_ts_440dbb44: {
  label: "StartRunAdmissionGuard.ts"
}
EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IPlanIntegrityValidator_ts_e2ac2e7f: {
  label: "IPlanIntegrityValidator.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_s_startRun_RunExecutionContextAdmissionPolicy_ts_2f1b092a: {
  label: "RunExecutionContextAdmissionPolicy.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_rc_services_startRun_StartRunAdmissionService_ts_78f1c1b5: {
  label: "StartRunAdmissionService.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_rc_services_startRun_StartRunValidationPolicy_ts_504d326b: {
  label: "StartRunValidationPolicy.ts"
}
`;case`engineFiles_intent`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IStartRunIntentStore_ts_635782f3: {
  label: "IStartRunIntentStore.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunIntentService_ts_1f5c13ab: {
  label: "StartRunIntentService.ts"
}
`;case`engineFiles_execution`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunEventFactory_ts_971f9241: {
  label: "StartRunEventFactory.ts"
}
EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_rc_services_startRun_StartRunExecutionService_ts_f6b4e54d: {
  label: "StartRunExecutionService.ts"
}
`;case`engineFiles_failure`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78fFile_src_services_startRun_StartRunFailurePolicy_ts_c84a8cc3: {
  label: "StartRunFailurePolicy.ts"
}
`;case`engineFiles_providerPort`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_adapters_68aa84b0File_src_adapters_IProviderAdapter_ts_c37bc986: {
  label: "IProviderAdapter.ts"
}
`;case`engineFiles_statePort`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IRunStateStore_ts_7d47b496: {
  label: "IRunStateStore.ts"
}
`;case`engineFiles_planIntegrityPort`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_IPlanIntegrityValidator_ts_e2ac2e7f: {
  label: "IPlanIntegrityValidator.ts"
}
`;case`lineageWorkerBoundary`:return`direction: right

LineageWorkerModelSourceEvidence: {
  label: "Source evidence"
}
LineageWorkerModelHost: {
  label: "Lineage worker process host"
}
LineageWorkerModelCompiledCodeResolver: {
  label: "Compiled-code resolver"
}
LineageWorkerModelTypes: {
  label: "Lineage worker types"
}
LineageWorkerModelEnv: {
  label: "Lineage worker environment"
}

LineageWorkerModelHost -> LineageWorkerModelCompiledCodeResolver: "resolve compiled-code evidence"
LineageWorkerModelHost -> LineageWorkerModelTypes: "worker-owned types"
LineageWorkerModelHost -> LineageWorkerModelEnv: "load validated configuration"
`;case`lineageWorkerSourceInventory`:return`direction: down

LineageWorkerSource: {
  label: "Lineage Worker source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 9 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 5 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`lineage-workerFiles_host`:return`direction: down

LineageWorkerSourceDir_src_f27fede2File_src_bootstrap_ts_cf7b7793: {
  label: "bootstrap.ts"
}
LineageWorkerSourceDir_src_f27fede2File_src_server_ts_bcc09dcb: {
  label: "server.ts"
}
`;case`lineage-workerFiles_compiledCodeResolver`:return`direction: down

LineageWorkerSourceDir_src_f27fede2Dir_src_compiled-code-resolver_e09af233File_src_compiled-code-resolver_errorMapping_ts_ff861088: {
  label: "errorMapping.ts"
}
LineageWorkerSourceDir_src_f27fede2Dir_src_compiled-code-resolver_e09af233File_src_compiled-code-resolver_policy_ts_8a3b8a21: {
  label: "policy.ts"
}
LineageWorkerSourceDir_src_f27fede2Dir_src_compiled-code-resolver_e09af233File_ompiled-code-resolver_S3UriCompiledCodeReader_ts_609358c3: {
  label: "S3UriCompiledCodeReader.ts"
}
LineageWorkerSourceDir_src_f27fede2Dir_src_compiled-code-resolver_e09af233File_src_compiled-code-resolver_types_ts_2342179d: {
  label: "types.ts"
}
LineageWorkerSourceDir_src_f27fede2File_src_compiledCodeResolver_ts_82c1a308: {
  label: "compiledCodeResolver.ts"
}
`;case`lineage-workerFiles_types`:return`direction: down

LineageWorkerSourceDir_src_f27fede2Dir_src_types_7f0be21aFile_src_types_pg_d_ts_cfcf86d1: {
  label: "pg.d.ts"
}
`;case`lineage-workerFiles_env`:return`direction: down

LineageWorkerSourceDir_src_f27fede2File_src_env_ts_3686f5d5: {
  label: "env.ts"
}
`;case`observabilityBoundary`:return`direction: right

ObservabilityModelSourceEvidence: {
  label: "Source evidence"
}
ObservabilityModelNoop: {
  label: "No-op observability"
}
ObservabilityModelPublicBoundary: {
  label: "Observability public boundary"
}
ObservabilityModelContracts: {
  label: "Observability contracts"
}
ObservabilityModelPolicy: {
  label: "Telemetry cardinality policy"
}

ObservabilityModelPublicBoundary -> ObservabilityModelContracts: "exports provider-neutral contracts"
ObservabilityModelPublicBoundary -> ObservabilityModelPolicy: "exports telemetry policy"
ObservabilityModelNoop -> ObservabilityModelPublicBoundary: "no-op implementation"
`;case`observabilityOtelBoundary`:return`direction: right

ObservabilityOtelModelSourceEvidence: {
  label: "Source evidence"
}
ObservabilityOtelModelPublicBoundary: {
  label: "OTel public boundary"
}
ObservabilityOtelModelObservability: {
  label: "OTel observability implementation"
}
ObservabilityOtelModelTraces: {
  label: "OpenTelemetry traces"
}
ObservabilityOtelModelTracePolicy: {
  label: "OTel trace policy"
}

ObservabilityOtelModelPublicBoundary -> ObservabilityOtelModelObservability: "exports concrete implementation"
ObservabilityOtelModelObservability -> ObservabilityOtelModelTraces: "trace implementation"
ObservabilityOtelModelObservability -> ObservabilityOtelModelTracePolicy: "trace policy"
`;case`observabilityOtelSourceInventory`:return`direction: down

ObservabilityOtelSource: {
  label: "Observability OTel source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 4 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 1 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
}
`;case`observability-otelFiles_publicBoundary`:return`direction: down

ObservabilityOtelSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`observability-otelFiles_observability`:return`direction: down

ObservabilityOtelSourceDir_src_f27fede2File_src_OtelObservability_ts_9699bfcd: {
  label: "OtelObservability.ts"
}
`;case`observability-otelFiles_traces`:return`direction: down

ObservabilityOtelSourceDir_src_f27fede2File_src_OpenTelemetryTraces_ts_da517d6b: {
  label: "OpenTelemetryTraces.ts"
}
`;case`observability-otelFiles_tracePolicy`:return`direction: down

ObservabilityOtelSourceDir_src_f27fede2File_src_otelTracePolicy_ts_a5d77099: {
  label: "otelTracePolicy.ts"
}
`;case`observabilitySourceInventory`:return`direction: down

ObservabilitySource: {
  label: "Observability source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 5 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 1 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
}
`;case`observabilityFiles_publicBoundary`:return`direction: down

ObservabilitySourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`observabilityFiles_contracts`:return`direction: down

ObservabilitySourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_IObservability_ts_3025c009: {
  label: "IObservability.ts"
}
ObservabilitySourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_ObservabilityContext_ts_55975809: {
  label: "ObservabilityContext.ts"
}
`;case`observabilityFiles_policy`:return`direction: down

ObservabilitySourceDir_src_f27fede2Dir_src_policy_d3c8fc47File_src_policy_cardinalityPolicy_ts_db3796c6: {
  label: "cardinalityPolicy.ts"
}
`;case`observabilityFiles_noop`:return`direction: down

ObservabilitySourceDir_src_f27fede2File_src_noopObservability_ts_b1c14ac1: {
  label: "noopObservability.ts"
}
`;case`outboxWorkerBoundary`:return`direction: right

OutboxWorkerModelSourceEvidence: {
  label: "Source evidence"
}
OutboxWorkerModelHost: {
  label: "Outbox worker process host"
}
OutboxWorkerModelHostComposition: {
  label: "Outbox host composition"
}
OutboxWorkerModelRuntime: {
  label: "Outbox runtime"
}
OutboxWorkerModelOwnership: {
  label: "Shard ownership"
}
OutboxWorkerModelBus: {
  label: "Event bus integration"
}
OutboxWorkerModelDb: {
  label: "Outbox database composition"
}
OutboxWorkerModelLifecycle: {
  label: "Outbox lifecycle support"
}
OutboxWorkerModelOps: {
  label: "Outbox operations"
}
OutboxWorkerModelPlugins: {
  label: "Outbox host plugins"
}

OutboxWorkerModelHost -> OutboxWorkerModelHostComposition: "build worker host"
OutboxWorkerModelHostComposition -> OutboxWorkerModelRuntime: "start outbox runtime"
OutboxWorkerModelHostComposition -> OutboxWorkerModelOwnership: "assign owned shards"
OutboxWorkerModelHostComposition -> OutboxWorkerModelBus: "compose event transport"
OutboxWorkerModelHostComposition -> OutboxWorkerModelDb: "compose persistence adapters"
OutboxWorkerModelHostComposition -> OutboxWorkerModelLifecycle: "lifecycle support"
OutboxWorkerModelHostComposition -> OutboxWorkerModelOps: "operations"
OutboxWorkerModelHostComposition -> OutboxWorkerModelPlugins: "host plugins"
`;case`outboxWorkerSourceInventory`:return`direction: down

OutboxWorkerSource: {
  label: "Outbox Worker source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 25 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 30 files"
  }
  File__dependency-cruiser_cjs_18f59799: {
    label: ".dependency-cruiser.cjs"
  }
  File__env_example_d4dae00d: {
    label: ".env.example"
  }
  File__gitignore_a5cc2925: {
    label: ".gitignore"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`outbox-workerFiles_host`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2File_src_server_ts_bcc09dcb: {
  label: "server.ts"
}
`;case`outbox-workerFiles_hostComposition`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_host_16cb5924File_src_host_runOutboxWorkerHost_ts_d8877e3e: {
  label: "runOutboxWorkerHost.ts"
}
`;case`outbox-workerFiles_runtime`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_buildDeliveryBufferPurgeRuntime_ts_7221e0a1: {
  label: "buildDeliveryBufferPurgeRuntime.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_buildRunEventRetentionRuntime_ts_32abfa14: {
  label: "buildRunEventRetentionRuntime.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_createOutboxEventBus_ts_0a19e908: {
  label: "createOutboxEventBus.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_createOutboxWorkerRuntime_ts_5585da97: {
  label: "createOutboxWorkerRuntime.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_DeliveryBufferPurgeRuntime_ts_de2b3a16: {
  label: "DeliveryBufferPurgeRuntime.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_outboxRuntimeResourceLifecycle_ts_deabfb71: {
  label: "outboxRuntimeResourceLifecycle.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_OutboxWorkerRuntime_ts_f1ec00b8: {
  label: "OutboxWorkerRuntime.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_RunEventRetentionRuntime_ts_8df9cc8b: {
  label: "RunEventRetentionRuntime.ts"
}
`;case`outbox-workerFiles_ownership`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_ownership_3dbdd8b8File_src_ownership_PgShardOwnershipGate_ts_6012f89c: {
  label: "PgShardOwnershipGate.ts"
}
`;case`outbox-workerFiles_bus`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_bus_740211a8File_src_bus_HttpEventBus_ts_30469926: {
  label: "HttpEventBus.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_bus_740211a8File_src_bus_LoggingEventBus_ts_af7cf0ff: {
  label: "LoggingEventBus.ts"
}
`;case`outbox-workerFiles_db`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_db_a9f703b6File_src_db_pool_ts_1b4a99d5: {
  label: "pool.ts"
}
`;case`outbox-workerFiles_lifecycle`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_stopRuntimeAndOperationalServer_ts_18448806: {
  label: "stopRuntimeAndOperationalServer.ts"
}
`;case`outbox-workerFiles_ops`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755Dir_src_ops_monitor_19265fa8File_src_ops_monitor_model_ts_9dbdd92c: {
  label: "model.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755Dir_src_ops_monitor_19265fa8File_src_ops_monitor_OutboxDeliveryTelemetry_ts_15b0eded: {
  label: "OutboxDeliveryTelemetry.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755Dir_src_ops_monitor_19265fa8File_src_ops_monitor_OutboxRuntimeHealthTracker_ts_4df4fdb0: {
  label: "OutboxRuntimeHealthTracker.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755Dir_src_ops_monitor_19265fa8File_src_ops_monitor_renderOutboxWorkerMetrics_ts_9fadac99: {
  label: "renderOutboxWorkerMetrics.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755Dir_src_ops_monitor_19265fa8File_src_ops_monitor_RunEventRetentionTelemetry_ts_cd18114d: {
  label: "RunEventRetentionTelemetry.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755Dir_src_ops_monitor_19265fa8File_src_ops_monitor_support_ts_05e70b3a: {
  label: "support.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755File_src_ops_OperationalServer_ts_b7f6874b: {
  label: "OperationalServer.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755File_src_ops_OutboxWorkerMonitor_ts_55820373: {
  label: "OutboxWorkerMonitor.ts"
}
OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755File_src_ops_resolveReadyStaleAfterMs_ts_f7f2c0bb: {
  label: "resolveReadyStaleAfterMs.ts"
}
`;case`outbox-workerFiles_plugins`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_plugins_e2271fccFile_src_plugins_env_ts_a41c27b5: {
  label: "env.ts"
}
`;case`planInterpreterBoundary`:return`direction: right

PlanInterpreterModelSourceEvidence: {
  label: "Source evidence"
}
PlanInterpreterModelPublicBoundary: {
  label: "Plan Interpreter public boundary"
}
PlanInterpreterModelDagAnalysis: {
  label: "DAG validation + execution layering"
}
PlanInterpreterModelTypes: {
  label: "Interpreter result types"
}
PlanInterpreterModelErrors: {
  label: "DAG interpretation errors"
}

PlanInterpreterModelPublicBoundary -> PlanInterpreterModelDagAnalysis: "DAG analysis functions"
PlanInterpreterModelDagAnalysis -> PlanInterpreterModelTypes: "typed results"
PlanInterpreterModelDagAnalysis -> PlanInterpreterModelErrors: "fails invalid DAGs"
`;case`planInterpreterSourceInventory`:return`direction: down

PlanInterpreterSource: {
  label: "Plan Interpreter source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 4 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 1 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`plan-interpreterFiles_publicBoundary`:return`direction: down

PlanInterpreterSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`plan-interpreterFiles_dagAnalysis`:return`direction: down

PlanInterpreterSourceDir_src_f27fede2File_src_dagAnalyzer_ts_e14aab4b: {
  label: "dagAnalyzer.ts"
}
`;case`plan-interpreterFiles_types`:return`direction: down

PlanInterpreterSourceDir_src_f27fede2File_src_types_ts_cdcae080: {
  label: "types.ts"
}
`;case`plan-interpreterFiles_errors`:return`direction: down

PlanInterpreterSourceDir_src_f27fede2File_src_errors_ts_69d4c465: {
  label: "errors.ts"
}
`;case`planVerifierBoundary`:return`direction: right

PlanVerifierModelSourceEvidence: {
  label: "Source evidence"
}
PlanVerifierModelPublicBoundary: {
  label: "Plan Verifier public boundary"
}
PlanVerifierModelVerification: {
  label: "Plan verification"
}
PlanVerifierModelPlanVersion: {
  label: "Plan-version compatibility"
}
PlanVerifierModelStepTypeConfig: {
  label: "Step-type configuration verification"
}
PlanVerifierModelErrors: {
  label: "Verification errors"
}

PlanVerifierModelPublicBoundary -> PlanVerifierModelVerification: "verification entry point"
PlanVerifierModelVerification -> PlanVerifierModelPlanVersion: "version compatibility"
PlanVerifierModelVerification -> PlanVerifierModelStepTypeConfig: "step-type config"
PlanVerifierModelVerification -> PlanVerifierModelErrors: "rejects invalid plans"
`;case`planVerifierSourceInventory`:return`direction: down

PlanVerifierSource: {
  label: "Plan Verifier source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 5 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 5 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_tsconfig_test_json_d1f96fd1: {
    label: "tsconfig.test.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`plan-verifierFiles_publicBoundary`:return`direction: down

PlanVerifierSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`plan-verifierFiles_verification`:return`direction: down

PlanVerifierSourceDir_src_f27fede2File_src_verify_ts_8fb52c8f: {
  label: "verify.ts"
}
`;case`plan-verifierFiles_planVersion`:return`direction: down

PlanVerifierSourceDir_src_f27fede2File_src_planVersion_ts_0c0b8e65: {
  label: "planVersion.ts"
}
`;case`plan-verifierFiles_stepTypeConfig`:return`direction: down

PlanVerifierSourceDir_src_f27fede2File_src_stepTypeConfig_ts_e3c09325: {
  label: "stepTypeConfig.ts"
}
`;case`plan-verifierFiles_errors`:return`direction: down

PlanVerifierSourceDir_src_f27fede2File_src_errors_ts_69d4c465: {
  label: "errors.ts"
}
`;case`plannerBoundary`:return`direction: right

PlannerModelSourceEvidence: {
  label: "Source evidence"
}
PlannerModelPublicBoundary: {
  label: "PlannerFacade + stable boundary"
}
PlannerModelExecutableSubgraph: {
  label: "Executable subgraph derivation"
}
PlannerModelEnvelopeMapping: {
  label: "Input normalization + graph mapping"
}
PlannerModelPlanningPipeline: {
  label: "Deterministic planning pipeline"
}
PlannerModelBehaviorContracts: {
  label: "Planner-owned behavior contracts"
}
PlannerModelGraph: {
  label: "Graph construction + topology"
}
PlannerModelSelection: {
  label: "Node selection"
}
PlannerModelPlanAssembly: {
  label: "Immutable plan assembly"
}
PlannerModelStepFactory: {
  label: "Execution-step factory"
}
PlannerModelRuntimeClock: {
  label: "Runtime clock boundary"
}
PlannerModelArtifactCompatibilityBridge: {
  label: "Artifact compatibility bridge"
}

PlannerModelPublicBoundary -> PlannerModelExecutableSubgraph: "derive executable closure"
PlannerModelPublicBoundary -> PlannerModelEnvelopeMapping: "normalizes planner input"
PlannerModelPublicBoundary -> PlannerModelPlanningPipeline: "buildPlan"
PlannerModelPlanningPipeline -> PlannerModelGraph: "dependency graph + order"
PlannerModelPlanningPipeline -> PlannerModelSelection: "selected nodes"
PlannerModelPlanningPipeline -> PlannerModelPlanAssembly: "immutable plan"
PlannerModelPlanningPipeline -> PlannerModelStepFactory: "execution responsibilities"
PlannerModelPublicBoundary -> PlannerModelBehaviorContracts: "behavior boundaries"
PlannerModelPlanningPipeline -> PlannerModelRuntimeClock: "timing only"
`;case`plannerSourceInventory`:return`direction: down

PlannerSource: {
  label: "Planner source inventory — generated from Git"

  Dir_docs_71ab8b6a: {
    label: "docs/ — 4 files"
  }
  Dir_examples_99345ce6: {
    label: "examples/ — 2 files"
  }
  Dir_src_f27fede2: {
    label: "src/ — 28 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 25 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`plannerFiles_publicBoundary`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_PlannerFacade_ts_ffe4cd95: {
  label: "PlannerFacade.ts"
}
PlannerSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`plannerFiles_executableSubgraph`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_ExecutableSubgraphDeriver_ts_c941a99f: {
  label: "ExecutableSubgraphDeriver.ts"
}
`;case`plannerFiles_envelopeMapping`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_lication_derivePlannerGraphSourceFromManifest_ts_e73dc650: {
  label: "derivePlannerGraphSourceFromManifest.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_application_f8a49c7cFile_src_application_PlannerEnvelopeMapper_ts_85c009a9: {
  label: "PlannerEnvelopeMapper.ts"
}
`;case`plannerFiles_planningPipeline`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_InputEnvelopeValidator_ts_d5837816: {
  label: "InputEnvelopeValidator.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_limits_ts_f1894b29: {
  label: "limits.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_metrics_ts_52bfda3a: {
  label: "metrics.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_Planner_ts_60a526f5: {
  label: "Planner.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_policies_ts_16e68f7c: {
  label: "policies.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_sorting_ts_45462632: {
  label: "sorting.ts"
}
`;case`plannerFiles_graph`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_graph_cf5690b8File_src_domain_graph_Depth_ts_d7e3a5ad: {
  label: "Depth.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_graph_cf5690b8File_src_domain_graph_GraphBuilder_ts_09d1fc17: {
  label: "GraphBuilder.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_graph_cf5690b8File_src_domain_graph_TopoSort_ts_5319bdef: {
  label: "TopoSort.ts"
}
`;case`plannerFiles_selection`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_NodeSelector_ts_ad7075f6: {
  label: "NodeSelector.ts"
}
`;case`plannerFiles_planAssembly`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_hashing_ts_4ff20961: {
  label: "hashing.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_PlanAssembler_ts_968cdda3: {
  label: "PlanAssembler.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eFile_src_domain_PlanExecutionDecisionProjector_ts_66b97391: {
  label: "PlanExecutionDecisionProjector.ts"
}
`;case`plannerFiles_stepFactory`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_stepFactory_f09a8fc8File_src_domain_stepFactory_dbtStepFactory_ts_74967292: {
  label: "dbtStepFactory.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_stepFactory_f09a8fc8File_src_domain_stepFactory_StepFactory_ts_117e8c5b: {
  label: "StepFactory.ts"
}
`;case`plannerFiles_behaviorContracts`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_CustomPolicyNamespaceRegistry_ts_14364c58: {
  label: "CustomPolicyNamespaceRegistry.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_ExecutionBindingVerification_ts_9038fe82: {
  label: "ExecutionBindingVerification.ts"
}
PlannerSourceDir_src_f27fede2Dir_src_contracts_63d3060bFile_src_contracts_PlanExecutabilityValidation_ts_0ae35af6: {
  label: "PlanExecutabilityValidation.ts"
}
`;case`plannerFiles_runtimeClock`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_time_ts_ffbb7fc6: {
  label: "time.ts"
}
`;case`plannerFiles_artifactCompatibilityBridge`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_ports_3a2d3ebfFile_src_ports_ICompiledCodeStorage_ts_c3084ffd: {
  label: "ICompiledCodeStorage.ts"
}
`;case`projectorWorkerBoundary`:return`direction: right

ProjectorWorkerModelSourceEvidence: {
  label: "Source evidence"
}
ProjectorWorkerModelHost: {
  label: "Projector worker process host"
}
ProjectorWorkerModelEnv: {
  label: "Projector environment"
}

ProjectorWorkerModelHost -> ProjectorWorkerModelEnv: "load validated configuration"
`;case`projectorWorkerSourceInventory`:return`direction: down

ProjectorWorkerSource: {
  label: "Projector Worker source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 2 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 2 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`projector-workerFiles_host`:return`direction: down

ProjectorWorkerSourceDir_src_f27fede2File_src_server_ts_bcc09dcb: {
  label: "server.ts"
}
`;case`projector-workerFiles_env`:return`direction: down

ProjectorWorkerSourceDir_src_f27fede2File_src_env_ts_3686f5d5: {
  label: "env.ts"
}
`;case`runDomainBoundary`:return`direction: right

RunDomainModelSourceEvidence: {
  label: "Source evidence"
}
RunDomainModelPublicBoundary: {
  label: "Run Domain public boundary"
}
RunDomainModelEventFolding: {
  label: "Run event folding"
}
RunDomainModelProjectionMapping: {
  label: "Projectable event mapping"
}
RunDomainModelTransitionPolicy: {
  label: "Run transition policy"
}
RunDomainModelErrors: {
  label: "Run-domain invariant errors"
}

RunDomainModelPublicBoundary -> RunDomainModelEventFolding: "exports event fold"
RunDomainModelPublicBoundary -> RunDomainModelTransitionPolicy: "exports transition rules"
RunDomainModelEventFolding -> RunDomainModelTransitionPolicy: "guards legal transitions"
RunDomainModelPublicBoundary -> RunDomainModelProjectionMapping: "exports projection normalization"
RunDomainModelEventFolding -> RunDomainModelErrors: "fails invalid state transitions"
`;case`runDomainSourceInventory`:return`direction: down

RunDomainSource: {
  label: "Run Domain source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 5 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 1 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`run-domainFiles_publicBoundary`:return`direction: down

RunDomainSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`run-domainFiles_eventFolding`:return`direction: down

RunDomainSourceDir_src_f27fede2File_src_applyRunEvent_ts_6658c103: {
  label: "applyRunEvent.ts"
}
`;case`run-domainFiles_transitionPolicy`:return`direction: down

RunDomainSourceDir_src_f27fede2File_src_transitionPolicy_ts_f07fdc0c: {
  label: "transitionPolicy.ts"
}
`;case`run-domainFiles_projectionMapping`:return`direction: down

RunDomainSourceDir_src_f27fede2File_src_mapEventEnvelopeToProjectableEvent_ts_981727f4: {
  label: "mapEventEnvelopeToProjectableEvent.ts"
}
`;case`run-domainFiles_errors`:return`direction: down

RunDomainSourceDir_src_f27fede2File_src_errors_ts_69d4c465: {
  label: "errors.ts"
}
`;case`stateStoreBoundary`:return`direction: right

StateStoreModelSourceEvidence: {
  label: "Source evidence"
}
StateStoreModelPublicBoundary: {
  label: "State Store public boundary"
}
StateStoreModelRunStateCommands: {
  label: "Run state command boundary"
}
StateStoreModelArchivePipeline: {
  label: "Archive lifecycle pipeline"
}
StateStoreModelDeliveryBufferLifecycle: {
  label: "Delivery-buffer retention + purge"
}
StateStoreModelArchiveIdentity: {
  label: "Archive unit identity + retention math"
}
StateStoreModelArchiveArtifacts: {
  label: "Archive manifests + terminal snapshots"
}
StateStoreModelArchiveObjectStores: {
  label: "Archive object-store adapters"
}
StateStoreModelArchiveRuntime: {
  label: "Archive runtime ports + policies"
}

StateStoreModelPublicBoundary -> StateStoreModelRunStateCommands: "exports command boundary"
StateStoreModelPublicBoundary -> StateStoreModelArchiveIdentity: "exports archive identity helpers"
StateStoreModelPublicBoundary -> StateStoreModelArchiveArtifacts: "exports archive artifact builders"
StateStoreModelPublicBoundary -> StateStoreModelArchiveRuntime: "exports lifecycle ports + policies"
StateStoreModelPublicBoundary -> StateStoreModelArchivePipeline: "exports lifecycle services"
StateStoreModelArchivePipeline -> StateStoreModelArchiveIdentity: "keys + retention eligibility"
StateStoreModelArchivePipeline -> StateStoreModelArchiveArtifacts: "manifest + snapshot material"
StateStoreModelArchivePipeline -> StateStoreModelArchiveRuntime: "stores + leases + policies"
StateStoreModelPublicBoundary -> StateStoreModelArchiveObjectStores: "exports object-store adapters"
StateStoreModelArchivePipeline -> StateStoreModelArchiveObjectStores: "persists archive objects"
StateStoreModelPublicBoundary -> StateStoreModelDeliveryBufferLifecycle: "exports purge lifecycle"
StateStoreModelDeliveryBufferLifecycle -> StateStoreModelArchiveRuntime: "shares lifecycle telemetry conventions"
`;case`stateStoreSourceInventory`:return`direction: down

StateStoreSource: {
  label: "State Store source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 15 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 13 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`state-storeFiles_publicBoundary`:return`direction: down

StateStoreSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`state-storeFiles_runStateCommands`:return`direction: down

StateStoreSourceDir_src_f27fede2File_src_inMemoryRunStateCommandPort_ts_ce93809e: {
  label: "inMemoryRunStateCommandPort.ts"
}
StateStoreSourceDir_src_f27fede2File_src_types_ts_cdcae080: {
  label: "types.ts"
}
`;case`state-storeFiles_archiveIdentity`:return`direction: down

StateStoreSourceDir_src_f27fede2File_src_archiveLifecycle_ts_4b182e15: {
  label: "archiveLifecycle.ts"
}
`;case`state-storeFiles_archiveArtifacts`:return`direction: down

StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_archiveArtifacts_ts_988a7280: {
  label: "archiveArtifacts.ts"
}
`;case`state-storeFiles_archiveRuntime`:return`direction: down

StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_archiveRuntime_ts_f9a4b64d: {
  label: "archiveRuntime.ts"
}
`;case`state-storeFiles_archivePipeline`:return`direction: down

StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_ObjectStorageRunArchiveExporter_ts_8d22c575: {
  label: "ObjectStorageRunArchiveExporter.ts"
}
StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_RunArchiveCoordinator_ts_4a10b869: {
  label: "RunArchiveCoordinator.ts"
}
StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_RunArchiveDeleter_ts_57c91379: {
  label: "RunArchiveDeleter.ts"
}
StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_RunArchiveRestorer_ts_b0beec82: {
  label: "RunArchiveRestorer.ts"
}
StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_RunArchiveVerifier_ts_02fcf1d8: {
  label: "RunArchiveVerifier.ts"
}
`;case`state-storeFiles_archiveObjectStores`:return`direction: down

StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cDir_src_lifecycle_adapters_2eb741dfFile_fecycle_adapters_FileSystemArchiveObjectStore_ts_215ec773: {
  label: "FileSystemArchiveObjectStore.ts"
}
StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cDir_src_lifecycle_adapters_2eb741dfFile_src_lifecycle_adapters_S3ArchiveObjectStore_ts_5ac1121e: {
  label: "S3ArchiveObjectStore.ts"
}
`;case`state-storeFiles_deliveryBufferLifecycle`:return`direction: down

StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_DeliveryBufferPurger_ts_1ef1023b: {
  label: "DeliveryBufferPurger.ts"
}
StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cFile_src_lifecycle_deliveryBufferRuntime_ts_890e1d63: {
  label: "deliveryBufferRuntime.ts"
}
`;case`temporalDbtPluginBoundary`:return`direction: right

TemporalDbtPluginModelSourceEvidence: {
  label: "Source evidence"
}
TemporalDbtPluginModelPublicBoundary: {
  label: "dbt plugin public boundary"
}
TemporalDbtPluginModelManifest: {
  label: "dbt step plugin manifest"
}
TemporalDbtPluginModelActivity: {
  label: "dbt step activity"
}
TemporalDbtPluginModelRunner: {
  label: "dbt CLI plugin runner"
}
TemporalDbtPluginModelCliRuntime: {
  label: "dbt CLI runtime support"
}
TemporalDbtPluginModelRuntimeProfile: {
  label: "dbt runtime profile materialization"
}

TemporalDbtPluginModelPublicBoundary -> TemporalDbtPluginModelManifest: "exports plugin capabilities"
TemporalDbtPluginModelPublicBoundary -> TemporalDbtPluginModelActivity: "exports step activity"
TemporalDbtPluginModelPublicBoundary -> TemporalDbtPluginModelRunner: "exports runner"
TemporalDbtPluginModelActivity -> TemporalDbtPluginModelRunner: "executes dbt step"
TemporalDbtPluginModelRunner -> TemporalDbtPluginModelCliRuntime: "invokes dbt CLI"
TemporalDbtPluginModelPublicBoundary -> TemporalDbtPluginModelRuntimeProfile: "exports profile materializer"
TemporalDbtPluginModelRunner -> TemporalDbtPluginModelRuntimeProfile: "uses resolved runtime profile"
`;case`temporalDbtPluginSourceInventory`:return`direction: down

TemporalDbtPluginSource: {
  label: "Temporal dbt Plugin source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 11 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 2 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_tsconfig_test_json_d1f96fd1: {
    label: "tsconfig.test.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`temporal-dbt-pluginFiles_publicBoundary`:return`direction: down

TemporalDbtPluginSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`temporal-dbt-pluginFiles_manifest`:return`direction: down

TemporalDbtPluginSourceDir_src_f27fede2File_src_dbtPluginManifest_ts_81c436ae: {
  label: "dbtPluginManifest.ts"
}
TemporalDbtPluginSourceDir_src_f27fede2File_src_dbtPluginTypes_ts_06ea7543: {
  label: "dbtPluginTypes.ts"
}
`;case`temporal-dbt-pluginFiles_activity`:return`direction: down

TemporalDbtPluginSourceDir_src_f27fede2File_src_DbtStepActivity_ts_c3657921: {
  label: "DbtStepActivity.ts"
}
`;case`temporal-dbt-pluginFiles_runner`:return`direction: down

TemporalDbtPluginSourceDir_src_f27fede2File_src_DbtCliPluginRunner_ts_ebfb4c70: {
  label: "DbtCliPluginRunner.ts"
}
`;case`temporal-dbt-pluginFiles_cliRuntime`:return`direction: down

TemporalDbtPluginSourceDir_src_f27fede2File_src_dbtCliArguments_ts_75421ce4: {
  label: "dbtCliArguments.ts"
}
TemporalDbtPluginSourceDir_src_f27fede2File_src_dbtCliFailures_ts_77b175c6: {
  label: "dbtCliFailures.ts"
}
TemporalDbtPluginSourceDir_src_f27fede2File_src_dbtCliProcess_ts_d55b4d17: {
  label: "dbtCliProcess.ts"
}
TemporalDbtPluginSourceDir_src_f27fede2File_src_dbtCliProjectMaterializer_ts_fbe37cfe: {
  label: "dbtCliProjectMaterializer.ts"
}
TemporalDbtPluginSourceDir_src_f27fede2File_src_dbtCliTypes_ts_16391643: {
  label: "dbtCliTypes.ts"
}
`;case`temporal-dbt-pluginFiles_runtimeProfile`:return`direction: down

TemporalDbtPluginSourceDir_src_f27fede2File_src_dbtRuntimeProfile_ts_7c8a0823: {
  label: "dbtRuntimeProfile.ts"
}
`;case`temporalHttpJsonPluginBoundary`:return`direction: right

TemporalHttpJsonPluginModelSourceEvidence: {
  label: "Source evidence"
}
TemporalHttpJsonPluginModelPublicBoundary: {
  label: "HTTP JSON plugin public boundary"
}
TemporalHttpJsonPluginModelActivity: {
  label: "HTTP JSON artifact activity"
}
TemporalHttpJsonPluginModelTypesAndErrors: {
  label: "HTTP JSON plugin contracts"
}
TemporalHttpJsonPluginModelRunner: {
  label: "HTTP JSON artifact runner"
}

TemporalHttpJsonPluginModelPublicBoundary -> TemporalHttpJsonPluginModelActivity: "exports activity"
TemporalHttpJsonPluginModelPublicBoundary -> TemporalHttpJsonPluginModelRunner: "exports runner"
TemporalHttpJsonPluginModelActivity -> TemporalHttpJsonPluginModelRunner: "acquires artifact"
TemporalHttpJsonPluginModelPublicBoundary -> TemporalHttpJsonPluginModelTypesAndErrors: "exports plugin contracts"
`;case`temporalHttpJsonPluginSourceInventory`:return`direction: down

TemporalHttpJsonPluginSource: {
  label: "Temporal HTTP JSON Plugin source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 5 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 2 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_tsconfig_test_json_d1f96fd1: {
    label: "tsconfig.test.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`temporal-http-json-pluginFiles_publicBoundary`:return`direction: down

TemporalHttpJsonPluginSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`temporal-http-json-pluginFiles_activity`:return`direction: down

TemporalHttpJsonPluginSourceDir_src_f27fede2File_src_HttpJsonArtifactStepActivity_ts_b5aa4ffd: {
  label: "HttpJsonArtifactStepActivity.ts"
}
`;case`temporal-http-json-pluginFiles_runner`:return`direction: down

TemporalHttpJsonPluginSourceDir_src_f27fede2File_src_HttpJsonArtifactPluginRunner_ts_91e1783a: {
  label: "HttpJsonArtifactPluginRunner.ts"
}
`;case`temporal-http-json-pluginFiles_typesAndErrors`:return`direction: down

TemporalHttpJsonPluginSourceDir_src_f27fede2File_src_httpJsonArtifactPluginErrors_ts_aada1514: {
  label: "httpJsonArtifactPluginErrors.ts"
}
TemporalHttpJsonPluginSourceDir_src_f27fede2File_src_httpJsonArtifactPluginTypes_ts_c566e7be: {
  label: "httpJsonArtifactPluginTypes.ts"
}
`;case`temporalObjectFilePostgresPluginBoundary`:return`direction: right

TemporalObjectFilePostgresPluginModelSourceEvidence: {
  label: "Source evidence"
}
TemporalObjectFilePostgresPluginModelPublicBoundary: {
  label: "Object-file Postgres plugin public boundary"
}
TemporalObjectFilePostgresPluginModelActivity: {
  label: "Object-file Postgres activity"
}
TemporalObjectFilePostgresPluginModelTypesAndErrors: {
  label: "Object-file plugin contracts"
}
TemporalObjectFilePostgresPluginModelRunner: {
  label: "Object-file Postgres runner"
}
TemporalObjectFilePostgresPluginModelRows: {
  label: "Object-file row decoding"
}

TemporalObjectFilePostgresPluginModelPublicBoundary -> TemporalObjectFilePostgresPluginModelActivity: "exports activity"
TemporalObjectFilePostgresPluginModelPublicBoundary -> TemporalObjectFilePostgresPluginModelRunner: "exports runner"
TemporalObjectFilePostgresPluginModelActivity -> TemporalObjectFilePostgresPluginModelRunner: "materializes object file"
TemporalObjectFilePostgresPluginModelRunner -> TemporalObjectFilePostgresPluginModelRows: "decode rows"
TemporalObjectFilePostgresPluginModelPublicBoundary -> TemporalObjectFilePostgresPluginModelTypesAndErrors: "exports plugin contracts"
`;case`temporalObjectFilePostgresPluginSourceInventory`:return`direction: down

TemporalObjectFilePostgresPluginSource: {
  label: "Temporal Object File Postgres Plugin source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 6 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 4 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_tsconfig_test_json_d1f96fd1: {
    label: "tsconfig.test.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`temporal-object-file-postgres-pluginFiles_publicBoundary`:return`direction: down

TemporalObjectFilePostgresPluginSourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
`;case`temporal-object-file-postgres-pluginFiles_activity`:return`direction: down

TemporalObjectFilePostgresPluginSourceDir_src_f27fede2File_src_ObjectFilePostgresStepActivity_ts_9ec6f900: {
  label: "ObjectFilePostgresStepActivity.ts"
}
`;case`temporal-object-file-postgres-pluginFiles_runner`:return`direction: down

TemporalObjectFilePostgresPluginSourceDir_src_f27fede2File_src_ObjectFilePostgresPluginRunner_ts_ccf1b641: {
  label: "ObjectFilePostgresPluginRunner.ts"
}
`;case`temporal-object-file-postgres-pluginFiles_rows`:return`direction: down

TemporalObjectFilePostgresPluginSourceDir_src_f27fede2File_src_objectFileRows_ts_6d56a11b: {
  label: "objectFileRows.ts"
}
`;case`temporal-object-file-postgres-pluginFiles_typesAndErrors`:return`direction: down

TemporalObjectFilePostgresPluginSourceDir_src_f27fede2File_src_objectFilePostgresPluginErrors_ts_9051edb9: {
  label: "objectFilePostgresPluginErrors.ts"
}
TemporalObjectFilePostgresPluginSourceDir_src_f27fede2File_src_objectFilePostgresPluginTypes_ts_c1f97f3c: {
  label: "objectFilePostgresPluginTypes.ts"
}
`;case`temporalWorkerBoundary`:return`direction: right

TemporalWorkerModelSourceEvidence: {
  label: "Source evidence"
}
TemporalWorkerModelHost: {
  label: "Worker process host"
}
TemporalWorkerModelHostComposition: {
  label: "Temporal worker host composition"
}
TemporalWorkerModelRuntime: {
  label: "Worker runtime composition"
}
TemporalWorkerModelPlugins: {
  label: "Step plugin composition"
}
TemporalWorkerModelOps: {
  label: "Worker operations"
}

TemporalWorkerModelHost -> TemporalWorkerModelHostComposition: "starts worker host"
TemporalWorkerModelHostComposition -> TemporalWorkerModelRuntime: "build runtime dependencies"
TemporalWorkerModelHostComposition -> TemporalWorkerModelPlugins: "register step plugins"
TemporalWorkerModelHostComposition -> TemporalWorkerModelOps: "operational concerns"
`;case`temporalWorkerSourceInventory`:return`direction: down

TemporalWorkerSource: {
  label: "Temporal Worker source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 20 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 16 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`temporal-workerFiles_host`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2File_src_server_ts_bcc09dcb: {
  label: "server.ts"
}
`;case`temporal-workerFiles_hostComposition`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2Dir_src_host_16cb5924File_src_host_runTemporalWorkerHost_ts_50cefac9: {
  label: "runTemporalWorkerHost.ts"
}
`;case`temporal-workerFiles_runtime`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_createTemporalWorkerRuntime_ts_05c67170: {
  label: "createTemporalWorkerRuntime.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File__runtime_EnvironmentDbtRuntimeProfileResolver_ts_f0e1feb7: {
  label: "EnvironmentDbtRuntimeProfileResolver.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_nodeHttpsJsonClient_ts_7554d7cc: {
  label: "nodeHttpsJsonClient.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_ntime_objectFilePostgresDbtCommandEnvironment_ts_b3229875: {
  label: "objectFilePostgresDbtCommandEnvironment.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_runtimeTypes_ts_3859dc08: {
  label: "runtimeTypes.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_temporalWorkerDbtProfile_ts_3bbab614: {
  label: "temporalWorkerDbtProfile.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_temporalWorkerHost_ts_40f4bb7e: {
  label: "temporalWorkerHost.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_c_runtime_temporalWorkerHttpJsonArtifactStore_ts_e45b4f85: {
  label: "temporalWorkerHttpJsonArtifactStore.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_temporalWorkerHttpJsonProfile_ts_b6d7e198: {
  label: "temporalWorkerHttpJsonProfile.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_temporalWorkerLifecycle_ts_b18d1e18: {
  label: "temporalWorkerLifecycle.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_ntime_temporalWorkerObjectFilePostgresProfile_ts_47ea271b: {
  label: "temporalWorkerObjectFilePostgresProfile.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_temporalWorkerObjectFileReader_ts_224e37d5: {
  label: "temporalWorkerObjectFileReader.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_temporalWorkerRuntimeHandle_ts_82cb6aca: {
  label: "temporalWorkerRuntimeHandle.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_temporalWorkerRuntimeResources_ts_6add2f7f: {
  label: "temporalWorkerRuntimeResources.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16File_src_runtime_temporalWorkerStores_ts_30507c83: {
  label: "temporalWorkerStores.ts"
}
`;case`temporal-workerFiles_plugins`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2Dir_src_plugins_e2271fccFile_src_plugins_env_ts_a41c27b5: {
  label: "env.ts"
}
`;case`temporal-workerFiles_ops`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755File_src_ops_OperationalServer_ts_b7f6874b: {
  label: "OperationalServer.ts"
}
TemporalWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755File_src_ops_TemporalWorkerMonitor_ts_92206208: {
  label: "TemporalWorkerMonitor.ts"
}
`;case`traceabilityBoundary`:return`direction: right

TraceabilityModelSourceEvidence: {
  label: "Source evidence"
}
TraceabilityModelPublicBoundary: {
  label: "Traceability public boundary"
}
TraceabilityModelCli: {
  label: "Traceability CLI"
}
TraceabilityModelService: {
  label: "Traceability service"
}
TraceabilityModelCore: {
  label: "Traceability core"
}
TraceabilityModelAdapters: {
  label: "Traceability adapters"
}
TraceabilityModelLineage: {
  label: "Lineage mapping"
}

TraceabilityModelPublicBoundary -> TraceabilityModelService: "exports service"
TraceabilityModelService -> TraceabilityModelCore: "core traceability behavior"
TraceabilityModelService -> TraceabilityModelAdapters: "infrastructure access"
TraceabilityModelService -> TraceabilityModelLineage: "lineage projection"
TraceabilityModelCli -> TraceabilityModelService: "CLI facade"
`;case`traceabilitySourceInventory`:return`direction: down

TraceabilitySource: {
  label: "Traceability Service source inventory — generated from Git"

  Dir_docs_71ab8b6a: {
    label: "docs/ — 5 files"
  }
  Dir_src_f27fede2: {
    label: "src/ — 39 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 18 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_pnpm-workspace_yaml_5c19168a: {
    label: "pnpm-workspace.yaml"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_traceability_config_example_json_4f6423c1: {
    label: "traceability.config.example.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`traceability-serviceFiles_publicBoundary`:return`direction: down

TraceabilitySourceDir_src_f27fede2File_src_contracts_ts_9032c8ad: {
  label: "contracts.ts"
}
TraceabilitySourceDir_src_f27fede2File_src_index_ts_c5fb8502: {
  label: "index.ts"
}
TraceabilitySourceDir_src_f27fede2File_src_types_ts_cdcae080: {
  label: "types.ts"
}
`;case`traceability-serviceFiles_service`:return`direction: down

TraceabilitySourceDir_src_f27fede2File_src_service_ts_aaf7ca00: {
  label: "service.ts"
}
`;case`traceability-serviceFiles_core`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_header-parser_ts_e90f5c55: {
  label: "header-parser.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_issue-baseline_ts_dd4d3e42: {
  label: "issue-baseline.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_manifest-json_ts_c84d974c: {
  label: "manifest-json.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_manifest_ts_630abf9a: {
  label: "manifest.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_core_b256a6aeFile_src_core_validator_ts_e4510880: {
  label: "validator.ts"
}
`;case`traceability-serviceFiles_adapters`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_adapters_68aa84b0File_src_adapters_adr-catalog-filesystem_ts_3ed1c49a: {
  label: "adr-catalog-filesystem.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_adapters_68aa84b0File_src_adapters_header-scanner-glob_ts_f20e16cc: {
  label: "header-scanner-glob.ts"
}
`;case`traceability-serviceFiles_lineage`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_cache_3d5361c8File_src_lineage_cache_InMemoryCompiledCodeCache_ts_1f882d30: {
  label: "InMemoryCompiledCodeCache.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_compiledCodeRef_ts_60930993: {
  label: "compiledCodeRef.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_contracts_ts_981dfd42: {
  label: "contracts.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_errorContract_ts_744d1bc4: {
  label: "errorContract.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_errorPersistenceSupport_ts_7222dd9f: {
  label: "errorPersistenceSupport.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_errors_ts_f625dc09: {
  label: "errors.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_errorSupport_ts_d5a48fa1: {
  label: "errorSupport.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_facets_bb600362File_src_lineage_facets_SqlJobFacetBuilder_ts_18d17c58: {
  label: "SqlJobFacetBuilder.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_HttpOpenLineageSink_ts_3a495acd: {
  label: "HttpOpenLineageSink.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_index_ts_63a1c6b7: {
  label: "index.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_LineageOutboxObserver_ts_781ac147: {
  label: "LineageOutboxObserver.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_LineageWorkerRuntime_ts_30bebebb: {
  label: "LineageWorkerRuntime.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_logMessages_ts_84f1f8ad: {
  label: "logMessages.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_mapper_12020689File_neage_mapper_mapCompiledCodeResolutionWarning_ts_b494db86: {
  label: "mapCompiledCodeResolutionWarning.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_mapper_12020689File_src_lineage_mapper_StepStartedLineageMapper_ts_f8838fcb: {
  label: "StepStartedLineageMapper.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_openlineageSchema_ts_d8e9399b: {
  label: "openlineageSchema.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_readers_46be5146File_c_lineage_readers_CompositeCompiledCodeReader_ts_03763358: {
  label: "CompositeCompiledCodeReader.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_readers_46be5146File_src_lineage_readers_FileUriCompiledCodeReader_ts_bb467a9c: {
  label: "FileUriCompiledCodeReader.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_readers_46be5146File_rc_lineage_readers_InMemoryCompiledCodeReader_ts_06584e4c: {
  label: "InMemoryCompiledCodeReader.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_resolver_d076791fFile_eage_resolver_CachedRetryCompiledCodeResolver_ts_dc534e6e: {
  label: "CachedRetryCompiledCodeResolver.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_runtime_038dab8bFile_ineage_runtime_lineageWorkerDeadLetterSupport_ts_52952be2: {
  label: "lineageWorkerDeadLetterSupport.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_runtime_038dab8bFile_c_lineage_runtime_LineageWorkerLoopController_ts_30224aaf: {
  label: "LineageWorkerLoopController.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_runtime_038dab8bFile__lineage_runtime_lineageWorkerRecordProcessor_ts_fbe1d1fa: {
  label: "lineageWorkerRecordProcessor.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_runtime_038dab8bFile_rc_lineage_runtime_lineageWorkerRuntimeConfig_ts_6dc3c780: {
  label: "lineageWorkerRuntimeConfig.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_runtime_038dab8bFile_src_lineage_runtime_lineageWorkerTick_ts_6a253745: {
  label: "lineageWorkerTick.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_types_ts_06c3c3bc: {
  label: "types.ts"
}
TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8File_src_lineage_warningContract_ts_d5156880: {
  label: "warningContract.ts"
}
`;case`traceability-serviceFiles_cli`:return`direction: down

TraceabilitySourceDir_src_f27fede2File_src_cli_ts_c443bc51: {
  label: "cli.ts"
}
`;case`webBoundary`:return`direction: right

WebModelSourceEvidence: {
  label: "Source evidence"
}
WebModelBootstrap: {
  label: "Web application bootstrap"
}
WebModelShell: {
  label: "Application shell"
}
WebModelRouting: {
  label: "Route + bootstrap boundary"
}
WebModelQueries: {
  label: "Web query boundary"
}
WebModelServices: {
  label: "Frontend application services"
}
WebModelStores: {
  label: "Frontend interaction stores"
}
WebModelPlatformHealth: {
  label: "Platform health capability"
}
WebModelRuntimeCapabilities: {
  label: "Runtime capabilities capability"
}
WebModelPlugins: {
  label: "Web plugin registry + contributions"
}
WebModelRouteViews: {
  label: "Route views"
}

WebModelBootstrap -> WebModelShell: "mount app shell"
WebModelShell -> WebModelRouting: "render routed workspace"
WebModelRouting -> WebModelPlugins: "plugin route contributions"
WebModelShell -> WebModelQueries: "read backend state/capabilities"
WebModelShell -> WebModelServices: "frontend application services"
WebModelShell -> WebModelStores: "interaction/presentation state"
WebModelRouting -> WebModelRouteViews: "route views"
WebModelShell -> WebModelPlatformHealth: "health posture"
WebModelShell -> WebModelRuntimeCapabilities: "capability posture"
`;case`webSourceInventory`:return`direction: down

WebSource: {
  label: "Web source inventory — generated from Git"

  Dir_cypress_b5e13a91: {
    label: "cypress/ — 60 files"
  }
  Dir_guidelines_6df1ecfa: {
    label: "guidelines/ — 1 files"
  }
  Dir_public_61c9b2b1: {
    label: "public/ — 6 files"
  }
  Dir_scripts_16728d18: {
    label: "scripts/ — 2 files"
  }
  Dir_src_f27fede2: {
    label: "src/ — 1506 files"
  }
  File__env_e2e_559c1866: {
    label: ".env.e2e"
  }
  File_ATTRIBUTIONS_md_eef2bf9d: {
    label: "ATTRIBUTIONS.md"
  }
  File_cypress_config_ts_8d051827: {
    label: "cypress.config.ts"
  }
  File_index_html_f6013a00: {
    label: "index.html"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_postcss_config_mjs_aaf1cf9f: {
    label: "postcss.config.mjs"
  }
  File_README_md_8ec9a00b: {
    label: "README.md"
  }
  File_tsconfig_eslint_json_df42856a: {
    label: "tsconfig.eslint.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_turbo_json_40849b8c: {
    label: "turbo.json"
  }
  File_vite_config_ts_75ea7f3e: {
    label: "vite.config.ts"
  }
  File_vite_manualChunks_ts_33de50fa: {
    label: "vite.manualChunks.ts"
  }
  File_vitest_architecture_config_ts_aff54d64: {
    label: "vitest.architecture.config.ts"
  }
  File_vitest_canvas-architecture_config_ts_ff438099: {
    label: "vitest.canvas-architecture.config.ts"
  }
  File_vitest_canvas-presentation_config_ts_9296f0ed: {
    label: "vitest.canvas-presentation.config.ts"
  }
  File_vitest_canvas-unit_config_ts_4a6fd712: {
    label: "vitest.canvas-unit.config.ts"
  }
  File_vitest_canvas_config_ts_fffb4ad3: {
    label: "vitest.canvas.config.ts"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
  File_vitest_monaco_config_ts_580df4ef: {
    label: "vitest.monaco.config.ts"
  }
  File_vitest_presentation_config_ts_ae19fba8: {
    label: "vitest.presentation.config.ts"
  }
  File_vitest_shell-session_config_ts_39303766: {
    label: "vitest.shell-session.config.ts"
  }
  File_vitest_suites_ts_ff1430b2: {
    label: "vitest.suites.ts"
  }
  File_vitest_unit_config_ts_075213c7: {
    label: "vitest.unit.config.ts"
  }
  File_vitest_workspace-services_config_ts_0faeb318: {
    label: "vitest.workspace-services.config.ts"
  }
}
`;case`webFiles_bootstrap`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_App_tsx_f9f44c96: {
  label: "App.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_AppProviders_tsx_2def0995: {
  label: "AppProviders.tsx"
}
WebSourceDir_src_f27fede2File_src_main_tsx_60f616ca: {
  label: "main.tsx"
}
`;case`webFiles_shell`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_AppBrandMark_tsx_63e542da: {
  label: "AppBrandMark.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_app_components_canvas_CanvasNodeBadgeOverlay_tsx_f5bcc55d: {
  label: "CanvasNodeBadgeOverlay.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_onents_canvas_canvasNodeContextMenuModel_test_ts_57bfa57d: {
  label: "canvasNodeContextMenuModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File__components_canvas_canvasNodeContextMenuModel_ts_88234b43: {
  label: "canvasNodeContextMenuModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_onents_canvas_CanvasNodeContextMenuView_test_tsx_ec6d83ed: {
  label: "CanvasNodeContextMenuView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File__components_canvas_CanvasNodeContextMenuView_tsx_8a5423c7: {
  label: "CanvasNodeContextMenuView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_onents_canvas_canvasNodeFlowAdapterProjection_ts_8c477a77: {
  label: "canvasNodeFlowAdapterProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_mponents_canvas_canvasNodeInteractionBoundary_ts_147db6ab: {
  label: "canvasNodeInteractionBoundary.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File__components_canvas_CanvasNodePortHandle_test_tsx_8c8c100b: {
  label: "CanvasNodePortHandle.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_c_app_components_canvas_CanvasNodePortHandle_tsx_07469900: {
  label: "CanvasNodePortHandle.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_ts_canvas_canvasNodePresentationCopy_contract_ts_ccaab6e3: {
  label: "canvasNodePresentationCopy.contract.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_s_canvas_canvasNodePresentationTruth_contract_ts_5da22ed9: {
  label: "canvasNodePresentationTruth.contract.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_nents_canvas_canvasNodePresentationTruth_test_ts_845a8493: {
  label: "canvasNodePresentationTruth.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_components_canvas_canvasNodePresentationTruth_ts_48245818: {
  label: "canvasNodePresentationTruth.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_app_components_canvas_CanvasNodeShell_module_css_d7b94154: {
  label: "CanvasNodeShell.module.css"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_c_app_components_canvas_CanvasNodeShell_test_tsx_c947e912: {
  label: "CanvasNodeShell.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_src_app_components_canvas_CanvasNodeShell_tsx_b74df17e: {
  label: "CanvasNodeShell.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_onents_canvas_DbtNodeComponent_behavior_test_tsx_aa16e2f4: {
  label: "DbtNodeComponent.behavior.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_vas_DbtNodeComponent_failureContainment_test_tsx_22803dc9: {
  label: "DbtNodeComponent.failureContainment.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56File_src_app_components_canvas_DbtNodeComponent_tsx_3218e199: {
  label: "DbtNodeComponent.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File__components_canvasWorkspaceExplorerModel_test_ts_8af568d5: {
  label: "canvasWorkspaceExplorerModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_c_app_components_canvasWorkspaceExplorerModel_ts_7f3c3f78: {
  label: "canvasWorkspaceExplorerModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_console_097c0ee3File_src_app_components_console_formatLogLine_test_ts_747bb743: {
  label: "formatLogLine.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_console_097c0ee3File_src_app_components_console_formatLogLine_ts_49815b96: {
  label: "formatLogLine.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_console_097c0ee3File_rc_app_components_console_useConsoleLogStream_ts_f7bb5097: {
  label: "useConsoleLogStream.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_console_097c0ee3File_src_app_components_console_XtermConsole_tsx_9b54d64b: {
  label: "XtermConsole.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_dbtExecutionTargetBinding_ts_937a9775: {
  label: "dbtExecutionTargetBinding.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15File_ponents_dbtProjectImport_dbtProjectImportCopy_ts_01241d5f: {
  label: "dbtProjectImportCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15File_dbtProjectImport_DbtProjectImportDialog_test_tsx_d4328082: {
  label: "DbtProjectImportDialog.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15File_ents_dbtProjectImport_DbtProjectImportDialog_tsx_1bf4b730: {
  label: "DbtProjectImportDialog.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15File_rojectImport_DbtProjectImportDialogView_test_tsx_b5d53857: {
  label: "DbtProjectImportDialogView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15File__dbtProjectImport_DbtProjectImportDialogView_tsx_b6178297: {
  label: "DbtProjectImportDialogView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15File_Import_dbtProjectImportPresentationModel_test_ts_2d75ef91: {
  label: "dbtProjectImportPresentationModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15File_ojectImport_dbtProjectImportPresentationModel_ts_a618242b: {
  label: "dbtProjectImportPresentationModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15File_btProjectImport_useDbtProjectImportController_ts_f3af8daf: {
  label: "useDbtProjectImportController.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_r_dbtYamlDescriptionAnalysisPresentation_test_ts_796b9925: {
  label: "dbtYamlDescriptionAnalysisPresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_Editor_dbtYamlDescriptionAnalysisPresentation_ts_3ab145f9: {
  label: "dbtYamlDescriptionAnalysisPresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_criptionEditor_DbtYamlDescriptionEditor_test_tsx_daa20705: {
  label: "DbtYamlDescriptionEditor.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_mlDescriptionEditor_DbtYamlDescriptionEditor_tsx_a1ddde0f: {
  label: "DbtYamlDescriptionEditor.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_ptionEditor_dbtYamlDescriptionEditorCopy_test_ts_3456d8f2: {
  label: "dbtYamlDescriptionEditorCopy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_escriptionEditor_dbtYamlDescriptionEditorCopy_ts_0264920e: {
  label: "dbtYamlDescriptionEditorCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_tionEditor_dbtYamlDescriptionEditorModel_test_ts_9e8988b9: {
  label: "dbtYamlDescriptionEditorModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_scriptionEditor_dbtYamlDescriptionEditorModel_ts_27d4cba8: {
  label: "dbtYamlDescriptionEditorModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_tionEditor_DbtYamlDescriptionEditorView_test_tsx_db9f05ae: {
  label: "DbtYamlDescriptionEditorView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_scriptionEditor_DbtYamlDescriptionEditorView_tsx_b67efaef: {
  label: "DbtYamlDescriptionEditorView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_onEditor_dbtYamlDescriptionEditorVisualTokens_ts_d516373f: {
  label: "dbtYamlDescriptionEditorVisualTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6aFile_DescriptionEditor_useDbtYamlDescriptionEditor_ts_6eddf76a: {
  label: "useDbtYamlDescriptionEditor.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_domain_28b2f38fFile__app_components_domain_domainComponents_test_tsx_fbbd38c6: {
  label: "domainComponents.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_domain_28b2f38fFile_src_app_components_domain_index_ts_5f28a3de: {
  label: "index.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_domain_28b2f38fFile_src_app_components_domain_StatCard_tsx_bbdc8443: {
  label: "StatCard.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_domain_28b2f38fFile_src_app_components_domain_StatusIndicator_tsx_51761523: {
  label: "StatusIndicator.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_domain_28b2f38fFile_src_app_components_domain_ViewHeader_tsx_300be5e9: {
  label: "ViewHeader.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_domain_28b2f38fFile_src_app_components_domain_ViewStateOverlay_tsx_824f9d37: {
  label: "ViewStateOverlay.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_figma_2a88ef35File__app_components_figma_ImageWithFallback_test_tsx_a84ec845: {
  label: "ImageWithFallback.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_figma_2a88ef35File_src_app_components_figma_ImageWithFallback_tsx_97475d07: {
  label: "ImageWithFallback.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_omponents_inspector_dbtTestRowsReadModel_test_ts_608ffbcd: {
  label: "dbtTestRowsReadModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_app_components_inspector_dbtTestRowsReadModel_ts_908fe4bf: {
  label: "dbtTestRowsReadModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_ents_inspector_dbtTestSemanticsPresenter_test_ts_04f64026: {
  label: "dbtTestSemanticsPresenter.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_omponents_inspector_dbtTestSemanticsPresenter_ts_2e4f5057: {
  label: "dbtTestSemanticsPresenter.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_pp_components_inspector_inspectorVisualTokens_ts_903d3fd9: {
  label: "inspectorVisualTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_onents_inspector_nodePropertiesReadModel_test_ts_4bd06222: {
  label: "nodePropertiesReadModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File__components_inspector_nodePropertiesReadModel_ts_f747e45e: {
  label: "nodePropertiesReadModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_nspector_NodePropertiesTabs_architecture_test_ts_f7039f5f: {
  label: "NodePropertiesTabs.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_s_inspector_NodePropertiesTabs_overflow_test_tsx_c9484c40: {
  label: "NodePropertiesTabs.overflow.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_ctor_NodePropertiesTabs_primarySections_test_tsx_9158b0c0: {
  label: "NodePropertiesTabs.primarySections.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_ector_NodePropertiesTabs_sectionContent_test_tsx_9767de5e: {
  label: "NodePropertiesTabs.sectionContent.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File__app_components_inspector_NodePropertiesTabs_tsx_1fb2abaf: {
  label: "NodePropertiesTabs.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_nents_inspector_NodePropertySectionView_test_tsx_c41fb4b3: {
  label: "NodePropertySectionView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_components_inspector_NodePropertySectionView_tsx_03076111: {
  label: "NodePropertySectionView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_s_inspector_structuredColumnPresentation_test_ts_b37a18f3: {
  label: "structuredColumnPresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222File_onents_inspector_structuredColumnPresentation_ts_2458964f: {
  label: "structuredColumnPresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_LeftNavigation_tsx_ed6f70cd: {
  label: "LeftNavigation.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_metrics_ceb46efdFile_omponents_metrics_MetricEvidenceHotspot_test_tsx_43476249: {
  label: "MetricEvidenceHotspot.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_metrics_ceb46efdFile_app_components_metrics_MetricEvidenceHotspot_tsx_379cd0f0: {
  label: "MetricEvidenceHotspot.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_metrics_ceb46efdFile_c_app_components_metrics_metricEvidenceTokens_ts_e878a577: {
  label: "metricEvidenceTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_Modals_test_tsx_ab96588b: {
  label: "Modals.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_Modals_tsx_16944660: {
  label: "Modals.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_onaco_monacoBundleIsolation_architecture_test_ts_7cecde4c: {
  label: "monacoBundleIsolation.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_src_app_components_monaco_MonacoCodeEditor_tsx_56b014b4: {
  label: "MonacoCodeEditor.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_src_app_components_monaco_MonacoCodeSurface_tsx_b8124989: {
  label: "MonacoCodeSurface.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_src_app_components_monaco_MonacoCodeViewer_tsx_e66f9522: {
  label: "MonacoCodeViewer.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_src_app_components_monaco_MonacoDiffSurface_tsx_0579af6d: {
  label: "MonacoDiffSurface.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_src_app_components_monaco_MonacoDiffViewer_tsx_b957f28c: {
  label: "MonacoDiffViewer.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_src_app_components_monaco_monacoLocalWorkers_ts_20f04064: {
  label: "monacoLocalWorkers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_c_app_components_monaco_MonacoViewerFallback_tsx_5eed26c5: {
  label: "MonacoViewerFallback.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_s_monaco_monacoVisualTokens_architecture_test_ts_5bc92850: {
  label: "monacoVisualTokens.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_src_app_components_monaco_monacoVisualTokens_ts_0bdf057a: {
  label: "monacoVisualTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8cccFile_rc_app_components_monaco_useMonacoCodeSurface_ts_335de807: {
  label: "useMonacoCodeSurface.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_pp_components_PlanExecutionDecisionView_test_tsx_b744c408: {
  label: "PlanExecutionDecisionView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_PlanExecutionDecisionView_tsx_5d862d5d: {
  label: "PlanExecutionDecisionView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_pp_components_PlanPreviewModal_outcomes_test_tsx_08478139: {
  label: "PlanPreviewModal.outcomes.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_PlanPreviewModal_test_tsx_ea737a7e: {
  label: "PlanPreviewModal.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_PlanPreviewModal_tsx_f0d141cf: {
  label: "PlanPreviewModal.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_runs_7fd3dae6File_c_app_components_runs_RunControlActions_test_tsx_c16849c3: {
  label: "RunControlActions.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_runs_7fd3dae6File_src_app_components_runs_RunControlActions_tsx_c978ee50: {
  label: "RunControlActions.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_runs_7fd3dae6File_src_app_components_runs_runControlCopy_ts_d994b20b: {
  label: "runControlCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_rc_app_components_shell_appBuildMetadata_test_ts_a11304ea: {
  label: "appBuildMetadata.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_appBuildMetadata_ts_98209995: {
  label: "appBuildMetadata.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_AppShellFrame_test_tsx_567dd5c5: {
  label: "AppShellFrame.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_AppShellFrame_tsx_9273b594: {
  label: "AppShellFrame.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_omponents_shell_BottomOperationalDrawer_test_tsx_d4277258: {
  label: "BottomOperationalDrawer.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_app_components_shell_BottomOperationalDrawer_tsx_e91a9c54: {
  label: "BottomOperationalDrawer.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_ts_shell_bottomOperationalDrawerLogModel_test_ts_81bda446: {
  label: "bottomOperationalDrawerLogModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_ponents_shell_bottomOperationalDrawerLogModel_ts_6fb7b500: {
  label: "bottomOperationalDrawerLogModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_chrome_ts_641436ba: {
  label: "chrome.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_copy_ts_0bb778e4: {
  label: "copy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_shell_operationalDrawerContributionStore_test_ts_d1195c40: {
  label: "operationalDrawerContributionStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_ents_shell_operationalDrawerContributionStore_ts_09706147: {
  label: "operationalDrawerContributionStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_onents_shell_OperationalDrawerDataTable_test_tsx_ed15244c: {
  label: "OperationalDrawerDataTable.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File__components_shell_OperationalDrawerDataTable_tsx_c28d8663: {
  label: "OperationalDrawerDataTable.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_nents_shell_OperationalDrawerPanelPrimitives_tsx_41b2d2a7: {
  label: "OperationalDrawerPanelPrimitives.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_s_shell_OperationalDrawerPanels_actions_test_tsx_958f4021: {
  label: "OperationalDrawerPanels.actions.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_ell_OperationalDrawerPanels_architecture_test_ts_15d46d80: {
  label: "OperationalDrawerPanels.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_omponents_shell_OperationalDrawerPanels_test_tsx_d18e0ea3: {
  label: "OperationalDrawerPanels.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_app_components_shell_OperationalDrawerPanels_tsx_40a4f955: {
  label: "OperationalDrawerPanels.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_ll_operationalDrawerSelectionRecoveryMessages_ts_73e07084: {
  label: "operationalDrawerSelectionRecoveryMessages.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_OperationalDrawerSelectionRecoveryPrimitives_tsx_b090e304: {
  label: "OperationalDrawerSelectionRecoveryPrimitives.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File__OperationalDrawerSelectionRecoveryView_test_tsx_c3e6ad3d: {
  label: "OperationalDrawerSelectionRecoveryView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_shell_OperationalDrawerSelectionRecoveryView_tsx_cf034f4a: {
  label: "OperationalDrawerSelectionRecoveryView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_ponents_shell_OperationalDrawerTabStrip_test_tsx_36f7d24a: {
  label: "OperationalDrawerTabStrip.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_p_components_shell_OperationalDrawerTabStrip_tsx_a303a05a: {
  label: "OperationalDrawerTabStrip.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_ShellAppMenu_tsx_506c6076: {
  label: "ShellAppMenu.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_c_app_components_shell_ShellConnectionStatus_tsx_efaf2482: {
  label: "ShellConnectionStatus.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_ShellGitRef_tsx_0cd44d06: {
  label: "ShellGitRef.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_ShellMenu_tsx_97c38e1f: {
  label: "ShellMenu.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_p_components_shell_ShellProjectIdentityBadge_tsx_efa59864: {
  label: "ShellProjectIdentityBadge.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_app_components_shell_ShellRunStatusIndicator_tsx_d113af6d: {
  label: "ShellRunStatusIndicator.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File__components_shell_shellViewControlsModel_test_ts_f11c9efb: {
  label: "shellViewControlsModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_c_app_components_shell_shellViewControlsModel_ts_61478b62: {
  label: "shellViewControlsModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_omponents_shell_ShellWorkspaceContextDetails_tsx_45014eb4: {
  label: "ShellWorkspaceContextDetails.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_p_components_shell_ShellWorkspaceContextMenu_tsx_ad7f1bc1: {
  label: "ShellWorkspaceContextMenu.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_nents_shell_ShellWorkspaceScopeSelector_test_tsx_f1f50bf0: {
  label: "ShellWorkspaceScopeSelector.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_components_shell_ShellWorkspaceScopeSelector_tsx_92a29ce8: {
  label: "ShellWorkspaceScopeSelector.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39File_src_app_components_shell_types_ts_fe6ec9d6: {
  label: "types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_ShellHealthBanner_tsx_e90651cf: {
  label: "ShellHealthBanner.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_ponents_SourceImportWizard_architecture_test_tsx_220b25ea: {
  label: "SourceImportWizard.architecture.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File__components_SourceImportWizard_metadata_test_tsx_03977699: {
  label: "SourceImportWizard.metadata.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_omponents_SourceImportWizard_navigation_test_tsx_e106bbd7: {
  label: "SourceImportWizard.navigation.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_onents_SourceImportWizard_pluginOptions_test_tsx_c588877d: {
  label: "SourceImportWizard.pluginOptions.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_SourceImportWizard_test_tsx_3d7d8391: {
  label: "SourceImportWizard.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_pp_components_SourceImportWizard_testHarness_tsx_4d9102fa: {
  label: "SourceImportWizard.testHarness.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_SourceImportWizard_tsx_53aeba66: {
  label: "SourceImportWizard.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_components_sourceImportWizard_ConnectionStep_tsx_402d547d: {
  label: "ConnectionStep.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_c_app_components_sourceImportWizard_constants_ts_cc516dad: {
  label: "constants.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_src_app_components_sourceImportWizard_copy_ts_fc444338: {
  label: "copy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ponents_sourceImportWizard_GroupingStep_test_tsx_e400897c: {
  label: "GroupingStep.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_p_components_sourceImportWizard_GroupingStep_tsx_4da1b615: {
  label: "GroupingStep.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_pp_components_sourceImportWizard_OptionsStep_tsx_e791659a: {
  label: "OptionsStep.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_app_components_sourceImportWizard_ResultStep_tsx_af8f05ce: {
  label: "ResultStep.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_app_components_sourceImportWizard_ReviewStep_tsx_dc83d4ec: {
  label: "ReviewStep.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile__components_sourceImportWizard_SelectionStep_tsx_8921693f: {
  label: "SelectionStep.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_rceImportWizard_sourceImportCatalogModel_test_ts_9ede36f2: {
  label: "sourceImportCatalogModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_s_sourceImportWizard_sourceImportCatalogModel_ts_9dc63ae2: {
  label: "sourceImportCatalogModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ceImportWizard_SourceImportCatalogPrimitives_tsx_194b1772: {
  label: "SourceImportCatalogPrimitives.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_tWizard_sourceImportCatalogSourceObjects_test_ts_b0abe98a: {
  label: "sourceImportCatalogSourceObjects.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ard_SourceImportCatalogView_architecture_test_ts_71823493: {
  label: "SourceImportCatalogView.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_rceImportWizard_SourceImportCatalogView_test_tsx_58bdd97f: {
  label: "SourceImportCatalogView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_s_sourceImportWizard_SourceImportCatalogView_tsx_443ea164: {
  label: "SourceImportCatalogView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_rceImportWizard_sourceImportCommandModel_test_ts_8bd1d25e: {
  label: "sourceImportCommandModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_s_sourceImportWizard_sourceImportCommandModel_ts_154cb121: {
  label: "sourceImportCommandModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ceImportWizard_SourceImportConstraintMarkers_tsx_b4772d08: {
  label: "SourceImportConstraintMarkers.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile__sourceImportWizard_sourceImportMetadataModel_ts_aa30ea61: {
  label: "sourceImportMetadataModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_eImportWizard_SourceImportMetadataPanel_test_tsx_fcdc99bb: {
  label: "SourceImportMetadataPanel.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_sourceImportWizard_SourceImportMetadataPanel_tsx_eb10fac2: {
  label: "SourceImportMetadataPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_mportWizard_SourceImportObjectsMetadata_test_tsx_89074c94: {
  label: "SourceImportObjectsMetadata.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_urceImportWizard_SourceImportObjectsMetadata_tsx_a063862a: {
  label: "SourceImportObjectsMetadata.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_urceImportWizard_sourceImportReviewModel_test_ts_756009f2: {
  label: "sourceImportReviewModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ts_sourceImportWizard_sourceImportReviewModel_ts_2ca5cc98: {
  label: "sourceImportReviewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_urceImportWizard_SourceImportReviewView_test_tsx_3bb75cb1: {
  label: "SourceImportReviewView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ts_sourceImportWizard_SourceImportReviewView_tsx_b167158d: {
  label: "SourceImportReviewView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_rceImportWizard_SourceImportSectionTabs_test_tsx_a9b29b84: {
  label: "SourceImportSectionTabs.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_s_sourceImportWizard_SourceImportSectionTabs_tsx_e5f91561: {
  label: "SourceImportSectionTabs.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_mportWizard_SourceImportSelectionBasket_test_tsx_88c3e051: {
  label: "SourceImportSelectionBasket.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_urceImportWizard_SourceImportSelectionBasket_tsx_8abe8bf7: {
  label: "SourceImportSelectionBasket.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_eImportWizard_sourceImportWizard_testFixtures_ts_32f8501f: {
  label: "sourceImportWizard.testFixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ortWizard_SourceImportWizardFrame_focus_test_tsx_04783996: {
  label: "SourceImportWizardFrame.focus.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_s_sourceImportWizard_SourceImportWizardFrame_tsx_f9be4566: {
  label: "SourceImportWizardFrame.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_urceImportWizard_sourceImportWizardModel_test_ts_57f8a30f: {
  label: "sourceImportWizardModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ts_sourceImportWizard_sourceImportWizardModel_ts_d23423a2: {
  label: "sourceImportWizardModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_src_app_components_sourceImportWizard_types_ts_8fa0e4f4: {
  label: "types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ents_sourceImportWizard_useSourceImportWizard_ts_4693575d: {
  label: "useSourceImportWizard.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ImportWizard_useSourceImportWizardDataLoaders_ts_2892b052: {
  label: "useSourceImportWizardDataLoaders.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ceImportWizard_WarehouseConnectionCreateForm_tsx_ef36ebd1: {
  label: "WarehouseConnectionCreateForm.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ceImportWizard_WarehouseConnectionRenameForm_tsx_2f5b6a09: {
  label: "WarehouseConnectionRenameForm.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_components_sourceImportWizard_WizardProgress_tsx_87586d94: {
  label: "WizardProgress.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdcFile_ponents_sourceImportWizard_WizardStepContent_tsx_bc7ff3df: {
  label: "WizardStepContent.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_rc_app_components_TopAppBar_architecture_test_ts_5816fa8d: {
  label: "TopAppBar.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_TopAppBar_test_tsx_4e9c66ea: {
  label: "TopAppBar.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4File_src_app_components_TopAppBar_tsx_193ff5de: {
  label: "TopAppBar.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_transientSurface_9f91595dFile_transientSurface_usePointerGraceDismiss_test_tsx_b746630d: {
  label: "usePointerGraceDismiss.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_transientSurface_9f91595dFile_nents_transientSurface_usePointerGraceDismiss_ts_94f7e301: {
  label: "usePointerGraceDismiss.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_accordion_tsx_9b9c9aa1: {
  label: "accordion.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_alert-dialog_tsx_55326597: {
  label: "alert-dialog.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_alert_tsx_3f7c2449: {
  label: "alert.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_aspect-ratio_tsx_53d5486b: {
  label: "aspect-ratio.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_avatar_tsx_ccb235d1: {
  label: "avatar.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_badge_tsx_f3ad240b: {
  label: "badge.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_breadcrumb_tsx_d6614188: {
  label: "breadcrumb.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_button_tsx_e4423dc4: {
  label: "button.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_calendar_test_tsx_342371f1: {
  label: "calendar.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_calendar_tsx_19671930: {
  label: "calendar.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_card_tsx_7924bd91: {
  label: "card.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_carousel_tsx_abfcdee6: {
  label: "carousel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_chart_tsx_732d409b: {
  label: "chart.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_checkbox_tsx_298cbb8a: {
  label: "checkbox.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_collapsible_tsx_07cdb752: {
  label: "collapsible.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_command_tsx_8d80ecc1: {
  label: "command.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_context-menu_tsx_8951f02f: {
  label: "context-menu.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_dialog_tsx_ce41d0dc: {
  label: "dialog.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_drawer_tsx_e8b2a7c3: {
  label: "drawer.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_dropdown-menu_tsx_07cd2bba: {
  label: "dropdown-menu.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_form_tsx_45578644: {
  label: "form.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_hover-card_tsx_0c3a2338: {
  label: "hover-card.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_input-otp_tsx_81597eb1: {
  label: "input-otp.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_input_tsx_ce013656: {
  label: "input.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_label_tsx_5d88d0e8: {
  label: "label.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_menubar_tsx_36c61f3e: {
  label: "menubar.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_navigation-menu_tsx_569ed0d4: {
  label: "navigation-menu.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_pagination_tsx_fbe19235: {
  label: "pagination.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_popover_tsx_0995de66: {
  label: "popover.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_progress_tsx_58a97ca0: {
  label: "progress.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_radio-group_tsx_ec4f026c: {
  label: "radio-group.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_resizable_tsx_29ffc7d0: {
  label: "resizable.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_scroll-area_tsx_09297970: {
  label: "scroll-area.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_select_tsx_61aec7b8: {
  label: "select.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_separator_tsx_c24f3c9c: {
  label: "separator.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_settings_json_3bf4b9d7: {
  label: "settings.json"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_sheet_tsx_f22d30c0: {
  label: "sheet.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_sidebar_tsx_9fd4d181: {
  label: "sidebar.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_skeleton_tsx_34bc6c28: {
  label: "skeleton.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_slider_tsx_38bf3e34: {
  label: "slider.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_sonner_tsx_a3be7c3e: {
  label: "sonner.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_switch_tsx_6cd079f1: {
  label: "switch.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_table_tsx_fbc0f14f: {
  label: "table.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_tabs_tsx_62501315: {
  label: "tabs.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_textarea_tsx_792b9715: {
  label: "textarea.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_toggle-group_tsx_c9ad1763: {
  label: "toggle-group.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_toggle_tsx_d5748b86: {
  label: "toggle.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_tooltip_tsx_c9f197c8: {
  label: "tooltip.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_p_components_ui_use-draggable-dialog-position_ts_4159efc9: {
  label: "use-draggable-dialog-position.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_use-mobile_ts_a2613aa8: {
  label: "use-mobile.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9bFile_src_app_components_ui_utils_ts_9d071418: {
  label: "utils.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3File_rkbench_routeWorkbenchFrame_architecture_test_ts_aa30c209: {
  label: "routeWorkbenchFrame.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3File_omponents_workbench_RouteWorkbenchFrame_test_tsx_d9333b7f: {
  label: "RouteWorkbenchFrame.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3File_app_components_workbench_RouteWorkbenchFrame_tsx_c8cbc6d9: {
  label: "RouteWorkbenchFrame.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3File_omponents_workbench_routeWorkbenchTableTokens_ts_6869cffa: {
  label: "routeWorkbenchTableTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3Dir_src_app_components_workbench_state_3d11c6c0File_ponents_workbench_state_WorkbenchStates_test_tsx_0d42c752: {
  label: "WorkbenchStates.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3Dir_src_app_components_workbench_state_3d11c6c0File_p_components_workbench_state_WorkbenchStates_tsx_02a71508: {
  label: "WorkbenchStates.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3File_nts_workbench_WorkbenchPropertiesWindow_test_tsx_925dedfd: {
  label: "WorkbenchPropertiesWindow.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3File_mponents_workbench_WorkbenchPropertiesWindow_tsx_f021ff78: {
  label: "WorkbenchPropertiesWindow.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_Root_tsx_09ee9255: {
  label: "Root.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_projectIdentityBadge_test_ts_c1a6429d: {
  label: "projectIdentityBadge.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_projectIdentityBadge_ts_b071600e: {
  label: "projectIdentityBadge.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile__shellNavigationDisposition_architecture_test_ts_04a18d7b: {
  label: "shellNavigationDisposition.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_shellNavigationDisposition_test_ts_49c6b247: {
  label: "shellNavigationDisposition.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_shellNavigationDisposition_ts_f0204078: {
  label: "shellNavigationDisposition.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_shellNavigationModel_test_ts_71ef804d: {
  label: "shellNavigationModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_shellNavigationModel_ts_3cdda642: {
  label: "shellNavigationModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_shellRuntimeModel_test_ts_e210f2b6: {
  label: "shellRuntimeModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_shellRuntimeModel_ts_7b05ca12: {
  label: "shellRuntimeModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbcFile_src_app_shell_useShellRuntime_ts_33585c18: {
  label: "useShellRuntime.ts"
}
`;case`webFiles_routing`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_appBootstrapCommands_test_ts_d7c3be92: {
  label: "appBootstrapCommands.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_appBootstrapCommands_ts_4ad30e6f: {
  label: "appBootstrapCommands.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_appBootstrapCopy_ts_75f972d5: {
  label: "appBootstrapCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_appBootstrapDomContract_ts_27a5db53: {
  label: "appBootstrapDomContract.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_c_app_bootstrap_appBootstrapPresentation_test_ts_f4f5b313: {
  label: "appBootstrapPresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_appBootstrapPresentation_ts_c4d139d2: {
  label: "appBootstrapPresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_appBootstrapScreen_test_ts_9f0ef187: {
  label: "appBootstrapScreen.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_appBootstrapScreen_ts_1432f615: {
  label: "appBootstrapScreen.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_AuthRouteGate_test_tsx_a1957a69: {
  label: "AuthRouteGate.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_AuthRouteGate_tsx_e5049951: {
  label: "AuthRouteGate.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_bootstrapProgressBar_ts_0fb6a0e5: {
  label: "bootstrapProgressBar.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_routeBootstrapContract_ts_3f40a2af: {
  label: "routeBootstrapContract.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_app_bootstrap_routeBootstrapDataRouterContext_ts_81ab8a5e: {
  label: "routeBootstrapDataRouterContext.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_rc_app_bootstrap_routeBootstrapErrorCopy_test_ts_61fd2af1: {
  label: "routeBootstrapErrorCopy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_routeBootstrapErrorCopy_ts_57e56755: {
  label: "routeBootstrapErrorCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_routeBootstrapErrors_ts_884ebcd2: {
  label: "routeBootstrapErrors.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_routeBootstrapRegistration_ts_746c1dfa: {
  label: "routeBootstrapRegistration.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_routeBootstrapRegistry_test_ts_2cd6b2ad: {
  label: "routeBootstrapRegistry.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_routeBootstrapRegistry_ts_0d187b27: {
  label: "routeBootstrapRegistry.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_teBootstrapStartupReadiness_architecture_test_ts_af4e9e10: {
  label: "routeBootstrapStartupReadiness.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_bootstrap_routeBootstrapStartupReadiness_test_ts_f22c43c8: {
  label: "routeBootstrapStartupReadiness.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File__app_bootstrap_routeBootstrapStartupReadiness_ts_1e30984f: {
  label: "routeBootstrapStartupReadiness.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_c_app_bootstrap_StaticRouteBootstrapBoundary_tsx_3b2cfb1d: {
  label: "StaticRouteBootstrapBoundary.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_rap_useActiveRouteBootstrapRegistration_test_tsx_03f49826: {
  label: "useActiveRouteBootstrapRegistration.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_bootstrap_useActiveRouteBootstrapRegistration_ts_0e37cb59: {
  label: "useActiveRouteBootstrapRegistration.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_pp_bootstrap_usePublishedRouteBootstrap_test_tsx_e927d4d2: {
  label: "usePublishedRouteBootstrap.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_src_app_bootstrap_usePublishedRouteBootstrap_ts_325c052a: {
  label: "usePublishedRouteBootstrap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754File_ap_webAuthProjectOnboarding_architecture_test_ts_24b4962a: {
  label: "webAuthProjectOnboarding.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7File_src_app_routes_ts_5fae9da1: {
  label: "routes.ts"
}
`;case`webFiles_plugins`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File__app_plugins_canvasExecutionStrategyContracts_ts_1e21b7d1: {
  label: "canvasExecutionStrategyContracts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_rc_app_plugins_canvasSurfaceStrategyContracts_ts_570a90be: {
  label: "canvasSurfaceStrategyContracts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_contracts_26264c58File_rc_app_plugins_contracts_ConnectionRules_test_ts_2cc35acd: {
  label: "ConnectionRules.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_contracts_26264c58File_src_app_plugins_contracts_ConnectionRules_ts_8346bcb3: {
  label: "ConnectionRules.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_contracts_26264c58File_src_app_plugins_contracts_NodeCostData_ts_751b12e8: {
  label: "NodeCostData.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_contracts_26264c58File_src_app_plugins_contracts_NodeRendering_ts_21032903: {
  label: "NodeRendering.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_contracts_26264c58File_src_app_plugins_contracts_PluginManifest_ts_0e3b7fa9: {
  label: "PluginManifest.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_cost_24b9e165File_src_app_plugins_cost_costContributions_test_ts_9719268e: {
  label: "costContributions.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_cost_24b9e165File_src_app_plugins_cost_costContributions_ts_babed869: {
  label: "costContributions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_cost_24b9e165File_src_app_plugins_cost_costRouteHandle_ts_d27fdb39: {
  label: "costRouteHandle.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_createDeferredView_test_tsx_a4498058: {
  label: "createDeferredView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_createDeferredView_tsx_6539ace1: {
  label: "createDeferredView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_src_app_plugins_dbt_dbtCanvasSurfaceStrategy_ts_daf73293: {
  label: "dbtCanvasSurfaceStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_ns_dbt_dbtContributions_authoringCatalog_test_ts_d6a74dfb: {
  label: "dbtContributions.authoringCatalog.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_ins_dbt_dbtContributions_connectionRules_test_ts_0ff086e4: {
  label: "dbtContributions.connectionRules.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_src_app_plugins_dbt_dbtContributions_ts_65fe8911: {
  label: "dbtContributions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_src_app_plugins_dbt_dbtGraphNodeCardStrategy_ts_10ab6f1b: {
  label: "dbtGraphNodeCardStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_src_app_plugins_dbt_dbtNodeAdapter_test_ts_18cf50d7: {
  label: "dbtNodeAdapter.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_src_app_plugins_dbt_dbtNodeAdapter_ts_511686a3: {
  label: "dbtNodeAdapter.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_src_app_plugins_dbt_DbtNodeRenderer_test_tsx_92f4aeb2: {
  label: "DbtNodeRenderer.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_src_app_plugins_dbt_DbtNodeRenderer_tsx_7bf9d4ac: {
  label: "DbtNodeRenderer.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63cFile_ugins_dbt_dbtProjectFileCanvasSurfaceStrategy_ts_b913d037: {
  label: "dbtProjectFileCanvasSurfaceStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_src_app_plugins_dvt_dvtCanvasSurfaceStrategy_ts_5660b651: {
  label: "dvtCanvasSurfaceStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_lugins_dvt_dvtContributions_architecture_test_ts_95b50d13: {
  label: "dvtContributions.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_ins_dvt_dvtContributions_connectionRules_test_ts_b32d5257: {
  label: "dvtContributions.connectionRules.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_src_app_plugins_dvt_dvtContributions_ts_2e09d5c6: {
  label: "dvtContributions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_src_app_plugins_dvt_dvtGraphNodeCardStrategy_ts_d0f25440: {
  label: "dvtGraphNodeCardStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_p_plugins_dvt_dvtGraphNodeSemanticMetric_test_ts_f7f98a31: {
  label: "dvtGraphNodeSemanticMetric.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_rc_app_plugins_dvt_dvtGraphNodeSemanticMetric_ts_9d64a570: {
  label: "dvtGraphNodeSemanticMetric.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_src_app_plugins_dvt_dvtNodeTypeCatalog_ts_1fea4b4c: {
  label: "dvtNodeTypeCatalog.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665File_c_app_plugins_dvt_transformationGraphStrategy_ts_7362ec64: {
  label: "transformationGraphStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_FallbackNodeRenderer_tsx_81bf0101: {
  label: "FallbackNodeRenderer.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_pp_plugins_graph_defaultGraphNodeCardStrategy_ts_f282fd6e: {
  label: "defaultGraphNodeCardStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_app_plugins_graph_GraphNodeAlgebraicDropZone_tsx_323afa6b: {
  label: "GraphNodeAlgebraicDropZone.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_ins_graph_GraphNodeCalculatedColumnForm_test_tsx_eb324060: {
  label: "GraphNodeCalculatedColumnForm.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile__plugins_graph_GraphNodeCalculatedColumnForm_tsx_671c475c: {
  label: "GraphNodeCalculatedColumnForm.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_graphNodeCardCopyTokens_ts_abf0228d: {
  label: "graphNodeCardCopyTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile__plugins_graph_graphNodeCardPresentation_test_ts_9e524ef5: {
  label: "graphNodeCardPresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_raph_graphNodeCardReadModel_architecture_test_ts_27e02930: {
  label: "graphNodeCardReadModel.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_app_plugins_graph_graphNodeCardReadModel_test_ts_3c39d1fc: {
  label: "graphNodeCardReadModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_graphNodeCardReadModel_ts_e8bab013: {
  label: "graphNodeCardReadModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile__plugins_graph_graphNodeCardStrategyContracts_ts_93873d23: {
  label: "graphNodeCardStrategyContracts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile__app_plugins_graph_graphNodeCardStrategyUtils_ts_79b0da4b: {
  label: "graphNodeCardStrategyUtils.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeCardView_test_tsx_af7ab3cc: {
  label: "GraphNodeCardView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeCardView_tsx_3565ef96: {
  label: "GraphNodeCardView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_s_graph_GraphNodeColumnChildren_reorder_test_tsx_fa977fa1: {
  label: "GraphNodeColumnChildren.reorder.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_rc_app_plugins_graph_GraphNodeColumnChildren_tsx_851fdef9: {
  label: "GraphNodeColumnChildren.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_ins_graph_GraphNodeColumnCommentTooltip_test_tsx_01f33cd0: {
  label: "GraphNodeColumnCommentTooltip.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_plugins_graph_GraphNodeColumnCompositionMenu_tsx_726fb709: {
  label: "GraphNodeColumnCompositionMenu.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_p_plugins_graph_graphNodeColumnContracts_test_ts_fd1fa9e7: {
  label: "graphNodeColumnContracts.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_rc_app_plugins_graph_graphNodeColumnContracts_ts_12caf316: {
  label: "graphNodeColumnContracts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_ins_graph_GraphNodeColumnDropCompositionFlow_tsx_62ee9077: {
  label: "GraphNodeColumnDropCompositionFlow.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_ugins_graph_GraphNodeColumnFunctionAliasForm_tsx_7f4b6996: {
  label: "GraphNodeColumnFunctionAliasForm.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_raphNodeColumnFunctionMenu_pointerGrace_test_tsx_c4f72939: {
  label: "GraphNodeColumnFunctionMenu.pointerGrace.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_pp_plugins_graph_GraphNodeColumnFunctionMenu_tsx_a345687e: {
  label: "GraphNodeColumnFunctionMenu.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_graph_GraphNodeColumnOrder_schemaChange_test_tsx_c5320cb7: {
  label: "GraphNodeColumnOrder.schemaChange.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeColumnPiece_tsx_bf6d6404: {
  label: "GraphNodeColumnPiece.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeColumnRow_tsx_a78313bc: {
  label: "GraphNodeColumnRow.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_raph_GraphNodeColumnSection_composition_test_tsx_c39068e6: {
  label: "GraphNodeColumnSection.composition.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_hNodeColumnSection_controlledDisclosure_test_tsx_7d32cefe: {
  label: "GraphNodeColumnSection.controlledDisclosure.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile__GraphNodeColumnSection_inactiveReorder_test_tsx_0cf3acfc: {
  label: "GraphNodeColumnSection.inactiveReorder.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_NodeColumnSection_structuredComposition_test_tsx_2799448b: {
  label: "GraphNodeColumnSection.structuredComposition.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_pp_plugins_graph_GraphNodeColumnSection_test_tsx_8b35f882: {
  label: "GraphNodeColumnSection.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeColumnSection_tsx_2b7cb82b: {
  label: "GraphNodeColumnSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_lugins_graph_GraphNodeHealthPopoverView_test_tsx_2851a3e6: {
  label: "GraphNodeHealthPopoverView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_app_plugins_graph_GraphNodeHealthPopoverView_tsx_03a9fb7e: {
  label: "GraphNodeHealthPopoverView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_pp_plugins_graph_GraphNodeMetricHotspot_test_tsx_074a6c36: {
  label: "GraphNodeMetricHotspot.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeMetricHotspot_tsx_d0ba9143: {
  label: "GraphNodeMetricHotspot.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_rc_app_plugins_graph_GraphNodeMetricRow_test_tsx_76dbeebf: {
  label: "GraphNodeMetricRow.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeMetricRow_tsx_2ac4f12e: {
  label: "GraphNodeMetricRow.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile__plugins_graph_GraphNodeOperationalRail_test_tsx_7c11f776: {
  label: "GraphNodeOperationalRail.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_c_app_plugins_graph_GraphNodeOperationalRail_tsx_3b96a9e8: {
  label: "GraphNodeOperationalRail.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_lugins_graph_graphNodeOperationalSummary_test_ts_df6860d0: {
  label: "graphNodeOperationalSummary.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_app_plugins_graph_graphNodeOperationalSummary_ts_2362af71: {
  label: "graphNodeOperationalSummary.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeRenderer_tsx_22005501: {
  label: "GraphNodeRenderer.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_ns_graph_graphNodeSourceMetricProjection_test_ts_cf21eb7a: {
  label: "graphNodeSourceMetricProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_plugins_graph_graphNodeSourceMetricProjection_ts_825475f6: {
  label: "graphNodeSourceMetricProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_pp_plugins_graph_graphNodeStructuredFieldCopy_ts_926aae0e: {
  label: "graphNodeStructuredFieldCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_p_plugins_graph_GraphNodeStructuredFieldForm_tsx_c51e0883: {
  label: "GraphNodeStructuredFieldForm.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeTagList_test_tsx_199d5ef7: {
  label: "GraphNodeTagList.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_GraphNodeTagList_tsx_36779d77: {
  label: "GraphNodeTagList.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_plugins_graph_graphNodeTitlePresentation_test_ts_edcb36ec: {
  label: "graphNodeTitlePresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile__app_plugins_graph_graphNodeTitlePresentation_ts_f507c579: {
  label: "graphNodeTitlePresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_graphVisualTokenConvergence_architecture_test_ts_475bb603: {
  label: "graphVisualTokenConvergence.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_graphVisualTokens_ts_ad75512e: {
  label: "graphVisualTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_src_app_plugins_graph_useGraphNodeColumnOrder_ts_a9d092fd: {
  label: "useGraphNodeColumnOrder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile_c_app_plugins_graph_useGraphNodeColumnReorder_ts_12cd2c67: {
  label: "useGraphNodeColumnReorder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690dFile__plugins_graph_useGraphNodeColumnSectionState_ts_004ecf91: {
  label: "useGraphNodeColumnSectionState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_graphStrategyContracts_ts_35f231db: {
  label: "graphStrategyContracts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_graphStrategyRegistry_test_ts_55cf2689: {
  label: "graphStrategyRegistry.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_graphStrategyRegistry_ts_dadbc611: {
  label: "graphStrategyRegistry.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_httpJson_8d50c770File_ttpJson_HttpJsonArtifactAuthoringFields_test_tsx_1c439e29: {
  label: "HttpJsonArtifactAuthoringFields.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_httpJson_8d50c770File_ins_httpJson_HttpJsonArtifactAuthoringFields_tsx_eb6085a1: {
  label: "HttpJsonArtifactAuthoringFields.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_httpJson_8d50c770File_p_plugins_httpJson_httpJsonContributions_test_ts_773323b6: {
  label: "httpJsonContributions.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_httpJson_8d50c770File_rc_app_plugins_httpJson_httpJsonContributions_ts_d85ccbfd: {
  label: "httpJsonContributions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_httpJson_8d50c770File__app_plugins_httpJson_httpJsonNodeTypeCatalog_ts_11246085: {
  label: "httpJsonNodeTypeCatalog.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_mergeDecorations_ts_8c1a982c: {
  label: "mergeDecorations.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_monitoring_388fb118File_ugins_monitoring_monitoringContributions_test_ts_9d302b5e: {
  label: "monitoringContributions.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_monitoring_388fb118File_pp_plugins_monitoring_monitoringContributions_ts_5dd365e4: {
  label: "monitoringContributions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_nodeTypeCatalog_dbt_ts_be2cf04b: {
  label: "nodeTypeCatalog.dbt.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_nodeTypeCatalog_ts_faad5561: {
  label: "nodeTypeCatalog.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_nodeTypeContracts_ts_5a607f3c: {
  label: "nodeTypeContracts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_nodeTypeRegistry_ts_61179ac4: {
  label: "nodeTypeRegistry.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_tgres_ObjectFilePostgresAuthoringFields_test_tsx_491b4046: {
  label: "ObjectFilePostgresAuthoringFields.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_lePostgres_ObjectFilePostgresAuthoringFields_tsx_18293e65: {
  label: "ObjectFilePostgresAuthoringFields.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_tgres_objectFilePostgresAuthoringFields_types_ts_5a3fe759: {
  label: "objectFilePostgresAuthoringFields.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_tgres_objectFilePostgresAuthoringVisualTokens_ts_0a443d2c: {
  label: "objectFilePostgresAuthoringVisualTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_tFilePostgres_ObjectFilePostgresColumnFields_tsx_76683d05: {
  label: "ObjectFilePostgresColumnFields.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_Postgres_objectFilePostgresContributions_test_ts_3fa46f67: {
  label: "objectFilePostgresContributions.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_tFilePostgres_objectFilePostgresContributions_ts_13546793: {
  label: "objectFilePostgresContributions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_ectFilePostgres_ObjectFilePostgresFieldError_tsx_762858eb: {
  label: "ObjectFilePostgresFieldError.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_ilePostgres_objectFilePostgresNodeTypeCatalog_ts_93c0c7bf: {
  label: "objectFilePostgresNodeTypeCatalog.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_tFilePostgres_ObjectFilePostgresSourceFields_tsx_b74ebd3c: {
  label: "ObjectFilePostgresSourceFields.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2eFile_tFilePostgres_ObjectFilePostgresTargetFields_tsx_3b5eff11: {
  label: "ObjectFilePostgresTargetFields.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File__app_plugins_PluginContributionBoundary_test_tsx_1284551c: {
  label: "PluginContributionBoundary.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_PluginContributionBoundary_tsx_00e98e0b: {
  label: "PluginContributionBoundary.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_ins_pluginRuntimeProjection_architecture_test_ts_4170b170: {
  label: "pluginRuntimeProjection.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_registry_test_ts_5dc36ba8: {
  label: "registry.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325File_src_app_plugins_registry_ts_f7f1db8d: {
  label: "registry.ts"
}
`;case`webFiles_queries`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_costQueries_ts_d533cda7: {
  label: "costQueries.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_dbtProjectQueries_ts_0b1c8a84: {
  label: "dbtProjectQueries.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File__app_queries_queryKeyPolicy_architecture_test_ts_0dce7a3e: {
  label: "queryKeyPolicy.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_queryKeys_ts_637d2e73: {
  label: "queryKeys.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_runEventFeedQuery_test_tsx_dc6e9241: {
  label: "runEventFeedQuery.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_runEventFeedQuery_ts_bb07e576: {
  label: "runEventFeedQuery.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_runsQueries_ts_6085d95e: {
  label: "runsQueries.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_useCapabilitiesQuery_test_tsx_523c9295: {
  label: "useCapabilitiesQuery.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_useCapabilitiesQuery_ts_05733880: {
  label: "useCapabilitiesQuery.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_workspaceArtifactPolicy_test_ts_298df4e9: {
  label: "workspaceArtifactPolicy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_workspaceArtifactPolicy_ts_093f6417: {
  label: "workspaceArtifactPolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_workspaceQueries_scope_test_tsx_0498960e: {
  label: "workspaceQueries.scope.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311File_src_app_queries_workspaceQueries_ts_1a07b616: {
  label: "workspaceQueries.ts"
}
`;case`webFiles_services`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_api_57520c3dFile_src_app_services_api_apiAuthConfig_ts_06e2ddce: {
  label: "apiAuthConfig.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_api_57520c3dFile_src_app_services_api_classifyHttpError_test_ts_b6b9f967: {
  label: "classifyHttpError.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_api_57520c3dFile_src_app_services_api_classifyHttpError_ts_50f38b5f: {
  label: "classifyHttpError.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_api_57520c3dFile_src_app_services_api_createApiClient_test_ts_0afad1c8: {
  label: "createApiClient.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_api_57520c3dFile_src_app_services_api_createApiClient_ts_6ba916dc: {
  label: "createApiClient.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_api_57520c3dFile_p_services_api_protectedRuntimeRejection_test_ts_34fa2152: {
  label: "protectedRuntimeRejection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_api_57520c3dFile_rc_app_services_api_protectedRuntimeRejection_ts_ea000922: {
  label: "protectedRuntimeRejection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037File_src_app_services_AppServicesContext_test_tsx_64eee063: {
  label: "AppServicesContext.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037File_src_app_services_AppServicesContext_tsx_d5ab72b1: {
  label: "AppServicesContext.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_capabilities_750df37cFile_rc_app_services_capabilities_capabilitiesPort_ts_991b18d2: {
  label: "capabilitiesPort.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_composition_4d0549d6File_ices_composition_appServices_operability_test_ts_a60af2df: {
  label: "appServices.operability.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_composition_4d0549d6File_src_app_services_composition_appServices_test_ts_3c61ffae: {
  label: "appServices.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_composition_4d0549d6File_src_app_services_composition_appServices_ts_2ce92294: {
  label: "appServices.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_composition_4d0549d6File_appServicesAuthorityHardcut_architecture_test_ts_250d707f: {
  label: "appServicesAuthorityHardcut.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_composition_4d0549d6File_tion_appServicesMockHardcut_architecture_test_ts_3a1dade3: {
  label: "appServicesMockHardcut.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_config_fc8fdb10File_src_app_services_config_workspaceConfig_ts_173dc8f1: {
  label: "workspaceConfig.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_cost_c6f6df99File_src_app_services_cost_costApiDecoders_ts_0dff5e22: {
  label: "costApiDecoders.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_cost_c6f6df99File_src_app_services_cost_costService_api_test_ts_9e307cdc: {
  label: "costService.api.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_cost_c6f6df99File_src_app_services_cost_costService_api_ts_872941ad: {
  label: "costService.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile__services_dbtProject_dbtProjectGraph_api_test_ts_0d74d83d: {
  label: "dbtProjectGraph.api.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile_c_app_services_dbtProject_dbtProjectGraph_api_ts_fbb8df0a: {
  label: "dbtProjectGraph.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile_services_dbtProject_dbtProjectImport_api_test_ts_840205e5: {
  label: "dbtProjectImport.api.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile__app_services_dbtProject_dbtProjectImport_api_ts_cd5e8cec: {
  label: "dbtProjectImport.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile_es_dbtProject_dbtYamlDescriptionEdit_api_test_ts_1a2c5de4: {
  label: "dbtYamlDescriptionEdit.api.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile_ervices_dbtProject_dbtYamlDescriptionEdit_api_ts_c2ba3dad: {
  label: "dbtYamlDescriptionEdit.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile__dbtProject_graphDbtModelCompilation_api_test_ts_9cc725ef: {
  label: "graphDbtModelCompilation.api.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile_vices_dbtProject_graphDbtModelCompilation_api_ts_ea2fdc2a: {
  label: "graphDbtModelCompilation.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile_graphDbtWorkspaceArtifactPublication_api_test_ts_a0b9d351: {
  label: "graphDbtWorkspaceArtifactPublication.api.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25cFile_ject_graphDbtWorkspaceArtifactPublication_api_ts_9b461ce7: {
  label: "graphDbtWorkspaceArtifactPublication.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_feedback_f76a4189File_src_app_services_feedback_shellFeedbackPort_ts_390b0817: {
  label: "shellFeedbackPort.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_idempotency_143015d7File__idempotency_createBrowserIdempotencyKey_test_ts_7fa25467: {
  label: "createBrowserIdempotencyKey.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_idempotency_143015d7File_vices_idempotency_createBrowserIdempotencyKey_ts_71e79347: {
  label: "createBrowserIdempotencyKey.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_operability_47d43dcfFile_erability_consoleFrontendOperabilitySink_test_ts_97eb7e00: {
  label: "consoleFrontendOperabilitySink.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_operability_47d43dcfFile_es_operability_consoleFrontendOperabilitySink_ts_9a5747b6: {
  label: "consoleFrontendOperabilitySink.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_operability_47d43dcfFile__operability_frontendOperabilityRecorder_test_ts_97724277: {
  label: "frontendOperabilityRecorder.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_operability_47d43dcfFile_vices_operability_frontendOperabilityRecorder_ts_c020343a: {
  label: "frontendOperabilityRecorder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_operability_47d43dcfFile_bility_useFrontendOperabilityTransition_test_tsx_31d98694: {
  label: "useFrontendOperabilityTransition.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_operability_47d43dcfFile__operability_useFrontendOperabilityTransition_ts_eb4b2a19: {
  label: "useFrontendOperabilityTransition.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_plans_80f8c333File_src_app_services_plans_plansService_api_ts_6afbcc60: {
  label: "plansService.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_plans_80f8c333File_c_app_services_plans_plansService_import_test_ts_ad688932: {
  label: "plansService.import.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_plans_80f8c333File__app_services_plans_plansService_preview_test_ts_57099cd1: {
  label: "plansService.preview.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_plans_80f8c333File__app_services_plans_plansService_test_support_ts_39ce80b7: {
  label: "plansService.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_plans_80f8c333File_src_app_services_plans_plansService_ts_4b708d52: {
  label: "plansService.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_projectOnboarding_59751818File_ojectOnboarding_activateProjectWorkspace_test_ts_bca2ecdf: {
  label: "activateProjectWorkspace.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_projectOnboarding_59751818File_es_projectOnboarding_activateProjectWorkspace_ts_a6e145fd: {
  label: "activateProjectWorkspace.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_projectOnboarding_59751818File_ojectOnboarding_projectOnboardingService_test_ts_3d6fdd6e: {
  label: "projectOnboardingService.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_projectOnboarding_59751818File_es_projectOnboarding_projectOnboardingService_ts_d47d4a15: {
  label: "projectOnboardingService.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_app_services_runs_recoveryIdempotencyKeyStore_ts_baf555d0: {
  label: "recoveryIdempotencyKeyStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runControlCommandModel_ts_b397fa00: {
  label: "runControlCommandModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_app_services_runs_runEventFeedHealthCopy_test_ts_7d4f23d7: {
  label: "runEventFeedHealthCopy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runEventFeedHealthCopy_ts_b96471e4: {
  label: "runEventFeedHealthCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_pp_services_runs_runEventFeedHealthModel_test_ts_f049c0ce: {
  label: "runEventFeedHealthModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runEventFeedHealthModel_ts_0a4fd7ca: {
  label: "runEventFeedHealthModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_rvices_runs_runEventFeedModel_guardrails_test_ts_beebaf83: {
  label: "runEventFeedModel.guardrails.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_vices_runs_runEventFeedModel_transitions_test_ts_9f7c5922: {
  label: "runEventFeedModel.transitions.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runEventFeedModel_ts_8ba17395: {
  label: "runEventFeedModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_p_services_runs_runEventPresentationCopy_test_ts_9e2f52bb: {
  label: "runEventPresentationCopy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_rc_app_services_runs_runEventPresentationCopy_ts_0e13623b: {
  label: "runEventPresentationCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile__services_runs_runEventPresentationModel_test_ts_47877439: {
  label: "runEventPresentationModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_c_app_services_runs_runEventPresentationModel_ts_5e799b01: {
  label: "runEventPresentationModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile__app_services_runs_runEventTimelineModel_test_ts_a94ec922: {
  label: "runEventTimelineModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runEventTimelineModel_ts_d6bcfe0b: {
  label: "runEventTimelineModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runsApiDecoders_ts_096462b2: {
  label: "runsApiDecoders.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runsApiPayloads_test_ts_6c13d39c: {
  label: "runsApiPayloads.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runsApiPayloads_ts_9d08e085: {
  label: "runsApiPayloads.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile__app_services_runs_runsApiSnapshotMapper_test_ts_16b9733b: {
  label: "runsApiSnapshotMapper.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runsApiSnapshotMapper_ts_6e22395d: {
  label: "runsApiSnapshotMapper.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runsService_api_ts_c7dc2cc4: {
  label: "runsService.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runsService_test_ts_635e563e: {
  label: "runsService.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runsService_ts_df736d4f: {
  label: "runsService.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runWorkspaceModel_test_ts_46fb8b64: {
  label: "runWorkspaceModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4cFile_src_app_services_runs_runWorkspaceModel_ts_6f758595: {
  label: "runWorkspaceModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_session_15ea124fFile_rotectedRouteSessionContext_architecture_test_ts_21ed607f: {
  label: "protectedRouteSessionContext.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_session_15ea124fFile_ces_session_protectedRouteSessionContext_test_ts_2cc1ca03: {
  label: "protectedRouteSessionContext.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_session_15ea124fFile_services_session_protectedRouteSessionContext_ts_4fa6fca2: {
  label: "protectedRouteSessionContext.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_session_15ea124fFile__app_services_session_sessionContextPort_test_ts_81f86d4d: {
  label: "sessionContextPort.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_session_15ea124fFile_src_app_services_session_sessionContextPort_ts_4267cd35: {
  label: "sessionContextPort.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_session_15ea124fFile_ices_session_workspaceScopeSelectionPort_test_ts_ac3bc31f: {
  label: "workspaceScopeSelectionPort.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_session_15ea124fFile__services_session_workspaceScopeSelectionPort_ts_e8de0a68: {
  label: "workspaceScopeSelectionPort.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ces_workspace_sourceObjectMetricEvidence_test_ts_05b476e9: {
  label: "sourceObjectMetricEvidence.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_services_workspace_sourceObjectMetricEvidence_ts_100328ba: {
  label: "sourceObjectMetricEvidence.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_e_sourceObjectMetricEvidencePresentation_test_ts_49616bb3: {
  label: "sourceObjectMetricEvidencePresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_kspace_sourceObjectMetricEvidencePresentation_ts_4a454f64: {
  label: "sourceObjectMetricEvidencePresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ces_workspace_workspaceApiClient_test_harness_ts_b07d5e45: {
  label: "workspaceApiClient.test.harness.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_p_services_workspace_workspaceDiffChangesHttp_ts_e2b74285: {
  label: "workspaceDiffChangesHttp.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_src_app_services_workspace_workspaceErrors_ts_c443be99: {
  label: "workspaceErrors.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_p_services_workspace_workspaceFileHistoryHttp_ts_3358e805: {
  label: "workspaceFileHistoryHttp.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_src_app_services_workspace_workspaceFilesHttp_ts_4ec96610: {
  label: "workspaceFilesHttp.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ces_workspace_workspaceFileTree_test_fixtures_ts_8881d337: {
  label: "workspaceFileTree.test.fixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_rkspace_workspaceGraphDraftAuthoring_api_test_ts_80b9a4ba: {
  label: "workspaceGraphDraftAuthoring.api.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_es_workspace_workspaceGraphDraftAuthoring_api_ts_269abefb: {
  label: "workspaceGraphDraftAuthoring.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ce_workspaceGraphDraftAuthoring_test_fixtures_ts_3e1bde49: {
  label: "workspaceGraphDraftAuthoring.test.fixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_pp_services_workspace_workspaceGraphDraftHttp_ts_010db45a: {
  label: "workspaceGraphDraftHttp.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File__workspace_workspaceGraphDraftProjection_test_ts_436cf2de: {
  label: "workspaceGraphDraftProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_vices_workspace_workspaceGraphDraftProjection_ts_7ef214df: {
  label: "workspaceGraphDraftProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_aceGraphDraftProjectionExpected_test_fixtures_ts_b7ee8cb8: {
  label: "workspaceGraphDraftProjectionExpected.test.fixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ace_workspaceGraphDraftProtocol_test_fixtures_ts_2a74602b: {
  label: "workspaceGraphDraftProtocol.test.fixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ce_workspaceGraphDraftSnapshotProjection_test_ts_ef8c05a1: {
  label: "workspaceGraphDraftSnapshotProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_rkspace_workspaceGraphDraftSnapshotProjection_ts_76e64f37: {
  label: "workspaceGraphDraftSnapshotProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_services_workspace_workspacePluginCatalog_api_ts_6f8b4fc6: {
  label: "workspacePluginCatalog.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_c_app_services_workspace_workspacePluginsHttp_ts_f05d6c6c: {
  label: "workspacePluginsHttp.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File__workspacePortDecomposition_architecture_test_ts_ce7926a8: {
  label: "workspacePortDecomposition.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_pp_services_workspace_workspacePorts_api_test_ts_f115fa3a: {
  label: "workspacePorts.api.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_src_app_services_workspace_workspacePorts_api_ts_127a11e4: {
  label: "workspacePorts.api.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File__services_workspace_workspacePorts_files_test_ts_bc580e41: {
  label: "workspacePorts.files.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ervices_workspace_workspacePorts_imports_test_ts_e5e1662d: {
  label: "workspacePorts.imports.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ces_workspace_workspacePorts_operability_test_ts_2f334b22: {
  label: "workspacePorts.operability.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_src_app_services_workspace_workspacePorts_ts_96f87d13: {
  label: "workspacePorts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ices_workspace_workspacePortsApi_test_harness_ts_fc354dbb: {
  label: "workspacePortsApi.test.harness.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95File_ervices_workspace_workspaceScope_test_harness_ts_8a0fc9d8: {
  label: "workspaceScope.test.harness.ts"
}
`;case`webFiles_stores`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_applicationLanguageStore_test_ts_e92d0fd6: {
  label: "applicationLanguageStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_applicationLanguageStore_ts_e14964ee: {
  label: "applicationLanguageStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_authorizationStore_test_ts_c8c6bd73: {
  label: "authorizationStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_authorizationStore_ts_663baf69: {
  label: "authorizationStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_canvasInteractionStore_test_ts_cf9b98bc: {
  label: "canvasInteractionStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_canvasInteractionStore_ts_0d4e9c3e: {
  label: "canvasInteractionStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_executionStore_ts_20659acd: {
  label: "executionStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_platformConnectionStore_test_ts_2009d985: {
  label: "platformConnectionStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_platformConnectionStore_ts_452c9e85: {
  label: "platformConnectionStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_sessionStore_test_ts_b3abcb16: {
  label: "sessionStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_sessionStore_ts_96a597f1: {
  label: "sessionStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_uiLayoutStore_test_ts_b3c4fe84: {
  label: "uiLayoutStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_src_app_stores_uiLayoutStore_ts_92962379: {
  label: "uiLayoutStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48aFile_res_webStoreDomainOwnership_architecture_test_ts_fd4c5275: {
  label: "webStoreDomainOwnership.architecture.test.ts"
}
`;case`webFiles_views`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_AdminAuditTab_tsx_35755ee8: {
  label: "AdminAuditTab.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_AdminCapabilitiesCard_tsx_e0aa4796: {
  label: "AdminCapabilitiesCard.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_AdminPermissionsTab_tsx_1293627d: {
  label: "AdminPermissionsTab.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_rc_app_views_admin_AdminPlatformSummaryCards_tsx_99113593: {
  label: "AdminPlatformSummaryCards.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_AdminPlatformTab_tsx_e4a3775c: {
  label: "AdminPlatformTab.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_AdminProbeDetailsCard_tsx_ebf111a6: {
  label: "AdminProbeDetailsCard.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_AdminRolesTab_tsx_78060087: {
  label: "AdminRolesTab.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_AdminStatusBadge_tsx_71eee36e: {
  label: "AdminStatusBadge.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_adminViewModel_test_ts_ab72ab0d: {
  label: "adminViewModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_adminViewModel_ts_b302c5b8: {
  label: "adminViewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_copy_ts_7638fa90: {
  label: "copy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_platformTypes_ts_5872235a: {
  label: "platformTypes.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1File_src_app_views_admin_useAdminViewData_ts_60929841: {
  label: "useAdminViewData.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_AdminView_architecture_test_ts_08678989: {
  label: "AdminView.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_AdminView_test_tsx_7ab82911: {
  label: "AdminView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_AdminView_tsx_2511d9b8: {
  label: "AdminView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_architecture_test_support_ts_5c543f73: {
  label: "architecture.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_ws_artifacts_ArtifactMonacoPreviewPanel_test_tsx_7bac3d2d: {
  label: "ArtifactMonacoPreviewPanel.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_p_views_artifacts_ArtifactMonacoPreviewPanel_tsx_5ef050a3: {
  label: "ArtifactMonacoPreviewPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_ArtifactPreviewTabs_tsx_7c04b27a: {
  label: "ArtifactPreviewTabs.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_ArtifactsInfoCard_tsx_6b3f47a3: {
  label: "ArtifactsInfoCard.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_ArtifactsList_tsx_b92c265b: {
  label: "ArtifactsList.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_tifactsMonacoReadonlyViewer_architecture_test_ts_2960c16b: {
  label: "artifactsMonacoReadonlyViewer.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File__views_artifacts_artifactsRouteBootstrap_test_ts_450bb4be: {
  label: "artifactsRouteBootstrap.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_c_app_views_artifacts_artifactsRouteBootstrap_ts_bf98f89b: {
  label: "artifactsRouteBootstrap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_ArtifactsStateViews_tsx_0b330812: {
  label: "ArtifactsStateViews.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_s_artifacts_artifactsWorkbenchStateModel_test_ts_170c45ac: {
  label: "artifactsWorkbenchStateModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File__views_artifacts_artifactsWorkbenchStateModel_ts_ec4209e1: {
  label: "artifactsWorkbenchStateModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_constants_ts_72f1af1c: {
  label: "constants.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_copy_ts_96d628a2: {
  label: "copy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_ManifestImportPanel_tsx_cfb86a2e: {
  label: "ManifestImportPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_manifestParser_test_ts_65e65110: {
  label: "manifestParser.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_manifestParser_ts_bcbb07ea: {
  label: "manifestParser.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_iews_artifacts_structuredArtifactContent_test_ts_be2bd07c: {
  label: "structuredArtifactContent.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_app_views_artifacts_structuredArtifactContent_ts_4f5dd007: {
  label: "structuredArtifactContent.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_types_ts_febb1f0b: {
  label: "types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_p_views_artifacts_useArtifactsViewModel_test_tsx_841bc58c: {
  label: "useArtifactsViewModel.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_useArtifactsViewModel_ts_859fc3bf: {
  label: "useArtifactsViewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_rc_app_views_artifacts_useLocalManifestImport_ts_475bc475: {
  label: "useLocalManifestImport.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46File_src_app_views_artifacts_utils_ts_55bb9c60: {
  label: "utils.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_ArtifactsView_test_tsx_65651de9: {
  label: "ArtifactsView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_ArtifactsView_tsx_03f6476b: {
  label: "ArtifactsView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_architecture_test_tsx_677c1f64: {
  label: "Canvas.architecture.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_views_Canvas_authoringRoute_integration_test_tsx_ef19dd8c: {
  label: "Canvas.authoringRoute.integration.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_draftRecovery_test_tsx_d7a707d5: {
  label: "Canvas.draftRecovery.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_readOnlyStates_test_tsx_b7ffabc6: {
  label: "Canvas.readOnlyStates.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_s_routeStates_backend-recovery-priority_test_tsx_ae59a1dc: {
  label: "Canvas.routeStates.backend-recovery-priority.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_Canvas_routeStates_first-canvas-catalog_test_tsx_360e9679: {
  label: "Canvas.routeStates.first-canvas-catalog.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File__Canvas_routeStates_first-canvas-policy_test_tsx_b4703513: {
  label: "Canvas.routeStates.first-canvas-policy.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_nvas_routeStates_host-cycle-persistence_test_tsx_d2b3fafa: {
  label: "Canvas.routeStates.host-cycle-persistence.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_routeStates_smoke_test_tsx_61d85d29: {
  label: "Canvas.routeStates.smoke.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_test_controller_defaults_ts_dba1c5dd: {
  label: "Canvas.test.controller.defaults.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_test_controller_ts_b6ad9cf0: {
  label: "Canvas.test.controller.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_test_hostCycleScenario_ts_a75e4195: {
  label: "Canvas.test.hostCycleScenario.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_test_support_tsx_1dbcc1c4: {
  label: "Canvas.test.support.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_Canvas_tsx_afdd91e5: {
  label: "Canvas.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasActiveGraphStrategy_test_ts_7660c34d: {
  label: "canvasActiveGraphStrategy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasActiveGraphStrategy_ts_b4a53eef: {
  label: "canvasActiveGraphStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasAddNodeCatalogModel_test_ts_0d75c27c: {
  label: "canvasAddNodeCatalogModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasAddNodeCatalogModel_ts_b247805a: {
  label: "canvasAddNodeCatalogModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_CanvasAddNodeCatalogView_test_tsx_e91e0e01: {
  label: "CanvasAddNodeCatalogView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_CanvasAddNodeCatalogView_tsx_977bcff2: {
  label: "CanvasAddNodeCatalogView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasAlgebraicComposition_test_ts_7145860f: {
  label: "canvasAlgebraicComposition.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasAlgebraicComposition_ts_bba90db4: {
  label: "canvasAlgebraicComposition.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasAuthoringGraphProjection_test_ts_34b59890: {
  label: "canvasAuthoringGraphProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasAuthoringGraphProjection_ts_6e0f707e: {
  label: "canvasAuthoringGraphProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasAuthoringMetadata_ts_db209b30: {
  label: "canvasAuthoringMetadata.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasAuthoringNodeCommand_test_ts_b3a87853: {
  label: "canvasAuthoringNodeCommand.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasAuthoringNodeCommand_ts_0c21b104: {
  label: "canvasAuthoringNodeCommand.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvasAuthoringProjection_architecture_test_ts_6ca6d5b3: {
  label: "canvasAuthoringProjection.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasAuthoringRuntime_types_ts_52daebc3: {
  label: "canvasAuthoringRuntime.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_asAuthoringRuntimeComponent_architecture_test_ts_5c264b7e: {
  label: "canvasAuthoringRuntimeComponent.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasAuthoringState_test_ts_351332f1: {
  label: "canvasAuthoringState.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasAuthoringState_ts_b95ae9d1: {
  label: "canvasAuthoringState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasBackendPosture_test_ts_ad0f3fd9: {
  label: "canvasBackendPosture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasBackendPosture_ts_38c43c45: {
  label: "canvasBackendPosture.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasCalculatedColumnAuthoring_test_ts_c8640447: {
  label: "canvasCalculatedColumnAuthoring.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasCalculatedColumnAuthoring_ts_face6a58: {
  label: "canvasCalculatedColumnAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvasCanonicalRouteAuthority_architecture_test_ts_69b39ca5: {
  label: "canvasCanonicalRouteAuthority.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasCanonicalSnapshot_ts_d8376724: {
  label: "canvasCanonicalSnapshot.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_CanvasCenterSurface_architecture_test_ts_e4fd226b: {
  label: "CanvasCenterSurface.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasCenterSurface_tsx_95d137e3: {
  label: "CanvasCenterSurface.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasCenterSurface_types_ts_dce0684f: {
  label: "canvasCenterSurface.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasCenterSurfaceTransport_tsx_d1342e35: {
  label: "canvasCenterSurfaceTransport.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasCenterSurfaceWorkbench_tsx_9b7b0877: {
  label: "canvasCenterSurfaceWorkbench.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasChromeTokens_ts_205df206: {
  label: "canvasChromeTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasColumnAutomap_ts_0c6463af: {
  label: "canvasColumnAutomap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_CanvasColumnCommentEditor_test_tsx_f24ab4b0: {
  label: "CanvasColumnCommentEditor.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_CanvasColumnCommentEditor_tsx_69b2929a: {
  label: "CanvasColumnCommentEditor.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasColumnFunctionAuthoring_test_ts_b3541d6e: {
  label: "canvasColumnFunctionAuthoring.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasColumnFunctionAuthoring_ts_bac8ea77: {
  label: "canvasColumnFunctionAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasColumnFunctionMenuProjection_ts_490a1093: {
  label: "canvasColumnFunctionMenuProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_CanvasColumnLineageEdge_test_tsx_56693c8c: {
  label: "CanvasColumnLineageEdge.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasColumnLineageEdge_tsx_e0bc9807: {
  label: "CanvasColumnLineageEdge.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvasColumnLineageProjection_structured_test_ts_1b2a53a4: {
  label: "canvasColumnLineageProjection.structured.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasColumnLineageProjection_test_ts_b6f74fcc: {
  label: "canvasColumnLineageProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasColumnLineageProjection_ts_306ebd13: {
  label: "canvasColumnLineageProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasColumnMappingAuthoring_test_ts_fb568428: {
  label: "canvasColumnMappingAuthoring.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasColumnMappingAuthoring_ts_1f339536: {
  label: "canvasColumnMappingAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasColumnMappingModel_ts_cc05c55a: {
  label: "canvasColumnMappingModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasColumnOutputAuthoring_ts_dca0a17a: {
  label: "canvasColumnOutputAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasColumnProjectionAuthority_ts_9d476df5: {
  label: "canvasColumnProjectionAuthority.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasConnectionAggregate_test_ts_0dd299f0: {
  label: "canvasConnectionAggregate.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasConnectionAggregate_ts_b1d70d5b: {
  label: "canvasConnectionAggregate.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvasConnectionCompatibilityPresenter_test_ts_cbb1d3f1: {
  label: "canvasConnectionCompatibilityPresenter.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasConnectionCompatibilityPresenter_ts_d1a4b34f: {
  label: "canvasConnectionCompatibilityPresenter.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasContextMenuPresenter_types_ts_cbf5e3a4: {
  label: "canvasContextMenuPresenter.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasContextMenuTargetPolicy_ts_7347d1a0: {
  label: "canvasContextMenuTargetPolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_CanvasContextMenuView_architecture_test_tsx_d2e9e62d: {
  label: "CanvasContextMenuView.architecture.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_CanvasContextMenuView_pointerGrace_test_tsx_aa1544ab: {
  label: "CanvasContextMenuView.pointerGrace.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_CanvasContextMenuView_test_tsx_765293b8: {
  label: "CanvasContextMenuView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasContextMenuView_tsx_5d4d19cb: {
  label: "CanvasContextMenuView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasContextMenuViewModel_test_ts_39a74772: {
  label: "canvasContextMenuViewModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasContextMenuViewModel_ts_c7039917: {
  label: "canvasContextMenuViewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_CanvasContextualWorkbenchPanel_tsx_ce0a55f4: {
  label: "CanvasContextualWorkbenchPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvasControllerViewModel_architecture_test_ts_21b6ae35: {
  label: "canvasControllerViewModel.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasControllerViewModel_ts_bd7fcb58: {
  label: "canvasControllerViewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasCopy_types_ts_f9cd244e: {
  label: "canvasCopy.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasCopyCatalog_authoring_es_ts_16a218cb: {
  label: "canvasCopyCatalog.authoring.es.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasCopyCatalog_authoring_ts_2b1d273b: {
  label: "canvasCopyCatalog.authoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasCopyCatalog_execution_es_ts_870096ef: {
  label: "canvasCopyCatalog.execution.es.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasCopyCatalog_execution_ts_2109b2b8: {
  label: "canvasCopyCatalog.execution.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasCopyCatalog_route_es_ts_17db1472: {
  label: "canvasCopyCatalog.route.es.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasCopyCatalog_route_ts_052f6232: {
  label: "canvasCopyCatalog.route.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasCopyCatalog_toolbar_es_ts_d1d4ed43: {
  label: "canvasCopyCatalog.toolbar.es.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasCopyCatalog_toolbar_ts_e7689cdd: {
  label: "canvasCopyCatalog.toolbar.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasCopyCatalog_ts_334398b7: {
  label: "canvasCopyCatalog.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasCopyFormatting_ts_2cbe79a2: {
  label: "canvasCopyFormatting.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvasCreateCanvasDocumentAvailability_test_ts_a48cba92: {
  label: "canvasCreateCanvasDocumentAvailability.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasCreateCanvasDocumentAvailability_ts_3374eca2: {
  label: "canvasCreateCanvasDocumentAvailability.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvasCreateCanvasDocumentCommand_guards_test_ts_1d3bfd06: {
  label: "canvasCreateCanvasDocumentCommand.guards.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_sCreateCanvasDocumentCommand_replacement_test_ts_bdcc8c00: {
  label: "canvasCreateCanvasDocumentCommand.replacement.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvasCreateCanvasDocumentCommand_test_support_ts_8816ea32: {
  label: "canvasCreateCanvasDocumentCommand.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasCreateCanvasDocumentCommand_test_ts_6c2b0218: {
  label: "canvasCreateCanvasDocumentCommand.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasCreateCanvasDocumentCommand_ts_77027f42: {
  label: "canvasCreateCanvasDocumentCommand.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasCreateCanvasDocumentCommandPolicy_ts_455d8032: {
  label: "canvasCreateCanvasDocumentCommandPolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasCreateCanvasDocumentSaveResult_ts_caf63b14: {
  label: "canvasCreateCanvasDocumentSaveResult.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDbtAuthoringModel_test_ts_117fb810: {
  label: "canvasDbtAuthoringModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDbtAuthoringModel_ts_d588858d: {
  label: "canvasDbtAuthoringModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDbtExecutionProjection_ts_08529a04: {
  label: "canvasDbtExecutionProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_canvasDbtModelArtifactProjection_test_ts_80dc3ee3: {
  label: "canvasDbtModelArtifactProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDbtModelArtifactProjection_ts_e53f7faf: {
  label: "canvasDbtModelArtifactProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasDbtModelChainProjection_test_ts_2fed6124: {
  label: "canvasDbtModelChainProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasDbtModelColumnAuthoring_test_ts_c1ac025c: {
  label: "canvasDbtModelColumnAuthoring.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDbtModelColumnAuthoring_ts_ba282cba: {
  label: "canvasDbtModelColumnAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasDbtModelColumnCommand_ts_72b4a406: {
  label: "canvasDbtModelColumnCommand.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDbtModelColumnLineage_test_ts_b9c05e29: {
  label: "canvasDbtModelColumnLineage.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDbtPlannerGraphSource_test_ts_89e53449: {
  label: "canvasDbtPlannerGraphSource.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasDbtPlannerGraphSource_ts_1e23db7f: {
  label: "canvasDbtPlannerGraphSource.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvasDbtSourceImportContinuationStore_test_ts_09891add: {
  label: "canvasDbtSourceImportContinuationStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasDbtSourceImportContinuationStore_ts_bbe8aea0: {
  label: "canvasDbtSourceImportContinuationStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasDbtTestArtifactProjection_test_ts_db4812cd: {
  label: "canvasDbtTestArtifactProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasDbtTestArtifactProjection_ts_7d8b110c: {
  label: "canvasDbtTestArtifactProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDbtTestAuthoringModel_test_ts_b77983fd: {
  label: "canvasDbtTestAuthoringModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasDbtTestAuthoringModel_ts_daa209db: {
  label: "canvasDbtTestAuthoringModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasDbtTestTargetPolicy_ts_22405fb9: {
  label: "canvasDbtTestTargetPolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDbtWorkspaceArtifacts_test_ts_3e945f77: {
  label: "canvasDbtWorkspaceArtifacts.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasDbtWorkspaceArtifacts_ts_57db44ee: {
  label: "canvasDbtWorkspaceArtifacts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_CanvasDependencyEdge_test_tsx_6c40bbd5: {
  label: "CanvasDependencyEdge.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasDependencyEdge_tsx_7a7b922b: {
  label: "CanvasDependencyEdge.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasDependencyEdgeModel_test_ts_c167296f: {
  label: "canvasDependencyEdgeModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasDependencyEdgeModel_ts_cbf570d9: {
  label: "canvasDependencyEdgeModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasDraftAccessPostureModel_test_ts_12deadb2: {
  label: "canvasDraftAccessPostureModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDraftAccessPostureModel_ts_b0fccb8c: {
  label: "canvasDraftAccessPostureModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_CanvasDraftAccessRecovery_templates_tsx_7911bb9c: {
  label: "CanvasDraftAccessRecovery.templates.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasDraftAuthoring_test_ts_b23276ca: {
  label: "canvasDraftAuthoring.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftAuthoring_ts_809c96d7: {
  label: "canvasDraftAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvasDraftAuthoringComponent_architecture_test_ts_cd914877: {
  label: "canvasDraftAuthoringComponent.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasDraftAuthTransportPosture_test_ts_5545fc74: {
  label: "canvasDraftAuthTransportPosture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasDraftAuthTransportPosture_ts_a6054485: {
  label: "canvasDraftAuthTransportPosture.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDraftAutosaveExecution_ts_ac83fd7f: {
  label: "canvasDraftAutosaveExecution.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDraftAutosaveScheduling_ts_c3a615a7: {
  label: "canvasDraftAutosaveScheduling.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDraftEdgeExecutionGate_ts_8c1fa341: {
  label: "canvasDraftEdgeExecutionGate.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDraftExecutionGate_test_ts_edb3c794: {
  label: "canvasDraftExecutionGate.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDraftLayoutHydrationPolicy_ts_09e55209: {
  label: "canvasDraftLayoutHydrationPolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasDraftLifecycle_types_ts_cf914e5d: {
  label: "canvasDraftLifecycle.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasDraftLifecycleSnapshot_test_ts_0f0419fc: {
  label: "canvasDraftLifecycleSnapshot.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDraftLifecycleSnapshot_ts_0d563cd5: {
  label: "canvasDraftLifecycleSnapshot.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasDraftLocalNodeCatalog_ts_579138fd: {
  label: "canvasDraftLocalNodeCatalog.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftNodeCatalog_ts_e1796e8c: {
  label: "canvasDraftNodeCatalog.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasDraftPersistenceRuntime_test_ts_a4fa3663: {
  label: "canvasDraftPersistenceRuntime.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDraftPersistenceRuntime_ts_83ce72ad: {
  label: "canvasDraftPersistenceRuntime.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasDraftPresentationModel_test_ts_94e29444: {
  label: "canvasDraftPresentationModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDraftPresentationModel_ts_ebc64b45: {
  label: "canvasDraftPresentationModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasDraftPresentationStore_test_ts_599ab0b2: {
  label: "canvasDraftPresentationStore.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDraftPresentationStore_ts_2206c746: {
  label: "canvasDraftPresentationStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasDraftQueryCache_architecture_test_ts_d67aad38: {
  label: "canvasDraftQueryCache.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftQueryCache_ts_23095f45: {
  label: "canvasDraftQueryCache.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasDraftReadModel_test_ts_30e2007e: {
  label: "canvasDraftReadModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftReadModel_ts_eaa1a038: {
  label: "canvasDraftReadModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvasDraftRecoveryBoundary_architecture_test_ts_a289407e: {
  label: "canvasDraftRecoveryBoundary.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasDraftRepository_architecture_test_ts_5ee58cb1: {
  label: "canvasDraftRepository.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasDraftRepository_conflict_test_ts_f686ccd5: {
  label: "canvasDraftRepository.conflict.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasDraftRepository_readWrite_test_ts_f31f6aef: {
  label: "canvasDraftRepository.readWrite.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasDraftRepository_test_fixtures_ts_808c784a: {
  label: "canvasDraftRepository.test.fixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftRepository_ts_baf2e791: {
  label: "canvasDraftRepository.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasDraftSaveStatus_tsx_de3c701e: {
  label: "CanvasDraftSaveStatus.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftScope_test_ts_16421784: {
  label: "canvasDraftScope.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftScope_ts_4f567b44: {
  label: "canvasDraftScope.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasDraftSession_architecture_test_ts_c64b210a: {
  label: "canvasDraftSession.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftSession_test_ts_17c32609: {
  label: "canvasDraftSession.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftSession_ts_cac9aed6: {
  label: "canvasDraftSession.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftSession_types_ts_f4ac5609: {
  label: "canvasDraftSession.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasDraftSessionBaseline_ts_efefe678: {
  label: "canvasDraftSessionBaseline.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasDraftSessionMachine_ts_8843d237: {
  label: "canvasDraftSessionMachine.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDraftSessionWorkingSet_ts_9fc08bdf: {
  label: "canvasDraftSessionWorkingSet.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasDraftStatusState_test_ts_bf6fffa6: {
  label: "canvasDraftStatusState.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDraftStatusState_ts_45775d92: {
  label: "canvasDraftStatusState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasDraftStructuralSignature_ts_3ca5c6b0: {
  label: "canvasDraftStructuralSignature.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasDraftTransportErrorState_ts_36303e0e: {
  label: "canvasDraftTransportErrorState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasDraftWorkspaceFileRefresh_test_ts_cfda4f95: {
  label: "canvasDraftWorkspaceFileRefresh.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasDraftWorkspaceFileRefresh_ts_5ee0aaf5: {
  label: "canvasDraftWorkspaceFileRefresh.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasDuplicateNodeCommand_test_ts_59b9dad1: {
  label: "canvasDuplicateNodeCommand.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasDuplicateNodeCommand_ts_484e7535: {
  label: "canvasDuplicateNodeCommand.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDvtAuthoringModel_ts_d2debf7d: {
  label: "canvasDvtAuthoringModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDvtAuthoringTypes_ts_758f905e: {
  label: "canvasDvtAuthoringTypes.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_canvasDvtCompositionInputCatalog_test_ts_2fa5a0de: {
  label: "canvasDvtCompositionInputCatalog.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDvtCompositionInputCatalog_ts_568d786e: {
  label: "canvasDvtCompositionInputCatalog.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasDvtConnectionAuthority_test_ts_cfdcf8c5: {
  label: "canvasDvtConnectionAuthority.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDvtSinkAuthoring_ts_e7a74d40: {
  label: "canvasDvtSinkAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDvtSourceAuthoring_ts_6ad9eb19: {
  label: "canvasDvtSourceAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDvtSourceSemanticAuthoring_ts_34ab38a3: {
  label: "canvasDvtSourceSemanticAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasDvtSubstraitAggregateWindow_test_ts_fda3dbb6: {
  label: "canvasDvtSubstraitAggregateWindow.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasDvtSubstraitAggregateWindow_ts_a3ade4a9: {
  label: "canvasDvtSubstraitAggregateWindow.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasDvtSubstraitAggregation_test_ts_8bc0b6f7: {
  label: "canvasDvtSubstraitAggregation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDvtSubstraitAggregation_ts_41c6d411: {
  label: "canvasDvtSubstraitAggregation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasDvtSubstraitCalculatedColumn_ts_7f8abfe1: {
  label: "canvasDvtSubstraitCalculatedColumn.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasDvtSubstraitCalculatedExpression_ts_4862c22c: {
  label: "canvasDvtSubstraitCalculatedExpression.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasDvtSubstraitFieldDocumentation_ts_f9163c8a: {
  label: "canvasDvtSubstraitFieldDocumentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDvtSubstraitFilter_test_ts_4e6b45e9: {
  label: "canvasDvtSubstraitFilter.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDvtSubstraitFilter_ts_3fd1e491: {
  label: "canvasDvtSubstraitFilter.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_canvasDvtSubstraitFilterPostgresProjection_ts_f439ec81: {
  label: "canvasDvtSubstraitFilterPostgresProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasDvtSubstraitJoinComposition_test_ts_782c382c: {
  label: "canvasDvtSubstraitJoinComposition.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasDvtSubstraitJoinComposition_ts_947cc129: {
  label: "canvasDvtSubstraitJoinComposition.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasDvtSubstraitOutputProjection_test_ts_9c3ffc95: {
  label: "canvasDvtSubstraitOutputProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasDvtSubstraitOutputProjection_ts_b15dd901: {
  label: "canvasDvtSubstraitOutputProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasDvtSubstraitPilot_review_test_ts_a760baf6: {
  label: "canvasDvtSubstraitPilot.review.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDvtSubstraitPilot_test_ts_a7e30395: {
  label: "canvasDvtSubstraitPilot.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDvtSubstraitPilot_ts_b82f0253: {
  label: "canvasDvtSubstraitPilot.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDvtSubstraitPostgresAst_ts_2e068736: {
  label: "canvasDvtSubstraitPostgresAst.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_canvasDvtSubstraitPostgresProjection_test_ts_55f689fb: {
  label: "canvasDvtSubstraitPostgresProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasDvtSubstraitPostgresProjection_ts_20f4e874: {
  label: "canvasDvtSubstraitPostgresProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasDvtSubstraitProjection_alias_test_ts_c21c56d5: {
  label: "canvasDvtSubstraitProjection.alias.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_sDvtSubstraitProjection_fieldComposition_test_ts_61352581: {
  label: "canvasDvtSubstraitProjection.fieldComposition.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasDvtSubstraitProjection_ts_f96b2725: {
  label: "canvasDvtSubstraitProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasDvtSubstraitSemanticCodec_ts_96280d0c: {
  label: "canvasDvtSubstraitSemanticCodec.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasDvtSubstraitSemanticDocument_ts_ee2fc2ba: {
  label: "canvasDvtSubstraitSemanticDocument.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_canvasDvtSubstraitSetComposition_test_ts_ce410852: {
  label: "canvasDvtSubstraitSetComposition.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasDvtSubstraitSetComposition_ts_4552deac: {
  label: "canvasDvtSubstraitSetComposition.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasDvtSubstraitStructuredField_test_ts_9d12a475: {
  label: "canvasDvtSubstraitStructuredField.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasDvtSubstraitStructuredField_ts_10ddadb0: {
  label: "canvasDvtSubstraitStructuredField.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasDvtSubstraitStructuredFieldAppend_ts_875d46d7: {
  label: "canvasDvtSubstraitStructuredFieldAppend.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_canvasDvtSubstraitStructuredFieldMutation_ts_d5226e46: {
  label: "canvasDvtSubstraitStructuredFieldMutation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvasDvtSubstraitStructuredFieldReorder_test_ts_7edc248b: {
  label: "canvasDvtSubstraitStructuredFieldReorder.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_canvasDvtSubstraitStructuredFieldReorder_ts_e1c2cb7d: {
  label: "canvasDvtSubstraitStructuredFieldReorder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasDvtSubstraitTextEquality_ts_13f5891c: {
  label: "canvasDvtSubstraitTextEquality.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasDvtSubstraitWindow_test_ts_8356d724: {
  label: "canvasDvtSubstraitWindow.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasDvtSubstraitWindow_ts_cdd07cc3: {
  label: "canvasDvtSubstraitWindow.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasDvtTransformAuthoring_ts_8fbd639a: {
  label: "canvasDvtTransformAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_canvasDvtTransformAuthoringAuthority_test_ts_9aa432af: {
  label: "canvasDvtTransformAuthoringAuthority.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasDvtTransformAuthoringAuthority_ts_7340f385: {
  label: "canvasDvtTransformAuthoringAuthority.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_geAdmissionTransaction_sourceReplacement_test_ts_552420ef: {
  label: "canvasEdgeAdmissionTransaction.sourceReplacement.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasEdgeAdmissionTransaction_test_ts_f2a702f3: {
  label: "canvasEdgeAdmissionTransaction.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasEdgeAdmissionTransaction_ts_38973925: {
  label: "canvasEdgeAdmissionTransaction.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasEdgeExecutionContextMenu_test_ts_fd8f4b32: {
  label: "canvasEdgeExecutionContextMenu.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vasEmptyAuthoringEntrypoint_architecture_test_ts_7bae0360: {
  label: "CanvasEmptyAuthoringEntrypoint.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasExecutionActions_types_ts_abce419b: {
  label: "canvasExecutionActions.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasExecutionCopy_test_ts_d2fd32bc: {
  label: "canvasExecutionCopy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_sExecutionSelectionRecovery_architecture_test_ts_eb96011b: {
  label: "canvasExecutionSelectionRecovery.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_canvasExecutionSelectionRecovery_test_ts_9ebd08dc: {
  label: "canvasExecutionSelectionRecovery.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasExecutionSelectionRecovery_ts_3a94ff26: {
  label: "canvasExecutionSelectionRecovery.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ecutionSelectionRecoveryAuthorityAdapter_test_ts_f341bfdc: {
  label: "canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vasExecutionSelectionRecoveryAuthorityAdapter_ts_c2074b5a: {
  label: "canvasExecutionSelectionRecoveryAuthorityAdapter.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasExecutionState_ts_4b629f71: {
  label: "canvasExecutionState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasFirstAuthoringFirstNodePolicy_ts_6891227c: {
  label: "canvasFirstAuthoringFirstNodePolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasFirstAuthoringLiveProof_test_ts_9d6c5552: {
  label: "canvasFirstAuthoringLiveProof.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasFirstAuthoringLiveProof_ts_46ea39c8: {
  label: "canvasFirstAuthoringLiveProof.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasFirstAuthoringLiveProof_types_ts_e2317553: {
  label: "canvasFirstAuthoringLiveProof.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasFirstAuthoringProofInvariant_ts_ec1d5c25: {
  label: "canvasFirstAuthoringProofInvariant.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_canvasFirstAuthoringRestoredLayoutPolicy_ts_b2cfec18: {
  label: "canvasFirstAuthoringRestoredLayoutPolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasGeneratedDbtModelReplacement_ts_8a28c4e0: {
  label: "canvasGeneratedDbtModelReplacement.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasGitProvenance_ts_59226a78: {
  label: "canvasGitProvenance.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasGraphChangeRuntime_ts_fbaf8123: {
  label: "canvasGraphChangeRuntime.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasGraphFilter_contract_test_ts_b1533ed0: {
  label: "canvasGraphFilter.contract.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasGraphFilter_contract_ts_3263f7b0: {
  label: "canvasGraphFilter.contract.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasGraphFilter_test_ts_cc97c4f3: {
  label: "canvasGraphFilter.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasGraphFilter_ts_ea910832: {
  label: "canvasGraphFilter.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_CanvasGraphFilterControl_test_tsx_c4af339a: {
  label: "CanvasGraphFilterControl.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_CanvasGraphFilterControl_tsx_7ad48208: {
  label: "CanvasGraphFilterControl.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasGraphFilterPresentation_test_ts_b95ad713: {
  label: "canvasGraphFilterPresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasGraphFilterPresentation_ts_0c47ef93: {
  label: "canvasGraphFilterPresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasGraphHandlerContractBuilders_ts_b066f06c: {
  label: "canvasGraphHandlerContractBuilders.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasGraphHandlerContracts_ts_769fcd71: {
  label: "canvasGraphHandlerContracts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasGraphLifecycle_architecture_test_ts_1753f12c: {
  label: "canvasGraphLifecycle.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasGraphLifecycle_edge_ts_dc9252c2: {
  label: "canvasGraphLifecycle.edge.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasGraphLifecycle_node_ts_b338b548: {
  label: "canvasGraphLifecycle.node.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasGraphLifecycle_test_ts_3feb2bf2: {
  label: "canvasGraphLifecycle.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasGraphLifecycle_ts_3a8d9d74: {
  label: "canvasGraphLifecycle.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasGraphLifecycle_types_ts_28b45d3d: {
  label: "canvasGraphLifecycle.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasGraphLifecycleFallout_test_ts_69d33016: {
  label: "canvasGraphLifecycleFallout.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasGraphLifecycleFallout_ts_2f049de7: {
  label: "canvasGraphLifecycleFallout.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasGraphNodeColumnProjection_test_ts_5c5a58b0: {
  label: "canvasGraphNodeColumnProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasGraphNodeColumnProjection_ts_2fd0f767: {
  label: "canvasGraphNodeColumnProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasGraphSearch_contract_test_ts_bcc9ee01: {
  label: "canvasGraphSearch.contract.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasGraphSearch_contract_ts_d91fc3d7: {
  label: "canvasGraphSearch.contract.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasGraphSearch_test_ts_cfade368: {
  label: "canvasGraphSearch.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasGraphSearch_ts_7b9f4ead: {
  label: "canvasGraphSearch.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_CanvasGraphSearchControl_test_tsx_14ca9e34: {
  label: "CanvasGraphSearchControl.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_CanvasGraphSearchControl_tsx_f491cabc: {
  label: "CanvasGraphSearchControl.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasGraphSearchPresentation_test_ts_3742bd20: {
  label: "canvasGraphSearchPresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasGraphSearchPresentation_ts_cf2cef19: {
  label: "canvasGraphSearchPresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_CanvasGraphStatusOverlay_test_tsx_c8d7c121: {
  label: "CanvasGraphStatusOverlay.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_CanvasGraphStatusOverlay_tsx_2be94dbc: {
  label: "CanvasGraphStatusOverlay.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasGraphUtils_largeGraph_test_ts_1c9f1861: {
  label: "canvasGraphUtils.largeGraph.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasGraphUtils_ts_c666ce09: {
  label: "canvasGraphUtils.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_canvasHandlerContracts_architecture_test_ts_05822314: {
  label: "canvasHandlerContracts.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasHostCycleState_test_ts_70cc68d6: {
  label: "canvasHostCycleState.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasHostCycleState_ts_c21fb3cb: {
  label: "canvasHostCycleState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasInspectorAuthoring_types_ts_a3169a08: {
  label: "canvasInspectorAuthoring.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasInspectorAuthoringCommand_ts_f7987ba3: {
  label: "canvasInspectorAuthoringCommand.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasInspectorAuthoringErrorCodes_ts_a0e83ef2: {
  label: "canvasInspectorAuthoringErrorCodes.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasInspectorAuthoringModel_test_ts_7187505f: {
  label: "canvasInspectorAuthoringModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasInspectorAuthoringModel_ts_f8f9c974: {
  label: "canvasInspectorAuthoringModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_CanvasInspectorAuthoringSection_tsx_5448bf55: {
  label: "CanvasInspectorAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_asInteractionCommandSurface_architecture_test_ts_2217b3e1: {
  label: "canvasInteractionCommandSurface.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasInteractionCommandSurface_test_ts_65585c96: {
  label: "canvasInteractionCommandSurface.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasInteractionCommandSurface_ts_275b8f18: {
  label: "canvasInteractionCommandSurface.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasKindRegistration_testSupport_ts_21bf7921: {
  label: "canvasKindRegistration.testSupport.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_canvasLayoutPersistence_architecture_test_ts_a98241e4: {
  label: "canvasLayoutPersistence.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_CanvasModalHost_architecture_test_tsx_99f5fea8: {
  label: "CanvasModalHost.architecture.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasModalHost_tsx_9dd4d0d6: {
  label: "CanvasModalHost.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasModalHost_types_ts_05e0877a: {
  label: "canvasModalHost.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasModalHostPropsBuilder_test_ts_2e45994f: {
  label: "canvasModalHostPropsBuilder.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasModalHostPropsBuilder_ts_5c267986: {
  label: "canvasModalHostPropsBuilder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_canvasMutationHandlerContractBuilders_ts_df7a8a34: {
  label: "canvasMutationHandlerContractBuilders.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasMutationHandlerContracts_ts_12c3a198: {
  label: "canvasMutationHandlerContracts.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasMutationHandlers_types_ts_97175a40: {
  label: "canvasMutationHandlers.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasNodeAdmissionTransaction_test_ts_b70a5acf: {
  label: "canvasNodeAdmissionTransaction.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasNodeAdmissionTransaction_ts_6511977a: {
  label: "canvasNodeAdmissionTransaction.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasNodeContextSurfaceModel_test_ts_5011b931: {
  label: "canvasNodeContextSurfaceModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasNodeContextSurfaceModel_ts_49bdf8ad: {
  label: "canvasNodeContextSurfaceModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasNodeDropAggregate_test_ts_ad5d4601: {
  label: "canvasNodeDropAggregate.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasNodeDropAggregate_ts_494c0121: {
  label: "canvasNodeDropAggregate.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasNodeDropPayload_test_ts_80152939: {
  label: "canvasNodeDropPayload.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasNodeDropPayload_ts_dc09cb0d: {
  label: "canvasNodeDropPayload.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasNodeInteractionPresentation_ts_8f022784: {
  label: "canvasNodeInteractionPresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasNodeMapper_test_ts_b8d1aa4d: {
  label: "canvasNodeMapper.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasNodeMapper_ts_23b980f6: {
  label: "canvasNodeMapper.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasNodePresentationCopy_ts_30a39c41: {
  label: "canvasNodePresentationCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_dePresentationProjection_outputSelection_test_ts_c2f4ef55: {
  label: "canvasNodePresentationProjection.outputSelection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_canvasNodePresentationProjection_test_ts_b4fde212: {
  label: "canvasNodePresentationProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasNodePresentationProjection_ts_a1daa113: {
  label: "canvasNodePresentationProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasNodeTagPolicy_ts_2ce0a75a: {
  label: "canvasNodeTagPolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasNodeWorkbenchContribution_test_ts_2e338a3c: {
  label: "canvasNodeWorkbenchContribution.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasNodeWorkbenchContribution_ts_6d29759e: {
  label: "canvasNodeWorkbenchContribution.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasNodeWorkbenchDomGeometry_ts_4aa446a9: {
  label: "canvasNodeWorkbenchDomGeometry.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_odeWorkbenchDraftController_architecture_test_ts_8edfe1ab: {
  label: "CanvasNodeWorkbenchDraftController.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_CanvasNodeWorkbenchOverlay_test_tsx_30e0b4e8: {
  label: "CanvasNodeWorkbenchOverlay.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_CanvasNodeWorkbenchOverlay_tsx_c784682f: {
  label: "CanvasNodeWorkbenchOverlay.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__CanvasNodeWorkbenchPanel_contributions_test_tsx_fa84a90f: {
  label: "CanvasNodeWorkbenchPanel.contributions.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_CanvasNodeWorkbenchPanel_header_test_tsx_a35bddd6: {
  label: "CanvasNodeWorkbenchPanel.header.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_CanvasNodeWorkbenchPanel_test_tsx_f461c04e: {
  label: "CanvasNodeWorkbenchPanel.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_CanvasNodeWorkbenchPanel_tsx_7c5c6819: {
  label: "CanvasNodeWorkbenchPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_canvasNodeWorkbenchPositionModel_test_ts_1c5e6f9b: {
  label: "canvasNodeWorkbenchPositionModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasNodeWorkbenchPositionModel_ts_5c22538f: {
  label: "canvasNodeWorkbenchPositionModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasNodeWorkbenchSectionStrategy_test_ts_85e2aeab: {
  label: "canvasNodeWorkbenchSectionStrategy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasNodeWorkbenchSectionStrategy_ts_9be578af: {
  label: "canvasNodeWorkbenchSectionStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasNodeWorkbenchVisibility_test_ts_db48ed6a: {
  label: "canvasNodeWorkbenchVisibility.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasNodeWorkbenchVisibility_ts_3f1b84d4: {
  label: "canvasNodeWorkbenchVisibility.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasNodeWorkbenchVisualTokens_ts_6fece26d: {
  label: "canvasNodeWorkbenchVisualTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_canvasOperationalDrawerContribution_test_tsx_4443da6f: {
  label: "canvasOperationalDrawerContribution.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasOperationalDrawerContribution_ts_cdb9a4d7: {
  label: "canvasOperationalDrawerContribution.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_sOperationalDrawerContributionRegistrar_test_tsx_07442fe1: {
  label: "CanvasOperationalDrawerContributionRegistrar.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_CanvasOperationalDrawerContributionRegistrar_tsx_85ebc9bf: {
  label: "CanvasOperationalDrawerContributionRegistrar.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasOverlayContext_test_ts_291e5f4d: {
  label: "canvasOverlayContext.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasOverlayContext_ts_59c0e216: {
  label: "canvasOverlayContext.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasPalette_test_ts_760403ee: {
  label: "canvasPalette.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasPalette_ts_ee318419: {
  label: "canvasPalette.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_canvasPlanAction_dbtProjectFiles_test_ts_6ed9d6b1: {
  label: "canvasPlanAction.dbtProjectFiles.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvasPlanAction_graphDraftSqlAuthority_test_ts_3c112856: {
  label: "canvasPlanAction.graphDraftSqlAuthority.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasPlanAction_ts_a04b8284: {
  label: "canvasPlanAction.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasPlanReadiness_test_ts_a3cff63c: {
  label: "canvasPlanReadiness.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasPlanReadiness_ts_a4ac2dca: {
  label: "canvasPlanReadiness.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_CanvasPlaygroundHost_architecture_test_tsx_636a739f: {
  label: "CanvasPlaygroundHost.architecture.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_CanvasPlaygroundHost_templates_tsx_494e038c: {
  label: "CanvasPlaygroundHost.templates.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_CanvasPlaygroundHost_test_tsx_0371bfc5: {
  label: "CanvasPlaygroundHost.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasPlaygroundHost_tsx_eb62de97: {
  label: "CanvasPlaygroundHost.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasPreviewOutcomeProjection_test_ts_868b8f8c: {
  label: "canvasPreviewOutcomeProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasPreviewOutcomeProjection_ts_b8cb5ba2: {
  label: "canvasPreviewOutcomeProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasProjectCanvasLifecycle_test_ts_f7edf314: {
  label: "canvasProjectCanvasLifecycle.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasProjectCanvasLifecycle_ts_743a87ad: {
  label: "canvasProjectCanvasLifecycle.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasProjectCanvasLifecycleCommand_ts_841b8b23: {
  label: "canvasProjectCanvasLifecycleCommand.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_CanvasProjectExplorerDialog_test_tsx_e0021249: {
  label: "CanvasProjectExplorerDialog.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_CanvasProjectExplorerDialog_tsx_bc118a8f: {
  label: "CanvasProjectExplorerDialog.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasProjectSnapshot_architecture_test_ts_0fd87256: {
  label: "canvasProjectSnapshot.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasProjectSnapshot_test_ts_592fe368: {
  label: "canvasProjectSnapshot.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasProjectSnapshot_ts_39d3f046: {
  label: "canvasProjectSnapshot.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_canvasProjectSnapshotImportCommand_test_ts_0c4b7c63: {
  label: "canvasProjectSnapshotImportCommand.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_canvasProjectSnapshotImportCommand_ts_4f8b7f71: {
  label: "canvasProjectSnapshotImportCommand.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_CanvasRecoveryBanner_architecture_test_tsx_3f6e56c6: {
  label: "CanvasRecoveryBanner.architecture.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_CanvasRecoveryBanner_templates_tsx_4c1bfe3b: {
  label: "CanvasRecoveryBanner.templates.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_CanvasRecoveryBanner_test_tsx_9cbbcf90: {
  label: "CanvasRecoveryBanner.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasRecoveryBanner_tsx_c7ae66e5: {
  label: "CanvasRecoveryBanner.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasRecoveryBannerModel_test_ts_d543fe4a: {
  label: "canvasRecoveryBannerModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasRecoveryBannerModel_ts_87681a92: {
  label: "canvasRecoveryBannerModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasRouteAuthority_test_ts_5ca905d6: {
  label: "canvasRouteAuthority.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasRouteAuthority_ts_05612346: {
  label: "canvasRouteAuthority.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasRouteInteractionState_test_ts_4229bf6f: {
  label: "canvasRouteInteractionState.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasRouteInteractionState_ts_917bd4d5: {
  label: "canvasRouteInteractionState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvasRoutePosturePriority_architecture_test_ts_0323b3a3: {
  label: "canvasRoutePosturePriority.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_canvasRouteViewState_architecture_test_ts_880e4b5e: {
  label: "canvasRouteViewState.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasRouteViewState_test_ts_cfb1d811: {
  label: "canvasRouteViewState.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasRouteViewState_ts_6a5fa6c9: {
  label: "canvasRouteViewState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasRunSelection_test_ts_f82ad0ef: {
  label: "canvasRunSelection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasRunSelection_ts_36fa5558: {
  label: "canvasRunSelection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasRunStartAction_ts_2947c12a: {
  label: "canvasRunStartAction.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_canvasRunStartIdentity_architecture_test_ts_86c0f712: {
  label: "canvasRunStartIdentity.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasRuntimePolicy_test_ts_6b7d0933: {
  label: "canvasRuntimePolicy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasRuntimePolicy_ts_6e70da63: {
  label: "canvasRuntimePolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_CanvasSettingsDialog_architecture_test_tsx_9c359273: {
  label: "CanvasSettingsDialog.architecture.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_CanvasSettingsDialog_test_tsx_7155db8d: {
  label: "CanvasSettingsDialog.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasSettingsDialog_tsx_e1d24439: {
  label: "CanvasSettingsDialog.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_CanvasShell_architecture_test_tsx_e343116d: {
  label: "CanvasShell.architecture.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_CanvasShell_contextualDialogs_test_tsx_9eda4037: {
  label: "CanvasShell.contextualDialogs.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_CanvasShell_graphSurface_test_tsx_e7eb07ec: {
  label: "CanvasShell.graphSurface.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_CanvasShell_operationalDrawer_test_tsx_2473de1b: {
  label: "CanvasShell.operationalDrawer.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_CanvasShell_sourceImportAvailability_test_tsx_73210fd5: {
  label: "CanvasShell.sourceImportAvailability.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_CanvasShell_sourceImportLifecycle_test_tsx_3079c448: {
  label: "CanvasShell.sourceImportLifecycle.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasShell_testHarness_tsx_c40fd7a1: {
  label: "CanvasShell.testHarness.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasShell_tsx_19c297a0: {
  label: "CanvasShell.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasShell_types_architecture_test_ts_177edd75: {
  label: "canvasShell.types.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasShell_types_ts_229ab18c: {
  label: "canvasShell.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_canvasShellBuilder_types_architecture_test_ts_90b8ecc5: {
  label: "canvasShellBuilder.types.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasShellBuilder_types_ts_bde4098a: {
  label: "canvasShellBuilder.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasShellChromeCommandsBuilder_ts_0b6158a2: {
  label: "canvasShellChromeCommandsBuilder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasShellChromeStateBuilder_ts_fd34137d: {
  label: "canvasShellChromeStateBuilder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasShellGraphBuilder_ts_d695eb47: {
  label: "canvasShellGraphBuilder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasShellGraphCommandsBuilder_ts_f8f3d6ab: {
  label: "canvasShellGraphCommandsBuilder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasShellLayoutBuilder_tsx_93177704: {
  label: "canvasShellLayoutBuilder.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_CanvasShellMainPanel_architecture_test_ts_3f2057d0: {
  label: "CanvasShellMainPanel.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasShellMainPanel_tsx_debffab0: {
  label: "CanvasShellMainPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_CanvasShellMainPanelFrame_tsx_5e9d6133: {
  label: "CanvasShellMainPanelFrame.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_canvasShellPanelsBuilder_test_ts_c3e5ace4: {
  label: "canvasShellPanelsBuilder.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasShellPanelsBuilder_ts_d6ca42bb: {
  label: "canvasShellPanelsBuilder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_canvasShellPropsBuilder_architecture_test_ts_e338bcb4: {
  label: "canvasShellPropsBuilder.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasShellPropsBuilder_tsx_e97c1ee5: {
  label: "canvasShellPropsBuilder.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasSourceColumnOrder_test_ts_96701391: {
  label: "canvasSourceColumnOrder.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasSourceColumnOrder_ts_57c57239: {
  label: "canvasSourceColumnOrder.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_canvasSourceDataSample_test_ts_1afc8b27: {
  label: "canvasSourceDataSample.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasSourceDataSample_ts_eda71c13: {
  label: "canvasSourceDataSample.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_CanvasSourceImportDialogHost_test_ts_0a881041: {
  label: "CanvasSourceImportDialogHost.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_CanvasSourceImportDialogHost_tsx_c0b5b5f4: {
  label: "CanvasSourceImportDialogHost.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_CanvasSourceImportLiveProof_architecture_test_ts_860f14d6: {
  label: "CanvasSourceImportLiveProof.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasSqlIdentifier_ts_ef6109e8: {
  label: "canvasSqlIdentifier.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_sStartupAndDraftRecovery_architecture_support_ts_f0f31e0d: {
  label: "canvasStartupAndDraftRecovery.architecture.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_StartupBootstrapPublication_architecture_test_ts_65556af9: {
  label: "canvasStartupBootstrapPublication.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasStateViews_tsx_fa4e5988: {
  label: "CanvasStateViews.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_canvasStructuredFieldAuthoring_test_ts_37ba88a1: {
  label: "canvasStructuredFieldAuthoring.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasStructuredFieldAuthoring_ts_78489a15: {
  label: "canvasStructuredFieldAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_canvasStructuredFieldLineage_ts_4b4de2ed: {
  label: "canvasStructuredFieldLineage.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_canvasStructuredFieldPresentation_ts_e5b8263c: {
  label: "canvasStructuredFieldPresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_canvasSubstraitPresentationFailClosed_test_ts_90e34337: {
  label: "canvasSubstraitPresentationFailClosed.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_canvasTemplatePresentation_test_ts_e4889cc7: {
  label: "canvasTemplatePresentation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_canvasTemplatePresentation_ts_397571fb: {
  label: "canvasTemplatePresentation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasTransformColumnOrderProjection_ts_4e0d26ba: {
  label: "canvasTransformColumnOrderProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasTransformSourceReplacement_ts_acda6a3c: {
  label: "canvasTransformSourceReplacement.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_CanvasViewport_architecture_test_ts_87ba3ce9: {
  label: "CanvasViewport.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_CanvasViewport_graphFilter_test_tsx_0f472511: {
  label: "CanvasViewport.graphFilter.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_CanvasViewport_graphSearch_test_tsx_77b6c877: {
  label: "CanvasViewport.graphSearch.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_CanvasViewport_keyboardContextMenu_test_tsx_e42e8b51: {
  label: "CanvasViewport.keyboardContextMenu.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_CanvasViewport_keyboardNodeEntry_test_ts_be99ceb1: {
  label: "CanvasViewport.keyboardNodeEntry.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_CanvasViewport_nodeOperationalRail_test_tsx_02eafb7e: {
  label: "CanvasViewport.nodeOperationalRail.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasViewport_test_tsx_8e879e61: {
  label: "CanvasViewport.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_CanvasViewport_testHarness_tsx_2337fc4f: {
  label: "CanvasViewport.testHarness.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasViewport_tsx_5e45d294: {
  label: "CanvasViewport.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_canvasViewportNodeTypeRegistryTestAdapter_ts_6555bfe1: {
  label: "canvasViewportNodeTypeRegistryTestAdapter.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_canvasViewportStyle_ts_4a4747b0: {
  label: "canvasViewportStyle.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_CanvasViewportSurfaceView_tsx_2921f2ef: {
  label: "CanvasViewportSurfaceView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_canvasViewportXyflowTestAdapter_tsx_135007d7: {
  label: "canvasViewportXyflowTestAdapter.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasWorkbenchLogEntries_test_ts_1aa00174: {
  label: "canvasWorkbenchLogEntries.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasWorkbenchLogEntries_ts_bdc897e8: {
  label: "canvasWorkbenchLogEntries.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_CanvasWorkbenchLogPanel_test_tsx_8289ddcc: {
  label: "CanvasWorkbenchLogPanel.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_CanvasWorkbenchLogPanel_tsx_40da8bfa: {
  label: "CanvasWorkbenchLogPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_canvasWorkbenchStateModel_test_ts_64a4dd8d: {
  label: "canvasWorkbenchStateModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_canvasWorkbenchStateModel_ts_c3ba973f: {
  label: "canvasWorkbenchStateModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_canvasWorkspaceMenuContributionStore_ts_5040e0bf: {
  label: "canvasWorkspaceMenuContributionStore.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_CanvasWorkspaceMenuControls_test_tsx_c6cdca1e: {
  label: "CanvasWorkspaceMenuControls.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_CanvasWorkspaceMenuControls_tsx_3f57a486: {
  label: "CanvasWorkspaceMenuControls.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_copy_test_ts_3de47cfd: {
  label: "copy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_copy_ts_59f85ee7: {
  label: "copy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_DbtAuthoringFields_test_tsx_4f0196db: {
  label: "DbtAuthoringFields.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_DbtAuthoringFields_tsx_78df8d0f: {
  label: "DbtAuthoringFields.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_dbtAuthoringFieldsModel_test_ts_219b2bd9: {
  label: "dbtAuthoringFieldsModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_dbtAuthoringFieldsModel_ts_85dd1fc3: {
  label: "dbtAuthoringFieldsModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_dbtExecutionScopePolicy_test_ts_6694598e: {
  label: "dbtExecutionScopePolicy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_dbtExecutionScopePolicy_ts_356b5b6f: {
  label: "dbtExecutionScopePolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_dbtExecutionTargetWorkbenchContribution_test_tsx_301e7dc1: {
  label: "dbtExecutionTargetWorkbenchContribution.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_dbtExecutionTargetWorkbenchContribution_tsx_70bd3df2: {
  label: "dbtExecutionTargetWorkbenchContribution.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_dbtGraphModelSqlPublicationPolicy_test_ts_c37240c8: {
  label: "dbtGraphModelSqlPublicationPolicy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_dbtGraphModelSqlPublicationPolicy_ts_ff8788c5: {
  label: "dbtGraphModelSqlPublicationPolicy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_dbtGraphWorkspaceArtifactPublisher_test_ts_d62c624f: {
  label: "dbtGraphWorkspaceArtifactPublisher.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_dbtGraphWorkspaceArtifactPublisher_ts_e67d9866: {
  label: "dbtGraphWorkspaceArtifactPublisher.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_DbtModelAuthoringSection_tsx_fe6038df: {
  label: "DbtModelAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_DbtModelCodeAuthoringSection_test_tsx_ec8710f7: {
  label: "DbtModelCodeAuthoringSection.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_DbtModelCodeAuthoringSection_tsx_3c96d3c8: {
  label: "DbtModelCodeAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_dbtProjectCodeReconciliation_test_ts_8781b152: {
  label: "dbtProjectCodeReconciliation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_dbtProjectCodeReconciliation_ts_68258519: {
  label: "dbtProjectCodeReconciliation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_DbtProjectFileCanvas_tsx_c1e0a236: {
  label: "DbtProjectFileCanvas.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_DbtProjectFileCanvasView_tsx_d8a3bbcb: {
  label: "DbtProjectFileCanvasView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_dbtProjectFileCodeWorkbench_test_tsx_ada61195: {
  label: "dbtProjectFileCodeWorkbench.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_dbtProjectFileCodeWorkbench_tsx_947e806d: {
  label: "dbtProjectFileCodeWorkbench.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_dbtProjectFileExecutionStrategy_test_ts_9892c7db: {
  label: "dbtProjectFileExecutionStrategy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_dbtProjectFileExecutionStrategy_ts_c8af2a84: {
  label: "dbtProjectFileExecutionStrategy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_dbtProjectFileLayout_test_ts_82c6e1ff: {
  label: "dbtProjectFileLayout.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_dbtProjectFileLayout_ts_9e383f53: {
  label: "dbtProjectFileLayout.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_dbtProjectFileProjection_architecture_test_ts_2dbd876f: {
  label: "dbtProjectFileProjection.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_dbtProjectFileProjection_test_ts_7af6fdab: {
  label: "dbtProjectFileProjection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_dbtProjectFileProjection_ts_11edd7a4: {
  label: "dbtProjectFileProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_DbtSourceAuthoringSection_tsx_e99b94e8: {
  label: "DbtSourceAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_dbtTestAuthoringFieldsModel_test_ts_62eec447: {
  label: "dbtTestAuthoringFieldsModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_dbtTestAuthoringFieldsModel_ts_1fa1379a: {
  label: "dbtTestAuthoringFieldsModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_DbtTestAuthoringSection_tsx_76cdd0fa: {
  label: "DbtTestAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_dbtWorkspaceFileCodeContribution_test_tsx_c7bef9af: {
  label: "dbtWorkspaceFileCodeContribution.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_dbtWorkspaceFileCodeContribution_tsx_3f51e6d8: {
  label: "dbtWorkspaceFileCodeContribution.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_dbtYamlDescriptionWorkbenchContribution_test_tsx_92739f69: {
  label: "dbtYamlDescriptionWorkbenchContribution.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_dbtYamlDescriptionWorkbenchContribution_tsx_ca142aea: {
  label: "dbtYamlDescriptionWorkbenchContribution.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_DvtAuthoringFields_test_tsx_b8379c29: {
  label: "DvtAuthoringFields.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_DvtAuthoringFields_tsx_a258e679: {
  label: "DvtAuthoringFields.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_DvtRelationFilterAuthoringSection_tsx_9ebeb929: {
  label: "DvtRelationFilterAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_DvtSinkAuthoringSection_tsx_15f7c33d: {
  label: "DvtSinkAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_DvtSourceAuthoringSection_tsx_4db6135a: {
  label: "DvtSourceAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_DvtSubstraitCompositionStart_tsx_84981be9: {
  label: "DvtSubstraitCompositionStart.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_DvtSubstraitCompositionStartSection_tsx_e2952839: {
  label: "DvtSubstraitCompositionStartSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_DvtSubstraitInnerJoinAuthoringSection_tsx_3518e7a9: {
  label: "DvtSubstraitInnerJoinAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_DvtSubstraitPilotAuthoringSection_tsx_9b5997eb: {
  label: "DvtSubstraitPilotAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_DvtSubstraitPilotEntry_test_tsx_8d78585e: {
  label: "DvtSubstraitPilotEntry.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_DvtSubstraitTransformStart_tsx_4f70c80d: {
  label: "DvtSubstraitTransformStart.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_DvtSubstraitUnionAllAuthoringSection_tsx_a060a080: {
  label: "DvtSubstraitUnionAllAuthoringSection.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_DvtTransformOutputView_tsx_2458af2b: {
  label: "DvtTransformOutputView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_graphDraftWorkspaceFileCodeContribution_test_tsx_d6c9d92a: {
  label: "graphDraftWorkspaceFileCodeContribution.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_graphDraftWorkspaceFileCodeContribution_tsx_791aefd8: {
  label: "graphDraftWorkspaceFileCodeContribution.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_httpJsonArtifactAuthoringModel_test_ts_615d770b: {
  label: "httpJsonArtifactAuthoringModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_httpJsonArtifactAuthoringModel_ts_4e346636: {
  label: "httpJsonArtifactAuthoringModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_objectFilePostgresAuthoringModel_test_ts_0df5a378: {
  label: "objectFilePostgresAuthoringModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_objectFilePostgresAuthoringModel_ts_43412b42: {
  label: "objectFilePostgresAuthoringModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_PlanRunReadinessPanel_test_tsx_98664801: {
  label: "PlanRunReadinessPanel.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_PlanRunReadinessPanel_tsx_e4380cf9: {
  label: "PlanRunReadinessPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_SqlContextWorkbench_test_tsx_ad795ac4: {
  label: "SqlContextWorkbench.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_SqlContextWorkbench_tsx_1d5dd45e: {
  label: "SqlContextWorkbench.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ansformationGraphValidation_architecture_test_ts_c64a5da1: {
  label: "transformationGraphValidation.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_transformationGraphValidation_test_ts_32c2dc07: {
  label: "transformationGraphValidation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_transformationGraphValidation_ts_ef19590a: {
  label: "transformationGraphValidation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_transformationGraphValidation_types_ts_d7c361af: {
  label: "transformationGraphValidation.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_transformationGraphValidationResults_ts_0c4c0a43: {
  label: "transformationGraphValidationResults.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_transformationGraphValidationRules_ts_a3c5260c: {
  label: "transformationGraphValidationRules.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_transformationGraphValidationScope_ts_9cd725e0: {
  label: "transformationGraphValidationScope.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_useCanvasAlgebraicCompositionHandler_ts_bd8a84c3: {
  label: "useCanvasAlgebraicCompositionHandler.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_useCanvasAlgebraicDrop_test_ts_f72d8155: {
  label: "useCanvasAlgebraicDrop.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasAlgebraicDrop_ts_7a5f94b0: {
  label: "useCanvasAlgebraicDrop.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_useCanvasAuthoringNodeCreationHandlers_ts_0c5b1e53: {
  label: "useCanvasAuthoringNodeCreationHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_seCanvasAuthoringProjection_architecture_test_ts_8595b784: {
  label: "useCanvasAuthoringProjection.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_useCanvasAuthoringProjection_ts_3856c891: {
  label: "useCanvasAuthoringProjection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_useCanvasAuthoringRuntime_architecture_test_ts_428e7265: {
  label: "useCanvasAuthoringRuntime.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_useCanvasAuthoringRuntime_ts_178ba407: {
  label: "useCanvasAuthoringRuntime.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_asAuthoringRuntimeDraftFlow_architecture_test_ts_accb08e5: {
  label: "useCanvasAuthoringRuntimeDraftFlow.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_useCanvasAuthoringRuntimeDraftFlow_ts_f4915429: {
  label: "useCanvasAuthoringRuntimeDraftFlow.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_useCanvasColumnCommentCellRenderer_tsx_492eed79: {
  label: "useCanvasColumnCommentCellRenderer.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_useCanvasContextMenuLifecycle_ts_8b050d2b: {
  label: "useCanvasContextMenuLifecycle.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvasContextMenuPresenter_canvasActions_test_tsx_fda7ee79: {
  label: "useCanvasContextMenuPresenter.canvasActions.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_CanvasContextMenuPresenter_graphActions_test_tsx_14c5d9f2: {
  label: "useCanvasContextMenuPresenter.graphActions.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_useCanvasContextMenuPresenter_lifecycle_test_tsx_0edb8fd1: {
  label: "useCanvasContextMenuPresenter.lifecycle.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_useCanvasContextMenuPresenter_ts_ae451ba0: {
  label: "useCanvasContextMenuPresenter.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_useCanvasController_activeDraftLayout_test_tsx_419c48b0: {
  label: "useCanvasController.activeDraftLayout.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvasController_activeDraftNodeAuthoring_test_tsx_32514af1: {
  label: "useCanvasController.activeDraftNodeAuthoring.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvasController_activeDraftSourceImport_test_tsx_3cb2865a: {
  label: "useCanvasController.activeDraftSourceImport.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_useCanvasController_architecture_test_ts_44dc75e7: {
  label: "useCanvasController.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_useCanvasController_autosaveRace_test_tsx_c10b668e: {
  label: "useCanvasController.autosaveRace.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_useCanvasController_canvasDocument_test_tsx_803a2eb9: {
  label: "useCanvasController.canvasDocument.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasController_core_test_tsx_5db8eea0: {
  label: "useCanvasController.core.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_Controller_draftLifecycle_conflictState_test_tsx_bba36a95: {
  label: "useCanvasController.draftLifecycle.conflictState.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_oller_draftLifecycle_scopeAndProjection_test_tsx_76c22a3c: {
  label: "useCanvasController.draftLifecycle.scopeAndProjection.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_eCanvasController_draftLifecycle_test_support_ts_a8f62c51: {
  label: "useCanvasController.draftLifecycle.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_eCanvasController_draftProjectionGuards_test_tsx_9ca0fb24: {
  label: "useCanvasController.draftProjectionGuards.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_useCanvasController_inspector_test_tsx_c0a25650: {
  label: "useCanvasController.inspector.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_useCanvasController_missingRemote_test_tsx_2450805c: {
  label: "useCanvasController.missingRemote.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_useCanvasController_permissions_test_tsx_02345f03: {
  label: "useCanvasController.permissions.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_useCanvasController_persistence_test_tsx_cfbab8dd: {
  label: "useCanvasController.persistence.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ontroller_reloadConflictRecovery_test_support_ts_ec8a7cad: {
  label: "useCanvasController.reloadConflictRecovery.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_CanvasController_reloadConflictRecovery_test_tsx_85f2aba4: {
  label: "useCanvasController.reloadConflictRecovery.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_eCanvasController_reloadHydrationGuards_test_tsx_d8c09033: {
  label: "useCanvasController.reloadHydrationGuards.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_seCanvasController_reloadProtectedDraft_test_tsx_531e4b93: {
  label: "useCanvasController.reloadProtectedDraft.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_eCanvasController_reloadRecovery_test_support_ts_728da81d: {
  label: "useCanvasController.reloadRecovery.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_useCanvasController_sourceImport_test_tsx_e46d6c57: {
  label: "useCanvasController.sourceImport.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_useCanvasController_test_draftAuthoring_ts_03b0ecbf: {
  label: "useCanvasController.test.draftAuthoring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_useCanvasController_test_draftRecord_ts_7a76acd3: {
  label: "useCanvasController.test.draftRecord.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_useCanvasController_test_draftSave_ts_5210134e: {
  label: "useCanvasController.test.draftSave.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_useCanvasController_test_fixtures_ts_204b8996: {
  label: "useCanvasController.test.fixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_useCanvasController_test_graphQuery_ts_2e1ca406: {
  label: "useCanvasController.test.graphQuery.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_useCanvasController_test_harness_tsx_00a9a7dd: {
  label: "useCanvasController.test.harness.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_useCanvasController_test_mockSetup_ts_de95d7f1: {
  label: "useCanvasController.test.mockSetup.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_useCanvasController_test_mockWiring_ts_91ad1b76: {
  label: "useCanvasController.test.mockWiring.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_useCanvasController_test_projectionMocks_ts_2fea6cb0: {
  label: "useCanvasController.test.projectionMocks.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_useCanvasController_test_queryClientMocks_ts_6e97842a: {
  label: "useCanvasController.test.queryClientMocks.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_useCanvasController_test_serviceDefaults_ts_1c34a4e1: {
  label: "useCanvasController.test.serviceDefaults.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_useCanvasController_test_stateFactory_ts_39e00e9b: {
  label: "useCanvasController.test.stateFactory.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasController_test_types_ts_19eb9202: {
  label: "useCanvasController.test.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasController_ts_b37a851f: {
  label: "useCanvasController.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasControllerEnvironment_ts_81f4cef0: {
  label: "useCanvasControllerEnvironment.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_useCanvasControllerReadModel_test_tsx_c7c323c6: {
  label: "useCanvasControllerReadModel.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_useCanvasControllerReadModel_ts_9a1b89dc: {
  label: "useCanvasControllerReadModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_useCanvasCurrentDraftPayload_ts_d4f6da6e: {
  label: "useCanvasCurrentDraftPayload.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_useCanvasDraftAttemptRefs_ts_6f82463d: {
  label: "useCanvasDraftAttemptRefs.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_useCanvasDraftAutosave_architecture_test_ts_7afa7dac: {
  label: "useCanvasDraftAutosave.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasDraftAutosave_ts_5fa9134b: {
  label: "useCanvasDraftAutosave.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasDraftBaseline_ts_2eaf10ee: {
  label: "useCanvasDraftBaseline.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_useCanvasDraftBootstrapping_architecture_test_ts_75f4a80e: {
  label: "useCanvasDraftBootstrapping.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_useCanvasDraftBootstrapping_ts_e6d06b00: {
  label: "useCanvasDraftBootstrapping.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_useCanvasDraftBootstrapSync_architecture_test_ts_89b09a29: {
  label: "useCanvasDraftBootstrapSync.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_useCanvasDraftBootstrapSync_ts_92bd7262: {
  label: "useCanvasDraftBootstrapSync.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_useCanvasDraftCanonicalReconcile_ts_a9a060f4: {
  label: "useCanvasDraftCanonicalReconcile.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasDraftInitialBootstrap_ts_a548a059: {
  label: "useCanvasDraftInitialBootstrap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_useCanvasDraftLifecycle_architecture_test_ts_9ac9d191: {
  label: "useCanvasDraftLifecycle.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasDraftLifecycle_ts_4d889f9c: {
  label: "useCanvasDraftLifecycle.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__views_canvas_useCanvasDraftMissingRemoteSync_ts_548ae517: {
  label: "useCanvasDraftMissingRemoteSync.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_useCanvasDraftPersistence_architecture_test_ts_4da69fc4: {
  label: "useCanvasDraftPersistence.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_useCanvasDraftPersistence_ts_3cc01d25: {
  label: "useCanvasDraftPersistence.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_useCanvasDraftRecoveryActions_ts_d3aed15f: {
  label: "useCanvasDraftRecoveryActions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_useCanvasDraftReloadHydration_ts_b278dca9: {
  label: "useCanvasDraftReloadHydration.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_CanvasEdgeAuthoringHandlers_architecture_test_ts_53cd4e1e: {
  label: "useCanvasEdgeAuthoringHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasEdgeAuthoringHandlers_ts_99df2b33: {
  label: "useCanvasEdgeAuthoringHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_useCanvasEdgeChangeHandlers_architecture_test_ts_1845b0a1: {
  label: "useCanvasEdgeChangeHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_useCanvasEdgeChangeHandlers_test_tsx_319f34a0: {
  label: "useCanvasEdgeChangeHandlers.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_useCanvasEdgeChangeHandlers_ts_41213f3e: {
  label: "useCanvasEdgeChangeHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_useCanvasEdgeCommandRunner_test_tsx_ac2a5a2b: {
  label: "useCanvasEdgeCommandRunner.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useCanvasEdgeCommandRunner_ts_dbe62515: {
  label: "useCanvasEdgeCommandRunner.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_useCanvasExecutionActions_architecture_test_ts_393ef881: {
  label: "useCanvasExecutionActions.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_useCanvasExecutionActions_dbtDraftFlush_test_tsx_a2884778: {
  label: "useCanvasExecutionActions.dbtDraftFlush.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_useCanvasExecutionActions_dbtPreviewRun_test_tsx_251a8a60: {
  label: "useCanvasExecutionActions.dbtPreviewRun.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvasExecutionActions_graphSqlDivergence_test_tsx_182dd55e: {
  label: "useCanvasExecutionActions.graphSqlDivergence.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_seCanvasExecutionActions_runStartGuards_test_tsx_b1ae243d: {
  label: "useCanvasExecutionActions.runStartGuards.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_eCanvasExecutionActions_runStartSuccess_test_tsx_ac38e55c: {
  label: "useCanvasExecutionActions.runStartSuccess.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_useCanvasExecutionActions_test_support_tsx_4870c491: {
  label: "useCanvasExecutionActions.test.support.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_useCanvasExecutionActions_ts_df3b669a: {
  label: "useCanvasExecutionActions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ews_canvas_useCanvasExecutionDraftFlush_test_tsx_50e2c50d: {
  label: "useCanvasExecutionDraftFlush.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_useCanvasExecutionDraftFlush_ts_9999584e: {
  label: "useCanvasExecutionDraftFlush.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_useCanvasExecutionSelectionRecovery_test_tsx_dea85d73: {
  label: "useCanvasExecutionSelectionRecovery.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_useCanvasExecutionSelectionRecovery_ts_d9d560f0: {
  label: "useCanvasExecutionSelectionRecovery.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_seCanvasGraphChangeHandlers_architecture_test_ts_5bdae353: {
  label: "useCanvasGraphChangeHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_useCanvasGraphChangeHandlers_ts_7efda1fa: {
  label: "useCanvasGraphChangeHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_useCanvasGraphFilterController_test_tsx_cc288f7a: {
  label: "useCanvasGraphFilterController.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasGraphFilterController_ts_1b8998d7: {
  label: "useCanvasGraphFilterController.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_useCanvasGraphHandlers_architecture_test_ts_626c70e5: {
  label: "useCanvasGraphHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_useCanvasGraphHandlers_catalogCreate_test_ts_b0967947: {
  label: "useCanvasGraphHandlers.catalogCreate.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_useCanvasGraphHandlers_dbtColumns_test_tsx_b45ca541: {
  label: "useCanvasGraphHandlers.dbtColumns.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_useCanvasGraphHandlers_edgeAuthoring_test_tsx_e396f56a: {
  label: "useCanvasGraphHandlers.edgeAuthoring.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_useCanvasGraphHandlers_edgeReconnect_test_tsx_e8a9f95a: {
  label: "useCanvasGraphHandlers.edgeReconnect.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_useCanvasGraphHandlers_layout_test_tsx_f5a0bd29: {
  label: "useCanvasGraphHandlers.layout.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvasGraphHandlers_nodeAuthoring_test_support_ts_9246ae3b: {
  label: "useCanvasGraphHandlers.nodeAuthoring.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_useCanvasGraphHandlers_nodeDrop_test_tsx_adad0b58: {
  label: "useCanvasGraphHandlers.nodeDrop.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_useCanvasGraphHandlers_nodeDuplicate_test_tsx_f71188cb: {
  label: "useCanvasGraphHandlers.nodeDuplicate.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_useCanvasGraphHandlers_nodeRemoval_test_tsx_313b4f02: {
  label: "useCanvasGraphHandlers.nodeRemoval.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_useCanvasGraphHandlers_schemaAttach_test_tsx_a4849156: {
  label: "useCanvasGraphHandlers.schemaAttach.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_canvas_useCanvasGraphHandlers_selection_test_tsx_91959795: {
  label: "useCanvasGraphHandlers.selection.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_useCanvasGraphHandlers_test_support_tsx_bed6319d: {
  label: "useCanvasGraphHandlers.test.support.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasGraphHandlers_ts_0666e1f5: {
  label: "useCanvasGraphHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_useCanvasGraphHandlers_types_ts_e281ddda: {
  label: "useCanvasGraphHandlers.types.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_useCanvasGraphSearchActivation_test_tsx_b4d6cf79: {
  label: "useCanvasGraphSearchActivation.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasGraphSearchActivation_ts_75a81b42: {
  label: "useCanvasGraphSearchActivation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_useCanvasGraphSearchController_test_tsx_d9605590: {
  label: "useCanvasGraphSearchController.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasGraphSearchController_ts_4763c740: {
  label: "useCanvasGraphSearchController.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useCanvasInspectorCommands_ts_a2a283ce: {
  label: "useCanvasInspectorCommands.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_vas_useCanvasLayoutHandlers_architecture_test_ts_91a0ddf9: {
  label: "useCanvasLayoutHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasLayoutHandlers_ts_c58e1829: {
  label: "useCanvasLayoutHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useCanvasLayoutPersistence_ts_a0e7ae01: {
  label: "useCanvasLayoutPersistence.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_useCanvasMutationHandlers_architecture_test_ts_e1e90be0: {
  label: "useCanvasMutationHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_useCanvasMutationHandlers_ts_d43ad59e: {
  label: "useCanvasMutationHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_useCanvasNavigationActions_test_tsx_7f71c794: {
  label: "useCanvasNavigationActions.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useCanvasNavigationActions_ts_03ab022a: {
  label: "useCanvasNavigationActions.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_useCanvasNodeAdmissionCommandRunner_ts_acc28341: {
  label: "useCanvasNodeAdmissionCommandRunner.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_CanvasNodeAuthoringHandlers_architecture_test_ts_82db4016: {
  label: "useCanvasNodeAuthoringHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasNodeAuthoringHandlers_ts_bf1ff752: {
  label: "useCanvasNodeAuthoringHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_useCanvasNodeChangeHandlers_architecture_test_ts_783da590: {
  label: "useCanvasNodeChangeHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_useCanvasNodeChangeHandlers_test_tsx_aae728e5: {
  label: "useCanvasNodeChangeHandlers.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_useCanvasNodeChangeHandlers_ts_14f9089b: {
  label: "useCanvasNodeChangeHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_rc_app_views_canvas_useCanvasNodeDropHandlers_ts_8c13d2a5: {
  label: "useCanvasNodeDropHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasNodeDuplicateHandlers_ts_a7a89f26: {
  label: "useCanvasNodeDuplicateHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_app_views_canvas_useCanvasNodeRemovalHandlers_ts_8b91de62: {
  label: "useCanvasNodeRemovalHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_useCanvasNodeWorkbenchDraftController_test_tsx_574ee33e: {
  label: "useCanvasNodeWorkbenchDraftController.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__canvas_useCanvasNodeWorkbenchDraftController_ts_4d9de144: {
  label: "useCanvasNodeWorkbenchDraftController.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasNodeWorkbenchPosition_ts_389ba6a9: {
  label: "useCanvasNodeWorkbenchPosition.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasOverlayModel_ts_1576448f: {
  label: "useCanvasOverlayModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useCanvasPlanActionHandler_ts_50655491: {
  label: "useCanvasPlanActionHandler.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasRoutePresentationSync_ts_169f2ce0: {
  label: "useCanvasRoutePresentationSync.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_useCanvasRunControlSurface_test_tsx_40f2ec08: {
  label: "useCanvasRunControlSurface.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useCanvasRunControlSurface_ts_7d1b8af0: {
  label: "useCanvasRunControlSurface.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasRunStartHandler_ts_1255a220: {
  label: "useCanvasRunStartHandler.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__useCanvasSelectionHandlers_architecture_test_ts_3bc43296: {
  label: "useCanvasSelectionHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useCanvasSelectionHandlers_ts_f97ec29b: {
  label: "useCanvasSelectionHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasSelectionSync_ts_b18a5a50: {
  label: "useCanvasSelectionSync.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_views_canvas_useCanvasSourceImportDialogState_ts_7c942710: {
  label: "useCanvasSourceImportDialogState.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_eCanvasSourceImportHandlers_architecture_test_ts_852af50f: {
  label: "useCanvasSourceImportHandlers.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ws_canvas_useCanvasSourceImportHandlers_test_tsx_c0790ffe: {
  label: "useCanvasSourceImportHandlers.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_pp_views_canvas_useCanvasSourceImportHandlers_ts_5aecf9a1: {
  label: "useCanvasSourceImportHandlers.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_src_app_views_canvas_useCanvasStoreFacade_ts_6a38edff: {
  label: "useCanvasStoreFacade.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_useCanvasViewportGraphModel_architecture_test_ts_34be2ffa: {
  label: "useCanvasViewportGraphModel.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_anvas_useCanvasViewportGraphModel_edges_test_tsx_a61957bf: {
  label: "useCanvasViewportGraphModel.edges.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_useCanvasViewportGraphModel_layout_test_tsx_3bcde653: {
  label: "useCanvasViewportGraphModel.layout.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_as_useCanvasViewportGraphModel_nodeData_test_tsx_4070884c: {
  label: "useCanvasViewportGraphModel.nodeData.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_nvas_useCanvasViewportGraphModel_test_support_ts_52490dd8: {
  label: "useCanvasViewportGraphModel.test.support.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile__app_views_canvas_useCanvasViewportGraphModel_ts_5641bc0f: {
  label: "useCanvasViewportGraphModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useCanvasViewportLifecycle_ts_56d96585: {
  label: "useCanvasViewportLifecycle.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_s_canvas_useCanvasWorkspaceDraftSession_test_tsx_e934867c: {
  label: "useCanvasWorkspaceDraftSession.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_p_views_canvas_useCanvasWorkspaceDraftSession_ts_744a702b: {
  label: "useCanvasWorkspaceDraftSession.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_ProjectFileCanvasController_sourceImport_test_ts_59b76e8e: {
  label: "useDbtProjectFileCanvasController.sourceImport.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_iews_canvas_useDbtProjectFileCanvasController_ts_3120993a: {
  label: "useDbtProjectFileCanvasController.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779ddFile_c_app_views_canvas_useDbtProjectFileExecution_ts_98dfad06: {
  label: "useDbtProjectFileExecution.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeFileHistoryModel_ts_e3f3353a: {
  label: "codeFileHistoryModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_CodeFileHistoryPanel_tsx_f2e5a86c: {
  label: "CodeFileHistoryPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_de_codeMonacoEditableAccess_architecture_test_ts_229fe9e2: {
  label: "codeMonacoEditableAccess.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeRouteBootstrap_test_ts_7b5b0ef9: {
  label: "codeRouteBootstrap.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeRouteBootstrap_ts_fefc6a64: {
  label: "codeRouteBootstrap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_CodeStateViews_tsx_1c2e2bfb: {
  label: "CodeStateViews.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeViewCopy_test_ts_6ff271bd: {
  label: "codeViewCopy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeViewCopy_ts_bcf8e776: {
  label: "codeViewCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeViewFileSelection_test_ts_6af6d307: {
  label: "codeViewFileSelection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeViewFileSelection_ts_76baf813: {
  label: "codeViewFileSelection.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_c_app_views_code_codeWorkbenchErrorModel_test_ts_83316376: {
  label: "codeWorkbenchErrorModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeWorkbenchErrorModel_ts_f981f1d6: {
  label: "codeWorkbenchErrorModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_ews_code_CodeWorkingTreeNavigationGuard_test_tsx_58a06fcf: {
  label: "CodeWorkingTreeNavigationGuard.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_pp_views_code_CodeWorkingTreeNavigationGuard_tsx_6bc0bb78: {
  label: "CodeWorkingTreeNavigationGuard.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_rc_app_views_code_CodeWorkingTreeStatus_test_tsx_c66144a5: {
  label: "CodeWorkingTreeStatus.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_CodeWorkingTreeStatus_tsx_5992dd39: {
  label: "CodeWorkingTreeStatus.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile__app_views_code_codeWorkingTreeSyncModel_test_ts_d807ea08: {
  label: "codeWorkingTreeSyncModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_codeWorkingTreeSyncModel_ts_78057709: {
  label: "codeWorkingTreeSyncModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile__views_code_codeWorkspaceFileEditPosture_test_ts_1837bc5e: {
  label: "codeWorkspaceFileEditPosture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_c_app_views_code_codeWorkspaceFileEditPosture_ts_baf4562f: {
  label: "codeWorkspaceFileEditPosture.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_app_views_code_CodeWorkspaceFileSurface_test_tsx_5bc8ad9e: {
  label: "CodeWorkspaceFileSurface.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_CodeWorkspaceFileSurface_tsx_df474ff3: {
  label: "CodeWorkspaceFileSurface.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_FileTreePanel_tsx_43166a19: {
  label: "FileTreePanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_c_app_views_code_useCodeWorkingTreeSync_test_tsx_f4642830: {
  label: "useCodeWorkingTreeSync.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_useCodeWorkingTreeSync_ts_2dd0815d: {
  label: "useCodeWorkingTreeSync.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile__app_views_code_WorkspaceFileCodeEditor_test_tsx_a85607a0: {
  label: "WorkspaceFileCodeEditor.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_src_app_views_code_WorkspaceFileCodeEditor_tsx_0db0639b: {
  label: "WorkspaceFileCodeEditor.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_ode_workspaceFileReconciliationAuthority_test_ts_29ac9b57: {
  label: "workspaceFileReconciliationAuthority.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1dFile_ews_code_workspaceFileReconciliationAuthority_ts_dc3b4855: {
  label: "workspaceFileReconciliationAuthority.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_CodeView_test_tsx_092def27: {
  label: "CodeView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_CodeView_tsx_1e9e1e46: {
  label: "CodeView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_copy_test_ts_da199be5: {
  label: "copy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_copy_ts_3656d5cc: {
  label: "copy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_CostAlertsList_tsx_0b449622: {
  label: "CostAlertsList.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_iews_cost_costAttributionUi_architecture_test_ts_3678fde8: {
  label: "costAttributionUi.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_CostCharts_tsx_3d47eeb5: {
  label: "CostCharts.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_CostCoverageCard_tsx_4800b880: {
  label: "CostCoverageCard.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_CostDriverList_tsx_02c1d64b: {
  label: "CostDriverList.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_costRouteBootstrap_test_ts_b1331a87: {
  label: "costRouteBootstrap.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_costRouteBootstrap_ts_02a95386: {
  label: "costRouteBootstrap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_CostStatGrid_tsx_25e0aa35: {
  label: "CostStatGrid.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_costViewModel_test_ts_42fae732: {
  label: "costViewModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_costViewModel_ts_67feb715: {
  label: "costViewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207File_src_app_views_cost_useCostData_ts_79214977: {
  label: "useCostData.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_CostView_test_tsx_863a9967: {
  label: "CostView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_CostView_tsx_822f85f9: {
  label: "CostView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_CatalogDiffPanel_tsx_230a0f5e: {
  label: "CatalogDiffPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_copy_ts_6cf2e5e6: {
  label: "copy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_DiffHeader_tsx_cf47aa03: {
  label: "DiffHeader.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_iff_diffMonacoReviewSurface_architecture_test_ts_4d783e12: {
  label: "diffMonacoReviewSurface.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_diffReviewModel_ts_658686f3: {
  label: "diffReviewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_diffRouteBootstrap_test_ts_4132f31e: {
  label: "diffRouteBootstrap.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_diffRouteBootstrap_ts_5c2dc4d1: {
  label: "diffRouteBootstrap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_DiffStateViews_tsx_9345f640: {
  label: "DiffStateViews.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_DiffSummaryCards_tsx_68233568: {
  label: "DiffSummaryCards.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_DiffTabs_tsx_76aec02d: {
  label: "DiffTabs.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_diffViewModel_test_ts_8af74bfd: {
  label: "diffViewModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_diffViewModel_ts_257bd64d: {
  label: "diffViewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_c_app_views_diff_diffWorkbenchStateModel_test_ts_10f12255: {
  label: "diffWorkbenchStateModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_diffWorkbenchStateModel_ts_a9207c85: {
  label: "diffWorkbenchStateModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_GraphDiffPanel_tsx_9e0e6556: {
  label: "GraphDiffPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_SqlDiffPanel_tsx_85df41d5: {
  label: "SqlDiffPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ecFile_src_app_views_diff_useDiffData_ts_0b053705: {
  label: "useDiffData.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_DiffView_catalogFiltering_test_tsx_2569eb41: {
  label: "DiffView.catalogFiltering.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_DiffView_sqlPreview_test_tsx_c1cfc6fd: {
  label: "DiffView.sqlPreview.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_DiffView_states_test_tsx_bea8cb94: {
  label: "DiffView.states.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_DiffView_tsx_9491271b: {
  label: "DiffView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_copy_ts_b7fabb08: {
  label: "copy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_LineageBreadcrumb_tsx_bd563fe4: {
  label: "LineageBreadcrumb.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_lineageChromeTokens_ts_dc7810f0: {
  label: "lineageChromeTokens.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_LineageColumnPanel_tsx_52f3390d: {
  label: "LineageColumnPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_LineageGraphPanel_tsx_b9971729: {
  label: "LineageGraphPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_ineageGraphStrategyBoundary_architecture_test_ts_7accc4ed: {
  label: "lineageGraphStrategyBoundary.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_LineageHeader_tsx_6c06115c: {
  label: "LineageHeader.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_LineageImpactSummary_tsx_620e3884: {
  label: "LineageImpactSummary.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_lineageModel_test_ts_ffe554b7: {
  label: "lineageModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_lineageModel_ts_7f1d1dcf: {
  label: "lineageModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_ineagePanelTokenConvergence_architecture_test_ts_16d90c29: {
  label: "lineagePanelTokenConvergence.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile__app_views_lineage_lineageRouteBootstrap_test_ts_a0c23f24: {
  label: "lineageRouteBootstrap.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_lineageRouteBootstrap_ts_ece36aee: {
  label: "lineageRouteBootstrap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_LineageStateViews_tsx_52ee3c2b: {
  label: "LineageStateViews.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_views_lineage_lineageWorkbenchStateModel_test_ts_d3714a38: {
  label: "lineageWorkbenchStateModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile__app_views_lineage_lineageWorkbenchStateModel_ts_bec5c868: {
  label: "lineageWorkbenchStateModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_ws_lineage_useLineageViewData_projection_test_ts_eec45718: {
  label: "useLineageViewData.projection.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ffFile_src_app_views_lineage_useLineageViewData_ts_232d54d0: {
  label: "useLineageViewData.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_LineageView_test_tsx_8e3d36d3: {
  label: "LineageView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_LineageView_tsx_bf8febf2: {
  label: "LineageView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_LoginView_tsx_c7ce1bf2: {
  label: "LoginView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_src_app_views_plugins_PluginCapabilityTable_tsx_32642a49: {
  label: "PluginCapabilityTable.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_iews_plugins_pluginCatalogReconciliation_test_ts_d0f965f7: {
  label: "pluginCatalogReconciliation.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_app_views_plugins_pluginCatalogReconciliation_ts_522cf678: {
  label: "pluginCatalogReconciliation.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_gins_pluginsCapabilityTable_architecture_test_ts_07e89b2b: {
  label: "pluginsCapabilityTable.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_src_app_views_plugins_PluginsRouteWorkbench_tsx_5296c783: {
  label: "PluginsRouteWorkbench.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_src_app_views_plugins_pluginsViewCopy_test_ts_81101d30: {
  label: "pluginsViewCopy.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_src_app_views_plugins_pluginsViewCopy_ts_e425d518: {
  label: "pluginsViewCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_src_app_views_plugins_pluginsViewModel_test_ts_18459804: {
  label: "pluginsViewModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8File_src_app_views_plugins_pluginsViewModel_ts_8ab0c2c4: {
  label: "pluginsViewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_rc_app_views_PluginsView_reconciliation_test_tsx_2c19613f: {
  label: "PluginsView.reconciliation.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_PluginsView_test_tsx_c2111c37: {
  label: "PluginsView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_PluginsView_tsx_f2573712: {
  label: "PluginsView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_projectAdmission_0003f629File__projectAdmission_ProjectCreationDialog_test_tsx_74184d67: {
  label: "ProjectCreationDialog.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_projectAdmission_0003f629File_views_projectAdmission_ProjectCreationDialog_tsx_0c79cec9: {
  label: "ProjectCreationDialog.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_projectAdmission_0003f629File_p_views_projectAdmission_ProjectCreationForm_tsx_6682e3eb: {
  label: "ProjectCreationForm.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_projectOnboardingCopy_ts_09e257a7: {
  label: "projectOnboardingCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_ProjectOnboardingView_test_tsx_84774017: {
  label: "ProjectOnboardingView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_ProjectOnboardingView_tsx_814025dd: {
  label: "ProjectOnboardingView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_iews_publicDataVisualSystem_architecture_test_ts_efea981e: {
  label: "publicDataVisualSystem.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_CanvasRunsTabView_tsx_c4a0520a: {
  label: "CanvasRunsTabView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunDetailStateViews_tsx_c4a4a033: {
  label: "RunDetailStateViews.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunEventFeedHealthView_tsx_b53684d9: {
  label: "RunEventFeedHealthView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runEventTableModel_test_ts_d42a381d: {
  label: "runEventTableModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runEventTableModel_ts_f92d1315: {
  label: "runEventTableModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunEventTimelineTable_tsx_b7baac4d: {
  label: "RunEventTimelineTable.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunListStateView_test_tsx_88258fb5: {
  label: "RunListStateView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunListStateView_tsx_172207ee: {
  label: "RunListStateView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunOperationalTable_tsx_fb31bd72: {
  label: "RunOperationalTable.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File__app_views_runs_runOperationalTableModel_test_ts_8263677d: {
  label: "runOperationalTableModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runOperationalTableModel_ts_bdc0cb93: {
  label: "runOperationalTableModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_ews_runs_runsDomainBoundary_architecture_test_ts_b326d2fa: {
  label: "runsDomainBoundary.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runsRouteBootstrap_test_ts_2ea856a7: {
  label: "runsRouteBootstrap.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runsRouteBootstrap_ts_aea666bb: {
  label: "runsRouteBootstrap.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_rc_app_views_runs_RunStates_errorStates_test_tsx_8466568a: {
  label: "RunStates.errorStates.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunStates_list_test_tsx_2fc3a895: {
  label: "RunStates.list.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_p_views_runs_RunStates_snapshotEvidence_test_tsx_a31658e1: {
  label: "RunStates.snapshotEvidence.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File__app_views_runs_RunStates_timelineTrust_test_tsx_5b9e5e66: {
  label: "RunStates.timelineTrust.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunStates_tsx_b747cdf3: {
  label: "RunStates.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_pp_views_runs_RunStates_workspaceBasics_test_tsx_93a7ffc8: {
  label: "RunStates.workspaceBasics.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runStatesCopy_ts_41a5a355: {
  label: "runStatesCopy.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runStatesModel_test_ts_73e55a7c: {
  label: "runStatesModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runStatesModel_ts_c62e30b3: {
  label: "runStatesModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_rc_app_views_runs_runWorkbenchStateModel_test_ts_fda7e968: {
  label: "runWorkbenchStateModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_runWorkbenchStateModel_ts_e2f528a7: {
  label: "runWorkbenchStateModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_RunWorkspaceStateView_tsx_d8a1b656: {
  label: "RunWorkspaceStateView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8Dir_src_app_views_runs_test_75ebab04File_src_app_views_runs_test_RunStatesHarness_tsx_3aeaba5e: {
  label: "RunStatesHarness.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_rc_app_views_runs_useRunControlCommands_test_tsx_e815c0bd: {
  label: "useRunControlCommands.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_useRunControlCommands_ts_27bcd889: {
  label: "useRunControlCommands.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_useRunWorkspace_test_tsx_eecb0563: {
  label: "useRunWorkspace.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8File_src_app_views_runs_useRunWorkspace_ts_f247cd39: {
  label: "useRunWorkspace.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_RunsView_test_tsx_b948e20a: {
  label: "RunsView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_RunsView_tsx_ca221122: {
  label: "RunsView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_templates_c5ce249fFile_ws_templates_TemplateMonacoPreviewPanel_test_tsx_8382abd6: {
  label: "TemplateMonacoPreviewPanel.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_templates_c5ce249fFile_p_views_templates_TemplateMonacoPreviewPanel_tsx_5d9955af: {
  label: "TemplateMonacoPreviewPanel.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_templates_c5ce249fFile_ates_templatesMonacoPreview_architecture_test_ts_e8f2c814: {
  label: "templatesMonacoPreview.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_templates_c5ce249fFile__app_views_templates_TemplatesRouteWorkbench_tsx_d0606c24: {
  label: "TemplatesRouteWorkbench.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_templates_c5ce249fFile_c_app_views_templates_templatesViewModel_test_ts_08b6b701: {
  label: "templatesViewModel.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_templates_c5ce249fFile_src_app_views_templates_templatesViewModel_ts_2be44123: {
  label: "templatesViewModel.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_templates_c5ce249fFile_emplates_templatesWorkbench_architecture_test_ts_cbad4b56: {
  label: "templatesWorkbench.architecture.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_TemplatesView_test_tsx_18cdeae7: {
  label: "TemplatesView.test.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4File_src_app_views_TemplatesView_tsx_da89cf96: {
  label: "TemplatesView.tsx"
}
WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_test_481b0fbcFile_src_app_views_test_DiffViewHarness_tsx_9bb39d6d: {
  label: "DiffViewHarness.tsx"
}
`;case`webFiles_platformHealth`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_application_fdc5ba1fFile_lth_application_platformHealthCapability_test_ts_1c2e2996: {
  label: "platformHealthCapability.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_application_fdc5ba1fFile_m-health_application_platformHealthCapability_ts_86a4d179: {
  label: "platformHealthCapability.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_contracts_bd19ad60File__platform-health_contracts_platformHealthDtos_ts_0731b282: {
  label: "platformHealthDtos.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_domain_daf95aa2File_rm-health_domain_platformHealthSelectors_test_ts_8a2a18c3: {
  label: "platformHealthSelectors.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_domain_daf95aa2File_latform-health_domain_platformHealthSelectors_ts_55ba9b4b: {
  label: "platformHealthSelectors.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_domain_daf95aa2File_es_platform-health_domain_platformHealthTypes_ts_113d31e4: {
  label: "platformHealthTypes.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4File_src_capabilities_platform-health_index_ts_602145f7: {
  label: "index.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_infrastructure_bb4c69d0File__infrastructure_httpPlatformHealthClient_test_ts_1e8211dc: {
  label: "httpPlatformHealthClient.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_infrastructure_bb4c69d0File_ealth_infrastructure_httpPlatformHealthClient_ts_97ede301: {
  label: "httpPlatformHealthClient.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_presentation_57c6f9e4File_health_presentation_platformHealthStatus_test_ts_668b147e: {
  label: "platformHealthStatus.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_presentation_57c6f9e4File_form-health_presentation_platformHealthStatus_ts_6bb43a7c: {
  label: "platformHealthStatus.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_presentation_57c6f9e4File_sentation_usePlatformHealthSnapshotQuery_test_ts_e850d877: {
  label: "usePlatformHealthSnapshotQuery.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_presentation_57c6f9e4File_h_presentation_usePlatformHealthSnapshotQuery_ts_34f9d350: {
  label: "usePlatformHealthSnapshotQuery.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_testing_90f550a0File_latform-health_testing_platformHealthFixtures_ts_9250f494: {
  label: "platformHealthFixtures.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_testing_90f550a0File_form-health_testing_platformHealthHttpHarness_ts_b43c78a8: {
  label: "platformHealthHttpHarness.ts"
}
`;case`webFiles_runtimeCapabilities`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aDir_rc_capabilities_runtime-capabilities_application_02bb9f49File_pplication_runtimeCapabilitiesCapability_test_ts_4ef7ca59: {
  label: "runtimeCapabilitiesCapability.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aDir_rc_capabilities_runtime-capabilities_application_02bb9f49File_ies_application_runtimeCapabilitiesCapability_ts_437af2b6: {
  label: "runtimeCapabilitiesCapability.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aDir_src_capabilities_runtime-capabilities_contracts_d38baed5File_apabilities_contracts_runtimeCapabilitiesDtos_ts_4f622772: {
  label: "runtimeCapabilitiesDtos.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aFile_src_capabilities_runtime-capabilities_index_ts_a68f1015: {
  label: "index.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aDir_capabilities_runtime-capabilities_infrastructure_d623396eFile_astructure_httpRuntimeCapabilitiesClient_test_ts_4bc5f080: {
  label: "httpRuntimeCapabilitiesClient.test.ts"
}
WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aDir_capabilities_runtime-capabilities_infrastructure_d623396eFile__infrastructure_httpRuntimeCapabilitiesClient_ts_a7358791: {
  label: "httpRuntimeCapabilitiesClient.ts"
}
`;case`artifactsSourceInventory`:return`direction: down

ArtifactsSource: {
  label: "@dvt/artifacts source inventory — generated from Git"

  Dir_src_f27fede2: {
    label: "src/ — 25 files"
  }
  Dir_test_a94a8fe5: {
    label: "test/ — 5 files"
  }
  File_package_json_7030d0b2: {
    label: "package.json"
  }
  File_tsconfig_json_61ebb9fd: {
    label: "tsconfig.json"
  }
  File_vitest_config_ts_e7b129ed: {
    label: "vitest.config.ts"
  }
}
`;case`contractsSource_dir_compat_d3c71389`:return`direction: down

ContractsSourceDir_compat_d3c71389: {
  label: "compat/ — 1 files"

  File_compat_plan-compat_schema_json_b85156e0: {
    label: "plan-compat.schema.json"
  }
}
`;case`webSource_dir_cypress_b5e13a91`:return`direction: down

WebSourceDir_cypress_b5e13a91: {
  label: "cypress/ — 60 files"

  Dir_cypress_e2e_fc03d145: {
    label: "e2e/ — 39 files"
  }
  Dir_cypress_fixtures_69e97bfc: {
    label: "fixtures/ — 6 files"
  }
  Dir_cypress_support_c65ee77f: {
    label: "support/ — 15 files"
  }
}
`;case`webSource_dir_cypress_e2e_fc03d145`:return`direction: down

WebSourceDir_cypress_b5e13a91Dir_cypress_e2e_fc03d145: {
  label: "e2e/ — 39 files"

  Dir_cypress_e2e_canvas_01b3b772: {
    label: "canvas/ — 26 files"
  }
  Dir_cypress_e2e_dbt_be6e1218: {
    label: "dbt/ — 4 files"
  }
  Dir_cypress_e2e_runs_3a78729f: {
    label: "runs/ — 2 files"
  }
  Dir_cypress_e2e_shell_2feea825: {
    label: "shell/ — 6 files"
  }
  Dir_cypress_e2e_templates_d7b39c46: {
    label: "templates/ — 1 files"
  }
}
`;case`webSource_dir_cypress_e2e_canvas_01b3b772`:return`direction: down

WebSourceDir_cypress_b5e13a91Dir_cypress_e2e_fc03d145Dir_cypress_e2e_canvas_01b3b772: {
  label: "canvas/ — 26 files"

  File_e_canvas_artifacts-workspace-project-files_cy_ts_35554d07: {
    label: "artifacts-workspace-project-files.cy.ts"
  }
  File__canvas_canvas-calculated-column-authoring_cy_ts_92a9dbdb: {
    label: "canvas-calculated-column-authoring.cy.ts"
  }
  File_s_e2e_canvas_canvas-column-lineage-mapping_cy_ts_7e951e15: {
    label: "canvas-column-lineage-mapping.cy.ts"
  }
  File_cypress_e2e_canvas_canvas-connection-valve_cy_ts_a442e2b9: {
    label: "canvas-connection-valve.cy.ts"
  }
  File_e2e_canvas_canvas-dbt-author-code-run-live_cy_ts_97474d6c: {
    label: "canvas-dbt-author-code-run-live.cy.ts"
  }
  File__canvas_canvas-dbt-selection-recovery-live_cy_ts_89cac46b: {
    label: "canvas-dbt-selection-recovery-live.cy.ts"
  }
  File_anvas_canvas-dbt-source-connection-binding_cy_ts_16293173: {
    label: "canvas-dbt-source-connection-binding.cy.ts"
  }
  File_ess_e2e_canvas_canvas-draft-access-posture_cy_ts_128bb426: {
    label: "canvas-draft-access-posture.cy.ts"
  }
  File_vas_canvas-dvt-postgres-connection-binding_cy_ts_1770e542: {
    label: "canvas-dvt-postgres-connection-binding.cy.ts"
  }
  File_ess_e2e_canvas_canvas-first-authoring-live_cy_ts_2dd45da1: {
    label: "canvas-first-authoring-live.cy.ts"
  }
  File_e2e_canvas_canvas-graph-search-filter-live_cy_ts_7d12301b: {
    label: "canvas-graph-search-filter-live.cy.ts"
  }
  File_ess_e2e_canvas_canvas-happy-path-draggable_cy_ts_fb46c59f: {
    label: "canvas-happy-path-draggable.cy.ts"
  }
  File_2e_canvas_canvas-het1-object-file-dbt-live_cy_ts_dd91cf24: {
    label: "canvas-het1-object-file-dbt-live.cy.ts"
  }
  File__canvas_canvas-het2-rest-artifact-dbt-live_cy_ts_0cc3e74e: {
    label: "canvas-het2-rest-artifact-dbt-live.cy.ts"
  }
  File_cypress_e2e_canvas_canvas-preview-run-live_cy_ts_39adc53b: {
    label: "canvas-preview-run-live.cy.ts"
  }
  File_e_canvas_canvas-project-snapshot-roundtrip_cy_ts_c2d673bd: {
    label: "canvas-project-snapshot-roundtrip.cy.ts"
  }
  File_ess_e2e_canvas_canvas-ready-node-authoring_cy_ts_09e589fb: {
    label: "canvas-ready-node-authoring.cy.ts"
  }
  File__e2e_canvas_canvas-source-filter-authoring_cy_ts_d2743db6: {
    label: "canvas-source-filter-authoring.cy.ts"
  }
  File_e2e_canvas_canvas-source-import-live-clean_cy_ts_73d68e9f: {
    label: "canvas-source-import-live-clean.cy.ts"
  }
  File__canvas_canvas-structured-transform-fields_cy_ts_43ca247a: {
    label: "canvas-structured-transform-fields.cy.ts"
  }
  File_e_canvas_canvas-substrait-aggregate-window_cy_ts_daf00fde: {
    label: "canvas-substrait-aggregate-window.cy.ts"
  }
  File_press_e2e_canvas_canvas-substrait-grouping_cy_ts_795277c2: {
    label: "canvas-substrait-grouping.cy.ts"
  }
  File_anvas-substrait-inner-join-field-selection_cy_ts_0b72d978: {
    label: "canvas-substrait-inner-join-field-selection.cy.ts"
  }
  File_ress_e2e_canvas_canvas-substrait-union-all_cy_ts_ae1548fc: {
    label: "canvas-substrait-union-all.cy.ts"
  }
  File_cypress_e2e_canvas_canvas-substrait-window_cy_ts_49081f1c: {
    label: "canvas-substrait-window.cy.ts"
  }
  File__e2e_canvas_code-workbench-workspace-files_cy_ts_97718aa4: {
    label: "code-workbench-workspace-files.cy.ts"
  }
}
`;case`webSource_dir_cypress_e2e_dbt_be6e1218`:return`direction: down

WebSourceDir_cypress_b5e13a91Dir_cypress_e2e_fc03d145Dir_cypress_e2e_dbt_be6e1218: {
  label: "dbt/ — 4 files"

  File_s_e2e_dbt_dbt-project-file-projection-live_cy_ts_2e919eb7: {
    label: "dbt-project-file-projection-live.cy.ts"
  }
  File_ess_e2e_dbt_dbt-project-import-source-live_cy_ts_cc8d8152: {
    label: "dbt-project-import-source-live.cy.ts"
  }
  File_press_e2e_dbt_dbt-project-preview-run-live_cy_ts_c815ce1a: {
    label: "dbt-project-preview-run-live.cy.ts"
  }
  File_dbt_dbt-project-yaml-description-edit-live_cy_ts_80937b7a: {
    label: "dbt-project-yaml-description-edit-live.cy.ts"
  }
}
`;case`webSource_dir_cypress_e2e_runs_3a78729f`:return`direction: down

WebSourceDir_cypress_b5e13a91Dir_cypress_e2e_fc03d145Dir_cypress_e2e_runs_3a78729f: {
  label: "runs/ — 2 files"

  File_cypress_e2e_runs_run-controls-live_cy_ts_71c3bd72: {
    label: "run-controls-live.cy.ts"
  }
  File_cypress_e2e_runs_runs-runtime-contract_cy_ts_ff288992: {
    label: "runs-runtime-contract.cy.ts"
  }
}
`;case`webSource_dir_cypress_e2e_shell_2feea825`:return`direction: down

WebSourceDir_cypress_b5e13a91Dir_cypress_e2e_fc03d145Dir_cypress_e2e_shell_2feea825: {
  label: "shell/ — 6 files"

  File_ess_e2e_shell_active-project-creation-live_cy_ts_2df80ff7: {
    label: "active-project-creation-live.cy.ts"
  }
  File__shell_canvas-workbench-screen-composition_cy_ts_f52f70ec: {
    label: "canvas-workbench-screen-composition.cy.ts"
  }
  File_cypress_e2e_shell_project-onboarding_cy_ts_318b3934: {
    label: "project-onboarding.cy.ts"
  }
  File_cypress_e2e_shell_route-workbench-slots_cy_ts_6d48fa60: {
    label: "route-workbench-slots.cy.ts"
  }
  File_cypress_e2e_shell_shell-layout-contract_cy_ts_b52e8674: {
    label: "shell-layout-contract.cy.ts"
  }
  File_cypress_e2e_shell_startup-route-readiness_cy_ts_7637a254: {
    label: "startup-route-readiness.cy.ts"
  }
}
`;case`webSource_dir_cypress_e2e_templates_d7b39c46`:return`direction: down

WebSourceDir_cypress_b5e13a91Dir_cypress_e2e_fc03d145Dir_cypress_e2e_templates_d7b39c46: {
  label: "templates/ — 1 files"

  File_cypress_e2e_templates_templates-workbench_cy_ts_51c31c2f: {
    label: "templates-workbench.cy.ts"
  }
}
`;case`webSource_dir_cypress_fixtures_69e97bfc`:return`direction: down

WebSourceDir_cypress_b5e13a91Dir_cypress_fixtures_69e97bfc: {
  label: "fixtures/ — 6 files"

  File_cypress_fixtures_het1-object-file-orders_csv_fa2aeb7b: {
    label: "het1-object-file-orders.csv"
  }
  File_s_fixtures_het1-object-file-orders_manifest_json_45e65a5c: {
    label: "het1-object-file-orders.manifest.json"
  }
  File_cypress_fixtures_het2-fixture-cert_pem_8f57c8b8: {
    label: "het2-fixture-cert.pem"
  }
  File_cypress_fixtures_het2-fixture-key_pem_d8b5c788: {
    label: "het2-fixture-key.pem"
  }
  File_cypress_fixtures_het2-http-json-orders_jsonl_62f84f91: {
    label: "het2-http-json-orders.jsonl"
  }
  File_ess_fixtures_het2-http-json-orders_manifest_json_c5717e11: {
    label: "het2-http-json-orders.manifest.json"
  }
}
`;case`webSource_dir_cypress_support_c65ee77f`:return`direction: down

WebSourceDir_cypress_b5e13a91Dir_cypress_support_c65ee77f: {
  label: "support/ — 15 files"

  File_cypress_support_canvasDraftAuthoring_ts_de1850dd: {
    label: "canvasDraftAuthoring.ts"
  }
  File_cypress_support_canvasExecutionSelection_ts_c6cf78da: {
    label: "canvasExecutionSelection.ts"
  }
  File_cypress_support_canvasFirstAuthoring_ts_3912b9f7: {
    label: "canvasFirstAuthoring.ts"
  }
  File_cypress_support_canvasGraphAuthoring_ts_a310e5bd: {
    label: "canvasGraphAuthoring.ts"
  }
  File_cypress_support_canvasPreviewArtifacts_ts_ab16b4bf: {
    label: "canvasPreviewArtifacts.ts"
  }
  File_cypress_support_dbtProjectLive_ts_5e062ee8: {
    label: "dbtProjectLive.ts"
  }
  File_cypress_support_e2e_ts_99747c79: {
    label: "e2e.ts"
  }
  File_cypress_support_e2eApiStub_ts_7c8e474d: {
    label: "e2eApiStub.ts"
  }
  File_ypress_support_het1PublicFailureRecoveryProof_ts_1222ac7b: {
    label: "het1PublicFailureRecoveryProof.ts"
  }
  File_cypress_support_het1PublicRunProof_ts_a158abe2: {
    label: "het1PublicRunProof.ts"
  }
  File_cypress_support_het1PublicVertical_ts_8c200438: {
    label: "het1PublicVertical.ts"
  }
  File_cypress_support_het2PublicVertical_ts_537e83d9: {
    label: "het2PublicVertical.ts"
  }
  File_cypress_support_liveProtectedRuntime_ts_8f514353: {
    label: "liveProtectedRuntime.ts"
  }
  File_cypress_support_liveWarehouseSourceImport_ts_355801d5: {
    label: "liveWarehouseSourceImport.ts"
  }
  File_cypress_support_workspaceSession_ts_76e1f84a: {
    label: "workspaceSession.ts"
  }
}
`;case`plannerSource_dir_docs_71ab8b6a`:return`direction: down

PlannerSourceDir_docs_71ab8b6a: {
  label: "docs/ — 4 files"

  Dir_docs_audit_17d2e8ed: {
    label: "audit/ — 1 files"
  }
  Dir_docs_planning_8089dc66: {
    label: "planning/ — 1 files"
  }
  File_docs_grimorio_md_37254475: {
    label: "grimorio.md"
  }
  File_docs_README_md_9f7cbce1: {
    label: "README.md"
  }
}
`;case`traceabilitySource_dir_docs_71ab8b6a`:return`direction: down

TraceabilitySourceDir_docs_71ab8b6a: {
  label: "docs/ — 5 files"

  Dir_docs_adr_aa1f87c3: {
    label: "adr/ — 1 files"
  }
  Dir_docs_ci_536ccda5: {
    label: "ci/ — 1 files"
  }
  File_docs_Examples_md_4bce4c4c: {
    label: "Examples.md"
  }
  File_docs_README_md_9f7cbce1: {
    label: "README.md"
  }
  File_docs_Traceability-Service-Design_md_174d5b8e: {
    label: "Traceability-Service-Design.md"
  }
}
`;case`traceabilitySource_dir_docs_adr_aa1f87c3`:return`direction: down

TraceabilitySourceDir_docs_71ab8b6aDir_docs_adr_aa1f87c3: {
  label: "adr/ — 1 files"

  File_docs_adr_ADR-0000_md_2e8ae038: {
    label: "ADR-0000.md"
  }
}
`;case`plannerSource_dir_docs_audit_17d2e8ed`:return`direction: down

PlannerSourceDir_docs_71ab8b6aDir_docs_audit_17d2e8ed: {
  label: "audit/ — 1 files"

  File_docs_audit_planner_v2_3_2_audit_commented_ts_8a6e981b: {
    label: "planner_v2_3_2_audit.commented.ts"
  }
}
`;case`traceabilitySource_dir_docs_ci_536ccda5`:return`direction: down

TraceabilitySourceDir_docs_71ab8b6aDir_docs_ci_536ccda5: {
  label: "ci/ — 1 files"

  File_docs_ci_github-actions_yml_9a4648e2: {
    label: "github-actions.yml"
  }
}
`;case`plannerSource_dir_docs_planning_8089dc66`:return`direction: down

PlannerSourceDir_docs_71ab8b6aDir_docs_planning_8089dc66: {
  label: "planning/ — 1 files"

  File_s_planning_Stage-1_1-Planner-Canonicalization_md_9d789891: {
    label: "Stage-1.1-Planner-Canonicalization.md"
  }
}
`;case`plannerSource_dir_examples_99345ce6`:return`direction: down

PlannerSourceDir_examples_99345ce6: {
  label: "examples/ — 2 files"

  File_examples_dbt-workflow_ts_e71810d3: {
    label: "dbt-workflow.ts"
  }
  File_examples_generic-pipeline_ts_299037b9: {
    label: "generic-pipeline.ts"
  }
}
`;case`webSource_dir_guidelines_6df1ecfa`:return`direction: down

WebSourceDir_guidelines_6df1ecfa: {
  label: "guidelines/ — 1 files"

  File_guidelines_Guidelines_md_5b347f71: {
    label: "Guidelines.md"
  }
}
`;case`postgresAdapterSource_dir_migrations_56a9264f`:return`direction: down

PostgresAdapterSourceDir_migrations_56a9264f: {
  label: "migrations/ — 11 files"

  File_migrations_001_init_sql_f5a0537e: {
    label: "001_init.sql"
  }
  File_migrations_002_add_claimed_at_sql_60b5240d: {
    label: "002_add_claimed_at.sql"
  }
  File_grations_003_outbox_shard_retry_and_ordering_sql_15b85428: {
    label: "003_outbox_shard_retry_and_ordering.sql"
  }
  File_igrations_004_run_snapshots_and_status_index_sql_7f1d2814: {
    label: "004_run_snapshots_and_status_index.sql"
  }
  File_migrations_005_lineage_outbox_sql_df9d0bc9: {
    label: "005_lineage_outbox.sql"
  }
  File_migrations_006_run_event_archive_catalog_sql_a76ad12c: {
    label: "006_run_event_archive_catalog.sql"
  }
  File_migrations_007_run_snapshots_archive_pinning_sql_2675fe86: {
    label: "007_run_snapshots_archive_pinning.sql"
  }
  File_tions_008_run_event_archive_delete_lifecycle_sql_a7c9f806: {
    label: "008_run_event_archive_delete_lifecycle.sql"
  }
  File_migrations_009_delivery_buffer_purge_indexes_sql_55a0dda4: {
    label: "009_delivery_buffer_purge_indexes.sql"
  }
  File_ions_010_lineage_outbox_retry_claim_schedule_sql_b1845a7c: {
    label: "010_lineage_outbox_retry_claim_schedule.sql"
  }
  File_igrations_011_lineage_tenant_scope_hardening_sql_a6deea34: {
    label: "011_lineage_tenant_scope_hardening.sql"
  }
}
`;case`webSource_dir_public_61c9b2b1`:return`direction: down

WebSourceDir_public_61c9b2b1: {
  label: "public/ — 6 files"

  Dir_public_favicon_346b198f: {
    label: "favicon/ — 6 files"
  }
}
`;case`webSource_dir_public_favicon_346b198f`:return`direction: down

WebSourceDir_public_61c9b2b1Dir_public_favicon_346b198f: {
  label: "favicon/ — 6 files"

  File_public_favicon_favicon_ico_189be0e2: {
    label: "favicon.ico"
  }
  File_public_favicon_raven-icon_png_201a8733: {
    label: "raven-icon.png"
  }
  File_public_favicon_raven-icon_svg_e0508835: {
    label: "raven-icon.svg"
  }
  File_public_favicon_raven-maskable-192_png_2d6156c8: {
    label: "raven-maskable-192.png"
  }
  File_public_favicon_raven-maskable-512_png_9fe004f0: {
    label: "raven-maskable-512.png"
  }
  File_public_favicon_site_webmanifest_1f42ae75: {
    label: "site.webmanifest"
  }
}
`;case`webSource_dir_scripts_16728d18`:return`direction: down

WebSourceDir_scripts_16728d18: {
  label: "scripts/ — 2 files"

  File_scripts_run-cypress-docker_mjs_73285dc6: {
    label: "run-cypress-docker.mjs"
  }
  File_scripts_run-vitest-changed-suites_ts_4e6ada45: {
    label: "run-vitest-changed-suites.ts"
  }
}
`;case`postgresAdapterSource_dir_src_f27fede2`:return`direction: down

PostgresAdapterSourceDir_src_f27fede2: {
  label: "src/ — 60 files"

  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_lineageOutboxStorePolicy_ts_41c28a57: {
    label: "lineageOutboxStorePolicy.ts"
  }
  File_src_migratePostgresRuntimeStores_ts_291884fb: {
    label: "migratePostgresRuntimeStores.ts"
  }
  File_src_PostgresAdapterClientSession_ts_102fe4ea: {
    label: "PostgresAdapterClientSession.ts"
  }
  File_src_PostgresAdapterClientSessionConstants_ts_1ba3ea3e: {
    label: "PostgresAdapterClientSessionConstants.ts"
  }
  File_src_PostgresAdapterClientSessionSql_ts_27d40a34: {
    label: "PostgresAdapterClientSessionSql.ts"
  }
  File_src_PostgresAdapterConnectionString_ts_1aa936b5: {
    label: "PostgresAdapterConnectionString.ts"
  }
  File_src_PostgresAdapterConstants_ts_5838cc4d: {
    label: "PostgresAdapterConstants.ts"
  }
  File_src_PostgresArchiveLeaseStore_ts_84942c21: {
    label: "PostgresArchiveLeaseStore.ts"
  }
  File_src_PostgresBackpressureSnapshotReader_ts_3ed6f23d: {
    label: "PostgresBackpressureSnapshotReader.ts"
  }
  File_src_PostgresBackpressureSnapshotReaderSql_ts_cc41b881: {
    label: "PostgresBackpressureSnapshotReaderSql.ts"
  }
  File_src_PostgresCredentialBindingResolver_ts_05be0484: {
    label: "PostgresCredentialBindingResolver.ts"
  }
  File_src_PostgresDeliveryBufferPurgeStore_ts_9d3d6ade: {
    label: "PostgresDeliveryBufferPurgeStore.ts"
  }
  File_src_PostgresLineageOutboxStore_ts_26603fd9: {
    label: "PostgresLineageOutboxStore.ts"
  }
  File_src_PostgresLineageOutboxStoreSql_ts_7dd11ee9: {
    label: "PostgresLineageOutboxStoreSql.ts"
  }
  File_src_PostgresMaintenanceAccess_ts_7d2db232: {
    label: "PostgresMaintenanceAccess.ts"
  }
  File_src_PostgresObjectFileLoader_ts_4e439445: {
    label: "PostgresObjectFileLoader.ts"
  }
  File_src_PostgresObjectFileLoadingCapability_ts_2cb09f82: {
    label: "PostgresObjectFileLoadingCapability.ts"
  }
  File_src_PostgresOutboxStore_ts_586cff1c: {
    label: "PostgresOutboxStore.ts"
  }
  File_src_PostgresPlanStore_admission-repository_ts_8b1af55c: {
    label: "PostgresPlanStore.admission-repository.ts"
  }
  File_rc_PostgresPlanStore_executability-repository_ts_4d2d641c: {
    label: "PostgresPlanStore.executability-repository.ts"
  }
  File__PostgresPlanStore_executable-blob-repository_ts_4aed45e6: {
    label: "PostgresPlanStore.executable-blob-repository.ts"
  }
  File_src_PostgresPlanStore_mappers_ts_94650230: {
    label: "PostgresPlanStore.mappers.ts"
  }
  File_src_PostgresPlanStore_plan-record-repository_ts_d8f3b47e: {
    label: "PostgresPlanStore.plan-record-repository.ts"
  }
  File_src_PostgresPlanStore_schema-manager_ts_f938ffe8: {
    label: "PostgresPlanStore.schema-manager.ts"
  }
  File_src_PostgresPlanStore_sql_ts_bf4dc479: {
    label: "PostgresPlanStore.sql.ts"
  }
  File_src_PostgresPlanStore_ts_a53147a9: {
    label: "PostgresPlanStore.ts"
  }
  File_src_PostgresPlanStore_tx_ts_e4575f48: {
    label: "PostgresPlanStore.tx.ts"
  }
  File_src_PostgresPlanStoreComposer_ts_b9a06b2e: {
    label: "PostgresPlanStoreComposer.ts"
  }
  File_src_PostgresPoolErrorPolicy_ts_69e3b097: {
    label: "PostgresPoolErrorPolicy.ts"
  }
  File_src_PostgresRunArchiveStore_ts_8d527d34: {
    label: "PostgresRunArchiveStore.ts"
  }
  File_src_PostgresRunEventStorage_ts_eb05c541: {
    label: "PostgresRunEventStorage.ts"
  }
  File_src_PostgresRunEventStore_ts_8d91cfe9: {
    label: "PostgresRunEventStore.ts"
  }
  File_src_PostgresRunEventStoreSql_ts_3040cfda: {
    label: "PostgresRunEventStoreSql.ts"
  }
  File_src_PostgresRunMetadataRepository_ts_c676ce0c: {
    label: "PostgresRunMetadataRepository.ts"
  }
  File_src_PostgresRunSnapshotStore_ts_91e4a82a: {
    label: "PostgresRunSnapshotStore.ts"
  }
  File_src_PostgresRunStateCoordinator_ts_6ecc5937: {
    label: "PostgresRunStateCoordinator.ts"
  }
  File_src_PostgresRunStateCoordinatorConstants_ts_7c7584ad: {
    label: "PostgresRunStateCoordinatorConstants.ts"
  }
  File_src_PostgresRunStateStoreAdapter_ts_e59624b9: {
    label: "PostgresRunStateStoreAdapter.ts"
  }
  File_src_PostgresSchemaManager_ts_fdbed115: {
    label: "PostgresSchemaManager.ts"
  }
  File_src_PostgresSchemaManagerSql_ts_494faa83: {
    label: "PostgresSchemaManagerSql.ts"
  }
  File_src_PostgresServiceAccessCapability_ts_a41c3465: {
    label: "PostgresServiceAccessCapability.ts"
  }
  File_src_PostgresSnapshotQueueAdapter_ts_e344ca57: {
    label: "PostgresSnapshotQueueAdapter.ts"
  }
  File_src_PostgresSnapshotStalenessQuery_ts_0b46ad42: {
    label: "PostgresSnapshotStalenessQuery.ts"
  }
  File_src_PostgresSnapshotStalenessQuerySql_ts_1124f977: {
    label: "PostgresSnapshotStalenessQuerySql.ts"
  }
  File_src_PostgresSnapshotWorkQueue_ts_b03dc097: {
    label: "PostgresSnapshotWorkQueue.ts"
  }
  File_src_PostgresStartRunIntentStore_ts_a1356a74: {
    label: "PostgresStartRunIntentStore.ts"
  }
  File_src_PostgresStateStoreAdapter_ts_bd8d5cd9: {
    label: "PostgresStateStoreAdapter.ts"
  }
  File_src_PostgresStateStoreAdminAdapter_ts_d2cf00e6: {
    label: "PostgresStateStoreAdminAdapter.ts"
  }
  File_src_PostgresStateStoreRuntime_ts_d51ed051: {
    label: "PostgresStateStoreRuntime.ts"
  }
  File_src_PostgresStateStoreRuntimeComposer_ts_68e7f00a: {
    label: "PostgresStateStoreRuntimeComposer.ts"
  }
  File_src_PostgresStateStoreRuntimeConfig_ts_69491487: {
    label: "PostgresStateStoreRuntimeConfig.ts"
  }
  File_src_PostgresTenantIsolationPolicy_ts_5adb1022: {
    label: "PostgresTenantIsolationPolicy.ts"
  }
  File_src_runEventEnvelopePolicy_ts_1beadc8a: {
    label: "runEventEnvelopePolicy.ts"
  }
  File_src_runEventStoreErrors_ts_063c3a35: {
    label: "runEventStoreErrors.ts"
  }
  File_src_RunEventWriteRepository_ts_a3e160df: {
    label: "RunEventWriteRepository.ts"
  }
  File_src_runStateCommandPortBridge_ts_57c52f86: {
    label: "runStateCommandPortBridge.ts"
  }
  File_src_sqlUtils_ts_4ece9507: {
    label: "sqlUtils.ts"
  }
  File_src_StartRunIntentSchemaManager_ts_d008daf8: {
    label: "StartRunIntentSchemaManager.ts"
  }
  File_src_types_ts_cdcae080: {
    label: "types.ts"
  }
}
`;case`temporalAdapterSource_dir_src_f27fede2`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2: {
  label: "src/ — 44 files"

  Dir_src_activities_7b271b5c: {
    label: "activities/ — 8 files"
  }
  Dir_src_plugins_e2271fcc: {
    label: "plugins/ — 2 files"
  }
  Dir_src_workflows_4449a236: {
    label: "workflows/ — 20 files"
  }
  File_src_config_ts_0808bc71: {
    label: "config.ts"
  }
  File_src_engine-types_ts_e3103f80: {
    label: "engine-types.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_ObservedTemporalAdapter_ts_cbf66427: {
    label: "ObservedTemporalAdapter.ts"
  }
  File_src_RunStateCommandPortCircuitBreaker_ts_a76803df: {
    label: "RunStateCommandPortCircuitBreaker.ts"
  }
  File_src_TemporalAdapter_ts_cd3d08b1: {
    label: "TemporalAdapter.ts"
  }
  File_src_TemporalClient_ts_50ffa75d: {
    label: "TemporalClient.ts"
  }
  File_src_temporalErrorPolicy_ts_9b40e84d: {
    label: "temporalErrorPolicy.ts"
  }
  File_src_temporalObservability_ts_df62a1eb: {
    label: "temporalObservability.ts"
  }
  File_src_temporalPlanRefCapacitySlaPolicy_ts_df244d08: {
    label: "temporalPlanRefCapacitySlaPolicy.ts"
  }
  File_src_TemporalPolicyMapper_ts_07cc6405: {
    label: "TemporalPolicyMapper.ts"
  }
  File_src_TemporalWorkerHost_ts_baba20bf: {
    label: "TemporalWorkerHost.ts"
  }
  File_src_versioning_ts_11419bfa: {
    label: "versioning.ts"
  }
  File_src_WorkflowMapper_ts_d2031a69: {
    label: "WorkflowMapper.ts"
  }
}
`;case`apiSource_dir_src_f27fede2`:return`direction: down

ApiSourceDir_src_f27fede2: {
  label: "src/ — 352 files"

  Dir_src_application_f8a49c7c: {
    label: "application/ — 135 files"
  }
  Dir_src_db_a9f703b6: {
    label: "db/ — 1 files"
  }
  Dir_src_domain_7ea5567e: {
    label: "domain/ — 1 files"
  }
  Dir_src_entrypoints_7949178c: {
    label: "entrypoints/ — 96 files"
  }
  Dir_src_infrastructure_ab2b2240: {
    label: "infrastructure/ — 73 files"
  }
  Dir_src_modules_fda77df3: {
    label: "modules/ — 19 files"
  }
  Dir_src_plugins_e2271fcc: {
    label: "plugins/ — 3 files"
  }
  Dir_src_routes_e0d29e0a: {
    label: "routes/ — 11 files"
  }
  Dir_src_runtime_6c8c9a16: {
    label: "runtime/ — 11 files"
  }
  File_src_app_ts_21638117: {
    label: "app.ts"
  }
  File_src_server_ts_bcc09dcb: {
    label: "server.ts"
  }
}
`;case`artifactsSource_dir_src_f27fede2`:return`direction: down

ArtifactsSourceDir_src_f27fede2: {
  label: "src/ — 25 files"

  Dir_src_compiledCode_a188b957: {
    label: "compiledCode/ — 7 files"
  }
  Dir_src_contentAddressed_d00e5123: {
    label: "contentAddressed/ — 2 files"
  }
  Dir_src_ports_3a2d3ebf: {
    label: "ports/ — 7 files"
  }
  Dir_src_runtime_6c8c9a16: {
    label: "runtime/ — 8 files"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
}
`;case`cliSource_dir_src_f27fede2`:return`direction: down

CliSourceDir_src_f27fede2: {
  label: "src/ — 1 files"

  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
}
`;case`contractsSource_dir_src_f27fede2`:return`direction: down

ContractsSourceDir_src_f27fede2: {
  label: "src/ — 110 files"

  Dir_src_contracts_63d3060b: {
    label: "contracts/ — 73 files"
  }
  Dir_src_engine_c4c7e6bb: {
    label: "engine/ — 1 files"
  }
  Dir_src_schema-packs_7b5d7740: {
    label: "schema-packs/ — 18 files"
  }
  Dir_src_step-registry_6500f8b1: {
    label: "step-registry/ — 4 files"
  }
  Dir_src_types_7f0be21a: {
    label: "types/ — 2 files"
  }
  Dir_src_utils_e236f4b4: {
    label: "utils/ — 1 files"
  }
  Dir_src_validation_134957c1: {
    label: "validation/ — 4 files"
  }
  File_src_errorContract_ts_43bd4282: {
    label: "errorContract.ts"
  }
  File_src_errors_ts_69d4c465: {
    label: "errors.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_schemas_ts_d1567daf: {
    label: "schemas.ts"
  }
  File_src_substrait_ts_67b47d83: {
    label: "substrait.ts"
  }
  File_src_validation_ts_8ace9416: {
    label: "validation.ts"
  }
  File_src_workflows_ts_97455e14: {
    label: "workflows.ts"
  }
}
`;case`cryptoSource_dir_src_f27fede2`:return`direction: down

CryptoSourceDir_src_f27fede2: {
  label: "src/ — 7 files"

  File_src_encoding_ts_0126a9c2: {
    label: "encoding.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_jcs_ts_51e82c0e: {
    label: "jcs.ts"
  }
  File_src_md5_ts_e765deaf: {
    label: "md5.ts"
  }
  File_src_random_ts_802921c7: {
    label: "random.ts"
  }
  File_src_sha256_ts_570d2ed8: {
    label: "sha256.ts"
  }
  File_src_uuid_ts_a4b9fa9f: {
    label: "uuid.ts"
  }
}
`;case`deliverySource_dir_src_f27fede2`:return`direction: down

DeliverySourceDir_src_f27fede2: {
  label: "src/ — 15 files"

  Dir_src_application_f8a49c7c: {
    label: "application/ — 6 files"
  }
  Dir_src_backpressure_1b00f00b: {
    label: "backpressure/ — 1 files"
  }
  Dir_src_testing_c8606474: {
    label: "testing/ — 4 files"
  }
  File_src_contracts_ts_9032c8ad: {
    label: "contracts.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_outboxShardAssignment_ts_0d148bae: {
    label: "outboxShardAssignment.ts"
  }
  File_src_testing_ts_25c1ccde: {
    label: "testing.ts"
  }
}
`;case`dslSource_dir_src_f27fede2`:return`direction: down

DslSourceDir_src_f27fede2: {
  label: "src/ — 4 files"

  Dir_src_v1_d0c3db8f: {
    label: "v1/ — 3 files"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
}
`;case`engineSource_dir_src_f27fede2`:return`direction: down

EngineSourceDir_src_f27fede2: {
  label: "src/ — 123 files"

  Dir_src_adapters_68aa84b0: {
    label: "adapters/ — 3 files"
  }
  Dir_src_application_f8a49c7c: {
    label: "application/ — 13 files"
  }
  Dir_src_contracts_63d3060b: {
    label: "contracts/ — 22 files"
  }
  Dir_src_core_b256a6ae: {
    label: "core/ — 10 files"
  }
  Dir_src_domain_7ea5567e: {
    label: "domain/ — 7 files"
  }
  Dir_src_metrics_5c1b9425: {
    label: "metrics/ — 1 files"
  }
  Dir_src_outbox_799a2396: {
    label: "outbox/ — 2 files"
  }
  Dir_src_ports_3a2d3ebf: {
    label: "ports/ — 11 files"
  }
  Dir_src_security_5dba450f: {
    label: "security/ — 8 files"
  }
  Dir_src_services_77d0a679: {
    label: "services/ — 26 files"
  }
  Dir_src_state_cee1ab4b: {
    label: "state/ — 12 files"
  }
  Dir_src_types_7f0be21a: {
    label: "types/ — 2 files"
  }
  Dir_src_utils_e236f4b4: {
    label: "utils/ — 2 files"
  }
  Dir_src_workers_10de5b13: {
    label: "workers/ — 1 files"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_runtime_ts_ccd8a8fa: {
    label: "runtime.ts"
  }
  File_src_testing_ts_25c1ccde: {
    label: "testing.ts"
  }
}
`;case`lineageWorkerSource_dir_src_f27fede2`:return`direction: down

LineageWorkerSourceDir_src_f27fede2: {
  label: "src/ — 9 files"

  Dir_src_compiled-code-resolver_e09af233: {
    label: "compiled-code-resolver/ — 4 files"
  }
  Dir_src_types_7f0be21a: {
    label: "types/ — 1 files"
  }
  File_src_bootstrap_ts_cf7b7793: {
    label: "bootstrap.ts"
  }
  File_src_compiledCodeResolver_ts_82c1a308: {
    label: "compiledCodeResolver.ts"
  }
  File_src_env_ts_3686f5d5: {
    label: "env.ts"
  }
  File_src_server_ts_bcc09dcb: {
    label: "server.ts"
  }
}
`;case`observabilityOtelSource_dir_src_f27fede2`:return`direction: down

ObservabilityOtelSourceDir_src_f27fede2: {
  label: "src/ — 4 files"

  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_OpenTelemetryTraces_ts_da517d6b: {
    label: "OpenTelemetryTraces.ts"
  }
  File_src_OtelObservability_ts_9699bfcd: {
    label: "OtelObservability.ts"
  }
  File_src_otelTracePolicy_ts_a5d77099: {
    label: "otelTracePolicy.ts"
  }
}
`;case`observabilitySource_dir_src_f27fede2`:return`direction: down

ObservabilitySourceDir_src_f27fede2: {
  label: "src/ — 5 files"

  Dir_src_contracts_63d3060b: {
    label: "contracts/ — 2 files"
  }
  Dir_src_policy_d3c8fc47: {
    label: "policy/ — 1 files"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_noopObservability_ts_b1c14ac1: {
    label: "noopObservability.ts"
  }
}
`;case`outboxWorkerSource_dir_src_f27fede2`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2: {
  label: "src/ — 25 files"

  Dir_src_bus_740211a8: {
    label: "bus/ — 2 files"
  }
  Dir_src_db_a9f703b6: {
    label: "db/ — 1 files"
  }
  Dir_src_host_16cb5924: {
    label: "host/ — 1 files"
  }
  Dir_src_lifecycle_be90645c: {
    label: "lifecycle/ — 1 files"
  }
  Dir_src_ops_43dcc755: {
    label: "ops/ — 9 files"
  }
  Dir_src_ownership_3dbdd8b8: {
    label: "ownership/ — 1 files"
  }
  Dir_src_plugins_e2271fcc: {
    label: "plugins/ — 1 files"
  }
  Dir_src_runtime_6c8c9a16: {
    label: "runtime/ — 8 files"
  }
  File_src_server_ts_bcc09dcb: {
    label: "server.ts"
  }
}
`;case`planInterpreterSource_dir_src_f27fede2`:return`direction: down

PlanInterpreterSourceDir_src_f27fede2: {
  label: "src/ — 4 files"

  File_src_dagAnalyzer_ts_e14aab4b: {
    label: "dagAnalyzer.ts"
  }
  File_src_errors_ts_69d4c465: {
    label: "errors.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_types_ts_cdcae080: {
    label: "types.ts"
  }
}
`;case`planVerifierSource_dir_src_f27fede2`:return`direction: down

PlanVerifierSourceDir_src_f27fede2: {
  label: "src/ — 5 files"

  File_src_errors_ts_69d4c465: {
    label: "errors.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_planVersion_ts_0c0b8e65: {
    label: "planVersion.ts"
  }
  File_src_stepTypeConfig_ts_e3c09325: {
    label: "stepTypeConfig.ts"
  }
  File_src_verify_ts_8fb52c8f: {
    label: "verify.ts"
  }
}
`;case`plannerSource_dir_src_f27fede2`:return`direction: down

PlannerSourceDir_src_f27fede2: {
  label: "src/ — 28 files"

  Dir_src_application_f8a49c7c: {
    label: "application/ — 4 files"
  }
  Dir_src_contracts_63d3060b: {
    label: "contracts/ — 3 files"
  }
  Dir_src_domain_7ea5567e: {
    label: "domain/ — 18 files"
  }
  Dir_src_ports_3a2d3ebf: {
    label: "ports/ — 1 files"
  }
  Dir_src_runtime_6c8c9a16: {
    label: "runtime/ — 1 files"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
}
`;case`projectorWorkerSource_dir_src_f27fede2`:return`direction: down

ProjectorWorkerSourceDir_src_f27fede2: {
  label: "src/ — 2 files"

  File_src_env_ts_3686f5d5: {
    label: "env.ts"
  }
  File_src_server_ts_bcc09dcb: {
    label: "server.ts"
  }
}
`;case`runDomainSource_dir_src_f27fede2`:return`direction: down

RunDomainSourceDir_src_f27fede2: {
  label: "src/ — 5 files"

  File_src_applyRunEvent_ts_6658c103: {
    label: "applyRunEvent.ts"
  }
  File_src_errors_ts_69d4c465: {
    label: "errors.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_mapEventEnvelopeToProjectableEvent_ts_981727f4: {
    label: "mapEventEnvelopeToProjectableEvent.ts"
  }
  File_src_transitionPolicy_ts_f07fdc0c: {
    label: "transitionPolicy.ts"
  }
}
`;case`stateStoreSource_dir_src_f27fede2`:return`direction: down

StateStoreSourceDir_src_f27fede2: {
  label: "src/ — 15 files"

  Dir_src_lifecycle_be90645c: {
    label: "lifecycle/ — 11 files"
  }
  File_src_archiveLifecycle_ts_4b182e15: {
    label: "archiveLifecycle.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_inMemoryRunStateCommandPort_ts_ce93809e: {
    label: "inMemoryRunStateCommandPort.ts"
  }
  File_src_types_ts_cdcae080: {
    label: "types.ts"
  }
}
`;case`temporalDbtPluginSource_dir_src_f27fede2`:return`direction: down

TemporalDbtPluginSourceDir_src_f27fede2: {
  label: "src/ — 11 files"

  File_src_dbtCliArguments_ts_75421ce4: {
    label: "dbtCliArguments.ts"
  }
  File_src_dbtCliFailures_ts_77b175c6: {
    label: "dbtCliFailures.ts"
  }
  File_src_DbtCliPluginRunner_ts_ebfb4c70: {
    label: "DbtCliPluginRunner.ts"
  }
  File_src_dbtCliProcess_ts_d55b4d17: {
    label: "dbtCliProcess.ts"
  }
  File_src_dbtCliProjectMaterializer_ts_fbe37cfe: {
    label: "dbtCliProjectMaterializer.ts"
  }
  File_src_dbtCliTypes_ts_16391643: {
    label: "dbtCliTypes.ts"
  }
  File_src_dbtPluginManifest_ts_81c436ae: {
    label: "dbtPluginManifest.ts"
  }
  File_src_dbtPluginTypes_ts_06ea7543: {
    label: "dbtPluginTypes.ts"
  }
  File_src_dbtRuntimeProfile_ts_7c8a0823: {
    label: "dbtRuntimeProfile.ts"
  }
  File_src_DbtStepActivity_ts_c3657921: {
    label: "DbtStepActivity.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
}
`;case`temporalHttpJsonPluginSource_dir_src_f27fede2`:return`direction: down

TemporalHttpJsonPluginSourceDir_src_f27fede2: {
  label: "src/ — 5 files"

  File_src_httpJsonArtifactPluginErrors_ts_aada1514: {
    label: "httpJsonArtifactPluginErrors.ts"
  }
  File_src_HttpJsonArtifactPluginRunner_ts_91e1783a: {
    label: "HttpJsonArtifactPluginRunner.ts"
  }
  File_src_httpJsonArtifactPluginTypes_ts_c566e7be: {
    label: "httpJsonArtifactPluginTypes.ts"
  }
  File_src_HttpJsonArtifactStepActivity_ts_b5aa4ffd: {
    label: "HttpJsonArtifactStepActivity.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
}
`;case`temporalObjectFilePostgresPluginSource_dir_src_f27fede2`:return`direction: down

TemporalObjectFilePostgresPluginSourceDir_src_f27fede2: {
  label: "src/ — 6 files"

  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_objectFilePostgresPluginErrors_ts_9051edb9: {
    label: "objectFilePostgresPluginErrors.ts"
  }
  File_src_ObjectFilePostgresPluginRunner_ts_ccf1b641: {
    label: "ObjectFilePostgresPluginRunner.ts"
  }
  File_src_objectFilePostgresPluginTypes_ts_c1f97f3c: {
    label: "objectFilePostgresPluginTypes.ts"
  }
  File_src_ObjectFilePostgresStepActivity_ts_9ec6f900: {
    label: "ObjectFilePostgresStepActivity.ts"
  }
  File_src_objectFileRows_ts_6d56a11b: {
    label: "objectFileRows.ts"
  }
}
`;case`temporalWorkerSource_dir_src_f27fede2`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2: {
  label: "src/ — 20 files"

  Dir_src_host_16cb5924: {
    label: "host/ — 1 files"
  }
  Dir_src_ops_43dcc755: {
    label: "ops/ — 2 files"
  }
  Dir_src_plugins_e2271fcc: {
    label: "plugins/ — 1 files"
  }
  Dir_src_runtime_6c8c9a16: {
    label: "runtime/ — 15 files"
  }
  File_src_server_ts_bcc09dcb: {
    label: "server.ts"
  }
}
`;case`traceabilitySource_dir_src_f27fede2`:return`direction: down

TraceabilitySourceDir_src_f27fede2: {
  label: "src/ — 39 files"

  Dir_src_adapters_68aa84b0: {
    label: "adapters/ — 2 files"
  }
  Dir_src_core_b256a6ae: {
    label: "core/ — 5 files"
  }
  Dir_src_lineage_a5e6b0c8: {
    label: "lineage/ — 27 files"
  }
  File_src_cli_ts_c443bc51: {
    label: "cli.ts"
  }
  File_src_contracts_ts_9032c8ad: {
    label: "contracts.ts"
  }
  File_src_index_ts_c5fb8502: {
    label: "index.ts"
  }
  File_src_service_ts_aaf7ca00: {
    label: "service.ts"
  }
  File_src_types_ts_cdcae080: {
    label: "types.ts"
  }
}
`;case`webSource_dir_src_f27fede2`:return`direction: down

WebSourceDir_src_f27fede2: {
  label: "src/ — 1506 files"

  Dir_src_app_52e6ddd7: {
    label: "app/ — 1459 files"
  }
  Dir_src_capabilities_b4d68af1: {
    label: "capabilities/ — 21 files"
  }
  Dir_src_styles_1238c57d: {
    label: "styles/ — 4 files"
  }
  Dir_src_testing_c8606474: {
    label: "testing/ — 21 files"
  }
  File_src_main_tsx_60f616ca: {
    label: "main.tsx"
  }
}
`;case`temporalAdapterSource_dir_src_activities_7b271b5c`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2Dir_src_activities_7b271b5c: {
  label: "activities/ — 8 files"

  File_src_activities_activityFactory_ts_5c37456f: {
    label: "activityFactory.ts"
  }
  File_src_activities_activityFailures_ts_0b47fa48: {
    label: "activityFailures.ts"
  }
  File_src_activities_activityTypes_ts_e6f23064: {
    label: "activityTypes.ts"
  }
  File_src_activities_gatewayStepActivity_ts_fe8fa2d5: {
    label: "gatewayStepActivity.ts"
  }
  File_src_activities_stepActivities_ts_0421a0df: {
    label: "stepActivities.ts"
  }
  File_src_activities_stepActivityDispatcher_ts_41ae72d5: {
    label: "stepActivityDispatcher.ts"
  }
  File_src_activities_stepActivityValidation_ts_f1ced87f: {
    label: "stepActivityValidation.ts"
  }
  File_src_activities_temporalPlanArtifactReader_ts_d8fbec02: {
    label: "temporalPlanArtifactReader.ts"
  }
}
`;case`engineSource_dir_src_adapters_68aa84b0`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_adapters_68aa84b0: {
  label: "adapters/ — 3 files"

  Dir_src_adapters_inMemory_445778a0: {
    label: "inMemory/ — 1 files"
  }
  File_src_adapters_CircuitBreakingProviderAdapter_ts_b78f8b4f: {
    label: "CircuitBreakingProviderAdapter.ts"
  }
  File_src_adapters_IProviderAdapter_ts_c37bc986: {
    label: "IProviderAdapter.ts"
  }
}
`;case`traceabilitySource_dir_src_adapters_68aa84b0`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_adapters_68aa84b0: {
  label: "adapters/ — 2 files"

  File_src_adapters_adr-catalog-filesystem_ts_3ed1c49a: {
    label: "adr-catalog-filesystem.ts"
  }
  File_src_adapters_header-scanner-glob_ts_f20e16cc: {
    label: "header-scanner-glob.ts"
  }
}
`;case`engineSource_dir_src_adapters_inMemory_445778a0`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_adapters_68aa84b0Dir_src_adapters_inMemory_445778a0: {
  label: "inMemory/ — 1 files"

  File_src_adapters_inMemory_InMemoryProviderAdapter_ts_c81e7079: {
    label: "InMemoryProviderAdapter.ts"
  }
}
`;case`webSource_dir_src_app_52e6ddd7`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7: {
  label: "app/ — 1459 files"

  Dir_src_app_bootstrap_8d544754: {
    label: "bootstrap/ — 28 files"
  }
  Dir_src_app_components_5313f4e4: {
    label: "components/ — 250 files"
  }
  Dir_src_app_plugins_ce323325: {
    label: "plugins/ — 119 files"
  }
  Dir_src_app_ports_974b1bd3: {
    label: "ports/ — 16 files"
  }
  Dir_src_app_queries_16225311: {
    label: "queries/ — 13 files"
  }
  Dir_src_app_routes_e22c046b: {
    label: "routes/ — 2 files"
  }
  Dir_src_app_services_79afb037: {
    label: "services/ — 110 files"
  }
  Dir_src_app_shell_1e479cbc: {
    label: "shell/ — 10 files"
  }
  Dir_src_app_stores_b85bb48a: {
    label: "stores/ — 14 files"
  }
  Dir_src_app_testing_b80bc5ef: {
    label: "testing/ — 1 files"
  }
  Dir_src_app_types_a2447295: {
    label: "types/ — 8 files"
  }
  Dir_src_app_views_f32657e4: {
    label: "views/ — 866 files"
  }
  File_src_app_App_tsx_f9f44c96: {
    label: "App.tsx"
  }
  File_src_app_AppProviders_test_tsx_d0758f13: {
    label: "AppProviders.test.tsx"
  }
  File_src_app_AppProviders_tsx_2def0995: {
    label: "AppProviders.tsx"
  }
  File_src_app_appRoute_test_support_ts_9fc93336: {
    label: "appRoute.test.support.ts"
  }
  File_c_app_AppRouteErrorBoundary_operability_test_tsx_6875c587: {
    label: "AppRouteErrorBoundary.operability.test.tsx"
  }
  File_src_app_AppRouteErrorBoundary_tsx_eb006a71: {
    label: "AppRouteErrorBoundary.tsx"
  }
  File_src_app_appRouteErrorBoundaryCopy_test_ts_06bb540b: {
    label: "appRouteErrorBoundaryCopy.test.ts"
  }
  File_src_app_appRouteErrorBoundaryCopy_ts_9e369e12: {
    label: "appRouteErrorBoundaryCopy.ts"
  }
  File_src_app_Root_bootstrapFlow_test_tsx_5ec8ea67: {
    label: "Root.bootstrapFlow.test.tsx"
  }
  File_src_app_Root_bootstrapRoute_test_support_tsx_4a0df006: {
    label: "Root.bootstrapRoute.test.support.tsx"
  }
  File_src_app_Root_operability_test_tsx_b85a14f2: {
    label: "Root.operability.test.tsx"
  }
  File_src_app_Root_platformHealthBanner_test_tsx_0bdb8bcf: {
    label: "Root.platformHealthBanner.test.tsx"
  }
  File_src_app_Root_shellChrome_test_support_ts_5061d169: {
    label: "Root.shellChrome.test.support.ts"
  }
  File_src_app_Root_shellChrome_test_tsx_81c4960f: {
    label: "Root.shellChrome.test.tsx"
  }
  File_src_app_Root_test_support_tsx_10280d55: {
    label: "Root.test.support.tsx"
  }
  File_src_app_Root_test_tsx_99425032: {
    label: "Root.test.tsx"
  }
  File_src_app_Root_tsx_09ee9255: {
    label: "Root.tsx"
  }
  File_src_app_rootOperabilityModel_test_ts_f49d5516: {
    label: "rootOperabilityModel.test.ts"
  }
  File_src_app_rootOperabilityModel_ts_4111fad9: {
    label: "rootOperabilityModel.ts"
  }
  File_src_app_routerFlushSync_ts_005ef548: {
    label: "routerFlushSync.ts"
  }
  File_src_app_routes_test_tsx_6184e9d5: {
    label: "routes.test.tsx"
  }
  File_src_app_routes_ts_5fae9da1: {
    label: "routes.ts"
  }
}
`;case`webSource_dir_src_app_bootstrap_8d544754`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_bootstrap_8d544754: {
  label: "bootstrap/ — 28 files"

  File_src_app_bootstrap_appBootstrapCommands_test_ts_d7c3be92: {
    label: "appBootstrapCommands.test.ts"
  }
  File_src_app_bootstrap_appBootstrapCommands_ts_4ad30e6f: {
    label: "appBootstrapCommands.ts"
  }
  File_src_app_bootstrap_appBootstrapCopy_ts_75f972d5: {
    label: "appBootstrapCopy.ts"
  }
  File_src_app_bootstrap_appBootstrapDomContract_ts_27a5db53: {
    label: "appBootstrapDomContract.ts"
  }
  File_c_app_bootstrap_appBootstrapPresentation_test_ts_f4f5b313: {
    label: "appBootstrapPresentation.test.ts"
  }
  File_src_app_bootstrap_appBootstrapPresentation_ts_c4d139d2: {
    label: "appBootstrapPresentation.ts"
  }
  File_src_app_bootstrap_appBootstrapScreen_test_ts_9f0ef187: {
    label: "appBootstrapScreen.test.ts"
  }
  File_src_app_bootstrap_appBootstrapScreen_ts_1432f615: {
    label: "appBootstrapScreen.ts"
  }
  File_src_app_bootstrap_AuthRouteGate_test_tsx_a1957a69: {
    label: "AuthRouteGate.test.tsx"
  }
  File_src_app_bootstrap_AuthRouteGate_tsx_e5049951: {
    label: "AuthRouteGate.tsx"
  }
  File_src_app_bootstrap_bootstrapProgressBar_ts_0fb6a0e5: {
    label: "bootstrapProgressBar.ts"
  }
  File_src_app_bootstrap_routeBootstrapContract_ts_3f40a2af: {
    label: "routeBootstrapContract.ts"
  }
  File_app_bootstrap_routeBootstrapDataRouterContext_ts_81ab8a5e: {
    label: "routeBootstrapDataRouterContext.ts"
  }
  File_rc_app_bootstrap_routeBootstrapErrorCopy_test_ts_61fd2af1: {
    label: "routeBootstrapErrorCopy.test.ts"
  }
  File_src_app_bootstrap_routeBootstrapErrorCopy_ts_57e56755: {
    label: "routeBootstrapErrorCopy.ts"
  }
  File_src_app_bootstrap_routeBootstrapErrors_ts_884ebcd2: {
    label: "routeBootstrapErrors.ts"
  }
  File_src_app_bootstrap_routeBootstrapRegistration_ts_746c1dfa: {
    label: "routeBootstrapRegistration.ts"
  }
  File_src_app_bootstrap_routeBootstrapRegistry_test_ts_2cd6b2ad: {
    label: "routeBootstrapRegistry.test.ts"
  }
  File_src_app_bootstrap_routeBootstrapRegistry_ts_0d187b27: {
    label: "routeBootstrapRegistry.ts"
  }
  File_teBootstrapStartupReadiness_architecture_test_ts_af4e9e10: {
    label: "routeBootstrapStartupReadiness.architecture.test.ts"
  }
  File_bootstrap_routeBootstrapStartupReadiness_test_ts_f22c43c8: {
    label: "routeBootstrapStartupReadiness.test.ts"
  }
  File__app_bootstrap_routeBootstrapStartupReadiness_ts_1e30984f: {
    label: "routeBootstrapStartupReadiness.ts"
  }
  File_c_app_bootstrap_StaticRouteBootstrapBoundary_tsx_3b2cfb1d: {
    label: "StaticRouteBootstrapBoundary.tsx"
  }
  File_rap_useActiveRouteBootstrapRegistration_test_tsx_03f49826: {
    label: "useActiveRouteBootstrapRegistration.test.tsx"
  }
  File_bootstrap_useActiveRouteBootstrapRegistration_ts_0e37cb59: {
    label: "useActiveRouteBootstrapRegistration.ts"
  }
  File_pp_bootstrap_usePublishedRouteBootstrap_test_tsx_e927d4d2: {
    label: "usePublishedRouteBootstrap.test.tsx"
  }
  File_src_app_bootstrap_usePublishedRouteBootstrap_ts_325c052a: {
    label: "usePublishedRouteBootstrap.ts"
  }
  File_ap_webAuthProjectOnboarding_architecture_test_ts_24b4962a: {
    label: "webAuthProjectOnboarding.architecture.test.ts"
  }
}
`;case`webSource_dir_src_app_components_5313f4e4`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4: {
  label: "components/ — 250 files"

  Dir_src_app_components_canvas_5965bf56: {
    label: "canvas/ — 19 files"
  }
  Dir_src_app_components_console_097c0ee3: {
    label: "console/ — 4 files"
  }
  Dir_src_app_components_dbtProjectImport_f317fb15: {
    label: "dbtProjectImport/ — 8 files"
  }
  Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6a: {
    label: "dbtYamlDescriptionEditor/ — 12 files"
  }
  Dir_src_app_components_domain_28b2f38f: {
    label: "domain/ — 6 files"
  }
  Dir_src_app_components_figma_2a88ef35: {
    label: "figma/ — 2 files"
  }
  Dir_src_app_components_inspector_6c0b4222: {
    label: "inspector/ — 16 files"
  }
  Dir_src_app_components_metrics_ceb46efd: {
    label: "metrics/ — 3 files"
  }
  Dir_src_app_components_monaco_5d5b8ccc: {
    label: "monaco/ — 11 files"
  }
  Dir_src_app_components_runs_7fd3dae6: {
    label: "runs/ — 3 files"
  }
  Dir_src_app_components_shell_d580ef39: {
    label: "shell/ — 38 files"
  }
  Dir_src_app_components_sourceImportWizard_dac58cdc: {
    label: "sourceImportWizard/ — 44 files"
  }
  Dir_src_app_components_transientSurface_9f91595d: {
    label: "transientSurface/ — 2 files"
  }
  Dir_src_app_components_ui_d50d7a9b: {
    label: "ui/ — 51 files"
  }
  Dir_src_app_components_workbench_dc7ebda3: {
    label: "workbench/ — 8 files"
  }
  File_src_app_components_AppBrandMark_tsx_63e542da: {
    label: "AppBrandMark.tsx"
  }
  File__components_canvasWorkspaceExplorerModel_test_ts_8af568d5: {
    label: "canvasWorkspaceExplorerModel.test.ts"
  }
  File_c_app_components_canvasWorkspaceExplorerModel_ts_7f3c3f78: {
    label: "canvasWorkspaceExplorerModel.ts"
  }
  File_src_app_components_dbtExecutionTargetBinding_ts_937a9775: {
    label: "dbtExecutionTargetBinding.ts"
  }
  File_src_app_components_LeftNavigation_tsx_ed6f70cd: {
    label: "LeftNavigation.tsx"
  }
  File_src_app_components_Modals_test_tsx_ab96588b: {
    label: "Modals.test.tsx"
  }
  File_src_app_components_Modals_tsx_16944660: {
    label: "Modals.tsx"
  }
  File_pp_components_PlanExecutionDecisionView_test_tsx_b744c408: {
    label: "PlanExecutionDecisionView.test.tsx"
  }
  File_src_app_components_PlanExecutionDecisionView_tsx_5d862d5d: {
    label: "PlanExecutionDecisionView.tsx"
  }
  File_pp_components_PlanPreviewModal_outcomes_test_tsx_08478139: {
    label: "PlanPreviewModal.outcomes.test.tsx"
  }
  File_src_app_components_PlanPreviewModal_test_tsx_ea737a7e: {
    label: "PlanPreviewModal.test.tsx"
  }
  File_src_app_components_PlanPreviewModal_tsx_f0d141cf: {
    label: "PlanPreviewModal.tsx"
  }
  File_src_app_components_ShellHealthBanner_tsx_e90651cf: {
    label: "ShellHealthBanner.tsx"
  }
  File_ponents_SourceImportWizard_architecture_test_tsx_220b25ea: {
    label: "SourceImportWizard.architecture.test.tsx"
  }
  File__components_SourceImportWizard_metadata_test_tsx_03977699: {
    label: "SourceImportWizard.metadata.test.tsx"
  }
  File_omponents_SourceImportWizard_navigation_test_tsx_e106bbd7: {
    label: "SourceImportWizard.navigation.test.tsx"
  }
  File_onents_SourceImportWizard_pluginOptions_test_tsx_c588877d: {
    label: "SourceImportWizard.pluginOptions.test.tsx"
  }
  File_src_app_components_SourceImportWizard_test_tsx_3d7d8391: {
    label: "SourceImportWizard.test.tsx"
  }
  File_pp_components_SourceImportWizard_testHarness_tsx_4d9102fa: {
    label: "SourceImportWizard.testHarness.tsx"
  }
  File_src_app_components_SourceImportWizard_tsx_53aeba66: {
    label: "SourceImportWizard.tsx"
  }
  File_rc_app_components_TopAppBar_architecture_test_ts_5816fa8d: {
    label: "TopAppBar.architecture.test.ts"
  }
  File_src_app_components_TopAppBar_test_tsx_4e9c66ea: {
    label: "TopAppBar.test.tsx"
  }
  File_src_app_components_TopAppBar_tsx_193ff5de: {
    label: "TopAppBar.tsx"
  }
}
`;case`webSource_dir_src_app_components_canvas_5965bf56`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_canvas_5965bf56: {
  label: "canvas/ — 19 files"

  File_app_components_canvas_CanvasNodeBadgeOverlay_tsx_f5bcc55d: {
    label: "CanvasNodeBadgeOverlay.tsx"
  }
  File_onents_canvas_canvasNodeContextMenuModel_test_ts_57bfa57d: {
    label: "canvasNodeContextMenuModel.test.ts"
  }
  File__components_canvas_canvasNodeContextMenuModel_ts_88234b43: {
    label: "canvasNodeContextMenuModel.ts"
  }
  File_onents_canvas_CanvasNodeContextMenuView_test_tsx_ec6d83ed: {
    label: "CanvasNodeContextMenuView.test.tsx"
  }
  File__components_canvas_CanvasNodeContextMenuView_tsx_8a5423c7: {
    label: "CanvasNodeContextMenuView.tsx"
  }
  File_onents_canvas_canvasNodeFlowAdapterProjection_ts_8c477a77: {
    label: "canvasNodeFlowAdapterProjection.ts"
  }
  File_mponents_canvas_canvasNodeInteractionBoundary_ts_147db6ab: {
    label: "canvasNodeInteractionBoundary.ts"
  }
  File__components_canvas_CanvasNodePortHandle_test_tsx_8c8c100b: {
    label: "CanvasNodePortHandle.test.tsx"
  }
  File_c_app_components_canvas_CanvasNodePortHandle_tsx_07469900: {
    label: "CanvasNodePortHandle.tsx"
  }
  File_ts_canvas_canvasNodePresentationCopy_contract_ts_ccaab6e3: {
    label: "canvasNodePresentationCopy.contract.ts"
  }
  File_s_canvas_canvasNodePresentationTruth_contract_ts_5da22ed9: {
    label: "canvasNodePresentationTruth.contract.ts"
  }
  File_nents_canvas_canvasNodePresentationTruth_test_ts_845a8493: {
    label: "canvasNodePresentationTruth.test.ts"
  }
  File_components_canvas_canvasNodePresentationTruth_ts_48245818: {
    label: "canvasNodePresentationTruth.ts"
  }
  File_app_components_canvas_CanvasNodeShell_module_css_d7b94154: {
    label: "CanvasNodeShell.module.css"
  }
  File_c_app_components_canvas_CanvasNodeShell_test_tsx_c947e912: {
    label: "CanvasNodeShell.test.tsx"
  }
  File_src_app_components_canvas_CanvasNodeShell_tsx_b74df17e: {
    label: "CanvasNodeShell.tsx"
  }
  File_onents_canvas_DbtNodeComponent_behavior_test_tsx_aa16e2f4: {
    label: "DbtNodeComponent.behavior.test.tsx"
  }
  File_vas_DbtNodeComponent_failureContainment_test_tsx_22803dc9: {
    label: "DbtNodeComponent.failureContainment.test.tsx"
  }
  File_src_app_components_canvas_DbtNodeComponent_tsx_3218e199: {
    label: "DbtNodeComponent.tsx"
  }
}
`;case`webSource_dir_src_app_components_console_097c0ee3`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_console_097c0ee3: {
  label: "console/ — 4 files"

  File_src_app_components_console_formatLogLine_test_ts_747bb743: {
    label: "formatLogLine.test.ts"
  }
  File_src_app_components_console_formatLogLine_ts_49815b96: {
    label: "formatLogLine.ts"
  }
  File_rc_app_components_console_useConsoleLogStream_ts_f7bb5097: {
    label: "useConsoleLogStream.ts"
  }
  File_src_app_components_console_XtermConsole_tsx_9b54d64b: {
    label: "XtermConsole.tsx"
  }
}
`;case`webSource_dir_src_app_components_dbtProjectImport_f317fb15`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtProjectImport_f317fb15: {
  label: "dbtProjectImport/ — 8 files"

  File_ponents_dbtProjectImport_dbtProjectImportCopy_ts_01241d5f: {
    label: "dbtProjectImportCopy.ts"
  }
  File_dbtProjectImport_DbtProjectImportDialog_test_tsx_d4328082: {
    label: "DbtProjectImportDialog.test.tsx"
  }
  File_ents_dbtProjectImport_DbtProjectImportDialog_tsx_1bf4b730: {
    label: "DbtProjectImportDialog.tsx"
  }
  File_rojectImport_DbtProjectImportDialogView_test_tsx_b5d53857: {
    label: "DbtProjectImportDialogView.test.tsx"
  }
  File__dbtProjectImport_DbtProjectImportDialogView_tsx_b6178297: {
    label: "DbtProjectImportDialogView.tsx"
  }
  File_Import_dbtProjectImportPresentationModel_test_ts_2d75ef91: {
    label: "dbtProjectImportPresentationModel.test.ts"
  }
  File_ojectImport_dbtProjectImportPresentationModel_ts_a618242b: {
    label: "dbtProjectImportPresentationModel.ts"
  }
  File_btProjectImport_useDbtProjectImportController_ts_f3af8daf: {
    label: "useDbtProjectImportController.ts"
  }
}
`;case`webSource_dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6a`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_dbtYamlDescriptionEditor_6f7fce6a: {
  label: "dbtYamlDescriptionEditor/ — 12 files"

  File_r_dbtYamlDescriptionAnalysisPresentation_test_ts_796b9925: {
    label: "dbtYamlDescriptionAnalysisPresentation.test.ts"
  }
  File_Editor_dbtYamlDescriptionAnalysisPresentation_ts_3ab145f9: {
    label: "dbtYamlDescriptionAnalysisPresentation.ts"
  }
  File_criptionEditor_DbtYamlDescriptionEditor_test_tsx_daa20705: {
    label: "DbtYamlDescriptionEditor.test.tsx"
  }
  File_mlDescriptionEditor_DbtYamlDescriptionEditor_tsx_a1ddde0f: {
    label: "DbtYamlDescriptionEditor.tsx"
  }
  File_ptionEditor_dbtYamlDescriptionEditorCopy_test_ts_3456d8f2: {
    label: "dbtYamlDescriptionEditorCopy.test.ts"
  }
  File_escriptionEditor_dbtYamlDescriptionEditorCopy_ts_0264920e: {
    label: "dbtYamlDescriptionEditorCopy.ts"
  }
  File_tionEditor_dbtYamlDescriptionEditorModel_test_ts_9e8988b9: {
    label: "dbtYamlDescriptionEditorModel.test.ts"
  }
  File_scriptionEditor_dbtYamlDescriptionEditorModel_ts_27d4cba8: {
    label: "dbtYamlDescriptionEditorModel.ts"
  }
  File_tionEditor_DbtYamlDescriptionEditorView_test_tsx_db9f05ae: {
    label: "DbtYamlDescriptionEditorView.test.tsx"
  }
  File_scriptionEditor_DbtYamlDescriptionEditorView_tsx_b67efaef: {
    label: "DbtYamlDescriptionEditorView.tsx"
  }
  File_onEditor_dbtYamlDescriptionEditorVisualTokens_ts_d516373f: {
    label: "dbtYamlDescriptionEditorVisualTokens.ts"
  }
  File_DescriptionEditor_useDbtYamlDescriptionEditor_ts_6eddf76a: {
    label: "useDbtYamlDescriptionEditor.ts"
  }
}
`;case`webSource_dir_src_app_components_domain_28b2f38f`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_domain_28b2f38f: {
  label: "domain/ — 6 files"

  File__app_components_domain_domainComponents_test_tsx_fbbd38c6: {
    label: "domainComponents.test.tsx"
  }
  File_src_app_components_domain_index_ts_5f28a3de: {
    label: "index.ts"
  }
  File_src_app_components_domain_StatCard_tsx_bbdc8443: {
    label: "StatCard.tsx"
  }
  File_src_app_components_domain_StatusIndicator_tsx_51761523: {
    label: "StatusIndicator.tsx"
  }
  File_src_app_components_domain_ViewHeader_tsx_300be5e9: {
    label: "ViewHeader.tsx"
  }
  File_src_app_components_domain_ViewStateOverlay_tsx_824f9d37: {
    label: "ViewStateOverlay.tsx"
  }
}
`;case`webSource_dir_src_app_components_figma_2a88ef35`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_figma_2a88ef35: {
  label: "figma/ — 2 files"

  File__app_components_figma_ImageWithFallback_test_tsx_a84ec845: {
    label: "ImageWithFallback.test.tsx"
  }
  File_src_app_components_figma_ImageWithFallback_tsx_97475d07: {
    label: "ImageWithFallback.tsx"
  }
}
`;case`webSource_dir_src_app_components_inspector_6c0b4222`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_inspector_6c0b4222: {
  label: "inspector/ — 16 files"

  File_omponents_inspector_dbtTestRowsReadModel_test_ts_608ffbcd: {
    label: "dbtTestRowsReadModel.test.ts"
  }
  File_app_components_inspector_dbtTestRowsReadModel_ts_908fe4bf: {
    label: "dbtTestRowsReadModel.ts"
  }
  File_ents_inspector_dbtTestSemanticsPresenter_test_ts_04f64026: {
    label: "dbtTestSemanticsPresenter.test.ts"
  }
  File_omponents_inspector_dbtTestSemanticsPresenter_ts_2e4f5057: {
    label: "dbtTestSemanticsPresenter.ts"
  }
  File_pp_components_inspector_inspectorVisualTokens_ts_903d3fd9: {
    label: "inspectorVisualTokens.ts"
  }
  File_onents_inspector_nodePropertiesReadModel_test_ts_4bd06222: {
    label: "nodePropertiesReadModel.test.ts"
  }
  File__components_inspector_nodePropertiesReadModel_ts_f747e45e: {
    label: "nodePropertiesReadModel.ts"
  }
  File_nspector_NodePropertiesTabs_architecture_test_ts_f7039f5f: {
    label: "NodePropertiesTabs.architecture.test.ts"
  }
  File_s_inspector_NodePropertiesTabs_overflow_test_tsx_c9484c40: {
    label: "NodePropertiesTabs.overflow.test.tsx"
  }
  File_ctor_NodePropertiesTabs_primarySections_test_tsx_9158b0c0: {
    label: "NodePropertiesTabs.primarySections.test.tsx"
  }
  File_ector_NodePropertiesTabs_sectionContent_test_tsx_9767de5e: {
    label: "NodePropertiesTabs.sectionContent.test.tsx"
  }
  File__app_components_inspector_NodePropertiesTabs_tsx_1fb2abaf: {
    label: "NodePropertiesTabs.tsx"
  }
  File_nents_inspector_NodePropertySectionView_test_tsx_c41fb4b3: {
    label: "NodePropertySectionView.test.tsx"
  }
  File_components_inspector_NodePropertySectionView_tsx_03076111: {
    label: "NodePropertySectionView.tsx"
  }
  File_s_inspector_structuredColumnPresentation_test_ts_b37a18f3: {
    label: "structuredColumnPresentation.test.ts"
  }
  File_onents_inspector_structuredColumnPresentation_ts_2458964f: {
    label: "structuredColumnPresentation.ts"
  }
}
`;case`webSource_dir_src_app_components_metrics_ceb46efd`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_metrics_ceb46efd: {
  label: "metrics/ — 3 files"

  File_omponents_metrics_MetricEvidenceHotspot_test_tsx_43476249: {
    label: "MetricEvidenceHotspot.test.tsx"
  }
  File_app_components_metrics_MetricEvidenceHotspot_tsx_379cd0f0: {
    label: "MetricEvidenceHotspot.tsx"
  }
  File_c_app_components_metrics_metricEvidenceTokens_ts_e878a577: {
    label: "metricEvidenceTokens.ts"
  }
}
`;case`webSource_dir_src_app_components_monaco_5d5b8ccc`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_monaco_5d5b8ccc: {
  label: "monaco/ — 11 files"

  File_onaco_monacoBundleIsolation_architecture_test_ts_7cecde4c: {
    label: "monacoBundleIsolation.architecture.test.ts"
  }
  File_src_app_components_monaco_MonacoCodeEditor_tsx_56b014b4: {
    label: "MonacoCodeEditor.tsx"
  }
  File_src_app_components_monaco_MonacoCodeSurface_tsx_b8124989: {
    label: "MonacoCodeSurface.tsx"
  }
  File_src_app_components_monaco_MonacoCodeViewer_tsx_e66f9522: {
    label: "MonacoCodeViewer.tsx"
  }
  File_src_app_components_monaco_MonacoDiffSurface_tsx_0579af6d: {
    label: "MonacoDiffSurface.tsx"
  }
  File_src_app_components_monaco_MonacoDiffViewer_tsx_b957f28c: {
    label: "MonacoDiffViewer.tsx"
  }
  File_src_app_components_monaco_monacoLocalWorkers_ts_20f04064: {
    label: "monacoLocalWorkers.ts"
  }
  File_c_app_components_monaco_MonacoViewerFallback_tsx_5eed26c5: {
    label: "MonacoViewerFallback.tsx"
  }
  File_s_monaco_monacoVisualTokens_architecture_test_ts_5bc92850: {
    label: "monacoVisualTokens.architecture.test.ts"
  }
  File_src_app_components_monaco_monacoVisualTokens_ts_0bdf057a: {
    label: "monacoVisualTokens.ts"
  }
  File_rc_app_components_monaco_useMonacoCodeSurface_ts_335de807: {
    label: "useMonacoCodeSurface.ts"
  }
}
`;case`webSource_dir_src_app_components_runs_7fd3dae6`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_runs_7fd3dae6: {
  label: "runs/ — 3 files"

  File_c_app_components_runs_RunControlActions_test_tsx_c16849c3: {
    label: "RunControlActions.test.tsx"
  }
  File_src_app_components_runs_RunControlActions_tsx_c978ee50: {
    label: "RunControlActions.tsx"
  }
  File_src_app_components_runs_runControlCopy_ts_d994b20b: {
    label: "runControlCopy.ts"
  }
}
`;case`webSource_dir_src_app_components_shell_d580ef39`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_shell_d580ef39: {
  label: "shell/ — 38 files"

  File_rc_app_components_shell_appBuildMetadata_test_ts_a11304ea: {
    label: "appBuildMetadata.test.ts"
  }
  File_src_app_components_shell_appBuildMetadata_ts_98209995: {
    label: "appBuildMetadata.ts"
  }
  File_src_app_components_shell_AppShellFrame_test_tsx_567dd5c5: {
    label: "AppShellFrame.test.tsx"
  }
  File_src_app_components_shell_AppShellFrame_tsx_9273b594: {
    label: "AppShellFrame.tsx"
  }
  File_omponents_shell_BottomOperationalDrawer_test_tsx_d4277258: {
    label: "BottomOperationalDrawer.test.tsx"
  }
  File_app_components_shell_BottomOperationalDrawer_tsx_e91a9c54: {
    label: "BottomOperationalDrawer.tsx"
  }
  File_ts_shell_bottomOperationalDrawerLogModel_test_ts_81bda446: {
    label: "bottomOperationalDrawerLogModel.test.ts"
  }
  File_ponents_shell_bottomOperationalDrawerLogModel_ts_6fb7b500: {
    label: "bottomOperationalDrawerLogModel.ts"
  }
  File_src_app_components_shell_chrome_ts_641436ba: {
    label: "chrome.ts"
  }
  File_src_app_components_shell_copy_ts_0bb778e4: {
    label: "copy.ts"
  }
  File_shell_operationalDrawerContributionStore_test_ts_d1195c40: {
    label: "operationalDrawerContributionStore.test.ts"
  }
  File_ents_shell_operationalDrawerContributionStore_ts_09706147: {
    label: "operationalDrawerContributionStore.ts"
  }
  File_onents_shell_OperationalDrawerDataTable_test_tsx_ed15244c: {
    label: "OperationalDrawerDataTable.test.tsx"
  }
  File__components_shell_OperationalDrawerDataTable_tsx_c28d8663: {
    label: "OperationalDrawerDataTable.tsx"
  }
  File_nents_shell_OperationalDrawerPanelPrimitives_tsx_41b2d2a7: {
    label: "OperationalDrawerPanelPrimitives.tsx"
  }
  File_s_shell_OperationalDrawerPanels_actions_test_tsx_958f4021: {
    label: "OperationalDrawerPanels.actions.test.tsx"
  }
  File_ell_OperationalDrawerPanels_architecture_test_ts_15d46d80: {
    label: "OperationalDrawerPanels.architecture.test.ts"
  }
  File_omponents_shell_OperationalDrawerPanels_test_tsx_d18e0ea3: {
    label: "OperationalDrawerPanels.test.tsx"
  }
  File_app_components_shell_OperationalDrawerPanels_tsx_40a4f955: {
    label: "OperationalDrawerPanels.tsx"
  }
  File_ll_operationalDrawerSelectionRecoveryMessages_ts_73e07084: {
    label: "operationalDrawerSelectionRecoveryMessages.ts"
  }
  File_OperationalDrawerSelectionRecoveryPrimitives_tsx_b090e304: {
    label: "OperationalDrawerSelectionRecoveryPrimitives.tsx"
  }
  File__OperationalDrawerSelectionRecoveryView_test_tsx_c3e6ad3d: {
    label: "OperationalDrawerSelectionRecoveryView.test.tsx"
  }
  File_shell_OperationalDrawerSelectionRecoveryView_tsx_cf034f4a: {
    label: "OperationalDrawerSelectionRecoveryView.tsx"
  }
  File_ponents_shell_OperationalDrawerTabStrip_test_tsx_36f7d24a: {
    label: "OperationalDrawerTabStrip.test.tsx"
  }
  File_p_components_shell_OperationalDrawerTabStrip_tsx_a303a05a: {
    label: "OperationalDrawerTabStrip.tsx"
  }
  File_src_app_components_shell_ShellAppMenu_tsx_506c6076: {
    label: "ShellAppMenu.tsx"
  }
  File_c_app_components_shell_ShellConnectionStatus_tsx_efaf2482: {
    label: "ShellConnectionStatus.tsx"
  }
  File_src_app_components_shell_ShellGitRef_tsx_0cd44d06: {
    label: "ShellGitRef.tsx"
  }
  File_src_app_components_shell_ShellMenu_tsx_97c38e1f: {
    label: "ShellMenu.tsx"
  }
  File_p_components_shell_ShellProjectIdentityBadge_tsx_efa59864: {
    label: "ShellProjectIdentityBadge.tsx"
  }
  File_app_components_shell_ShellRunStatusIndicator_tsx_d113af6d: {
    label: "ShellRunStatusIndicator.tsx"
  }
  File__components_shell_shellViewControlsModel_test_ts_f11c9efb: {
    label: "shellViewControlsModel.test.ts"
  }
  File_c_app_components_shell_shellViewControlsModel_ts_61478b62: {
    label: "shellViewControlsModel.ts"
  }
  File_omponents_shell_ShellWorkspaceContextDetails_tsx_45014eb4: {
    label: "ShellWorkspaceContextDetails.tsx"
  }
  File_p_components_shell_ShellWorkspaceContextMenu_tsx_ad7f1bc1: {
    label: "ShellWorkspaceContextMenu.tsx"
  }
  File_nents_shell_ShellWorkspaceScopeSelector_test_tsx_f1f50bf0: {
    label: "ShellWorkspaceScopeSelector.test.tsx"
  }
  File_components_shell_ShellWorkspaceScopeSelector_tsx_92a29ce8: {
    label: "ShellWorkspaceScopeSelector.tsx"
  }
  File_src_app_components_shell_types_ts_fe6ec9d6: {
    label: "types.ts"
  }
}
`;case`webSource_dir_src_app_components_sourceImportWizard_dac58cdc`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_sourceImportWizard_dac58cdc: {
  label: "sourceImportWizard/ — 44 files"

  File_components_sourceImportWizard_ConnectionStep_tsx_402d547d: {
    label: "ConnectionStep.tsx"
  }
  File_c_app_components_sourceImportWizard_constants_ts_cc516dad: {
    label: "constants.ts"
  }
  File_src_app_components_sourceImportWizard_copy_ts_fc444338: {
    label: "copy.ts"
  }
  File_ponents_sourceImportWizard_GroupingStep_test_tsx_e400897c: {
    label: "GroupingStep.test.tsx"
  }
  File_p_components_sourceImportWizard_GroupingStep_tsx_4da1b615: {
    label: "GroupingStep.tsx"
  }
  File_pp_components_sourceImportWizard_OptionsStep_tsx_e791659a: {
    label: "OptionsStep.tsx"
  }
  File_app_components_sourceImportWizard_ResultStep_tsx_af8f05ce: {
    label: "ResultStep.tsx"
  }
  File_app_components_sourceImportWizard_ReviewStep_tsx_dc83d4ec: {
    label: "ReviewStep.tsx"
  }
  File__components_sourceImportWizard_SelectionStep_tsx_8921693f: {
    label: "SelectionStep.tsx"
  }
  File_rceImportWizard_sourceImportCatalogModel_test_ts_9ede36f2: {
    label: "sourceImportCatalogModel.test.ts"
  }
  File_s_sourceImportWizard_sourceImportCatalogModel_ts_9dc63ae2: {
    label: "sourceImportCatalogModel.ts"
  }
  File_ceImportWizard_SourceImportCatalogPrimitives_tsx_194b1772: {
    label: "SourceImportCatalogPrimitives.tsx"
  }
  File_tWizard_sourceImportCatalogSourceObjects_test_ts_b0abe98a: {
    label: "sourceImportCatalogSourceObjects.test.ts"
  }
  File_ard_SourceImportCatalogView_architecture_test_ts_71823493: {
    label: "SourceImportCatalogView.architecture.test.ts"
  }
  File_rceImportWizard_SourceImportCatalogView_test_tsx_58bdd97f: {
    label: "SourceImportCatalogView.test.tsx"
  }
  File_s_sourceImportWizard_SourceImportCatalogView_tsx_443ea164: {
    label: "SourceImportCatalogView.tsx"
  }
  File_rceImportWizard_sourceImportCommandModel_test_ts_8bd1d25e: {
    label: "sourceImportCommandModel.test.ts"
  }
  File_s_sourceImportWizard_sourceImportCommandModel_ts_154cb121: {
    label: "sourceImportCommandModel.ts"
  }
  File_ceImportWizard_SourceImportConstraintMarkers_tsx_b4772d08: {
    label: "SourceImportConstraintMarkers.tsx"
  }
  File__sourceImportWizard_sourceImportMetadataModel_ts_aa30ea61: {
    label: "sourceImportMetadataModel.ts"
  }
  File_eImportWizard_SourceImportMetadataPanel_test_tsx_fcdc99bb: {
    label: "SourceImportMetadataPanel.test.tsx"
  }
  File_sourceImportWizard_SourceImportMetadataPanel_tsx_eb10fac2: {
    label: "SourceImportMetadataPanel.tsx"
  }
  File_mportWizard_SourceImportObjectsMetadata_test_tsx_89074c94: {
    label: "SourceImportObjectsMetadata.test.tsx"
  }
  File_urceImportWizard_SourceImportObjectsMetadata_tsx_a063862a: {
    label: "SourceImportObjectsMetadata.tsx"
  }
  File_urceImportWizard_sourceImportReviewModel_test_ts_756009f2: {
    label: "sourceImportReviewModel.test.ts"
  }
  File_ts_sourceImportWizard_sourceImportReviewModel_ts_2ca5cc98: {
    label: "sourceImportReviewModel.ts"
  }
  File_urceImportWizard_SourceImportReviewView_test_tsx_3bb75cb1: {
    label: "SourceImportReviewView.test.tsx"
  }
  File_ts_sourceImportWizard_SourceImportReviewView_tsx_b167158d: {
    label: "SourceImportReviewView.tsx"
  }
  File_rceImportWizard_SourceImportSectionTabs_test_tsx_a9b29b84: {
    label: "SourceImportSectionTabs.test.tsx"
  }
  File_s_sourceImportWizard_SourceImportSectionTabs_tsx_e5f91561: {
    label: "SourceImportSectionTabs.tsx"
  }
  File_mportWizard_SourceImportSelectionBasket_test_tsx_88c3e051: {
    label: "SourceImportSelectionBasket.test.tsx"
  }
  File_urceImportWizard_SourceImportSelectionBasket_tsx_8abe8bf7: {
    label: "SourceImportSelectionBasket.tsx"
  }
  File_eImportWizard_sourceImportWizard_testFixtures_ts_32f8501f: {
    label: "sourceImportWizard.testFixtures.ts"
  }
  File_ortWizard_SourceImportWizardFrame_focus_test_tsx_04783996: {
    label: "SourceImportWizardFrame.focus.test.tsx"
  }
  File_s_sourceImportWizard_SourceImportWizardFrame_tsx_f9be4566: {
    label: "SourceImportWizardFrame.tsx"
  }
  File_urceImportWizard_sourceImportWizardModel_test_ts_57f8a30f: {
    label: "sourceImportWizardModel.test.ts"
  }
  File_ts_sourceImportWizard_sourceImportWizardModel_ts_d23423a2: {
    label: "sourceImportWizardModel.ts"
  }
  File_src_app_components_sourceImportWizard_types_ts_8fa0e4f4: {
    label: "types.ts"
  }
  File_ents_sourceImportWizard_useSourceImportWizard_ts_4693575d: {
    label: "useSourceImportWizard.ts"
  }
  File_ImportWizard_useSourceImportWizardDataLoaders_ts_2892b052: {
    label: "useSourceImportWizardDataLoaders.ts"
  }
  File_ceImportWizard_WarehouseConnectionCreateForm_tsx_ef36ebd1: {
    label: "WarehouseConnectionCreateForm.tsx"
  }
  File_ceImportWizard_WarehouseConnectionRenameForm_tsx_2f5b6a09: {
    label: "WarehouseConnectionRenameForm.tsx"
  }
  File_components_sourceImportWizard_WizardProgress_tsx_87586d94: {
    label: "WizardProgress.tsx"
  }
  File_ponents_sourceImportWizard_WizardStepContent_tsx_bc7ff3df: {
    label: "WizardStepContent.tsx"
  }
}
`;case`webSource_dir_src_app_components_transientSurface_9f91595d`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_transientSurface_9f91595d: {
  label: "transientSurface/ — 2 files"

  File_transientSurface_usePointerGraceDismiss_test_tsx_b746630d: {
    label: "usePointerGraceDismiss.test.tsx"
  }
  File_nents_transientSurface_usePointerGraceDismiss_ts_94f7e301: {
    label: "usePointerGraceDismiss.ts"
  }
}
`;case`webSource_dir_src_app_components_ui_d50d7a9b`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_ui_d50d7a9b: {
  label: "ui/ — 51 files"

  File_src_app_components_ui_accordion_tsx_9b9c9aa1: {
    label: "accordion.tsx"
  }
  File_src_app_components_ui_alert-dialog_tsx_55326597: {
    label: "alert-dialog.tsx"
  }
  File_src_app_components_ui_alert_tsx_3f7c2449: {
    label: "alert.tsx"
  }
  File_src_app_components_ui_aspect-ratio_tsx_53d5486b: {
    label: "aspect-ratio.tsx"
  }
  File_src_app_components_ui_avatar_tsx_ccb235d1: {
    label: "avatar.tsx"
  }
  File_src_app_components_ui_badge_tsx_f3ad240b: {
    label: "badge.tsx"
  }
  File_src_app_components_ui_breadcrumb_tsx_d6614188: {
    label: "breadcrumb.tsx"
  }
  File_src_app_components_ui_button_tsx_e4423dc4: {
    label: "button.tsx"
  }
  File_src_app_components_ui_calendar_test_tsx_342371f1: {
    label: "calendar.test.tsx"
  }
  File_src_app_components_ui_calendar_tsx_19671930: {
    label: "calendar.tsx"
  }
  File_src_app_components_ui_card_tsx_7924bd91: {
    label: "card.tsx"
  }
  File_src_app_components_ui_carousel_tsx_abfcdee6: {
    label: "carousel.tsx"
  }
  File_src_app_components_ui_chart_tsx_732d409b: {
    label: "chart.tsx"
  }
  File_src_app_components_ui_checkbox_tsx_298cbb8a: {
    label: "checkbox.tsx"
  }
  File_src_app_components_ui_collapsible_tsx_07cdb752: {
    label: "collapsible.tsx"
  }
  File_src_app_components_ui_command_tsx_8d80ecc1: {
    label: "command.tsx"
  }
  File_src_app_components_ui_context-menu_tsx_8951f02f: {
    label: "context-menu.tsx"
  }
  File_src_app_components_ui_dialog_tsx_ce41d0dc: {
    label: "dialog.tsx"
  }
  File_src_app_components_ui_drawer_tsx_e8b2a7c3: {
    label: "drawer.tsx"
  }
  File_src_app_components_ui_dropdown-menu_tsx_07cd2bba: {
    label: "dropdown-menu.tsx"
  }
  File_src_app_components_ui_form_tsx_45578644: {
    label: "form.tsx"
  }
  File_src_app_components_ui_hover-card_tsx_0c3a2338: {
    label: "hover-card.tsx"
  }
  File_src_app_components_ui_input-otp_tsx_81597eb1: {
    label: "input-otp.tsx"
  }
  File_src_app_components_ui_input_tsx_ce013656: {
    label: "input.tsx"
  }
  File_src_app_components_ui_label_tsx_5d88d0e8: {
    label: "label.tsx"
  }
  File_src_app_components_ui_menubar_tsx_36c61f3e: {
    label: "menubar.tsx"
  }
  File_src_app_components_ui_navigation-menu_tsx_569ed0d4: {
    label: "navigation-menu.tsx"
  }
  File_src_app_components_ui_pagination_tsx_fbe19235: {
    label: "pagination.tsx"
  }
  File_src_app_components_ui_popover_tsx_0995de66: {
    label: "popover.tsx"
  }
  File_src_app_components_ui_progress_tsx_58a97ca0: {
    label: "progress.tsx"
  }
  File_src_app_components_ui_radio-group_tsx_ec4f026c: {
    label: "radio-group.tsx"
  }
  File_src_app_components_ui_resizable_tsx_29ffc7d0: {
    label: "resizable.tsx"
  }
  File_src_app_components_ui_scroll-area_tsx_09297970: {
    label: "scroll-area.tsx"
  }
  File_src_app_components_ui_select_tsx_61aec7b8: {
    label: "select.tsx"
  }
  File_src_app_components_ui_separator_tsx_c24f3c9c: {
    label: "separator.tsx"
  }
  File_src_app_components_ui_settings_json_3bf4b9d7: {
    label: "settings.json"
  }
  File_src_app_components_ui_sheet_tsx_f22d30c0: {
    label: "sheet.tsx"
  }
  File_src_app_components_ui_sidebar_tsx_9fd4d181: {
    label: "sidebar.tsx"
  }
  File_src_app_components_ui_skeleton_tsx_34bc6c28: {
    label: "skeleton.tsx"
  }
  File_src_app_components_ui_slider_tsx_38bf3e34: {
    label: "slider.tsx"
  }
  File_src_app_components_ui_sonner_tsx_a3be7c3e: {
    label: "sonner.tsx"
  }
  File_src_app_components_ui_switch_tsx_6cd079f1: {
    label: "switch.tsx"
  }
  File_src_app_components_ui_table_tsx_fbc0f14f: {
    label: "table.tsx"
  }
  File_src_app_components_ui_tabs_tsx_62501315: {
    label: "tabs.tsx"
  }
  File_src_app_components_ui_textarea_tsx_792b9715: {
    label: "textarea.tsx"
  }
  File_src_app_components_ui_toggle-group_tsx_c9ad1763: {
    label: "toggle-group.tsx"
  }
  File_src_app_components_ui_toggle_tsx_d5748b86: {
    label: "toggle.tsx"
  }
  File_src_app_components_ui_tooltip_tsx_c9f197c8: {
    label: "tooltip.tsx"
  }
  File_p_components_ui_use-draggable-dialog-position_ts_4159efc9: {
    label: "use-draggable-dialog-position.ts"
  }
  File_src_app_components_ui_use-mobile_ts_a2613aa8: {
    label: "use-mobile.ts"
  }
  File_src_app_components_ui_utils_ts_9d071418: {
    label: "utils.ts"
  }
}
`;case`webSource_dir_src_app_components_workbench_dc7ebda3`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3: {
  label: "workbench/ — 8 files"

  Dir_src_app_components_workbench_state_3d11c6c0: {
    label: "state/ — 2 files"
  }
  File_rkbench_routeWorkbenchFrame_architecture_test_ts_aa30c209: {
    label: "routeWorkbenchFrame.architecture.test.ts"
  }
  File_omponents_workbench_RouteWorkbenchFrame_test_tsx_d9333b7f: {
    label: "RouteWorkbenchFrame.test.tsx"
  }
  File_app_components_workbench_RouteWorkbenchFrame_tsx_c8cbc6d9: {
    label: "RouteWorkbenchFrame.tsx"
  }
  File_omponents_workbench_routeWorkbenchTableTokens_ts_6869cffa: {
    label: "routeWorkbenchTableTokens.ts"
  }
  File_nts_workbench_WorkbenchPropertiesWindow_test_tsx_925dedfd: {
    label: "WorkbenchPropertiesWindow.test.tsx"
  }
  File_mponents_workbench_WorkbenchPropertiesWindow_tsx_f021ff78: {
    label: "WorkbenchPropertiesWindow.tsx"
  }
}
`;case`webSource_dir_src_app_components_workbench_state_3d11c6c0`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_components_5313f4e4Dir_src_app_components_workbench_dc7ebda3Dir_src_app_components_workbench_state_3d11c6c0: {
  label: "state/ — 2 files"

  File_ponents_workbench_state_WorkbenchStates_test_tsx_0d42c752: {
    label: "WorkbenchStates.test.tsx"
  }
  File_p_components_workbench_state_WorkbenchStates_tsx_02a71508: {
    label: "WorkbenchStates.tsx"
  }
}
`;case`webSource_dir_src_app_plugins_ce323325`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325: {
  label: "plugins/ — 119 files"

  Dir_src_app_plugins_contracts_26264c58: {
    label: "contracts/ — 5 files"
  }
  Dir_src_app_plugins_cost_24b9e165: {
    label: "cost/ — 3 files"
  }
  Dir_src_app_plugins_dbt_5b2fe63c: {
    label: "dbt/ — 10 files"
  }
  Dir_src_app_plugins_dvt_aaa64665: {
    label: "dvt/ — 9 files"
  }
  Dir_src_app_plugins_graph_b196690d: {
    label: "graph/ — 56 files"
  }
  Dir_src_app_plugins_httpJson_8d50c770: {
    label: "httpJson/ — 5 files"
  }
  Dir_src_app_plugins_monitoring_388fb118: {
    label: "monitoring/ — 2 files"
  }
  Dir_src_app_plugins_objectFilePostgres_3ee5eb2e: {
    label: "objectFilePostgres/ — 11 files"
  }
  File__app_plugins_canvasExecutionStrategyContracts_ts_1e21b7d1: {
    label: "canvasExecutionStrategyContracts.ts"
  }
  File_rc_app_plugins_canvasSurfaceStrategyContracts_ts_570a90be: {
    label: "canvasSurfaceStrategyContracts.ts"
  }
  File_src_app_plugins_createDeferredView_test_tsx_a4498058: {
    label: "createDeferredView.test.tsx"
  }
  File_src_app_plugins_createDeferredView_tsx_6539ace1: {
    label: "createDeferredView.tsx"
  }
  File_src_app_plugins_FallbackNodeRenderer_tsx_81bf0101: {
    label: "FallbackNodeRenderer.tsx"
  }
  File_src_app_plugins_graphStrategyContracts_ts_35f231db: {
    label: "graphStrategyContracts.ts"
  }
  File_src_app_plugins_graphStrategyRegistry_test_ts_55cf2689: {
    label: "graphStrategyRegistry.test.ts"
  }
  File_src_app_plugins_graphStrategyRegistry_ts_dadbc611: {
    label: "graphStrategyRegistry.ts"
  }
  File_src_app_plugins_mergeDecorations_ts_8c1a982c: {
    label: "mergeDecorations.ts"
  }
  File_src_app_plugins_nodeTypeCatalog_dbt_ts_be2cf04b: {
    label: "nodeTypeCatalog.dbt.ts"
  }
  File_src_app_plugins_nodeTypeCatalog_ts_faad5561: {
    label: "nodeTypeCatalog.ts"
  }
  File_src_app_plugins_nodeTypeContracts_ts_5a607f3c: {
    label: "nodeTypeContracts.ts"
  }
  File_src_app_plugins_nodeTypeRegistry_ts_61179ac4: {
    label: "nodeTypeRegistry.ts"
  }
  File__app_plugins_PluginContributionBoundary_test_tsx_1284551c: {
    label: "PluginContributionBoundary.test.tsx"
  }
  File_src_app_plugins_PluginContributionBoundary_tsx_00e98e0b: {
    label: "PluginContributionBoundary.tsx"
  }
  File_ins_pluginRuntimeProjection_architecture_test_ts_4170b170: {
    label: "pluginRuntimeProjection.architecture.test.ts"
  }
  File_src_app_plugins_registry_test_ts_5dc36ba8: {
    label: "registry.test.ts"
  }
  File_src_app_plugins_registry_ts_f7f1db8d: {
    label: "registry.ts"
  }
}
`;case`webSource_dir_src_app_plugins_contracts_26264c58`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_contracts_26264c58: {
  label: "contracts/ — 5 files"

  File_rc_app_plugins_contracts_ConnectionRules_test_ts_2cc35acd: {
    label: "ConnectionRules.test.ts"
  }
  File_src_app_plugins_contracts_ConnectionRules_ts_8346bcb3: {
    label: "ConnectionRules.ts"
  }
  File_src_app_plugins_contracts_NodeCostData_ts_751b12e8: {
    label: "NodeCostData.ts"
  }
  File_src_app_plugins_contracts_NodeRendering_ts_21032903: {
    label: "NodeRendering.ts"
  }
  File_src_app_plugins_contracts_PluginManifest_ts_0e3b7fa9: {
    label: "PluginManifest.ts"
  }
}
`;case`webSource_dir_src_app_plugins_cost_24b9e165`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_cost_24b9e165: {
  label: "cost/ — 3 files"

  File_src_app_plugins_cost_costContributions_test_ts_9719268e: {
    label: "costContributions.test.ts"
  }
  File_src_app_plugins_cost_costContributions_ts_babed869: {
    label: "costContributions.ts"
  }
  File_src_app_plugins_cost_costRouteHandle_ts_d27fdb39: {
    label: "costRouteHandle.ts"
  }
}
`;case`webSource_dir_src_app_plugins_dbt_5b2fe63c`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dbt_5b2fe63c: {
  label: "dbt/ — 10 files"

  File_src_app_plugins_dbt_dbtCanvasSurfaceStrategy_ts_daf73293: {
    label: "dbtCanvasSurfaceStrategy.ts"
  }
  File_ns_dbt_dbtContributions_authoringCatalog_test_ts_d6a74dfb: {
    label: "dbtContributions.authoringCatalog.test.ts"
  }
  File_ins_dbt_dbtContributions_connectionRules_test_ts_0ff086e4: {
    label: "dbtContributions.connectionRules.test.ts"
  }
  File_src_app_plugins_dbt_dbtContributions_ts_65fe8911: {
    label: "dbtContributions.ts"
  }
  File_src_app_plugins_dbt_dbtGraphNodeCardStrategy_ts_10ab6f1b: {
    label: "dbtGraphNodeCardStrategy.ts"
  }
  File_src_app_plugins_dbt_dbtNodeAdapter_test_ts_18cf50d7: {
    label: "dbtNodeAdapter.test.ts"
  }
  File_src_app_plugins_dbt_dbtNodeAdapter_ts_511686a3: {
    label: "dbtNodeAdapter.ts"
  }
  File_src_app_plugins_dbt_DbtNodeRenderer_test_tsx_92f4aeb2: {
    label: "DbtNodeRenderer.test.tsx"
  }
  File_src_app_plugins_dbt_DbtNodeRenderer_tsx_7bf9d4ac: {
    label: "DbtNodeRenderer.tsx"
  }
  File_ugins_dbt_dbtProjectFileCanvasSurfaceStrategy_ts_b913d037: {
    label: "dbtProjectFileCanvasSurfaceStrategy.ts"
  }
}
`;case`webSource_dir_src_app_plugins_dvt_aaa64665`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_dvt_aaa64665: {
  label: "dvt/ — 9 files"

  File_src_app_plugins_dvt_dvtCanvasSurfaceStrategy_ts_5660b651: {
    label: "dvtCanvasSurfaceStrategy.ts"
  }
  File_lugins_dvt_dvtContributions_architecture_test_ts_95b50d13: {
    label: "dvtContributions.architecture.test.ts"
  }
  File_ins_dvt_dvtContributions_connectionRules_test_ts_b32d5257: {
    label: "dvtContributions.connectionRules.test.ts"
  }
  File_src_app_plugins_dvt_dvtContributions_ts_2e09d5c6: {
    label: "dvtContributions.ts"
  }
  File_src_app_plugins_dvt_dvtGraphNodeCardStrategy_ts_d0f25440: {
    label: "dvtGraphNodeCardStrategy.ts"
  }
  File_p_plugins_dvt_dvtGraphNodeSemanticMetric_test_ts_f7f98a31: {
    label: "dvtGraphNodeSemanticMetric.test.ts"
  }
  File_rc_app_plugins_dvt_dvtGraphNodeSemanticMetric_ts_9d64a570: {
    label: "dvtGraphNodeSemanticMetric.ts"
  }
  File_src_app_plugins_dvt_dvtNodeTypeCatalog_ts_1fea4b4c: {
    label: "dvtNodeTypeCatalog.ts"
  }
  File_c_app_plugins_dvt_transformationGraphStrategy_ts_7362ec64: {
    label: "transformationGraphStrategy.ts"
  }
}
`;case`webSource_dir_src_app_plugins_graph_b196690d`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_graph_b196690d: {
  label: "graph/ — 56 files"

  File_pp_plugins_graph_defaultGraphNodeCardStrategy_ts_f282fd6e: {
    label: "defaultGraphNodeCardStrategy.ts"
  }
  File_app_plugins_graph_GraphNodeAlgebraicDropZone_tsx_323afa6b: {
    label: "GraphNodeAlgebraicDropZone.tsx"
  }
  File_ins_graph_GraphNodeCalculatedColumnForm_test_tsx_eb324060: {
    label: "GraphNodeCalculatedColumnForm.test.tsx"
  }
  File__plugins_graph_GraphNodeCalculatedColumnForm_tsx_671c475c: {
    label: "GraphNodeCalculatedColumnForm.tsx"
  }
  File_src_app_plugins_graph_graphNodeCardCopyTokens_ts_abf0228d: {
    label: "graphNodeCardCopyTokens.ts"
  }
  File__plugins_graph_graphNodeCardPresentation_test_ts_9e524ef5: {
    label: "graphNodeCardPresentation.test.ts"
  }
  File_raph_graphNodeCardReadModel_architecture_test_ts_27e02930: {
    label: "graphNodeCardReadModel.architecture.test.ts"
  }
  File_app_plugins_graph_graphNodeCardReadModel_test_ts_3c39d1fc: {
    label: "graphNodeCardReadModel.test.ts"
  }
  File_src_app_plugins_graph_graphNodeCardReadModel_ts_e8bab013: {
    label: "graphNodeCardReadModel.ts"
  }
  File__plugins_graph_graphNodeCardStrategyContracts_ts_93873d23: {
    label: "graphNodeCardStrategyContracts.ts"
  }
  File__app_plugins_graph_graphNodeCardStrategyUtils_ts_79b0da4b: {
    label: "graphNodeCardStrategyUtils.ts"
  }
  File_src_app_plugins_graph_GraphNodeCardView_test_tsx_af7ab3cc: {
    label: "GraphNodeCardView.test.tsx"
  }
  File_src_app_plugins_graph_GraphNodeCardView_tsx_3565ef96: {
    label: "GraphNodeCardView.tsx"
  }
  File_s_graph_GraphNodeColumnChildren_reorder_test_tsx_fa977fa1: {
    label: "GraphNodeColumnChildren.reorder.test.tsx"
  }
  File_rc_app_plugins_graph_GraphNodeColumnChildren_tsx_851fdef9: {
    label: "GraphNodeColumnChildren.tsx"
  }
  File_ins_graph_GraphNodeColumnCommentTooltip_test_tsx_01f33cd0: {
    label: "GraphNodeColumnCommentTooltip.test.tsx"
  }
  File_plugins_graph_GraphNodeColumnCompositionMenu_tsx_726fb709: {
    label: "GraphNodeColumnCompositionMenu.tsx"
  }
  File_p_plugins_graph_graphNodeColumnContracts_test_ts_fd1fa9e7: {
    label: "graphNodeColumnContracts.test.ts"
  }
  File_rc_app_plugins_graph_graphNodeColumnContracts_ts_12caf316: {
    label: "graphNodeColumnContracts.ts"
  }
  File_ins_graph_GraphNodeColumnDropCompositionFlow_tsx_62ee9077: {
    label: "GraphNodeColumnDropCompositionFlow.tsx"
  }
  File_ugins_graph_GraphNodeColumnFunctionAliasForm_tsx_7f4b6996: {
    label: "GraphNodeColumnFunctionAliasForm.tsx"
  }
  File_raphNodeColumnFunctionMenu_pointerGrace_test_tsx_c4f72939: {
    label: "GraphNodeColumnFunctionMenu.pointerGrace.test.tsx"
  }
  File_pp_plugins_graph_GraphNodeColumnFunctionMenu_tsx_a345687e: {
    label: "GraphNodeColumnFunctionMenu.tsx"
  }
  File_graph_GraphNodeColumnOrder_schemaChange_test_tsx_c5320cb7: {
    label: "GraphNodeColumnOrder.schemaChange.test.tsx"
  }
  File_src_app_plugins_graph_GraphNodeColumnPiece_tsx_bf6d6404: {
    label: "GraphNodeColumnPiece.tsx"
  }
  File_src_app_plugins_graph_GraphNodeColumnRow_tsx_a78313bc: {
    label: "GraphNodeColumnRow.tsx"
  }
  File_raph_GraphNodeColumnSection_composition_test_tsx_c39068e6: {
    label: "GraphNodeColumnSection.composition.test.tsx"
  }
  File_hNodeColumnSection_controlledDisclosure_test_tsx_7d32cefe: {
    label: "GraphNodeColumnSection.controlledDisclosure.test.tsx"
  }
  File__GraphNodeColumnSection_inactiveReorder_test_tsx_0cf3acfc: {
    label: "GraphNodeColumnSection.inactiveReorder.test.tsx"
  }
  File_NodeColumnSection_structuredComposition_test_tsx_2799448b: {
    label: "GraphNodeColumnSection.structuredComposition.test.tsx"
  }
  File_pp_plugins_graph_GraphNodeColumnSection_test_tsx_8b35f882: {
    label: "GraphNodeColumnSection.test.tsx"
  }
  File_src_app_plugins_graph_GraphNodeColumnSection_tsx_2b7cb82b: {
    label: "GraphNodeColumnSection.tsx"
  }
  File_lugins_graph_GraphNodeHealthPopoverView_test_tsx_2851a3e6: {
    label: "GraphNodeHealthPopoverView.test.tsx"
  }
  File_app_plugins_graph_GraphNodeHealthPopoverView_tsx_03a9fb7e: {
    label: "GraphNodeHealthPopoverView.tsx"
  }
  File_pp_plugins_graph_GraphNodeMetricHotspot_test_tsx_074a6c36: {
    label: "GraphNodeMetricHotspot.test.tsx"
  }
  File_src_app_plugins_graph_GraphNodeMetricHotspot_tsx_d0ba9143: {
    label: "GraphNodeMetricHotspot.tsx"
  }
  File_rc_app_plugins_graph_GraphNodeMetricRow_test_tsx_76dbeebf: {
    label: "GraphNodeMetricRow.test.tsx"
  }
  File_src_app_plugins_graph_GraphNodeMetricRow_tsx_2ac4f12e: {
    label: "GraphNodeMetricRow.tsx"
  }
  File__plugins_graph_GraphNodeOperationalRail_test_tsx_7c11f776: {
    label: "GraphNodeOperationalRail.test.tsx"
  }
  File_c_app_plugins_graph_GraphNodeOperationalRail_tsx_3b96a9e8: {
    label: "GraphNodeOperationalRail.tsx"
  }
  File_lugins_graph_graphNodeOperationalSummary_test_ts_df6860d0: {
    label: "graphNodeOperationalSummary.test.ts"
  }
  File_app_plugins_graph_graphNodeOperationalSummary_ts_2362af71: {
    label: "graphNodeOperationalSummary.ts"
  }
  File_src_app_plugins_graph_GraphNodeRenderer_tsx_22005501: {
    label: "GraphNodeRenderer.tsx"
  }
  File_ns_graph_graphNodeSourceMetricProjection_test_ts_cf21eb7a: {
    label: "graphNodeSourceMetricProjection.test.ts"
  }
  File_plugins_graph_graphNodeSourceMetricProjection_ts_825475f6: {
    label: "graphNodeSourceMetricProjection.ts"
  }
  File_pp_plugins_graph_graphNodeStructuredFieldCopy_ts_926aae0e: {
    label: "graphNodeStructuredFieldCopy.ts"
  }
  File_p_plugins_graph_GraphNodeStructuredFieldForm_tsx_c51e0883: {
    label: "GraphNodeStructuredFieldForm.tsx"
  }
  File_src_app_plugins_graph_GraphNodeTagList_test_tsx_199d5ef7: {
    label: "GraphNodeTagList.test.tsx"
  }
  File_src_app_plugins_graph_GraphNodeTagList_tsx_36779d77: {
    label: "GraphNodeTagList.tsx"
  }
  File_plugins_graph_graphNodeTitlePresentation_test_ts_edcb36ec: {
    label: "graphNodeTitlePresentation.test.ts"
  }
  File__app_plugins_graph_graphNodeTitlePresentation_ts_f507c579: {
    label: "graphNodeTitlePresentation.ts"
  }
  File_graphVisualTokenConvergence_architecture_test_ts_475bb603: {
    label: "graphVisualTokenConvergence.architecture.test.ts"
  }
  File_src_app_plugins_graph_graphVisualTokens_ts_ad75512e: {
    label: "graphVisualTokens.ts"
  }
  File_src_app_plugins_graph_useGraphNodeColumnOrder_ts_a9d092fd: {
    label: "useGraphNodeColumnOrder.ts"
  }
  File_c_app_plugins_graph_useGraphNodeColumnReorder_ts_12cd2c67: {
    label: "useGraphNodeColumnReorder.ts"
  }
  File__plugins_graph_useGraphNodeColumnSectionState_ts_004ecf91: {
    label: "useGraphNodeColumnSectionState.ts"
  }
}
`;case`webSource_dir_src_app_plugins_httpJson_8d50c770`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_httpJson_8d50c770: {
  label: "httpJson/ — 5 files"

  File_ttpJson_HttpJsonArtifactAuthoringFields_test_tsx_1c439e29: {
    label: "HttpJsonArtifactAuthoringFields.test.tsx"
  }
  File_ins_httpJson_HttpJsonArtifactAuthoringFields_tsx_eb6085a1: {
    label: "HttpJsonArtifactAuthoringFields.tsx"
  }
  File_p_plugins_httpJson_httpJsonContributions_test_ts_773323b6: {
    label: "httpJsonContributions.test.ts"
  }
  File_rc_app_plugins_httpJson_httpJsonContributions_ts_d85ccbfd: {
    label: "httpJsonContributions.ts"
  }
  File__app_plugins_httpJson_httpJsonNodeTypeCatalog_ts_11246085: {
    label: "httpJsonNodeTypeCatalog.ts"
  }
}
`;case`webSource_dir_src_app_plugins_monitoring_388fb118`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_monitoring_388fb118: {
  label: "monitoring/ — 2 files"

  File_ugins_monitoring_monitoringContributions_test_ts_9d302b5e: {
    label: "monitoringContributions.test.ts"
  }
  File_pp_plugins_monitoring_monitoringContributions_ts_5dd365e4: {
    label: "monitoringContributions.ts"
  }
}
`;case`webSource_dir_src_app_plugins_objectFilePostgres_3ee5eb2e`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_plugins_ce323325Dir_src_app_plugins_objectFilePostgres_3ee5eb2e: {
  label: "objectFilePostgres/ — 11 files"

  File_tgres_ObjectFilePostgresAuthoringFields_test_tsx_491b4046: {
    label: "ObjectFilePostgresAuthoringFields.test.tsx"
  }
  File_lePostgres_ObjectFilePostgresAuthoringFields_tsx_18293e65: {
    label: "ObjectFilePostgresAuthoringFields.tsx"
  }
  File_tgres_objectFilePostgresAuthoringFields_types_ts_5a3fe759: {
    label: "objectFilePostgresAuthoringFields.types.ts"
  }
  File_tgres_objectFilePostgresAuthoringVisualTokens_ts_0a443d2c: {
    label: "objectFilePostgresAuthoringVisualTokens.ts"
  }
  File_tFilePostgres_ObjectFilePostgresColumnFields_tsx_76683d05: {
    label: "ObjectFilePostgresColumnFields.tsx"
  }
  File_Postgres_objectFilePostgresContributions_test_ts_3fa46f67: {
    label: "objectFilePostgresContributions.test.ts"
  }
  File_tFilePostgres_objectFilePostgresContributions_ts_13546793: {
    label: "objectFilePostgresContributions.ts"
  }
  File_ectFilePostgres_ObjectFilePostgresFieldError_tsx_762858eb: {
    label: "ObjectFilePostgresFieldError.tsx"
  }
  File_ilePostgres_objectFilePostgresNodeTypeCatalog_ts_93c0c7bf: {
    label: "objectFilePostgresNodeTypeCatalog.ts"
  }
  File_tFilePostgres_ObjectFilePostgresSourceFields_tsx_b74ebd3c: {
    label: "ObjectFilePostgresSourceFields.tsx"
  }
  File_tFilePostgres_ObjectFilePostgresTargetFields_tsx_3b5eff11: {
    label: "ObjectFilePostgresTargetFields.tsx"
  }
}
`;case`webSource_dir_src_app_ports_974b1bd3`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_ports_974b1bd3: {
  label: "ports/ — 16 files"

  File_src_app_ports_capabilities_ts_a540cdba: {
    label: "capabilities.ts"
  }
  File_src_app_ports_cost_ts_406c5280: {
    label: "cost.ts"
  }
  File_src_app_ports_dbtProjectGraph_ts_53349d7b: {
    label: "dbtProjectGraph.ts"
  }
  File_src_app_ports_dbtProjectImport_ts_89c0e6c3: {
    label: "dbtProjectImport.ts"
  }
  File_src_app_ports_dbtYamlDescriptionEdit_ts_376e3e2f: {
    label: "dbtYamlDescriptionEdit.ts"
  }
  File_src_app_ports_frontendOperability_ts_722d0b41: {
    label: "frontendOperability.ts"
  }
  File_src_app_ports_graphDbtModelCompilation_ts_0c0c8654: {
    label: "graphDbtModelCompilation.ts"
  }
  File_pp_ports_graphDbtWorkspaceArtifactPublication_ts_a489ab38: {
    label: "graphDbtWorkspaceArtifactPublication.ts"
  }
  File_src_app_ports_index_ts_5f7c34f0: {
    label: "index.ts"
  }
  File_src_app_ports_plans_ts_03778059: {
    label: "plans.ts"
  }
  File_src_app_ports_runs_ts_0377ef3e: {
    label: "runs.ts"
  }
  File_src_app_ports_sessionContext_ts_285b3029: {
    label: "sessionContext.ts"
  }
  File_src_app_ports_shellFeedback_ts_4cdfdf2c: {
    label: "shellFeedback.ts"
  }
  File_src_app_ports_workspace_ts_c42ae6c8: {
    label: "workspace.ts"
  }
  File_src_app_ports_workspaceGraphDraftAuthoring_ts_e1818046: {
    label: "workspaceGraphDraftAuthoring.ts"
  }
  File_src_app_ports_workspaceScopeSelection_ts_32d6bc25: {
    label: "workspaceScopeSelection.ts"
  }
}
`;case`webSource_dir_src_app_queries_16225311`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_queries_16225311: {
  label: "queries/ — 13 files"

  File_src_app_queries_costQueries_ts_d533cda7: {
    label: "costQueries.ts"
  }
  File_src_app_queries_dbtProjectQueries_ts_0b1c8a84: {
    label: "dbtProjectQueries.ts"
  }
  File__app_queries_queryKeyPolicy_architecture_test_ts_0dce7a3e: {
    label: "queryKeyPolicy.architecture.test.ts"
  }
  File_src_app_queries_queryKeys_ts_637d2e73: {
    label: "queryKeys.ts"
  }
  File_src_app_queries_runEventFeedQuery_test_tsx_dc6e9241: {
    label: "runEventFeedQuery.test.tsx"
  }
  File_src_app_queries_runEventFeedQuery_ts_bb07e576: {
    label: "runEventFeedQuery.ts"
  }
  File_src_app_queries_runsQueries_ts_6085d95e: {
    label: "runsQueries.ts"
  }
  File_src_app_queries_useCapabilitiesQuery_test_tsx_523c9295: {
    label: "useCapabilitiesQuery.test.tsx"
  }
  File_src_app_queries_useCapabilitiesQuery_ts_05733880: {
    label: "useCapabilitiesQuery.ts"
  }
  File_src_app_queries_workspaceArtifactPolicy_test_ts_298df4e9: {
    label: "workspaceArtifactPolicy.test.ts"
  }
  File_src_app_queries_workspaceArtifactPolicy_ts_093f6417: {
    label: "workspaceArtifactPolicy.ts"
  }
  File_src_app_queries_workspaceQueries_scope_test_tsx_0498960e: {
    label: "workspaceQueries.scope.test.tsx"
  }
  File_src_app_queries_workspaceQueries_ts_1a07b616: {
    label: "workspaceQueries.ts"
  }
}
`;case`webSource_dir_src_app_routes_e22c046b`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_routes_e22c046b: {
  label: "routes/ — 2 files"

  File_utes_internalAlphaRouteGate_architecture_test_ts_2d7ef1a4: {
    label: "internalAlphaRouteGate.architecture.test.ts"
  }
  File_p_routes_internalAlphaRouteGate_test_fixtures_ts_c899b067: {
    label: "internalAlphaRouteGate.test.fixtures.ts"
  }
}
`;case`webSource_dir_src_app_services_79afb037`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037: {
  label: "services/ — 110 files"

  Dir_src_app_services_api_57520c3d: {
    label: "api/ — 7 files"
  }
  Dir_src_app_services_capabilities_750df37c: {
    label: "capabilities/ — 1 files"
  }
  Dir_src_app_services_composition_4d0549d6: {
    label: "composition/ — 5 files"
  }
  Dir_src_app_services_config_fc8fdb10: {
    label: "config/ — 1 files"
  }
  Dir_src_app_services_cost_c6f6df99: {
    label: "cost/ — 3 files"
  }
  Dir_src_app_services_dbtProject_d1f0e25c: {
    label: "dbtProject/ — 10 files"
  }
  Dir_src_app_services_feedback_f76a4189: {
    label: "feedback/ — 1 files"
  }
  Dir_src_app_services_idempotency_143015d7: {
    label: "idempotency/ — 2 files"
  }
  Dir_src_app_services_operability_47d43dcf: {
    label: "operability/ — 6 files"
  }
  Dir_src_app_services_plans_80f8c333: {
    label: "plans/ — 5 files"
  }
  Dir_src_app_services_projectOnboarding_59751818: {
    label: "projectOnboarding/ — 4 files"
  }
  Dir_src_app_services_runs_06125c4c: {
    label: "runs/ — 25 files"
  }
  Dir_src_app_services_session_15ea124f: {
    label: "session/ — 7 files"
  }
  Dir_src_app_services_workspace_79b02c95: {
    label: "workspace/ — 31 files"
  }
  File_src_app_services_AppServicesContext_test_tsx_64eee063: {
    label: "AppServicesContext.test.tsx"
  }
  File_src_app_services_AppServicesContext_tsx_d5ab72b1: {
    label: "AppServicesContext.tsx"
  }
}
`;case`webSource_dir_src_app_services_api_57520c3d`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_api_57520c3d: {
  label: "api/ — 7 files"

  File_src_app_services_api_apiAuthConfig_ts_06e2ddce: {
    label: "apiAuthConfig.ts"
  }
  File_src_app_services_api_classifyHttpError_test_ts_b6b9f967: {
    label: "classifyHttpError.test.ts"
  }
  File_src_app_services_api_classifyHttpError_ts_50f38b5f: {
    label: "classifyHttpError.ts"
  }
  File_src_app_services_api_createApiClient_test_ts_0afad1c8: {
    label: "createApiClient.test.ts"
  }
  File_src_app_services_api_createApiClient_ts_6ba916dc: {
    label: "createApiClient.ts"
  }
  File_p_services_api_protectedRuntimeRejection_test_ts_34fa2152: {
    label: "protectedRuntimeRejection.test.ts"
  }
  File_rc_app_services_api_protectedRuntimeRejection_ts_ea000922: {
    label: "protectedRuntimeRejection.ts"
  }
}
`;case`webSource_dir_src_app_services_capabilities_750df37c`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_capabilities_750df37c: {
  label: "capabilities/ — 1 files"

  File_rc_app_services_capabilities_capabilitiesPort_ts_991b18d2: {
    label: "capabilitiesPort.ts"
  }
}
`;case`webSource_dir_src_app_services_composition_4d0549d6`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_composition_4d0549d6: {
  label: "composition/ — 5 files"

  File_ices_composition_appServices_operability_test_ts_a60af2df: {
    label: "appServices.operability.test.ts"
  }
  File_src_app_services_composition_appServices_test_ts_3c61ffae: {
    label: "appServices.test.ts"
  }
  File_src_app_services_composition_appServices_ts_2ce92294: {
    label: "appServices.ts"
  }
  File_appServicesAuthorityHardcut_architecture_test_ts_250d707f: {
    label: "appServicesAuthorityHardcut.architecture.test.ts"
  }
  File_tion_appServicesMockHardcut_architecture_test_ts_3a1dade3: {
    label: "appServicesMockHardcut.architecture.test.ts"
  }
}
`;case`webSource_dir_src_app_services_config_fc8fdb10`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_config_fc8fdb10: {
  label: "config/ — 1 files"

  File_src_app_services_config_workspaceConfig_ts_173dc8f1: {
    label: "workspaceConfig.ts"
  }
}
`;case`webSource_dir_src_app_services_cost_c6f6df99`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_cost_c6f6df99: {
  label: "cost/ — 3 files"

  File_src_app_services_cost_costApiDecoders_ts_0dff5e22: {
    label: "costApiDecoders.ts"
  }
  File_src_app_services_cost_costService_api_test_ts_9e307cdc: {
    label: "costService.api.test.ts"
  }
  File_src_app_services_cost_costService_api_ts_872941ad: {
    label: "costService.api.ts"
  }
}
`;case`webSource_dir_src_app_services_dbtProject_d1f0e25c`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_dbtProject_d1f0e25c: {
  label: "dbtProject/ — 10 files"

  File__services_dbtProject_dbtProjectGraph_api_test_ts_0d74d83d: {
    label: "dbtProjectGraph.api.test.ts"
  }
  File_c_app_services_dbtProject_dbtProjectGraph_api_ts_fbb8df0a: {
    label: "dbtProjectGraph.api.ts"
  }
  File_services_dbtProject_dbtProjectImport_api_test_ts_840205e5: {
    label: "dbtProjectImport.api.test.ts"
  }
  File__app_services_dbtProject_dbtProjectImport_api_ts_cd5e8cec: {
    label: "dbtProjectImport.api.ts"
  }
  File_es_dbtProject_dbtYamlDescriptionEdit_api_test_ts_1a2c5de4: {
    label: "dbtYamlDescriptionEdit.api.test.ts"
  }
  File_ervices_dbtProject_dbtYamlDescriptionEdit_api_ts_c2ba3dad: {
    label: "dbtYamlDescriptionEdit.api.ts"
  }
  File__dbtProject_graphDbtModelCompilation_api_test_ts_9cc725ef: {
    label: "graphDbtModelCompilation.api.test.ts"
  }
  File_vices_dbtProject_graphDbtModelCompilation_api_ts_ea2fdc2a: {
    label: "graphDbtModelCompilation.api.ts"
  }
  File_graphDbtWorkspaceArtifactPublication_api_test_ts_a0b9d351: {
    label: "graphDbtWorkspaceArtifactPublication.api.test.ts"
  }
  File_ject_graphDbtWorkspaceArtifactPublication_api_ts_9b461ce7: {
    label: "graphDbtWorkspaceArtifactPublication.api.ts"
  }
}
`;case`webSource_dir_src_app_services_feedback_f76a4189`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_feedback_f76a4189: {
  label: "feedback/ — 1 files"

  File_src_app_services_feedback_shellFeedbackPort_ts_390b0817: {
    label: "shellFeedbackPort.ts"
  }
}
`;case`webSource_dir_src_app_services_idempotency_143015d7`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_idempotency_143015d7: {
  label: "idempotency/ — 2 files"

  File__idempotency_createBrowserIdempotencyKey_test_ts_7fa25467: {
    label: "createBrowserIdempotencyKey.test.ts"
  }
  File_vices_idempotency_createBrowserIdempotencyKey_ts_71e79347: {
    label: "createBrowserIdempotencyKey.ts"
  }
}
`;case`webSource_dir_src_app_services_operability_47d43dcf`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_operability_47d43dcf: {
  label: "operability/ — 6 files"

  File_erability_consoleFrontendOperabilitySink_test_ts_97eb7e00: {
    label: "consoleFrontendOperabilitySink.test.ts"
  }
  File_es_operability_consoleFrontendOperabilitySink_ts_9a5747b6: {
    label: "consoleFrontendOperabilitySink.ts"
  }
  File__operability_frontendOperabilityRecorder_test_ts_97724277: {
    label: "frontendOperabilityRecorder.test.ts"
  }
  File_vices_operability_frontendOperabilityRecorder_ts_c020343a: {
    label: "frontendOperabilityRecorder.ts"
  }
  File_bility_useFrontendOperabilityTransition_test_tsx_31d98694: {
    label: "useFrontendOperabilityTransition.test.tsx"
  }
  File__operability_useFrontendOperabilityTransition_ts_eb4b2a19: {
    label: "useFrontendOperabilityTransition.ts"
  }
}
`;case`webSource_dir_src_app_services_plans_80f8c333`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_plans_80f8c333: {
  label: "plans/ — 5 files"

  File_src_app_services_plans_plansService_api_ts_6afbcc60: {
    label: "plansService.api.ts"
  }
  File_c_app_services_plans_plansService_import_test_ts_ad688932: {
    label: "plansService.import.test.ts"
  }
  File__app_services_plans_plansService_preview_test_ts_57099cd1: {
    label: "plansService.preview.test.ts"
  }
  File__app_services_plans_plansService_test_support_ts_39ce80b7: {
    label: "plansService.test.support.ts"
  }
  File_src_app_services_plans_plansService_ts_4b708d52: {
    label: "plansService.ts"
  }
}
`;case`webSource_dir_src_app_services_projectOnboarding_59751818`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_projectOnboarding_59751818: {
  label: "projectOnboarding/ — 4 files"

  File_ojectOnboarding_activateProjectWorkspace_test_ts_bca2ecdf: {
    label: "activateProjectWorkspace.test.ts"
  }
  File_es_projectOnboarding_activateProjectWorkspace_ts_a6e145fd: {
    label: "activateProjectWorkspace.ts"
  }
  File_ojectOnboarding_projectOnboardingService_test_ts_3d6fdd6e: {
    label: "projectOnboardingService.test.ts"
  }
  File_es_projectOnboarding_projectOnboardingService_ts_d47d4a15: {
    label: "projectOnboardingService.ts"
  }
}
`;case`webSource_dir_src_app_services_runs_06125c4c`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_runs_06125c4c: {
  label: "runs/ — 25 files"

  File_app_services_runs_recoveryIdempotencyKeyStore_ts_baf555d0: {
    label: "recoveryIdempotencyKeyStore.ts"
  }
  File_src_app_services_runs_runControlCommandModel_ts_b397fa00: {
    label: "runControlCommandModel.ts"
  }
  File_app_services_runs_runEventFeedHealthCopy_test_ts_7d4f23d7: {
    label: "runEventFeedHealthCopy.test.ts"
  }
  File_src_app_services_runs_runEventFeedHealthCopy_ts_b96471e4: {
    label: "runEventFeedHealthCopy.ts"
  }
  File_pp_services_runs_runEventFeedHealthModel_test_ts_f049c0ce: {
    label: "runEventFeedHealthModel.test.ts"
  }
  File_src_app_services_runs_runEventFeedHealthModel_ts_0a4fd7ca: {
    label: "runEventFeedHealthModel.ts"
  }
  File_rvices_runs_runEventFeedModel_guardrails_test_ts_beebaf83: {
    label: "runEventFeedModel.guardrails.test.ts"
  }
  File_vices_runs_runEventFeedModel_transitions_test_ts_9f7c5922: {
    label: "runEventFeedModel.transitions.test.ts"
  }
  File_src_app_services_runs_runEventFeedModel_ts_8ba17395: {
    label: "runEventFeedModel.ts"
  }
  File_p_services_runs_runEventPresentationCopy_test_ts_9e2f52bb: {
    label: "runEventPresentationCopy.test.ts"
  }
  File_rc_app_services_runs_runEventPresentationCopy_ts_0e13623b: {
    label: "runEventPresentationCopy.ts"
  }
  File__services_runs_runEventPresentationModel_test_ts_47877439: {
    label: "runEventPresentationModel.test.ts"
  }
  File_c_app_services_runs_runEventPresentationModel_ts_5e799b01: {
    label: "runEventPresentationModel.ts"
  }
  File__app_services_runs_runEventTimelineModel_test_ts_a94ec922: {
    label: "runEventTimelineModel.test.ts"
  }
  File_src_app_services_runs_runEventTimelineModel_ts_d6bcfe0b: {
    label: "runEventTimelineModel.ts"
  }
  File_src_app_services_runs_runsApiDecoders_ts_096462b2: {
    label: "runsApiDecoders.ts"
  }
  File_src_app_services_runs_runsApiPayloads_test_ts_6c13d39c: {
    label: "runsApiPayloads.test.ts"
  }
  File_src_app_services_runs_runsApiPayloads_ts_9d08e085: {
    label: "runsApiPayloads.ts"
  }
  File__app_services_runs_runsApiSnapshotMapper_test_ts_16b9733b: {
    label: "runsApiSnapshotMapper.test.ts"
  }
  File_src_app_services_runs_runsApiSnapshotMapper_ts_6e22395d: {
    label: "runsApiSnapshotMapper.ts"
  }
  File_src_app_services_runs_runsService_api_ts_c7dc2cc4: {
    label: "runsService.api.ts"
  }
  File_src_app_services_runs_runsService_test_ts_635e563e: {
    label: "runsService.test.ts"
  }
  File_src_app_services_runs_runsService_ts_df736d4f: {
    label: "runsService.ts"
  }
  File_src_app_services_runs_runWorkspaceModel_test_ts_46fb8b64: {
    label: "runWorkspaceModel.test.ts"
  }
  File_src_app_services_runs_runWorkspaceModel_ts_6f758595: {
    label: "runWorkspaceModel.ts"
  }
}
`;case`webSource_dir_src_app_services_session_15ea124f`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_session_15ea124f: {
  label: "session/ — 7 files"

  File_rotectedRouteSessionContext_architecture_test_ts_21ed607f: {
    label: "protectedRouteSessionContext.architecture.test.ts"
  }
  File_ces_session_protectedRouteSessionContext_test_ts_2cc1ca03: {
    label: "protectedRouteSessionContext.test.ts"
  }
  File_services_session_protectedRouteSessionContext_ts_4fa6fca2: {
    label: "protectedRouteSessionContext.ts"
  }
  File__app_services_session_sessionContextPort_test_ts_81f86d4d: {
    label: "sessionContextPort.test.ts"
  }
  File_src_app_services_session_sessionContextPort_ts_4267cd35: {
    label: "sessionContextPort.ts"
  }
  File_ices_session_workspaceScopeSelectionPort_test_ts_ac3bc31f: {
    label: "workspaceScopeSelectionPort.test.ts"
  }
  File__services_session_workspaceScopeSelectionPort_ts_e8de0a68: {
    label: "workspaceScopeSelectionPort.ts"
  }
}
`;case`webSource_dir_src_app_services_workspace_79b02c95`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_services_79afb037Dir_src_app_services_workspace_79b02c95: {
  label: "workspace/ — 31 files"

  File_ces_workspace_sourceObjectMetricEvidence_test_ts_05b476e9: {
    label: "sourceObjectMetricEvidence.test.ts"
  }
  File_services_workspace_sourceObjectMetricEvidence_ts_100328ba: {
    label: "sourceObjectMetricEvidence.ts"
  }
  File_e_sourceObjectMetricEvidencePresentation_test_ts_49616bb3: {
    label: "sourceObjectMetricEvidencePresentation.test.ts"
  }
  File_kspace_sourceObjectMetricEvidencePresentation_ts_4a454f64: {
    label: "sourceObjectMetricEvidencePresentation.ts"
  }
  File_ces_workspace_workspaceApiClient_test_harness_ts_b07d5e45: {
    label: "workspaceApiClient.test.harness.ts"
  }
  File_p_services_workspace_workspaceDiffChangesHttp_ts_e2b74285: {
    label: "workspaceDiffChangesHttp.ts"
  }
  File_src_app_services_workspace_workspaceErrors_ts_c443be99: {
    label: "workspaceErrors.ts"
  }
  File_p_services_workspace_workspaceFileHistoryHttp_ts_3358e805: {
    label: "workspaceFileHistoryHttp.ts"
  }
  File_src_app_services_workspace_workspaceFilesHttp_ts_4ec96610: {
    label: "workspaceFilesHttp.ts"
  }
  File_ces_workspace_workspaceFileTree_test_fixtures_ts_8881d337: {
    label: "workspaceFileTree.test.fixtures.ts"
  }
  File_rkspace_workspaceGraphDraftAuthoring_api_test_ts_80b9a4ba: {
    label: "workspaceGraphDraftAuthoring.api.test.ts"
  }
  File_es_workspace_workspaceGraphDraftAuthoring_api_ts_269abefb: {
    label: "workspaceGraphDraftAuthoring.api.ts"
  }
  File_ce_workspaceGraphDraftAuthoring_test_fixtures_ts_3e1bde49: {
    label: "workspaceGraphDraftAuthoring.test.fixtures.ts"
  }
  File_pp_services_workspace_workspaceGraphDraftHttp_ts_010db45a: {
    label: "workspaceGraphDraftHttp.ts"
  }
  File__workspace_workspaceGraphDraftProjection_test_ts_436cf2de: {
    label: "workspaceGraphDraftProjection.test.ts"
  }
  File_vices_workspace_workspaceGraphDraftProjection_ts_7ef214df: {
    label: "workspaceGraphDraftProjection.ts"
  }
  File_aceGraphDraftProjectionExpected_test_fixtures_ts_b7ee8cb8: {
    label: "workspaceGraphDraftProjectionExpected.test.fixtures.ts"
  }
  File_ace_workspaceGraphDraftProtocol_test_fixtures_ts_2a74602b: {
    label: "workspaceGraphDraftProtocol.test.fixtures.ts"
  }
  File_ce_workspaceGraphDraftSnapshotProjection_test_ts_ef8c05a1: {
    label: "workspaceGraphDraftSnapshotProjection.test.ts"
  }
  File_rkspace_workspaceGraphDraftSnapshotProjection_ts_76e64f37: {
    label: "workspaceGraphDraftSnapshotProjection.ts"
  }
  File_services_workspace_workspacePluginCatalog_api_ts_6f8b4fc6: {
    label: "workspacePluginCatalog.api.ts"
  }
  File_c_app_services_workspace_workspacePluginsHttp_ts_f05d6c6c: {
    label: "workspacePluginsHttp.ts"
  }
  File__workspacePortDecomposition_architecture_test_ts_ce7926a8: {
    label: "workspacePortDecomposition.architecture.test.ts"
  }
  File_pp_services_workspace_workspacePorts_api_test_ts_f115fa3a: {
    label: "workspacePorts.api.test.ts"
  }
  File_src_app_services_workspace_workspacePorts_api_ts_127a11e4: {
    label: "workspacePorts.api.ts"
  }
  File__services_workspace_workspacePorts_files_test_ts_bc580e41: {
    label: "workspacePorts.files.test.ts"
  }
  File_ervices_workspace_workspacePorts_imports_test_ts_e5e1662d: {
    label: "workspacePorts.imports.test.ts"
  }
  File_ces_workspace_workspacePorts_operability_test_ts_2f334b22: {
    label: "workspacePorts.operability.test.ts"
  }
  File_src_app_services_workspace_workspacePorts_ts_96f87d13: {
    label: "workspacePorts.ts"
  }
  File_ices_workspace_workspacePortsApi_test_harness_ts_fc354dbb: {
    label: "workspacePortsApi.test.harness.ts"
  }
  File_ervices_workspace_workspaceScope_test_harness_ts_8a0fc9d8: {
    label: "workspaceScope.test.harness.ts"
  }
}
`;case`webSource_dir_src_app_shell_1e479cbc`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_shell_1e479cbc: {
  label: "shell/ — 10 files"

  File_src_app_shell_projectIdentityBadge_test_ts_c1a6429d: {
    label: "projectIdentityBadge.test.ts"
  }
  File_src_app_shell_projectIdentityBadge_ts_b071600e: {
    label: "projectIdentityBadge.ts"
  }
  File__shellNavigationDisposition_architecture_test_ts_04a18d7b: {
    label: "shellNavigationDisposition.architecture.test.ts"
  }
  File_src_app_shell_shellNavigationDisposition_test_ts_49c6b247: {
    label: "shellNavigationDisposition.test.ts"
  }
  File_src_app_shell_shellNavigationDisposition_ts_f0204078: {
    label: "shellNavigationDisposition.ts"
  }
  File_src_app_shell_shellNavigationModel_test_ts_71ef804d: {
    label: "shellNavigationModel.test.ts"
  }
  File_src_app_shell_shellNavigationModel_ts_3cdda642: {
    label: "shellNavigationModel.ts"
  }
  File_src_app_shell_shellRuntimeModel_test_ts_e210f2b6: {
    label: "shellRuntimeModel.test.ts"
  }
  File_src_app_shell_shellRuntimeModel_ts_7b05ca12: {
    label: "shellRuntimeModel.ts"
  }
  File_src_app_shell_useShellRuntime_ts_33585c18: {
    label: "useShellRuntime.ts"
  }
}
`;case`webSource_dir_src_app_stores_b85bb48a`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_stores_b85bb48a: {
  label: "stores/ — 14 files"

  File_src_app_stores_applicationLanguageStore_test_ts_e92d0fd6: {
    label: "applicationLanguageStore.test.ts"
  }
  File_src_app_stores_applicationLanguageStore_ts_e14964ee: {
    label: "applicationLanguageStore.ts"
  }
  File_src_app_stores_authorizationStore_test_ts_c8c6bd73: {
    label: "authorizationStore.test.ts"
  }
  File_src_app_stores_authorizationStore_ts_663baf69: {
    label: "authorizationStore.ts"
  }
  File_src_app_stores_canvasInteractionStore_test_ts_cf9b98bc: {
    label: "canvasInteractionStore.test.ts"
  }
  File_src_app_stores_canvasInteractionStore_ts_0d4e9c3e: {
    label: "canvasInteractionStore.ts"
  }
  File_src_app_stores_executionStore_ts_20659acd: {
    label: "executionStore.ts"
  }
  File_src_app_stores_platformConnectionStore_test_ts_2009d985: {
    label: "platformConnectionStore.test.ts"
  }
  File_src_app_stores_platformConnectionStore_ts_452c9e85: {
    label: "platformConnectionStore.ts"
  }
  File_src_app_stores_sessionStore_test_ts_b3abcb16: {
    label: "sessionStore.test.ts"
  }
  File_src_app_stores_sessionStore_ts_96a597f1: {
    label: "sessionStore.ts"
  }
  File_src_app_stores_uiLayoutStore_test_ts_b3c4fe84: {
    label: "uiLayoutStore.test.ts"
  }
  File_src_app_stores_uiLayoutStore_ts_92962379: {
    label: "uiLayoutStore.ts"
  }
  File_res_webStoreDomainOwnership_architecture_test_ts_fd4c5275: {
    label: "webStoreDomainOwnership.architecture.test.ts"
  }
}
`;case`webSource_dir_src_app_testing_b80bc5ef`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_testing_b80bc5ef: {
  label: "testing/ — 1 files"

  File_src_app_testing_contractTestUtils_ts_81f76ba9: {
    label: "contractTestUtils.ts"
  }
}
`;case`webSource_dir_src_app_types_a2447295`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_types_a2447295: {
  label: "types/ — 8 files"

  File_src_app_types_canonical_ts_cca3b270: {
    label: "canonical.ts"
  }
  File_src_app_types_canonicalGuards_test_ts_18dfa410: {
    label: "canonicalGuards.test.ts"
  }
  File_src_app_types_canonicalGuards_ts_e7680bbb: {
    label: "canonicalGuards.ts"
  }
  File_src_app_types_canvasExecutionSelection_ts_b891869a: {
    label: "canvasExecutionSelection.ts"
  }
  File_rc_app_types_canvasExecutionSelectionRecovery_ts_9223b7e4: {
    label: "canvasExecutionSelectionRecovery.ts"
  }
  File_src_app_types_dbt_ts_de47d45c: {
    label: "dbt.ts"
  }
  File_src_app_types_engine_ts_a9ae9124: {
    label: "engine.ts"
  }
  File_src_app_types_plans_ts_a5b82baa: {
    label: "plans.ts"
  }
}
`;case`webSource_dir_src_app_views_f32657e4`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4: {
  label: "views/ — 866 files"

  Dir_src_app_views_admin_026aaea1: {
    label: "admin/ — 13 files"
  }
  Dir_src_app_views_artifacts_f8eb2a46: {
    label: "artifacts/ — 23 files"
  }
  Dir_src_app_views_canvas_0bc779dd: {
    label: "canvas/ — 660 files"
  }
  Dir_src_app_views_code_53326a1d: {
    label: "code/ — 29 files"
  }
  Dir_src_app_views_cost_21d6c207: {
    label: "cost/ — 13 files"
  }
  Dir_src_app_views_diff_d27bc3ec: {
    label: "diff/ — 17 files"
  }
  Dir_src_app_views_lineage_aab1b7ff: {
    label: "lineage/ — 18 files"
  }
  Dir_src_app_views_plugins_77d5ccf8: {
    label: "plugins/ — 9 files"
  }
  Dir_src_app_views_projectAdmission_0003f629: {
    label: "projectAdmission/ — 3 files"
  }
  Dir_src_app_views_runs_da4584d8: {
    label: "runs/ — 31 files"
  }
  Dir_src_app_views_templates_c5ce249f: {
    label: "templates/ — 7 files"
  }
  Dir_src_app_views_test_481b0fbc: {
    label: "test/ — 1 files"
  }
  File_src_app_views_AdminView_architecture_test_ts_08678989: {
    label: "AdminView.architecture.test.ts"
  }
  File_src_app_views_AdminView_test_tsx_7ab82911: {
    label: "AdminView.test.tsx"
  }
  File_src_app_views_AdminView_tsx_2511d9b8: {
    label: "AdminView.tsx"
  }
  File_src_app_views_architecture_test_support_ts_5c543f73: {
    label: "architecture.test.support.ts"
  }
  File_src_app_views_ArtifactsView_test_tsx_65651de9: {
    label: "ArtifactsView.test.tsx"
  }
  File_src_app_views_ArtifactsView_tsx_03f6476b: {
    label: "ArtifactsView.tsx"
  }
  File_src_app_views_Canvas_architecture_test_tsx_677c1f64: {
    label: "Canvas.architecture.test.tsx"
  }
  File_views_Canvas_authoringRoute_integration_test_tsx_ef19dd8c: {
    label: "Canvas.authoringRoute.integration.test.tsx"
  }
  File_src_app_views_Canvas_draftRecovery_test_tsx_d7a707d5: {
    label: "Canvas.draftRecovery.test.tsx"
  }
  File_src_app_views_Canvas_readOnlyStates_test_tsx_b7ffabc6: {
    label: "Canvas.readOnlyStates.test.tsx"
  }
  File_s_routeStates_backend-recovery-priority_test_tsx_ae59a1dc: {
    label: "Canvas.routeStates.backend-recovery-priority.test.tsx"
  }
  File_Canvas_routeStates_first-canvas-catalog_test_tsx_360e9679: {
    label: "Canvas.routeStates.first-canvas-catalog.test.tsx"
  }
  File__Canvas_routeStates_first-canvas-policy_test_tsx_b4703513: {
    label: "Canvas.routeStates.first-canvas-policy.test.tsx"
  }
  File_nvas_routeStates_host-cycle-persistence_test_tsx_d2b3fafa: {
    label: "Canvas.routeStates.host-cycle-persistence.test.tsx"
  }
  File_src_app_views_Canvas_routeStates_smoke_test_tsx_61d85d29: {
    label: "Canvas.routeStates.smoke.test.tsx"
  }
  File_src_app_views_Canvas_test_controller_defaults_ts_dba1c5dd: {
    label: "Canvas.test.controller.defaults.ts"
  }
  File_src_app_views_Canvas_test_controller_ts_b6ad9cf0: {
    label: "Canvas.test.controller.ts"
  }
  File_src_app_views_Canvas_test_hostCycleScenario_ts_a75e4195: {
    label: "Canvas.test.hostCycleScenario.ts"
  }
  File_src_app_views_Canvas_test_support_tsx_1dbcc1c4: {
    label: "Canvas.test.support.tsx"
  }
  File_src_app_views_Canvas_tsx_afdd91e5: {
    label: "Canvas.tsx"
  }
  File_src_app_views_CodeView_test_tsx_092def27: {
    label: "CodeView.test.tsx"
  }
  File_src_app_views_CodeView_tsx_1e9e1e46: {
    label: "CodeView.tsx"
  }
  File_src_app_views_CostView_test_tsx_863a9967: {
    label: "CostView.test.tsx"
  }
  File_src_app_views_CostView_tsx_822f85f9: {
    label: "CostView.tsx"
  }
  File_src_app_views_DiffView_catalogFiltering_test_tsx_2569eb41: {
    label: "DiffView.catalogFiltering.test.tsx"
  }
  File_src_app_views_DiffView_sqlPreview_test_tsx_c1cfc6fd: {
    label: "DiffView.sqlPreview.test.tsx"
  }
  File_src_app_views_DiffView_states_test_tsx_bea8cb94: {
    label: "DiffView.states.test.tsx"
  }
  File_src_app_views_DiffView_tsx_9491271b: {
    label: "DiffView.tsx"
  }
  File_src_app_views_LineageView_test_tsx_8e3d36d3: {
    label: "LineageView.test.tsx"
  }
  File_src_app_views_LineageView_tsx_bf8febf2: {
    label: "LineageView.tsx"
  }
  File_src_app_views_LoginView_tsx_c7ce1bf2: {
    label: "LoginView.tsx"
  }
  File_rc_app_views_PluginsView_reconciliation_test_tsx_2c19613f: {
    label: "PluginsView.reconciliation.test.tsx"
  }
  File_src_app_views_PluginsView_test_tsx_c2111c37: {
    label: "PluginsView.test.tsx"
  }
  File_src_app_views_PluginsView_tsx_f2573712: {
    label: "PluginsView.tsx"
  }
  File_src_app_views_projectOnboardingCopy_ts_09e257a7: {
    label: "projectOnboardingCopy.ts"
  }
  File_src_app_views_ProjectOnboardingView_test_tsx_84774017: {
    label: "ProjectOnboardingView.test.tsx"
  }
  File_src_app_views_ProjectOnboardingView_tsx_814025dd: {
    label: "ProjectOnboardingView.tsx"
  }
  File_iews_publicDataVisualSystem_architecture_test_ts_efea981e: {
    label: "publicDataVisualSystem.architecture.test.ts"
  }
  File_src_app_views_RunsView_test_tsx_b948e20a: {
    label: "RunsView.test.tsx"
  }
  File_src_app_views_RunsView_tsx_ca221122: {
    label: "RunsView.tsx"
  }
  File_src_app_views_TemplatesView_test_tsx_18cdeae7: {
    label: "TemplatesView.test.tsx"
  }
  File_src_app_views_TemplatesView_tsx_da89cf96: {
    label: "TemplatesView.tsx"
  }
}
`;case`webSource_dir_src_app_views_admin_026aaea1`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_admin_026aaea1: {
  label: "admin/ — 13 files"

  File_src_app_views_admin_AdminAuditTab_tsx_35755ee8: {
    label: "AdminAuditTab.tsx"
  }
  File_src_app_views_admin_AdminCapabilitiesCard_tsx_e0aa4796: {
    label: "AdminCapabilitiesCard.tsx"
  }
  File_src_app_views_admin_AdminPermissionsTab_tsx_1293627d: {
    label: "AdminPermissionsTab.tsx"
  }
  File_rc_app_views_admin_AdminPlatformSummaryCards_tsx_99113593: {
    label: "AdminPlatformSummaryCards.tsx"
  }
  File_src_app_views_admin_AdminPlatformTab_tsx_e4a3775c: {
    label: "AdminPlatformTab.tsx"
  }
  File_src_app_views_admin_AdminProbeDetailsCard_tsx_ebf111a6: {
    label: "AdminProbeDetailsCard.tsx"
  }
  File_src_app_views_admin_AdminRolesTab_tsx_78060087: {
    label: "AdminRolesTab.tsx"
  }
  File_src_app_views_admin_AdminStatusBadge_tsx_71eee36e: {
    label: "AdminStatusBadge.tsx"
  }
  File_src_app_views_admin_adminViewModel_test_ts_ab72ab0d: {
    label: "adminViewModel.test.ts"
  }
  File_src_app_views_admin_adminViewModel_ts_b302c5b8: {
    label: "adminViewModel.ts"
  }
  File_src_app_views_admin_copy_ts_7638fa90: {
    label: "copy.ts"
  }
  File_src_app_views_admin_platformTypes_ts_5872235a: {
    label: "platformTypes.ts"
  }
  File_src_app_views_admin_useAdminViewData_ts_60929841: {
    label: "useAdminViewData.ts"
  }
}
`;case`webSource_dir_src_app_views_artifacts_f8eb2a46`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_artifacts_f8eb2a46: {
  label: "artifacts/ — 23 files"

  File_ws_artifacts_ArtifactMonacoPreviewPanel_test_tsx_7bac3d2d: {
    label: "ArtifactMonacoPreviewPanel.test.tsx"
  }
  File_p_views_artifacts_ArtifactMonacoPreviewPanel_tsx_5ef050a3: {
    label: "ArtifactMonacoPreviewPanel.tsx"
  }
  File_src_app_views_artifacts_ArtifactPreviewTabs_tsx_7c04b27a: {
    label: "ArtifactPreviewTabs.tsx"
  }
  File_src_app_views_artifacts_ArtifactsInfoCard_tsx_6b3f47a3: {
    label: "ArtifactsInfoCard.tsx"
  }
  File_src_app_views_artifacts_ArtifactsList_tsx_b92c265b: {
    label: "ArtifactsList.tsx"
  }
  File_tifactsMonacoReadonlyViewer_architecture_test_ts_2960c16b: {
    label: "artifactsMonacoReadonlyViewer.architecture.test.ts"
  }
  File__views_artifacts_artifactsRouteBootstrap_test_ts_450bb4be: {
    label: "artifactsRouteBootstrap.test.ts"
  }
  File_c_app_views_artifacts_artifactsRouteBootstrap_ts_bf98f89b: {
    label: "artifactsRouteBootstrap.ts"
  }
  File_src_app_views_artifacts_ArtifactsStateViews_tsx_0b330812: {
    label: "ArtifactsStateViews.tsx"
  }
  File_s_artifacts_artifactsWorkbenchStateModel_test_ts_170c45ac: {
    label: "artifactsWorkbenchStateModel.test.ts"
  }
  File__views_artifacts_artifactsWorkbenchStateModel_ts_ec4209e1: {
    label: "artifactsWorkbenchStateModel.ts"
  }
  File_src_app_views_artifacts_constants_ts_72f1af1c: {
    label: "constants.ts"
  }
  File_src_app_views_artifacts_copy_ts_96d628a2: {
    label: "copy.ts"
  }
  File_src_app_views_artifacts_ManifestImportPanel_tsx_cfb86a2e: {
    label: "ManifestImportPanel.tsx"
  }
  File_src_app_views_artifacts_manifestParser_test_ts_65e65110: {
    label: "manifestParser.test.ts"
  }
  File_src_app_views_artifacts_manifestParser_ts_bcbb07ea: {
    label: "manifestParser.ts"
  }
  File_iews_artifacts_structuredArtifactContent_test_ts_be2bd07c: {
    label: "structuredArtifactContent.test.ts"
  }
  File_app_views_artifacts_structuredArtifactContent_ts_4f5dd007: {
    label: "structuredArtifactContent.ts"
  }
  File_src_app_views_artifacts_types_ts_febb1f0b: {
    label: "types.ts"
  }
  File_p_views_artifacts_useArtifactsViewModel_test_tsx_841bc58c: {
    label: "useArtifactsViewModel.test.tsx"
  }
  File_src_app_views_artifacts_useArtifactsViewModel_ts_859fc3bf: {
    label: "useArtifactsViewModel.ts"
  }
  File_rc_app_views_artifacts_useLocalManifestImport_ts_475bc475: {
    label: "useLocalManifestImport.ts"
  }
  File_src_app_views_artifacts_utils_ts_55bb9c60: {
    label: "utils.ts"
  }
}
`;case`webSource_dir_src_app_views_canvas_0bc779dd`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_canvas_0bc779dd: {
  label: "canvas/ — 660 files"

  File_p_views_canvas_canvasActiveGraphStrategy_test_ts_7660c34d: {
    label: "canvasActiveGraphStrategy.test.ts"
  }
  File_rc_app_views_canvas_canvasActiveGraphStrategy_ts_b4a53eef: {
    label: "canvasActiveGraphStrategy.ts"
  }
  File_p_views_canvas_canvasAddNodeCatalogModel_test_ts_0d75c27c: {
    label: "canvasAddNodeCatalogModel.test.ts"
  }
  File_rc_app_views_canvas_canvasAddNodeCatalogModel_ts_b247805a: {
    label: "canvasAddNodeCatalogModel.ts"
  }
  File_p_views_canvas_CanvasAddNodeCatalogView_test_tsx_e91e0e01: {
    label: "CanvasAddNodeCatalogView.test.tsx"
  }
  File_rc_app_views_canvas_CanvasAddNodeCatalogView_tsx_977bcff2: {
    label: "CanvasAddNodeCatalogView.tsx"
  }
  File__views_canvas_canvasAlgebraicComposition_test_ts_7145860f: {
    label: "canvasAlgebraicComposition.test.ts"
  }
  File_c_app_views_canvas_canvasAlgebraicComposition_ts_bba90db4: {
    label: "canvasAlgebraicComposition.ts"
  }
  File_ws_canvas_canvasAuthoringGraphProjection_test_ts_34b59890: {
    label: "canvasAuthoringGraphProjection.test.ts"
  }
  File_p_views_canvas_canvasAuthoringGraphProjection_ts_6e0f707e: {
    label: "canvasAuthoringGraphProjection.ts"
  }
  File_src_app_views_canvas_canvasAuthoringMetadata_ts_db209b30: {
    label: "canvasAuthoringMetadata.ts"
  }
  File__views_canvas_canvasAuthoringNodeCommand_test_ts_b3a87853: {
    label: "canvasAuthoringNodeCommand.test.ts"
  }
  File_c_app_views_canvas_canvasAuthoringNodeCommand_ts_0c21b104: {
    label: "canvasAuthoringNodeCommand.ts"
  }
  File_s_canvasAuthoringProjection_architecture_test_ts_6ca6d5b3: {
    label: "canvasAuthoringProjection.architecture.test.ts"
  }
  File_app_views_canvas_canvasAuthoringRuntime_types_ts_52daebc3: {
    label: "canvasAuthoringRuntime.types.ts"
  }
  File_asAuthoringRuntimeComponent_architecture_test_ts_5c264b7e: {
    label: "canvasAuthoringRuntimeComponent.architecture.test.ts"
  }
  File_rc_app_views_canvas_canvasAuthoringState_test_ts_351332f1: {
    label: "canvasAuthoringState.test.ts"
  }
  File_src_app_views_canvas_canvasAuthoringState_ts_b95ae9d1: {
    label: "canvasAuthoringState.ts"
  }
  File_rc_app_views_canvas_canvasBackendPosture_test_ts_ad0f3fd9: {
    label: "canvasBackendPosture.test.ts"
  }
  File_src_app_views_canvas_canvasBackendPosture_ts_38c43c45: {
    label: "canvasBackendPosture.ts"
  }
  File_s_canvas_canvasCalculatedColumnAuthoring_test_ts_c8640447: {
    label: "canvasCalculatedColumnAuthoring.test.ts"
  }
  File__views_canvas_canvasCalculatedColumnAuthoring_ts_face6a58: {
    label: "canvasCalculatedColumnAuthoring.ts"
  }
  File_nvasCanonicalRouteAuthority_architecture_test_ts_69b39ca5: {
    label: "canvasCanonicalRouteAuthority.architecture.test.ts"
  }
  File_src_app_views_canvas_canvasCanonicalSnapshot_ts_d8376724: {
    label: "canvasCanonicalSnapshot.ts"
  }
  File__canvas_CanvasCenterSurface_architecture_test_ts_e4fd226b: {
    label: "CanvasCenterSurface.architecture.test.ts"
  }
  File_src_app_views_canvas_CanvasCenterSurface_tsx_95d137e3: {
    label: "CanvasCenterSurface.tsx"
  }
  File_rc_app_views_canvas_canvasCenterSurface_types_ts_dce0684f: {
    label: "canvasCenterSurface.types.ts"
  }
  File_pp_views_canvas_canvasCenterSurfaceTransport_tsx_d1342e35: {
    label: "canvasCenterSurfaceTransport.tsx"
  }
  File_pp_views_canvas_canvasCenterSurfaceWorkbench_tsx_9b7b0877: {
    label: "canvasCenterSurfaceWorkbench.tsx"
  }
  File_src_app_views_canvas_canvasChromeTokens_ts_205df206: {
    label: "canvasChromeTokens.ts"
  }
  File_src_app_views_canvas_canvasColumnAutomap_ts_0c6463af: {
    label: "canvasColumnAutomap.ts"
  }
  File__views_canvas_CanvasColumnCommentEditor_test_tsx_f24ab4b0: {
    label: "CanvasColumnCommentEditor.test.tsx"
  }
  File_c_app_views_canvas_CanvasColumnCommentEditor_tsx_69b2929a: {
    label: "CanvasColumnCommentEditor.tsx"
  }
  File_ews_canvas_canvasColumnFunctionAuthoring_test_ts_b3541d6e: {
    label: "canvasColumnFunctionAuthoring.test.ts"
  }
  File_pp_views_canvas_canvasColumnFunctionAuthoring_ts_bac8ea77: {
    label: "canvasColumnFunctionAuthoring.ts"
  }
  File_ews_canvas_canvasColumnFunctionMenuProjection_ts_490a1093: {
    label: "canvasColumnFunctionMenuProjection.ts"
  }
  File_pp_views_canvas_CanvasColumnLineageEdge_test_tsx_56693c8c: {
    label: "CanvasColumnLineageEdge.test.tsx"
  }
  File_src_app_views_canvas_CanvasColumnLineageEdge_tsx_e0bc9807: {
    label: "CanvasColumnLineageEdge.tsx"
  }
  File_canvasColumnLineageProjection_structured_test_ts_1b2a53a4: {
    label: "canvasColumnLineageProjection.structured.test.ts"
  }
  File_ews_canvas_canvasColumnLineageProjection_test_ts_b6f74fcc: {
    label: "canvasColumnLineageProjection.test.ts"
  }
  File_pp_views_canvas_canvasColumnLineageProjection_ts_306ebd13: {
    label: "canvasColumnLineageProjection.ts"
  }
  File_iews_canvas_canvasColumnMappingAuthoring_test_ts_fb568428: {
    label: "canvasColumnMappingAuthoring.test.ts"
  }
  File_app_views_canvas_canvasColumnMappingAuthoring_ts_1f339536: {
    label: "canvasColumnMappingAuthoring.ts"
  }
  File_src_app_views_canvas_canvasColumnMappingModel_ts_cc05c55a: {
    label: "canvasColumnMappingModel.ts"
  }
  File__app_views_canvas_canvasColumnOutputAuthoring_ts_dca0a17a: {
    label: "canvasColumnOutputAuthoring.ts"
  }
  File__views_canvas_canvasColumnProjectionAuthority_ts_9d476df5: {
    label: "canvasColumnProjectionAuthority.ts"
  }
  File_p_views_canvas_canvasConnectionAggregate_test_ts_0dd299f0: {
    label: "canvasConnectionAggregate.test.ts"
  }
  File_rc_app_views_canvas_canvasConnectionAggregate_ts_b1d70d5b: {
    label: "canvasConnectionAggregate.ts"
  }
  File_s_canvasConnectionCompatibilityPresenter_test_ts_cbb1d3f1: {
    label: "canvasConnectionCompatibilityPresenter.test.ts"
  }
  File_canvas_canvasConnectionCompatibilityPresenter_ts_d1a4b34f: {
    label: "canvasConnectionCompatibilityPresenter.ts"
  }
  File_views_canvas_canvasContextMenuPresenter_types_ts_cbf5e3a4: {
    label: "canvasContextMenuPresenter.types.ts"
  }
  File_pp_views_canvas_canvasContextMenuTargetPolicy_ts_7347d1a0: {
    label: "canvasContextMenuTargetPolicy.ts"
  }
  File_nvas_CanvasContextMenuView_architecture_test_tsx_d2e9e62d: {
    label: "CanvasContextMenuView.architecture.test.tsx"
  }
  File_nvas_CanvasContextMenuView_pointerGrace_test_tsx_aa1544ab: {
    label: "CanvasContextMenuView.pointerGrace.test.tsx"
  }
  File__app_views_canvas_CanvasContextMenuView_test_tsx_765293b8: {
    label: "CanvasContextMenuView.test.tsx"
  }
  File_src_app_views_canvas_CanvasContextMenuView_tsx_5d4d19cb: {
    label: "CanvasContextMenuView.tsx"
  }
  File__views_canvas_canvasContextMenuViewModel_test_ts_39a74772: {
    label: "canvasContextMenuViewModel.test.ts"
  }
  File_c_app_views_canvas_canvasContextMenuViewModel_ts_c7039917: {
    label: "canvasContextMenuViewModel.ts"
  }
  File__views_canvas_CanvasContextualWorkbenchPanel_tsx_ce0a55f4: {
    label: "CanvasContextualWorkbenchPanel.tsx"
  }
  File_s_canvasControllerViewModel_architecture_test_ts_21b6ae35: {
    label: "canvasControllerViewModel.architecture.test.ts"
  }
  File_rc_app_views_canvas_canvasControllerViewModel_ts_bd7fcb58: {
    label: "canvasControllerViewModel.ts"
  }
  File_src_app_views_canvas_canvasCopy_types_ts_f9cd244e: {
    label: "canvasCopy.types.ts"
  }
  File_p_views_canvas_canvasCopyCatalog_authoring_es_ts_16a218cb: {
    label: "canvasCopyCatalog.authoring.es.ts"
  }
  File__app_views_canvas_canvasCopyCatalog_authoring_ts_2b1d273b: {
    label: "canvasCopyCatalog.authoring.ts"
  }
  File_p_views_canvas_canvasCopyCatalog_execution_es_ts_870096ef: {
    label: "canvasCopyCatalog.execution.es.ts"
  }
  File__app_views_canvas_canvasCopyCatalog_execution_ts_2109b2b8: {
    label: "canvasCopyCatalog.execution.ts"
  }
  File_c_app_views_canvas_canvasCopyCatalog_route_es_ts_17db1472: {
    label: "canvasCopyCatalog.route.es.ts"
  }
  File_src_app_views_canvas_canvasCopyCatalog_route_ts_052f6232: {
    label: "canvasCopyCatalog.route.ts"
  }
  File_app_views_canvas_canvasCopyCatalog_toolbar_es_ts_d1d4ed43: {
    label: "canvasCopyCatalog.toolbar.es.ts"
  }
  File_rc_app_views_canvas_canvasCopyCatalog_toolbar_ts_e7689cdd: {
    label: "canvasCopyCatalog.toolbar.ts"
  }
  File_src_app_views_canvas_canvasCopyCatalog_ts_334398b7: {
    label: "canvasCopyCatalog.ts"
  }
  File_src_app_views_canvas_canvasCopyFormatting_ts_2cbe79a2: {
    label: "canvasCopyFormatting.ts"
  }
  File_s_canvasCreateCanvasDocumentAvailability_test_ts_a48cba92: {
    label: "canvasCreateCanvasDocumentAvailability.test.ts"
  }
  File_canvas_canvasCreateCanvasDocumentAvailability_ts_3374eca2: {
    label: "canvasCreateCanvasDocumentAvailability.ts"
  }
  File_canvasCreateCanvasDocumentCommand_guards_test_ts_1d3bfd06: {
    label: "canvasCreateCanvasDocumentCommand.guards.test.ts"
  }
  File_sCreateCanvasDocumentCommand_replacement_test_ts_bdcc8c00: {
    label: "canvasCreateCanvasDocumentCommand.replacement.test.ts"
  }
  File_anvasCreateCanvasDocumentCommand_test_support_ts_8816ea32: {
    label: "canvasCreateCanvasDocumentCommand.test.support.ts"
  }
  File_canvas_canvasCreateCanvasDocumentCommand_test_ts_6c2b0218: {
    label: "canvasCreateCanvasDocumentCommand.test.ts"
  }
  File_iews_canvas_canvasCreateCanvasDocumentCommand_ts_77027f42: {
    label: "canvasCreateCanvasDocumentCommand.ts"
  }
  File_anvas_canvasCreateCanvasDocumentCommandPolicy_ts_455d8032: {
    label: "canvasCreateCanvasDocumentCommandPolicy.ts"
  }
  File_s_canvas_canvasCreateCanvasDocumentSaveResult_ts_caf63b14: {
    label: "canvasCreateCanvasDocumentSaveResult.ts"
  }
  File_app_views_canvas_canvasDbtAuthoringModel_test_ts_117fb810: {
    label: "canvasDbtAuthoringModel.test.ts"
  }
  File_src_app_views_canvas_canvasDbtAuthoringModel_ts_d588858d: {
    label: "canvasDbtAuthoringModel.ts"
  }
  File_app_views_canvas_canvasDbtExecutionProjection_ts_08529a04: {
    label: "canvasDbtExecutionProjection.ts"
  }
  File__canvas_canvasDbtModelArtifactProjection_test_ts_80dc3ee3: {
    label: "canvasDbtModelArtifactProjection.test.ts"
  }
  File_views_canvas_canvasDbtModelArtifactProjection_ts_e53f7faf: {
    label: "canvasDbtModelArtifactProjection.ts"
  }
  File_ews_canvas_canvasDbtModelChainProjection_test_ts_2fed6124: {
    label: "canvasDbtModelChainProjection.test.ts"
  }
  File_ews_canvas_canvasDbtModelColumnAuthoring_test_ts_c1ac025c: {
    label: "canvasDbtModelColumnAuthoring.test.ts"
  }
  File_pp_views_canvas_canvasDbtModelColumnAuthoring_ts_ba282cba: {
    label: "canvasDbtModelColumnAuthoring.ts"
  }
  File__app_views_canvas_canvasDbtModelColumnCommand_ts_72b4a406: {
    label: "canvasDbtModelColumnCommand.ts"
  }
  File_views_canvas_canvasDbtModelColumnLineage_test_ts_b9c05e29: {
    label: "canvasDbtModelColumnLineage.test.ts"
  }
  File_views_canvas_canvasDbtPlannerGraphSource_test_ts_89e53449: {
    label: "canvasDbtPlannerGraphSource.test.ts"
  }
  File__app_views_canvas_canvasDbtPlannerGraphSource_ts_1e23db7f: {
    label: "canvasDbtPlannerGraphSource.ts"
  }
  File_s_canvasDbtSourceImportContinuationStore_test_ts_09891add: {
    label: "canvasDbtSourceImportContinuationStore.test.ts"
  }
  File_canvas_canvasDbtSourceImportContinuationStore_ts_bbe8aea0: {
    label: "canvasDbtSourceImportContinuationStore.ts"
  }
  File_s_canvas_canvasDbtTestArtifactProjection_test_ts_db4812cd: {
    label: "canvasDbtTestArtifactProjection.test.ts"
  }
  File__views_canvas_canvasDbtTestArtifactProjection_ts_7d8b110c: {
    label: "canvasDbtTestArtifactProjection.ts"
  }
  File_views_canvas_canvasDbtTestAuthoringModel_test_ts_b77983fd: {
    label: "canvasDbtTestAuthoringModel.test.ts"
  }
  File__app_views_canvas_canvasDbtTestAuthoringModel_ts_daa209db: {
    label: "canvasDbtTestAuthoringModel.ts"
  }
  File_rc_app_views_canvas_canvasDbtTestTargetPolicy_ts_22405fb9: {
    label: "canvasDbtTestTargetPolicy.ts"
  }
  File_views_canvas_canvasDbtWorkspaceArtifacts_test_ts_3e945f77: {
    label: "canvasDbtWorkspaceArtifacts.test.ts"
  }
  File__app_views_canvas_canvasDbtWorkspaceArtifacts_ts_57db44ee: {
    label: "canvasDbtWorkspaceArtifacts.ts"
  }
  File_c_app_views_canvas_CanvasDependencyEdge_test_tsx_6c40bbd5: {
    label: "CanvasDependencyEdge.test.tsx"
  }
  File_src_app_views_canvas_CanvasDependencyEdge_tsx_7a7b922b: {
    label: "CanvasDependencyEdge.tsx"
  }
  File_p_views_canvas_canvasDependencyEdgeModel_test_ts_c167296f: {
    label: "canvasDependencyEdgeModel.test.ts"
  }
  File_rc_app_views_canvas_canvasDependencyEdgeModel_ts_cbf570d9: {
    label: "canvasDependencyEdgeModel.ts"
  }
  File_ews_canvas_canvasDraftAccessPostureModel_test_ts_12deadb2: {
    label: "canvasDraftAccessPostureModel.test.ts"
  }
  File_pp_views_canvas_canvasDraftAccessPostureModel_ts_b0fccb8c: {
    label: "canvasDraftAccessPostureModel.ts"
  }
  File_s_canvas_CanvasDraftAccessRecovery_templates_tsx_7911bb9c: {
    label: "CanvasDraftAccessRecovery.templates.tsx"
  }
  File_rc_app_views_canvas_canvasDraftAuthoring_test_ts_b23276ca: {
    label: "canvasDraftAuthoring.test.ts"
  }
  File_src_app_views_canvas_canvasDraftAuthoring_ts_809c96d7: {
    label: "canvasDraftAuthoring.ts"
  }
  File_nvasDraftAuthoringComponent_architecture_test_ts_cd914877: {
    label: "canvasDraftAuthoringComponent.architecture.test.ts"
  }
  File_s_canvas_canvasDraftAuthTransportPosture_test_ts_5545fc74: {
    label: "canvasDraftAuthTransportPosture.test.ts"
  }
  File__views_canvas_canvasDraftAuthTransportPosture_ts_a6054485: {
    label: "canvasDraftAuthTransportPosture.ts"
  }
  File_app_views_canvas_canvasDraftAutosaveExecution_ts_ac83fd7f: {
    label: "canvasDraftAutosaveExecution.ts"
  }
  File_pp_views_canvas_canvasDraftAutosaveScheduling_ts_c3a615a7: {
    label: "canvasDraftAutosaveScheduling.ts"
  }
  File_app_views_canvas_canvasDraftEdgeExecutionGate_ts_8c1fa341: {
    label: "canvasDraftEdgeExecutionGate.ts"
  }
  File_pp_views_canvas_canvasDraftExecutionGate_test_ts_edb3c794: {
    label: "canvasDraftExecutionGate.test.ts"
  }
  File_views_canvas_canvasDraftLayoutHydrationPolicy_ts_09e55209: {
    label: "canvasDraftLayoutHydrationPolicy.ts"
  }
  File_c_app_views_canvas_canvasDraftLifecycle_types_ts_cf914e5d: {
    label: "canvasDraftLifecycle.types.ts"
  }
  File_iews_canvas_canvasDraftLifecycleSnapshot_test_ts_0f0419fc: {
    label: "canvasDraftLifecycleSnapshot.test.ts"
  }
  File_app_views_canvas_canvasDraftLifecycleSnapshot_ts_0d563cd5: {
    label: "canvasDraftLifecycleSnapshot.ts"
  }
  File__app_views_canvas_canvasDraftLocalNodeCatalog_ts_579138fd: {
    label: "canvasDraftLocalNodeCatalog.ts"
  }
  File_src_app_views_canvas_canvasDraftNodeCatalog_ts_e1796e8c: {
    label: "canvasDraftNodeCatalog.ts"
  }
  File_ews_canvas_canvasDraftPersistenceRuntime_test_ts_a4fa3663: {
    label: "canvasDraftPersistenceRuntime.test.ts"
  }
  File_pp_views_canvas_canvasDraftPersistenceRuntime_ts_83ce72ad: {
    label: "canvasDraftPersistenceRuntime.ts"
  }
  File_iews_canvas_canvasDraftPresentationModel_test_ts_94e29444: {
    label: "canvasDraftPresentationModel.test.ts"
  }
  File_app_views_canvas_canvasDraftPresentationModel_ts_ebc64b45: {
    label: "canvasDraftPresentationModel.ts"
  }
  File_iews_canvas_canvasDraftPresentationStore_test_ts_599ab0b2: {
    label: "canvasDraftPresentationStore.test.ts"
  }
  File_app_views_canvas_canvasDraftPresentationStore_ts_2206c746: {
    label: "canvasDraftPresentationStore.ts"
  }
  File_anvas_canvasDraftQueryCache_architecture_test_ts_d67aad38: {
    label: "canvasDraftQueryCache.architecture.test.ts"
  }
  File_src_app_views_canvas_canvasDraftQueryCache_ts_23095f45: {
    label: "canvasDraftQueryCache.ts"
  }
  File_rc_app_views_canvas_canvasDraftReadModel_test_ts_30e2007e: {
    label: "canvasDraftReadModel.test.ts"
  }
  File_src_app_views_canvas_canvasDraftReadModel_ts_eaa1a038: {
    label: "canvasDraftReadModel.ts"
  }
  File_canvasDraftRecoveryBoundary_architecture_test_ts_a289407e: {
    label: "canvasDraftRecoveryBoundary.architecture.test.ts"
  }
  File_anvas_canvasDraftRepository_architecture_test_ts_5ee58cb1: {
    label: "canvasDraftRepository.architecture.test.ts"
  }
  File_ws_canvas_canvasDraftRepository_conflict_test_ts_f686ccd5: {
    label: "canvasDraftRepository.conflict.test.ts"
  }
  File_s_canvas_canvasDraftRepository_readWrite_test_ts_f31f6aef: {
    label: "canvasDraftRepository.readWrite.test.ts"
  }
  File_ws_canvas_canvasDraftRepository_test_fixtures_ts_808c784a: {
    label: "canvasDraftRepository.test.fixtures.ts"
  }
  File_src_app_views_canvas_canvasDraftRepository_ts_baf2e791: {
    label: "canvasDraftRepository.ts"
  }
  File_src_app_views_canvas_CanvasDraftSaveStatus_tsx_de3c701e: {
    label: "CanvasDraftSaveStatus.tsx"
  }
  File_src_app_views_canvas_canvasDraftScope_test_ts_16421784: {
    label: "canvasDraftScope.test.ts"
  }
  File_src_app_views_canvas_canvasDraftScope_ts_4f567b44: {
    label: "canvasDraftScope.ts"
  }
  File_s_canvas_canvasDraftSession_architecture_test_ts_c64b210a: {
    label: "canvasDraftSession.architecture.test.ts"
  }
  File_src_app_views_canvas_canvasDraftSession_test_ts_17c32609: {
    label: "canvasDraftSession.test.ts"
  }
  File_src_app_views_canvas_canvasDraftSession_ts_cac9aed6: {
    label: "canvasDraftSession.ts"
  }
  File_src_app_views_canvas_canvasDraftSession_types_ts_f4ac5609: {
    label: "canvasDraftSession.types.ts"
  }
  File_c_app_views_canvas_canvasDraftSessionBaseline_ts_efefe678: {
    label: "canvasDraftSessionBaseline.ts"
  }
  File_rc_app_views_canvas_canvasDraftSessionMachine_ts_8843d237: {
    label: "canvasDraftSessionMachine.ts"
  }
  File_app_views_canvas_canvasDraftSessionWorkingSet_ts_9fc08bdf: {
    label: "canvasDraftSessionWorkingSet.ts"
  }
  File__app_views_canvas_canvasDraftStatusState_test_ts_bf6fffa6: {
    label: "canvasDraftStatusState.test.ts"
  }
  File_src_app_views_canvas_canvasDraftStatusState_ts_45775d92: {
    label: "canvasDraftStatusState.ts"
  }
  File_p_views_canvas_canvasDraftStructuralSignature_ts_3ca5c6b0: {
    label: "canvasDraftStructuralSignature.ts"
  }
  File_p_views_canvas_canvasDraftTransportErrorState_ts_36303e0e: {
    label: "canvasDraftTransportErrorState.ts"
  }
  File_s_canvas_canvasDraftWorkspaceFileRefresh_test_ts_cfda4f95: {
    label: "canvasDraftWorkspaceFileRefresh.test.ts"
  }
  File__views_canvas_canvasDraftWorkspaceFileRefresh_ts_5ee0aaf5: {
    label: "canvasDraftWorkspaceFileRefresh.ts"
  }
  File__views_canvas_canvasDuplicateNodeCommand_test_ts_59b9dad1: {
    label: "canvasDuplicateNodeCommand.test.ts"
  }
  File_c_app_views_canvas_canvasDuplicateNodeCommand_ts_484e7535: {
    label: "canvasDuplicateNodeCommand.ts"
  }
  File_src_app_views_canvas_canvasDvtAuthoringModel_ts_d2debf7d: {
    label: "canvasDvtAuthoringModel.ts"
  }
  File_src_app_views_canvas_canvasDvtAuthoringTypes_ts_758f905e: {
    label: "canvasDvtAuthoringTypes.ts"
  }
  File__canvas_canvasDvtCompositionInputCatalog_test_ts_2fa5a0de: {
    label: "canvasDvtCompositionInputCatalog.test.ts"
  }
  File_views_canvas_canvasDvtCompositionInputCatalog_ts_568d786e: {
    label: "canvasDvtCompositionInputCatalog.ts"
  }
  File_iews_canvas_canvasDvtConnectionAuthority_test_ts_cfdcf8c5: {
    label: "canvasDvtConnectionAuthority.test.ts"
  }
  File_src_app_views_canvas_canvasDvtSinkAuthoring_ts_e7a74d40: {
    label: "canvasDvtSinkAuthoring.ts"
  }
  File_src_app_views_canvas_canvasDvtSourceAuthoring_ts_6ad9eb19: {
    label: "canvasDvtSourceAuthoring.ts"
  }
  File_views_canvas_canvasDvtSourceSemanticAuthoring_ts_34ab38a3: {
    label: "canvasDvtSourceSemanticAuthoring.ts"
  }
  File_canvas_canvasDvtSubstraitAggregateWindow_test_ts_fda3dbb6: {
    label: "canvasDvtSubstraitAggregateWindow.test.ts"
  }
  File_iews_canvas_canvasDvtSubstraitAggregateWindow_ts_a3ade4a9: {
    label: "canvasDvtSubstraitAggregateWindow.ts"
  }
  File_ews_canvas_canvasDvtSubstraitAggregation_test_ts_8bc0b6f7: {
    label: "canvasDvtSubstraitAggregation.test.ts"
  }
  File_pp_views_canvas_canvasDvtSubstraitAggregation_ts_41c6d411: {
    label: "canvasDvtSubstraitAggregation.ts"
  }
  File_ews_canvas_canvasDvtSubstraitCalculatedColumn_ts_7f8abfe1: {
    label: "canvasDvtSubstraitCalculatedColumn.ts"
  }
  File_canvas_canvasDvtSubstraitCalculatedExpression_ts_4862c22c: {
    label: "canvasDvtSubstraitCalculatedExpression.ts"
  }
  File_s_canvas_canvasDvtSubstraitFieldDocumentation_ts_f9163c8a: {
    label: "canvasDvtSubstraitFieldDocumentation.ts"
  }
  File_pp_views_canvas_canvasDvtSubstraitFilter_test_ts_4e6b45e9: {
    label: "canvasDvtSubstraitFilter.test.ts"
  }
  File_src_app_views_canvas_canvasDvtSubstraitFilter_ts_3fd1e491: {
    label: "canvasDvtSubstraitFilter.ts"
  }
  File_as_canvasDvtSubstraitFilterPostgresProjection_ts_f439ec81: {
    label: "canvasDvtSubstraitFilterPostgresProjection.ts"
  }
  File_canvas_canvasDvtSubstraitJoinComposition_test_ts_782c382c: {
    label: "canvasDvtSubstraitJoinComposition.test.ts"
  }
  File_iews_canvas_canvasDvtSubstraitJoinComposition_ts_947cc129: {
    label: "canvasDvtSubstraitJoinComposition.ts"
  }
  File_anvas_canvasDvtSubstraitOutputProjection_test_ts_9c3ffc95: {
    label: "canvasDvtSubstraitOutputProjection.test.ts"
  }
  File_ews_canvas_canvasDvtSubstraitOutputProjection_ts_b15dd901: {
    label: "canvasDvtSubstraitOutputProjection.ts"
  }
  File_ws_canvas_canvasDvtSubstraitPilot_review_test_ts_a760baf6: {
    label: "canvasDvtSubstraitPilot.review.test.ts"
  }
  File_app_views_canvas_canvasDvtSubstraitPilot_test_ts_a7e30395: {
    label: "canvasDvtSubstraitPilot.test.ts"
  }
  File_src_app_views_canvas_canvasDvtSubstraitPilot_ts_b82f0253: {
    label: "canvasDvtSubstraitPilot.ts"
  }
  File_pp_views_canvas_canvasDvtSubstraitPostgresAst_ts_2e068736: {
    label: "canvasDvtSubstraitPostgresAst.ts"
  }
  File_vas_canvasDvtSubstraitPostgresProjection_test_ts_55f689fb: {
    label: "canvasDvtSubstraitPostgresProjection.test.ts"
  }
  File_s_canvas_canvasDvtSubstraitPostgresProjection_ts_20f4e874: {
    label: "canvasDvtSubstraitPostgresProjection.ts"
  }
  File_anvas_canvasDvtSubstraitProjection_alias_test_ts_c21c56d5: {
    label: "canvasDvtSubstraitProjection.alias.test.ts"
  }
  File_sDvtSubstraitProjection_fieldComposition_test_ts_61352581: {
    label: "canvasDvtSubstraitProjection.fieldComposition.test.ts"
  }
  File_app_views_canvas_canvasDvtSubstraitProjection_ts_f96b2725: {
    label: "canvasDvtSubstraitProjection.ts"
  }
  File__views_canvas_canvasDvtSubstraitSemanticCodec_ts_96280d0c: {
    label: "canvasDvtSubstraitSemanticCodec.ts"
  }
  File_ews_canvas_canvasDvtSubstraitSemanticDocument_ts_ee2fc2ba: {
    label: "canvasDvtSubstraitSemanticDocument.ts"
  }
  File__canvas_canvasDvtSubstraitSetComposition_test_ts_ce410852: {
    label: "canvasDvtSubstraitSetComposition.test.ts"
  }
  File_views_canvas_canvasDvtSubstraitSetComposition_ts_4552deac: {
    label: "canvasDvtSubstraitSetComposition.ts"
  }
  File_canvas_canvasDvtSubstraitStructuredField_test_ts_9d12a475: {
    label: "canvasDvtSubstraitStructuredField.test.ts"
  }
  File_iews_canvas_canvasDvtSubstraitStructuredField_ts_10ddadb0: {
    label: "canvasDvtSubstraitStructuredField.ts"
  }
  File_anvas_canvasDvtSubstraitStructuredFieldAppend_ts_875d46d7: {
    label: "canvasDvtSubstraitStructuredFieldAppend.ts"
  }
  File_vas_canvasDvtSubstraitStructuredFieldMutation_ts_d5226e46: {
    label: "canvasDvtSubstraitStructuredFieldMutation.ts"
  }
  File_canvasDvtSubstraitStructuredFieldReorder_test_ts_7edc248b: {
    label: "canvasDvtSubstraitStructuredFieldReorder.test.ts"
  }
  File_nvas_canvasDvtSubstraitStructuredFieldReorder_ts_e1c2cb7d: {
    label: "canvasDvtSubstraitStructuredFieldReorder.ts"
  }
  File_p_views_canvas_canvasDvtSubstraitTextEquality_ts_13f5891c: {
    label: "canvasDvtSubstraitTextEquality.ts"
  }
  File_pp_views_canvas_canvasDvtSubstraitWindow_test_ts_8356d724: {
    label: "canvasDvtSubstraitWindow.test.ts"
  }
  File_src_app_views_canvas_canvasDvtSubstraitWindow_ts_cdd07cc3: {
    label: "canvasDvtSubstraitWindow.ts"
  }
  File__app_views_canvas_canvasDvtTransformAuthoring_ts_8fbd639a: {
    label: "canvasDvtTransformAuthoring.ts"
  }
  File_vas_canvasDvtTransformAuthoringAuthority_test_ts_9aa432af: {
    label: "canvasDvtTransformAuthoringAuthority.test.ts"
  }
  File_s_canvas_canvasDvtTransformAuthoringAuthority_ts_7340f385: {
    label: "canvasDvtTransformAuthoringAuthority.ts"
  }
  File_geAdmissionTransaction_sourceReplacement_test_ts_552420ef: {
    label: "canvasEdgeAdmissionTransaction.sourceReplacement.test.ts"
  }
  File_ws_canvas_canvasEdgeAdmissionTransaction_test_ts_f2a702f3: {
    label: "canvasEdgeAdmissionTransaction.test.ts"
  }
  File_p_views_canvas_canvasEdgeAdmissionTransaction_ts_38973925: {
    label: "canvasEdgeAdmissionTransaction.ts"
  }
  File_ws_canvas_canvasEdgeExecutionContextMenu_test_ts_fd8f4b32: {
    label: "canvasEdgeExecutionContextMenu.test.ts"
  }
  File_vasEmptyAuthoringEntrypoint_architecture_test_ts_7bae0360: {
    label: "CanvasEmptyAuthoringEntrypoint.architecture.test.ts"
  }
  File_app_views_canvas_canvasExecutionActions_types_ts_abce419b: {
    label: "canvasExecutionActions.types.ts"
  }
  File_src_app_views_canvas_canvasExecutionCopy_test_ts_d2fd32bc: {
    label: "canvasExecutionCopy.test.ts"
  }
  File_sExecutionSelectionRecovery_architecture_test_ts_eb96011b: {
    label: "canvasExecutionSelectionRecovery.architecture.test.ts"
  }
  File__canvas_canvasExecutionSelectionRecovery_test_ts_9ebd08dc: {
    label: "canvasExecutionSelectionRecovery.test.ts"
  }
  File_views_canvas_canvasExecutionSelectionRecovery_ts_3a94ff26: {
    label: "canvasExecutionSelectionRecovery.ts"
  }
  File_ecutionSelectionRecoveryAuthorityAdapter_test_ts_f341bfdc: {
    label: "canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts"
  }
  File_vasExecutionSelectionRecoveryAuthorityAdapter_ts_c2074b5a: {
    label: "canvasExecutionSelectionRecoveryAuthorityAdapter.ts"
  }
  File_src_app_views_canvas_canvasExecutionState_ts_4b629f71: {
    label: "canvasExecutionState.ts"
  }
  File_ws_canvas_canvasFirstAuthoringFirstNodePolicy_ts_6891227c: {
    label: "canvasFirstAuthoringFirstNodePolicy.ts"
  }
  File_ews_canvas_canvasFirstAuthoringLiveProof_test_ts_9d6c5552: {
    label: "canvasFirstAuthoringLiveProof.test.ts"
  }
  File_pp_views_canvas_canvasFirstAuthoringLiveProof_ts_46ea39c8: {
    label: "canvasFirstAuthoringLiveProof.ts"
  }
  File_ws_canvas_canvasFirstAuthoringLiveProof_types_ts_e2317553: {
    label: "canvasFirstAuthoringLiveProof.types.ts"
  }
  File_ews_canvas_canvasFirstAuthoringProofInvariant_ts_ec1d5c25: {
    label: "canvasFirstAuthoringProofInvariant.ts"
  }
  File_nvas_canvasFirstAuthoringRestoredLayoutPolicy_ts_b2cfec18: {
    label: "canvasFirstAuthoringRestoredLayoutPolicy.ts"
  }
  File_ews_canvas_canvasGeneratedDbtModelReplacement_ts_8a28c4e0: {
    label: "canvasGeneratedDbtModelReplacement.ts"
  }
  File_src_app_views_canvas_canvasGitProvenance_ts_59226a78: {
    label: "canvasGitProvenance.ts"
  }
  File_src_app_views_canvas_canvasGraphChangeRuntime_ts_fbaf8123: {
    label: "canvasGraphChangeRuntime.ts"
  }
  File__views_canvas_canvasGraphFilter_contract_test_ts_b1533ed0: {
    label: "canvasGraphFilter.contract.test.ts"
  }
  File_c_app_views_canvas_canvasGraphFilter_contract_ts_3263f7b0: {
    label: "canvasGraphFilter.contract.ts"
  }
  File_src_app_views_canvas_canvasGraphFilter_test_ts_cc97c4f3: {
    label: "canvasGraphFilter.test.ts"
  }
  File_src_app_views_canvas_canvasGraphFilter_ts_ea910832: {
    label: "canvasGraphFilter.ts"
  }
  File_p_views_canvas_CanvasGraphFilterControl_test_tsx_c4af339a: {
    label: "CanvasGraphFilterControl.test.tsx"
  }
  File_rc_app_views_canvas_CanvasGraphFilterControl_tsx_7ad48208: {
    label: "CanvasGraphFilterControl.tsx"
  }
  File_ews_canvas_canvasGraphFilterPresentation_test_ts_b95ad713: {
    label: "canvasGraphFilterPresentation.test.ts"
  }
  File_pp_views_canvas_canvasGraphFilterPresentation_ts_0c47ef93: {
    label: "canvasGraphFilterPresentation.ts"
  }
  File_ews_canvas_canvasGraphHandlerContractBuilders_ts_b066f06c: {
    label: "canvasGraphHandlerContractBuilders.ts"
  }
  File__app_views_canvas_canvasGraphHandlerContracts_ts_769fcd71: {
    label: "canvasGraphHandlerContracts.ts"
  }
  File_canvas_canvasGraphLifecycle_architecture_test_ts_1753f12c: {
    label: "canvasGraphLifecycle.architecture.test.ts"
  }
  File_rc_app_views_canvas_canvasGraphLifecycle_edge_ts_dc9252c2: {
    label: "canvasGraphLifecycle.edge.ts"
  }
  File_rc_app_views_canvas_canvasGraphLifecycle_node_ts_b338b548: {
    label: "canvasGraphLifecycle.node.ts"
  }
  File_rc_app_views_canvas_canvasGraphLifecycle_test_ts_3feb2bf2: {
    label: "canvasGraphLifecycle.test.ts"
  }
  File_src_app_views_canvas_canvasGraphLifecycle_ts_3a8d9d74: {
    label: "canvasGraphLifecycle.ts"
  }
  File_c_app_views_canvas_canvasGraphLifecycle_types_ts_28b45d3d: {
    label: "canvasGraphLifecycle.types.ts"
  }
  File_views_canvas_canvasGraphLifecycleFallout_test_ts_69d33016: {
    label: "canvasGraphLifecycleFallout.test.ts"
  }
  File__app_views_canvas_canvasGraphLifecycleFallout_ts_2f049de7: {
    label: "canvasGraphLifecycleFallout.ts"
  }
  File_s_canvas_canvasGraphNodeColumnProjection_test_ts_5c5a58b0: {
    label: "canvasGraphNodeColumnProjection.test.ts"
  }
  File__views_canvas_canvasGraphNodeColumnProjection_ts_2fd0f767: {
    label: "canvasGraphNodeColumnProjection.ts"
  }
  File__views_canvas_canvasGraphSearch_contract_test_ts_bcc9ee01: {
    label: "canvasGraphSearch.contract.test.ts"
  }
  File_c_app_views_canvas_canvasGraphSearch_contract_ts_d91fc3d7: {
    label: "canvasGraphSearch.contract.ts"
  }
  File_src_app_views_canvas_canvasGraphSearch_test_ts_cfade368: {
    label: "canvasGraphSearch.test.ts"
  }
  File_src_app_views_canvas_canvasGraphSearch_ts_7b9f4ead: {
    label: "canvasGraphSearch.ts"
  }
  File_p_views_canvas_CanvasGraphSearchControl_test_tsx_14ca9e34: {
    label: "CanvasGraphSearchControl.test.tsx"
  }
  File_rc_app_views_canvas_CanvasGraphSearchControl_tsx_f491cabc: {
    label: "CanvasGraphSearchControl.tsx"
  }
  File_ews_canvas_canvasGraphSearchPresentation_test_ts_3742bd20: {
    label: "canvasGraphSearchPresentation.test.ts"
  }
  File_pp_views_canvas_canvasGraphSearchPresentation_ts_cf2cef19: {
    label: "canvasGraphSearchPresentation.ts"
  }
  File_p_views_canvas_CanvasGraphStatusOverlay_test_tsx_c8d7c121: {
    label: "CanvasGraphStatusOverlay.test.tsx"
  }
  File_rc_app_views_canvas_CanvasGraphStatusOverlay_tsx_2be94dbc: {
    label: "CanvasGraphStatusOverlay.tsx"
  }
  File_views_canvas_canvasGraphUtils_largeGraph_test_ts_1c9f1861: {
    label: "canvasGraphUtils.largeGraph.test.ts"
  }
  File_src_app_views_canvas_canvasGraphUtils_ts_c666ce09: {
    label: "canvasGraphUtils.ts"
  }
  File_nvas_canvasHandlerContracts_architecture_test_ts_05822314: {
    label: "canvasHandlerContracts.architecture.test.ts"
  }
  File_rc_app_views_canvas_canvasHostCycleState_test_ts_70cc68d6: {
    label: "canvasHostCycleState.test.ts"
  }
  File_src_app_views_canvas_canvasHostCycleState_ts_c21fb3cb: {
    label: "canvasHostCycleState.ts"
  }
  File_p_views_canvas_canvasInspectorAuthoring_types_ts_a3169a08: {
    label: "canvasInspectorAuthoring.types.ts"
  }
  File__views_canvas_canvasInspectorAuthoringCommand_ts_f7987ba3: {
    label: "canvasInspectorAuthoringCommand.ts"
  }
  File_ews_canvas_canvasInspectorAuthoringErrorCodes_ts_a0e83ef2: {
    label: "canvasInspectorAuthoringErrorCodes.ts"
  }
  File_ews_canvas_canvasInspectorAuthoringModel_test_ts_7187505f: {
    label: "canvasInspectorAuthoringModel.test.ts"
  }
  File_pp_views_canvas_canvasInspectorAuthoringModel_ts_f8f9c974: {
    label: "canvasInspectorAuthoringModel.ts"
  }
  File_views_canvas_CanvasInspectorAuthoringSection_tsx_5448bf55: {
    label: "CanvasInspectorAuthoringSection.tsx"
  }
  File_asInteractionCommandSurface_architecture_test_ts_2217b3e1: {
    label: "canvasInteractionCommandSurface.architecture.test.ts"
  }
  File_s_canvas_canvasInteractionCommandSurface_test_ts_65585c96: {
    label: "canvasInteractionCommandSurface.test.ts"
  }
  File__views_canvas_canvasInteractionCommandSurface_ts_275b8f18: {
    label: "canvasInteractionCommandSurface.ts"
  }
  File_ews_canvas_canvasKindRegistration_testSupport_ts_21bf7921: {
    label: "canvasKindRegistration.testSupport.ts"
  }
  File_vas_canvasLayoutPersistence_architecture_test_ts_a98241e4: {
    label: "canvasLayoutPersistence.architecture.test.ts"
  }
  File_ews_canvas_CanvasModalHost_architecture_test_tsx_99f5fea8: {
    label: "CanvasModalHost.architecture.test.tsx"
  }
  File_src_app_views_canvas_CanvasModalHost_tsx_9dd4d0d6: {
    label: "CanvasModalHost.tsx"
  }
  File_src_app_views_canvas_canvasModalHost_types_ts_05e0877a: {
    label: "canvasModalHost.types.ts"
  }
  File_views_canvas_canvasModalHostPropsBuilder_test_ts_2e45994f: {
    label: "canvasModalHostPropsBuilder.test.ts"
  }
  File__app_views_canvas_canvasModalHostPropsBuilder_ts_5c267986: {
    label: "canvasModalHostPropsBuilder.ts"
  }
  File__canvas_canvasMutationHandlerContractBuilders_ts_df7a8a34: {
    label: "canvasMutationHandlerContractBuilders.ts"
  }
  File_p_views_canvas_canvasMutationHandlerContracts_ts_12c3a198: {
    label: "canvasMutationHandlerContracts.ts"
  }
  File_app_views_canvas_canvasMutationHandlers_types_ts_97175a40: {
    label: "canvasMutationHandlers.types.ts"
  }
  File_ws_canvas_canvasNodeAdmissionTransaction_test_ts_b70a5acf: {
    label: "canvasNodeAdmissionTransaction.test.ts"
  }
  File_p_views_canvas_canvasNodeAdmissionTransaction_ts_6511977a: {
    label: "canvasNodeAdmissionTransaction.ts"
  }
  File_ews_canvas_canvasNodeContextSurfaceModel_test_ts_5011b931: {
    label: "canvasNodeContextSurfaceModel.test.ts"
  }
  File_pp_views_canvas_canvasNodeContextSurfaceModel_ts_49bdf8ad: {
    label: "canvasNodeContextSurfaceModel.ts"
  }
  File_app_views_canvas_canvasNodeDropAggregate_test_ts_ad5d4601: {
    label: "canvasNodeDropAggregate.test.ts"
  }
  File_src_app_views_canvas_canvasNodeDropAggregate_ts_494c0121: {
    label: "canvasNodeDropAggregate.ts"
  }
  File_c_app_views_canvas_canvasNodeDropPayload_test_ts_80152939: {
    label: "canvasNodeDropPayload.test.ts"
  }
  File_src_app_views_canvas_canvasNodeDropPayload_ts_dc09cb0d: {
    label: "canvasNodeDropPayload.ts"
  }
  File_iews_canvas_canvasNodeInteractionPresentation_ts_8f022784: {
    label: "canvasNodeInteractionPresentation.ts"
  }
  File_src_app_views_canvas_canvasNodeMapper_test_ts_b8d1aa4d: {
    label: "canvasNodeMapper.test.ts"
  }
  File_src_app_views_canvas_canvasNodeMapper_ts_23b980f6: {
    label: "canvasNodeMapper.ts"
  }
  File_c_app_views_canvas_canvasNodePresentationCopy_ts_30a39c41: {
    label: "canvasNodePresentationCopy.ts"
  }
  File_dePresentationProjection_outputSelection_test_ts_c2f4ef55: {
    label: "canvasNodePresentationProjection.outputSelection.test.ts"
  }
  File__canvas_canvasNodePresentationProjection_test_ts_b4fde212: {
    label: "canvasNodePresentationProjection.test.ts"
  }
  File_views_canvas_canvasNodePresentationProjection_ts_a1daa113: {
    label: "canvasNodePresentationProjection.ts"
  }
  File_src_app_views_canvas_canvasNodeTagPolicy_ts_2ce0a75a: {
    label: "canvasNodeTagPolicy.ts"
  }
  File_s_canvas_canvasNodeWorkbenchContribution_test_ts_2e338a3c: {
    label: "canvasNodeWorkbenchContribution.test.ts"
  }
  File__views_canvas_canvasNodeWorkbenchContribution_ts_6d29759e: {
    label: "canvasNodeWorkbenchContribution.ts"
  }
  File_p_views_canvas_canvasNodeWorkbenchDomGeometry_ts_4aa446a9: {
    label: "canvasNodeWorkbenchDomGeometry.ts"
  }
  File_odeWorkbenchDraftController_architecture_test_ts_8edfe1ab: {
    label: "CanvasNodeWorkbenchDraftController.architecture.test.ts"
  }
  File_views_canvas_CanvasNodeWorkbenchOverlay_test_tsx_30e0b4e8: {
    label: "CanvasNodeWorkbenchOverlay.test.tsx"
  }
  File__app_views_canvas_CanvasNodeWorkbenchOverlay_tsx_c784682f: {
    label: "CanvasNodeWorkbenchOverlay.tsx"
  }
  File__CanvasNodeWorkbenchPanel_contributions_test_tsx_fa84a90f: {
    label: "CanvasNodeWorkbenchPanel.contributions.test.tsx"
  }
  File__canvas_CanvasNodeWorkbenchPanel_header_test_tsx_a35bddd6: {
    label: "CanvasNodeWorkbenchPanel.header.test.tsx"
  }
  File_p_views_canvas_CanvasNodeWorkbenchPanel_test_tsx_f461c04e: {
    label: "CanvasNodeWorkbenchPanel.test.tsx"
  }
  File_rc_app_views_canvas_CanvasNodeWorkbenchPanel_tsx_7c5c6819: {
    label: "CanvasNodeWorkbenchPanel.tsx"
  }
  File__canvas_canvasNodeWorkbenchPositionModel_test_ts_1c5e6f9b: {
    label: "canvasNodeWorkbenchPositionModel.test.ts"
  }
  File_views_canvas_canvasNodeWorkbenchPositionModel_ts_5c22538f: {
    label: "canvasNodeWorkbenchPositionModel.ts"
  }
  File_anvas_canvasNodeWorkbenchSectionStrategy_test_ts_85e2aeab: {
    label: "canvasNodeWorkbenchSectionStrategy.test.ts"
  }
  File_ews_canvas_canvasNodeWorkbenchSectionStrategy_ts_9be578af: {
    label: "canvasNodeWorkbenchSectionStrategy.ts"
  }
  File_ews_canvas_canvasNodeWorkbenchVisibility_test_ts_db48ed6a: {
    label: "canvasNodeWorkbenchVisibility.test.ts"
  }
  File_pp_views_canvas_canvasNodeWorkbenchVisibility_ts_3f1b84d4: {
    label: "canvasNodeWorkbenchVisibility.ts"
  }
  File__views_canvas_canvasNodeWorkbenchVisualTokens_ts_6fece26d: {
    label: "canvasNodeWorkbenchVisualTokens.ts"
  }
  File_vas_canvasOperationalDrawerContribution_test_tsx_4443da6f: {
    label: "canvasOperationalDrawerContribution.test.tsx"
  }
  File_ws_canvas_canvasOperationalDrawerContribution_ts_cdb9a4d7: {
    label: "canvasOperationalDrawerContribution.ts"
  }
  File_sOperationalDrawerContributionRegistrar_test_tsx_07442fe1: {
    label: "CanvasOperationalDrawerContributionRegistrar.test.tsx"
  }
  File_CanvasOperationalDrawerContributionRegistrar_tsx_85ebc9bf: {
    label: "CanvasOperationalDrawerContributionRegistrar.tsx"
  }
  File_rc_app_views_canvas_canvasOverlayContext_test_ts_291e5f4d: {
    label: "canvasOverlayContext.test.ts"
  }
  File_src_app_views_canvas_canvasOverlayContext_ts_59c0e216: {
    label: "canvasOverlayContext.ts"
  }
  File_src_app_views_canvas_canvasPalette_test_ts_760403ee: {
    label: "canvasPalette.test.ts"
  }
  File_src_app_views_canvas_canvasPalette_ts_ee318419: {
    label: "canvasPalette.ts"
  }
  File__canvas_canvasPlanAction_dbtProjectFiles_test_ts_6ed9d6b1: {
    label: "canvasPlanAction.dbtProjectFiles.test.ts"
  }
  File__canvasPlanAction_graphDraftSqlAuthority_test_ts_3c112856: {
    label: "canvasPlanAction.graphDraftSqlAuthority.test.ts"
  }
  File_src_app_views_canvas_canvasPlanAction_ts_a04b8284: {
    label: "canvasPlanAction.ts"
  }
  File_src_app_views_canvas_canvasPlanReadiness_test_ts_a3cff63c: {
    label: "canvasPlanReadiness.test.ts"
  }
  File_src_app_views_canvas_canvasPlanReadiness_ts_a4ac2dca: {
    label: "canvasPlanReadiness.ts"
  }
  File_anvas_CanvasPlaygroundHost_architecture_test_tsx_636a739f: {
    label: "CanvasPlaygroundHost.architecture.test.tsx"
  }
  File__views_canvas_CanvasPlaygroundHost_templates_tsx_494e038c: {
    label: "CanvasPlaygroundHost.templates.tsx"
  }
  File_c_app_views_canvas_CanvasPlaygroundHost_test_tsx_0371bfc5: {
    label: "CanvasPlaygroundHost.test.tsx"
  }
  File_src_app_views_canvas_CanvasPlaygroundHost_tsx_eb62de97: {
    label: "CanvasPlaygroundHost.tsx"
  }
  File_ws_canvas_canvasPreviewOutcomeProjection_test_ts_868b8f8c: {
    label: "canvasPreviewOutcomeProjection.test.ts"
  }
  File_p_views_canvas_canvasPreviewOutcomeProjection_ts_b8cb5ba2: {
    label: "canvasPreviewOutcomeProjection.ts"
  }
  File_iews_canvas_canvasProjectCanvasLifecycle_test_ts_f7edf314: {
    label: "canvasProjectCanvasLifecycle.test.ts"
  }
  File_app_views_canvas_canvasProjectCanvasLifecycle_ts_743a87ad: {
    label: "canvasProjectCanvasLifecycle.ts"
  }
  File_ws_canvas_canvasProjectCanvasLifecycleCommand_ts_841b8b23: {
    label: "canvasProjectCanvasLifecycleCommand.ts"
  }
  File_iews_canvas_CanvasProjectExplorerDialog_test_tsx_e0021249: {
    label: "CanvasProjectExplorerDialog.test.tsx"
  }
  File_app_views_canvas_CanvasProjectExplorerDialog_tsx_bc118a8f: {
    label: "CanvasProjectExplorerDialog.tsx"
  }
  File_anvas_canvasProjectSnapshot_architecture_test_ts_0fd87256: {
    label: "canvasProjectSnapshot.architecture.test.ts"
  }
  File_c_app_views_canvas_canvasProjectSnapshot_test_ts_592fe368: {
    label: "canvasProjectSnapshot.test.ts"
  }
  File_src_app_views_canvas_canvasProjectSnapshot_ts_39d3f046: {
    label: "canvasProjectSnapshot.ts"
  }
  File_anvas_canvasProjectSnapshotImportCommand_test_ts_0c4b7c63: {
    label: "canvasProjectSnapshotImportCommand.test.ts"
  }
  File_ews_canvas_canvasProjectSnapshotImportCommand_ts_4f8b7f71: {
    label: "canvasProjectSnapshotImportCommand.ts"
  }
  File_anvas_CanvasRecoveryBanner_architecture_test_tsx_3f6e56c6: {
    label: "CanvasRecoveryBanner.architecture.test.tsx"
  }
  File__views_canvas_CanvasRecoveryBanner_templates_tsx_4c1bfe3b: {
    label: "CanvasRecoveryBanner.templates.tsx"
  }
  File_c_app_views_canvas_CanvasRecoveryBanner_test_tsx_9cbbcf90: {
    label: "CanvasRecoveryBanner.test.tsx"
  }
  File_src_app_views_canvas_CanvasRecoveryBanner_tsx_c7ae66e5: {
    label: "CanvasRecoveryBanner.tsx"
  }
  File_p_views_canvas_canvasRecoveryBannerModel_test_ts_d543fe4a: {
    label: "canvasRecoveryBannerModel.test.ts"
  }
  File_rc_app_views_canvas_canvasRecoveryBannerModel_ts_87681a92: {
    label: "canvasRecoveryBannerModel.ts"
  }
  File_rc_app_views_canvas_canvasRouteAuthority_test_ts_5ca905d6: {
    label: "canvasRouteAuthority.test.ts"
  }
  File_src_app_views_canvas_canvasRouteAuthority_ts_05612346: {
    label: "canvasRouteAuthority.ts"
  }
  File_views_canvas_canvasRouteInteractionState_test_ts_4229bf6f: {
    label: "canvasRouteInteractionState.test.ts"
  }
  File__app_views_canvas_canvasRouteInteractionState_ts_917bd4d5: {
    label: "canvasRouteInteractionState.ts"
  }
  File__canvasRoutePosturePriority_architecture_test_ts_0323b3a3: {
    label: "canvasRoutePosturePriority.architecture.test.ts"
  }
  File_canvas_canvasRouteViewState_architecture_test_ts_880e4b5e: {
    label: "canvasRouteViewState.architecture.test.ts"
  }
  File_rc_app_views_canvas_canvasRouteViewState_test_ts_cfb1d811: {
    label: "canvasRouteViewState.test.ts"
  }
  File_src_app_views_canvas_canvasRouteViewState_ts_6a5fa6c9: {
    label: "canvasRouteViewState.ts"
  }
  File_src_app_views_canvas_canvasRunSelection_test_ts_f82ad0ef: {
    label: "canvasRunSelection.test.ts"
  }
  File_src_app_views_canvas_canvasRunSelection_ts_36fa5558: {
    label: "canvasRunSelection.ts"
  }
  File_src_app_views_canvas_canvasRunStartAction_ts_2947c12a: {
    label: "canvasRunStartAction.ts"
  }
  File_nvas_canvasRunStartIdentity_architecture_test_ts_86c0f712: {
    label: "canvasRunStartIdentity.architecture.test.ts"
  }
  File_src_app_views_canvas_canvasRuntimePolicy_test_ts_6b7d0933: {
    label: "canvasRuntimePolicy.test.ts"
  }
  File_src_app_views_canvas_canvasRuntimePolicy_ts_6e70da63: {
    label: "canvasRuntimePolicy.ts"
  }
  File_anvas_CanvasSettingsDialog_architecture_test_tsx_9c359273: {
    label: "CanvasSettingsDialog.architecture.test.tsx"
  }
  File_c_app_views_canvas_CanvasSettingsDialog_test_tsx_7155db8d: {
    label: "CanvasSettingsDialog.test.tsx"
  }
  File_src_app_views_canvas_CanvasSettingsDialog_tsx_e1d24439: {
    label: "CanvasSettingsDialog.tsx"
  }
  File_p_views_canvas_CanvasShell_architecture_test_tsx_e343116d: {
    label: "CanvasShell.architecture.test.tsx"
  }
  File_ws_canvas_CanvasShell_contextualDialogs_test_tsx_9eda4037: {
    label: "CanvasShell.contextualDialogs.test.tsx"
  }
  File_p_views_canvas_CanvasShell_graphSurface_test_tsx_e7eb07ec: {
    label: "CanvasShell.graphSurface.test.tsx"
  }
  File_ws_canvas_CanvasShell_operationalDrawer_test_tsx_2473de1b: {
    label: "CanvasShell.operationalDrawer.test.tsx"
  }
  File_as_CanvasShell_sourceImportAvailability_test_tsx_73210fd5: {
    label: "CanvasShell.sourceImportAvailability.test.tsx"
  }
  File_anvas_CanvasShell_sourceImportLifecycle_test_tsx_3079c448: {
    label: "CanvasShell.sourceImportLifecycle.test.tsx"
  }
  File_src_app_views_canvas_CanvasShell_testHarness_tsx_c40fd7a1: {
    label: "CanvasShell.testHarness.tsx"
  }
  File_src_app_views_canvas_CanvasShell_tsx_19c297a0: {
    label: "CanvasShell.tsx"
  }
  File_ws_canvas_canvasShell_types_architecture_test_ts_177edd75: {
    label: "canvasShell.types.architecture.test.ts"
  }
  File_src_app_views_canvas_canvasShell_types_ts_229ab18c: {
    label: "canvasShell.types.ts"
  }
  File_as_canvasShellBuilder_types_architecture_test_ts_90b8ecc5: {
    label: "canvasShellBuilder.types.architecture.test.ts"
  }
  File_src_app_views_canvas_canvasShellBuilder_types_ts_bde4098a: {
    label: "canvasShellBuilder.types.ts"
  }
  File_views_canvas_canvasShellChromeCommandsBuilder_ts_0b6158a2: {
    label: "canvasShellChromeCommandsBuilder.ts"
  }
  File_pp_views_canvas_canvasShellChromeStateBuilder_ts_fd34137d: {
    label: "canvasShellChromeStateBuilder.ts"
  }
  File_src_app_views_canvas_canvasShellGraphBuilder_ts_d695eb47: {
    label: "canvasShellGraphBuilder.ts"
  }
  File__views_canvas_canvasShellGraphCommandsBuilder_ts_f8f3d6ab: {
    label: "canvasShellGraphCommandsBuilder.ts"
  }
  File_rc_app_views_canvas_canvasShellLayoutBuilder_tsx_93177704: {
    label: "canvasShellLayoutBuilder.tsx"
  }
  File_canvas_CanvasShellMainPanel_architecture_test_ts_3f2057d0: {
    label: "CanvasShellMainPanel.architecture.test.ts"
  }
  File_src_app_views_canvas_CanvasShellMainPanel_tsx_debffab0: {
    label: "CanvasShellMainPanel.tsx"
  }
  File_c_app_views_canvas_CanvasShellMainPanelFrame_tsx_5e9d6133: {
    label: "CanvasShellMainPanelFrame.tsx"
  }
  File_pp_views_canvas_canvasShellPanelsBuilder_test_ts_c3e5ace4: {
    label: "canvasShellPanelsBuilder.test.ts"
  }
  File_src_app_views_canvas_canvasShellPanelsBuilder_ts_d6ca42bb: {
    label: "canvasShellPanelsBuilder.ts"
  }
  File_vas_canvasShellPropsBuilder_architecture_test_ts_e338bcb4: {
    label: "canvasShellPropsBuilder.architecture.test.ts"
  }
  File_src_app_views_canvas_canvasShellPropsBuilder_tsx_e97c1ee5: {
    label: "canvasShellPropsBuilder.tsx"
  }
  File_app_views_canvas_canvasSourceColumnOrder_test_ts_96701391: {
    label: "canvasSourceColumnOrder.test.ts"
  }
  File_src_app_views_canvas_canvasSourceColumnOrder_ts_57c57239: {
    label: "canvasSourceColumnOrder.ts"
  }
  File__app_views_canvas_canvasSourceDataSample_test_ts_1afc8b27: {
    label: "canvasSourceDataSample.test.ts"
  }
  File_src_app_views_canvas_canvasSourceDataSample_ts_eda71c13: {
    label: "canvasSourceDataSample.ts"
  }
  File_iews_canvas_CanvasSourceImportDialogHost_test_ts_0a881041: {
    label: "CanvasSourceImportDialogHost.test.ts"
  }
  File_pp_views_canvas_CanvasSourceImportDialogHost_tsx_c0b5b5f4: {
    label: "CanvasSourceImportDialogHost.tsx"
  }
  File_CanvasSourceImportLiveProof_architecture_test_ts_860f14d6: {
    label: "CanvasSourceImportLiveProof.architecture.test.ts"
  }
  File_src_app_views_canvas_canvasSqlIdentifier_ts_ef6109e8: {
    label: "canvasSqlIdentifier.ts"
  }
  File_sStartupAndDraftRecovery_architecture_support_ts_f0f31e0d: {
    label: "canvasStartupAndDraftRecovery.architecture.support.ts"
  }
  File_StartupBootstrapPublication_architecture_test_ts_65556af9: {
    label: "canvasStartupBootstrapPublication.architecture.test.ts"
  }
  File_src_app_views_canvas_CanvasStateViews_tsx_fa4e5988: {
    label: "CanvasStateViews.tsx"
  }
  File_ws_canvas_canvasStructuredFieldAuthoring_test_ts_37ba88a1: {
    label: "canvasStructuredFieldAuthoring.test.ts"
  }
  File_p_views_canvas_canvasStructuredFieldAuthoring_ts_78489a15: {
    label: "canvasStructuredFieldAuthoring.ts"
  }
  File_app_views_canvas_canvasStructuredFieldLineage_ts_4b4de2ed: {
    label: "canvasStructuredFieldLineage.ts"
  }
  File_iews_canvas_canvasStructuredFieldPresentation_ts_e5b8263c: {
    label: "canvasStructuredFieldPresentation.ts"
  }
  File_as_canvasSubstraitPresentationFailClosed_test_ts_90e34337: {
    label: "canvasSubstraitPresentationFailClosed.test.ts"
  }
  File__views_canvas_canvasTemplatePresentation_test_ts_e4889cc7: {
    label: "canvasTemplatePresentation.test.ts"
  }
  File_c_app_views_canvas_canvasTemplatePresentation_ts_397571fb: {
    label: "canvasTemplatePresentation.ts"
  }
  File_s_canvas_canvasTransformColumnOrderProjection_ts_4e0d26ba: {
    label: "canvasTransformColumnOrderProjection.ts"
  }
  File_views_canvas_canvasTransformSourceReplacement_ts_acda6a3c: {
    label: "canvasTransformSourceReplacement.ts"
  }
  File_views_canvas_CanvasViewport_architecture_test_ts_87ba3ce9: {
    label: "CanvasViewport.architecture.test.ts"
  }
  File_views_canvas_CanvasViewport_graphFilter_test_tsx_0f472511: {
    label: "CanvasViewport.graphFilter.test.tsx"
  }
  File_views_canvas_CanvasViewport_graphSearch_test_tsx_77b6c877: {
    label: "CanvasViewport.graphSearch.test.tsx"
  }
  File_nvas_CanvasViewport_keyboardContextMenu_test_tsx_e42e8b51: {
    label: "CanvasViewport.keyboardContextMenu.test.tsx"
  }
  File__canvas_CanvasViewport_keyboardNodeEntry_test_ts_be99ceb1: {
    label: "CanvasViewport.keyboardNodeEntry.test.ts"
  }
  File_nvas_CanvasViewport_nodeOperationalRail_test_tsx_02eafb7e: {
    label: "CanvasViewport.nodeOperationalRail.test.tsx"
  }
  File_src_app_views_canvas_CanvasViewport_test_tsx_8e879e61: {
    label: "CanvasViewport.test.tsx"
  }
  File__app_views_canvas_CanvasViewport_testHarness_tsx_2337fc4f: {
    label: "CanvasViewport.testHarness.tsx"
  }
  File_src_app_views_canvas_CanvasViewport_tsx_5e45d294: {
    label: "CanvasViewport.tsx"
  }
  File_vas_canvasViewportNodeTypeRegistryTestAdapter_ts_6555bfe1: {
    label: "canvasViewportNodeTypeRegistryTestAdapter.ts"
  }
  File_src_app_views_canvas_canvasViewportStyle_ts_4a4747b0: {
    label: "canvasViewportStyle.ts"
  }
  File_c_app_views_canvas_CanvasViewportSurfaceView_tsx_2921f2ef: {
    label: "CanvasViewportSurfaceView.tsx"
  }
  File_views_canvas_canvasViewportXyflowTestAdapter_tsx_135007d7: {
    label: "canvasViewportXyflowTestAdapter.tsx"
  }
  File_p_views_canvas_canvasWorkbenchLogEntries_test_ts_1aa00174: {
    label: "canvasWorkbenchLogEntries.test.ts"
  }
  File_rc_app_views_canvas_canvasWorkbenchLogEntries_ts_bdc897e8: {
    label: "canvasWorkbenchLogEntries.ts"
  }
  File_pp_views_canvas_CanvasWorkbenchLogPanel_test_tsx_8289ddcc: {
    label: "CanvasWorkbenchLogPanel.test.tsx"
  }
  File_src_app_views_canvas_CanvasWorkbenchLogPanel_tsx_40da8bfa: {
    label: "CanvasWorkbenchLogPanel.tsx"
  }
  File_p_views_canvas_canvasWorkbenchStateModel_test_ts_64a4dd8d: {
    label: "canvasWorkbenchStateModel.test.ts"
  }
  File_rc_app_views_canvas_canvasWorkbenchStateModel_ts_c3ba973f: {
    label: "canvasWorkbenchStateModel.ts"
  }
  File_s_canvas_canvasWorkspaceMenuContributionStore_ts_5040e0bf: {
    label: "canvasWorkspaceMenuContributionStore.ts"
  }
  File_iews_canvas_CanvasWorkspaceMenuControls_test_tsx_c6cdca1e: {
    label: "CanvasWorkspaceMenuControls.test.tsx"
  }
  File_app_views_canvas_CanvasWorkspaceMenuControls_tsx_3f57a486: {
    label: "CanvasWorkspaceMenuControls.tsx"
  }
  File_src_app_views_canvas_copy_test_ts_3de47cfd: {
    label: "copy.test.ts"
  }
  File_src_app_views_canvas_copy_ts_59f85ee7: {
    label: "copy.ts"
  }
  File_src_app_views_canvas_DbtAuthoringFields_test_tsx_4f0196db: {
    label: "DbtAuthoringFields.test.tsx"
  }
  File_src_app_views_canvas_DbtAuthoringFields_tsx_78df8d0f: {
    label: "DbtAuthoringFields.tsx"
  }
  File_app_views_canvas_dbtAuthoringFieldsModel_test_ts_219b2bd9: {
    label: "dbtAuthoringFieldsModel.test.ts"
  }
  File_src_app_views_canvas_dbtAuthoringFieldsModel_ts_85dd1fc3: {
    label: "dbtAuthoringFieldsModel.ts"
  }
  File_app_views_canvas_dbtExecutionScopePolicy_test_ts_6694598e: {
    label: "dbtExecutionScopePolicy.test.ts"
  }
  File_src_app_views_canvas_dbtExecutionScopePolicy_ts_356b5b6f: {
    label: "dbtExecutionScopePolicy.ts"
  }
  File_dbtExecutionTargetWorkbenchContribution_test_tsx_301e7dc1: {
    label: "dbtExecutionTargetWorkbenchContribution.test.tsx"
  }
  File_nvas_dbtExecutionTargetWorkbenchContribution_tsx_70bd3df2: {
    label: "dbtExecutionTargetWorkbenchContribution.tsx"
  }
  File_canvas_dbtGraphModelSqlPublicationPolicy_test_ts_c37240c8: {
    label: "dbtGraphModelSqlPublicationPolicy.test.ts"
  }
  File_iews_canvas_dbtGraphModelSqlPublicationPolicy_ts_ff8788c5: {
    label: "dbtGraphModelSqlPublicationPolicy.ts"
  }
  File_anvas_dbtGraphWorkspaceArtifactPublisher_test_ts_d62c624f: {
    label: "dbtGraphWorkspaceArtifactPublisher.test.ts"
  }
  File_ews_canvas_dbtGraphWorkspaceArtifactPublisher_ts_e67d9866: {
    label: "dbtGraphWorkspaceArtifactPublisher.ts"
  }
  File_rc_app_views_canvas_DbtModelAuthoringSection_tsx_fe6038df: {
    label: "DbtModelAuthoringSection.tsx"
  }
  File_ews_canvas_DbtModelCodeAuthoringSection_test_tsx_ec8710f7: {
    label: "DbtModelCodeAuthoringSection.test.tsx"
  }
  File_pp_views_canvas_DbtModelCodeAuthoringSection_tsx_3c96d3c8: {
    label: "DbtModelCodeAuthoringSection.tsx"
  }
  File_iews_canvas_dbtProjectCodeReconciliation_test_ts_8781b152: {
    label: "dbtProjectCodeReconciliation.test.ts"
  }
  File_app_views_canvas_dbtProjectCodeReconciliation_ts_68258519: {
    label: "dbtProjectCodeReconciliation.ts"
  }
  File_src_app_views_canvas_DbtProjectFileCanvas_tsx_c1e0a236: {
    label: "DbtProjectFileCanvas.tsx"
  }
  File_rc_app_views_canvas_DbtProjectFileCanvasView_tsx_d8a3bbcb: {
    label: "DbtProjectFileCanvasView.tsx"
  }
  File_iews_canvas_dbtProjectFileCodeWorkbench_test_tsx_ada61195: {
    label: "dbtProjectFileCodeWorkbench.test.tsx"
  }
  File_app_views_canvas_dbtProjectFileCodeWorkbench_tsx_947e806d: {
    label: "dbtProjectFileCodeWorkbench.tsx"
  }
  File_s_canvas_dbtProjectFileExecutionStrategy_test_ts_9892c7db: {
    label: "dbtProjectFileExecutionStrategy.test.ts"
  }
  File__views_canvas_dbtProjectFileExecutionStrategy_ts_c8af2a84: {
    label: "dbtProjectFileExecutionStrategy.ts"
  }
  File_rc_app_views_canvas_dbtProjectFileLayout_test_ts_82c6e1ff: {
    label: "dbtProjectFileLayout.test.ts"
  }
  File_src_app_views_canvas_dbtProjectFileLayout_ts_9e383f53: {
    label: "dbtProjectFileLayout.ts"
  }
  File_as_dbtProjectFileProjection_architecture_test_ts_2dbd876f: {
    label: "dbtProjectFileProjection.architecture.test.ts"
  }
  File_pp_views_canvas_dbtProjectFileProjection_test_ts_7af6fdab: {
    label: "dbtProjectFileProjection.test.ts"
  }
  File_src_app_views_canvas_dbtProjectFileProjection_ts_11edd7a4: {
    label: "dbtProjectFileProjection.ts"
  }
  File_c_app_views_canvas_DbtSourceAuthoringSection_tsx_e99b94e8: {
    label: "DbtSourceAuthoringSection.tsx"
  }
  File_views_canvas_dbtTestAuthoringFieldsModel_test_ts_62eec447: {
    label: "dbtTestAuthoringFieldsModel.test.ts"
  }
  File__app_views_canvas_dbtTestAuthoringFieldsModel_ts_1fa1379a: {
    label: "dbtTestAuthoringFieldsModel.ts"
  }
  File_src_app_views_canvas_DbtTestAuthoringSection_tsx_76cdd0fa: {
    label: "DbtTestAuthoringSection.tsx"
  }
  File_canvas_dbtWorkspaceFileCodeContribution_test_tsx_c7bef9af: {
    label: "dbtWorkspaceFileCodeContribution.test.tsx"
  }
  File_iews_canvas_dbtWorkspaceFileCodeContribution_tsx_3f51e6d8: {
    label: "dbtWorkspaceFileCodeContribution.tsx"
  }
  File_dbtYamlDescriptionWorkbenchContribution_test_tsx_92739f69: {
    label: "dbtYamlDescriptionWorkbenchContribution.test.tsx"
  }
  File_nvas_dbtYamlDescriptionWorkbenchContribution_tsx_ca142aea: {
    label: "dbtYamlDescriptionWorkbenchContribution.tsx"
  }
  File_src_app_views_canvas_DvtAuthoringFields_test_tsx_b8379c29: {
    label: "DvtAuthoringFields.test.tsx"
  }
  File_src_app_views_canvas_DvtAuthoringFields_tsx_a258e679: {
    label: "DvtAuthoringFields.tsx"
  }
  File_ews_canvas_DvtRelationFilterAuthoringSection_tsx_9ebeb929: {
    label: "DvtRelationFilterAuthoringSection.tsx"
  }
  File_src_app_views_canvas_DvtSinkAuthoringSection_tsx_15f7c33d: {
    label: "DvtSinkAuthoringSection.tsx"
  }
  File_c_app_views_canvas_DvtSourceAuthoringSection_tsx_4db6135a: {
    label: "DvtSourceAuthoringSection.tsx"
  }
  File_pp_views_canvas_DvtSubstraitCompositionStart_tsx_84981be9: {
    label: "DvtSubstraitCompositionStart.tsx"
  }
  File_s_canvas_DvtSubstraitCompositionStartSection_tsx_e2952839: {
    label: "DvtSubstraitCompositionStartSection.tsx"
  }
  File_canvas_DvtSubstraitInnerJoinAuthoringSection_tsx_3518e7a9: {
    label: "DvtSubstraitInnerJoinAuthoringSection.tsx"
  }
  File_ews_canvas_DvtSubstraitPilotAuthoringSection_tsx_9b5997eb: {
    label: "DvtSubstraitPilotAuthoringSection.tsx"
  }
  File_app_views_canvas_DvtSubstraitPilotEntry_test_tsx_8d78585e: {
    label: "DvtSubstraitPilotEntry.test.tsx"
  }
  File__app_views_canvas_DvtSubstraitTransformStart_tsx_4f70c80d: {
    label: "DvtSubstraitTransformStart.tsx"
  }
  File__canvas_DvtSubstraitUnionAllAuthoringSection_tsx_a060a080: {
    label: "DvtSubstraitUnionAllAuthoringSection.tsx"
  }
  File_src_app_views_canvas_DvtTransformOutputView_tsx_2458af2b: {
    label: "DvtTransformOutputView.tsx"
  }
  File_graphDraftWorkspaceFileCodeContribution_test_tsx_d6c9d92a: {
    label: "graphDraftWorkspaceFileCodeContribution.test.tsx"
  }
  File_nvas_graphDraftWorkspaceFileCodeContribution_tsx_791aefd8: {
    label: "graphDraftWorkspaceFileCodeContribution.tsx"
  }
  File_ws_canvas_httpJsonArtifactAuthoringModel_test_ts_615d770b: {
    label: "httpJsonArtifactAuthoringModel.test.ts"
  }
  File_p_views_canvas_httpJsonArtifactAuthoringModel_ts_4e346636: {
    label: "httpJsonArtifactAuthoringModel.ts"
  }
  File__canvas_objectFilePostgresAuthoringModel_test_ts_0df5a378: {
    label: "objectFilePostgresAuthoringModel.test.ts"
  }
  File_views_canvas_objectFilePostgresAuthoringModel_ts_43412b42: {
    label: "objectFilePostgresAuthoringModel.ts"
  }
  File__app_views_canvas_PlanRunReadinessPanel_test_tsx_98664801: {
    label: "PlanRunReadinessPanel.test.tsx"
  }
  File_src_app_views_canvas_PlanRunReadinessPanel_tsx_e4380cf9: {
    label: "PlanRunReadinessPanel.tsx"
  }
  File_rc_app_views_canvas_SqlContextWorkbench_test_tsx_ad795ac4: {
    label: "SqlContextWorkbench.test.tsx"
  }
  File_src_app_views_canvas_SqlContextWorkbench_tsx_1d5dd45e: {
    label: "SqlContextWorkbench.tsx"
  }
  File_ansformationGraphValidation_architecture_test_ts_c64a5da1: {
    label: "transformationGraphValidation.architecture.test.ts"
  }
  File_ews_canvas_transformationGraphValidation_test_ts_32c2dc07: {
    label: "transformationGraphValidation.test.ts"
  }
  File_pp_views_canvas_transformationGraphValidation_ts_ef19590a: {
    label: "transformationGraphValidation.ts"
  }
  File_ws_canvas_transformationGraphValidation_types_ts_d7c361af: {
    label: "transformationGraphValidation.types.ts"
  }
  File_s_canvas_transformationGraphValidationResults_ts_0c4c0a43: {
    label: "transformationGraphValidationResults.ts"
  }
  File_ews_canvas_transformationGraphValidationRules_ts_a3c5260c: {
    label: "transformationGraphValidationRules.ts"
  }
  File_ews_canvas_transformationGraphValidationScope_ts_9cd725e0: {
    label: "transformationGraphValidationScope.ts"
  }
  File_s_canvas_useCanvasAlgebraicCompositionHandler_ts_bd8a84c3: {
    label: "useCanvasAlgebraicCompositionHandler.ts"
  }
  File__app_views_canvas_useCanvasAlgebraicDrop_test_ts_f72d8155: {
    label: "useCanvasAlgebraicDrop.test.ts"
  }
  File_src_app_views_canvas_useCanvasAlgebraicDrop_ts_7a5f94b0: {
    label: "useCanvasAlgebraicDrop.ts"
  }
  File_canvas_useCanvasAuthoringNodeCreationHandlers_ts_0c5b1e53: {
    label: "useCanvasAuthoringNodeCreationHandlers.ts"
  }
  File_seCanvasAuthoringProjection_architecture_test_ts_8595b784: {
    label: "useCanvasAuthoringProjection.architecture.test.ts"
  }
  File_app_views_canvas_useCanvasAuthoringProjection_ts_3856c891: {
    label: "useCanvasAuthoringProjection.ts"
  }
  File_s_useCanvasAuthoringRuntime_architecture_test_ts_428e7265: {
    label: "useCanvasAuthoringRuntime.architecture.test.ts"
  }
  File_rc_app_views_canvas_useCanvasAuthoringRuntime_ts_178ba407: {
    label: "useCanvasAuthoringRuntime.ts"
  }
  File_asAuthoringRuntimeDraftFlow_architecture_test_ts_accb08e5: {
    label: "useCanvasAuthoringRuntimeDraftFlow.architecture.test.ts"
  }
  File_ews_canvas_useCanvasAuthoringRuntimeDraftFlow_ts_f4915429: {
    label: "useCanvasAuthoringRuntimeDraftFlow.ts"
  }
  File_ws_canvas_useCanvasColumnCommentCellRenderer_tsx_492eed79: {
    label: "useCanvasColumnCommentCellRenderer.tsx"
  }
  File_pp_views_canvas_useCanvasContextMenuLifecycle_ts_8b050d2b: {
    label: "useCanvasContextMenuLifecycle.ts"
  }
  File_anvasContextMenuPresenter_canvasActions_test_tsx_fda7ee79: {
    label: "useCanvasContextMenuPresenter.canvasActions.test.tsx"
  }
  File_CanvasContextMenuPresenter_graphActions_test_tsx_14c5d9f2: {
    label: "useCanvasContextMenuPresenter.graphActions.test.tsx"
  }
  File_useCanvasContextMenuPresenter_lifecycle_test_tsx_0edb8fd1: {
    label: "useCanvasContextMenuPresenter.lifecycle.test.tsx"
  }
  File_pp_views_canvas_useCanvasContextMenuPresenter_ts_ae451ba0: {
    label: "useCanvasContextMenuPresenter.ts"
  }
  File_s_useCanvasController_activeDraftLayout_test_tsx_419c48b0: {
    label: "useCanvasController.activeDraftLayout.test.tsx"
  }
  File_nvasController_activeDraftNodeAuthoring_test_tsx_32514af1: {
    label: "useCanvasController.activeDraftNodeAuthoring.test.tsx"
  }
  File_anvasController_activeDraftSourceImport_test_tsx_3cb2865a: {
    label: "useCanvasController.activeDraftSourceImport.test.tsx"
  }
  File__canvas_useCanvasController_architecture_test_ts_44dc75e7: {
    label: "useCanvasController.architecture.test.ts"
  }
  File_canvas_useCanvasController_autosaveRace_test_tsx_c10b668e: {
    label: "useCanvasController.autosaveRace.test.tsx"
  }
  File_nvas_useCanvasController_canvasDocument_test_tsx_803a2eb9: {
    label: "useCanvasController.canvasDocument.test.tsx"
  }
  File_p_views_canvas_useCanvasController_core_test_tsx_5db8eea0: {
    label: "useCanvasController.core.test.tsx"
  }
  File_Controller_draftLifecycle_conflictState_test_tsx_bba36a95: {
    label: "useCanvasController.draftLifecycle.conflictState.test.tsx"
  }
  File_oller_draftLifecycle_scopeAndProjection_test_tsx_76c22a3c: {
    label: "useCanvasController.draftLifecycle.scopeAndProjection.test.tsx"
  }
  File_eCanvasController_draftLifecycle_test_support_ts_a8f62c51: {
    label: "useCanvasController.draftLifecycle.test.support.ts"
  }
  File_eCanvasController_draftProjectionGuards_test_tsx_9ca0fb24: {
    label: "useCanvasController.draftProjectionGuards.test.tsx"
  }
  File_ws_canvas_useCanvasController_inspector_test_tsx_c0a25650: {
    label: "useCanvasController.inspector.test.tsx"
  }
  File_anvas_useCanvasController_missingRemote_test_tsx_2450805c: {
    label: "useCanvasController.missingRemote.test.tsx"
  }
  File__canvas_useCanvasController_permissions_test_tsx_02345f03: {
    label: "useCanvasController.permissions.test.tsx"
  }
  File__canvas_useCanvasController_persistence_test_tsx_cfbab8dd: {
    label: "useCanvasController.persistence.test.tsx"
  }
  File_ontroller_reloadConflictRecovery_test_support_ts_ec8a7cad: {
    label: "useCanvasController.reloadConflictRecovery.test.support.ts"
  }
  File_CanvasController_reloadConflictRecovery_test_tsx_85f2aba4: {
    label: "useCanvasController.reloadConflictRecovery.test.tsx"
  }
  File_eCanvasController_reloadHydrationGuards_test_tsx_d8c09033: {
    label: "useCanvasController.reloadHydrationGuards.test.tsx"
  }
  File_seCanvasController_reloadProtectedDraft_test_tsx_531e4b93: {
    label: "useCanvasController.reloadProtectedDraft.test.tsx"
  }
  File_eCanvasController_reloadRecovery_test_support_ts_728da81d: {
    label: "useCanvasController.reloadRecovery.test.support.ts"
  }
  File_canvas_useCanvasController_sourceImport_test_tsx_e46d6c57: {
    label: "useCanvasController.sourceImport.test.tsx"
  }
  File_anvas_useCanvasController_test_draftAuthoring_ts_03b0ecbf: {
    label: "useCanvasController.test.draftAuthoring.ts"
  }
  File_s_canvas_useCanvasController_test_draftRecord_ts_7a76acd3: {
    label: "useCanvasController.test.draftRecord.ts"
  }
  File_ews_canvas_useCanvasController_test_draftSave_ts_5210134e: {
    label: "useCanvasController.test.draftSave.ts"
  }
  File_iews_canvas_useCanvasController_test_fixtures_ts_204b8996: {
    label: "useCanvasController.test.fixtures.ts"
  }
  File_ws_canvas_useCanvasController_test_graphQuery_ts_2e1ca406: {
    label: "useCanvasController.test.graphQuery.ts"
  }
  File_iews_canvas_useCanvasController_test_harness_tsx_00a9a7dd: {
    label: "useCanvasController.test.harness.tsx"
  }
  File_ews_canvas_useCanvasController_test_mockSetup_ts_de95d7f1: {
    label: "useCanvasController.test.mockSetup.ts"
  }
  File_ws_canvas_useCanvasController_test_mockWiring_ts_91ad1b76: {
    label: "useCanvasController.test.mockWiring.ts"
  }
  File_nvas_useCanvasController_test_projectionMocks_ts_2fea6cb0: {
    label: "useCanvasController.test.projectionMocks.ts"
  }
  File_vas_useCanvasController_test_queryClientMocks_ts_6e97842a: {
    label: "useCanvasController.test.queryClientMocks.ts"
  }
  File_nvas_useCanvasController_test_serviceDefaults_ts_1c34a4e1: {
    label: "useCanvasController.test.serviceDefaults.ts"
  }
  File__canvas_useCanvasController_test_stateFactory_ts_39e00e9b: {
    label: "useCanvasController.test.stateFactory.ts"
  }
  File_p_views_canvas_useCanvasController_test_types_ts_19eb9202: {
    label: "useCanvasController.test.types.ts"
  }
  File_src_app_views_canvas_useCanvasController_ts_b37a851f: {
    label: "useCanvasController.ts"
  }
  File_p_views_canvas_useCanvasControllerEnvironment_ts_81f4cef0: {
    label: "useCanvasControllerEnvironment.ts"
  }
  File_ews_canvas_useCanvasControllerReadModel_test_tsx_c7c323c6: {
    label: "useCanvasControllerReadModel.test.tsx"
  }
  File_app_views_canvas_useCanvasControllerReadModel_ts_9a1b89dc: {
    label: "useCanvasControllerReadModel.ts"
  }
  File_app_views_canvas_useCanvasCurrentDraftPayload_ts_d4f6da6e: {
    label: "useCanvasCurrentDraftPayload.ts"
  }
  File_rc_app_views_canvas_useCanvasDraftAttemptRefs_ts_6f82463d: {
    label: "useCanvasDraftAttemptRefs.ts"
  }
  File_nvas_useCanvasDraftAutosave_architecture_test_ts_7afa7dac: {
    label: "useCanvasDraftAutosave.architecture.test.ts"
  }
  File_src_app_views_canvas_useCanvasDraftAutosave_ts_5fa9134b: {
    label: "useCanvasDraftAutosave.ts"
  }
  File_src_app_views_canvas_useCanvasDraftBaseline_ts_2eaf10ee: {
    label: "useCanvasDraftBaseline.ts"
  }
  File_useCanvasDraftBootstrapping_architecture_test_ts_75f4a80e: {
    label: "useCanvasDraftBootstrapping.architecture.test.ts"
  }
  File__app_views_canvas_useCanvasDraftBootstrapping_ts_e6d06b00: {
    label: "useCanvasDraftBootstrapping.ts"
  }
  File_useCanvasDraftBootstrapSync_architecture_test_ts_89b09a29: {
    label: "useCanvasDraftBootstrapSync.architecture.test.ts"
  }
  File__app_views_canvas_useCanvasDraftBootstrapSync_ts_92bd7262: {
    label: "useCanvasDraftBootstrapSync.ts"
  }
  File_views_canvas_useCanvasDraftCanonicalReconcile_ts_a9a060f4: {
    label: "useCanvasDraftCanonicalReconcile.ts"
  }
  File_p_views_canvas_useCanvasDraftInitialBootstrap_ts_a548a059: {
    label: "useCanvasDraftInitialBootstrap.ts"
  }
  File_vas_useCanvasDraftLifecycle_architecture_test_ts_9ac9d191: {
    label: "useCanvasDraftLifecycle.architecture.test.ts"
  }
  File_src_app_views_canvas_useCanvasDraftLifecycle_ts_4d889f9c: {
    label: "useCanvasDraftLifecycle.ts"
  }
  File__views_canvas_useCanvasDraftMissingRemoteSync_ts_548ae517: {
    label: "useCanvasDraftMissingRemoteSync.ts"
  }
  File_s_useCanvasDraftPersistence_architecture_test_ts_4da69fc4: {
    label: "useCanvasDraftPersistence.architecture.test.ts"
  }
  File_rc_app_views_canvas_useCanvasDraftPersistence_ts_3cc01d25: {
    label: "useCanvasDraftPersistence.ts"
  }
  File_pp_views_canvas_useCanvasDraftRecoveryActions_ts_d3aed15f: {
    label: "useCanvasDraftRecoveryActions.ts"
  }
  File_pp_views_canvas_useCanvasDraftReloadHydration_ts_b278dca9: {
    label: "useCanvasDraftReloadHydration.ts"
  }
  File_CanvasEdgeAuthoringHandlers_architecture_test_ts_53cd4e1e: {
    label: "useCanvasEdgeAuthoringHandlers.architecture.test.ts"
  }
  File_p_views_canvas_useCanvasEdgeAuthoringHandlers_ts_99df2b33: {
    label: "useCanvasEdgeAuthoringHandlers.ts"
  }
  File_useCanvasEdgeChangeHandlers_architecture_test_ts_1845b0a1: {
    label: "useCanvasEdgeChangeHandlers.architecture.test.ts"
  }
  File_iews_canvas_useCanvasEdgeChangeHandlers_test_tsx_319f34a0: {
    label: "useCanvasEdgeChangeHandlers.test.tsx"
  }
  File__app_views_canvas_useCanvasEdgeChangeHandlers_ts_41213f3e: {
    label: "useCanvasEdgeChangeHandlers.ts"
  }
  File_views_canvas_useCanvasEdgeCommandRunner_test_tsx_ac2a5a2b: {
    label: "useCanvasEdgeCommandRunner.test.tsx"
  }
  File_c_app_views_canvas_useCanvasEdgeCommandRunner_ts_dbe62515: {
    label: "useCanvasEdgeCommandRunner.ts"
  }
  File_s_useCanvasExecutionActions_architecture_test_ts_393ef881: {
    label: "useCanvasExecutionActions.architecture.test.ts"
  }
  File_useCanvasExecutionActions_dbtDraftFlush_test_tsx_a2884778: {
    label: "useCanvasExecutionActions.dbtDraftFlush.test.tsx"
  }
  File_useCanvasExecutionActions_dbtPreviewRun_test_tsx_251a8a60: {
    label: "useCanvasExecutionActions.dbtPreviewRun.test.tsx"
  }
  File_nvasExecutionActions_graphSqlDivergence_test_tsx_182dd55e: {
    label: "useCanvasExecutionActions.graphSqlDivergence.test.tsx"
  }
  File_seCanvasExecutionActions_runStartGuards_test_tsx_b1ae243d: {
    label: "useCanvasExecutionActions.runStartGuards.test.tsx"
  }
  File_eCanvasExecutionActions_runStartSuccess_test_tsx_ac38e55c: {
    label: "useCanvasExecutionActions.runStartSuccess.test.tsx"
  }
  File_anvas_useCanvasExecutionActions_test_support_tsx_4870c491: {
    label: "useCanvasExecutionActions.test.support.tsx"
  }
  File_rc_app_views_canvas_useCanvasExecutionActions_ts_df3b669a: {
    label: "useCanvasExecutionActions.ts"
  }
  File_ews_canvas_useCanvasExecutionDraftFlush_test_tsx_50e2c50d: {
    label: "useCanvasExecutionDraftFlush.test.tsx"
  }
  File_app_views_canvas_useCanvasExecutionDraftFlush_ts_9999584e: {
    label: "useCanvasExecutionDraftFlush.ts"
  }
  File_vas_useCanvasExecutionSelectionRecovery_test_tsx_dea85d73: {
    label: "useCanvasExecutionSelectionRecovery.test.tsx"
  }
  File_ws_canvas_useCanvasExecutionSelectionRecovery_ts_d9d560f0: {
    label: "useCanvasExecutionSelectionRecovery.ts"
  }
  File_seCanvasGraphChangeHandlers_architecture_test_ts_5bdae353: {
    label: "useCanvasGraphChangeHandlers.architecture.test.ts"
  }
  File_app_views_canvas_useCanvasGraphChangeHandlers_ts_7efda1fa: {
    label: "useCanvasGraphChangeHandlers.ts"
  }
  File_s_canvas_useCanvasGraphFilterController_test_tsx_cc288f7a: {
    label: "useCanvasGraphFilterController.test.tsx"
  }
  File_p_views_canvas_useCanvasGraphFilterController_ts_1b8998d7: {
    label: "useCanvasGraphFilterController.ts"
  }
  File_nvas_useCanvasGraphHandlers_architecture_test_ts_626c70e5: {
    label: "useCanvasGraphHandlers.architecture.test.ts"
  }
  File_vas_useCanvasGraphHandlers_catalogCreate_test_ts_b0967947: {
    label: "useCanvasGraphHandlers.catalogCreate.test.ts"
  }
  File_anvas_useCanvasGraphHandlers_dbtColumns_test_tsx_b45ca541: {
    label: "useCanvasGraphHandlers.dbtColumns.test.tsx"
  }
  File_as_useCanvasGraphHandlers_edgeAuthoring_test_tsx_e396f56a: {
    label: "useCanvasGraphHandlers.edgeAuthoring.test.tsx"
  }
  File_as_useCanvasGraphHandlers_edgeReconnect_test_tsx_e8a9f95a: {
    label: "useCanvasGraphHandlers.edgeReconnect.test.tsx"
  }
  File_ws_canvas_useCanvasGraphHandlers_layout_test_tsx_f5a0bd29: {
    label: "useCanvasGraphHandlers.layout.test.tsx"
  }
  File_anvasGraphHandlers_nodeAuthoring_test_support_ts_9246ae3b: {
    label: "useCanvasGraphHandlers.nodeAuthoring.test.support.ts"
  }
  File__canvas_useCanvasGraphHandlers_nodeDrop_test_tsx_adad0b58: {
    label: "useCanvasGraphHandlers.nodeDrop.test.tsx"
  }
  File_as_useCanvasGraphHandlers_nodeDuplicate_test_tsx_f71188cb: {
    label: "useCanvasGraphHandlers.nodeDuplicate.test.tsx"
  }
  File_nvas_useCanvasGraphHandlers_nodeRemoval_test_tsx_313b4f02: {
    label: "useCanvasGraphHandlers.nodeRemoval.test.tsx"
  }
  File_vas_useCanvasGraphHandlers_schemaAttach_test_tsx_a4849156: {
    label: "useCanvasGraphHandlers.schemaAttach.test.tsx"
  }
  File_canvas_useCanvasGraphHandlers_selection_test_tsx_91959795: {
    label: "useCanvasGraphHandlers.selection.test.tsx"
  }
  File_s_canvas_useCanvasGraphHandlers_test_support_tsx_bed6319d: {
    label: "useCanvasGraphHandlers.test.support.tsx"
  }
  File_src_app_views_canvas_useCanvasGraphHandlers_ts_0666e1f5: {
    label: "useCanvasGraphHandlers.ts"
  }
  File_app_views_canvas_useCanvasGraphHandlers_types_ts_e281ddda: {
    label: "useCanvasGraphHandlers.types.ts"
  }
  File_s_canvas_useCanvasGraphSearchActivation_test_tsx_b4d6cf79: {
    label: "useCanvasGraphSearchActivation.test.tsx"
  }
  File_p_views_canvas_useCanvasGraphSearchActivation_ts_75a81b42: {
    label: "useCanvasGraphSearchActivation.ts"
  }
  File_s_canvas_useCanvasGraphSearchController_test_tsx_d9605590: {
    label: "useCanvasGraphSearchController.test.tsx"
  }
  File_p_views_canvas_useCanvasGraphSearchController_ts_4763c740: {
    label: "useCanvasGraphSearchController.ts"
  }
  File_c_app_views_canvas_useCanvasInspectorCommands_ts_a2a283ce: {
    label: "useCanvasInspectorCommands.ts"
  }
  File_vas_useCanvasLayoutHandlers_architecture_test_ts_91a0ddf9: {
    label: "useCanvasLayoutHandlers.architecture.test.ts"
  }
  File_src_app_views_canvas_useCanvasLayoutHandlers_ts_c58e1829: {
    label: "useCanvasLayoutHandlers.ts"
  }
  File_c_app_views_canvas_useCanvasLayoutPersistence_ts_a0e7ae01: {
    label: "useCanvasLayoutPersistence.ts"
  }
  File_s_useCanvasMutationHandlers_architecture_test_ts_e1e90be0: {
    label: "useCanvasMutationHandlers.architecture.test.ts"
  }
  File_rc_app_views_canvas_useCanvasMutationHandlers_ts_d43ad59e: {
    label: "useCanvasMutationHandlers.ts"
  }
  File_views_canvas_useCanvasNavigationActions_test_tsx_7f71c794: {
    label: "useCanvasNavigationActions.test.tsx"
  }
  File_c_app_views_canvas_useCanvasNavigationActions_ts_03ab022a: {
    label: "useCanvasNavigationActions.ts"
  }
  File_ws_canvas_useCanvasNodeAdmissionCommandRunner_ts_acc28341: {
    label: "useCanvasNodeAdmissionCommandRunner.ts"
  }
  File_CanvasNodeAuthoringHandlers_architecture_test_ts_82db4016: {
    label: "useCanvasNodeAuthoringHandlers.architecture.test.ts"
  }
  File_p_views_canvas_useCanvasNodeAuthoringHandlers_ts_bf1ff752: {
    label: "useCanvasNodeAuthoringHandlers.ts"
  }
  File_useCanvasNodeChangeHandlers_architecture_test_ts_783da590: {
    label: "useCanvasNodeChangeHandlers.architecture.test.ts"
  }
  File_iews_canvas_useCanvasNodeChangeHandlers_test_tsx_aae728e5: {
    label: "useCanvasNodeChangeHandlers.test.tsx"
  }
  File__app_views_canvas_useCanvasNodeChangeHandlers_ts_14f9089b: {
    label: "useCanvasNodeChangeHandlers.ts"
  }
  File_rc_app_views_canvas_useCanvasNodeDropHandlers_ts_8c13d2a5: {
    label: "useCanvasNodeDropHandlers.ts"
  }
  File_p_views_canvas_useCanvasNodeDuplicateHandlers_ts_a7a89f26: {
    label: "useCanvasNodeDuplicateHandlers.ts"
  }
  File_app_views_canvas_useCanvasNodeRemovalHandlers_ts_8b91de62: {
    label: "useCanvasNodeRemovalHandlers.ts"
  }
  File_s_useCanvasNodeWorkbenchDraftController_test_tsx_574ee33e: {
    label: "useCanvasNodeWorkbenchDraftController.test.tsx"
  }
  File__canvas_useCanvasNodeWorkbenchDraftController_ts_4d9de144: {
    label: "useCanvasNodeWorkbenchDraftController.ts"
  }
  File_p_views_canvas_useCanvasNodeWorkbenchPosition_ts_389ba6a9: {
    label: "useCanvasNodeWorkbenchPosition.ts"
  }
  File_src_app_views_canvas_useCanvasOverlayModel_ts_1576448f: {
    label: "useCanvasOverlayModel.ts"
  }
  File_c_app_views_canvas_useCanvasPlanActionHandler_ts_50655491: {
    label: "useCanvasPlanActionHandler.ts"
  }
  File_p_views_canvas_useCanvasRoutePresentationSync_ts_169f2ce0: {
    label: "useCanvasRoutePresentationSync.ts"
  }
  File_views_canvas_useCanvasRunControlSurface_test_tsx_40f2ec08: {
    label: "useCanvasRunControlSurface.test.tsx"
  }
  File_c_app_views_canvas_useCanvasRunControlSurface_ts_7d1b8af0: {
    label: "useCanvasRunControlSurface.ts"
  }
  File_src_app_views_canvas_useCanvasRunStartHandler_ts_1255a220: {
    label: "useCanvasRunStartHandler.ts"
  }
  File__useCanvasSelectionHandlers_architecture_test_ts_3bc43296: {
    label: "useCanvasSelectionHandlers.architecture.test.ts"
  }
  File_c_app_views_canvas_useCanvasSelectionHandlers_ts_f97ec29b: {
    label: "useCanvasSelectionHandlers.ts"
  }
  File_src_app_views_canvas_useCanvasSelectionSync_ts_b18a5a50: {
    label: "useCanvasSelectionSync.ts"
  }
  File_views_canvas_useCanvasSourceImportDialogState_ts_7c942710: {
    label: "useCanvasSourceImportDialogState.ts"
  }
  File_eCanvasSourceImportHandlers_architecture_test_ts_852af50f: {
    label: "useCanvasSourceImportHandlers.architecture.test.ts"
  }
  File_ws_canvas_useCanvasSourceImportHandlers_test_tsx_c0790ffe: {
    label: "useCanvasSourceImportHandlers.test.tsx"
  }
  File_pp_views_canvas_useCanvasSourceImportHandlers_ts_5aecf9a1: {
    label: "useCanvasSourceImportHandlers.ts"
  }
  File_src_app_views_canvas_useCanvasStoreFacade_ts_6a38edff: {
    label: "useCanvasStoreFacade.ts"
  }
  File_useCanvasViewportGraphModel_architecture_test_ts_34be2ffa: {
    label: "useCanvasViewportGraphModel.architecture.test.ts"
  }
  File_anvas_useCanvasViewportGraphModel_edges_test_tsx_a61957bf: {
    label: "useCanvasViewportGraphModel.edges.test.tsx"
  }
  File_nvas_useCanvasViewportGraphModel_layout_test_tsx_3bcde653: {
    label: "useCanvasViewportGraphModel.layout.test.tsx"
  }
  File_as_useCanvasViewportGraphModel_nodeData_test_tsx_4070884c: {
    label: "useCanvasViewportGraphModel.nodeData.test.tsx"
  }
  File_nvas_useCanvasViewportGraphModel_test_support_ts_52490dd8: {
    label: "useCanvasViewportGraphModel.test.support.ts"
  }
  File__app_views_canvas_useCanvasViewportGraphModel_ts_5641bc0f: {
    label: "useCanvasViewportGraphModel.ts"
  }
  File_c_app_views_canvas_useCanvasViewportLifecycle_ts_56d96585: {
    label: "useCanvasViewportLifecycle.ts"
  }
  File_s_canvas_useCanvasWorkspaceDraftSession_test_tsx_e934867c: {
    label: "useCanvasWorkspaceDraftSession.test.tsx"
  }
  File_p_views_canvas_useCanvasWorkspaceDraftSession_ts_744a702b: {
    label: "useCanvasWorkspaceDraftSession.ts"
  }
  File_ProjectFileCanvasController_sourceImport_test_ts_59b76e8e: {
    label: "useDbtProjectFileCanvasController.sourceImport.test.ts"
  }
  File_iews_canvas_useDbtProjectFileCanvasController_ts_3120993a: {
    label: "useDbtProjectFileCanvasController.ts"
  }
  File_c_app_views_canvas_useDbtProjectFileExecution_ts_98dfad06: {
    label: "useDbtProjectFileExecution.ts"
  }
}
`;case`webSource_dir_src_app_views_code_53326a1d`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_code_53326a1d: {
  label: "code/ — 29 files"

  File_src_app_views_code_codeFileHistoryModel_ts_e3f3353a: {
    label: "codeFileHistoryModel.ts"
  }
  File_src_app_views_code_CodeFileHistoryPanel_tsx_f2e5a86c: {
    label: "CodeFileHistoryPanel.tsx"
  }
  File_de_codeMonacoEditableAccess_architecture_test_ts_229fe9e2: {
    label: "codeMonacoEditableAccess.architecture.test.ts"
  }
  File_src_app_views_code_codeRouteBootstrap_test_ts_7b5b0ef9: {
    label: "codeRouteBootstrap.test.ts"
  }
  File_src_app_views_code_codeRouteBootstrap_ts_fefc6a64: {
    label: "codeRouteBootstrap.ts"
  }
  File_src_app_views_code_CodeStateViews_tsx_1c2e2bfb: {
    label: "CodeStateViews.tsx"
  }
  File_src_app_views_code_codeViewCopy_test_ts_6ff271bd: {
    label: "codeViewCopy.test.ts"
  }
  File_src_app_views_code_codeViewCopy_ts_bcf8e776: {
    label: "codeViewCopy.ts"
  }
  File_src_app_views_code_codeViewFileSelection_test_ts_6af6d307: {
    label: "codeViewFileSelection.test.ts"
  }
  File_src_app_views_code_codeViewFileSelection_ts_76baf813: {
    label: "codeViewFileSelection.ts"
  }
  File_c_app_views_code_codeWorkbenchErrorModel_test_ts_83316376: {
    label: "codeWorkbenchErrorModel.test.ts"
  }
  File_src_app_views_code_codeWorkbenchErrorModel_ts_f981f1d6: {
    label: "codeWorkbenchErrorModel.ts"
  }
  File_ews_code_CodeWorkingTreeNavigationGuard_test_tsx_58a06fcf: {
    label: "CodeWorkingTreeNavigationGuard.test.tsx"
  }
  File_pp_views_code_CodeWorkingTreeNavigationGuard_tsx_6bc0bb78: {
    label: "CodeWorkingTreeNavigationGuard.tsx"
  }
  File_rc_app_views_code_CodeWorkingTreeStatus_test_tsx_c66144a5: {
    label: "CodeWorkingTreeStatus.test.tsx"
  }
  File_src_app_views_code_CodeWorkingTreeStatus_tsx_5992dd39: {
    label: "CodeWorkingTreeStatus.tsx"
  }
  File__app_views_code_codeWorkingTreeSyncModel_test_ts_d807ea08: {
    label: "codeWorkingTreeSyncModel.test.ts"
  }
  File_src_app_views_code_codeWorkingTreeSyncModel_ts_78057709: {
    label: "codeWorkingTreeSyncModel.ts"
  }
  File__views_code_codeWorkspaceFileEditPosture_test_ts_1837bc5e: {
    label: "codeWorkspaceFileEditPosture.test.ts"
  }
  File_c_app_views_code_codeWorkspaceFileEditPosture_ts_baf4562f: {
    label: "codeWorkspaceFileEditPosture.ts"
  }
  File_app_views_code_CodeWorkspaceFileSurface_test_tsx_5bc8ad9e: {
    label: "CodeWorkspaceFileSurface.test.tsx"
  }
  File_src_app_views_code_CodeWorkspaceFileSurface_tsx_df474ff3: {
    label: "CodeWorkspaceFileSurface.tsx"
  }
  File_src_app_views_code_FileTreePanel_tsx_43166a19: {
    label: "FileTreePanel.tsx"
  }
  File_c_app_views_code_useCodeWorkingTreeSync_test_tsx_f4642830: {
    label: "useCodeWorkingTreeSync.test.tsx"
  }
  File_src_app_views_code_useCodeWorkingTreeSync_ts_2dd0815d: {
    label: "useCodeWorkingTreeSync.ts"
  }
  File__app_views_code_WorkspaceFileCodeEditor_test_tsx_a85607a0: {
    label: "WorkspaceFileCodeEditor.test.tsx"
  }
  File_src_app_views_code_WorkspaceFileCodeEditor_tsx_0db0639b: {
    label: "WorkspaceFileCodeEditor.tsx"
  }
  File_ode_workspaceFileReconciliationAuthority_test_ts_29ac9b57: {
    label: "workspaceFileReconciliationAuthority.test.ts"
  }
  File_ews_code_workspaceFileReconciliationAuthority_ts_dc3b4855: {
    label: "workspaceFileReconciliationAuthority.ts"
  }
}
`;case`webSource_dir_src_app_views_cost_21d6c207`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_cost_21d6c207: {
  label: "cost/ — 13 files"

  File_src_app_views_cost_copy_test_ts_da199be5: {
    label: "copy.test.ts"
  }
  File_src_app_views_cost_copy_ts_3656d5cc: {
    label: "copy.ts"
  }
  File_src_app_views_cost_CostAlertsList_tsx_0b449622: {
    label: "CostAlertsList.tsx"
  }
  File_iews_cost_costAttributionUi_architecture_test_ts_3678fde8: {
    label: "costAttributionUi.architecture.test.ts"
  }
  File_src_app_views_cost_CostCharts_tsx_3d47eeb5: {
    label: "CostCharts.tsx"
  }
  File_src_app_views_cost_CostCoverageCard_tsx_4800b880: {
    label: "CostCoverageCard.tsx"
  }
  File_src_app_views_cost_CostDriverList_tsx_02c1d64b: {
    label: "CostDriverList.tsx"
  }
  File_src_app_views_cost_costRouteBootstrap_test_ts_b1331a87: {
    label: "costRouteBootstrap.test.ts"
  }
  File_src_app_views_cost_costRouteBootstrap_ts_02a95386: {
    label: "costRouteBootstrap.ts"
  }
  File_src_app_views_cost_CostStatGrid_tsx_25e0aa35: {
    label: "CostStatGrid.tsx"
  }
  File_src_app_views_cost_costViewModel_test_ts_42fae732: {
    label: "costViewModel.test.ts"
  }
  File_src_app_views_cost_costViewModel_ts_67feb715: {
    label: "costViewModel.ts"
  }
  File_src_app_views_cost_useCostData_ts_79214977: {
    label: "useCostData.ts"
  }
}
`;case`webSource_dir_src_app_views_diff_d27bc3ec`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_diff_d27bc3ec: {
  label: "diff/ — 17 files"

  File_src_app_views_diff_CatalogDiffPanel_tsx_230a0f5e: {
    label: "CatalogDiffPanel.tsx"
  }
  File_src_app_views_diff_copy_ts_6cf2e5e6: {
    label: "copy.ts"
  }
  File_src_app_views_diff_DiffHeader_tsx_cf47aa03: {
    label: "DiffHeader.tsx"
  }
  File_iff_diffMonacoReviewSurface_architecture_test_ts_4d783e12: {
    label: "diffMonacoReviewSurface.architecture.test.ts"
  }
  File_src_app_views_diff_diffReviewModel_ts_658686f3: {
    label: "diffReviewModel.ts"
  }
  File_src_app_views_diff_diffRouteBootstrap_test_ts_4132f31e: {
    label: "diffRouteBootstrap.test.ts"
  }
  File_src_app_views_diff_diffRouteBootstrap_ts_5c2dc4d1: {
    label: "diffRouteBootstrap.ts"
  }
  File_src_app_views_diff_DiffStateViews_tsx_9345f640: {
    label: "DiffStateViews.tsx"
  }
  File_src_app_views_diff_DiffSummaryCards_tsx_68233568: {
    label: "DiffSummaryCards.tsx"
  }
  File_src_app_views_diff_DiffTabs_tsx_76aec02d: {
    label: "DiffTabs.tsx"
  }
  File_src_app_views_diff_diffViewModel_test_ts_8af74bfd: {
    label: "diffViewModel.test.ts"
  }
  File_src_app_views_diff_diffViewModel_ts_257bd64d: {
    label: "diffViewModel.ts"
  }
  File_c_app_views_diff_diffWorkbenchStateModel_test_ts_10f12255: {
    label: "diffWorkbenchStateModel.test.ts"
  }
  File_src_app_views_diff_diffWorkbenchStateModel_ts_a9207c85: {
    label: "diffWorkbenchStateModel.ts"
  }
  File_src_app_views_diff_GraphDiffPanel_tsx_9e0e6556: {
    label: "GraphDiffPanel.tsx"
  }
  File_src_app_views_diff_SqlDiffPanel_tsx_85df41d5: {
    label: "SqlDiffPanel.tsx"
  }
  File_src_app_views_diff_useDiffData_ts_0b053705: {
    label: "useDiffData.ts"
  }
}
`;case`webSource_dir_src_app_views_lineage_aab1b7ff`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_lineage_aab1b7ff: {
  label: "lineage/ — 18 files"

  File_src_app_views_lineage_copy_ts_b7fabb08: {
    label: "copy.ts"
  }
  File_src_app_views_lineage_LineageBreadcrumb_tsx_bd563fe4: {
    label: "LineageBreadcrumb.tsx"
  }
  File_src_app_views_lineage_lineageChromeTokens_ts_dc7810f0: {
    label: "lineageChromeTokens.ts"
  }
  File_src_app_views_lineage_LineageColumnPanel_tsx_52f3390d: {
    label: "LineageColumnPanel.tsx"
  }
  File_src_app_views_lineage_LineageGraphPanel_tsx_b9971729: {
    label: "LineageGraphPanel.tsx"
  }
  File_ineageGraphStrategyBoundary_architecture_test_ts_7accc4ed: {
    label: "lineageGraphStrategyBoundary.architecture.test.ts"
  }
  File_src_app_views_lineage_LineageHeader_tsx_6c06115c: {
    label: "LineageHeader.tsx"
  }
  File_src_app_views_lineage_LineageImpactSummary_tsx_620e3884: {
    label: "LineageImpactSummary.tsx"
  }
  File_src_app_views_lineage_lineageModel_test_ts_ffe554b7: {
    label: "lineageModel.test.ts"
  }
  File_src_app_views_lineage_lineageModel_ts_7f1d1dcf: {
    label: "lineageModel.ts"
  }
  File_ineagePanelTokenConvergence_architecture_test_ts_16d90c29: {
    label: "lineagePanelTokenConvergence.architecture.test.ts"
  }
  File__app_views_lineage_lineageRouteBootstrap_test_ts_a0c23f24: {
    label: "lineageRouteBootstrap.test.ts"
  }
  File_src_app_views_lineage_lineageRouteBootstrap_ts_ece36aee: {
    label: "lineageRouteBootstrap.ts"
  }
  File_src_app_views_lineage_LineageStateViews_tsx_52ee3c2b: {
    label: "LineageStateViews.tsx"
  }
  File_views_lineage_lineageWorkbenchStateModel_test_ts_d3714a38: {
    label: "lineageWorkbenchStateModel.test.ts"
  }
  File__app_views_lineage_lineageWorkbenchStateModel_ts_bec5c868: {
    label: "lineageWorkbenchStateModel.ts"
  }
  File_ws_lineage_useLineageViewData_projection_test_ts_eec45718: {
    label: "useLineageViewData.projection.test.ts"
  }
  File_src_app_views_lineage_useLineageViewData_ts_232d54d0: {
    label: "useLineageViewData.ts"
  }
}
`;case`webSource_dir_src_app_views_plugins_77d5ccf8`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_plugins_77d5ccf8: {
  label: "plugins/ — 9 files"

  File_src_app_views_plugins_PluginCapabilityTable_tsx_32642a49: {
    label: "PluginCapabilityTable.tsx"
  }
  File_iews_plugins_pluginCatalogReconciliation_test_ts_d0f965f7: {
    label: "pluginCatalogReconciliation.test.ts"
  }
  File_app_views_plugins_pluginCatalogReconciliation_ts_522cf678: {
    label: "pluginCatalogReconciliation.ts"
  }
  File_gins_pluginsCapabilityTable_architecture_test_ts_07e89b2b: {
    label: "pluginsCapabilityTable.architecture.test.ts"
  }
  File_src_app_views_plugins_PluginsRouteWorkbench_tsx_5296c783: {
    label: "PluginsRouteWorkbench.tsx"
  }
  File_src_app_views_plugins_pluginsViewCopy_test_ts_81101d30: {
    label: "pluginsViewCopy.test.ts"
  }
  File_src_app_views_plugins_pluginsViewCopy_ts_e425d518: {
    label: "pluginsViewCopy.ts"
  }
  File_src_app_views_plugins_pluginsViewModel_test_ts_18459804: {
    label: "pluginsViewModel.test.ts"
  }
  File_src_app_views_plugins_pluginsViewModel_ts_8ab0c2c4: {
    label: "pluginsViewModel.ts"
  }
}
`;case`webSource_dir_src_app_views_projectAdmission_0003f629`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_projectAdmission_0003f629: {
  label: "projectAdmission/ — 3 files"

  File__projectAdmission_ProjectCreationDialog_test_tsx_74184d67: {
    label: "ProjectCreationDialog.test.tsx"
  }
  File_views_projectAdmission_ProjectCreationDialog_tsx_0c79cec9: {
    label: "ProjectCreationDialog.tsx"
  }
  File_p_views_projectAdmission_ProjectCreationForm_tsx_6682e3eb: {
    label: "ProjectCreationForm.tsx"
  }
}
`;case`webSource_dir_src_app_views_runs_da4584d8`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8: {
  label: "runs/ — 31 files"

  Dir_src_app_views_runs_test_75ebab04: {
    label: "test/ — 1 files"
  }
  File_src_app_views_runs_CanvasRunsTabView_tsx_c4a0520a: {
    label: "CanvasRunsTabView.tsx"
  }
  File_src_app_views_runs_RunDetailStateViews_tsx_c4a4a033: {
    label: "RunDetailStateViews.tsx"
  }
  File_src_app_views_runs_RunEventFeedHealthView_tsx_b53684d9: {
    label: "RunEventFeedHealthView.tsx"
  }
  File_src_app_views_runs_runEventTableModel_test_ts_d42a381d: {
    label: "runEventTableModel.test.ts"
  }
  File_src_app_views_runs_runEventTableModel_ts_f92d1315: {
    label: "runEventTableModel.ts"
  }
  File_src_app_views_runs_RunEventTimelineTable_tsx_b7baac4d: {
    label: "RunEventTimelineTable.tsx"
  }
  File_src_app_views_runs_RunListStateView_test_tsx_88258fb5: {
    label: "RunListStateView.test.tsx"
  }
  File_src_app_views_runs_RunListStateView_tsx_172207ee: {
    label: "RunListStateView.tsx"
  }
  File_src_app_views_runs_RunOperationalTable_tsx_fb31bd72: {
    label: "RunOperationalTable.tsx"
  }
  File__app_views_runs_runOperationalTableModel_test_ts_8263677d: {
    label: "runOperationalTableModel.test.ts"
  }
  File_src_app_views_runs_runOperationalTableModel_ts_bdc0cb93: {
    label: "runOperationalTableModel.ts"
  }
  File_ews_runs_runsDomainBoundary_architecture_test_ts_b326d2fa: {
    label: "runsDomainBoundary.architecture.test.ts"
  }
  File_src_app_views_runs_runsRouteBootstrap_test_ts_2ea856a7: {
    label: "runsRouteBootstrap.test.ts"
  }
  File_src_app_views_runs_runsRouteBootstrap_ts_aea666bb: {
    label: "runsRouteBootstrap.ts"
  }
  File_rc_app_views_runs_RunStates_errorStates_test_tsx_8466568a: {
    label: "RunStates.errorStates.test.tsx"
  }
  File_src_app_views_runs_RunStates_list_test_tsx_2fc3a895: {
    label: "RunStates.list.test.tsx"
  }
  File_p_views_runs_RunStates_snapshotEvidence_test_tsx_a31658e1: {
    label: "RunStates.snapshotEvidence.test.tsx"
  }
  File__app_views_runs_RunStates_timelineTrust_test_tsx_5b9e5e66: {
    label: "RunStates.timelineTrust.test.tsx"
  }
  File_src_app_views_runs_RunStates_tsx_b747cdf3: {
    label: "RunStates.tsx"
  }
  File_pp_views_runs_RunStates_workspaceBasics_test_tsx_93a7ffc8: {
    label: "RunStates.workspaceBasics.test.tsx"
  }
  File_src_app_views_runs_runStatesCopy_ts_41a5a355: {
    label: "runStatesCopy.ts"
  }
  File_src_app_views_runs_runStatesModel_test_ts_73e55a7c: {
    label: "runStatesModel.test.ts"
  }
  File_src_app_views_runs_runStatesModel_ts_c62e30b3: {
    label: "runStatesModel.ts"
  }
  File_rc_app_views_runs_runWorkbenchStateModel_test_ts_fda7e968: {
    label: "runWorkbenchStateModel.test.ts"
  }
  File_src_app_views_runs_runWorkbenchStateModel_ts_e2f528a7: {
    label: "runWorkbenchStateModel.ts"
  }
  File_src_app_views_runs_RunWorkspaceStateView_tsx_d8a1b656: {
    label: "RunWorkspaceStateView.tsx"
  }
  File_rc_app_views_runs_useRunControlCommands_test_tsx_e815c0bd: {
    label: "useRunControlCommands.test.tsx"
  }
  File_src_app_views_runs_useRunControlCommands_ts_27bcd889: {
    label: "useRunControlCommands.ts"
  }
  File_src_app_views_runs_useRunWorkspace_test_tsx_eecb0563: {
    label: "useRunWorkspace.test.tsx"
  }
  File_src_app_views_runs_useRunWorkspace_ts_f247cd39: {
    label: "useRunWorkspace.ts"
  }
}
`;case`webSource_dir_src_app_views_runs_test_75ebab04`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_runs_da4584d8Dir_src_app_views_runs_test_75ebab04: {
  label: "test/ — 1 files"

  File_src_app_views_runs_test_RunStatesHarness_tsx_3aeaba5e: {
    label: "RunStatesHarness.tsx"
  }
}
`;case`webSource_dir_src_app_views_templates_c5ce249f`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_templates_c5ce249f: {
  label: "templates/ — 7 files"

  File_ws_templates_TemplateMonacoPreviewPanel_test_tsx_8382abd6: {
    label: "TemplateMonacoPreviewPanel.test.tsx"
  }
  File_p_views_templates_TemplateMonacoPreviewPanel_tsx_5d9955af: {
    label: "TemplateMonacoPreviewPanel.tsx"
  }
  File_ates_templatesMonacoPreview_architecture_test_ts_e8f2c814: {
    label: "templatesMonacoPreview.architecture.test.ts"
  }
  File__app_views_templates_TemplatesRouteWorkbench_tsx_d0606c24: {
    label: "TemplatesRouteWorkbench.tsx"
  }
  File_c_app_views_templates_templatesViewModel_test_ts_08b6b701: {
    label: "templatesViewModel.test.ts"
  }
  File_src_app_views_templates_templatesViewModel_ts_2be44123: {
    label: "templatesViewModel.ts"
  }
  File_emplates_templatesWorkbench_architecture_test_ts_cbad4b56: {
    label: "templatesWorkbench.architecture.test.ts"
  }
}
`;case`webSource_dir_src_app_views_test_481b0fbc`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_app_52e6ddd7Dir_src_app_views_f32657e4Dir_src_app_views_test_481b0fbc: {
  label: "test/ — 1 files"

  File_src_app_views_test_DiffViewHarness_tsx_9bb39d6d: {
    label: "DiffViewHarness.tsx"
  }
}
`;case`apiSource_dir_src_application_f8a49c7c`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7c: {
  label: "application/ — 135 files"

  Dir_src_application_errors_b20e2c46: {
    label: "errors/ — 1 files"
  }
  Dir_src_application_ports_f1814855: {
    label: "ports/ — 40 files"
  }
  Dir_src_application_services_e1ef5eaa: {
    label: "services/ — 94 files"
  }
}
`;case`deliverySource_dir_src_application_f8a49c7c`:return`direction: down

DeliverySourceDir_src_f27fede2Dir_src_application_f8a49c7c: {
  label: "application/ — 6 files"

  File_src_application_OutboxWorker_ts_90de9fc5: {
    label: "OutboxWorker.ts"
  }
  File_src_application_OutboxWorkerRuntime_ts_e38468b6: {
    label: "OutboxWorkerRuntime.ts"
  }
  File_c_application_outboxWorkerRuntimeErrorSupport_ts_bb2ea0ec: {
    label: "outboxWorkerRuntimeErrorSupport.ts"
  }
  File_src_application_OutboxWorkerRuntimeHookRunner_ts_6c30e806: {
    label: "OutboxWorkerRuntimeHookRunner.ts"
  }
  File_application_OutboxWorkerRuntimeLoopController_ts_27b30312: {
    label: "OutboxWorkerRuntimeLoopController.ts"
  }
  File_src_application_ProjectorWorkerRuntime_ts_a63befa3: {
    label: "ProjectorWorkerRuntime.ts"
  }
}
`;case`engineSource_dir_src_application_f8a49c7c`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7c: {
  label: "application/ — 13 files"

  Dir_src_application_workflow-engine-use-cases_c247c6c2: {
    label: "workflow-engine-use-cases/ — 8 files"
  }
  File_src_application_IStartRunApplicationService_ts_3de6d6d1: {
    label: "IStartRunApplicationService.ts"
  }
  File_src_application_providerSelection_ts_51666f4e: {
    label: "providerSelection.ts"
  }
  File_src_application_RecoverRunApplicationService_ts_db4fc95e: {
    label: "RecoverRunApplicationService.ts"
  }
  File_src_application_StartRunAdmissionGuard_ts_440dbb44: {
    label: "StartRunAdmissionGuard.ts"
  }
  File_src_application_StartRunApplicationService_ts_ab879046: {
    label: "StartRunApplicationService.ts"
  }
}
`;case`plannerSource_dir_src_application_f8a49c7c`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_application_f8a49c7c: {
  label: "application/ — 4 files"

  File_lication_derivePlannerGraphSourceFromManifest_ts_e73dc650: {
    label: "derivePlannerGraphSourceFromManifest.ts"
  }
  File_src_application_ExecutableSubgraphDeriver_ts_c941a99f: {
    label: "ExecutableSubgraphDeriver.ts"
  }
  File_src_application_PlannerEnvelopeMapper_ts_85c009a9: {
    label: "PlannerEnvelopeMapper.ts"
  }
  File_src_application_PlannerFacade_ts_ffe4cd95: {
    label: "PlannerFacade.ts"
  }
}
`;case`apiSource_dir_src_application_errors_b20e2c46`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_errors_b20e2c46: {
  label: "errors/ — 1 files"

  File_src_application_errors_runControlErrors_ts_8d88032f: {
    label: "runControlErrors.ts"
  }
}
`;case`apiSource_dir_src_application_ports_f1814855`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_ports_f1814855: {
  label: "ports/ — 40 files"

  File_src_application_ports_accessDecision_ts_dd52ea87: {
    label: "accessDecision.ts"
  }
  File_src_application_ports_accessDecisionActions_ts_8f8b5e30: {
    label: "accessDecisionActions.ts"
  }
  File_src_application_ports_accessDecisionScopes_ts_f63a641c: {
    label: "accessDecisionScopes.ts"
  }
  File_src_application_ports_AdmissionTelemetry_ts_041c93a2: {
    label: "AdmissionTelemetry.ts"
  }
  File_src_application_ports_auth_ts_ae71e2c2: {
    label: "auth.ts"
  }
  File_src_application_ports_authContract_ts_628e8f22: {
    label: "authContract.ts"
  }
  File_rc_application_ports_canvasAuthoringAuthority_ts_0eaae60a: {
    label: "canvasAuthoringAuthority.ts"
  }
  File_src_application_ports_dbtDependencyEdit_ts_5b2fd688: {
    label: "dbtDependencyEdit.ts"
  }
  File_src_application_ports_dbtExecutionTarget_ts_0229bb2d: {
    label: "dbtExecutionTarget.ts"
  }
  File_src_application_ports_dbtProjectAnalysis_ts_c9db650a: {
    label: "dbtProjectAnalysis.ts"
  }
  File_src_application_ports_dbtProjectBundle_ts_df8e4192: {
    label: "dbtProjectBundle.ts"
  }
  File_application_ports_dbtProjectCandidateAnalysis_ts_8dcc2d6c: {
    label: "dbtProjectCandidateAnalysis.ts"
  }
  File_src_application_ports_dbtProjectImport_ts_93577643: {
    label: "dbtProjectImport.ts"
  }
  File_src_application_ports_dbtYamlDescriptionEdit_ts_1d67df6c: {
    label: "dbtYamlDescriptionEdit.ts"
  }
  File_src_application_ports_DuplicateRunProbe_ts_390e82f1: {
    label: "DuplicateRunProbe.ts"
  }
  File_on_ports_graphDbtWorkspaceArtifactPublication_ts_6cbedc21: {
    label: "graphDbtWorkspaceArtifactPublication.ts"
  }
  File_src_application_ports_IAdmissionGuard_ts_9e5e99e5: {
    label: "IAdmissionGuard.ts"
  }
  File_src_application_ports_IAdmissionMode_ts_0f033573: {
    label: "IAdmissionMode.ts"
  }
  File_lication_ports_IBackpressureCapacityTelemetry_ts_c926289c: {
    label: "IBackpressureCapacityTelemetry.ts"
  }
  File_lication_ports_IStartRunExecutionCapacityPort_ts_b0639641: {
    label: "IStartRunExecutionCapacityPort.ts"
  }
  File_lication_ports_IStartRunTargetAdapterRegistry_ts_35317eb3: {
    label: "IStartRunTargetAdapterRegistry.ts"
  }
  File_lication_ports_postgresTransformSqlValidation_ts_cb3203f1: {
    label: "postgresTransformSqlValidation.ts"
  }
  File_rc_application_ports_principalGrantRepository_ts_4caff6b5: {
    label: "principalGrantRepository.ts"
  }
  File_src_application_ports_projectOnboarding_ts_2b3eba22: {
    label: "projectOnboarding.ts"
  }
  File_application_ports_runCancellationReceiptStore_ts_3a7e3c24: {
    label: "runCancellationReceiptStore.ts"
  }
  File_on_ports_runExecutionContextInheritanceWriter_ts_91e23f5c: {
    label: "runExecutionContextInheritanceWriter.ts"
  }
  File_tion_ports_runExecutionContextReferenceReader_ts_e9fb299e: {
    label: "runExecutionContextReferenceReader.ts"
  }
  File__ports_runExecutionContextRequirementResolver_ts_678681b7: {
    label: "runExecutionContextRequirementResolver.ts"
  }
  File_c_application_ports_runExecutionContextWriter_ts_61072afb: {
    label: "runExecutionContextWriter.ts"
  }
  File_src_application_ports_runtime_ts_1bc2cb18: {
    label: "runtime.ts"
  }
  File_src_application_ports_startRunEngineError_ts_d0fa078c: {
    label: "startRunEngineError.ts"
  }
  File_src_application_ports_StartRunSlaTelemetry_ts_66298acb: {
    label: "StartRunSlaTelemetry.ts"
  }
  File_src_application_ports_startRunUseCasePort_ts_325e953b: {
    label: "startRunUseCasePort.ts"
  }
  File_src_application_ports_warehouseSourceImport_ts_d0a1cd6d: {
    label: "warehouseSourceImport.ts"
  }
  File_src_application_ports_workspaceContext_ts_315e6ad9: {
    label: "workspaceContext.ts"
  }
  File_src_application_ports_workspaceDiffChanges_ts_c4ee90d1: {
    label: "workspaceDiffChanges.ts"
  }
  File_src_application_ports_workspaceFileHistory_ts_801ee765: {
    label: "workspaceFileHistory.ts"
  }
  File_src_application_ports_workspaceFiles_ts_6048903c: {
    label: "workspaceFiles.ts"
  }
  File_src_application_ports_workspaceGraphDraft_ts_af47bcb2: {
    label: "workspaceGraphDraft.ts"
  }
  File_src_application_ports_workspacePluginCatalog_ts_51f45599: {
    label: "workspacePluginCatalog.ts"
  }
}
`;case`apiSource_dir_src_application_services_e1ef5eaa`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaa: {
  label: "services/ — 94 files"

  Dir_src_application_services_dbtDependencyEdit_1ec59f3d: {
    label: "dbtDependencyEdit/ — 3 files"
  }
  Dir_src_application_services_dbtYamlDescriptionEdit_e9da71e9: {
    label: "dbtYamlDescriptionEdit/ — 5 files"
  }
  Dir_on_services_graphDbtWorkspaceArtifactPublication_766e9c67: {
    label: "graphDbtWorkspaceArtifactPublication/ — 1 files"
  }
  File_ication_services_analyzeSelectedDbtModelQuery_ts_766ace9a: {
    label: "analyzeSelectedDbtModelQuery.ts"
  }
  File_ication_services_authorizeCommandScopeService_ts_d1157d74: {
    label: "authorizeCommandScopeService.ts"
  }
  File_authorizeWorkspaceGraphDraftCapabilityService_ts_4a11f8ff: {
    label: "authorizeWorkspaceGraphDraftCapabilityService.ts"
  }
  File_ion_services_BackpressureAwareStartRunUseCase_ts_98f61e6f: {
    label: "BackpressureAwareStartRunUseCase.ts"
  }
  File_src_application_services_cancelRunUseCase_ts_c364de92: {
    label: "cancelRunUseCase.ts"
  }
  File_ation_services_canvasAuthoringAuthorityPolicy_ts_bf2b562a: {
    label: "canvasAuthoringAuthorityPolicy.ts"
  }
  File_plication_services_compileGraphDbtModelsQuery_ts_28ac59c2: {
    label: "compileGraphDbtModelsQuery.ts"
  }
  File_src_application_services_CompilePlanUseCase_ts_15bebf59: {
    label: "CompilePlanUseCase.ts"
  }
  File_src_application_services_createProjectUseCase_ts_c4e47728: {
    label: "createProjectUseCase.ts"
  }
  File_ion_services_createWarehouseConnectionUseCase_ts_3ab7027e: {
    label: "createWarehouseConnectionUseCase.ts"
  }
  File_cation_services_dbtExecutionConnectionBinding_ts_b38e2f7c: {
    label: "dbtExecutionConnectionBinding.ts"
  }
  File__application_services_dbtPlanExecutionBinding_ts_497e7caa: {
    label: "dbtPlanExecutionBinding.ts"
  }
  File__dbtProjectFilesWarehouseSourceImportStrategy_ts_226baedf: {
    label: "dbtProjectFilesWarehouseSourceImportStrategy.ts"
  }
  File_services_defaultStartRunExecutionCapacityPort_ts_36a72792: {
    label: "defaultStartRunExecutionCapacityPort.ts"
  }
  File_rc_application_services_engineStartRunUseCase_ts_e7d8ce7f: {
    label: "engineStartRunUseCase.ts"
  }
  File_ion_services_getCostAttributionSummaryUseCase_ts_5ca6a9ec: {
    label: "getCostAttributionSummaryUseCase.ts"
  }
  File_src_application_services_getRunEventsUseCase_ts_0f2774df: {
    label: "getRunEventsUseCase.ts"
  }
  File_src_application_services_getRunStatusUseCase_ts_212bfa14: {
    label: "getRunStatusUseCase.ts"
  }
  File_ation_services_getWorkspaceFileContentUseCase_ts_25ad3f22: {
    label: "getWorkspaceFileContentUseCase.ts"
  }
  File_cation_services_getWorkspaceGraphDraftUseCase_ts_2dc240dd: {
    label: "getWorkspaceGraphDraftUseCase.ts"
  }
  File_vices_graphDraftWarehouseSourceImportStrategy_ts_c76d6d88: {
    label: "graphDraftWarehouseSourceImportStrategy.ts"
  }
  File__application_services_importDbtProjectUseCase_ts_920dbed4: {
    label: "importDbtProjectUseCase.ts"
  }
  File_src_application_services_ImportPlanUseCase_ts_26b98bcd: {
    label: "ImportPlanUseCase.ts"
  }
  File_cation_services_importWarehouseSourcesUseCase_ts_fe272557: {
    label: "importWarehouseSourcesUseCase.ts"
  }
  File_src_application_services_listProjectsUseCase_ts_58744e45: {
    label: "listProjectsUseCase.ts"
  }
  File_src_application_services_listRunsUseCase_ts_290c07ad: {
    label: "listRunsUseCase.ts"
  }
  File_s_listWarehouseConnectionSourceObjectsUseCase_ts_a8f7e362: {
    label: "listWarehouseConnectionSourceObjectsUseCase.ts"
  }
  File_tion_services_listWarehouseConnectionsUseCase_ts_84f6fa9b: {
    label: "listWarehouseConnectionsUseCase.ts"
  }
  File_tion_services_listWorkspaceDiffChangesUseCase_ts_b6e92311: {
    label: "listWorkspaceDiffChangesUseCase.ts"
  }
  File_tion_services_listWorkspaceFileHistoryUseCase_ts_45d3c85e: {
    label: "listWorkspaceFileHistoryUseCase.ts"
  }
  File_pplication_services_listWorkspaceFilesUseCase_ts_14c002c4: {
    label: "listWorkspaceFilesUseCase.ts"
  }
  File_lication_services_listWorkspacePluginsUseCase_ts_f947038c: {
    label: "listWorkspacePluginsUseCase.ts"
  }
  File_ication_services_PlannerBackedStartRunUseCase_ts_505e19c3: {
    label: "PlannerBackedStartRunUseCase.ts"
  }
  File_plication_services_postgresTransformSqlPolicy_ts_458c3215: {
    label: "postgresTransformSqlPolicy.ts"
  }
  File_src_application_services_PreviewPlanUseCase_ts_7637ed89: {
    label: "PreviewPlanUseCase.ts"
  }
  File_vices_previewWarehouseSourceObjectRowsUseCase_ts_9fc02e6c: {
    label: "previewWarehouseSourceObjectRowsUseCase.ts"
  }
  File_tion_services_projectDbtGraphFromFilesUseCase_ts_df14a25e: {
    label: "projectDbtGraphFromFilesUseCase.ts"
  }
  File__application_services_projectOnboardingPolicy_ts_7862bab2: {
    label: "projectOnboardingPolicy.ts"
  }
  File_ion_services_protectedRuntimeTenantAuthorizer_ts_2ca84b04: {
    label: "protectedRuntimeTenantAuthorizer.ts"
  }
  File_src_application_services_recoverRunUseCase_ts_12ed7c68: {
    label: "recoverRunUseCase.ts"
  }
  File_ion_services_renameWarehouseConnectionUseCase_ts_f2f5b74e: {
    label: "renameWarehouseConnectionUseCase.ts"
  }
  File__services_resolveAuthorizedExecutableSubgraph_ts_26d230ef: {
    label: "resolveAuthorizedExecutableSubgraph.ts"
  }
  File_ervices_resolveAuthorizedPlannerInputEnvelope_ts_8b1c183d: {
    label: "resolveAuthorizedPlannerInputEnvelope.ts"
  }
  File_on_services_resolveAuthorizedPreviewSelection_ts_89fa8bf9: {
    label: "resolveAuthorizedPreviewSelection.ts"
  }
  File_services_resolveCanonicalPlannerInputEnvelope_ts_33b7abcb: {
    label: "resolveCanonicalPlannerInputEnvelope.ts"
  }
  File_src_application_services_runControlPolicy_ts_74c2ed3d: {
    label: "runControlPolicy.ts"
  }
  File_on_services_RunExecutionContextBindingUseCase_ts_d48a09c4: {
    label: "RunExecutionContextBindingUseCase.ts"
  }
  File_plication_services_runExecutionContextFactory_ts_c7d91ba5: {
    label: "runExecutionContextFactory.ts"
  }
  File_pplication_services_runMetadataToEngineRunRef_ts_0651ba95: {
    label: "runMetadataToEngineRunRef.ts"
  }
  File_src_application_services_runOperationalTruth_ts_baec43cb: {
    label: "runOperationalTruth.ts"
  }
  File_src_application_services_runReadEvidenceModel_ts_52c72f0e: {
    label: "runReadEvidenceModel.ts"
  }
  File__application_services_runRecoveryContextTrust_ts_92a0646a: {
    label: "runRecoveryContextTrust.ts"
  }
  File_lication_services_runRecoveryPlanAvailability_ts_ce7c158d: {
    label: "runRecoveryPlanAvailability.ts"
  }
  File_application_services_runStartDispatchResolver_ts_69d7d8ea: {
    label: "runStartDispatchResolver.ts"
  }
  File_tion_services_saveWorkspaceFileContentUseCase_ts_1c51b06a: {
    label: "saveWorkspaceFileContentUseCase.ts"
  }
  File_ation_services_saveWorkspaceGraphDraftUseCase_ts_f3e08a05: {
    label: "saveWorkspaceGraphDraftUseCase.ts"
  }
  File_n_services_selectedDbtModelAnalysisProjection_ts_9c757fc9: {
    label: "selectedDbtModelAnalysisProjection.ts"
  }
  File_ion_services_selectedDbtModelAnalysisResolver_ts_0d374137: {
    label: "selectedDbtModelAnalysisResolver.ts"
  }
  File_src_application_services_signalRunUseCase_ts_eccc2093: {
    label: "signalRunUseCase.ts"
  }
  File_src_application_services_slaTiming_ts_2acbbcda: {
    label: "slaTiming.ts"
  }
  File_plication_services_startRunAdmissionDecisions_ts_46be9f6a: {
    label: "startRunAdmissionDecisions.ts"
  }
  File_src_application_services_startRunEngineBridge_ts_435aae8b: {
    label: "startRunEngineBridge.ts"
  }
  File_cation_services_startRunTargetAdapterRegistry_ts_0cd61b1a: {
    label: "startRunTargetAdapterRegistry.ts"
  }
  File_src_application_services_storedExecutablePlan_ts_358fc995: {
    label: "storedExecutablePlan.ts"
  }
  File_ication_services_StoredExecutablePlanResolver_ts_6d74b3b6: {
    label: "StoredExecutablePlanResolver.ts"
  }
  File_ation_services_StoredPlanAdmissionCoordinator_ts_929a95d7: {
    label: "StoredPlanAdmissionCoordinator.ts"
  }
  File_ion_services_StoredPlanExecutabilityValidator_ts_1fc2cfa0: {
    label: "StoredPlanExecutabilityValidator.ts"
  }
  File_redPlanRunExecutionContextRequirementResolver_ts_860ff8d5: {
    label: "StoredPlanRunExecutionContextRequirementResolver.ts"
  }
  File_src_application_services_storedPlanScope_ts_64499474: {
    label: "storedPlanScope.ts"
  }
  File_ation_services_testWarehouseConnectionUseCase_ts_eee77170: {
    label: "testWarehouseConnectionUseCase.ts"
  }
  File_tion_services_validateDbtProjectImportUseCase_ts_36c7fd36: {
    label: "validateDbtProjectImportUseCase.ts"
  }
  File__services_validatePostgresTransformSqlUseCase_ts_79c4630a: {
    label: "validatePostgresTransformSqlUseCase.ts"
  }
  File_ervices_WarehouseConnectionSourceObjectReader_ts_7b823e9b: {
    label: "WarehouseConnectionSourceObjectReader.ts"
  }
  File_pplication_services_warehouseSourceImportPlan_ts_429f64aa: {
    label: "warehouseSourceImportPlan.ts"
  }
  File_plication_services_warehouseSourceRemovalPlan_ts_b29fdf39: {
    label: "warehouseSourceRemovalPlan.ts"
  }
  File_src_application_services_warehouseSourceYaml_ts_66aace5a: {
    label: "warehouseSourceYaml.ts"
  }
  File_lication_services_warehouseSourceYamlBindings_ts_26c71a42: {
    label: "warehouseSourceYamlBindings.ts"
  }
  File_cation_services_warehouseSourceYamlDescriptor_ts_9a27a458: {
    label: "warehouseSourceYamlDescriptor.ts"
  }
  File_lication_services_warehouseSourceYamlDocument_ts_f3ee6d89: {
    label: "warehouseSourceYamlDocument.ts"
  }
  File_lication_services_warehouseSourceYamlIdentity_ts_bad4d177: {
    label: "warehouseSourceYamlIdentity.ts"
  }
  File_application_services_warehouseSourceYamlMerge_ts_5ad69e46: {
    label: "warehouseSourceYamlMerge.ts"
  }
  File_cation_services_warehouseSourceYamlSerializer_ts_11b13ed0: {
    label: "warehouseSourceYamlSerializer.ts"
  }
  File_application_services_warehouseSourceYamlTypes_ts_bbbea417: {
    label: "warehouseSourceYamlTypes.ts"
  }
  File_rc_application_services_WorkflowEngineFactory_ts_03f081a9: {
    label: "WorkflowEngineFactory.ts"
  }
  File__services_workspaceGraphDraftCapabilityPolicy_ts_64996b40: {
    label: "workspaceGraphDraftCapabilityPolicy.ts"
  }
}
`;case`apiSource_dir_src_application_services_dbtDependencyEdit_1ec59f3d`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtDependencyEdit_1ec59f3d: {
  label: "dbtDependencyEdit/ — 3 files"

  File_ncyEdit_ApplySelectedDbtDependencyEditCommand_ts_727c5bcd: {
    label: "ApplySelectedDbtDependencyEditCommand.ts"
  }
  File_DependencyEdit_dbtDependencyEditDecisionModel_ts_0a9a8149: {
    label: "dbtDependencyEditDecisionModel.ts"
  }
  File_tDependencyEdit_dbtSemanticRegionPatchPlanner_ts_4cc6ead2: {
    label: "dbtSemanticRegionPatchPlanner.ts"
  }
}
`;case`apiSource_dir_src_application_services_dbtYamlDescriptionEdit_e9da71e9`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_src_application_services_dbtYamlDescriptionEdit_e9da71e9: {
  label: "dbtYamlDescriptionEdit/ — 5 files"

  File_iptionEdit_ApplyDbtYamlDescriptionEditCommand_ts_551a5ed1: {
    label: "ApplyDbtYamlDescriptionEditCommand.ts"
  }
  File_scriptionEdit_dbtYamlDescriptionEditIntegrity_ts_64947ea8: {
    label: "dbtYamlDescriptionEditIntegrity.ts"
  }
  File_iptionEdit_DbtYamlDescriptionResourceResolver_ts_75d43e8c: {
    label: "DbtYamlDescriptionResourceResolver.ts"
  }
  File_iptionEdit_ProposeDbtYamlDescriptionEditQuery_ts_01f8fbbb: {
    label: "ProposeDbtYamlDescriptionEditQuery.ts"
  }
  File_ptionEdit_RevertDbtYamlDescriptionEditCommand_ts_8d73322d: {
    label: "RevertDbtYamlDescriptionEditCommand.ts"
  }
}
`;case`apiSource_dir_on_services_graphDbtWorkspaceArtifactPublication_766e9c67`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_services_e1ef5eaaDir_on_services_graphDbtWorkspaceArtifactPublication_766e9c67: {
  label: "graphDbtWorkspaceArtifactPublication/ — 1 files"

  File_tion_PublishGraphDbtWorkspaceArtifactsCommand_ts_60451403: {
    label: "PublishGraphDbtWorkspaceArtifactsCommand.ts"
  }
}
`;case`engineSource_dir_src_application_workflow-engine-use-cases_c247c6c2`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_application_f8a49c7cDir_src_application_workflow-engine-use-cases_c247c6c2: {
  label: "workflow-engine-use-cases/ — 8 files"

  File_-engine-use-cases_buildWorkflowEngineUseCases_ts_aff992f2: {
    label: "buildWorkflowEngineUseCases.ts"
  }
  File_c_application_workflow-engine-use-cases_index_ts_fd8907df: {
    label: "index.ts"
  }
  File_c_application_workflow-engine-use-cases_types_ts_ef60927d: {
    label: "types.ts"
  }
  File_low-engine-use-cases_WorkflowCancelRunUseCase_ts_502ec1f3: {
    label: "WorkflowCancelRunUseCase.ts"
  }
  File_ow-engine-use-cases_WorkflowRecoverRunUseCase_ts_f56d7ca4: {
    label: "WorkflowRecoverRunUseCase.ts"
  }
  File_low-engine-use-cases_WorkflowRunStatusUseCase_ts_47efbeef: {
    label: "WorkflowRunStatusUseCase.ts"
  }
  File_low-engine-use-cases_WorkflowSignalRunUseCase_ts_21f10271: {
    label: "WorkflowSignalRunUseCase.ts"
  }
  File_flow-engine-use-cases_WorkflowStartRunUseCase_ts_ceee917b: {
    label: "WorkflowStartRunUseCase.ts"
  }
}
`;case`deliverySource_dir_src_backpressure_1b00f00b`:return`direction: down

DeliverySourceDir_src_f27fede2Dir_src_backpressure_1b00f00b: {
  label: "backpressure/ — 1 files"

  File_src_backpressure_StartRunAdmissionGuard_ts_d6599097: {
    label: "StartRunAdmissionGuard.ts"
  }
}
`;case`outboxWorkerSource_dir_src_bus_740211a8`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_bus_740211a8: {
  label: "bus/ — 2 files"

  File_src_bus_HttpEventBus_ts_30469926: {
    label: "HttpEventBus.ts"
  }
  File_src_bus_LoggingEventBus_ts_af7cf0ff: {
    label: "LoggingEventBus.ts"
  }
}
`;case`webSource_dir_src_capabilities_b4d68af1`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1: {
  label: "capabilities/ — 21 files"

  Dir_src_capabilities_platform-health_6752a0b4: {
    label: "platform-health/ — 15 files"
  }
  Dir_src_capabilities_runtime-capabilities_a2a3259a: {
    label: "runtime-capabilities/ — 6 files"
  }
}
`;case`webSource_dir_src_capabilities_platform-health_6752a0b4`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4: {
  label: "platform-health/ — 15 files"

  Dir_src_capabilities_platform-health_application_fdc5ba1f: {
    label: "application/ — 2 files"
  }
  Dir_src_capabilities_platform-health_contracts_bd19ad60: {
    label: "contracts/ — 1 files"
  }
  Dir_src_capabilities_platform-health_domain_daf95aa2: {
    label: "domain/ — 3 files"
  }
  Dir_src_capabilities_platform-health_infrastructure_bb4c69d0: {
    label: "infrastructure/ — 2 files"
  }
  Dir_src_capabilities_platform-health_presentation_57c6f9e4: {
    label: "presentation/ — 4 files"
  }
  Dir_src_capabilities_platform-health_testing_90f550a0: {
    label: "testing/ — 2 files"
  }
  File_src_capabilities_platform-health_index_ts_602145f7: {
    label: "index.ts"
  }
}
`;case`webSource_dir_src_capabilities_platform-health_application_fdc5ba1f`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_application_fdc5ba1f: {
  label: "application/ — 2 files"

  File_lth_application_platformHealthCapability_test_ts_1c2e2996: {
    label: "platformHealthCapability.test.ts"
  }
  File_m-health_application_platformHealthCapability_ts_86a4d179: {
    label: "platformHealthCapability.ts"
  }
}
`;case`webSource_dir_src_capabilities_platform-health_contracts_bd19ad60`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_contracts_bd19ad60: {
  label: "contracts/ — 1 files"

  File__platform-health_contracts_platformHealthDtos_ts_0731b282: {
    label: "platformHealthDtos.ts"
  }
}
`;case`webSource_dir_src_capabilities_platform-health_domain_daf95aa2`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_domain_daf95aa2: {
  label: "domain/ — 3 files"

  File_rm-health_domain_platformHealthSelectors_test_ts_8a2a18c3: {
    label: "platformHealthSelectors.test.ts"
  }
  File_latform-health_domain_platformHealthSelectors_ts_55ba9b4b: {
    label: "platformHealthSelectors.ts"
  }
  File_es_platform-health_domain_platformHealthTypes_ts_113d31e4: {
    label: "platformHealthTypes.ts"
  }
}
`;case`webSource_dir_src_capabilities_platform-health_infrastructure_bb4c69d0`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_infrastructure_bb4c69d0: {
  label: "infrastructure/ — 2 files"

  File__infrastructure_httpPlatformHealthClient_test_ts_1e8211dc: {
    label: "httpPlatformHealthClient.test.ts"
  }
  File_ealth_infrastructure_httpPlatformHealthClient_ts_97ede301: {
    label: "httpPlatformHealthClient.ts"
  }
}
`;case`webSource_dir_src_capabilities_platform-health_presentation_57c6f9e4`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_presentation_57c6f9e4: {
  label: "presentation/ — 4 files"

  File_health_presentation_platformHealthStatus_test_ts_668b147e: {
    label: "platformHealthStatus.test.ts"
  }
  File_form-health_presentation_platformHealthStatus_ts_6bb43a7c: {
    label: "platformHealthStatus.ts"
  }
  File_sentation_usePlatformHealthSnapshotQuery_test_ts_e850d877: {
    label: "usePlatformHealthSnapshotQuery.test.ts"
  }
  File_h_presentation_usePlatformHealthSnapshotQuery_ts_34f9d350: {
    label: "usePlatformHealthSnapshotQuery.ts"
  }
}
`;case`webSource_dir_src_capabilities_platform-health_testing_90f550a0`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_platform-health_6752a0b4Dir_src_capabilities_platform-health_testing_90f550a0: {
  label: "testing/ — 2 files"

  File_latform-health_testing_platformHealthFixtures_ts_9250f494: {
    label: "platformHealthFixtures.ts"
  }
  File_form-health_testing_platformHealthHttpHarness_ts_b43c78a8: {
    label: "platformHealthHttpHarness.ts"
  }
}
`;case`webSource_dir_src_capabilities_runtime-capabilities_a2a3259a`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259a: {
  label: "runtime-capabilities/ — 6 files"

  Dir_rc_capabilities_runtime-capabilities_application_02bb9f49: {
    label: "application/ — 2 files"
  }
  Dir_src_capabilities_runtime-capabilities_contracts_d38baed5: {
    label: "contracts/ — 1 files"
  }
  Dir_capabilities_runtime-capabilities_infrastructure_d623396e: {
    label: "infrastructure/ — 2 files"
  }
  File_src_capabilities_runtime-capabilities_index_ts_a68f1015: {
    label: "index.ts"
  }
}
`;case`webSource_dir_rc_capabilities_runtime-capabilities_application_02bb9f49`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aDir_rc_capabilities_runtime-capabilities_application_02bb9f49: {
  label: "application/ — 2 files"

  File_pplication_runtimeCapabilitiesCapability_test_ts_4ef7ca59: {
    label: "runtimeCapabilitiesCapability.test.ts"
  }
  File_ies_application_runtimeCapabilitiesCapability_ts_437af2b6: {
    label: "runtimeCapabilitiesCapability.ts"
  }
}
`;case`webSource_dir_src_capabilities_runtime-capabilities_contracts_d38baed5`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aDir_src_capabilities_runtime-capabilities_contracts_d38baed5: {
  label: "contracts/ — 1 files"

  File_apabilities_contracts_runtimeCapabilitiesDtos_ts_4f622772: {
    label: "runtimeCapabilitiesDtos.ts"
  }
}
`;case`webSource_dir_capabilities_runtime-capabilities_infrastructure_d623396e`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_capabilities_b4d68af1Dir_src_capabilities_runtime-capabilities_a2a3259aDir_capabilities_runtime-capabilities_infrastructure_d623396e: {
  label: "infrastructure/ — 2 files"

  File_astructure_httpRuntimeCapabilitiesClient_test_ts_4bc5f080: {
    label: "httpRuntimeCapabilitiesClient.test.ts"
  }
  File__infrastructure_httpRuntimeCapabilitiesClient_ts_a7358791: {
    label: "httpRuntimeCapabilitiesClient.ts"
  }
}
`;case`lineageWorkerSource_dir_src_compiled-code-resolver_e09af233`:return`direction: down

LineageWorkerSourceDir_src_f27fede2Dir_src_compiled-code-resolver_e09af233: {
  label: "compiled-code-resolver/ — 4 files"

  File_src_compiled-code-resolver_errorMapping_ts_ff861088: {
    label: "errorMapping.ts"
  }
  File_src_compiled-code-resolver_policy_ts_8a3b8a21: {
    label: "policy.ts"
  }
  File_ompiled-code-resolver_S3UriCompiledCodeReader_ts_609358c3: {
    label: "S3UriCompiledCodeReader.ts"
  }
  File_src_compiled-code-resolver_types_ts_2342179d: {
    label: "types.ts"
  }
}
`;case`artifactsSource_dir_src_compiledCode_a188b957`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957: {
  label: "compiledCode/ — 7 files"

  Dir_src_compiledCode_adapters_1eddf0a2: {
    label: "adapters/ — 5 files"
  }
  File_src_compiledCode_attachCompiledCodeRefs_ts_ad89a9f1: {
    label: "attachCompiledCodeRefs.ts"
  }
  File_src_compiledCode_sha256_ts_e87caec7: {
    label: "sha256.ts"
  }
}
`;case`artifactsSource_dir_src_compiledCode_adapters_1eddf0a2`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_compiledCode_a188b957Dir_src_compiledCode_adapters_1eddf0a2: {
  label: "adapters/ — 5 files"

  File_edCode_adapters_FileSystemCompiledCodeStorage_ts_7cf12581: {
    label: "FileSystemCompiledCodeStorage.ts"
  }
  File_iledCode_adapters_InMemoryCompiledCodeStorage_ts_cb73138e: {
    label: "InMemoryCompiledCodeStorage.ts"
  }
  File_ompiledCode_adapters_MinioCompiledCodeStorage_ts_e7bfeaa9: {
    label: "MinioCompiledCodeStorage.ts"
  }
  File_compiledCode_adapters_NoopCompiledCodeStorage_ts_4e9e8e48: {
    label: "NoopCompiledCodeStorage.ts"
  }
  File_c_compiledCode_adapters_S3CompiledCodeStorage_ts_0dcc5392: {
    label: "S3CompiledCodeStorage.ts"
  }
}
`;case`artifactsSource_dir_src_contentAddressed_d00e5123`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_contentAddressed_d00e5123: {
  label: "contentAddressed/ — 2 files"

  File_ntentAddressed_IContentAddressedArtifactStore_ts_303a6651: {
    label: "IContentAddressedArtifactStore.ts"
  }
  File_tentAddressed_S3ContentAddressedArtifactStore_ts_2d9f8e9c: {
    label: "S3ContentAddressedArtifactStore.ts"
  }
}
`;case`contractsSource_dir_src_contracts_63d3060b`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060b: {
  label: "contracts/ — 73 files"

  Dir_src_contracts_dbt-project_8150add5: {
    label: "dbt-project/ — 7 files"
  }
  Dir_src_contracts_engine_07455cf8: {
    label: "engine/ — 10 files"
  }
  Dir_src_contracts_planner_9acb1d0e: {
    label: "planner/ — 49 files"
  }
  Dir_src_contracts_source-import_46584ffc: {
    label: "source-import/ — 6 files"
  }
  Dir_src_contracts_workspace_cd294792: {
    label: "workspace/ — 1 files"
  }
}
`;case`engineSource_dir_src_contracts_63d3060b`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060b: {
  label: "contracts/ — 22 files"

  Dir_src_contracts_engine_07455cf8: {
    label: "engine/ — 6 files"
  }
  Dir_src_contracts_errors_16f18706: {
    label: "errors/ — 6 files"
  }
  File_src_contracts_errors_ts_7ba50060: {
    label: "errors.ts"
  }
  File_src_contracts_executionPlan_ts_269451bf: {
    label: "executionPlan.ts"
  }
  File_src_contracts_index_ts_97a6fd24: {
    label: "index.ts"
  }
  File_src_contracts_intentErrors_ts_1e9c5145: {
    label: "intentErrors.ts"
  }
  File_src_contracts_IRunEnrichmentService_v1_ts_b4deac74: {
    label: "IRunEnrichmentService.v1.ts"
  }
  File_src_contracts_PlanAdmissionPolicy_ts_df487504: {
    label: "PlanAdmissionPolicy.ts"
  }
  File_src_contracts_PlanSchemaVersionPolicy_ts_05d008ec: {
    label: "PlanSchemaVersionPolicy.ts"
  }
  File_src_contracts_planUriPolicyViolation_ts_335587bf: {
    label: "planUriPolicyViolation.ts"
  }
  File_src_contracts_runEvents_ts_23bdee5e: {
    label: "runEvents.ts"
  }
  File_src_contracts_types_ts_72675abd: {
    label: "types.ts"
  }
}
`;case`observabilitySource_dir_src_contracts_63d3060b`:return`direction: down

ObservabilitySourceDir_src_f27fede2Dir_src_contracts_63d3060b: {
  label: "contracts/ — 2 files"

  File_src_contracts_IObservability_ts_3025c009: {
    label: "IObservability.ts"
  }
  File_src_contracts_ObservabilityContext_ts_55975809: {
    label: "ObservabilityContext.ts"
  }
}
`;case`plannerSource_dir_src_contracts_63d3060b`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_contracts_63d3060b: {
  label: "contracts/ — 3 files"

  File_src_contracts_CustomPolicyNamespaceRegistry_ts_14364c58: {
    label: "CustomPolicyNamespaceRegistry.ts"
  }
  File_src_contracts_ExecutionBindingVerification_ts_9038fe82: {
    label: "ExecutionBindingVerification.ts"
  }
  File_src_contracts_PlanExecutabilityValidation_ts_0ae35af6: {
    label: "PlanExecutabilityValidation.ts"
  }
}
`;case`contractsSource_dir_src_contracts_dbt-project_8150add5`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_dbt-project_8150add5: {
  label: "dbt-project/ — 7 files"

  File_rc_contracts_dbt-project_DbtDependencyEdit_v1_ts_7eee003a: {
    label: "DbtDependencyEdit.v1.ts"
  }
  File_src_contracts_dbt-project_DbtProjectImport_v1_ts_6fc4ed86: {
    label: "DbtProjectImport.v1.ts"
  }
  File_racts_dbt-project_DbtSelectedModelAnalysis_v1_ts_79ea202f: {
    label: "DbtSelectedModelAnalysis.v1.ts"
  }
  File_ntracts_dbt-project_DbtYamlDescriptionEdit_v1_ts_b37517e4: {
    label: "DbtYamlDescriptionEdit.v1.ts"
  }
  File_racts_dbt-project_GraphDbtModelCompilation_v1_ts_487e91dd: {
    label: "GraphDbtModelCompilation.v1.ts"
  }
  File_oject_GraphDbtWorkspaceArtifactPublication_v1_ts_85bce14b: {
    label: "GraphDbtWorkspaceArtifactPublication.v1.ts"
  }
  File_src_contracts_dbt-project_index_ts_618c6178: {
    label: "index.ts"
  }
}
`;case`contractsSource_dir_src_contracts_engine_07455cf8`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8: {
  label: "engine/ — 10 files"

  File_src_contracts_engine_ExecutionSemantics_v1_ts_e95395db: {
    label: "ExecutionSemantics.v1.ts"
  }
  File_src_contracts_engine_IOutboxStorage_v1_ts_2045dbdc: {
    label: "IOutboxStorage.v1.ts"
  }
  File_src_contracts_engine_IWorkflowEngine_v1_ts_8df9d113: {
    label: "IWorkflowEngine.v1.ts"
  }
  File_src_contracts_engine_RunControlBoundary_v1_ts_3d1ff6a4: {
    label: "RunControlBoundary.v1.ts"
  }
  File_src_contracts_engine_RunEvents_v1_ts_ad473abd: {
    label: "RunEvents.v1.ts"
  }
  File_src_contracts_engine_RunExecutionContext_v1_ts_9066db84: {
    label: "RunExecutionContext.v1.ts"
  }
  File_src_contracts_engine_RunExecutionPolicy_v1_ts_4528af4b: {
    label: "RunExecutionPolicy.v1.ts"
  }
  File_src_contracts_engine_RunStateVocabulary_v1_ts_52118c95: {
    label: "RunStateVocabulary.v1.ts"
  }
  File_src_contracts_engine_SignalSemantics_v1_ts_b9cf4c3d: {
    label: "SignalSemantics.v1.ts"
  }
  File_src_contracts_engine_StartRunBoundary_v1_ts_be812364: {
    label: "StartRunBoundary.v1.ts"
  }
}
`;case`engineSource_dir_src_contracts_engine_07455cf8`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_engine_07455cf8: {
  label: "engine/ — 6 files"

  File_src_contracts_engine_ExecutionPlan_v1_ts_443e23bd: {
    label: "ExecutionPlan.v1.ts"
  }
  File_src_contracts_engine_ExecutionSemantics_v1_ts_e95395db: {
    label: "ExecutionSemantics.v1.ts"
  }
  File_src_contracts_engine_index_ts_9ef8347a: {
    label: "index.ts"
  }
  File_src_contracts_engine_IProvider_v1_ts_1e849a42: {
    label: "IProvider.v1.ts"
  }
  File_src_contracts_engine_IRunEnrichmentService_v1_ts_20da19e6: {
    label: "IRunEnrichmentService.v1.ts"
  }
  File_src_contracts_engine_RunEvents_v1_ts_ad473abd: {
    label: "RunEvents.v1.ts"
  }
}
`;case`engineSource_dir_src_contracts_errors_16f18706`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_errors_16f18706: {
  label: "errors/ — 6 files"

  File_src_contracts_errors_adapterErrors_ts_d74418c6: {
    label: "adapterErrors.ts"
  }
  File_src_contracts_errors_baseError_ts_4fa5f1fb: {
    label: "baseError.ts"
  }
  File_src_contracts_errors_errorCodes_ts_7368bf0f: {
    label: "errorCodes.ts"
  }
  File_src_contracts_errors_errorMessages_ts_c34688f8: {
    label: "errorMessages.ts"
  }
  File_src_contracts_errors_planErrors_ts_675f5539: {
    label: "planErrors.ts"
  }
  File_src_contracts_errors_runErrors_ts_d90ab0bf: {
    label: "runErrors.ts"
  }
}
`;case`contractsSource_dir_src_contracts_planner_9acb1d0e`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_planner_9acb1d0e: {
  label: "planner/ — 49 files"

  File_ts_planner_CanvasAuthoringAuthorityBinding_v1_ts_34f8515e: {
    label: "CanvasAuthoringAuthorityBinding.v1.ts"
  }
  File_acts_planner_CustomPolicyNamespaceRegistry_v1_ts_1b9eeaac: {
    label: "CustomPolicyNamespaceRegistry.v1.ts"
  }
  File_ontracts_planner_DbtProjectGraphProjection_v1_ts_e13a21bf: {
    label: "DbtProjectGraphProjection.v1.ts"
  }
  File_src_contracts_planner_DbtStepSelector_v1_ts_7d7002b8: {
    label: "DbtStepSelector.v1.ts"
  }
  File_ts_planner_DvtSubstraitCapabilityAdmission_v1_ts_77a6510d: {
    label: "DvtSubstraitCapabilityAdmission.v1.ts"
  }
  File_acts_planner_DvtSubstraitCapabilityCatalog_v1_ts_a4b494d5: {
    label: "DvtSubstraitCapabilityCatalog.v1.ts"
  }
  File_lanner_DvtSubstraitCapabilityCatalogSchema_v1_ts_d0469281: {
    label: "DvtSubstraitCapabilityCatalogSchema.v1.ts"
  }
  File_cts_planner_DvtSubstraitCapabilityIdentity_v1_ts_5d49c2b9: {
    label: "DvtSubstraitCapabilityIdentity.v1.ts"
  }
  File__planner_DvtSubstraitFieldBindingHierarchy_v1_ts_0e916c01: {
    label: "DvtSubstraitFieldBindingHierarchy.v1.ts"
  }
  File_c_contracts_planner_DvtSubstraitPlanBinary_v1_ts_85f88bb4: {
    label: "DvtSubstraitPlanBinary.v1.ts"
  }
  File_contracts_planner_DvtSubstraitProductNeeds_v1_ts_551e060e: {
    label: "DvtSubstraitProductNeeds.v1.ts"
  }
  File_src_contracts_planner_DvtSubstraitProfile_v1_ts_141370ae: {
    label: "DvtSubstraitProfile.v1.ts"
  }
  File_racts_planner_DvtSubstraitSemanticDocument_v1_ts_df8aad59: {
    label: "DvtSubstraitSemanticDocument.v1.ts"
  }
  File_cts_planner_DvtSubstraitStandardCandidates_v1_ts_f8a454cc: {
    label: "DvtSubstraitStandardCandidates.v1.ts"
  }
  File__planner_DvtSubstraitSupportedCapabilities_v1_ts_e641c9c4: {
    label: "DvtSubstraitSupportedCapabilities.v1.ts"
  }
  File_cts_planner_DvtTransformAuthoringAuthority_v1_ts_e6b01faa: {
    label: "DvtTransformAuthoringAuthority.v1.ts"
  }
  File_src_contracts_planner_ExecutableSubgraph_v1_ts_4a5eab48: {
    label: "ExecutableSubgraph.v1.ts"
  }
  File_racts_planner_ExecutionBindingVerification_v1_ts_8aafc9c0: {
    label: "ExecutionBindingVerification.v1.ts"
  }
  File_src_contracts_planner_ExecutionPlan_v1_ts_7e720377: {
    label: "ExecutionPlan.v1.ts"
  }
  File_src_contracts_planner_ExecutionSelection_v1_ts_779491c4: {
    label: "ExecutionSelection.v1.ts"
  }
  File_cts_planner_HttpJsonArtifactStepTypeConfig_v1_ts_7b5d5e33: {
    label: "HttpJsonArtifactStepTypeConfig.v1.ts"
  }
  File_src_contracts_planner_IExecutionPlanner_v1_ts_3af4dc5c: {
    label: "IExecutionPlanner.v1.ts"
  }
  File_src_contracts_planner_index_ts_543fffd2: {
    label: "index.ts"
  }
  File_tracts_planner_ObjectFilePostgresDbtBridge_v1_ts_9b76ffb0: {
    label: "ObjectFilePostgresDbtBridge.v1.ts"
  }
  File_planner_ObjectFileToPostgresStepTypeConfig_v1_ts_2b1d841b: {
    label: "ObjectFileToPostgresStepTypeConfig.v1.ts"
  }
  File_src_contracts_planner_PlanAdmission_v1_ts_d5162a34: {
    label: "PlanAdmission.v1.ts"
  }
  File_src_contracts_planner_PlanAdmissionFinding_v1_ts_7ca16d19: {
    label: "PlanAdmissionFinding.v1.ts"
  }
  File_ntracts_planner_PlanAdmissionLink_v1_schema_json_d55801c7: {
    label: "PlanAdmissionLink.v1.schema.json"
  }
  File_src_contracts_planner_PlanAdmissionLink_v1_ts_65569f6a: {
    label: "PlanAdmissionLink.v1.ts"
  }
  File_ntracts_planner_PlanCompileStepTypeConfigs_v1_ts_d76b4781: {
    label: "PlanCompileStepTypeConfigs.v1.ts"
  }
  File_s_planner_PlanExecutabilityRecord_v1_schema_json_a003b340: {
    label: "PlanExecutabilityRecord.v1.schema.json"
  }
  File__contracts_planner_PlanExecutabilityRecord_v1_ts_53df81b4: {
    label: "PlanExecutabilityRecord.v1.ts"
  }
  File_tracts_planner_PlanExecutabilityValidation_v1_ts_6af3aa76: {
    label: "PlanExecutabilityValidation.v1.ts"
  }
  File_rc_contracts_planner_PlanExecutionDecision_v1_ts_da796ee8: {
    label: "PlanExecutionDecision.v1.ts"
  }
  File_racts_planner_PlannerInputEnvelopeV1_schema_json_3947f386: {
    label: "PlannerInputEnvelopeV1.schema.json"
  }
  File_cts_planner_PlannerPolicyClassSet_v2_schema_json_9da70e33: {
    label: "PlannerPolicyClassSet.v2.schema.json"
  }
  File__contracts_planner_PlannerPolicyVocabulary_v2_ts_242d4391: {
    label: "PlannerPolicyVocabulary.v2.ts"
  }
  File_rc_contracts_planner_PlanPreviewProvenance_v1_ts_c1c853fe: {
    label: "PlanPreviewProvenance.v1.ts"
  }
  File_src_contracts_planner_PlanRecord_v1_schema_json_8b2f0343: {
    label: "PlanRecord.v1.schema.json"
  }
  File_src_contracts_planner_PlanRecord_v1_ts_cbbbbdff: {
    label: "PlanRecord.v1.ts"
  }
  File_src_contracts_planner_PlanVersion_v1_ts_b7c6f93c: {
    label: "PlanVersion.v1.ts"
  }
  File_src_contracts_planner_PolicyMappingTable_v1_ts_d1564d66: {
    label: "PolicyMappingTable.v1.ts"
  }
  File_src_contracts_planner_StepKindRegistry_v1_ts_e03b305f: {
    label: "StepKindRegistry.v1.ts"
  }
  File_racts_planner_StoredPlanArtifactValidation_v1_ts_89ac1d09: {
    label: "StoredPlanArtifactValidation.v1.ts"
  }
  File_ontracts_planner_TransformationFlowPreview_v1_ts_394c2035: {
    label: "TransformationFlowPreview.v1.ts"
  }
  File_cts_planner_WorkspaceGraphAuthoringCommand_v1_ts_22caaf49: {
    label: "WorkspaceGraphAuthoringCommand.v1.ts"
  }
  File_racts_planner_WorkspaceGraphAuthoringDraft_v1_ts_170e2af9: {
    label: "WorkspaceGraphAuthoringDraft.v1.ts"
  }
  File_anner_WorkspaceGraphAuthoringEdgeExecution_v1_ts_dc5487e4: {
    label: "WorkspaceGraphAuthoringEdgeExecution.v1.ts"
  }
  File_src_contracts_planner_WorkspaceGraphDraft_v1_ts_74df0b67: {
    label: "WorkspaceGraphDraft.v1.ts"
  }
}
`;case`contractsSource_dir_src_contracts_source-import_46584ffc`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_source-import_46584ffc: {
  label: "source-import/ — 6 files"

  File_contracts_source-import_ConnectedSourceRef_v1_ts_c4110f1a: {
    label: "ConnectedSourceRef.v1.ts"
  }
  File_src_contracts_source-import_index_ts_fe785a39: {
    label: "index.ts"
  }
  File_c_contracts_source-import_SourceDataSample_v1_ts_666dd7f4: {
    label: "SourceDataSample.v1.ts"
  }
  File_racts_source-import_SourceImportOperations_v1_ts_3344542d: {
    label: "SourceImportOperations.v1.ts"
  }
  File_racts_source-import_SourceImportOperations_v2_ts_0bada1af: {
    label: "SourceImportOperations.v2.ts"
  }
  File_ontracts_source-import_SourceObjectCatalog_v1_ts_3fb2de92: {
    label: "SourceObjectCatalog.v1.ts"
  }
}
`;case`contractsSource_dir_src_contracts_workspace_cd294792`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_contracts_63d3060bDir_src_contracts_workspace_cd294792: {
  label: "workspace/ — 1 files"

  File_src_contracts_workspace_ProjectWorkspace_v1_ts_87e1dfcf: {
    label: "ProjectWorkspace.v1.ts"
  }
}
`;case`engineSource_dir_src_core_b256a6ae`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_core_b256a6ae: {
  label: "core/ — 10 files"

  Dir_src_core_lifecycle_4e42014f: {
    label: "lifecycle/ — 3 files"
  }
  File_src_core_buildWorkflowEngineFacade_ts_f52716f9: {
    label: "buildWorkflowEngineFacade.ts"
  }
  File_src_core_idempotency_ts_47be40eb: {
    label: "idempotency.ts"
  }
  File_src_core_index_ts_55626df4: {
    label: "index.ts"
  }
  File_src_core_SnapshotProjector_ts_a7d85114: {
    label: "SnapshotProjector.ts"
  }
  File_src_core_types_ts_179d8ca6: {
    label: "types.ts"
  }
  File_src_core_WorkflowEngine_ts_f3c1e650: {
    label: "WorkflowEngine.ts"
  }
  File_src_core_WorkflowEngineCoreService_ts_7e398291: {
    label: "WorkflowEngineCoreService.ts"
  }
}
`;case`traceabilitySource_dir_src_core_b256a6ae`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_core_b256a6ae: {
  label: "core/ — 5 files"

  File_src_core_header-parser_ts_e90f5c55: {
    label: "header-parser.ts"
  }
  File_src_core_issue-baseline_ts_dd4d3e42: {
    label: "issue-baseline.ts"
  }
  File_src_core_manifest-json_ts_c84d974c: {
    label: "manifest-json.ts"
  }
  File_src_core_manifest_ts_630abf9a: {
    label: "manifest.ts"
  }
  File_src_core_validator_ts_e4510880: {
    label: "validator.ts"
  }
}
`;case`engineSource_dir_src_core_lifecycle_4e42014f`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_core_b256a6aeDir_src_core_lifecycle_4e42014f: {
  label: "lifecycle/ — 3 files"

  File_src_core_lifecycle_coreDomainConstants_ts_397689dd: {
    label: "coreDomainConstants.ts"
  }
  File_src_core_lifecycle_coreRuntime_ts_3fb6d715: {
    label: "coreRuntime.ts"
  }
  File_src_core_lifecycle_StartRunTraceContext_ts_1bc48a58: {
    label: "StartRunTraceContext.ts"
  }
}
`;case`apiSource_dir_src_db_a9f703b6`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_db_a9f703b6: {
  label: "db/ — 1 files"

  File_src_db_pool_ts_1b4a99d5: {
    label: "pool.ts"
  }
}
`;case`outboxWorkerSource_dir_src_db_a9f703b6`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_db_a9f703b6: {
  label: "db/ — 1 files"

  File_src_db_pool_ts_1b4a99d5: {
    label: "pool.ts"
  }
}
`;case`apiSource_dir_src_domain_7ea5567e`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_domain_7ea5567e: {
  label: "domain/ — 1 files"

  Dir_src_domain_auth_69640779: {
    label: "auth/ — 1 files"
  }
}
`;case`engineSource_dir_src_domain_7ea5567e`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_domain_7ea5567e: {
  label: "domain/ — 7 files"

  File_src_domain_IRunCommandService_ts_ebcd98e2: {
    label: "IRunCommandService.ts"
  }
  File_src_domain_IRunControlService_ts_47d9cb15: {
    label: "IRunControlService.ts"
  }
  File_src_domain_IRunHealthService_ts_bf00132b: {
    label: "IRunHealthService.ts"
  }
  File_src_domain_IRunRecoveryService_ts_919d40ec: {
    label: "IRunRecoveryService.ts"
  }
  File_src_domain_IRunSignalService_ts_07eb4ed8: {
    label: "IRunSignalService.ts"
  }
  File_src_domain_IRunStatusQueryService_ts_b14f83c9: {
    label: "IRunStatusQueryService.ts"
  }
  File_src_domain_startRunIntentPolicy_ts_f73a6fe7: {
    label: "startRunIntentPolicy.ts"
  }
}
`;case`plannerSource_dir_src_domain_7ea5567e`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567e: {
  label: "domain/ — 18 files"

  Dir_src_domain_graph_cf5690b8: {
    label: "graph/ — 3 files"
  }
  Dir_src_domain_stepFactory_f09a8fc8: {
    label: "stepFactory/ — 2 files"
  }
  File_src_domain_errors_ts_24f92960: {
    label: "errors.ts"
  }
  File_src_domain_hashing_ts_4ff20961: {
    label: "hashing.ts"
  }
  File_src_domain_InputEnvelopeValidator_ts_d5837816: {
    label: "InputEnvelopeValidator.ts"
  }
  File_src_domain_limits_ts_f1894b29: {
    label: "limits.ts"
  }
  File_src_domain_manifest_ts_b684950d: {
    label: "manifest.ts"
  }
  File_src_domain_metrics_ts_52bfda3a: {
    label: "metrics.ts"
  }
  File_src_domain_NodeSelector_ts_ad7075f6: {
    label: "NodeSelector.ts"
  }
  File_src_domain_PlanAssembler_ts_968cdda3: {
    label: "PlanAssembler.ts"
  }
  File_src_domain_PlanExecutionDecisionProjector_ts_66b97391: {
    label: "PlanExecutionDecisionProjector.ts"
  }
  File_src_domain_Planner_ts_60a526f5: {
    label: "Planner.ts"
  }
  File_src_domain_policies_ts_16e68f7c: {
    label: "policies.ts"
  }
  File_src_domain_sorting_ts_45462632: {
    label: "sorting.ts"
  }
  File_src_domain_types_ts_4eb94e03: {
    label: "types.ts"
  }
}
`;case`apiSource_dir_src_domain_auth_69640779`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_auth_69640779: {
  label: "auth/ — 1 files"

  File_src_domain_auth_types_ts_4d1b3e7c: {
    label: "types.ts"
  }
}
`;case`plannerSource_dir_src_domain_graph_cf5690b8`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_graph_cf5690b8: {
  label: "graph/ — 3 files"

  File_src_domain_graph_Depth_ts_d7e3a5ad: {
    label: "Depth.ts"
  }
  File_src_domain_graph_GraphBuilder_ts_09d1fc17: {
    label: "GraphBuilder.ts"
  }
  File_src_domain_graph_TopoSort_ts_5319bdef: {
    label: "TopoSort.ts"
  }
}
`;case`plannerSource_dir_src_domain_stepFactory_f09a8fc8`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_domain_7ea5567eDir_src_domain_stepFactory_f09a8fc8: {
  label: "stepFactory/ — 2 files"

  File_src_domain_stepFactory_dbtStepFactory_ts_74967292: {
    label: "dbtStepFactory.ts"
  }
  File_src_domain_stepFactory_StepFactory_ts_117e8c5b: {
    label: "StepFactory.ts"
  }
}
`;case`contractsSource_dir_src_engine_c4c7e6bb`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_engine_c4c7e6bb: {
  label: "engine/ — 1 files"

  File_src_engine_IRunSnapshotStalenessQuery_v1_ts_534f2be1: {
    label: "IRunSnapshotStalenessQuery.v1.ts"
  }
}
`;case`apiSource_dir_src_entrypoints_7949178c`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178c: {
  label: "entrypoints/ — 96 files"

  Dir_src_entrypoints_http_4020aa6d: {
    label: "http/ — 96 files"
  }
}
`;case`apiSource_dir_src_entrypoints_http_4020aa6d`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_entrypoints_7949178cDir_src_entrypoints_http_4020aa6d: {
  label: "http/ — 96 files"

  File_src_entrypoints_http_adminRoutes_ts_b77b5643: {
    label: "adminRoutes.ts"
  }
  File_src_entrypoints_http_authHeaders_ts_bcec4e29: {
    label: "authHeaders.ts"
  }
  File_entrypoints_http_authorizeAdminExecutionScope_ts_62b8f4af: {
    label: "authorizeAdminExecutionScope.ts"
  }
  File_src_entrypoints_http_authorizeExecutionScope_ts_3c06d2e5: {
    label: "authorizeExecutionScope.ts"
  }
  File_src_entrypoints_http_cancelRunRoute_ts_e798e8af: {
    label: "cancelRunRoute.ts"
  }
  File_src_entrypoints_http_cancelRunRouteParser_ts_da1a2721: {
    label: "cancelRunRouteParser.ts"
  }
  File_src_entrypoints_http_compilePlanRoute_ts_3629dc4e: {
    label: "compilePlanRoute.ts"
  }
  File_trypoints_http_compilePlanRouteResponseMapper_ts_75ea3e23: {
    label: "compilePlanRouteResponseMapper.ts"
  }
  File__entrypoints_http_costAttributionSummaryRoute_ts_d8ea6352: {
    label: "costAttributionSummaryRoute.ts"
  }
  File_p_costAttributionSummaryRouteParser_constants_ts_f76b6306: {
    label: "costAttributionSummaryRouteParser.constants.ts"
  }
  File_points_http_costAttributionSummaryRouteParser_ts_5d1da02f: {
    label: "costAttributionSummaryRouteParser.ts"
  }
  File__entrypoints_http_dbtDependencyEditRouteGroup_ts_781516af: {
    label: "dbtDependencyEditRouteGroup.ts"
  }
  File_src_entrypoints_http_dbtDependencyEditRoutes_ts_ea46bbd6: {
    label: "dbtDependencyEditRoutes.ts"
  }
  File_ypoints_http_dbtProjectFileRouteAuthorization_ts_893cd321: {
    label: "dbtProjectFileRouteAuthorization.ts"
  }
  File_rc_entrypoints_http_dbtProjectGraphRouteGroup_ts_127f2f95: {
    label: "dbtProjectGraphRouteGroup.ts"
  }
  File_src_entrypoints_http_dbtProjectGraphRoutes_ts_75dc6f09: {
    label: "dbtProjectGraphRoutes.ts"
  }
  File_c_entrypoints_http_dbtProjectImportRouteGroup_ts_a4fa13e5: {
    label: "dbtProjectImportRouteGroup.ts"
  }
  File_src_entrypoints_http_dbtProjectImportRoutes_ts_a80c6c15: {
    label: "dbtProjectImportRoutes.ts"
  }
  File_oints_http_dbtSelectedModelAnalysisRouteGroup_ts_b360230c: {
    label: "dbtSelectedModelAnalysisRouteGroup.ts"
  }
  File_trypoints_http_dbtSelectedModelAnalysisRoutes_ts_73b2d965: {
    label: "dbtSelectedModelAnalysisRoutes.ts"
  }
  File_ypoints_http_dbtYamlDescriptionEditRouteGroup_ts_a7a0780d: {
    label: "dbtYamlDescriptionEditRouteGroup.ts"
  }
  File_entrypoints_http_dbtYamlDescriptionEditRoutes_ts_2f9f3ffa: {
    label: "dbtYamlDescriptionEditRoutes.ts"
  }
  File_src_entrypoints_http_executePlanRouteFacade_ts_4007a595: {
    label: "executePlanRouteFacade.ts"
  }
  File_src_entrypoints_http_extractBearerToken_ts_815e284a: {
    label: "extractBearerToken.ts"
  }
  File_src_entrypoints_http_getRunEventsRoute_ts_ca52c8ad: {
    label: "getRunEventsRoute.ts"
  }
  File_points_http_getRunEventsRouteParser_constants_ts_79c91a4d: {
    label: "getRunEventsRouteParser.constants.ts"
  }
  File_src_entrypoints_http_getRunEventsRouteParser_ts_6136dd5c: {
    label: "getRunEventsRouteParser.ts"
  }
  File_src_entrypoints_http_getRunRoute_ts_b23aa56f: {
    label: "getRunRoute.ts"
  }
  File__entrypoints_http_getRunRouteParser_constants_ts_5dcd761a: {
    label: "getRunRouteParser.constants.ts"
  }
  File_src_entrypoints_http_getRunRouteParser_ts_9b3af7c1: {
    label: "getRunRouteParser.ts"
  }
  File_oints_http_graphDbtModelCompilationRouteGroup_ts_879cebef: {
    label: "graphDbtModelCompilationRouteGroup.ts"
  }
  File_trypoints_http_graphDbtModelCompilationRoutes_ts_e5b2c5ca: {
    label: "graphDbtModelCompilationRoutes.ts"
  }
  File_raphDbtWorkspaceArtifactPublicationRouteGroup_ts_b3b5ff77: {
    label: "graphDbtWorkspaceArtifactPublicationRouteGroup.ts"
  }
  File_tp_graphDbtWorkspaceArtifactPublicationRoutes_ts_5c60a435: {
    label: "graphDbtWorkspaceArtifactPublicationRoutes.ts"
  }
  File_src_entrypoints_http_httpBearerAuthentication_ts_da474102: {
    label: "httpBearerAuthentication.ts"
  }
  File_rc_entrypoints_http_httpDomainErrorClassifier_ts_2e2e0025: {
    label: "httpDomainErrorClassifier.ts"
  }
  File_src_entrypoints_http_httpErrorContract_ts_053db753: {
    label: "httpErrorContract.ts"
  }
  File_src_entrypoints_http_httpErrorDetails_ts_578429a1: {
    label: "httpErrorDetails.ts"
  }
  File_src_entrypoints_http_httpErrorMapper_ts_0e765c16: {
    label: "httpErrorMapper.ts"
  }
  File_src_entrypoints_http_httpErrorReasonCatalog_ts_694f9d77: {
    label: "httpErrorReasonCatalog.ts"
  }
  File_src_entrypoints_http_httpErrorTranslation_ts_4466337a: {
    label: "httpErrorTranslation.ts"
  }
  File_src_entrypoints_http_importPlanRoute_ts_2da925cd: {
    label: "importPlanRoute.ts"
  }
  File_src_entrypoints_http_importPlanRouteParser_ts_bc3b1514: {
    label: "importPlanRouteParser.ts"
  }
  File_ntrypoints_http_importPlanRouteResponseMapper_ts_520bafa1: {
    label: "importPlanRouteResponseMapper.ts"
  }
  File_src_entrypoints_http_listRunsRoute_ts_6132a68e: {
    label: "listRunsRoute.ts"
  }
  File_ntrypoints_http_listRunsRouteParser_constants_ts_a00233df: {
    label: "listRunsRouteParser.constants.ts"
  }
  File_src_entrypoints_http_listRunsRouteParser_ts_ed9c88c8: {
    label: "listRunsRouteParser.ts"
  }
  File__entrypoints_http_planCompileRouteInputParser_ts_4b43b204: {
    label: "planCompileRouteInputParser.ts"
  }
  File_src_entrypoints_http_planRouteBodyParser_ts_5b548f44: {
    label: "planRouteBodyParser.ts"
  }
  File_trypoints_http_planRoutePlannerEnvelopeParser_ts_3ca0bd1f: {
    label: "planRoutePlannerEnvelopeParser.ts"
  }
  File_src_entrypoints_http_planRoutePlanRefParser_ts_3481b58e: {
    label: "planRoutePlanRefParser.ts"
  }
  File_rc_entrypoints_http_planRoutePlanSourcePolicy_ts_d95c7a90: {
    label: "planRoutePlanSourcePolicy.ts"
  }
  File_src_entrypoints_http_planRouteRequestResolver_ts_c31956e9: {
    label: "planRouteRequestResolver.ts"
  }
  File_ts_http_planRouteRunExecutionContextRefParser_ts_49b38d60: {
    label: "planRouteRunExecutionContextRefParser.ts"
  }
  File_src_entrypoints_http_planRouteScope_ts_ca7da9c8: {
    label: "planRouteScope.ts"
  }
  File_src_entrypoints_http_planRouteScopeParser_ts_294409b0: {
    label: "planRouteScopeParser.ts"
  }
  File_src_entrypoints_http_planRouteSelectionParser_ts_456f110c: {
    label: "planRouteSelectionParser.ts"
  }
  File_entrypoints_http_planRouteTargetAdapterParser_ts_b92ae219: {
    label: "planRouteTargetAdapterParser.ts"
  }
  File_src_entrypoints_http_previewPlanRoute_ts_31ea1835: {
    label: "previewPlanRoute.ts"
  }
  File_src_entrypoints_http_previewPlanRouteParser_ts_369b01c6: {
    label: "previewPlanRouteParser.ts"
  }
  File_trypoints_http_previewPlanRouteResponseMapper_ts_798e1db7: {
    label: "previewPlanRouteResponseMapper.ts"
  }
  File_src_entrypoints_http_projectOnboardingRoutes_ts_1b8ffd62: {
    label: "projectOnboardingRoutes.ts"
  }
  File_rypoints_http_protectedRuntimeAdminRouteGroup_ts_9d004377: {
    label: "protectedRuntimeAdminRouteGroup.ts"
  }
  File_c_entrypoints_http_protectedRuntimePlanRoutes_ts_0f127bfb: {
    label: "protectedRuntimePlanRoutes.ts"
  }
  File_points_http_protectedRuntimeRouteDependencies_ts_99919e5d: {
    label: "protectedRuntimeRouteDependencies.ts"
  }
  File_rc_entrypoints_http_protectedRuntimeRunRoutes_ts_3c14f06c: {
    label: "protectedRuntimeRunRoutes.ts"
  }
  File_ntrypoints_http_protectedRuntimeSessionRoutes_ts_fc4c47ab: {
    label: "protectedRuntimeSessionRoutes.ts"
  }
  File_src_entrypoints_http_recoverRunIdentity_ts_2f60b313: {
    label: "recoverRunIdentity.ts"
  }
  File_src_entrypoints_http_recoverRunRoute_ts_f2a307b4: {
    label: "recoverRunRoute.ts"
  }
  File_src_entrypoints_http_recoverRunRouteParser_ts_0f6c6e66: {
    label: "recoverRunRouteParser.ts"
  }
  File_trypoints_http_registerProtectedRuntimeRoutes_ts_138c2c00: {
    label: "registerProtectedRuntimeRoutes.ts"
  }
  File_src_entrypoints_http_routeParseIssue_ts_d37b9522: {
    label: "routeParseIssue.ts"
  }
  File_src_entrypoints_http_routeParserPrimitives_ts_f900026f: {
    label: "routeParserPrimitives.ts"
  }
  File_src_entrypoints_http_runCommandFieldParsers_ts_97552412: {
    label: "runCommandFieldParsers.ts"
  }
  File_rc_entrypoints_http_runCommandRoute_constants_ts_b295d542: {
    label: "runCommandRoute.constants.ts"
  }
  File_src_entrypoints_http_runCommandRouteExecutor_ts_73dfd228: {
    label: "runCommandRouteExecutor.ts"
  }
  File_src_entrypoints_http_runtimeRoutes_constants_ts_e0a8ced9: {
    label: "runtimeRoutes.constants.ts"
  }
  File_src_entrypoints_http_sessionRoute_ts_44a0f743: {
    label: "sessionRoute.ts"
  }
  File_src_entrypoints_http_signalRunRoute_ts_7c1a177e: {
    label: "signalRunRoute.ts"
  }
  File_src_entrypoints_http_signalRunRouteParser_ts_27888cce: {
    label: "signalRunRouteParser.ts"
  }
  File_src_entrypoints_http_startRunIdentity_ts_8358e0d8: {
    label: "startRunIdentity.ts"
  }
  File_src_entrypoints_http_startRunRoute_ts_c124a61d: {
    label: "startRunRoute.ts"
  }
  File__entrypoints_http_startRunRouteCommandBuilder_ts_86fcb8c1: {
    label: "startRunRouteCommandBuilder.ts"
  }
  File_src_entrypoints_http_startRunRouteParser_ts_fe533fbd: {
    label: "startRunRouteParser.ts"
  }
  File_ypoints_http_startRunRouteTargetAdapterParser_ts_4fed2538: {
    label: "startRunRouteTargetAdapterParser.ts"
  }
  File_rypoints_http_warehouseSourceImportRouteGroup_ts_c0e2929d: {
    label: "warehouseSourceImportRouteGroup.ts"
  }
  File__entrypoints_http_warehouseSourceImportRoutes_ts_6dbef753: {
    label: "warehouseSourceImportRoutes.ts"
  }
  File_src_entrypoints_http_workspaceContextRoute_ts_bb5400d2: {
    label: "workspaceContextRoute.ts"
  }
  File_trypoints_http_workspaceDiffChangesRouteGroup_ts_ef1ada20: {
    label: "workspaceDiffChangesRouteGroup.ts"
  }
  File_c_entrypoints_http_workspaceDiffChangesRoutes_ts_a53dcf6e: {
    label: "workspaceDiffChangesRoutes.ts"
  }
  File_c_entrypoints_http_workspaceFileHistoryRoutes_ts_39c1a014: {
    label: "workspaceFileHistoryRoutes.ts"
  }
  File_src_entrypoints_http_workspaceFilesRouteGroup_ts_4a271401: {
    label: "workspaceFilesRouteGroup.ts"
  }
  File_src_entrypoints_http_workspaceFilesRoutes_ts_2f00a4ed: {
    label: "workspaceFilesRoutes.ts"
  }
  File_rc_entrypoints_http_workspaceGraphDraftRoutes_ts_cff301cb: {
    label: "workspaceGraphDraftRoutes.ts"
  }
  File_ypoints_http_workspacePluginCatalogRouteGroup_ts_7d923c3d: {
    label: "workspacePluginCatalogRouteGroup.ts"
  }
  File_entrypoints_http_workspacePluginCatalogRoutes_ts_23ccde3c: {
    label: "workspacePluginCatalogRoutes.ts"
  }
}
`;case`outboxWorkerSource_dir_src_host_16cb5924`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_host_16cb5924: {
  label: "host/ — 1 files"

  File_src_host_runOutboxWorkerHost_ts_d8877e3e: {
    label: "runOutboxWorkerHost.ts"
  }
}
`;case`temporalWorkerSource_dir_src_host_16cb5924`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2Dir_src_host_16cb5924: {
  label: "host/ — 1 files"

  File_src_host_runTemporalWorkerHost_ts_50cefac9: {
    label: "runTemporalWorkerHost.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_ab2b2240`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240: {
  label: "infrastructure/ — 73 files"

  Dir_src_infrastructure_admissionTelemetry_43f2f3ca: {
    label: "admissionTelemetry/ — 4 files"
  }
  Dir_src_infrastructure_audit_b2b533d6: {
    label: "audit/ — 2 files"
  }
  Dir_src_infrastructure_auth_f40f80b0: {
    label: "auth/ — 6 files"
  }
  Dir_src_infrastructure_backpressure_d0eb1454: {
    label: "backpressure/ — 6 files"
  }
  Dir_src_infrastructure_canvasAuthoringAuthority_d8d8da7f: {
    label: "canvasAuthoringAuthority/ — 1 files"
  }
  Dir_src_infrastructure_dbt_2d1f7ab0: {
    label: "dbt/ — 25 files"
  }
  Dir_src_infrastructure_dbtDependencyEdit_cfd51b9b: {
    label: "dbtDependencyEdit/ — 1 files"
  }
  Dir_src_infrastructure_dbtYamlDescriptionEdit_b58d0b60: {
    label: "dbtYamlDescriptionEdit/ — 2 files"
  }
  Dir_src_infrastructure_executionCapacity_f8227bb2: {
    label: "executionCapacity/ — 1 files"
  }
  Dir_src_infrastructure_runControl_89abf458: {
    label: "runControl/ — 1 files"
  }
  Dir_src_infrastructure_startRun_8abe9bc1: {
    label: "startRun/ — 3 files"
  }
  Dir_src_infrastructure_telemetry_d57d97d8: {
    label: "telemetry/ — 5 files"
  }
  Dir_src_infrastructure_warehouseSourceImport_69d1bf05: {
    label: "warehouseSourceImport/ — 4 files"
  }
  Dir_src_infrastructure_workspaceDiffChanges_f3467e97: {
    label: "workspaceDiffChanges/ — 1 files"
  }
  Dir_src_infrastructure_workspaceFiles_8e28430c: {
    label: "workspaceFiles/ — 8 files"
  }
  Dir_src_infrastructure_workspaceGraphDraft_be302653: {
    label: "workspaceGraphDraft/ — 2 files"
  }
  Dir_src_infrastructure_workspacePlugins_2763ba5b: {
    label: "workspacePlugins/ — 1 files"
  }
}
`;case`apiSource_dir_src_infrastructure_admissionTelemetry_43f2f3ca`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_admissionTelemetry_43f2f3ca: {
  label: "admissionTelemetry/ — 4 files"

  File__admissionTelemetry_admissionTelemetryMetrics_ts_cc2933d3: {
    label: "admissionTelemetryMetrics.ts"
  }
  File_sionTelemetry_ObservabilityAdmissionTelemetry_ts_3bfc0d91: {
    label: "ObservabilityAdmissionTelemetry.ts"
  }
  File_ry_ObservabilityBackpressureCapacityTelemetry_ts_888e2c38: {
    label: "ObservabilityBackpressureCapacityTelemetry.ts"
  }
  File_rc_infrastructure_admissionTelemetry_safeWarn_ts_5238df16: {
    label: "safeWarn.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_audit_b2b533d6`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_audit_b2b533d6: {
  label: "audit/ — 2 files"

  File_infrastructure_audit_PostgresAuthAuditAdapter_ts_f0e62f4b: {
    label: "PostgresAuthAuditAdapter.ts"
  }
  File_rc_infrastructure_audit_structuredAuditLogger_ts_2aaa7ea8: {
    label: "structuredAuditLogger.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_auth_f40f80b0`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_auth_f40f80b0: {
  label: "auth/ — 6 files"

  File_astructure_auth_embeddedAccessDecisionService_ts_48ded3d9: {
    label: "embeddedAccessDecisionService.ts"
  }
  File_ructure_auth_embeddedPrincipalGrantRepository_ts_cbe8386e: {
    label: "embeddedPrincipalGrantRepository.ts"
  }
  File_ture_auth_embeddedProjectOnboardingRepository_ts_03f7e5d7: {
    label: "embeddedProjectOnboardingRepository.ts"
  }
  File_astructure_auth_embeddedWorkspaceContextQuery_ts_afa77a09: {
    label: "embeddedWorkspaceContextQuery.ts"
  }
  File_src_infrastructure_auth_jwksJwtVerifier_ts_d612e0d6: {
    label: "jwksJwtVerifier.ts"
  }
  File_src_infrastructure_auth_oidcAuthenticator_ts_e0bc7191: {
    label: "oidcAuthenticator.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_backpressure_d0eb1454`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_backpressure_d0eb1454: {
  label: "backpressure/ — 6 files"

  File_tructure_backpressure_CachedBackpressureStore_ts_834d02db: {
    label: "CachedBackpressureStore.ts"
  }
  File_backpressure_CircuitBreakingBackpressureStore_ts_84a560f6: {
    label: "CircuitBreakingBackpressureStore.ts"
  }
  File_re_backpressure_FileBackpressureFallbackStore_ts_c67a0054: {
    label: "FileBackpressureFallbackStore.ts"
  }
  File_backpressure_MetricsEmittingBackpressureStore_ts_56f54445: {
    label: "MetricsEmittingBackpressureStore.ts"
  }
  File_tructure_backpressure_RawSqlBackpressureStore_ts_faae9bd8: {
    label: "RawSqlBackpressureStore.ts"
  }
  File_src_infrastructure_backpressure_types_ts_2cc90a47: {
    label: "types.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_canvasAuthoringAuthority_d8d8da7f`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_canvasAuthoringAuthority_d8d8da7f: {
  label: "canvasAuthoringAuthority/ — 1 files"

  File_thority_PostgresCanvasAuthoringAuthorityStore_ts_89e12041: {
    label: "PostgresCanvasAuthoringAuthorityStore.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_dbt_2d1f7ab0`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbt_2d1f7ab0: {
  label: "dbt/ — 25 files"

  File_actBackedRunExecutionContextInheritanceWriter_ts_9ee3807c: {
    label: "ArtifactBackedRunExecutionContextInheritanceWriter.ts"
  }
  File_ifactBackedRunExecutionContextReferenceReader_ts_23b12909: {
    label: "ArtifactBackedRunExecutionContextReferenceReader.ts"
  }
  File_e_dbt_ArtifactBackedRunExecutionContextWriter_ts_bf923bef: {
    label: "ArtifactBackedRunExecutionContextWriter.ts"
  }
  File_nfiguredDbtExecutionConnectionBindingVerifier_ts_ab7b141e: {
    label: "ConfiguredDbtExecutionConnectionBindingVerifier.ts"
  }
  File_ture_dbt_ConfiguredDbtExecutionTargetResolver_ts_559b89f1: {
    label: "ConfiguredDbtExecutionTargetResolver.ts"
  }
  File_src_infrastructure_dbt_dbtAnalysisIdentity_ts_c815386d: {
    label: "dbtAnalysisIdentity.ts"
  }
  File_src_infrastructure_dbt_dbtAnalyzerProcess_ts_a871f480: {
    label: "dbtAnalyzerProcess.ts"
  }
  File_src_infrastructure_dbt_DbtCliProjectAnalyzer_ts_28368830: {
    label: "DbtCliProjectAnalyzer.ts"
  }
  File_astructure_dbt_DbtCliProjectCandidateAnalyzer_ts_19b4966f: {
    label: "DbtCliProjectCandidateAnalyzer.ts"
  }
  File_src_infrastructure_dbt_dbtManifestProjection_ts_da3fb267: {
    label: "dbtManifestProjection.ts"
  }
  File_rc_infrastructure_dbt_DbtProjectBundleBuilder_ts_9268d7f9: {
    label: "DbtProjectBundleBuilder.ts"
  }
  File__infrastructure_dbt_dbtProjectContentRevision_ts_cf83c05e: {
    label: "dbtProjectContentRevision.ts"
  }
  File_src_infrastructure_dbt_dbtProjectPathPolicy_ts_ea2564a8: {
    label: "dbtProjectPathPolicy.ts"
  }
  File_infrastructure_dbt_dbtProjectSemanticEvidence_ts_1eda43fe: {
    label: "dbtProjectSemanticEvidence.ts"
  }
  File_c_infrastructure_dbt_dbtProjectSourceSnapshot_ts_6d9b092d: {
    label: "dbtProjectSourceSnapshot.ts"
  }
  File_src_infrastructure_dbt_dbtProjectTarArchive_ts_a049ef23: {
    label: "dbtProjectTarArchive.ts"
  }
  File_nfrastructure_dbt_dbtProjectWorkspaceBoundary_ts_554d23b8: {
    label: "dbtProjectWorkspaceBoundary.ts"
  }
  File_nfrastructure_dbt_dbtSemanticRegionProjection_ts_abde8023: {
    label: "dbtSemanticRegionProjection.ts"
  }
  File__dbt_FileRunExecutionContextInheritanceWriter_ts_901bef61: {
    label: "FileRunExecutionContextInheritanceWriter.ts"
  }
  File_re_dbt_FileRunExecutionContextReferenceReader_ts_d2dcccb3: {
    label: "FileRunExecutionContextReferenceReader.ts"
  }
  File_nfrastructure_dbt_immutableFileArtifactWriter_ts_71a678fe: {
    label: "immutableFileArtifactWriter.ts"
  }
  File_astructure_dbt_LocalDbtProjectImportInspector_ts_1d1fe476: {
    label: "LocalDbtProjectImportInspector.ts"
  }
  File_ture_dbt_PostgresDbtProjectImportProcessStore_ts_673db655: {
    label: "PostgresDbtProjectImportProcessStore.ts"
  }
  File_structure_dbt_runExecutionContextArtifactPath_ts_fe27a3e5: {
    label: "runExecutionContextArtifactPath.ts"
  }
  File_c_infrastructure_dbt_runExecutionContextTrust_ts_4f82ef3a: {
    label: "runExecutionContextTrust.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_dbtDependencyEdit_cfd51b9b`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbtDependencyEdit_cfd51b9b: {
  label: "dbtDependencyEdit/ — 1 files"

  File_Edit_LocalDbtDependencyEditPublicationGateway_ts_13fcb850: {
    label: "LocalDbtDependencyEditPublicationGateway.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_dbtYamlDescriptionEdit_b58d0b60`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_dbtYamlDescriptionEdit_b58d0b60: {
  label: "dbtYamlDescriptionEdit/ — 2 files"

  File_rkspaceMetadataDbtYamlDescriptionReceiptStore_ts_18f2d8a9: {
    label: "WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts"
  }
  File_lDescriptionEdit_YamlCstDbtDescriptionMutator_ts_f1dec6df: {
    label: "YamlCstDbtDescriptionMutator.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_executionCapacity_f8227bb2`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_executionCapacity_f8227bb2: {
  label: "executionCapacity/ — 1 files"

  File_ity_TemporalWorkerReadyzExecutionCapacityPort_ts_a70e82c9: {
    label: "TemporalWorkerReadyzExecutionCapacityPort.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_runControl_89abf458`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_runControl_89abf458: {
  label: "runControl/ — 1 files"

  File_e_runControl_RunEventCancellationReceiptStore_ts_a04fcaf6: {
    label: "RunEventCancellationReceiptStore.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_startRun_8abe9bc1`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_startRun_8abe9bc1: {
  label: "startRun/ — 3 files"

  File_Run_ArtifactBackedRunExecutionContextResolver_ts_22418d20: {
    label: "ArtifactBackedRunExecutionContextResolver.ts"
  }
  File_astructure_startRun_PostgresDuplicateRunProbe_ts_9487671f: {
    label: "PostgresDuplicateRunProbe.ts"
  }
  File_ure_startRun_RunExecutionContextBindingPolicy_ts_afc88df0: {
    label: "RunExecutionContextBindingPolicy.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_telemetry_d57d97d8`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_telemetry_d57d97d8: {
  label: "telemetry/ — 5 files"

  File_etry_ObservabilityRunStatusStalenessTelemetry_ts_817a3049: {
    label: "ObservabilityRunStatusStalenessTelemetry.ts"
  }
  File_e_telemetry_ObservabilityStartRunSlaTelemetry_ts_9fbb2901: {
    label: "ObservabilityStartRunSlaTelemetry.ts"
  }
  File_try_ObservabilityWorkspaceGraphDraftTelemetry_ts_e34deb05: {
    label: "ObservabilityWorkspaceGraphDraftTelemetry.ts"
  }
  File_ture_telemetry_SafeRunSnapshotStalenessReader_ts_7744285a: {
    label: "SafeRunSnapshotStalenessReader.ts"
  }
  File_c_infrastructure_telemetry_startRunSlaMetrics_ts_ac87bd59: {
    label: "startRunSlaMetrics.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_warehouseSourceImport_69d1bf05`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_warehouseSourceImport_69d1bf05: {
  label: "warehouseSourceImport/ — 4 files"

  File_urceImport_postgresSourceObjectMetricEvidence_ts_aa7e7e2d: {
    label: "postgresSourceObjectMetricEvidence.ts"
  }
  File_Import_WorkspacePostgresTransformSqlValidator_ts_13184018: {
    label: "WorkspacePostgresTransformSqlValidator.ts"
  }
  File_rceImport_WorkspaceWarehouseConnectionCatalog_ts_4526f367: {
    label: "WorkspaceWarehouseConnectionCatalog.ts"
  }
  File_ourceImport_WorkspaceWarehouseConnectionProbe_ts_2b08e3ff: {
    label: "WorkspaceWarehouseConnectionProbe.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_workspaceDiffChanges_f3467e97`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceDiffChanges_f3467e97: {
  label: "workspaceDiffChanges/ — 1 files"

  File_ffChanges_LocalWorkspaceDiffChangesRepository_ts_c376d6af: {
    label: "LocalWorkspaceDiffChangesRepository.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_workspaceFiles_8e28430c`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceFiles_8e28430c: {
  label: "workspaceFiles/ — 8 files"

  File_eFiles_LocalWorkspaceFileBatchMutationGateway_ts_ce870be8: {
    label: "LocalWorkspaceFileBatchMutationGateway.ts"
  }
  File_aceFiles_localWorkspaceFileBatchMutationModel_ts_1849ed9e: {
    label: "localWorkspaceFileBatchMutationModel.ts"
  }
  File_paceFiles_LocalWorkspaceFileHistoryRepository_ts_4215caa8: {
    label: "LocalWorkspaceFileHistoryRepository.ts"
  }
  File_ceFiles_LocalWorkspaceFileMutationCoordinator_ts_882fb922: {
    label: "LocalWorkspaceFileMutationCoordinator.ts"
  }
  File_e_workspaceFiles_LocalWorkspaceFileRepository_ts_ce5b5d0e: {
    label: "LocalWorkspaceFileRepository.ts"
  }
  File_aceFiles_LocalWorkspaceMetadataFileRepository_ts_c058341a: {
    label: "LocalWorkspaceMetadataFileRepository.ts"
  }
  File_ture_workspaceFiles_resolveWorkspaceFilesRoot_ts_7902821e: {
    label: "resolveWorkspaceFilesRoot.ts"
  }
  File_ture_workspaceFiles_workspaceScopeStoragePath_ts_de136933: {
    label: "workspaceScopeStoragePath.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_workspaceGraphDraft_be302653`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspaceGraphDraft_be302653: {
  label: "workspaceGraphDraft/ — 2 files"

  File_ceGraphDraft_PostgresWorkspaceGraphDraftStore_ts_a18dd196: {
    label: "PostgresWorkspaceGraphDraftStore.ts"
  }
  File_raft_StructuredWorkspaceGraphDraftAuditLogger_ts_16c23b6a: {
    label: "StructuredWorkspaceGraphDraftAuditLogger.ts"
  }
}
`;case`apiSource_dir_src_infrastructure_workspacePlugins_2763ba5b`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_infrastructure_ab2b2240Dir_src_infrastructure_workspacePlugins_2763ba5b: {
  label: "workspacePlugins/ — 1 files"

  File_gins_EmbeddedWorkspacePluginCatalogRepository_ts_c354e723: {
    label: "EmbeddedWorkspacePluginCatalogRepository.ts"
  }
}
`;case`outboxWorkerSource_dir_src_lifecycle_be90645c`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_lifecycle_be90645c: {
  label: "lifecycle/ — 1 files"

  File_src_lifecycle_stopRuntimeAndOperationalServer_ts_18448806: {
    label: "stopRuntimeAndOperationalServer.ts"
  }
}
`;case`stateStoreSource_dir_src_lifecycle_be90645c`:return`direction: down

StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645c: {
  label: "lifecycle/ — 11 files"

  Dir_src_lifecycle_adapters_2eb741df: {
    label: "adapters/ — 2 files"
  }
  File_src_lifecycle_archiveArtifacts_ts_988a7280: {
    label: "archiveArtifacts.ts"
  }
  File_src_lifecycle_archiveRuntime_ts_f9a4b64d: {
    label: "archiveRuntime.ts"
  }
  File_src_lifecycle_DeliveryBufferPurger_ts_1ef1023b: {
    label: "DeliveryBufferPurger.ts"
  }
  File_src_lifecycle_deliveryBufferRuntime_ts_890e1d63: {
    label: "deliveryBufferRuntime.ts"
  }
  File_src_lifecycle_ObjectStorageRunArchiveExporter_ts_8d22c575: {
    label: "ObjectStorageRunArchiveExporter.ts"
  }
  File_src_lifecycle_RunArchiveCoordinator_ts_4a10b869: {
    label: "RunArchiveCoordinator.ts"
  }
  File_src_lifecycle_RunArchiveDeleter_ts_57c91379: {
    label: "RunArchiveDeleter.ts"
  }
  File_src_lifecycle_RunArchiveRestorer_ts_b0beec82: {
    label: "RunArchiveRestorer.ts"
  }
  File_src_lifecycle_RunArchiveVerifier_ts_02fcf1d8: {
    label: "RunArchiveVerifier.ts"
  }
}
`;case`stateStoreSource_dir_src_lifecycle_adapters_2eb741df`:return`direction: down

StateStoreSourceDir_src_f27fede2Dir_src_lifecycle_be90645cDir_src_lifecycle_adapters_2eb741df: {
  label: "adapters/ — 2 files"

  File_fecycle_adapters_FileSystemArchiveObjectStore_ts_215ec773: {
    label: "FileSystemArchiveObjectStore.ts"
  }
  File_src_lifecycle_adapters_S3ArchiveObjectStore_ts_5ac1121e: {
    label: "S3ArchiveObjectStore.ts"
  }
}
`;case`traceabilitySource_dir_src_lineage_a5e6b0c8`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8: {
  label: "lineage/ — 27 files"

  Dir_src_lineage_cache_3d5361c8: {
    label: "cache/ — 1 files"
  }
  Dir_src_lineage_facets_bb600362: {
    label: "facets/ — 1 files"
  }
  Dir_src_lineage_mapper_12020689: {
    label: "mapper/ — 2 files"
  }
  Dir_src_lineage_readers_46be5146: {
    label: "readers/ — 3 files"
  }
  Dir_src_lineage_resolver_d076791f: {
    label: "resolver/ — 1 files"
  }
  Dir_src_lineage_runtime_038dab8b: {
    label: "runtime/ — 5 files"
  }
  File_src_lineage_compiledCodeRef_ts_60930993: {
    label: "compiledCodeRef.ts"
  }
  File_src_lineage_contracts_ts_981dfd42: {
    label: "contracts.ts"
  }
  File_src_lineage_errorContract_ts_744d1bc4: {
    label: "errorContract.ts"
  }
  File_src_lineage_errorPersistenceSupport_ts_7222dd9f: {
    label: "errorPersistenceSupport.ts"
  }
  File_src_lineage_errors_ts_f625dc09: {
    label: "errors.ts"
  }
  File_src_lineage_errorSupport_ts_d5a48fa1: {
    label: "errorSupport.ts"
  }
  File_src_lineage_HttpOpenLineageSink_ts_3a495acd: {
    label: "HttpOpenLineageSink.ts"
  }
  File_src_lineage_index_ts_63a1c6b7: {
    label: "index.ts"
  }
  File_src_lineage_LineageOutboxObserver_ts_781ac147: {
    label: "LineageOutboxObserver.ts"
  }
  File_src_lineage_LineageWorkerRuntime_ts_30bebebb: {
    label: "LineageWorkerRuntime.ts"
  }
  File_src_lineage_logMessages_ts_84f1f8ad: {
    label: "logMessages.ts"
  }
  File_src_lineage_openlineageSchema_ts_d8e9399b: {
    label: "openlineageSchema.ts"
  }
  File_src_lineage_types_ts_06c3c3bc: {
    label: "types.ts"
  }
  File_src_lineage_warningContract_ts_d5156880: {
    label: "warningContract.ts"
  }
}
`;case`traceabilitySource_dir_src_lineage_cache_3d5361c8`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_cache_3d5361c8: {
  label: "cache/ — 1 files"

  File_src_lineage_cache_InMemoryCompiledCodeCache_ts_1f882d30: {
    label: "InMemoryCompiledCodeCache.ts"
  }
}
`;case`traceabilitySource_dir_src_lineage_facets_bb600362`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_facets_bb600362: {
  label: "facets/ — 1 files"

  File_src_lineage_facets_SqlJobFacetBuilder_ts_18d17c58: {
    label: "SqlJobFacetBuilder.ts"
  }
}
`;case`traceabilitySource_dir_src_lineage_mapper_12020689`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_mapper_12020689: {
  label: "mapper/ — 2 files"

  File_neage_mapper_mapCompiledCodeResolutionWarning_ts_b494db86: {
    label: "mapCompiledCodeResolutionWarning.ts"
  }
  File_src_lineage_mapper_StepStartedLineageMapper_ts_f8838fcb: {
    label: "StepStartedLineageMapper.ts"
  }
}
`;case`traceabilitySource_dir_src_lineage_readers_46be5146`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_readers_46be5146: {
  label: "readers/ — 3 files"

  File_c_lineage_readers_CompositeCompiledCodeReader_ts_03763358: {
    label: "CompositeCompiledCodeReader.ts"
  }
  File_src_lineage_readers_FileUriCompiledCodeReader_ts_bb467a9c: {
    label: "FileUriCompiledCodeReader.ts"
  }
  File_rc_lineage_readers_InMemoryCompiledCodeReader_ts_06584e4c: {
    label: "InMemoryCompiledCodeReader.ts"
  }
}
`;case`traceabilitySource_dir_src_lineage_resolver_d076791f`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_resolver_d076791f: {
  label: "resolver/ — 1 files"

  File_eage_resolver_CachedRetryCompiledCodeResolver_ts_dc534e6e: {
    label: "CachedRetryCompiledCodeResolver.ts"
  }
}
`;case`traceabilitySource_dir_src_lineage_runtime_038dab8b`:return`direction: down

TraceabilitySourceDir_src_f27fede2Dir_src_lineage_a5e6b0c8Dir_src_lineage_runtime_038dab8b: {
  label: "runtime/ — 5 files"

  File_ineage_runtime_lineageWorkerDeadLetterSupport_ts_52952be2: {
    label: "lineageWorkerDeadLetterSupport.ts"
  }
  File_c_lineage_runtime_LineageWorkerLoopController_ts_30224aaf: {
    label: "LineageWorkerLoopController.ts"
  }
  File__lineage_runtime_lineageWorkerRecordProcessor_ts_fbe1d1fa: {
    label: "lineageWorkerRecordProcessor.ts"
  }
  File_rc_lineage_runtime_lineageWorkerRuntimeConfig_ts_6dc3c780: {
    label: "lineageWorkerRuntimeConfig.ts"
  }
  File_src_lineage_runtime_lineageWorkerTick_ts_6a253745: {
    label: "lineageWorkerTick.ts"
  }
}
`;case`engineSource_dir_src_metrics_5c1b9425`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_metrics_5c1b9425: {
  label: "metrics/ — 1 files"

  File_src_metrics_IMetricsCollector_ts_deb3566b: {
    label: "IMetricsCollector.ts"
  }
}
`;case`apiSource_dir_src_modules_fda77df3`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3: {
  label: "modules/ — 19 files"

  Dir_src_modules_canvasAuthoringAuthority_4ec47a2c: {
    label: "canvasAuthoringAuthority/ — 1 files"
  }
  Dir_src_modules_dbtProjectImport_5385b85a: {
    label: "dbtProjectImport/ — 1 files"
  }
  Dir_src_modules_protectedRuntime_db687cdc: {
    label: "protectedRuntime/ — 6 files"
  }
  Dir_src_modules_providerAdapters_62ea127c: {
    label: "providerAdapters/ — 2 files"
  }
  Dir_src_modules_startRun_63ef3ee2: {
    label: "startRun/ — 1 files"
  }
  Dir_src_modules_workspaceGraphDraft_eee1c7a3: {
    label: "workspaceGraphDraft/ — 1 files"
  }
  File_src_modules_buildProtectedRuntimeModule_ts_6fe831ca: {
    label: "buildProtectedRuntimeModule.ts"
  }
  File_src_modules_buildProviderAdapters_ts_39c17ae9: {
    label: "buildProviderAdapters.ts"
  }
  File_src_modules_planCompileBoundary_ts_b5a3396e: {
    label: "planCompileBoundary.ts"
  }
  File_src_modules_planCompileCatalog_ts_4e969c5d: {
    label: "planCompileCatalog.ts"
  }
  File_src_modules_registerOperationalHooks_ts_9e6c42be: {
    label: "registerOperationalHooks.ts"
  }
  File_src_modules_stateStoreRoles_ts_a6a4ed22: {
    label: "stateStoreRoles.ts"
  }
  File_src_modules_types_ts_9913e0be: {
    label: "types.ts"
  }
}
`;case`apiSource_dir_src_modules_canvasAuthoringAuthority_4ec47a2c`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_canvasAuthoringAuthority_4ec47a2c: {
  label: "canvasAuthoringAuthority/ — 1 files"

  File_uthority_buildCanvasAuthoringAuthorityRuntime_ts_5af10ee1: {
    label: "buildCanvasAuthoringAuthorityRuntime.ts"
  }
}
`;case`apiSource_dir_src_modules_dbtProjectImport_5385b85a`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_dbtProjectImport_5385b85a: {
  label: "dbtProjectImport/ — 1 files"

  File_dbtProjectImport_buildDbtProjectImportRuntime_ts_d7ebd820: {
    label: "buildDbtProjectImportRuntime.ts"
  }
}
`;case`apiSource_dir_src_modules_protectedRuntime_db687cdc`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_protectedRuntime_db687cdc: {
  label: "protectedRuntime/ — 6 files"

  File_otectedRuntime_buildProtectedAdmissionRuntime_ts_6585cfad: {
    label: "buildProtectedAdmissionRuntime.ts"
  }
  File_edRuntime_buildProtectedExecutionCapacityPort_ts_7c6b7529: {
    label: "buildProtectedExecutionCapacityPort.ts"
  }
  File_otectedRuntime_buildProtectedExecutionRuntime_ts_e56afd9d: {
    label: "buildProtectedExecutionRuntime.ts"
  }
  File_protectedRuntime_buildProtectedRuntimeStorage_ts_f0483df9: {
    label: "buildProtectedRuntimeStorage.ts"
  }
  File_rotectedRuntime_buildProtectedSecurityRuntime_ts_eb1a490f: {
    label: "buildProtectedSecurityRuntime.ts"
  }
  File_src_modules_protectedRuntime_shared_ts_c67a79d1: {
    label: "shared.ts"
  }
}
`;case`apiSource_dir_src_modules_providerAdapters_62ea127c`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_providerAdapters_62ea127c: {
  label: "providerAdapters/ — 2 files"

  File_Adapters_createTemporalProviderAdapterFactory_ts_2b90c52c: {
    label: "createTemporalProviderAdapterFactory.ts"
  }
  File_dules_providerAdapters_providerAdapterFactory_ts_592274be: {
    label: "providerAdapterFactory.ts"
  }
}
`;case`apiSource_dir_src_modules_startRun_63ef3ee2`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_startRun_63ef3ee2: {
  label: "startRun/ — 1 files"

  File_odules_startRun_buildProtectedStartRunRuntime_ts_e9bce587: {
    label: "buildProtectedStartRunRuntime.ts"
  }
}
`;case`apiSource_dir_src_modules_workspaceGraphDraft_eee1c7a3`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_modules_fda77df3Dir_src_modules_workspaceGraphDraft_eee1c7a3: {
  label: "workspaceGraphDraft/ — 1 files"

  File_aceGraphDraft_buildWorkspaceGraphDraftRuntime_ts_3477c6e4: {
    label: "buildWorkspaceGraphDraftRuntime.ts"
  }
}
`;case`outboxWorkerSource_dir_src_ops_43dcc755`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755: {
  label: "ops/ — 9 files"

  Dir_src_ops_monitor_19265fa8: {
    label: "monitor/ — 6 files"
  }
  File_src_ops_OperationalServer_ts_b7f6874b: {
    label: "OperationalServer.ts"
  }
  File_src_ops_OutboxWorkerMonitor_ts_55820373: {
    label: "OutboxWorkerMonitor.ts"
  }
  File_src_ops_resolveReadyStaleAfterMs_ts_f7f2c0bb: {
    label: "resolveReadyStaleAfterMs.ts"
  }
}
`;case`temporalWorkerSource_dir_src_ops_43dcc755`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755: {
  label: "ops/ — 2 files"

  File_src_ops_OperationalServer_ts_b7f6874b: {
    label: "OperationalServer.ts"
  }
  File_src_ops_TemporalWorkerMonitor_ts_92206208: {
    label: "TemporalWorkerMonitor.ts"
  }
}
`;case`outboxWorkerSource_dir_src_ops_monitor_19265fa8`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_ops_43dcc755Dir_src_ops_monitor_19265fa8: {
  label: "monitor/ — 6 files"

  File_src_ops_monitor_model_ts_9dbdd92c: {
    label: "model.ts"
  }
  File_src_ops_monitor_OutboxDeliveryTelemetry_ts_15b0eded: {
    label: "OutboxDeliveryTelemetry.ts"
  }
  File_src_ops_monitor_OutboxRuntimeHealthTracker_ts_4df4fdb0: {
    label: "OutboxRuntimeHealthTracker.ts"
  }
  File_src_ops_monitor_renderOutboxWorkerMetrics_ts_9fadac99: {
    label: "renderOutboxWorkerMetrics.ts"
  }
  File_src_ops_monitor_RunEventRetentionTelemetry_ts_cd18114d: {
    label: "RunEventRetentionTelemetry.ts"
  }
  File_src_ops_monitor_support_ts_05e70b3a: {
    label: "support.ts"
  }
}
`;case`engineSource_dir_src_outbox_799a2396`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_outbox_799a2396: {
  label: "outbox/ — 2 files"

  File_src_outbox_IOutboxRateLimiter_ts_53b76a03: {
    label: "IOutboxRateLimiter.ts"
  }
  File_src_outbox_TokenBucketRateLimiter_ts_62d3ca33: {
    label: "TokenBucketRateLimiter.ts"
  }
}
`;case`outboxWorkerSource_dir_src_ownership_3dbdd8b8`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_ownership_3dbdd8b8: {
  label: "ownership/ — 1 files"

  File_src_ownership_PgShardOwnershipGate_ts_6012f89c: {
    label: "PgShardOwnershipGate.ts"
  }
}
`;case`temporalAdapterSource_dir_src_plugins_e2271fcc`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2Dir_src_plugins_e2271fcc: {
  label: "plugins/ — 2 files"

  File_src_plugins_TemporalStepPluginProfile_ts_3f1b8cc2: {
    label: "TemporalStepPluginProfile.ts"
  }
  File_src_plugins_TemporalStepPluginRunner_ts_f768febc: {
    label: "TemporalStepPluginRunner.ts"
  }
}
`;case`apiSource_dir_src_plugins_e2271fcc`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_plugins_e2271fcc: {
  label: "plugins/ — 3 files"

  File_src_plugins_env_ts_a41c27b5: {
    label: "env.ts"
  }
  File_src_plugins_logger_ts_310910ba: {
    label: "logger.ts"
  }
  File_src_plugins_observability_ts_a9fe291d: {
    label: "observability.ts"
  }
}
`;case`outboxWorkerSource_dir_src_plugins_e2271fcc`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_plugins_e2271fcc: {
  label: "plugins/ — 1 files"

  File_src_plugins_env_ts_a41c27b5: {
    label: "env.ts"
  }
}
`;case`temporalWorkerSource_dir_src_plugins_e2271fcc`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2Dir_src_plugins_e2271fcc: {
  label: "plugins/ — 1 files"

  File_src_plugins_env_ts_a41c27b5: {
    label: "env.ts"
  }
}
`;case`observabilitySource_dir_src_policy_d3c8fc47`:return`direction: down

ObservabilitySourceDir_src_f27fede2Dir_src_policy_d3c8fc47: {
  label: "policy/ — 1 files"

  File_src_policy_cardinalityPolicy_ts_db3796c6: {
    label: "cardinalityPolicy.ts"
  }
}
`;case`artifactsSource_dir_src_ports_3a2d3ebf`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_ports_3a2d3ebf: {
  label: "ports/ — 7 files"

  File_src_ports_ICompiledCodeStorage_ts_c3084ffd: {
    label: "ICompiledCodeStorage.ts"
  }
  File_src_ports_IDbtProjectBundleReader_ts_fbaa4a7e: {
    label: "IDbtProjectBundleReader.ts"
  }
  File_src_ports_IPlanStoreReader_ts_6cb66e37: {
    label: "IPlanStoreReader.ts"
  }
  File_src_ports_IPlanStoreWriter_ts_d74f251c: {
    label: "IPlanStoreWriter.ts"
  }
  File_src_ports_IRunExecutionContextReader_ts_5e773e10: {
    label: "IRunExecutionContextReader.ts"
  }
  File_src_ports_IRunExecutionContextReferenceStore_ts_8330e260: {
    label: "IRunExecutionContextReferenceStore.ts"
  }
  File_src_ports_IStoredPlanArtifactStore_ts_2706acea: {
    label: "IStoredPlanArtifactStore.ts"
  }
}
`;case`engineSource_dir_src_ports_3a2d3ebf`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_ports_3a2d3ebf: {
  label: "ports/ — 11 files"

  File_src_ports_IAuthorizer_ts_a2dd49c6: {
    label: "IAuthorizer.ts"
  }
  File_src_ports_IPlanIntegrityValidator_ts_e2ac2e7f: {
    label: "IPlanIntegrityValidator.ts"
  }
  File_src_ports_IProjector_ts_74f0dbab: {
    label: "IProjector.ts"
  }
  File_src_ports_IRunAccessPolicy_ts_17d5d150: {
    label: "IRunAccessPolicy.ts"
  }
  File_src_ports_IRunExecutionContextBindingPolicy_ts_b693ce6e: {
    label: "IRunExecutionContextBindingPolicy.ts"
  }
  File_src_ports_IRunExecutionContextResolver_ts_85934ea4: {
    label: "IRunExecutionContextResolver.ts"
  }
  File_src_ports_IRunMaintenanceService_ts_78cf91d7: {
    label: "IRunMaintenanceService.ts"
  }
  File_src_ports_IRunSnapshotStalenessQuery_ts_7931d2e2: {
    label: "IRunSnapshotStalenessQuery.ts"
  }
  File_src_ports_IRunStateStore_ts_7d47b496: {
    label: "IRunStateStore.ts"
  }
  File_src_ports_IStartRunIntentStore_ts_635782f3: {
    label: "IStartRunIntentStore.ts"
  }
  File_src_ports_IWorkflowEngine_ts_ba14cd48: {
    label: "IWorkflowEngine.ts"
  }
}
`;case`plannerSource_dir_src_ports_3a2d3ebf`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_ports_3a2d3ebf: {
  label: "ports/ — 1 files"

  File_src_ports_ICompiledCodeStorage_ts_c3084ffd: {
    label: "ICompiledCodeStorage.ts"
  }
}
`;case`apiSource_dir_src_routes_e0d29e0a`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_routes_e0d29e0a: {
  label: "routes/ — 11 files"

  File_src_routes_capabilities_ts_a10e5b88: {
    label: "capabilities.ts"
  }
  File_src_routes_dbReady_ts_a553dddf: {
    label: "dbReady.ts"
  }
  File_src_routes_health_ts_c3b008cf: {
    label: "health.ts"
  }
  File_src_routes_healthContract_ts_5df3767b: {
    label: "healthContract.ts"
  }
  File_src_routes_healthContractMapper_ts_d54766ef: {
    label: "healthContractMapper.ts"
  }
  File_src_routes_healthPresenter_ts_ba83f18a: {
    label: "healthPresenter.ts"
  }
  File_src_routes_healthReadinessPolicy_ts_350808af: {
    label: "healthReadinessPolicy.ts"
  }
  File_src_routes_healthReadinessPorts_ts_28afbc68: {
    label: "healthReadinessPorts.ts"
  }
  File_src_routes_httpStatus_ts_df7db6bb: {
    label: "httpStatus.ts"
  }
  File_src_routes_registerOperationalRoutes_ts_0f148e5a: {
    label: "registerOperationalRoutes.ts"
  }
  File_src_routes_version_ts_8882e0f2: {
    label: "version.ts"
  }
}
`;case`apiSource_dir_src_runtime_6c8c9a16`:return`direction: down

ApiSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16: {
  label: "runtime/ — 11 files"

  File_src_runtime_intentReconcilerRuntime_ts_2c415f4f: {
    label: "intentReconcilerRuntime.ts"
  }
  File_rc_runtime_intentReconcilerRuntimeComposition_ts_eb0255f7: {
    label: "intentReconcilerRuntimeComposition.ts"
  }
  File_src_runtime_reconcilerHealth_ts_b85d68e2: {
    label: "reconcilerHealth.ts"
  }
  File_src_runtime_reconcilerHealthMonitoring_ts_b6c50e03: {
    label: "reconcilerHealthMonitoring.ts"
  }
  File_src_runtime_reconcilerHealthPolicy_ts_67ea5546: {
    label: "reconcilerHealthPolicy.ts"
  }
  File_src_runtime_reconcilerHealthStateMachine_ts_7d6cbd43: {
    label: "reconcilerHealthStateMachine.ts"
  }
  File_src_runtime_reconcilerHealthWatchdog_ts_02106670: {
    label: "reconcilerHealthWatchdog.ts"
  }
  File_src_runtime_reconcilerRuntimeBootstrap_ts_6e91902f: {
    label: "reconcilerRuntimeBootstrap.ts"
  }
  File_src_runtime_reconcilerRuntimeHealthHooks_ts_483d0818: {
    label: "reconcilerRuntimeHealthHooks.ts"
  }
  File_src_runtime_reconcilerRuntimeLifecycle_ts_4af77837: {
    label: "reconcilerRuntimeLifecycle.ts"
  }
  File_src_runtime_reconcilerRuntimeTelemetry_ts_09a88f8d: {
    label: "reconcilerRuntimeTelemetry.ts"
  }
}
`;case`artifactsSource_dir_src_runtime_6c8c9a16`:return`direction: down

ArtifactsSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16: {
  label: "runtime/ — 8 files"

  File__runtime_ArtifactBackedDbtProjectBundleReader_ts_4ac7a7b2: {
    label: "ArtifactBackedDbtProjectBundleReader.ts"
  }
  File_ntime_ArtifactBackedRunExecutionContextReader_ts_fa403d8a: {
    label: "ArtifactBackedRunExecutionContextReader.ts"
  }
  File_src_runtime_ArtifactReadError_ts_9ad1a6de: {
    label: "ArtifactReadError.ts"
  }
  File_src_runtime_assertDbtProjectBundleBinding_ts_c4c61a3d: {
    label: "assertDbtProjectBundleBinding.ts"
  }
  File_src_runtime_readArtifactBytes_ts_502618ef: {
    label: "readArtifactBytes.ts"
  }
  File_ntime_resolveRunExecutionContextArtifactStore_ts_e717eb22: {
    label: "resolveRunExecutionContextArtifactStore.ts"
  }
  File_c_runtime_S3RunExecutionContextReferenceStore_ts_83fcefea: {
    label: "S3RunExecutionContextReferenceStore.ts"
  }
  File_src_runtime_validateArtifactIntegrity_ts_ec4c4fd1: {
    label: "validateArtifactIntegrity.ts"
  }
}
`;case`outboxWorkerSource_dir_src_runtime_6c8c9a16`:return`direction: down

OutboxWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16: {
  label: "runtime/ — 8 files"

  File_src_runtime_buildDeliveryBufferPurgeRuntime_ts_7221e0a1: {
    label: "buildDeliveryBufferPurgeRuntime.ts"
  }
  File_src_runtime_buildRunEventRetentionRuntime_ts_32abfa14: {
    label: "buildRunEventRetentionRuntime.ts"
  }
  File_src_runtime_createOutboxEventBus_ts_0a19e908: {
    label: "createOutboxEventBus.ts"
  }
  File_src_runtime_createOutboxWorkerRuntime_ts_5585da97: {
    label: "createOutboxWorkerRuntime.ts"
  }
  File_src_runtime_DeliveryBufferPurgeRuntime_ts_de2b3a16: {
    label: "DeliveryBufferPurgeRuntime.ts"
  }
  File_src_runtime_outboxRuntimeResourceLifecycle_ts_deabfb71: {
    label: "outboxRuntimeResourceLifecycle.ts"
  }
  File_src_runtime_OutboxWorkerRuntime_ts_f1ec00b8: {
    label: "OutboxWorkerRuntime.ts"
  }
  File_src_runtime_RunEventRetentionRuntime_ts_8df9cc8b: {
    label: "RunEventRetentionRuntime.ts"
  }
}
`;case`plannerSource_dir_src_runtime_6c8c9a16`:return`direction: down

PlannerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16: {
  label: "runtime/ — 1 files"

  File_src_runtime_time_ts_ffbb7fc6: {
    label: "time.ts"
  }
}
`;case`temporalWorkerSource_dir_src_runtime_6c8c9a16`:return`direction: down

TemporalWorkerSourceDir_src_f27fede2Dir_src_runtime_6c8c9a16: {
  label: "runtime/ — 15 files"

  File_src_runtime_createTemporalWorkerRuntime_ts_05c67170: {
    label: "createTemporalWorkerRuntime.ts"
  }
  File__runtime_EnvironmentDbtRuntimeProfileResolver_ts_f0e1feb7: {
    label: "EnvironmentDbtRuntimeProfileResolver.ts"
  }
  File_src_runtime_nodeHttpsJsonClient_ts_7554d7cc: {
    label: "nodeHttpsJsonClient.ts"
  }
  File_ntime_objectFilePostgresDbtCommandEnvironment_ts_b3229875: {
    label: "objectFilePostgresDbtCommandEnvironment.ts"
  }
  File_src_runtime_runtimeTypes_ts_3859dc08: {
    label: "runtimeTypes.ts"
  }
  File_src_runtime_temporalWorkerDbtProfile_ts_3bbab614: {
    label: "temporalWorkerDbtProfile.ts"
  }
  File_src_runtime_temporalWorkerHost_ts_40f4bb7e: {
    label: "temporalWorkerHost.ts"
  }
  File_c_runtime_temporalWorkerHttpJsonArtifactStore_ts_e45b4f85: {
    label: "temporalWorkerHttpJsonArtifactStore.ts"
  }
  File_src_runtime_temporalWorkerHttpJsonProfile_ts_b6d7e198: {
    label: "temporalWorkerHttpJsonProfile.ts"
  }
  File_src_runtime_temporalWorkerLifecycle_ts_b18d1e18: {
    label: "temporalWorkerLifecycle.ts"
  }
  File_ntime_temporalWorkerObjectFilePostgresProfile_ts_47ea271b: {
    label: "temporalWorkerObjectFilePostgresProfile.ts"
  }
  File_src_runtime_temporalWorkerObjectFileReader_ts_224e37d5: {
    label: "temporalWorkerObjectFileReader.ts"
  }
  File_src_runtime_temporalWorkerRuntimeHandle_ts_82cb6aca: {
    label: "temporalWorkerRuntimeHandle.ts"
  }
  File_src_runtime_temporalWorkerRuntimeResources_ts_6add2f7f: {
    label: "temporalWorkerRuntimeResources.ts"
  }
  File_src_runtime_temporalWorkerStores_ts_30507c83: {
    label: "temporalWorkerStores.ts"
  }
}
`;case`contractsSource_dir_src_schema-packs_7b5d7740`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_schema-packs_7b5d7740: {
  label: "schema-packs/ — 18 files"

  File_src_schema-packs_common_ts_398db230: {
    label: "common.ts"
  }
  File_src_schema-packs_execution-plan_ts_86c5c12e: {
    label: "execution-plan.ts"
  }
  File_src_schema-packs_execution-selection_ts_441e5d3c: {
    label: "execution-selection.ts"
  }
  File_src_schema-packs_plan-admission-finding_ts_83c19f4b: {
    label: "plan-admission-finding.ts"
  }
  File_src_schema-packs_plan-compile_ts_48b03ee9: {
    label: "plan-compile.ts"
  }
  File_src_schema-packs_plan-preview-profile_ts_adf6dc05: {
    label: "plan-preview-profile.ts"
  }
  File_src_schema-packs_plan-preview-request_ts_42316dfc: {
    label: "plan-preview-request.ts"
  }
  File_src_schema-packs_plan-preview-response_ts_52f0195c: {
    label: "plan-preview-response.ts"
  }
  File_src_schema-packs_plan-preview_ts_ae17edda: {
    label: "plan-preview.ts"
  }
  File_src_schema-packs_plan-records_ts_c09f7919: {
    label: "plan-records.ts"
  }
  File_src_schema-packs_planner-build_ts_a7f2eed1: {
    label: "planner-build.ts"
  }
  File_src_schema-packs_planner-context_ts_e70b75a3: {
    label: "planner-context.ts"
  }
  File_src_schema-packs_planner-graph_ts_5ac72402: {
    label: "planner-graph.ts"
  }
  File_src_schema-packs_planner_ts_7357552d: {
    label: "planner.ts"
  }
  File_src_schema-packs_run-events_ts_cb8f97f0: {
    label: "run-events.ts"
  }
  File_src_schema-packs_shared_ts_1568c8c4: {
    label: "shared.ts"
  }
  File_src_schema-packs_start-run_ts_af379300: {
    label: "start-run.ts"
  }
  File_src_schema-packs_workspace-graph-draft_ts_d3954988: {
    label: "workspace-graph-draft.ts"
  }
}
`;case`engineSource_dir_src_security_5dba450f`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_security_5dba450f: {
  label: "security/ — 8 files"

  File_src_security_AuthorizationError_ts_b5702789: {
    label: "AuthorizationError.ts"
  }
  File_src_security_authorizer_ts_105fb5a1: {
    label: "authorizer.ts"
  }
  File_src_security_hostRiskClassifier_ts_004a46c8: {
    label: "hostRiskClassifier.ts"
  }
  File_src_security_planIntegrity_ts_301f10ad: {
    label: "planIntegrity.ts"
  }
  File_src_security_planRefPolicy_ts_6134c46b: {
    label: "planRefPolicy.ts"
  }
  File_src_security_planRefPolicyRules_ts_238e2a28: {
    label: "planRefPolicyRules.ts"
  }
  File_src_security_planUri_ts_2424d62e: {
    label: "planUri.ts"
  }
  File_src_security_RunAccessPolicy_ts_98a04f62: {
    label: "RunAccessPolicy.ts"
  }
}
`;case`engineSource_dir_src_services_77d0a679`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_services_77d0a679: {
  label: "services/ — 26 files"

  Dir_src_services_runControl_ab6e7414: {
    label: "runControl/ — 2 files"
  }
  Dir_src_services_runMaintenance_4550b902: {
    label: "runMaintenance/ — 8 files"
  }
  Dir_src_services_signal_1e641b45: {
    label: "signal/ — 1 files"
  }
  Dir_src_services_startRun_b5d5a78f: {
    label: "startRun/ — 11 files"
  }
  File_src_services_RunEnrichmentService_ts_2bf6c72b: {
    label: "RunEnrichmentService.ts"
  }
  File_src_services_RunHealthService_ts_71f72df7: {
    label: "RunHealthService.ts"
  }
  File_src_services_RunMaintenanceService_ts_4d4b2c8b: {
    label: "RunMaintenanceService.ts"
  }
  File_src_services_RunStatusQueryService_ts_9f47ed48: {
    label: "RunStatusQueryService.ts"
  }
}
`;case`engineSource_dir_src_services_runControl_ab6e7414`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runControl_ab6e7414: {
  label: "runControl/ — 2 files"

  File_src_services_runControl_RunCommandService_ts_9ce60001: {
    label: "RunCommandService.ts"
  }
  File_src_services_runControl_RunSignalService_ts_4c961101: {
    label: "RunSignalService.ts"
  }
}
`;case`engineSource_dir_src_services_runMaintenance_4550b902`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_runMaintenance_4550b902: {
  label: "runMaintenance/ — 8 files"

  File_ntenance_DispatchedIntentReconciliationPolicy_ts_b8ae0d06: {
    label: "DispatchedIntentReconciliationPolicy.ts"
  }
  File_Maintenance_PendingIntentReconciliationPolicy_ts_b7f898c3: {
    label: "PendingIntentReconciliationPolicy.ts"
  }
  File_rvices_runMaintenance_RunMaintenanceContracts_ts_24fc243a: {
    label: "RunMaintenanceContracts.ts"
  }
  File__runMaintenance_RunMaintenanceDomainConstants_ts_1a3aa192: {
    label: "RunMaintenanceDomainConstants.ts"
  }
  File_ces_runMaintenance_RunMaintenanceEventFactory_ts_b002a368: {
    label: "RunMaintenanceEventFactory.ts"
  }
  File_Maintenance_RunMaintenanceObservabilityFacade_ts_4805e1c2: {
    label: "RunMaintenanceObservabilityFacade.ts"
  }
  File_intenance_RunMaintenanceOrphanedIntentService_ts_f1b52520: {
    label: "RunMaintenanceOrphanedIntentService.ts"
  }
  File__runMaintenance_RunMaintenanceStuckRunService_ts_ab1e0fe8: {
    label: "RunMaintenanceStuckRunService.ts"
  }
}
`;case`engineSource_dir_src_services_signal_1e641b45`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_signal_1e641b45: {
  label: "signal/ — 1 files"

  File_src_services_signal_SignalTransitionGuard_ts_30a6ed95: {
    label: "SignalTransitionGuard.ts"
  }
}
`;case`engineSource_dir_src_services_startRun_b5d5a78f`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_services_77d0a679Dir_src_services_startRun_b5d5a78f: {
  label: "startRun/ — 11 files"

  File_s_startRun_RunExecutionContextAdmissionPolicy_ts_2f1b092a: {
    label: "RunExecutionContextAdmissionPolicy.ts"
  }
  File_ices_startRun_runExecutionContextRequirements_ts_836b5ca6: {
    label: "runExecutionContextRequirements.ts"
  }
  File_rc_services_startRun_StartRunAdmissionService_ts_78f1c1b5: {
    label: "StartRunAdmissionService.ts"
  }
  File_src_services_startRun_StartRunDomainConstants_ts_516466fc: {
    label: "StartRunDomainConstants.ts"
  }
  File_src_services_startRun_StartRunEventFactory_ts_971f9241: {
    label: "StartRunEventFactory.ts"
  }
  File_rc_services_startRun_StartRunExecutionService_ts_f6b4e54d: {
    label: "StartRunExecutionService.ts"
  }
  File_src_services_startRun_StartRunFailurePolicy_ts_c84a8cc3: {
    label: "StartRunFailurePolicy.ts"
  }
  File_src_services_startRun_StartRunIntentService_ts_1f5c13ab: {
    label: "StartRunIntentService.ts"
  }
  File_src_services_startRun_StartRunTelemetryPolicy_ts_2f0bb435: {
    label: "StartRunTelemetryPolicy.ts"
  }
  File_src_services_startRun_StartRunTypes_ts_fd04542d: {
    label: "StartRunTypes.ts"
  }
  File_rc_services_startRun_StartRunValidationPolicy_ts_504d326b: {
    label: "StartRunValidationPolicy.ts"
  }
}
`;case`engineSource_dir_src_state_cee1ab4b`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_state_cee1ab4b: {
  label: "state/ — 12 files"

  File_src_state_InMemoryOutboxState_ts_04e5ddb9: {
    label: "InMemoryOutboxState.ts"
  }
  File_src_state_InMemoryRunStateAdminSupport_ts_820e3139: {
    label: "InMemoryRunStateAdminSupport.ts"
  }
  File_src_state_InMemoryRunStateCore_ts_a6160ade: {
    label: "InMemoryRunStateCore.ts"
  }
  File_src_state_InMemoryRunStateReadSupport_ts_75997ca5: {
    label: "InMemoryRunStateReadSupport.ts"
  }
  File_src_state_InMemoryRunStateSnapshotSupport_ts_db5faefd: {
    label: "InMemoryRunStateSnapshotSupport.ts"
  }
  File_src_state_InMemoryRunStateStore_ts_e63637fb: {
    label: "InMemoryRunStateStore.ts"
  }
  File_src_state_InMemoryStartRunIntentStore_ts_2245c39f: {
    label: "InMemoryStartRunIntentStore.ts"
  }
  File_src_state_InMemoryTxStore_ts_7a026282: {
    label: "InMemoryTxStore.ts"
  }
  File_src_state_outboxSharding_ts_fa7e7ded: {
    label: "outboxSharding.ts"
  }
  File_src_state_retryLineagePolicy_ts_c25cd93f: {
    label: "retryLineagePolicy.ts"
  }
  File_src_state_runEventWritePolicy_ts_737a1d53: {
    label: "runEventWritePolicy.ts"
  }
  File_src_state_snapshotStaleness_ts_dc89091e: {
    label: "snapshotStaleness.ts"
  }
}
`;case`contractsSource_dir_src_step-registry_6500f8b1`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_step-registry_6500f8b1: {
  label: "step-registry/ — 4 files"

  File_src_step-registry_BuiltInStepTypeEntries_ts_28e3d299: {
    label: "BuiltInStepTypeEntries.ts"
  }
  File_src_step-registry_CommonStepTypeConfig_ts_326a5712: {
    label: "CommonStepTypeConfig.ts"
  }
  File_src_step-registry_DbtStepTypeConfig_ts_0c2fa828: {
    label: "DbtStepTypeConfig.ts"
  }
  File_src_step-registry_StepTypeRegistry_ts_ec1a7015: {
    label: "StepTypeRegistry.ts"
  }
}
`;case`webSource_dir_src_styles_1238c57d`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_styles_1238c57d: {
  label: "styles/ — 4 files"

  File_src_styles_fonts_css_1c559736: {
    label: "fonts.css"
  }
  File_src_styles_index_css_7a1236ac: {
    label: "index.css"
  }
  File_src_styles_tailwind_css_525cdc3b: {
    label: "tailwind.css"
  }
  File_src_styles_theme_css_02dfd9ec: {
    label: "theme.css"
  }
}
`;case`deliverySource_dir_src_testing_c8606474`:return`direction: down

DeliverySourceDir_src_f27fede2Dir_src_testing_c8606474: {
  label: "testing/ — 4 files"

  File_src_testing_InMemoryEventBus_ts_20520955: {
    label: "InMemoryEventBus.ts"
  }
  File_src_testing_InMemoryOutboxStorage_ts_573b28d8: {
    label: "InMemoryOutboxStorage.ts"
  }
  File_src_testing_InMemoryOutboxStorageCore_ts_b4ab0db0: {
    label: "InMemoryOutboxStorageCore.ts"
  }
  File_src_testing_outboxSharding_ts_173afb69: {
    label: "outboxSharding.ts"
  }
}
`;case`webSource_dir_src_testing_c8606474`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_testing_c8606474: {
  label: "testing/ — 21 files"

  Dir_src_testing_fixtures_fe43ee25: {
    label: "fixtures/ — 1 files"
  }
  File_src_testing_appServicesTestDoubles_ts_b87b7813: {
    label: "appServicesTestDoubles.ts"
  }
  File_src_testing_plansPortDoubles_ts_e2c8b6d8: {
    label: "plansPortDoubles.ts"
  }
  File_src_testing_reactQueryHarness_test_tsx_1e784e9c: {
    label: "reactQueryHarness.test.tsx"
  }
  File_src_testing_reactQueryHarness_tsx_d1fa0e9f: {
    label: "reactQueryHarness.tsx"
  }
  File_src_testing_runsPortDoubles_ts_09c928a4: {
    label: "runsPortDoubles.ts"
  }
  File_src_testing_sourceImportTestFixtures_ts_b61cdac2: {
    label: "sourceImportTestFixtures.ts"
  }
  File_iteCypressArtifactIsolation_architecture_test_ts_708f7b37: {
    label: "viteCypressArtifactIsolation.architecture.test.ts"
  }
  File_src_testing_vitestSuites_architecture_support_ts_2d1b41d0: {
    label: "vitestSuites.architecture.support.ts"
  }
  File_src_testing_vitestSuites_architecture_test_ts_e0da6cfb: {
    label: "vitestSuites.architecture.test.ts"
  }
  File_esting_vitestSuites_catalog_architecture_test_ts_4f3b1166: {
    label: "vitestSuites.catalog.architecture.test.ts"
  }
  File_Suites_changedFileDiscovery_architecture_test_ts_63185d16: {
    label: "vitestSuites.changedFileDiscovery.architecture.test.ts"
  }
  File_vitestSuites_changedRouting_architecture_test_ts_5bed8773: {
    label: "vitestSuites.changedRouting.architecture.test.ts"
  }
  File_es_changedRoutingGovernance_architecture_test_ts_8f8612a6: {
    label: "vitestSuites.changedRoutingGovernance.architecture.test.ts"
  }
  File_ting_vitestSuites_rawIntake_architecture_test_ts_8adc08fb: {
    label: "vitestSuites.rawIntake.architecture.test.ts"
  }
  File_ing_vitestSuites_sizePolicy_architecture_test_ts_42a0ba7e: {
    label: "vitestSuites.sizePolicy.architecture.test.ts"
  }
  File__workspaceGraphDraftAuthoringPortDoubles_test_ts_585ac505: {
    label: "workspaceGraphDraftAuthoringPortDoubles.test.ts"
  }
  File_sting_workspaceGraphDraftAuthoringPortDoubles_ts_d3bbd51b: {
    label: "workspaceGraphDraftAuthoringPortDoubles.ts"
  }
  File_ting_workspaceGraphDraftAuthoringStoreDoubles_ts_417a500b: {
    label: "workspaceGraphDraftAuthoringStoreDoubles.ts"
  }
  File_src_testing_workspacePortDoubles_ts_946fd677: {
    label: "workspacePortDoubles.ts"
  }
  File_workspaceServicesVitestLane_architecture_test_ts_0fc55631: {
    label: "workspaceServicesVitestLane.architecture.test.ts"
  }
}
`;case`webSource_dir_src_testing_fixtures_fe43ee25`:return`direction: down

WebSourceDir_src_f27fede2Dir_src_testing_c8606474Dir_src_testing_fixtures_fe43ee25: {
  label: "fixtures/ — 1 files"

  File_src_testing_fixtures_mockDbtData_ts_18750e2d: {
    label: "mockDbtData.ts"
  }
}
`;case`contractsSource_dir_src_types_7f0be21a`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_types_7f0be21a: {
  label: "types/ — 2 files"

  File_src_types_artifacts_ts_f9049a84: {
    label: "artifacts.ts"
  }
  File_src_types_contracts_ts_4fe4f768: {
    label: "contracts.ts"
  }
}
`;case`engineSource_dir_src_types_7f0be21a`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_types_7f0be21a: {
  label: "types/ — 2 files"

  File_src_types_index_ts_cd7a0a5e: {
    label: "index.ts"
  }
  File_src_types_types_ts_ca15b85b: {
    label: "types.ts"
  }
}
`;case`lineageWorkerSource_dir_src_types_7f0be21a`:return`direction: down

LineageWorkerSourceDir_src_f27fede2Dir_src_types_7f0be21a: {
  label: "types/ — 1 files"

  File_src_types_pg_d_ts_cfcf86d1: {
    label: "pg.d.ts"
  }
}
`;case`contractsSource_dir_src_utils_e236f4b4`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_utils_e236f4b4: {
  label: "utils/ — 1 files"

  File_src_utils_contractPrimitives_ts_173e2c86: {
    label: "contractPrimitives.ts"
  }
}
`;case`engineSource_dir_src_utils_e236f4b4`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_utils_e236f4b4: {
  label: "utils/ — 2 files"

  File_src_utils_clock_ts_ced0945e: {
    label: "clock.ts"
  }
  File_src_utils_errorUtils_ts_45233443: {
    label: "errorUtils.ts"
  }
}
`;case`dslSource_dir_src_v1_d0c3db8f`:return`direction: down

DslSourceDir_src_f27fede2Dir_src_v1_d0c3db8f: {
  label: "v1/ — 3 files"

  File_src_v1_ast_ts_008d2652: {
    label: "ast.ts"
  }
  File_src_v1_evaluator_ts_ca5cff7f: {
    label: "evaluator.ts"
  }
  File_src_v1_parser_ts_9d102362: {
    label: "parser.ts"
  }
}
`;case`contractsSource_dir_src_validation_134957c1`:return`direction: down

ContractsSourceDir_src_f27fede2Dir_src_validation_134957c1: {
  label: "validation/ — 4 files"

  File_src_validation_core_ts_f4800562: {
    label: "core.ts"
  }
  File_src_validation_events_ts_bf258135: {
    label: "events.ts"
  }
  File_src_validation_planner_ts_9e9379ce: {
    label: "planner.ts"
  }
  File_src_validation_runtime_ts_3e1c00c2: {
    label: "runtime.ts"
  }
}
`;case`engineSource_dir_src_workers_10de5b13`:return`direction: down

EngineSourceDir_src_f27fede2Dir_src_workers_10de5b13: {
  label: "workers/ — 1 files"

  File_src_workers_IntentReconcilerWorker_ts_a96c73fc: {
    label: "IntentReconcilerWorker.ts"
  }
}
`;case`temporalAdapterSource_dir_src_workflows_4449a236`:return`direction: down

TemporalAdapterSourceDir_src_f27fede2Dir_src_workflows_4449a236: {
  label: "workflows/ — 20 files"

  File_src_workflows_executionSegmentResolver_ts_2360f16e: {
    label: "executionSegmentResolver.ts"
  }
  File_src_workflows_runPlanWorkflow_activities_ts_7c558f2f: {
    label: "runPlanWorkflow.activities.ts"
  }
  File_src_workflows_runPlanWorkflow_cancellation_ts_99aebd96: {
    label: "runPlanWorkflow.cancellation.ts"
  }
  File_src_workflows_runPlanWorkflow_layerHelpers_ts_5644644d: {
    label: "runPlanWorkflow.layerHelpers.ts"
  }
  File_src_workflows_runPlanWorkflow_layerResults_ts_ef7509a8: {
    label: "runPlanWorkflow.layerResults.ts"
  }
  File_src_workflows_runPlanWorkflow_layers_ts_b0dc1edc: {
    label: "runPlanWorkflow.layers.ts"
  }
  File_src_workflows_runPlanWorkflow_lifecycle_ts_85fd0658: {
    label: "runPlanWorkflow.lifecycle.ts"
  }
  File_src_workflows_runPlanWorkflow_signals_ts_1c1789d8: {
    label: "runPlanWorkflow.signals.ts"
  }
  File_src_workflows_runPlanWorkflow_state_ts_42e1bfb3: {
    label: "runPlanWorkflow.state.ts"
  }
  File_src_workflows_runPlanWorkflow_stepExecution_ts_6dff9077: {
    label: "runPlanWorkflow.stepExecution.ts"
  }
  File_src_workflows_RunPlanWorkflow_ts_42bee0ed: {
    label: "RunPlanWorkflow.ts"
  }
  File_src_workflows_runPlanWorkflow_types_ts_9f49e52f: {
    label: "runPlanWorkflow.types.ts"
  }
  File_src_workflows_workflowArtifactHelpers_ts_e024961b: {
    label: "workflowArtifactHelpers.ts"
  }
  File_orkflows_workflowControlSignalRetentionPolicy_ts_c8f33c3b: {
    label: "workflowControlSignalRetentionPolicy.ts"
  }
  File_src_workflows_workflowCursorHelpers_ts_77b65951: {
    label: "workflowCursorHelpers.ts"
  }
  File_src_workflows_workflowErrorHelpers_ts_2a9687e1: {
    label: "workflowErrorHelpers.ts"
  }
  File_src_workflows_workflowFailureReasonPolicy_ts_64af0c14: {
    label: "workflowFailureReasonPolicy.ts"
  }
  File_src_workflows_workflowGatewayHelpers_ts_b42f874f: {
    label: "workflowGatewayHelpers.ts"
  }
  File_src_workflows_workflowInputParsingHelpers_ts_9d6c4309: {
    label: "workflowInputParsingHelpers.ts"
  }
  File_src_workflows_workflowRuntimePayloadHelpers_ts_202d2ce0: {
    label: "workflowRuntimePayloadHelpers.ts"
  }
}
`;case`postgresAdapterSource_dir_test_a94a8fe5`:return`direction: down

PostgresAdapterSourceDir_test_a94a8fe5: {
  label: "test/ — 49 files"

  Dir_test_helpers_a3c41c9e: {
    label: "helpers/ — 5 files"
  }
  File_test_migratePostgresRuntimeStores_test_ts_2401ac18: {
    label: "migratePostgresRuntimeStores.test.ts"
  }
  File_test_PostgresAdapterClientSession_test_ts_0e63088f: {
    label: "PostgresAdapterClientSession.test.ts"
  }
  File_test_PostgresAppRoleRuntime_integration_test_ts_28c9410e: {
    label: "PostgresAppRoleRuntime.integration.test.ts"
  }
  File_test_PostgresBackpressureSnapshotReader_test_ts_8d7a1bfc: {
    label: "PostgresBackpressureSnapshotReader.test.ts"
  }
  File_test_PostgresCredentialBindingResolver_test_ts_b75ed818: {
    label: "PostgresCredentialBindingResolver.test.ts"
  }
  File_t_PostgresLineageOutboxStore_dead-letter_test_ts_16899933: {
    label: "PostgresLineageOutboxStore.dead-letter.test.ts"
  }
  File_test_PostgresLineageOutboxStore_failures_test_ts_25dfa1e5: {
    label: "PostgresLineageOutboxStore.failures.test.ts"
  }
  File_t_PostgresLineageOutboxStore_integration_test_ts_aec8cb02: {
    label: "PostgresLineageOutboxStore.integration.test.ts"
  }
  File_test_PostgresLineageOutboxStore_pending_test_ts_58493ff8: {
    label: "PostgresLineageOutboxStore.pending.test.ts"
  }
  File_test_PostgresObjectFileLoad_test_ts_65b6235d: {
    label: "PostgresObjectFileLoad.test.ts"
  }
  File_test_PostgresOutboxStore_test_ts_9298f7af: {
    label: "PostgresOutboxStore.test.ts"
  }
  File_test_PostgresPlanStore_integration_helpers_ts_db0699ba: {
    label: "PostgresPlanStore.integration.helpers.ts"
  }
  File_test_PostgresPlanStore_invariants_unit_test_ts_86b67435: {
    label: "PostgresPlanStore.invariants.unit.test.ts"
  }
  File__PostgresPlanStore_lifecycle_integration_test_ts_fc972175: {
    label: "PostgresPlanStore.lifecycle.integration.test.ts"
  }
  File_stgresPlanStore_records-core_integration_test_ts_678d958a: {
    label: "PostgresPlanStore.records-core.integration.test.ts"
  }
  File_gresPlanStore_records-guards_integration_test_ts_4b80c3e6: {
    label: "PostgresPlanStore.records-guards.integration.test.ts"
  }
  File_test_PostgresPlanStore_sql_test_ts_c5ebc25b: {
    label: "PostgresPlanStore.sql.test.ts"
  }
  File_test_PostgresPoolErrorPolicy_test_ts_a4ea16e5: {
    label: "PostgresPoolErrorPolicy.test.ts"
  }
  File_rchiveStore_tenant-retention_integration_test_ts_1b577861: {
    label: "PostgresRunArchiveStore.tenant-retention.integration.test.ts"
  }
  File_PostgresRunArchiveStore_tenant-retention_test_ts_5c0d710d: {
    label: "PostgresRunArchiveStore.tenant-retention.test.ts"
  }
  File_gresRunEventRetentionPolicy_architecture_test_ts_ea258c7e: {
    label: "PostgresRunEventRetentionPolicy.architecture.test.ts"
  }
  File_test_PostgresRunEventStore_test_ts_2c0626ac: {
    label: "PostgresRunEventStore.test.ts"
  }
  File_test_PostgresRunMetadataRepository_test_ts_b6e720ef: {
    label: "PostgresRunMetadataRepository.test.ts"
  }
  File_test_PostgresRunSnapshotStore_cas-guard_test_ts_46eb9c45: {
    label: "PostgresRunSnapshotStore.cas-guard.test.ts"
  }
  File_test_PostgresRunSnapshotStore_test_ts_9b5d150e: {
    label: "PostgresRunSnapshotStore.test.ts"
  }
  File_test_PostgresRunStateCoordinator_test_ts_58267d55: {
    label: "PostgresRunStateCoordinator.test.ts"
  }
  File_test_PostgresSchemaManager_rollback_test_ts_805034db: {
    label: "PostgresSchemaManager.rollback.test.ts"
  }
  File_sSchemaRollbackZeroDowntime_architecture_test_ts_4482eea7: {
    label: "PostgresSchemaRollbackZeroDowntime.architecture.test.ts"
  }
  File_gresServiceAccessCapability_architecture_test_ts_c61d56d0: {
    label: "PostgresServiceAccessCapability.architecture.test.ts"
  }
  File_test_PostgresSnapshotStalenessQuery_test_ts_0ca8934e: {
    label: "PostgresSnapshotStalenessQuery.test.ts"
  }
  File_test_PostgresStartRunIntentStore_context_test_ts_b6e56ee8: {
    label: "PostgresStartRunIntentStore.context.test.ts"
  }
  File_test_PostgresStartRunIntentStore_test_ts_3bb01816: {
    label: "PostgresStartRunIntentStore.test.ts"
  }
  File_test_PostgresStateStoreAdapter_abort_test_ts_8ce7c1ab: {
    label: "PostgresStateStoreAdapter.abort.test.ts"
  }
  File_test_PostgresStateStoreAdapter_migrate_test_ts_9a9a2e1f: {
    label: "PostgresStateStoreAdapter.migrate.test.ts"
  }
  File_test_PostgresStateStoreAdapter_sharding_test_ts_912483d1: {
    label: "PostgresStateStoreAdapter.sharding.test.ts"
  }
  File_est_PostgresStateTransitions_integration_test_ts_00c32a45: {
    label: "PostgresStateTransitions.integration.test.ts"
  }
  File_test_PostgresTenantIsolationPolicy_test_ts_4750b847: {
    label: "PostgresTenantIsolationPolicy.test.ts"
  }
  File_gresTenantIsolationSemantic_architecture_test_ts_dc32fe9b: {
    label: "PostgresTenantIsolationSemantic.architecture.test.ts"
  }
  File_PostgresTenantRlsEnforcement_integration_test_ts_293ac3a3: {
    label: "PostgresTenantRlsEnforcement.integration.test.ts"
  }
  File_test_RunDomainStateTransitions_contract_test_ts_316f0292: {
    label: "RunDomainStateTransitions.contract.test.ts"
  }
  File_test_runStateCommandPortBridge_test_ts_7bfe90c2: {
    label: "runStateCommandPortBridge.test.ts"
  }
  File_19F1SnapshotWorkQueueClosure_integration_test_ts_e072628f: {
    label: "S19F1SnapshotWorkQueueClosure.integration.test.ts"
  }
  File_test_smoke_test_ts_dc6a63e5: {
    label: "smoke.test.ts"
  }
  File_test_StartRunIntentSchemaManager_test_ts_7af139c0: {
    label: "StartRunIntentSchemaManager.test.ts"
  }
}
`;case`temporalAdapterSource_dir_test_a94a8fe5`:return`direction: down

TemporalAdapterSourceDir_test_a94a8fe5: {
  label: "test/ — 45 files"

  Dir_test_helpers_a3c41c9e: {
    label: "helpers/ — 11 files"
  }
  File_test_activities_test_ts_900ed66d: {
    label: "activities.test.ts"
  }
  File_test_activityDeps_typecheck_ts_aec68732: {
    label: "activityDeps.typecheck.ts"
  }
  File_test_dbt-core-decoupling_architecture_test_ts_a22c65f5: {
    label: "dbt-core-decoupling.architecture.test.ts"
  }
  File_test_dbt-package-extraction_architecture_test_ts_936e2624: {
    label: "dbt-package-extraction.architecture.test.ts"
  }
  File_test_dbtRuntimeFixtures_test_ts_8dc0b64b: {
    label: "dbtRuntimeFixtures.test.ts"
  }
  File_test_integration_time-skipping_shared_ts_dedb432f: {
    label: "integration.time-skipping.shared.ts"
  }
  File_test_integration_time-skipping_test_ts_11ec7be4: {
    label: "integration.time-skipping.test.ts"
  }
  File_integration_transformation_time-skipping_test_ts_c633766b: {
    label: "integration.transformation.time-skipping.test.ts"
  }
  File_test_ObservedTemporalAdapter_test_ts_ea0bd2af: {
    label: "ObservedTemporalAdapter.test.ts"
  }
  File_test_runPlanWorkflow_cancellation_test_ts_dbad01e0: {
    label: "runPlanWorkflow.cancellation.test.ts"
  }
  File_test_runPlanWorkflow_layers_order_test_ts_56bd7390: {
    label: "runPlanWorkflow.layers.order.test.ts"
  }
  File_test_runPlanWorkflow_signals_test_ts_95a84e91: {
    label: "runPlanWorkflow.signals.test.ts"
  }
  File_test_RunStateCommandPortCircuitBreaker_test_ts_20fd7c09: {
    label: "RunStateCommandPortCircuitBreaker.test.ts"
  }
  File_test_smoke_test_ts_dc6a63e5: {
    label: "smoke.test.ts"
  }
  File_test_TemporalAdapter_control_test_ts_317859f9: {
    label: "TemporalAdapter.control.test.ts"
  }
  File_st_TemporalAdapter_getProviderStatusView_test_ts_f695c7af: {
    label: "TemporalAdapter.getProviderStatusView.test.ts"
  }
  File_test_TemporalAdapter_lookupRunRef_test_ts_3291006b: {
    label: "TemporalAdapter.lookupRunRef.test.ts"
  }
  File_test_TemporalAdapter_startRun_test_ts_2196b901: {
    label: "TemporalAdapter.startRun.test.ts"
  }
  File_test_temporalErrorPolicy_test_ts_c4f19796: {
    label: "temporalErrorPolicy.test.ts"
  }
  File_test_temporalPlanArtifactReader_test_ts_cdf8e5d0: {
    label: "temporalPlanArtifactReader.test.ts"
  }
  File_test_temporalPlanRefCapacitySlaPolicy_test_ts_7a6a130a: {
    label: "temporalPlanRefCapacitySlaPolicy.test.ts"
  }
  File_test_TemporalPolicyMapper_test_ts_45cf7cb1: {
    label: "TemporalPolicyMapper.test.ts"
  }
  File_test_TemporalWorkerHost_lifecycle_test_ts_0152b062: {
    label: "TemporalWorkerHost.lifecycle.test.ts"
  }
  File_est_worker-scaling-strategy_architecture_test_ts_350fd1e9: {
    label: "worker-scaling-strategy.architecture.test.ts"
  }
  File_test_workflow-compiled-code-ref_test_ts_6fac621d: {
    label: "workflow-compiled-code-ref.test.ts"
  }
  File_orkflow-component-semantics_architecture_test_ts_9bd67166: {
    label: "workflow-component-semantics.architecture.test.ts"
  }
  File_test_workflow-continue-as-new_test_ts_e10bbde5: {
    label: "workflow-continue-as-new.test.ts"
  }
  File_test_workflow-dag-scheduler_test_ts_6466ed82: {
    label: "workflow-dag-scheduler.test.ts"
  }
  File_test_workflow-execution-segment_test_ts_e8c48ac3: {
    label: "workflow-execution-segment.test.ts"
  }
  File_test_workflow-literals_test_ts_858c32cb: {
    label: "workflow-literals.test.ts"
  }
  File_test_workflow-retry-policy_test_ts_17b052bc: {
    label: "workflow-retry-policy.test.ts"
  }
  File_test_workflow-step-activity-routing_test_ts_8669491d: {
    label: "workflow-step-activity-routing.test.ts"
  }
  File_test_workflowMapper_typecheck_ts_384ae912: {
    label: "workflowMapper.typecheck.ts"
  }
  File_test_workflowRuntimePayloadHelpers_test_ts_80a7b0cd: {
    label: "workflowRuntimePayloadHelpers.test.ts"
  }
}
`;case`apiSource_dir_test_a94a8fe5`:return`direction: down

ApiSourceDir_test_a94a8fe5: {
  label: "test/ — 235 files"

  Dir_test_app_cc1578c5: {
    label: "app/ — 8 files"
  }
  Dir_test_application_6e0f09c6: {
    label: "application/ — 77 files"
  }
  Dir_test_contracts_48fc2dfb: {
    label: "contracts/ — 1 files"
  }
  Dir_test_entrypoints_9471002b: {
    label: "entrypoints/ — 66 files"
  }
  Dir_test_fixtures_9c0e9ecf: {
    label: "fixtures/ — 3 files"
  }
  Dir_test_infrastructure_a5060869: {
    label: "infrastructure/ — 49 files"
  }
  Dir_test_integration_6de70f9e: {
    label: "integration/ — 16 files"
  }
  Dir_test_modules_f1ff894a: {
    label: "modules/ — 6 files"
  }
  Dir_test_plugins_a1eaa08f: {
    label: "plugins/ — 2 files"
  }
  Dir_test_routes_ee5f836d: {
    label: "routes/ — 3 files"
  }
  File_test_app_test_ts_42dbb7c4: {
    label: "app.test.ts"
  }
  File_test_server_test_ts_597d1914: {
    label: "server.test.ts"
  }
  File_test_testExecutionManifest_test_ts_83939d79: {
    label: "testExecutionManifest.test.ts"
  }
  File_test_tsconfig_json_ecaa19a9: {
    label: "tsconfig.json"
  }
}
`;case`artifactsSource_dir_test_a94a8fe5`:return`direction: down

ArtifactsSourceDir_test_a94a8fe5: {
  label: "test/ — 5 files"

  File_test_artifactSurface_test_ts_96c8813d: {
    label: "artifactSurface.test.ts"
  }
  File_test_contentAddressedArtifactStore_test_ts_a0f7c055: {
    label: "contentAddressedArtifactStore.test.ts"
  }
  File_test_readArtifact_test_ts_2d557adf: {
    label: "readArtifact.test.ts"
  }
  File_test_runExecutionContextReaders_test_ts_309ae6b5: {
    label: "runExecutionContextReaders.test.ts"
  }
  File_test_validateArtifactIntegrity_test_ts_85f7a3c8: {
    label: "validateArtifactIntegrity.test.ts"
  }
}
`;case`cliSource_dir_test_a94a8fe5`:return`direction: down

CliSourceDir_test_a94a8fe5: {
  label: "test/ — 1 files"

  File_test_smoke_test_ts_dc6a63e5: {
    label: "smoke.test.ts"
  }
}
`;case`contractsSource_dir_test_a94a8fe5`:return`direction: down

ContractsSourceDir_test_a94a8fe5: {
  label: "test/ — 68 files"

  Dir_test_fixtures_9c0e9ecf: {
    label: "fixtures/ — 4 files"
  }
  Dir_test_source-import_487f4c41: {
    label: "source-import/ — 5 files"
  }
  Dir_test_validation_613522bb: {
    label: "validation/ — 10 files"
  }
  File_test_compiled-code-ref_contract_test_ts_00b96ada: {
    label: "compiled-code-ref.contract.test.ts"
  }
  File_test_dbt-dependency-edit_contract_test_ts_9b4e7bfe: {
    label: "dbt-dependency-edit.contract.test.ts"
  }
  File_est_dbt-project-file-projection_contract_test_ts_4cf1cee4: {
    label: "dbt-project-file-projection.contract.test.ts"
  }
  File_test_dbt-project-import_contract_test_ts_36976eb1: {
    label: "dbt-project-import.contract.test.ts"
  }
  File_est_dbt-selected-model-analysis_contract_test_ts_105f0412: {
    label: "dbt-selected-model-analysis.contract.test.ts"
  }
  File_test_dbt-step-selector_contract_test_ts_bf46c3e0: {
    label: "dbt-step-selector.contract.test.ts"
  }
  File_test_dbt-yaml-description-edit_contract_test_ts_07284be6: {
    label: "dbt-yaml-description-edit.contract.test.ts"
  }
  File_-substrait-capability-admission_contract_test_ts_e527beaa: {
    label: "dvt-substrait-capability-admission.contract.test.ts"
  }
  File_vt-substrait-capability-catalog_contract_test_ts_4ebb4fd2: {
    label: "dvt-substrait-capability-catalog.contract.test.ts"
  }
  File_test_dvt-substrait-profile_contract_test_ts_69d8e813: {
    label: "dvt-substrait-profile.contract.test.ts"
  }
  File_rait-semantic-document-decoding_contract_test_ts_0651091d: {
    label: "dvt-substrait-semantic-document-decoding.contract.test.ts"
  }
  File_dvt-substrait-struct-capability_contract_test_ts_199d5975: {
    label: "dvt-substrait-struct-capability.contract.test.ts"
  }
  File_t-transform-authoring-authority_contract_test_ts_aa9439b6: {
    label: "dvt-transform-authoring-authority.contract.test.ts"
  }
  File_test_errors_test_ts_cbe61aff: {
    label: "errors.test.ts"
  }
  File_test_execution-selection_architecture_test_ts_4ca316f1: {
    label: "execution-selection.architecture.test.ts"
  }
  File_test_execution-selection_contract_test_ts_0fb139bc: {
    label: "execution-selection.contract.test.ts"
  }
  File_est_graph-dbt-model-compilation_contract_test_ts_c1fcb123: {
    label: "graph-dbt-model-compilation.contract.test.ts"
  }
  File_-workspace-artifact-publication_contract_test_ts_cdb8f6c2: {
    label: "graph-dbt-workspace-artifact-publication.contract.test.ts"
  }
  File_test_http-json-artifact-step_contract_test_ts_90bb88da: {
    label: "http-json-artifact-step.contract.test.ts"
  }
  File_test_materialization-evidence_contract_test_ts_adb388ba: {
    label: "materialization-evidence.contract.test.ts"
  }
  File_object-file-postgres-dbt-bridge_contract_test_ts_8ac7679a: {
    label: "object-file-postgres-dbt-bridge.contract.test.ts"
  }
  File_st_object-file-to-postgres-step_contract_test_ts_f76951b8: {
    label: "object-file-to-postgres-step.contract.test.ts"
  }
  File_test_plan-admission-finding_architecture_test_ts_b7bb5b87: {
    label: "plan-admission-finding.architecture.test.ts"
  }
  File_test_plan-admission-finding_contract_test_ts_f7a77dd7: {
    label: "plan-admission-finding.contract.test.ts"
  }
  File_test_plan-admission-matrix_architecture_test_ts_5c02e025: {
    label: "plan-admission-matrix.architecture.test.ts"
  }
  File_test_plan-admission-matrix_contract_test_ts_29344864: {
    label: "plan-admission-matrix.contract.test.ts"
  }
  File_test_plan-preview-provenance_contract_test_ts_0adad416: {
    label: "plan-preview-provenance.contract.test.ts"
  }
  File_test_plan-store-records-shape-sync_test_ts_9494899a: {
    label: "plan-store-records-shape-sync.test.ts"
  }
  File_test_plan-store-records_architecture_test_ts_6432d666: {
    label: "plan-store-records.architecture.test.ts"
  }
  File_test_plan-version_contract_test_ts_5a6ad1d8: {
    label: "plan-version.contract.test.ts"
  }
  File_test_planner-policy-vocabulary_test_ts_140c46c2: {
    label: "planner-policy-vocabulary.test.ts"
  }
  File_t_planner-private-ownership_architecture_test_ts_1d77050c: {
    label: "planner-private-ownership.architecture.test.ts"
  }
  File_test_planner_contract_test_ts_adbc3dc7: {
    label: "planner.contract.test.ts"
  }
  File_test_project-workspace-contract_test_ts_e4222e33: {
    label: "project-workspace-contract.test.ts"
  }
  File_test_provider-adapter_architecture_test_ts_fa6af0dd: {
    label: "provider-adapter.architecture.test.ts"
  }
  File_test_provider-vocabulary_architecture_test_ts_d60c6c59: {
    label: "provider-vocabulary.architecture.test.ts"
  }
  File_test_run-control-boundary_contract_test_ts_0ddef860: {
    label: "run-control-boundary.contract.test.ts"
  }
  File_ore-maintenance-concurrency_architecture_test_ts_7a1f1264: {
    label: "run-state-store-maintenance-concurrency.architecture.test.ts"
  }
  File_test_schema-sync_test_ts_8ebd3afe: {
    label: "schema-sync.test.ts"
  }
  File_test_signalSemantics_test_ts_fdce1f8a: {
    label: "signalSemantics.test.ts"
  }
  File_test_start-run-boundary_architecture_test_ts_4d5fcb07: {
    label: "start-run-boundary.architecture.test.ts"
  }
  File_test_start-run-boundary_contract_test_ts_ca07f94b: {
    label: "start-run-boundary.contract.test.ts"
  }
  File__start-run-intent-ownership_architecture_test_ts_31b3ebc4: {
    label: "start-run-intent-ownership.architecture.test.ts"
  }
  File_test_step-registry_test_ts_b5b4649c: {
    label: "step-registry.test.ts"
  }
  File_test_validation_test_ts_37fa3211: {
    label: "validation.test.ts"
  }
  File_space-graph-authoring-draft_architecture_test_ts_9d8dc96c: {
    label: "workspace-graph-authoring-draft.architecture.test.ts"
  }
  File_workspace-graph-authoring-draft_contract_test_ts_15a9e0a8: {
    label: "workspace-graph-authoring-draft.contract.test.ts"
  }
  File_-graph-authoring-edge-execution_contract_test_ts_9b14749e: {
    label: "workspace-graph-authoring-edge-execution.contract.test.ts"
  }
  File_rkspace-graph-semantic-document_contract_test_ts_f0808e1b: {
    label: "workspace-graph-semantic-document.contract.test.ts"
  }
}
`;case`cryptoSource_dir_test_a94a8fe5`:return`direction: down

CryptoSourceDir_test_a94a8fe5: {
  label: "test/ — 3 files"

  File_test_primitives_test_ts_80b0829e: {
    label: "primitives.test.ts"
  }
  File_test_runtime-parity_test_ts_15c5b42f: {
    label: "runtime-parity.test.ts"
  }
  File_test_vectors_ts_b55fd9a8: {
    label: "vectors.ts"
  }
}
`;case`deliverySource_dir_test_a94a8fe5`:return`direction: down

DeliverySourceDir_test_a94a8fe5: {
  label: "test/ — 11 files"

  Dir_test_gaps_38afa409: {
    label: "gaps/ — 1 files"
  }
  Dir_test_support_a2b6bf64: {
    label: "support/ — 1 files"
  }
  File_boxInMemoryStorageOwnership_architecture_test_ts_da56c14d: {
    label: "OutboxInMemoryStorageOwnership.architecture.test.ts"
  }
  File_test_OutboxShardAssignment_architecture_test_ts_e76f8da0: {
    label: "OutboxShardAssignment.architecture.test.ts"
  }
  File_test_OutboxShardAssignment_test_ts_d80e8e6c: {
    label: "OutboxShardAssignment.test.ts"
  }
  File_test_OutboxWorker_deadLetter_test_ts_771bb619: {
    label: "OutboxWorker.deadLetter.test.ts"
  }
  File_test_OutboxWorker_delivery_test_ts_a003f3bf: {
    label: "OutboxWorker.delivery.test.ts"
  }
  File_test_OutboxWorker_observer_test_ts_f58f4833: {
    label: "OutboxWorker.observer.test.ts"
  }
  File_test_OutboxWorker_retry_test_ts_929fd704: {
    label: "OutboxWorker.retry.test.ts"
  }
  File_test_OutboxWorker_sharding_test_ts_7fb93e82: {
    label: "OutboxWorker.sharding.test.ts"
  }
  File_test_ProjectorWorkerRuntime_test_ts_6c0fae1a: {
    label: "ProjectorWorkerRuntime.test.ts"
  }
}
`;case`dslSource_dir_test_a94a8fe5`:return`direction: down

DslSourceDir_test_a94a8fe5: {
  label: "test/ — 1 files"

  File_test_dsl-v1_test_ts_ad300292: {
    label: "dsl-v1.test.ts"
  }
}
`;case`engineSource_dir_test_a94a8fe5`:return`direction: down

EngineSourceDir_test_a94a8fe5: {
  label: "test/ — 73 files"

  Dir_test_adapters_3547ecba: {
    label: "adapters/ — 2 files"
  }
  Dir_test_application_6e0f09c6: {
    label: "application/ — 2 files"
  }
  Dir_test_architecture_e33c6101: {
    label: "architecture/ — 14 files"
  }
  Dir_test_contracts_48fc2dfb: {
    label: "contracts/ — 12 files"
  }
  Dir_test_core_582745be: {
    label: "core/ — 8 files"
  }
  Dir_test_domain_f501813d: {
    label: "domain/ — 1 files"
  }
  Dir_test_gaps_38afa409: {
    label: "gaps/ — 1 files"
  }
  Dir_test_helpers_a3c41c9e: {
    label: "helpers/ — 2 files"
  }
  Dir_test_security_93be5b1e: {
    label: "security/ — 3 files"
  }
  Dir_test_services_f70a3c83: {
    label: "services/ — 13 files"
  }
  Dir_test_state_e3826a4a: {
    label: "state/ — 11 files"
  }
  Dir_test_types_50e36d4f: {
    label: "types/ — 1 files"
  }
  Dir_test_utils_040594fb: {
    label: "utils/ — 1 files"
  }
  Dir_test_workers_421ecc3a: {
    label: "workers/ — 1 files"
  }
  File_test_idempotency_vectors_test_ts_d296a660: {
    label: "idempotency.vectors.test.ts"
  }
}
`;case`lineageWorkerSource_dir_test_a94a8fe5`:return`direction: down

LineageWorkerSourceDir_test_a94a8fe5: {
  label: "test/ — 5 files"

  File_test_bootstrap_test_ts_580bf460: {
    label: "bootstrap.test.ts"
  }
  File_test_compiledCodeResolver_test_ts_033bc2c9: {
    label: "compiledCodeResolver.test.ts"
  }
  File_test_env_test_ts_04b55cc5: {
    label: "env.test.ts"
  }
  File_test_server_bootstrap_test_ts_93c6282d: {
    label: "server.bootstrap.test.ts"
  }
  File_test_server_lineage-mapper-wiring_test_ts_72d5c726: {
    label: "server.lineage-mapper-wiring.test.ts"
  }
}
`;case`observabilityOtelSource_dir_test_a94a8fe5`:return`direction: down

ObservabilityOtelSourceDir_test_a94a8fe5: {
  label: "test/ — 1 files"

  File_test_OtelObservability_test_ts_7d388a53: {
    label: "OtelObservability.test.ts"
  }
}
`;case`observabilitySource_dir_test_a94a8fe5`:return`direction: down

ObservabilitySourceDir_test_a94a8fe5: {
  label: "test/ — 1 files"

  File_test_cardinalityPolicy_test_ts_784145ea: {
    label: "cardinalityPolicy.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_a94a8fe5`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5: {
  label: "test/ — 30 files"

  Dir_test_bus_17c9bd04: {
    label: "bus/ — 1 files"
  }
  Dir_test_canary_74a0cd7f: {
    label: "canary/ — 7 files"
  }
  Dir_test_db_cdf1fabf: {
    label: "db/ — 1 files"
  }
  Dir_test_host_c4480bb3: {
    label: "host/ — 1 files"
  }
  Dir_test_integration_6de70f9e: {
    label: "integration/ — 1 files"
  }
  Dir_test_lifecycle_8592082a: {
    label: "lifecycle/ — 1 files"
  }
  Dir_test_ops_ccbee1ea: {
    label: "ops/ — 4 files"
  }
  Dir_test_ownership_521c7256: {
    label: "ownership/ — 2 files"
  }
  Dir_test_plugins_a1eaa08f: {
    label: "plugins/ — 1 files"
  }
  Dir_test_runtime_f0806ded: {
    label: "runtime/ — 9 files"
  }
  Dir_test_sharding_4c144e39: {
    label: "sharding/ — 1 files"
  }
  File_test_tsconfig_json_ecaa19a9: {
    label: "tsconfig.json"
  }
}
`;case`planInterpreterSource_dir_test_a94a8fe5`:return`direction: down

PlanInterpreterSourceDir_test_a94a8fe5: {
  label: "test/ — 1 files"

  File_test_dagAnalyzer_test_ts_8d31be3d: {
    label: "dagAnalyzer.test.ts"
  }
}
`;case`planVerifierSource_dir_test_a94a8fe5`:return`direction: down

PlanVerifierSourceDir_test_a94a8fe5: {
  label: "test/ — 5 files"

  File_test_http-json-artifact-step_admission_test_ts_e30dc2bc: {
    label: "http-json-artifact-step.admission.test.ts"
  }
  File_t_object-file-to-postgres-step_admission_test_ts_7624da9f: {
    label: "object-file-to-postgres-step.admission.test.ts"
  }
  File_test_planVersionAdmission_architecture_test_ts_3ff3b253: {
    label: "planVersionAdmission.architecture.test.ts"
  }
  File_test_planVersionAdmission_test_ts_ef577972: {
    label: "planVersionAdmission.test.ts"
  }
  File_test_verify_test_ts_48e361b9: {
    label: "verify.test.ts"
  }
}
`;case`plannerSource_dir_test_a94a8fe5`:return`direction: down

PlannerSourceDir_test_a94a8fe5: {
  label: "test/ — 25 files"

  Dir_test_compiledCode_c6b8c06a: {
    label: "compiledCode/ — 4 files"
  }
  Dir_test_fixtures_9c0e9ecf: {
    label: "fixtures/ — 1 files"
  }
  Dir_test_slow_2158a782: {
    label: "slow/ — 1 files"
  }
  Dir_test_unit_c3b5db1b: {
    label: "unit/ — 15 files"
  }
  Dir_test_vectors_798a0d09: {
    label: "vectors/ — 2 files"
  }
  File_test_cross-runtime-print-planid_ts_4d68fe2b: {
    label: "cross-runtime-print-planid.ts"
  }
  File_test_cross-runtime_sh_b17cea63: {
    label: "cross-runtime.sh"
  }
}
`;case`projectorWorkerSource_dir_test_a94a8fe5`:return`direction: down

ProjectorWorkerSourceDir_test_a94a8fe5: {
  label: "test/ — 2 files"

  File_test_env_test_ts_04b55cc5: {
    label: "env.test.ts"
  }
  File_test_tsconfig_json_ecaa19a9: {
    label: "tsconfig.json"
  }
}
`;case`runDomainSource_dir_test_a94a8fe5`:return`direction: down

RunDomainSourceDir_test_a94a8fe5: {
  label: "test/ — 1 files"

  File_test_applyRunEvent_test_ts_77bd2cb8: {
    label: "applyRunEvent.test.ts"
  }
}
`;case`stateStoreSource_dir_test_a94a8fe5`:return`direction: down

StateStoreSourceDir_test_a94a8fe5: {
  label: "test/ — 13 files"

  File_test_archiveArtifacts_test_ts_4e0cd7b4: {
    label: "archiveArtifacts.test.ts"
  }
  File_test_archiveLifecycle_test_ts_81e2f497: {
    label: "archiveLifecycle.test.ts"
  }
  File_test_archiveRuntime_test_ts_99944a25: {
    label: "archiveRuntime.test.ts"
  }
  File_test_command-port_test_ts_500f135d: {
    label: "command-port.test.ts"
  }
  File_test_DeliveryBufferPurger_test_ts_f93491d3: {
    label: "DeliveryBufferPurger.test.ts"
  }
  File_test_FileSystemArchiveObjectStore_test_ts_b0a94230: {
    label: "FileSystemArchiveObjectStore.test.ts"
  }
  File_test_ObjectStorageRunArchiveExporter_test_ts_c4530c83: {
    label: "ObjectStorageRunArchiveExporter.test.ts"
  }
  File_test_RunArchiveCoordinator_test_ts_b7abf9f8: {
    label: "RunArchiveCoordinator.test.ts"
  }
  File_test_RunArchiveDeleter_test_ts_f8dda6ea: {
    label: "RunArchiveDeleter.test.ts"
  }
  File_test_RunArchiveLifecycleIntegration_test_ts_2782652e: {
    label: "RunArchiveLifecycleIntegration.test.ts"
  }
  File_test_RunArchiveRestorer_test_ts_5e7183bb: {
    label: "RunArchiveRestorer.test.ts"
  }
  File_test_RunEventRetentionPolicy_test_ts_5e370435: {
    label: "RunEventRetentionPolicy.test.ts"
  }
  File_test_S3ArchiveObjectStore_test_ts_527f1337: {
    label: "S3ArchiveObjectStore.test.ts"
  }
}
`;case`temporalDbtPluginSource_dir_test_a94a8fe5`:return`direction: down

TemporalDbtPluginSourceDir_test_a94a8fe5: {
  label: "test/ — 2 files"

  File_test_DbtCliPluginRunner_test_ts_6a802b4d: {
    label: "DbtCliPluginRunner.test.ts"
  }
  File_test_dbtCliProjectMaterializer_test_ts_46e5f581: {
    label: "dbtCliProjectMaterializer.test.ts"
  }
}
`;case`temporalHttpJsonPluginSource_dir_test_a94a8fe5`:return`direction: down

TemporalHttpJsonPluginSourceDir_test_a94a8fe5: {
  label: "test/ — 2 files"

  File_test_HttpJsonArtifactPlugin_test_ts_51bc41ae: {
    label: "HttpJsonArtifactPlugin.test.ts"
  }
  File_test_httpJsonPluginBoundary_architecture_test_ts_26696631: {
    label: "httpJsonPluginBoundary.architecture.test.ts"
  }
}
`;case`temporalObjectFilePostgresPluginSource_dir_test_a94a8fe5`:return`direction: down

TemporalObjectFilePostgresPluginSourceDir_test_a94a8fe5: {
  label: "test/ — 4 files"

  File_test_ObjectFilePostgresPluginRunner_test_ts_de7b18c5: {
    label: "ObjectFilePostgresPluginRunner.test.ts"
  }
  File_test_ObjectFilePostgresStepActivity_test_ts_7be3eda4: {
    label: "ObjectFilePostgresStepActivity.test.ts"
  }
  File_test_objectFilePostgresTestFixtures_ts_ab768378: {
    label: "objectFilePostgresTestFixtures.ts"
  }
  File_test_objectFileRows_test_ts_b23e1eab: {
    label: "objectFileRows.test.ts"
  }
}
`;case`temporalWorkerSource_dir_test_a94a8fe5`:return`direction: down

TemporalWorkerSourceDir_test_a94a8fe5: {
  label: "test/ — 16 files"

  Dir_test_host_c4480bb3: {
    label: "host/ — 2 files"
  }
  Dir_test_ops_ccbee1ea: {
    label: "ops/ — 1 files"
  }
  Dir_test_plugins_a1eaa08f: {
    label: "plugins/ — 1 files"
  }
  Dir_test_runtime_f0806ded: {
    label: "runtime/ — 8 files"
  }
  Dir_test_support_a2b6bf64: {
    label: "support/ — 3 files"
  }
  File_test_tsconfig_json_ecaa19a9: {
    label: "tsconfig.json"
  }
}
`;case`traceabilitySource_dir_test_a94a8fe5`:return`direction: down

TraceabilitySourceDir_test_a94a8fe5: {
  label: "test/ — 18 files"

  Dir_test_fixtures_9c0e9ecf: {
    label: "fixtures/ — 3 files"
  }
  Dir_test_lineage_2ea417d9: {
    label: "lineage/ — 13 files"
  }
  File_test_manifestJson_test_ts_08368bde: {
    label: "manifestJson.test.ts"
  }
  File_test_TraceabilityService_test_ts_5023944d: {
    label: "TraceabilityService.test.ts"
  }
}
`;case`engineSource_dir_test_adapters_3547ecba`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_adapters_3547ecba: {
  label: "adapters/ — 2 files"

  File__adapters_CircuitBreakingProviderAdapter_test_ts_3b1ac7e7: {
    label: "CircuitBreakingProviderAdapter.test.ts"
  }
  File__adapters_InMemoryProviderAdapter_cancel_test_ts_6f139f5c: {
    label: "InMemoryProviderAdapter.cancel.test.ts"
  }
}
`;case`apiSource_dir_test_app_cc1578c5`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_app_cc1578c5: {
  label: "app/ — 8 files"

  File_test_app_appEnvTestSupport_ts_0b55c0b3: {
    label: "appEnvTestSupport.ts"
  }
  File_test_app_appRoutePayloads_ts_8d8047b3: {
    label: "appRoutePayloads.ts"
  }
  File_test_app_healthReadiness_test_ts_b9a87cee: {
    label: "healthReadiness.test.ts"
  }
  File_test_app_healthReadinessAppTestSupport_ts_bccb2371: {
    label: "healthReadinessAppTestSupport.ts"
  }
  File_test_app_protectedRouteMounting_test_ts_32923370: {
    label: "protectedRouteMounting.test.ts"
  }
  File_test_app_protectedRouteMountTestSupport_ts_87f8acc2: {
    label: "protectedRouteMountTestSupport.ts"
  }
  File_test_app_protectedRuntimeAppTestSupport_ts_6a25f06c: {
    label: "protectedRuntimeAppTestSupport.ts"
  }
  File_test_app_protectedRuntimeComposition_test_ts_2ac02e42: {
    label: "protectedRuntimeComposition.test.ts"
  }
}
`;case`apiSource_dir_test_application_6e0f09c6`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_application_6e0f09c6: {
  label: "application/ — 77 files"

  Dir_test_application_ports_501c08c7: {
    label: "ports/ — 1 files"
  }
  Dir_test_application_services_21a39662: {
    label: "services/ — 67 files"
  }
  File_ication_analyzeSelectedDbtModelQuery_fixtures_ts_ce06e665: {
    label: "analyzeSelectedDbtModelQuery.fixtures.ts"
  }
  File_application_analyzeSelectedDbtModelQuery_test_ts_e8fcb987: {
    label: "analyzeSelectedDbtModelQuery.test.ts"
  }
  File_plication_canvasAuthoringAuthorityPolicy_test_ts_304ef701: {
    label: "canvasAuthoringAuthorityPolicy.test.ts"
  }
  File_t_application_compileGraphDbtModelsQuery_test_ts_18251682: {
    label: "compileGraphDbtModelsQuery.test.ts"
  }
  File_lication_dbtProjectImportProcessRecovery_test_ts_62b86dcc: {
    label: "dbtProjectImportProcessRecovery.test.ts"
  }
  File_test_application_dbtProjectImportReplay_test_ts_7d86240c: {
    label: "dbtProjectImportReplay.test.ts"
  }
  File_est_application_dbtProjectImportUseCases_test_ts_05c74d8f: {
    label: "dbtProjectImportUseCases.test.ts"
  }
  File_pplication_dbtSemanticRegionPatchPlanner_test_ts_3d5117bb: {
    label: "dbtSemanticRegionPatchPlanner.test.ts"
  }
  File_lication_projectDbtGraphFromFilesUseCase_test_ts_d1feadd8: {
    label: "projectDbtGraphFromFilesUseCase.test.ts"
  }
}
`;case`engineSource_dir_test_application_6e0f09c6`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_application_6e0f09c6: {
  label: "application/ — 2 files"

  File_test_application_providerSelection_test_ts_ee3e4d79: {
    label: "providerSelection.test.ts"
  }
  File_plication_workflowEngineUseCases_factory_test_ts_8ce48ad0: {
    label: "workflowEngineUseCases.factory.test.ts"
  }
}
`;case`apiSource_dir_test_application_ports_501c08c7`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_application_6e0f09c6Dir_test_application_ports_501c08c7: {
  label: "ports/ — 1 files"

  File_test_application_ports_accessDecision_test_ts_27a7ec24: {
    label: "accessDecision.test.ts"
  }
}
`;case`apiSource_dir_test_application_services_21a39662`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_application_6e0f09c6Dir_test_application_services_21a39662: {
  label: "services/ — 67 files"

  Dir_test_application_services_dbtDependencyEdit_b5b4bc2f: {
    label: "dbtDependencyEdit/ — 4 files"
  }
  Dir_test_application_services_dbtYamlDescriptionEdit_1cfdf04e: {
    label: "dbtYamlDescriptionEdit/ — 5 files"
  }
  Dir_on_services_graphDbtWorkspaceArtifactPublication_ff9e5c1f: {
    label: "graphDbtWorkspaceArtifactPublication/ — 1 files"
  }
  Dir_cation_services_storedPlanExecutabilityValidator_3ca633a4: {
    label: "storedPlanExecutabilityValidator/ — 4 files"
  }
  File_services_applicationArchitectureAst_artifacts_ts_db5ad76a: {
    label: "applicationArchitectureAst.artifacts.ts"
  }
  File_on_services_authorizeCommandScopeService_test_ts_1cc45fb8: {
    label: "authorizeCommandScopeService.test.ts"
  }
  File_rizeWorkspaceGraphDraftCapabilityService_test_ts_5f37b91b: {
    label: "authorizeWorkspaceGraphDraftCapabilityService.test.ts"
  }
  File_ssureAwareStartRunUseCase_admissionModes_test_ts_4bd3fd5d: {
    label: "BackpressureAwareStartRunUseCase.admissionModes.test.ts"
  }
  File_essureAwareStartRunUseCase_duplicateFlow_test_ts_f273838f: {
    label: "BackpressureAwareStartRunUseCase.duplicateFlow.test.ts"
  }
  File_reAwareStartRunUseCase_executionCapacity_test_ts_dd172aca: {
    label: "BackpressureAwareStartRunUseCase.executionCapacity.test.ts"
  }
  File_unUseCase_executionCapacityReadyzBinding_test_ts_12171fae: {
    label: "BackpressureAwareStartRunUseCase.executionCapacityReadyzBinding.test.ts"
  }
  File_BackpressureAwareStartRunUseCase_test_support_ts_0fd7a36a: {
    label: "BackpressureAwareStartRunUseCase.test.support.ts"
  }
  File_st_application_services_cancelRunUseCase_test_ts_984da725: {
    label: "cancelRunUseCase.test.ts"
  }
  File__application_services_CompilePlanUseCase_test_ts_9b903997: {
    label: "CompilePlanUseCase.test.ts"
  }
  File_pplication_services_createProjectUseCase_test_ts_c68ab947: {
    label: "createProjectUseCase.test.ts"
  }
  File_ouseConnectionUseCase_postgresCredential_test_ts_f0889476: {
    label: "createWarehouseConnectionUseCase.postgresCredential.test.ts"
  }
  File_ication_services_dbtPlanExecutionBinding_test_ts_6946169e: {
    label: "dbtPlanExecutionBinding.test.ts"
  }
  File_rojectFilesWarehouseSourceImportStrategy_test_ts_cb30ec72: {
    label: "dbtProjectFilesWarehouseSourceImportStrategy.test.ts"
  }
  File_ces_defaultStartRunExecutionCapacityPort_test_ts_8524d143: {
    label: "defaultStartRunExecutionCapacityPort.test.ts"
  }
  File_rvices_engineStartRunUseCase_commandPath_test_ts_6f8a7672: {
    label: "engineStartRunUseCase.commandPath.test.ts"
  }
  File_vices_engineStartRunUseCase_errorMapping_test_ts_c949b9fb: {
    label: "engineStartRunUseCase.errorMapping.test.ts"
  }
  File_n_services_engineStartRunUseCase_test_support_ts_a6f247a3: {
    label: "engineStartRunUseCase.test.support.ts"
  }
  File_ervices_getCostAttributionSummaryUseCase_test_ts_53013dbb: {
    label: "getCostAttributionSummaryUseCase.test.ts"
  }
  File_application_services_getRunEventsUseCase_test_ts_b440118c: {
    label: "getRunEventsUseCase.test.ts"
  }
  File_application_services_getRunStatusUseCase_test_ts_bdef21ce: {
    label: "getRunStatusUseCase.test.ts"
  }
  File__getWorkspaceGraphDraftUseCase_authority_test_ts_3a28dd9a: {
    label: "getWorkspaceGraphDraftUseCase.authority.test.ts"
  }
  File__graphDraftWarehouseSourceImportStrategy_test_ts_0faaf8bc: {
    label: "graphDraftWarehouseSourceImportStrategy.test.ts"
  }
  File_n_services_importWarehouseSourcesUseCase_test_ts_26a6ee1c: {
    label: "importWarehouseSourcesUseCase.test.ts"
  }
  File_application_services_listProjectsUseCase_test_ts_e7effd37: {
    label: "listProjectsUseCase.test.ts"
  }
  File_est_application_services_listRunsUseCase_test_ts_1a4216c9: {
    label: "listRunsUseCase.test.ts"
  }
  File_on_services_PlannerBackedStartRunUseCase_test_ts_de4146eb: {
    label: "PlannerBackedStartRunUseCase.test.ts"
  }
  File_tion_services_postgresTransformSqlPolicy_test_ts_cf3a5188: {
    label: "postgresTransformSqlPolicy.test.ts"
  }
  File_ion_services_PreviewPlanUseCase_outcomes_test_ts_f471ae5a: {
    label: "PreviewPlanUseCase.outcomes.test.ts"
  }
  File__previewWarehouseSourceObjectRowsUseCase_test_ts_51d6bab5: {
    label: "previewWarehouseSourceObjectRowsUseCase.test.ts"
  }
  File_t_application_services_recoverRunUseCase_test_ts_197b35e1: {
    label: "recoverRunUseCase.test.ts"
  }
  File_ices_resolveAuthorizedExecutableSubgraph_test_ts_0437338f: {
    label: "resolveAuthorizedExecutableSubgraph.test.ts"
  }
  File_rvices_resolveAuthorizedPreviewSelection_test_ts_676b8e80: {
    label: "resolveAuthorizedPreviewSelection.test.ts"
  }
  File_tionContextBindingUseCase_bundleSecurity_test_ts_441b5038: {
    label: "RunExecutionContextBindingUseCase.bundleSecurity.test.ts"
  }
  File_rvices_RunExecutionContextBindingUseCase_test_ts_8de9cb78: {
    label: "RunExecutionContextBindingUseCase.test.ts"
  }
  File_application_services_runOperationalTruth_test_ts_64f294ad: {
    label: "runOperationalTruth.test.ts"
  }
  File_ication_services_runRecoveryContextTrust_test_ts_dafbd30d: {
    label: "runRecoveryContextTrust.test.ts"
  }
  File_cation_services_runStartDispatchResolver_test_ts_68bb53da: {
    label: "runStartDispatchResolver.test.ts"
  }
  File__services_saveWorkspaceGraphDraftUseCase_test_ts_b136998d: {
    label: "saveWorkspaceGraphDraftUseCase.test.ts"
  }
  File_st_application_services_signalRunUseCase_test_ts_2aa362db: {
    label: "signalRunUseCase.test.ts"
  }
  File_tion_services_startRunAdmissionDecisions_test_ts_aac88725: {
    label: "startRunAdmissionDecisions.test.ts"
  }
  File_n_services_startRunTargetAdapterRegistry_test_ts_c79d246b: {
    label: "startRunTargetAdapterRegistry.test.ts"
  }
  File_on_services_StoredExecutablePlanResolver_test_ts_f707ed57: {
    label: "StoredExecutablePlanResolver.test.ts"
  }
  File__services_StoredPlanAdmissionCoordinator_test_ts_d06f85d4: {
    label: "StoredPlanAdmissionCoordinator.test.ts"
  }
  File_ication_services_StoredPlanAuthorityFlow_test_ts_66904f9b: {
    label: "StoredPlanAuthorityFlow.test.ts"
  }
  File_anRunExecutionContextRequirementResolver_test_ts_e99fc2e1: {
    label: "StoredPlanRunExecutionContextRequirementResolver.test.ts"
  }
  File_est_application_services_storedPlanScope_test_ts_a361c31b: {
    label: "storedPlanScope.test.ts"
  }
  File_ices_validatePostgresTransformSqlUseCase_test_ts_c2c3629a: {
    label: "validatePostgresTransformSqlUseCase.test.ts"
  }
  File_es_WarehouseConnectionSourceObjectReader_test_ts_e2067c8d: {
    label: "WarehouseConnectionSourceObjectReader.test.ts"
  }
  File_tion_services_warehouseSourceRemovalPlan_test_ts_81ad03e6: {
    label: "warehouseSourceRemovalPlan.test.ts"
  }
  File_application_services_warehouseSourceYaml_test_ts_c9636adc: {
    label: "warehouseSourceYaml.test.ts"
  }
  File_plication_services_WorkflowEngineFactory_test_ts_f3a5af67: {
    label: "WorkflowEngineFactory.test.ts"
  }
  File_ices_workspaceGraphDraftCapabilityPolicy_test_ts_1b6d47aa: {
    label: "workspaceGraphDraftCapabilityPolicy.test.ts"
  }
}
`;case`apiSource_dir_test_application_services_dbtDependencyEdit_b5b4bc2f`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_application_6e0f09c6Dir_test_application_services_21a39662Dir_test_application_services_dbtDependencyEdit_b5b4bc2f: {
  label: "dbtDependencyEdit/ — 4 files"

  File_lectedDbtDependencyEditCommand_conflicts_test_ts_7b6d721f: {
    label: "ApplySelectedDbtDependencyEditCommand.conflicts.test.ts"
  }
  File_lectedDbtDependencyEditCommand_happyPath_test_ts_94feaf6b: {
    label: "ApplySelectedDbtDependencyEditCommand.happyPath.test.ts"
  }
  File_electedDbtDependencyEditCommand_refusals_test_ts_d7024143: {
    label: "ApplySelectedDbtDependencyEditCommand.refusals.test.ts"
  }
  File_electedDbtDependencyEditCommand_test_fixtures_ts_a7de97f2: {
    label: "ApplySelectedDbtDependencyEditCommand.test.fixtures.ts"
  }
}
`;case`apiSource_dir_test_application_services_dbtYamlDescriptionEdit_1cfdf04e`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_application_6e0f09c6Dir_test_application_services_21a39662Dir_test_application_services_dbtYamlDescriptionEdit_1cfdf04e: {
  label: "dbtYamlDescriptionEdit/ — 5 files"

  File_nEdit_ApplyDbtYamlDescriptionEditCommand_test_ts_ee52dee4: {
    label: "ApplyDbtYamlDescriptionEditCommand.test.ts"
  }
  File_tionEdit_dbtYamlDescriptionEditIntegrity_test_ts_d7a71c06: {
    label: "dbtYamlDescriptionEditIntegrity.test.ts"
  }
  File_nEdit_DbtYamlDescriptionResourceResolver_test_ts_cf8ff546: {
    label: "DbtYamlDescriptionResourceResolver.test.ts"
  }
  File_nEdit_ProposeDbtYamlDescriptionEditQuery_test_ts_bfee19aa: {
    label: "ProposeDbtYamlDescriptionEditQuery.test.ts"
  }
  File_Edit_RevertDbtYamlDescriptionEditCommand_test_ts_2bd6fc11: {
    label: "RevertDbtYamlDescriptionEditCommand.test.ts"
  }
}
`;case`apiSource_dir_on_services_graphDbtWorkspaceArtifactPublication_ff9e5c1f`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_application_6e0f09c6Dir_test_application_services_21a39662Dir_on_services_graphDbtWorkspaceArtifactPublication_ff9e5c1f: {
  label: "graphDbtWorkspaceArtifactPublication/ — 1 files"

  File_PublishGraphDbtWorkspaceArtifactsCommand_test_ts_405ad2f9: {
    label: "PublishGraphDbtWorkspaceArtifactsCommand.test.ts"
  }
}
`;case`apiSource_dir_cation_services_storedPlanExecutabilityValidator_3ca633a4`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_application_6e0f09c6Dir_test_application_services_21a39662Dir_cation_services_storedPlanExecutabilityValidator_3ca633a4: {
  label: "storedPlanExecutabilityValidator/ — 4 files"

  File_dPlanExecutabilityValidator_capabilities_test_ts_dcc8d9c1: {
    label: "capabilities.test.ts"
  }
  File_ExecutabilityValidator_fetchAndAlignment_test_ts_e6831448: {
    label: "fetchAndAlignment.test.ts"
  }
  File_ices_storedPlanExecutabilityValidator_harness_ts_8a9b04fe: {
    label: "harness.ts"
  }
  File_toredPlanExecutabilityValidator_registry_test_ts_75220b71: {
    label: "registry.test.ts"
  }
}
`;case`engineSource_dir_test_architecture_e33c6101`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_architecture_e33c6101: {
  label: "architecture/ — 14 files"

  File_cture_adapterCircuitBreaker_architecture_test_ts_bbeb90b3: {
    label: "adapterCircuitBreaker.architecture.test.ts"
  }
  File_chitecture_engineArchitectureTestSupport_test_ts_70a09dfc: {
    label: "engineArchitectureTestSupport.test.ts"
  }
  File_st_architecture_engineArchitectureTestSupport_ts_74369a22: {
    label: "engineArchitectureTestSupport.ts"
  }
  File_ture_enginePublicApiSurface_architecture_test_ts_389f75f3: {
    label: "enginePublicApiSurface.architecture.test.ts"
  }
  File__planSchemaVersionAdmission_architecture_test_ts_bbaaa553: {
    label: "planSchemaVersionAdmission.architecture.test.ts"
  }
  File_RunApplicationDecomposition_architecture_test_ts_e7217ecf: {
    label: "startRunApplicationDecomposition.architecture.test.ts"
  }
  File_pplicationDecompositionDocs_architecture_test_ts_ef548f44: {
    label: "startRunApplicationDecompositionDocs.architecture.test.ts"
  }
  File_rkflowEngineBoundaryFitness_architecture_test_ts_3cb92a91: {
    label: "workflowEngineBoundaryFitness.architecture.test.ts"
  }
  File_flowEngineBoundaryOwnership_architecture_test_ts_3646a7d5: {
    label: "workflowEngineBoundaryOwnership.architecture.test.ts"
  }
  File_owEngineCanonicalMapHardcut_architecture_test_ts_e79cc9f8: {
    label: "workflowEngineCanonicalMapHardcut.architecture.test.ts"
  }
  File_orkflowEngineFacadeUseCases_architecture_test_ts_d3600f91: {
    label: "workflowEngineFacadeUseCases.architecture.test.ts"
  }
  File_ngineProviderTelemetrySeams_architecture_test_ts_033a818b: {
    label: "workflowEngineProviderTelemetrySeams.architecture.test.ts"
  }
  File_ineRuntimePathDecomposition_architecture_test_ts_1f60190d: {
    label: "workflowEngineRuntimePathDecomposition.architecture.test.ts"
  }
  File_rkflowEngineSemanticClosure_architecture_test_ts_71076548: {
    label: "workflowEngineSemanticClosure.architecture.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_bus_17c9bd04`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_bus_17c9bd04: {
  label: "bus/ — 1 files"

  File_test_bus_HttpEventBus_test_ts_756866f7: {
    label: "HttpEventBus.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_canary_74a0cd7f`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_canary_74a0cd7f: {
  label: "canary/ — 7 files"

  Dir_test_canary_support_37b55e06: {
    label: "support/ — 4 files"
  }
  File_canary_standaloneCanaryAcceptance_health_test_ts_295a2496: {
    label: "standaloneCanaryAcceptance.health.test.ts"
  }
  File_y_standaloneCanaryAcceptance_idempotency_test_ts_d6451929: {
    label: "standaloneCanaryAcceptance.idempotency.test.ts"
  }
  File_nary_standaloneCanaryAcceptance_ordering_test_ts_16086c06: {
    label: "standaloneCanaryAcceptance.ordering.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_canary_support_37b55e06`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_canary_74a0cd7fDir_test_canary_support_37b55e06: {
  label: "support/ — 4 files"

  File_t_canary_support_standaloneCanaryEventSupport_ts_dbe31bf5: {
    label: "standaloneCanaryEventSupport.ts"
  }
  File_st_canary_support_standaloneCanaryHostSupport_ts_fe84e40b: {
    label: "standaloneCanaryHostSupport.ts"
  }
  File_test_canary_support_standaloneCanaryHttpSink_ts_bf0d7f7e: {
    label: "standaloneCanaryHttpSink.ts"
  }
  File__canary_support_standaloneCanaryOutboxFixture_ts_937cc850: {
    label: "standaloneCanaryOutboxFixture.ts"
  }
}
`;case`plannerSource_dir_test_compiledCode_c6b8c06a`:return`direction: down

PlannerSourceDir_test_a94a8fe5Dir_test_compiledCode_c6b8c06a: {
  label: "compiledCode/ — 4 files"

  File_test_compiledCode_attachCompiledCodeRefs_test_ts_23733616: {
    label: "attachCompiledCodeRefs.test.ts"
  }
  File_mpiledCode_FileSystemCompiledCodeStorage_test_ts_5cc394b3: {
    label: "FileSystemCompiledCodeStorage.test.ts"
  }
  File_compiledCode_InMemoryCompiledCodeStorage_test_ts_edba831a: {
    label: "InMemoryCompiledCodeStorage.test.ts"
  }
  File_test_compiledCode_sha256_test_ts_f64a4f58: {
    label: "sha256.test.ts"
  }
}
`;case`apiSource_dir_test_contracts_48fc2dfb`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_contracts_48fc2dfb: {
  label: "contracts/ — 1 files"

  File_racts_adminRebuildSnapshotAccessContract_test_ts_79edda43: {
    label: "adminRebuildSnapshotAccessContract.test.ts"
  }
}
`;case`engineSource_dir_test_contracts_48fc2dfb`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_contracts_48fc2dfb: {
  label: "contracts/ — 12 files"

  Dir_test_contracts_plans_a8dec7ea: {
    label: "plans/ — 3 files"
  }
  File_test_contracts_capabilities_contract_test_ts_b6d56d32: {
    label: "capabilities.contract.test.ts"
  }
  File_test_contracts_engine_test_ts_93987600: {
    label: "engine.test.ts"
  }
  File_test_contracts_errorI18n_contract_test_ts_05e6db05: {
    label: "errorI18n.contract.test.ts"
  }
  File_test_contracts_executionPlan_contract_test_ts_d9711253: {
    label: "executionPlan.contract.test.ts"
  }
  File_test_contracts_helpers_ts_e2398a22: {
    label: "helpers.ts"
  }
  File_test_contracts_IWorkflowEngine_types_test_ts_42b3658f: {
    label: "IWorkflowEngine.types.test.ts"
  }
  File_test_contracts_package-surface_test_ts_17835ba7: {
    label: "package-surface.test.ts"
  }
  File_test_contracts_PlanSchemaVersionPolicy_test_ts_95cbf35a: {
    label: "PlanSchemaVersionPolicy.test.ts"
  }
  File_test_contracts_run-golden-paths_hash_test_ts_c53d418d: {
    label: "run-golden-paths.hash.test.ts"
  }
}
`;case`engineSource_dir_test_contracts_plans_a8dec7ea`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_contracts_48fc2dfbDir_test_contracts_plans_a8dec7ea: {
  label: "plans/ — 3 files"

  File_test_contracts_plans_plan-cancel-and-resume_json_1494e756: {
    label: "plan-cancel-and-resume.json"
  }
  File_test_contracts_plans_plan-minimal_json_45fae709: {
    label: "plan-minimal.json"
  }
  File_test_contracts_plans_plan-parallel_json_80a9487d: {
    label: "plan-parallel.json"
  }
}
`;case`engineSource_dir_test_core_582745be`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_core_582745be: {
  label: "core/ — 8 files"

  File_test_core_SnapshotProjector_transitions_test_ts_9a74cef0: {
    label: "SnapshotProjector.transitions.test.ts"
  }
  File_test_core_WorkflowEngine_helpers_ts_7bbbe6c2: {
    label: "WorkflowEngine.helpers.ts"
  }
  File_e_WorkflowEngine_intent-id-deterministic_test_ts_7028ef82: {
    label: "WorkflowEngine.intent-id-deterministic.test.ts"
  }
  File_test_core_WorkflowEngine_intentLog_test_ts_181312f3: {
    label: "WorkflowEngine.intentLog.test.ts"
  }
  File_test_core_WorkflowEngine_observability_test_ts_60288d7e: {
    label: "WorkflowEngine.observability.test.ts"
  }
  File_test_core_WorkflowEngine_planRef_test_ts_9859cc26: {
    label: "WorkflowEngine.planRef.test.ts"
  }
  File_test_core_WorkflowEngine_test_ts_c074fa84: {
    label: "WorkflowEngine.test.ts"
  }
  File_test_core_WorkflowEngineCoreService_test_ts_b51da3f7: {
    label: "WorkflowEngineCoreService.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_db_cdf1fabf`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_db_cdf1fabf: {
  label: "db/ — 1 files"

  File_test_db_pool_test_ts_20d13277: {
    label: "pool.test.ts"
  }
}
`;case`engineSource_dir_test_domain_f501813d`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_domain_f501813d: {
  label: "domain/ — 1 files"

  File_test_domain_startRunIntentPolicy_test_ts_5b5ea1ff: {
    label: "startRunIntentPolicy.test.ts"
  }
}
`;case`apiSource_dir_test_entrypoints_9471002b`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_entrypoints_9471002b: {
  label: "entrypoints/ — 66 files"

  Dir_test_entrypoints_http_bc59118d: {
    label: "http/ — 66 files"
  }
}
`;case`apiSource_dir_test_entrypoints_http_bc59118d`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_entrypoints_9471002bDir_test_entrypoints_http_bc59118d: {
  label: "http/ — 66 files"

  File_test_entrypoints_http_adminRoutes_test_ts_40276716: {
    label: "adminRoutes.test.ts"
  }
  File_test_entrypoints_http_cancelRunRoute_test_ts_62ab31ad: {
    label: "cancelRunRoute.test.ts"
  }
  File_st_entrypoints_http_cancelRunRouteParser_test_ts_149e9e78: {
    label: "cancelRunRouteParser.test.ts"
  }
  File_test_entrypoints_http_capabilitiesRoutes_test_ts_f3f9cfec: {
    label: "capabilitiesRoutes.test.ts"
  }
  File_test_entrypoints_http_compilePlanRoute_test_ts_66c0f090: {
    label: "compilePlanRoute.test.ts"
  }
  File_entrypoints_http_dbtDependencyEditRoutes_test_ts_a203090e: {
    label: "dbtDependencyEditRoutes.test.ts"
  }
  File_t_entrypoints_http_dbtProjectGraphRoutes_test_ts_d02084f7: {
    label: "dbtProjectGraphRoutes.test.ts"
  }
  File__entrypoints_http_dbtProjectImportRoutes_test_ts_3da10ce5: {
    label: "dbtProjectImportRoutes.test.ts"
  }
  File_ints_http_dbtSelectedModelAnalysisRoutes_test_ts_a5551e74: {
    label: "dbtSelectedModelAnalysisRoutes.test.ts"
  }
  File_points_http_dbtYamlDescriptionEditRoutes_test_ts_99b0ac90: {
    label: "dbtYamlDescriptionEditRoutes.test.ts"
  }
  File__entrypoints_http_executePlanRouteFacade_test_ts_e8cbc75f: {
    label: "executePlanRouteFacade.test.ts"
  }
  File_test_entrypoints_http_extractBearerToken_test_ts_2d5e9502: {
    label: "extractBearerToken.test.ts"
  }
  File_ints_http_getCostAttributionSummaryRoute_test_ts_09669edc: {
    label: "getCostAttributionSummaryRoute.test.ts"
  }
  File_test_entrypoints_http_getRunEventsRoute_test_ts_92c465ee: {
    label: "getRunEventsRoute.test.ts"
  }
  File_test_entrypoints_http_getRunRoute_test_ts_5407a712: {
    label: "getRunRoute.test.ts"
  }
  File_test_entrypoints_http_getRunRouteParser_test_ts_1108c3a8: {
    label: "getRunRouteParser.test.ts"
  }
  File_ints_http_graphDbtModelCompilationRoutes_test_ts_43c42fe6: {
    label: "graphDbtModelCompilationRoutes.test.ts"
  }
  File_aphDbtWorkspaceArtifactPublicationRoutes_test_ts_e681b78b: {
    label: "graphDbtWorkspaceArtifactPublicationRoutes.test.ts"
  }
  File_ntrypoints_http_httpBearerAuthentication_test_ts_e2286933: {
    label: "httpBearerAuthentication.test.ts"
  }
  File_tp_httpErrorTranslation_respondAndStatic_test_ts_ced2d4f3: {
    label: "httpErrorTranslation.respondAndStatic.test.ts"
  }
  File__http_httpErrorTranslation_runtimeDomain_test_ts_1c7b7274: {
    label: "httpErrorTranslation.runtimeDomain.test.ts"
  }
  File_httpErrorTranslation_startRunEngineError_test_ts_5d9bf748: {
    label: "httpErrorTranslation.startRunEngineError.test.ts"
  }
  File_http_httpErrorTranslation_startRunResult_test_ts_041cb528: {
    label: "httpErrorTranslation.startRunResult.test.ts"
  }
  File_points_http_httpErrorTranslation_test_support_ts_d6972952: {
    label: "httpErrorTranslation.test.support.ts"
  }
  File_test_entrypoints_http_importPlanRoute_test_ts_5f87c285: {
    label: "importPlanRoute.test.ts"
  }
  File_test_entrypoints_http_listRunsRoute_test_ts_8053f9a6: {
    label: "listRunsRoute.test.ts"
  }
  File_est_entrypoints_http_listRunsRouteParser_test_ts_e70b2ba9: {
    label: "listRunsRouteParser.test.ts"
  }
  File_test_entrypoints_http_planRouteFixtures_ts_94e76acc: {
    label: "planRouteFixtures.ts"
  }
  File_est_entrypoints_http_planRouteHttpTestSupport_ts_7a9ef6fc: {
    label: "planRouteHttpTestSupport.ts"
  }
  File__entrypoints_http_planRouteParserHelpers_test_ts_e617d9d4: {
    label: "planRouteParserHelpers.test.ts"
  }
  File_trypoints_http_planRoutePlanSourcePolicy_test_ts_730bf029: {
    label: "planRoutePlanSourcePolicy.test.ts"
  }
  File_ntrypoints_http_planRouteRequestResolver_test_ts_61debf1d: {
    label: "planRouteRequestResolver.test.ts"
  }
  File_test_entrypoints_http_planRouteScope_test_ts_02194f4c: {
    label: "planRouteScope.test.ts"
  }
  File_ntrypoints_http_planRouteSelectionParser_test_ts_70dfd147: {
    label: "planRouteSelectionParser.test.ts"
  }
  File_t_entrypoints_http_previewPlanRoute_auth_test_ts_350e9500: {
    label: "previewPlanRoute.auth.test.ts"
  }
  File_points_http_previewPlanRoute_inputPolicy_test_ts_b76c1c1e: {
    label: "previewPlanRoute.inputPolicy.test.ts"
  }
  File_trypoints_http_previewPlanRoute_outcomes_test_ts_fd45e6d9: {
    label: "previewPlanRoute.outcomes.test.ts"
  }
  File__entrypoints_http_previewPlanRouteTestSupport_ts_7a6fd3c7: {
    label: "previewPlanRouteTestSupport.ts"
  }
  File_entrypoints_http_projectOnboardingRoutes_test_ts_8e11a2ca: {
    label: "projectOnboardingRoutes.test.ts"
  }
  File_s_http_protectedRuntimeRouteDependencies_test_ts_880dc6ef: {
    label: "protectedRuntimeRouteDependencies.test.ts"
  }
  File_test_entrypoints_http_recoverRunRoute_test_ts_d418e30a: {
    label: "recoverRunRoute.test.ts"
  }
  File_t_entrypoints_http_recoverRunRouteParser_test_ts_2c987889: {
    label: "recoverRunRouteParser.test.ts"
  }
  File_ints_http_registerProtectedRuntimeRoutes_test_ts_0f727d4c: {
    label: "registerProtectedRuntimeRoutes.test.ts"
  }
  File_st_entrypoints_http_retiredRuntimeRoutes_test_ts_e72aad37: {
    label: "retiredRuntimeRoutes.test.ts"
  }
  File_oints_http_routeDependencyContracts_typecheck_ts_13057126: {
    label: "routeDependencyContracts.typecheck.ts"
  }
  File__entrypoints_http_runCommandFieldParsers_test_ts_af991d85: {
    label: "runCommandFieldParsers.test.ts"
  }
  File_entrypoints_http_runCommandRouteExecutor_test_ts_df0a3707: {
    label: "runCommandRouteExecutor.test.ts"
  }
  File_test_entrypoints_http_sessionRoute_test_ts_17880e86: {
    label: "sessionRoute.test.ts"
  }
  File_test_entrypoints_http_signalRunRoute_test_ts_2b8c5610: {
    label: "signalRunRoute.test.ts"
  }
  File_st_entrypoints_http_signalRunRouteParser_test_ts_81ec6857: {
    label: "signalRunRouteParser.test.ts"
  }
  File_test_entrypoints_http_startRunIdentity_test_ts_6a4ec195: {
    label: "startRunIdentity.test.ts"
  }
  File_points_http_startRunRoute_authAndSuccess_test_ts_2f95c624: {
    label: "startRunRoute.authAndSuccess.test.ts"
  }
  File_ttp_startRunRoute_engineErrorTranslation_test_ts_c52cf2be: {
    label: "startRunRoute.engineErrorTranslation.test.ts"
  }
  File_ints_http_startRunRoute_planSourcePolicy_test_ts_94741649: {
    label: "startRunRoute.planSourcePolicy.test.ts"
  }
  File_nts_http_startRunRoute_resultTranslation_test_ts_0edcd205: {
    label: "startRunRoute.resultTranslation.test.ts"
  }
  File_t_entrypoints_http_startRunRoute_test_support_ts_2bee96e8: {
    label: "startRunRoute.test.support.ts"
  }
  File_ntrypoints_http_startRunRoute_validation_test_ts_63ec4d2a: {
    label: "startRunRoute.validation.test.ts"
  }
  File_ypoints_http_startRunRouteCommandBuilder_test_ts_cfa630d2: {
    label: "startRunRouteCommandBuilder.test.ts"
  }
  File_ts_http_startRunRouteTargetAdapterParser_test_ts_1b51e764: {
    label: "startRunRouteTargetAdapterParser.test.ts"
  }
  File_ypoints_http_warehouseSourceImportRoutes_test_ts_79abc3a6: {
    label: "warehouseSourceImportRoutes.test.ts"
  }
  File_t_entrypoints_http_workspaceContextRoute_test_ts_bea94c68: {
    label: "workspaceContextRoute.test.ts"
  }
  File_rypoints_http_workspaceDiffChangesRoutes_test_ts_51def498: {
    label: "workspaceDiffChangesRoutes.test.ts"
  }
  File_rypoints_http_workspaceFileHistoryRoutes_test_ts_26e2a38a: {
    label: "workspaceFileHistoryRoutes.test.ts"
  }
  File_st_entrypoints_http_workspaceFilesRoutes_test_ts_a55b2c83: {
    label: "workspaceFilesRoutes.test.ts"
  }
  File_trypoints_http_workspaceGraphDraftRoutes_test_ts_bf1be957: {
    label: "workspaceGraphDraftRoutes.test.ts"
  }
  File_points_http_workspacePluginCatalogRoutes_test_ts_5ab9c44d: {
    label: "workspacePluginCatalogRoutes.test.ts"
  }
}
`;case`apiSource_dir_test_fixtures_9c0e9ecf`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_fixtures_9c0e9ecf: {
  label: "fixtures/ — 3 files"

  Dir_test_fixtures_planner_46960739: {
    label: "planner/ — 1 files"
  }
  File_test_fixtures_workflowSnapshotFixture_ts_6576dbda: {
    label: "workflowSnapshotFixture.ts"
  }
  File_test_fixtures_workspaceGraphDraftFixture_ts_0de1ac4a: {
    label: "workspaceGraphDraftFixture.ts"
  }
}
`;case`contractsSource_dir_test_fixtures_9c0e9ecf`:return`direction: down

ContractsSourceDir_test_a94a8fe5Dir_test_fixtures_9c0e9ecf: {
  label: "fixtures/ — 4 files"

  File_test_fixtures_dvtSubstraitSemanticDocument_ts_716900ec: {
    label: "dvtSubstraitSemanticDocument.ts"
  }
  File_test_fixtures_planner-contract_fixtures_ts_fdde88ab: {
    label: "planner-contract.fixtures.ts"
  }
  File_fixtures_run-event-compiled-code-ref_fixtures_ts_f4e10a8a: {
    label: "run-event-compiled-code-ref.fixtures.ts"
  }
  File_test_fixtures_start-run-boundary_fixtures_ts_478c4b8c: {
    label: "start-run-boundary.fixtures.ts"
  }
}
`;case`plannerSource_dir_test_fixtures_9c0e9ecf`:return`direction: down

PlannerSourceDir_test_a94a8fe5Dir_test_fixtures_9c0e9ecf: {
  label: "fixtures/ — 1 files"

  File_test_fixtures_dbt-manifest_fixtures_ts_3308ab9a: {
    label: "dbt-manifest.fixtures.ts"
  }
}
`;case`traceabilitySource_dir_test_fixtures_9c0e9ecf`:return`direction: down

TraceabilitySourceDir_test_a94a8fe5Dir_test_fixtures_9c0e9ecf: {
  label: "fixtures/ — 3 files"

  Dir_test_fixtures_lineage_5eaa077a: {
    label: "lineage/ — 3 files"
  }
}
`;case`traceabilitySource_dir_test_fixtures_lineage_5eaa077a`:return`direction: down

TraceabilitySourceDir_test_a94a8fe5Dir_test_fixtures_9c0e9ecfDir_test_fixtures_lineage_5eaa077a: {
  label: "lineage/ — 3 files"

  File_test_fixtures_lineage_mapper-fail-open_json_c7c24ac2: {
    label: "mapper-fail-open.json"
  }
  File_test_fixtures_lineage_mapper-no-ref_json_43239410: {
    label: "mapper-no-ref.json"
  }
  File_test_fixtures_lineage_mapper-success_json_f02f8f87: {
    label: "mapper-success.json"
  }
}
`;case`apiSource_dir_test_fixtures_planner_46960739`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_fixtures_9c0e9ecfDir_test_fixtures_planner_46960739: {
  label: "planner/ — 1 files"

  File_test_fixtures_planner_basic-manifest_json_7a8d99df: {
    label: "basic-manifest.json"
  }
}
`;case`deliverySource_dir_test_gaps_38afa409`:return`direction: down

DeliverySourceDir_test_a94a8fe5Dir_test_gaps_38afa409: {
  label: "gaps/ — 1 files"

  File_test_gaps_StartRunAdmissionGuard_test_ts_4102c0dd: {
    label: "StartRunAdmissionGuard.test.ts"
  }
}
`;case`engineSource_dir_test_gaps_38afa409`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_gaps_38afa409: {
  label: "gaps/ — 1 files"

  File_test_gaps_PlanAdmissionPolicy_test_ts_ab03457b: {
    label: "PlanAdmissionPolicy.test.ts"
  }
}
`;case`postgresAdapterSource_dir_test_helpers_a3c41c9e`:return`direction: down

PostgresAdapterSourceDir_test_a94a8fe5Dir_test_helpers_a3c41c9e: {
  label: "helpers/ — 5 files"

  File_test_helpers_lineageOutboxIntegrationHarness_ts_082a5bbf: {
    label: "lineageOutboxIntegrationHarness.ts"
  }
  File_test_helpers_lineageOutboxUnitSupport_ts_789db30f: {
    label: "lineageOutboxUnitSupport.ts"
  }
  File_test_helpers_postgresIntegrationHarness_ts_4d64b2d6: {
    label: "postgresIntegrationHarness.ts"
  }
  File_test_helpers_postgresRlsProofHarness_ts_080c2bff: {
    label: "postgresRlsProofHarness.ts"
  }
  File_test_helpers_runEventFixtures_ts_4c51a4db: {
    label: "runEventFixtures.ts"
  }
}
`;case`temporalAdapterSource_dir_test_helpers_a3c41c9e`:return`direction: down

TemporalAdapterSourceDir_test_a94a8fe5Dir_test_helpers_a3c41c9e: {
  label: "helpers/ — 11 files"

  Dir_test_helpers_integration_5893c921: {
    label: "integration/ — 6 files"
  }
  File_test_helpers_contractFixtures_ts_7205439e: {
    label: "contractFixtures.ts"
  }
  File_test_helpers_lookupRunRefHarness_ts_5fde5b31: {
    label: "lookupRunRefHarness.ts"
  }
  File_test_helpers_mockObservability_ts_92ea5d88: {
    label: "mockObservability.ts"
  }
  File_test_helpers_testExecutors_ts_7b772381: {
    label: "testExecutors.ts"
  }
  File_test_helpers_workflowComponentGuideSupport_ts_b712683d: {
    label: "workflowComponentGuideSupport.ts"
  }
}
`;case`engineSource_dir_test_helpers_a3c41c9e`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_helpers_a3c41c9e: {
  label: "helpers/ — 2 files"

  File_test_helpers_runLifecycle_fixture_ts_2f79375f: {
    label: "runLifecycle.fixture.ts"
  }
  File_test_helpers_workflowEngine_fixture_ts_d09ead63: {
    label: "workflowEngine.fixture.ts"
  }
}
`;case`temporalAdapterSource_dir_test_helpers_integration_5893c921`:return`direction: down

TemporalAdapterSourceDir_test_a94a8fe5Dir_test_helpers_a3c41c9eDir_test_helpers_integration_5893c921: {
  label: "integration/ — 6 files"

  File_test_helpers_integration_dbtRuntimeFixtures_ts_4596c489: {
    label: "dbtRuntimeFixtures.ts"
  }
  File_test_helpers_integration_runtimeState_ts_07553e9b: {
    label: "runtimeState.ts"
  }
  File_test_helpers_integration_testActivities_ts_5e4ff930: {
    label: "testActivities.ts"
  }
  File_test_helpers_integration_testPlans_ts_fca482ec: {
    label: "testPlans.ts"
  }
  File_test_helpers_integration_waitForCondition_ts_7c83c70c: {
    label: "waitForCondition.ts"
  }
  File_test_helpers_integration_workflowArtifacts_ts_58b23f11: {
    label: "workflowArtifacts.ts"
  }
}
`;case`outboxWorkerSource_dir_test_host_c4480bb3`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_host_c4480bb3: {
  label: "host/ — 1 files"

  File_test_host_runOutboxWorkerHost_test_ts_9664ec50: {
    label: "runOutboxWorkerHost.test.ts"
  }
}
`;case`temporalWorkerSource_dir_test_host_c4480bb3`:return`direction: down

TemporalWorkerSourceDir_test_a94a8fe5Dir_test_host_c4480bb3: {
  label: "host/ — 2 files"

  File_t_objectFilePostgres_service_integration_test_ts_286f9c8f: {
    label: "objectFilePostgres.service.integration.test.ts"
  }
  File_test_host_runTemporalWorkerHost_test_ts_5118b9aa: {
    label: "runTemporalWorkerHost.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_a5060869`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869: {
  label: "infrastructure/ — 49 files"

  Dir_test_infrastructure_admissionTelemetry_4e07896c: {
    label: "admissionTelemetry/ — 2 files"
  }
  Dir_test_infrastructure_audit_f2b81c8c: {
    label: "audit/ — 1 files"
  }
  Dir_test_infrastructure_auth_deec81cf: {
    label: "auth/ — 5 files"
  }
  Dir_test_infrastructure_backpressure_c066b1bc: {
    label: "backpressure/ — 5 files"
  }
  Dir_test_infrastructure_canvasAuthoringAuthority_0d21a409: {
    label: "canvasAuthoringAuthority/ — 1 files"
  }
  Dir_test_infrastructure_dbt_160d71d0: {
    label: "dbt/ — 17 files"
  }
  Dir_test_infrastructure_dbtDependencyEdit_554ec98e: {
    label: "dbtDependencyEdit/ — 1 files"
  }
  Dir_test_infrastructure_dbtYamlDescriptionEdit_40bb84a8: {
    label: "dbtYamlDescriptionEdit/ — 2 files"
  }
  Dir_test_infrastructure_executionCapacity_0f11c491: {
    label: "executionCapacity/ — 1 files"
  }
  Dir_test_infrastructure_runControl_c6d32e8a: {
    label: "runControl/ — 1 files"
  }
  Dir_test_infrastructure_startRun_bc70c7d5: {
    label: "startRun/ — 2 files"
  }
  Dir_test_infrastructure_telemetry_e2763a7d: {
    label: "telemetry/ — 2 files"
  }
  Dir_test_infrastructure_warehouseSourceImport_38e910ea: {
    label: "warehouseSourceImport/ — 4 files"
  }
  Dir_test_infrastructure_workspaceFiles_afaacf1b: {
    label: "workspaceFiles/ — 4 files"
  }
  Dir_test_infrastructure_workspacePlugins_512d0064: {
    label: "workspacePlugins/ — 1 files"
  }
}
`;case`apiSource_dir_test_infrastructure_admissionTelemetry_4e07896c`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_admissionTelemetry_4e07896c: {
  label: "admissionTelemetry/ — 2 files"

  File_elemetry_ObservabilityAdmissionTelemetry_test_ts_b063b6c7: {
    label: "ObservabilityAdmissionTelemetry.test.ts"
  }
  File_servabilityBackpressureCapacityTelemetry_test_ts_8b003e11: {
    label: "ObservabilityBackpressureCapacityTelemetry.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_audit_f2b81c8c`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_audit_f2b81c8c: {
  label: "audit/ — 1 files"

  File_structure_audit_PostgresAuthAuditAdapter_test_ts_74a678f9: {
    label: "PostgresAuthAuditAdapter.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_auth_deec81cf`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_auth_deec81cf: {
  label: "auth/ — 5 files"

  File_cture_auth_embeddedAccessDecisionService_test_ts_f71b259b: {
    label: "embeddedAccessDecisionService.test.ts"
  }
  File_re_auth_embeddedPrincipalGrantRepository_test_ts_ad8be20b: {
    label: "embeddedPrincipalGrantRepository.test.ts"
  }
  File_auth_embeddedProjectOnboardingRepository_test_ts_7ef97d77: {
    label: "embeddedProjectOnboardingRepository.test.ts"
  }
  File_cture_auth_embeddedWorkspaceContextQuery_test_ts_101fa826: {
    label: "embeddedWorkspaceContextQuery.test.ts"
  }
  File_st_infrastructure_auth_oidcAuthenticator_test_ts_ad9904b6: {
    label: "oidcAuthenticator.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_backpressure_c066b1bc`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_backpressure_c066b1bc: {
  label: "backpressure/ — 5 files"

  File_ure_backpressure_CachedBackpressureStore_test_ts_3cfc6741: {
    label: "CachedBackpressureStore.test.ts"
  }
  File_ressure_CircuitBreakingBackpressureStore_test_ts_656b5758: {
    label: "CircuitBreakingBackpressureStore.test.ts"
  }
  File_ckpressure_FileBackpressureFallbackStore_test_ts_6b33fa63: {
    label: "FileBackpressureFallbackStore.test.ts"
  }
  File_ressure_MetricsEmittingBackpressureStore_test_ts_2252b82e: {
    label: "MetricsEmittingBackpressureStore.test.ts"
  }
  File_ure_backpressure_RawSqlBackpressureStore_test_ts_228ba541: {
    label: "RawSqlBackpressureStore.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_canvasAuthoringAuthority_0d21a409`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_canvasAuthoringAuthority_0d21a409: {
  label: "canvasAuthoringAuthority/ — 1 files"

  File_ty_PostgresCanvasAuthoringAuthorityStore_test_ts_3e8961e3: {
    label: "PostgresCanvasAuthoringAuthorityStore.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_dbt_160d71d0`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_dbt_160d71d0: {
  label: "dbt/ — 17 files"

  File__ArtifactBackedRunExecutionContextWriter_test_ts_99c78099: {
    label: "ArtifactBackedRunExecutionContextWriter.test.ts"
  }
  File_redDbtExecutionConnectionBindingVerifier_test_ts_652f5dd4: {
    label: "ConfiguredDbtExecutionConnectionBindingVerifier.test.ts"
  }
  File_dbt_ConfiguredDbtExecutionTargetResolver_test_ts_68b13147: {
    label: "ConfiguredDbtExecutionTargetResolver.test.ts"
  }
  File_st_infrastructure_dbt_dbtAnalyzerProcess_test_ts_9b558a51: {
    label: "dbtAnalyzerProcess.test.ts"
  }
  File_infrastructure_dbt_DbtCliProjectAnalyzer_test_ts_7a90979e: {
    label: "DbtCliProjectAnalyzer.test.ts"
  }
  File_cture_dbt_DbtCliProjectCandidateAnalyzer_test_ts_5828615c: {
    label: "DbtCliProjectCandidateAnalyzer.test.ts"
  }
  File_infrastructure_dbt_dbtManifestProjection_test_ts_8b3d3df7: {
    label: "dbtManifestProjection.test.ts"
  }
  File_frastructure_dbt_DbtProjectBundleBuilder_test_ts_af06af58: {
    label: "DbtProjectBundleBuilder.test.ts"
  }
  File_astructure_dbt_dbtProjectContentRevision_test_ts_224c524f: {
    label: "dbtProjectContentRevision.test.ts"
  }
  File__infrastructure_dbt_dbtProjectPathPolicy_test_ts_220a604f: {
    label: "dbtProjectPathPolicy.test.ts"
  }
  File_rastructure_dbt_dbtProjectSourceSnapshot_test_ts_950a01fc: {
    label: "dbtProjectSourceSnapshot.test.ts"
  }
  File_tructure_dbt_dbtSemanticRegionProjection_test_ts_fc908b44: {
    label: "dbtSemanticRegionProjection.test.ts"
  }
  File_t_FileRunExecutionContextReferenceReader_test_ts_a6e3e48a: {
    label: "FileRunExecutionContextReferenceReader.test.ts"
  }
  File_tructure_dbt_immutableFileArtifactWriter_test_ts_fa8ecdb9: {
    label: "immutableFileArtifactWriter.test.ts"
  }
  File_cture_dbt_LocalDbtProjectImportInspector_test_ts_d90c4394: {
    label: "LocalDbtProjectImportInspector.test.ts"
  }
  File_dbt_PostgresDbtProjectImportProcessStore_test_ts_3703c12a: {
    label: "PostgresDbtProjectImportProcessStore.test.ts"
  }
  File_ture_dbt_runExecutionContextArtifactPath_test_ts_6eacc2e0: {
    label: "runExecutionContextArtifactPath.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_dbtDependencyEdit_554ec98e`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_dbtDependencyEdit_554ec98e: {
  label: "dbtDependencyEdit/ — 1 files"

  File_LocalDbtDependencyEditPublicationGateway_test_ts_061ccaaa: {
    label: "LocalDbtDependencyEditPublicationGateway.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_dbtYamlDescriptionEdit_40bb84a8`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_dbtYamlDescriptionEdit_40bb84a8: {
  label: "dbtYamlDescriptionEdit/ — 2 files"

  File_ceMetadataDbtYamlDescriptionReceiptStore_test_ts_dd6f6988: {
    label: "WorkspaceMetadataDbtYamlDescriptionReceiptStore.test.ts"
  }
  File_riptionEdit_YamlCstDbtDescriptionMutator_test_ts_8427f15e: {
    label: "YamlCstDbtDescriptionMutator.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_executionCapacity_0f11c491`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_executionCapacity_0f11c491: {
  label: "executionCapacity/ — 1 files"

  File_emporalWorkerReadyzExecutionCapacityPort_test_ts_bfa2f377: {
    label: "TemporalWorkerReadyzExecutionCapacityPort.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_runControl_c6d32e8a`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_runControl_c6d32e8a: {
  label: "runControl/ — 1 files"

  File_Control_RunEventCancellationReceiptStore_test_ts_18ba1854: {
    label: "RunEventCancellationReceiptStore.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_startRun_bc70c7d5`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_startRun_bc70c7d5: {
  label: "startRun/ — 2 files"

  File_rtifactBackedRunExecutionContextResolver_test_ts_036d97bc: {
    label: "ArtifactBackedRunExecutionContextResolver.test.ts"
  }
  File_cture_startRun_PostgresDuplicateRunProbe_test_ts_c2506cdc: {
    label: "PostgresDuplicateRunProbe.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_telemetry_e2763a7d`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_telemetry_e2763a7d: {
  label: "telemetry/ — 2 files"

  File_emetry_ObservabilityStartRunSlaTelemetry_test_ts_44455d25: {
    label: "ObservabilityStartRunSlaTelemetry.test.ts"
  }
  File_telemetry_SafeRunSnapshotStalenessReader_test_ts_799e3652: {
    label: "SafeRunSnapshotStalenessReader.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_warehouseSourceImport_38e910ea`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_warehouseSourceImport_38e910ea: {
  label: "warehouseSourceImport/ — 4 files"

  File_mport_postgresSourceObjectMetricEvidence_test_ts_3cf4eb06: {
    label: "postgresSourceObjectMetricEvidence.test.ts"
  }
  File_t_WorkspacePostgresTransformSqlValidator_test_ts_757f043f: {
    label: "WorkspacePostgresTransformSqlValidator.test.ts"
  }
  File_port_WorkspaceWarehouseConnectionCatalog_test_ts_d89b53b5: {
    label: "WorkspaceWarehouseConnectionCatalog.test.ts"
  }
  File_Import_WorkspaceWarehouseConnectionProbe_test_ts_61b16f5e: {
    label: "WorkspaceWarehouseConnectionProbe.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_workspaceFiles_afaacf1b`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_workspaceFiles_afaacf1b: {
  label: "workspaceFiles/ — 4 files"

  File_s_LocalWorkspaceFileBatchMutationGateway_test_ts_0b659ac9: {
    label: "LocalWorkspaceFileBatchMutationGateway.test.ts"
  }
  File_es_LocalWorkspaceFileMutationCoordinator_test_ts_7595d85f: {
    label: "LocalWorkspaceFileMutationCoordinator.test.ts"
  }
  File_kspaceFiles_LocalWorkspaceFileRepository_test_ts_e3a3e147: {
    label: "LocalWorkspaceFileRepository.test.ts"
  }
  File_les_LocalWorkspaceMetadataFileRepository_test_ts_41095599: {
    label: "LocalWorkspaceMetadataFileRepository.test.ts"
  }
}
`;case`apiSource_dir_test_infrastructure_workspacePlugins_512d0064`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_infrastructure_a5060869Dir_test_infrastructure_workspacePlugins_512d0064: {
  label: "workspacePlugins/ — 1 files"

  File_EmbeddedWorkspacePluginCatalogRepository_test_ts_e79023dd: {
    label: "EmbeddedWorkspacePluginCatalogRepository.test.ts"
  }
}
`;case`apiSource_dir_test_integration_6de70f9e`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_integration_6de70f9e: {
  label: "integration/ — 16 files"

  File_test_integration_plannerEngineContract_test_ts_adf57f82: {
    label: "plannerEngineContract.test.ts"
  }
  File_ation_protectedRuntime_integration_assertions_ts_39f0292e: {
    label: "protectedRuntime.integration.assertions.ts"
  }
  File_integration_protectedRuntime_integration_auth_ts_fd58101a: {
    label: "protectedRuntime.integration.auth.ts"
  }
  File_ration_protectedRuntime_integration_bootstrap_ts_a4f8e803: {
    label: "protectedRuntime.integration.bootstrap.ts"
  }
  File_egration_protectedRuntime_integration_harness_ts_48e793af: {
    label: "protectedRuntime.integration.harness.ts"
  }
  File_integration_protectedRuntime_integration_http_ts_7d3ad430: {
    label: "protectedRuntime.integration.http.ts"
  }
  File_tion_protectedRuntime_integration_persistence_ts_db3c0160: {
    label: "protectedRuntime.integration.persistence.ts"
  }
  File_rotectedRuntime_integration_runtime_scenarios_ts_29bda393: {
    label: "protectedRuntime.integration.runtime.scenarios.ts"
  }
  File_Runtime_integration_selectedClosure_scenarios_ts_081f0fa5: {
    label: "protectedRuntime.integration.selectedClosure.scenarios.ts"
  }
  File_tegration_protectedRuntime_integration_shared_ts_820c7ff9: {
    label: "protectedRuntime.integration.shared.ts"
  }
  File_integration_protectedRuntime_integration_test_ts_f750e8d7: {
    label: "protectedRuntime.integration.test.ts"
  }
  File_dRuntime_integration_workspaceDraft_scenarios_ts_4d0ad3c2: {
    label: "protectedRuntime.integration.workspaceDraft.scenarios.ts"
  }
  File_ion_startRunOpenTelemetry_integration_support_ts_fd5b5fda: {
    label: "startRunOpenTelemetry.integration.support.ts"
  }
  File_ration_startRunOpenTelemetry_integration_test_ts_622c5548: {
    label: "startRunOpenTelemetry.integration.test.ts"
  }
  File_orkspaceGraphDraftSemanticPersistence_support_ts_46f6236b: {
    label: "workspaceGraphDraftSemanticPersistence.support.ts"
  }
  File_n_workspaceGraphDraftSemanticPersistence_test_ts_72511e66: {
    label: "workspaceGraphDraftSemanticPersistence.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_integration_6de70f9e`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_integration_6de70f9e: {
  label: "integration/ — 1 files"

  File_t_integration_workerEndToEnd_integration_test_ts_5c4bdef6: {
    label: "workerEndToEnd.integration.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_lifecycle_8592082a`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_lifecycle_8592082a: {
  label: "lifecycle/ — 1 files"

  File_ifecycle_stopRuntimeAndOperationalServer_test_ts_2e8370cb: {
    label: "stopRuntimeAndOperationalServer.test.ts"
  }
}
`;case`traceabilitySource_dir_test_lineage_2ea417d9`:return`direction: down

TraceabilitySourceDir_test_a94a8fe5Dir_test_lineage_2ea417d9: {
  label: "lineage/ — 13 files"

  Dir_test_lineage_support_129de678: {
    label: "support/ — 1 files"
  }
  File__lineage_CachedRetryCompiledCodeResolver_test_ts_dcc9e1d9: {
    label: "CachedRetryCompiledCodeResolver.test.ts"
  }
  File_test_lineage_compiledCodeRef_test_ts_c8ba4237: {
    label: "compiledCodeRef.test.ts"
  }
  File_test_lineage_errorSupport_test_ts_35dc00e5: {
    label: "errorSupport.test.ts"
  }
  File_test_lineage_facetSchema_validation_test_ts_cdfd697e: {
    label: "facetSchema.validation.test.ts"
  }
  File_test_lineage_LineageOutboxObserver_test_ts_ee79bb6f: {
    label: "LineageOutboxObserver.test.ts"
  }
  File_ineage_LineageWorkerRuntime_architecture_test_ts_9bbb0099: {
    label: "LineageWorkerRuntime.architecture.test.ts"
  }
  File_neage_LineageWorkerRuntime_configuration_test_ts_db3bb0ea: {
    label: "LineageWorkerRuntime.configuration.test.ts"
  }
  File_t_lineage_LineageWorkerRuntime_lifecycle_test_ts_d216c9c0: {
    label: "LineageWorkerRuntime.lifecycle.test.ts"
  }
  File_est_lineage_LineageWorkerRuntime_runOnce_test_ts_a917f77b: {
    label: "LineageWorkerRuntime.runOnce.test.ts"
  }
  File_test_lineage_lineageWorkerTick_test_ts_f8a04bbb: {
    label: "lineageWorkerTick.test.ts"
  }
  File__lineage_StepStartedLineageMapper_golden_test_ts_49decc9a: {
    label: "StepStartedLineageMapper.golden.test.ts"
  }
  File_test_lineage_StepStartedLineageMapper_test_ts_6475569b: {
    label: "StepStartedLineageMapper.test.ts"
  }
}
`;case`traceabilitySource_dir_test_lineage_support_129de678`:return`direction: down

TraceabilitySourceDir_test_a94a8fe5Dir_test_lineage_2ea417d9Dir_test_lineage_support_129de678: {
  label: "support/ — 1 files"

  File_est_lineage_support_lineageRuntimeTestSupport_ts_790a92e1: {
    label: "lineageRuntimeTestSupport.ts"
  }
}
`;case`apiSource_dir_test_modules_f1ff894a`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_modules_f1ff894a: {
  label: "modules/ — 6 files"

  Dir_test_modules_providerAdapters_1b04f142: {
    label: "providerAdapters/ — 1 files"
  }
  File_est_modules_buildDbtProjectImportRuntime_test_ts_3a1fd131: {
    label: "buildDbtProjectImportRuntime.test.ts"
  }
  File_ules_buildProtectedExecutionCapacityPort_test_ts_74857c6b: {
    label: "buildProtectedExecutionCapacityPort.test.ts"
  }
  File_test_modules_buildProviderAdapters_test_ts_74ac77e6: {
    label: "buildProviderAdapters.test.ts"
  }
  File_test_modules_planCompileBoundary_test_ts_bf8c436b: {
    label: "planCompileBoundary.test.ts"
  }
  File_test_modules_stateStoreRoles_test_ts_aa3ed2d6: {
    label: "stateStoreRoles.test.ts"
  }
}
`;case`apiSource_dir_test_modules_providerAdapters_1b04f142`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_modules_f1ff894aDir_test_modules_providerAdapters_1b04f142: {
  label: "providerAdapters/ — 1 files"

  File_ers_createTemporalProviderAdapterFactory_test_ts_3b31bbc6: {
    label: "createTemporalProviderAdapterFactory.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_ops_ccbee1ea`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_ops_ccbee1ea: {
  label: "ops/ — 4 files"

  File_test_ops_OperationalServer_test_ts_46d9420b: {
    label: "OperationalServer.test.ts"
  }
  File_test_ops_OutboxWorkerMonitor_test_ts_60737f35: {
    label: "OutboxWorkerMonitor.test.ts"
  }
  File_test_ops_outboxWorkerMonitorTestSupport_ts_263fc14f: {
    label: "outboxWorkerMonitorTestSupport.ts"
  }
  File_test_ops_resolveReadyStaleAfterMs_test_ts_b024291e: {
    label: "resolveReadyStaleAfterMs.test.ts"
  }
}
`;case`temporalWorkerSource_dir_test_ops_ccbee1ea`:return`direction: down

TemporalWorkerSourceDir_test_a94a8fe5Dir_test_ops_ccbee1ea: {
  label: "ops/ — 1 files"

  File_test_ops_OperationalServer_test_ts_46d9420b: {
    label: "OperationalServer.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_ownership_521c7256`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_ownership_521c7256: {
  label: "ownership/ — 2 files"

  File_nership_PgShardOwnershipGate_integration_test_ts_a47f29ba: {
    label: "PgShardOwnershipGate.integration.test.ts"
  }
  File_test_ownership_PgShardOwnershipGate_test_ts_5437aab7: {
    label: "PgShardOwnershipGate.test.ts"
  }
}
`;case`apiSource_dir_test_plugins_a1eaa08f`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_plugins_a1eaa08f: {
  label: "plugins/ — 2 files"

  File_test_plugins_env_test_ts_f51e0578: {
    label: "env.test.ts"
  }
  File_test_plugins_observability_test_ts_aef67735: {
    label: "observability.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_plugins_a1eaa08f`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_plugins_a1eaa08f: {
  label: "plugins/ — 1 files"

  File_test_plugins_env_test_ts_f51e0578: {
    label: "env.test.ts"
  }
}
`;case`temporalWorkerSource_dir_test_plugins_a1eaa08f`:return`direction: down

TemporalWorkerSourceDir_test_a94a8fe5Dir_test_plugins_a1eaa08f: {
  label: "plugins/ — 1 files"

  File_test_plugins_env_test_ts_f51e0578: {
    label: "env.test.ts"
  }
}
`;case`apiSource_dir_test_routes_ee5f836d`:return`direction: down

ApiSourceDir_test_a94a8fe5Dir_test_routes_ee5f836d: {
  label: "routes/ — 3 files"

  File_test_routes_healthReadinessPolicy_test_ts_5f492302: {
    label: "healthReadinessPolicy.test.ts"
  }
  File_test_routes_healthReadinessPorts_test_ts_98c1b1f7: {
    label: "healthReadinessPorts.test.ts"
  }
  File_test_routes_registerOperationalRoutes_test_ts_d897553c: {
    label: "registerOperationalRoutes.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_runtime_f0806ded`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_runtime_f0806ded: {
  label: "runtime/ — 9 files"

  File_st_runtime_buildRunEventRetentionRuntime_test_ts_b7f4fc06: {
    label: "buildRunEventRetentionRuntime.test.ts"
  }
  File_test_runtime_createOutboxWorkerRuntime_test_ts_016e7839: {
    label: "createOutboxWorkerRuntime.test.ts"
  }
  File_test_runtime_DeliveryBufferPurgeRuntime_test_ts_aef9b76d: {
    label: "DeliveryBufferPurgeRuntime.test.ts"
  }
  File_test_runtime_OutboxWorkerRuntime_failure_test_ts_ee00fbc6: {
    label: "OutboxWorkerRuntime.failure.test.ts"
  }
  File_st_runtime_OutboxWorkerRuntime_lifecycle_test_ts_e26a06bf: {
    label: "OutboxWorkerRuntime.lifecycle.test.ts"
  }
  File_est_runtime_OutboxWorkerRuntime_ordering_test_ts_125bb78b: {
    label: "OutboxWorkerRuntime.ordering.test.ts"
  }
  File_test_runtime_RunEventRetentionRuntime_test_ts_25cb16e5: {
    label: "RunEventRetentionRuntime.test.ts"
  }
  File_test_runtime_runtimeTestSupport_ts_b68326c5: {
    label: "runtimeTestSupport.ts"
  }
  File_test_runtime_runtimeTestUtils_ts_e9ef0681: {
    label: "runtimeTestUtils.ts"
  }
}
`;case`temporalWorkerSource_dir_test_runtime_f0806ded`:return`direction: down

TemporalWorkerSourceDir_test_a94a8fe5Dir_test_runtime_f0806ded: {
  label: "runtime/ — 8 files"

  File_teTemporalWorkerRuntime_srp_architecture_test_ts_ac7c63ed: {
    label: "createTemporalWorkerRuntime.srp.architecture.test.ts"
  }
  File_test_runtime_createTemporalWorkerRuntime_test_ts_59469a0e: {
    label: "createTemporalWorkerRuntime.test.ts"
  }
  File_ime_EnvironmentDbtRuntimeProfileResolver_test_ts_a7b70ee9: {
    label: "EnvironmentDbtRuntimeProfileResolver.test.ts"
  }
  File_test_runtime_nodeHttpsJsonClient_test_ts_96e4ddb0: {
    label: "nodeHttpsJsonClient.test.ts"
  }
  File__objectFilePostgresDbtCommandEnvironment_test_ts_b1a50d56: {
    label: "objectFilePostgresDbtCommandEnvironment.test.ts"
  }
  File_st_runtime_temporalWorkerHttpJsonProfile_test_ts_693c29b4: {
    label: "temporalWorkerHttpJsonProfile.test.ts"
  }
  File__temporalWorkerObjectFilePostgresProfile_test_ts_e3040f0e: {
    label: "temporalWorkerObjectFilePostgresProfile.test.ts"
  }
  File_t_runtime_temporalWorkerObjectFileReader_test_ts_d5134753: {
    label: "temporalWorkerObjectFileReader.test.ts"
  }
}
`;case`engineSource_dir_test_security_93be5b1e`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_security_93be5b1e: {
  label: "security/ — 3 files"

  File_test_security_authorizer_allowAll_test_ts_80374f15: {
    label: "authorizer.allowAll.test.ts"
  }
  File_test_security_authorizer_deny_test_ts_21e2c382: {
    label: "authorizer.deny.test.ts"
  }
  File_test_security_planRefPolicy_test_ts_55ff30b5: {
    label: "planRefPolicy.test.ts"
  }
}
`;case`engineSource_dir_test_services_f70a3c83`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_services_f70a3c83: {
  label: "services/ — 13 files"

  File_test_services_RunEnrichmentService_test_ts_bfb20243: {
    label: "RunEnrichmentService.test.ts"
  }
  File_ecutionContextAdmissionPolicy_acceptance_test_ts_d2d55d45: {
    label: "RunExecutionContextAdmissionPolicy.acceptance.test.ts"
  }
  File_tionContextAdmissionPolicy_compatibility_test_ts_24afbfb4: {
    label: "RunExecutionContextAdmissionPolicy.compatibility.test.ts"
  }
  File_s_runExecutionContextAdmissionPolicy_fixtures_ts_af88a387: {
    label: "runExecutionContextAdmissionPolicy.fixtures.ts"
  }
  File_ntextAdmissionPolicy_plugin-requirements_test_ts_c44caed2: {
    label: "RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts"
  }
  File_ecutionContextAdmissionPolicy_provenance_test_ts_c584ea81: {
    label: "RunExecutionContextAdmissionPolicy.provenance.test.ts"
  }
  File_nContextAdmissionPolicy_srp_architecture_test_ts_567786a0: {
    label: "RunExecutionContextAdmissionPolicy.srp.architecture.test.ts"
  }
  File_test_services_RunMaintenanceService_test_ts_59c537ab: {
    label: "RunMaintenanceService.test.ts"
  }
  File_test_services_RunStatusQueryService_test_ts_c3d8f899: {
    label: "RunStatusQueryService.test.ts"
  }
  File_test_services_SignalTransitionGuard_test_ts_6e27c090: {
    label: "SignalTransitionGuard.test.ts"
  }
  File_ervices_StartRunApplicationDecomposition_test_ts_4ef24183: {
    label: "StartRunApplicationDecomposition.test.ts"
  }
  File_test_services_StartRunApplicationService_test_ts_b703a7db: {
    label: "StartRunApplicationService.test.ts"
  }
  File_test_services_StartRunEventFactory_test_ts_c865c660: {
    label: "StartRunEventFactory.test.ts"
  }
}
`;case`outboxWorkerSource_dir_test_sharding_4c144e39`:return`direction: down

OutboxWorkerSourceDir_test_a94a8fe5Dir_test_sharding_4c144e39: {
  label: "sharding/ — 1 files"

  File_test_sharding_concurrentWorkerOrdering_test_ts_e0a38780: {
    label: "concurrentWorkerOrdering.test.ts"
  }
}
`;case`plannerSource_dir_test_slow_2158a782`:return`direction: down

PlannerSourceDir_test_a94a8fe5Dir_test_slow_2158a782: {
  label: "slow/ — 1 files"

  File_test_slow_load_test_ts_ae56c614: {
    label: "load.test.ts"
  }
}
`;case`contractsSource_dir_test_source-import_487f4c41`:return`direction: down

ContractsSourceDir_test_a94a8fe5Dir_test_source-import_487f4c41: {
  label: "source-import/ — 5 files"

  File_test_source-import_ConnectedSourceRef_v1_test_ts_8d5be9c6: {
    label: "ConnectedSourceRef.v1.test.ts"
  }
  File_test_source-import_SourceDataSample_v1_test_ts_e95ee261: {
    label: "SourceDataSample.v1.test.ts"
  }
  File__source-import_SourceImportOperations_v1_test_ts_9bba1b74: {
    label: "SourceImportOperations.v1.test.ts"
  }
  File__source-import_SourceImportOperations_v2_test_ts_1a3edf69: {
    label: "SourceImportOperations.v2.test.ts"
  }
  File_est_source-import_SourceObjectCatalog_v1_test_ts_8f9e02c2: {
    label: "SourceObjectCatalog.v1.test.ts"
  }
}
`;case`engineSource_dir_test_state_e3826a4a`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_state_e3826a4a: {
  label: "state/ — 11 files"

  File_test_state_bootstrapRunTx_atomicity_test_ts_2ecaf42a: {
    label: "bootstrapRunTx.atomicity.test.ts"
  }
  File_e_InMemoryRunStateStore_appendInvariants_test_ts_f8327f59: {
    label: "InMemoryRunStateStore.appendInvariants.test.ts"
  }
  File_te_InMemoryRunStateStore_rebuildSnapshot_test_ts_ba0ad0de: {
    label: "InMemoryRunStateStore.rebuildSnapshot.test.ts"
  }
  File__InMemoryRunStateStore_staleSnapshotRuns_test_ts_1cee2ca3: {
    label: "InMemoryRunStateStore.staleSnapshotRuns.test.ts"
  }
  File_test_state_InMemoryStartRunIntentStore_test_ts_ef3438c7: {
    label: "InMemoryStartRunIntentStore.test.ts"
  }
  File_test_state_InMemoryTxStore_outbox_test_ts_84585c3c: {
    label: "InMemoryTxStore.outbox.test.ts"
  }
  File_st_state_InMemoryTxStore_rebuildSnapshot_test_ts_162616bf: {
    label: "InMemoryTxStore.rebuildSnapshot.test.ts"
  }
  File_test_state_InMemoryTxStore_retryLineage_test_ts_e4587492: {
    label: "InMemoryTxStore.retryLineage.test.ts"
  }
  File__state_InMemoryTxStore_staleSnapshotRuns_test_ts_f39d68af: {
    label: "InMemoryTxStore.staleSnapshotRuns.test.ts"
  }
  File_test_state_providerRefPersistence_test_ts_2e88d349: {
    label: "providerRefPersistence.test.ts"
  }
  File_test_state_runBootstrapTestSupport_ts_3ad305e2: {
    label: "runBootstrapTestSupport.ts"
  }
}
`;case`deliverySource_dir_test_support_a2b6bf64`:return`direction: down

DeliverySourceDir_test_a94a8fe5Dir_test_support_a2b6bf64: {
  label: "support/ — 1 files"

  File_test_support_outboxWorkerTestSupport_ts_febe93a1: {
    label: "outboxWorkerTestSupport.ts"
  }
}
`;case`temporalWorkerSource_dir_test_support_a2b6bf64`:return`direction: down

TemporalWorkerSourceDir_test_a94a8fe5Dir_test_support_a2b6bf64: {
  label: "support/ — 3 files"

  File_test_support_objectFilePostgresPlanFixture_ts_f59fedf1: {
    label: "objectFilePostgresPlanFixture.ts"
  }
  File_test_support_objectFilePostgresServiceFixture_ts_45976ba2: {
    label: "objectFilePostgresServiceFixture.ts"
  }
  File_test_support_temporalWorkerServiceTestSupport_ts_8600d82a: {
    label: "temporalWorkerServiceTestSupport.ts"
  }
}
`;case`engineSource_dir_test_types_50e36d4f`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_types_50e36d4f: {
  label: "types/ — 1 files"

  File_test_types_engine-types_test_ts_973062eb: {
    label: "engine-types.test.ts"
  }
}
`;case`plannerSource_dir_test_unit_c3b5db1b`:return`direction: down

PlannerSourceDir_test_a94a8fe5Dir_test_unit_c3b5db1b: {
  label: "unit/ — 15 files"

  File_test_unit_dbt-step-factory_test_ts_103b541e: {
    label: "dbt-step-factory.test.ts"
  }
  File_test_unit_determinism_test_ts_e8b8f25c: {
    label: "determinism.test.ts"
  }
  File_executable-subgraph-deriver_architecture_test_ts_053fb35f: {
    label: "executable-subgraph-deriver.architecture.test.ts"
  }
  File_test_unit_executable-subgraph-deriver_test_ts_8e62de04: {
    label: "executable-subgraph-deriver.test.ts"
  }
  File_test_unit_graph_test_ts_882a8041: {
    label: "graph.test.ts"
  }
  File_nit_http-json-artifact-chain_integration_test_ts_c36dc9ab: {
    label: "http-json-artifact-chain.integration.test.ts"
  }
  File_test_unit_input-envelope-validator_test_ts_dd463d5c: {
    label: "input-envelope-validator.test.ts"
  }
  File_test_unit_limits_test_ts_74e9eeb0: {
    label: "limits.test.ts"
  }
  File_test_unit_manifest-graph-source_test_ts_5b3fa596: {
    label: "manifest-graph-source.test.ts"
  }
  File_test_unit_manifest-mvp_test_ts_630c1741: {
    label: "manifest-mvp.test.ts"
  }
  File_object-file-to-postgres-step_integration_test_ts_6d2d9d4a: {
    label: "object-file-to-postgres-step.integration.test.ts"
  }
  File_test_unit_planner-facade_test_ts_e5e92a5c: {
    label: "planner-facade.test.ts"
  }
  File_t_planner-private-ownership_architecture_test_ts_5076d569: {
    label: "planner-private-ownership.architecture.test.ts"
  }
  File_test_unit_policies_test_ts_0548c301: {
    label: "policies.test.ts"
  }
  File_test_unit_step-registry-integration_test_ts_df75ee4e: {
    label: "step-registry-integration.test.ts"
  }
}
`;case`engineSource_dir_test_utils_040594fb`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_utils_040594fb: {
  label: "utils/ — 1 files"

  File_test_utils_clock_test_ts_a7d33d7a: {
    label: "clock.test.ts"
  }
}
`;case`contractsSource_dir_test_validation_613522bb`:return`direction: down

ContractsSourceDir_test_a94a8fe5Dir_test_validation_613522bb: {
  label: "validation/ — 10 files"

  File_test_validation_execution-context_ts_b7525bac: {
    label: "execution-context.ts"
  }
  File_test_validation_execution-plan_ts_a2cc43bd: {
    label: "execution-plan.ts"
  }
  File_test_validation_execution-selection_ts_3b3ae370: {
    label: "execution-selection.ts"
  }
  File_test_validation_plan-compile_ts_069a05f4: {
    label: "plan-compile.ts"
  }
  File_test_validation_plan-records_ts_aca177a3: {
    label: "plan-records.ts"
  }
  File_test_validation_planner-graph_ts_6b1a3a4d: {
    label: "planner-graph.ts"
  }
  File_test_validation_preview_ts_df840a2a: {
    label: "preview.ts"
  }
  File_test_validation_run-lifecycle_ts_f43669dc: {
    label: "run-lifecycle.ts"
  }
  File_test_validation_signal-and-error_ts_7dc8d1b4: {
    label: "signal-and-error.ts"
  }
  File_test_validation_workspace-graph-draft_ts_f7ed3a1c: {
    label: "workspace-graph-draft.ts"
  }
}
`;case`plannerSource_dir_test_vectors_798a0d09`:return`direction: down

PlannerSourceDir_test_a94a8fe5Dir_test_vectors_798a0d09: {
  label: "vectors/ — 2 files"

  File_test_vectors_fixed-vector_inline_ts_3e05c001: {
    label: "fixed-vector.inline.ts"
  }
  File_test_vectors_fixed-vector_json_f432834f: {
    label: "fixed-vector.json"
  }
}
`;case`engineSource_dir_test_workers_421ecc3a`:return`direction: down

EngineSourceDir_test_a94a8fe5Dir_test_workers_421ecc3a: {
  label: "workers/ — 1 files"

  File_test_workers_IntentReconcilerWorker_test_ts_2ca1006d: {
    label: "IntentReconcilerWorker.test.ts"
  }
}
`;default:throw Error(`Unknown viewId: `+e)}};export{e as d2Source};