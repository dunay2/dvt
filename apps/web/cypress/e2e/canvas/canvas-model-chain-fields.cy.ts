/** Producer fields enter the consumer Input without inventing its output semantics. */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi } from '../../support/e2eApiStub';
import { revisitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const producer = '.react-flow__node[data-id="dvt-transform-1"]';
const consumer = '.react-flow__node[data-id="orphan-transform-1"]';
const columns = '[data-slot="graph-node-column-piece"]';
const outputToggle = '[data-slot="graph-node-column-output-state"]';

function visitCanvas(): void {
  revisitWorkbenchCanvas(() => {
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
  });
  cy.viewport(1700, 1100);
  cy.get('.react-flow__controls-fitview').click();
}

describe('Model card field flow', () => {
  it('connects a producer, restores an Input mapping and reloads without copying operations', () => {
    cy.viewport(1700, 1100);
    stubShellBootstrapApis();
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
      authoringGenerated: true,
      includeLooseNode: true,
    });
    draft.nodePositions = {
      'source-1': { x: 0, y: 0 },
      'dvt-transform-1': { x: 400, y: 0 },
      'orphan-transform-1': { x: 820, y: 0 },
      'sink-1': { x: 820, y: 450 },
    };
    visitCanvas();
    cy.get(
      `${producer} [data-slot="canvas-node-port-handle"][data-port="source"][data-port-variant="node"]`
    ).then(($source) => {
      const from = $source[0]!.getBoundingClientRect();
      cy.get(
        `${consumer} [data-slot="canvas-node-port-handle"][data-port="target"][data-port-variant="node"]`
      ).then(($target) => {
        const to = $target[0]!.getBoundingClientRect();
        cy.wrap($source).trigger('mousedown', {
          button: 0,
          buttons: 1,
          clientX: from.x + from.width / 2,
          clientY: from.y + from.height / 2,
        });
        cy.get('body')
          .trigger('mousemove', {
            buttons: 1,
            clientX: to.x + to.width / 2,
            clientY: to.y + to.height / 2,
          })
          .trigger('mouseup', {
            button: 0,
            buttons: 0,
            clientX: to.x + to.width / 2,
            clientY: to.y + to.height / 2,
          });
      });
    });
    cy.get(`${consumer} [role="tab"]`).contains('Input (2)').should('be.visible');
    cy.get(`${consumer} [role="tab"]`).contains('Output (Not configured)').should('be.visible');
    cy.get(consumer).should('not.contain.text', 'RECONNECT');
    cy.get('[data-sonner-toaster]').should('have.attr', 'data-y-position', 'bottom');
    cy.get(consumer).contains('button[aria-expanded]', 'Columns').click();
    cy.get(`${consumer} ${outputToggle}`).should('not.exist');
    cy.get(`${producer} [role="tab"]`).contains('Output').click();
    cy.get(producer).contains('button[aria-expanded]', 'Columns').click();
    cy.get('.react-flow__edge-columnLineage[aria-label="total → total"]').trigger('keydown', {
      key: ' ',
      code: 'Space',
      force: true,
    });
    cy.get('button[aria-label="Remove mapping total to total"]').click({ force: true });
    cy.get(`${consumer} [role="tab"]`).contains('Input (1)').should('be.visible');
    const transfer = new DataTransfer();
    cy.get(`${producer} ${columns}[data-column-name="total"]`)
      .should('have.attr', 'draggable', 'true')
      .trigger('dragstart', { dataTransfer: transfer });
    cy.get(`${consumer} [role="tabpanel"]`)
      .trigger('dragover', { dataTransfer: transfer })
      .trigger('drop', { dataTransfer: transfer });
    cy.get(`${consumer} [role="tab"]`).contains('Input (2)').should('be.visible');
    cy.get(`${consumer} ${columns}`).should('have.length', 2);
    cy.get(`${consumer} ${outputToggle}`).should('not.exist');
    cy.get(`${consumer} [role="tab"]`).contains('Output (Not configured)').click();
    cy.get(`${consumer} [role="status"]`).should('have.text', 'Not configured');
    cy.get(`${producer} ${columns}[data-column-name="total"]`)
      .should('have.attr', 'draggable', 'true')
      .trigger('dragstart', { dataTransfer: transfer });
    cy.get(`${consumer} [role="tabpanel"]`)
      .trigger('dragover', { dataTransfer: transfer })
      .trigger('drop', { dataTransfer: transfer });
    cy.get(`${producer} ${columns}[data-column-name="total"]`).trigger('dragend', {
      dataTransfer: transfer,
    });
    cy.get(`${consumer} [role="tab"]`).contains('Output (Not configured)').should('be.visible');
    cy.get(`${consumer} ${columns}`).should('not.exist');
    cy.get(`${consumer} [data-port-variant="column"][data-port="source"]`).should('not.exist');
    cy.wrap(null).should(() => {
      const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        { draft?: WorkspaceGraphAuthoringDraft } | undefined;
      const saved = body?.draft?.nodes.find((node) => node.id === 'orphan-transform-1');
      expect(saved).to.exist;
      expect(saved?.metadata ?? {}).not.to.have.property('transformAuthoring');
      const edge = body?.draft?.edges.find((entry) => entry.targetId === 'orphan-transform-1');
      expect(edge?.metadata?.inputBindings?.fields).to.have.length(2);
    });
    cy.get('.react-flow__controls-fitview').click();
    cy.screenshot('model-chain-input-output');
    visitCanvas();
    cy.get(`${consumer} [role="tab"]`).contains('Input (2)').should('be.visible');
    cy.get(`${consumer} [role="tab"]`).contains('Output (Not configured)').click();
    cy.get(`${consumer} [role="status"]`).should('have.text', 'Not configured');
    cy.get(consumer).should('not.contain.text', 'RECONNECT');
  });
});
