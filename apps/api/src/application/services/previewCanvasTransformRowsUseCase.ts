/** Owned concern: execute the PreviewCanvasTransformRows query against one protected draft. */
import {
  TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
  TransformDataSampleResponseSchema,
  TransformSqlDraftDataSampleResponseSchema,
  type ConnectionRef,
  type ConnectedSourceRef,
  type TransformSqlDraftDataSampleRequest,
  type TransformDataSampleRequest,
  type TransformDataSampleResponse,
} from '@dvt/contracts';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';
import type { ICanvasTransformDataSampleProbe } from '../ports/canvasTransformDataSample.js';
import { CanvasTransformDataSampleUnavailableError } from '../ports/canvasTransformDataSample.js';
import { CanvasTransformProjectionUnavailableError } from '../ports/canvasTransformSql.js';
import type { DbtModelProducer } from '../ports/dbtModelProducer.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';

import type { PrepareCanvasSqlDraftProjection } from './prepareCanvasSqlDraftProjection.js';
import type { ResolveCanvasTransformProjection } from './resolveCanvasTransformProjection.js';

type RowQuery = Readonly<{
  connectionRef: ConnectionRef;
  sql: string;
  orderBy: Parameters<ICanvasTransformDataSampleProbe['previewTransformRows']>[0]['orderBy'];
  draftRevision: string;
  semanticPlanSha256: string;
  sourceRefs: readonly ConnectedSourceRef[];
  modelRefs: readonly DbtModelProducer['provenance'][];
}>;

export class PreviewCanvasTransformRowsUseCase {
  public constructor(
    private readonly deps: {
      readonly projection: Pick<ResolveCanvasTransformProjection, 'execute'>;
      readonly connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
      readonly probe: ICanvasTransformDataSampleProbe;
      readonly sqlDraftProjection?: Pick<PrepareCanvasSqlDraftProjection, 'execute'>;
    }
  ) {}

  public async execute(
    input: TransformDataSampleRequest,
    context: AuthorizedExecutionContext
  ): Promise<TransformDataSampleResponse> {
    let prepared;
    try {
      prepared = await this.deps.projection.execute(input, context);
    } catch (error) {
      if (error instanceof CanvasTransformProjectionUnavailableError)
        throw new CanvasTransformDataSampleUnavailableError(
          error.reason === 'file_access_denied' ? 'projection_unsupported' : error.reason
        );
      throw error;
    }
    const { closure, projection, draftRevision } = prepared;
    return this.preview(input, context, {
      connectionRef: closure.connectionRef,
      sql: projection.sql,
      orderBy: projection.orderBy ?? undefined,
      draftRevision,
      semanticPlanSha256: closure.semanticDocument.semanticPlan.sha256,
      sourceRefs: projection.sourceRefs,
      modelRefs: [...closure.externalProducers.values()].map((producer) => producer.provenance),
    });
  }

  public async executeSqlDraft(
    input: TransformSqlDraftDataSampleRequest,
    context: AuthorizedExecutionContext
  ) {
    if (this.deps.sqlDraftProjection == null)
      throw new CanvasModelSqlUnavailableError('model_unavailable');
    const prepared = await this.deps.sqlDraftProjection.execute(input, context);
    const sample = await this.preview(input, context, {
      connectionRef: prepared.connectionRef,
      sql: prepared.projection.sql,
      orderBy: prepared.projection.orderBy ?? undefined,
      draftRevision: prepared.response.draftRevision,
      semanticPlanSha256: prepared.semanticPlanSha256,
      sourceRefs: prepared.projection.projection.inputs.flatMap((source) =>
        source.sourceRef == null ? [] : [source.sourceRef]
      ),
      modelRefs: [...prepared.modelRefs],
    });
    return TransformSqlDraftDataSampleResponseSchema.parse({
      schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
      contextSha256: prepared.response.contextSha256,
      sqlSha256: prepared.response.sqlSha256,
      sample,
    });
  }

  private async preview(
    input: TransformDataSampleRequest,
    context: AuthorizedExecutionContext,
    prepared: RowQuery
  ): Promise<TransformDataSampleResponse> {
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (projectId == null || environmentId == null)
      throw new CanvasTransformDataSampleUnavailableError('selection_unavailable');

    const connection = await this.deps.connectionCatalog.getConnection(
      {
        tenantId: context.scope.tenantId.value,
        projectId,
        environmentId,
      },
      prepared.connectionRef.connectionId
    );
    if (
      connection.type !== prepared.connectionRef.provider ||
      connection.credentialRef === undefined
    ) {
      throw new CanvasTransformDataSampleUnavailableError('connection_mismatch');
    }

    const sample = await this.deps.probe.previewTransformRows({
      type: connection.type,
      credentialRef: connection.credentialRef,
      sql: prepared.sql,
      limit: input.limit,
      ...(prepared.orderBy == null ? {} : { orderBy: prepared.orderBy }),
    });
    return TransformDataSampleResponseSchema.parse({
      contractVersion: TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
      canvasId: input.canvasId,
      transformNodeId: input.transformNodeId,
      ...(input.relationId === undefined ? {} : { relationId: input.relationId }),
      draftRevision: prepared.draftRevision,
      semanticPlanSha256: prepared.semanticPlanSha256,
      columns: sample.columns,
      rows: sample.rows,
      truncated: sample.truncated,
      limit: input.limit,
      provenance: {
        mode: 'live',
        sourceRefs: prepared.sourceRefs,
        ...(prepared.modelRefs.length === 0
          ? {}
          : {
              modelRefs: prepared.modelRefs,
            }),
        queriedAt: sample.queriedAt,
        navigation: sample.navigation,
        limit: input.limit,
      },
    });
  }
}
