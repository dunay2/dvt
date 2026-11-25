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
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import {
  compileModelSqlSource,
  pgColumnRef,
  pgRangeVar,
  sourceFieldType,
} from '@dvt/postgres-projection';
import { deriveSubstraitSchemas, type SubstraitDocument } from '@dvt/substrait-analysis';

import { projectAuthoringNodeToCanonical } from '../../src/app/services/workspace/workspaceGraphDraftProjection';
import { createDvtSubstraitProjectionDraft } from '../../src/app/views/canvas/canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from '../../src/app/views/canvas/canvasDvtTransformAuthoringAuthority';

import { stubStatefulCanvasDraftAuthoring } from './canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eApi, stubE2eJsonApi } from './e2eApiStub';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from './workspaceSession';

export const modelSqlSource = 'SELECT country FROM customers';

type ModelSqlScenario = Readonly<{
  model: WorkspaceGraphAuthoringNode;
  source: WorkspaceGraphAuthoringNode;
  sourceRef: ReturnType<typeof ConnectedSourceRefSchema.parse>;
  semantic: SubstraitDocument;
  target: { canvasId: string; transformNodeId: string };
  prefix: string;
}>;

export function stubModelSqlAuthoring(regenerate = false): Readonly<{
  model: WorkspaceGraphAuthoringNode;
  prefix: string;
}> {
  const scenario = prepareModelSqlJourney(regenerate);
  stubModelSqlContext(scenario);
  stubModelSqlCompilation(scenario, regenerate);
  stubModelSqlPreview(scenario);
  return { model: scenario.model, prefix: scenario.prefix };
}

function prepareModelSqlJourney(regenerate: boolean): ModelSqlScenario {
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
  if (regenerate) {
    const canonical = projectAuthoringNodeToCanonical(model);
    if (canonical == null) throw new Error('Expected a native Model fixture.');
    model.metadata = applyDvtSubstraitSemanticDocument(
      canonical,
      encodeDvtSubstraitSemanticDocument(compileJourneyModelSql(model, sourceRef))
    ).metadata;
  }
  const canvasId = draft.canvas.id;
  if (canvasId == null) throw new Error('Expected the saved Canvas identity.');
  const target = { canvasId, transformNodeId: model.id };
  const prefix = `/workspace/graph/canvases/${target.canvasId}/transforms/${target.transformNodeId}`;
  return { model, source, sourceRef, semantic, target, prefix };
}

function stubModelSqlContext({ model, source, sourceRef, target, prefix }: ModelSqlScenario): void {
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
}

function stubModelSqlCompilation(
  { model, source, sourceRef, semantic, target, prefix }: ModelSqlScenario,
  regenerate: boolean
): void {
  stubE2eApi('POST', `${prefix}/sql-compilation`, ({ body }) => {
    const input = ModelSqlCompilationRequestSchema.parse(body);
    const document = regenerate ? compileJourneyModelSql(model, sourceRef) : semantic;
    const compiled = deriveSubstraitSchemas(document);
    const outputFieldId = compiled.index.relations.get(compiled.index.rootId)!.fields[0]!.fieldId;
    return {
      body: ModelSqlCompilationResponseSchema.parse({
        schemaVersion: 'canvas-model-sql-compilation.v1',
        ...target,
        draftRevision: input.draftRevision,
        contextSha256: input.contextSha256,
        sqlSha256: sha256HexUtf8(input.sql),
        status: 'valid',
        normalizedSql: input.sql,
        semanticDocument: encodeDvtSubstraitSemanticDocument(document),
        columns: [{ id: outputFieldId, name: 'country', dataType: 'string', nullable: true }],
        inputAdditions: [{ nodeId: source.id, columnId: 'country' }],
        diagnostics: [],
      }),
    };
  });
}

function stubModelSqlPreview({ sourceRef, semantic, target, prefix }: ModelSqlScenario): void {
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
}

function compileJourneyModelSql(
  model: WorkspaceGraphAuthoringNode,
  sourceRef: ReturnType<typeof ConnectedSourceRefSchema.parse>
): SubstraitDocument {
  const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1);
  const node = projectAuthoringNodeToCanonical(
    saved == null
      ? model
      : WorkspaceGraphDraftSaveRequestSchema.parse(saved.body).draft.nodes.find(
          (candidate) => candidate.id === model.id
        )!
  );
  const semantic = node == null ? null : readDvtTransformAuthoringAuthority(node)?.semanticDocument;
  const currentDocument = semantic == null ? null : decodeDvtSubstraitSemanticDocument(semantic);
  const retainedRead =
    currentDocument == null
      ? undefined
      : [...deriveSubstraitSchemas(currentDocument).index.relations.values()].find(
          (entry) => entry.relation.relType.case === 'read'
        );
  return compileModelSqlSource(
    {
      SelectStmt: {
        op: 'SETOP_NONE',
        targetList: [{ ResTarget: { val: pgColumnRef('country') } }],
        fromClause: [pgRangeVar({ table: 'customers' })],
      },
    },
    {
      currentDocument,
      inputs: [
        {
          nodeId: 'source-customers',
          sqlName: 'customers',
          columns: ['name', 'email', 'country'].map((name) => ({
            id: name,
            name,
            type: sourceFieldType('string', true),
          })),
          source: { sourceRef, names: ['public', 'customers'] },
          retainedRead,
        },
      ],
    }
  ).document;
}
