/** Owned concern: compose phase-three dbt project import application services once. */
import type { IDbtProjectAnalyzerPort } from '../../application/ports/dbtProjectAnalysis.js';
import type {
  IDbtProjectImportInspectorPort,
  IDbtProjectImportProcessStore,
} from '../../application/ports/dbtProjectImport.js';
import type { CanvasAuthoringAuthorityPolicy } from '../../application/services/canvasAuthoringAuthorityPolicy.js';
import { ImportDbtProjectUseCase } from '../../application/services/importDbtProjectUseCase.js';
import { ProjectDbtGraphFromFilesUseCase } from '../../application/services/projectDbtGraphFromFilesUseCase.js';
import { ValidateDbtProjectImportUseCase } from '../../application/services/validateDbtProjectImportUseCase.js';

export type BuildDbtProjectImportRuntimeDeps = {
  readonly analyzer: IDbtProjectAnalyzerPort;
  readonly inspector: IDbtProjectImportInspectorPort;
  readonly processStore: IDbtProjectImportProcessStore;
  readonly authorityPolicy: CanvasAuthoringAuthorityPolicy;
  readonly now: () => Date;
  readonly createLeaseToken: () => string;
  readonly operationLeaseMs: number;
};

export function buildDbtProjectImportRuntime(deps: BuildDbtProjectImportRuntimeDeps) {
  const projectGraphUseCase = new ProjectDbtGraphFromFilesUseCase({
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

  return { projectGraphUseCase, validateUseCase, importUseCase };
}

export type DbtProjectImportRuntime = ReturnType<typeof buildDbtProjectImportRuntime>;
