/**
 * Owned concern: prove Input authoring persists while Output stays passive.
 * @baseline GH-3572: a visible count alone cannot distinguish a write from stale presentation.
 * @decision Report submitted bindings beside the original negative UI boundary.
 * @consequence A failure reports the view, visible tabs and submitted bindings together.
 * @version 1.0.0
 */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { createCanvasColumnHandleId } from '../../../src/app/views/canvas/canvasColumnHandleIdentity';
import { buildCanvasAuthoringDraft } from '../../../src/app/views/canvas/canvasDraftAuthoring';
import { applyDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtTransformAuthoringAuthority';
import { canvasInputSlotId } from '../../../src/app/views/canvas/canvasInputBindings';
import {
  createModelOutputDependencyFixture,
  selectModelDependencyOutputs,
  modelDependencyDocument,
} from '../../../src/app/views/canvas/canvasModelOutputDependency.test-support';
import { resolveCanvasSubstraitGraphBindings } from '../../../src/app/views/canvas/canvasSubstraitGraphBindings';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { connectCanvasNodes } from '../../support/canvasGraphAuthoring';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { revisitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function visitInputs(
  disconnected = false,
  secondProducer = false,
  language = 'en',
  sourceInspectorOrdering = false
): void {
  cy.viewport(1920, 1080);
  stubShellBootstrapApis({ scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'] });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  stubStatefulCanvasDraftAuthoring({
    canvasKind: 'transformation',
    columnMapping: true,
    columnMappingDisconnected: disconnected,
    columnMappingSecondSource: secondProducer,
    sourceInspectorOrdering,
  });
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language }, version: 0 })
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
  node('source-orders').should('be.visible');
}
function node(id: string): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get(`.react-flow__node[data-id="${id}"]`);
}
function expand(id: string): void {
  node(id)
    .find('button[aria-expanded]')
    .contains(/Columns|Columnas/)
    .click();
}
function showAll(id: string): void {
  node(id).contains('button', 'Show remaining columns').click();
}
function assertNoOutputAuthoring(): void {
  node('model-orders').contains('[role="tab"]', 'Output (Not configured)').click();
  node('model-orders').find('[role="status"]').should('have.text', 'Not configured');
  node('model-orders').find('[data-slot="graph-node-column-row"]').should('not.exist');
  node('model-orders').find('[data-slot="graph-node-column-output-state"]').should('not.exist');
  node('model-orders').contains('Map compatible columns').should('not.exist');
}
function assertSavedWithoutSemantics(): void {
  cy.wrap(null).should(() => {
    const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
      { draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> } } | undefined;
    const consumer = body?.draft.nodes.find((entry) => entry.id === 'model-orders');
    expect(consumer).to.exist;
    expect(consumer?.metadata ?? {}).not.to.have.property('transformAuthoring');
  });
}
function removeInput(name: string): void {
  cy.get(`.react-flow__edge-columnLineage[aria-label="${name} → ${name}"]`).trigger('keydown', {
    key: ' ',
    code: 'Space',
    force: true,
  });
  cy.get(`button[aria-label="Remove mapping ${name} to ${name}"]`).click({ force: true });
}
function assertPassiveOutput(): void {
  node('model-orders').should(($model) => {
    const writes = getE2eApiCalls('/workspace/graph/draft', 'PUT').map((call) => {
      const { draft } = call.body as { draft: WorkspaceGraphAuthoringDraft };
      return draft.edges.find(
        (edge) => edge.sourceId === 'source-orders' && edge.targetId === 'model-orders'
      )?.metadata?.inputBindings;
    });
    const tabs = $model
      .find('[role="tab"]')
      .toArray()
      .map((tab) => tab.textContent);
    const evidence = JSON.stringify({ tabs, writes });
    expect(tabs, evidence).to.deep.equal(['Input (5)', 'Output (Not configured)']);
    expect($model.find('[role="tab"][aria-selected="true"]').text(), evidence).to.equal(
      'Output (Not configured)'
    );
  });
}
function dropPublishedField(producerId: string, name: string, view = 'Input'): void {
  const transfer = new DataTransfer();
  node(producerId)
    .find(`[data-slot="graph-node-column-piece"][data-column-name="${name}"]`)
    .trigger('dragstart', { dataTransfer: transfer });
  node('model-orders')
    .contains('[role="tab"]', `${view} (`)
    .should('have.attr', 'aria-selected', 'true');
  node('model-orders')
    .find('[role="tabpanel"]')
    .trigger('dragover', { dataTransfer: transfer })
    .trigger('drop', { dataTransfer: transfer });
  node(producerId)
    .find(`[data-slot="graph-node-column-piece"][data-column-name="${name}"]`)
    .trigger('dragend', { dataTransfer: transfer });
}

