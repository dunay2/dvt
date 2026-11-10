/** Return authorized SQL and exact revision provenance without probing rows or publishing artifacts. */
import {
  TransformSqlProjectionRequestSchema,
  TransformSqlProjectionResponseSchema,
  type TransformSqlProjectionRequest,
  type TransformSqlProjectionResponse,
} from '@dvt/contracts';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';

import type { ResolveCanvasTransformProjection } from './resolveCanvasTransformProjection.js';

export class ProjectCanvasTransformSqlQuery {
  public constructor(
    private readonly deps: Readonly<{
      projection: Pick<ResolveCanvasTransformProjection, 'execute'>;
    }>
  ) {}

  public async execute(
    input: TransformSqlProjectionRequest,
    context: AuthorizedExecutionContext
  ): Promise<TransformSqlProjectionResponse> {
    const request = TransformSqlProjectionRequestSchema.parse(input);
    const { draftRevision, closure, projection } = await this.deps.projection.execute(
      request,
      context
    );
    return TransformSqlProjectionResponseSchema.parse({
      schemaVersion: 'canvas-transform-sql-projection.v1',
      ...request,
      draftRevision,
      semanticPlanSha256: closure.semanticDocument.semanticPlan.sha256,
      sql: projection.sql,
      provenance: {
        sourceRefs: projection.sourceRefs,
        ...(closure.externalProducers.size === 0
          ? {}
          : {
              modelRefs: [...closure.externalProducers.values()].map(
                (producer) => producer.provenance
              ),
            }),
      },
    });
  }
}
