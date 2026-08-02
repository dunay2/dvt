import type { TenantId as ContractTenantId } from '@dvt/contracts';
import type { IRunStateStoreRead, IWorkflowEngine, RunMetadata } from '@dvt/engine';

import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';
import type { IRunExecutionContextRequirementResolver } from '../ports/runExecutionContextRequirementResolver.js';
import type {
  AuthorizedQueryExecutionContext,
  IListRunsUseCase,
  ListRunsQuery,
  ListRunsResult,
  RunListItemDto,
} from '../ports/runtime.js';

import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';
import { projectRunOperationalTruth } from './runOperationalTruth.js';
import { resolveRunRecoveryContextTrust } from './runRecoveryContextTrust.js';

const RUN_STATUS_READ_CONCURRENCY = 8;

export class ListRunsUseCase implements IListRunsUseCase {
  public constructor(
    private readonly stateStore: IRunStateStoreRead,
    private readonly engine: Pick<IWorkflowEngine, 'getRunStatus'>,
    private readonly executionContextReader?: IRunExecutionContextReferenceReader,
    private readonly executionContextRequirementResolver?: IRunExecutionContextRequirementResolver
  ) {}

  public async execute(
    query: ListRunsQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<ListRunsResult> {
    const metadata = await this.stateStore.listRuns({
      tenantId: context.scope.tenantId.value as ContractTenantId,
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

    const statuses = await this.readCanonicalStatuses(filtered);

    return {
      items: await Promise.all(
        filtered.map((item, index) => this.toListItem(item, statuses[index]!))
      ),
      nextCursor: this.buildNextCursor(filtered, query.limit),
    };
  }

  private async toListItem(
    item: RunMetadata,
    status: Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>
  ): Promise<RunListItemDto> {
    return projectRunOperationalTruth({
      metadata: item,
      status,
      recoveryContextTrusted: await resolveRunRecoveryContextTrust(
        this.executionContextReader,
        this.executionContextRequirementResolver,
        item,
        status
      ),
    });
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
