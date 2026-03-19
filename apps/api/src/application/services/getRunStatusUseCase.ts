import type { IRunStateStore } from '@dvt/contracts';
import { RunMetadataNotFoundError, type IWorkflowEngine } from '@dvt/engine';

import type {
  AuthorizedQueryExecutionContext,
  GetRunStatusQuery,
  GetRunStatusResult,
  IGetRunStatusUseCase,
} from '../ports/runtime.js';

import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';

export class GetRunStatusUseCase implements IGetRunStatusUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly stateStore: IRunStateStore
  ) {}

  public async execute(
    query: GetRunStatusQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<GetRunStatusResult> {
    const metadata = await this.stateStore.getRunMetadataByRunId(context.scope.tenantId.value, query.runId);
    if (!metadata) {
      throw new RunMetadataNotFoundError(query.runId);
    }

    const runRef = runMetadataToEngineRunRef(metadata);
    const snapshot = query.enriched
      ? await this.engine.enrichRunStatus(runRef)
      : await this.engine.getRunStatus(runRef);

    return {
      runId: snapshot.runId,
      tenantId: context.scope.tenantId.value,
      status: snapshot.status,
      enriched: query.enriched,
      ...(snapshot.substatus !== undefined ? { substatus: snapshot.substatus } : {}),
      ...(snapshot.message !== undefined ? { message: snapshot.message } : {}),
      ...(snapshot.startedAt !== undefined ? { startedAt: snapshot.startedAt } : {}),
      ...(snapshot.completedAt !== undefined ? { completedAt: snapshot.completedAt } : {}),
      ...(snapshot.hash !== undefined ? { hash: snapshot.hash } : {}),
    };
  }
}
