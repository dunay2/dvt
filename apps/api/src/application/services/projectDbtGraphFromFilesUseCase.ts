import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';

import type { IDbtExecutionTargetResolver } from '../ports/dbtExecutionTarget.js';
import type { IDbtProjectAnalyzerPort } from '../ports/dbtProjectAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../ports/dbtProjectImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';

export type ProjectDbtGraphFromFilesInput = Readonly<{
  scope: WorkspaceStorageScope;
  canvasId: string;
}>;

export class ProjectDbtGraphFromFilesUseCase {
  public constructor(
    private readonly deps: {
      readonly analyzer: IDbtProjectAnalyzerPort;
      readonly authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
      readonly executionTargetResolver: IDbtExecutionTargetResolver;
    }
  ) {}

  public async execute(input: ProjectDbtGraphFromFilesInput): Promise<DbtProjectGraphProjection> {
    const authorityBinding = await this.deps.authorityPolicy.resolve({
      ...input.scope,
      canvasId: input.canvasId,
    });
    if (authorityBinding.authority.kind !== 'dbt-project-files') {
      throw new DbtProjectFileAuthorityRequiredError();
    }

    const analysis = await this.deps.analyzer.analyze({
      scope: input.scope,
      projectRoot: authorityBinding.authority.projectRoot,
    });
    const nodes = analysis.resources
      .map(({ codeOnlyReasons, ...resource }) => ({
        ...resource,
        visualEditability: {
          status: 'code_only' as const,
          reasons: [...new Set(codeOnlyReasons)].sort(),
        },
      }))
      .sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
    const edges = analysis.dependencies
      .map((dependency) => ({
        id: `${dependency.sourceUniqueId}->${dependency.targetUniqueId}:${dependency.relation}`,
        ...dependency,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const executionTarget = this.deps.executionTargetResolver.resolve();
    const executionDiagnostics = resolveExecutionDiagnostics({
      analysisStatus: analysis.status,
      adapterType: analysis.adapterType,
      dbtVersion: analysis.projectRevision.dbtVersion,
      executionTarget,
    });
    const executable = analysis.status === 'valid' && executionDiagnostics.length === 0;

    return DbtProjectGraphProjectionSchema.parse({
      schemaVersion: 'dbt-project-graph-projection.v1',
      authorityBinding,
      freshness: analysis.status === 'valid' ? 'fresh' : analysis.status,
      projectRevision: analysis.projectRevision,
      analysisSha256: analysis.analysisSha256,
      ...(analysis.adapterType === undefined ? {} : { adapterType: analysis.adapterType }),
      nodes,
      edges,
      diagnostics: [...analysis.diagnostics, ...executionDiagnostics],
      ...(executionTarget === null ? {} : { executionTarget }),
      capabilities: {
        canPreview: executable,
        canRun: executable,
        codeOnlyResourceCount: nodes.length,
      },
    });
  }
}

function resolveExecutionDiagnostics({
  analysisStatus,
  adapterType,
  dbtVersion,
  executionTarget,
}: Readonly<{
  analysisStatus: 'valid' | 'invalid' | 'unavailable';
  adapterType?: string | undefined;
  dbtVersion?: string | undefined;
  executionTarget: ReturnType<IDbtExecutionTargetResolver['resolve']>;
}>): DbtProjectGraphProjection['diagnostics'] {
  if (analysisStatus !== 'valid') return [];

  if (adapterType === undefined) {
    return [
      {
        code: 'dbt_analysis_adapter_unknown',
        severity: 'error',
        message: 'The analyzed dbt project does not identify its adapter.',
      },
    ];
  }
  if (dbtVersion === undefined) {
    return [
      {
        code: 'dbt_analysis_version_unknown',
        severity: 'error',
        message: 'The analyzed dbt project does not identify its dbt version.',
      },
    ];
  }
  if (executionTarget === null) {
    return [
      {
        code: 'dbt_execution_target_unavailable',
        severity: 'error',
        message: 'No server-owned dbt execution target is configured for this environment.',
      },
    ];
  }
  if (executionTarget.adapter !== adapterType) {
    return [
      {
        code: 'dbt_execution_target_adapter_mismatch',
        severity: 'error',
        message: `The configured ${executionTarget.adapter} target cannot execute this ${adapterType} project.`,
      },
    ];
  }
  return [];
}
