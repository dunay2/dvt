/** Compose the real protected projection and SQL presentation over the existing external-producer fixture. */
import { URL } from 'node:url';

import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  TransformSqlProjectionRequestSchema,
  type TransformSqlProjectionRequest,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { projectExternalProducerAst, type PostgresAstNode } from '@dvt/postgres-projection';

import {
  buildEnvironmentAccessScope,
  AUTHORIZATION_ACTION,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../src/application/ports/authContract.js';
import { ProjectCanvasSqlPresentation } from '../../../src/application/services/projectCanvasSqlPresentation.js';
import { ProjectCanvasTransformSqlQuery } from '../../../src/application/services/projectCanvasTransformSqlQuery.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { ResolveCanvasTransformProjection } from '../../../src/application/services/resolveCanvasTransformProjection.js';
import { ValidatePostgresTransformSqlUseCase } from '../../../src/application/services/validatePostgresTransformSqlUseCase.js';
import { TenantId, ProjectId, EnvironmentId } from '../../../src/domain/auth/types.js';
import { PostgresSqlPresentationEvidenceReader } from '../../../src/infrastructure/warehouseSourceImport/PostgresSqlPresentationEvidenceReader.js';
import { WorkspacePostgresTransformSqlValidator } from '../../../src/infrastructure/warehouseSourceImport/WorkspacePostgresTransformSqlValidator.js';
import { buildDbtInputPreviewFixture } from '../../fixtures/dvtDbtInputPreviewFixture.js';

export function presentationFixture(
  databaseUrl: string,
  compiledAst?: PostgresAstNode
): ReturnType<typeof buildDbtInputPreviewFixture> &
  Readonly<{
    query: ProjectCanvasTransformSqlQuery;
    reader: PostgresSqlPresentationEvidenceReader;
    context: AuthorizedExecutionContext;
    request: TransformSqlProjectionRequest;
  }> {
  const f = buildDbtInputPreviewFixture();
  const producers =
    compiledAst === undefined
      ? f.externalProducers
      : new Map(
          [...f.externalProducers].map(([id, producer]) => [
            id,
            { ...producer, projection: projectExternalProducerAst(producer.document, compiledAst) },
          ])
        );
  const context: AuthorizedExecutionContext = {
    principal: { principalId: 'proof' } as AuthorizedExecutionContext['principal'],
    scope: buildEnvironmentAccessScope(
      TenantId.unsafe('tenant'),
      ProjectId.unsafe('project'),
      EnvironmentId.unsafe('dev')
    ),
    action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
    requestId: 'sql-proof',
    authorizedAt: new Date(),
  };
  const credentialResolver = {
    resolveCredential: async (ref: string) => (ref === 'proof-credential' ? databaseUrl : null),
  };
  const catalog = {
    getConnection: async () => ({
      id: 'local-postgres-proof',
      type: 'postgres' as const,
      name: 'Proof',
      database: new URL(databaseUrl).pathname.slice(1),
      credentialRef: 'proof-credential',
      sourceObjects: [],
    }),
  };
  const reader = new PostgresSqlPresentationEvidenceReader({ credentialResolver });
  const presentation = new ProjectCanvasSqlPresentation({
    catalog,
    reader,
    authorizer: {
      authorize: async (_principal, requested) => ({
        ok: true as const,
        context: { ...context, action: requested.action },
      }),
    },
    validator: new ValidatePostgresTransformSqlUseCase({
      catalog,
      semanticValidator: new WorkspacePostgresTransformSqlValidator({ credentialResolver }),
    }),
  });
  const query = new ProjectCanvasTransformSqlQuery({
    presentation,
    projection: new ResolveCanvasTransformProjection({
      graphDraftResolver: new ResolveAuthorizedExecutableSubgraphService({
        planner: new PlannerFacade(),
        workspaceGraphDraftStore: {
          read: async () => ({
            schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
            revision: 'proof-revision',
            draftPayload: f.draft,
          }),
        } as never,
      }),
      modelProducers: { resolve: async () => producers },
    }),
  });
  return {
    ...f,
    externalProducers: producers,
    query,
    reader,
    context,
    request: TransformSqlProjectionRequestSchema.parse({
      canvasId: f.draft.activeCanvasId ?? f.draft.canvas.id,
      transformNodeId: f.targetId,
      semanticPlanSha256: f.semanticPlanSha256,
    }),
  };
}
