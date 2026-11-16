/** Return authorized SQL and exact revision provenance without probing rows or publishing artifacts. */
import {
  TransformSqlProjectionRequestSchema,
  TransformSqlProjectionResponseSchema,
  type TransformSqlProjectionRequest,
  type TransformSqlProjectionResponse,
} from '@dvt/contracts';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';

import type { ProjectCanvasSqlPresentation } from './projectCanvasSqlPresentation.js';
import type { ResolveCanvasTransformProjection } from './resolveCanvasTransformProjection.js';

export class ProjectCanvasTransformSqlQuery {
  public constructor(
    private readonly deps: Readonly<{
      projection: Pick<ResolveCanvasTransformProjection, 'execute'>;
      presentation: Pick<ProjectCanvasSqlPresentation, 'execute'>;
    }>
  ) {}

  public async execute(
    input: TransformSqlProjectionRequest,
    context: AuthorizedExecutionContext
  ): Promise<TransformSqlProjectionResponse> {
    const request = TransformSqlProjectionRequestSchema.parse(input);
    const { draftRevision, scope, closure, projection } = await this.deps.projection.execute(
      request,
      context
    );
    const { presentation, ...identity } = request;
    return TransformSqlProjectionResponseSchema.parse({
      schemaVersion: 'canvas-transform-sql-projection.v1',
      ...identity,
      draftRevision,
      semanticPlanSha256: closure.semanticDocument.semanticPlan.sha256,
      sql: projection.sql,
      ...(presentation === undefined
        ? {}
        : {
            presentation: await this.deps.presentation.execute(
              {
                scope,
                connectionRef: closure.connectionRef,
                ast: projection.ast,
                sql: projection.sql,
              },
              context
            ),
          }),
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
