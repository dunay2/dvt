/** Prepare the scoped Model SQL authoring transport and semantic proposal for its browser journey. */
import {
  allocateDvtFieldId,
  ConnectedSourceRefSchema,
  ModelSqlCompilationRequestSchema,
  ModelSqlCompilationResponseSchema,
  ModelSqlContextResponseSchema,
  TransformSqlDraftDataSampleRequestSchema,
  TransformSqlDraftDataSampleResponseSchema,
  TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
  WorkspaceGraphDraftSaveRequestSchema,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { projectAuthoringNodeToCanonical } from '../../src/app/services/workspace/workspaceGraphDraftProjection';
import { createDvtSubstraitProjectionDraft } from '../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { encodeDvtSubstraitSemanticDocument } from '../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from '../../src/app/views/canvas/canvasDvtTransformAuthoringAuthority';

import { stubStatefulCanvasDraftAuthoring } from './canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eApi, stubE2eJsonApi } from './e2eApiStub';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from './workspaceSession';

export const modelSqlSource = 'SELECT country FROM customers';

export function stubModelSqlAuthoring() {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  const draft = stubStatefulCanvasDraftAuthoring({ projectionModel: true });
  const source = draft.nodes.find((node) => node.id === 'source-customers')!;
  const model = draft.nodes.find((node) => node.id === 'transform-customers')!;
  model.metadata = {};
  const sourceRef = ConnectedSourceRefSchema.parse(source.metadata!.connectedSourceRef);
  const semantic = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'public',
      table: 'customers',
      sourceRef,
      fields: ['name', 'email', 'country'].map((name) => ({ name, dataType: 'string' })),
    },
    targetNodeId: model.id,
    outputs: [{ fieldId: allocateDvtFieldId(), name: 'country', sourceFieldName: 'country' }],
  });
  const root = deriveSubstraitSchemas(semantic);
  const fieldId = root.index.relations.get(root.index.rootId)!.fields[0]!.fieldId;
  const target = { canvasId: draft.canvas.id, transformNodeId: model.id };
  const prefix = `/workspace/graph/canvases/${target.canvasId}/transforms/${target.transformNodeId}`;
  stubE2eApi('GET', `${prefix}/sql-context`, () => {
    const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1);
    const currentModel = projectAuthoringNodeToCanonical(
      saved == null
        ? model
        : WorkspaceGraphDraftSaveRequestSchema.parse(saved.body).draft.nodes.find(
            (node) => node.id === model.id
          )!
    );
    const document =
      currentModel == null
        ? null
        : readDvtTransformAuthoringAuthority(currentModel)?.semanticDocument;
    const semanticSha = document?.semanticPlan.sha256 ?? null;
    return {
      body: ModelSqlContextResponseSchema.parse({
        schemaVersion: 'canvas-model-sql-context.v1',
        ...target,
        draftRevision: semanticSha == null ? 'sql-context-r1' : `sql-context-${semanticSha}`,
        contextSha256: sha256HexUtf8(JSON.stringify([semanticSha, sourceRef])),
        semanticPlanSha256: semanticSha,
        connectionRef: sourceRef.connectionRef,
        sql: semanticSha == null ? null : modelSqlSource,
        inputs: [
          {
            nodeId: source.id,
            name: source.name,
            sqlName: 'customers',
            columns: ['name', 'email', 'country'].map((name) => ({
              id: name,
              name,
              dataType: 'string',
              nullable: true,
            })),
          },
        ],
        diagnostics: [],
      }),
    };
  });
  stubE2eApi('POST', `${prefix}/sql-compilation`, ({ body }) => {
    const input = ModelSqlCompilationRequestSchema.parse(body);
    return {
      body: ModelSqlCompilationResponseSchema.parse({
        schemaVersion: 'canvas-model-sql-compilation.v1',
        ...target,
        draftRevision: input.draftRevision,
        contextSha256: input.contextSha256,
        sqlSha256: sha256HexUtf8(input.sql),
        status: 'valid',
        normalizedSql: input.sql,
        semanticDocument: encodeDvtSubstraitSemanticDocument(semantic),
        columns: [{ id: fieldId, name: 'country', dataType: 'string', nullable: true }],
        inputAdditions: [{ nodeId: source.id, columnId: 'country' }],
        diagnostics: [],
      }),
    };
  });
  stubE2eApi('POST', `${prefix}/data-sample`, ({ body }) => {
    const input = TransformSqlDraftDataSampleRequestSchema.parse(body);
    return {
      body: TransformSqlDraftDataSampleResponseSchema.parse({
        schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
        contextSha256: input.contextSha256,
        sqlSha256: sha256HexUtf8(input.sql),
        sample: {
          contractVersion: TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
          ...target,
          draftRevision: input.draftRevision,
          semanticPlanSha256: encodeDvtSubstraitSemanticDocument(semantic).semanticPlan.sha256,
          limit: input.limit,
          columns: [{ name: 'country', type: 'text', nullable: true }],
          rows: [{ values: ['SQL_ROW_3944'] }],
          truncated: false,
          provenance: {
            mode: 'live',
            sourceRefs: [sourceRef],
            queriedAt: '2026-11-17T00:00:00.000Z',
            navigation: 'bounded-first-page',
            limit: input.limit,
          },
        },
      }),
    };
  });
  return { model, prefix };
}
