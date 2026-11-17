/** Protected Model SQL query boundaries; proposals confer no graph-write authority. */
import type {
  ConnectionRef,
  ConnectedSourceRef,
  ModelSqlContextResponse,
  ModelSqlDiagnostic,
  ModelSqlInput,
  ModelSqlTarget,
} from '@dvt/contracts';
import type {
  ModelSqlSourceContext,
  ModelSqlSourceInput,
  SubstraitPostgresAstProjection,
} from '@dvt/postgres-projection';
import type { ProducerGraph } from '@dvt/substrait-analysis';

import type { AuthorizedExecutionContext } from './authContract.js';
import type { DbtModelProducer } from './dbtModelProducer.js';

export class CanvasModelSqlUnavailableError extends Error {
  public constructor(readonly code: ModelSqlDiagnostic['code']) {
    super(`Model SQL context is unavailable: ${code}`);
    this.name = 'CanvasModelSqlUnavailableError';
  }
}
export class CanvasModelSqlAccessDeniedError extends Error {
  public constructor() {
    super('Model SQL input metadata access is denied.');
    this.name = 'CanvasModelSqlAccessDeniedError';
  }
}

export type ModelSqlPublishedInput = Readonly<{
  name: string;
  input: ModelSqlSourceInput;
  columns: ModelSqlInput['columns'];
  connection: ConnectionRef;
}>;
export type PreparedCanvasModelSqlContext = Readonly<{
  response: ModelSqlContextResponse;
  source: ModelSqlSourceContext;
  graph: ProducerGraph;
  externalProjections: ReadonlyMap<string, SubstraitPostgresAstProjection>;
  sourceRefs: readonly ConnectedSourceRef[];
  modelRefs: ReadonlyMap<string, DbtModelProducer['provenance']>;
}>;
export interface ICanvasModelSqlContextQuery {
  execute(
    input: ModelSqlTarget,
    context: AuthorizedExecutionContext
  ): Promise<ModelSqlContextResponse>;
  prepare(
    input: ModelSqlTarget,
    context: AuthorizedExecutionContext
  ): Promise<PreparedCanvasModelSqlContext>;
}
