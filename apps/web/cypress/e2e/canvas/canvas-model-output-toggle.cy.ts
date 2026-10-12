/** Owned concern: prove Model output authoring and column-menu lifecycle through save and reload. */
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { ConnectedSourceRefSchema } from '@dvt/contracts';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../../src/app/services/workspace/workspaceGraphDraftProjection';
import { projectCanonicalNodeToAuthoringNode } from '../../../src/app/views/canvas/canvasDraftAuthoring';
import { createDvtSubstraitProjectionDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { normalizeProjectCanvasDraft } from '../../../src/app/views/canvas/canvasProjectCanvasLifecycle';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import { openModelOutputs } from '../../support/relationalWorkbench/fieldSelection';
import { revisitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { hoverWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubConnectedModel(): void {
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
  const draft = stubStatefulCanvasDraftAuthoring({
    canvasKind: 'transformation',
    columnMapping: true,
    columnMappingNotNullCustomer: true,
  });
  const source = draft.nodes.find((node) => node.id === 'source-orders')!;
  const model = draft.nodes.find((node) => node.id === 'model-orders')!;
  const columns = source.metadata!.columns as { name: string; type: string; nullable?: boolean }[];
  const document = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef: ConnectedSourceRefSchema.parse(source.metadata!.connectedSourceRef),
      fields: columns.map((column) => ({ name: column.name, dataType: column.type })),
    },
    targetNodeId: model.id,
    outputs: [],
  });
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
    throw new Error('Expected Project root');
  const read = root.value.input.relType.value.input!.relType;
  if (read.case !== 'read') throw new Error('Expected physical Read');
  read.value.baseSchema!.struct!.types.forEach((type, ordinal) => {
    if (columns[ordinal]!.nullable !== false) return;
    if (type.kind.value == null || !('nullability' in type.kind.value))
      throw new Error('Expected nullable physical type');
    type.kind.value.nullability = Type_Nullability.REQUIRED;
  });
  model.metadata = {
    ...model.metadata,
    transformAuthoring: {
      version: 'v1',
      mode: 'substrait',
      semanticDocument: encodeDvtSubstraitSemanticDocument(document),
    },
  };
  const { canonicalNodes } = projectWorkspaceGraphAuthoringDraftSemanticGraph(draft);
  const normalized = normalizeProjectCanvasDraft({
    ...draft,
    nodes: canonicalNodes.map(projectCanonicalNodeToAuthoringNode),
  });
  expect(normalized.nodes.find((node) => node.id === model.id)!.metadata).to.deep.equal(
    model.metadata
  );
  Object.assign(draft, normalized);
}

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
      window.localStorage.setItem(
        'dvt-web-canvas-interaction',
        JSON.stringify({
          state: {
            impactOverlayEnabled: false,
            columnLevelLineageEnabled: true,
            canvasLayouts: {},
          },
          version: 0,
        })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

type DraftSave = {
  draft?: {
    nodes?: Array<{ id?: string; metadata?: Record<string, unknown> }>;
  };
};

function getModelSemanticSaves(): ReturnType<typeof getE2eApiCalls> {
  return getE2eApiCalls('/workspace/graph/draft', 'PUT').filter((call) => {
    const savedModel = (call.body as DraftSave | undefined)?.draft?.nodes?.find(
      (node) => node.id === 'model-orders'
    );
    return savedModel?.metadata?.transformAuthoring != null;
  });
}

function savedOutputNames(index: number): string[] {
  const savedModel = (
    getModelSemanticSaves()[index]?.body as DraftSave | undefined
  )?.draft?.nodes?.find((node) => node.id === 'model-orders');
  const authority = savedModel?.metadata?.transformAuthoring as
    { semanticDocument?: unknown } | undefined;
  const document = decodeDvtSubstraitSemanticDocument(authority?.semanticDocument);
  const { index: relations, schemas } = deriveSubstraitSchemas(document);
  const read = [...relations.relations.values()].find(
    (entry) => entry.relation.relType.case === 'read'
  )!;
  const customerBinding = read.fields.find((field) => field.displayName === 'customer')!;
  const customer = schemas.get(read.binding.relationId)![customerBinding.outputOrdinal]!;
  const customerType = customer.type.kind.value;
  if (customerType == null || !('nullability' in customerType))
    throw new Error('Expected customer nullability');
  expect(customerType.nullability, 'source NN survives inclusion and exclusion').to.equal(
    Type_Nullability.REQUIRED
  );
  return relations.relations
    .get(relations.rootId)!
    .fields.filter((field) => field.parentFieldId == null)
    .toSorted((left, right) => left.outputOrdinal - right.outputOrdinal)
    .map((field) => field.displayName!);
}

function modelCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.react-flow__node[data-id="model-orders"]');
}

