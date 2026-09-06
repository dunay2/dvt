/** Owned concern: apply and compensate the dbt artifact mutation for one Source rebind. */
import type { WorkspaceGraphDraftScope } from '@dvt/contracts';

import { WarehouseSourceRebindBindingConflictError } from '../ports/warehouseSourceRebind.js';
import { WorkspaceFileRevisionConflictError } from '../ports/workspaceFiles.js';
import type {
  IWorkspaceFileBatchMutationPort,
  WorkspaceFileBatchReceipt,
  WorkspaceFileContent,
} from '../ports/workspaceFiles.js';

export type SourceYamlRebindPlan = Readonly<{
  path: string;
  previousFile: WorkspaceFileContent;
  content: string;
}>;

export async function applySourceYamlRebindPlan(input: {
  scope: WorkspaceGraphDraftScope;
  idempotencyKey: string;
  plan: SourceYamlRebindPlan;
  batchMutation: IWorkspaceFileBatchMutationPort;
}): Promise<WorkspaceFileBatchReceipt> {
  const result = await input.batchMutation.apply(input.scope, {
    idempotencyKey: `${input.idempotencyKey}:source-rebind:apply`,
    expectedFiles: [
      { path: input.plan.path, expectedContentSha256: input.plan.previousFile.contentSha256 },
    ],
    writes: [{ path: input.plan.path, content: input.plan.content }],
    deletes: [],
  });
  if (result.kind === 'conflict') {
    const conflict = result.conflicts[0];
    throw new WorkspaceFileRevisionConflictError(
      conflict?.path ?? input.plan.path,
      conflict?.currentContentSha256 ?? null
    );
  }
  return result;
}

export async function rollbackSourceYamlRebindPlan(input: {
  scope: WorkspaceGraphDraftScope;
  idempotencyKey: string;
  plan: SourceYamlRebindPlan;
  appliedReceipt: WorkspaceFileBatchReceipt;
  batchMutation: IWorkspaceFileBatchMutationPort;
}): Promise<void> {
  const applied = input.appliedReceipt.writes.find((write) => write.path === input.plan.path);
  if (applied == null) {
    throw new WarehouseSourceRebindBindingConflictError(
      'The Source rebind receipt is missing the applied dbt source artifact.'
    );
  }
  const result = await input.batchMutation.apply(input.scope, {
    idempotencyKey: `${input.idempotencyKey}:source-rebind:rollback`,
    expectedFiles: [{ path: input.plan.path, expectedContentSha256: applied.contentSha256 }],
    writes: [{ path: input.plan.path, content: input.plan.previousFile.content }],
    deletes: [],
  });
  if (result.kind === 'conflict') {
    const conflict = result.conflicts[0];
    throw new WorkspaceFileRevisionConflictError(
      conflict?.path ?? input.plan.path,
      conflict?.currentContentSha256 ?? null
    );
  }
}
