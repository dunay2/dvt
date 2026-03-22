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
    const metadata = await this.stateStore.getRunMetadataByRunId(
      context.scope.tenantId.value,
      query.runId
    );
    if (!metadata) {
      throw new RunMetadataNotFoundError(query.runId);
    }

    const runRef = runMetadataToEngineRunRef(metadata);
    const snapshot = query.enriched
      ? await this.engine.enrichRunStatus(runRef)
      : await this.engine.getRunStatus(runRef);

    const result: GetRunStatusResult = {
      runId: snapshot.runId,
      tenantId: context.scope.tenantId.value,
      status: snapshot.status,
      enriched: query.enriched,
    };
    assignIfDefined(result, 'substatus', snapshot.substatus);
    assignIfDefined(result, 'message', snapshot.message);
    assignIfDefined(result, 'startedAt', snapshot.startedAt);
    assignIfDefined(result, 'completedAt', snapshot.completedAt);
    assignIfDefined(result, 'hash', snapshot.hash);
    return result;
  }
}

function assignIfDefined<
  T extends Record<string, unknown>,
  K extends keyof T,
>(target: T, key: K, value: T[K] | undefined): void {
  if (value === undefined) {
    return;
  }
  target[key] = value;
}
