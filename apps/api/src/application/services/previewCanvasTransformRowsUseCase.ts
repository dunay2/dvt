/** Owned concern: execute the PreviewCanvasTransformRows query against one protected draft. */
import {
  TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
  TransformDataSampleResponseSchema,
  type TransformDataSampleRequest,
  type TransformDataSampleResponse,
} from '@dvt/contracts';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import type { ICanvasTransformDataSampleProbe } from '../ports/canvasTransformDataSample.js';
import { CanvasTransformDataSampleUnavailableError } from '../ports/canvasTransformDataSample.js';
import { CanvasTransformProjectionUnavailableError } from '../ports/canvasTransformSql.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';

import type { ResolveCanvasTransformProjection } from './resolveCanvasTransformProjection.js';

export class PreviewCanvasTransformRowsUseCase {
  public constructor(
    private readonly deps: {
      readonly projection: Pick<ResolveCanvasTransformProjection, 'execute'>;
      readonly connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
      readonly probe: ICanvasTransformDataSampleProbe;
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
    const { scope, closure, projection, draftRevision } = prepared;

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
      draftRevision,
      semanticPlanSha256: closure.semanticDocument.semanticPlan.sha256,
      columns: sample.columns,
      rows: sample.rows,
      truncated: sample.truncated,
      limit: input.limit,
      provenance: {
        mode: 'live',
        sourceRefs: projection.sourceRefs,
        ...(closure.externalProducers.size === 0
          ? {}
          : {
              modelRefs: [...closure.externalProducers.values()].map(
                (producer) => producer.provenance
              ),
            }),
        queriedAt: sample.queriedAt,
        navigation: sample.navigation,
        limit: input.limit,
      },
    });
  }
}
