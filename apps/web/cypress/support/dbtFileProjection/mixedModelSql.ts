import {
  ConnectedSourceRefSchema,
  DbtProjectGraphProjectionSchema,
  DvtTransformAuthoringAuthorityV1Schema,
  TransformSqlProjectionResponseSchema,
  type DbtProjectGraphProjection,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphDraftReadSuccess,
} from '@dvt/contracts';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../../src/app/services/workspace/workspaceGraphDraftProjection';
import type { CanonicalEdge, CanonicalNode } from '../../../src/app/types/canonical';
import { createCanvasDbtModelDefinition } from '../../../src/app/views/canvas/canvasDbtModelReference';
import { projectCanonicalNodeToAuthoringNode } from '../../../src/app/views/canvas/canvasDraftAuthoring';
import { resolveCanvasDvtCompositionInputs } from '../../../src/app/views/canvas/canvasDvtCompositionInputCatalog';
import { applyDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtTransformAuthoringAuthority';
import { configureCanvasStagedComposition } from '../../../src/app/views/canvas/canvasStagedCompositionConfiguration';
import { createPendingSourceOccurrence } from '../../../src/app/views/canvas/relational-source-occurrence/pendingSourceOccurrence';
import { buildCanvasAuthoringDraft } from '../canvasDrafts/buildCanvasAuthoringDraft';
import { buildScenarioDraft } from '../canvasDrafts/scenario';
import { requestLiveDbtProjectGraph } from '../dbtProjectLive';
import { seedLiveSelectedClosureDraft } from '../liveCanvasDraftAuthoring';
import {
  buildAuthorizationHeaders,
  buildBearerAuth,
  buildDraftReadUrl,
} from '../liveProtectedRequest';
import { readLiveWorkspaceFile, resolveLiveWorkspaceSession } from '../liveProtectedRuntime';
import { livePostgresDatabaseName } from '../liveWarehouseSourceImport';
import { openWorkbenchProperties } from '../relationalWorkbench/navigation';

import { CANVAS_ID, PROJECT_ROOT, PROJECT_FILES, visitProjectCanvas } from './project';

const MIXED_MODEL_ID = 'mixed-file-model-transform';

/** Build real canonical JOIN semantics from a current file publication and the LIVE source fixture. */
function buildMixedFileModelDraft(
  projection: DbtProjectGraphProjection
): WorkspaceGraphAuthoringDraft {
  const seed = buildCanvasAuthoringDraft({
    authoringGenerated: true,
    terminalTransformPreview: true,
    sourceDatabaseName: livePostgresDatabaseName(),
  });
  const source = projectWorkspaceGraphAuthoringDraftSemanticGraph(seed).canonicalNodes.find(
    (node) => node.id === 'source-1'
  )!;
  const producer = createCanvasDbtModelDefinition(projection, 'model.analytics.orders');
  const model: CanonicalNode = {
    id: MIXED_MODEL_ID,
    name: 'Mixed file model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata: {},
  };
  const edges: CanonicalEdge[] = [source, producer].map((input) => ({
    id: `${input.id}-mixed-model`,
    sourceId: input.id,
    targetId: model.id,
    relation: 'lineage',
  }));
  const inputs = resolveCanvasDvtCompositionInputs({
    nodes: [source, producer, model],
    edges,
    targetNodeId: model.id,
  });
  expect(inputs, 'one physical source and one current file publication').to.have.length(2);
  const sources = inputs.map(createPendingSourceOccurrence);
  const configured = configureCanvasStagedComposition(
    {
      id: 'mixed-inner-join',
      operation: 'inner_join',
      inputs: sources.map((input) => input.read.binding.relationId),
    },
    inputs,
    sources,
    []
  );
  if (configured.semanticDocument == null) throw new Error('The real mixed JOIN was not admitted.');
  const configuredModel = applyDvtSubstraitSemanticDocument(model, configured.semanticDocument);
  return buildScenarioDraft({
    canvas: seed.canvas,
    nodes: [source, producer, configuredModel].map(projectCanonicalNodeToAuthoringNode),
    edges,
    nodePositions: {
      [source.id]: { x: 50, y: 70 },
      [producer.id]: { x: 50, y: 300 },
      [model.id]: { x: 500, y: 170 },
    },
  });
}

type MixedModelEvidence = Readonly<{
  draftRevision: string;
  semanticPlanSha256: string;
  sourceRef: ReturnType<typeof ConnectedSourceRefSchema.parse>;
  projection: DbtProjectGraphProjection;
  persistedDraftRecord: WorkspaceGraphDraftReadSuccess['record'];
}>;

function readMixedDraft(): Cypress.Chainable<Cypress.Response<WorkspaceGraphDraftReadSuccess>> {
  return cy.request<WorkspaceGraphDraftReadSuccess>({
    method: 'GET',
    url: buildDraftReadUrl(resolveLiveWorkspaceSession()),
    headers: buildAuthorizationHeaders(),
    auth: buildBearerAuth(),
  });
}

export function seedMixedModel(): Cypress.Chainable<MixedModelEvidence> {
  return requestLiveDbtProjectGraph(PROJECT_ROOT, CANVAS_ID).then((response) => {
    expect(response.status).to.equal(200);
    const projection = DbtProjectGraphProjectionSchema.parse(response.body);
    const draft = buildMixedFileModelDraft(projection);
    const model = draft.nodes.find((node) => node.id === MIXED_MODEL_ID)!;
    const semanticPlanSha256 = DvtTransformAuthoringAuthorityV1Schema.parse(
      model.metadata?.transformAuthoring
    ).semanticDocument.semanticPlan.sha256;
    const sourceRef = ConnectedSourceRefSchema.parse(
      draft.nodes.find((node) => node.id === 'source-1')?.metadata?.connectedSourceRef
    );
    return seedLiveSelectedClosureDraft({ draft }).then((draftRevision) =>
      readMixedDraft().then(({ status, body }) => {
        expect(status).to.equal(200);
        expect(body.record.revision).to.equal(draftRevision);
        return {
          projection,
          draftRevision,
          semanticPlanSha256,
          sourceRef,
          persistedDraftRecord: body.record,
        };
      })
    );
  });
}

function readSqlProjection(
  semanticPlanSha256: string
): Cypress.Chainable<ReturnType<typeof TransformSqlProjectionResponseSchema.parse>> {
  return cy.wait('@mixedModelSql', { timeout: 60_000 }).then(({ request, response }) => {
    expect(response?.statusCode).to.equal(200);
    expect(Object.fromEntries(new URL(request.url).searchParams)).to.deep.equal({
      ...resolveLiveWorkspaceSession(),
      semanticPlanSha256,
      presentation: 'readable',
    });
    return TransformSqlProjectionResponseSchema.parse(response?.body);
  });
}

function assertCompiledModel(
  sql: ReturnType<typeof TransformSqlProjectionResponseSchema.parse>,
  { draftRevision, semanticPlanSha256, sourceRef, projection }: MixedModelEvidence
): void {
  expect(sql.presentation, 'explicit readable presentation envelope').not.to.be.undefined;
  expect(sql).to.include({
    canvasId: 'main-canvas',
    transformNodeId: MIXED_MODEL_ID,
    draftRevision,
    semanticPlanSha256,
  });
  expect(sql.provenance.sourceRefs).to.deep.equal([sourceRef]);
  expect(sql.provenance.modelRefs).to.have.length(1);
  const { analysisSha256, ...modelIdentity } = sql.provenance.modelRefs![0]!;
  expect(modelIdentity).to.deep.equal({
    canvasId: CANVAS_ID,
    uniqueId: 'model.analytics.orders',
    contentSetSha256: projection.projectRevision.contentSetSha256,
  });
  // Native compilation includes compiled SQL in the analysis identity; parse is a different phase.
  expect(
    analysisSha256,
    'compiled analysis differs from the parse-only resource snapshot'
  ).not.to.equal(projection.analysisSha256);
  expect(sql.sql)
    .to.match(/\bjoin\b/i)
    .and.contain('customer-1');
  expect(sql.sql)
    .to.match(/raw"?\."?orders/)
    .and.match(/public"?\."?orders/);
}

function assertDisplayedSql(): void {
  cy.get('[data-slot="canvas-node-workbench-code-content"] .view-lines .view-line', {
    timeout: 20_000,
  })
    .should('contain.text', 'customer-1')
    .and(($lines) => {
      // Monaco stores each display line separately; concatenation would turn "i0" + "JOIN" into "i0JOIN".
      const displayedSql = $lines
        .toArray()
        .map((line) => line.textContent ?? '')
        .join('\n');
      expect(displayedSql, 'Monaco displays the protected SQL projection').to.match(/\bjoin\b/i);
    });
}

export function inspectMixedModel(evidence: MixedModelEvidence): void {
  const fileWrites: string[] = [];
  const rowReads: string[] = [];
  cy.intercept(
    'GET',
    `**/workspace/graph/canvases/main-canvas/transforms/${MIXED_MODEL_ID}/sql?*`
  ).as('mixedModelSql');
  cy.intercept('POST', '**/workspace/files/**', (request) => {
    fileWrites.push(request.url);
  });
  cy.intercept('GET', '**/workspace/graph/**/data-sample?*', (request) => {
    rowReads.push(request.url);
  });
  cy.viewport(1500, 900);
  visitProjectCanvas('/canvas');
  openWorkbenchProperties(MIXED_MODEL_ID);
  cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
  cy.get('[data-slot="dvt-transform-output-view-selector"]').select('postgres-sql');
  readSqlProjection(evidence.semanticPlanSha256).then((original) => {
    assertCompiledModel(original, evidence);
    assertDisplayedSql();
    cy.get('[data-slot="dvt-transform-output-view-selector"]').select('substrait');
    cy.get('[data-slot="dvt-transform-output-view-selector"]').select('postgres-sql');
    readSqlProjection(evidence.semanticPlanSha256).should('deep.equal', original);
  });
  cy.then(() => {
    expect(fileWrites, 'inspection does not write project artifacts').to.deep.equal([]);
    expect(rowReads, 'SQL inspection does not execute row Preview').to.deep.equal([]);
  });
  readMixedDraft().then((response) => {
    expect(response.status).to.equal(200);
    expect(
      response.body.record,
      'inspection preserves the exact saved draft and revision'
    ).to.deep.equal(evidence.persistedDraftRecord);
  });
  readLiveWorkspaceFile(`${PROJECT_ROOT}/models/orders.sql`).then((response) => {
    expect(response.body).to.have.property(
      'content',
      PROJECT_FILES[`${PROJECT_ROOT}/models/orders.sql`]
    );
  });
}
