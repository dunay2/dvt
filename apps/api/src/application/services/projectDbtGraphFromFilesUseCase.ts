import {
  DbtProjectGraphProjectionSchema,
  type CanvasAuthoringAuthorityBinding,
  type DbtProjectGraphProjection,
} from '@dvt/contracts';

import type { IDbtProjectAnalyzerPort } from '../ports/dbtProjectAnalysis.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

export type ProjectDbtGraphFromFilesInput = Readonly<{
  scope: WorkspaceStorageScope;
  authorityBinding: CanvasAuthoringAuthorityBinding;
}>;

export class ProjectDbtGraphFromFilesUseCase {
  public constructor(private readonly deps: { readonly analyzer: IDbtProjectAnalyzerPort }) {}

  public async execute(input: ProjectDbtGraphFromFilesInput): Promise<DbtProjectGraphProjection> {
    if (input.authorityBinding.authority.kind !== 'dbt-project-files') {
      throw new Error('ProjectDbtGraphFromFiles requires dbt-project-files authority.');
    }

    const analysis = await this.deps.analyzer.analyze({
      scope: input.scope,
      projectRoot: input.authorityBinding.authority.projectRoot,
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
      authorityBinding: input.authorityBinding,
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