function modelColumnRow(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return modelCard().contains('[data-slot="graph-node-column-row"]', name);
}

function expectOutput(name: string, output: boolean): void {
  cy.get(
    `[data-slot="canvas-model-output-inspector"] [data-slot="relation-output-toggle"][data-field-name="${name}"]`
  )
    .should('not.be.disabled')
    .and('have.attr', 'data-included', String(output));
}

function openModelColumns(): void {
  modelCard().contains('button[aria-expanded]:visible', 'Columns').should('be.visible').click();
}

function showCustomerType(): void {
  hoverWorkbenchCard(
    '.react-flow__node[data-id="model-orders"] [data-slot="graph-node-column-piece"][data-column-name="customer"]'
  );
  cy.get('[role="tooltip"]').should('have.text', 'text');
}

function assertColumnMenuStaysOpenAndReopens(): void {
  modelCard()
    .find('[data-slot="graph-node-column-piece"][data-column-name="customer"]')
    .rightclick(20, 10);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
  cy.wait(1500);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
  cy.get('body').type('{esc}');
  cy.get('[data-slot="graph-node-column-function-menu"]').should('not.exist');
  modelCard()
    .find('[data-slot="graph-node-column-piece"][data-column-name="customer"]')
    .rightclick(20, 10);
  cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
}

describe('Canvas Model output toggle lifecycle', () => {
  it('persists one selected inherited output without timed menu dismissal', () => {
    cy.viewport(1920, 1080);
    stubConnectedModel();
    visitCanvas();

    openModelColumns();
    showCustomerType();
    cy.get('[data-slot="tooltip-content"]')
      .should('be.visible')
      .invoke('outerWidth')
      .should('be.lessThan', 160);
    cy.screenshot('column-type-only', { capture: 'viewport' });
    openModelOutputs('model-orders');
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    expectOutput('customer', false);
    cy.get('[data-slot="relation-output-toggle"][data-field-name="customer"]').click();

    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(1);
      expect(savedOutputNames(0)).to.deep.equal(['customer']);
    });
    expectOutput('customer', true);
    expectOutput('order_id', false);
    expectOutput('amount', false);
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');

    revisitWorkbenchCanvas(visitCanvas);
    modelCard()
      .contains('[role="tab"]', /^Output/)
      .click();
    openModelColumns();
    modelColumnRow('customer').should('contain.text', 'NN');
    modelColumnRow('customer')
      .find('[data-slot="graph-node-column-piece"]')
      .should('have.attr', 'data-output', 'true');
    showCustomerType();
    assertColumnMenuStaysOpenAndReopens();

    revisitWorkbenchCanvas(visitCanvas);
    openModelColumns();

    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="amount"]')
      .focus()
      .trigger('keydown', { key: 'ArrowUp', altKey: true })
      .trigger('keydown', { key: 'ArrowUp', altKey: true });
    modelCard()
      .find('[data-slot="graph-node-column-piece"]')
      .then(($columns) => {
        expect([...$columns].map((column) => column.dataset.columnName).slice(0, 3)).to.deep.equal([
          'order_id',
          'customer',
          'amount',
        ]);
      });
    cy.then(() => expect(getModelSemanticSaves()).to.have.length(1));

    openModelOutputs('model-orders');
    expectOutput('customer', true);
    cy.get('[data-slot="relation-output-toggle"][data-field-name="customer"]').click();
    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(2);
      expect(savedOutputNames(1)).to.deep.equal([]);
    });
    expectOutput('customer', false);
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');

    revisitWorkbenchCanvas(visitCanvas);
    openModelOutputs('model-orders');
    expectOutput('customer', false);
    expectOutput('order_id', false);
    expectOutput('amount', false);
    cy.wrap(null).should(() => {
      expect(getModelSemanticSaves()).to.have.length(2);
    });
  });
});
