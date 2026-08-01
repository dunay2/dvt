import type { DbtSelectedModelAnalysis } from '@dvt/contracts';

import type { IDbtProjectAnalyzerPort } from '../ports/dbtProjectAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../ports/dbtProjectImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';
import { projectSelectedDbtModelAnalysis } from './selectedDbtModelAnalysisProjection.js';

export type AnalyzeSelectedDbtModelInput = Readonly<{
  scope: WorkspaceStorageScope;
  canvasId: string;
  selectedUniqueId: string;
}>;

export interface IAnalyzeSelectedDbtModelQuery {
  execute(input: AnalyzeSelectedDbtModelInput): Promise<DbtSelectedModelAnalysis>;
}

export class AnalyzeSelectedDbtModelQuery implements IAnalyzeSelectedDbtModelQuery {
  public constructor(
    private readonly deps: Readonly<{
      analyzer: IDbtProjectAnalyzerPort;
      authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
    }>
  ) {}

  public async execute(input: AnalyzeSelectedDbtModelInput): Promise<DbtSelectedModelAnalysis> {
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
    return projectSelectedDbtModelAnalysis({
      authorityBinding,
      analysis,
      selectedUniqueId: input.selectedUniqueId,
    });
  }
}
