/** Owned concern: compose phase-three dbt project import application services once. */
import type {
  IDbtExecutionConnectionBindingVerifier,
  IDbtExecutionTargetResolver,
} from '../../application/ports/dbtExecutionTarget.js';
import type { IDbtProjectAnalyzerPort } from '../../application/ports/dbtProjectAnalysis.js';
import type {
  IDbtProjectImportInspectorPort,
  IDbtProjectImportProcessStore,
} from '../../application/ports/dbtProjectImport.js';
import type { IWarehouseConnectionCatalog } from '../../application/ports/warehouseSourceImport.js';
import { AnalyzeSelectedDbtModelQuery } from '../../application/services/analyzeSelectedDbtModelQuery.js';
import type { CanvasAuthoringAuthorityPolicy } from '../../application/services/canvasAuthoringAuthorityPolicy.js';
import { CompileGraphDbtModelsQuery } from '../../application/services/compileGraphDbtModelsQuery.js';
import { ImportDbtProjectUseCase } from '../../application/services/importDbtProjectUseCase.js';
import { ProjectDbtGraphFromFilesUseCase } from '../../application/services/projectDbtGraphFromFilesUseCase.js';
import { SelectedDbtModelAnalysisResolver } from '../../application/services/selectedDbtModelAnalysisResolver.js';
import { ValidateDbtProjectImportUseCase } from '../../application/services/validateDbtProjectImportUseCase.js';

export type BuildDbtProjectImportRuntimeDeps = {
  readonly analyzer: IDbtProjectAnalyzerPort;
  readonly executionConnectionBindingVerifier: IDbtExecutionConnectionBindingVerifier;
  readonly executionTargetResolver: IDbtExecutionTargetResolver;
  readonly inspector: IDbtProjectImportInspectorPort;
  readonly processStore: IDbtProjectImportProcessStore;
  readonly authorityPolicy: CanvasAuthoringAuthorityPolicy;
  readonly warehouseConnectionCatalog: IWarehouseConnectionCatalog;
  readonly now: () => Date;
  readonly createLeaseToken: () => string;
  readonly operationLeaseMs: number;
};

export function buildDbtProjectImportRuntime(deps: BuildDbtProjectImportRuntimeDeps) {
  const projectGraphUseCase = new ProjectDbtGraphFromFilesUseCase({
    analyzer: deps.analyzer,
    authorityPolicy: deps.authorityPolicy,
    executionConnectionBindingVerifier: deps.executionConnectionBindingVerifier,
    executionTargetResolver: deps.executionTargetResolver,
    connectionCatalog: deps.warehouseConnectionCatalog,
  });
  const selectedModelAnalysisResolver = new SelectedDbtModelAnalysisResolver({
    analyzer: deps.analyzer,
    authorityPolicy: deps.authorityPolicy,
  });
  const selectedModelAnalysisQuery = new AnalyzeSelectedDbtModelQuery(
    selectedModelAnalysisResolver
  );
  const graphModelCompilationQuery = new CompileGraphDbtModelsQuery({
    analyzer: deps.analyzer,
    authorityPolicy: deps.authorityPolicy,
  });
  const validateUseCase = new ValidateDbtProjectImportUseCase({
    inspector: deps.inspector,
    analyzer: deps.analyzer,
    now: deps.now,
  });
  const importUseCase = new ImportDbtProjectUseCase({
    validator: validateUseCase,
    processStore: deps.processStore,
    projectGraph: projectGraphUseCase,
    now: deps.now,
    createLeaseToken: deps.createLeaseToken,
    operationLeaseMs: deps.operationLeaseMs,
  });

  return {
    projectGraphUseCase,
    selectedModelAnalysisQuery,
    selectedModelAnalysisResolver,
    graphModelCompilationQuery,
    validateUseCase,
    importUseCase,
  };
}

export type DbtProjectImportRuntime = ReturnType<typeof buildDbtProjectImportRuntime>;
