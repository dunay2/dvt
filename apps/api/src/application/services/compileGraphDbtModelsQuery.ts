/** Owned concern: compile published Graph Draft DBT models through the native analyzer boundary. */
import {
  CompileGraphDbtModelsRequestSchema,
  GraphDbtModelCompilationResultSchema,
  type CompileGraphDbtModelsRequest,
  type GraphDbtModelCompilationResult,
} from '@dvt/contracts';

import type { IDbtProjectAnalyzerPort } from '../ports/dbtProjectAnalysis.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import {
  CanvasAuthoringAuthorityMissingError,
  CanvasAuthoringAuthorityMixedError,
  type CanvasAuthoringAuthorityPolicy,
} from './canvasAuthoringAuthorityPolicy.js';

export type CompileGraphDbtModelsInput = Readonly<
  CompileGraphDbtModelsRequest & { scope: WorkspaceStorageScope }
>;

export interface ICompileGraphDbtModelsQuery {
  execute(input: CompileGraphDbtModelsInput): Promise<GraphDbtModelCompilationResult>;
}

export class CompileGraphDbtModelsQuery implements ICompileGraphDbtModelsQuery {
  public constructor(
    private readonly deps: Readonly<{
      analyzer: IDbtProjectAnalyzerPort;
      authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
    }>
  ) {}

  public async execute(input: CompileGraphDbtModelsInput): Promise<GraphDbtModelCompilationResult> {
    const request = CompileGraphDbtModelsRequestSchema.parse({
      canvasId: input.canvasId,
      selectors: input.selectors,
    });
    let authorityBinding;
    try {
      authorityBinding = await this.deps.authorityPolicy.resolve({
        ...input.scope,
        canvasId: request.canvasId,
      });
    } catch (error) {
      if (error instanceof CanvasAuthoringAuthorityMissingError) {
        return authorityRefused(request.canvasId, 'missing_authority');
      }
      if (error instanceof CanvasAuthoringAuthorityMixedError) {
        return authorityRefused(request.canvasId, 'mixed_authority');
      }
      throw error;
    }

    if (authorityBinding.authority.kind !== 'graph-draft') {
      return authorityRefused(request.canvasId, 'dbt_project_files_authority');
    }

    const selectors = request.selectors.slice().sort((left, right) => left.localeCompare(right));
    const analysis = await this.deps.analyzer.analyze({
      scope: input.scope,
      projectRoot: '.',
      operation: { kind: 'compile', selectors },
    });
    if (analysis.status !== 'valid') {
      return GraphDbtModelCompilationResultSchema.parse({
        schemaVersion: 'graph-dbt-model-compilation.v1',
        kind: analysis.status,
        canvasId: request.canvasId,
        diagnostics:
          analysis.diagnostics.length > 0
            ? analysis.diagnostics.map(({ code, message }) => ({ code, message }))
            : [
                {
                  code: 'dbt_compilation_failed',
                  message: 'Native dbt compilation did not produce a usable result.',
                },
              ],
      });
    }

    const models = [];
    for (const selector of selectors) {
      const resource = analysis.resources.find(
        (candidate) =>
          candidate.resourceType === 'model' &&
          (candidate.name === selector || candidate.uniqueId === selector)
      );
      if (!resource?.compiledSql?.trim()) {
        return GraphDbtModelCompilationResultSchema.parse({
          schemaVersion: 'graph-dbt-model-compilation.v1',
          kind: 'invalid',
          canvasId: request.canvasId,
          diagnostics: [
            {
              code: 'dbt_compiled_model_missing',
              message: `Native dbt compilation did not produce SQL for model selector ${selector}.`,
            },
          ],
        });
      }
      models.push({ selector, uniqueId: resource.uniqueId, compiledSql: resource.compiledSql });
    }

    return GraphDbtModelCompilationResultSchema.parse({
      schemaVersion: 'graph-dbt-model-compilation.v1',
      kind: 'compiled',
      canvasId: request.canvasId,
      authorityBinding,
      projectRevision: analysis.projectRevision,
      analysisSha256: analysis.analysisSha256,
      models,
    });
  }
}

function authorityRefused(
  canvasId: string,
  reason: 'missing_authority' | 'mixed_authority' | 'dbt_project_files_authority'
): GraphDbtModelCompilationResult {
  return {
    schemaVersion: 'graph-dbt-model-compilation.v1',
    kind: 'authority_refused',
    canvasId,
    reason,
  };
}
