import type { IRunStateStoreRead, RunMetadata, RunStatus } from '@dvt/engine';

import type {
  AuthorizedQueryExecutionContext,
  IListRunsUseCase,
  ListRunsQuery,
  ListRunsResult,
  RunListItemDto,
} from '../ports/runtime.js';

export class ListRunsUseCase implements IListRunsUseCase {
  public constructor(private readonly stateStore: IRunStateStoreRead) {}

  public async execute(
    query: ListRunsQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<ListRunsResult> {
    const metadata = await this.stateStore.listRuns({
      tenantId: context.scope.tenantId.value,
      limit: query.limit,
    });

    const filtered = metadata.filter((item) => {
      if (context.scope.projectId && item.projectId !== context.scope.projectId.value) {
        return false;
      }

      if (context.scope.environmentId && item.environmentId !== context.scope.environmentId.value) {
        return false;
      }

      return true;
    });

    const snapshots = await Promise.all(
      filtered.map((item) => this.stateStore.getSnapshot(item.tenantId, item.runId))
    );

    return {
      items: filtered.map((item, index) => this.toListItem(item, snapshots[index]?.status)),
      nextCursor: this.buildNextCursor(filtered, query.limit),
    };
  }

  private toListItem(item: RunMetadata, status: RunStatus | undefined): RunListItemDto {
    return {
      tenantId: item.tenantId,
      projectId: item.projectId,
      environmentId: item.environmentId,
      runId: item.runId,
      planId: item.planId,
      planVersion: item.planVersion,
      logicalAttemptId: item.logicalAttemptId,
      provider: item.provider,
      ...(item.createdAt !== undefined ? { createdAt: item.createdAt } : {}),
      ...(status !== undefined ? { status } : {}),
    };
  }

  private buildNextCursor(items: ReadonlyArray<RunMetadata>, limit: number): string | null {
    if (items.length < limit) {
      return null;
    }

    const last = items.at(-1);
    if (!last?.createdAt) {
      return null;
    }

    return `${last.createdAt}:${last.runId}`;
  }
}
