import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';

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

    return DbtProjectGraphProjectionSchema.parse({
      schemaVersion: 'dbt-project-graph-projection.v1',
      authorityBinding,
      freshness: analysis.status === 'valid' ? 'fresh' : analysis.status,
      projectRevision: analysis.projectRevision,
      analysisSha256: analysis.analysisSha256,
      nodes,
      edges,
      diagnostics: analysis.diagnostics,
      capabilities: {
        canPreview: false,
        canRun: false,
        codeOnlyResourceCount: nodes.length,
      },
    });
  }
}
