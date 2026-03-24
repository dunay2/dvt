import type { IRunStateStoreRead } from '@dvt/engine';
import { RunMetadataNotFoundError } from '@dvt/engine';

import type {
  AuthorizedQueryExecutionContext,
  GetRunEventsQuery,
  GetRunEventsResult,
  IGetRunEventsUseCase,
} from '../ports/runtime.js';

export class GetRunEventsUseCase implements IGetRunEventsUseCase {
  public constructor(private readonly stateStore: IRunStateStoreRead) {}

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

    const options: { afterSeq?: number; limit?: number } = {};
    if (query.afterSeq === undefined) {
      // no cursor
    } else {
      options.afterSeq = query.afterSeq;
    }
    if (query.limit === undefined) {
      // no limit
    } else {
      options.limit = query.limit;
    }

    const items = await this.stateStore.listEvents(
      context.scope.tenantId.value,
      query.runId,
      options
    );

    if (query.limit === undefined) {
      return {
        items,
        nextCursor: null,
      };
    }

    return {
      items,
      nextCursor: items.length === query.limit ? (items.at(-1)?.runSeq ?? null) : null,
    };
  }
}
