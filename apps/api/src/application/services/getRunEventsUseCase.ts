import type { IRunStateStore } from '@dvt/contracts';
import { RunMetadataNotFoundError } from '@dvt/engine';

import type {
  AuthorizedQueryExecutionContext,
  GetRunEventsQuery,
  GetRunEventsResult,
  IGetRunEventsUseCase,
} from '../ports/runtime.js';

export class GetRunEventsUseCase implements IGetRunEventsUseCase {
  public constructor(private readonly stateStore: IRunStateStore) {}

  public async execute(
    query: GetRunEventsQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<GetRunEventsResult> {
    const metadata = await this.stateStore.getRunMetadataByRunId(
      context.scope.tenantId.value,
      query.runId
    );
    if (!metadata) {
      throw new RunMetadataNotFoundError(query.runId);
    }

    const listOptions: Parameters<IRunStateStore['listEvents']>[2] = {};
    if (query.afterSeq !== undefined) {
      listOptions.afterSeq = query.afterSeq;
    }
    if (query.limit !== undefined) {
      listOptions.limit = query.limit;
    }

    const items = await this.stateStore.listEvents(
      context.scope.tenantId.value,
      query.runId,
      listOptions
    );

    return {
      items,
      nextCursor:
        query.limit !== undefined && items.length === query.limit
          ? (items.at(-1)?.runSeq ?? null)
          : null,
    };
  }
}
