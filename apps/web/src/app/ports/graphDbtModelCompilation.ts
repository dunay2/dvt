/** Owned concern: expose the Graph Draft DBT model compilation query. */
import type { CompileGraphDbtModelsRequest, GraphDbtModelCompilationResult } from '@dvt/contracts';

export interface IGraphDbtModelCompilationQueryPort {
  compile(request: CompileGraphDbtModelsRequest): Promise<GraphDbtModelCompilationResult>;
}
