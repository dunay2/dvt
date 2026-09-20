/** Owned concern: execute the PreviewCanvasTransformRows query against one protected draft. */
import {
  TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
  TransformDataSampleResponseSchema,
  parseExecutionSelection,
  type TransformDataSampleRequest,
  type TransformDataSampleResponse,
} from '@dvt/contracts';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import type { ICanvasTransformDataSampleProbe } from '../ports/canvasTransformDataSample.js';
import { CanvasTransformDataSampleUnavailableError } from '../ports/canvasTransformDataSample.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';

import { projectDvtPostgresTransform } from './dvtPostgresTransformProjection.js';
import type { ResolveAuthorizedExecutableSubgraphService } from './resolveAuthorizedExecutableSubgraph.js';
import { resolveDvtTerminalTransformClosure } from './resolveDvtTerminalTransformClosure.js';

export class PreviewCanvasTransformRowsUseCase {
  public constructor(
    private readonly deps: {
      readonly graphDraftResolver: Pick<
        ResolveAuthorizedExecutableSubgraphService,
        'executeWithAuthorizedDraft'
      >;
      readonly connectionCatalog: IWarehouseConnectionCatalog;
      readonly probe: ICanvasTransformDataSampleProbe;
    }
  ) {}

  public async execute(
    input: TransformDataSampleRequest,
    context: AuthorizedExecutionContext
  ): Promise<TransformDataSampleResponse> {
    const resolved = await this.deps.graphDraftResolver.executeWithAuthorizedDraft(
      {
        selection: parseExecutionSelection({
          mode: 'upstream',
          nodeIds: [input.transformNodeId],
        }),
      },
      context
    );
    if (!resolved.ok) {
      throw new CanvasTransformDataSampleUnavailableError('selection_unavailable');
    }

    const { authorizedDraft } = resolved.value;
    const activeCanvasId = authorizedDraft.draft.activeCanvasId ?? authorizedDraft.draft.canvas.id;
    if (activeCanvasId !== input.canvasId) {
      throw new CanvasTransformDataSampleUnavailableError('canvas_changed');
    }

    let closure;
    let projection;
    try {
      closure = resolveDvtTerminalTransformClosure({
        draft: authorizedDraft.draft,
        selectedNodeIds: resolved.value.nodeIds,
        selectedEdgeIds: resolved.value.edgeIds,
      });
      if (closure.transform.id !== input.transformNodeId) {
        throw new Error('Resolved closure does not target the requested Transform.');
      }
      if (
        input.semanticPlanSha256 !== undefined &&
        input.semanticPlanSha256 !== closure.authority.semanticDocument.semanticPlan.sha256
      ) {
        throw new CanvasTransformDataSampleUnavailableError('canvas_changed');
      }
      if (input.relationId !== undefined && input.semanticPlanSha256 === undefined) {
        throw new CanvasTransformDataSampleUnavailableError('selection_unavailable');
      }
      projection = await projectDvtPostgresTransform(closure, undefined, input.relationId);
    } catch (error) {
      if (error instanceof CanvasTransformDataSampleUnavailableError) throw error;
      throw new CanvasTransformDataSampleUnavailableError('projection_unsupported');
    }

    const scope = {
      tenantId: context.scope.tenantId.value,
      projectId: context.scope.projectId?.value,
      environmentId: context.scope.environmentId?.value,
    };
    if (scope.projectId === undefined || scope.environmentId === undefined) {
      throw new CanvasTransformDataSampleUnavailableError('selection_unavailable');
    }
    const connection = await this.deps.connectionCatalog.getConnection(
      {
        tenantId: scope.tenantId,
        projectId: scope.projectId,
        environmentId: scope.environmentId,
      },
      closure.connectionRef.connectionId
    );
    if (
      connection.type !== closure.connectionRef.provider ||
      connection.credentialRef === undefined
    ) {
      throw new CanvasTransformDataSampleUnavailableError('connection_mismatch');
    }

    const sample = await this.deps.probe.previewTransformRows({
      type: connection.type,
      credentialRef: connection.credentialRef,
      sql: projection.sql,
      limit: input.limit,
      ...(projection.orderBy == null ? {} : { orderBy: projection.orderBy }),
    });
    return TransformDataSampleResponseSchema.parse({
      contractVersion: TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
      canvasId: input.canvasId,
      transformNodeId: input.transformNodeId,
      ...(input.relationId === undefined ? {} : { relationId: input.relationId }),
      draftRevision: authorizedDraft.revision,
      semanticPlanSha256: closure.authority.semanticDocument.semanticPlan.sha256,
      ...sample,
      limit: input.limit,
    });
  }
}
