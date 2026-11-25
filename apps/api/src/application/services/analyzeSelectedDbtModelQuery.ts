import type {
  DbtSelectedModelAnalysis,
  DbtSelectedModelExecutionSqlSelection,
} from '@dvt/contracts';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import { DbtModelProducerAccessDeniedError } from '../ports/dbtModelProducer.js';

import type {
  ResolveSelectedDbtModelAnalysisInput,
  SelectedDbtModelAnalysisResolver,
} from './selectedDbtModelAnalysisResolver.js';
import {
  projectSelectedDbtModelExecutionSql,
  type SelectedDbtModelSqlDependencies,
} from './selectedDbtModelExecutionSql.js';

export type AnalyzeSelectedDbtModelInput = ResolveSelectedDbtModelAnalysisInput &
  Readonly<{ executionSql?: DbtSelectedModelExecutionSqlSelection }>;

export interface IAnalyzeSelectedDbtModelQuery {
  execute(
    input: AnalyzeSelectedDbtModelInput,
    context?: AuthorizedExecutionContext
  ): Promise<DbtSelectedModelAnalysis>;
}

export class AnalyzeSelectedDbtModelQuery implements IAnalyzeSelectedDbtModelQuery {
  public constructor(
    private readonly resolver: Pick<SelectedDbtModelAnalysisResolver, 'resolve'>,
    private readonly sql: SelectedDbtModelSqlDependencies
  ) {}

  public async execute(
    input: AnalyzeSelectedDbtModelInput,
    context?: AuthorizedExecutionContext
  ): Promise<DbtSelectedModelAnalysis> {
    if (input.executionSql != null && context == null)
      throw new DbtModelProducerAccessDeniedError();
    const resolved = await this.resolver.resolve(input);
    if (input.executionSql == null) return resolved.selectedAnalysis;
    if (context == null) throw new DbtModelProducerAccessDeniedError();
    const executionSql = await projectSelectedDbtModelExecutionSql(
      this.sql,
      { ...input, executionSql: input.executionSql },
      resolved,
      context
    );
    return { ...resolved.selectedAnalysis, executionSql };
  }
}
