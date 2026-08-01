import type { DbtSelectedModelAnalysis } from '@dvt/contracts';

import type {
  ResolveSelectedDbtModelAnalysisInput,
  SelectedDbtModelAnalysisResolver,
} from './selectedDbtModelAnalysisResolver.js';

export type AnalyzeSelectedDbtModelInput = ResolveSelectedDbtModelAnalysisInput;

export interface IAnalyzeSelectedDbtModelQuery {
  execute(input: AnalyzeSelectedDbtModelInput): Promise<DbtSelectedModelAnalysis>;
}

export class AnalyzeSelectedDbtModelQuery implements IAnalyzeSelectedDbtModelQuery {
  public constructor(
    private readonly resolver: Pick<SelectedDbtModelAnalysisResolver, 'resolve'>
  ) {}

  public async execute(input: AnalyzeSelectedDbtModelInput): Promise<DbtSelectedModelAnalysis> {
    return (await this.resolver.resolve(input)).selectedAnalysis;
  }
}
