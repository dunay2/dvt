import type { TenantId as ContractTenantId } from '@dvt/contracts';
import type { IRunStateStoreRead, IWorkflowEngine, RunMetadata } from '@dvt/engine';

import type {
  AuthorizedQueryExecutionContext,
  IListRunsUseCase,
  ListRunsQuery,
  ListRunsResult,
  RunListItemDto,
} from '../ports/runtime.js';

import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';
import { projectRunOperationalTruth } from './runOperationalTruth.js';

const RUN_STATUS_READ_CONCURRENCY = 8;

export class ListRunsUseCase implements IListRunsUseCase {
  public constructor(
    private readonly stateStore: IRunStateStoreRead,
    private readonly engine: Pick<IWorkflowEngine, 'getRunStatus'>
  ) {}

  public async execute(
    query: ListRunsQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<ListRunsResult> {
    const metadata = await this.stateStore.listRuns({
      tenantId: context.scope.tenantId.value as ContractTenantId,
      ...(context.scope.projectId === undefined
        ? {}
        : { projectId: context.scope.projectId.value }),
      ...(context.scope.environmentId === undefined
        ? {}
        : { environmentId: context.scope.environmentId.value }),
      limit: query.limit,
    });
    const statuses = await this.readCanonicalStatuses(metadata);

    return {
      items: this.projectListItems(metadata, statuses),
    };
  }

  private projectListItems(
    items: ReadonlyArray<RunMetadata>,
    statuses: ReadonlyArray<Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>>
  ): RunListItemDto[] {
    return items.map((item, index) =>
      projectRunOperationalTruth({
        metadata: item,
        status: statuses[index]!,
        cancelDispatchConfirmed: statuses[index]!.status !== 'PENDING',
      })
    );
  }

  private async readCanonicalStatuses(items: ReadonlyArray<RunMetadata>) {
    const statuses: Array<Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>> = [];

    for (let offset = 0; offset < items.length; offset += RUN_STATUS_READ_CONCURRENCY) {
      const batch = items.slice(offset, offset + RUN_STATUS_READ_CONCURRENCY);
      statuses.push(
        ...(await Promise.all(
          batch.map((item) => this.engine.getRunStatus(runMetadataToEngineRunRef(item)))
        ))
      );
    }

    return statuses;
  }
}
