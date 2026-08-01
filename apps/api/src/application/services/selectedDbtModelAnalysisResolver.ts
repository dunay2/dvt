import type { CanvasAuthoringAuthorityBinding, DbtSelectedModelAnalysis } from '@dvt/contracts';

import type { DbtProjectAnalysis, IDbtProjectAnalyzerPort } from '../ports/dbtProjectAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../ports/dbtProjectImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';
import { projectSelectedDbtModelAnalysis } from './selectedDbtModelAnalysisProjection.js';

export type ResolveSelectedDbtModelAnalysisInput = Readonly<{
  scope: WorkspaceStorageScope;
  canvasId: string;
  selectedUniqueId: string;
}>;

export type ResolvedSelectedDbtModelAnalysis = Readonly<{
  authorityBinding: CanvasAuthoringAuthorityBinding;
  nativeAnalysis: DbtProjectAnalysis;
  selectedAnalysis: DbtSelectedModelAnalysis;
}>;

export class SelectedDbtModelAnalysisResolver {
  public constructor(
    private readonly deps: Readonly<{
      analyzer: IDbtProjectAnalyzerPort;
      authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
    }>
  ) {}

  public async resolve(
    input: ResolveSelectedDbtModelAnalysisInput
  ): Promise<ResolvedSelectedDbtModelAnalysis> {
    const authorityBinding = await this.deps.authorityPolicy.resolve({
      ...input.scope,
      canvasId: input.canvasId,
    });
    if (authorityBinding.authority.kind !== 'dbt-project-files') {
      throw new DbtProjectFileAuthorityRequiredError();
    }

    const nativeAnalysis = await this.deps.analyzer.analyze({
      scope: input.scope,
      projectRoot: authorityBinding.authority.projectRoot,
    });
    return {
      authorityBinding,
      nativeAnalysis,
      selectedAnalysis: projectSelectedDbtModelAnalysis({
        authorityBinding,
        analysis: nativeAnalysis,
        selectedUniqueId: input.selectedUniqueId,
      }),
    };
  }
}
