/**
 * Owned concern: compose phase-three dbt project import application services once.
 * @decision Compose file analysis and Preview compilation with one injected analyzer.
 * @consequence The new consumer does not create another native runner or cache.
 */
import type {
  IDbtExecutionConnectionBindingVerifier,
  IDbtExecutionTargetResolver,
} from '../../application/ports/dbtExecutionTarget.js';
import type {
  IDbtProjectAnalyzerPort,
  IDbtProjectSourceRevisionReader,
} from '../../application/ports/dbtProjectAnalysis.js';
import type {
  IDbtProjectImportInspectorPort,
  IDbtProjectImportProcessStore,
} from '../../application/ports/dbtProjectImport.js';
import type { IWarehouseConnectionCatalog } from '../../application/ports/warehouseSourceImport.js';
import { AnalyzeSelectedDbtModelQuery } from '../../application/services/analyzeSelectedDbtModelQuery.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { CanvasAuthoringAuthorityPolicy } from '../../application/services/canvasAuthoringAuthorityPolicy.js';
import { CompileGraphDbtModelsQuery } from '../../application/services/compileGraphDbtModelsQuery.js';
import { DbtPreviewCompilationGate } from '../../application/services/dbt/DbtPreviewCompilationGate.js';
import { ImportDbtProjectUseCase } from '../../application/services/importDbtProjectUseCase.js';
import { ProjectDbtGraphFromFilesUseCase } from '../../application/services/projectDbtGraphFromFilesUseCase.js';
import { ResolveDbtModelProducers } from '../../application/services/resolveDbtModelProducers.js';
import { SelectedDbtModelAnalysisResolver } from '../../application/services/selectedDbtModelAnalysisResolver.js';
import { ValidateDbtProjectImportUseCase } from '../../application/services/validateDbtProjectImportUseCase.js';

export type BuildDbtProjectImportRuntimeDeps = {
  readonly authorizer: Pick<AuthorizeCommandScopeService, 'authorize'>;
  readonly analyzer: IDbtProjectAnalyzerPort;
  readonly sourceRevisionReader: IDbtProjectSourceRevisionReader;
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
    sourceRevisionReader: deps.sourceRevisionReader,
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
    previewCompilation: new DbtPreviewCompilationGate(deps.analyzer),
    modelProducerResolver: new ResolveDbtModelProducers({
      analyzer: deps.analyzer,
      authorityPolicy: deps.authorityPolicy,
      projectGraph: projectGraphUseCase,
      authorizer: deps.authorizer,
    }),
    projectGraphUseCase,
    selectedModelAnalysisQuery,
    selectedModelAnalysisResolver,
    graphModelCompilationQuery,
    validateUseCase,
    importUseCase,
  };
}

export type DbtProjectImportRuntime = ReturnType<typeof buildDbtProjectImportRuntime>;
