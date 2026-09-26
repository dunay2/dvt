/** Connected model input/output selection, field transfer and durable reload use production rails. */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
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
  cy.viewport(1700, 1100);
  cy.get('.react-flow__controls-fitview').click();
}

describe('Model card field flow', () => {
  it('connects models, selects outputs, transfers a field and reloads the saved result', () => {
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
    cy.get(`${consumer} [role="tab"]`).contains('Output (2)').should('be.visible');
    cy.get(consumer).should('not.contain.text', 'RECONNECT');
    cy.get('[data-sonner-toaster]').should('have.attr', 'data-y-position', 'bottom');
    cy.get(consumer).contains('button[aria-expanded]', 'Columns').click();
    cy.get(`${consumer} ${columns}[data-column-name="total"] ${outputToggle}`)
      .should('have.attr', 'aria-disabled', 'false')
      .click();
    cy.get(`${consumer} [role="tab"]`).contains('Output (1)').click();
    cy.get(`${consumer} ${columns}`).should('have.length', 1);
    cy.get(`${producer} [role="tab"]`).contains('Output').click();
    cy.get(producer).contains('button[aria-expanded]', 'Columns').click();
    const transfer = new DataTransfer();
    cy.get(`${producer} ${columns}[data-column-name="total"]`)
      .should('have.attr', 'draggable', 'true')
      .trigger('dragstart', { dataTransfer: transfer });
    cy.get(`${consumer} [data-slot="tabs"]`)
      .trigger('dragover', { dataTransfer: transfer })
      .trigger('drop', { dataTransfer: transfer });
    cy.get(`${producer} ${columns}[data-column-name="total"]`).trigger('dragend', {
      dataTransfer: transfer,
    });
    cy.get(`${consumer} [role="tab"]`).contains('Output (2)').should('be.visible');
    cy.get(`${consumer} ${columns}`).should('have.length', 2);
    cy.get(`${consumer} [data-port-variant="column"][data-port="source"]`).should('have.length', 2);
    cy.get(`${consumer} ${columns}[data-column-name="total"]`)
      .invoke('attr', 'data-field-id')
      .then((fieldId) => {
        cy.wrap(null).should(() => {
          const body = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
            { draft?: WorkspaceGraphAuthoringDraft } | undefined;
          const saved = body?.draft?.nodes.find((node) => node.id === 'orphan-transform-1');
          const authority = saved?.metadata?.transformAuthoring as
            { semanticDocument?: unknown } | undefined;
          expect(authority?.semanticDocument).not.to.equal(undefined);
          const document = decodeDvtSubstraitSemanticDocument(authority!.semanticDocument);
          expect(
            document.sidecar.fields.some((field) => field.fieldId === fieldId),
            'restored field persisted'
          ).to.equal(true);
        });
      });
    cy.get('.react-flow__controls-fitview').click();
    cy.screenshot('model-chain-input-output');
    visitCanvas();
    cy.get(`${consumer} [role="tab"]`).contains('Output (2)').should('be.visible');
    cy.get(consumer).should('not.contain.text', 'RECONNECT');
  });
});