describe('Producer fields enter Input; Output is passive', () => {
  it('explicitly repairs missing model inputs, saves and reloads the unchanged consumer semantics', () => {
    cy.then(async () => {
      const graph = await createModelOutputDependencyFixture();
      const narrowed = await selectModelDependencyOutputs(graph.producer, ['customer']);
      const producer = await selectModelDependencyOutputs(narrowed, [
        'order_id',
        'customer',
        'amount',
      ]);
      const nodes = graph.nodes.map((entry) => (entry.id === producer.id ? producer : entry));
      const producerRead = graph.consumerDocument.sidecar.relations.find(
        (entry) => entry.producerRef?.nodeId === producer.id
      )!;
      const oldFields = new Map(
        producerRead.producerRef!.fields.map((mapping) => [
          graph.consumerDocument.sidecar.fields.find((field) => field.fieldId === mapping.fieldId)!
            .displayName,
          mapping.producerFieldId,
        ])
      );
      return { graph, producer, nodes, oldFields };
    }).then(({ graph, producer, nodes, oldFields }) => {
      cy.viewport(1920, 1080);
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
      const saved = stubStatefulCanvasDraftAuthoring({ emptyCanvas: true });
      Object.assign(
        saved,
        buildCanvasAuthoringDraft({
          canvas: saved.canvas,
          nodeIds: nodes.map((entry) => entry.id),
          nodePositions: {
            [graph.source.id]: { x: 60, y: 60 },
            [graph.right.id]: { x: 60, y: 340 },
            [producer.id]: { x: 400, y: 60 },
            [graph.consumer.id]: { x: 820, y: 60 },
          },
          visibleEdges: graph.edges,
          canonicalNodes: nodes,
          canonicalEdges: graph.edges,
        })
      );
      const originalNodes = structuredClone(saved.nodes);
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
      node(graph.consumer.id).contains('[role="tab"]', 'Output (Unavailable)').should('be.visible');
      expand(producer.id);
      node(producer.id).contains('[role="tab"]', 'Output (3)').click();
      expand(graph.consumer.id);
      showAll(graph.consumer.id);
      for (const name of ['order_id', 'amount']) {
        const oldId = oldFields.get(name)!;
        const inputId = canvasInputSlotId(producer.id, oldId);
        node(graph.consumer.id)
          .find(`[data-field-id="${inputId}"]`)
          .should('have.attr', 'data-input-state', 'unresolved');
        node(producer.id)
          .find(`[data-slot="graph-node-column-piece"][data-column-name="${name}"]`)
          .closest('[data-slot="graph-node-column-row"]')
          .find('[data-port="source"]')
          .focus()
          .should('be.focused')
          .trigger('keydown', { key: 'Enter', code: 'Enter' });
        const targetHandle = createCanvasColumnHandleId({
          direction: 'target',
          nodeId: graph.consumer.id,
          columnId: inputId,
        });
        node(graph.consumer.id)
          .find(`[data-handleid="${targetHandle}"]`)
          .focus()
          .should('be.focused')
          .trigger('keydown', { key: 'Enter', code: 'Enter' });
        node(graph.consumer.id)
          .find(`[data-field-id="${inputId}"]`)
          .should('have.attr', 'data-input-state', 'available');
      }
      node(graph.consumer.id).contains('[role="tab"]', 'Output (3)').should('be.visible');
      cy.wrap(null).should(() => {
        const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
          { draft: WorkspaceGraphAuthoringDraft } | undefined;
        const authority = body?.draft.nodes.find((entry) => entry.id === graph.consumer.id)
          ?.metadata?.transformAuthoring as { semanticDocument: unknown } | undefined;
        expect(authority, 'real submitted consumer authority').to.exist;
        const consumer = applyDvtSubstraitSemanticDocument(
          graph.consumer,
          authority!.semanticDocument as Parameters<typeof applyDvtSubstraitSemanticDocument>[1]
        );
        const document = modelDependencyDocument(consumer);
        expect(document.plan).to.deep.equal(graph.consumerDocument.plan);
        expect(document.sidecar.fields).to.deep.equal(graph.consumerDocument.sidecar.fields);
        expect(body!.draft.nodes.filter((entry) => entry.id !== consumer.id)).to.deep.equal(
          originalNodes.filter((entry) => entry.id !== consumer.id)
        );
        expect(
          body!.draft.edges.map(({ sourceId, targetId }) => ({ sourceId, targetId }))
        ).to.deep.equal(graph.edges.map(({ sourceId, targetId }) => ({ sourceId, targetId })));
        const bindings = body!.draft.edges.find(
          (edge) => edge.sourceId === producer.id && edge.targetId === consumer.id
        )!.metadata!.inputBindings as {
          fields: Array<{ inputId: string; producerFieldId: string }>;
        };
        const publication = modelDependencyDocument(producer);
        for (const name of ['order_id', 'amount']) {
          const current = publication.sidecar.fields.find(
            (field) =>
              field.relationId === publication.sidecar.relations.at(-1)!.relationId &&
              field.displayName === name
          )!;
          expect(bindings.fields).to.deep.include({
            inputId: canvasInputSlotId(producer.id, oldFields.get(name)!),
            producerFieldId: current.fieldId,
          });
        }
        expect(() =>
          resolveCanvasSubstraitGraphBindings({
            node: consumer,
            nodes: nodes.map((entry) => (entry.id === consumer.id ? consumer : entry)),
            edges: body!.draft.edges,
          })
        ).not.to.throw();
      });
      cy.on('window:before:load', installE2eApiFetchStub);
      revisitWorkbenchCanvas(() => {
        cy.reload();
      });
      node(graph.consumer.id).contains('[role="tab"]', 'Output (3)').should('be.visible');
      expand(graph.consumer.id);
      node(graph.consumer.id)
        .find('[data-slot="graph-node-column-piece"]')
        .should('have.length', 5);
      for (const name of ['order_id', 'amount']) {
        node(graph.consumer.id)
          .find(`[data-field-id="${canvasInputSlotId(producer.id, oldFields.get(name)!)}"]`)
          .should('have.attr', 'data-input-state', 'available');
      }
      node(graph.consumer.id).find('[data-input-state="unresolved"]').should('not.exist');
    });
  });
  it('drags one published column from source properties into a disconnected Model and reloads it', () => {
    visitInputs(true, false, 'en', true);
    cy.viewport(1280, 720);
    node('source-orders').find('[data-slot="canvas-node-shell"]').click(40, 18);
    cy.get('.react-flow__controls-fitview').click();
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    const field = '[data-slot="source-column-row"][data-column-name="customer"]';
    cy.get(field).should('be.visible').and('have.attr', 'draggable', 'true');
    const drop = (): Cypress.Chainable<void> =>
      cy.window().then((window) => {
        const dataTransfer = new window.DataTransfer();
        cy.get(field).trigger('dragstart', { dataTransfer });
        node('model-orders')
          .find('[data-slot="canvas-node-shell"]')
          .trigger('dragover', { dataTransfer })
          .trigger('drop', { dataTransfer });
        cy.get(field).trigger('dragend', { dataTransfer });
      });
    drop();
    node('model-orders').contains('[role="tab"]', 'Input (1)').should('be.visible');
    drop();
    node('model-orders').contains('[role="tab"]', 'Input (1)').should('be.visible');
    expand('model-orders');
    node('model-orders')
      .find('[data-slot="graph-node-column-piece"]')
      .should('have.length', 1)
      .and('contain.text', 'customer');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.wrap(null).should(() => {
      const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        | {
            draft: {
              edges: Array<{
                sourceId: string;
                targetId: string;
                metadata?: { inputBindings?: { fields: unknown[] } };
              }>;
            };
          }
        | undefined;
      const bindings = body?.draft.edges.filter(
        (edge) => edge.sourceId === 'source-orders' && edge.targetId === 'model-orders'
      );
      expect(bindings).to.have.length(1);
      expect(bindings?.[0]?.metadata?.inputBindings?.fields).to.deep.equal([
        { inputId: 'input:source-orders:customer', producerFieldId: 'customer' },
      ]);
    });
    assertSavedWithoutSemantics();
    cy.screenshot('source-properties-one-field');
    cy.on('window:before:load', installE2eApiFetchStub);
    revisitWorkbenchCanvas(() => {
      cy.reload();
    });
    node('model-orders').contains('[role="tab"]', 'Input (1)').should('be.visible');
    node('model-orders').contains('[role="tab"]', 'Output (Not configured)').should('be.visible');
  });

  it('connects a producer without inventing operations or published fields', () => {
    visitInputs(true);
    connectCanvasNodes('Orders source', 'Orders Model');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    expand('source-orders');
    expand('model-orders');
    showAll('source-orders');
    showAll('model-orders');
    node('model-orders').contains('[role="tab"]', 'Input (6)').should('be.visible');
    cy.get('.react-flow__edge-columnLineage').should('have.length', 6);
    node('model-orders')
      .find('[data-port-variant="column"][data-port="source"]')
      .should('not.exist');
    assertNoOutputAuthoring();
    cy.get('.react-flow__edge-columnLineage').should('not.exist');
    assertSavedWithoutSemantics();
  });

  it('removes and restores a second producer field through Input and reloads the binding', () => {
    visitInputs(false, true);
    connectCanvasNodes('Health check', 'Orders Model');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    expand('source-orders');
    expand('source-health-check');
    expand('model-orders');
    showAll('source-orders');
    showAll('model-orders');
    node('model-orders').contains('[role="tab"]', 'Input (8)').should('be.visible');
    cy.get('.react-flow__edge-columnLineage').should('have.length', 8);
    removeInput('id');
    node('model-orders').contains('[role="tab"]', 'Input (7)').should('be.visible');
    dropPublishedField('source-health-check', 'id');
    node('model-orders').contains('[role="tab"]', 'Input (8)').should('be.visible');
    cy.get('.react-flow__edge-columnLineage[aria-label="id → id"]').should('exist');
    cy.wrap(null).should(() => {
      const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        | {
            draft: {
              edges: Array<{
                sourceId: string;
                metadata?: { inputBindings?: { fields: Array<{ producerFieldId: string }> } };
              }>;
            };
          }
        | undefined;
      expect(
        body?.draft.edges.find((edge) => edge.sourceId === 'source-health-check')?.metadata
          ?.inputBindings?.fields
      ).to.deep.include({ inputId: 'input:source-health-check:id', producerFieldId: 'id' });
    });
    assertNoOutputAuthoring();
    assertSavedWithoutSemantics();
    cy.on('window:before:load', installE2eApiFetchStub);
    revisitWorkbenchCanvas(() => {
      cy.reload();
    });
    node('model-orders').contains('[role="tab"]', 'Input (8)').should('be.visible');
    node('model-orders').contains('[role="tab"]', 'Output (Not configured)').should('be.visible');
  });

  it('does not accept a field drop on Output', () => {
    visitInputs();
    expand('source-orders');
    expand('model-orders');
    removeInput('customer');
    node('model-orders').contains('[role="tab"]', 'Input (5)').should('be.visible');
    assertNoOutputAuthoring();
    dropPublishedField('source-orders', 'customer', 'Output');
    assertPassiveOutput();
    node('model-orders').contains('[role="tab"]', 'Input (5)').should('be.visible');
    node('model-orders').contains('[role="tab"]', 'Output (Not configured)').should('be.visible');
    node('model-orders').contains('[role="tab"]', 'Input (5)').click();
    dropPublishedField('source-orders', 'customer');
    node('model-orders').contains('[role="tab"]', 'Input (6)').should('be.visible');
    assertSavedWithoutSemantics();
  });

  it('exposes localized Input connectors without selection toggles', () => {
    visitInputs(false, false, 'es');
    expand('source-orders');
    expand('model-orders');
    node('source-orders').find('[aria-label="Conectar salida de order_id"]').should('be.visible');
    node('model-orders').find('[aria-label="Asignar a order_id"]').should('be.visible');
    node('model-orders').find('[data-slot="graph-node-column-output-state"]').should('not.exist');
    cy.injectAxe();
    cy.checkA11y('[data-slot="canvas-viewport-context-surface"]', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      includedImpacts: ['serious', 'critical'],
    });
  });
});
