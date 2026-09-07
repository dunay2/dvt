/**
 * Owned concern: orchestrate one verified physical warehouse Source rebind and
 * compensate the dbt artifact if graph CAS loses the race.
 */
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';

import {
  WarehouseSourceRebindBindingConflictError,
  WarehouseSourceRebindIdempotencyMismatchError,
  WarehouseSourceRebindNodeNotFoundError,
  type RebindWarehouseSourceInput,
  type RebindWarehouseSourceOutput,
} from '../ports/warehouseSourceRebind.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
} from '../ports/workspaceFiles.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';
import {
  resolveWorkspaceGraphDraftCanvasIds,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
} from '../ports/workspaceGraphDraft.js';

import type { WarehouseConnectionSourceObjectReader } from './WarehouseConnectionSourceObjectReader.js';
import {
  applySourceYamlRebindPlan,
  rollbackSourceYamlRebindPlan,
} from './warehouseSourceRebindArtifactTransaction.js';
import { prepareWarehouseSourceRebind } from './warehouseSourceRebindPlan.js';

export class RebindWarehouseSourceUseCase {
  public constructor(
    private readonly deps: Readonly<{
      draftStore: IWorkspaceGraphDraftStore;
      sourceObjectReader: WarehouseConnectionSourceObjectReader;
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      batchMutation: IWorkspaceFileBatchMutationPort;
      now: () => Date;
    }>
  ) {}

  public async execute(input: RebindWarehouseSourceInput): Promise<RebindWarehouseSourceOutput> {
    const stored = await this.deps.draftStore.read(input.scope);
    if (stored == null) throw new WarehouseSourceRebindNodeNotFoundError(input.nodeId);

    const parsedDraft = WorkspaceGraphAuthoringDraftSchema.safeParse(stored.draftPayload);
    if (!parsedDraft.success) {
      throw new WarehouseSourceRebindBindingConflictError('The persisted graph draft is invalid.');
    }
    const prepared = await prepareWarehouseSourceRebind({
      command: input,
      draft: parsedDraft.data,
      sourceObjectReader: this.deps.sourceObjectReader,
      workspaceFiles: this.deps.workspaceFiles,
    });
    const appliedFile =
      prepared.yamlPlan.previousFile.content === prepared.yamlPlan.content
        ? null
        : await applySourceYamlRebindPlan({
            scope: input.scope,
            idempotencyKey: input.idempotencyKey,
            plan: prepared.yamlPlan,
            batchMutation: this.deps.batchMutation,
          });

    try {
      const saveResult = await this.deps.draftStore.save({
        scope: input.scope,
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        expectedRevision: stored.revision,
        idempotencyKey: input.idempotencyKey,
        draft: prepared.nextDraft,
        canvasIds: resolveWorkspaceGraphDraftCanvasIds(prepared.nextDraft),
        requestHash: prepared.requestHash,
        revision: `source-rebind-${prepared.requestHash}`,
        nowIso: this.deps.now().toISOString(),
      });
      if (saveResult.kind === 'idempotency_mismatch') {
        throw new WarehouseSourceRebindIdempotencyMismatchError(input.idempotencyKey);
      }
      if (saveResult.kind !== 'saved') throw new WarehouseSourceRebindBindingConflictError();
      return {
        schemaVersion: 'source-rebind-result.v1',
        nodeId: input.nodeId,
        draftRevision: saveResult.revision,
        connectedSourceRef: prepared.nextRef,
      };
    } catch (error) {
      if (appliedFile != null && !appliedFile.deduplicated) {
        await rollbackSourceYamlRebindPlan({
          scope: input.scope,
          idempotencyKey: input.idempotencyKey,
          plan: prepared.yamlPlan,
          appliedReceipt: appliedFile,
          batchMutation: this.deps.batchMutation,
        });
      }
      throw error;
    }
  }
}
