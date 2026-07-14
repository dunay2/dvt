/** Owned concern: compose phase-three dbt project import application services once. */
import type { ICanvasAuthoringAuthorityStore } from '../../application/ports/canvasAuthoringAuthority.js';
import type { IDbtProjectAnalyzerPort } from '../../application/ports/dbtProjectAnalysis.js';
import type { IDbtProjectImportInspectorPort } from '../../application/ports/dbtProjectImport.js';
import type { IWorkspaceGraphDraftStore } from '../../application/ports/workspaceGraphDraft.js';
import type { CanvasAuthoringAuthorityPolicy } from '../../application/services/canvasAuthoringAuthorityPolicy.js';
import { ImportDbtProjectUseCase } from '../../application/services/importDbtProjectUseCase.js';
import { ProjectDbtGraphFromFilesUseCase } from '../../application/services/projectDbtGraphFromFilesUseCase.js';
import { ValidateDbtProjectImportUseCase } from '../../application/services/validateDbtProjectImportUseCase.js';

export type BuildDbtProjectImportRuntimeDeps = {
  readonly analyzer: IDbtProjectAnalyzerPort;
  readonly inspector: IDbtProjectImportInspectorPort;
  readonly authorityStore: ICanvasAuthoringAuthorityStore;
  readonly authorityPolicy: CanvasAuthoringAuthorityPolicy;
  readonly graphDraftStore: IWorkspaceGraphDraftStore;
  readonly now: () => Date;
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
    authorityStore: deps.authorityStore,
    graphDraftStore: deps.graphDraftStore,
    projectGraph: projectGraphUseCase,
    now: deps.now,
  });

  return { projectGraphUseCase, validateUseCase, importUseCase };
}

export type DbtProjectImportRuntime = ReturnType<typeof buildDbtProjectImportRuntime>;
